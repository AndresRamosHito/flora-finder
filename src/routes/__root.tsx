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

const ORQUIDEA_BASE_PATH = "/orquidea";
const ORQUIDEA_CANONICAL_URL = "https://www.orchidarc.org/orquidea/";
const ORQUIDEA_OG_IMAGE_URL = "https://www.orchidarc.org/orquidea/og-image.jpg";

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
            href={`${ORQUIDEA_BASE_PATH}/`}
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
      { name: "author", content: "OrchidArc" },
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
      { name: "robots", content: "index,follow" },

      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "OrquIDea" },
      { property: "og:locale", content: "es_MX" },
      {
        property: "og:title",
        content: "OrquIDea — Ciencia ciudadana de orquídeas",
      },
      {
        property: "og:description",
        content:
          "Documenta y protege las orquídeas silvestres de México mediante ciencia ciudadana y conservación responsable.",
      },
      { property: "og:url", content: ORQUIDEA_CANONICAL_URL },
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
      { rel: "canonical", href: ORQUIDEA_CANONICAL_URL },
      { rel: "manifest", href: `${ORQUIDEA_BASE_PATH}/manifest.webmanifest` },
      { rel: "icon", href: `${ORQUIDEA_BASE_PATH}/favicon.ico` },
      { rel: "icon", type: "image/png", href: `${ORQUIDEA_BASE_PATH}/favicon.png` },
      { rel: "apple-touch-icon", href: `${ORQUIDEA_BASE_PATH}/apple-touch-icon.png` },
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
      <AuthSync />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
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
