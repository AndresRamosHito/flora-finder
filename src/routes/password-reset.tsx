import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/password-reset")({
  component: PasswordResetPage,
});

function PasswordResetPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, document.title, "/password-reset");
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error(t("Enlace inválido o expirado.", "Invalid or expired link."));
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (p1.length < 8) return setErr(t("Usa al menos 8 caracteres.", "Use at least 8 characters."));
    if (p1 !== p2) return setErr(t("Las contraseñas no coinciden.", "Passwords do not match."));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) return setErr(error.message);
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen grid place-items-center px-6 bg-background">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 space-y-3">
        <h1 className="font-display text-2xl">{t("Crear contraseña", "Create password")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Quedará ligada a tu mismo perfil y @handle.", "It stays linked to your same profile and @handle.")}
        </p>
        {!ready && !err && <Loader2 className="animate-spin text-muted-foreground" />}
        {ready && (
          <>
            <input type="password" minLength={8} required autoComplete="new-password" placeholder={t("Nueva contraseña", "New password")} value={p1} onChange={(e) => setP1(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" />
            <input type="password" minLength={8} required autoComplete="new-password" placeholder={t("Confirmar contraseña", "Confirm password")} value={p2} onChange={(e) => setP2(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" />
            <button disabled={busy} className="w-full rounded-xl bg-leaf text-leaf-foreground font-semibold py-3 text-sm disabled:opacity-60">
              {busy ? t("Guardando…", "Saving…") : t("Guardar contraseña", "Save password")}
            </button>
          </>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}
        {err && !ready && <button type="button" onClick={() => navigate({ to: "/login" })} className="w-full rounded-xl bg-leaf text-leaf-foreground font-semibold py-3 text-sm">{t("Volver", "Back")}</button>}
      </form>
    </div>
  );
}
