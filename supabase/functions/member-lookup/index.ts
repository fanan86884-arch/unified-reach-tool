import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert Arabic numerals to English
const convertArabicToEnglish = (str: string): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let result = str;
  arabicNumerals.forEach((arabic, index) => {
    result = result.replace(new RegExp(arabic, 'g'), index.toString());
  });
  return result;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string') {
      console.log('Invalid phone parameter received');
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Convert Arabic numerals and clean phone number
    const convertedPhone = convertArabicToEnglish(phone);
    const cleanPhone = convertedPhone.replace(/\D/g, '');

    if (cleanPhone.length < 8) {
      console.log('Phone number too short:', cleanPhone.length);
      return new Response(
        JSON.stringify({ error: 'Phone number is too short' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Looking up member with phone:', cleanPhone);

    // Create Supabase client with service role for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query subscribers - only return non-archived, limited public info
    const { data, error } = await supabase
      .from('subscribers')
      .select('id, name, phone, subscription_type, start_date, end_date, paid_amount, remaining_amount, status, is_paused, paused_until')
      .eq('is_archived', false);

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find matching subscriber with flexible phone matching
    const subscriber = data?.find(sub => {
      const subPhone = sub.phone.replace(/\D/g, '');
      return subPhone === cleanPhone || 
             subPhone === '20' + cleanPhone ||
             '20' + subPhone === cleanPhone ||
             subPhone.endsWith(cleanPhone) ||
             cleanPhone.endsWith(subPhone);
    });

    if (!subscriber) {
      console.log('No subscriber found for phone:', cleanPhone);
      return new Response(
        JSON.stringify({ found: false }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Found subscriber:', subscriber.name);

    // Return limited subscriber info (no captain, user_id, or internal data)
    return new Response(
      JSON.stringify({ 
        found: true,
        subscriber: {
          id: subscriber.id,
          name: subscriber.name,
          phone: subscriber.phone,
          subscriptionType: subscriber.subscription_type,
          startDate: subscriber.start_date,
          endDate: subscriber.end_date,
          paidAmount: subscriber.paid_amount,
          remainingAmount: subscriber.remaining_amount,
          status: subscriber.status,
          isPaused: subscriber.is_paused,
          pausedUntil: subscriber.paused_until,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in member-lookup:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
