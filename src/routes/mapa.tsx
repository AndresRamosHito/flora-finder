import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Info, ShieldCheck } from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { SightingsMap } from "@/components/SightingsMap";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mapa")({
  ssr: false,
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

  const all = data ?? [];
  const points = all.filter((p) => p.lat != null && p.lng != null);
  const hiddenMasked = all.filter((p) => p.is_masked && p.lat == null).length;

  return (
    <Shell active="map">
      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-semibold">Mapa</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-[28ch]">
              Coordenadas redondeadas a cuadrícula. Especies sensibles aparecen solo como área.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 text-leaf px-2 py-1 text-[10px] font-semibold whitespace-nowrap">
            <ShieldCheck size={11} /> Ubicación protegida
          </span>
        </div>

        <div className="mt-4">
          <SightingsMap points={points} bbox={BBOX} />
        </div>

        <div className="mt-3 flex items-center gap-4 text-[11px] flex-wrap">
          <Legend dotClass="bg-leaf" label="Verificado" />
          <Legend dotClass="bg-orchid" label="Pendiente" />
          <Legend dotClass="bg-warn/40 border border-warn" label="Sensible (área)" />
        </div>

        <div className="mt-3 rounded-2xl bg-card border border-border p-3 text-xs text-foreground/80 flex gap-2">
          <Info size={14} className="text-leaf shrink-0 mt-0.5" />
          <div>
            {isLoading ? "Cargando puntos…" : `${points.length} avistamientos en ${REGION}.`}
            {hiddenMasked > 0 && (
              <>
                {" · "}
                <Lock size={11} className="inline" /> {hiddenMasked} ocultos por completo (solo región).
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
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
