import { useState, useEffect, useCallback } from 'react';

const READ_NOTIFICATIONS_KEY = 'read_notifications_timestamp';

export const useReadNotifications = () => {
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Mark notifications as read
  const markAsRead = useCallback(() => {
    const now = Date.now();
    setLastReadTimestamp(now);
    localStorage.setItem(READ_NOTIFICATIONS_KEY, now.toString());
  }, []);

  // Check if a notification is unread (created after last read timestamp)
  const isUnread = useCallback((createdAt: string): boolean => {
    const notificationTime = new Date(createdAt).getTime();
    return notificationTime > lastReadTimestamp;
  }, [lastReadTimestamp]);

  return {
    lastReadTimestamp,
    markAsRead,
    isUnread,
  };
};
