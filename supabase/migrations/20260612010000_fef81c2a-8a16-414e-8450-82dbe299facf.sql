-- Genus-level native pass for the taxa catalog.
--
-- Approach (chosen with the user): rather than read the live catalog, we flag
-- nativeness by genus against an allowlist of orchid genera native to Mexico,
-- compiled from the authoritative Mexican checklist — Soto Arenas, Hágsater,
-- Jiménez Machorro & Solano Gómez, "Orquídeas de México" (CONABIO Project
-- P107, Herbario AMO), including the narrow segregate genera that work uses.
-- Anything whose genus is NOT on the allowlist is
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
  ('Acianthera'), ('Acineta'), ('Acinopetala'), ('Acronia'), ('Ada'), ('Alamania'),
  ('Amparoa'), ('Anacheilium'), ('Anathallis'), ('Apatostelis'), ('Aplectrum'), ('Arpophyllum'),
  ('Artorima'), ('Aspasia'), ('Aspidogyne'), ('Auliza'), ('Aulosepalum'), ('Barbosella'),
  ('Barkeria'), ('Basiphyllaea'), ('Beadlea'), ('Beloglottis'), ('Bertauxia'), ('Bletia'),
  ('Botriochilus'), ('Brachystele'), ('Brasiliorchis'), ('Brassavola'), ('Brassia'), ('Brenesia'),
  ('Bulbophyllum'), ('Calanthe'), ('Calypso'), ('Camaridium'), ('Campylocentrum'), ('Catasetum'),
  ('Caularthron'), ('Centroglossa'), ('Chaubardia'), ('Chondrorrhyncha'), ('Chondroscaphe'), ('Christensonella'),
  ('Chysis'), ('Clowesia'), ('Coccineorchis'), ('Cochleanthes'), ('Coelia'), ('Coeloglossum'),
  ('Cohniella'), ('Coilostylis'), ('Comparettia'), ('Corallorhiza'), ('Coryanthes'), ('Corymborkis'),
  ('Cranichis'), ('Crossoglossa'), ('Crossoliparis'), ('Cryptarrhena'), ('Cuitlauzina'), ('Cyclopogon'),
  ('Cycnoches'), ('Cymbiglossum'), ('Cypripedium'), ('Cyrtochiloides'), ('Cyrtopodium'), ('Deiregyne'),
  ('Dendrophylax'), ('Dichaea'), ('Dichromanthus'), ('Dignathe'), ('Dimerandra'), ('Dinema'),
  ('Domingoa'), ('Dracontia'), ('Dracula'), ('Dresslerella'), ('Dressleria'), ('Dressleriella'),
  ('Dryadella'), ('Echinosepala'), ('Elleanthus'), ('Eltroplectris'), ('Embreea'), ('Encyclia'),
  ('Epidendrum'), ('Erycina'), ('Erythrodes'), ('Erytrodes'), ('Euchile'), ('Eulophia'),
  ('Eurystyles'), ('Funkiella'), ('Galeandra'), ('Galeoglossum'), ('Galeottia'), ('Galeottiella'),
  ('Gomesa'), ('Gongora'), ('Goodyera'), ('Govenia'), ('Gracielanthus'), ('Guarianthe'),
  ('Gularia'), ('Habenaria'), ('Habenella'), ('Hagsatera'), ('Hapalorchis'), ('Harrisella'),
  ('Hartwegia'), ('Helleriella'), ('Heterotaxis'), ('Hexadesmia'), ('Hexalectris'), ('Hexisea'),
  ('Hintonella'), ('Hofmeisterella'), ('Homalopetalum'), ('Hormidium'), ('Houlletia'), ('Huntleya'),
  ('Ionopsis'), ('Isochilus'), ('Jacquiniella'), ('Kefersteinia'), ('Kionophyton'), ('Kraenzlinella'),
  ('Kreodanthus'), ('Lacaena'), ('Laelia'), ('Lanium'), ('Lankesterella'), ('Lemboglossum'),
  ('Leochilus'), ('Lepanthes'), ('Lepanthopsis'), ('Ligeophila'), ('Liparis'), ('Lockhartia'),
  ('Lophiaris'), ('Lycaste'), ('Lyroglossa'), ('Macroclinium'), ('Malaxis'), ('Masdevallia'),
  ('Maxillaria'), ('Meiracyllium'), ('Mesadenella'), ('Mesadenus'), ('Mesoglossum'), ('Mesospinidium'),
  ('Mexicoa'), ('Mexipedium'), ('Microchilus'), ('Microepidendrum'), ('Microthelys'), ('Miltonioides'),
  ('Monophyllorchis'), ('Mormodes'), ('Mormolyca'), ('Muscarella'), ('Myoxanthus'), ('Myrmecophila'),
  ('Nageliella'), ('Nanodes'), ('Nemaconia'), ('Neolehmannia'), ('Nidema'), ('Notylia'),
  ('Ocampoa'), ('Odontoglossum'), ('Oeceoclades'), ('Oerstedella'), ('Oestlundia'), ('Oestlundorchis'),
  ('Oncidium'), ('Ornithidium'), ('Ornithocephalus'), ('Osmoglossum'), ('Otoglossum'), ('Pabstiella'),
  ('Palumbina'), ('Panarica'), ('Panmorphia'), ('Papperitzia'), ('Pelexia'), ('Phloeophila'),
  ('Phragmipedium'), ('Phymatidium'), ('Physogyne'), ('Physosiphon'), ('Piperia'), ('Platanthera'),
  ('Platantheroides'), ('Platystele'), ('Platythelys'), ('Pleurothallis'), ('Pleurothallopsis'), ('Pogonia'),
  ('Pollardia'), ('Polycycnis'), ('Polystachya'), ('Ponera'), ('Ponthieva'), ('Potosia'),
  ('Prescottia'), ('Prosthechea'), ('Pseudocranichis'), ('Pseudogoodyera'), ('Pseudostelis'), ('Psilochilus'),
  ('Psygmorchis'), ('Pteroglossa'), ('Restrepia'), ('Restrepiella'), ('Rhyncholaelia'), ('Rhynchostele'),
  ('Rossioglossum'), ('Sacoila'), ('Sarcinula'), ('Sarcoglottis'), ('Scaphosepalum'), ('Scaphyglottis'),
  ('Schiedeella'), ('Schomburgkia'), ('Sessilibulbum'), ('Sievekingia'), ('Sigmatostalix'), ('Sobralia'),
  ('Solenidium'), ('Specklinia'), ('Spiranthes'), ('Stanhopea'), ('Stelis'), ('Stellilabium'),
  ('Stenorrhynchos'), ('Stenotyla'), ('Stilifolium'), ('Svenkoeltzia'), ('Symphyglossum'), ('Tamayorkis'),
  ('Telipogon'), ('Ticoglossum'), ('Tribulago'), ('Triceratostris'), ('Trichocentrum'), ('Trichopilia'),
  ('Trichosalpinx'), ('Trigonidium'), ('Triphora'), ('Tropidia'), ('Vanilla'), ('Warczewiczella'),
  ('Wullschlaegelia'), ('Xylobium'), ('Zhukowskia'), ('Zootrophion'), ('Zosterophyllanthos'), ('Zygostates')
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
