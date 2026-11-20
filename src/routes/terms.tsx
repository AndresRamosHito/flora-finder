import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { MIN_AGE } from "@/lib/consent";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use · OrquIDea" },
      {
        name: "description",
        content:
          "Terms of use for OrquIDea, OrchidArc's citizen-science orchid observation platform.",
      },
    ],
    links: [{ rel: "canonical", href: "https://orquidea.orchidarc.org/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <Shell active="feed">
      <article className="px-5 py-6 space-y-6 text-sm leading-6 text-foreground">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">OrquIDea</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Terms of Use</h1>
          <p className="text-muted-foreground">Last updated: 20 November 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Purpose</h2>
          <p>
            OrquIDea exists to support orchid education, documentation, citizen science, and
            conservation. By using the platform, you agree to use it responsibly and in a way that
            protects wild orchids and their habitats.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Observe only</h2>
          <p>
            OrquIDea does not authorize collection, removal, purchase, sale, or disturbance of wild
            orchids. Users must follow applicable laws, land-access rules, protected-area
            regulations, and community permissions. Do not trespass or damage habitat to make an
            observation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">User submissions</h2>
          <p>
            You are responsible for the observations, photographs, comments, and other content you
            submit. Do not upload unlawful, misleading, harmful, or intentionally false content. Do
            not expose exact localities of vulnerable plants in public comments or captions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Content license</h2>
          <p>
            By submitting content, you allow OrchidArc and OrquIDea to store, display, review,
            moderate, and use that content for conservation, education, research, and platform
            operation. You retain ownership of your own original content unless a separate written
            agreement says otherwise.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Identification and conservation limitations</h2>
          <p>
            Species identifications, conservation notes, maps, and community comments may be
            incomplete or incorrect. OrquIDea is not a substitute for expert permitting, formal
            environmental assessment, or legal advice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Moderation</h2>
          <p>
            We may edit, hide, generalize, or remove content when needed to protect sensitive
            species, prevent misuse, maintain safety, or preserve the quality of the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Age and accounts</h2>
          <p>
            You must be {MIN_AGE} or older to create an account. If you are under 18, you need
            permission from a parent or guardian. Keep your sign-in details private. Treat other
            users with respect in comments, societies and direct messages; we may suspend or delete
            accounts that harass others, share sensitive locations, or promote collection or trade
            of wild orchids. You can delete your account at any time at{" "}
            <Link to="/eliminar-cuenta" className="font-medium text-leaf underline">
              orquidea.orchidarc.org/eliminar-cuenta
            </Link>
            . How we handle personal data is explained in the{" "}
            <Link to="/privacy" className="font-medium text-leaf underline">
              Privacy Notice
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Español</h2>
          <p>
            OrquIDea es una plataforma de observación, educación y conservación. Usarla no autoriza
            colectar, comprar, vender ni perturbar orquídeas silvestres. Las observaciones deben
            hacerse legalmente, con respeto al hábitat, a las comunidades locales y a las
            regulaciones aplicables. Debes tener {MIN_AGE} años o más para crear una cuenta; si eres
            menor de 18, necesitas permiso de tu madre, padre o tutor. Puedes eliminar tu cuenta en
            cualquier momento.
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
