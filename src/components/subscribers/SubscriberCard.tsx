import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Archive, RotateCcw, MessageCircle, RefreshCw } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SubscriberCardProps {
  subscriber: Subscriber;
  onEdit: (subscriber: Subscriber) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore?: (id: string) => void;
  onRenew: (subscriber: Subscriber) => void;
  onWhatsApp: (subscriber: Subscriber) => void;
  isArchived?: boolean;
}

const statusConfig = {
  active: { label: 'نشط', className: 'status-active' },
  expiring: { label: 'قارب على الانتهاء', className: 'status-expiring' },
  expired: { label: 'منتهي', className: 'status-expired' },
  pending: { label: 'معلق', className: 'status-pending' },
};

const subscriptionTypeLabels = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

export const SubscriberCard = ({
  subscriber,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  onRenew,
  onWhatsApp,
  isArchived = false,
}: SubscriberCardProps) => {
  const daysRemaining = differenceInDays(parseISO(subscriber.endDate), new Date());
  const status = statusConfig[subscriber.status];

  return (
    <Card className="p-4 card-shadow hover:card-shadow-hover transition-all duration-300 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-foreground text-lg">{subscriber.name}</h3>
          <p className="text-sm text-muted-foreground">{subscriber.phone}</p>
        </div>
        <Badge className={cn('border', status.className)}>{status.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <span className="text-muted-foreground">نوع الاشتراك:</span>
          <p className="font-medium">{subscriptionTypeLabels[subscriber.subscriptionType]}</p>
        </div>
        <div>
          <span className="text-muted-foreground">الكابتن:</span>
          <p className="font-medium">{subscriber.captain}</p>
        </div>
        <div>
          <span className="text-muted-foreground">تاريخ الانتهاء:</span>
          <p className="font-medium">
            {format(parseISO(subscriber.endDate), 'dd MMM yyyy', { locale: ar })}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">الأيام المتبقية:</span>
          <p
            className={cn(
              'font-bold',
              daysRemaining <= 0
                ? 'text-destructive'
                : daysRemaining <= 7
                ? 'text-warning'
                : 'text-success'
            )}
          >
            {daysRemaining <= 0 ? 'منتهي' : `${daysRemaining} يوم`}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">المدفوع:</span>
          <p className="font-medium text-success">{subscriber.paidAmount} جنيه</p>
        </div>
        <div>
          <span className="text-muted-foreground">المتبقي:</span>
          <p
            className={cn(
              'font-medium',
              subscriber.remainingAmount > 0 ? 'text-destructive' : 'text-success'
            )}
          >
            {subscriber.remainingAmount} جنيه
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="whatsapp" size="sm" onClick={() => onWhatsApp(subscriber)}>
          <MessageCircle className="w-4 h-4" />
          واتساب
        </Button>
        {!isArchived && (
          <>
            <Button variant="outline" size="sm" onClick={() => onEdit(subscriber)}>
              <Edit className="w-4 h-4" />
              تعديل
            </Button>
            <Button variant="success" size="sm" onClick={() => onRenew(subscriber)}>
              <RefreshCw className="w-4 h-4" />
              تجديد
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onArchive(subscriber.id)}>
              <Archive className="w-4 h-4" />
              أرشفة
            </Button>
          </>
        )}
        {isArchived && onRestore && (
          <Button variant="outline" size="sm" onClick={() => onRestore(subscriber.id)}>
            <RotateCcw className="w-4 h-4" />
            استعادة
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={() => onDelete(subscriber.id)}>
          <Trash2 className="w-4 h-4" />
          حذف
        </Button>
      </div>
    </Card>
  );
};
