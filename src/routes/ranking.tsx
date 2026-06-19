import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, BadgeCheck, Flower2, Target } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking de spotters · OrquIDea" },
      {
        name: "description",
        content:
          "Tabla de posiciones de spotters de orquídeas de México: puntos, avistamientos y especies únicas.",
      },
      { property: "og:title", content: "Ranking de spotters · OrquIDea" },
      { property: "og:description", content: "Top observadores de orquídeas de México." },
      { property: "og:url", content: "https://orchid-map-oaxaca.lovable.app/ranking" },
    ],
    links: [{ rel: "canonical", href: "https://orchid-map-oaxaca.lovable.app/ranking" }],
  }),

  component: RankingPage,
});

function RankingPage() {
  const { t } = useLang();
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("leaderboard", { p_limit: 50 });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Shell active="board">
      <div className="px-4 pt-5">
        <h1 className="text-2xl font-display font-semibold">{t("Ranking", "Ranking")}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t("Spotters más activos del país.", "The country's most active spotters.")}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {t(
            "Puntos por avistamientos, especies, verificaciones y retos completados.",
            "Points for sightings, species, verifications and completed quests.",
          )}
        </p>

        {isLoading && (
          <p className="mt-4 text-sm text-muted-foreground">{t("Cargando…", "Loading…")}</p>
        )}

        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
            <Trophy size={28} className="mx-auto text-warn" />
            <p className="mt-2 text-sm font-medium">
              {t("Aún no hay ranking.", "No ranking yet.")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                "Sé el primero en registrar y verificar avistamientos.",
                "Be the first to log and verify sightings.",
              )}
            </p>
          </div>
        )}

        <ol className="mt-5 space-y-2">
          {(data ?? []).map((row) => {
            const podium = row.position <= 3;
            return (
              <li
                key={row.user_id}
                className={
                  "flex items-center gap-3 rounded-2xl border p-3 " +
                  (podium
                    ? "bg-gradient-to-r from-warn/10 to-transparent border-warn/40"
                    : "bg-card border-border")
                }
              >
                <div
                  className={
                    "grid h-10 w-10 place-items-center rounded-full font-display font-semibold " +
                    (row.position === 1
                      ? "bg-warn text-background"
                      : row.position === 2
                        ? "bg-muted-foreground/30 text-foreground"
                        : row.position === 3
                          ? "bg-orchid/80 text-orchid-foreground"
                          : "bg-accent text-accent-foreground")
                  }
                >
                  {row.position}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{row.display_name ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    @{row.handle ?? "—"}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Flower2 size={10} /> {row.species} {t("esp.", "spp.")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BadgeCheck size={10} /> {row.verified} {t("verif.", "verif.")}
                    </span>
                    {row.challenges > 0 && (
                      <span className="inline-flex items-center gap-1 text-orchid">
                        <Target size={10} /> {row.challenges} {t("retos", "quests")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-lg font-semibold leading-none">
                    {row.points}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("pts", "pts")}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Shell>
  );
}
