import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  BookOpen,
  HelpCircle,
  MessageCircle,
  Flower2,
  Search,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { Orchid } from "@/components/Orchid";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { StatusPill } from "@/components/StatusPill";
import { LikeButton } from "@/components/LikeButton";
import { useAuth } from "@/hooks/use-auth";
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

/** Strip characters that have special meaning in PostgREST `.or()` filters. */
function sanitizeSearch(raw: string): string {
  return raw.replace(/[%,()*\\]/g, " ").trim();
}

async function fetchFeed(userId: string | null, search: string) {
  const term = sanitizeSearch(search);
  let feedQuery = supabase
    .from("sightings_public")
    .select(
      "id, user_id, taxon_id, sci_name, common_name, is_sensitive, is_masked, status, location_label, location_precision, observed_at, created_at, photo_url",
    )
    .order("created_at", { ascending: false })
    .limit(40);

  // When searching, match across the species name, common name and the public
  // location label of every sighting (not just the 40 most recent).
  if (term) {
    feedQuery = feedQuery.or(
      `sci_name.ilike.%${term}%,common_name.ilike.%${term}%,location_label.ilike.%${term}%`,
    );
  }

  const [feedRes, taxaRes] = await Promise.all([
    feedQuery,
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

  // Community likes for the visible sightings: one query gives both the public
  // counts and (filtered to the viewer) which ones they've already liked.
  const likeCountById = new Map<string, number>();
  const likedByMe = new Set<string>();
  const sightingIds = rows.map((row) => row.id);
  if (sightingIds.length > 0) {
    const likesRes = await supabase
      .from("sighting_likes")
      .select("sighting_id, user_id")
      .in("sighting_id", sightingIds);
    if (!likesRes.error) {
      for (const like of (likesRes.data ?? []) as { sighting_id: string; user_id: string }[]) {
        likeCountById.set(like.sighting_id, (likeCountById.get(like.sighting_id) ?? 0) + 1);
        if (userId && like.user_id === userId) likedByMe.add(like.sighting_id);
      }
    }
  }

  const statusBySci = new Map<string, string | null>(
    (taxaRes.data as TaxonStatusRow[]).map((t) => [t.sci_name, t.conservation_status]),
  );
  return {
    rows,
    statusBySci,
    profilesById,
    likeCountById,
    likedByMe,
  };
}

const FEED_QUERY_KEY = ["sightings-public-feed"] as const;

export function Feed() {
  const { t } = useLang();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Debounce so we don't hit the DB on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);
  const searching = debouncedSearch.length > 0;

  const { data, isLoading, error } = useQuery({
    queryKey: [...FEED_QUERY_KEY, userId, debouncedSearch],
    queryFn: () => fetchFeed(userId, debouncedSearch),
    placeholderData: (prev) => prev,
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

      <div className="relative mt-4">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            "Busca avistamientos por especie o lugar…",
            "Search sightings by species or place…",
          )}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-9 py-2.5 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
        />
        {search && (
          <button
            type="button"
            aria-label={t("Limpiar búsqueda", "Clear search")}
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {!searching && (
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
      )}

      {searching && (
        <div className="specimen-label mt-5">
          {isLoading
            ? t("Buscando…", "Searching…")
            : t(
                `${data?.rows.length ?? 0} resultados para “${debouncedSearch}”`,
                `${data?.rows.length ?? 0} results for “${debouncedSearch}”`,
              )}
        </div>
      )}

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
        {data && data.rows.length === 0 && (searching ? <NoSearchResults /> : <EmptyFeed />)}
        {data?.rows.map((s, i) => (
          <FeedCard
            key={s.id}
            s={s}
            index={i}
            profile={s.user_id ? (data.profilesById.get(s.user_id) ?? null) : null}
            status={s.sci_name ? (data.statusBySci.get(s.sci_name) ?? null) : null}
            likeCount={data.likeCountById.get(s.id) ?? 0}
            liked={data.likedByMe.has(s.id)}
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
  likeCount,
  liked,
}: {
  s: SightingRow;
  status: string | null;
  index: number;
  profile: ProfileSummary | null;
  likeCount: number;
  liked: boolean;
}) {
  const { t, lang } = useLang();
  const sci = s.sci_name;
  const common = s.common_name;
  const profileLabel = profile?.display_name ?? profile?.handle ?? t("Spotter", "Spotter");
  const photoAlt = sci
    ? t(
        `Foto de orquídea ${sci}${common ? ` (${common})` : ""}`,
        `Photo of orchid ${sci}${common ? ` (${common})` : ""}`,
      )
    : t("Foto de orquídea sin identificar", "Photo of an unidentified orchid");

  return (
    <article
      className="stagger-in rounded-3xl border border-border/70 bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-leaf/30 transition"
      style={{ animationDelay: index * 40 + "ms" }}
    >
      <div className="flex min-h-40">
        <Link to="/s/$id" params={{ id: s.id }} className="block h-40 w-40 shrink-0">
          <div className="relative h-40 w-40 grid place-items-center overflow-hidden bg-gradient-to-br from-accent/40 to-secondary/30">
            {s.photo_url ? (
              <img
                src={s.photo_url}
                alt={photoAlt}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <Orchid sciName={sci} size={108} />
            )}
            {!sci && !s.photo_url && (
              <div className="absolute inset-0 grid place-items-center gap-1 text-leaf pointer-events-none">
                <HelpCircle size={24} />
                <span className="text-[10px] font-semibold">
                  {t("Sin identificar", "Unidentified")}
                </span>
              </div>
            )}
          </div>
        </Link>

        <Link to="/s/$id" params={{ id: s.id }} className="block min-w-0 flex-1 p-4">
          <div className="flex items-center gap-3">
            <ProfileAvatar
              url={profile?.avatar_url}
              label={profileLabel}
              size="md"
              className="h-11 w-11 bg-accent text-muted-foreground"
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[15px] font-semibold text-foreground">
                {profileLabel}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                @{profile?.handle ?? "spotter"}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {sci ? t("ID sugerida", "Suggested ID") : t("Sin ID sugerida", "No suggested ID")}
              </div>
              <div className="font-display italic text-[16px] leading-tight truncate">
                {sci ?? t("Orquídea sin identificar", "Unidentified orchid")}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {common ??
                  t("Ayuda a la comunidad a identificarla", "Help the community identify it")}
              </div>
            </div>
            {status && <StatusPill status={status} />}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>{formatRelativeTime(s.observed_at ?? s.created_at, lang)}</span>
            <ObservationStatusBadge status={s.status} hasTaxon={Boolean(s.taxon_id)} />
          </div>
        </Link>
      </div>

      {/* Full-width action bar. The long buttons fill the card's base; the like
          button stops propagation so it never navigates. */}
      <div className="flex items-stretch border-t border-border/60 divide-x divide-border/60 overflow-hidden">
        <Link
          to="/s/$id"
          params={{ id: s.id }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-leaf/10 py-3 text-xs font-semibold text-leaf hover:bg-leaf/15 transition"
        >
          <MessageCircle size={15} /> {t("Discusión", "Discussion")}
        </Link>
        {sci && s.taxon_id && (
          <Link
            to="/especies/$id"
            params={{ id: s.taxon_id }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-warn/10 py-3 text-xs font-semibold text-warn hover:bg-warn/15 transition"
          >
            <BookOpen size={15} /> {t("Ver ficha", "View profile")}
          </Link>
        )}
        <div className="flex items-center justify-center bg-orchid/10 px-3 py-1.5 hover:bg-orchid/15 transition">
          <LikeButton
            sightingId={s.id}
            count={likeCount}
            liked={liked}
            invalidateKeys={[[...FEED_QUERY_KEY]]}
          />
        </div>
      </div>
    </article>
  );
}

function ObservationStatusBadge({
  status,
  hasTaxon,
}: {
  status: string | null;
  hasTaxon: boolean;
}) {
  const { t } = useLang();

  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-leaf/45 bg-leaf/10 px-2.5 py-1 font-semibold text-leaf">
        <BadgeCheck size={12} /> {t("Verificada", "Verified")}
      </span>
    );
  }

  if (status === "needs_id" || !hasTaxon) {
    return (
      <span className="inline-flex items-center rounded-full border border-orchid/45 bg-orchid/10 px-2.5 py-1 font-semibold text-orchid">
        {t("Necesita ID", "Needs ID")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-warn/55 bg-warn/10 px-2.5 py-1 font-semibold text-warn">
      {t("En revisión", "Under review")}
    </span>
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

function NoSearchResults() {
  const { t } = useLang();
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-leaf/10 text-leaf">
        <Search size={20} />
      </div>
      <p className="mt-3 text-sm text-foreground/80 font-medium">
        {t("Sin avistamientos para tu búsqueda.", "No sightings match your search.")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "Prueba con otra especie o lugar, o explora el herbario completo.",
          "Try another species or place, or explore the full herbarium.",
        )}
      </p>
      <Link
        to="/especies"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-leaf text-leaf-foreground px-4 py-2 text-xs font-semibold"
      >
        <BookOpen size={13} /> {t("Ir al herbario", "Browse herbarium")}
      </Link>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex min-h-40 rounded-3xl border border-border/70 bg-card overflow-hidden"
        >
          <div className="h-40 w-40 shrink-0 bg-muted animate-pulse" />
          <div className="flex-1 p-4 space-y-2">
            <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
