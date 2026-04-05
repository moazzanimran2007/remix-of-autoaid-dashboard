
-- 1. Create organisations table
CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- 2. Create organisation_members table
CREATE TABLE public.organisation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'mechanic' CHECK (role IN ('owner', 'mechanic')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

-- 3. Create organisation_invites table
CREATE TABLE public.organisation_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, email)
);
ALTER TABLE public.organisation_invites ENABLE ROW LEVEL SECURITY;

-- 4. Add organisation_id to existing tables
ALTER TABLE public.jobs ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.mechanics ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.profiles ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);

-- 5. Create helper function
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id FROM public.organisation_members WHERE user_id = _user_id LIMIT 1;
$$;

-- 6. RLS for organisations
CREATE POLICY "Members can view own org"
  ON public.organisations FOR SELECT TO authenticated
  USING (id = get_user_org_id(auth.uid()));

CREATE POLICY "Owners can update own org"
  ON public.organisations FOR UPDATE TO authenticated
  USING (id = get_user_org_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Authenticated can insert org"
  ON public.organisations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 7. RLS for organisation_members
CREATE POLICY "Members can view own org members"
  ON public.organisation_members FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id(auth.uid()));

CREATE POLICY "Owners can add members"
  ON public.organisation_members FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id(auth.uid()));

CREATE POLICY "Owners can remove members"
  ON public.organisation_members FOR DELETE TO authenticated
  USING (organisation_id = get_user_org_id(auth.uid()));

-- 8. RLS for organisation_invites
CREATE POLICY "Owners can view invites"
  ON public.organisation_invites FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id(auth.uid()));

CREATE POLICY "Owners can add invites"
  ON public.organisation_invites FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id(auth.uid()));

CREATE POLICY "Owners can delete invites"
  ON public.organisation_invites FOR DELETE TO authenticated
  USING (organisation_id = get_user_org_id(auth.uid()));

-- 9. Update jobs RLS to scope by org
DROP POLICY IF EXISTS "Authenticated users can view jobs" ON public.jobs;
CREATE POLICY "Users can view org jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;
CREATE POLICY "Users can update org jobs"
  ON public.jobs FOR UPDATE TO authenticated
  USING (organisation_id = get_user_org_id(auth.uid()));

-- Allow inserting jobs for own org
CREATE POLICY "Users can insert org jobs"
  ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id(auth.uid()));

-- 10. Update mechanics RLS to scope by org
DROP POLICY IF EXISTS "Authenticated users can view mechanics" ON public.mechanics;
CREATE POLICY "Users can view org mechanics"
  ON public.mechanics FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id(auth.uid()));

CREATE POLICY "Owners can insert mechanics"
  ON public.mechanics FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id(auth.uid()));

CREATE POLICY "Owners can update mechanics"
  ON public.mechanics FOR UPDATE TO authenticated
  USING (organisation_id = get_user_org_id(auth.uid()));

CREATE POLICY "Owners can delete mechanics"
  ON public.mechanics FOR DELETE TO authenticated
  USING (organisation_id = get_user_org_id(auth.uid()));

-- 11. Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  new_org_id uuid;
  org_name text;
BEGIN
  -- Check if email was pre-invited
  SELECT oi.organisation_id, oi.id INTO invite_record
  FROM public.organisation_invites oi
  WHERE LOWER(oi.email) = LOWER(NEW.email)
  LIMIT 1;

  IF invite_record.organisation_id IS NOT NULL THEN
    -- Mechanic with invite: create profile, join org, assign role
    INSERT INTO public.profiles (id, display_name, organisation_id)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), invite_record.organisation_id);

    INSERT INTO public.organisation_members (organisation_id, user_id, role)
    VALUES (invite_record.organisation_id, NEW.id, 'mechanic');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'mechanic');

    -- Remove used invite
    DELETE FROM public.organisation_invites WHERE id = invite_record.id;

  ELSIF (NEW.raw_user_meta_data->>'is_owner')::boolean = true THEN
    -- Owner signup: create org, profile, membership, role
    org_name := COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Shop');

    INSERT INTO public.organisations (id, name, created_by)
    VALUES (gen_random_uuid(), org_name, NEW.id)
    RETURNING id INTO new_org_id;

    INSERT INTO public.profiles (id, display_name, organisation_id)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), new_org_id);

    INSERT INTO public.organisation_members (organisation_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'shop_owner');

  ELSE
    -- Fallback: no org
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'mechanic');
  END IF;

  RETURN NEW;
END;
$$;

-- 12. Recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Allow service_role to insert jobs (for webhooks)
CREATE POLICY "Service role can insert jobs"
  ON public.jobs FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update jobs"
  ON public.jobs FOR UPDATE TO service_role
  USING (true);
