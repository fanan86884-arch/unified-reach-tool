import { Bell, BellOff, Loader2, AlertCircle, Smartphone, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const PushNotificationSettings = () => {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    permission,
    iosInfo,
    subscribe, 
    unsubscribe 
  } = usePushNotifications();

  // iOS not in PWA mode - show instructions
  if (iosInfo.isIOS && !iosInfo.isPWA) {
    return (
      <div className="space-y-4">
        <Alert className="border-primary/50 bg-primary/5">
          <Smartphone className="h-4 w-4 text-primary" />
          <AlertDescription className="text-right">
            <p className="font-medium mb-2">لتفعيل الإشعارات على الآيفون:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>اضغط على زر المشاركة <Share className="inline w-4 h-4 mx-1" /></li>
              <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
              <li>افتح التطبيق من الشاشة الرئيسية</li>
              <li>فعّل الإشعارات من الإعدادات</li>
            </ol>
          </AlertDescription>
        </Alert>
        
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center gap-3 text-muted-foreground">
            <BellOff className="w-5 h-5" />
            <div>
              <p className="font-medium">الإشعارات غير مدعومة في Safari</p>
              <p className="text-sm">أضف التطبيق للشاشة الرئيسية لتفعيلها</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

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
