import { useCallback } from 'react';
import { Subscriber, SubscriberFormData, SubscriptionStatus } from '@/types/subscriber';
import { useOnlineStatus } from './useOnlineStatus';
import { useAuth } from './useAuth';
import { addPendingChange, setCachedSubscribers, getCachedSubscribers } from '@/lib/offlineStore';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

const calculateStatus = (endDate: string, remainingAmount: number, isPaused?: boolean): SubscriptionStatus => {
  if (isPaused) return 'paused';
  
  const today = startOfDay(new Date());
  const end = startOfDay(parseISO(endDate));
  const daysRemaining = differenceInDays(end, today);

  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 7) return 'expiring';
  return 'active';
};

export const useOfflineSubscribers = (
  setLocalSubscribers: React.Dispatch<React.SetStateAction<Subscriber[]>>
) => {
  const isOnline = useOnlineStatus();
  const { user } = useAuth();

  // إضافة مشترك محلياً ووضعه في قائمة الانتظار
  const addSubscriberOffline = useCallback(async (data: SubscriberFormData): Promise<Subscriber> => {
    const newId = crypto.randomUUID();
    const status = calculateStatus(data.endDate, data.remainingAmount, false);
    
    const newSubscriber: Subscriber = {
      id: newId,
      name: data.name,
      phone: data.phone,
      subscriptionType: data.subscriptionType,
      startDate: data.startDate,
      endDate: data.endDate,
      paidAmount: data.paidAmount,
      remainingAmount: data.remainingAmount,
      captain: data.captain,
      status,
      isArchived: false,
      isPaused: false,
      pausedUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // تحديث الحالة المحلية
    setLocalSubscribers(prev => {
      const updated = [newSubscriber, ...prev];
      void setCachedSubscribers(updated);
      return updated;
    });

    // إضافة إلى قائمة الانتظار للمزامنة
    await addPendingChange({
      id: crypto.randomUUID(),
      entity: 'subscriber',
      op: 'upsert',
      row: {
        id: newId,
        user_id: user?.id,
        name: data.name,
        phone: data.phone,
        subscription_type: data.subscriptionType,
        start_date: data.startDate,
        end_date: data.endDate,
        paid_amount: data.paidAmount,
        remaining_amount: data.remainingAmount,
        captain: data.captain,
        status,
        is_archived: false,
        is_paused: false,
        paused_until: null,
      },
      timestamp: Date.now(),
    });

    return newSubscriber;
  }, [user, setLocalSubscribers]);

  // تحديث مشترك محلياً
  const updateSubscriberOffline = useCallback(async (id: string, data: Partial<SubscriberFormData>): Promise<void> => {
    setLocalSubscribers(prev => {
      const updated = prev.map(sub => {
        if (sub.id === id) {
          const updatedSub = { ...sub, ...data, updatedAt: new Date().toISOString() };
          if (data.endDate !== undefined || data.remainingAmount !== undefined) {
            updatedSub.status = calculateStatus(
              data.endDate ?? sub.endDate,
              data.remainingAmount ?? sub.remainingAmount,
              sub.isPaused
            );
          }
          return updatedSub;
        }
        return sub;
      });
      void setCachedSubscribers(updated);
      return updated;
    });

    // تحويل البيانات للصيغة المطلوبة
    const patch: Record<string, any> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.subscriptionType !== undefined) patch.subscription_type = data.subscriptionType;
    if (data.startDate !== undefined) patch.start_date = data.startDate;
    if (data.endDate !== undefined) patch.end_date = data.endDate;
    if (data.paidAmount !== undefined) patch.paid_amount = data.paidAmount;
    if (data.remainingAmount !== undefined) patch.remaining_amount = data.remainingAmount;
    if (data.captain !== undefined) patch.captain = data.captain;

    await addPendingChange({
      id: crypto.randomUUID(),
      entity: 'subscriber',
      op: 'update',
      subscriberId: id,
      patch,
      timestamp: Date.now(),
    });
  }, [setLocalSubscribers]);

  // حذف مشترك محلياً
  const deleteSubscriberOffline = useCallback(async (id: string): Promise<void> => {
    setLocalSubscribers(prev => {
      const updated = prev.filter(sub => sub.id !== id);
      void setCachedSubscribers(updated);
      return updated;
    });

    await addPendingChange({
      id: crypto.randomUUID(),
      entity: 'subscriber',
      op: 'delete',
      subscriberId: id,
      timestamp: Date.now(),
    });
  }, [setLocalSubscribers]);

  // أرشفة مشترك محلياً
  const archiveSubscriberOffline = useCallback(async (id: string): Promise<void> => {
    setLocalSubscribers(prev => {
      const updated = prev.map(sub => 
        sub.id === id ? { ...sub, isArchived: true, updatedAt: new Date().toISOString() } : sub
      );
      void setCachedSubscribers(updated);
      return updated;
    });

    await addPendingChange({
      id: crypto.randomUUID(),
      entity: 'subscriber',
      op: 'update',
      subscriberId: id,
      patch: { is_archived: true },
      timestamp: Date.now(),
    });
  }, [setLocalSubscribers]);

  // استعادة مشترك من الأرشيف محلياً
  const restoreSubscriberOffline = useCallback(async (id: string): Promise<void> => {
    setLocalSubscribers(prev => {
      const updated = prev.map(sub => 
        sub.id === id ? { ...sub, isArchived: false, updatedAt: new Date().toISOString() } : sub
      );
      void setCachedSubscribers(updated);
      return updated;
    });

    await addPendingChange({
      id: crypto.randomUUID(),
      entity: 'subscriber',
      op: 'update',
      subscriberId: id,
      patch: { is_archived: false },
      timestamp: Date.now(),
    });
  }, [setLocalSubscribers]);

  return {
    isOnline,
    addSubscriberOffline,
    updateSubscriberOffline,
    deleteSubscriberOffline,
    archiveSubscriberOffline,
    restoreSubscriberOffline,
  };
};
