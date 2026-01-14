import { Bell, BellOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const PushNotificationSettings = () => {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    permission,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">الإشعارات غير مدعومة</p>
            <p className="text-sm">المتصفح الحالي لا يدعم إشعارات Push</p>
          </div>
        </div>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card className="p-4 bg-destructive/10 border-destructive/20">
        <div className="flex items-center gap-3 text-destructive">
          <BellOff className="w-5 h-5" />
          <div>
            <p className="font-medium">تم حظر الإشعارات</p>
            <p className="text-sm">يرجى السماح بالإشعارات من إعدادات المتصفح</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-success" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <BellOff className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium">إشعارات Push</p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed 
                ? 'سيتم إعلامك عند وصول طلب جديد' 
                : 'فعّل الإشعارات لتلقي تنبيهات فورية'}
            </p>
          </div>
        </div>

        <Button
          variant={isSubscribed ? 'outline' : 'default'}
          size="sm"
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            'إلغاء التفعيل'
          ) : (
            'تفعيل'
          )}
        </Button>
      </div>
    </Card>
  );
};
