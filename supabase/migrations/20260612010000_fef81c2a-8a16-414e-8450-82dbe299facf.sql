-- Genus-level native pass for the taxa catalog.
--
-- Approach (chosen with the user): rather than read the live catalog, we flag
-- nativeness by genus against an allowlist of orchid genera native to Mexico,
-- compiled from the published Mexican checklist literature (~170 genera /
-- ~1,260 species: Soto Arenas / Hágsater — Herbario AMO; Espejo-Serna &
-- López-Ferrari; CONABIO). Anything whose genus is NOT on the allowlist is
-- marked is_native = false (exotic / cultivated-only).
--
-- IMPORTANT REVIEW NOTES:
--   * This is biased to be GENEROUS — when in doubt a genus is included, so a
--     genuine native is never wrongly flagged. The trade-off is that a stray
--     exotic in an otherwise-native genus is NOT caught here; those are handled
--     species-by-species (see the exceptions block, e.g. Phragmipedium kovachii).
--   * The allowlist includes commonly-used SYNONYM genera (Lemboglossum,
--     Odontoglossum, Osmoglossum, Mexicoa, Amparoa, Ticoglossum, Psygmorchis…)
--     because the catalog may use older generic concepts.
--   * Eyeball the list below: if a native genus is missing it will be wrongly
--     flagged exotic — add it and re-run (the pass is idempotent).

CREATE TEMPORARY TABLE _native_genera (genus text PRIMARY KEY) ON COMMIT DROP;

INSERT INTO _native_genera (genus) VALUES
  -- Cypripedioideae (slipper orchids native to Mexico)
  ('Cypripedium'), ('Mexipedium'), ('Phragmipedium'),
  -- Vanilloideae
  ('Vanilla'),
  -- Orchidoideae · Cranichideae (Spiranthinae + Goodyerinae + Cranichidinae)
  ('Aulosepalum'), ('Beloglottis'), ('Brachystele'), ('Coccineorchis'), ('Cranichis'),
  ('Cyclopogon'), ('Deiregyne'), ('Dichromanthus'), ('Eltroplectris'), ('Eurystyles'),
  ('Funkiella'), ('Galeottiella'), ('Hapalorchis'), ('Kionophyton'), ('Lankesterella'),
  ('Mesadenus'), ('Microthelys'), ('Pelexia'), ('Physogyne'), ('Ponthieva'),
  ('Prescottia'), ('Pseudogoodyera'), ('Pteroglossa'), ('Sacoila'), ('Sarcoglottis'),
  ('Schiedeella'), ('Spiranthes'), ('Stenorrhynchos'), ('Svenkoeltzia'),
  ('Goodyera'), ('Aspidogyne'), ('Microchilus'), ('Erythrodes'), ('Platythelys'),
  ('Kreodanthus'), ('Ligeophila'),
  -- Orchidoideae · Tropidieae
  ('Corymborkis'), ('Tropidia'),
  -- Orchidoideae · Orchideae
  ('Habenaria'), ('Platanthera'), ('Galeoglossum'), ('Bertauxia'), ('Coeloglossum'), ('Piperia'),
  -- Epidendroideae · Triphoreae
  ('Triphora'), ('Psilochilus'), ('Monophyllorchis'),
  -- Epidendroideae · Sobralieae
  ('Sobralia'), ('Elleanthus'),
  -- Epidendroideae · Wullschlaegelieae
  ('Wullschlaegelia'),
  -- Epidendroideae · Malaxideae
  ('Malaxis'), ('Liparis'), ('Crossoglossa'), ('Crossoliparis'),
  -- Epidendroideae · Calypsoeae
  ('Calypso'), ('Corallorhiza'), ('Govenia'), ('Hexalectris'), ('Aplectrum'),
  -- Epidendroideae · Arethuseae (Arpophyllinae / Coeliinae)
  ('Arpophyllum'), ('Coelia'),
  -- Epidendroideae · Epidendreae · Chysinae / Bletiinae / Ponerinae
  ('Chysis'), ('Bletia'), ('Basiphyllaea'), ('Ponera'), ('Nemaconia'), ('Helleriella'), ('Isochilus'),
  -- Epidendroideae · Epidendreae · Laeliinae
  ('Encyclia'), ('Prosthechea'), ('Epidendrum'), ('Laelia'), ('Barkeria'), ('Brassavola'),
  ('Caularthron'), ('Euchile'), ('Guarianthe'), ('Jacquiniella'), ('Nidema'), ('Oestlundia'),
  ('Homalopetalum'), ('Scaphyglottis'), ('Hagsatera'), ('Artorima'), ('Myrmecophila'),
  ('Rhyncholaelia'), ('Dinema'), ('Microepidendrum'), ('Alamania'), ('Domingoa'), ('Lanium'),
  -- Epidendroideae · Epidendreae · Pleurothallidinae
  ('Pleurothallis'), ('Stelis'), ('Acianthera'), ('Specklinia'), ('Trichosalpinx'),
  ('Platystele'), ('Anathallis'), ('Lepanthes'), ('Lepanthopsis'), ('Echinosepala'),
  ('Masdevallia'), ('Dryadella'), ('Restrepia'), ('Myoxanthus'), ('Zootrophion'),
  ('Scaphosepalum'), ('Dresslerella'), ('Barbosella'), ('Pabstiella'),
  -- Epidendroideae · Cymbidieae · Eulophiinae / Cyrtopodiinae
  ('Eulophia'), ('Oeceoclades'), ('Cyrtopodium'),
  -- Epidendroideae · Cymbidieae · Catasetinae
  ('Catasetum'), ('Clowesia'), ('Cycnoches'), ('Mormodes'), ('Dressleria'), ('Galeandra'),
  -- Epidendroideae · Cymbidieae · Maxillariinae
  ('Maxillaria'), ('Mormolyca'), ('Trigonidium'), ('Xylobium'), ('Camaridium'),
  ('Heterotaxis'), ('Ornithidium'), ('Christensonella'), ('Brasiliorchis'),
  -- Epidendroideae · Cymbidieae · Stanhopeinae
  ('Stanhopea'), ('Coryanthes'), ('Gongora'), ('Acineta'), ('Houlletia'), ('Polycycnis'),
  ('Sievekingia'), ('Embreea'),
  -- Epidendroideae · Cymbidieae · Zygopetalinae
  ('Dichaea'), ('Cryptarrhena'), ('Cochleanthes'), ('Chondroscaphe'), ('Kefersteinia'),
  ('Warczewiczella'), ('Huntleya'), ('Chaubardia'),
  -- Epidendroideae · Cymbidieae · Lycastinae
  ('Lycaste'),
  -- Epidendroideae · Cymbidieae · Oncidiinae (incl. synonym genera)
  ('Oncidium'), ('Trichocentrum'), ('Rhynchostele'), ('Cuitlauzina'), ('Cohniella'),
  ('Trichopilia'), ('Notylia'), ('Macroclinium'), ('Leochilus'), ('Papperitzia'),
  ('Ionopsis'), ('Lockhartia'), ('Aspasia'), ('Brassia'), ('Ada'), ('Rossioglossum'),
  ('Comparettia'), ('Erycina'), ('Psygmorchis'), ('Palumbina'), ('Osmoglossum'),
  ('Otoglossum'), ('Gomesa'), ('Mesospinidium'), ('Solenidium'), ('Ornithocephalus'),
  ('Zygostates'), ('Telipogon'), ('Stellilabium'), ('Hintonella'), ('Phymatidium'),
  ('Centroglossa'), ('Hofmeisterella'), ('Sigmatostalix'), ('Mexicoa'),
  ('Lemboglossum'), ('Odontoglossum'), ('Mesoglossum'), ('Ticoglossum'), ('Amparoa'),
  ('Symphyglossum'),
  -- Epidendroideae · Vandeae (New-World leafless + Polystachya; Old-World vandoids excluded)
  ('Polystachya'), ('Campylocentrum'), ('Dendrophylax'), ('Harrisella'),
  -- Epidendroideae · Malaxideae/Podochileae · Bulbophyllinae (B. pachyrachis is native)
  ('Bulbophyllum')
ON CONFLICT (genus) DO NOTHING;

-- Flag everything whose genus is not on the allowlist as exotic.
-- Genus is taken from taxa.genus, falling back to the first word of sci_name.
-- Exotics are also cleared of the conservation-sensitivity flag (the Mexican
-- location-masking guardrail doesn't apply to cultivated exotics).
UPDATE public.taxa t
SET is_native = false,
    is_sensitive = false
WHERE lower(trim(COALESCE(NULLIF(t.genus, ''), split_part(t.sci_name, ' ', 1))))
      NOT IN (SELECT lower(genus) FROM _native_genera);

-- Species-level exceptions: exotic species that sit inside an otherwise-native
-- genus, so the genus allowlist can't catch them.
UPDATE public.taxa
SET is_native = false, is_sensitive = false
WHERE sci_name ILIKE 'Phragmipedium kovachii%'
   OR sci_name ILIKE 'Phrag. kovachii%';

-- Keep the explicitly-requested native addition native even though its epithet
-- carries the hybrid mark.
UPDATE public.taxa SET is_native = true WHERE sci_name = 'Dinema × mariae';
