import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SubscribersList } from '@/components/subscribers/SubscribersList';
import { Statistics } from '@/components/statistics/Statistics';
import { Archive } from '@/components/archive/Archive';
import { Notifications } from '@/components/notifications/Notifications';
import { Settings } from '@/components/settings/Settings';
import { useSubscribers } from '@/hooks/useSubscribers';

const Index = () => {
  const [activeTab, setActiveTab] = useState('subscribers');
  const {
    subscribers,
    archivedSubscribers,
    stats,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterCaptain,
    setFilterCaptain,
    addSubscriber,
    updateSubscriber,
    deleteSubscriber,
    archiveSubscriber,
    restoreSubscriber,
    renewSubscription,
  } = useSubscribers();

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
            addSubscriber={addSubscriber}
            updateSubscriber={updateSubscriber}
            deleteSubscriber={deleteSubscriber}
            archiveSubscriber={archiveSubscriber}
            renewSubscription={renewSubscription}
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6">{renderContent()}</main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
