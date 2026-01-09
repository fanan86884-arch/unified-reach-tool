import { Subscriber } from '@/types/subscriber';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Clock, XCircle, DollarSign, Trash2, UserPlus, CheckCircle, X, Salad, Filter, Send } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, isToday, isYesterday, formatDistanceToNow, differenceInHours } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { normalizeEgyptPhoneDigits } from '@/lib/phone';
import { useContactSettings } from '@/hooks/useContactSettings';

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

interface DietRequest {
  id: string;
  name: string;
  phone: string;
  weight: number;
  height: number;
  age: number;
  gender: string;
  activity_level: string;
  goal: string;
  sleep_time: string;
  wake_time: string;
  meals_count: number;
  status: string;
  admin_response: string | null;
  created_at: string;
}

interface NotificationsProps {
  stats: {
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
  };
}

type NotificationType = 'expiring' | 'expired' | 'pending' | 'request' | 'diet';
type FilterType = 'all' | 'requests' | 'diet' | 'subscriptions';

interface Notification {
  type: NotificationType;
  subscriber?: Subscriber;
  request?: SubscriptionRequest;
  dietRequest?: DietRequest;
  message: string;
  subMessage: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'warning' | 'destructive' | 'accent' | 'success' | 'info';
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

const saveDeletedIds = (ids: Set<string>) => {
  localStorage.setItem(DELETED_NOTIFICATIONS_KEY, JSON.stringify([...ids]));
};

const subscriptionLabels: Record<string, string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  annual: 'سنوي',
};

const goalLabels: Record<string, string> = {
  weight_loss: 'خسارة وزن',
  maintain: 'ثبات الوزن',
  muscle_gain: 'زيادة كتلة عضلية',
};

const activityLabels: Record<string, string> = {
  sedentary: 'خامل',
  moderate: 'متوسط',
  active: 'نشيط',
};

const genderLabels: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
};

export const Notifications = ({ stats }: NotificationsProps) => {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => loadDeletedIds());
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [dietRequests, setDietRequests] = useState<DietRequest[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedCaptain, setSelectedCaptain] = useState<Record<string, string>>({});
  const [dietResponses, setDietResponses] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const { contactInfo } = useContactSettings();
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

  // Fetch diet requests
  useEffect(() => {
    const fetchDietRequests = async () => {
      const { data } = await supabase
        .from('diet_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (data) {
        setDietRequests(data);
      }
    };

    fetchDietRequests();

    const channel = supabase
      .channel('diet_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diet_requests' }, () => {
        fetchDietRequests();
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
    // Diet requests - high priority
    ...dietRequests.map((req) => ({
      type: 'diet' as const,
      dietRequest: req,
      message: `طلب نظام غذائي جديد`,
      subMessage: `${req.name} - ${goalLabels[req.goal] || req.goal}`,
      icon: Salad,
      variant: 'info' as const,
      priority: 0.5,
      timestamp: req.created_at,
      id: `diet-${req.id}`,
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
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  
  // Filter notifications
  const filteredNotifications = sortedNotifications.filter(notif => {
    if (deletedIds.has(notif.id)) return false;
    
    switch (filter) {
      case 'requests':
        return notif.type === 'request';
      case 'diet':
        return notif.type === 'diet';
      case 'subscriptions':
        return ['expired', 'expiring', 'pending'].includes(notif.type);
      default:
        return true;
    }
  });

  const variantStyles = {
    warning: 'border-warning/30 bg-warning/5',
    destructive: 'border-destructive/30 bg-destructive/5',
    accent: 'border-accent/30 bg-accent/5',
    success: 'border-success/30 bg-success/5',
    info: 'border-primary/30 bg-primary/5',
  };

  const iconStyles = {
    warning: 'text-warning',
    destructive: 'text-destructive',
    accent: 'text-accent',
    success: 'text-success',
    info: 'text-primary',
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

  // Check for duplicate requests within 24 hours
  const checkDuplicateRequest = async (phone: string): Promise<boolean> => {
    const normalizedPhone = normalizeEgyptPhoneDigits(phone);
    if (!normalizedPhone) return false;

    const { data } = await supabase
      .from('subscription_requests')
      .select('created_at')
      .or(`phone.eq.${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-10)}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastRequest = parseISO(data[0].created_at);
      const hoursSince = differenceInHours(new Date(), lastRequest);
      return hoursSince < 24;
    }
    return false;
  };

  const handleApproveRequest = async (request: SubscriptionRequest) => {
    if (!user) {
      toast({ title: 'غير مصرح', description: 'يرجى تسجيل الدخول كموظف', variant: 'destructive' });
      return;
    }

    const captain = selectedCaptain[request.id];
    if (!captain) {
      toast({ title: 'يرجى اختيار الكابتن', variant: 'destructive' });
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
            captain: captain,
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
            captain: captain,
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

      toast({ title: `تم قبول الطلب وإضافته لـ ${captain}` });
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

  const handleRespondDiet = async (dietRequest: DietRequest) => {
    const response = dietResponses[dietRequest.id];
    if (!response?.trim()) {
      toast({ title: 'يرجى كتابة الرد', variant: 'destructive' });
      return;
    }

    try {
      await supabase
        .from('diet_requests')
        .update({ 
          status: 'responded',
          admin_response: response.trim()
        })
        .eq('id', dietRequest.id);

      toast({ title: 'تم إرسال الرد بنجاح' });
      setDietResponses(prev => {
        const copy = { ...prev };
        delete copy[dietRequest.id];
        return copy;
      });
    } catch (e) {
      console.error('Error responding to diet request:', e);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء إرسال الرد', variant: 'destructive' });
    }
  };

  const handleRejectDiet = async (dietRequest: DietRequest) => {
    try {
      await supabase
        .from('diet_requests')
        .update({ status: 'rejected' })
        .eq('id', dietRequest.id);

      toast({ title: 'تم رفض الطلب' });
    } catch (e) {
      console.error('Error rejecting diet request:', e);
      toast({ title: 'خطأ', variant: 'destructive' });
    }
  };

  // Group notifications by date
  const groupedByDate = filteredNotifications.reduce((groups, notif) => {
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
    const nonRequestNotifs = sortedNotifications.filter(n => n.type !== 'request' && n.type !== 'diet');
    const allIds = new Set([...deletedIds, ...nonRequestNotifs.map(n => n.id)]);
    setDeletedIds(allIds);
    saveDeletedIds(allIds);
  };

  const filterLabels: Record<FilterType, string> = {
    all: 'الكل',
    requests: 'طلبات الاشتراك',
    diet: 'طلبات النظام الغذائي',
    subscriptions: 'الاشتراكات',
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          الإشعارات
        </h2>
        <div className="flex items-center gap-2">
          {filteredNotifications.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {filteredNotifications.length} إشعار
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

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="requests">طلبات الاشتراك</SelectItem>
            <SelectItem value="diet">طلبات النظام الغذائي</SelectItem>
            <SelectItem value="subscriptions">الاشتراكات</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredNotifications.length === 0 ? (
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

                        {/* Subscription Request Actions */}
                        {notif.type === 'request' && notif.request && (
                          <>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notif.request.phone} • {notif.request.payment_method || 'لم يحدد'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              المبلغ: {notif.request.paid_amount} جنيه
                              {notif.request.remaining_amount > 0 && ` (متبقي: ${notif.request.remaining_amount})`}
                            </p>
                            
                            {/* Captain Selection */}
                            <div className="mt-3">
                              <Select 
                                value={selectedCaptain[notif.request.id] || ''} 
                                onValueChange={(v) => setSelectedCaptain(prev => ({ ...prev, [notif.request!.id]: v }))}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="اختر الكابتن" />
                                </SelectTrigger>
                                <SelectContent>
                                  {contactInfo.captains.map((captain, idx) => (
                                    <SelectItem key={idx} value={captain.name}>
                                      {captain.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="default"
                                className="flex-1"
                                onClick={() => handleApproveRequest(notif.request!)}
                                disabled={!selectedCaptain[notif.request.id]}
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

                        {/* Diet Request Actions */}
                        {notif.type === 'diet' && notif.dietRequest && (
                          <>
                            <div className="mt-2 text-xs text-muted-foreground space-y-1">
                              <p>الهاتف: {notif.dietRequest.phone}</p>
                              <p>الوزن: {notif.dietRequest.weight} كجم | الطول: {notif.dietRequest.height} سم</p>
                              <p>السن: {notif.dietRequest.age} | النوع: {genderLabels[notif.dietRequest.gender]}</p>
                              <p>النشاط: {activityLabels[notif.dietRequest.activity_level]}</p>
                              <p>مواعيد النوم: {notif.dietRequest.sleep_time} - الاستيقاظ: {notif.dietRequest.wake_time}</p>
                              <p>عدد الوجبات: {notif.dietRequest.meals_count}</p>
                            </div>
                            
                            <div className="mt-3">
                              <Textarea
                                placeholder="اكتب النظام الغذائي هنا..."
                                value={dietResponses[notif.dietRequest.id] || ''}
                                onChange={(e) => setDietResponses(prev => ({ ...prev, [notif.dietRequest!.id]: e.target.value }))}
                                rows={4}
                                className="text-sm"
                              />
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="default"
                                className="flex-1"
                                onClick={() => handleRespondDiet(notif.dietRequest!)}
                                disabled={!dietResponses[notif.dietRequest.id]?.trim()}
                              >
                                <Send className="w-4 h-4 ml-1" />
                                إرسال الرد
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-destructive hover:text-destructive"
                                onClick={() => handleRejectDiet(notif.dietRequest!)}
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
