
CREATE TABLE public.diagnosis_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  original_diagnosis jsonb NOT NULL,
  corrected_issue text,
  corrected_root_cause text,
  corrected_severity public.job_severity,
  corrected_parts jsonb,
  corrected_time text,
  mechanic_feedback text,
  accuracy_rating integer,
  corrected_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnosis_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view corrections"
  ON public.diagnosis_corrections FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Mechanics can insert corrections"
  ON public.diagnosis_corrections FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'shop_owner') OR
    public.has_role(auth.uid(), 'mechanic')
  );

CREATE INDEX idx_corrections_job_id ON public.diagnosis_corrections(job_id);
