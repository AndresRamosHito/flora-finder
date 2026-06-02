import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flower2, Mail, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — OrquIDea" },
      { name: "description", content: "Recibe un enlace mágico para entrar a OrquIDea." },
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
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Al muro
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf text-leaf-foreground">
            <Flower2 size={22} />
          </span>
          <div>
            <h1 className="font-display text-2xl tracking-tight">
              Orqu<span className="font-bold text-orchid">ID</span>ea
            </h1>
            <p className="text-xs text-muted-foreground">por OrchidArc · Sierra de Oaxaca</p>
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl">Entra con tu correo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Te enviamos un enlace mágico — sin contraseñas.
        </p>

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
            {errMsg && (
              <p className="text-xs text-destructive">{errMsg}</p>
            )}
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
