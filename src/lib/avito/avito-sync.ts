import type { ChatDb } from "@/lib/chat-db";
import {
  avitoApiCall,
  avitoChatSourceUrl,
  chatPhoto,
  chatTitleForKind,
  resolveAvitoChatKind,
  type AvitoChatKind,
  chronologicalMessageSeq,
  isAvitoMessengerSubscriptionError,
  messagePreview,
  parseAvitoMessage,
  pickBestImageUrl,
  sortAvitoMessages,
  storedMessagePreview,
  type AvitoChatsResponse,
  type AvitoMessagePayload,
  type AvitoMessagesResponse,
  type ParsedAvitoMessage,
} from "./avito-client";
import {
  getAvitoMessengerApiAvailable,
  markAvitoMessengerApiAvailable,
  markAvitoMessengerApiUnavailable,
} from "./avito-messenger-access";
import {
  AVITO_ATTACHMENT_MAX_BYTES,
  AVITO_CHAT_BUCKET,
  AVITO_IMAGE_MAX_BYTES,
  avitoUploadImage,
  isAvitoNativeImage,
  resolveAttachmentMimeType,
  sanitizeAttachmentFileName,
} from "./avito-media";
import { getAvitoAccessToken, resolveAvitoUserId } from "./avito-token";

async function avitoContext() {
  const accessToken = await getAvitoAccessToken();
  const userId = await resolveAvitoUserId(accessToken);
  return { accessToken, userId };
}

function assertAvitoMessengerWritable(): void {
  if (getAvitoMessengerApiAvailable() === false) {
    throw new Error(
      "Отправка недоступна без подписки «API мессенджера» на Авито.",
    );
  }
}

function rethrowAvitoSendError(error: unknown): never {
  if (isAvitoMessengerSubscriptionError(error)) {
    markAvitoMessengerApiUnavailable();
    throw new Error(
      "Отправка недоступна без подписки «API мессенджера» на Авито.",
    );
  }
  throw error;
}

type StoredMessageRow = {
  text: string;
  message_type: string;
  image_url: string | null;
  link_url: string | null;
  link_title: string | null;
  avito_created: number;
  message_seq: number;
  message_id: string;
};

async function updateConversationLastMessage(db: ChatDb, chatId: string): Promise<void> {
  const { data, error } = await db
    .from("avito_messages")
    .select(
      "text, message_type, image_url, link_url, link_title, avito_created, message_seq, message_id",
    )
    .eq("chat_id", chatId);

  if (error) throw error;
  if (!data?.length) return;

  const latest = sortAvitoMessages(data as StoredMessageRow[]).at(-1);
  if (!latest) return;

  const { error: updateError } = await db
    .from("avito_conversations")
    .update({
      last_message_text: storedMessagePreview(latest),
      last_message_at: new Date(latest.avito_created * 1000).toISOString(),
    })
    .eq("chat_id", chatId);

  if (updateError) throw updateError;
}

async function nextMessageSeq(db: ChatDb, chatId: string): Promise<number> {
  const { data: lastSeqRow } = await db
    .from("avito_messages")
    .select("message_seq")
    .eq("chat_id", chatId)
    .order("message_seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((lastSeqRow as { message_seq?: number } | null)?.message_seq ?? -1) + 1;
}

async function insertOutboundMessage(
  db: ChatDb,
  chatId: string,
  avitoUserId: number,
  messageId: string,
  parsed: ParsedAvitoMessage,
  avitoCreated?: number,
): Promise<void> {
  const now = avitoCreated ?? Math.floor(Date.now() / 1000);
  const messageSeq = await nextMessageSeq(db, chatId);

  const { error } = await db.from("avito_messages").upsert(
    {
      chat_id: chatId,
      message_id: messageId,
      author_id: avitoUserId,
      text: parsed.text,
      message_type: parsed.type,
      image_url: parsed.imageUrl ?? null,
      link_url: parsed.linkUrl ?? null,
      link_title: parsed.linkTitle ?? null,
      is_outgoing: true,
      avito_created: now,
      message_seq: messageSeq,
    },
    { onConflict: "chat_id,message_id" },
  );

  if (error) throw error;
  await updateConversationLastMessage(db, chatId);
}

async function uploadAttachmentLink(
  db: ChatDb,
  chatId: string,
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<string> {
  const safeName = sanitizeAttachmentFileName(fileName);
  const ext = safeName.includes(".") ? safeName.split(".").pop() : "bin";
  const path = `attachments/${chatId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await db.storage
    .from(AVITO_CHAT_BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: false });

  if (uploadError) {
    const hint = uploadError.message.toLowerCase().includes("bucket")
      ? " Хранилище avito-chat не настроено — примените миграцию supabase."
      : "";
    throw new Error(`Не удалось загрузить файл${hint}: ${uploadError.message}`);
  }

  const { data } = db.storage.from(AVITO_CHAT_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("Не удалось получить ссылку на файл");
  }

  return data.publicUrl;
}

export async function syncAvitoConversations(
  db: ChatDb,
  accessToken: string,
  userId: number,
  chatTypes: AvitoChatKind[] = ["u2i", "u2u"],
): Promise<number> {
  let synced = 0;

  for (const requestedKind of chatTypes) {
    const data = await avitoApiCall<AvitoChatsResponse>(
      `/messenger/v2/accounts/${userId}/chats?limit=50&offset=0&chat_types=${requestedKind}`,
      accessToken,
    );

    for (const chat of data.chats ?? []) {
      const chatKind = resolveAvitoChatKind(chat);
      const title = chatTitleForKind(chat, chatKind, userId);
      const photo = chatPhoto(chat, userId);
      const last = chat.last_message;

      const { error } = await db.from("avito_conversations").upsert(
        {
          chat_id: chat.id,
          chat_kind: chatKind,
          title,
          photo_url: photo,
          item_title: chatKind === "u2i" ? (chat.context?.value?.title ?? null) : null,
          source_url: avitoChatSourceUrl(chat),
          last_message_text: last ? messagePreview(last) : "",
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

      await updateConversationLastMessage(db, chat.id);
    }
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
  if (getAvitoMessengerApiAvailable() === false) {
    return 0;
  }

  try {
    const data = await avitoApiCall<AvitoMessagesResponse>(
      `/messenger/v3/accounts/${userId}/chats/${chatId}/messages/?limit=${limit}&offset=0`,
      accessToken,
    );

    markAvitoMessengerApiAvailable();

    const apiMessages = data.messages ?? [];
    const seqById = chronologicalMessageSeq(apiMessages);

    const rows = apiMessages.map((m) => {
      const parsed = parseAvitoMessage(m);
      return {
        chat_id: chatId,
        message_id: m.id,
        author_id: m.author_id ?? null,
        text: parsed.text,
        message_type: parsed.type,
        image_url: parsed.imageUrl ?? null,
        link_url: parsed.linkUrl ?? null,
        link_title: parsed.linkTitle ?? null,
        is_outgoing: m.direction === "out",
        avito_created: m.created ?? 0,
        message_seq: seqById.get(m.id) ?? 0,
      };
    });

    if (rows.length === 0) return 0;

    const { error } = await db
      .from("avito_messages")
      .upsert(rows, { onConflict: "chat_id,message_id" });

    if (error) throw error;

    await updateConversationLastMessage(db, chatId);

    return rows.length;
  } catch (error) {
    if (isAvitoMessengerSubscriptionError(error)) {
      markAvitoMessengerApiUnavailable();
      return 0;
    }
    throw error;
  }
}

export async function syncAllAvitoChat(db: ChatDb): Promise<{
  conversations: number;
  messages: number;
  messengerApiAvailable: boolean;
}> {
  const { accessToken, userId } = await avitoContext();
  const conversations = await syncAvitoConversations(db, accessToken, userId);

  if (getAvitoMessengerApiAvailable() === false) {
    return { conversations, messages: 0, messengerApiAvailable: false };
  }

  const { data: chats, error } = await db
    .from("avito_conversations")
    .select("chat_id")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) throw error;

  let messages = 0;
  for (const row of chats ?? []) {
    const count = await syncAvitoChatMessages(db, accessToken, userId, row.chat_id, 50);
    messages += count;
    if (getAvitoMessengerApiAvailable() === false) {
      break;
    }
  }

  return {
    conversations,
    messages,
    messengerApiAvailable: getAvitoMessengerApiAvailable() !== false,
  };
}

export async function markAvitoChatRead(db: ChatDb, chatId: string): Promise<void> {
  const { accessToken, userId } = await avitoContext();

  await avitoApiCall(
    `/messenger/v1/accounts/${userId}/chats/${chatId}/read`,
    accessToken,
    { method: "POST" },
  );

  await db.from("avito_conversations").update({ unread_count: 0 }).eq("chat_id", chatId);
}

export async function sendAvitoMessage(
  db: ChatDb,
  chatId: string,
  text: string,
): Promise<string> {
  assertAvitoMessengerWritable();

  const { accessToken, userId } = await avitoContext();

  try {
    const result = await avitoApiCall<{ id?: string; created?: number }>(
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

    markAvitoMessengerApiAvailable();

    const messageId = result.id ?? crypto.randomUUID();
    await insertOutboundMessage(
      db,
      chatId,
      userId,
      messageId,
      { type: "text", text },
      result.created,
    );

    return messageId;
  } catch (error) {
    rethrowAvitoSendError(error);
  }
}

export async function sendAvitoAttachment(
  db: ChatDb,
  chatId: string,
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<{ messageId: string; delivery: "image" | "link" }> {
  assertAvitoMessengerWritable();

  if (bytes.byteLength === 0) {
    throw new Error("Файл пустой");
  }
  if (bytes.byteLength > AVITO_ATTACHMENT_MAX_BYTES) {
    throw new Error("Файл больше 50 МБ");
  }

  const normalizedMime = resolveAttachmentMimeType(fileName, mimeType);
  const canSendNativeImage =
    isAvitoNativeImage(normalizedMime) && bytes.byteLength <= AVITO_IMAGE_MAX_BYTES;

  try {
    if (canSendNativeImage) {
      const { accessToken, userId } = await avitoContext();
      const blob = new Blob([bytes], { type: normalizedMime });
      const uploaded = await avitoUploadImage(userId, accessToken, blob, fileName);

      const sent = await avitoApiCall<AvitoMessagePayload & { id?: string }>(
        `/messenger/v1/accounts/${userId}/chats/${chatId}/messages/image`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({ image_id: uploaded.imageId }),
        },
      );

      markAvitoMessengerApiAvailable();

      const messageId = sent.id ?? crypto.randomUUID();
      const imageUrl = pickBestImageUrl(uploaded.sizes);
      await insertOutboundMessage(
        db,
        chatId,
        userId,
        messageId,
        { type: "image", text: "", imageUrl },
        sent.created,
      );

      return { messageId, delivery: "image" };
    }

    const publicUrl = await uploadAttachmentLink(db, chatId, fileName, normalizedMime, bytes);
    const safeName = sanitizeAttachmentFileName(fileName);
    const text = `Файл: ${safeName}\n${publicUrl}`;
    const messageId = await sendAvitoMessage(db, chatId, text);

    return { messageId, delivery: "link" };
  } catch (error) {
    rethrowAvitoSendError(error);
  }
}
