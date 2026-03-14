
CREATE TABLE public.diagnostic_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_make text NOT NULL,
  car_model text NOT NULL,
  car_year text,
  symptom_keywords text NOT NULL,
  verified_diagnosis text NOT NULL,
  fix_description text,
  parts_used jsonb DEFAULT '[]'::jsonb,
  actual_time text,
  severity public.job_severity,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  upvotes int DEFAULT 0
);

CREATE INDEX idx_dkb_make_model ON public.diagnostic_knowledge_base (car_make, car_model);
CREATE INDEX idx_dkb_symptoms ON public.diagnostic_knowledge_base USING gin (to_tsvector('english', symptom_keywords));

ALTER TABLE public.diagnostic_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view knowledge base"
ON public.diagnostic_knowledge_base FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Mechanics can insert knowledge base entries"
ON public.diagnostic_knowledge_base FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'shop_owner') OR public.has_role(auth.uid(), 'mechanic')
);

CREATE POLICY "Mechanics can update knowledge base entries"
ON public.diagnostic_knowledge_base FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'shop_owner') OR public.has_role(auth.uid(), 'mechanic')
);
