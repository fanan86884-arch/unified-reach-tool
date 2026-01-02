import { useState } from 'react';
import { Subscriber } from '@/types/subscriber';
import { SubscriberCardCompact } from '@/components/subscribers/SubscriberCardCompact';
import { Archive as ArchiveIcon, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { WhatsAppDialog } from '@/components/subscribers/WhatsAppDialog';
import { RestoreConfirmDialog } from './RestoreConfirmDialog';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [whatsAppSubscriber, setWhatsAppSubscriber] = useState<Subscriber | null>(null);
  const [restoreConfirmSubscriber, setRestoreConfirmSubscriber] = useState<Subscriber | null>(null);

  const handleRestore = (subscriber: Subscriber) => {
    setRestoreConfirmSubscriber(subscriber);
  };

  const confirmRestore = () => {
    if (restoreConfirmSubscriber) {
      restoreSubscriber(restoreConfirmSubscriber.id);
      toast({ title: 'تم استعادة المشترك بنجاح' });
      setRestoreConfirmSubscriber(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المشترك نهائياً؟')) {
      deleteSubscriber(id);
      toast({ title: 'تم حذف المشترك نهائياً', variant: 'destructive' });
    }
  };

  const handleWhatsApp = (subscriber: Subscriber) => {
    setWhatsAppSubscriber(subscriber);
  };

  // فلترة المشتركين بناءً على البحث
  const filteredSubscribers = archivedSubscribers.filter((subscriber) =>
    subscriber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subscriber.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ArchiveIcon className="w-5 h-5 text-primary" />
        الأرشيف
      </h2>

      {/* خانة البحث */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن مشترك..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {filteredSubscribers.length === 0 ? (
        <div className="text-center py-12">
          <ArchiveIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg">
            {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد مشتركين في الأرشيف'}
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

      {/* WhatsApp Dialog */}
      <WhatsAppDialog
        isOpen={!!whatsAppSubscriber}
        onClose={() => setWhatsAppSubscriber(null)}
        subscriber={whatsAppSubscriber}
      />

      {/* Restore Confirm Dialog */}
      <RestoreConfirmDialog
        isOpen={!!restoreConfirmSubscriber}
        onClose={() => setRestoreConfirmSubscriber(null)}
        onConfirm={confirmRestore}
        subscriber={restoreConfirmSubscriber}
      />
    </div>
  );
};
