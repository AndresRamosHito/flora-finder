import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, BadgeCheck, Flower2 } from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking · OrquIDea" },
      { name: "description", content: "Tabla de spotters de orquídeas en la Sierra de Oaxaca." },
    ],
  }),
  component: RankingPage,
});

function RankingPage() {
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
        <h1 className="text-2xl font-display font-semibold">Ranking</h1>
        <p className="text-xs text-muted-foreground mt-1">Spotters más activos en la {REGION}.</p>

        {isLoading && <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>}

        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
            <Trophy size={28} className="mx-auto text-warn" />
            <p className="mt-2 text-sm font-medium">Aún no hay ranking.</p>
            <p className="text-xs text-muted-foreground">Sé el primero en registrar y verificar avistamientos.</p>
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
                  (podium ? "bg-gradient-to-r from-warn/10 to-transparent border-warn/40" : "bg-card border-border")
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
                  <div className="text-[11px] text-muted-foreground truncate">@{row.handle ?? "—"}</div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <div className="inline-flex items-center gap-1"><Flower2 size={11} /> {row.species} esp.</div>
                  <div className="inline-flex items-center gap-1"><BadgeCheck size={11} /> {row.verified} verif.</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Shell>
  );
}
