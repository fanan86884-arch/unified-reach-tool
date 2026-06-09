CREATE POLICY "Admin sends chat" ON public.client_chat_messages
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
    AND sender_user_id = auth.uid()
  );