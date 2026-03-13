
-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications (service role or triggers)
CREATE POLICY "Service can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: notify all authenticated users when a job is created
CREATE OR REPLACE FUNCTION public.notify_on_job_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT user_id FROM public.user_roles LOOP
    INSERT INTO public.notifications (user_id, title, message, type, job_id)
    VALUES (
      r.user_id,
      'New Job Received',
      COALESCE(NEW.customer_name, 'Unknown') || ' — ' || COALESCE(NEW.symptoms, 'No symptoms'),
      'job_created',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_job_insert
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_job_insert();

-- Trigger: notify when job status changes
CREATE OR REPLACE FUNCTION public.notify_on_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    FOR r IN SELECT user_id FROM public.user_roles LOOP
      INSERT INTO public.notifications (user_id, title, message, type, job_id)
      VALUES (
        r.user_id,
        'Job Status Updated',
        COALESCE(NEW.customer_name, 'Unknown') || ' → ' || COALESCE(NEW.status::text, ''),
        'job_updated',
        NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_job_status
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_job_status_change();
