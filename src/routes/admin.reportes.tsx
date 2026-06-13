import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShieldAlert, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";

type Tr = (es: string, en: string) => string;

export const Route = createFileRoute("/admin/reportes")({
  ssr: false,
  component: AdminReportsPage,
});

type Report = {
  id: string;
  kind: string | null;
  taxon_id: string | null;
  location_text: string | null;
  details: string | null;
  anonymous: boolean;
  status: "new" | "triaged" | "escalated" | "closed";
  created_at: string;
  reporter_id: string | null;
  reviewer_notes: string | null;
  taxon?: { sci_name: string | null } | null;
};

const STATUSES: Report["status"][] = ["new", "triaged", "escalated", "closed"];

function AdminReportsPage() {
  const { t, lang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<Report["status"] | "all">("new");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.role === "admin"));
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", filter],
    queryFn: async () => {
      let q = supabase
        .from("trade_reports")
        .select(
          "id, kind, taxon_id, location_text, details, anonymous, status, created_at, reporter_id, reviewer_notes, taxon:taxa(sci_name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Report[];
    },
    enabled: isAdmin === true,
  });

  async function updateStatus(id: string, status: Report["status"], notes?: string) {
    await supabase
      .from("trade_reports")
      .update({
        status,
        reviewer_notes: notes ?? undefined,
        reviewer_id: user!.id,
        resolved_at: status === "closed" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }

  if (loading || isAdmin === null) {
    return (
      <Shell>
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="animate-spin inline" size={16} />
        </div>
      </Shell>
    );
  }

  if (isAdmin === false) {
    return (
      <Shell>
        <div className="px-4 pt-10 text-center">
          <ShieldAlert size={36} className="mx-auto text-destructive" />
          <h1 className="mt-3 font-display text-xl">{t("Solo administradores", "Admins only")}</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {t(
              "Esta cola está reservada al equipo de OrchidArc.",
              "This queue is reserved for the OrchidArc team.",
            )}
          </p>
          <Link to="/" className="mt-5 inline-flex items-center gap-1 text-xs underline">
            {t("Volver", "Back")}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="px-4 pt-5 pb-10">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft size={12} /> {t("Volver", "Back")}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldCheck size={18} />
          </div>
          <h1 className="text-2xl font-display font-semibold">{t("Reportes", "Reports")}</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t("Cola de comercio ilegal — solo admins.", "Illegal-trade queue — admins only.")}
        </p>

        <div className="mt-4 flex gap-1.5 flex-wrap">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={
                "rounded-full px-3 py-1 text-[11px] font-medium border " +
                (filter === s
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground/70 border-border")
              }
            >
              {s === "all" ? t("Todos", "All") : statusLabel(s, t)}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && (
            <div className="text-xs text-muted-foreground">{t("Cargando…", "Loading…")}</div>
          )}
          {(data ?? []).length === 0 && !isLoading && (
            <div className="text-xs text-muted-foreground text-center py-10">
              {t("Sin reportes en esta cola.", "No reports in this queue.")}
            </div>
          )}
          {(data ?? []).map((r) => (
            <ReportCard key={r.id} report={r} onUpdate={updateStatus} t={t} lang={lang} />
          ))}
        </div>
      </div>
    </Shell>
  );
}

function statusLabel(s: Report["status"], t: Tr) {
  return {
    new: t("Nuevos", "New"),
    triaged: t("Triaje", "Triaged"),
    escalated: t("Escalados", "Escalated"),
    closed: t("Cerrados", "Closed"),
  }[s];
}

function ReportCard({
  report,
  onUpdate,
  t,
  lang,
}: {
  report: Report;
  onUpdate: (id: string, status: Report["status"], notes?: string) => Promise<void>;
  t: Tr;
  lang: "es" | "en";
}) {
  const [notes, setNotes] = useState(report.reviewer_notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  async function go(s: Report["status"]) {
    setBusy(s);
    await onUpdate(report.id, s, notes);
    setBusy(null);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
            statusColor(report.status)
          }
        >
          {statusLabel(report.status, t)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {new Date(report.created_at).toLocaleString(lang === "en" ? "en-US" : "es-MX", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
      </div>
      <div className="mt-2 text-xs">
        <div className="font-semibold">
          {kindLabel(report.kind, t)}
          {report.taxon?.sci_name && (
            <span className="font-normal italic"> · {report.taxon.sci_name}</span>
          )}
        </div>
        {report.location_text && (
          <div className="mt-0.5 text-foreground/80">📍 {report.location_text}</div>
        )}
        {report.details && (
          <div className="mt-1 text-foreground/80 whitespace-pre-wrap">{report.details}</div>
        )}
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {report.anonymous ? t("Anónimo", "Anonymous") : t("Identificado", "Identified")}
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder={t("Notas internas…", "Internal notes…")}
        className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
      />
      <div className="mt-2 flex gap-1.5 flex-wrap">
        {STATUSES.filter((s) => s !== report.status).map((s) => (
          <button
            key={s}
            onClick={() => go(s)}
            disabled={busy === s}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
          >
            {busy === s ? "…" : "→ " + statusLabel(s, t)}
          </button>
        ))}
      </div>
    </div>
  );
}

function statusColor(s: Report["status"]) {
  return {
    new: "bg-orchid/15 text-orchid",
    triaged: "bg-warn/15 text-warn",
    escalated: "bg-destructive/15 text-destructive",
    closed: "bg-leaf/15 text-leaf",
  }[s];
}

function kindLabel(k: string | null, t: Tr) {
  return (
    {
      market_sale: t("Mercado/Feria", "Market/Fair"),
      online_sale: t("Anuncio online", "Online listing"),
      field_extraction: t("Extracción en campo", "Field extraction"),
      other: t("Otro", "Other"),
    }[k ?? ""] ?? "—"
  );
}
