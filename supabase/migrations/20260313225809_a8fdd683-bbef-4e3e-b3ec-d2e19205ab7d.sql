
-- Enable realtime for jobs table so feed updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
