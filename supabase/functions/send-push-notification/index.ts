import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import {
  buildPushPayload,
  type PushSubscription,
  type PushMessage,
  type VapidKeys,
} from "https://esm.sh/@block65/webcrypto-web-push@1.0.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64urlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getOrCreateVapidKeys(supabase: any) {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'vapid_keys')
    .single();

  if (data?.value) return data.value;

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );

  const publicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', keyPair.publicKey)
  );
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  const keys = {
    publicKey: base64urlEncode(publicKeyRaw),
    privateKey: privateKeyJwk.d,
  };

  await supabase
    .from('system_config')
    .upsert({ key: 'vapid_keys', value: keys });

  return keys;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { title, body, type, data: notifData } = await req.json();

    // Auto-generate VAPID keys if not configured
    const vapidConfig = await getOrCreateVapidKeys(supabase);

    const vapidKeys: VapidKeys = {
      subject: 'mailto:admin@2bgym.com',
      publicKey: configData.value.publicKey,
      privateKey: configData.value.privateKey,
    };

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title: title || '2B GYM',
      body: body || 'لديك إشعار جديد',
      icon: '/logo-icon.png',
      badge: '/logo-icon.png',
      tag: type || 'notification',
      data: notifData || {},
    });

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushSubscription: PushSubscription = {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const message: PushMessage = {
          data: payload,
          options: {
            ttl: 86400,
            urgency: 'high',
          },
        };

        // buildPushPayload returns a Request with properly encrypted payload
        const pushRequest = await buildPushPayload(message, pushSubscription, vapidKeys);
        const response = await fetch(pushRequest);

        if (response.ok || response.status === 201) {
          sentCount++;
        } else {
          const errText = await response.text();
          console.error(`Push failed for ${sub.endpoint}: ${response.status} ${errText}`);
          // 404 or 410 means subscription is expired
          if (response.status === 404 || response.status === 410) {
            failedEndpoints.push(sub.endpoint);
          }
        }
      } catch (error) {
        console.error(`Error sending to ${sub.endpoint}:`, error);
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up expired subscriptions
    if (failedEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
    }

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent',
        sent: sentCount,
        failed: failedEndpoints.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
