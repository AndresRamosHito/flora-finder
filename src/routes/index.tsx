import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Feed } from "@/components/Feed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrquIDea · por OrchidArc — orquídeas de la Sierra de Oaxaca" },
      {
        name: "description",
        content:
          "App ciudadana para observar y registrar orquídeas silvestres en la Sierra de Oaxaca. Solo observar, nunca recolectar.",
      },
      { property: "og:title", content: "OrquIDea · por OrchidArc" },
      {
        property: "og:description",
        content:
          "Comunidad de aficionados a las orquídeas en la Sierra de Oaxaca. Avistamientos, identificación colectiva y conservación.",
      },
      { name: "robots", content: "index,follow" },
    ],
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
