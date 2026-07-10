const AVITO_API_BASE = "https://api.avito.ru";

export class AvitoApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AvitoApiError";
    this.status = status;
  }

  isMessengerSubscriptionRequired(): boolean {
    return (
      this.status === 402 ||
      this.message.includes("подписку с API мессенджера")
    );
  }
}

export function isAvitoMessengerSubscriptionError(error: unknown): boolean {
  if (error instanceof AvitoApiError) {
    return error.isMessengerSubscriptionRequired();
  }
  if (error instanceof Error) {
    return error.message.includes("подписку с API мессенджера");
  }
  return false;
}

export type AvitoApiErrorBody = {
  error?: { code?: number; message?: string };
  errors?: string[];
  message?: string;
};

async function parseAvitoError(res: Response, body: string): Promise<string> {
  try {
    const json = JSON.parse(body) as AvitoApiErrorBody;
    if (json.errors?.length) return json.errors.join("; ");
    if (json.error?.message) return json.error.message;
    if (json.message) return json.message;
  } catch {
    // ignore
  }
  return `HTTP ${res.status}: ${body.slice(0, 200)}`;
}

export async function avitoApiCall<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${AVITO_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await res.text();
  if (!res.ok) {
    throw new AvitoApiError(await parseAvitoError(res, body), res.status);
  }

  if (!body) return {} as T;
  return JSON.parse(body) as T;
}

export type AvitoSelfAccount = {
  id: number;
  name?: string;
  email?: string;
};

export type AvitoChatUser = {
  id: number;
  name?: string;
  public_user_profile?: {
    avatar?: { default?: string };
  };
};

export type AvitoChatContext = {
  type?: string;
  value?: {
    id?: number;
    title?: string;
    url?: string;
  };
};

export type AvitoMessageContent = {
  text?: string | null;
  flow_id?: string | null;
  image?: { sizes?: Record<string, string> } | null;
  link?: {
    url?: string;
    text?: string;
    preview?: {
      title?: string;
      description?: string;
      domain?: string;
      url?: string;
      images?: Record<string, string> | null;
    } | null;
  } | null;
  item?: {
    title?: string;
    item_url?: string;
    image_url?: string;
    price_string?: string | null;
  } | null;
  location?: {
    title?: string;
    text?: string;
  } | null;
  call?: { status?: string } | null;
  voice?: { voice_id?: string } | null;
};

export type AvitoMessagePayload = {
  id: string;
  author_id?: number;
  created?: number;
  direction?: "in" | "out";
  type?: string;
  content?: AvitoMessageContent;
};

export type ParsedAvitoMessage = {
  type: string;
  text: string;
  imageUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
};

export type AvitoChat = {
  id: string;
  created?: number;
  updated?: number;
  users?: AvitoChatUser[];
  context?: AvitoChatContext;
  last_message?: AvitoMessagePayload;
  unread_count?: number;
};

export type AvitoChatsResponse = {
  chats?: AvitoChat[];
  meta?: { has_more?: boolean };
};

export type AvitoMessagesResponse = {
  messages?: AvitoMessagePayload[];
};

export function chatTitle(chat: AvitoChat, selfUserId?: number): string {
  const itemTitle = chat.context?.value?.title;
  const otherUser =
    chat.users?.find((u) => u.id !== selfUserId) ?? chat.users?.[0];
  const userName = otherUser?.name?.trim();

  if (userName && itemTitle) return `${userName} · ${itemTitle}`;
  if (itemTitle) return itemTitle;
  if (userName) return userName;
  return `Чат ${chat.id.slice(0, 8)}`;
}

export function chatPhoto(chat: AvitoChat, selfUserId?: number): string | null {
  const otherUser =
    chat.users?.find((u) => u.id !== selfUserId) ?? chat.users?.[0];
  return otherUser?.public_user_profile?.avatar?.default ?? null;
}

const SYSTEM_MESSAGE_PREFIX =
  /^(?:\[Системное сообщение\]|\[Системное сообщзение\])\s*/i;

export function stripSystemMessagePrefix(text: string): string {
  let cleaned = text.trim();
  let prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(SYSTEM_MESSAGE_PREFIX, "").trim();
  }
  return cleaned;
}

function isSystemMessageText(text: string): boolean {
  return SYSTEM_MESSAGE_PREFIX.test(text.trim());
}

export function isSystemLikeMessage(text: string, messageType?: string | null): boolean {
  if (messageType === "system") return true;
  return isSystemMessageText(text);
}

export function displayMessageText(text: string): string {
  const cleaned = stripSystemMessagePrefix(text);
  return cleaned || text.trim();
}

export function pickBestImageUrl(sizes?: Record<string, string>): string | undefined {
  if (!sizes) return undefined;
  const preferred = ["1280x960", "640x480", "320x240", "140x105", "32x32"];
  for (const key of preferred) {
    if (sizes[key]) return sizes[key];
  }
  const [best] = Object.entries(sizes).sort(([, a], [, b]) => b.length - a.length);
  return best?.[1];
}

export function normalizeAvitoUrl(url?: string): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Ссылка на объявление или диалог в мессенджере Авито. */
export function avitoChatSourceUrl(chat: AvitoChat): string | null {
  const itemUrl = normalizeAvitoUrl(chat.context?.value?.url);
  if (itemUrl) return itemUrl;
  if (chat.id) {
    return `https://www.avito.ru/profile/messenger/channel/${encodeURIComponent(chat.id)}`;
  }
  return null;
}

export function avitoChatSourceUrlFromId(chatId: string, storedUrl?: string | null): string | null {
  const normalized = normalizeAvitoUrl(storedUrl ?? undefined);
  if (normalized) return normalized;
  if (chatId) {
    return `https://www.avito.ru/profile/messenger/channel/${encodeURIComponent(chatId)}`;
  }
  return null;
}

export function parseAvitoMessage(message: AvitoMessagePayload): ParsedAvitoMessage {
  const type = message.type ?? "text";
  const content = message.content;

  if (type === "text") {
    const raw = content?.text?.trim() ?? "";
    if (isSystemMessageText(raw)) {
      const body = stripSystemMessagePrefix(raw);
      return { type: "system", text: body || "Системное сообщение" };
    }
    return { type, text: raw };
  }

  if (type === "image") {
    return {
      type,
      text: "",
      imageUrl: pickBestImageUrl(content?.image?.sizes),
    };
  }

  if (type === "link") {
    const link = content?.link;
    const linkUrl = normalizeAvitoUrl(link?.preview?.url ?? link?.url);
    const linkTitle = link?.preview?.title?.trim() || link?.text?.trim() || link?.url?.trim();
    const previewImage = pickBestImageUrl(link?.preview?.images ?? undefined);
    return {
      type,
      text: "",
      imageUrl: previewImage,
      linkUrl,
      linkTitle,
    };
  }

  if (type === "item") {
    const item = content?.item;
    return {
      type,
      text: [item?.title, item?.price_string].filter(Boolean).join(" · "),
      imageUrl: item?.image_url ?? undefined,
      linkUrl: normalizeAvitoUrl(item?.item_url),
      linkTitle: item?.title,
    };
  }

  if (type === "location") {
    const label = content?.location?.title?.trim() || content?.location?.text?.trim();
    return { type, text: label ?? "Геолокация" };
  }

  if (type === "voice") {
    return { type, text: "Голосовое сообщение" };
  }

  if (type === "call") {
    return {
      type,
      text: content?.call?.status === "missed" ? "Пропущенный звонок" : "Звонок",
    };
  }

  if (type === "deleted") {
    return { type, text: "Сообщение удалено" };
  }

  if (type === "system") {
    const raw = content?.text?.trim() ?? "";
    const body = stripSystemMessagePrefix(raw);
    return {
      type: "system",
      text: body || raw || "Системное сообщение",
    };
  }

  const fallback = content?.text?.trim();
  if (fallback) return { type, text: fallback };
  return { type, text: "" };
}

export function messagePreview(message: AvitoMessagePayload): string {
  const parsed = parseAvitoMessage(message);
  return storedMessagePreview({
    text: parsed.text,
    message_type: parsed.type,
    link_url: parsed.linkUrl ?? null,
    link_title: parsed.linkTitle ?? null,
  });
}

export function storedMessagePreview(msg: {
  text: string;
  message_type: string;
  link_url?: string | null;
  link_title?: string | null;
}): string {
  if (msg.message_type === "system") {
    return msg.text || "Системное сообщение";
  }
  if (msg.text.trim()) return msg.text;
  if (msg.message_type === "image") return "Фото";
  if (msg.message_type === "link") {
    return msg.link_title || msg.link_url || "Ссылка";
  }
  if (msg.message_type === "item") return msg.text || msg.link_title || "Объявление";
  if (msg.message_type === "voice") return "Голосовое сообщение";
  if (msg.message_type === "location") return "Геолокация";
  if (msg.message_type === "call") return "Звонок";
  if (msg.message_type === "deleted") return "Сообщение удалено";
  return "";
}

export function isAvitoSystemMessageType(messageType?: string | null): boolean {
  return messageType === "system";
}

type AvitoMessageSortable = {
  avito_created?: number;
  created?: number;
  message_seq?: number;
  message_id?: string;
  id?: string;
  message_type?: string;
  type?: string;
};

function avitoMessageTimestamp(message: AvitoMessageSortable): number {
  return message.avito_created ?? message.created ?? 0;
}

function avitoMessageId(message: AvitoMessageSortable): string {
  return message.message_id ?? message.id ?? "";
}

function avitoMessageType(message: AvitoMessageSortable): string {
  return message.message_type ?? message.type ?? "text";
}

/** System auto-replies share a timestamp with the triggering message and must sort after it. */
export function compareAvitoMessageOrder(a: AvitoMessageSortable, b: AvitoMessageSortable): number {
  const ta = avitoMessageTimestamp(a);
  const tb = avitoMessageTimestamp(b);
  if (ta !== tb) return ta - tb;

  const sysA = isAvitoSystemMessageType(avitoMessageType(a)) ? 1 : 0;
  const sysB = isAvitoSystemMessageType(avitoMessageType(b)) ? 1 : 0;
  if (sysA !== sysB) return sysA - sysB;

  const seqA = a.message_seq ?? 0;
  const seqB = b.message_seq ?? 0;
  if (seqA !== seqB) return seqA - seqB;

  return avitoMessageId(a).localeCompare(avitoMessageId(b));
}

export function sortAvitoMessages<
  T extends {
    avito_created: number;
    message_seq?: number;
    message_id: string;
    message_type?: string;
  },
>(messages: T[]): T[] {
  return [...messages].sort(compareAvitoMessageOrder);
}

export function chronologicalMessageSeq(messages: AvitoMessagePayload[]): Map<string, number> {
  const sorted = [...messages].sort(compareAvitoMessageOrder);
  return new Map(sorted.map((message, index) => [message.id, index]));
}
