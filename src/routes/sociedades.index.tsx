import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, ArrowRight, Check, Loader2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

export const Route = createFileRoute("/sociedades/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sociedades · OrquIDea" },
      {
        name: "description",
        content: "Sociedades orquideológicas activas en la Sierra de Oaxaca y regiones cercanas.",
      },
    ],
  }),
  component: SocietiesPage,
});

function SocietiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["societies", user?.id],
    queryFn: async () => {
      const [socs, mems] = await Promise.all([
        supabase
          .from("societies")
          .select("id, name, full_name, color, is_official, facebook_url")
          .order("is_official", { ascending: false })
          .order("name"),
        user
          ? supabase.from("society_members").select("society_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { society_id: string }[], error: null }),
      ]);
      if (socs.error) throw socs.error;
      if (mems.error) throw mems.error;
      const joinedIds = new Set((mems.data ?? []).map((m) => m.society_id));
      return (socs.data ?? []).map((s) => ({ ...s, joined: joinedIds.has(s.id) }));
    },
  });

  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggle(id: string, joined: boolean) {
    if (!user) return;
    setPendingId(id);
    if (joined) {
      await supabase.from("society_members").delete().eq("society_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("society_members").insert({ society_id: id, user_id: user.id });
    }
    await qc.invalidateQueries({ queryKey: ["societies", user.id] });
    setPendingId(null);
  }

  return (
    <Shell active="community">
      <div className="px-4 pt-5 pb-10">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-leaf/15 text-leaf">
            <Users size={18} />
          </div>
          <h1 className="text-2xl font-display font-semibold">Sociedades</h1>
        </div>
        <p className="mt-2 text-xs text-muted-foreground max-w-[34ch]">
          Únete a sociedades orquideológicas de la región para coordinar salidas, IDs y
          conservación.
        </p>

        {!user && (
          <div className="mt-4 rounded-2xl bg-accent/40 border border-border p-3 text-xs">
            <Link to="/login" className="font-semibold text-leaf underline">
              Entra
            </Link>{" "}
            para unirte y participar en los grupos.
          </div>
        )}

        <div className="mt-5 space-y-3">
          {isLoading && <div className="text-xs text-muted-foreground">Cargando…</div>}
          {(data ?? []).map((s) => (
            <div key={s.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-start gap-3">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl text-white font-bold text-sm uppercase shrink-0"
                  style={{ background: s.color || "hsl(140 35% 32%)" }}
                >
                  {s.name.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">{s.name}</span>
                    {s.is_official && (
                      <span className="rounded-full bg-leaf/10 text-leaf px-1.5 py-0.5 text-[9px] font-semibold uppercase">
                        Oficial
                      </span>
                    )}
                  </div>
                  {s.full_name && (
                    <div className="text-[11px] text-muted-foreground truncate">{s.full_name}</div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!user || pendingId === s.id}
                  onClick={() => toggle(s.id, s.joined)}
                  className={
                    "flex-1 rounded-xl py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition disabled:opacity-50 " +
                    (s.joined
                      ? "bg-leaf/10 text-leaf border border-leaf/30"
                      : "bg-leaf text-leaf-foreground")
                  }
                >
                  {pendingId === s.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : s.joined ? (
                    <>
                      <Check size={13} /> Miembro
                    </>
                  ) : (
                    "Unirme"
                  )}
                </button>
                {s.joined && (
                  <Link
                    to="/sociedades/$id"
                    params={{ id: s.id }}
                    className="rounded-xl bg-card border border-border px-3 py-2 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    Entrar <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
