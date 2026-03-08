
-- Store the Supabase URL and anon key in system_config for the trigger to use
INSERT INTO public.system_config (key, value) 
VALUES ('edge_function_config', jsonb_build_object(
  'url', 'https://xlowcsumezdzgjvjcvln.supabase.co',
  'anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsb3djc3VtZXpkemdqdmpjdmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjU0OTcsImV4cCI6MjA4MjQ0MTQ5N30.6Cu9NxG4I2C0G4NEZO5ag6mzuknD_Y6VGZSEAbKlLRI'
))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Recreate the function using pg_net's net.http_post
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
  _config JSONB;
BEGIN
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

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

  SELECT value INTO _config FROM public.system_config WHERE key = 'edge_function_config';

  IF _config IS NOT NULL THEN
    PERFORM net.http_post(
      url := (_config->>'url') || '/functions/v1/send-push-notification',
      body := jsonb_build_object(
        'title', _title,
        'body', _body,
        'type', _type,
        'data', jsonb_build_object('url', '/')
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (_config->>'anon_key')
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Push notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create triggers on all request tables
CREATE TRIGGER on_new_subscription_request
  AFTER INSERT ON public.subscription_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_request();

CREATE TRIGGER on_new_diet_request
  AFTER INSERT ON public.diet_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_request();

CREATE TRIGGER on_new_workout_request
  AFTER INSERT ON public.workout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_request();
