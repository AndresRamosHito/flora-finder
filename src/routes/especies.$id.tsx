import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  ExternalLink,
  Globe,
  GraduationCap,
  Leaf,
  Lock,
  Map,
  Plus,
  Shield,
} from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { Orchid } from "@/components/Orchid";
import { StatusPill } from "@/components/StatusPill";
import { LikeButton } from "@/components/LikeButton";
import { supabase } from "@/integrations/supabase/client";
import { selectTaxonById } from "@/lib/taxa";
import { fetchSpeciesObservations, fetchMyLikes } from "@/lib/likes";
import { useAuth } from "@/hooks/use-auth";
import { useLang, formatRelativeTime } from "@/lib/i18n";

export const Route = createFileRoute("/especies/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("taxa")
      .select("sci_name, common_name, description, conservation_status")
      .eq("id", params.id)
      .maybeSingle();
    return { taxon: data };
  },
  head: ({ params, loaderData }) => {
    const t = loaderData?.taxon;
    const url = `https://orchid-map-oaxaca.lovable.app/especies/${params.id}`;
    const title = t?.sci_name
      ? `${t.sci_name}${t.common_name ? ` (${t.common_name})` : ""} · Ficha de especie · OrquIDea`
      : "Ficha de especie · OrquIDea";
    const rawDesc =
      t?.description?.trim() ||
      (t?.sci_name
        ? `Ficha de ${t.sci_name}${t.common_name ? ` (${t.common_name})` : ""}: taxonomía, conservación y avistamientos comunitarios en México.`
        : "Ficha de especie de orquídea: taxonomía, conservación, avistamientos y enlaces a fuentes científicas.");
    const desc = rawDesc.length > 158 ? rawDesc.slice(0, 155) + "…" : rawDesc;
    const ogTitle = t?.sci_name ? `${t.sci_name} · Species Profile · OrquIDea` : title;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:title", content: ogTitle },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: t?.sci_name
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: t.sci_name,
                description: desc,
                about: {
                  "@type": "Taxon",
                  name: t.sci_name,
                  alternateName: t.common_name ?? undefined,
                },
                url,
                inLanguage: "es-MX",
                publisher: { "@type": "Organization", name: "OrchidArc" },
              }),
            },
          ]
        : [],
    };
  },
  component: SpeciesDetailPage,
});

/**
 * Internet Orchid Species Photo Encyclopedia (IOSPE, orchidspecies.com) has no
 * stable per-species URL or API, so we deep-link via a site-scoped web search,
 * which reliably lands on the exact species page as the top result.
 */
function iospeUrl(sciName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${sciName} site:orchidspecies.com`)}`;
}

function externalSources(sciName: string, tr: (es: string, en: string) => string) {
  const q = encodeURIComponent(sciName);
  return [
    {
      name: "EncicloVida",
      detail: tr("CONABIO · biodiversidad mexicana", "CONABIO · Mexican biodiversity"),
      href: `https://enciclovida.mx/busquedas/resultados?busqueda=basica&nombre=${q}`,
      icon: <Leaf size={15} />,
    },
    {
      name: "NaturaLista",
      detail: tr("iNaturalist México · observaciones", "iNaturalist Mexico · observations"),
      href: `https://www.naturalista.mx/taxa/search?q=${q}`,
      icon: <Globe size={15} />,
    },
    {
      name: "GBIF",
      detail: tr("Registros globales de la especie", "Global records for the species"),
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
      name: tr("Google Académico", "Google Scholar"),
      detail: tr("Literatura científica", "Scientific literature"),
      href: `https://scholar.google.com/scholar?q=%22${q}%22`,
      icon: <GraduationCap size={15} />,
    },
  ];
}

type TaxonDetail = {
  id: string;
  sci_name: string;
  common_name: string | null;
  genus: string | null;
  family: string | null;
  tribe: string | null;
  description: string | null;
  conservation_status: string | null;
  is_sensitive: boolean;
  is_native: boolean;
  ref_image_url: string | null;
  synonyms: string[] | null;
  region: string | null;
};

function SpeciesDetailPage() {
  const { t: tr, lang } = useLang();
  const { id } = Route.useParams();
  const { user } = useAuth();

  const taxonQ = useQuery({
    queryKey: ["taxon", id],
    queryFn: () =>
      selectTaxonById<Omit<TaxonDetail, "is_native">>(
        id,
        "id, sci_name, common_name, genus, family, tribe, description, conservation_status, is_sensitive, ref_image_url, synonyms, region",
      ),
  });

  const t = taxonQ.data;

  // Community observations of this species, ranked by likes. Drives both the
  // "see observations" gallery and the herbarium photo (most-liked wins).
  const obsQ = useQuery({
    queryKey: ["species-observations", id],
    enabled: !!t,
    queryFn: () => fetchSpeciesObservations(id),
  });

  const observations = obsQ.data ?? [];
  const obsIds = observations.map((o) => o.id);

  const myLikesQ = useQuery({
    queryKey: ["species-my-likes", id, user?.id, obsIds.length],
    enabled: !!user && obsIds.length > 0,
    queryFn: () => fetchMyLikes(obsIds, user!.id),
  });
  const myLikes = myLikesQ.data ?? new Set<string>();

  // Herbarium image priority: the most-liked community photo, then any admin
  // reference image, then the drawn placeholder.
  const topCommunityPhoto = observations.find((o) => o.photo_url)?.photo_url ?? null;
  const heroPhoto = topCommunityPhoto ?? t?.ref_image_url ?? null;

  return (
    <Shell active="species">
      <div className="px-4 pt-4 pb-10">
        <Link
          to="/especies"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> {tr("Herbario", "Herbarium")}
        </Link>

        {taxonQ.isLoading && <div className="mt-4 h-56 rounded-3xl bg-muted animate-pulse" />}

        {taxonQ.isSuccess && !t && (
          <div className="mt-8 rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            {tr("Esta especie no existe en el catálogo.", "This species isn't in the catalog.")}
          </div>
        )}

        {t && (
          <>
            {/* Specimen sheet */}
            <article className="sheet-card mt-4 rounded-3xl overflow-hidden">
              <div className="relative h-52 grid place-items-center bg-gradient-to-br from-accent/40 to-secondary/30">
                {heroPhoto ? (
                  <img src={heroPhoto} alt={t.sci_name} className="h-full w-full object-cover" />
                ) : (
                  <Orchid sciName={t.sci_name} size={170} />
                )}
                <span className="absolute top-3 left-3 specimen-label rounded bg-background/90 px-2 py-1 border border-border/60">
                  Orchidaceae
                </span>
                {topCommunityPhoto && (
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold text-leaf border border-border/60">
                    <BadgeCheck size={11} /> {tr("Foto de la comunidad", "Community photo")}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="font-display italic text-xl leading-tight">{t.sci_name}</h1>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.common_name ??
                        tr("Sin nombre común registrado", "No common name recorded")}
                    </div>
                  </div>
                  <span className="flex flex-col items-end gap-1 shrink-0">
                    {!t.is_native && (
                      <span className="rounded-full bg-warn/15 text-warn px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        {tr("Exótica", "Exotic")}
                      </span>
                    )}
                    {t.conservation_status && <StatusPill status={t.conservation_status} />}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <TaxRow
                    label={tr("Género", "Genus")}
                    value={t.genus ?? t.sci_name.split(" ")[0]}
                    italic
                  />
                  <TaxRow label={tr("Tribu", "Tribe")} value={t.tribe ?? "—"} />
                  <TaxRow
                    label={t.is_native ? tr("Región", "Region") : tr("Origen", "Origin")}
                    value={t.is_native ? (t.region ?? REGION) : tr("No nativa", "Non-native")}
                  />
                </dl>

                {!t.is_native && (
                  <div className="mt-3 rounded-xl bg-warn/10 border border-warn/30 px-3 py-2.5 text-xs text-foreground/80 flex gap-2">
                    <Globe size={14} className="text-warn shrink-0 mt-0.5" />
                    {tr(
                      "Especie no nativa de México. Se incluye para registrar ejemplares en colección; no forma parte de la flora silvestre ni aparece en el mapa de distribución.",
                      "Species not native to Mexico. It's included so you can log specimens in collection; it isn't part of the wild flora and won't appear on the distribution map.",
                    )}
                  </div>
                )}

                {t.synonyms && t.synonyms.length > 0 && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    <span className="specimen-label">{tr("Sinónimos · ", "Synonyms · ")}</span>
                    <span className="italic">{t.synonyms.join(", ")}</span>
                  </p>
                )}

                {t.is_sensitive && (
                  <div className="mt-3 rounded-xl bg-warn/10 border border-warn/30 px-3 py-2.5 text-xs text-foreground/80 flex gap-2">
                    <Shield size={14} className="text-warn shrink-0 mt-0.5" />
                    {tr(
                      "Especie sensible al saqueo — las ubicaciones de sus avistamientos se publican solo como área amplia.",
                      "Species vulnerable to poaching — its sighting locations are published only as a broad area.",
                    )}
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
            <div className={"mt-3 grid gap-2 " + (t.is_native ? "grid-cols-2" : "grid-cols-1")}>
              {t.is_native && (
                <Link
                  to="/mapa"
                  search={{ especie: t.sci_name }}
                  className="rounded-2xl bg-leaf text-leaf-foreground py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Map size={14} /> {tr("Ver en el mapa", "View on map")}
                </Link>
              )}
              <Link
                to="/capture"
                className="rounded-2xl bg-orchid text-orchid-foreground py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />{" "}
                {t.is_native
                  ? tr("Registrar avistamiento", "Log a sighting")
                  : tr("Registrar en colección", "Log in collection")}
              </Link>
            </div>

            {/* Reference encyclopedia — IOSPE */}
            <section className="mt-6">
              <div className="specimen-label">
                {tr("En la enciclopedia", "In the encyclopedia")}
              </div>
              <a
                href={iospeUrl(t.sci_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="sheet-card mt-2 block rounded-2xl p-4 hover:border-leaf/40 transition"
              >
                <div className="flex gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-leaf/10 text-leaf">
                    <BookOpen size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">
                      Internet Orchid Species Photo Encyclopedia
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground leading-snug">
                      {tr(
                        "La referencia fotográfica de orquídeas más completa (IOSPE, orchidspecies.com): descripción, cultivo, distribución y fotos de la especie.",
                        "The most complete orchid photo reference (IOSPE, orchidspecies.com): description, culture, distribution and photos of the species.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 text-[11px] text-leaf font-semibold inline-flex items-center gap-1">
                  {tr("Abrir en IOSPE", "Open in IOSPE")} <ExternalLink size={11} />
                </div>
              </a>
            </section>

            {/* See observations of this species */}
            <section className="mt-6">
              <div className="flex items-center justify-between gap-2">
                <div className="specimen-label">
                  {tr("Observaciones de esta especie", "Observations of this species")}
                </div>
                {observations.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">{observations.length}</span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {tr(
                  "Da me gusta a las mejores fotos: la más valorada se vuelve la imagen de la especie.",
                  "Like the best photos — the top-rated one becomes the species image.",
                )}
              </p>

              {obsQ.isLoading && <div className="mt-2 h-28 rounded-2xl bg-muted animate-pulse" />}

              {obsQ.isSuccess && observations.length === 0 && (
                <div className="mt-2 rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  {tr(
                    "Nadie la ha registrado todavía. ¡Sé la primera persona en encontrarla!",
                    "No one has logged it yet. Be the first to find it!",
                  )}
                </div>
              )}

              {observations.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {observations.map((o) => (
                    <div
                      key={o.id}
                      className="sheet-card rounded-2xl overflow-hidden flex flex-col"
                    >
                      <Link to="/s/$id" params={{ id: o.id }} className="block">
                        <div className="relative h-28 grid place-items-center bg-gradient-to-br from-accent/40 to-secondary/30">
                          {o.photo_url ? (
                            <img
                              src={o.photo_url}
                              alt={t.sci_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Orchid sciName={t.sci_name} size={72} />
                          )}
                          {o.status === "verified" && (
                            <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-leaf border border-border/60">
                              <BadgeCheck size={12} />
                            </span>
                          )}
                        </div>
                        <div className="px-2.5 pt-2 text-[11px]">
                          <div className="flex items-center gap-1 text-foreground/80 truncate">
                            {o.is_masked ? (
                              <>
                                <Lock size={11} className="shrink-0" />
                                <span className="truncate">
                                  {tr("Ubicación protegida", "Protected location")}
                                </span>
                              </>
                            ) : (
                              <span className="truncate">{o.location_label ?? REGION}</span>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            {formatRelativeTime(o.observed_at ?? o.created_at, lang)}
                          </div>
                        </div>
                      </Link>
                      <div className="px-2.5 pb-2 pt-1.5 mt-auto flex justify-end">
                        <LikeButton
                          sightingId={o.id}
                          count={o.like_count}
                          liked={myLikes.has(o.id)}
                          size="sm"
                          invalidateKeys={[
                            ["species-observations", id],
                            ["species-my-likes", id, user?.id],
                            ["taxa-top-photos"],
                          ]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* External sources hub */}
            <section className="mt-6">
              <div className="specimen-label">{tr("Explora en la web", "Explore on the web")}</div>
              <div className="mt-2 space-y-2">
                {externalSources(t.sci_name, tr).map((src) => (
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
