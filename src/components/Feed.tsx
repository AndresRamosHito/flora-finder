import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  BookOpen,
  HelpCircle,
  Lock,
  MapPin,
  MessageCircle,
  Flower2,
  Target,
  Trophy,
} from "lucide-react";
import { Orchid } from "@/components/Orchid";
import { StatusPill } from "@/components/StatusPill";
import { REGION } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useLang, formatRelativeTime } from "@/lib/i18n";

/**
 * Public community feed. Reads the masking view `sightings_public` directly via
 * the browser client — `anon` has SELECT on that view, and the view applies the
 * conservation guardrail (sensitive taxa get fuzzed/NULL coords for non-owners).
 * Taxa are joined client-side via a tiny lookup to enrich status + display.
 */
type SightingRow = {
  id: string;
  taxon_id: string | null;
  sci_name: string | null;
  common_name: string | null;
  is_sensitive: boolean | null;
  is_masked: boolean | null;
  status: string | null;
  location_label: string | null;
  observed_at: string | null;
  created_at: string;
  photo_url: string | null;
};

type TaxonStatusRow = {
  id: string;
  sci_name: string;
  conservation_status: string | null;
};

async function fetchFeed() {
  const [feedRes, taxaRes] = await Promise.all([
    supabase
      .from("sightings_public")
      .select(
        "id, taxon_id, sci_name, common_name, is_sensitive, is_masked, status, location_label, observed_at, created_at, photo_url",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("taxa").select("id, sci_name, conservation_status"),
  ]);
  if (feedRes.error) throw feedRes.error;
  if (taxaRes.error) throw taxaRes.error;
  const statusBySci = new Map<string, string | null>(
    (taxaRes.data as TaxonStatusRow[]).map((t) => [t.sci_name, t.conservation_status]),
  );
  return {
    rows: (feedRes.data as SightingRow[]) ?? [],
    statusBySci,
  };
}

export function Feed() {
  const { t } = useLang();
  const { data, isLoading, error } = useQuery({
    queryKey: ["sightings-public-feed"],
    queryFn: fetchFeed,
  });

  return (
    <div className="px-4 pt-5">
      <div className="specimen-label">{t("Orquídeas de México", "Orchids of Mexico")}</div>
      <h1 className="mt-0.5 text-2xl font-display font-semibold tracking-tight">
        {t("Avistamientos recientes", "Recent sightings")}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {t(
          "Lo que la comunidad observa en todo el país.",
          "What the community is spotting across the country.",
        )}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ExploreCard
          to="/especies"
          icon={<BookOpen size={16} />}
          label={t("Herbario", "Herbarium")}
          hint={t("1300+ especies", "1300+ species")}
          tone="bg-leaf/10 text-leaf"
        />
        <ExploreCard
          to="/retos"
          icon={<Target size={16} />}
          label={t("Retos", "Quests")}
          hint={t("Salidas y misiones", "Outings & missions")}
          tone="bg-orchid/10 text-orchid"
        />
        <ExploreCard
          to="/ranking"
          icon={<Trophy size={16} />}
          label={t("Ranking", "Ranking")}
          hint={t("Top spotters", "Top spotters")}
          tone="bg-warn/10 text-warn"
        />
      </div>

      <div className="mt-5 space-y-4">
        {isLoading && <FeedSkeleton />}
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">
            {t(
              "No pudimos cargar el muro. Intenta de nuevo en un momento.",
              "We couldn't load the feed. Please try again in a moment.",
            )}
          </div>
        )}
        {data && data.rows.length === 0 && <EmptyFeed />}
        {data?.rows.map((s, i) => (
          <FeedCard
            key={s.id}
            s={s}
            index={i}
            status={s.sci_name ? (data.statusBySci.get(s.sci_name) ?? null) : null}
          />
        ))}
      </div>
    </div>
  );
}

function FeedCard({ s, status, index }: { s: SightingRow; status: string | null; index: number }) {
  const { t, lang } = useLang();
  const sci = s.sci_name;
  const common = s.common_name;
  const masked = !!s.is_masked;
  return (
    <Link
      to="/s/$id"
      params={{ id: s.id }}
      className="stagger-in block rounded-3xl border border-border/70 bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-leaf/30 transition"
      style={{ animationDelay: index * 40 + "ms" }}
    >
      <article>
        <div className="relative h-44 grid place-items-center bg-gradient-to-br from-accent/40 to-secondary/30">
          <Orchid sciName={sci} size={150} />
          {!sci && (
            <div className="absolute inset-0 grid place-items-center gap-2 text-leaf">
              <HelpCircle size={28} />
              <span className="text-xs font-semibold">{t("Sin identificar", "Unidentified")}</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-display italic text-[15px] leading-tight">
                {sci ?? t("Orquídea sin identificar", "Unidentified orchid")}
              </div>
              <div className="text-xs text-muted-foreground">
                {common ??
                  t("Ayuda a la comunidad a identificarla", "Help the community identify it")}
              </div>
            </div>
            {status && <StatusPill status={status} />}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span>{formatRelativeTime(s.observed_at ?? s.created_at, lang)}</span>
            <span>·</span>
            {s.status === "verified" ? (
              <span className="inline-flex items-center gap-1 text-leaf font-medium">
                <BadgeCheck size={12} /> {t("verificado", "verified")}
              </span>
            ) : s.status === "needs_id" || !s.taxon_id ? (
              <span className="text-orchid font-medium">{t("necesita ID", "needs ID")}</span>
            ) : (
              <span>{t("en revisión", "under review")}</span>
            )}
          </div>

          <div
            className={
              "mt-2 flex items-center gap-1.5 text-xs " +
              (masked ? "text-muted-foreground" : "text-foreground/80")
            }
          >
            {masked ? (
              <>
                <Lock size={13} /> {t("Ubicación protegida · ~", "Protected location · ~")}
                {REGION}
              </>
            ) : (
              <>
                <MapPin size={13} /> {s.location_label ?? REGION}
              </>
            )}
          </div>

          {masked && (
            <div className="mt-2 rounded-lg bg-warn/10 text-[11px] text-foreground/75 px-2.5 py-1.5 leading-snug">
              {t(
                "Especie sensible — ubicación exacta oculta para prevenir el saqueo.",
                "Sensitive species — exact location hidden to prevent poaching.",
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={12} /> {t("Discusión", "Discussion")}
            </span>
            {sci && (
              <span className="inline-flex items-center gap-1">
                <BookOpen size={12} /> {t("Ver ficha", "View profile")}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

function ExploreCard({
  to,
  icon,
  label,
  hint,
  tone,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  tone: string;
}) {
  return (
    <Link to={to} className="sheet-card rounded-2xl p-3 hover:border-leaf/40 transition">
      <span className={"grid h-8 w-8 place-items-center rounded-xl " + tone}>{icon}</span>
      <span className="mt-2 block text-xs font-semibold leading-tight">{label}</span>
      <span className="block text-[10px] text-muted-foreground leading-tight mt-0.5">{hint}</span>
    </Link>
  );
}

function EmptyFeed() {
  const { t } = useLang();
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-leaf/10 text-leaf">
        <Flower2 size={22} />
      </div>
      <p className="mt-3 text-sm text-foreground/80 font-medium">
        {t("Aún no hay avistamientos registrados.", "No sightings recorded yet.")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "Cuando los primeros spotters registren orquídeas, aparecerán aquí.",
          "When the first spotters log orchids, they'll appear here.",
        )}
      </p>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-3xl border border-border/70 bg-card overflow-hidden">
          <div className="h-44 bg-muted animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
