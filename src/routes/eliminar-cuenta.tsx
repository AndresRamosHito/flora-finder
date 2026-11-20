import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Loader2, Mail, Trash2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";

const SUPPORT_EMAIL = "andresr@orchidarc.org";
const CONFIRM_WORD = "ELIMINAR";

export const Route = createFileRoute("/eliminar-cuenta")({
  head: () => ({
    meta: [
      { title: "Eliminar cuenta · OrquIDea" },
      {
        name: "description",
        content:
          "Cómo eliminar tu cuenta de OrquIDea y los datos asociados. How to delete your OrquIDea account and associated data.",
      },
    ],
    links: [{ rel: "canonical", href: "https://orquidea.orchidarc.org/eliminar-cuenta" }],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const { t } = useLang();
  const { user, loading } = useAuth();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function deleteAccount() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.functions.invoke("delete-account", {
      body: { confirm: CONFIRM_WORD },
    });
    if (error) {
      setBusy(false);
      setErr(
        t(
          `No pudimos eliminar la cuenta. Inténtalo de nuevo o escribe a ${SUPPORT_EMAIL}.`,
          `We couldn't delete the account. Try again or email ${SUPPORT_EMAIL}.`,
        ),
      );
      return;
    }
    await supabase.auth.signOut();
    setBusy(false);
    setTyped("");
    setDone(true);
  }

  return (
    <Shell active="feed">
      <article className="px-5 py-6 space-y-6 text-sm leading-6 text-foreground">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">OrquIDea</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("Eliminar tu cuenta", "Delete your account")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "OrquIDea es operada por Orchidarc. Puedes eliminar tu cuenta y tus datos en cualquier momento.",
              "OrquIDea is run by Orchidarc. You can delete your account and data at any time.",
            )}
          </p>
        </header>

        {done && (
          <p role="status" className="rounded-xl border border-leaf/40 bg-leaf/10 p-4 font-medium">
            {t(
              "Tu cuenta y tus datos se eliminaron. Gracias por haber contribuido a OrquIDea.",
              "Your account and data have been deleted. Thank you for contributing to OrquIDea.",
            )}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("Qué se elimina", "What is deleted")}</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              {t(
                "Tu perfil, @handle, foto de perfil y correo de acceso.",
                "Your profile, @handle, profile photo and sign-in email.",
              )}
            </li>
            <li>
              {t(
                "Todas tus observaciones, con sus fotos y ubicaciones.",
                "All your observations, with their photos and locations.",
              )}
            </li>
            <li>
              {t(
                "Tus comentarios, “me gusta”, verificaciones e insignias.",
                "Your comments, likes, verifications and badges.",
              )}
            </li>
            <li>
              {t(
                "Tus mensajes directos y mensajes en sociedades, y tus membresías.",
                "Your direct messages, society messages and memberships.",
              )}
            </li>
          </ul>
          <h2 className="text-lg font-semibold pt-2">{t("Qué se conserva", "What is kept")}</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              {t(
                "Los reportes de comercio ilegal que hayas enviado se conservan sin ningún dato que te identifique, porque documentan posibles delitos contra especies protegidas.",
                "Illegal-trade reports you submitted are kept with nothing that identifies you, because they document possible offences against protected species.",
              )}
            </li>
            <li>
              {t(
                "Las copias de seguridad técnicas de nuestro proveedor se sobrescriben en su ciclo normal y no se usan para restaurar cuentas eliminadas.",
                "Our provider's technical backups are overwritten on their normal cycle and are not used to restore deleted accounts.",
              )}
            </li>
          </ul>
          <p className="text-muted-foreground">
            {t(
              "La eliminación es inmediata y no se puede deshacer.",
              "Deletion is immediate and cannot be undone.",
            )}
          </p>
        </section>

        {!loading && user && !done && (
          <section className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-destructive">
              <AlertTriangle size={18} aria-hidden />{" "}
              {t("Eliminar mi cuenta ahora", "Delete my account now")}
            </h2>
            <p>
              {t(
                `Sesión iniciada como ${user.email ?? ""}. Para confirmar, escribe ${CONFIRM_WORD}.`,
                `Signed in as ${user.email ?? ""}. To confirm, type ${CONFIRM_WORD}.`,
              )}
            </p>
            <label className="block">
              <span className="sr-only">{t("Confirmación", "Confirmation")}</span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value.toUpperCase())}
                autoComplete="off"
                placeholder={CONFIRM_WORD}
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:border-destructive focus:ring-2 focus:ring-destructive/20 outline-none"
              />
            </label>
            {err && (
              <p role="alert" className="text-destructive">
                {err}
              </p>
            )}
            <button
              type="button"
              onClick={deleteAccount}
              disabled={busy || typed !== CONFIRM_WORD}
              className="w-full rounded-xl bg-destructive text-destructive-foreground font-semibold py-3 text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Trash2 size={14} aria-hidden />
              )}
              {t("Eliminar cuenta y datos", "Delete account and data")}
            </button>
          </section>
        )}

        {!loading && !user && !done && (
          <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">{t("Cómo solicitarlo", "How to request it")}</h2>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                <Link to="/login" className="font-semibold text-leaf underline">
                  {t("Inicia sesión", "Sign in")}
                </Link>{" "}
                {t(
                  "y vuelve a esta página, o abre Mi cuenta → Eliminar mi cuenta en la app.",
                  "and come back to this page, or open My account → Delete my account in the app.",
                )}
              </li>
              <li>
                {t(
                  "Si no puedes iniciar sesión, escríbenos desde el correo de tu cuenta y la eliminaremos en un máximo de 30 días:",
                  "If you can't sign in, email us from your account's address and we'll delete it within 30 days:",
                )}{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Eliminar cuenta OrquIDea / Delete OrquIDea account")}`}
                  className="inline-flex items-center gap-1 font-semibold text-leaf underline"
                >
                  <Mail size={13} aria-hidden /> {SUPPORT_EMAIL}
                </a>
              </li>
            </ol>
          </section>
        )}

        <footer className="border-t border-border pt-4 text-muted-foreground">
          <Link to="/privacy" className="font-medium text-leaf underline">
            {t("Aviso de privacidad", "Privacy Notice")}
          </Link>
        </footer>
      </article>
    </Shell>
  );
}
