import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMap } from "react-leaflet";
import { Link } from "@tanstack/react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLang } from "@/lib/i18n";

export type SightingPoint = {
  id: string;
  lat: number | null;
  lng: number | null;
  sci_name: string | null;
  common_name?: string | null;
  is_sensitive: boolean;
  is_masked: boolean;
  status?: string | null;
  location_label?: string | null;
  location_precision?: "exact" | "fuzzed" | "hidden" | string | null;
  public_radius_km?: number | null;
};

type BBox = { min_lat: number; max_lat: number; min_lng: number; max_lng: number };

function FitToBbox({ bbox }: { bbox: BBox }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLngBounds([bbox.min_lat, bbox.min_lng], [bbox.max_lat, bbox.max_lng]), {
      padding: [16, 16],
    });
  }, [map, bbox]);
  return null;
}

export function SightingsMap({
  points,
  bbox,
  heightClass = "aspect-[4/5]",
}: {
  points: SightingPoint[];
  bbox: BBox;
  heightClass?: string;
}) {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const center: [number, number] = useMemo(
    () => [(bbox.min_lat + bbox.max_lat) / 2, (bbox.min_lng + bbox.max_lng) / 2],
    [bbox],
  );

  const visibleAreas = useMemo(
    () => points.filter((p) => p.lat != null && p.lng != null && p.location_precision !== "hidden"),
    [points],
  );

  if (!mounted) {
    return (
      <div
        ref={containerRef}
        className={
          "w-full rounded-3xl bg-gradient-to-br from-leaf/15 via-accent/30 to-background animate-pulse " +
          heightClass
        }
      />
    );
  }

  return (
    <div
      className={
        "w-full rounded-3xl overflow-hidden border border-border relative z-0 " + heightClass
      }
    >
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitToBbox bbox={bbox} />
        {visibleAreas.map((p) => {
          const radiusKm = p.public_radius_km ?? (p.is_sensitive || p.is_masked ? 100 : 20);
          const verified = p.status === "verified";
          return (
            <Circle
              key={p.id}
              center={[p.lat as number, p.lng as number]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: verified ? "hsl(140 35% 32%)" : "hsl(322 70% 48%)",
                weight: 1.5,
                fillColor: verified ? "hsl(140 45% 45%)" : "hsl(322 70% 58%)",
                fillOpacity: 0.18,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold italic">
                    {p.sci_name ?? t("Sin identificar", "Unidentified")}
                  </div>
                  {p.common_name && <div className="text-[11px] opacity-70">{p.common_name}</div>}
                  <div className="text-[11px] opacity-70 mt-1">
                    {t(
                      `Área pública aproximada: ${radiusKm} km`,
                      `Approximate public area: ${radiusKm} km`,
                    )}
                  </div>
                  {p.location_label && <div className="text-[11px] mt-1">{p.location_label}</div>}
                  <Link
                    to="/s/$id"
                    params={{ id: p.id }}
                    className="inline-block mt-2 text-[11px] font-semibold text-leaf underline"
                  >
                    {t("Ver detalle →", "View details →")}
                  </Link>
                </div>
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}
