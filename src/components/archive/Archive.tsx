import { Subscriber } from '@/types/subscriber';
import { SubscriberCard } from '@/components/subscribers/SubscriberCard';
import { Archive as ArchiveIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const handleRestore = (id: string) => {
    restoreSubscriber(id);
    toast({ title: 'تم استعادة المشترك بنجاح' });
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المشترك نهائياً؟')) {
      deleteSubscriber(id);
      toast({ title: 'تم حذف المشترك نهائياً', variant: 'destructive' });
    }
  };

  const handleWhatsApp = (subscriber: Subscriber) => {
    const message = encodeURIComponent(
      `مرحباً ${subscriber.name}، نفتقدك في الجيم! تواصل معنا لتجديد اشتراكك.`
    );
    window.open(`https://wa.me/${subscriber.phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ArchiveIcon className="w-5 h-5 text-primary" />
        الأرشيف
      </h2>

      {archivedSubscribers.length === 0 ? (
        <div className="text-center py-12">
          <ArchiveIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg">لا يوجد مشتركين في الأرشيف</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archivedSubscribers.map((subscriber) => (
            <SubscriberCard
              key={subscriber.id}
              subscriber={subscriber}
              onEdit={() => {}}
              onDelete={handleDelete}
              onArchive={() => {}}
              onRestore={handleRestore}
              onRenew={() => {}}
              onWhatsApp={handleWhatsApp}
              isArchived
            />
          ))}
        </div>
      )}
    </div>
  );
};
