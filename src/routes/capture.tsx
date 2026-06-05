import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, MapPin, Shield, ArrowLeft, Check, AlertCircle, LocateFixed, RefreshCw } from "lucide-react";
import { Shell, REGION } from "@/components/Shell";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { stripExifAndDownscale } from "@/lib/exif-strip";

export const Route = createFileRoute("/capture")({
  head: () => ({ meta: [{ title: "Nuevo avistamiento · OrquIDea" }, { name: "robots", content: "noindex" }] }),
  component: CapturePage,
});

type Taxon = { id: string; sci_name: string; common_name: string | null; is_sensitive: boolean };

type CapturedCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function formatCoord(value: number) {
  return value.toFixed(5);
}

function geoErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Permiso de ubicación denegado. Puedes guardar el avistamiento con lugar general, pero no aparecerá como punto preciso en el mapa.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "No pudimos obtener tu ubicación. Revisa señal/GPS o escribe un lugar general.";
  }
  if (error.code === error.TIMEOUT) {
    return "El GPS tardó demasiado. Intenta actualizar la ubicación o guarda con lugar general.";
  }
  return "No pudimos obtener tu ubicación. Puedes guardar con lugar general.";
}

function CapturePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [taxonId, setTaxonId] = useState<string>("");
  const [locationLabel, setLocationLabel] = useState("");
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<CapturedCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [taxa, setTaxa] = useState<Taxon[]>([]);
  const [stripping, setStripping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    setGeoError(null);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoError("Este navegador no permite capturar ubicación GPS. Escribe un lugar general.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
        setLocating(false);
      },
      (positionError) => {
        setGeoError(geoErrorMessage(positionError));
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && !coords && !geoError) requestLocation();
  }, [loading, user, coords, geoError, requestLocation]);

  useEffect(() => {
    supabase.from("taxa").select("id, sci_name, common_name, is_sensitive").order("sci_name").then(({ data }) => {
      if (data) setTaxa(data as Taxon[]);
    });
  }, []);

  async function handleFile(f: File) {
    setError(null);
    setStripping(true);
    try {
      const cleaned = await stripExifAndDownscale(f);
      setFile(cleaned);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(cleaned));
    } catch (e) {
      setError((e as Error).message || "No pudimos procesar la foto.");
    } finally {
      setStripping(false);
    }
  }

  async function handleSubmit() {
    if (!user || !file) return;
    setSubmitting(true);
    setError(null);
    try {
      const ext = "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("sightings").upload(path, file, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (up.error) throw up.error;
      const pub = supabase.storage.from("sightings").getPublicUrl(path);

      const ins = await supabase.from("sightings").insert({
        user_id: user.id,
        taxon_id: taxonId || null,
        photo_url: pub.data.publicUrl,
        observed_at: new Date(observedAt).toISOString(),
        lat: coords?.latitude ?? null,
        lng: coords?.longitude ?? null,
        location_label: locationLabel || REGION,
        // Always mark user-submitted locations as fuzzed for the public surface.
        // The server-side views/RPCs remain responsible for masking sensitive taxa.
        location_precision: "fuzzed",
        notes: notes || null,
        status: taxonId ? "pending" : "needs_id",
      });
      if (ins.error) throw ins.error;
      navigate({ to: "/lista" });
    } catch (e) {
      setError((e as Error).message || "No pudimos guardar el avistamiento.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return <Shell><div className="p-6 text-sm text-muted-foreground">Cargando…</div></Shell>;

  const selectedTaxon = taxa.find((t) => t.id === taxonId);

  return (
    <Shell>
      <div className="px-4 pt-5 pb-10">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={12} /> Volver
        </Link>
        <h1 className="mt-2 text-2xl font-display font-semibold">Nuevo avistamiento</h1>
        <p className="text-xs text-muted-foreground mt-1">La foto se procesa en tu teléfono — eliminamos los datos de GPS antes de subirla.</p>

        <div className="mt-5">
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
              <img src={preview} alt="" className="w-full h-64 object-cover" />
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-leaf/90 text-leaf-foreground px-2 py-1 text-[10px] font-semibold">
                <Shield size={11} /> EXIF eliminado
              </span>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium border border-border"
              >
                Cambiar foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-64 rounded-2xl border-2 border-dashed border-border bg-card grid place-items-center text-muted-foreground hover:bg-accent/30 transition"
            >
              {stripping ? (
                <span className="flex flex-col items-center gap-2 text-xs"><Loader2 size={28} className="animate-spin" /> Procesando…</span>
              ) : (
                <span className="flex flex-col items-center gap-2 text-xs"><Camera size={32} /> Toca para tomar o elegir foto</span>
              )}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        <Field label="Coordenadas GPS privadas">
          <div className="rounded-xl border border-border bg-card px-3 py-3 text-xs">
            {coords ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground/85">
                  <LocateFixed size={14} className="text-leaf" /> GPS capturado
                </div>
                <div className="text-muted-foreground">
                  {formatCoord(coords.latitude)}, {formatCoord(coords.longitude)}
                  {coords.accuracy != null ? ` · precisión aprox. ${Math.round(coords.accuracy)} m` : ""}
                </div>
                <div className="text-muted-foreground leading-snug">
                  La foto no conserva EXIF. Las coordenadas se guardan por separado y la publicación depende de la política de enmascaramiento del servidor.
                </div>
              </div>
            ) : locating ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Obteniendo ubicación…
              </div>
            ) : (
              <div className="space-y-1 text-muted-foreground">
                <div>No hay GPS capturado. El avistamiento se guardará con lugar general.</div>
                {geoError && <div className="text-warn">{geoError}</div>}
              </div>
            )}
            <button
              type="button"
              onClick={requestLocation}
              disabled={locating}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground disabled:opacity-60"
            >
              {locating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {coords ? "Actualizar GPS" : "Capturar GPS"}
            </button>
          </div>
        </Field>

        <Field label="Especie (puedes dejarlo en blanco si no estás seguro)">
          <select
            value={taxonId}
            onChange={(e) => setTaxonId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— Sin identificar (pediremos ayuda) —</option>
            {taxa.map((t) => (
              <option key={t.id} value={t.id}>
                {t.sci_name}{t.common_name ? ` · ${t.common_name}` : ""}{t.is_sensitive ? " 🛡" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Lugar (texto general, sin coordenadas exactas)">
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder="Ej. cerca de Capulálpam, encinar"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </Field>

        <Field label="Cuándo">
          <input
            type="datetime-local"
            value={observedAt}
            onChange={(e) => setObservedAt(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Notas (hábitat, hospedero, etc.)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>

        {selectedTaxon?.is_sensitive && (
          <div className="mt-4 rounded-xl bg-warn/10 border border-warn/30 px-3 py-2.5 text-xs text-foreground/80 flex gap-2">
            <Shield size={14} className="text-warn shrink-0 mt-0.5" />
            Especie sensible — su ubicación se publicará solo como región amplia, nunca como punto exacto.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-xs text-destructive flex gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || submitting}
          className="mt-6 w-full rounded-2xl bg-leaf text-leaf-foreground py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Guardar avistamiento
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
