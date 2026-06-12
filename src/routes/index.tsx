import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Feed } from "@/components/Feed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrquIDea · Orquídeas silvestres de la Sierra de Oaxaca" },
      {
        name: "description",
        content:
          "App ciudadana para observar y registrar orquídeas silvestres de la Sierra de Oaxaca. Avistamientos comunitarios, ID colectiva y conservación.",
      },
      { property: "og:title", content: "OrquIDea · por OrchidArc" },
      {
        property: "og:description",
        content:
          "Comunidad de orquídeas en la Sierra de Oaxaca: avistamientos, identificación colectiva y conservación. Solo observar, nunca recolectar.",
      },
      { property: "og:url", content: "https://orchid-map-oaxaca.lovable.app/" },
      { property: "og:image", content: "https://orchid-map-oaxaca.lovable.app/og-image.jpg" },
      { name: "twitter:title", content: "OrquIDea · por OrchidArc" },
      { name: "twitter:description", content: "Orquídeas silvestres de la Sierra de Oaxaca: avistamientos, ID colectiva y conservación." },
      { name: "twitter:image", content: "https://orchid-map-oaxaca.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://orchid-map-oaxaca.lovable.app/" }],
  }),
  component: HomePage,
});


function HomePage() {
  return (
    <Shell active="feed">
      <Feed />
    </Shell>
  );
}
