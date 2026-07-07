import type { ChatDb } from "@/lib/chat-db";
import {
  peerPhoto,
  peerTitle,
  vkApiCall,
  type VkConversationsResponse,
  type VkHistoryResponse,
} from "./vk-client";

export async function syncVkConversations(
  db: ChatDb,
  accessToken: string,
): Promise<number> {
  const data = await vkApiCall<VkConversationsResponse>(
    "messages.getConversations",
    { count: 50, extended: 1, fields: "photo_100" },
    accessToken,
  );

  const profiles = data.profiles ?? [];
  const groups = data.groups ?? [];
  let synced = 0;

  for (const item of data.items ?? []) {
    const peerId = Number(item.conversation.peer.id);
    const last = item.last_message;
    const chatSettings = item.conversation.chat_settings;

    const title = peerTitle(peerId, profiles, groups, chatSettings?.title);
    const photo = peerPhoto(
      peerId,
      profiles,
      groups,
      chatSettings?.photo?.photo_100,
    );

    const { error } = await db.from("vk_conversations").upsert(
      {
        peer_id: peerId,
        title,
        photo_url: photo,
        last_message_text: last?.text ?? "",
        last_message_at: last?.date
          ? new Date(last.date * 1000).toISOString()
          : null,
        unread_count: item.unread_count ?? 0,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "peer_id" },
    );

    if (error) throw error;
    synced += 1;
  }

  return synced;
}

export async function syncVkHistory(
  db: ChatDb,
  accessToken: string,
  peerId: number,
  count = 50,
): Promise<number> {
  const normalizedPeerId = Number(peerId);
  const data = await vkApiCall<VkHistoryResponse>(
    "messages.getHistory",
    { peer_id: normalizedPeerId, count, extended: 1, fields: "photo_100" },
    accessToken,
  );

  const rows = (data.items ?? []).map((m) => ({
    vk_message_id: m.id,
    peer_id: normalizedPeerId,
    from_id: m.from_id,
    text: m.text ?? "",
    is_outgoing: m.out === 1,
    vk_date: m.date,
  }));

  if (rows.length === 0) return 0;

  const { error } = await db
    .from("vk_messages")
    .upsert(rows, { onConflict: "peer_id,vk_message_id", ignoreDuplicates: true });

  if (error) throw error;
  return rows.length;
}

export async function syncAllVkChat(
  db: ChatDb,
  accessToken: string,
): Promise<{
  conversations: number;
  messages: number;
}> {
  const conversations = await syncVkConversations(db, accessToken);

  const { data: peers, error } = await db
    .from("vk_conversations")
    .select("peer_id")
    .order("last_message_at", { ascending: false })
    .limit(30);

  if (error) throw error;

  let messages = 0;
  for (const row of peers ?? []) {
    try {
      messages += await syncVkHistory(db, accessToken, Number(row.peer_id), 30);
    } catch (e) {
      console.error(`[vk] history sync failed for peer ${row.peer_id}:`, e);
    }
  }

  return { conversations, messages };
}

export async function sendVkMessage(
  db: ChatDb,
  accessToken: string,
  peerId: number,
  text: string,
): Promise<number> {
  const normalizedPeerId = Number(peerId);
  const randomId = Math.floor(Math.random() * 2_000_000_000);
  const messageId = await vkApiCall<number>(
    "messages.send",
    { peer_id: normalizedPeerId, message: text, random_id: randomId },
    accessToken,
  );

  await db.from("vk_messages").upsert(
    {
      vk_message_id: messageId,
      peer_id: normalizedPeerId,
      from_id: 0,
      text,
      is_outgoing: true,
      vk_date: Math.floor(Date.now() / 1000),
    },
    { onConflict: "peer_id,vk_message_id" },
  );

  await db
    .from("vk_conversations")
    .update({
      last_message_text: text,
      last_message_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    })
    .eq("peer_id", normalizedPeerId);

  return messageId;
}

export async function markVkPeerRead(
  db: ChatDb,
  accessToken: string,
  peerId: number,
): Promise<void> {
  const normalizedPeerId = Number(peerId);
  await vkApiCall("messages.markAsRead", { peer_id: normalizedPeerId }, accessToken);
  await db.from("vk_conversations").update({ unread_count: 0 }).eq("peer_id", normalizedPeerId);
}
