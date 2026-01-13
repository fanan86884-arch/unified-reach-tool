-- Create AI training examples table for storing custom examples
CREATE TABLE public.ai_training_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('diet', 'workout')),
  title TEXT NOT NULL,
  client_data JSONB NOT NULL,
  plan_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_training_examples ENABLE ROW LEVEL SECURITY;

-- RLS policy for authenticated users
CREATE POLICY "Authenticated users can manage AI training examples"
ON public.ai_training_examples FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_training_examples_updated_at
BEFORE UPDATE ON public.ai_training_examples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();