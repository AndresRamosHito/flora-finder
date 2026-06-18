import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flower2, Mail, Loader2, ArrowLeft, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLang, LanguageToggle } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar a OrquIDea — comunidad de orquídeas" },
      {
        name: "description",
        content:
          "Entra a OrquIDea con correo y contraseña, Google o un enlace de recuperación.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: LoginPage,
});

type AuthMode = "signin" | "signup" | "reset";
type Status = "idle" | "loading" | "sent" | "error";
type SentKind = "confirm" | "reset" | "magic";

function authRedirectUrl() {
  return `${window.location.origin}/auth/callback?next=/onboarding`;
}

async function nextRouteForUser(userId: string): Promise<"/" | "/onboarding"> {
  const { data } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", userId)
    .maybeSingle();
  const isDefault = !data?.handle || data.handle.startsWith("spotter_");
  return isDefault ? "/onboarding" : "/";
}

function LoginPage() {
  const { t } = useLang();
  const [mode, setMode] = useState<AuthMode>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reset") === "1"
      ? "reset"
      : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sentKind, setSentKind] = useState<SentKind>("confirm");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === "reset") return;
    if (!loading && user) {
      void (async () => {
        const next = await nextRouteForUser(user.id);
        navigate({ to: next, replace: true });
      })();
    }
  }, [loading, user, navigate, mode]);

  useEffect(() => {
    if (mode !== "reset") return;
    let cancelled = false;

    async function prepareResetSession() {
      setStatus("loading");
      setErrMsg(null);
      try {
        const url = new URL(window.location.href);
        const authError =
          url.searchParams.get("error_description") ??
          url.searchParams.get("error") ??
          new URLSearchParams(url.hash.replace(/^#/, "")).get("error_description") ??
          new URLSearchParams(url.hash.replace(/^#/, "")).get("error");
        if (authError) throw new Error(authError);

        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, document.title, "/login?reset=1");
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          throw new Error(
            t(
              "El enlace expiró. Solicita otro enlace para crear contraseña.",
              "The link expired. Request another link to create a password.",
            ),
          );
        }
        if (!cancelled) setStatus("idle");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrMsg(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void prepareResetSession();

    return () => {
      cancelled = true;
    };
  }, [mode, t]);

  async function routeAfterAuth(userId: string) {
    const next = await nextRouteForUser(userId);
    navigate({ to: next, replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode !== "reset" && (!email || !password)) return;
    if (mode === "reset" && !password) return;
    setStatus("loading");
    setErrMsg(null);

    if (mode === "reset") {
      if (password.length < 8) {
        setStatus("error");
        setErrMsg(t("Usa al menos 8 caracteres.", "Use at least 8 characters."));
        return;
      }
      if (password !== confirmPassword) {
        setStatus("error");
        setErrMsg(t("Las contraseñas no coinciden.", "Passwords do not match."));
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setStatus("error");
        setErrMsg(error.message);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await routeAfterAuth(data.user.id);
        return;
      }
      navigate({ to: "/", replace: true });
      return;
    }

    if (mode === "signup") {
      if (password.length < 8) {
        setStatus("error");
        setErrMsg(t("Usa al menos 8 caracteres.", "Use at least 8 characters."));
        return;
      }
      if (password !== confirmPassword) {
        setStatus("error");
        setErrMsg(t("Las contraseñas no coinciden.", "Passwords do not match."));
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (error) {
        setStatus("error");
        setErrMsg(error.message);
        return;
      }
      if (data.user && data.session) {
        await routeAfterAuth(data.user.id);
        return;
      }
      setSentKind("confirm");
      setStatus("sent");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setErrMsg(error.message);
      return;
    }
    if (data.user) {
      await routeAfterAuth(data.user.id);
    }
  }

  async function sendPasswordReset() {
    if (!email) {
      setErrMsg(t("Escribe tu correo primero.", "Enter your email first."));
      return;
    }
    setStatus("loading");
    setErrMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?reset=1`,
    });
    if (error) {
      setStatus("error");
      setErrMsg(error.message);
      return;
    }
    setSentKind("reset");
    setStatus("sent");
  }

  async function sendMagicLink() {
    if (!email) {
      setErrMsg(t("Escribe tu correo primero.", "Enter your email first."));
      return;
    }
    setStatus("loading");
    setErrMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error) {
      setStatus("error");
      setErrMsg(error.message);
      return;
    }
    setSentKind("magic");
    setStatus("sent");
  }

  const isReset = mode === "reset";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> {t("Al muro", "To the feed")}
          </Link>
          <LanguageToggle />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf text-leaf-foreground">
            <Flower2 size={22} />
          </span>
          <div>
            <h1 className="font-display text-2xl tracking-tight">
              {t("Entrar a", "Sign in to")} Orqu<span className="font-bold text-orchid">ID</span>ea
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("por Orchidarc · Orquídeas de México", "by Orchidarc · Orchids of Mexico")}
            </p>
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl">
          {isReset
            ? t("Crear contraseña", "Create password")
            : mode === "signin"
              ? t("Entrar", "Sign in")
              : t("Crear cuenta", "Create account")}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          {isReset
            ? t(
                "Crea una contraseña para este mismo correo, perfil y @handle.",
                "Create a password for this same email, profile, and @handle.",
              )
            : mode === "signin"
              ? t(
                  "Usa tu correo y contraseña para volver a tu mismo perfil y @handle.",
                  "Use your email and password to return to the same profile and @handle.",
                )
              : t(
                  "Crea una cuenta con contraseña. Después elegirás un único @handle.",
                  "Create an account with a password. Then you will choose one @handle.",
                )}
        </p>

        {!isReset && (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setStatus("idle");
                setErrMsg(null);
              }}
              className={
                "rounded-xl px-3 py-2 transition " +
                (mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
              }
            >
              {t("Entrar", "Sign in")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setStatus("idle");
                setErrMsg(null);
              }}
              className={
                "rounded-xl px-3 py-2 transition " +
                (mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
              }
            >
              {t("Crear cuenta", "Create account")}
            </button>
          </div>
        )}

        {!isReset && (
          <button
            type="button"
            onClick={async () => {
              setErrMsg(null);
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: authRedirectUrl(),
                },
              });
              if (error) {
                setErrMsg(error.message ?? t("Error con Google", "Google sign-in error"));
              }
            }}
            className="mt-5 w-full rounded-xl border border-input bg-card hover:bg-accent font-semibold py-3 text-sm inline-flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.3-.4-3.5z" />
            </svg>
            {t("Continuar con Google", "Continue with Google")}
          </button>
        )}

        {!isReset && (
          <div className="mt-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> {t("o con correo", "or with email")} {" "}
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

        {status === "sent" ? (
          <div className="mt-6 rounded-2xl border border-leaf/30 bg-leaf/5 p-5">
            <div className="flex items-center gap-2 text-leaf font-medium">
              <Mail size={16} />
              {sentKind === "reset"
                ? t("Enlace para contraseña enviado", "Password link sent")
                : sentKind === "magic"
                  ? t("Enlace enviado", "Link sent")
                  : t("Confirma tu correo", "Confirm your email")}
            </div>
            <p className="mt-2 text-sm text-foreground/80">
              {sentKind === "reset"
                ? t(
                    "Revisa tu correo y abre el enlace para crear una contraseña en tu misma cuenta.",
                    "Check your email and open the link to create a password on the same account.",
                  )
                : sentKind === "magic"
                  ? t(
                      "Revisa tu bandeja y abre el enlace para entrar.",
                      "Check your inbox and open the link to sign in.",
                    )
                  : t(
                      "Revisa tu correo para confirmar la cuenta. Después elegirás tu @handle una sola vez.",
                      "Check your email to confirm the account. Then you will choose your @handle only once.",
                    )}
            </p>
            <p className="mt-2 text-xs text-muted-foreground break-all">{email}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {!isReset && (
              <label className="block">
                <span className="sr-only">{t("Correo electrónico", "Email address")}</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t("tucorreo@ejemplo.com", "you@example.com")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                />
              </label>
            )}
            <label className="block">
              <span className="sr-only">{t("Contraseña", "Password")}</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={isReset ? t("Nueva contraseña", "New password") : t("Contraseña", "Password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </label>
            {(mode === "signup" || isReset) && (
              <label className="block">
                <span className="sr-only">{t("Confirmar contraseña", "Confirm password")}</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder={t("Confirmar contraseña", "Confirm password")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
                />
              </label>
            )}
            {errMsg && <p className="text-xs text-destructive">{errMsg}</p>}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-xl bg-leaf text-leaf-foreground font-semibold py-3 text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {status === "loading" ? <Loader2 size={14} className="animate-spin" /> : <LockKeyhole size={14} />}
              {isReset
                ? t("Guardar contraseña", "Save password")
                : mode === "signin"
                  ? t("Entrar con contraseña", "Sign in with password")
                  : t("Crear cuenta", "Create account")}
            </button>
          </form>
        )}

        {!isReset && (
          <div className="mt-4 flex flex-col gap-2 text-center text-xs">
            <button type="button" onClick={sendPasswordReset} className="text-leaf font-semibold">
              {t("Olvidé mi contraseña / crear contraseña", "Forgot or need to create a password")}
            </button>
            <button type="button" onClick={sendMagicLink} className="text-muted-foreground hover:text-foreground">
              {t("Usar enlace mágico como respaldo", "Use a magic link as backup")}
            </button>
          </div>
        )}

        <p className="mt-8 text-[11px] text-muted-foreground leading-relaxed">
          {t("Al continuar, aceptas el código de conducta: ", "By continuing, you accept the code of conduct: ")}
          <b>{t("solo observar, nunca recolectar", "observe only, never collect")}</b>
          {t(
            ". Las ubicaciones de especies sensibles se ocultan automáticamente.",
            ". Locations of sensitive species are hidden automatically.",
          )}
        </p>
      </div>
    </div>
  );
}
