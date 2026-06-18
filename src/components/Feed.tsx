import { Suspense, lazy, useEffect, useState } from "react";
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
  ShieldCheck,
  Target,
  Trophy,
} from "lucide-react";
import { Orchid } from "@/components/Orchid";
import type { SightingPoint } from "@/components/SightingsMap";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { StatusPill } from "@/components/StatusPill";
import { REGION } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useLang, formatRelativeTime } from "@/lib/i18n";

// Leaflet touches `window` at import time, so the map is loaded lazily and only
// rendered on the client (see DashboardMap's `mounted` guard) to keep the SSR
// home route happy.
const SightingsMap = lazy(() =>
  import("@/components/SightingsMap").then((m) => ({ default: m.SightingsMap })),
);

// National bounding box — covers the Mexican mainland and peninsulas.
const NATIONAL_BBOX = { min_lat: 14.3, max_lat: 32.8, min_lng: -118.5, max_lng: -86.6 };

/**
 * Public community feed. Reads the masking view `sightings_public` directly via
 * the browser client — `anon` has SELECT on that view, and the view applies the
 * conservation guardrail (sensitive taxa get fuzzed/NULL coords for non-owners).
 * Taxa are joined client-side via a tiny lookup to enrich status + display.
 */
type SightingRow = {
  id: string;
  user_id: string | null;
  taxon_id: string | null;
  sci_name: string | null;
  common_name: string | null;
  is_sensitive: boolean | null;
  is_masked: boolean | null;
  status: string | null;
  location_label: string | null;
  location_precision: string | null;
  observed_at: string | null;
  created_at: string;
  photo_url: string | null;
};

type TaxonStatusRow = {
  id: string;
  sci_name: string;
  conservation_status: string | null;
};

type ProfileSummary = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

async function fetchFeed() {
  const [feedRes, taxaRes] = await Promise.all([
    supabase
      .from("sightings_public")
      .select(
        "id, user_id, taxon_id, sci_name, common_name, is_sensitive, is_masked, status, location_label, location_precision, observed_at, created_at, photo_url",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("taxa").select("id, sci_name, conservation_status"),
  ]);
  if (feedRes.error) throw feedRes.error;
  if (taxaRes.error) throw taxaRes.error;

  const rows = ((feedRes.data as SightingRow[]) ?? []) as SightingRow[];
  const userIds = Array.from(
    new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id))),
  );
  const profilesById = new Map<string, ProfileSummary>();

  if (userIds.length > 0) {
    const profilesRes = await supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url")
      .in("id", userIds);
    if (profilesRes.error) throw profilesRes.error;
    for (const profile of (profilesRes.data ?? []) as ProfileSummary[]) {
      profilesById.set(profile.id, profile);
    }
  }

  const statusBySci = new Map<string, string | null>(
    (taxaRes.data as TaxonStatusRow[]).map((t) => [t.sci_name, t.conservation_status]),
  );
  return {
    rows,
    statusBySci,
    profilesById,
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

      <DashboardMap />

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
            profile={s.user_id ? (data.profilesById.get(s.user_id) ?? null) : null}
            status={s.sci_name ? (data.statusBySci.get(s.sci_name) ?? null) : null}
          />
        ))}
      </div>
    </div>
  );
}

function FeedCard({
  s,
  status,
  index,
  profile,
}: {
  s: SightingRow;
  status: string | null;
  index: number;
  profile: ProfileSummary | null;
}) {
  const { t, lang } = useLang();
  const sci = s.sci_name;
  const common = s.common_name;
  const masked = !!s.is_masked;
  const hiddenLocation = s.location_precision === "hidden";
  const profileLabel = profile?.display_name ?? profile?.handle ?? t("Spotter", "Spotter");

  return (
    <Link
      to="/s/$id"
      params={{ id: s.id }}
      className="stagger-in block rounded-3xl border border-border/70 bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-leaf/30 transition"
      style={{ animationDelay: index * 40 + "ms" }}
    >
      <article className="flex min-h-32">
        <div className="relative h-32 w-32 shrink-0 grid place-items-center overflow-hidden bg-gradient-to-br from-accent/40 to-secondary/30">
          {s.photo_url ? (
            <img
              src={s.photo_url}
              alt={
                sci
                  ? t(
                      `Foto de orquídea ${sci}${common ? ` (${common})` : ""} en ${s.location_label ?? "México"}`,
                      `Photo of orchid ${sci}${common ? ` (${common})` : ""} in ${s.location_label ?? "Mexico"}`,
                    )
                  : t(
                      `Foto de orquídea sin identificar en ${s.location_label ?? "México"}`,
                      `Photo of an unidentified orchid in ${s.location_label ?? "Mexico"}`,
                    )
              }
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <Orchid sciName={sci} size={82} />
          )}
          {!sci && !s.photo_url && (
            <div className="absolute inset-0 grid place-items-center gap-1 text-leaf pointer-events-none">
              <HelpCircle size={22} />
              <span className="text-[10px] font-semibold">
                {t("Sin identificar", "Unidentified")}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 p-4">
          <div className="mb-2 flex items-center gap-2">
            <ProfileAvatar
              url={profile?.avatar_url}
              label={profileLabel}
              size="sm"
              className="bg-accent text-muted-foreground"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[11px] font-semibold text-foreground/85">
                {profileLabel}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                @{profile?.handle ?? "spotter"}
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {sci ? t("ID sugerida", "Suggested ID") : t("Sin ID sugerida", "No suggested ID")}
              </div>
              <div className="font-display italic text-[15px] leading-tight truncate">
                {sci ?? t("Orquídea sin identificar", "Unidentified orchid")}
              </div>
              <div className="text-xs text-muted-foreground truncate">
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
            {hiddenLocation ? (
              <>
                <Lock size={13} /> {t("Ubicación oculta", "Location hidden")}
              </>
            ) : masked ? (
              <>
                <Lock size={13} /> {t("Área aproximada · ~", "Approximate area · ~")}
                {s.location_label ?? REGION}
              </>
            ) : (
              <>
                <MapPin size={13} /> {s.location_label ?? REGION}
              </>
            )}
          </div>

          {masked && (
            <div className="mt-2 rounded-lg bg-warn/10 text-[11px] text-foreground/75 px-2.5 py-1.5 leading-snug">
              {hiddenLocation
                ? t(
                    "El observador ocultó la ubicación pública de este registro.",
                    "The observer hid the public location for this record.",
                  )
                : t(
                    "Ubicación aproximada — el sitio exacto no se publica.",
                    "Approximate location — the exact site is not published.",
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

/**
 * Compact map preview on the home dashboard. Shows the same conservation-safe
 * approximate areas as the full /mapa page (each sighting as a fuzzed radius,
 * never an exact point) and links through to it.
 */
function DashboardMap() {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data } = useQuery({
    queryKey: ["dashboard-map-bbox", NATIONAL_BBOX],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sightings_in_bbox", NATIONAL_BBOX);
      if (error) throw error;
      return (data ?? []) as SightingPoint[];
    },
  });

  const points = (data ?? []).filter((p) => p.lat != null && p.lng != null);

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <div className="specimen-label">{t("Distribución", "Distribution")}</div>
          <h2 className="text-base font-display font-semibold tracking-tight">
            {t("Áreas aproximadas", "Approximate areas")}
          </h2>
        </div>
        <Link to="/mapa" className="text-xs font-semibold text-leaf hover:underline shrink-0">
          {t("Ver mapa completo →", "Open full map →")}
        </Link>
      </div>
      {mounted ? (
        <Suspense
          fallback={
            <div className="w-full aspect-[16/10] rounded-3xl bg-gradient-to-br from-leaf/15 via-accent/30 to-background animate-pulse" />
          }
        >
          <SightingsMap points={points} bbox={NATIONAL_BBOX} heightClass="aspect-[16/10]" />
        </Suspense>
      ) : (
        <div className="w-full aspect-[16/10] rounded-3xl bg-gradient-to-br from-leaf/15 via-accent/30 to-background animate-pulse" />
      )}
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck size={12} className="text-leaf shrink-0" />
        {t(
          "No se publican coordenadas exactas — solo áreas aproximadas.",
          "Exact coordinates are never published — only approximate areas.",
        )}
      </p>
    </section>
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
        <div
          key={i}
          className="flex min-h-32 rounded-3xl border border-border/70 bg-card overflow-hidden"
        >
          <div className="h-32 w-32 shrink-0 bg-muted animate-pulse" />
          <div className="flex-1 p-4 space-y-2">
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
