
-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to job-photos (webhooks need this)
CREATE POLICY "Anyone can upload job photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'job-photos');

-- Allow anyone to view job photos
CREATE POLICY "Anyone can view job photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'job-photos');
