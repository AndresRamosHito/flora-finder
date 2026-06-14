import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, ArrowLeft, Check, Loader2, AlertCircle, Lock } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/reportar")({
  head: () => ({
    meta: [
      { title: "Reportar comercio ilegal de orquídeas · OrquIDea" },
      {
        name: "description",
        content:
          "Reporta confidencialmente el saqueo o comercio ilegal de orquídeas de México. Tu identidad queda protegida.",
      },
      { property: "og:title", content: "Reportar comercio ilegal · OrquIDea" },
      {
        property: "og:description",
        content: "Canal confidencial para denunciar saqueo y comercio ilegal de orquídeas.",
      },
      { property: "og:url", content: "https://orchid-map-oaxaca.lovable.app/reportar" },
    ],
    links: [{ rel: "canonical", href: "https://orchid-map-oaxaca.lovable.app/reportar" }],
  }),

  component: ReportPage,
});

type Taxon = { id: string; sci_name: string; common_name: string | null };

function ReportPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const [taxa, setTaxa] = useState<Taxon[]>([]);
  const [kind, setKind] = useState<string>("market_sale");
  const [taxonId, setTaxonId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [details, setDetails] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("taxa")
      .select("id, sci_name, common_name")
      .order("sci_name")
      .then(({ data }) => {
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
      setError(
        (e as Error).message || t("No pudimos enviar el reporte.", "We couldn't send the report."),
      );
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
          <h1 className="mt-4 font-display text-2xl font-semibold">
            {t("Reporte enviado", "Report sent")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            {t(
              "Gracias por ayudar a proteger las orquídeas de México. El equipo de OrchidArc revisará tu reporte.",
              "Thanks for helping protect Mexico's orchids. The OrchidArc team will review your report.",
            )}
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-1 rounded-full bg-leaf text-leaf-foreground px-4 py-2 text-xs font-semibold"
          >
            {t("Volver al inicio", "Back to home")}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="px-4 pt-5 pb-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> {t("Volver", "Back")}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert size={20} />
          </div>
          <h1 className="text-2xl font-display font-semibold">
            {t("Reportar comercio", "Report trade")}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t(
            "Reporta saqueo, ventas en mercados, anuncios online o extracción en campo.",
            "Report poaching, market sales, online listings or field extraction.",
          )}{" "}
          <Lock size={10} className="inline" />{" "}
          {t("Puedes hacerlo de forma anónima.", "You can do it anonymously.")}
        </p>

        <Field label={t("¿Qué viste?", "What did you see?")}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "market_sale", l: t("Mercado/Feria", "Market/Fair") },
              { v: "online_sale", l: t("Anuncio online", "Online listing") },
              { v: "field_extraction", l: t("Extracción en campo", "Field extraction") },
              { v: "other", l: t("Otro", "Other") },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setKind(o.v)}
                className={
                  "rounded-xl border px-3 py-2 text-xs font-medium " +
                  (kind === o.v
                    ? "bg-destructive/10 border-destructive text-destructive"
                    : "bg-card border-border text-foreground/80")
                }
              >
                {o.l}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("Especie (si la reconoces)", "Species (if you recognize it)")}>
          <select
            value={taxonId}
            onChange={(e) => setTaxonId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("— No estoy seguro —", "— Not sure —")}</option>
            {taxa.map((tx) => (
              <option key={tx.id} value={tx.id}>
                {tx.sci_name}
                {tx.common_name ? ` · ${tx.common_name}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("Lugar (mercado, sitio web, paraje)", "Place (market, website, locality)")}>
          <input
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder={t("Ej. tianguis de Tlacolula, dom.", "e.g. Tlacolula Sunday market")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        <Field label={t("Detalles", "Details")}>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            placeholder={t(
              "Cantidades, precios, fotos publicadas, vendedor… cualquier detalle ayuda.",
              "Quantities, prices, posted photos, seller… any detail helps.",
            )}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        {user && (
          <label className="mt-4 flex items-center gap-2 text-xs text-foreground/80">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            {t(
              `Enviar de forma anónima (no asociar a mi cuenta @${user.email})`,
              `Send anonymously (don't link to my account @${user.email})`,
            )}
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
          {t("Enviar reporte", "Send report")}
        </button>

        <p className="mt-3 text-[10px] text-muted-foreground text-center">
          {t(
            "Tu reporte llega solo al equipo de OrchidArc. No se publica en el muro.",
            "Your report goes only to the OrchidArc team. It isn't posted to the feed.",
          )}
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
