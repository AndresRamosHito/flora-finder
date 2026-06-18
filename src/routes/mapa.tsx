import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, X, Info, ShieldCheck, Lock, Shield, BookOpen, MapPin } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SightingsMap } from "@/components/SightingsMap";
import { Orchid } from "@/components/Orchid";
import { StatusPill } from "@/components/StatusPill";
import { supabase } from "@/integrations/supabase/client";
import { selectTaxaCatalog } from "@/lib/taxa";
import { fetchTopPhotos } from "@/lib/likes";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/mapa")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { especie?: string } => ({
    especie: typeof search.especie === "string" && search.especie ? search.especie : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Buscar orquídeas · OrquIDea" },
      {
        name: "description",
        content:
          "Busca orquídeas de México por especie o por zona geográfica. Áreas aproximadas, sin coordenadas exactas.",
      },
      { property: "og:title", content: "Buscar orquídeas · OrquIDea" },
      {
        property: "og:description",
        content: "Busca por especie del herbario o explora avistamientos por área en el mapa.",
      },
      { property: "og:url", content: "https://orchid-map-oaxaca.lovable.app/mapa" },
    ],
    links: [{ rel: "canonical", href: "https://orchid-map-oaxaca.lovable.app/mapa" }],
  }),

  component: SearchPage,
});

// National bounding box — covers the Mexican mainland and peninsulas.
const BBOX = { min_lat: 14.3, max_lat: 32.8, min_lng: -118.5, max_lng: -86.6 };

type StatusFilter = "all" | "verified" | "pending";

type TaxonRow = {
  id: string;
  sci_name: string;
  common_name: string | null;
  genus: string | null;
  conservation_status: string | null;
  is_sensitive: boolean;
  is_native: boolean;
};

const MAX_SPECIES_RESULTS = 20;

function SearchPage() {
  const { t } = useLang();
  const { especie } = Route.useSearch();

  const [query, setQuery] = useState(especie ?? "");
  const [status, setStatus] = useState<StatusFilter>("all");

  // Full taxa catalog powers the species autocomplete/suggestions.
  const { data: taxa, isLoading: taxaLoading } = useQuery({
    queryKey: ["taxa-catalog"],
    queryFn: () =>
      selectTaxaCatalog<Omit<TaxonRow, "is_native">>(
        "id, sci_name, common_name, genus, conservation_status, is_sensitive",
      ),
    staleTime: 1000 * 60 * 5,
  });
  const { data: topPhotos } = useQuery({
    queryKey: ["taxa-top-photos"],
    queryFn: fetchTopPhotos,
    staleTime: 1000 * 60 * 5,
  });

  // Map points (approximate public areas) for the geographic section.
  const { data: mapData, isLoading: mapLoading } = useQuery({
    queryKey: ["map-bbox", BBOX],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sightings_in_bbox", BBOX);
      if (error) throw error;
      return data ?? [];
    },
  });

  const q = query.trim().toLowerCase();

  const speciesResults = useMemo(() => {
    if (!q) return [];
    const out: TaxonRow[] = [];
    for (const tx of taxa ?? []) {
      const hay = `${tx.sci_name} ${tx.common_name ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        out.push(tx);
        if (out.length >= MAX_SPECIES_RESULTS) break;
      }
    }
    return out;
  }, [taxa, q]);

  const mapPoints = useMemo(() => {
    const all = mapData ?? [];
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
  }, [mapData, status, q]);

  const hidden = (mapData ?? []).filter((p) => p.lat == null || p.lng == null).length;

  return (
    <Shell active="map">
      <div className="px-4 pt-5 pb-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="specimen-label">{t("Explorar", "Explore")}</div>
            <h1 className="mt-0.5 text-2xl font-display font-semibold">{t("Buscar", "Search")}</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-[34ch]">
              {t(
                "Busca una especie del herbario o explora los avistamientos por zona.",
                "Find a species in the herbarium, or explore sightings by area.",
              )}
            </p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-leaf/10 text-leaf shrink-0">
            <Search size={18} />
          </span>
        </div>

        {/* Species search */}
        <div className="relative mt-4">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "Busca por especie o nombre común…",
              "Search by species or common name…",
            )}
            className="w-full rounded-xl border border-input bg-card pl-9 pr-9 py-2.5 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          />
          {query && (
            <button
              type="button"
              aria-label={t("Limpiar búsqueda", "Clear search")}
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {q && (
          <div className="mt-3">
            <div className="specimen-label">
              {taxaLoading
                ? t("Buscando especies…", "Searching species…")
                : t(
                    `${speciesResults.length}${speciesResults.length >= MAX_SPECIES_RESULTS ? "+" : ""} especies`,
                    `${speciesResults.length}${speciesResults.length >= MAX_SPECIES_RESULTS ? "+" : ""} species`,
                  )}
            </div>
            {!taxaLoading && speciesResults.length === 0 && (
              <div className="mt-2 rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                {t("Ninguna especie coincide.", "No species match.")}
              </div>
            )}
            <ul className="mt-2 space-y-2">
              {speciesResults.map((tx) => (
                <li key={tx.id}>
                  <Link
                    to="/especies/$id"
                    params={{ id: tx.id }}
                    className="sheet-card flex items-center gap-3 rounded-2xl p-2.5 hover:border-leaf/40 transition"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/40 overflow-hidden">
                      {topPhotos?.get(tx.id) ? (
                        <img
                          src={topPhotos.get(tx.id)}
                          alt={tx.sci_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Orchid sciName={tx.sci_name} size={40} />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-display italic text-sm leading-tight truncate">
                        {tx.sci_name}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {tx.common_name ?? t("Sin nombre común", "No common name")}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {!tx.is_native && (
                        <span className="rounded-full bg-warn/15 text-warn px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                          {t("Exótica", "Exotic")}
                        </span>
                      )}
                      {tx.is_sensitive && <Shield size={12} className="text-warn" />}
                      {tx.conservation_status && <StatusPill status={tx.conservation_status} />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!q && (
          <Link
            to="/especies"
            className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-xs text-foreground/80 hover:border-leaf/40 transition"
          >
            <BookOpen size={15} className="text-leaf shrink-0" />
            {t(
              "Explora las 1300+ especies del herbario por género.",
              "Browse the 1300+ herbarium species by genus.",
            )}
          </Link>
        )}

        {/* Geographic search — the map section */}
        <div className="mt-8 flex items-end justify-between gap-3">
          <div>
            <div className="specimen-label flex items-center gap-1.5">
              <MapPin size={11} /> {t("Buscar por zona", "Search by area")}
            </div>
            <h2 className="mt-0.5 text-lg font-display font-semibold">
              {t("Áreas aproximadas", "Approximate areas")}
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 text-leaf px-2 py-1 text-[10px] font-semibold whitespace-nowrap">
            <ShieldCheck size={11} /> {t("Protegido", "Protected")}
          </span>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
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

        <div className="mt-3">
          <SightingsMap points={mapPoints} bbox={BBOX} heightClass="h-[52vh] min-h-[320px]" />
        </div>

        <div className="mt-3 flex items-center gap-4 text-[11px] flex-wrap">
          <Legend
            dotClass="bg-leaf/40 border border-leaf"
            label={t("Área verificada", "Verified area")}
          />
          <Legend
            dotClass="bg-orchid/40 border border-orchid"
            label={t("Área pendiente", "Pending area")}
          />
        </div>

        <div className="mt-3 rounded-2xl bg-card border border-border p-3 text-xs text-foreground/80 flex gap-2">
          <Info size={14} className="text-leaf shrink-0 mt-0.5" />
          <div>
            {mapLoading
              ? t("Cargando áreas…", "Loading areas…")
              : t(
                  `${mapPoints.length} áreas públicas aproximadas${q ? " para tu búsqueda" : " en México"}.`,
                  `${mapPoints.length} approximate public areas${q ? " for your search" : " in Mexico"}.`,
                )}
            {hidden > 0 && !q && (
              <>
                {" · "}
                <Lock size={11} className="inline" /> {hidden}{" "}
                {t("avistamientos sin ubicación pública.", "sightings with no public location.")}
              </>
            )}{" "}
            {t("No se publican coordenadas exactas.", "Exact coordinates are never published.")}
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
