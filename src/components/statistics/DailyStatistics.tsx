import { useMemo } from 'react';
import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MessageCircle, UserPlus, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseISO, differenceInDays, isToday, format } from 'date-fns';
import { ar } from 'date-fns/locale';

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

const getTemplates = () => {
  try {
    const saved = localStorage.getItem('whatsapp_templates');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return null;
};

const replaceVariables = (template: string, subscriber: Subscriber): string => {
  return template
    .replace(/{الاسم}/g, subscriber.name)
    .replace(/{تاريخ_الاشتراك}/g, formatDate(subscriber.startDate))
    .replace(/{تاريخ_الانتهاء}/g, formatDate(subscriber.endDate))
    .replace(/{المبلغ_المدفوع}/g, String(subscriber.paidAmount))
    .replace(/{المبلغ_المتبقي}/g, String(subscriber.remainingAmount));
};

const getMessageFromTemplate = (templateId: string, sub: Subscriber, defaultMsg: string): string => {
  const templates = getTemplates();
  if (templates) {
    const template = templates.find((t: any) => t.id === templateId);
    if (template) return replaceVariables(template.content, sub);
  }
  return defaultMsg;
};

const sendWhatsApp = (sub: Subscriber, templateId: string, defaultMsg: string) => {
  const phone = formatPhone(sub.phone);
  const message = getMessageFromTemplate(templateId, sub, defaultMsg);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
};

interface DailyCategoryProps {
  title: string;
  icon: React.ReactNode;
  subscribers: Subscriber[];
  templateId: string;
  defaultMessage: (sub: Subscriber) => string;
  variant: string;
}

const DailyCategory = ({ title, icon, subscribers, templateId, defaultMessage, variant }: DailyCategoryProps) => {
  const { toast } = useToast();
  const count = subscribers.length;

  const sendToAll = () => {
    if (count === 0) {
      toast({ title: 'لا يوجد مشتركين', variant: 'destructive' });
      return;
    }
    subscribers.forEach((sub, i) => {
      setTimeout(() => {
        sendWhatsApp(sub, templateId, defaultMessage(sub));
      }, i * 500);
    });
    toast({ title: `تم فتح ${count} محادثة واتساب` });
  };

  const variantColors: Record<string, string> = {
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    accent: 'text-accent',
  };

  return (
    <AccordionItem value={title} className="border rounded-xl px-4 bg-card">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 w-full">
          {icon}
          <span className="font-bold text-sm flex-1 text-right">{title}</span>
          <span className={`text-2xl font-black ${variantColors[variant] || 'text-primary'}`}>
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
            onClick={sendToAll}
          >
            <MessageCircle className="w-4 h-4" />
            إرسال للكل ({count})
          </Button>
        )}
        {count === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">لا يوجد مشتركين</p>
        ) : (
          <div className="space-y-2">
            {subscribers.map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium truncate flex-1">{sub.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-success shrink-0"
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Subscribers added today OR renewed today (startDate updated to today)
  const addedToday = useMemo(() =>
    allSubscribers.filter(sub => {
      const addedNow = sub.createdAt && isToday(parseISO(sub.createdAt));
      const renewedToday = isToday(parseISO(sub.startDate)) && sub.createdAt && !isToday(parseISO(sub.createdAt));
      return addedNow || renewedToday;
    }), [allSubscribers]);

  // 2. Expiring in exactly 3 days or less (1-3 days remaining only)
  const expiringToday = useMemo(() =>
    allSubscribers.filter(sub => {
      const endDate = parseISO(sub.endDate);
      const days = differenceInDays(endDate, today);
      return days >= 1 && days <= 3 && !sub.isPaused;
    }), [allSubscribers, today]);

  // 3. Expired today
  const expiredToday = useMemo(() =>
    allSubscribers.filter(sub => {
      const endDate = parseISO(sub.endDate);
      return isToday(endDate) && !sub.isPaused;
    }), [allSubscribers]);

  // 4. Pending - 7+ days since subscription with remaining amount
  const pendingToday = useMemo(() =>
    allSubscribers.filter(sub => {
      if (sub.remainingAmount <= 0) return false;
      const startDate = parseISO(sub.startDate);
      const daysSinceStart = differenceInDays(today, startDate);
      return daysSinceStart >= 7;
    }), [allSubscribers, today]);

  return (
    <Card className="p-4 card-shadow">
      <h3 className="font-bold text-base mb-4 flex items-center gap-2">
        📊 الإحصائيات اليومية
      </h3>
      <Accordion type="multiple" className="space-y-2">
        <DailyCategory
          title="المشتركين اليوم"
          icon={<UserPlus className="w-5 h-5 text-success" />}
          subscribers={addedToday}
          templateId="subscription"
          defaultMessage={(sub) => `مرحباً ${sub.name}، شكراً لاشتراكك معنا! نتمنى لك تمريناً موفقاً.`}
          variant="success"
        />
        <DailyCategory
          title="قاربت على الانتهاء"
          icon={<Clock className="w-5 h-5 text-warning" />}
          subscribers={expiringToday}
          templateId="expiry"
          defaultMessage={(sub) => `مرحباً ${sub.name}، اشتراكك سينتهي قريباً بتاريخ ${formatDate(sub.endDate)}. يرجى التواصل معنا للتجديد.`}
          variant="warning"
        />
        <DailyCategory
          title="اشتراكات منتهية"
          icon={<XCircle className="w-5 h-5 text-destructive" />}
          subscribers={expiredToday}
          templateId="expired"
          defaultMessage={(sub) => `مرحباً ${sub.name}، اشتراكك انتهى. نفتقدك! تواصل معنا لتجديد اشتراكك.`}
          variant="destructive"
        />
        <DailyCategory
          title="اشتراكات معلقة"
          icon={<AlertTriangle className="w-5 h-5 text-accent" />}
          subscribers={pendingToday}
          templateId="reminder"
          defaultMessage={(sub) => `مرحباً ${sub.name}، نود تذكيرك بأن لديك مبلغ متبقي ${sub.remainingAmount} جنيه. يرجى التواصل معنا.`}
          variant="accent"
        />
      </Accordion>
    </Card>
  );
};
