import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { useLang } from "@/lib/i18n";
import { MIN_AGE } from "@/lib/consent";

const EMAIL = "andresr@orchidarc.org";
const UPDATED_ES = "20 de noviembre de 2026";
const UPDATED_EN = "20 November 2026";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Aviso de privacidad · Privacy Notice · OrquIDea" },
      {
        name: "description",
        content:
          "Aviso de privacidad integral de OrquIDea, operada por Orchidarc. Full privacy notice for OrquIDea, operated by Orchidarc.",
      },
    ],
    links: [{ rel: "canonical", href: "https://orquidea.orchidarc.org/privacy" }],
  }),
  component: PrivacyPage,
});

type Block = { h: string; body: ReactNode };

function Mail() {
  return (
    <a className="font-medium text-leaf underline" href={`mailto:${EMAIL}`}>
      {EMAIL}
    </a>
  );
}

function DeleteLink({ children }: { children: ReactNode }) {
  return (
    <Link to="/eliminar-cuenta" className="font-medium text-leaf underline">
      {children}
    </Link>
  );
}

const ES: Block[] = [
  {
    h: "1. Responsable",
    body: (
      <>
        <p>
          OrquIDea es operada por <b>Orchidarc</b>, organización benéfica registrada en Inglaterra y
          Gales (Charitable Incorporated Organisation, número de registro 1208062), con domicilio en
          21 Lathkill Road, Sheffield S13 8DJ, Reino Unido. Orchidarc es la responsable del
          tratamiento de tus datos personales.
        </p>
        <p>
          Contacto para cualquier asunto de privacidad: <Mail />.
        </p>
      </>
    ),
  },
  {
    h: "2. Datos que tratamos",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <b>Cuenta:</b> correo electrónico, @handle, nombre visible, foto de perfil, región y
          biografía si las agregas. Si entras con Google, recibimos tu correo y nombre de Google.
        </li>
        <li>
          <b>Observaciones:</b> fotografías, especie, fecha, notas, hábitat, altitud y ubicación.
          Antes de subirlas, la app elimina los metadatos de ubicación de las fotos.
        </li>
        <li>
          <b>Ubicación del dispositivo:</b> solo si das permiso y decides registrar una observación
          con ubicación.
        </li>
        <li>
          <b>Comunicaciones:</b> comentarios, “me gusta”, verificaciones, mensajes en sociedades y
          mensajes directos.
        </li>
        <li>
          <b>Reportes de comercio ilegal:</b> lo que describas y, si no eliges el modo anónimo, tu
          cuenta.
        </li>
        <li>
          <b>Datos técnicos:</b> registros de seguridad y de errores del servicio, y tu preferencia
          de idioma.
        </li>
      </ul>
    ),
  },
  {
    h: "3. Datos personales sensibles",
    body: (
      <p>
        No te pedimos datos personales sensibles (salud, origen, creencias, etc.). Te pedimos no
        incluirlos en notas, comentarios ni mensajes.
      </p>
    ),
  },
  {
    h: "4. Finalidades",
    body: (
      <>
        <p>
          <b>Finalidades necesarias</b> para el servicio que solicitas:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Crear y administrar tu cuenta y tu perfil público.</li>
          <li>Publicar tus observaciones y permitir su verificación por especialistas.</li>
          <li>Hacer funcionar comentarios, sociedades y mensajes directos.</li>
          <li>Ocultar o generalizar ubicaciones de especies sensibles.</li>
          <li>Moderar contenido, prevenir abusos y mantener la seguridad del servicio.</li>
          <li>Atender tus solicitudes de privacidad y soporte.</li>
        </ul>
        <p>
          <b>Finalidades secundarias</b> (no necesarias para el servicio): usar observaciones, sin
          datos que te identifiquen, en investigación y planes de conservación, y compartirlas con
          instituciones de investigación o conservación. Puedes oponerte en cualquier momento
          escribiendo a <Mail />; tu negativa no afecta el uso de la app.
        </p>
      </>
    ),
  },
  {
    h: "5. Bases legales (Reino Unido y Unión Europea)",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <b>Ejecución del servicio</b> que solicitas al crear una cuenta (cuenta, observaciones,
          mensajes).
        </li>
        <li>
          <b>Interés legítimo</b> en la seguridad, la moderación y la protección de especies
          amenazadas.
        </li>
        <li>
          <b>Consentimiento</b> para la ubicación del dispositivo; puedes retirarlo desde los
          permisos de tu teléfono o navegador.
        </li>
      </ul>
    ),
  },
  {
    h: "6. Qué es público",
    body: (
      <p>
        Son públicos tu @handle, nombre visible, foto de perfil, tus observaciones (con ubicación
        generalizada u oculta), comentarios y verificaciones. La ubicación exacta de una observación
        solo la ven tú y el equipo de verificación y administración. Los mensajes directos solo los
        ven sus participantes; los mensajes de una sociedad, sus miembros.
      </p>
    ),
  },
  {
    h: "7. Proveedores y transferencias",
    body: (
      <>
        <p>Usamos proveedores que tratan datos por cuenta nuestra:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Supabase: base de datos, inicio de sesión y almacenamiento de fotos.</li>
          <li>Vercel: alojamiento de la aplicación.</li>
          <li>Google: inicio de sesión con Google y fuentes tipográficas.</li>
          <li>CARTO y OpenStreetMap: mapas base.</li>
          <li>Wikipedia/Wikimedia: consulta de información del género (sin datos de tu cuenta).</li>
        </ul>
        <p>
          Estos proveedores pueden almacenar datos fuera de México y del Reino Unido, incluido
          Estados Unidos, con las garantías contractuales que exige la ley. No vendemos ni rentamos
          tus datos personales. Fuera de estos proveedores, solo compartimos datos con autoridades
          cuando la ley lo exige; los reportes de comercio ilegal pueden entregarse a autoridades
          ambientales sin datos que te identifiquen si elegiste el modo anónimo.
        </p>
      </>
    ),
  },
  {
    h: "8. Cuánto tiempo conservamos tus datos",
    body: (
      <p>
        Mientras tengas cuenta. Si la eliminas, borramos de inmediato tu perfil, observaciones,
        fotos, comentarios y mensajes. Los reportes de comercio ilegal se conservan sin datos que te
        identifiquen. Las copias de seguridad técnicas se sobrescriben en el ciclo normal del
        proveedor.
      </p>
    ),
  },
  {
    h: "9. Tus derechos",
    body: (
      <>
        <p>
          Puedes ejercer tus derechos de <b>acceso, rectificación, cancelación y oposición</b>{" "}
          (ARCO), así como portabilidad, limitación del tratamiento y revocación del consentimiento.
          Escribe a <Mail /> desde el correo de tu cuenta indicando tu nombre, tu @handle, el
          derecho que quieres ejercer y, si aplica, los datos de que se trata. Responderemos dentro
          de los plazos legales.
        </p>
        <p>
          Puedes eliminar tu cuenta tú mismo en <DeleteLink>Eliminar cuenta</DeleteLink> o desde Mi
          cuenta en la app.
        </p>
        <p>
          Si no estás conforme con nuestra respuesta, en México puedes acudir a la Secretaría
          Anticorrupción y Buen Gobierno, y en el Reino Unido a la Information Commissioner’s Office
          (ico.org.uk).
        </p>
      </>
    ),
  },
  {
    h: "10. Menores de edad",
    body: (
      <p>
        OrquIDea es para personas de {MIN_AGE} años o más. Las personas de {MIN_AGE} a 17 años
        necesitan el permiso de su madre, padre o tutor para crear una cuenta. Si eres madre, padre
        o tutor y quieres revisar o eliminar la cuenta de un menor, escribe a <Mail />. Si sabemos
        que una cuenta pertenece a una persona menor de {MIN_AGE} años, la eliminaremos.
      </p>
    ),
  },
  {
    h: "11. Cookies y almacenamiento local",
    body: (
      <p>
        Solo usamos almacenamiento necesario para que la app funcione: tu sesión de inicio y tu
        preferencia de idioma. No usamos cookies de publicidad ni de analítica.
      </p>
    ),
  },
  {
    h: "12. Cambios a este aviso",
    body: (
      <p>
        Publicaremos cualquier cambio en esta página con su fecha. Si el cambio es importante, te
        avisaremos en la app.
      </p>
    ),
  },
];

const EN: Block[] = [
  {
    h: "1. Who we are",
    body: (
      <>
        <p>
          OrquIDea is run by <b>Orchidarc</b>, a charity registered in England and Wales (Charitable
          Incorporated Organisation, no. 1208062), 21 Lathkill Road, Sheffield S13 8DJ, United
          Kingdom. Orchidarc is the controller of your personal data.
        </p>
        <p>
          Privacy contact: <Mail />.
        </p>
      </>
    ),
  },
  {
    h: "2. Data we process",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <b>Account:</b> email, @handle, display name, profile photo, region and bio if you add
          them. If you sign in with Google, we receive your Google email and name.
        </li>
        <li>
          <b>Observations:</b> photos, species, date, notes, habitat, altitude and location. The app
          removes location metadata from photos before upload.
        </li>
        <li>
          <b>Device location:</b> only if you allow it and choose to record an observation with
          location.
        </li>
        <li>
          <b>Communications:</b> comments, likes, verifications, society messages and direct
          messages.
        </li>
        <li>
          <b>Illegal-trade reports:</b> what you describe and, unless you choose anonymous mode,
          your account.
        </li>
        <li>
          <b>Technical data:</b> security and error logs, and your language preference.
        </li>
      </ul>
    ),
  },
  {
    h: "3. Special category data",
    body: (
      <p>
        We don't ask for special category data (health, ethnicity, beliefs, etc.). Please don't
        include it in notes, comments or messages.
      </p>
    ),
  },
  {
    h: "4. Purposes",
    body: (
      <>
        <p>
          <b>Needed to provide the service:</b>
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Creating and running your account and public profile.</li>
          <li>Publishing your observations and letting specialists verify them.</li>
          <li>Running comments, societies and direct messages.</li>
          <li>Hiding or generalising locations of sensitive species.</li>
          <li>Moderating content, preventing abuse and keeping the service secure.</li>
          <li>Answering your privacy and support requests.</li>
        </ul>
        <p>
          <b>Secondary purposes</b> (not needed for the service): using observations, with nothing
          that identifies you, in research and conservation planning, and sharing them with research
          or conservation institutions. You can object at any time by emailing <Mail />; this does
          not affect your use of the app.
        </p>
      </>
    ),
  },
  {
    h: "5. Legal bases (UK and EU)",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <b>Contract:</b> providing the service you ask for when you create an account.
        </li>
        <li>
          <b>Legitimate interests:</b> security, moderation and protecting threatened species.
        </li>
        <li>
          <b>Consent:</b> device location; withdraw it in your phone or browser permissions.
        </li>
      </ul>
    ),
  },
  {
    h: "6. What is public",
    body: (
      <p>
        Your @handle, display name, profile photo, observations (with generalised or hidden
        location), comments and verifications are public. Exact observation locations are visible
        only to you and the verification and admin team. Direct messages are visible only to their
        participants; society messages, to society members.
      </p>
    ),
  },
  {
    h: "7. Providers and transfers",
    body: (
      <>
        <p>We use providers that process data on our behalf:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Supabase: database, sign-in and photo storage.</li>
          <li>Vercel: app hosting.</li>
          <li>Google: Google sign-in and web fonts.</li>
          <li>CARTO and OpenStreetMap: base maps.</li>
          <li>Wikipedia/Wikimedia: genus information lookups (no account data sent).</li>
        </ul>
        <p>
          These providers may store data outside the UK and Mexico, including in the United States,
          under the contractual safeguards the law requires. We do not sell or rent personal data.
          Beyond these providers, we share data with authorities only when the law requires it;
          illegal-trade reports may be passed to environmental authorities without identifying you
          if you chose anonymous mode.
        </p>
      </>
    ),
  },
  {
    h: "8. How long we keep data",
    body: (
      <p>
        For as long as you have an account. If you delete it, we immediately erase your profile,
        observations, photos, comments and messages. Illegal-trade reports are kept with nothing
        that identifies you. Technical backups are overwritten on the provider's normal cycle.
      </p>
    ),
  },
  {
    h: "9. Your rights",
    body: (
      <>
        <p>
          You can ask to access, correct or erase your data, restrict or object to its use, receive
          a portable copy, and withdraw consent. Email <Mail /> from your account's address with
          your name, @handle and the right you want to use. We'll reply within the legal time
          limits.
        </p>
        <p>
          You can delete your account yourself at <DeleteLink>Delete account</DeleteLink> or from My
          account in the app.
        </p>
        <p>
          If you're unhappy with our reply, you can complain to the Information Commissioner's
          Office (ico.org.uk) in the UK, or to the Secretaría Anticorrupción y Buen Gobierno in
          Mexico.
        </p>
      </>
    ),
  },
  {
    h: "10. Children",
    body: (
      <p>
        OrquIDea is for people aged {MIN_AGE} and over. Users aged {MIN_AGE} to 17 need permission
        from a parent or guardian to create an account. Parents or guardians who want to review or
        delete a child's account can email <Mail />. If we learn that an account belongs to someone
        under {MIN_AGE}, we will delete it.
      </p>
    ),
  },
  {
    h: "11. Cookies and local storage",
    body: (
      <p>
        We only use storage the app needs to work: your sign-in session and your language
        preference. We don't use advertising or analytics cookies.
      </p>
    ),
  },
  {
    h: "12. Changes",
    body: (
      <p>
        We'll post any change on this page with its date, and tell you in the app if the change is
        significant.
      </p>
    ),
  },
];

function PrivacyPage() {
  const { lang } = useLang();
  const en = lang === "en";
  const blocks = en ? EN : ES;
  return (
    <Shell active="feed">
      <article className="px-5 py-6 space-y-6 text-sm leading-6 text-foreground">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">OrquIDea</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {en ? "Privacy Notice" : "Aviso de privacidad"}
          </h1>
          <p className="text-muted-foreground">
            {en ? `Last updated: ${UPDATED_EN}` : `Última actualización: ${UPDATED_ES}`}
          </p>
          <p className="text-muted-foreground">
            {en
              ? "Aviso de privacidad en español: switch the language to ES at the top of the page."
              : "Privacy Notice in English: change the language to EN at the top of the page."}
          </p>
        </header>

        {blocks.map((b) => (
          <section key={b.h} className="space-y-3">
            <h2 className="text-lg font-semibold">{b.h}</h2>
            {b.body}
          </section>
        ))}
      </article>
    </Shell>
  );
}
