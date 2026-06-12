import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flower2, BadgeCheck, HelpCircle, MapPin, Plus, Award, Search } from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { Orchid } from "@/components/Orchid";
import { StatusPill } from "@/components/StatusPill";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/lista")({
  head: () => ({
    meta: [
      { title: "Mi life list de orquídeas · OrquIDea" },
      { name: "description", content: "Tu life list personal de orquídeas observadas: avistamientos, especies únicas y verificados por la comunidad." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: ListPage,
});

function ListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [sRes, pRes, tRes] = await Promise.all([
        supabase
          .from("sightings")
          .select("id, taxon_id, photo_url, location_label, observed_at, created_at, status, notes")
          .eq("user_id", user!.id)
          .order("observed_at", { ascending: false, nullsFirst: false }),
        supabase
          .from("profiles")
          .select("display_name, handle, points, region")
          .eq("id", user!.id)
          .maybeSingle(),
        supabase
          .from("taxa")
          .select("id, sci_name, common_name, conservation_status, is_sensitive"),
      ]);
      const taxaById = new Map((tRes.data ?? []).map((t) => [t.id, t]));
      return { sightings: sRes.data ?? [], profile: pRes.data, taxaById };
    },
  });

  const [filter, setFilter] = useState<"all" | "verified" | "needs_id" | "pending">("all");
  const [search, setSearch] = useState("");

  const sightings = useMemo(() => data?.sightings ?? [], [data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sightings.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (q) {
        const t = s.taxon_id ? data?.taxaById.get(s.taxon_id) : null;
        const hay =
          `${t?.sci_name ?? ""} ${t?.common_name ?? ""} ${s.location_label ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sightings, filter, search, data]);

  if (loading || !user)
    return (
      <Shell active="list">
        <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
      </Shell>
    );

  const species = new Set(sightings.filter((s) => s.taxon_id).map((s) => s.taxon_id!));
  const verified = sightings.filter((s) => s.status === "verified").length;
  const profile = data?.profile;

  return (
    <Shell active="list">
      <div className="px-4 pt-5 pb-10">
        <h1 className="sr-only">Mi life list de orquídeas</h1>

        <div className="rounded-3xl bg-gradient-to-br from-leaf to-leaf/70 text-leaf-foreground p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-80">@{profile?.handle ?? "—"}</div>
              <div className="font-display text-xl font-semibold">
                {profile?.display_name ?? "Mi lista"}
              </div>
              <div className="text-[11px] opacity-80 mt-1 inline-flex items-center gap-1">
                <MapPin size={11} /> {profile?.region ?? REGION}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-xs opacity-90">
                <Award size={12} /> puntos
              </div>
              <div className="font-display text-3xl font-semibold leading-none">
                {profile?.points ?? 0}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat n={sightings.length} label="avistamientos" />
            <Stat n={species.size} label="especies" />
            <Stat n={verified} label="verificados" />
          </div>
        </div>

        <h2 className="mt-6 font-display text-lg font-semibold">Mi life list</h2>

        {sightings.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  ["all", "Todas"],
                  ["verified", "Verificadas"],
                  ["needs_id", "Necesitan ID"],
                  ["pending", "En revisión"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFilter(v)}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors " +
                    (filter === v
                      ? "bg-leaf text-leaf-foreground border-leaf"
                      : "bg-card text-foreground/70 border-border hover:bg-accent")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busca en tu lista por especie o lugar…"
                className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </div>
          </div>
        )}

        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Cargando…</p>}
        {!isLoading && sightings.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center">
            <Flower2 className="mx-auto text-leaf" size={28} />
            <p className="mt-2 text-sm font-medium">Aún no has registrado orquídeas.</p>
            <Link
              to="/capture"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-orchid text-orchid-foreground px-3 py-1.5 text-xs font-semibold"
            >
              <Plus size={12} /> Registrar la primera
            </Link>
          </div>
        )}

        {!isLoading && sightings.length > 0 && visible.length === 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Ninguna observación coincide con el filtro.
          </p>
        )}

        <ul className="mt-3 space-y-3">
          {visible.map((s) => {
            const t = s.taxon_id ? data?.taxaById.get(s.taxon_id) : null;
            return (
              <li
                key={s.id}
                className="sheet-card rounded-2xl overflow-hidden flex relative hover:border-leaf/40 transition"
              >
                <div className="w-24 h-24 shrink-0 grid place-items-center bg-accent/30">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Orchid sciName={t?.sci_name ?? null} size={70} />
                  )}
                </div>
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display italic text-sm truncate">
                        {t?.sci_name ?? "Sin identificar"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {t?.common_name ?? "Pediremos ayuda a la comunidad"}
                      </div>
                    </div>
                    {t?.conservation_status && <StatusPill status={t.conservation_status} />}
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>
                      {new Date(s.observed_at ?? s.created_at).toLocaleDateString("es-MX")}
                    </span>
                    <span>·</span>
                    <span className="truncate">{s.location_label ?? REGION}</span>
                  </div>
                  <div className="mt-1 text-[11px]">
                    {s.status === "verified" ? (
                      <span className="text-leaf inline-flex items-center gap-1">
                        <BadgeCheck size={11} /> verificado
                      </span>
                    ) : s.status === "needs_id" ? (
                      <span className="text-orchid inline-flex items-center gap-1">
                        <HelpCircle size={11} /> necesita ID
                      </span>
                    ) : (
                      <span className="text-muted-foreground">en revisión</span>
                    )}
                  </div>
                </div>
                <Link
                  to="/s/$id"
                  params={{ id: s.id }}
                  className="absolute inset-0"
                  aria-label={`Ver avistamiento de ${t?.sci_name ?? "orquídea sin identificar"}`}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </Shell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-background/15 py-2">
      <div className="font-display text-xl font-semibold">{n}</div>
      <div className="text-[10px] opacity-80 uppercase tracking-wide">{label}</div>
    </div>
  );
}
