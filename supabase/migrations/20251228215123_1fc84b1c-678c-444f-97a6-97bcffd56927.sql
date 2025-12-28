-- Add pause columns to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_until date DEFAULT NULL;