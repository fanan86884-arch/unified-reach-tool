import { useMemo, useState } from 'react';
import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MessageCircle, UserPlus, Clock, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseISO, differenceInDays, isToday, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';

interface DailyStatisticsProps {
  allSubscribers: Subscriber[];
}

const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) return '20' + cleaned.slice(1);
  if (cleaned.startsWith('20')) return cleaned;
  return '20' + cleaned;
};

const formatDate = (dateStr: string): string => {
  return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ar });
};

const replaceVariables = (template: string, subscriber: Subscriber): string => {
  return template
    .replace(/{الاسم}/g, subscriber.name)
    .replace(/{تاريخ_الاشتراك}/g, formatDate(subscriber.startDate))
    .replace(/{تاريخ_الانتهاء}/g, formatDate(subscriber.endDate))
    .replace(/{المبلغ_المدفوع}/g, String(subscriber.paidAmount))
    .replace(/{المبلغ_المتبقي}/g, String(subscriber.remainingAmount));
};

interface DailyCategoryProps {
  title: string;
  icon: React.ReactNode;
  subscribers: Subscriber[];
  templateId: string;
  defaultMessage: (sub: Subscriber) => string;
  sendWhatsApp: (sub: Subscriber, templateId: string, defaultMsg: string) => void;
}

const DailyCategory = ({ title, icon, subscribers, templateId, defaultMessage, sendWhatsApp }: DailyCategoryProps) => {
  const { toast } = useToast();
  const count = subscribers.length;
  const [sendIndex, setSendIndex] = useState(0);

  const sendNext = () => {
    if (count === 0) {
      toast({ title: 'لا يوجد مشتركين', variant: 'destructive' });
      return;
    }
    if (sendIndex >= count) {
      toast({ title: 'تم إرسال لجميع المشتركين ✅' });
      setSendIndex(0);
      return;
    }
    const sub = subscribers[sendIndex];
    sendWhatsApp(sub, templateId, defaultMessage(sub));
    setSendIndex(prev => prev + 1);
    toast({ title: `تم إرسال لـ ${sub.name} (${sendIndex + 1}/${count})` });
  };

  return (
    <AccordionItem value={title} className="border rounded-xl px-4 bg-card">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 w-full">
          {icon}
          <span className="font-bold text-sm flex-1 text-right">{title}</span>
          <span className="text-2xl font-black text-primary">
            {count}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {count > 0 && (
          <Button
            variant="whatsapp"
            size="sm"
            className="w-full mb-3 rounded-xl font-bold"
            onClick={sendNext}
          >
            <MessageCircle className="w-4 h-4" />
            {sendIndex === 0
              ? `إرسال للكل (${count})`
              : sendIndex >= count
                ? 'تم الإرسال للجميع ✅ — إعادة'
                : `إرسال التالي (${sendIndex + 1}/${count})`
            }
          </Button>
        )}
        {count === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">لا يوجد مشتركين</p>
        ) : (
          <div className="space-y-2">
            {subscribers.map((sub, i) => (
              <div
                key={sub.id}
                className={`flex items-center justify-between p-2 rounded-lg bg-muted/50 ${i < sendIndex ? 'opacity-50' : ''}`}
              >
                <span className="text-sm font-medium truncate flex-1">{sub.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary shrink-0"
                  onClick={() => sendWhatsApp(sub, templateId, defaultMessage(sub))}
                >
                  <MessageCircle className="w-4 h-4" />
                  إرسال
                </Button>
              </div>
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

export const DailyStatistics = ({ allSubscribers }: DailyStatisticsProps) => {
  const { templates, loading } = useWhatsAppTemplates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sendWhatsApp = (sub: Subscriber, templateId: string, defaultMsg: string) => {
    const phone = formatPhone(sub.phone);
    const template = templates.find(t => t.id === templateId);
    const message = template ? replaceVariables(template.content, sub) : defaultMsg;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const addedToday = useMemo(() =>
    allSubscribers.filter(sub => {
      const addedNow = sub.createdAt && isToday(parseISO(sub.createdAt));
      const renewedToday = isToday(parseISO(sub.startDate)) && sub.createdAt && !isToday(parseISO(sub.createdAt));
      const editedTodayAndActive = sub.updatedAt && isToday(parseISO(sub.updatedAt)) && sub.status === 'active' && !addedNow && !renewedToday;
      return addedNow || renewedToday || editedTodayAndActive;
    }), [allSubscribers]);

  const expiringToday = useMemo(() =>
    allSubscribers.filter(sub => {
      const endDate = parseISO(sub.endDate);
      const days = differenceInDays(endDate, today);
      return days >= 1 && days <= 3 && !sub.isPaused;
    }), [allSubscribers, today]);

  const expiredToday = useMemo(() =>
    allSubscribers.filter(sub => {
      const endDate = parseISO(sub.endDate);
      return isToday(endDate) && !sub.isPaused;
    }), [allSubscribers]);

  const pendingToday = useMemo(() =>
    allSubscribers.filter(sub => {
      if (sub.remainingAmount <= 0) return false;
      const startDate = parseISO(sub.startDate);
      const daysSinceStart = differenceInDays(today, startDate);
      return daysSinceStart >= 7;
    }), [allSubscribers, today]);

  if (loading) {
    return (
      <Card className="p-4 card-shadow flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="p-4 card-shadow">
      <h3 className="font-bold text-base mb-4 flex items-center gap-2">
        📊 الإحصائيات اليومية
      </h3>
      <Accordion type="multiple" className="space-y-2">
        <DailyCategory
          title="المشتركين اليوم"
          icon={<UserPlus className="w-5 h-5 text-primary" />}
          subscribers={addedToday}
          templateId="subscription"
          defaultMessage={(sub) => `مرحباً ${sub.name}، شكراً لاشتراكك معنا! نتمنى لك تمريناً موفقاً.`}
          sendWhatsApp={sendWhatsApp}
        />
        <DailyCategory
          title="قاربت على الانتهاء"
          icon={<Clock className="w-5 h-5 text-primary" />}
          subscribers={expiringToday}
          templateId="expiry"
          defaultMessage={(sub) => `مرحباً ${sub.name}، اشتراكك سينتهي قريباً بتاريخ ${formatDate(sub.endDate)}. يرجى التواصل معنا للتجديد.`}
          sendWhatsApp={sendWhatsApp}
        />
        <DailyCategory
          title="اشتراكات منتهية"
          icon={<XCircle className="w-5 h-5 text-primary" />}
          subscribers={expiredToday}
          templateId="expired"
          defaultMessage={(sub) => `مرحباً ${sub.name}، اشتراكك انتهى. نفتقدك! تواصل معنا لتجديد اشتراكك.`}
          sendWhatsApp={sendWhatsApp}
        />
        <DailyCategory
          title="اشتراكات معلقة"
          icon={<AlertTriangle className="w-5 h-5 text-primary" />}
          subscribers={pendingToday}
          templateId="reminder"
          defaultMessage={(sub) => `مرحباً ${sub.name}، نود تذكيرك بأن لديك مبلغ متبقي ${sub.remainingAmount} جنيه. يرجى التواصل معنا.`}
          sendWhatsApp={sendWhatsApp}
        />
      </Accordion>
    </Card>
  );
};
