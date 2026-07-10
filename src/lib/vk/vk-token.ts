import type { ChatDb } from "@/lib/chat-db";
import { serverEnv } from "@/lib/server-env";

function isConnectionValid(
  row: { access_token: string; expires_at: string | null } | null,
): string | null {
  if (!row?.access_token) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  return row.access_token;
}

export async function resolveVkAccessToken(
  db: ChatDb,
  userId: string,
): Promise<string | null> {
  const envToken = serverEnv("VK_ACCESS_TOKEN");
  if (envToken) return envToken;

  const { data: own, error: ownError } = await db
    .from("vk_connections")
    .select("access_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (ownError) throw ownError;

  const ownToken = isConnectionValid(own);
  if (ownToken) return ownToken;

  const { data: sharedRows, error: sharedError } = await db
    .from("vk_connections")
    .select("access_token, expires_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (sharedError) throw sharedError;

  const sharedToken = isConnectionValid(sharedRows?.[0] ?? null);
  if (sharedToken) return sharedToken;

  return null;
}

export function vkAppConfigured(): boolean {
  return Boolean(serverEnv("VK_APP_ID") && serverEnv("VK_APP_SECRET"));
}

export function vkRedirectUri(): string {
  const base = serverEnv("VK_REDIRECT_URI") ?? serverEnv("APP_URL") ?? "http://localhost:8090";
  return `${base.replace(/\/$/, "")}/chat`;
}

export async function exchangeVkCode(code: string): Promise<{
  access_token: string;
  user_id: number;
  expires_in?: number;
}> {
  const clientId = serverEnv("VK_APP_ID");
  const clientSecret = serverEnv("VK_APP_SECRET");
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
