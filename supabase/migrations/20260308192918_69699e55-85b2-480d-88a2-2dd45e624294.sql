
-- Enable pg_net extension for HTTP calls from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send push notification via edge function when a new request is inserted
CREATE OR REPLACE FUNCTION public.notify_new_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _title TEXT;
  _body TEXT;
  _type TEXT;
  _supabase_url TEXT;
  _service_key TEXT;
BEGIN
  -- Only trigger on INSERT with pending status
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Determine notification content based on table
  IF TG_TABLE_NAME = 'subscription_requests' THEN
    _title := 'طلب اشتراك جديد';
    _body := NEW.name || ' - ' || NEW.subscription_type;
    _type := 'subscription';
  ELSIF TG_TABLE_NAME = 'diet_requests' THEN
    _title := 'طلب نظام غذائي جديد';
    _body := NEW.name || ' - ' || NEW.goal;
    _type := 'diet';
  ELSIF TG_TABLE_NAME = 'workout_requests' THEN
    _title := 'طلب برنامج تمرين جديد';
    _body := NEW.name || ' - ' || NEW.goal;
    _type := 'workout';
  ELSE
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service role key from vault or env
  _supabase_url := current_setting('app.settings.supabase_url', true);
  _service_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, try a simpler approach using pg_net
  -- Call the edge function
  PERFORM extensions.http_post(
    url := (SELECT value->>'url' FROM public.system_config WHERE key = 'supabase_url') || '/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'title', _title,
      'body', _body,
      'type', _type,
      'data', jsonb_build_object('url', '/')
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value->>'service_key' FROM public.system_config WHERE key = 'supabase_service_key')
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if notification fails
    RAISE WARNING 'Push notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$;
