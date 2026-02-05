 import { useState, useEffect, useMemo } from 'react';
 import { Subscriber } from '@/types/subscriber';
 
 const READ_NOTIFICATIONS_KEY = 'notifications_last_read';
 
 interface Stats {
   expired: Subscriber[];
   expiring: Subscriber[];
   pending: Subscriber[];
 }
 
 export const useNotificationBadge = (stats: Stats, activeTab: string) => {
   const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(() => {
     try {
       const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
       return stored ? parseInt(stored, 10) : 0;
     } catch {
       return 0;
     }
   });
 
   const notificationCount = useMemo(() => {
     const allNotifications = [...stats.expired, ...stats.expiring, ...stats.pending];
     const unreadCount = allNotifications.filter(n => {
       const createdAt = n.createdAt || n.updatedAt;
       if (!createdAt) return true;
       return new Date(createdAt).getTime() > lastReadTimestamp;
     }).length;
     return unreadCount;
   }, [stats, lastReadTimestamp]);
 
   useEffect(() => {
     if (activeTab === 'notifications') {
       const now = Date.now();
       setLastReadTimestamp(now);
       localStorage.setItem(READ_NOTIFICATIONS_KEY, now.toString());
     }
   }, [activeTab]);
 
   return notificationCount;
 };