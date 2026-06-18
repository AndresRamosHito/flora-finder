import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flower2,
  BadgeCheck,
  HelpCircle,
  MapPin,
  Plus,
  Award,
  Search,
  Mountain,
  Edit3,
  Save,
  X,
  Camera,
  Loader2,
  Star,
} from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { Orchid } from "@/components/Orchid";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { StatusPill } from "@/components/StatusPill";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { habitatLabel } from "@/lib/habitats";

export const Route = createFileRoute("/lista")({
  head: () => ({
    meta: [
      { title: "Mi life list de orquﾃｭdeas ﾂｷ OrquIDea" },
      {
        name: "description",
        content:
          "Tu life list personal de orquﾃｭdeas observadas: avistamientos, especies ﾃｺnicas y verificados por la comunidad.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: ListPage,
});

type ProfileMeta = {
  display_name: string | null;
  handle: string | null;
  points: number;
  region: string | null;
  avatar_url: string | null;
  avatar_storage_path: string | null;
  bio: string | null;
  favorite_taxon_id: string | null;
};

type TaxonOption = {
  id: string;
  sci_name: string;
  common_name: string | null;
  conservation_status: string | null;
  is_sensitive: boolean;
};

type ProfileUpdatePayload = Partial<
  Pick<
    ProfileMeta,
    "display_name" | "region" | "bio" | "favorite_taxon_id" | "avatar_url" | "avatar_storage_path"
  >
>;

type ProfileUpdateTable = {
  update: (values: ProfileUpdatePayload) => {
    eq: (column: "id", value: string) => PromiseLike<{ error: { message: string } | null }>;
  };
};

function profilesUpdateTable() {
  return supabase.from("profiles") as unknown as ProfileUpdateTable;
}

function ListPage() {
  const { t, lang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [sRes, pRes, tRes] = await Promise.all([
        supabase
          .from("sightings")
          .select(
            "id, taxon_id, photo_url, location_label, observed_at, created_at, status, notes, altitude_m, altitude_accuracy_m, habitat_type, habitat_description",
          )
          .eq("user_id", user!.id)
          .order("observed_at", { ascending: false, nullsFirst: false }),
        supabase
          .from("profiles")
          .select(
            "display_name, handle, points, region, avatar_url, avatar_storage_path, bio, favorite_taxon_id",
          )
          .eq("id", user!.id)
          .maybeSingle(),
        supabase
          .from("taxa")
          .select("id, sci_name, common_name, conservation_status, is_sensitive")
          .order("sci_name", { ascending: true }),
      ]);

      if (sRes.error) throw sRes.error;
      if (pRes.error) throw pRes.error;
      if (tRes.error) throw tRes.error;

      const taxa = ((tRes.data ?? []) as TaxonOption[]).filter((tx) => Boolean(tx.id));
      const taxaById = new Map(taxa.map((tx) => [tx.id, tx]));
      return {
        sightings: sRes.data ?? [],
        profile: pRes.data as ProfileMeta | null,
        taxa,
        taxaById,
      };
    },
  });

  const [filter, setFilter] = useState<"all" | "verified" | "needs_id" | "pending">("all");
  const [search, setSearch] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    display_name: "",
    region: "",
    bio: "",
    favorite_taxon_id: "",
  });

  const sightings = useMemo(() => data?.sightings ?? [], [data]);
  const taxa = useMemo(() => data?.taxa ?? [], [data]);
  const profile = data?.profile ?? null;

  useEffect(() => {
    if (!profile || editingProfile) return;
    setDraft({
      display_name: profile.display_name ?? "",
      region: profile.region ?? "",
      bio: profile.bio ?? "",
      favorite_taxon_id: profile.favorite_taxon_id ?? "",
    });
  }, [profile, editingProfile]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sightings.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (q) {
        const tx = s.taxon_id ? data?.taxaById.get(s.taxon_id) : null;
        const habitat = habitatLabel(s.habitat_type, lang) ?? "";
        const hay =
          `${tx?.sci_name ?? ""} ${tx?.common_name ?? ""} ${s.location_label ?? ""} ${habitat} ${s.habitat_description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sightings, filter, search, data, lang]);

  const species = new Set(sightings.filter((s) => s.taxon_id).map((s) => s.taxon_id!));
  const verified = sightings.filter((s) => s.status === "verified").length;
  const favoriteTaxon = profile?.favorite_taxon_id
    ? data?.taxaById.get(profile.favorite_taxon_id)
    : null;
  const profileLabel = profile?.display_name ?? profile?.handle ?? t("spotter", "spotter");

  function resetProfileDraft() {
    setDraft({
      display_name: profile?.display_name ?? "",
      region: profile?.region ?? "",
      bio: profile?.bio ?? "",
      favorite_taxon_id: profile?.favorite_taxon_id ?? "",
    });
    setProfileError(null);
  }

  async function saveProfile() {
    if (!user || savingProfile) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      const profilesTable = profilesUpdateTable();
      const { error } = await profilesTable
        .update({
          display_name: draft.display_name.trim().slice(0, 80) || null,
          region: draft.region.trim().slice(0, 80) || null,
          bio: draft.bio.trim().slice(0, 280) || null,
          favorite_taxon_id: draft.favorite_taxon_id || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["my-list", user.id] });
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    if (!user || uploadingAvatar) return;
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setProfileError(t("Usa JPG, PNG o WebP.", "Use JPG, PNG, or WebP."));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError(t("La foto debe pesar menos de 2 MB.", "The photo must be under 2 MB."));
      return;
    }

    setUploadingAvatar(true);
    setProfileError(null);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("profile-photos").getPublicUrl(path);
      const profilesTable = profilesUpdateTable();
      const { error } = await profilesTable
        .update({ avatar_url: publicData.publicUrl, avatar_storage_path: path })
        .eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["my-list", user.id] });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function clearAvatar() {
    if (!user || uploadingAvatar) return;
    setUploadingAvatar(true);
    setProfileError(null);
    try {
      const oldPath = profile?.avatar_storage_path;
      const profilesTable = profilesUpdateTable();
      const { error } = await profilesTable
        .update({ avatar_url: null, avatar_storage_path: null })
        .eq("id", user.id);
      if (error) throw error;
      if (oldPath) await supabase.storage.from("profile-photos").remove([oldPath]);
      await qc.invalidateQueries({ queryKey: ["my-list", user.id] });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading || !user)
    return (
      <Shell active="list">
        <div className="p-6 text-sm text-muted-foreground">{t("Cargando窶ｦ", "Loading窶ｦ")}</div>
      </Shell>
    );

  return (
    <Shell active="list">
      <div className="px-4 pt-5 pb-10">
        <h1 className="sr-only">{t("Mi life list de orquﾃｭdeas", "My orchid life list")}</h1>

        <div className="rounded-3xl bg-gradient-to-br from-leaf to-leaf/70 text-leaf-foreground p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <ProfileAvatar
                url={profile?.avatar_url}
                label={profileLabel}
                size="lg"
                className="bg-background/20 text-leaf-foreground"
              />
              <div className="min-w-0">
                <div className="text-xs opacity-80 truncate">@{profile?.handle ?? "-"}</div>
                <div className="font-display text-xl font-semibold truncate">
                  {profile?.display_name ?? t("Mi lista", "My list")}
                </div>
                <div className="text-[11px] opacity-80 mt-1 inline-flex items-center gap-1">
                  <MapPin size={11} /> {profile?.region ?? REGION}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="inline-flex items-center gap-1 text-xs opacity-90">
                <Award size={12} /> {t("puntos", "points")}
              </div>
              <div className="font-display text-3xl font-semibold leading-none">
                {profile?.points ?? 0}
              </div>
            </div>
          </div>

          {(profile?.bio || favoriteTaxon) && (
            <div className="mt-4 space-y-2 text-xs leading-snug">
              {profile?.bio && <p className="opacity-95">{profile.bio}</p>}
              {favoriteTaxon && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-background/15 px-2.5 py-1">
                  <Star size={12} />
                  <span>{t("Favorita", "Favourite")}: </span>
                  <span className="italic">{favoriteTaxon.sci_name}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat n={sightings.length} label={t("avistamientos", "sightings")} />
            <Stat n={species.size} label={t("especies", "species")} />
            <Stat n={verified} label={t("verificados", "verified")} />
          </div>

          <button
            type="button"
            onClick={() => {
              resetProfileDraft();
              setEditingProfile((open) => !open);
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3 py-1.5 text-xs font-semibold hover:bg-background/25 transition"
          >
            {editingProfile ? <X size={13} /> : <Edit3 size={13} />}
            {editingProfile
              ? t("Cerrar ediciﾃｳn", "Close editor")
              : t("Editar perfil", "Edit profile")}
          </button>

          {editingProfile && (
            <form
              className="mt-4 rounded-2xl bg-background/15 p-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void saveProfile();
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-background/20 px-3 py-1.5 text-xs font-semibold hover:bg-background/30 transition">
                  {uploadingAvatar ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Camera size={13} />
                  )}
                  {t("Cambiar foto", "Change photo")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingAvatar}
                    onChange={uploadAvatar}
                  />
                </label>
                {profile?.avatar_url && (
                  <button
                    type="button"
                    onClick={() => void clearAvatar()}
                    disabled={uploadingAvatar}
                    className="rounded-full bg-background/10 px-3 py-1.5 text-xs font-semibold hover:bg-background/20 disabled:opacity-50"
                  >
                    {t("Quitar foto", "Remove photo")}
                  </button>
                )}
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                  {t("Nombre pﾃｺblico", "Public name")}
                </span>
                <input
                  value={draft.display_name}
                  onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
                  maxLength={80}
                  placeholder={t("Tu nombre o apodo", "Your name or nickname")}
                  className="w-full rounded-xl border border-background/25 bg-background/90 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-background/40"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                  {t("Regiﾃｳn", "Region")}
                </span>
                <input
                  value={draft.region}
                  onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
                  maxLength={80}
                  placeholder={REGION}
                  className="w-full rounded-xl border border-background/25 bg-background/90 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-background/40"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                  {t("Descripciﾃｳn breve", "Brief description")}
                </span>
                <textarea
                  value={draft.bio}
                  onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                  maxLength={280}
                  rows={3}
                  placeholder={t(
                    "Ej. Busco Laelia, tomo fotos en bosque mesﾃｳfilo窶ｦ",
                    "E.g. I look for Laelia and photograph cloud forest orchids窶ｦ",
                  )}
                  className="w-full resize-none rounded-xl border border-background/25 bg-background/90 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-background/40"
                />
                <span className="block text-right text-[10px] opacity-75">
                  {draft.bio.length}/280
                </span>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                  {t("Especie favorita", "Favourite species")}
                </span>
                <select
                  value={draft.favorite_taxon_id}
                  onChange={(e) => setDraft((d) => ({ ...d, favorite_taxon_id: e.target.value }))}
                  className="w-full rounded-xl border border-background/25 bg-background/90 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-background/40"
                >
                  <option value="">{t("Sin especie favorita", "No favourite species")}</option>
                  {taxa.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {tx.sci_name}
                      {tx.common_name ? ` ﾂｷ ${tx.common_name}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {profileError && (
                <div className="rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">
                  {profileError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-background text-leaf px-3 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {savingProfile ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {t("Guardar perfil", "Save profile")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetProfileDraft();
                    setEditingProfile(false);
                  }}
                  className="rounded-xl bg-background/10 px-3 py-2 text-sm font-semibold hover:bg-background/20"
                >
                  {t("Cancelar", "Cancel")}
                </button>
              </div>
            </form>
          )}
        </div>

        <h2 className="mt-6 font-display text-lg font-semibold">
          {t("Mi life list", "My life list")}
        </h2>

        {sightings.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  ["all", t("Todas", "All")],
                  ["verified", t("Verificadas", "Verified")],
                  ["needs_id", t("Necesitan ID", "Need ID")],
                  ["pending", t("En revisiﾃｳn", "Under review")],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFilter(v)}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors " +
                    (filter === v
                      ? "bg-leaf text-leaf-foreground border-leaf"
                      : "bg-card text-foreground/70 border-border hover:bg-accent")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  "Busca por especie, lugar o hﾃ｡bitat窶ｦ",
                  "Search by species, place, or habitat窶ｦ",
                )}
                className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </div>
          </div>
        )}

        {isLoading && (
          <p className="mt-3 text-sm text-muted-foreground">{t("Cargando窶ｦ", "Loading窶ｦ")}</p>
        )}
        {!isLoading && sightings.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center">
            <Flower2 className="mx-auto text-leaf" size={28} />
            <p className="mt-2 text-sm font-medium">
              {t("Aﾃｺn no has registrado orquﾃｭdeas.", "You haven't logged any orchids yet.")}
            </p>
            <Link
              to="/capture"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-orchid text-orchid-foreground px-3 py-1.5 text-xs font-semibold"
            >
              <Plus size={12} /> {t("Registrar la primera", "Log your first")}
            </Link>
          </div>
        )}

        {!isLoading && sightings.length > 0 && visible.length === 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("Ninguna observaciﾃｳn coincide con el filtro.", "No observations match the filter.")}
          </p>
        )}

        <ul className="mt-3 space-y-3">
          {visible.map((s) => {
            const tx = s.taxon_id ? data?.taxaById.get(s.taxon_id) : null;
            const habitat = habitatLabel(s.habitat_type, lang);
            return (
              <li
                key={s.id}
                className="sheet-card rounded-2xl overflow-hidden flex relative hover:border-leaf/40 transition"
              >
                <div className="w-24 h-24 shrink-0 grid place-items-center bg-accent/30">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Orchid sciName={tx?.sci_name ?? null} size={70} />
                  )}
                </div>
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display italic text-sm truncate">
                        {tx?.sci_name ?? t("Sin identificar", "Unidentified")}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {tx?.common_name ??
                          t("Pediremos ayuda a la comunidad", "We'll ask the community for help")}
                      </div>
                    </div>
                    {tx?.conservation_status && <StatusPill status={tx.conservation_status} />}
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>
                      {new Date(s.observed_at ?? s.created_at).toLocaleDateString(
                        lang === "en" ? "en-US" : "es-MX",
                      )}
                    </span>
                    <span>ﾂｷ</span>
                    <span className="truncate">{s.location_label ?? REGION}</span>
                  </div>
                  {(s.altitude_m != null || habitat) && (
                    <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <Mountain size={11} />
                      {s.altitude_m != null && (
                        <span>
                          {s.altitude_m} m
                          {s.altitude_accuracy_m ? ` ﾂｱ${s.altitude_accuracy_m} m` : ""}
                        </span>
                      )}
                      {s.altitude_m != null && habitat && <span>ﾂｷ</span>}
                      {habitat && <span className="truncate">{habitat}</span>}
                    </div>
                  )}
                  <div className="mt-1 text-[11px]">
                    {s.status === "verified" ? (
                      <span className="text-leaf inline-flex items-center gap-1">
                        <BadgeCheck size={11} /> {t("verificado", "verified")}
                      </span>
                    ) : s.status === "needs_id" ? (
                      <span className="text-orchid inline-flex items-center gap-1">
                        <HelpCircle size={11} /> {t("necesita ID", "needs ID")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("en revisiﾃｳn", "under review")}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to="/s/$id"
                  params={{ id: s.id }}
                  className="absolute inset-0"
                  aria-label={t(
                    `Ver avistamiento de ${tx?.sci_name ?? "orquﾃｭdea sin identificar"}`,
                    `View sighting of ${tx?.sci_name ?? "unidentified orchid"}`,
                  )}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </Shell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-background/15 py-2">
      <div className="font-display text-xl font-semibold">{n}</div>
      <div className="text-[10px] opacity-80 uppercase tracking-wide">{label}</div>
    </div>
  );
}
