-- Add Lepanthes salvaterrae to the Mexican catalog (absent from the AMO P107
-- checklist seed). Native; genus populated. Idempotent — no ON CONFLICT needed.

INSERT INTO public.taxa (sci_name, genus, family, is_native)
SELECT 'Lepanthes salvaterrae', 'Lepanthes', 'Orchidaceae', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.taxa WHERE sci_name = 'Lepanthes salvaterrae'
);

UPDATE public.taxa
SET is_native = true, genus = 'Lepanthes', family = 'Orchidaceae'
WHERE sci_name = 'Lepanthes salvaterrae';
