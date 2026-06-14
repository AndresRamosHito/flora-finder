import { supabase } from "@/integrations/supabase/client";

/**
 * The `taxa` catalog gained an `is_native` column via migration. In any
 * environment where that migration hasn't been applied yet, selecting the
 * column would error the whole query and blank the herbarium / species picker.
 *
 * These helpers select `is_native` when present and fall back to the same query
 * without it — defaulting every row to `is_native: true` (the pre-feature
 * behaviour) so the UI keeps working. Once the migration is applied, the first
 * query succeeds and the real flags take over; the fallback never runs.
 */

type WithNative<T> = T & { is_native: boolean };

/** Select the full catalog (ordered by sci_name), tolerating a missing `is_native` column. */
export async function selectTaxaCatalog<T extends Record<string, unknown>>(
  baseColumns: string,
): Promise<WithNative<T>[]> {
  const withNative = await supabase
    .from("taxa")
    .select(`${baseColumns}, is_native`)
    .order("sci_name")
    .limit(5000);
  if (!withNative.error) return (withNative.data ?? []) as unknown as WithNative<T>[];

  const fallback = await supabase.from("taxa").select(baseColumns).order("sci_name").limit(5000);
  if (fallback.error) throw fallback.error;
  return ((fallback.data ?? []) as unknown as T[]).map((row) => ({ ...row, is_native: true }));
}

/** Fetch one taxon by id, tolerating a missing `is_native` column. */
export async function selectTaxonById<T extends Record<string, unknown>>(
  id: string,
  baseColumns: string,
): Promise<WithNative<T> | null> {
  const withNative = await supabase
    .from("taxa")
    .select(`${baseColumns}, is_native`)
    .eq("id", id)
    .maybeSingle();
  if (!withNative.error) return (withNative.data ?? null) as unknown as WithNative<T> | null;

  const fallback = await supabase.from("taxa").select(baseColumns).eq("id", id).maybeSingle();
  if (fallback.error) throw fallback.error;
  return fallback.data ? { ...(fallback.data as unknown as T), is_native: true } : null;
}
