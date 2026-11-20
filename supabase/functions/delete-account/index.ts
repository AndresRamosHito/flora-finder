// Deletes the signed-in user's OrquIDea account and everything linked to it.
//
// Flow: verify the caller's JWT -> remove their files from Storage (sightings,
// profile-photos; both keyed by user id as the first folder) -> delete the auth
// user. Deleting auth.users cascades to profiles and from there to sightings,
// photos, comments, likes, verifications, society memberships and messages, and
// direct messages. Trade reports they filed are kept but de-identified
// (reporter_id set to null) because they document suspected illegal trade.
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKETS = ["sightings", "profile-photos"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
async function listAll(admin: any, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      // Folders come back without an id; recurse into them.
      if (item.id === null) out.push(...(await listAll(admin, bucket, path)));
      else out.push(path);
    }
    if (data.length < 1000) break;
    offset += data.length;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "not signed in" }, 401);

  let body: { confirm?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  if (body.confirm !== "ELIMINAR") return json({ error: "confirmation required" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: "invalid session" }, 401);
  const uid = userData.user.id;

  try {
    for (const bucket of BUCKETS) {
      const paths = await listAll(admin, bucket, uid);
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
        if (error) throw error;
      }
    }
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) throw delErr;
  } catch (e) {
    console.error("delete-account failed", uid, e);
    return json({ error: "deletion failed" }, 500);
  }

  return json({ ok: true });
});
