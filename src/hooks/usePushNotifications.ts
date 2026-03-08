import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client.runtime';
import { toast } from '@/hooks/use-toast';

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

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

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

  // Cache the VAPID public key
  const vapidKeyRef = useRef<string | null>(null);

  const fetchVapidPublicKey = async (): Promise<string> => {
    if (vapidKeyRef.current) return vapidKeyRef.current;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xlowcsumezdzgjvjcvln.supabase.co';
    const response = await fetch(`${supabaseUrl}/functions/v1/get-push-config`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch VAPID key');

    const { publicKey } = await response.json();
    vapidKeyRef.current = publicKey;
    return publicKey;
  };

  useEffect(() => {
    const iosCheck = isIOS();
    const pwaCheck = isPWA();
    const safariCheck = isSafari();

    setIosInfo({ isIOS: iosCheck, isPWA: pwaCheck, isSafari: safariCheck });

    const browserSupports = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const iosLimitation = iosCheck && !pwaCheck;

    setIsSupported(browserSupports && !iosLimitation);

    if (browserSupports && !iosLimitation) {
      setPermission(Notification.permission);
      checkSubscription();
    }

    // Listen for subscription changes from SW
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED' && event.data.newSubscription) {
        const sub = event.data.newSubscription;
        const { data: { user } } = await supabase.auth.getUser();
        if (user && sub.keys?.p256dh && sub.keys?.auth) {
          await supabase.from('push_subscriptions').upsert({
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          }, { onConflict: 'user_id,endpoint' });
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
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
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      if (isIOS() && !isPWA()) {
        toast({
          title: 'مطلوب تثبيت التطبيق',
          description: 'على iOS، يجب تثبيت التطبيق أولاً من خلال: مشاركة ← إضافة إلى الشاشة الرئيسية',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'غير مدعوم',
          description: 'المتصفح لا يدعم الإشعارات',
          variant: 'destructive'
        });
      }
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
          description: 'يجب السماح بالإشعارات من إعدادات الجهاز',
          variant: 'destructive'
        });
        return;
      }

      // Fetch VAPID public key from server
      const vapidPublicKey = await fetchVapidPublicKey();

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push notifications with the server's VAPID key
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
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
          auth: keys.auth,
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'تم التفعيل ✅',
        description: 'سيتم إعلامك عند وصول طلب جديد'
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تفعيل الإشعارات. تأكد من تثبيت التطبيق كـ PWA.',
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

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
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
