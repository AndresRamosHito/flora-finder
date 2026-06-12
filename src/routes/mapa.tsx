import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Lock, Info, ShieldCheck } from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { SightingsMap } from "@/components/SightingsMap";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mapa")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { especie?: string } => ({
    especie: typeof search.especie === "string" && search.especie ? search.especie : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mapa · OrquIDea" },
      {
        name: "description",
        content:
          "Avistamientos georreferenciados en la Sierra de Oaxaca con protección de ubicación para especies sensibles.",
      },
    ],
  }),
  component: MapPage,
});

const BBOX = { min_lat: 16.6, max_lat: 17.9, min_lng: -97.0, max_lng: -95.6 };

type StatusFilter = "all" | "verified" | "pending";

function MapPage() {
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
  const [showSensitive, setShowSensitive] = useState(true);
  const [taxon, setTaxon] = useState(especie ?? "");

  const all = data ?? [];

  const filtered = useMemo(() => {
    const q = taxon.trim().toLowerCase();
    return all.filter((p) => {
      if (p.lat == null || p.lng == null) return false;
      if (!showSensitive && (p.is_sensitive || p.is_masked)) return false;
      if (status === "verified" && p.status !== "verified") return false;
      if (status === "pending" && p.status === "verified") return false;
      if (q) {
        const hay = `${p.sci_name ?? ""} ${p.common_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, status, showSensitive, taxon]);

  const hiddenMasked = all.filter((p) => p.is_masked && p.lat == null).length;

  return (
    <Shell active="map">
      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="specimen-label">{REGION}</div>
            <h1 className="mt-0.5 text-2xl font-display font-semibold">Mapa</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-[28ch]">
              Coordenadas redondeadas a cuadrícula. Especies sensibles solo como área.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 text-leaf px-2 py-1 text-[10px] font-semibold whitespace-nowrap">
            <ShieldCheck size={11} /> Protegido
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Chip active={status === "all"} onClick={() => setStatus("all")}>
              Todos
            </Chip>
            <Chip active={status === "verified"} onClick={() => setStatus("verified")}>
              Verificados
            </Chip>
            <Chip active={status === "pending"} onClick={() => setStatus("pending")}>
              Pendientes
            </Chip>
            <Chip active={showSensitive} onClick={() => setShowSensitive((v) => !v)}>
              {showSensitive ? "Sensibles ✓" : "Sensibles"}
            </Chip>
          </div>
          <input
            value={taxon}
            onChange={(e) => setTaxon(e.target.value)}
            placeholder="Buscar por especie…"
            className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          />
        </div>

        <div className="mt-3">
          <SightingsMap points={filtered} bbox={BBOX} heightClass="h-[56vh] min-h-[320px]" />
        </div>

        <div className="mt-3 flex items-center gap-4 text-[11px] flex-wrap">
          <Legend dotClass="bg-leaf" label="Verificado" />
          <Legend dotClass="bg-orchid" label="Pendiente" />
          <Legend dotClass="bg-warn/40 border border-warn" label="Sensible (área)" />
        </div>

        <div className="mt-3 rounded-2xl bg-card border border-border p-3 text-xs text-foreground/80 flex gap-2">
          <Info size={14} className="text-leaf shrink-0 mt-0.5" />
          <div>
            {isLoading ? "Cargando puntos…" : `${filtered.length} avistamientos en ${REGION}.`}
            {hiddenMasked > 0 && (
              <>
                {" · "}
                <Lock size={11} className="inline" /> {hiddenMasked} ocultos por completo.
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
