import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SubscriberForm } from '@/components/subscribers/SubscriberForm';
import { PullToRefresh } from '@/components/PullToRefresh';
import { ActivityLogSheet } from '@/components/settings/ActivityLogSheet';
import { TabContent } from '@/components/index/TabContent';
import { useCloudSubscribers } from '@/hooks/useCloudSubscribers';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useNotificationBadge } from '@/hooks/useNotificationBadge';
import { Loader2 } from 'lucide-react';
import { SubscriberFormData, Subscriber } from '@/types/subscriber';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client.runtime';
import { useLanguage } from '@/i18n/LanguageContext';

const Index = () => {
  const [activeTab, setActiveTab] = useState('subscribers');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [offlineSubscribers, setOfflineSubscribers] = useState<Subscriber[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { loadSubscribersOffline } = useOfflineStorage();
  
  // Initialize offline queue for background sync
  useOfflineQueue();
  
  // Load full offline cached dataset (active + archived) on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadSubscribersOffline();
      if (!cancelled) setOfflineSubscribers(cached);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSubscribersOffline]);

  const {
    subscribers,
    archivedSubscribers,
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
    filterGender,
    setFilterGender,
    addSubscriber,
    updateSubscriber,
    deleteSubscriber,
    archiveSubscriber,
    restoreSubscriber,
    renewSubscription,
    pauseSubscription,
    resumeSubscription,
    refetch,
  } = useCloudSubscribers();

  const offlineActive = useMemo(() => offlineSubscribers.filter(s => !s.isArchived), [offlineSubscribers]);
  const offlineArchived = useMemo(() => offlineSubscribers.filter(s => s.isArchived), [offlineSubscribers]);

  const displaySubscribers = useMemo(() => {
    if (subscribers.length > 0) return subscribers;
    if (loading && offlineActive.length > 0) return offlineActive;
    return subscribers;
  }, [loading, subscribers, offlineActive]);

  const displayArchivedSubscribers = useMemo(() => {
    if (archivedSubscribers.length > 0) return archivedSubscribers;
    return offlineArchived;
  }, [archivedSubscribers, offlineArchived]);

  // Notification badge count
  const notificationCount = useNotificationBadge(stats, activeTab);

  // Pull-to-refresh
  const {
    pullDistance,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh({ onRefresh: refetch });

  // Real-time subscriptions for live updates
  useEffect(() => {
    const channel = supabase
      .channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscribers' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_requests' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_requests' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_requests' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleAddSubscriber = useCallback(() => {
    setIsAddFormOpen(true);
  }, []);

  const handleAddSubmit = useCallback(async (data: SubscriberFormData) => {
    const result = await addSubscriber(data);
    if (result.success) {
      toast({ title: t.subscribers.addedSuccess });
      setIsAddFormOpen(false);
      return;
    }
    toast({ title: result.error || t.subscribers.addError, variant: 'destructive' });
  }, [addSubscriber, toast]);

  const handleOpenActivityLog = useCallback(() => {
    setIsActivityLogOpen(true);
  }, []);

  const captains = useMemo(() => ['كابتن خالد', 'كابتن محمد', 'كابتن أحمد'], []);

  // Show loading only if we have no cached active or archived data
  const showLoading = loading && displaySubscribers.length === 0 && displayArchivedSubscribers.length === 0;

  if (showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background select-none max-w-5xl mx-auto">
      <Header onOpenActivityLog={handleOpenActivityLog} isRefreshing={isRefreshing} />
      
      <PullToRefresh pullDistance={pullDistance} isRefreshing={isRefreshing} />
      
      <main 
        ref={mainRef}
        className="container px-4 md:px-8 py-6 pb-24 overflow-y-auto"
        onTouchStart={(e) => handleTouchStart(e, mainRef.current?.scrollTop ?? 0)}
        onTouchMove={(e) => handleTouchMove(e, mainRef.current?.scrollTop ?? 0)}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : 'none',
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        <TabContent
          activeTab={activeTab}
          subscribers={displaySubscribers}
          archivedSubscribers={displayArchivedSubscribers}
          stats={stats}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterCaptain={filterCaptain}
          setFilterCaptain={setFilterCaptain}
          filterDateRange={filterDateRange}
          setFilterDateRange={setFilterDateRange}
          addSubscriber={addSubscriber}
          updateSubscriber={updateSubscriber}
          deleteSubscriber={deleteSubscriber}
          archiveSubscriber={archiveSubscriber}
          restoreSubscriber={restoreSubscriber}
          renewSubscription={renewSubscription}
          pauseSubscription={pauseSubscription}
          resumeSubscription={resumeSubscription}
        />
      </main>
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onAddSubscriber={handleAddSubscriber}
        notificationCount={notificationCount}
      />
      
      <ActivityLogSheet 
        open={isActivityLogOpen} 
        onOpenChange={setIsActivityLogOpen} 
      />
      
      <SubscriberForm
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
        onSubmit={handleAddSubmit}
        editingSubscriber={null}
        captains={captains}
      />
    </div>
  );
};

export default Index;
