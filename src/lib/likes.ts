import { supabase } from "@/integrations/supabase/client";

/**
 * Community photo likes. The `sighting_likes` table and its RPCs ship in a
 * migration; until that's applied in a given environment, these helpers degrade
 * gracefully (empty results / no-ops) so the UI never breaks — same resilience
 * philosophy as `taxa.ts`.
 */

export type SpeciesObservation = {
  id: string;
  user_id: string;
  taxon_id: string;
  sci_name: string | null;
  common_name: string | null;
  is_masked: boolean | null;
  status: string | null;
  location_label: string | null;
  observed_at: string | null;
  created_at: string;
  photo_url: string | null;
  variety: string | null;
  origin: string | null;
  like_count: number;
};

type LikeRow = {
  sighting_id: string;
  user_id?: string;
};

/** Observations of one species, ranked by community likes (masking applied server-side). */
export async function fetchSpeciesObservations(taxonId: string): Promise<SpeciesObservation[]> {
  const { data, error } = await supabase.rpc("species_observations", { p_taxon_id: taxonId });
  if (error) return [];
  return (data ?? []) as SpeciesObservation[];
}

/** Best (most-liked) photo per species, for herbarium thumbnails. Map keyed by taxon_id. */
export async function fetchTopPhotos(): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc("species_top_photos");
  if (error) return new Map();
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.taxon_id && row.photo_url) map.set(row.taxon_id, row.photo_url);
  }
  return map;
}

/** Which of these sightings the current user has already liked. */
export async function fetchMyLikes(sightingIds: string[], userId: string): Promise<Set<string>> {
  if (sightingIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("sighting_likes" as never)
    .select("sighting_id")
    .eq("user_id", userId)
    .in("sighting_id", sightingIds);
  if (error) return new Set();
  return new Set(((data ?? []) as LikeRow[]).map((r) => r.sighting_id));
}

/** Number of likes on one sighting. */
export async function fetchLikeCount(sightingId: string): Promise<number> {
  const { count, error } = await supabase
    .from("sighting_likes" as never)
    .select("*", { count: "exact", head: true })
    .eq("sighting_id", sightingId);
  if (error) return 0;
  return count ?? 0;
}

/** Whether the current user has liked one sighting. */
export async function fetchHasLiked(sightingId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("sighting_likes" as never)
    .select("sighting_id")
    .eq("sighting_id", sightingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/** Add or remove the current user's like on a sighting. */
export async function toggleLike(
  sightingId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  if (liked) {
    const { error } = await supabase
      .from("sighting_likes" as never)
      .delete()
      .eq("sighting_id", sightingId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("sighting_likes" as never)
      .insert({ sighting_id: sightingId, user_id: userId } as never);
    if (error) throw error;
  }
}
