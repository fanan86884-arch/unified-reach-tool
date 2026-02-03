import { useCallback, useEffect, useMemo, useState } from "react";

import type { Subscriber } from "@/types/subscriber";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  OFFLINE_STORE_EVENT,
  getCachedSubscribers,
  setCachedSubscribers,
  getPendingChanges,
  getLastSyncAt,
  getSyncing,
} from "@/lib/offlineStore";

export const useOfflineStorage = () => {
  const isOnline = useOnlineStatus();
  const [pendingChanges, setPendingChangesState] = useState(awaitingInit());
  const [isSyncing, setIsSyncingState] = useState(false);
  const [lastSyncAt, setLastSyncAtState] = useState<number | null>(null);

  function awaitingInit() {
    return [] as Awaited<ReturnType<typeof getPendingChanges>>;
  }

  const refresh = useCallback(async () => {
    try {
      const [pending, syncing, last] = await Promise.all([
        getPendingChanges(),
        getSyncing(),
        getLastSyncAt(),
      ]);
      setPendingChangesState(pending);
      setIsSyncingState(syncing);
      setLastSyncAtState(last);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener(OFFLINE_STORE_EVENT, handler as any);
    return () => window.removeEventListener(OFFLINE_STORE_EVENT, handler as any);
  }, [refresh]);

  const pendingCount = useMemo(() => pendingChanges.length, [pendingChanges.length]);

  const saveSubscribersOffline = useCallback(async (subscribers: Subscriber[]) => {
    try {
      await setCachedSubscribers(subscribers);
    } catch (e) {
      console.error("Error saving subscribers offline:", e);
    }
  }, []);

  const loadSubscribersOffline = useCallback(async (): Promise<Subscriber[]> => {
    try {
      return await getCachedSubscribers();
    } catch (e) {
      console.error("Error loading offline subscribers:", e);
      return [];
    }
  }, []);

  return {
    isOnline,
    pendingChanges,
    pendingCount,
    isSyncing,
    lastSyncAt,
    saveSubscribersOffline,
    loadSubscribersOffline,
  };
};
