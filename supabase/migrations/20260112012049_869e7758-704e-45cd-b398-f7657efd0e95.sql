-- Create diet plans table to store generated plans with conversation history
CREATE TABLE public.diet_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diet_request_id UUID REFERENCES public.diet_requests(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_data JSONB NOT NULL, -- weight, height, age, gender, activity_level, goal, etc.
  plan_content TEXT NOT NULL,
  target_calories INTEGER,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, approved, sent
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation messages table for AI chat history
CREATE TABLE public.diet_plan_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diet_plan_id UUID NOT NULL REFERENCES public.diet_plans(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout plans table
CREATE TABLE public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_request_id UUID REFERENCES public.workout_requests(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_data JSONB NOT NULL,
  plan_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout plan messages
CREATE TABLE public.workout_plan_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plan_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for diet plans
CREATE POLICY "Authenticated users can manage diet plans"
ON public.diet_plans FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage diet plan messages"
ON public.diet_plan_messages FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS policies for workout plans
CREATE POLICY "Authenticated users can manage workout plans"
ON public.workout_plans FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage workout plan messages"
ON public.workout_plan_messages FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add triggers for updated_at
CREATE TRIGGER update_diet_plans_updated_at
BEFORE UPDATE ON public.diet_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_plans_updated_at
BEFORE UPDATE ON public.workout_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.diet_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.diet_plan_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_plan_messages;