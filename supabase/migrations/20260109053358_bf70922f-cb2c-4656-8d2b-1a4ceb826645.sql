-- Create diet_requests table for storing diet plan requests from members
CREATE TABLE public.diet_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  activity_level TEXT NOT NULL,
  goal TEXT NOT NULL,
  sleep_time TEXT NOT NULL,
  wake_time TEXT NOT NULL,
  meals_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.diet_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert diet requests (for members without auth)
CREATE POLICY "Anyone can insert diet requests"
ON public.diet_requests
FOR INSERT
WITH CHECK (true);

-- Authenticated users (employees) can view diet requests
CREATE POLICY "Authenticated users can view diet requests"
ON public.diet_requests
FOR SELECT
USING (auth.role() = 'authenticated');

-- Authenticated users can update diet requests
CREATE POLICY "Authenticated users can update diet requests"
ON public.diet_requests
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Authenticated users can delete diet requests
CREATE POLICY "Authenticated users can delete diet requests"
ON public.diet_requests
FOR DELETE
USING (auth.role() = 'authenticated');

-- Add trigger for updating updated_at
CREATE TRIGGER update_diet_requests_updated_at
BEFORE UPDATE ON public.diet_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();