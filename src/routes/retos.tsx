import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Target, Calendar, Award, Flower2 } from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { Orchid } from "@/components/Orchid";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/retos")({
  head: () => ({
    meta: [
      { title: "Retos · OrquIDea" },
      { name: "description", content: "Retos de observación de orquídeas en la Sierra de Oaxaca." },
    ],
  }),
  component: HuntsPage,
});

function HuntsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["hunts"],
    queryFn: async () => {
      const [hRes, tRes, taxaRes, bRes] = await Promise.all([
        supabase.from("hunts").select("id, title, blurb, region, starts_at, ends_at, reward_badge_id").order("starts_at", { ascending: false, nullsFirst: false }),
        supabase.from("hunt_targets").select("hunt_id, taxon_id"),
        supabase.from("taxa").select("id, sci_name, common_name, is_sensitive"),
        supabase.from("badges").select("id, name, icon"),
      ]);
      if (hRes.error) throw hRes.error;
      const taxaById = new Map((taxaRes.data ?? []).map((t) => [t.id, t]));
      const badgesById = new Map((bRes.data ?? []).map((b) => [b.id, b]));
      const targetsByHunt = new Map<string, string[]>();
      for (const t of tRes.data ?? []) {
        if (!targetsByHunt.has(t.hunt_id)) targetsByHunt.set(t.hunt_id, []);
        targetsByHunt.get(t.hunt_id)!.push(t.taxon_id);
      }
      return { hunts: hRes.data ?? [], taxaById, badgesById, targetsByHunt };
    },
  });

  const now = Date.now();
  const hunts = data?.hunts ?? [];

  return (
    <Shell active="hunts">
      <div className="px-4 pt-5 pb-6">
        <h1 className="text-2xl font-display font-semibold">Retos</h1>
        <p className="text-xs text-muted-foreground mt-1">Misiones temporales en la {REGION}. Encuentra todos los objetivos para ganar la insignia.</p>

        {isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}

        {!isLoading && hunts.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
            <Target size={28} className="mx-auto text-leaf" />
            <p className="mt-2 text-sm font-medium">Aún no hay retos activos.</p>
            <p className="text-xs text-muted-foreground">Los administradores publicarán retos estacionales pronto.</p>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {hunts.map((h) => {
            const ends = h.ends_at ? new Date(h.ends_at).getTime() : null;
            const starts = h.starts_at ? new Date(h.starts_at).getTime() : null;
            const active = (!starts || starts <= now) && (!ends || ends >= now);
            const targets = (data?.targetsByHunt.get(h.id) ?? []).map((id) => data?.taxaById.get(id)).filter(Boolean);
            const badge = h.reward_badge_id ? data?.badgesById.get(h.reward_badge_id) : null;
            return (
              <article key={h.id} className="rounded-3xl border border-border bg-card overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orchid/10 text-orchid shrink-0">
                    <Target size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-base font-semibold">{h.title}</h2>
                      {active ? (
                        <span className="text-[10px] uppercase tracking-wide bg-leaf/15 text-leaf rounded-full px-2 py-0.5 font-semibold">activo</span>
                      ) : ends && ends < now ? (
                        <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground rounded-full px-2 py-0.5">cerrado</span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wide bg-warn/15 text-warn rounded-full px-2 py-0.5">próximo</span>
                      )}
                    </div>
                    {h.blurb && <p className="text-xs text-muted-foreground mt-1">{h.blurb}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {h.ends_at && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} /> hasta {new Date(h.ends_at).toLocaleDateString("es-MX")}
                        </span>
                      )}
                      {badge && (
                        <span className="inline-flex items-center gap-1 text-warn">
                          <Award size={11} /> {badge.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {targets.length > 0 && (
                  <div className="bg-accent/20 px-3 py-3 border-t border-border">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 px-1">
                      <Flower2 size={10} className="inline mr-1" />
                      Objetivos · {targets.length}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {targets.map((t) => (
                        <div key={t!.id} className="shrink-0 w-24 rounded-xl bg-card border border-border p-2 text-center">
                          <Orchid sciName={t!.sci_name} size={60} />
                          <div className="font-display italic text-[10px] leading-tight mt-1 truncate">{t!.sci_name}</div>
                          {t!.common_name && <div className="text-[9px] text-muted-foreground truncate">{t!.common_name}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
