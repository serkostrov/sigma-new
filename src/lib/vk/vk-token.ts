import type { ChatDb } from "@/lib/chat-db";

export async function resolveVkAccessToken(
  db: ChatDb,
  userId: string,
): Promise<string | null> {
  if (process.env.VK_ACCESS_TOKEN) {
    return process.env.VK_ACCESS_TOKEN;
  }

  const { data, error } = await db
    .from("vk_connections")
    .select("access_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.access_token) return null;

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  return data.access_token;
}

export function vkAppConfigured(): boolean {
  return Boolean(process.env.VK_APP_ID && process.env.VK_APP_SECRET);
}

export function vkRedirectUri(): string {
  const base = process.env.VK_REDIRECT_URI ?? process.env.APP_URL ?? "http://localhost:8090";
  return `${base.replace(/\/$/, "")}/chat`;
}

export async function exchangeVkCode(code: string): Promise<{
  access_token: string;
  user_id: number;
  expires_in?: number;
}> {
  const clientId = process.env.VK_APP_ID;
  const clientSecret = process.env.VK_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("VK_APP_ID и VK_APP_SECRET не заданы в переменных окружения");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: vkRedirectUri(),
    code,
  });

  const res = await fetch(`https://oauth.vk.com/access_token?${params}`);
  const json = (await res.json()) as {
    access_token?: string;
    user_id?: number;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!json.access_token || !json.user_id) {
    throw new Error(json.error_description ?? json.error ?? "Не удалось получить токен VK");
  }

  return {
    access_token: json.access_token,
    user_id: json.user_id,
    expires_in: json.expires_in,
  };
}

export async function saveVkConnection(
  db: ChatDb,
  userId: string,
  vkUserId: number,
  accessToken: string,
  expiresIn?: number,
): Promise<void> {
  const expiresAt =
    expiresIn != null
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

  const { error } = await db.from("vk_connections").upsert(
    {
      user_id: userId,
      vk_user_id: vkUserId,
      access_token: accessToken,
      expires_at: expiresAt,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}
