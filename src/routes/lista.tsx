import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flower2, BadgeCheck, HelpCircle, MapPin, Plus, Award, Search, Mountain } from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { Orchid } from "@/components/Orchid";
import { StatusPill } from "@/components/StatusPill";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { habitatLabel } from "@/lib/habitats";

export const Route = createFileRoute("/lista")({
  head: () => ({
    meta: [
      { title: "Mi life list de orquídeas · OrquIDea" },
      {
        name: "description",
        content:
          "Tu life list personal de orquídeas observadas: avistamientos, especies únicas y verificados por la comunidad.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: ListPage,
});

function ListPage() {
  const { t, lang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["my-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [sRes, pRes, tRes] = await Promise.all([
        (supabase as any)
          .from("sightings")
          .select("id, taxon_id, photo_url, location_label, observed_at, created_at, status, notes, altitude_m, altitude_accuracy_m, habitat_type, habitat_description")
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
    return sightings.filter((s: any) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (q) {
        const tx = s.taxon_id ? data?.taxaById.get(s.taxon_id) : null;
        const habitat = habitatLabel(s.habitat_type, lang) ?? "";
        const hay =
          `${tx?.sci_name ?? ""} ${tx?.common_name ?? ""} ${s.location_label ?? ""} ${habitat} ${s.habitat_description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sightings, filter, search, data, lang]);

  if (loading || !user)
    return (
      <Shell active="list">
        <div className="p-6 text-sm text-muted-foreground">{t("Cargando…", "Loading…")}</div>
      </Shell>
    );

  const species = new Set(sightings.filter((s: any) => s.taxon_id).map((s: any) => s.taxon_id!));
  const verified = sightings.filter((s: any) => s.status === "verified").length;
  const profile = data?.profile;

  return (
    <Shell active="list">
      <div className="px-4 pt-5 pb-10">
        <h1 className="sr-only">{t("Mi life list de orquídeas", "My orchid life list")}</h1>

        <div className="rounded-3xl bg-gradient-to-br from-leaf to-leaf/70 text-leaf-foreground p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-80">@{profile?.handle ?? "—"}</div>
              <div className="font-display text-xl font-semibold">
                {profile?.display_name ?? t("Mi lista", "My list")}
              </div>
              <div className="text-[11px] opacity-80 mt-1 inline-flex items-center gap-1">
                <MapPin size={11} /> {profile?.region ?? REGION}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-xs opacity-90">
                <Award size={12} /> {t("puntos", "points")}
              </div>
              <div className="font-display text-3xl font-semibold leading-none">
                {profile?.points ?? 0}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat n={sightings.length} label={t("avistamientos", "sightings")} />
            <Stat n={species.size} label={t("especies", "species")} />
            <Stat n={verified} label={t("verificados", "verified")} />
          </div>
        </div>

        <h2 className="mt-6 font-display text-lg font-semibold">
          {t("Mi life list", "My life list")}
        </h2>

        {sightings.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  ["all", t("Todas", "All")],
                  ["verified", t("Verificadas", "Verified")],
                  ["needs_id", t("Necesitan ID", "Need ID")],
                  ["pending", t("En revisión", "Under review")],
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
                placeholder={t(
                  "Busca por especie, lugar o hábitat…",
                  "Search by species, place, or habitat…",
                )}
                className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </div>
          </div>
        )}

        {isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">{t("Cargando…", "Loading…")}</p>
        )}
        {!isLoading && sightings.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center">
            <Flower2 className="mx-auto text-leaf" size={28} />
            <p className="mt-2 text-sm font-medium">
              {t("Aún no has registrado orquídeas.", "You haven't logged any orchids yet.")}
            </p>
            <Link
              to="/capture"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-orchid text-orchid-foreground px-3 py-1.5 text-xs font-semibold"
            >
              <Plus size={12} /> {t("Registrar la primera", "Log your first")}
            </Link>
          </div>
        )}

        {!isLoading && sightings.length > 0 && visible.length === 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("Ninguna observación coincide con el filtro.", "No observations match the filter.")}
          </p>
        )}

        <ul className="mt-3 space-y-3">
          {visible.map((s: any) => {
            const tx = s.taxon_id ? data?.taxaById.get(s.taxon_id) : null;
            const habitat = habitatLabel(s.habitat_type, lang);
            return (
              <li
                key={s.id}
                className="sheet-card rounded-2xl overflow-hidden flex relative hover:border-leaf/40 transition"
              >
                <div className="w-24 h-24 shrink-0 grid place-items-center bg-accent/30">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Orchid sciName={tx?.sci_name ?? null} size={70} />
                  )}
                </div>
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display italic text-sm truncate">
                        {tx?.sci_name ?? t("Sin identificar", "Unidentified")}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {tx?.common_name ??
                          t("Pediremos ayuda a la comunidad", "We'll ask the community for help")}
                      </div>
                    </div>
                    {tx?.conservation_status && <StatusPill status={tx.conservation_status} />}
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>
                      {new Date(s.observed_at ?? s.created_at).toLocaleDateString(
                        lang === "en" ? "en-US" : "es-MX",
                      )}
                    </span>
                    <span>·</span>
                    <span className="truncate">{s.location_label ?? REGION}</span>
                  </div>
                  {(s.altitude_m != null || habitat) && (
                    <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <Mountain size={11} />
                      {s.altitude_m != null && (
                        <span>
                          {s.altitude_m} m{ s.altitude_accuracy_m ? ` ±${s.altitude_accuracy_m} m` : "" }
                        </span>
                      )}
                      {s.altitude_m != null && habitat && <span>·</span>}
                      {habitat && <span className="truncate">{habitat}</span>}
                    </div>
                  )}
                  <div className="mt-1 text-[11px]">
                    {s.status === "verified" ? (
                      <span className="text-leaf inline-flex items-center gap-1">
                        <BadgeCheck size={11} /> {t("verificado", "verified")}
                      </span>
                    ) : s.status === "needs_id" ? (
                      <span className="text-orchid inline-flex items-center gap-1">
                        <HelpCircle size={11} /> {t("necesita ID", "needs ID")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("en revisión", "under review")}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to="/s/$id"
                  params={{ id: s.id }}
                  className="absolute inset-0"
                  aria-label={t(
                    `Ver avistamiento de ${tx?.sci_name ?? "orquídea sin identificar"}`,
                    `View sighting of ${tx?.sci_name ?? "unidentified orchid"}`,
                  )}
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
