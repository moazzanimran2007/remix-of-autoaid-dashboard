-- Create enum types
CREATE TYPE job_severity AS ENUM ('low', 'medium', 'high');
CREATE TYPE job_status AS ENUM ('new', 'assigned', 'in-progress', 'resolved');
CREATE TYPE mechanic_status AS ENUM ('available', 'busy');
CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');

-- Create Mechanics table
CREATE TABLE public.mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status mechanic_status DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on Mechanics
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Mechanics (public read, no auth required)
CREATE POLICY "Anyone can view mechanics"
  ON public.mechanics FOR SELECT
  USING (true);

-- Create Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  customer_phone TEXT,
  car_make TEXT,
  car_model TEXT,
  car_year TEXT,
  symptoms TEXT,
  severity job_severity DEFAULT 'low',
  status job_status DEFAULT 'new',
  assigned_mechanic_id UUID REFERENCES public.mechanics(id),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  transcript TEXT,
  diagnosis JSONB,
  photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on Jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Jobs (public read/write, no auth required)
CREATE POLICY "Anyone can view jobs"
  ON public.jobs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update jobs"
  ON public.jobs FOR UPDATE
  USING (true);

-- Create Call Logs table
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  telnyx_call_id TEXT,
  direction call_direction NOT NULL,
  from_number TEXT,
  to_number TEXT,
  duration INTEGER,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on Call Logs
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Call Logs (public read, no auth required)
CREATE POLICY "Anyone can view call logs"
  ON public.call_logs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert call logs"
  ON public.call_logs FOR INSERT
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Jobs table
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for Jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;

-- Insert sample mechanics
INSERT INTO public.mechanics (name, phone, status) VALUES
  ('Mike Johnson', '+1-555-0101', 'available'),
  ('Sarah Williams', '+1-555-0102', 'available'),
  ('Tom Davis', '+1-555-0103', 'busy');