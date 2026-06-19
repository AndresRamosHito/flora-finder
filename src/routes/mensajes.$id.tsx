import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/hooks/use-auth";
import { fetchDmMessages, fetchDmThreadProfiles, sendDmMessage } from "@/lib/dms";
import { useLang, formatRelativeTime } from "@/lib/i18n";
import { profileHandleLabel, profileLabel } from "@/lib/profile-links";

export const Route = createFileRoute("/mensajes/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Conversación · OrquIDea" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MessageThread,
});

function MessageThread() {
  const { t, lang } = useLang();
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const profilesQ = useQuery({
    queryKey: ["dm-thread-profiles", id],
    enabled: !!user,
    queryFn: () => fetchDmThreadProfiles(id),
  });

  const messagesQ = useQuery({
    queryKey: ["dm-messages", id],
    enabled: !!user,
    queryFn: () => fetchDmMessages(id),
    refetchInterval: 5000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messagesQ.data]);

  if (loading || !user) return null;

  const messages = messagesQ.data ?? [];
  const profiles = profilesQ.data ?? new Map();
  const other = Array.from(profiles.values()).find((profile) => profile.id !== user.id) ?? null;

  async function send() {
    if (!user || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendDmMessage(id, user.id, body);
      setBody("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["dm-messages", id] }),
        qc.invalidateQueries({ queryKey: ["dm-threads", user.id] }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Shell active="community">
      <div className="flex flex-col h-[calc(100vh-60px-96px)]">
        <div className="px-4 pt-4 pb-3 border-b border-border/60 bg-background/95 backdrop-blur sticky top-[60px] z-10">
          <Link to="/mensajes" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ArrowLeft size={11} /> {t("Mensajes", "Messages")}
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <ProfileAvatar
              url={other?.avatar_url}
              label={profileLabel(other)}
              size="md"
              className="bg-accent text-muted-foreground"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{profileLabel(other)}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {profileHandleLabel(other)}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messagesQ.isLoading && (
            <div className="text-xs text-muted-foreground">{t("Cargando…", "Loading…")}</div>
          )}
          {messages.length === 0 && !messagesQ.isLoading && (
            <div className="text-xs text-muted-foreground text-center py-8">
              {t("Sin mensajes todavía.", "No messages yet.")}
            </div>
          )}
          {messages.map((message) => {
            const mine = message.sender_id === user.id;
            return (
              <div key={message.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                    (mine
                      ? "bg-leaf text-leaf-foreground rounded-br-sm"
                      : "bg-card border border-border rounded-bl-sm")
                  }
                >
                  <div className="whitespace-pre-wrap break-words">{message.body}</div>
                  <div className="mt-1 text-[9px] opacity-60">
                    {formatRelativeTime(message.created_at, lang)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="px-3 py-3 border-t border-border/60 bg-background flex gap-2 items-end"
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("Escribe un mensaje…", "Write a message…")}
            rows={1}
            maxLength={2000}
            className="flex-1 rounded-2xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20 resize-none"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="grid h-10 w-10 place-items-center rounded-full bg-leaf text-leaf-foreground disabled:opacity-50 shrink-0"
            aria-label={t("Enviar", "Send")}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </Shell>
  );
}
