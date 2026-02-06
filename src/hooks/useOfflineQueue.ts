import { useCallback, useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  getPendingChanges,
  removePendingChange,
  addPendingChange,
  setLastSyncAt,
  setSyncing,
  PendingSubscriberChange,
  OFFLINE_STORE_EVENT,
} from "@/lib/offlineStore";
import { supabase } from "@/integrations/supabase/client.runtime";
import { useAuth } from "./useAuth";
import type { TablesInsert } from "@/integrations/supabase/types";

export const useOfflineQueue = () => {
  const isOnline = useOnlineStatus();
  const { user } = useAuth();
  const [isSyncing, setIsSyncingState] = useState(false);
  const syncingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (!isOnline || !user || syncingRef.current) return;

    syncingRef.current = true;
    setIsSyncingState(true);
    await setSyncing(true);

    try {
      const pending = await getPendingChanges();
      if (pending.length === 0) {
        await setLastSyncAt(Date.now());
        return;
      }

      // Sort by timestamp to maintain order
      const sorted = [...pending].sort((a, b) => a.timestamp - b.timestamp);

      for (const change of sorted) {
        try {
          if (change.op === "upsert") {
            // Merge user_id into the row data
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

      await setLastSyncAt(Date.now());
    } finally {
      syncingRef.current = false;
      setIsSyncingState(false);
      await setSyncing(false);
    }
  }, [isOnline, user]);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline && user) {
      void processQueue();
    }
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