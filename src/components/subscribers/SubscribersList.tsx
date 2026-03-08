import { useState, useRef, useCallback } from 'react';
import { Subscriber, SubscriberFormData, SubscriptionStatus } from '@/types/subscriber';
import { SubscriberCardCompact } from './SubscriberCardCompact';
import { SubscriberForm } from './SubscriberForm';
import { RenewDialog } from './RenewDialog';
import { PauseDialog } from './PauseDialog';
import { WhatsAppDialog } from './WhatsAppDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';

interface SubscribersListProps {
  subscribers: Subscriber[];
  stats: {
    captains: string[];
  };
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: SubscriptionStatus | 'all';
  setFilterStatus: (status: SubscriptionStatus | 'all') => void;
  filterCaptain: string;
  setFilterCaptain: (captain: string) => void;
  filterDateRange: string;
  setFilterDateRange: (range: string) => void;
  addSubscriber: (data: SubscriberFormData) => Promise<{ success: boolean; subscriber?: Subscriber; error?: string }> | { success: boolean; subscriber?: Subscriber; error?: string };
  updateSubscriber: (id: string, data: Partial<SubscriberFormData>) => Promise<{ success: boolean; error?: string }>;
  deleteSubscriber: (id: string) => void | Promise<void>;
  archiveSubscriber: (id: string) => void | Promise<void>;
  restoreSubscriber?: (id: string) => void | Promise<void>;
  renewSubscription: (id: string, newEndDate: string, paidAmount: number) => void | Promise<void>;
  pauseSubscription?: (id: string, pauseUntil: string) => void | Promise<void>;
  resumeSubscription?: (id: string) => void | Promise<void>;
  onOpenForm?: () => void;
}

export const SubscribersList = ({
  subscribers,
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
  pauseSubscription,
  resumeSubscription,
  onOpenForm,
}: SubscribersListProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [renewingSubscriber, setRenewingSubscriber] = useState<Subscriber | null>(null);
  const [pausingSubscriber, setPausingSubscriber] = useState<Subscriber | null>(null);
  const [whatsAppSubscriber, setWhatsAppSubscriber] = useState<Subscriber | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Expose openForm function via ref or callback
  const openFormCallback = useRef<(() => void) | null>(null);
  openFormCallback.current = () => setIsFormOpen(true);

  // Call onOpenForm callback when form should be opened externally
  if (onOpenForm) {
    // This will be handled by parent component
  }

  const handleAddOrEdit = async (data: SubscriberFormData) => {
    if (editingSubscriber) {
      const result = await updateSubscriber(editingSubscriber.id, data);
      if (!result.success) {
        toast({ title: result.error || t.settings.saveError, variant: 'destructive' });
        return;
      }
      toast({ title: t.subscribers.updatedSuccess });
    } else {
      const result = await addSubscriber(data);
      if (result.success) {
        toast({ title: t.subscribers.addedSuccess });
      } else {
        toast({ title: result.error || t.settings.saveError, variant: 'destructive' });
        return;
      }
    }
    setEditingSubscriber(null);
    setIsFormOpen(false);
  };

  const handleEdit = (subscriber: Subscriber) => {
    setEditingSubscriber(subscriber);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t.subscribers.deleteConfirm)) {
      deleteSubscriber(id);
      toast({ title: t.subscribers.deletedSuccess, variant: 'destructive' });
    }
  };

  const handleRenew = (subscriber: Subscriber) => {
    setRenewingSubscriber(subscriber);
    setIsRenewOpen(true);
  };

  const handlePause = (subscriber: Subscriber) => {
    setPausingSubscriber(subscriber);
    setIsPauseOpen(true);
  };

  const handleResume = (id: string) => {
    if (resumeSubscription) {
      resumeSubscription(id);
      toast({ title: t.actions.resume });
    }
  };

  const handleRestore = (id: string) => {
    if (restoreSubscriber) {
      restoreSubscriber(id);
      toast({ title: t.subscribers.restoredSuccess });
    }
  };

  const handleWhatsApp = (subscriber: Subscriber) => {
    setWhatsAppSubscriber(subscriber);
    setIsWhatsAppOpen(true);
  };

  const captains = stats.captains.length > 0 ? stats.captains : ['كابتن خالد', 'كابتن محمد', 'كابتن أحمد'];

  // Expose method to open form externally
  const handleOpenForm = () => {
    setEditingSubscriber(null);
    setIsFormOpen(true);
  };

  // Register callback
  if (onOpenForm === undefined) {
    // Component manages its own state
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t.subscribers.title}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-full w-9 h-9"
          >
            {showFilters ? <ChevronUp className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </Button>
          <Button onClick={handleOpenForm} size="icon" className="rounded-full w-9 h-9">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: showFilters ? '300px' : '0', opacity: showFilters ? 1 : 0 }}
      >
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.subscribers.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as SubscriptionStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder={t.filters.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filters.allStatuses}</SelectItem>
                <SelectItem value="active">{t.status.active}</SelectItem>
                <SelectItem value="expiring">{t.status.expiring}</SelectItem>
                <SelectItem value="expired">{t.status.expired}</SelectItem>
                <SelectItem value="paused">{t.status.paused}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCaptain} onValueChange={setFilterCaptain}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t.filters.captain} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filters.allCaptains}</SelectItem>
                {captains.map((captain) => (
                  <SelectItem key={captain} value={captain}>
                    {captain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {subscribers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg">{t.subscribers.noSubscribers}</p>
          <p className="text-sm text-muted-foreground">{t.subscribers.addFirst}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subscribers.map((subscriber, index) => (
            <div
              key={subscriber.id}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: 'both' }}
            >
              <SubscriberCardCompact
                subscriber={subscriber}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onArchive={archiveSubscriber}
                onRestore={handleRestore}
                onRenew={handleRenew}
                onWhatsApp={handleWhatsApp}
                onPause={handlePause}
                onResume={handleResume}
              />
            </div>
          ))}
        </div>
      )}

      <SubscriberForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSubscriber(null);
        }}
        onSubmit={handleAddOrEdit}
        editingSubscriber={editingSubscriber}
        captains={captains}
      />

      <RenewDialog
        isOpen={isRenewOpen}
        onClose={() => {
          setIsRenewOpen(false);
          setRenewingSubscriber(null);
        }}
        subscriber={renewingSubscriber}
        onRenew={renewSubscription}
      />

      <PauseDialog
        isOpen={isPauseOpen}
        onClose={() => {
          setIsPauseOpen(false);
          setPausingSubscriber(null);
        }}
        subscriber={pausingSubscriber}
        onPause={(id, pauseUntil) => {
          if (pauseSubscription) {
            pauseSubscription(id, pauseUntil);
            toast({ title: 'تم إيقاف الاشتراك بنجاح' });
          }
        }}
      />

      <WhatsAppDialog
        isOpen={isWhatsAppOpen}
        onClose={() => {
          setIsWhatsAppOpen(false);
          setWhatsAppSubscriber(null);
        }}
        subscriber={whatsAppSubscriber}
      />
    </div>
  );
};

// Export a hook to trigger form opening
export const useSubscriberFormTrigger = () => {
  const [shouldOpen, setShouldOpen] = useState(false);
  
  const triggerOpen = () => setShouldOpen(true);
  const reset = () => setShouldOpen(false);
  
  return { shouldOpen, triggerOpen, reset };
};
