/**
 * Visual palette for orchid SVG art, keyed by scientific name. The DB stores
 * taxonomy only — colors are a presentation concern and live on the client.
 * Falls back to a neutral palette so an unseeded species still renders.
 */
export type OrchidPalette = { c1: string; c2: string; lip: string };

export const ORCHID_PALETTES: Record<string, OrchidPalette> = {
  "Laelia speciosa": { c1: "#D86BA6", c2: "#B23A77", lip: "#7E1C53" },
  "Laelia gouldiana": { c1: "#C257A0", c2: "#8E2C82", lip: "#5C1A5E" },
  "Barkeria whartoniana": { c1: "#E86B9A", c2: "#C23D70", lip: "#8A1F4E" },
  "Euchile mariae": { c1: "#E9E6C8", c2: "#BFC79A", lip: "#6F8A4E" },
  "Rhynchostele cervantesii": { c1: "#F2DCE7", c2: "#D98FB4", lip: "#9B3D6E" },
  "Encyclia adenocaula": { c1: "#EFA8C6", c2: "#D26C97", lip: "#A23C6A" },
  "Prosthechea vitellina": { c1: "#EE7A3C", c2: "#C4421E", lip: "#7A2410" },
  "Stanhopea tigrina": { c1: "#F0E2B8", c2: "#C9A24A", lip: "#7A2E1E" },
  "Cuitlauzina pendula": { c1: "#FBF1E8", c2: "#E7C8D6", lip: "#C76C95" },
  "Rhynchostele bictoniensis": { c1: "#E8DFA6", c2: "#B7A85C", lip: "#8A4A6E" },
};

const FALLBACK: OrchidPalette = { c1: "#E7D7C7", c2: "#B89A82", lip: "#6F5544" };

export function paletteFor(sciName: string | null | undefined): OrchidPalette {
  if (!sciName) return FALLBACK;
  return ORCHID_PALETTES[sciName] ?? FALLBACK;
}
