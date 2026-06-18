export type HabitatType =
  | "cloud_forest"
  | "pine_oak_forest"
  | "oak_forest"
  | "tropical_dry_forest"
  | "tropical_evergreen_forest"
  | "conifer_forest"
  | "xeric_scrub"
  | "chaparral"
  | "savanna"
  | "grassland"
  | "riparian_forest"
  | "mangrove"
  | "disturbed_secondary"
  | "cultivated_collection"
  | "other";

export const HABITAT_OPTIONS: {
  value: HabitatType;
  es: string;
  en: string;
  hintEs: string;
  hintEn: string;
}[] = [
  {
    value: "cloud_forest",
    es: "Bosque mesófilo de montaña",
    en: "Cloud / montane mesophilous forest",
    hintEs: "Bosque húmedo de montaña, neblina, epífitas abundantes.",
    hintEn: "Humid mountain forest, mist, abundant epiphytes.",
  },
  {
    value: "pine_oak_forest",
    es: "Bosque de pino-encino",
    en: "Pine-oak forest",
    hintEs: "Pinos y encinos mezclados; muy común en zonas montanas.",
    hintEn: "Mixed pines and oaks; common in montane zones.",
  },
  {
    value: "oak_forest",
    es: "Encinar / bosque de encino",
    en: "Oak forest",
    hintEs: "Encinos dominantes, caducifolios o perennifolios.",
    hintEn: "Oak-dominated forest, deciduous or evergreen.",
  },
  {
    value: "tropical_dry_forest",
    es: "Selva baja caducifolia",
    en: "Tropical dry deciduous forest",
    hintEs: "Bosque tropical seco, muchos árboles pierden hojas en sequía.",
    hintEn: "Dry tropical forest; many trees lose leaves in the dry season.",
  },
  {
    value: "tropical_evergreen_forest",
    es: "Selva alta/mediana perennifolia o subperennifolia",
    en: "Tropical evergreen or semi-evergreen forest",
    hintEs: "Selva húmeda cálida, dosel alto o medio.",
    hintEn: "Warm humid forest with medium or tall canopy.",
  },
  {
    value: "conifer_forest",
    es: "Bosque de coníferas",
    en: "Conifer forest",
    hintEs: "Pino, oyamel, abeto o ciprés dominantes.",
    hintEn: "Pine, fir, oyamel, or cypress dominated forest.",
  },
  {
    value: "xeric_scrub",
    es: "Matorral xerófilo",
    en: "Xeric scrub",
    hintEs: "Vegetación seca con cactáceas, agaves, arbustos espinosos.",
    hintEn: "Dry vegetation with cacti, agaves, thorny shrubs.",
  },
  {
    value: "chaparral",
    es: "Chaparral",
    en: "Chaparral",
    hintEs: "Matorral denso de clima mediterráneo o montano seco.",
    hintEn: "Dense shrubland in Mediterranean or dry montane climate.",
  },
  {
    value: "savanna",
    es: "Sabana",
    en: "Savanna",
    hintEs: "Pastizal tropical con árboles dispersos.",
    hintEn: "Tropical grassland with scattered trees.",
  },
  {
    value: "grassland",
    es: "Pastizal",
    en: "Grassland",
    hintEs: "Vegetación abierta dominada por gramíneas y herbáceas.",
    hintEn: "Open vegetation dominated by grasses and herbs.",
  },
  {
    value: "riparian_forest",
    es: "Bosque de galería / vegetación ribereña",
    en: "Riparian or gallery forest",
    hintEs: "Vegetación asociada a río, arroyo, barranca húmeda.",
    hintEn: "Vegetation along river, stream, or humid ravine.",
  },
  {
    value: "mangrove",
    es: "Manglar",
    en: "Mangrove",
    hintEs: "Vegetación costera salobre o inundable.",
    hintEn: "Coastal brackish or flood-prone vegetation.",
  },
  {
    value: "disturbed_secondary",
    es: "Vegetación secundaria / borde de camino",
    en: "Secondary or disturbed vegetation",
    hintEs: "Acahual, cafetal, potrero, borde de camino, zona intervenida.",
    hintEn: "Regrowth, coffee shade, pasture edge, roadside, disturbed site.",
  },
  {
    value: "cultivated_collection",
    es: "Cultivo, jardín o colección",
    en: "Cultivated, garden, or collection",
    hintEs: "Planta cultivada, colección privada, vivero o jardín.",
    hintEn: "Cultivated plant, private collection, nursery, or garden.",
  },
  {
    value: "other",
    es: "Otro / no estoy seguro",
    en: "Other / not sure",
    hintEs: "Usa la descripción libre para precisar.",
    hintEn: "Use the free-text description to clarify.",
  },
];

export function habitatLabel(value: string | null | undefined, lang: string) {
  const option = HABITAT_OPTIONS.find((h) => h.value === value);
  if (!option) return null;
  return lang === "en" ? option.en : option.es;
}
