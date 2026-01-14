import { useState, useCallback, useRef, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SubscribersList } from '@/components/subscribers/SubscribersList';
import { Statistics } from '@/components/statistics/Statistics';
import { Notifications } from '@/components/notifications/Notifications';
import { Settings } from '@/components/settings/Settings';
import { SubscriberForm } from '@/components/subscribers/SubscriberForm';
import { AIFloatingButton } from '@/components/ai/AIFloatingButton';
import { useCloudSubscribers } from '@/hooks/useCloudSubscribers';
import { Loader2 } from 'lucide-react';
import { SubscriberFormData } from '@/types/subscriber';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [activeTab, setActiveTab] = useState('subscribers');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
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

  const handleAddSubscriber = () => {
    setIsAddFormOpen(true);
  };

  const handleAddSubmit = async (data: SubscriberFormData) => {
    const result = await addSubscriber(data);
    if (result.success) {
      toast({ title: 'تم إضافة المشترك بنجاح' });
      setIsAddFormOpen(false);
      return;
    }

    toast({ title: result.error || 'حدث خطأ أثناء الإضافة', variant: 'destructive' });
  };

  // Calculate notification count - MUST be before any conditional returns
  const notificationCount = useMemo(() => {
    return stats.expired.length + stats.expiring.length + stats.pending.length;
  }, [stats]);

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (mainRef.current && mainRef.current.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY > 0 && mainRef.current && mainRef.current.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 150));
      }
    }
  }, [pullStartY]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      await refetch();
      setIsRefreshing(false);
      toast({ title: 'تم تحديث البيانات' });
    }
    setPullStartY(0);
    setPullDistance(0);
  }, [pullDistance, refetch, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'subscribers':
        return (
          <SubscribersList
            subscribers={subscribers}
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
            renewSubscription={renewSubscription}
            pauseSubscription={pauseSubscription}
            resumeSubscription={resumeSubscription}
          />
        );
      case 'statistics':
        return <Statistics stats={stats} />;
      case 'notifications':
        return <Notifications stats={stats} />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  const captains = ['كابتن خالد', 'كابتن محمد', 'كابتن أحمد'];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main 
        ref={mainRef}
        className="container px-4 py-6 pb-20"
      >
        {renderContent()}
      </main>
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onAddSubscriber={handleAddSubscriber}
        notificationCount={notificationCount}
      />
      
      {/* AI Floating Button */}
      <AIFloatingButton />
      
      {/* Add subscriber form triggered from bottom nav */}
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
