import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMap } from "react-leaflet";
import { Link } from "@tanstack/react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { useLang } from "@/lib/i18n";

type PopupLabels = {
  unidentified: string;
  verified: string;
  pending: string;
  viewDetail: string;
};

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
    map.fitBounds(L.latLngBounds([bbox.min_lat, bbox.min_lng], [bbox.max_lat, bbox.max_lng]), {
      padding: [16, 16],
    });
  }, [map, bbox]);
  return null;
}

function pinIcon(verified: boolean) {
  const fill = verified ? "hsl(140 35% 32%)" : "hsl(322 70% 48%)";
  const html = `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${fill};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></span>`;
  return L.divIcon({ html, className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
}

function ClusteredPins({ points, labels }: { points: SightingPoint[]; labels: PopupLabels }) {
  const map = useMap();
  useEffect(() => {
    const cluster = (
      L as unknown as { markerClusterGroup: (opts?: object) => L.LayerGroup }
    ).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
    });
    points.forEach((p) => {
      if (p.lat == null || p.lng == null || p.is_sensitive || p.is_masked) return;
      const verified = p.status === "verified";
      const marker = L.marker([p.lat, p.lng], { icon: pinIcon(verified) });
      const linkHref = `/s/${p.id}`;
      marker.bindPopup(
        `<div style="font-size:12px"><div style="font-weight:600;font-style:italic">${
          p.sci_name ?? labels.unidentified
        }</div>${
          p.common_name ? `<div style="font-size:11px">${p.common_name}</div>` : ""
        }<div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;margin-top:4px">${
          verified ? labels.verified : labels.pending
        }</div><a href="${linkHref}" style="display:inline-block;margin-top:6px;font-size:11px;font-weight:600;color:#2d6a4f;text-decoration:underline">${labels.viewDetail}</a></div>`,
      );
      cluster.addLayer(marker);
    });
    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
    };
  }, [map, points, labels]);
  return null;
}

function LocateButton({ label }: { label: string }) {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => {
        if (!("geolocation" in navigator)) return;
        navigator.geolocation.getCurrentPosition(
          (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 12),
          () => {},
          { enableHighAccuracy: true, timeout: 8000 },
        );
      }}
      className="absolute top-3 right-3 z-[400] rounded-full bg-card border border-border shadow-sm h-9 w-9 grid place-items-center text-foreground"
      aria-label={label}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    </button>
  );
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

  const popupLabels = useMemo<PopupLabels>(
    () => ({
      unidentified: t("Sin identificar", "Unidentified"),
      verified: t("Verificado", "Verified"),
      pending: t("Pendiente", "Pending"),
      viewDetail: t("Ver detalle →", "View details →"),
    }),
    [t],
  );

  const center: [number, number] = useMemo(
    () => [(bbox.min_lat + bbox.max_lat) / 2, (bbox.min_lng + bbox.max_lng) / 2],
    [bbox],
  );

  const sensitivePts = useMemo(
    () => points.filter((p) => (p.is_sensitive || p.is_masked) && p.lat != null && p.lng != null),
    [points],
  );
  const normalPts = useMemo(
    () => points.filter((p) => !p.is_sensitive && !p.is_masked && p.lat != null && p.lng != null),
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
        zoom={9}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitToBbox bbox={bbox} />
        <LocateButton label={t("Ubicarme", "Locate me")} />
        <ClusteredPins points={normalPts} labels={popupLabels} />
        {sensitivePts.map((p) => (
          <Circle
            key={p.id}
            center={[p.lat as number, p.lng as number]}
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
                <div className="font-semibold italic">
                  {p.sci_name ?? t("Sin identificar", "Unidentified")}
                </div>
                <div className="text-[11px] opacity-70 mt-0.5">
                  {t(
                    "Especie sensible — solo área aproximada",
                    "Sensitive species — approximate area only",
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
        ))}
      </MapContainer>
    </div>
  );
}
