import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Subscriber, SubscriberFormData, SubscriptionStatus } from '@/types/subscriber';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { useAuth } from './useAuth';
import { normalizeEgyptPhoneDigits } from '@/lib/phone';
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

  const checkPhoneExists = useCallback(async (phone: string, excludeId?: string): Promise<boolean> => {
    if (!user) return false;

    const normalized = normalizeEgyptPhoneDigits(phone);
    if (!normalized) return false;

    const { data, error } = await supabase
      .from('subscribers')
      .select('id, phone')
      .eq('user_id', user.id);

    if (error || !data) return false;

    return data.some(sub => {
      if (excludeId && sub.id === excludeId) return false;
      return normalizeEgyptPhoneDigits(sub.phone) === normalized;
    });
  }, [user]);

  const addSubscriber = useCallback(async (data: SubscriberFormData): Promise<{ success: boolean; subscriber?: Subscriber; error?: string }> => {
    if (!user) return { success: false, error: 'غير مصرح' };

    const normalizedPhone = normalizeEgyptPhoneDigits(data.phone);
    if (!normalizedPhone) {
      return { success: false, error: 'رقم الهاتف غير صحيح' };
    }

    // Check if phone already exists (including archived)
    const phoneExists = await checkPhoneExists(normalizedPhone);
    if (phoneExists) {
      return { success: false, error: 'رقم الهاتف مسجل بالفعل' };
    }

    const status = calculateStatus(data.endDate, data.remainingAmount, false);

    const { data: newData, error } = await supabase
      .from('subscribers')
      .insert({
        user_id: user.id,
        name: data.name,
        phone: normalizedPhone,
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
      return { success: false, error: 'حدث خطأ أثناء الإضافة' };
    }

    // Log activity
    await logActivity(user.id, newData.id, data.name, 'add', {
      subscriptionType: data.subscriptionType,
      paidAmount: data.paidAmount,
    });

    return { success: true, subscriber: mapDbToSubscriber(newData) };
  }, [user, checkPhoneExists]);

  const updateSubscriber = useCallback(async (id: string, data: Partial<SubscriberFormData>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'غير مصرح' };

    const subscriber = subscribers.find(s => s.id === id);
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;

    if (data.phone !== undefined) {
      const normalizedPhone = normalizeEgyptPhoneDigits(data.phone);
      if (!normalizedPhone) {
        return { success: false, error: 'رقم الهاتف غير صحيح' };
      }

      // منع تكرار الرقم عند التعديل
      const exists = await checkPhoneExists(normalizedPhone, id);
      if (exists) {
        return { success: false, error: 'رقم الهاتف مسجل بالفعل' };
      }

      updateData.phone = normalizedPhone;
    }

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
      return { success: false, error: 'حدث خطأ أثناء التعديل' };
    }

    if (subscriber) {
      // Log activity with previous data
      await logActivity(user.id, id, subscriber.name, 'update', data, subscriber);
    }

    return { success: true };
  }, [user, subscribers, checkPhoneExists]);

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

    // حساب تاريخ البداية والنهاية الجديد بناءً على التواريخ القديمة + شهر
    const oldEndDate = new Date(subscriber.endDate);
    const oldStartDate = new Date(subscriber.startDate);
    
    // تاريخ البداية الجديد = يوم بعد تاريخ الانتهاء القديم (أول يوم من الشهر الجديد)
    const newStartDate = new Date(oldEndDate);
    newStartDate.setDate(newStartDate.getDate() + 1);
    
    // حساب عدد الأيام في الاشتراك القديم
    const subscriptionDays = Math.round((oldEndDate.getTime() - oldStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // تاريخ الانتهاء الجديد = تاريخ البداية الجديد + نفس عدد الأيام
    const calculatedEndDate = new Date(newStartDate);
    calculatedEndDate.setDate(calculatedEndDate.getDate() + subscriptionDays);
    
    const formattedStartDate = newStartDate.toISOString().split('T')[0];
    const formattedEndDate = calculatedEndDate.toISOString().split('T')[0];
    
    const newRemainingAmount = Math.max(0, subscriber.remainingAmount - paidAmount);
    const status = calculateStatus(formattedEndDate, newRemainingAmount, false);

    const { error } = await supabase
      .from('subscribers')
      .update({
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        paid_amount: paidAmount,
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
        newStartDate: formattedStartDate,
        newEndDate: formattedEndDate,
        paidAmount,
      }, subscriber);
    }
  }, [user, subscribers]);

  const pauseSubscription = useCallback(async (id: string, pauseUntil: string) => {
    if (!user) return;
    
    const subscriber = subscribers.find(s => s.id === id);
    if (!subscriber) return;

    // حساب عدد أيام الإيقاف وإضافتها على تاريخ الانتهاء
    const today = startOfDay(new Date());
    const pauseEndDate = startOfDay(parseISO(pauseUntil));
    const pauseDays = differenceInDays(pauseEndDate, today);
    
    // تاريخ الانتهاء الجديد = تاريخ الانتهاء الحالي + أيام الإيقاف
    const currentEndDate = new Date(subscriber.endDate);
    currentEndDate.setDate(currentEndDate.getDate() + pauseDays);
    const newEndDate = currentEndDate.toISOString().split('T')[0];

    const { error } = await supabase
      .from('subscribers')
      .update({
        is_paused: true,
        paused_until: pauseUntil,
        status: 'paused',
        end_date: newEndDate,
      })
      .eq('id', id);

    if (error) {
      console.error('Error pausing subscription:', error);
    } else {
      await logActivity(user.id, id, subscriber.name, 'pause', { 
        pauseUntil, 
        pauseDays,
        oldEndDate: subscriber.endDate,
        newEndDate 
      }, subscriber);
    }
  }, [user, subscribers]);

  const resumeSubscription = useCallback(async (id: string) => {
    if (!user) return;
    
    const subscriber = subscribers.find(s => s.id === id);
    if (!subscriber || !subscriber.pausedUntil) return;

    // حساب الأيام المتبقية من الإيقاف (أو التي مرت بعد الموعد)
    const today = startOfDay(new Date());
    const pauseEndDate = startOfDay(parseISO(subscriber.pausedUntil));
    const daysRemaining = differenceInDays(pauseEndDate, today);
    
    // إذا الاستئناف قبل الموعد: نقلل تاريخ الانتهاء بالأيام المتبقية
    // إذا الاستئناف بعد الموعد: نزيد تاريخ الانتهاء بالأيام الإضافية
    const currentEndDate = new Date(subscriber.endDate);
    currentEndDate.setDate(currentEndDate.getDate() - daysRemaining);
    const newEndDate = currentEndDate.toISOString().split('T')[0];

    const status = calculateStatus(newEndDate, subscriber.remainingAmount, false);

    const { error } = await supabase
      .from('subscribers')
      .update({
        is_paused: false,
        paused_until: null,
        status,
        end_date: newEndDate,
      })
      .eq('id', id);

    if (error) {
      console.error('Error resuming subscription:', error);
    } else {
      await logActivity(user.id, id, subscriber.name, 'resume', {
        oldEndDate: subscriber.endDate,
        newEndDate,
        daysAdjusted: -daysRemaining,
      }, subscriber);
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
    refetch: fetchSubscribers,
  };
};
