import { Subscriber } from '@/types/subscriber';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Bell, DollarSign, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WhatsAppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscriber: Subscriber | null;
}

const formatPhone = (phone: string): string => {
  // إزالة أي مسافات أو أحرف خاصة
  const cleaned = phone.replace(/\D/g, '');
  // إذا كان الرقم يبدأ بـ 0، استبدله بـ 20
  if (cleaned.startsWith('0')) {
    return '20' + cleaned.slice(1);
  }
  // إذا كان يبدأ بـ 20، اتركه كما هو
  if (cleaned.startsWith('20')) {
    return cleaned;
  }
  // وإلا أضف 20 في البداية
  return '20' + cleaned;
};

const formatDate = (dateStr: string): string => {
  return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ar });
};

export const WhatsAppDialog = ({ isOpen, onClose, subscriber }: WhatsAppDialogProps) => {
  if (!subscriber) return null;

  const messageTypes = [
    {
      id: 'subscription',
      name: 'رسالة الاشتراك',
      icon: MessageCircle,
      color: 'text-primary',
      getMessage: () => 
        `مرحباً ${subscriber.name}، تم الاشتراك في الجيم بتاريخ ${formatDate(subscriber.startDate)} وتم دفع ${subscriber.paidAmount} جنيه والمتبقي ${subscriber.remainingAmount} جنيه. ينتهي الاشتراك بتاريخ ${formatDate(subscriber.endDate)}`,
    },
    {
      id: 'renewal',
      name: 'تذكير بالتجديد',
      icon: Bell,
      color: 'text-warning',
      getMessage: () =>
        `مرحباً ${subscriber.name}، اشتراكك سينتهي بتاريخ ${formatDate(subscriber.endDate)}. يرجى التواصل معنا للتجديد والاستمرار في التمرين.`,
    },
    {
      id: 'remaining',
      name: 'تذكير بالمبلغ المتبقي',
      icon: DollarSign,
      color: 'text-success',
      getMessage: () =>
        `مرحباً ${subscriber.name}، نود تذكيرك بأن لديك مبلغ متبقي ${subscriber.remainingAmount} جنيه. يرجى التواصل معنا لتسديد المبلغ.`,
    },
    {
      id: 'expired',
      name: 'إشعار انتهاء الاشتراك',
      icon: AlertTriangle,
      color: 'text-destructive',
      getMessage: () =>
        `مرحباً ${subscriber.name}، انتهى اشتراكك في الجيم. نفتقدك! تواصل معنا لتجديد اشتراكك والعودة للتمرين.`,
    },
  ];

  const handleSendMessage = (getMessage: () => string) => {
    const phone = formatPhone(subscriber.phone);
    const message = encodeURIComponent(getMessage());
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
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
              onClick={() => handleSendMessage(type.getMessage)}
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
