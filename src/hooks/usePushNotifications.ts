import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { toast } from '@/hooks/use-toast';

// VAPID public key - this needs to match the one in the edge function
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Detect iOS
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Check if running as PWA (standalone mode)
function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// Check if Safari
function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [iosInfo, setIosInfo] = useState<{ isIOS: boolean; isPWA: boolean; isSafari: boolean }>({
    isIOS: false,
    isPWA: false,
    isSafari: false,
  });

  useEffect(() => {
    // Detect iOS/Safari environment
    const iosCheck = isIOS();
    const pwaCheck = isPWA();
    const safariCheck = isSafari();
    
    setIosInfo({
      isIOS: iosCheck,
      isPWA: pwaCheck,
      isSafari: safariCheck,
    });

    // Push is supported if:
    // - Browser supports it AND
    // - Not iOS Safari in browser (only works as PWA on iOS)
    const browserSupports = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const iosLimitation = iosCheck && safariCheck && !pwaCheck;
    
    setIsSupported(browserSupports && !iosLimitation);

    if (browserSupports && !iosLimitation) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    
    return registration;
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'غير مدعوم',
        description: 'المتصفح لا يدعم الإشعارات',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast({
          title: 'تم الرفض',
          description: 'يجب السماح بالإشعارات لتفعيل هذه الميزة',
          variant: 'destructive'
        });
        return;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push notifications
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      });

      // Get the subscription keys
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys;

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'خطأ',
          description: 'يجب تسجيل الدخول أولاً',
          variant: 'destructive'
        });
        return;
      }

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'تم التفعيل',
        description: 'سيتم إعلامك عند وصول طلب جديد'
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تفعيل الإشعارات',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Remove subscription from database
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);
        }
      }

      setIsSubscribed(false);
      toast({
        title: 'تم إلغاء التفعيل',
        description: 'لن تتلقى إشعارات بعد الآن'
      });
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إلغاء التفعيل',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    iosInfo,
    subscribe,
    unsubscribe
  };
}
