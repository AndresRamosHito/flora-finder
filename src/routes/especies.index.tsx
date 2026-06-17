import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Search, Shield, X } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Orchid } from "@/components/Orchid";
import { StatusPill } from "@/components/StatusPill";
import { selectTaxaCatalog } from "@/lib/taxa";
import { fetchTopPhotos } from "@/lib/likes";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/especies/")({
  head: () => ({
    meta: [
      { title: "Herbario de orquídeas de México · OrquIDea" },
      {
        name: "description",
        content:
          "Herbario digital de orquídeas de México: fichas por género y especie con estado de conservación, sinónimos y enlaces a fuentes científicas.",
      },
      { property: "og:title", content: "Herbario de orquídeas de México · OrquIDea" },
      {
        property: "og:description",
        content: "Explora las orquídeas mexicanas por género y especie con fichas y conservación.",
      },
      { property: "og:url", content: "https://orchid-map-oaxaca.lovable.app/especies" },
    ],
    links: [{ rel: "canonical", href: "https://orchid-map-oaxaca.lovable.app/especies" }],
  }),

  component: SpeciesIndexPage,
});

type TaxonRow = {
  id: string;
  sci_name: string;
  common_name: string | null;
  genus: string | null;
  conservation_status: string | null;
  is_sensitive: boolean;
  is_native: boolean;
};

function SpeciesIndexPage() {
  const { t } = useLang();
  const { data, isLoading } = useQuery({
    queryKey: ["taxa-catalog"],
    queryFn: () =>
      selectTaxaCatalog<Omit<TaxonRow, "is_native">>(
        "id, sci_name, common_name, genus, conservation_status, is_sensitive",
      ),
  });

  // Community-evaluated photos: the most-liked observation per species becomes
  // its herbarium thumbnail.
  const { data: topPhotos } = useQuery({
    queryKey: ["taxa-top-photos"],
    queryFn: fetchTopPhotos,
    staleTime: 1000 * 60 * 5,
  });

  const [query, setQuery] = useState("");
  const [genus, setGenus] = useState<string | null>(null);
  const [showExotic, setShowExotic] = useState(false);

  // The herbarium is the wild Mexican flora; exotics are hidden unless asked for.
  const taxa = useMemo(
    () => (showExotic ? (data ?? []) : (data ?? []).filter((t) => t.is_native)),
    [data, showExotic],
  );
  const exoticCount = useMemo(() => (data ?? []).filter((t) => !t.is_native).length, [data]);

  const genera = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of taxa) {
      const g = t.genus || t.sci_name.split(" ")[0];
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [taxa]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q && !genus) return [];
    return taxa.filter((t) => {
      const g = t.genus || t.sci_name.split(" ")[0];
      if (genus && g !== genus) return false;
      if (q) {
        const hay = `${t.sci_name} ${t.common_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [taxa, q, genus]);

  return (
    <Shell active="species">
      <div className="px-4 pt-5 pb-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="specimen-label">{t("Herbario digital", "Digital herbarium")}</div>
            <h1 className="mt-0.5 text-2xl font-display font-semibold">
              {t("Especies", "Species")}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-[32ch]">
              {isLoading
                ? t("Cargando catálogo…", "Loading catalog…")
                : showExotic
                  ? t(
                      `${taxa.length} orquídeas (incluye exóticas) en ${genera.length} géneros.`,
                      `${taxa.length} orchids (incl. exotics) across ${genera.length} genera.`,
                    )
                  : t(
                      `${taxa.length} orquídeas mexicanas en ${genera.length} géneros.`,
                      `${taxa.length} Mexican orchids across ${genera.length} genera.`,
                    )}
            </p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-leaf/10 text-leaf shrink-0">
            <BookOpen size={18} />
          </span>
        </div>

        <div className="relative mt-4">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "Busca por nombre científico o común…",
              "Search by scientific or common name…",
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

        {!isLoading && exoticCount > 0 && (
          <button
            type="button"
            onClick={() => setShowExotic((v) => !v)}
            className={
              "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors " +
              (showExotic
                ? "bg-warn/15 text-warn border-warn/40"
                : "bg-card text-foreground/70 border-border hover:bg-accent")
            }
          >
            {showExotic
              ? t(`Ocultar exóticas (${exoticCount})`, `Hide exotics (${exoticCount})`)
              : t(
                  `Incluir exóticas y cultivadas (${exoticCount})`,
                  `Include exotics & cultivated (${exoticCount})`,
                )}
          </button>
        )}

        {genus && (
          <button
            type="button"
            onClick={() => setGenus(null)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-leaf"
          >
            <ArrowLeft size={13} /> {t("Todos los géneros", "All genera")}
          </button>
        )}

        {/* Genus directory — the explore entry point */}
        {!q && !genus && (
          <>
            <div className="specimen-label mt-6">{t("Explora por género", "Explore by genus")}</div>
            {isLoading && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {genera.map(([g, n], i) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenus(g)}
                  className="stagger-in sheet-card rounded-2xl px-3.5 py-3 text-left hover:border-leaf/40 transition"
                  style={{ animationDelay: Math.min(i, 20) * 25 + "ms" }}
                >
                  <div className="font-display italic text-sm leading-tight truncate">{g}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {n} {n === 1 ? t("especie", "species") : t("especies", "species")}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Species results */}
        {(q || genus) && (
          <>
            <div className="specimen-label mt-6">
              {genus ? (
                <>
                  {t("Género", "Genus")}{" "}
                  <span className="italic normal-case text-foreground">{genus}</span> ·{" "}
                  {results.length}
                </>
              ) : (
                <>
                  {results.length} {t("resultados", "results")}
                </>
              )}
            </div>
            {results.length === 0 && !isLoading && (
              <div className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                {t("Sin resultados para tu búsqueda.", "No results for your search.")}
              </div>
            )}
            <ul className="mt-3 space-y-2">
              {results.slice(0, 200).map((tx, i) => (
                <li
                  key={tx.id}
                  className="stagger-in"
                  style={{ animationDelay: Math.min(i, 15) * 25 + "ms" }}
                >
                  <Link
                    to="/especies/$id"
                    params={{ id: tx.id }}
                    className="sheet-card flex items-center gap-3 rounded-2xl p-3 hover:border-leaf/40 transition"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/40 overflow-hidden">
                      {topPhotos?.get(tx.id) ? (
                        <img
                          src={topPhotos.get(tx.id)}
                          alt={tx.sci_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Orchid sciName={tx.sci_name} size={44} />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-display italic text-sm leading-tight truncate">
                        {tx.sci_name}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {tx.common_name ??
                          t("Sin nombre común registrado", "No common name recorded")}
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
            {results.length > 200 && (
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                {t(
                  `Mostrando 200 de ${results.length} — afina tu búsqueda para ver más.`,
                  `Showing 200 of ${results.length} — refine your search to see more.`,
                )}
              </p>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
