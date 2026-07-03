import type { ChatDb } from "@/lib/chat-db";
import {
  avitoApiCall,
  chatPhoto,
  chatTitle,
  messageText,
  type AvitoChatsResponse,
  type AvitoMessagesResponse,
} from "./avito-client";
import { getAvitoAccessToken, resolveAvitoUserId } from "./avito-token";

async function avitoContext() {
  const accessToken = await getAvitoAccessToken();
  const userId = await resolveAvitoUserId(accessToken);
  return { accessToken, userId };
}

export async function syncAvitoConversations(
  db: ChatDb,
  accessToken: string,
  userId: number,
): Promise<number> {
  const data = await avitoApiCall<AvitoChatsResponse>(
    `/messenger/v2/accounts/${userId}/chats?limit=50&offset=0`,
    accessToken,
  );

  let synced = 0;
  for (const chat of data.chats ?? []) {
    const title = chatTitle(chat, userId);
    const photo = chatPhoto(chat, userId);
    const last = chat.last_message;

    const { error } = await db.from("avito_conversations").upsert(
      {
        chat_id: chat.id,
        title,
        photo_url: photo,
        item_title: chat.context?.value?.title ?? null,
        last_message_text: last ? messageText(last) : "",
        last_message_at: last?.created
          ? new Date(last.created * 1000).toISOString()
          : null,
        unread_count: chat.unread_count ?? 0,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "chat_id" },
    );

    if (error) throw error;
    synced += 1;
  }

  return synced;
}

export async function syncAvitoChatMessages(
  db: ChatDb,
  accessToken: string,
  userId: number,
  chatId: string,
  limit = 100,
): Promise<number> {
  const data = await avitoApiCall<AvitoMessagesResponse>(
    `/messenger/v3/accounts/${userId}/chats/${chatId}/messages/?limit=${limit}&offset=0`,
    accessToken,
  );

  const rows = (data.messages ?? []).map((m) => ({
    chat_id: chatId,
    message_id: m.id,
    author_id: m.author_id ?? null,
    text: messageText(m),
    is_outgoing: m.direction === "out",
    avito_created: m.created ?? 0,
  }));

  if (rows.length === 0) return 0;

  const { error } = await db
    .from("avito_messages")
    .upsert(rows, { onConflict: "chat_id,message_id", ignoreDuplicates: true });

  if (error) throw error;
  return rows.length;
}

export async function syncAllAvitoChat(db: ChatDb): Promise<{
  conversations: number;
  messages: number;
}> {
  const { accessToken, userId } = await avitoContext();
  const conversations = await syncAvitoConversations(db, accessToken, userId);

  const { data: chats, error } = await db
    .from("avito_conversations")
    .select("chat_id")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) throw error;

  let messages = 0;
  for (const row of chats ?? []) {
    messages += await syncAvitoChatMessages(db, accessToken, userId, row.chat_id, 50);
  }

  return { conversations, messages };
}

export async function sendAvitoMessage(
  db: ChatDb,
  chatId: string,
  text: string,
): Promise<string> {
  const { accessToken, userId } = await avitoContext();

  const result = await avitoApiCall<{ id?: string }>(
    `/messenger/v1/accounts/${userId}/chats/${chatId}/messages`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        type: "text",
        message: { text },
      }),
    },
  );

  const messageId = result.id ?? crypto.randomUUID();

  await db.from("avito_messages").upsert(
    {
      chat_id: chatId,
      message_id: messageId,
      author_id: userId,
      text,
      is_outgoing: true,
      avito_created: Math.floor(Date.now() / 1000),
    },
    { onConflict: "chat_id,message_id" },
  );

  await db
    .from("avito_conversations")
    .update({
      last_message_text: text,
      last_message_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    })
    .eq("chat_id", chatId);

  return messageId;
}
