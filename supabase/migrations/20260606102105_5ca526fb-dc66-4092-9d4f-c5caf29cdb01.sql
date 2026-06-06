ALTER TABLE public.trade_reports
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

DROP POLICY IF EXISTS reports_admin_update ON public.trade_reports;
CREATE POLICY reports_admin_update ON public.trade_reports
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS trade_reports_status_idx ON public.trade_reports (status, created_at DESC);