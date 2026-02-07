import { memo, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { SubscribersTab } from './SubscribersTab';
import { Subscriber, SubscriberFormData, SubscriptionStatus } from '@/types/subscriber';

// Lazy load non-critical tabs
const Statistics = lazy(() => import('@/components/statistics/Statistics').then(m => ({ default: m.Statistics })));
const Notifications = lazy(() => import('@/components/notifications/Notifications').then(m => ({ default: m.Notifications })));
const Settings = lazy(() => import('@/components/settings/Settings').then(m => ({ default: m.Settings })));
const Archive = lazy(() => import('@/components/archive/Archive').then(m => ({ default: m.Archive })));

interface StatsType {
  active: Subscriber[];
  expired: Subscriber[];
  expiring: Subscriber[];
  pending: Subscriber[];
  paused: Subscriber[];
  byCaptain: Record<string, Subscriber[]>;
  captains: string[];
}

interface TabContentProps {
  activeTab: string;
  subscribers: Subscriber[];
  archivedSubscribers: Subscriber[];
  stats: StatsType;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: SubscriptionStatus | 'all';
  setFilterStatus: (status: SubscriptionStatus | 'all') => void;
  filterCaptain: string;
  setFilterCaptain: (captain: string) => void;
  filterDateRange: string;
  setFilterDateRange: (range: string) => void;
  addSubscriber: (data: SubscriberFormData) => Promise<{ success: boolean; subscriber?: Subscriber; error?: string }>;
  updateSubscriber: (id: string, data: Partial<SubscriberFormData>) => Promise<{ success: boolean; error?: string }>;
  deleteSubscriber: (id: string) => Promise<void>;
  archiveSubscriber: (id: string) => Promise<void>;
  restoreSubscriber: (id: string) => Promise<void>;
  renewSubscription: (id: string, newEndDate: string, paidAmount: number) => Promise<void>;
  pauseSubscription: (id: string, pauseUntil: string) => Promise<void>;
  resumeSubscription: (id: string) => Promise<void>;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

export const TabContent = memo(({
  activeTab,
  subscribers,
  archivedSubscribers,
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
  pauseSubscription,
  resumeSubscription,
}: TabContentProps) => {
  switch (activeTab) {
    case 'subscribers':
      return (
        <SubscribersTab
          subscribers={subscribers}
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
      );
    case 'statistics':
      return (
        <Suspense fallback={<LoadingFallback />}>
          <Statistics stats={stats} allSubscribers={subscribers} />
        </Suspense>
      );
    case 'archive':
      return (
        <Suspense fallback={<LoadingFallback />}>
          <Archive
            archivedSubscribers={archivedSubscribers}
            restoreSubscriber={restoreSubscriber}
            deleteSubscriber={deleteSubscriber}
          />
        </Suspense>
      );
    case 'notifications':
      return (
        <Suspense fallback={<LoadingFallback />}>
          <Notifications stats={stats} />
        </Suspense>
      );
    case 'settings':
      return (
        <Suspense fallback={<LoadingFallback />}>
          <Settings />
        </Suspense>
      );
    default:
      return null;
  }
});

TabContent.displayName = 'TabContent';