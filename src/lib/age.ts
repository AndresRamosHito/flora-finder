import { supabase } from "@/integrations/supabase/client";

/**
 * Self-declared age band, kept in the private `profile_age` table (only the
 * owner can read it). Direct messages need every participant to be a declared
 * adult; the database enforces this, the UI only explains it.
 *
 * true = 18+, false = 12-17, null = not declared yet.
 */
export type AgeBand = boolean | null;

// The generated Supabase types don't include profile_age / set_age_band yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function fetchMyAgeBand(userId: string): Promise<AgeBand> {
  const { data, error } = await db
    .from("profile_age")
    .select("is_adult")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data.is_adult as boolean) : null;
}

export async function setAgeBand(isAdult: boolean): Promise<void> {
  const { error } = await db.rpc("set_age_band", { p_is_adult: isAdult });
  if (error) throw new Error(error.message);
}

/** Turn database refusals about direct messages into readable text. */
export function dmErrorText(message: string, t: (es: string, en: string) => string): string {
  if (message.includes("dm adults only: self"))
    return t(
      "Los mensajes directos son solo para personas de 18 años o más. Confirma tu edad en Mensajes.",
      "Direct messages are only for people aged 18 or over. Confirm your age in Messages.",
    );
  if (message.includes("dm adults only: recipient"))
    return t(
      "Esta persona no puede recibir mensajes directos. Puedes comentar en sus observaciones o hablar en una sociedad.",
      "This person can't receive direct messages. You can comment on their observations or talk in a society.",
    );
  if (message.toLowerCase().includes("row-level security"))
    return t(
      "No se pueden enviar mensajes en esta conversación: los mensajes directos son solo entre personas de 18 años o más.",
      "Messages can't be sent in this conversation: direct messages are only between people aged 18 or over.",
    );
  return message;
}
