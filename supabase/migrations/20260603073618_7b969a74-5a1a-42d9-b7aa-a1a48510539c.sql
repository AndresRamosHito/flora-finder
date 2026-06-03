
-- Allow anyone (including anonymous) to submit a trade report.
CREATE POLICY "reports_public_insert"
ON public.trade_reports
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (anonymous = true AND reporter_id IS NULL)
  OR (reporter_id = auth.uid())
);

GRANT INSERT ON public.trade_reports TO anon, authenticated;

-- Storage policies for sightings bucket (created via tool below).
CREATE POLICY "Sighting photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'sightings');

CREATE POLICY "Users upload to their own sighting folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sightings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update their own sighting photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sightings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete their own sighting photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sightings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
