-- Add Modulate toxicity fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN toxicity_flag boolean DEFAULT false,
ADD COLUMN toxicity_reason text DEFAULT NULL;
