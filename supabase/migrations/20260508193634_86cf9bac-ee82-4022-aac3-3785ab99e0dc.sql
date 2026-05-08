
-- Client accounts: links phone/auth user to subscriber
CREATE TABLE public.client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  subscriber_id uuid NOT NULL UNIQUE,
  phone text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

-- Captain accounts
CREATE TABLE public.captain_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  captain_name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.captain_accounts ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_my_subscriber_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT subscriber_id FROM public.client_accounts WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_captain_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT captain_name FROM public.captain_accounts WHERE user_id = auth.uid() LIMIT 1;
$$;

-- client_accounts policies
CREATE POLICY "Client reads own account" ON public.client_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Admins manage client accounts insert" ON public.client_accounts
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage client accounts update" ON public.client_accounts
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage client accounts delete" ON public.client_accounts
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- captain_accounts policies
CREATE POLICY "Captain reads own account" ON public.captain_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Admins manage captain accounts insert" ON public.captain_accounts
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage captain accounts update" ON public.captain_accounts
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage captain accounts delete" ON public.captain_accounts
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Allow client to read their own subscriber record
CREATE POLICY "Client reads own subscriber" ON public.subscribers
  FOR SELECT TO authenticated USING (id = public.get_my_subscriber_id());

-- Allow captain to read subscribers assigned to them
CREATE POLICY "Captain reads own clients" ON public.subscribers
  FOR SELECT TO authenticated USING (captain = public.get_my_captain_name());

-- Allow client to read their renewal history
CREATE POLICY "Client reads own renewals" ON public.renewal_history
  FOR SELECT TO authenticated USING (subscriber_id = public.get_my_subscriber_id());

-- Attendance table
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  qr_token text,
  checked_in_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attendance_subscriber ON public.attendance(subscriber_id, checked_in_at DESC);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client inserts own attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (client_user_id = auth.uid() AND subscriber_id = public.get_my_subscriber_id());
CREATE POLICY "Client reads own attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid() OR is_admin(auth.uid()) OR subscriber_id IN (
    SELECT id FROM public.subscribers WHERE captain = public.get_my_captain_name()
  ));
CREATE POLICY "Admins delete attendance" ON public.attendance
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Client notes (captain → client)
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL,
  captain_user_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_notes_subscriber ON public.client_notes(subscriber_id, created_at DESC);
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Captain inserts notes for own clients" ON public.client_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    captain_user_id = auth.uid()
    AND subscriber_id IN (SELECT id FROM public.subscribers WHERE captain = public.get_my_captain_name())
  );
CREATE POLICY "Captain deletes own notes" ON public.client_notes
  FOR DELETE TO authenticated
  USING (captain_user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Read notes (client/captain/admin)" ON public.client_notes
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR subscriber_id = public.get_my_subscriber_id()
    OR subscriber_id IN (SELECT id FROM public.subscribers WHERE captain = public.get_my_captain_name())
  );

-- Gym QR tokens (static, posted in gym)
CREATE TABLE public.gym_qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gym_qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active gym tokens" ON public.gym_qr_tokens
  FOR SELECT TO authenticated USING (is_active = true OR is_admin(auth.uid()));
CREATE POLICY "Admins manage gym tokens insert" ON public.gym_qr_tokens
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage gym tokens update" ON public.gym_qr_tokens
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage gym tokens delete" ON public.gym_qr_tokens
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Client notifications
CREATE TABLE public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_notifications_subscriber ON public.client_notifications(subscriber_id, created_at DESC);
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client reads own notifications" ON public.client_notifications
  FOR SELECT TO authenticated
  USING (subscriber_id = public.get_my_subscriber_id() OR is_admin(auth.uid()));
CREATE POLICY "Client updates own notifications" ON public.client_notifications
  FOR UPDATE TO authenticated USING (subscriber_id = public.get_my_subscriber_id());
CREATE POLICY "Admins insert notifications" ON public.client_notifications
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins delete notifications" ON public.client_notifications
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;

-- Seed a default gym QR token
INSERT INTO public.gym_qr_tokens (token, label, is_active)
VALUES (encode(gen_random_bytes(16), 'hex'), 'Main Entrance', true);
