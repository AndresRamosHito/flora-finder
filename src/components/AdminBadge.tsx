import { Flower2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function AdminBadge({ label }: { label?: string | null }) {
  const { t } = useLang();
  const text = label?.trim() || t("Admin Orchidarc", "Orchidarc Admin");

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-orchid/35 bg-orchid/15 px-2.5 py-1 text-[10px] font-semibold text-orchid">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-orchid text-orchid-foreground">
        <Flower2 size={10} />
      </span>
      {text}
    </span>
  );
}
