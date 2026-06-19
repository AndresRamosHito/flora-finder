import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Trophy } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { profileHandleLabel, profileHref, profileLabel, sanitizeProfileSearch } from "@/lib/profile-links";

type SearchProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  region: string | null;
  points: number;
  avatar_url: string | null;
};

export function ProfileSearch({ className = "" }: { className?: string }) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const term = sanitizeProfileSearch(search);

  const { data, isLoading } = useQuery({
    queryKey: ["profile-search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, handle, display_name, region, points, avatar_url")
        .or(`handle.ilike.%${term}%,display_name.ilike.%${term}%`)
        .order("points", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as SearchProfile[];
    },
  });

  const profiles = data ?? [];
  const searching = term.length >= 2;

  return (
    <section className={className}>
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Buscar perfiles de spotters…", "Search spotter profiles…")}
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

      {searching && (
        <div className="mt-2 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          {isLoading && (
            <div className="p-3 text-xs text-muted-foreground">{t("Buscando…", "Searching…")}</div>
          )}
          {!isLoading && profiles.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">
              {t("Sin perfiles para esa búsqueda.", "No profiles match that search.")}
            </div>
          )}
          {profiles.map((profile) => (
            <a
              key={profile.id}
              href={profileHref(profile) ?? undefined}
              className="flex items-center gap-3 border-t first:border-t-0 border-border/60 px-3 py-2.5 hover:bg-leaf/5 transition"
            >
              <ProfileAvatar
                url={profile.avatar_url}
                label={profileLabel(profile)}
                size="md"
                className="bg-accent text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{profileLabel(profile)}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {profileHandleLabel(profile)}
                  {profile.region ? ` · ${profile.region}` : ""}
                </div>
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] text-warn font-semibold shrink-0">
                <Trophy size={11} /> {profile.points ?? 0}
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
