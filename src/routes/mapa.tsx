import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Info } from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa · OrquIDea" },
      { name: "description", content: "Avistamientos georreferenciados en la Sierra de Oaxaca con protección de ubicación para especies sensibles." },
    ],
  }),
  component: MapPage,
});

// Sierra Norte / Sierra de Oaxaca bounding box.
const BBOX = { min_lat: 16.6, max_lat: 17.9, min_lng: -97.0, max_lng: -95.6 };

function MapPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["map-bbox", BBOX],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sightings_in_bbox", BBOX);
      if (error) throw error;
      return data ?? [];
    },
  });

  const points = (data ?? []).filter((p) => p.lat != null && p.lng != null);
  const masked = (data ?? []).filter((p) => p.is_masked && p.lat == null).length;

  return (
    <Shell active="map">
      <div className="px-4 pt-5">
        <h1 className="text-2xl font-display font-semibold">Mapa</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Cuadrícula aproximada — todas las ubicaciones están redondeadas a una rejilla regional. Especies sensibles aparecen solo como área.
        </p>

        <div className="mt-4 relative rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-leaf/15 via-accent/30 to-background aspect-[4/5]">
          <TopoBackdrop />
          {/* lat/lng → percent within bbox */}
          {points.map((p, i) => {
            const x = ((p.lng! - BBOX.min_lng) / (BBOX.max_lng - BBOX.min_lng)) * 100;
            const y = (1 - (p.lat! - BBOX.min_lat) / (BBOX.max_lat - BBOX.min_lat)) * 100;
            return (
              <div
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 30}ms` }}
                title={p.sci_name ?? "Sin identificar"}
              >
                <span
                  className={
                    "block rounded-full ring-2 ring-background stagger-in " +
                    (p.is_sensitive
                      ? "h-5 w-5 bg-warn/40 border border-warn"
                      : p.status === "verified"
                        ? "h-3.5 w-3.5 bg-leaf"
                        : "h-3.5 w-3.5 bg-orchid")
                  }
                />
              </div>
            );
          })}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-foreground/70 bg-background/70 backdrop-blur rounded-lg px-2 py-1">
            <span>{REGION}</span>
            <span className="font-mono">{BBOX.min_lat.toFixed(1)}°N – {BBOX.max_lat.toFixed(1)}°N</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-[11px]">
          <Legend dot="bg-leaf" label="Verificado" />
          <Legend dot="bg-orchid" label="Pendiente" />
          <Legend dot="bg-warn/50 border border-warn h-3 w-3" label="Sensible (área)" />
        </div>

        <div className="mt-4 rounded-2xl bg-card border border-border p-3 text-xs text-foreground/80 flex gap-2">
          <Info size={14} className="text-leaf shrink-0 mt-0.5" />
          <div>
            {isLoading ? "Cargando puntos…" : `${points.length} puntos en la cuadrícula.`}
            {masked > 0 && (
              <> · <Lock size={11} className="inline" /> {masked} avistamientos sensibles ocultos (solo región).</>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={"inline-block rounded-full h-2.5 w-2.5 " + dot} />
      {label}
    </span>
  );
}

function TopoBackdrop() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {[15, 30, 45, 60, 75].map((y) => (
        <path key={y} d={`M0 ${y} Q25 ${y - 5} 50 ${y} T100 ${y}`} fill="none" stroke="var(--leaf)" strokeWidth="0.3" opacity="0.6" />
      ))}
      {[20, 40, 60, 80].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="var(--leaf)" strokeWidth="0.1" strokeDasharray="1 2" opacity="0.4" />
      ))}
    </svg>
  );
}
