-- Add a public read policy for subscribers table so members can look up their phone
CREATE POLICY "Allow public read for phone lookup" 
ON public.subscribers 
FOR SELECT 
USING (is_archived = false);