-- Create subscribers table
CREATE TABLE public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  subscription_type TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  captain TEXT NOT NULL DEFAULT 'كابتن خالد',
  status TEXT NOT NULL DEFAULT 'active',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_price NUMERIC NOT NULL DEFAULT 200,
  quarterly_price NUMERIC NOT NULL DEFAULT 500,
  semi_annual_price NUMERIC NOT NULL DEFAULT 900,
  annual_price NUMERIC NOT NULL DEFAULT 1500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscribers
CREATE POLICY "Users can view their own subscribers" 
ON public.subscribers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscribers" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscribers" 
ON public.subscribers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscribers" 
ON public.subscribers 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for settings
CREATE POLICY "Users can view their own settings" 
ON public.settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" 
ON public.settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for subscribers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscribers;