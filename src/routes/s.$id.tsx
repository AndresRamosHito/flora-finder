import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  HelpCircle,
  Lock,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  ThumbsUp,
  Loader2,
} from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { Orchid } from "@/components/Orchid";
import { TaxonCombobox } from "@/components/TaxonCombobox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLang, formatRelativeTime } from "@/lib/i18n";

export const Route = createFileRoute("/s/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase.rpc("sighting_public_one", { p_id: params.id });
    const s =
      (data?.[0] as
        | {
            sci_name: string | null;
            common_name: string | null;
            location_label: string | null;
            notes: string | null;
            photo_url: string | null;
            observed_at: string | null;
            created_at: string;
          }
        | undefined) ?? null;
    return { sighting: s };
  },
  head: ({ params, loaderData }) => {
    const s = loaderData?.sighting;
    const url = `https://orchid-map-oaxaca.lovable.app/s/${params.id}`;
    const name = s?.sci_name ?? "Orquídea sin identificar";
    const where = s?.location_label ?? "México";
    const title = s?.sci_name
      ? `${s.sci_name}${s.common_name ? ` (${s.common_name})` : ""} · Avistamiento · OrquIDea`
      : "Avistamiento sin identificar · OrquIDea";
    const rawDesc =
      s?.notes?.trim() ||
      `Avistamiento comunitario de ${name} en ${where}. Discusión, sugerencias de ID y verificación comunitaria.`;
    const desc = rawDesc.length > 158 ? rawDesc.slice(0, 155) + "…" : rawDesc;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(s?.photo_url
          ? [
              { property: "og:image", content: s.photo_url },
              { name: "twitter:image", content: s.photo_url },
            ]
          : []),
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: s
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: name,
                description: desc,
                datePublished: s.observed_at ?? s.created_at,
                image: s.photo_url ?? undefined,
                url,
                inLanguage: "es-MX",
                publisher: { "@type": "Organization", name: "OrchidArc" },
              }),
            },
          ]
        : [],
    };
  },
  component: SightingDetail,
});

type SightingOne = {
  id: string;
  user_id: string;
  taxon_id: string | null;
  sci_name: string | null;
  common_name: string | null;
  is_sensitive: boolean | null;
  is_masked: boolean | null;
  status: "needs_id" | "pending" | "verified" | "rejected" | string | null;
  notes: string | null;
  location_label: string | null;
  location_precision: string | null;
  public_radius_km: number | null;
  observed_at: string | null;
  created_at: string;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
};

type SightingPhoto = {
  id: string;
  photo_url: string;
  position: number;
};

type CommentRow = {
  id: string;
  user_id: string;
  body: string | null;
  suggested_taxon_id: string | null;
  created_at: string;
};

function SightingDetail() {
  const { t, lang } = useLang();
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const sightingQ = useQuery({
    queryKey: ["sighting", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sighting_public_one", { p_id: id });
      if (error) throw error;
      return (data?.[0] as SightingOne | undefined) ?? null;
    },
  });

  const photosQ = useQuery({
    queryKey: ["sighting-photos", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sighting_photos")
        .select("id, photo_url, position")
        .eq("sighting_id", id)
        .order("position", { ascending: true });
      if (error) {
        if ((error as { code?: string }).code === "42P01") return [];
        throw error;
      }
      return (data ?? []) as SightingPhoto[];
    },
  });

  const commentsQ = useQuery({
    queryKey: ["sighting-comments", id],
    queryFn: async () => {
      const [comm, agree, taxa, profs] = await Promise.all([
        supabase
          .from("sighting_comments")
          .select("id, user_id, body, suggested_taxon_id, created_at")
          .eq("sighting_id", id)
          .order("created_at", { ascending: true }),
        supabase.from("comment_agreements").select("comment_id, user_id"),
        supabase.from("taxa").select("id, sci_name, common_name"),
        supabase.from("profiles").select("id, handle, display_name"),
      ]);
      if (comm.error) throw comm.error;
      const taxaById = new Map((taxa.data ?? []).map((t) => [t.id, t]));
      const profById = new Map((profs.data ?? []).map((p) => [p.id, p]));
      const agreeBy = new Map<string, string[]>();
      for (const a of agree.data ?? []) {
        const arr = agreeBy.get(a.comment_id) ?? [];
        arr.push(a.user_id);
        agreeBy.set(a.comment_id, arr);
      }
      return {
        rows: (comm.data ?? []) as CommentRow[],
        taxaById,
        profById,
        agreeBy,
      };
    },
  });

  const [body, setBody] = useState("");
  const [suggested, setSuggested] = useState<string>("");

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth required");
      const trimmed = body.trim();
      if (!trimmed && !suggested)
        throw new Error(
          t("Escribe algo o sugiere una especie.", "Write something or suggest a species."),
        );
      const { error } = await supabase.from("sighting_comments").insert({
        sighting_id: id,
        user_id: user.id,
        body: trimmed || null,
        suggested_taxon_id: suggested || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setBody("");
      setSuggested("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sighting-comments", id] }),
        qc.invalidateQueries({ queryKey: ["sighting", id] }),
      ]);
    },
  });

  const toggleAgree = useMutation({
    mutationFn: async ({ commentId, agreed }: { commentId: string; agreed: boolean }) => {
      if (!user) throw new Error("auth required");
      if (agreed) {
        const { error } = await supabase
          .from("comment_agreements")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("comment_agreements")
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sighting-comments", id] }),
        qc.invalidateQueries({ queryKey: ["sighting", id] }),
      ]);
    },
  });

  const s = sightingQ.data;
  const photos = photosQ.data?.length
    ? photosQ.data
    : s?.photo_url
      ? [{ id: "legacy-photo", photo_url: s.photo_url, position: 0 }]
      : [];
  const mainPhoto = photos[0] ?? null;
  const hiddenLocation = s?.location_precision === "hidden";

  return (
    <Shell active="feed">
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> {t("Volver", "Back")}
        </button>

        {sightingQ.isLoading && <div className="mt-6 h-44 rounded-3xl bg-muted animate-pulse" />}

        {sightingQ.isSuccess && !s && (
          <div className="mt-8 rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            {t(
              "Este avistamiento no existe o fue eliminado.",
              "This sighting doesn't exist or was deleted.",
            )}
          </div>
        )}

        {s && (
          <>
            <article className="mt-4 rounded-3xl border border-border/70 bg-card overflow-hidden shadow-sm">
              <h1 className="sr-only">
                {s.sci_name
                  ? t(
                      `Avistamiento de ${s.sci_name}${s.common_name ? ` (${s.common_name})` : ""}`,
                      `Sighting of ${s.sci_name}${s.common_name ? ` (${s.common_name})` : ""}`,
                    )
                  : t(
                      "Avistamiento de orquídea sin identificar",
                      "Sighting of an unidentified orchid",
                    )}
              </h1>
              <div className="relative h-56 grid place-items-center bg-gradient-to-br from-accent/40 to-secondary/30">
                {mainPhoto ? (
                  <img
                    src={mainPhoto.photo_url}
                    alt={
                      s.sci_name
                        ? t(
                            `Foto de orquídea ${s.sci_name}${s.common_name ? ` (${s.common_name})` : ""} en ${s.location_label ?? "México"}`,
                            `Photo of orchid ${s.sci_name}${s.common_name ? ` (${s.common_name})` : ""} in ${s.location_label ?? "Mexico"}`,
                          )
                        : t(
                            `Foto de orquídea sin identificar en ${s.location_label ?? "México"}`,
                            `Photo of an unidentified orchid in ${s.location_label ?? "Mexico"}`,
                          )
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Orchid sciName={s.sci_name} size={180} />
                )}

                {!s.sci_name && !mainPhoto && (
                  <div className="absolute inset-0 grid place-items-center gap-2 text-leaf pointer-events-none">
                    <HelpCircle size={28} />
                    <span className="text-xs font-semibold">
                      {t("Sin identificar", "Unidentified")}
                    </span>
                  </div>
                )}
              </div>

              {photos.length > 1 && (
                <div className="grid grid-cols-4 gap-2 border-t border-border/70 bg-background/50 p-2">
                  {photos.map((p, i) => (
                    <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                      <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-1.5 py-0.5 text-[9px] font-semibold border border-border">
                          {t("Portada", "Cover")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display italic text-[18px] leading-tight">
                      {s.sci_name ?? t("Orquídea sin identificar", "Unidentified orchid")}
                    </div>
                    {s.common_name && (
                      <div className="text-xs text-muted-foreground">{s.common_name}</div>
                    )}
                    {s.taxon_id && (
                      <Link
                        to="/especies/$id"
                        params={{ id: s.taxon_id }}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-leaf"
                      >
                        {t("Ver ficha de la especie →", "View species profile →")}
                      </Link>
                    )}
                  </div>
                  <StatusBadge status={s.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                  <span>{formatRelativeTime(s.observed_at ?? s.created_at, lang)}</span>
                  {hiddenLocation ? (
                    <span className="inline-flex items-center gap-1">
                      <Lock size={12} /> {t("Ubicación oculta", "Location hidden")}
                    </span>
                  ) : s.is_masked ? (
                    <span className="inline-flex items-center gap-1">
                      <Lock size={12} /> {t("Área aproximada", "Approximate area")}
                      {s.public_radius_km ? ` · ~${s.public_radius_km} km` : ""}
                      {s.location_label ? ` · ${s.location_label}` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {s.location_label ?? REGION}
                    </span>
                  )}
                </div>

                {(s.is_sensitive || s.is_masked) && (
                  <div className="mt-3 rounded-xl bg-warn/10 border border-warn/30 px-3 py-2 text-[12px] text-foreground/80 flex gap-2">
                    <ShieldCheck size={14} className="text-warn shrink-0 mt-0.5" />
                    <div>
                      {hiddenLocation
                        ? t(
                            "El observador ocultó la ubicación pública de este registro.",
                            "The observer hid the public location for this record.",
                          )
                        : t(
                            "El sitio exacto no se publica; solo se muestra un área aproximada.",
                            "The exact site is not published; only an approximate area is shown.",
                          )}
                    </div>
                  </div>
                )}

                {s.notes && (
                  <p className="mt-3 text-sm text-foreground/85 whitespace-pre-wrap leading-snug">
                    {s.notes}
                  </p>
                )}
              </div>
            </article>

            <section className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  {t("Discusión", "Discussion")}
                </h2>
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <CheckCircle2 size={12} /> {" "}
                  {t("3 acuerdos → verificado", "3 agreements → verified")}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t(
                  "Las sugerencias de ID son comunitarias. Cuando una especie sugerida acumula 3 personas de acuerdo, el avistamiento se marca como verificado.",
                  "ID suggestions are community-driven. When a suggested species reaches 3 people in agreement, the sighting is marked as verified.",
                )}
              </p>

              <div className="mt-3 space-y-3">
                {commentsQ.isLoading && <div className="h-16 rounded-xl bg-muted animate-pulse" />}
                {commentsQ.data && commentsQ.data.rows.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground text-center">
                    {t(
                      "Nadie ha comentado todavía. Sé el primero en proponer una ID.",
                      "No one has commented yet. Be the first to propose an ID.",
                    )}
                  </div>
                )}
                {commentsQ.data?.rows.map((c) => {
                  const taxon = c.suggested_taxon_id
                    ? commentsQ.data!.taxaById.get(c.suggested_taxon_id)
                    : null;
                  const prof = commentsQ.data!.profById.get(c.user_id);
                  const agrees = commentsQ.data!.agreeBy.get(c.id) ?? [];
                  const support = 1 + agrees.length; // suggester + agreers
                  const iAgree = user ? agrees.includes(user.id) : false;
                  const isMine = user?.id === c.user_id;
                  return (
                    <div key={c.id} className="rounded-2xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          @{prof?.handle ?? "spotter"}
                        </span>
                        <span>{formatRelativeTime(c.created_at, lang)}</span>
                      </div>
                      {taxon && (
                        <div className="mt-2 rounded-lg bg-leaf/10 text-leaf px-2.5 py-1.5 text-xs">
                          {t("Sugiere:", "Suggests:")} {" "}
                          <span className="italic font-semibold">{taxon.sci_name}</span>
                          {taxon.common_name && (
                            <span className="opacity-70"> · {taxon.common_name}</span>
                          )}
                        </div>
                      )}
                      {c.body && (
                        <p className="mt-2 text-sm text-foreground/85 whitespace-pre-wrap leading-snug">
                          {c.body}
                        </p>
                      )}
                      {c.suggested_taxon_id && (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-[11px] text-muted-foreground">
                            {t(`${support} de 3 apoyos`, `${support} of 3 supports`)}
                          </div>
                          {user ? (
                            <button
                              type="button"
                              disabled={isMine || toggleAgree.isPending}
                              onClick={() =>
                                toggleAgree.mutate({ commentId: c.id, agreed: iAgree })
                              }
                              className={
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition " +
                                (isMine
                                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                                  : iAgree
                                    ? "bg-leaf text-leaf-foreground"
                                    : "bg-leaf/10 text-leaf hover:bg-leaf/20")
                              }
                            >
                              <ThumbsUp size={11} /> {" "}
                              {isMine
                                ? t("Tu sugerencia", "Your suggestion")
                                : iAgree
                                  ? t("De acuerdo", "Agreed")
                                  : t("Estoy de acuerdo", "I agree")}
                            </button>
                          ) : (
                            <Link to="/login" className="text-[11px] text-leaf font-semibold">
                              {t("Entra para apoyar", "Sign in to support")}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {user ? (
                <form
                  className="mt-4 rounded-2xl border border-border bg-card p-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addComment.mutate();
                  }}
                >
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Sugerir especie (opcional)", "Suggest a species (optional)")}
                  </label>
                  <TaxonCombobox
                    value={suggested}
                    onChange={(id) => setSuggested(id)}
                    placeholder={t("— Sin sugerencia —", "— No suggestion —")}
                  />
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t(
                      "Comentario, observación de campo, ¿por qué piensas que es esta especie?",
                      "Comment, field observation, why do you think it's this species?",
                    )}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm resize-none"
                  />
                  {addComment.error && (
                    <div className="text-[11px] text-destructive">
                      {(addComment.error as Error).message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={addComment.isPending}
                    className="inline-flex items-center gap-1.5 rounded-full bg-leaf text-leaf-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {addComment.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    {t("Publicar", "Post")}
                  </button>
                </form>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  <Link to="/login" className="text-leaf font-semibold">
                    {t("Entra", "Sign in")}
                  </Link>{" "}
                  {t("para comentar o sugerir una ID.", "to comment or suggest an ID.")}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const { t } = useLang();
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 text-leaf px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
        <BadgeCheck size={11} /> {t("Verificado", "Verified")}
      </span>
    );
  }
  if (status === "needs_id") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orchid/10 text-orchid px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
        <HelpCircle size={11} /> {t("Necesita ID", "Needs ID")}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
        {t("Rechazado", "Rejected")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
      <MessageCircle size={11} /> {t("En revisión", "Under review")}
    </span>
  );
}
