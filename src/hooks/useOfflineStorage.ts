import { useState, useEffect, useCallback } from 'react';
import { Subscriber, SubscriberFormData } from '@/types/subscriber';
import { useOnlineStatus } from './useOnlineStatus';

const OFFLINE_SUBSCRIBERS_KEY = 'offline_subscribers';
const OFFLINE_PENDING_CHANGES_KEY = 'offline_pending_changes';

interface PendingChange {
  id: string;
  type: 'add' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export const useOfflineStorage = () => {
  const isOnline = useOnlineStatus();
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  // Load pending changes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OFFLINE_PENDING_CHANGES_KEY);
      if (stored) {
        setPendingChanges(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading pending changes:', e);
    }
  }, []);

  // Save subscribers to offline storage
  const saveSubscribersOffline = useCallback((subscribers: Subscriber[]) => {
    try {
      localStorage.setItem(OFFLINE_SUBSCRIBERS_KEY, JSON.stringify(subscribers));
    } catch (e) {
      console.error('Error saving subscribers offline:', e);
    }
  }, []);

  // Load subscribers from offline storage
  const loadSubscribersOffline = useCallback((): Subscriber[] => {
    try {
      const stored = localStorage.getItem(OFFLINE_SUBSCRIBERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading offline subscribers:', e);
    }
    return [];
  }, []);

  // Queue a change for later sync
  const queueChange = useCallback((type: 'add' | 'update' | 'delete', data: any) => {
    const change: PendingChange = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
    };

    setPendingChanges((prev) => {
      const updated = [...prev, change];
      localStorage.setItem(OFFLINE_PENDING_CHANGES_KEY, JSON.stringify(updated));
      return updated;
    });

    return change;
  }, []);

  // Clear pending changes after successful sync
  const clearPendingChanges = useCallback(() => {
    setPendingChanges([]);
    localStorage.removeItem(OFFLINE_PENDING_CHANGES_KEY);
  }, []);

  // Remove a specific pending change
  const removePendingChange = useCallback((changeId: string) => {
    setPendingChanges((prev) => {
      const updated = prev.filter((c) => c.id !== changeId);
      localStorage.setItem(OFFLINE_PENDING_CHANGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    isOnline,
    pendingChanges,
    saveSubscribersOffline,
    loadSubscribersOffline,
    queueChange,
    clearPendingChanges,
    removePendingChange,
  };
};
