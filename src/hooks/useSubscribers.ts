import { useState, useEffect, useMemo } from 'react';
import { Subscriber, SubscriberFormData, SubscriptionStatus } from '@/types/subscriber';
import { differenceInDays, parseISO, startOfDay, endOfDay, endOfWeek, endOfMonth, isWithinInterval, isBefore } from 'date-fns';

const STORAGE_KEY = 'gym_subscribers';

const generateId = () => Math.random().toString(36).substr(2, 9);

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

export const useSubscribers = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | 'all'>('all');
  const [filterCaptain, setFilterCaptain] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Recalculate statuses on load
        const updated = parsed.map((sub: Subscriber) => ({
          ...sub,
          status: calculateStatus(sub.endDate, sub.remainingAmount),
        }));
        setSubscribers(updated);
      } catch (e) {
        console.error('Error loading subscribers:', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscribers));
  }, [subscribers]);

  const addSubscriber = (data: SubscriberFormData) => {
    const newSubscriber: Subscriber = {
      ...data,
      id: generateId(),
      status: calculateStatus(data.endDate, data.remainingAmount, false),
      isArchived: false,
      isPaused: false,
      pausedUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSubscribers((prev) => [...prev, newSubscriber]);
    return newSubscriber;
  };

  const updateSubscriber = (id: string, data: Partial<SubscriberFormData>) => {
    setSubscribers((prev) =>
      prev.map((sub) => {
        if (sub.id === id) {
          const updated = { ...sub, ...data, updatedAt: new Date().toISOString() };
          updated.status = calculateStatus(updated.endDate, updated.remainingAmount);
          return updated;
        }
        return sub;
      })
    );
  };

  const deleteSubscriber = (id: string) => {
    setSubscribers((prev) => prev.filter((sub) => sub.id !== id));
  };

  const archiveSubscriber = (id: string) => {
    setSubscribers((prev) =>
      prev.map((sub) =>
        sub.id === id ? { ...sub, isArchived: true, updatedAt: new Date().toISOString() } : sub
      )
    );
  };

  const restoreSubscriber = (id: string) => {
    setSubscribers((prev) =>
      prev.map((sub) =>
        sub.id === id ? { ...sub, isArchived: false, updatedAt: new Date().toISOString() } : sub
      )
    );
  };

  const renewSubscription = (id: string, newEndDate: string, paidAmount: number) => {
    setSubscribers((prev) =>
      prev.map((sub) => {
        if (sub.id === id) {
          const updated = {
            ...sub,
            endDate: newEndDate,
            paidAmount: sub.paidAmount + paidAmount,
            remainingAmount: Math.max(0, sub.remainingAmount - paidAmount),
            updatedAt: new Date().toISOString(),
          };
          updated.status = calculateStatus(updated.endDate, updated.remainingAmount);
          return updated;
        }
        return sub;
      })
    );
  };

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
      
      // فلترة التاريخ
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

  const findByPhone = (phone: string): Subscriber | undefined => {
    // تنظيف رقم الهاتف للمطابقة
    const cleanPhone = phone.replace(/\D/g, '');
    return subscribers.find((s) => {
      const subPhone = s.phone.replace(/\D/g, '');
      // مطابقة مع أو بدون مفتاح الدولة
      return subPhone === cleanPhone || 
             subPhone === '20' + cleanPhone ||
             '20' + subPhone === cleanPhone ||
             subPhone.endsWith(cleanPhone) ||
             cleanPhone.endsWith(subPhone);
    });
  };

  return {
    subscribers: filteredSubscribers,
    archivedSubscribers,
    allSubscribers: subscribers,
    stats,
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
