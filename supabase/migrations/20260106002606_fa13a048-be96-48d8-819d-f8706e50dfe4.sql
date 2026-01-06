-- Create contact_settings table for cloud sync
CREATE TABLE public.contact_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_url text DEFAULT '',
  instagram_url text DEFAULT '',
  captains jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read contact settings
CREATE POLICY "Authenticated users can read contact settings"
ON public.contact_settings
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert if no record exists
CREATE POLICY "Authenticated users can insert contact settings"
ON public.contact_settings
FOR INSERT
TO authenticated
WITH CHECK (NOT EXISTS (SELECT 1 FROM public.contact_settings));

-- Allow all authenticated users to update contact settings
CREATE POLICY "Authenticated users can update contact settings"
ON public.contact_settings
FOR UPDATE
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_contact_settings_updated_at
BEFORE UPDATE ON public.contact_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default contact settings
INSERT INTO public.contact_settings (facebook_url, instagram_url, captains)
VALUES (
  'https://www.facebook.com/share/1Evxng2Gyf/?mibextid=wwXIfr',
  '',
  '[{"name": "الكابتن محمد", "phone": "01002690364"}, {"name": "الكابتن خالد", "phone": "01127353006"}]'::jsonb
);

-- Allow public read for member lookup (contact info only - no sensitive data)
CREATE POLICY "Public can read contact settings for member lookup"
ON public.contact_settings
FOR SELECT
TO anon
USING (true);

-- Enable realtime for contact_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_settings;