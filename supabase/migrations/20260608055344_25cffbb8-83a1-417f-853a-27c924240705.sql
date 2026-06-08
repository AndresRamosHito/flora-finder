
DO $$ BEGIN
  CREATE TYPE public.sighting_origin AS ENUM ('wild','collection');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.sightings
  ADD COLUMN IF NOT EXISTS variety text,
  ADD COLUMN IF NOT EXISTS origin public.sighting_origin NOT NULL DEFAULT 'wild';

ALTER TABLE public.sightings DROP CONSTRAINT IF EXISTS sightings_variety_len;
ALTER TABLE public.sightings
  ADD CONSTRAINT sightings_variety_len CHECK (variety IS NULL OR char_length(variety) <= 120);

DROP VIEW IF EXISTS public.sightings_public;
CREATE VIEW public.sightings_public AS
SELECT id, user_id, taxon_id, photo_url, observed_at, status, notes,
       location_label, created_at, is_sensitive, sci_name, common_name,
       variety, origin,
       geom_public, is_masked,
       st_y(geom_public) AS lat,
       st_x(geom_public) AS lng
FROM (
  SELECT s.id, s.user_id, s.taxon_id, s.photo_url, s.observed_at, s.status, s.notes,
         s.location_label, s.created_at,
         t.is_sensitive, t.sci_name, t.common_name,
         s.variety, s.origin,
         CASE
           WHEN s.user_id = auth.uid() OR is_verifier_or_admin() THEN s.geom
           WHEN s.taxon_id IS NULL THEN fuzz_point(s.geom)
           WHEN COALESCE(t.is_sensitive, false) THEN
             CASE WHEN s.location_precision = 'hidden'::location_precision THEN NULL::geometry
                  ELSE fuzz_point(s.geom) END
           ELSE
             CASE WHEN s.location_precision = 'exact'::location_precision THEN s.geom
                  ELSE fuzz_point(s.geom) END
         END AS geom_public,
         (NOT (s.user_id = auth.uid() OR is_verifier_or_admin())
          AND (COALESCE(t.is_sensitive,false) OR s.location_precision <> 'exact'::location_precision)
         ) AS is_masked
  FROM public.sightings s
  LEFT JOIN public.taxa t ON t.id = s.taxon_id
) sub;

GRANT SELECT ON public.sightings_public TO anon, authenticated;
