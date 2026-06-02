-- Add bi-monthly (two months) subscription price column
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS bi_monthly_price numeric NOT NULL DEFAULT 380;

-- Update pricing_tiers default to include bi-monthly tier for new rows
ALTER TABLE public.settings
  ALTER COLUMN pricing_tiers SET DEFAULT '{"male": {"gym": {"annual": 2400, "monthly": 250, "bi-monthly": 475, "quarterly": 700, "semi-annual": 1300}, "walking": {"annual": 1400, "monthly": 150, "bi-monthly": 285, "quarterly": 400, "semi-annual": 750}, "gym_walking": {"annual": 3300, "monthly": 350, "bi-monthly": 665, "quarterly": 950, "semi-annual": 1800}}, "female": {"gym": {"annual": 2900, "monthly": 300, "bi-monthly": 570, "quarterly": 850, "semi-annual": 1600}, "walking": {"annual": 1850, "monthly": 200, "bi-monthly": 380, "quarterly": 550, "semi-annual": 1000}, "gym_walking": {"annual": 3800, "monthly": 400, "bi-monthly": 760, "quarterly": 1100, "semi-annual": 2050}}}'::jsonb;

-- Backfill existing rows: inject bi-monthly into each tier (monthly * 1.9 rounded) where missing
UPDATE public.settings
SET pricing_tiers = (
  SELECT jsonb_object_agg(g_key,
    (SELECT jsonb_object_agg(c_key,
      CASE WHEN c_val ? 'bi-monthly' THEN c_val
           ELSE c_val || jsonb_build_object('bi-monthly', round(((c_val->>'monthly')::numeric) * 1.9))
      END
    ) FROM jsonb_each(g_val) AS cats(c_key, c_val))
  ) FROM jsonb_each(pricing_tiers) AS genders(g_key, g_val)
)
WHERE pricing_tiers IS NOT NULL;