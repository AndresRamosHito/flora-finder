import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Loader2, Users, Check, AlertCircle, LogOut } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/sociedades/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chat de sociedad · OrquIDea" },
      {
        name: "description",
        content:
          "Chat privado de la sociedad orquideológica: conversa con miembros verificados en tiempo real.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SocietyDetail,
});

type Msg = {
  id: string;
  body: string | null;
  created_at: string;
  user_id: string | null;
  author?: { handle: string | null; display_name: string | null } | null;
};

function SocietyDetail() {
  const { t } = useLang();
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: society } = useQuery({
    queryKey: ["society", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("societies")
        .select("id, name, full_name, color, facebook_url, is_official")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const membershipQ = useQuery({
    queryKey: ["society-membership", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("society_members")
        .select("society_id, user_id, joined_at")
        .eq("society_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isMember = !!membershipQ.data;

  const messagesQ = useQuery({
    queryKey: ["society-messages", id, isMember],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("society_messages")
        .select("id, body, created_at, user_id")
        .eq("society_id", id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      const rows = (data ?? []) as Omit<Msg, "author">[];
      const userIds = Array.from(
        new Set(rows.map((m) => m.user_id).filter((uid): uid is string => Boolean(uid))),
      );

      if (userIds.length === 0) return rows as Msg[];

      const profiles = await supabase
        .from("profiles")
        .select("id, handle, display_name")
        .in("id", userIds);
      if (profiles.error) throw profiles.error;

      const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));
      return rows.map((m) => ({
        ...m,
        author: m.user_id ? (byId.get(m.user_id) ?? null) : null,
      })) as Msg[];
    },
    enabled: !!user && isMember,
  });

  useEffect(() => {
    if (!user || !isMember) return;
    const ch = supabase
      .channel(`soc:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "society_messages",
          filter: `society_id=eq.${id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["society-messages", id, true] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, user, isMember, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messagesQ.data]);

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [membershipPending, setMembershipPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinSociety() {
    if (!user || membershipPending) return;
    setMembershipPending(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("society_members")
        .upsert({ society_id: id, user_id: user.id }, { onConflict: "society_id,user_id" });
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["society-membership", id, user.id] }),
        qc.invalidateQueries({ queryKey: ["societies", user.id] }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMembershipPending(false);
    }
  }

  async function leaveSociety() {
    if (!user || membershipPending) return;
    setMembershipPending(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("society_members")
        .delete()
        .eq("society_id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["society-membership", id, user.id] }),
        qc.invalidateQueries({ queryKey: ["societies", user.id] }),
        qc.invalidateQueries({ queryKey: ["society-messages", id, true] }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMembershipPending(false);
    }
  }

  async function send() {
    if (!user || !isMember || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("society_messages")
        .insert({ society_id: id, user_id: user.id, body: body.trim().slice(0, 1000) });
      if (error) throw error;
      setBody("");
      await qc.invalidateQueries({ queryKey: ["society-messages", id, true] });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  if (loading || !user) return null;

  const messages = messagesQ.data ?? [];
  const messagesError = messagesQ.error instanceof Error ? messagesQ.error.message : null;

  return (
    <Shell active="community">
      <div className="flex flex-col h-[calc(100vh-60px-96px)]">
        <div className="px-4 pt-4 pb-3 border-b border-border/60 sticky top-[60px] bg-background/95 backdrop-blur z-10">
          <Link
            to="/sociedades"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
          >
            <ArrowLeft size={11} /> {t("Sociedades", "Societies")}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="grid h-8 w-8 place-items-center rounded-lg text-white font-bold text-[11px] uppercase"
              style={{ background: society?.color || "hsl(140 35% 32%)" }}
            >
              {society?.name?.slice(0, 3) || "···"}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-sm leading-tight truncate">
                {society?.name ?? t("Sociedad", "Society")}
              </h1>
              {society?.full_name && (
                <div className="text-[10px] text-muted-foreground truncate">{society.full_name}</div>
              )}
            </div>
            {isMember && (
              <button
                type="button"
                onClick={leaveSociety}
                disabled={membershipPending}
                className="rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground inline-flex items-center gap-1 disabled:opacity-50"
              >
                <LogOut size={11} /> {t("Salir", "Leave")}
              </button>
            )}
          </div>
        </div>

        {(error || messagesError) && (
          <div className="mx-4 mt-3 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive flex gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error || messagesError}
          </div>
        )}

        {!isMember ? (
          <div className="flex-1 grid place-items-center px-6 text-center">
            <div className="rounded-3xl border border-border bg-card p-6 w-full">
              <Users size={28} className="mx-auto text-leaf" />
              <h2 className="mt-3 font-display text-lg font-semibold">
                {t("Únete para entrar al chat", "Join to enter the chat")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-snug">
                {t(
                  "Los mensajes de la sociedad son privados para sus miembros. Al unirte podrás leer y escribir en el chat.",
                  "Society messages are private to members. After joining, you can read and write in the chat.",
                )}
              </p>
              {society?.facebook_url && (
                <a
                  href={society.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs text-leaf font-semibold"
                >
                  {t("Ver enlace público", "View public link")}
                </a>
              )}
              <button
                type="button"
                onClick={joinSociety}
                disabled={membershipPending || membershipQ.isLoading}
                className="mt-4 w-full rounded-2xl bg-leaf text-leaf-foreground py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {membershipPending || membershipQ.isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {t("Unirme", "Join")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messagesQ.isLoading && (
                <div className="text-xs text-muted-foreground">{t("Cargando…", "Loading…")}</div>
              )}
              {messages.length === 0 && !messagesQ.isLoading && !messagesError && (
                <div className="text-xs text-muted-foreground text-center py-8">
                  {t(
                    "Sin mensajes todavía. Sé el primero en saludar.",
                    "No messages yet. Be the first to say hello.",
                  )}
                </div>
              )}
              {messages.map((m) => {
                const mine = m.user_id === user.id;
                return (
                  <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                    <div
                      className={
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                        (mine
                          ? "bg-leaf text-leaf-foreground rounded-br-sm"
                          : "bg-card border border-border rounded-bl-sm")
                      }
                    >
                      {!mine && (
                        <div className="text-[10px] font-semibold opacity-70 mb-0.5">
                          @{m.author?.handle ?? m.author?.display_name ?? "anon"}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
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
                maxLength={1000}
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
          </>
        )}
      </div>
    </Shell>
  );
}
