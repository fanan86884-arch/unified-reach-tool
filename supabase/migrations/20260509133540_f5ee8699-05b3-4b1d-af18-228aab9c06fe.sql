CREATE TABLE public.client_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client','captain')),
  sender_user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_subscriber ON public.client_chat_messages(subscriber_id, created_at DESC);

ALTER TABLE public.client_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read chat (client/captain/admin)"
ON public.client_chat_messages FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR subscriber_id = get_my_subscriber_id()
  OR subscriber_id IN (SELECT id FROM public.subscribers WHERE captain = get_my_captain_name())
);

CREATE POLICY "Client sends own chat"
ON public.client_chat_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_role = 'client'
  AND sender_user_id = auth.uid()
  AND subscriber_id = get_my_subscriber_id()
);

CREATE POLICY "Captain sends chat to own clients"
ON public.client_chat_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_role = 'captain'
  AND sender_user_id = auth.uid()
  AND subscriber_id IN (SELECT id FROM public.subscribers WHERE captain = get_my_captain_name())
);

CREATE POLICY "Mark messages read"
ON public.client_chat_messages FOR UPDATE TO authenticated
USING (
  is_admin(auth.uid())
  OR (sender_role = 'captain' AND subscriber_id = get_my_subscriber_id())
  OR (sender_role = 'client' AND subscriber_id IN (SELECT id FROM public.subscribers WHERE captain = get_my_captain_name()))
);

CREATE POLICY "Admin delete chat"
ON public.client_chat_messages FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.client_chat_messages;
ALTER TABLE public.client_chat_messages REPLICA IDENTITY FULL;