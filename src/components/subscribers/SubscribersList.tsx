import { useState } from 'react';
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
import { Plus, Search, Filter, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  addSubscriber: (data: SubscriberFormData) => Promise<Subscriber | null> | Subscriber;
  updateSubscriber: (id: string, data: Partial<SubscriberFormData>) => void | Promise<void>;
  deleteSubscriber: (id: string) => void | Promise<void>;
  archiveSubscriber: (id: string) => void | Promise<void>;
  renewSubscription: (id: string, newEndDate: string, paidAmount: number) => void | Promise<void>;
  pauseSubscription?: (id: string, pauseUntil: string) => void | Promise<void>;
  resumeSubscription?: (id: string) => void | Promise<void>;
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
  renewSubscription,
  pauseSubscription,
  resumeSubscription,
}: SubscribersListProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [renewingSubscriber, setRenewingSubscriber] = useState<Subscriber | null>(null);
  const [pausingSubscriber, setPausingSubscriber] = useState<Subscriber | null>(null);
  const [whatsAppSubscriber, setWhatsAppSubscriber] = useState<Subscriber | null>(null);
  const { toast } = useToast();

  const handleAddOrEdit = (data: SubscriberFormData) => {
    if (editingSubscriber) {
      updateSubscriber(editingSubscriber.id, data);
      toast({ title: 'تم تحديث بيانات المشترك بنجاح' });
    } else {
      addSubscriber(data);
      toast({ title: 'تم إضافة المشترك بنجاح' });
    }
    setEditingSubscriber(null);
  };

  const handleEdit = (subscriber: Subscriber) => {
    setEditingSubscriber(subscriber);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المشترك؟')) {
      deleteSubscriber(id);
      toast({ title: 'تم حذف المشترك', variant: 'destructive' });
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
      toast({ title: 'تم استئناف الاشتراك بنجاح' });
    }
  };

  const handleWhatsApp = (subscriber: Subscriber) => {
    setWhatsAppSubscriber(subscriber);
    setIsWhatsAppOpen(true);
  };

  const captains = ['كابتن خالد', 'كابتن محمد', 'كابتن أحمد'];

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          قائمة المشتركين
        </h2>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة مشترك
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن مشترك..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as SubscriptionStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="expiring">قارب على الانتهاء</SelectItem>
              <SelectItem value="expired">منتهي</SelectItem>
              <SelectItem value="paused">موقوف</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCaptain} onValueChange={setFilterCaptain}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="الكابتن" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الكباتن</SelectItem>
              {captains.map((captain) => (
                <SelectItem key={captain} value={captain}>
                  {captain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {subscribers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg">لا يوجد مشتركين</p>
          <p className="text-sm text-muted-foreground">أضف مشتركاً جديداً للبدء</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subscribers.map((subscriber) => (
            <SubscriberCardCompact
              key={subscriber.id}
              subscriber={subscriber}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onArchive={archiveSubscriber}
              onRenew={handleRenew}
              onWhatsApp={handleWhatsApp}
              onPause={handlePause}
              onResume={handleResume}
            />
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
