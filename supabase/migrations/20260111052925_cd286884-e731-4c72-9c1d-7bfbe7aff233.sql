-- Create workout requests table
CREATE TABLE public.workout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  goal TEXT NOT NULL,
  training_level TEXT NOT NULL,
  training_location TEXT NOT NULL,
  training_days INTEGER NOT NULL,
  session_duration INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert workout requests
CREATE POLICY "Anyone can submit workout requests"
ON public.workout_requests
FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to view and manage all requests
CREATE POLICY "Authenticated users can view workout requests"
ON public.workout_requests
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can update workout requests"
ON public.workout_requests
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_requests;