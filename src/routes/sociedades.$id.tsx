import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/sociedades/$id")({
  ssr: false,
  component: SocietyDetail,
});

type Msg = {
  id: string;
  body: string | null;
  created_at: string;
  user_id: string | null;
  author?: { handle: string | null; avatar_url: string | null } | null;
};

function SocietyDetail() {
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
        .select("id, name, full_name, color")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["society-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("society_messages")
        .select(
          "id, body, created_at, user_id, author:profiles!society_messages_user_id_fkey(handle, avatar_url)",
        )
        .eq("society_id", id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
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
        () => qc.invalidateQueries({ queryKey: ["society-messages", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, user, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!user || !body.trim() || sending) return;
    setSending(true);
    const { error } = await supabase
      .from("society_messages")
      .insert({ society_id: id, user_id: user.id, body: body.trim().slice(0, 1000) });
    if (!error) setBody("");
    setSending(false);
  }

  if (!user) return null;

  return (
    <Shell active="community">
      <div className="flex flex-col h-[calc(100vh-60px-96px)]">
        <div className="px-4 pt-4 pb-3 border-b border-border/60 sticky top-[60px] bg-background/95 backdrop-blur z-10">
          <Link
            to="/sociedades"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
          >
            <ArrowLeft size={11} /> Sociedades
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="grid h-8 w-8 place-items-center rounded-lg text-white font-bold text-[11px] uppercase"
              style={{ background: society?.color || "hsl(140 35% 32%)" }}
            >
              {society?.name?.slice(0, 3) || "···"}
            </span>
            <div>
              <div className="font-semibold text-sm leading-tight">
                {society?.name ?? "Sociedad"}
              </div>
              {society?.full_name && (
                <div className="text-[10px] text-muted-foreground">{society.full_name}</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {isLoading && <div className="text-xs text-muted-foreground">Cargando…</div>}
          {(messages ?? []).length === 0 && !isLoading && (
            <div className="text-xs text-muted-foreground text-center py-8">
              Sin mensajes todavía. Sé el primero en saludar.
            </div>
          )}
          {(messages ?? []).map((m) => {
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
                      @{m.author?.handle ?? "anon"}
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
            placeholder="Escribe un mensaje…"
            rows={1}
            maxLength={1000}
            className="flex-1 rounded-2xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20 resize-none"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="grid h-10 w-10 place-items-center rounded-full bg-leaf text-leaf-foreground disabled:opacity-50 shrink-0"
            aria-label="Enviar"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </Shell>
  );
}
