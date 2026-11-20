import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { setAgeBand, type AgeBand } from "@/lib/age";
import { useLang } from "@/lib/i18n";

/**
 * Explains the adults-only rule for direct messages and, if the user hasn't
 * declared an age band yet, lets them do it.
 */
export function AgeBandCard({ band, onChange }: { band: AgeBand; onChange: (b: AgeBand) => void }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function choose(isAdult: boolean) {
    setBusy(true);
    setErr(null);
    try {
      await setAgeBand(isAdult);
      onChange(isAdult);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (band === true) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-sm space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <ShieldCheck size={16} className="text-leaf" aria-hidden />
        {t("Mensajes directos: solo 18+", "Direct messages: 18+ only")}
      </h2>
      {band === false ? (
        <p className="text-muted-foreground">
          {t(
            "Para cuidar a las personas menores de edad, los mensajes directos no están disponibles para ti. Puedes seguir comentando observaciones y participar en los chats de tus sociedades.",
            "To keep younger members safe, direct messages aren't available to you. You can still comment on observations and take part in your societies' chats.",
          )}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground">
            {t(
              "Los mensajes directos son solo entre personas de 18 años o más. ¿Qué edad tienes?",
              "Direct messages are only between people aged 18 or over. How old are you?",
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => choose(true)}
              className="rounded-xl bg-leaf text-leaf-foreground font-semibold py-2.5 disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              {busy && <Loader2 size={13} className="animate-spin" aria-hidden />}
              {t("18 o más", "18 or older")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => choose(false)}
              className="rounded-xl border border-input bg-background font-semibold py-2.5 disabled:opacity-60"
            >
              {t("12 a 17", "12 to 17")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "Tu respuesta es privada: nadie más puede verla. Si eliges 12 a 17 y luego cumples 18, escríbenos para cambiarla.",
              "Your answer is private: nobody else can see it. If you choose 12 to 17 and later turn 18, contact us to change it.",
            )}
          </p>
          {err && (
            <p role="alert" className="text-xs text-destructive">
              {err}
            </p>
          )}
        </>
      )}
    </section>
  );
}
