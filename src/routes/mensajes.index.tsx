import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/hooks/use-auth";
import { fetchDmThreads } from "@/lib/dms";
import { useLang, formatRelativeTime } from "@/lib/i18n";
import { profileHandleLabel, profileLabel } from "@/lib/profile-links";

export const Route = createFileRoute("/mensajes/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mensajes · OrquIDea" },
      { name: "description", content: "Mensajes directos entre spotters de OrquIDea." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MessagesInbox,
});

function MessagesInbox() {
  const { t, lang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dm-threads", user?.id],
    enabled: !!user,
    queryFn: () => fetchDmThreads(user!.id),
  });

  if (loading || !user) return null;

  return (
    <Shell active="community">
      <div className="px-4 pt-5 pb-10">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-orchid/10 text-orchid">
            <MessageCircle size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold">{t("Mensajes", "Messages")}</h1>
            <p className="text-xs text-muted-foreground">
              {t("Conversaciones entre spotters.", "Conversations between spotters.")}
            </p>
          </div>
        </div>

        {isLoading && <div className="mt-5 text-xs text-muted-foreground">{t("Cargando…", "Loading…")}</div>}

        {error && (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {t("No pudimos cargar tus mensajes.", "We could not load your messages.")}
          </div>
        )}

        {!isLoading && !error && (data?.length ?? 0) === 0 && (
          <div className="mt-6 rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
            <MessageCircle size={28} className="mx-auto text-orchid" />
            <p className="mt-3 text-sm font-medium">
              {t("Sin mensajes todavía.", "No messages yet.")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "Abre el perfil de otro spotter y toca Mensaje para iniciar una conversación.",
                "Open another spotter profile and tap Message to start a conversation.",
              )}
            </p>
          </div>
        )}

        <div className="mt-5 space-y-2">
          {(data ?? []).map((thread) => (
            <Link
              key={thread.thread_id}
              to="/mensajes/$id"
              params={{ id: thread.thread_id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-orchid/30 hover:bg-orchid/5 transition"
            >
              <ProfileAvatar
                url={thread.other?.avatar_url}
                label={profileLabel(thread.other)}
                size="md"
                className="bg-accent text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{profileLabel(thread.other)}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {profileHandleLabel(thread.other)}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {thread.last_message?.body ?? t("Sin mensajes todavía", "No messages yet")}
                </div>
              </div>
              {thread.last_message && (
                <div className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelativeTime(thread.last_message.created_at, lang)}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
