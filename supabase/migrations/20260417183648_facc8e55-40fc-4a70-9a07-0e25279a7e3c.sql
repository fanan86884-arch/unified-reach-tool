-- Add pricing_tiers JSONB column to settings (stores all gender x category x duration prices)
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS pricing_tiers JSONB NOT NULL DEFAULT '{
    "male": {
      "gym": { "monthly": 250, "quarterly": 700, "semi-annual": 1300, "annual": 2400 },
      "gym_walking": { "monthly": 350, "quarterly": 950, "semi-annual": 1800, "annual": 3300 },
      "walking": { "monthly": 150, "quarterly": 400, "semi-annual": 750, "annual": 1400 }
    },
    "female": {
      "gym": { "monthly": 300, "quarterly": 850, "semi-annual": 1600, "annual": 2900 },
      "gym_walking": { "monthly": 400, "quarterly": 1100, "semi-annual": 2050, "annual": 3800 },
      "walking": { "monthly": 200, "quarterly": 550, "semi-annual": 1000, "annual": 1850 }
    }
  }'::jsonb;

-- Add gender and subscription_category to subscribers
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'male',
  ADD COLUMN IF NOT EXISTS subscription_category TEXT NOT NULL DEFAULT 'gym';

-- Validation triggers (avoid CHECK constraints)
CREATE OR REPLACE FUNCTION public.validate_subscriber_enums()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.gender NOT IN ('male','female') THEN
    RAISE EXCEPTION 'Invalid gender: %', NEW.gender;
  END IF;
  IF NEW.subscription_category NOT IN ('gym','gym_walking','walking') THEN
    RAISE EXCEPTION 'Invalid subscription_category: %', NEW.subscription_category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_subscriber_enums_trg ON public.subscribers;
CREATE TRIGGER validate_subscriber_enums_trg
  BEFORE INSERT OR UPDATE ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscriber_enums();