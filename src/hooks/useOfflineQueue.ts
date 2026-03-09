import { useCallback, useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  getPendingChanges,
  removePendingChange,
  addPendingChange,
  setLastSyncAt,
  setSyncing,
  getPendingSettingsChanges,
  removePendingSettingsChange,
  PendingSubscriberChange,
  OFFLINE_STORE_EVENT,
} from "@/lib/offlineStore";
import { supabase } from "@/integrations/supabase/client.runtime";
import { useAuth } from "./useAuth";
import type { TablesInsert } from "@/integrations/supabase/types";

const RETRY_INTERVAL = 30_000; // Retry every 30s when online with pending changes

export const useOfflineQueue = () => {
  const isOnline = useOnlineStatus();
  const { user } = useAuth();
  const [isSyncing, setIsSyncingState] = useState(false);
  const syncingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setInterval>>();

  const processSettingsQueue = useCallback(async () => {
    if (!user) return;
    
    const pending = await getPendingSettingsChanges();
    if (pending.length === 0) return;

    for (const change of pending) {
      try {
        if (change.entity === 'settings') {
          const { error } = await supabase
            .from('settings')
            .update(change.data)
            .eq('user_id', user.id);
          if (error) throw error;
        } else if (change.entity === 'contacts') {
          // Upsert contact settings
          const { data: existing } = await supabase
            .from('contact_settings')
            .select('id')
            .limit(1)
            .maybeSingle();
          
          if (existing) {
            const { error } = await supabase
              .from('contact_settings')
              .update(change.data)
              .eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('contact_settings')
              .insert(change.data);
            if (error) throw error;
          }
        } else if (change.entity === 'templates') {
          // Templates are saved per-template, data contains the upsert payload
          const { error } = await supabase
            .from('whatsapp_templates')
            .upsert(change.data as any, { onConflict: 'id' });
          if (error) throw error;
        }

        await removePendingSettingsChange(change.id);
      } catch (err) {
        console.error("Error processing settings change:", change.entity, err);
      }
    }
  }, [user]);

  const processQueue = useCallback(async () => {
    if (!isOnline || !user || syncingRef.current) return;

    syncingRef.current = true;
    setIsSyncingState(true);
    await setSyncing(true);

    try {
      // Process subscriber changes
      const pending = await getPendingChanges();
      if (pending.length > 0) {
        const sorted = [...pending].sort((a, b) => a.timestamp - b.timestamp);

        for (const change of sorted) {
          try {
            if (change.op === "upsert") {
              const rowWithUser = { ...change.row, user_id: user.id } as TablesInsert<"subscribers">;
              const { error } = await supabase
                .from("subscribers")
                .upsert([rowWithUser]);
              if (error) throw error;
            } else if (change.op === "update") {
              const { error } = await supabase
                .from("subscribers")
                .update(change.patch)
                .eq("id", change.subscriberId);
              if (error) throw error;
            } else if (change.op === "delete") {
              const { error } = await supabase
                .from("subscribers")
                .delete()
                .eq("id", change.subscriberId);
              if (error) throw error;
            }

            await removePendingChange(change.id);
          } catch (err) {
            console.error("Error processing change:", change.id, err);
            // Keep in queue for retry
          }
        }
      }

      // Process settings changes
      await processSettingsQueue();

      await setLastSyncAt(Date.now());
    } finally {
      syncingRef.current = false;
      setIsSyncingState(false);
      await setSyncing(false);
    }
  }, [isOnline, user, processSettingsQueue]);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline && user) {
      void processQueue();
    }
  }, [isOnline, user, processQueue]);

  // Periodic retry when online (handles failed items)
  useEffect(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
    }

    if (isOnline && user) {
      retryTimerRef.current = setInterval(() => {
        void processQueue();
      }, RETRY_INTERVAL);
    }

    return () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
      }
    };
  }, [isOnline, user, processQueue]);

  // Listen for new changes
  useEffect(() => {
    const handler = () => {
      if (isOnline && user) {
        void processQueue();
      }
    };
    window.addEventListener(OFFLINE_STORE_EVENT, handler);
    return () => window.removeEventListener(OFFLINE_STORE_EVENT, handler);
  }, [isOnline, user, processQueue]);

  // Listen for SW sync messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "TRIGGER_SYNC" && isOnline && user) {
        void processQueue();
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, [isOnline, user, processQueue]);

  // Register background sync when going offline
  useEffect(() => {
    if (!isOnline && "serviceWorker" in navigator && "sync" in window) {
      navigator.serviceWorker.ready.then((registration: any) => {
        registration.sync?.register("sync-offline-data").catch(() => {
          // Sync not supported
        });
      });
    }
  }, [isOnline]);

  const queueChange = useCallback(async (change: Omit<PendingSubscriberChange, "id" | "timestamp">) => {
    const fullChange: PendingSubscriberChange = {
      ...change,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    } as PendingSubscriberChange;

    await addPendingChange(fullChange);

    // If online, process immediately
    if (isOnline && user) {
      void processQueue();
    }
  }, [isOnline, user, processQueue]);

  return {
    queueChange,
    processQueue,
    isSyncing,
  };
};
