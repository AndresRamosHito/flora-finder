import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Loader2,
  MapPin,
  Shield,
  ArrowLeft,
  Check,
  AlertCircle,
  Lock,
  Mountain,
} from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { stripExifAndDownscale } from "@/lib/exif-strip";
import { TaxonCombobox, type Taxon } from "@/components/TaxonCombobox";
import { useLang } from "@/lib/i18n";
import { HABITAT_OPTIONS, type HabitatType } from "@/lib/habitats";

const MAX_PHOTOS = 8;

type LocationPrivacy = "approx20" | "regional100" | "hidden";

const LOCATION_PRIVACY: Record<
  LocationPrivacy,
  { precision: "fuzzed" | "hidden"; radiusKm: 20 | 100 }
> = {
  approx20: { precision: "fuzzed", radiusKm: 20 },
  regional100: { precision: "fuzzed", radiusKm: 100 },
  hidden: { precision: "hidden", radiusKm: 100 },
};

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Nuevo avistamiento de orquídea · OrquIDea" },
      {
        name: "description",
        content:
          "Registra un nuevo avistamiento de orquídea con fotos, altitud, hábitat, especie sugerida y ubicación protegida. Eliminamos los datos de GPS antes de subir las fotos.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: CapturePage,
});

function CapturePage() {
  const { t, lang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<Blob[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationPrivacy, setLocationPrivacy] = useState<LocationPrivacy>("approx20");
  const [altitudeM, setAltitudeM] = useState("");
  const [altitudeAccuracyM, setAltitudeAccuracyM] = useState("100");
  const [habitatType, setHabitatType] = useState<HabitatType | "">("");
  const [habitatDescription, setHabitatDescription] = useState("");
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [selectedTaxon, setSelectedTaxon] = useState<Taxon | null>(null);
  const [variety, setVariety] = useState("");
  const [origin, setOrigin] = useState<"wild" | "collection">("wild");
  const [stripping, setStripping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  async function handleFiles(selected: FileList) {
    setError(null);
    setStripping(true);
    try {
      const incoming = Array.from(selected).slice(0, MAX_PHOTOS);
      if (incoming.length === 0) return;

      const cleaned = await Promise.all(incoming.map((f) => stripExifAndDownscale(f)));
      const urls = cleaned.map((blob) => URL.createObjectURL(blob));

      setFiles(cleaned);
      setPreviews(urls);

      if (selected.length > MAX_PHOTOS) {
        setError(
          t(
            `Solo se guardarán las primeras ${MAX_PHOTOS} fotos.`,
            `Only the first ${MAX_PHOTOS} photos will be saved.`,
          ),
        );
      }
    } catch (e) {
      setError(
        (e as Error).message ||
          t("No pudimos procesar las fotos.", "We couldn't process the photos."),
      );
    } finally {
      setStripping(false);
    }
  }

  function parsedAltitude() {
    const value = altitudeM.trim();
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < -500 || parsed > 6000) {
      throw new Error(
        t(
          "La altitud debe estar entre -500 y 6000 m.",
          "Altitude must be between -500 and 6000 m.",
        ),
      );
    }
    return parsed;
  }

  async function handleSubmit() {
    if (!user || files.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const altitude = parsedAltitude();
      const uploadedPhotos: { photo_url: string; storage_path: string; position: number }[] = [];

      for (const [position, photo] of files.entries()) {
        const path = `${user.id}/${crypto.randomUUID()}-${position}.jpg`;
        const up = await supabase.storage.from("sightings").upload(path, photo, {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (up.error) throw up.error;

        const pub = supabase.storage.from("sightings").getPublicUrl(path);
        uploadedPhotos.push({
          photo_url: pub.data.publicUrl,
          storage_path: path,
          position,
        });
      }

      const privacy = LOCATION_PRIVACY[locationPrivacy];
      const taxonId = selectedTaxon?.id ?? "";
      const publicRadiusKm = selectedTaxon?.is_sensitive
        ? Math.max(privacy.radiusKm, 100)
        : privacy.radiusKm;
      const ins = await supabase
        .from("sightings")
        .insert({
          user_id: user.id,
          taxon_id: taxonId || null,
          photo_url: uploadedPhotos[0]?.photo_url ?? null,
          observed_at: new Date(observedAt).toISOString(),
          // Store the observer's place text. The public view hides it when precision is hidden.
          location_label: locationLabel || REGION,
          location_precision: privacy.precision,
          public_radius_km: publicRadiusKm,
          altitude_m: altitude,
          altitude_accuracy_m: altitude == null ? null : Number.parseInt(altitudeAccuracyM, 10),
          habitat_type: habitatType || null,
          habitat_description: habitatDescription.trim() || null,
          notes: notes || null,
          variety: variety.trim() || null,
          origin,
          status: taxonId ? "pending" : "needs_id",
        })
        .select("id")
        .single();
      if (ins.error) throw ins.error;

      const photoRows = uploadedPhotos.map((p) => ({
        sighting_id: ins.data.id,
        photo_url: p.photo_url,
        storage_path: p.storage_path,
        position: p.position,
      }));

      const photosIns = await supabase.from("sighting_photos").insert(photoRows);
      if (photosIns.error) throw photosIns.error;

      navigate({ to: "/lista" });
    } catch (e) {
      setError(
        (e as Error).message ||
          t("No pudimos guardar el avistamiento.", "We couldn't save the sighting."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user)
    return (
      <Shell>
        <div className="p-6 text-sm text-muted-foreground">{t("Cargando…", "Loading…")}</div>
      </Shell>
    );

  const effectiveRadius = selectedTaxon?.is_sensitive
    ? Math.max(LOCATION_PRIVACY[locationPrivacy].radiusKm, 100)
    : LOCATION_PRIVACY[locationPrivacy].radiusKm;

  return (
    <Shell>
      <div className="px-4 pt-5 pb-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> {t("Volver", "Back")}
        </Link>
        <h1 className="mt-2 text-2xl font-display font-semibold">
          {t("Nuevo avistamiento", "New sighting")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t(
            "Las fotos se procesan en tu teléfono — eliminamos los datos de GPS antes de subirlas.",
            "Photos are processed on your phone — we strip GPS data before uploading.",
          )}
        </p>

        <div className="mt-5">
          {previews.length > 0 ? (
            <div className="rounded-2xl overflow-hidden border border-border bg-card p-2">
              <div className="grid grid-cols-2 gap-2">
                {previews.map((src, i) => (
                  <div
                    key={src}
                    className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold border border-border">
                        {t("Portada", "Cover")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 text-leaf px-2 py-1 text-[10px] font-semibold">
                  <Shield size={11} /> {t("EXIF eliminado", "EXIF stripped")}
                </span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full bg-background px-3 py-1.5 text-xs font-medium border border-border"
                >
                  {t("Cambiar fotos", "Change photos")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-64 rounded-2xl border-2 border-dashed border-border bg-card grid place-items-center text-muted-foreground hover:bg-accent/30 transition"
            >
              {stripping ? (
                <span className="flex flex-col items-center gap-2 text-xs">
                  <Loader2 size={28} className="animate-spin" /> {t("Procesando…", "Processing…")}
                </span>
              ) : (
                <span className="flex flex-col items-center gap-2 text-xs">
                  <Camera size={32} />{" "}
                  {t("Toca para tomar o elegir fotos", "Tap to take or choose photos")}
                </span>
              )}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        <Field
          label={t(
            "Especie (puedes dejarlo en blanco si no estás seguro)",
            "Species (leave blank if unsure)",
          )}
        >
          <TaxonCombobox
            value={selectedTaxon?.id ?? ""}
            onChange={(_id, tx) => {
              setSelectedTaxon(tx);
              if (tx && !tx.is_native) setOrigin("collection");
            }}
            placeholder={t(
              "— Sin identificar (pediremos ayuda) —",
              "— Unidentified (we'll ask for help) —",
            )}
          />
          {selectedTaxon && !selectedTaxon.is_native && (
            <div className="mt-2 rounded-xl bg-warn/10 border border-warn/30 px-3 py-2 text-[11px] text-foreground/80">
              <span className="font-semibold">
                {t("No nativa de México.", "Not native to Mexico.")}
              </span>{" "}
              {t(
                "Esta especie no forma parte de la flora silvestre mexicana, así que tu registro se guardará como ejemplar",
                "This species isn't part of Mexico's wild flora, so your record will be saved as a specimen",
              )}{" "}
              <span className="font-semibold">{t("en colección", "in collection")}</span>{" "}
              {t(
                "y no aparecerá en el mapa de distribución silvestre.",
                "and won't appear on the wild distribution map.",
              )}
            </div>
          )}
        </Field>

        <Field label={t("Variedad o subespecie (opcional)", "Variety or subspecies (optional)")}>
          <input
            value={variety}
            onChange={(e) => setVariety(e.target.value.slice(0, 120))}
            placeholder={t(
              "Ej. var. alba, subsp. majus, forma peloric…",
              "e.g. var. alba, subsp. majus, peloric form…",
            )}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm italic"
          />
        </Field>

        <Field label={t("Origen del ejemplar", "Specimen origin")}>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  v: "wild",
                  label: t("En su hábitat", "In habitat"),
                  hint: t("Observación silvestre", "Wild observation"),
                },
                {
                  v: "collection",
                  label: t("En colección", "In collection"),
                  hint: t("Cultivo o colección particular", "Cultivated or private collection"),
                },
              ] as const
            ).map((opt) => {
              const active = origin === opt.v;
              const disabled = opt.v === "wild" && !!selectedTaxon && !selectedTaxon.is_native;
              return (
                <button
                  key={opt.v}
                  type="button"
                  disabled={disabled}
                  onClick={() => setOrigin(opt.v)}
                  className={
                    "rounded-xl border px-3 py-2 text-left text-xs transition " +
                    (disabled
                      ? "border-border bg-muted/40 text-muted-foreground/50 cursor-not-allowed"
                      : active
                        ? "border-leaf bg-leaf/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent/30")
                  }
                >
                  <div
                    className={
                      "text-sm font-medium " +
                      (disabled ? "text-muted-foreground/60" : "text-foreground")
                    }
                  >
                    {opt.label}
                  </div>
                  <div className="mt-0.5">{opt.hint}</div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t("Lugar privado para tu registro", "Private place for your record")}>
          <div className="relative">
            <MapPin
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder={t(
                "Ej. cerca de Capulálpam, encinar",
                "e.g. near Capulálpam, oak forest",
              )}
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t(
              "Este texto se guarda para ti. Su visibilidad pública depende de la opción de privacidad abajo.",
              "This text is saved for you. Its public visibility depends on the privacy option below.",
            )}
          </p>
        </Field>

        <Field label={t("Privacidad de ubicación", "Location privacy")}>
          <div className="space-y-2">
            <PrivacyOption
              active={locationPrivacy === "approx20"}
              onClick={() => setLocationPrivacy("approx20")}
              title={t("Ocultar sitio exacto · área ~20 km", "Hide exact site · ~20 km area")}
              body={t(
                "Opción por defecto. La comunidad ve solo una zona aproximada, no el punto real.",
                "Default. The community sees only an approximate area, not the real point.",
              )}
            />
            <PrivacyOption
              active={locationPrivacy === "regional100"}
              onClick={() => setLocationPrivacy("regional100")}
              title={t(
                "Oscurecer regionalmente · área ~100 km",
                "Regional obscuring · ~100 km area",
              )}
              body={t(
                "Útil para poblaciones delicadas o sitios con riesgo de colecta.",
                "Useful for delicate populations or sites at risk of collection.",
              )}
            />
            <PrivacyOption
              active={locationPrivacy === "hidden"}
              onClick={() => setLocationPrivacy("hidden")}
              title={t("Ocultar ubicación pública", "Hide public location")}
              body={t(
                "No se muestra punto ni texto de ubicación al público.",
                "No public point or location text is shown.",
              )}
            />
          </div>
          <div className="mt-2 rounded-xl bg-leaf/10 border border-leaf/20 px-3 py-2 text-[11px] text-foreground/80 flex gap-2">
            <Lock size={13} className="text-leaf shrink-0 mt-0.5" />
            <span>
              {locationPrivacy === "hidden"
                ? t(
                    "Este registro no tendrá ubicación pública.",
                    "This record will have no public location.",
                  )
                : t(
                    `Área pública aproximada: ${effectiveRadius} km.`,
                    `Approximate public area: ${effectiveRadius} km.`,
                  )}
            </span>
          </div>
        </Field>

        <div className="mt-4 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
            <Mountain size={14} className="text-leaf" />
            {t("Contexto botánico", "Botanical context")}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
            {t(
              "No tomamos coordenadas GPS. Puedes registrar una altitud estimada y el hábitat alrededor de la planta.",
              "We do not take GPS coordinates. You can record estimated altitude and the habitat around the plant.",
            )}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-medium text-foreground/80">
                {t("Altitud estimada (m)", "Estimated altitude (m)")}
              </span>
              <input
                inputMode="numeric"
                value={altitudeM}
                onChange={(e) => setAltitudeM(e.target.value.replace(/[^0-9-]/g, "").slice(0, 5))}
                placeholder="1800"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-foreground/80">
                {t("Precisión", "Accuracy")}
              </span>
              <select
                value={altitudeAccuracyM}
                onChange={(e) => setAltitudeAccuracyM(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="50">±50 m</option>
                <option value="100">±100 m</option>
                <option value="250">±250 m</option>
                <option value="500">±500 m</option>
                <option value="1000">±1000 m</option>
              </select>
            </label>
          </div>

          <label className="block mt-3">
            <span className="text-[11px] font-medium text-foreground/80">
              {t("Tipo de hábitat", "Habitat type")}
            </span>
            <select
              value={habitatType}
              onChange={(e) => setHabitatType(e.target.value as HabitatType | "")}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("— No estoy seguro —", "— Not sure —")}</option>
              {HABITAT_OPTIONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {lang === "en" ? h.en : h.es}
                </option>
              ))}
            </select>
            {habitatType && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {lang === "en"
                  ? HABITAT_OPTIONS.find((h) => h.value === habitatType)?.hintEn
                  : HABITAT_OPTIONS.find((h) => h.value === habitatType)?.hintEs}
              </p>
            )}
          </label>

          <label className="block mt-3">
            <span className="text-[11px] font-medium text-foreground/80">
              {t("Descripción del hábitat alrededor", "Surrounding habitat description")}
            </span>
            <textarea
              value={habitatDescription}
              onChange={(e) => setHabitatDescription(e.target.value)}
              rows={3}
              placeholder={t(
                "Ej. ladera húmeda orientada al este, encinos bajos, suelo calizo, muchas bromelias; planta epífita a 3 m del suelo.",
                "e.g. humid east-facing slope, low oaks, limestone soil, many bromeliads; epiphyte 3 m above ground.",
              )}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <Field label={t("Cuándo", "When")}>
          <input
            type="datetime-local"
            value={observedAt}
            onChange={(e) => setObservedAt(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        <Field label={t("Notas adicionales", "Additional notes")}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t(
              "Hospedero, número de plantas, floración, frutos, polinizadores, amenazas visibles…",
              "Host tree, number of plants, flowering, fruits, pollinators, visible threats…",
            )}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        {selectedTaxon?.is_sensitive && (
          <div className="mt-4 rounded-xl bg-warn/10 border border-warn/30 px-3 py-2.5 text-xs text-foreground/80 flex gap-2">
            <Shield size={14} className="text-warn shrink-0 mt-0.5" />
            {t(
              "Especie sensible — si se muestra en mapa, se publicará como área de al menos 100 km.",
              "Sensitive species — if shown on the map, it will be published as an area of at least 100 km.",
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive flex gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={files.length === 0 || submitting}
          className="mt-6 w-full rounded-2xl bg-leaf text-leaf-foreground py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {t("Guardar avistamiento", "Save sighting")}
        </button>
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

function PrivacyOption({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full rounded-xl border px-3 py-2 text-left transition " +
        (active
          ? "border-leaf bg-leaf/10 text-foreground"
          : "border-border bg-background text-foreground/80 hover:bg-accent/30")
      }
    >
      <div className="text-xs font-semibold">{title}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{body}</div>
    </button>
  );
}
