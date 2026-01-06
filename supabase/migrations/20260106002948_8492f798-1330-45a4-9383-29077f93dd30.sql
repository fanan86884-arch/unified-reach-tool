-- Drop the insecure public read policy for subscribers
DROP POLICY IF EXISTS "Allow public read for phone lookup" ON public.subscribers;