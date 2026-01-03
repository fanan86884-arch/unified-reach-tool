import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SubscribersList } from '@/components/subscribers/SubscribersList';
import { Statistics } from '@/components/statistics/Statistics';
import { Archive } from '@/components/archive/Archive';
import { Notifications } from '@/components/notifications/Notifications';
import { Settings } from '@/components/settings/Settings';
import { SubscriberForm } from '@/components/subscribers/SubscriberForm';
import { useCloudSubscribers } from '@/hooks/useCloudSubscribers';
import { Loader2 } from 'lucide-react';
import { SubscriberFormData } from '@/types/subscriber';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [activeTab, setActiveTab] = useState('subscribers');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
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
  } = useCloudSubscribers();

  const handleAddSubscriber = () => {
    setIsAddFormOpen(true);
  };

  const handleAddSubmit = (data: SubscriberFormData) => {
    addSubscriber(data);
    toast({ title: 'تم إضافة المشترك بنجاح' });
    setIsAddFormOpen(false);
  };

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
      case 'archive':
        return (
          <Archive
            archivedSubscribers={archivedSubscribers}
            restoreSubscriber={restoreSubscriber}
            deleteSubscriber={deleteSubscriber}
          />
        );
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
      <main className="container px-4 py-6">{renderContent()}</main>
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onAddSubscriber={handleAddSubscriber}
      />
      
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
