
-- Add missing columns that edge functions reference
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS toxicity_flag BOOLEAN DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS toxicity_reason TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS photo_analysis JSONB;
