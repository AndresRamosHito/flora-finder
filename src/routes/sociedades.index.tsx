import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, ArrowRight, Check, Loader2, Plus, AlertCircle } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/sociedades/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sociedades orquideológicas · OrquIDea" },
      {
        name: "description",
        content:
          "Directorio de sociedades orquideológicas activas en México. Únete a chapters locales o registra tu sociedad.",
      },
      { property: "og:title", content: "Sociedades orquideológicas · OrquIDea" },
      { property: "og:description", content: "Sociedades de orquideólogos de México." },
      { property: "og:url", content: "https://orchid-map-oaxaca.lovable.app/sociedades" },
    ],
    links: [{ rel: "canonical", href: "https://orchid-map-oaxaca.lovable.app/sociedades" }],
  }),

  component: SocietiesPage,
});

type SocietyRow = {
  id: string;
  name: string;
  full_name: string | null;
  color: string | null;
  is_official: boolean;
  facebook_url: string | null;
  joined: boolean;
};

function slugifySocietyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function SocietiesPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["societies", user?.id ?? "anon"],
    queryFn: async () => {
      const [socs, mems] = await Promise.all([
        supabase
          .from("societies")
          .select("id, name, full_name, color, is_official, facebook_url")
          .order("is_official", { ascending: false })
          .order("name"),
        user
          ? supabase.from("society_members").select("society_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { society_id: string }[], error: null }),
      ]);
      if (socs.error) throw socs.error;
      if (mems.error) throw mems.error;
      const joinedIds = new Set((mems.data ?? []).map((m) => m.society_id));
      return ((socs.data ?? []) as Omit<SocietyRow, "joined">[]).map((s) => ({
        ...s,
        joined: joinedIds.has(s.id),
      }));
    },
  });

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [shortName, setShortName] = useState("");
  const [fullName, setFullName] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [creating, setCreating] = useState(false);

  async function toggle(id: string, joined: boolean) {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setPendingId(id);
    setError(null);
    try {
      if (joined) {
        const { error } = await supabase
          .from("society_members")
          .delete()
          .eq("society_id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("society_members")
          .upsert({ society_id: id, user_id: user.id }, { onConflict: "society_id,user_id" });
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["societies", user.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingId(null);
    }
  }

  async function registerSociety(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    const name = shortName.trim();
    if (!name) return;

    const id = slugifySocietyName(name);
    if (!id) {
      setError(t("Usa un nombre con letras o números.", "Use a name with letters or numbers."));
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const { error: societyError } = await (supabase as any).from("societies").insert({
        id,
        name,
        full_name: fullName.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        color: null,
        is_official: false,
      });
      if (societyError) throw societyError;

      const { error: memberError } = await supabase
        .from("society_members")
        .upsert({ society_id: id, user_id: user.id }, { onConflict: "society_id,user_id" });
      if (memberError) throw memberError;

      setShortName("");
      setFullName("");
      setFacebookUrl("");
      setShowForm(false);
      await qc.invalidateQueries({ queryKey: ["societies", user.id] });
      navigate({ to: "/sociedades/$id", params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Shell active="community">
      <div className="px-4 pt-5 pb-10">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-leaf/15 text-leaf">
            <Users size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold">{t("Sociedades", "Societies")}</h1>
            <p className="text-xs text-muted-foreground">
              {t("Directorio y chats de sociedades", "Directory and society chats")}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground max-w-[34ch]">
          {t(
            "Únete a sociedades orquideológicas de la región para coordinar salidas, IDs y conservación.",
            "Join regional orchid societies to coordinate outings, IDs and conservation.",
          )}
        </p>

        {!user && (
          <div className="mt-4 rounded-2xl bg-accent/40 border border-border p-3 text-xs">
            <Link to="/login" className="font-semibold text-leaf underline">
              {t("Entra", "Sign in")}
            </Link>{" "}
            {t("para unirte, registrar una sociedad y participar en los grupos.", "to join, register a society, and take part in the groups.")}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive flex gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => (user ? setShowForm((v) => !v) : navigate({ to: "/login" }))}
          className="mt-4 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          <Plus size={15} /> {t("Registrar sociedad", "Register a society")}
        </button>

        {showForm && (
          <form onSubmit={registerSociety} className="mt-3 rounded-2xl border border-border bg-card p-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">
                {t("Nombre corto", "Short name")}
              </span>
              <input
                value={shortName}
                onChange={(e) => setShortName(e.target.value.slice(0, 48))}
                placeholder={t("Ej. AMO Oaxaca", "e.g. AMO Oaxaca")}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">
                {t("Nombre completo", "Full name")}
              </span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value.slice(0, 160))}
                placeholder={t("Sociedad Mexicana de Orquideología…", "Mexican Orchid Society…")}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/80">
                {t("Facebook o enlace público", "Facebook or public link")}
              </span>
              <input
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value.slice(0, 240))}
                placeholder="https://facebook.com/..."
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t(
                "Las sociedades nuevas empiezan como no oficiales. El equipo puede marcarlas como oficiales después de verificar identidad y moderación.",
                "New societies start as unofficial. The team can mark them official after identity and moderation review.",
              )}
            </p>
            <button
              type="submit"
              disabled={creating || !shortName.trim()}
              className="w-full rounded-xl bg-leaf text-leaf-foreground py-2 text-xs font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creating && <Loader2 size={13} className="animate-spin" />}
              {t("Crear sociedad y entrar", "Create society and enter")}
            </button>
          </form>
        )}

        <div className="mt-5 space-y-3">
          {isLoading && (
            <div className="text-xs text-muted-foreground">{t("Cargando…", "Loading…")}</div>
          )}
          {(data ?? []).map((s: SocietyRow) => (
            <div key={s.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-start gap-3">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl text-white font-bold text-sm uppercase shrink-0"
                  style={{ background: s.color || "hsl(140 35% 32%)" }}
                >
                  {s.name.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">{s.name}</span>
                    {s.is_official ? (
                      <span className="rounded-full bg-leaf/10 text-leaf px-1.5 py-0.5 text-[9px] font-semibold uppercase">
                        {t("Oficial", "Official")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-[9px] font-semibold uppercase">
                        {t("Comunidad", "Community")}
                      </span>
                    )}
                  </div>
                  {s.full_name && (
                    <div className="text-[11px] text-muted-foreground truncate">{s.full_name}</div>
                  )}
                  {s.facebook_url && (
                    <a
                      href={s.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-[11px] text-leaf font-semibold"
                    >
                      {t("Enlace público", "Public link")}
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={pendingId === s.id}
                  onClick={() => toggle(s.id, s.joined)}
                  className={
                    "flex-1 rounded-xl py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition disabled:opacity-50 " +
                    (s.joined
                      ? "bg-leaf/10 text-leaf border border-leaf/30"
                      : "bg-leaf text-leaf-foreground")
                  }
                >
                  {pendingId === s.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : s.joined ? (
                    <>
                      <Check size={13} /> {t("Miembro", "Member")}
                    </>
                  ) : (
                    t("Unirme", "Join")
                  )}
                </button>
                {s.joined && (
                  <Link
                    to="/sociedades/$id"
                    params={{ id: s.id }}
                    className="rounded-xl bg-card border border-border px-3 py-2 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    {t("Chat", "Chat")} <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
