import { useState, useEffect } from 'react';
import { Subscriber } from '@/types/subscriber';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Bell, DollarSign, AlertTriangle, Pause } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WhatsAppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Subscriber | null;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
}

const defaultTemplates: WhatsAppTemplate[] = [
  {
    id: 'subscription',
    name: 'رسالة الاشتراك',
    content: 'تم الاشتراك في الجيم بتاريخ {تاريخ_الاشتراك} وتم دفع {المبلغ_المدفوع} جنيه والمتبقي {المبلغ_المتبقي} جنيه. ينتهي الاشتراك بتاريخ {تاريخ_الانتهاء}',
  },
  {
    id: 'reminder',
    name: 'تذكير بالمبلغ المتبقي',
    content: 'مرحباً {الاسم}، نود تذكيرك بأن لديك مبلغ متبقي {المبلغ_المتبقي} جنيه. يرجى التواصل معنا لتسديد المبلغ.',
  },
  {
    id: 'expiry',
    name: 'تنبيه انتهاء الاشتراك',
    content: 'مرحباً {الاسم}، اشتراكك سينتهي بتاريخ {تاريخ_الانتهاء}. يرجى التواصل معنا للتجديد.',
  },
  {
    id: 'expired',
    name: 'اشتراك منتهي',
    content: 'مرحباً {الاسم}، انتهى اشتراكك في الجيم. نفتقدك! تواصل معنا لتجديد اشتراكك والعودة للتمرين.',
  },
  {
    id: 'paused',
    name: 'اشتراك موقوف',
    content: 'مرحباً {الاسم}، نود أن نخبرك بأنه تم إيقاف اشتراكك لمدة {المدة_المحددة} وأنه سينتهي اشتراكك بتاريخ {تاريخ_الانتهاء}',
  },
];

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

const getTemplates = (): WhatsAppTemplate[] => {
  try {
    const saved = localStorage.getItem('whatsapp_templates');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all templates exist
      return defaultTemplates.map(defaultT => {
        const found = parsed.find((t: WhatsAppTemplate) => t.id === defaultT.id);
        return found || defaultT;
      });
    }
  } catch (e) {
    console.error('Error loading templates:', e);
  }
  return defaultTemplates;
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

export const WhatsAppDialog = ({ isOpen, onClose, subscriber }: WhatsAppDialogProps) => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(defaultTemplates);

  useEffect(() => {
    if (isOpen) {
      setTemplates(getTemplates());
    }
  }, [isOpen]);

  if (!subscriber) return null;

  const messageTypes = [
    {
      id: 'subscription',
      name: 'رسالة الاشتراك',
      icon: MessageCircle,
      color: 'text-primary',
    },
    {
      id: 'expiry',
      name: 'تذكير بالتجديد',
      icon: Bell,
      color: 'text-warning',
    },
    {
      id: 'reminder',
      name: 'تذكير بالمبلغ المتبقي',
      icon: DollarSign,
      color: 'text-success',
    },
    {
      id: 'expired',
      name: 'إشعار انتهاء الاشتراك',
      icon: AlertTriangle,
      color: 'text-destructive',
    },
    {
      id: 'paused',
      name: 'اشتراك موقوف',
      icon: Pause,
      color: 'text-muted-foreground',
    },
  ];

  const handleSendMessage = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const phone = formatPhone(subscriber.phone);
    const message = replaceVariables(template.content, subscriber);
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">اختر نوع الرسالة</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {messageTypes.map((type) => (
            <Button
              key={type.id}
              variant="outline"
              className="h-auto py-3 justify-start gap-3"
              onClick={() => handleSendMessage(type.id)}
            >
              <type.icon className={`w-5 h-5 ${type.color}`} />
              <span>{type.name}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
