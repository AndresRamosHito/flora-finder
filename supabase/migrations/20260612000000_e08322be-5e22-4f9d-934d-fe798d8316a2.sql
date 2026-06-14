-- Native-status flag + first-pass catalog corrections.
--
-- Context: the taxa catalog spans all of Mexico (national framing), but it had
-- accumulated taxa with no wild Mexican distribution (e.g. Phalaenopsis,
-- Cattleya, Phragmipedium kovachii). Rather than delete them — growers log
-- cultivated exotics under "en colección" — we flag them as non-native so the
-- wild herbarium / maps / lists can exclude them while they stay selectable.
--
-- The authoritative, species-by-species reconciliation against the Herbario AMO
-- references is a follow-up; this migration handles the explicitly-named cases
-- and the schema groundwork.

-- 1. Schema: nativeness flag. Default true = part of the Mexican flora.
ALTER TABLE public.taxa
  ADD COLUMN IF NOT EXISTS is_native boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.taxa.is_native IS
  'True when the taxon has a wild distribution in Mexico. False marks exotics/cultivated-only taxa, selectable for "en colección" observations but excluded from the wild herbarium, maps and lists.';

-- 2. Flag non-native taxa.
--    * Cattleya: no species is native to Mexico (the Mexican "cattleya-like"
--      plants belong to Guarianthe).
--    * Phalaenopsis: Old World genus, not present in the American flora.
--    * Phragmipedium kovachii: Peruvian. Note we do NOT blanket the genus —
--      other Phragmipedium (e.g. P. exstaminodium) do occur in Mexico.
--    Exotics are also unflagged as conservation-sensitive (the Mexican
--    location-masking guardrail doesn't apply to cultivated exotics).
UPDATE public.taxa
SET is_native = false,
    is_sensitive = false
WHERE genus IN ('Cattleya', 'Phalaenopsis')
   OR sci_name ILIKE 'Phragmipedium kovachii%'
   OR sci_name ILIKE 'Phrag. kovachii%';

-- 3. Add Dinema × mariae to the Mexican flora. Metadata is intentionally
--    minimal pending confirmation against the Herbario AMO references.
--    Insert-if-absent (no ON CONFLICT) so this works even where taxa.sci_name
--    has no unique constraint (the bulk-imported catalog doesn't have one).
INSERT INTO public.taxa (sci_name, genus, family, tribe, is_native, is_sensitive, region)
SELECT 'Dinema × mariae', 'Dinema', 'Orchidaceae', 'Epidendreae / Laeliinae', true, false, 'México'
WHERE NOT EXISTS (SELECT 1 FROM public.taxa WHERE sci_name = 'Dinema × mariae');

UPDATE public.taxa
SET is_native = true,
    genus     = 'Dinema',
    tribe     = 'Epidendreae / Laeliinae'
WHERE sci_name = 'Dinema × mariae';

-- 4. Correct the blanket "Sierra de Oaxaca" region stamped on the seed taxa,
--    which mislabelled species that occur elsewhere in Mexico.
UPDATE public.taxa SET region = 'Centro de México'            WHERE sci_name = 'Laelia speciosa';
UPDATE public.taxa SET region = 'Centro de México (Hidalgo)'  WHERE sci_name = 'Laelia gouldiana';
UPDATE public.taxa SET region = 'Oaxaca'                      WHERE sci_name = 'Barkeria whartoniana';
UPDATE public.taxa SET region = 'Noreste de México'           WHERE sci_name = 'Euchile mariae';
UPDATE public.taxa SET region = 'México (bosque de niebla)'   WHERE sci_name = 'Rhynchostele cervantesii';
UPDATE public.taxa SET region = 'Occidente y centro de México' WHERE sci_name = 'Encyclia adenocaula';
UPDATE public.taxa SET region = 'Sur de México y Mesoamérica' WHERE sci_name = 'Prosthechea vitellina';
UPDATE public.taxa SET region = 'Este de México (Veracruz)'   WHERE sci_name = 'Stanhopea tigrina';
UPDATE public.taxa SET region = 'Occidente de México'         WHERE sci_name = 'Cuitlauzina pendula';
UPDATE public.taxa SET region = 'Sur de México y Mesoamérica' WHERE sci_name = 'Rhynchostele bictoniensis';
