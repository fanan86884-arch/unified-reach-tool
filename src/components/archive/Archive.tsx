import { useState } from 'react';
import { Subscriber } from '@/types/subscriber';
import { SubscriberCardCompact } from '@/components/subscribers/SubscriberCardCompact';
import { Archive as ArchiveIcon, Search, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { WhatsAppDialog } from '@/components/subscribers/WhatsAppDialog';
import { RestoreConfirmDialog } from './RestoreConfirmDialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

interface ArchiveProps {
  archivedSubscribers: Subscriber[];
  restoreSubscriber: (id: string) => void;
  deleteSubscriber: (id: string) => void;
}

export const Archive = ({
  archivedSubscribers,
  restoreSubscriber,
  deleteSubscriber,
}: ArchiveProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [whatsAppSubscriber, setWhatsAppSubscriber] = useState<Subscriber | null>(null);
  const [restoreConfirmSubscriber, setRestoreConfirmSubscriber] = useState<Subscriber | null>(null);

  const handleRestore = (subscriber: Subscriber) => {
    setRestoreConfirmSubscriber(subscriber);
  };

  const confirmRestore = () => {
    if (restoreConfirmSubscriber) {
      restoreSubscriber(restoreConfirmSubscriber.id);
      toast({ title: t.subscribers.restoredSuccess });
      setRestoreConfirmSubscriber(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t.subscribers.deleteConfirm)) {
      deleteSubscriber(id);
      toast({ title: t.subscribers.deletedSuccess, variant: 'destructive' });
    }
  };

  const handleWhatsApp = (subscriber: Subscriber) => {
    setWhatsAppSubscriber(subscriber);
  };

  const filteredSubscribers = archivedSubscribers.filter((subscriber) =>
    subscriber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subscriber.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ArchiveIcon className="w-5 h-5 text-primary" />
          {t.archive.title}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSearch(!showSearch)}
          className="rounded-full w-9 h-9"
        >
          {showSearch ? <ChevronUp className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </Button>
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: showSearch ? '60px' : '0', opacity: showSearch ? 1 : 0 }}
      >
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.archive.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {filteredSubscribers.length === 0 ? (
        <div className="text-center py-12">
          <ArchiveIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg">
            {searchQuery ? t.archive.noSearchResults : t.archive.noArchived}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubscribers.map((subscriber) => (
            <SubscriberCardCompact
              key={subscriber.id}
              subscriber={subscriber}
              onEdit={() => {}}
              onDelete={handleDelete}
              onArchive={() => {}}
              onRestore={() => handleRestore(subscriber)}
              onRenew={() => {}}
              onWhatsApp={handleWhatsApp}
              onPause={() => {}}
              onResume={() => {}}
              isArchived
            />
          ))}
        </div>
      )}

      <WhatsAppDialog
        isOpen={!!whatsAppSubscriber}
        onClose={() => setWhatsAppSubscriber(null)}
        subscriber={whatsAppSubscriber}
      />

      <RestoreConfirmDialog
        isOpen={!!restoreConfirmSubscriber}
        onClose={() => setRestoreConfirmSubscriber(null)}
        onConfirm={confirmRestore}
        subscriber={restoreConfirmSubscriber}
      />
    </div>
  );
};
