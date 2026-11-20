import { supabase } from "@/integrations/supabase/client";

/**
 * Age and Terms confirmation.
 *
 * The user ticks the box on the login screen before creating an account or
 * continuing with Google. Because Google sign-in leaves the page, the tick is
 * kept in localStorage until we know the user id, then written once to
 * profiles.age_terms_confirmed_at.
 */
const KEY = "orquidea.ageTermsConfirmedAt";

export const MIN_AGE = 12;

export function markConsent() {
  try {
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    /* storage blocked: the profile write below simply won't happen */
  }
}

export function clearConsent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export async function recordConsentIfPending(userId: string) {
  let at: string | null = null;
  try {
    at = localStorage.getItem(KEY);
  } catch {
    return;
  }
  if (!at) return;
  const { error } = await supabase
    .from("profiles")
    .update({ age_terms_confirmed_at: at })
    .eq("id", userId)
    .is("age_terms_confirmed_at", null);
  if (!error) clearConsent();
}
