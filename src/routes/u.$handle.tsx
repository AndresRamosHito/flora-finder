import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  Flower2,
  Loader2,
  MapPin,
  MessageCircle,
  Star,
  Trophy,
} from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { Orchid } from "@/components/Orchid";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { StatusPill } from "@/components/StatusPill";
import { useAuth } from "@/hooks/use-auth";
import { getOrCreateDmThread } from "@/lib/dms";
import { supabase } from "@/integrations/supabase/client";
import { useLang, formatRelativeTime } from "@/lib/i18n";

export const Route = createFileRoute("/u/$handle")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Perfil de ${params.handle} · OrquIDea` },
      {
        name: "description",
        content: "Perfil público de spotter en OrquIDea: avistamientos, especies y actividad.",
      },
      { property: "og:title", content: `Perfil de ${params.handle} · OrquIDea` },
      { property: "og:description", content: "Perfil público de spotter de orquídeas." },
    ],
  }),
  component: PublicProfilePage,
});

type PublicProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  region: string | null;
  points: number;
  avatar_url: string | null;
  bio: string | null;
  favorite_taxon_id: string | null;
};

type PublicSighting = {
  id: string;
  taxon_id: string | null;
  sci_name: string | null;
  common_name: string | null;
  status: string | null;
  observed_at: string | null;
  created_at: string;
  photo_url: string | null;
};

type FavoriteTaxon = {
  id: string;
  sci_name: string;
  common_name: string | null;
  conservation_status: string | null;
};

async function fetchPublicProfile(handleOrId: string) {
  const key = decodeURIComponent(handleOrId).replace(/^@+/, "");

  const byHandle = await supabase
    .from("profiles")
    .select("id, handle, display_name, region, points, avatar_url, bio, favorite_taxon_id")
    .eq("handle", key)
    .maybeSingle();

  if (byHandle.error) throw byHandle.error;

  const profileRes = byHandle.data
    ? byHandle
    : await supabase
        .from("profiles")
        .select("id, handle, display_name, region, points, avatar_url, bio, favorite_taxon_id")
        .eq("id", key)
        .maybeSingle();

  if (profileRes.error) throw profileRes.error;
  const profile = profileRes.data as PublicProfile | null;
  if (!profile) return { profile: null, sightings: [], favorite: null };

  const [sightingsRes, favoriteRes] = await Promise.all([
    supabase
      .from("sightings_public")
      .select("id, taxon_id, sci_name, common_name, status, observed_at, created_at, photo_url")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(12),
    profile.favorite_taxon_id
      ? supabase
          .from("taxa")
          .select("id, sci_name, common_name, conservation_status")
          .eq("id", profile.favorite_taxon_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (sightingsRes.error) throw sightingsRes.error;
  if (favoriteRes.error) throw favoriteRes.error;

  return {
    profile,
    sightings: (sightingsRes.data ?? []) as PublicSighting[],
    favorite: favoriteRes.data as FavoriteTaxon | null,
  };
}

function PublicProfilePage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { handle } = Route.useParams();
  const [startingDm, setStartingDm] = useState(false);
  const [dmError, setDmError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-profile", handle],
    queryFn: () => fetchPublicProfile(handle),
  });

  const profile = data?.profile ?? null;
  const sightings = data?.sightings ?? [];
  const favorite = data?.favorite ?? null;
  const species = new Set(sightings.filter((s) => s.taxon_id).map((s) => s.taxon_id));
  const verified = sightings.filter((s) => s.status === "verified").length;
  const label = profile?.display_name ?? profile?.handle ?? t("Spotter", "Spotter");
  const canMessage = !!profile && !!user && profile.id !== user.id;

  async function startDm() {
    if (!profile) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (profile.id === user.id || startingDm) return;
    setStartingDm(true);
    setDmError(null);
    try {
      const threadId = await getOrCreateDmThread(profile.id);
      navigate({ to: "/mensajes/$id", params: { id: threadId } });
    } catch (err) {
      setDmError(err instanceof Error ? err.message : String(err));
    } finally {
      setStartingDm(false);
    }
  }

  return (
    <Shell active="community">
      <div className="px-4 pt-5 pb-10">
        {isLoading && <div className="h-44 rounded-3xl bg-muted animate-pulse" />}

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">
            {t("No pudimos cargar este perfil.", "We could not load this profile.")}
          </div>
        )}

        {!isLoading && !profile && !error && (
          <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
            <Flower2 size={28} className="mx-auto text-leaf" />
            <p className="mt-3 text-sm font-medium">
              {t("Perfil no encontrado", "Profile not found")}
            </p>
            <Link to="/" className="mt-3 inline-block text-xs font-semibold text-leaf">
              {t("Volver al inicio", "Back home")}
            </Link>
          </div>
        )}

        {profile && (
          <>
            <section className="rounded-3xl bg-gradient-to-br from-leaf to-leaf/75 text-leaf-foreground p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <ProfileAvatar
                  url={profile.avatar_url}
                  label={label}
                  size="lg"
                  className="bg-background/20 text-leaf-foreground ring-background/25"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-2xl font-semibold leading-tight truncate">
                    {label}
                  </div>
                  <div className="text-xs opacity-85 truncate">@{profile.handle ?? profile.id}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] opacity-85">
                    <MapPin size={11} /> {profile.region ?? REGION}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 text-xs opacity-90">
                    <Trophy size={12} /> {t("pts", "pts")}
                  </div>
                  <div className="font-display text-2xl font-semibold leading-none">
                    {profile.points ?? 0}
                  </div>
                </div>
              </div>

              {profile.bio && <p className="mt-4 text-sm leading-snug opacity-95">{profile.bio}</p>}

              {favorite && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3 py-1.5 text-xs">
                  <Star size={12} />
                  <span>{t("Favorita", "Favourite")}: </span>
                  <span className="italic font-semibold">{favorite.sci_name}</span>
                </div>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <ProfileStat n={sightings.length} label={t("avistamientos", "sightings")} />
                <ProfileStat n={species.size} label={t("especies", "species")} />
                <ProfileStat n={verified} label={t("verificados", "verified")} />
              </div>

              {profile.id !== user?.id && (
                <button
                  type="button"
                  onClick={startDm}
                  disabled={startingDm}
                  className="mt-4 w-full rounded-2xl bg-background/15 px-4 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-background/25 transition disabled:opacity-60"
                >
                  {startingDm ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                  {canMessage ? t("Mensaje", "Message") : t("Entra para enviar mensaje", "Sign in to message")}
                </button>
              )}

              {dmError && <div className="mt-2 text-xs text-background/90">{dmError}</div>}
            </section>

            <section className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  {t("Avistamientos recientes", "Recent sightings")}
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {t("perfil público", "public profile")}
                </span>
              </div>

              {sightings.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-xs text-muted-foreground">
                  {t("Sin avistamientos públicos todavía.", "No public sightings yet.")}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {sightings.map((s) => (
                    <Link
                      key={s.id}
                      to="/s/$id"
                      params={{ id: s.id }}
                      className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
                    >
                      <div className="aspect-square grid place-items-center bg-gradient-to-br from-accent/40 to-secondary/30">
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Orchid sciName={s.sci_name} size={86} />
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {formatRelativeTime(s.observed_at ?? s.created_at, lang)}
                        </div>
                        <div className="mt-1 font-display italic text-sm leading-tight truncate">
                          {s.sci_name ?? t("Orquídea sin identificar", "Unidentified orchid")}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {s.common_name && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {s.common_name}
                            </span>
                          )}
                          <StatusPill status={s.status} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}

function ProfileStat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-background/15 px-2 py-2">
      <div className="font-display text-lg font-semibold leading-none">{n}</div>
      <div className="mt-1 text-[10px] opacity-85 leading-tight">{label}</div>
    </div>
  );
}
