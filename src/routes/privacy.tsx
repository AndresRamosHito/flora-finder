import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · OrquIDea" },
      {
        name: "description",
        content:
          "Privacy policy for OrquIDea, OrchidArc's citizen-science orchid observation platform.",
      },
    ],
    links: [{ rel: "canonical", href: "https://orquidea.orchidarc.org/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <Shell active="feed">
      <article className="px-5 py-6 space-y-6 text-sm leading-6 text-foreground">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">OrquIDea</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: 17 June 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Who we are</h2>
          <p>
            OrquIDea is a citizen-science platform operated by OrchidArc for documenting wild
            orchids, supporting conservation, and discouraging illegal collection or trade. The
            public website is available at{" "}
            <a className="font-medium text-leaf underline" href="https://orquidea.orchidarc.org/">
              orquidea.orchidarc.org
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Information we collect</h2>
          <p>Depending on which features you use, OrquIDea may collect:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Account information, such as your email address or profile name, if you sign in.
            </li>
            <li>
              Observation information, including photographs, species notes, dates, and approximate
              locality.
            </li>
            <li>
              Device-provided location data, only when you choose to submit an observation with
              location.
            </li>
            <li>Technical information needed to keep the app secure and functional.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sensitive species locations</h2>
          <p>
            Orchid locations can be conservation-sensitive. OrquIDea is designed to avoid exposing
            precise locations of vulnerable wild plants to the public. Exact coordinates, when
            collected, may be restricted, generalized, or withheld from public display.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">How we use information</h2>
          <p>We use information to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Display, manage, and review orchid observations.</li>
            <li>Support identification, education, research, and conservation planning.</li>
            <li>Protect sensitive species and prevent misuse of location data.</li>
            <li>Maintain account security and app reliability.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sharing</h2>
          <p>
            We do not sell personal information. Observation data may be shared with conservation
            partners, researchers, or orchid societies when this supports conservation and does not
            expose sensitive locations inappropriately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your choices</h2>
          <p>
            You may choose not to submit observations or location data. To request access,
            correction, or deletion of your account or submitted data, contact us through the
            support page.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Children</h2>
          <p>
            OrquIDea is intended for general education and citizen science. Children should use the
            platform with guidance from a parent, guardian, teacher, or responsible adult.
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Español</h2>
          <p>
            OrquIDea puede recopilar datos de cuenta, fotografías, notas de avistamiento y ubicación
            cuando el usuario decide enviarlos. No vendemos datos personales. Las ubicaciones
            exactas de orquídeas silvestres pueden ser ocultadas o generalizadas para proteger
            especies sensibles.
          </p>
        </section>

        <footer className="border-t border-border pt-4 text-muted-foreground">
          <p>
            Questions:{" "}
            <Link to="/support" className="font-medium text-leaf underline">
              contact OrquIDea support
            </Link>
            .
          </p>
        </footer>
      </article>
    </Shell>
  );
}
