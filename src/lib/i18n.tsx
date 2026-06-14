import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

const STORAGE_KEY = "orquidea.lang";

type I18nContext = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Inline translator: pass the Spanish (source) and English strings. */
  t: (es: string, en: string) => string;
};

const LanguageContext = createContext<I18nContext | null>(null);

function readStoredLang(): Lang {
  if (typeof document === "undefined") return "es";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
    const nav = navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("en")) return "en";
  } catch {
    /* storage blocked — fall back to default */
  }
  return "es";
}

/**
 * Language provider. To keep SSR and the first client render in sync (and avoid
 * hydration mismatches), it starts in Spanish — the canonical content language —
 * and reconciles to the stored/browser preference right after mount.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const initial = readStoredLang();
    if (initial !== "es") setLangState(initial);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* persistence is best-effort */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value = useMemo<I18nContext>(
    () => ({
      lang,
      setLang: setLangState,
      t: (es, en) => (lang === "en" ? en : es),
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Access the current language and translator. Falls back to Spanish when used
 * outside a provider (e.g. top-level error boundaries) so it never throws.
 */
export function useLang(): I18nContext {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return { lang: "es", setLang: () => {}, t: (es) => es };
  }
  return ctx;
}

/** Locale-aware "time ago" used by the feed and sighting detail. */
export function formatRelativeTime(iso: string, lang: Lang): string {
  const en = lang === "en";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return en ? "now" : "ahora";
  if (m < 60) return en ? `${m} min ago` : `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return en ? `${h} h ago` : `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return en ? "yesterday" : "ayer";
  if (d < 7) return en ? `${d} d ago` : `hace ${d} d`;
  const w = Math.floor(d / 7);
  return en ? `${w} wk ago` : `hace ${w} sem`;
}

/** A compact segmented ES / EN switch. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className={
        "inline-flex items-center rounded-full border border-border bg-card p-0.5 text-[10px] font-bold leading-none " +
        className
      }
    >
      {(["es", "en"] as const).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            className={
              "rounded-full px-1.5 py-1 transition " +
              (active
                ? "bg-leaf text-leaf-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
