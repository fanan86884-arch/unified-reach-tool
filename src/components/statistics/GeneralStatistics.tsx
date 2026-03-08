import { useState } from 'react';
import { Subscriber } from '@/types/subscriber';
import { StatCard } from './StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, XCircle, AlertTriangle, Pause, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';
import { VipClients } from './VipClients';
import { useLanguage } from '@/i18n/LanguageContext';

interface GeneralStatisticsProps {
  stats: {
    active: Subscriber[];
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
    paused: Subscriber[];
    byCaptain: Record<string, Subscriber[]>;
    captains: string[];
  };
  allSubscribers?: Subscriber[];
}

const WHATSAPP_QUEUE_PREFIX = 'whatsapp_queue_';

const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) return '20' + cleaned.slice(1);
  if (cleaned.startsWith('20')) return cleaned;
  return '20' + cleaned;
};

const formatDate = (dateStr: string): string => {
  return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: arLocale });
};

const formatPauseDuration = (subscriber: Subscriber): string => {
  if (!subscriber.pausedUntil) return '';
  const pauseEnd = parseISO(subscriber.pausedUntil);
  const days = differenceInDays(pauseEnd, new Date());
  if (days <= 7) return `${days} days`;
  if (days <= 14) return '2 weeks';
  if (days <= 30) return '1 month';
  return `${days} days`;
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
    .replace(/{المبلغ_المتبقي}/g, String(subscriber.remainingAmount))
    .replace(/{المدة_المحددة}/g, formatPauseDuration(subscriber));
};

const getMessageFromTemplate = (templateId: string, sub: Subscriber, defaultMsg: string): string => {
  const templates = getTemplates();
  if (templates) {
    const template = templates.find((t: any) => t.id === templateId);
    if (template) return replaceVariables(template.content, sub);
  }
  return defaultMsg;
};

export const GeneralStatistics = ({ stats, allSubscribers = [] }: GeneralStatisticsProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [queues, setQueues] = useState<Record<string, number>>({});

  const sendWhatsAppToAll = (categoryId: string, subscribers: Subscriber[], getMessage: (sub: Subscriber) => string) => {
    if (subscribers.length === 0) {
      toast({ title: t.statistics.noSubscribersInCategory, variant: 'destructive' });
      return;
    }
    const queueKey = WHATSAPP_QUEUE_PREFIX + categoryId;
    let currentIndex = queues[queueKey] || 0;
    if (currentIndex >= subscribers.length) currentIndex = 0;

    const sub = subscribers[currentIndex];
    const phone = formatPhone(sub.phone);
    const message = getMessage(sub);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');

    const nextIndex = currentIndex + 1;
    if (nextIndex >= subscribers.length) {
      localStorage.removeItem(queueKey);
      setQueues(prev => { const n = { ...prev }; delete n[queueKey]; return n; });
      toast({ title: t.statistics.allMessagesSent });
    } else {
      localStorage.setItem(queueKey, JSON.stringify({ index: nextIndex, total: subscribers.length }));
      setQueues(prev => ({ ...prev, [queueKey]: nextIndex }));
      toast({ title: `${t.statistics.messageSent} ${currentIndex + 1} ${t.statistics.of} ${subscribers.length}`, description: t.statistics.pressNextToSend });
    }
  };

  const getQueueProgress = (categoryId: string, total: number): string => {
    const queueKey = WHATSAPP_QUEUE_PREFIX + categoryId;
    const currentIndex = queues[queueKey];
    if (currentIndex !== undefined && currentIndex > 0) return ` (${currentIndex}/${total})`;
    return '';
  };

  return (
    <Card className="p-4 card-shadow overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-bold text-sm">{t.statistics.general}</h3>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title={t.statistics.activeSubscriptions} count={stats.active.length} icon={Users} variant="success"
              onSendAll={() => sendWhatsAppToAll('active', stats.active, (sub) => getMessageFromTemplate('subscription', sub, `Hello ${sub.name}, thanks for your subscription!`))}
              buttonLabel={`${t.actions.sendToAll}${getQueueProgress('active', stats.active.length)}`} />
            <StatCard title={t.statistics.expiringSubscriptions} count={stats.expiring.length} icon={Clock} variant="warning"
              onSendAll={() => sendWhatsAppToAll('expiring', stats.expiring, (sub) => getMessageFromTemplate('expiry', sub, `Hello ${sub.name}, your subscription expires on ${formatDate(sub.endDate)}.`))}
              buttonLabel={`${t.actions.sendToAll}${getQueueProgress('expiring', stats.expiring.length)}`} />
            <StatCard title={t.statistics.expiredSubscriptions} count={stats.expired.length} icon={XCircle} variant="destructive"
              onSendAll={() => sendWhatsAppToAll('expired', stats.expired, (sub) => getMessageFromTemplate('expired', sub, `Hello ${sub.name}, your subscription has expired. We miss you!`))}
              buttonLabel={`${t.actions.sendToAll}${getQueueProgress('expired', stats.expired.length)}`} />
            <StatCard title={t.statistics.pendingSubscriptions} count={stats.pending.length} icon={AlertTriangle} variant="accent"
              onSendAll={() => sendWhatsAppToAll('pending', stats.pending, (sub) => getMessageFromTemplate('reminder', sub, `Hello ${sub.name}, you have a remaining balance of ${sub.remainingAmount}.`))}
              buttonLabel={`${t.actions.sendToAll}${getQueueProgress('pending', stats.pending.length)}`} />
            <StatCard title={t.statistics.pausedSubscriptions} count={stats.paused.length} icon={Pause} variant="muted"
              onSendAll={() => sendWhatsAppToAll('paused', stats.paused, (sub) => getMessageFromTemplate('paused', sub, `Hello ${sub.name}, your subscription has been paused.`))}
              buttonLabel={`${t.actions.sendToAll}${getQueueProgress('paused', stats.paused.length)}`} />
          </div>

          <VipClients allSubscribers={allSubscribers} />

          <h3 className="text-lg font-bold mt-4">{t.statistics.captainStats}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.captains.map((captain) => {
              const captainSubs = stats.byCaptain[captain] || [];
              return (
                <Card key={captain} className="p-4 card-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{captain}</h4>
                    <span className="text-2xl font-bold text-primary">{captainSubs.length}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{t.subscribers.subscriber}</p>
                  <Button variant="whatsapp" size="sm" className="w-full" disabled={!captainSubs.length}
                    onClick={() => sendWhatsAppToAll(`captain_${captain}`, captainSubs, (sub) => `Hello ${sub.name}, a message from ${captain}.`)}>
                    <MessageCircle className="w-4 h-4" />
                    {t.actions.sendToAll}{getQueueProgress(`captain_${captain}`, captainSubs.length)}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
