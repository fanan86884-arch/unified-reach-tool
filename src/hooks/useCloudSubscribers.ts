import { useState, useEffect, useMemo, useCallback } from 'react';
import { Subscriber, SubscriberFormData, SubscriptionStatus } from '@/types/subscriber';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, startOfDay, endOfDay, endOfWeek, endOfMonth, isWithinInterval, isBefore } from 'date-fns';
import { useAuth } from './useAuth';

const calculateStatus = (endDate: string, remainingAmount: number, isPaused?: boolean): SubscriptionStatus => {
  if (isPaused) return 'paused';
  
  const today = startOfDay(new Date());
  const end = startOfDay(parseISO(endDate));
  const daysRemaining = differenceInDays(end, today);

  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 7) return 'expiring';
  if (remainingAmount > 0) return 'pending';
  return 'active';
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

  // Fetch subscribers
  const fetchSubscribers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
      setSubscribers(updated);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

    const status = calculateStatus(data.endDate, data.remainingAmount);

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
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding subscriber:', error);
      return null;
    }

    return mapDbToSubscriber(newData);
  }, [user]);

  const updateSubscriber = useCallback(async (id: string, data: Partial<SubscriberFormData>) => {
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
      const subscriber = subscribers.find(s => s.id === id);
      if (subscriber) {
        updateData.status = calculateStatus(
          data.endDate ?? subscriber.endDate,
          data.remainingAmount ?? subscriber.remainingAmount
        );
      }
    }

    const { error } = await supabase
      .from('subscribers')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating subscriber:', error);
    }
  }, [subscribers]);

  const deleteSubscriber = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('subscribers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subscriber:', error);
    }
  }, []);

  const archiveSubscriber = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('subscribers')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      console.error('Error archiving subscriber:', error);
    }
  }, []);

  const restoreSubscriber = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('subscribers')
      .update({ is_archived: false })
      .eq('id', id);

    if (error) {
      console.error('Error restoring subscriber:', error);
    }
  }, []);

  const renewSubscription = useCallback(async (id: string, newEndDate: string, paidAmount: number) => {
    const subscriber = subscribers.find(s => s.id === id);
    if (!subscriber) return;

    const newPaidAmount = subscriber.paidAmount + paidAmount;
    const newRemainingAmount = Math.max(0, subscriber.remainingAmount - paidAmount);
    const status = calculateStatus(newEndDate, newRemainingAmount);

    const { error } = await supabase
      .from('subscribers')
      .update({
        end_date: newEndDate,
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        status,
      })
      .eq('id', id);

    if (error) {
      console.error('Error renewing subscription:', error);
    }
  }, [subscribers]);

  const activeSubscribers = useMemo(
    () => subscribers.filter((s) => !s.isArchived),
    [subscribers]
  );

  const archivedSubscribers = useMemo(
    () => subscribers.filter((s) => s.isArchived),
    [subscribers]
  );

  const filteredSubscribers = useMemo(() => {
    const today = new Date();
    
    return activeSubscribers.filter((sub) => {
      const matchesSearch =
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.phone.includes(searchQuery);
      const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
      const matchesCaptain = filterCaptain === 'all' || sub.captain === filterCaptain;
      
      let matchesDate = true;
      if (filterDateRange !== 'all') {
        const endDate = parseISO(sub.endDate);
        
        switch (filterDateRange) {
          case 'today':
            matchesDate = isWithinInterval(endDate, {
              start: startOfDay(today),
              end: endOfDay(today),
            });
            break;
          case 'week':
            matchesDate = isWithinInterval(endDate, {
              start: startOfDay(today),
              end: endOfWeek(today, { weekStartsOn: 6 }),
            });
            break;
          case 'month':
            matchesDate = isWithinInterval(endDate, {
              start: startOfDay(today),
              end: endOfMonth(today),
            });
            break;
          case 'expired':
            matchesDate = isBefore(endDate, startOfDay(today));
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesCaptain && matchesDate;
    });
  }, [activeSubscribers, searchQuery, filterStatus, filterCaptain, filterDateRange]);

  const stats = useMemo(() => {
    const active = activeSubscribers.filter((s) => s.status === 'active');
    const expiring = activeSubscribers.filter((s) => s.status === 'expiring');
    const expired = activeSubscribers.filter((s) => s.status === 'expired');
    const pending = activeSubscribers.filter((s) => s.status === 'pending');

    const captains = [...new Set(activeSubscribers.map((s) => s.captain))];
    const byCaptain = captains.reduce((acc, captain) => {
      acc[captain] = activeSubscribers.filter((s) => s.captain === captain);
      return acc;
    }, {} as Record<string, Subscriber[]>);

    return { active, expiring, expired, pending, byCaptain, captains };
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
    findByPhone,
  };
};
