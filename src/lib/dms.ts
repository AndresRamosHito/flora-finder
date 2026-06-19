import { supabase } from "@/integrations/supabase/client";

export type DmProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type DmMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type DmParticipant = {
  thread_id: string;
  user_id: string;
};

export type DmThreadSummary = {
  thread_id: string;
  other: DmProfile | null;
  last_message: DmMessage | null;
};

type RpcOneUuid = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: string | null; error: { message: string } | null }>;

type InsertDmMessageTable = {
  insert: (values: { thread_id: string; sender_id: string; body: string }) => Promise<{
    error: { message: string } | null;
  }>;
};

export async function getOrCreateDmThread(otherUserId: string) {
  const rpc = supabase.rpc as unknown as RpcOneUuid;
  const { data, error } = await rpc("get_or_create_dm_thread", { p_other_user_id: otherUserId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No DM thread returned");
  return data;
}

export async function sendDmMessage(threadId: string, senderId: string, body: string) {
  const trimmed = body.trim().slice(0, 2000);
  if (!trimmed) return;
  const dmMessages = supabase.from("dm_messages" as never) as unknown as InsertDmMessageTable;
  const { error } = await dmMessages.insert({
    thread_id: threadId,
    sender_id: senderId,
    body: trimmed,
  });
  if (error) throw new Error(error.message);
}

export async function fetchDmMessages(threadId: string) {
  const { data, error } = await supabase
    .from("dm_messages" as never)
    .select("id, thread_id, sender_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as DmMessage[];
}

export async function fetchDmThreadProfiles(threadId: string) {
  const participants = await supabase
    .from("dm_participants" as never)
    .select("thread_id, user_id")
    .eq("thread_id", threadId);
  if (participants.error) throw participants.error;

  const userIds = ((participants.data ?? []) as DmParticipant[])
    .map((p) => p.user_id)
    .filter(Boolean);
  if (userIds.length === 0) return new Map<string, DmProfile>();

  const profiles = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .in("id", userIds);
  if (profiles.error) throw profiles.error;

  return new Map((profiles.data ?? []).map((profile) => [profile.id, profile as DmProfile]));
}

export async function fetchDmThreads(currentUserId: string) {
  const participants = await supabase
    .from("dm_participants" as never)
    .select("thread_id, user_id");
  if (participants.error) throw participants.error;

  const rows = (participants.data ?? []) as DmParticipant[];
  const threadIds = Array.from(
    new Set(rows.filter((row) => row.user_id === currentUserId).map((row) => row.thread_id)),
  );
  if (threadIds.length === 0) return [] as DmThreadSummary[];

  const otherIds = Array.from(
    new Set(
      rows
        .filter((row) => threadIds.includes(row.thread_id) && row.user_id !== currentUserId)
        .map((row) => row.user_id),
    ),
  );

  const profiles = otherIds.length
    ? await supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", otherIds)
    : { data: [], error: null };
  if (profiles.error) throw profiles.error;

  const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile as DmProfile]));

  const messages = await supabase
    .from("dm_messages" as never)
    .select("id, thread_id, sender_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false })
    .limit(200);
  if (messages.error) throw messages.error;

  const lastByThread = new Map<string, DmMessage>();
  for (const message of (messages.data ?? []) as DmMessage[]) {
    if (!lastByThread.has(message.thread_id)) lastByThread.set(message.thread_id, message);
  }

  return threadIds
    .map((threadId) => {
      const otherParticipant = rows.find(
        (row) => row.thread_id === threadId && row.user_id !== currentUserId,
      );
      return {
        thread_id: threadId,
        other: otherParticipant ? (profileById.get(otherParticipant.user_id) ?? null) : null,
        last_message: lastByThread.get(threadId) ?? null,
      };
    })
    .sort((a, b) => {
      const ad = a.last_message?.created_at ?? "";
      const bd = b.last_message?.created_at ?? "";
      return bd.localeCompare(ad);
    });
}
