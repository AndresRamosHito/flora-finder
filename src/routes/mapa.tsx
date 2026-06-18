import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Lock, Info, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SightingsMap } from "@/components/SightingsMap";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/mapa")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { especie?: string } => ({
    especie: typeof search.especie === "string" && search.especie ? search.especie : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Áreas aproximadas de orquídeas · OrquIDea" },
      {
        name: "description",
        content:
          "Mapa de áreas aproximadas de avistamientos de orquídeas de México. No se publican coordenadas exactas.",
      },
      { property: "og:title", content: "Áreas aproximadas de orquídeas · OrquIDea" },
      {
        property: "og:description",
        content: "Mapa de áreas amplias de avistamientos, con protección de ubicación.",
      },
      { property: "og:url", content: "https://orchid-map-oaxaca.lovable.app/mapa" },
    ],
    links: [{ rel: "canonical", href: "https://orchid-map-oaxaca.lovable.app/mapa" }],
  }),

  component: MapPage,
});

// National bounding box — covers the Mexican mainland and peninsulas.
const BBOX = { min_lat: 14.3, max_lat: 32.8, min_lng: -118.5, max_lng: -86.6 };

type StatusFilter = "all" | "verified" | "pending";

function MapPage() {
  const { t } = useLang();
  const { especie } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["map-bbox", BBOX],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sightings_in_bbox", BBOX);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [status, setStatus] = useState<StatusFilter>("all");
  const [taxon, setTaxon] = useState(especie ?? "");

  const all = data ?? [];

  const filtered = useMemo(() => {
    const q = taxon.trim().toLowerCase();
    return all.filter((p) => {
      if (p.lat == null || p.lng == null) return false;
      if (status === "verified" && p.status !== "verified") return false;
      if (status === "pending" && p.status === "verified") return false;
      if (q) {
        const hay = `${p.sci_name ?? ""} ${p.common_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, status, taxon]);

  const hidden = all.filter((p) => p.lat == null || p.lng == null).length;

  return (
    <Shell active="map">
      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="specimen-label">{t("Orquídeas de México", "Orchids of Mexico")}</div>
            <h1 className="mt-0.5 text-2xl font-display font-semibold">
              {t("Áreas aproximadas", "Approximate areas")}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-[32ch]">
              {t(
                "No se publican coordenadas exactas. Cada círculo representa una zona pública aproximada, normalmente 20 km o 100 km.",
                "Exact coordinates are not published. Each circle is an approximate public area, usually 20 km or 100 km.",
              )}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 text-leaf px-2 py-1 text-[10px] font-semibold whitespace-nowrap">
            <ShieldCheck size={11} /> {t("Protegido", "Protected")}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Chip active={status === "all"} onClick={() => setStatus("all")}>
              {t("Todos", "All")}
            </Chip>
            <Chip active={status === "verified"} onClick={() => setStatus("verified")}>
              {t("Verificados", "Verified")}
            </Chip>
            <Chip active={status === "pending"} onClick={() => setStatus("pending")}>
              {t("Pendientes", "Pending")}
            </Chip>
          </div>
          <input
            value={taxon}
            onChange={(e) => setTaxon(e.target.value)}
            placeholder={t("Buscar por especie…", "Search by species…")}
            className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          />
        </div>

        <div className="mt-3">
          <SightingsMap points={filtered as any} bbox={BBOX} heightClass="h-[56vh] min-h-[320px]" />
        </div>

        <div className="mt-3 flex items-center gap-4 text-[11px] flex-wrap">
          <Legend dotClass="bg-leaf/40 border border-leaf" label={t("Área verificada", "Verified area")} />
          <Legend dotClass="bg-orchid/40 border border-orchid" label={t("Área pendiente", "Pending area")} />
        </div>

        <div className="mt-3 rounded-2xl bg-card border border-border p-3 text-xs text-foreground/80 flex gap-2">
          <Info size={14} className="text-leaf shrink-0 mt-0.5" />
          <div>
            {isLoading
              ? t("Cargando áreas…", "Loading areas…")
              : t(
                  `${filtered.length} áreas públicas aproximadas en México.`,
                  `${filtered.length} approximate public areas in Mexico.`,
                )}
            {hidden > 0 && (
              <>
                {" · "}
                <Lock size={11} className="inline" /> {hidden}{" "}
                {t("avistamientos sin ubicación pública.", "sightings with no public location.")}
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors " +
        (active
          ? "bg-leaf text-leaf-foreground border-leaf"
          : "bg-card text-foreground/70 border-border hover:bg-accent")
      }
    >
      {children}
    </button>
  );
}

function Legend({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={"inline-block rounded-full h-2.5 w-2.5 " + dotClass} />
      {label}
    </span>
  );
}
