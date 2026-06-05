import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
};

type BBox = { min_lat: number; max_lat: number; min_lng: number; max_lng: number };

function FitToBbox({ bbox }: { bbox: BBox }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      L.latLngBounds([bbox.min_lat, bbox.min_lng], [bbox.max_lat, bbox.max_lng]),
      { padding: [16, 16] },
    );
  }, [map, bbox]);
  return null;
}

export function SightingsMap({
  points,
  bbox,
}: {
  points: SightingPoint[];
  bbox: BBox;
}) {
  // Leaflet touches window/document — render only on client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const center: [number, number] = useMemo(
    () => [(bbox.min_lat + bbox.max_lat) / 2, (bbox.min_lng + bbox.max_lng) / 2],
    [bbox],
  );

  if (!mounted) {
    return (
      <div
        ref={containerRef}
        className="w-full aspect-[4/5] rounded-3xl bg-gradient-to-br from-leaf/15 via-accent/30 to-background animate-pulse"
      />
    );
  }

  return (
    <div className="w-full aspect-[4/5] rounded-3xl overflow-hidden border border-border relative z-0">
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitToBbox bbox={bbox} />
        {points.map((p) => {
          if (p.lat == null || p.lng == null) return null;
          if (p.is_sensitive || p.is_masked) {
            // Coarse blob — fuzz radius (~2.5km) for sensitive species
            return (
              <Circle
                key={p.id}
                center={[p.lat, p.lng]}
                radius={2500}
                pathOptions={{
                  color: "hsl(38 70% 45%)",
                  weight: 1.5,
                  fillColor: "hsl(38 80% 55%)",
                  fillOpacity: 0.25,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold italic">{p.sci_name ?? "Sin identificar"}</div>
                    <div className="text-[11px] opacity-70 mt-0.5">
                      Especie sensible — solo área aproximada
                    </div>
                    {p.location_label && (
                      <div className="text-[11px] mt-1">{p.location_label}</div>
                    )}
                  </div>
                </Popup>
              </Circle>
            );
          }
          const verified = p.status === "verified";
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={7}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: verified ? "hsl(140 35% 32%)" : "hsl(322 70% 48%)",
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold italic">{p.sci_name ?? "Sin identificar"}</div>
                  {p.common_name && <div className="text-[11px]">{p.common_name}</div>}
                  {p.location_label && (
                    <div className="text-[11px] opacity-70 mt-1">{p.location_label}</div>
                  )}
                  <div className="text-[10px] uppercase tracking-wide mt-1 opacity-70">
                    {verified ? "Verificado" : "Pendiente"}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
