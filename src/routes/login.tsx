import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flower2, Mail, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar a OrquIDea — comunidad de orquídeas" },
      { name: "description", content: "Entra a OrquIDea con un enlace mágico o tu cuenta de Google para registrar avistamientos de orquídeas." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Already signed in? Bounce to onboarding (handle picker) or home.
  useEffect(() => {
    if (!loading && user) {
      void (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("handle")
          .eq("id", user.id)
          .maybeSingle();
        const isDefault = !data?.handle || data.handle.startsWith("spotter_");
        navigate({ to: isDefault ? "/onboarding" : "/", replace: true });
      })();
    }
  }, [loading, user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setErrMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/onboarding" },
    });
    if (error) {
      setStatus("error");
      setErrMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Al muro
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf text-leaf-foreground">
            <Flower2 size={22} />
          </span>
          <div>
            <h1 className="font-display text-2xl tracking-tight">
              Entrar a Orqu<span className="font-bold text-orchid">ID</span>ea
            </h1>
            <p className="text-xs text-muted-foreground">por OrchidArc · Orquídeas de México</p>
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl">Entra</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Continúa con Google o recibe un enlace mágico por correo.
        </p>

        <button
          type="button"
          onClick={async () => {
            const { lovable } = await import("@/integrations/lovable");
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin + "/onboarding",
            });
            if (result.error) setErrMsg(result.error.message ?? "Error con Google");
          }}
          className="mt-5 w-full rounded-xl border border-input bg-card hover:bg-accent font-semibold py-3 text-sm inline-flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.3-.4-3.5z"
            />
          </svg>
          Continuar con Google
        </button>

        <div className="mt-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> o con correo{" "}
          <span className="h-px flex-1 bg-border" />
        </div>

        {status === "sent" ? (
          <div className="mt-6 rounded-2xl border border-leaf/30 bg-leaf/5 p-5">
            <div className="flex items-center gap-2 text-leaf font-medium">
              <Mail size={16} /> Enlace enviado
            </div>
            <p className="mt-2 text-sm text-foreground/80">
              Revisa tu bandeja en <b>{email}</b> y abre el enlace para entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="sr-only">Correo electrónico</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </label>
            {errMsg && <p className="text-xs text-destructive">{errMsg}</p>}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-xl bg-leaf text-leaf-foreground font-semibold py-3 text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {status === "sending" && <Loader2 size={14} className="animate-spin" />}
              Enviar enlace mágico
            </button>
          </form>
        )}

        <p className="mt-8 text-[11px] text-muted-foreground leading-relaxed">
          Al continuar, aceptas el código de conducta: <b>solo observar, nunca recolectar</b>. Las
          ubicaciones de especies sensibles se ocultan automáticamente.
        </p>
      </div>
    </div>
  );
}
