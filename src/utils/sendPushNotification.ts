import { supabase } from '@/integrations/supabase/client';

interface NotificationPayload {
  title: string;
  body: string;
  type?: 'subscription' | 'diet' | 'workout';
  data?: Record<string, unknown>;
}

export async function sendPushNotificationToStaff(payload: NotificationPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: payload
    });

    if (error) {
      console.error('Error sending push notification:', error);
    }
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}
