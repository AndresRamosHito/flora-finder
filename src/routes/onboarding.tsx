import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flower2, Loader2, AtSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Elige tu @handle — OrquIDea" },
      { name: "description", content: "Configura tu handle de OrquIDea para empezar a publicar avistamientos de orquídeas en la comunidad." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Not signed in? Go to login.
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("claim_handle", { p_handle: handle });
    setBusy(false);
    if (error) {
      setErr(translateClaimError(error.message));
      return;
    }
    navigate({ to: "/", replace: true });
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf text-leaf-foreground">
            <Flower2 size={22} />
          </span>
          <div>
            <h1 className="font-display text-2xl tracking-tight">Elige tu @handle</h1>
            <p className="text-xs text-muted-foreground">Así te verá la comunidad.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <label className="block">
            <span className="sr-only">@handle</span>
            <div className="relative">
              <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                required
                minLength={3}
                maxLength={20}
                pattern="[a-z0-9_]{3,20}"
                placeholder="mariana_v"
                className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-3 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </div>
          </label>
          <p className="text-[11px] text-muted-foreground">
            3-20 caracteres: minúsculas, números o guion bajo.
          </p>
          {err && <p className="text-xs text-destructive">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-leaf text-leaf-foreground font-semibold py-3 text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Reclamar handle
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2"
          >
            Más tarde
          </button>
        </form>
      </div>
    </div>
  );
}

function translateClaimError(msg: string): string {
  if (msg.includes("handle taken")) return "Ese handle ya está en uso.";
  if (msg.includes("handle reserved")) return "Ese handle está reservado.";
  if (msg.includes("invalid handle")) return "Usa 3-20 caracteres en minúsculas, números o _.";
  if (msg.includes("too many handle changes")) return "Demasiados cambios hoy. Intenta mañana.";
  return msg;
}
