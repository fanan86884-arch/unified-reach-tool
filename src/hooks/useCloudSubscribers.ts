import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Subscriber, SubscriberFormData, SubscriptionStatus } from '@/types/subscriber';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { useAuth } from './useAuth';

// Activity logging helper
const logActivity = async (
  userId: string,
  subscriberId: string | null,
  subscriberName: string,
  actionType: string,
  actionDetails?: Record<string, any>,
  previousData?: Partial<Subscriber>
) => {
  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      subscriber_id: subscriberId,
      subscriber_name: subscriberName,
      action_type: actionType,
      action_details: actionDetails || null,
      previous_data: previousData || null,
    });
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};
// حساب الحالة: نشط حتى لو معلق، قارب على الانتهاء = نشط أيضاً، منتهي = غير نشط
const calculateStatus = (endDate: string, remainingAmount: number, isPaused?: boolean): SubscriptionStatus => {
  if (isPaused) return 'paused';
  
  const today = startOfDay(new Date());
  const end = startOfDay(parseISO(endDate));
  const daysRemaining = differenceInDays(end, today);

  // منتهي إذا انتهت المدة
  if (daysRemaining < 0) return 'expired';
  
  // قارب على الانتهاء (لكن لا يزال نشطاً)
  if (daysRemaining <= 7) return 'expiring';
  
  // نشط بغض النظر عن المبلغ المتبقي (طالما لم ينتهِ)
  return 'active';
};

// تحديد ما إذا كان معلقاً (له مبلغ متبقي)
const hasPendingAmount = (remainingAmount: number): boolean => {
  return remainingAmount > 0;
};

const mapDbToSubscriber = (row: any): Subscriber => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  subscriptionType: row.subscription_type as Subscriber['subscriptionType'],
  startDate: row.start_date,
  endDate: row.end_date,
  paidAmount: Number(row.paid_amount),
  remainingAmount: Number(row.remaining_amount),
  captain: row.captain,
  status: row.status as SubscriptionStatus,
  isArchived: row.is_archived,
  isPaused: row.is_paused || false,
  pausedUntil: row.paused_until || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const useCloudSubscribers = () => {
  const { user } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | 'all'>('all');
  const [filterCaptain, setFilterCaptain] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');

  // Auto-archive subscribers expired for 30+ days
  const autoArchiveExpired = useCallback(async (subscribersList: Subscriber[]) => {
    const today = startOfDay(new Date());
    
    for (const sub of subscribersList) {
      if (sub.isArchived || sub.isPaused) continue;
      
      const endDate = startOfDay(parseISO(sub.endDate));
      const daysSinceExpiry = differenceInDays(today, endDate);
      
      // إذا مر شهر (30 يوم) على انتهاء الاشتراك، ننقله للأرشيف تلقائياً
      if (daysSinceExpiry >= 30) {
        await supabase
          .from('subscribers')
          .update({ is_archived: true })
          .eq('id', sub.id);
      }
    }
  }, []);

  // Fetch subscribers
  const fetchSubscribers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }); // ترتيب حسب تاريخ الاشتراك

      if (error) {
        console.error('Error fetching subscribers:', error);
        return;
      }

      const mapped = (data || []).map(mapDbToSubscriber);
      // Recalculate statuses - check pause status first
      const updated = mapped.map(sub => {
        // Check if pause has ended
        if (sub.isPaused && sub.pausedUntil) {
          const pauseEnd = parseISO(sub.pausedUntil);
          if (pauseEnd < new Date()) {
            // Pause ended, update status
            return {
              ...sub,
              isPaused: false,
              pausedUntil: null,
              status: calculateStatus(sub.endDate, sub.remainingAmount, false),
            };
          }
        }
        return {
          ...sub,
          status: calculateStatus(sub.endDate, sub.remainingAmount, sub.isPaused),
        };
      });
      
      // Auto-archive expired subscribers (30+ days)
      await autoArchiveExpired(updated);
      
      setSubscribers(updated);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, autoArchiveExpired]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('subscribers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscribers',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSubscribers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSubscribers]);

  const addSubscriber = useCallback(async (data: SubscriberFormData): Promise<Subscriber | null> => {
    if (!user) return null;

    const status = calculateStatus(data.endDate, data.remainingAmount, false);

    const { data: newData, error } = await supabase
      .from('subscribers')
      .insert({
        user_id: user.id,
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
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding subscriber:', error);
      return null;
    }

    // Log activity
    await logActivity(user.id, newData.id, data.name, 'add', {
      subscriptionType: data.subscriptionType,
      paidAmount: data.paidAmount,
    });

    return mapDbToSubscriber(newData);
  }, [user]);

  const updateSubscriber = useCallback(async (id: string, data: Partial<SubscriberFormData>) => {
    if (!user) return;
    
    const subscriber = subscribers.find(s => s.id === id);
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.subscriptionType !== undefined) updateData.subscription_type = data.subscriptionType;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.paidAmount !== undefined) updateData.paid_amount = data.paidAmount;
    if (data.remainingAmount !== undefined) updateData.remaining_amount = data.remainingAmount;
    if (data.captain !== undefined) updateData.captain = data.captain;

    // Recalculate status if relevant fields changed
    if (data.endDate !== undefined || data.remainingAmount !== undefined) {
      if (subscriber) {
        updateData.status = calculateStatus(
          data.endDate ?? subscriber.endDate,
          data.remainingAmount ?? subscriber.remainingAmount,
          subscriber.isPaused
        );
      }
    }

    const { error } = await supabase
      .from('subscribers')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating subscriber:', error);
    } else if (subscriber) {
      // Log activity with previous data
      await logActivity(user.id, id, subscriber.name, 'update', data, subscriber);
    }
  }, [user, subscribers]);

  const deleteSubscriber = useCallback(async (id: string) => {
    if (!user) return;
    
    const subscriber = subscribers.find(s => s.id === id);
    
    const { error } = await supabase
      .from('subscribers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subscriber:', error);
    } else if (subscriber) {
      await logActivity(user.id, null, subscriber.name, 'delete');
    }
  }, [user, subscribers]);

  const archiveSubscriber = useCallback(async (id: string) => {
    if (!user) return;
    
    const subscriber = subscribers.find(s => s.id === id);
    
    const { error } = await supabase
      .from('subscribers')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      console.error('Error archiving subscriber:', error);
    } else if (subscriber) {
      await logActivity(user.id, id, subscriber.name, 'archive', undefined, { ...subscriber, isArchived: false });
    }
  }, [user, subscribers]);

  const restoreSubscriber = useCallback(async (id: string) => {
    if (!user) return;
    
    const subscriber = subscribers.find(s => s.id === id);
    
    const { error } = await supabase
      .from('subscribers')
      .update({ is_archived: false })
      .eq('id', id);

    if (error) {
      console.error('Error restoring subscriber:', error);
    } else if (subscriber) {
      await logActivity(user.id, id, subscriber.name, 'restore', undefined, { ...subscriber, isArchived: true });
    }
  }, [user, subscribers]);

  const renewSubscription = useCallback(async (id: string, newEndDate: string, paidAmount: number) => {
    if (!user) return;
    
    const subscriber = subscribers.find(s => s.id === id);
    if (!subscriber) return;

    const newPaidAmount = subscriber.paidAmount + paidAmount;
    const newRemainingAmount = Math.max(0, subscriber.remainingAmount - paidAmount);
    const status = calculateStatus(newEndDate, newRemainingAmount, false);

    const { error } = await supabase
      .from('subscribers')
      .update({
        end_date: newEndDate,
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        status,
        is_paused: false,
        paused_until: null,
      })
      .eq('id', id);

    if (error) {
      console.error('Error renewing subscription:', error);
    } else {
      await logActivity(user.id, id, subscriber.name, 'renew', {
        newEndDate,
        paidAmount,
      }, subscriber);
    }
  }, [user, subscribers]);

  const pauseSubscription = useCallback(async (id: string, pauseUntil: string) => {
    if (!user) return;
    
    const subscriber = subscribers.find(s => s.id === id);
    if (!subscriber) return;

    const { error } = await supabase
      .from('subscribers')
      .update({
        is_paused: true,
        paused_until: pauseUntil,
        status: 'paused',
      })
      .eq('id', id);

    if (error) {
      console.error('Error pausing subscription:', error);
    } else {
      await logActivity(user.id, id, subscriber.name, 'pause', { pauseUntil }, subscriber);
    }
  }, [user, subscribers]);

  const resumeSubscription = useCallback(async (id: string) => {
    if (!user) return;
    
    const subscriber = subscribers.find(s => s.id === id);
    if (!subscriber) return;

    const status = calculateStatus(subscriber.endDate, subscriber.remainingAmount, false);

    const { error } = await supabase
      .from('subscribers')
      .update({
        is_paused: false,
        paused_until: null,
        status,
      })
      .eq('id', id);

    if (error) {
      console.error('Error resuming subscription:', error);
    } else {
      await logActivity(user.id, id, subscriber.name, 'resume', undefined, subscriber);
    }
  }, [user, subscribers]);

  const activeSubscribers = useMemo(
    () => subscribers.filter((s) => !s.isArchived),
    [subscribers]
  );

  const archivedSubscribers = useMemo(
    () => subscribers.filter((s) => s.isArchived),
    [subscribers]
  );

  const filteredSubscribers = useMemo(() => {
    return activeSubscribers.filter((sub) => {
      const matchesSearch =
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.phone.includes(searchQuery);
      const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
      const matchesCaptain = filterCaptain === 'all' || sub.captain === filterCaptain;
      
      return matchesSearch && matchesStatus && matchesCaptain;
    });
  }, [activeSubscribers, searchQuery, filterStatus, filterCaptain]);

  const stats = useMemo(() => {
    // الاشتراكات النشطة: نشط + قارب على الانتهاء (لأنهم لم ينتهوا بعد)
    const active = activeSubscribers.filter((s) => s.status === 'active' || s.status === 'expiring');
    // قارب على الانتهاء (فقط الذين لم ينتهوا - status === 'expiring')
    const expiring = activeSubscribers.filter((s) => s.status === 'expiring');
    // منتهي
    // منتهي
    const expired = activeSubscribers.filter((s) => s.status === 'expired');
    // معلق (له مبلغ متبقي) - يشمل جميع الحالات ما عدا الموقوف
    const pending = activeSubscribers.filter((s) => hasPendingAmount(s.remainingAmount) && s.status !== 'paused');
    // موقوف
    const paused = activeSubscribers.filter((s) => s.status === 'paused');

    const captains = [...new Set(activeSubscribers.map((s) => s.captain))];
    const byCaptain = captains.reduce((acc, captain) => {
      acc[captain] = activeSubscribers.filter((s) => s.captain === captain);
      return acc;
    }, {} as Record<string, Subscriber[]>);

    return { active, expiring, expired, pending, paused, byCaptain, captains };
  }, [activeSubscribers]);

  const findByPhone = useCallback((phone: string): Subscriber | undefined => {
    const cleanPhone = phone.replace(/\D/g, '');
    return subscribers.find((s) => {
      const subPhone = s.phone.replace(/\D/g, '');
      return subPhone === cleanPhone || 
             subPhone === '20' + cleanPhone ||
             '20' + subPhone === cleanPhone ||
             subPhone.endsWith(cleanPhone) ||
             cleanPhone.endsWith(subPhone);
    });
  }, [subscribers]);

  return {
    subscribers: filteredSubscribers,
    archivedSubscribers,
    allSubscribers: subscribers,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterCaptain,
    setFilterCaptain,
    filterDateRange,
    setFilterDateRange,
    addSubscriber,
    updateSubscriber,
    deleteSubscriber,
    archiveSubscriber,
    restoreSubscriber,
    renewSubscription,
    pauseSubscription,
    resumeSubscription,
    findByPhone,
  };
};
