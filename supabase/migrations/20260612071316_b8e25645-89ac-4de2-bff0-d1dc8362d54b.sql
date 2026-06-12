
-- Drop dependent policies referencing is_admin(uuid)/is_verifier_or_admin(uuid)
DROP POLICY IF EXISTS taxa_write ON public.taxa;
DROP POLICY IF EXISTS hunts_write ON public.hunts;
DROP POLICY IF EXISTS targets_write ON public.hunt_targets;
DROP POLICY IF EXISTS soc_write ON public.societies;
DROP POLICY IF EXISTS reports_admin_read ON public.trade_reports;
DROP POLICY IF EXISTS reports_admin_update ON public.trade_reports;
DROP POLICY IF EXISTS badges_write ON public.badges;
DROP POLICY IF EXISTS sightings_select ON public.sightings;
DROP POLICY IF EXISTS verif_insert ON public.verifications;

DROP VIEW IF EXISTS public.sightings_public;

DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.is_verifier_or_admin(uuid);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_verifier_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('verifier','admin'));
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_verifier_or_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_verifier_or_admin() TO authenticated, service_role;

-- Recreate the dropped policies using the no-arg functions
CREATE POLICY taxa_write ON public.taxa FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY hunts_write ON public.hunts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY targets_write ON public.hunt_targets FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY soc_write ON public.societies FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY badges_write ON public.badges FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY reports_admin_read ON public.trade_reports FOR SELECT USING (public.is_admin());
CREATE POLICY reports_admin_update ON public.trade_reports FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY sightings_select ON public.sightings FOR SELECT USING ((user_id = auth.uid()) OR public.is_verifier_or_admin());
CREATE POLICY verif_insert ON public.verifications FOR INSERT WITH CHECK (public.is_verifier_or_admin() AND (verifier_id = auth.uid()));

-- fuzz_point search_path
ALTER FUNCTION public.fuzz_point(geometry, double precision) SET search_path = public;

-- Restrict comments read to authenticated
DROP POLICY IF EXISTS comments_read ON public.sighting_comments;
CREATE POLICY comments_read ON public.sighting_comments FOR SELECT TO authenticated USING (true);

-- Restrict society_members read to authenticated
DROP POLICY IF EXISTS mem_read ON public.society_members;
CREATE POLICY mem_read ON public.society_members FOR SELECT TO authenticated USING (true);

-- Recreate sightings_public view with security_invoker
CREATE VIEW public.sightings_public
WITH (security_invoker = on) AS
SELECT id, user_id, taxon_id, photo_url, observed_at, status, notes,
       location_label, created_at, is_sensitive, sci_name, common_name,
       variety, origin, geom_public, is_masked,
       st_y(geom_public) AS lat, st_x(geom_public) AS lng
FROM (
  SELECT s.id, s.user_id, s.taxon_id, s.photo_url, s.observed_at, s.status,
         s.notes, s.location_label, s.created_at,
         t.is_sensitive, t.sci_name, t.common_name, s.variety, s.origin,
         CASE
           WHEN (s.user_id = auth.uid()) OR public.is_verifier_or_admin() THEN s.geom
           WHEN s.taxon_id IS NULL THEN public.fuzz_point(s.geom, 0.01)
           WHEN COALESCE(t.is_sensitive, false) THEN
             CASE WHEN s.location_precision = 'hidden'::location_precision THEN NULL::geometry
                  ELSE public.fuzz_point(s.geom, 0.01) END
           ELSE
             CASE WHEN s.location_precision = 'exact'::location_precision THEN s.geom
                  ELSE public.fuzz_point(s.geom, 0.01) END
         END AS geom_public,
         (NOT ((s.user_id = auth.uid()) OR public.is_verifier_or_admin())
          AND (COALESCE(t.is_sensitive, false) OR s.location_precision <> 'exact'::location_precision)) AS is_masked
  FROM public.sightings s
  LEFT JOIN public.taxa t ON t.id = s.taxon_id
) sub;
GRANT SELECT ON public.sightings_public TO anon, authenticated;

-- Realtime: gate society:<id> topic subscriptions to society members
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS society_messages_realtime_select ON realtime.messages;
CREATE POLICY society_messages_realtime_select ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'society:%' THEN EXISTS (
        SELECT 1 FROM public.society_members m
        WHERE m.user_id = auth.uid()
          AND m.society_id = substring(realtime.topic() FROM 'society:(.+)$')
      )
      ELSE true
    END
  );

-- reserved_handles: admin-only read policy
DROP POLICY IF EXISTS reserved_handles_admin_read ON public.reserved_handles;
CREATE POLICY reserved_handles_admin_read ON public.reserved_handles
  FOR SELECT TO authenticated USING (public.is_admin());
