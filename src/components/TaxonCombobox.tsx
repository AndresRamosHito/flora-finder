import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, Shield, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Taxon = {
  id: string;
  sci_name: string;
  common_name: string | null;
  is_sensitive: boolean;
  is_native: boolean;
};

type Props = {
  value: string;
  onChange: (taxonId: string, taxon: Taxon | null) => void;
  placeholder?: string;
};

function NonNativeTag() {
  return (
    <span className="inline-flex items-center align-middle ml-1.5 rounded-full bg-warn/15 text-warn px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide not-italic">
      No nativa
    </span>
  );
}

/** Autocomplete combobox over the full taxa catalog (~1300 Mexican orchid species). */
export function TaxonCombobox({ value, onChange, placeholder }: Props) {
  const [taxa, setTaxa] = useState<Taxon[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("taxa")
      .select("id, sci_name, common_name, is_sensitive, is_native")
      .order("sci_name")
      .limit(5000)
      .then(({ data }) => {
        if (data) setTaxa(data as Taxon[]);
      });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = useMemo(() => taxa.find((t) => t.id === value) || null, [taxa, value]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return taxa.slice(0, 80);
    const out: Taxon[] = [];
    for (const t of taxa) {
      const hay = (t.sci_name + " " + (t.common_name ?? "")).toLowerCase();
      if (hay.includes(q)) {
        out.push(t);
        if (out.length >= 80) break;
      }
    }
    return out;
  }, [query, taxa]);

  function pick(t: Taxon | null) {
    onChange(t?.id ?? "", t);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left text-sm"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected ? (
            <>
              <span className="italic">{selected.sci_name}</span>
              {selected.common_name ? (
                <span className="text-muted-foreground"> · {selected.common_name}</span>
              ) : null}
              {selected.is_sensitive ? (
                <Shield size={12} className="inline ml-1 text-warn" />
              ) : null}
              {!selected.is_native ? <NonNativeTag /> : null}
            </>
          ) : (
            placeholder || "Buscar especie…"
          )}
        </span>
        <span className="flex items-center gap-1">
          {selected && (
            <X
              size={14}
              className="text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
              }}
            />
          )}
          <ChevronsUpDown size={14} className="text-muted-foreground" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe nombre científico o común…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {!taxa.length && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Cargando catálogo…</li>
            )}
            {taxa.length > 0 && results.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Sin resultados.</li>
            )}
            {results.map((t) => {
              const isSel = t.id === value;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => pick(t)}
                    className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50"
                  >
                    <Check
                      size={14}
                      className={isSel ? "mt-0.5 opacity-100" : "mt-0.5 opacity-0"}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="italic">{t.sci_name}</span>
                      {t.common_name && (
                        <span className="text-muted-foreground"> · {t.common_name}</span>
                      )}
                      {t.is_sensitive && <Shield size={11} className="inline ml-1 text-warn" />}
                      {!t.is_native && <NonNativeTag />}
                    </span>
                  </button>
                </li>
              );
            })}
            {taxa.length > 0 && !query && taxa.length > results.length && (
              <li className="px-3 py-1.5 text-[10px] text-muted-foreground text-center">
                Mostrando {results.length} de {taxa.length} — escribe para filtrar
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
