-- Add payment_settings and store_url to contact_settings table
ALTER TABLE public.contact_settings
ADD COLUMN IF NOT EXISTS instapay_number text DEFAULT '',
ADD COLUMN IF NOT EXISTS vodafone_cash_number text DEFAULT '',
ADD COLUMN IF NOT EXISTS store_url text DEFAULT '';

-- Update existing record with default values
UPDATE public.contact_settings
SET 
  instapay_number = COALESCE(instapay_number, ''),
  vodafone_cash_number = COALESCE(vodafone_cash_number, ''),
  store_url = COALESCE(store_url, '')
WHERE instapay_number IS NULL OR vodafone_cash_number IS NULL OR store_url IS NULL;

-- Create subscription_requests table for pending subscription requests
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  subscription_type text NOT NULL DEFAULT 'monthly',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on subscription_requests
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_requests - Allow public insert for member requests
CREATE POLICY "Anyone can insert subscription requests"
ON public.subscription_requests
FOR INSERT
WITH CHECK (true);

-- Only authenticated users can view/manage requests
CREATE POLICY "Authenticated users can view subscription requests"
ON public.subscription_requests
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update subscription requests"
ON public.subscription_requests
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete subscription requests"
ON public.subscription_requests
FOR DELETE
USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_subscription_requests_updated_at
BEFORE UPDATE ON public.subscription_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();