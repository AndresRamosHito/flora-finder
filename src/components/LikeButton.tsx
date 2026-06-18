import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/lib/i18n";
import { toggleLike } from "@/lib/likes";

/**
 * Like (upvote) a community observation. More likes push a photo up the
 * "see observations" ranking and make it the species' herbarium image.
 * Optimistic; reconciles to server state via the invalidated query keys.
 */
export function LikeButton({
  sightingId,
  count,
  liked,
  invalidateKeys = [],
  size = "md",
}: {
  sightingId: string;
  count: number;
  liked: boolean;
  invalidateKeys?: QueryKey[];
  size?: "sm" | "md";
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [optimisticLiked, setOptimisticLiked] = useState(liked);
  const [optimisticCount, setOptimisticCount] = useState(count);

  // Reconcile with fresh server data when the parent query refetches.
  useEffect(() => setOptimisticLiked(liked), [liked]);
  useEffect(() => setOptimisticCount(count), [count]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth required");
      await toggleLike(sightingId, user.id, optimisticLiked);
    },
    onMutate: () => {
      setOptimisticLiked((v) => !v);
      setOptimisticCount((c) => c + (optimisticLiked ? -1 : 1));
    },
    onError: () => {
      // revert
      setOptimisticLiked(liked);
      setOptimisticCount(count);
    },
    onSettled: async () => {
      await Promise.all(invalidateKeys.map((k) => qc.invalidateQueries({ queryKey: k })));
    },
  });

  const pad = size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs";
  const iconSize = size === "sm" ? 12 : 14;

  if (!user) {
    return (
      <Link
        to="/login"
        aria-label={t("Entra para dar me gusta", "Sign in to like")}
        className={
          "inline-flex items-center gap-1 rounded-full border border-border bg-card font-semibold text-muted-foreground hover:text-foreground transition " +
          pad
        }
      >
        <Heart size={iconSize} /> {optimisticCount > 0 ? optimisticCount : ""}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!mutation.isPending) mutation.mutate();
      }}
      aria-pressed={optimisticLiked}
      aria-label={optimisticLiked ? t("Quitar me gusta", "Remove like") : t("Me gusta", "Like")}
      className={
        "inline-flex items-center gap-1 rounded-full border font-semibold transition " +
        pad +
        " " +
        (optimisticLiked
          ? "bg-orchid/10 text-orchid border-orchid/30"
          : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-orchid/30")
      }
    >
      <Heart size={iconSize} className={optimisticLiked ? "fill-current" : ""} />
      {optimisticCount > 0 ? optimisticCount : ""}
    </button>
  );
}
