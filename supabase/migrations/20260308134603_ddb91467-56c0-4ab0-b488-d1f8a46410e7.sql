
CREATE TABLE public.renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  renewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_subscriber FOREIGN KEY (subscriber_id) REFERENCES public.subscribers(id) ON DELETE CASCADE
);

ALTER TABLE public.renewal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own renewal history"
  ON public.renewal_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own renewal history"
  ON public.renewal_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own renewal history"
  ON public.renewal_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
