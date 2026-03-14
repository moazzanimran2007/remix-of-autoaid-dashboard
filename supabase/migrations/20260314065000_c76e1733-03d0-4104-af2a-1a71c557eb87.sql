
-- Phase 1: Tighten RLS on jobs table
DROP POLICY IF EXISTS "Anyone can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON public.jobs;

CREATE POLICY "Authenticated users can view jobs" ON public.jobs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (true);

-- No INSERT policy for anon/authenticated; webhooks use service_role key which bypasses RLS

-- Phase 1: Tighten RLS on call_logs table
DROP POLICY IF EXISTS "Anyone can insert call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Anyone can view call logs" ON public.call_logs;

CREATE POLICY "Authenticated users can view call logs" ON public.call_logs
  FOR SELECT TO authenticated USING (true);

-- No INSERT for public; service_role handles inserts

-- Phase 1: Tighten RLS on mechanics table
DROP POLICY IF EXISTS "Anyone can view mechanics" ON public.mechanics;

CREATE POLICY "Authenticated users can view mechanics" ON public.mechanics
  FOR SELECT TO authenticated USING (true);

-- Phase 1: Fix notifications INSERT policy
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

-- Notifications are inserted by triggers (SECURITY DEFINER), which bypass RLS.
-- No public INSERT policy needed.

-- Phase 2: Create atomic upvote function
CREATE OR REPLACE FUNCTION public.increment_upvote(entry_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE diagnostic_knowledge_base
  SET upvotes = COALESCE(upvotes, 0) + 1
  WHERE id = entry_id;
$$;
