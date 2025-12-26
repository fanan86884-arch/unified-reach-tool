import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Bell, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface NotificationsProps {
  stats: {
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
  };
}

export const Notifications = ({ stats }: NotificationsProps) => {
  const notifications = [
    ...stats.expiring.map((sub) => ({
      type: 'expiring' as const,
      subscriber: sub,
      message: `اشتراك ${sub.name} سينتهي خلال ${differenceInDays(parseISO(sub.endDate), new Date())} أيام`,
      icon: Clock,
      variant: 'warning' as const,
    })),
    ...stats.expired.map((sub) => ({
      type: 'expired' as const,
      subscriber: sub,
      message: `انتهى اشتراك ${sub.name}`,
      icon: XCircle,
      variant: 'destructive' as const,
    })),
    ...stats.pending.map((sub) => ({
      type: 'pending' as const,
      subscriber: sub,
      message: `${sub.name} لديه مبلغ متبقي ${sub.remainingAmount} جنيه`,
      icon: AlertTriangle,
      variant: 'accent' as const,
    })),
  ];

  const variantStyles = {
    warning: 'border-warning/30 bg-warning/5',
    destructive: 'border-destructive/30 bg-destructive/5',
    accent: 'border-accent/30 bg-accent/5',
  };

  const iconStyles = {
    warning: 'text-warning',
    destructive: 'text-destructive',
    accent: 'text-accent',
  };

  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        الإشعارات
      </h2>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg">لا توجد إشعارات جديدة</p>
          <p className="text-sm text-muted-foreground">كل شيء على ما يرام!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, index) => {
            const Icon = notif.icon;
            return (
              <Card
                key={`${notif.type}-${notif.subscriber.id}`}
                className={`p-4 border ${variantStyles[notif.variant]} animate-slide-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${iconStyles[notif.variant]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{notif.message}</p>
                    <p className="text-sm text-muted-foreground">
                      {notif.subscriber.phone} • {notif.subscriber.captain}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
