
CREATE POLICY "Anyone can read renewal history count"
  ON public.renewal_history FOR SELECT
  USING (true);
