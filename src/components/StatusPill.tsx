import { useLang } from "@/lib/i18n";

const COLORS: Record<string, string> = {
  "En peligro": "#B23A3A",
  Amenazada: "#C0712B",
  Vulnerable: "#A98A1E",
  "Preoc. menor": "#4F7A55",
};

// Conservation status is stored in Spanish in the catalog; map to English labels.
const EN_LABELS: Record<string, string> = {
  "En peligro": "Endangered",
  Amenazada: "Threatened",
  Vulnerable: "Vulnerable",
  "Preoc. menor": "Least concern",
};

export function StatusPill({ status }: { status: string | null | undefined }) {
  const { lang } = useLang();
  if (!status) return null;
  const c = COLORS[status] ?? "#4F7A55";
  const label = lang === "en" ? (EN_LABELS[status] ?? status) : status;
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: c, borderColor: c + "55", background: c + "12" }}
    >
      {label}
    </span>
  );
}
