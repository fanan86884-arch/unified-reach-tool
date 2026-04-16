-- ============================================
-- 1) Create role enum
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'shift_employee');

-- ============================================
-- 2) Create user_roles table
-- ============================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3) Security definer functions (avoid RLS recursion)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- ============================================
-- 4) RLS for user_roles
-- ============================================
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()) AND user_id <> auth.uid());

-- ============================================
-- 5) Bootstrap: first user becomes admin
-- ============================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- 6) Update subscribers RLS so admins see all, shift employees see only theirs
-- ============================================
DROP POLICY IF EXISTS "Users can view their own subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Users can create their own subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Users can delete their own subscribers" ON public.subscribers;

CREATE POLICY "View subscribers (admin all, shift own)"
  ON public.subscribers FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Insert own subscribers"
  ON public.subscribers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update subscribers (admin all, shift own)"
  ON public.subscribers FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Delete subscribers (admin all, shift own)"
  ON public.subscribers FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- ============================================
-- 7) Update activity_log RLS (admin sees all)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_log;

CREATE POLICY "View activity logs (admin all, shift own)"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- ============================================
-- 8) Update renewal_history RLS (admin sees all)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own renewal history" ON public.renewal_history;

CREATE POLICY "View renewal history (admin all, shift own)"
  ON public.renewal_history FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- ============================================
-- 9) Restrict contact_settings updates to admins only
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert contact settings" ON public.contact_settings;
DROP POLICY IF EXISTS "Authenticated users can update contact settings" ON public.contact_settings;

CREATE POLICY "Admins can insert contact settings"
  ON public.contact_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.contact_settings)
  );

CREATE POLICY "Admins can update contact settings"
  ON public.contact_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================
-- 10) Restrict pricing settings updates to admins
-- ============================================
DROP POLICY IF EXISTS "Users can update their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can create their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.settings;

CREATE POLICY "View settings (admin all, shift own)"
  ON public.settings FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins can manage all settings - insert"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins can manage all settings - update"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);