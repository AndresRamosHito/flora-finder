import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ShieldAlert, Bug, HelpCircle } from "lucide-react";
import { Shell } from "@/components/Shell";

const SUPPORT_EMAIL = "andresr@orchidarc.org";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support · OrquIDea" },
      {
        name: "description",
        content:
          "Support and contact information for OrquIDea, OrchidArc's citizen-science orchid observation platform.",
      },
    ],
    links: [{ rel: "canonical", href: "https://orquidea.orchidarc.org/support" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <Shell active="feed">
      <article className="px-5 py-6 space-y-6 text-sm leading-6 text-foreground">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">OrquIDea</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Support</h1>
          <p className="text-muted-foreground">
            Contact and safety information for users, reviewers, contributors, and conservation partners.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Mail size={18} className="text-leaf" /> Contact
          </div>
          <p>
            For account help, data questions, species-location concerns, or app-store review inquiries, email:
          </p>
          <p>
            <a className="font-semibold text-leaf underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What to include</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Your name and the email associated with your account, if applicable.</li>
            <li>A clear description of the problem or request.</li>
            <li>The observation, page, or species involved, if relevant.</li>
            <li>Your device model and browser/app version for technical bugs.</li>
          </ul>
        </section>

        <section className="grid gap-3">
          <SupportCard
            icon={<ShieldAlert size={18} />}
            title="Sensitive locations"
            text="If you believe a wild orchid location is exposed too precisely, contact us so it can be hidden, generalized, or reviewed."
          />
          <SupportCard
            icon={<Bug size={18} />}
            title="Technical problems"
            text="Report broken pages, login problems, upload failures, map issues, or installation problems."
          />
          <SupportCard
            icon={<HelpCircle size={18} />}
            title="General questions"
            text="Ask about contributing observations, using the app in the field, or partnering with OrchidArc."
          />
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Español</h2>
          <p>
            Para ayuda con tu cuenta, datos, ubicaciones sensibles, errores técnicos o preguntas sobre
            OrquIDea, escribe a <a className="font-semibold text-leaf underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </section>

        <footer className="border-t border-border pt-4 text-muted-foreground">
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <Link to="/privacy" className="font-medium text-leaf underline">Privacy Policy</Link>
            <Link to="/terms" className="font-medium text-leaf underline">Terms of Use</Link>
          </p>
        </footer>
      </article>
    </Shell>
  );
}

function SupportCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <span className="text-leaf">{icon}</span>
        {title}
      </div>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
