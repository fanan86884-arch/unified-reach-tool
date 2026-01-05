import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Clock, XCircle, DollarSign, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useState } from 'react';

interface NotificationsProps {
  stats: {
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
  };
}

type NotificationType = 'expiring' | 'expired' | 'pending';

interface Notification {
  type: NotificationType;
  subscriber: Subscriber;
  message: string;
  subMessage: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'warning' | 'destructive' | 'accent';
  priority: number;
  timestamp: string;
}

const getRelativeTimeLabel = (dateStr: string): string => {
  const date = parseISO(dateStr);
  
  if (isToday(date)) {
    return 'اليوم';
  }
  
  if (isYesterday(date)) {
    return 'أمس';
  }
  
  return formatDistanceToNow(date, { addSuffix: true, locale: ar });
};

export const Notifications = ({ stats }: NotificationsProps) => {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const today = startOfDay(new Date());
  
  const notifications: Notification[] = [
    // Expired subscriptions - highest priority
    ...stats.expired.map((sub) => {
      const daysSinceExpiry = differenceInDays(today, startOfDay(parseISO(sub.endDate)));
      return {
        type: 'expired' as const,
        subscriber: sub,
        message: `انتهى اشتراك ${sub.name}`,
        subMessage: daysSinceExpiry === 0 
          ? 'انتهى اليوم' 
          : daysSinceExpiry === 1 
            ? 'انتهى أمس'
            : `منذ ${daysSinceExpiry} يوم`,
        icon: XCircle,
        variant: 'destructive' as const,
        priority: 1,
        timestamp: sub.endDate,
      };
    }),
    // Expiring soon - medium priority
    ...stats.expiring.map((sub) => {
      const daysRemaining = differenceInDays(startOfDay(parseISO(sub.endDate)), today);
      return {
        type: 'expiring' as const,
        subscriber: sub,
        message: `اشتراك ${sub.name} سينتهي قريباً`,
        subMessage: daysRemaining === 0 
          ? 'ينتهي اليوم' 
          : daysRemaining === 1 
            ? 'ينتهي غداً'
            : `متبقي ${daysRemaining} أيام`,
        icon: Clock,
        variant: 'warning' as const,
        priority: 2,
        timestamp: sub.endDate,
      };
    }),
    // Pending payments - lower priority
    ...stats.pending.map((sub) => ({
      type: 'pending' as const,
      subscriber: sub,
      message: `${sub.name} لديه مبلغ متبقي`,
      subMessage: `${sub.remainingAmount} جنيه`,
      icon: DollarSign,
      variant: 'accent' as const,
      priority: 3,
      timestamp: sub.updatedAt || sub.createdAt,
    })),
  ];

  // Sort by priority first, then by timestamp (newest first)
  const sortedNotifications = notifications.sort((a, b) => {
    // Primary sort by priority (1 = expired, 2 = expiring, 3 = pending)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Secondary sort by timestamp (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  
  // Filter out deleted notifications using subscriber ID + type as unique key
  const displayNotifications = sortedNotifications.filter(
    notif => !deletedIds.has(`${notif.type}-${notif.subscriber.id}`)
  );

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

  // Group notifications by date
  const groupedByDate = displayNotifications.reduce((groups, notif) => {
    const date = parseISO(notif.timestamp);
    let label: string;
    
    if (isToday(date)) {
      label = 'اليوم';
    } else if (isYesterday(date)) {
      label = 'أمس';
    } else {
      label = getRelativeTimeLabel(notif.timestamp);
    }
    
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(notif);
    return groups;
  }, {} as Record<string, Notification[]>);

  const handleClearAll = () => {
    // Add all current notification IDs to deleted set
    const allIds = new Set(sortedNotifications.map(n => `${n.type}-${n.subscriber.id}`));
    setDeletedIds(allIds);
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          الإشعارات
        </h2>
        <div className="flex items-center gap-2">
          {displayNotifications.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {displayNotifications.length} إشعار
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 ml-1" />
                حذف الكل
              </Button>
            </>
          )}
        </div>
      </div>

      {displayNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg">لا توجد إشعارات جديدة</p>
          <p className="text-sm text-muted-foreground">كل شيء على ما يرام!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByDate).map(([dateLabel, notifs]) => (
            <div key={dateLabel} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground px-1">
                {dateLabel}
              </h3>
              {notifs.map((notif, index) => {
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
                          {notif.subMessage}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.subscriber.phone} • {notif.subscriber.captain}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
