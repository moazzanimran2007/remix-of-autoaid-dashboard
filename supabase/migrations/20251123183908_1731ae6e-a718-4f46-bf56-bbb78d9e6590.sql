-- Add parts search results column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN parts_search_results JSONB DEFAULT NULL;