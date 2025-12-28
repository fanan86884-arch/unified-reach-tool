import { useState, useEffect } from 'react';
import { Subscriber } from '@/types/subscriber';
import { StatCard } from './StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Clock, AlertTriangle, XCircle, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface StatisticsProps {
  stats: {
    active: Subscriber[];
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
    byCaptain: Record<string, Subscriber[]>;
    captains: string[];
  };
}

const WHATSAPP_QUEUE_KEY = 'whatsapp_queue';

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

export const Statistics = ({ stats }: StatisticsProps) => {
  const { toast } = useToast();
  const [currentQueue, setCurrentQueue] = useState<{ subscribers: Subscriber[]; message: string; index: number } | null>(null);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem(WHATSAPP_QUEUE_KEY);
    if (savedQueue) {
      const queue = JSON.parse(savedQueue);
      setCurrentQueue(queue);
    }
  }, []);

  // Send next message when queue updates
  useEffect(() => {
    if (currentQueue && currentQueue.index < currentQueue.subscribers.length) {
      const sub = currentQueue.subscribers[currentQueue.index];
      const phone = formatPhone(sub.phone);
      const encodedMessage = encodeURIComponent(
        currentQueue.message
          .replace('{الاسم}', sub.name)
          .replace('{تاريخ_الانتهاء}', formatDate(sub.endDate))
          .replace('{المبلغ_المتبقي}', sub.remainingAmount.toString())
      );
      
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
      
      // Update queue for next subscriber
      const newIndex = currentQueue.index + 1;
      if (newIndex < currentQueue.subscribers.length) {
        const newQueue = { ...currentQueue, index: newIndex };
        setCurrentQueue(newQueue);
        localStorage.setItem(WHATSAPP_QUEUE_KEY, JSON.stringify(newQueue));
        toast({ 
          title: `تم إرسال ${newIndex} من ${currentQueue.subscribers.length}`, 
          description: 'اضغط "إرسال للكل" للمشترك التالي'
        });
      } else {
        // Queue finished
        setCurrentQueue(null);
        localStorage.removeItem(WHATSAPP_QUEUE_KEY);
        toast({ title: 'تم إرسال جميع الرسائل بنجاح!' });
      }
    }
  }, [currentQueue?.index]);

  const sendWhatsAppToAll = (subscribers: Subscriber[], message: string) => {
    if (subscribers.length === 0) {
      toast({ title: 'لا يوجد مشتركين في هذه الفئة', variant: 'destructive' });
      return;
    }

    // Check if there's an existing queue for this category
    if (currentQueue && currentQueue.subscribers.length === subscribers.length) {
      // Continue with next subscriber
      const newIndex = currentQueue.index;
      if (newIndex < subscribers.length) {
        const sub = subscribers[newIndex];
        const phone = formatPhone(sub.phone);
        const encodedMessage = encodeURIComponent(
          message
            .replace('{الاسم}', sub.name)
            .replace('{تاريخ_الانتهاء}', formatDate(sub.endDate))
            .replace('{المبلغ_المتبقي}', sub.remainingAmount.toString())
        );
        
        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
        
        const nextIndex = newIndex + 1;
        if (nextIndex < subscribers.length) {
          const newQueue = { subscribers, message, index: nextIndex };
          setCurrentQueue(newQueue);
          localStorage.setItem(WHATSAPP_QUEUE_KEY, JSON.stringify(newQueue));
          toast({ 
            title: `تم إرسال ${nextIndex} من ${subscribers.length}`, 
            description: 'اضغط "إرسال للكل" للمشترك التالي'
          });
        } else {
          setCurrentQueue(null);
          localStorage.removeItem(WHATSAPP_QUEUE_KEY);
          toast({ title: 'تم إرسال جميع الرسائل بنجاح!' });
        }
      }
      return;
    }

    // Start new queue
    const queue = { subscribers, message, index: 0 };
    setCurrentQueue(queue);
    localStorage.setItem(WHATSAPP_QUEUE_KEY, JSON.stringify(queue));
    
    const sub = subscribers[0];
    const phone = formatPhone(sub.phone);
    const encodedMessage = encodeURIComponent(
      message
        .replace('{الاسم}', sub.name)
        .replace('{تاريخ_الانتهاء}', formatDate(sub.endDate))
        .replace('{المبلغ_المتبقي}', sub.remainingAmount.toString())
    );
    
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    
    if (subscribers.length > 1) {
      const newQueue = { subscribers, message, index: 1 };
      setCurrentQueue(newQueue);
      localStorage.setItem(WHATSAPP_QUEUE_KEY, JSON.stringify(newQueue));
      toast({ 
        title: `تم إرسال 1 من ${subscribers.length}`, 
        description: 'اضغط "إرسال للكل" للمشترك التالي'
      });
    } else {
      setCurrentQueue(null);
      localStorage.removeItem(WHATSAPP_QUEUE_KEY);
      toast({ title: 'تم إرسال الرسالة بنجاح!' });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        الإحصائيات
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="اشتراكات نشطة"
          count={stats.active.length}
          icon={Users}
          variant="success"
          onSendAll={() =>
            sendWhatsAppToAll(
              stats.active,
              'مرحباً {الاسم}، شكراً لاشتراكك معنا! نتمنى لك تمريناً موفقاً.'
            )
          }
        />
        <StatCard
          title="قاربت على الانتهاء"
          count={stats.expiring.length}
          icon={Clock}
          variant="warning"
          onSendAll={() =>
            sendWhatsAppToAll(
              stats.expiring,
              'مرحباً {الاسم}، اشتراكك سينتهي قريباً بتاريخ {تاريخ_الانتهاء}. يرجى التواصل معنا للتجديد.'
            )
          }
        />
        <StatCard
          title="اشتراكات منتهية"
          count={stats.expired.length}
          icon={XCircle}
          variant="destructive"
          onSendAll={() =>
            sendWhatsAppToAll(
              stats.expired,
              'مرحباً {الاسم}، اشتراكك انتهى. نفتقدك! تواصل معنا لتجديد اشتراكك والعودة للتمرين.'
            )
          }
        />
        <StatCard
          title="اشتراكات معلقة"
          count={stats.pending.length}
          icon={AlertTriangle}
          variant="accent"
          onSendAll={() =>
            sendWhatsAppToAll(
              stats.pending,
              'مرحباً {الاسم}، نود تذكيرك بأن لديك مبلغ متبقي {المبلغ_المتبقي} جنيه. يرجى التواصل معنا.'
            )
          }
        />
      </div>

      <h3 className="text-lg font-bold mt-8">إحصائيات الكباتن</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.captains.map((captain) => (
          <Card key={captain} className="p-4 card-shadow">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{captain}</h4>
              <span className="text-2xl font-bold text-primary">
                {stats.byCaptain[captain]?.length || 0}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">مشترك</p>
            <Button
              variant="whatsapp"
              size="sm"
              className="w-full"
              onClick={() =>
                sendWhatsAppToAll(
                  stats.byCaptain[captain] || [],
                  `مرحباً {الاسم}، رسالة من ${captain}.`
                )
              }
              disabled={!stats.byCaptain[captain]?.length}
            >
              <MessageCircle className="w-4 h-4" />
              إرسال للكل
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
