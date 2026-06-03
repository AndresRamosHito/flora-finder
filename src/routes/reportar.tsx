import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, ArrowLeft, Check, Loader2, AlertCircle, Lock } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/reportar")({
  head: () => ({
    meta: [
      { title: "Reportar comercio ilegal · OrquIDea" },
      { name: "description", content: "Reporta confidencialmente el saqueo o comercio ilegal de orquídeas en la Sierra de Oaxaca." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportPage,
});

type Taxon = { id: string; sci_name: string; common_name: string | null };

function ReportPage() {
  const { user } = useAuth();
  const [taxa, setTaxa] = useState<Taxon[]>([]);
  const [kind, setKind] = useState<string>("market");
  const [taxonId, setTaxonId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [details, setDetails] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("taxa").select("id, sci_name, common_name").order("sci_name").then(({ data }) => {
      if (data) setTaxa(data as Taxon[]);
    });
  }, []);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const willBeAnonymous = anonymous || !user;
      const { error } = await supabase.from("trade_reports").insert({
        kind: kind as "market_sale" | "online_sale" | "field_extraction" | "other",
        taxon_id: taxonId || null,
        location_text: locationText || null,
        details: details || null,
        anonymous: willBeAnonymous,
        reporter_id: willBeAnonymous ? null : user!.id,
      });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      setError((e as Error).message || "No pudimos enviar el reporte.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Shell>
        <div className="px-4 pt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-leaf/15 text-leaf">
            <Check size={28} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">Reporte enviado</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            Gracias por ayudar a proteger las orquídeas de la Sierra. El equipo de OrchidArc revisará tu reporte.
          </p>
          <Link to="/" className="mt-6 inline-flex items-center gap-1 rounded-full bg-leaf text-leaf-foreground px-4 py-2 text-xs font-semibold">
            Volver al inicio
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="px-4 pt-5 pb-10">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={12} /> Volver
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert size={20} />
          </div>
          <h1 className="text-2xl font-display font-semibold">Reportar comercio</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Reporta saqueo, ventas en mercados, anuncios online o extracción en campo. <Lock size={10} className="inline" /> Puedes hacerlo de forma anónima.
        </p>

        <Field label="¿Qué viste?">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "market", l: "Mercado/Feria" },
              { v: "online", l: "Anuncio online" },
              { v: "extraction", l: "Extracción en campo" },
              { v: "other", l: "Otro" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setKind(o.v)}
                className={
                  "rounded-xl border px-3 py-2 text-xs font-medium " +
                  (kind === o.v ? "bg-destructive/10 border-destructive text-destructive" : "bg-card border-border text-foreground/80")
                }
              >
                {o.l}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Especie (si la reconoces)">
          <select
            value={taxonId}
            onChange={(e) => setTaxonId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— No estoy seguro —</option>
            {taxa.map((t) => (
              <option key={t.id} value={t.id}>
                {t.sci_name}{t.common_name ? ` · ${t.common_name}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Lugar (mercado, sitio web, paraje)">
          <input
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Ej. tianguis de Tlacolula, dom."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Detalles">
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            placeholder="Cantidades, precios, fotos publicadas, vendedor… cualquier detalle ayuda."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        {user && (
          <label className="mt-4 flex items-center gap-2 text-xs text-foreground/80">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Enviar de forma anónima (no asociar a mi cuenta @{user.email})
          </label>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-xs text-destructive flex gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting || (!details && !locationText)}
          className="mt-6 w-full rounded-2xl bg-destructive text-destructive-foreground py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
          Enviar reporte
        </button>

        <p className="mt-3 text-[10px] text-muted-foreground text-center">
          Tu reporte llega solo al equipo de OrchidArc. No se publica en el muro.
        </p>
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mt-4">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
