import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Globe,
  GraduationCap,
  Leaf,
  Loader2,
  Map,
  Plus,
  Shield,
} from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { Orchid } from "@/components/Orchid";
import { StatusPill } from "@/components/StatusPill";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/especies/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de especie · OrquIDea" },
      {
        name: "description",
        content:
          "Ficha de especie: taxonomía, conservación, avistamientos y enlaces a fuentes científicas.",
      },
    ],
  }),
  component: SpeciesDetailPage,
});

type WikiSummary = {
  title: string;
  extract: string;
  url: string;
  thumbnail: string | null;
  lang: "es" | "en";
};

/** Wikipedia REST summary, Spanish first with English fallback. CORS-enabled by Wikimedia. */
async function fetchWikiSummary(sciName: string): Promise<WikiSummary | null> {
  const slug = encodeURIComponent(sciName.trim().replaceAll(" ", "_"));
  for (const lang of ["es", "en"] as const) {
    try {
      const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${slug}`);
      if (!res.ok) continue;
      const j = (await res.json()) as {
        type?: string;
        title?: string;
        extract?: string;
        thumbnail?: { source?: string };
        content_urls?: { desktop?: { page?: string } };
      };
      if (j.type !== "standard" || !j.extract) continue;
      return {
        title: j.title ?? sciName,
        extract: j.extract,
        url: j.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${slug}`,
        thumbnail: j.thumbnail?.source ?? null,
        lang,
      };
    } catch {
      // network error — try next language / give up silently
    }
  }
  return null;
}

function externalSources(sciName: string) {
  const q = encodeURIComponent(sciName);
  return [
    {
      name: "EncicloVida",
      detail: "CONABIO · biodiversidad mexicana",
      href: `https://enciclovida.mx/busquedas/resultados?busqueda=basica&nombre=${q}`,
      icon: <Leaf size={15} />,
    },
    {
      name: "NaturaLista",
      detail: "iNaturalist México · observaciones",
      href: `https://www.naturalista.mx/taxa/search?q=${q}`,
      icon: <Globe size={15} />,
    },
    {
      name: "GBIF",
      detail: "Registros globales de la especie",
      href: `https://www.gbif.org/species/search?q=${q}`,
      icon: <Map size={15} />,
    },
    {
      name: "Kew · POWO",
      detail: "Plants of the World Online",
      href: `https://powo.science.kew.org/results?q=${q}`,
      icon: <BadgeCheck size={15} />,
    },
    {
      name: "Google Académico",
      detail: "Literatura científica",
      href: `https://scholar.google.com/scholar?q=%22${q}%22`,
      icon: <GraduationCap size={15} />,
    },
  ];
}

function SpeciesDetailPage() {
  const { id } = Route.useParams();

  const taxonQ = useQuery({
    queryKey: ["taxon", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxa")
        .select(
          "id, sci_name, common_name, genus, family, tribe, description, conservation_status, is_sensitive, ref_image_url, synonyms, region",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const t = taxonQ.data;

  const wikiQ = useQuery({
    queryKey: ["wiki-summary", t?.sci_name],
    enabled: !!t?.sci_name,
    staleTime: 1000 * 60 * 60,
    queryFn: () => fetchWikiSummary(t!.sci_name),
  });

  const sightingsQ = useQuery({
    queryKey: ["taxon-sightings", id],
    enabled: !!t,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sightings_public")
        .select("id, status, location_label, observed_at, created_at, is_masked")
        .eq("taxon_id", id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Shell active="species">
      <div className="px-4 pt-4 pb-10">
        <Link
          to="/especies"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> Herbario
        </Link>

        {taxonQ.isLoading && <div className="mt-4 h-56 rounded-3xl bg-muted animate-pulse" />}

        {taxonQ.isSuccess && !t && (
          <div className="mt-8 rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            Esta especie no existe en el catálogo.
          </div>
        )}

        {t && (
          <>
            {/* Specimen sheet */}
            <article className="sheet-card mt-4 rounded-3xl overflow-hidden">
              <div className="relative h-52 grid place-items-center bg-gradient-to-br from-accent/40 to-secondary/30">
                {t.ref_image_url ? (
                  <img
                    src={t.ref_image_url}
                    alt={t.sci_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Orchid sciName={t.sci_name} size={170} />
                )}
                <span className="absolute top-3 left-3 specimen-label rounded bg-background/90 px-2 py-1 border border-border/60">
                  Orchidaceae
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="font-display italic text-xl leading-tight">{t.sci_name}</h1>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.common_name ?? "Sin nombre común registrado"}
                    </div>
                  </div>
                  {t.conservation_status && <StatusPill status={t.conservation_status} />}
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <TaxRow label="Género" value={t.genus ?? t.sci_name.split(" ")[0]} italic />
                  <TaxRow label="Tribu" value={t.tribe ?? "—"} />
                  <TaxRow label="Región" value={t.region ?? REGION} />
                </dl>

                {t.synonyms && t.synonyms.length > 0 && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    <span className="specimen-label">Sinónimos · </span>
                    <span className="italic">{t.synonyms.join(", ")}</span>
                  </p>
                )}

                {t.is_sensitive && (
                  <div className="mt-3 rounded-xl bg-warn/10 border border-warn/30 px-3 py-2.5 text-xs text-foreground/80 flex gap-2">
                    <Shield size={14} className="text-warn shrink-0 mt-0.5" />
                    Especie sensible al saqueo — las ubicaciones de sus avistamientos se publican
                    solo como área amplia.
                  </div>
                )}

                {t.description && (
                  <p className="mt-3 text-sm text-foreground/85 leading-snug whitespace-pre-wrap">
                    {t.description}
                  </p>
                )}
              </div>
            </article>

            {/* Actions */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/mapa"
                search={{ especie: t.sci_name }}
                className="rounded-2xl bg-leaf text-leaf-foreground py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Map size={14} /> Ver en el mapa
              </Link>
              <Link
                to="/capture"
                className="rounded-2xl bg-orchid text-orchid-foreground py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Registrar avistamiento
              </Link>
            </div>

            {/* Wikipedia snippet */}
            <section className="mt-6">
              <div className="specimen-label">En la enciclopedia</div>
              {wikiQ.isLoading && (
                <div className="sheet-card mt-2 rounded-2xl p-4 text-xs text-muted-foreground inline-flex items-center gap-2 w-full">
                  <Loader2 size={13} className="animate-spin" /> Buscando resumen en Wikipedia…
                </div>
              )}
              {wikiQ.isSuccess && wikiQ.data && (
                <a
                  href={wikiQ.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sheet-card mt-2 block rounded-2xl p-4 hover:border-leaf/40 transition"
                >
                  <div className="flex gap-3">
                    {wikiQ.data.thumbnail && (
                      <img
                        src={wikiQ.data.thumbnail}
                        alt=""
                        className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border/60"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-foreground/85 leading-snug line-clamp-5">
                        {wikiQ.data.extract}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 text-[11px] text-leaf font-semibold inline-flex items-center gap-1">
                    Leer en Wikipedia ({wikiQ.data.lang === "es" ? "español" : "inglés"}){" "}
                    <ExternalLink size={11} />
                  </div>
                </a>
              )}
              {wikiQ.isSuccess && !wikiQ.data && (
                <div className="sheet-card mt-2 rounded-2xl p-4 text-xs text-muted-foreground">
                  No encontramos un artículo de Wikipedia para esta especie. Prueba las fuentes de
                  abajo.
                </div>
              )}
            </section>

            {/* External sources hub */}
            <section className="mt-6">
              <div className="specimen-label">Explora en la web</div>
              <div className="mt-2 space-y-2">
                {externalSources(t.sci_name).map((src) => (
                  <a
                    key={src.name}
                    href={src.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sheet-card flex items-center gap-3 rounded-2xl px-3.5 py-3 hover:border-leaf/40 transition"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf/10 text-leaf shrink-0">
                      {src.icon}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold leading-tight">{src.name}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {src.detail}
                      </span>
                    </span>
                    <ExternalLink size={14} className="text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            </section>

            {/* Recent community sightings */}
            <section className="mt-6">
              <div className="specimen-label">Avistamientos de la comunidad</div>
              {sightingsQ.isLoading && (
                <div className="mt-2 h-14 rounded-2xl bg-muted animate-pulse" />
              )}
              {sightingsQ.isSuccess && sightingsQ.data.length === 0 && (
                <div className="mt-2 rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Nadie la ha registrado todavía. ¡Sé la primera persona en encontrarla!
                </div>
              )}
              <ul className="mt-2 space-y-2">
                {(sightingsQ.data ?? [])
                  .filter((s) => s.id != null)
                  .map((s) => (
                    <li key={s.id}>
                      <Link
                        to="/s/$id"
                        params={{ id: s.id! }}
                        className="sheet-card flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-xs hover:border-leaf/40 transition"
                      >
                        <span className="truncate text-foreground/85">
                          {s.is_masked ? "Ubicación protegida" : (s.location_label ?? REGION)}
                        </span>
                        <span className="flex items-center gap-2 shrink-0 text-muted-foreground">
                          {new Date(s.observed_at ?? s.created_at ?? Date.now()).toLocaleDateString(
                            "es-MX",
                          )}
                          {s.status === "verified" && (
                            <BadgeCheck size={12} className="text-leaf" />
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}

function TaxRow({ label, value, italic }: { label: string; value: string; italic?: boolean }) {
  return (
    <div className="rounded-xl bg-accent/30 px-2 py-2 min-w-0">
      <dt className="specimen-label">{label}</dt>
      <dd className={"mt-0.5 text-xs font-medium truncate " + (italic ? "italic" : "")}>{value}</dd>
    </div>
  );
}
