import { useState, useEffect } from 'react';
import { Subscriber } from '@/types/subscriber';
import { StatCard } from './StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Clock, AlertTriangle, XCircle, MessageCircle, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface StatisticsProps {
  stats: {
    active: Subscriber[];
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
    paused: Subscriber[];
    byCaptain: Record<string, Subscriber[]>;
    captains: string[];
  };
}

const WHATSAPP_QUEUE_PREFIX = 'whatsapp_queue_';

const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return '20' + cleaned.slice(1);
  }
  if (cleaned.startsWith('20')) {
    return cleaned;
  }
  return '20' + cleaned;
};

const formatDate = (dateStr: string): string => {
  return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ar });
};

const formatPauseDuration = (subscriber: Subscriber): string => {
  if (!subscriber.pausedUntil) return '';
  const pauseEnd = parseISO(subscriber.pausedUntil);
  const today = new Date();
  const days = differenceInDays(pauseEnd, today);
  if (days <= 7) return `${days} أيام`;
  if (days <= 14) return 'أسبوعين';
  if (days <= 30) return 'شهر';
  return `${days} يوم`;
};

export const Statistics = ({ stats }: StatisticsProps) => {
  const { toast } = useToast();
  const [queues, setQueues] = useState<Record<string, number>>({});

  // Load queues from localStorage on mount
  useEffect(() => {
    const loadedQueues: Record<string, number> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(WHATSAPP_QUEUE_PREFIX)) {
        const queueData = JSON.parse(localStorage.getItem(key) || '{}');
        loadedQueues[key] = queueData.index || 0;
      }
    }
    setQueues(loadedQueues);
  }, []);

  const sendWhatsAppToAll = (categoryId: string, subscribers: Subscriber[], getMessage: (sub: Subscriber) => string) => {
    if (subscribers.length === 0) {
      toast({ title: 'لا يوجد مشتركين في هذه الفئة', variant: 'destructive' });
      return;
    }

    const queueKey = WHATSAPP_QUEUE_PREFIX + categoryId;
    let currentIndex = queues[queueKey] || 0;

    // التأكد من أن الفهرس ضمن النطاق
    if (currentIndex >= subscribers.length) {
      currentIndex = 0;
    }

    const sub = subscribers[currentIndex];
    const phone = formatPhone(sub.phone);
    const message = getMessage(sub);
    const encodedMessage = encodeURIComponent(message);
    
    // فتح الواتساب مباشرة
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    
    // تحديث الفهرس للمشترك التالي
    const nextIndex = currentIndex + 1;
    if (nextIndex >= subscribers.length) {
      // انتهت القائمة
      localStorage.removeItem(queueKey);
      setQueues(prev => {
        const newQueues = { ...prev };
        delete newQueues[queueKey];
        return newQueues;
      });
      toast({ title: 'تم إرسال جميع الرسائل بنجاح!' });
    } else {
      // حفظ الفهرس التالي
      localStorage.setItem(queueKey, JSON.stringify({ index: nextIndex, total: subscribers.length }));
      setQueues(prev => ({ ...prev, [queueKey]: nextIndex }));
      toast({ 
        title: `تم إرسال ${currentIndex + 1} من ${subscribers.length}`, 
        description: 'اضغط "إرسال للكل" للمشترك التالي'
      });
    }
  };

  const getQueueProgress = (categoryId: string, total: number): string => {
    const queueKey = WHATSAPP_QUEUE_PREFIX + categoryId;
    const currentIndex = queues[queueKey];
    if (currentIndex !== undefined && currentIndex > 0) {
      return ` (${currentIndex}/${total})`;
    }
    return '';
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        الإحصائيات
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="اشتراكات نشطة"
          count={stats.active.length}
          icon={Users}
          variant="success"
          onSendAll={() =>
            sendWhatsAppToAll(
              'active',
              stats.active,
              (sub) => `مرحباً ${sub.name}، شكراً لاشتراكك معنا! نتمنى لك تمريناً موفقاً.`
            )
          }
          buttonLabel={`إرسال للكل${getQueueProgress('active', stats.active.length)}`}
        />
        <StatCard
          title="قاربت على الانتهاء"
          count={stats.expiring.length}
          icon={Clock}
          variant="warning"
          onSendAll={() =>
            sendWhatsAppToAll(
              'expiring',
              stats.expiring,
              (sub) => `مرحباً ${sub.name}، اشتراكك سينتهي قريباً بتاريخ ${formatDate(sub.endDate)}. يرجى التواصل معنا للتجديد.`
            )
          }
          buttonLabel={`إرسال للكل${getQueueProgress('expiring', stats.expiring.length)}`}
        />
        <StatCard
          title="اشتراكات منتهية"
          count={stats.expired.length}
          icon={XCircle}
          variant="destructive"
          onSendAll={() =>
            sendWhatsAppToAll(
              'expired',
              stats.expired,
              (sub) => `مرحباً ${sub.name}، اشتراكك انتهى. نفتقدك! تواصل معنا لتجديد اشتراكك والعودة للتمرين.`
            )
          }
          buttonLabel={`إرسال للكل${getQueueProgress('expired', stats.expired.length)}`}
        />
        <StatCard
          title="اشتراكات معلقة"
          count={stats.pending.length}
          icon={AlertTriangle}
          variant="accent"
          onSendAll={() =>
            sendWhatsAppToAll(
              'pending',
              stats.pending,
              (sub) => `مرحباً ${sub.name}، نود تذكيرك بأن لديك مبلغ متبقي ${sub.remainingAmount} جنيه. يرجى التواصل معنا.`
            )
          }
          buttonLabel={`إرسال للكل${getQueueProgress('pending', stats.pending.length)}`}
        />
        <StatCard
          title="اشتراكات موقوفة"
          count={stats.paused.length}
          icon={Pause}
          variant="muted"
          onSendAll={() =>
            sendWhatsAppToAll(
              'paused',
              stats.paused,
              (sub) => `مرحباً ${sub.name}، نود أن نخبرك بأنه تم إيقاف اشتراكك لمدة ${formatPauseDuration(sub)} وأنه سينتهي اشتراكك بتاريخ ${formatDate(sub.endDate)}`
            )
          }
          buttonLabel={`إرسال للكل${getQueueProgress('paused', stats.paused.length)}`}
        />
      </div>

      <h3 className="text-lg font-bold mt-8">إحصائيات الكباتن</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.captains.map((captain) => {
          const captainSubs = stats.byCaptain[captain] || [];
          const queueProgress = getQueueProgress(`captain_${captain}`, captainSubs.length);
          return (
            <Card key={captain} className="p-4 card-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{captain}</h4>
                <span className="text-2xl font-bold text-primary">
                  {captainSubs.length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">مشترك</p>
              <Button
                variant="whatsapp"
                size="sm"
                className="w-full"
                onClick={() =>
                  sendWhatsAppToAll(
                    `captain_${captain}`,
                    captainSubs,
                    (sub) => `مرحباً ${sub.name}، رسالة من ${captain}.`
                  )
                }
                disabled={!captainSubs.length}
              >
                <MessageCircle className="w-4 h-4" />
                إرسال للكل{queueProgress}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
