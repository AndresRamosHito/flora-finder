import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Finalizando inicio de sesión — OrquIDea" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      try {
        const url = new URL(window.location.href);
        const next = getSafeNext(url);
        const authError =
          url.searchParams.get("error_description") ??
          url.searchParams.get("error") ??
          new URLSearchParams(url.hash.replace(/^#/, "")).get("error_description") ??
          new URLSearchParams(url.hash.replace(/^#/, "")).get("error");

        if (authError) {
          throw new Error(authError);
        }

        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
          } else {
            const { data, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (!data.session) throw new Error("No auth session was found in the callback URL.");
          }
        }

        if (cancelled) return;

        // Remove Supabase tokens/codes from the visible URL before leaving the callback page.
        window.history.replaceState({}, document.title, next);

        if (next === "/") {
          navigate({ to: "/", replace: true });
        } else {
          navigate({ to: "/onboarding", replace: true });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void completeAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center px-6 bg-background text-center">
      <div className="max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        {error ? (
          <>
            <h1 className="font-display text-xl tracking-tight text-foreground">
              {t("No pudimos iniciar sesión", "Could not sign in")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link
              to="/login"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-leaf-foreground"
            >
              {t("Volver a intentar", "Try again")}
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto animate-spin text-muted-foreground" />
            <h1 className="mt-4 font-display text-xl tracking-tight text-foreground">
              {t("Finalizando inicio de sesión", "Finishing sign-in")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Espera un momento.", "One moment.")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function getSafeNext(url: URL): "/" | "/onboarding" {
  const next = url.searchParams.get("next");
  return next === "/" ? "/" : "/onboarding";
}
