
CREATE TABLE public.captains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.captains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read captains"
ON public.captains FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert captains"
ON public.captains FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete captains"
ON public.captains FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

INSERT INTO public.captains (name) VALUES
  ('كابتن خالد'),
  ('كابتن محمد'),
  ('كابتن أحمد')
ON CONFLICT (name) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.captains;
