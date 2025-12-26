import { Subscriber } from '@/types/subscriber';
import { StatCard } from './StatCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Clock, AlertTriangle, XCircle, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export const Statistics = ({ stats }: StatisticsProps) => {
  const { toast } = useToast();

  const sendWhatsAppToAll = (subscribers: Subscriber[], message: string) => {
    if (subscribers.length === 0) {
      toast({ title: 'لا يوجد مشتركين في هذه الفئة', variant: 'destructive' });
      return;
    }

    subscribers.forEach((sub, index) => {
      setTimeout(() => {
        const encodedMessage = encodeURIComponent(
          message
            .replace('{الاسم}', sub.name)
            .replace('{تاريخ_الانتهاء}', sub.endDate)
            .replace('{المبلغ_المتبقي}', sub.remainingAmount.toString())
        );
        window.open(`https://wa.me/${sub.phone}?text=${encodedMessage}`, '_blank');
      }, index * 500);
    });

    toast({ title: `جاري فتح ${subscribers.length} محادثة واتساب` });
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
