import { Flower2 } from "lucide-react";

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-16 w-16",
} as const;

const iconSizes = {
  sm: 13,
  md: 17,
  lg: 26,
} as const;

export function ProfileAvatar({
  url,
  label,
  size = "md",
  className = "",
}: {
  url?: string | null;
  label?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const classes = `${sizeClasses[size]} shrink-0 overflow-hidden rounded-full bg-background/25 ring-1 ring-border/40 grid place-items-center ${className}`;
  const alt = label ? `Avatar de ${label}` : "Avatar de perfil";

  if (url) {
    return <img src={url} alt={alt} className={`${classes} object-cover`} loading="lazy" />;
  }

  return (
    <span className={classes} aria-label={alt} role="img">
      <Flower2 size={iconSizes[size]} />
    </span>
  );
}
