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

export type AvitoMessagePayload = {
  id: string;
  author_id?: number;
  created?: number;
  direction?: "in" | "out";
  type?: string;
  content?: { text?: string };
  message?: { text?: string };
  text?: string;
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

export function messageText(message: AvitoMessagePayload): string {
  if (message.content?.text) return message.content.text;
  if (message.message?.text) return message.message.text;
  if (message.text) return message.text;
  if (message.type && message.type !== "text") {
    return `[${message.type}]`;
  }
  return "";
}
