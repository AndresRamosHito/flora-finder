const COLORS: Record<string, string> = {
  "En peligro":   "#B23A3A",
  "Amenazada":    "#C0712B",
  "Vulnerable":   "#A98A1E",
  "Preoc. menor": "#4F7A55",
};

export function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const c = COLORS[status] ?? "#4F7A55";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: c, borderColor: c + "55", background: c + "12" }}
    >
      {status}
    </span>
  );
}
