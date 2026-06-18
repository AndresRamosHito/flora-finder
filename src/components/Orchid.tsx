import { paletteFor } from "@/lib/orchid-palette";

/** Stylized SVG orchid keyed by scientific name. */
export function Orchid({
  sciName,
  size = 120,
}: {
  sciName: string | null | undefined;
  size?: number;
}) {
  const t = paletteFor(sciName);
  const uid = "g_" + (sciName ?? "x").replace(/\W/g, "_") + "_" + size;
  const tepals = [90, 162, 234, 306, 18];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <defs>
        <radialGradient id={uid + "bg"} cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor={t.c2} stopOpacity="0.10" />
        </radialGradient>
        <linearGradient id={uid + "p"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.c1} />
          <stop offset="100%" stopColor={t.c2} />
        </linearGradient>
      </defs>
      <circle cx="60" cy="58" r="56" fill={"url(#" + uid + "bg)"} />
      {tepals.map((a, i) => (
        <g key={i} transform={`rotate(${a} 60 60)`}>
          <ellipse
            cx="60"
            cy="28"
            rx="13"
            ry="27"
            fill={"url(#" + uid + "p)"}
            stroke="rgba(0,0,0,0.06)"
          />
        </g>
      ))}
      <ellipse cx="60" cy="80" rx="17" ry="20" fill={t.lip} opacity="0.95" />
      <ellipse cx="60" cy="76" rx="9" ry="11" fill="#ffffff" opacity="0.18" />
      <ellipse cx="60" cy="60" rx="6.5" ry="9" fill="#fffdf6" opacity="0.92" />
      <circle cx="60" cy="58" r="2.6" fill={t.lip} opacity="0.8" />
    </svg>
  );
}
