-- Create table for WhatsApp templates with cloud sync
CREATE TABLE public.whatsapp_templates (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view global templates and their own
CREATE POLICY "Users can view global and own templates"
ON public.whatsapp_templates
FOR SELECT
USING (is_global = true OR auth.uid() = user_id);

-- Policy: Only admin can create/update global templates
CREATE POLICY "Users can manage their own templates"
ON public.whatsapp_templates
FOR ALL
USING (auth.uid() = user_id);

-- Insert default global templates
INSERT INTO public.whatsapp_templates (id, name, content, is_global)
VALUES 
  ('subscription', 'رسالة الاشتراك', 'تم الاشتراك في الجيم بتاريخ {تاريخ_الاشتراك} وتم دفع {المبلغ_المدفوع} جنيه والمتبقي {المبلغ_المتبقي} جنيه. ينتهي الاشتراك بتاريخ {تاريخ_الانتهاء}', true),
  ('reminder', 'تذكير بالمبلغ المتبقي', 'مرحباً {الاسم}، نود تذكيرك بأن لديك مبلغ متبقي {المبلغ_المتبقي} جنيه. يرجى التواصل معنا لتسديد المبلغ.', true),
  ('expiry', 'تنبيه انتهاء الاشتراك', 'مرحباً {الاسم}، اشتراكك سينتهي بتاريخ {تاريخ_الانتهاء}. يرجى التواصل معنا للتجديد.', true),
  ('expired', 'اشتراك منتهي', 'مرحباً {الاسم}، انتهى اشتراكك في الجيم. نفتقدك! تواصل معنا لتجديد اشتراكك والعودة للتمرين.', true),
  ('paused', 'اشتراك موقوف', 'مرحباً {الاسم}، نود أن نخبرك بأنه تم إيقاف اشتراكك لمدة {المدة_المحددة} وأنه سينتهي اشتراكك بتاريخ {تاريخ_الانتهاء}', true);

-- Enable realtime for templates
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_templates;