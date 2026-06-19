export type ProfileLinkTarget = {
  id?: string | null;
  handle?: string | null;
};

export function profileKey(profile?: ProfileLinkTarget | null) {
  const raw = profile?.handle?.trim() || profile?.id?.trim() || "";
  return raw.replace(/^@+/, "");
}

export function profileHref(profile?: ProfileLinkTarget | null) {
  const key = profileKey(profile);
  return key ? `/u/${encodeURIComponent(key)}` : null;
}

export function profileLabel(profile?: { display_name?: string | null; handle?: string | null } | null) {
  return profile?.display_name?.trim() || profile?.handle?.trim() || "Spotter";
}

export function profileHandleLabel(profile?: { handle?: string | null } | null) {
  const handle = profile?.handle?.trim();
  return handle ? `@${handle.replace(/^@+/, "")}` : "@spotter";
}

export function sanitizeProfileSearch(raw: string) {
  return raw.replace(/[%,()*\\]/g, " ").trim();
}
