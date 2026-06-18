import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flower2, Loader2, AtSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLang, LanguageToggle, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Elige tu @handle — OrquIDea" },
      {
        name: "description",
        content:
          "Configura tu handle de OrquIDea para empezar a publicar avistamientos de orquídeas en la comunidad.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: OnboardingPage,
});

function OnboardingPage() {
  const { t, lang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const hasClaimedHandle = !!data?.handle && !data.handle.startsWith("spotter_");
      if (hasClaimedHandle) {
        navigate({ to: "/", replace: true });
        return;
      }
      setCheckingProfile(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("claim_handle", { p_handle: handle });
    setBusy(false);
    if (error) {
      setErr(translateClaimError(error.message, lang));
      return;
    }
    navigate({ to: "/", replace: true });
  }

  if (loading || !user || checkingProfile) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex justify-end">
          <LanguageToggle />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf text-leaf-foreground">
            <Flower2 size={22} />
          </span>
          <div>
            <h1 className="font-display text-2xl tracking-tight">
              {t("Elige tu @handle", "Choose your @handle")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("Así te verá la comunidad.", "This is how the community will see you.")}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <label className="block">
            <span className="sr-only">@handle</span>
            <div className="relative">
              <AtSign
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
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
            {t(
              "3-20 caracteres: minúsculas, números o guion bajo.",
              "3-20 characters: lowercase letters, numbers or underscore.",
            )}
          </p>
          {err && <p className="text-xs text-destructive">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-leaf text-leaf-foreground font-semibold py-3 text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {t("Reclamar handle", "Claim handle")}
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2"
          >
            {t("Más tarde", "Later")}
          </button>
        </form>
      </div>
    </div>
  );
}

function translateClaimError(msg: string, lang: Lang): string {
  const en = lang === "en";
  if (msg.includes("handle taken"))
    return en ? "That handle is already taken." : "Ese handle ya está en uso.";
  if (msg.includes("handle reserved"))
    return en ? "That handle is reserved." : "Ese handle está reservado.";
  if (msg.includes("invalid handle"))
    return en
      ? "Use 3-20 lowercase letters, numbers or _."
      : "Usa 3-20 caracteres en minúsculas, números o _.";
  if (msg.includes("too many handle changes"))
    return en
      ? "Too many changes today. Try again tomorrow."
      : "Demasiados cambios hoy. Intenta mañana.";
  return msg;
}
