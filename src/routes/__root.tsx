import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { supabase } from "../integrations/supabase/client";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LanguageProvider } from "../lib/i18n";

const ORQUIDEA_URL = "https://orquidea.orchidarc.org/";
const ORQUIDEA_OG_IMAGE_URL = "https://orquidea.orchidarc.org/og-image.jpg";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página no cargó
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo salió mal. Puedes intentar recargar la página o volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Intentar de nuevo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#f6f1e4" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "OrquIDea" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "application-name", content: "OrquIDea" },
      { name: "author", content: "OrchidArc" },
      { name: "robots", content: "index,follow" },
      { title: "OrquIDea — Ciencia ciudadana de orquídeas" },
      {
        name: "description",
        content:
          "OrquIDea es una plataforma de ciencia ciudadana para documentar y proteger las orquídeas silvestres de México sin revelar la ubicación de especies sensibles.",
      },
      {
        name: "keywords",
        content:
          "orquídeas, México, ciencia ciudadana, conservación, OrchidArc, Laelia, Barkeria, biodiversidad",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "OrquIDea" },
      { property: "og:locale", content: "es_MX" },
      { property: "og:url", content: ORQUIDEA_URL },
      {
        property: "og:title",
        content: "OrquIDea — Ciencia ciudadana de orquídeas",
      },
      {
        property: "og:description",
        content:
          "Documenta y protege las orquídeas silvestres de México mediante ciencia ciudadana y conservación responsable.",
      },
      { property: "og:image", content: ORQUIDEA_OG_IMAGE_URL },
      {
        property: "og:image:alt",
        content: "OrquIDea — ciencia ciudadana para orquídeas de México",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "OrquIDea — Ciencia ciudadana de orquídeas",
      },
      {
        name: "twitter:description",
        content:
          "Documenta y protege las orquídeas silvestres de México mediante ciencia ciudadana.",
      },
      { name: "twitter:image", content: ORQUIDEA_OG_IMAGE_URL },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: ORQUIDEA_URL },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "OrchidArc",
              url: "https://www.orchidarc.org/",
              logo: "https://orquidea.orchidarc.org/icon-512.png",
            },
            {
              "@type": "WebSite",
              name: "OrquIDea",
              url: ORQUIDEA_URL,
              inLanguage: "es-MX",
              publisher: { "@type": "Organization", name: "OrchidArc" },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#f6f1e4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="OrquIDea" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="application-name" content="OrquIDea" />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthSync />
        <PwaRuntimeSetup />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

/** Root-level singleton: invalidate router + queries on auth state changes. */
function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });

    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  return null;
}

/** Root-level singleton: make PWA metadata and service worker visible after hydration. */
function PwaRuntimeSetup() {
  useEffect(() => {
    const ensureLink = (rel: string, href: string) => {
      const existing = document.head.querySelector<HTMLLinkElement>(
        `link[rel="${rel}"][href="${href}"]`,
      );

      if (existing) {
        return;
      }

      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      document.head.appendChild(link);
    };

    const ensureMeta = (name: string, content: string) => {
      let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }

      meta.content = content;
    };

    ensureLink("manifest", "/manifest.webmanifest");
    ensureLink("icon", "/favicon.ico");
    ensureLink("apple-touch-icon", "/apple-touch-icon.png");
    ensureMeta("theme-color", "#f6f1e4");
    ensureMeta("application-name", "OrquIDea");
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-title", "OrquIDea");
    ensureMeta("apple-mobile-web-app-status-bar-style", "default");

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch(error => {
        console.error("Service worker registration failed", error);
      });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });

    return () => window.removeEventListener("load", registerServiceWorker);
  }, []);

  return null;
}
