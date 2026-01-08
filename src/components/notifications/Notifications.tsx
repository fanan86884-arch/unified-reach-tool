import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Clock, XCircle, DollarSign, Trash2, UserPlus, CheckCircle, X } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { normalizeEgyptPhoneDigits } from '@/lib/phone';
interface SubscriptionRequest {
  id: string;
  name: string;
  phone: string;
  subscription_type: string;
  start_date: string;
  end_date: string;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string | null;
  status: string;
  created_at: string;
}

interface NotificationsProps {
  stats: {
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
  };
}

type NotificationType = 'expiring' | 'expired' | 'pending' | 'request';

interface Notification {
  type: NotificationType;
  subscriber?: Subscriber;
  request?: SubscriptionRequest;
  message: string;
  subMessage: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'warning' | 'destructive' | 'accent' | 'success';
  priority: number;
  timestamp: string;
  id: string;
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

const DELETED_NOTIFICATIONS_KEY = 'deleted_notifications';

// تحميل الإشعارات المحذوفة من localStorage
const loadDeletedIds = (): Set<string> => {
  try {
    const stored = localStorage.getItem(DELETED_NOTIFICATIONS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (e) {
    console.error('Error loading deleted notifications:', e);
  }
  return new Set();
};

// حفظ الإشعارات المحذوفة في localStorage
const saveDeletedIds = (ids: Set<string>) => {
  localStorage.setItem(DELETED_NOTIFICATIONS_KEY, JSON.stringify([...ids]));
};

const subscriptionLabels: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

export const Notifications = ({ stats }: NotificationsProps) => {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => loadDeletedIds());
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const today = startOfDay(new Date());

  // Fetch subscription requests
  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from('subscription_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (data) {
        setSubscriptionRequests(data);
      }
    };

    fetchRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('subscription_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const notifications: Notification[] = [
    // Subscription requests - highest priority
    ...subscriptionRequests.map((req) => ({
      type: 'request' as const,
      request: req,
      message: `طلب ${req.name ? 'اشتراك' : 'تجديد'} جديد`,
      subMessage: `${req.name} - ${subscriptionLabels[req.subscription_type] || req.subscription_type}`,
      icon: UserPlus,
      variant: 'success' as const,
      priority: 0,
      timestamp: req.created_at,
      id: `request-${req.id}`,
    })),
    // Expired subscriptions - high priority
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
        id: `expired-${sub.id}`,
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
        id: `expiring-${sub.id}`,
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
      id: `pending-${sub.id}`,
    })),
  ];

  // Sort by priority first, then by timestamp (newest first)
  const sortedNotifications = notifications.sort((a, b) => {
    // Primary sort by priority (0 = request, 1 = expired, 2 = expiring, 3 = pending)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Secondary sort by timestamp (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  
  // Filter out deleted notifications
  const displayNotifications = sortedNotifications.filter(
    notif => !deletedIds.has(notif.id)
  );

  const variantStyles = {
    warning: 'border-warning/30 bg-warning/5',
    destructive: 'border-destructive/30 bg-destructive/5',
    accent: 'border-accent/30 bg-accent/5',
    success: 'border-success/30 bg-success/5',
  };

  const iconStyles = {
    warning: 'text-warning',
    destructive: 'text-destructive',
    accent: 'text-accent',
    success: 'text-success',
  };

  const computeSubscriberStatus = (endDateStr: string, isPaused: boolean): string => {
    if (isPaused) return 'paused';
    const todayStart = startOfDay(new Date());
    const end = startOfDay(parseISO(endDateStr));
    const daysRemaining = differenceInDays(end, todayStart);
    if (daysRemaining < 0) return 'expired';
    if (daysRemaining <= 7) return 'expiring';
    return 'active';
  };

  const handleApproveRequest = async (request: SubscriptionRequest) => {
    if (!user) {
      toast({ title: 'غير مصرح', description: 'يرجى تسجيل الدخول كموظف', variant: 'destructive' });
      return;
    }

    try {
      const normalizedPhone = normalizeEgyptPhoneDigits(request.phone);
      if (!normalizedPhone) {
        toast({ title: 'خطأ', description: 'رقم الهاتف غير صحيح', variant: 'destructive' });
        return;
      }

      // Check if subscriber already exists (same phone) -> update it, otherwise insert new
      const { data: existingSubs, error: existingError } = await supabase
        .from('subscribers')
        .select('id, phone')
        .eq('user_id', user.id);

      if (existingError) throw existingError;

      const existing = (existingSubs || []).find(s => normalizeEgyptPhoneDigits(s.phone) === normalizedPhone);

      const status = computeSubscriberStatus(request.end_date, false);

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({
            name: request.name,
            phone: normalizedPhone,
            subscription_type: request.subscription_type,
            start_date: request.start_date,
            end_date: request.end_date,
            paid_amount: request.paid_amount,
            remaining_amount: request.remaining_amount,
            status,
            is_archived: false,
            is_paused: false,
            paused_until: null,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('subscribers')
          .insert({
            user_id: user.id,
            name: request.name,
            phone: normalizedPhone,
            subscription_type: request.subscription_type,
            start_date: request.start_date,
            end_date: request.end_date,
            paid_amount: request.paid_amount,
            remaining_amount: request.remaining_amount,
            status,
            // captain has a DB default, but set it explicitly for clarity
            captain: 'كابتن خالد',
            is_archived: false,
            is_paused: false,
            paused_until: null,
          });

        if (insertError) throw insertError;
      }

      // Update request status
      const { error: reqError } = await supabase
        .from('subscription_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (reqError) throw reqError;

      toast({ title: 'تم قبول الطلب وإضافته لقائمة المشتركين' });
    } catch (e) {
      console.error('Error approving request:', e);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء قبول الطلب', variant: 'destructive' });
    }
  };

  const handleRejectRequest = async (request: SubscriptionRequest) => {
    try {
      await supabase
        .from('subscription_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      toast({ title: 'تم رفض الطلب' });
    } catch (e) {
      console.error('Error rejecting request:', e);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء رفض الطلب', variant: 'destructive' });
    }
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
    // Add all current notification IDs to deleted set (except requests)
    const nonRequestNotifs = sortedNotifications.filter(n => n.type !== 'request');
    const allIds = new Set([...deletedIds, ...nonRequestNotifs.map(n => n.id)]);
    setDeletedIds(allIds);
    saveDeletedIds(allIds);
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
                    key={notif.id}
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
                        {notif.type === 'request' && notif.request && (
                          <>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notif.request.phone} • {notif.request.payment_method || 'لم يحدد'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              المبلغ: {notif.request.paid_amount} جنيه
                              {notif.request.remaining_amount > 0 && ` (متبقي: ${notif.request.remaining_amount})`}
                            </p>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="default"
                                className="flex-1"
                                onClick={() => handleApproveRequest(notif.request!)}
                              >
                                <CheckCircle className="w-4 h-4 ml-1" />
                                قبول
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-destructive hover:text-destructive"
                                onClick={() => handleRejectRequest(notif.request!)}
                              >
                                <X className="w-4 h-4 ml-1" />
                                رفض
                              </Button>
                            </div>
                          </>
                        )}
                        {notif.subscriber && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {notif.subscriber.phone} • {notif.subscriber.captain}
                          </p>
                        )}
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
