import { memo, useMemo } from 'react';
import { SubscribersList } from '@/components/subscribers/SubscribersList';
import { Subscriber, SubscriberFormData, SubscriptionStatus } from '@/types/subscriber';
import { useCaptains } from '@/hooks/useCaptains';

interface SubscribersTabProps {
  subscribers: Subscriber[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: SubscriptionStatus | 'all';
  setFilterStatus: (status: SubscriptionStatus | 'all') => void;
  filterCaptain: string;
  setFilterCaptain: (captain: string) => void;
  filterDateRange: string;
  setFilterDateRange: (range: string) => void;
  filterGender: string;
  setFilterGender: (gender: string) => void;
  showAdminSubscribers?: boolean;
  setShowAdminSubscribers?: (show: boolean) => void;
  hiddenAdminCount?: number;
  isAdmin?: boolean;
  addSubscriber: (data: SubscriberFormData) => Promise<{ success: boolean; subscriber?: Subscriber; error?: string }>;
  updateSubscriber: (id: string, data: Partial<SubscriberFormData>) => Promise<{ success: boolean; error?: string }>;
  deleteSubscriber: (id: string) => Promise<void>;
  archiveSubscriber: (id: string) => Promise<void>;
  restoreSubscriber: (id: string) => Promise<void>;
  renewSubscription: (id: string, newEndDate: string, paidAmount: number) => Promise<void>;
  pauseSubscription: (id: string, pauseUntil: string) => Promise<void>;
  resumeSubscription: (id: string) => Promise<void>;
}

export const SubscribersTab = memo(({
  subscribers,
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
  showAdminSubscribers,
  setShowAdminSubscribers,
  hiddenAdminCount,
  isAdmin,
  addSubscriber,
  updateSubscriber,
  deleteSubscriber,
  archiveSubscriber,
  restoreSubscriber,
  renewSubscription,
  pauseSubscription,
  resumeSubscription,
}: SubscribersTabProps) => {
  const { captains } = useCaptains();
  const stats = useMemo(() => ({
    captains,
  }), [captains]);

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
      filterGender={filterGender}
      setFilterGender={setFilterGender}
      showAdminSubscribers={showAdminSubscribers}
      setShowAdminSubscribers={setShowAdminSubscribers}
      hiddenAdminCount={hiddenAdminCount}
      isAdmin={isAdmin}
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
});

SubscribersTab.displayName = 'SubscribersTab';