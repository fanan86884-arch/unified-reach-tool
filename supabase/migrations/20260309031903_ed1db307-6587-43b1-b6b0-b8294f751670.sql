-- Create triggers for push notifications on new requests
CREATE TRIGGER notify_new_subscription_request
  AFTER INSERT ON public.subscription_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_request();

CREATE TRIGGER notify_new_diet_request
  AFTER INSERT ON public.diet_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_request();

CREATE TRIGGER notify_new_workout_request
  AFTER INSERT ON public.workout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_request();

-- Ensure pg_net extension is enabled for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;