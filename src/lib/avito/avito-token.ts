import { serverEnv } from "@/lib/server-env";
import {
  avitoApiCall,
  type AvitoSelfAccount,
} from "./avito-client";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: TokenCache | null = null;

export function avitoCredentialsConfigured(): boolean {
  return Boolean(serverEnv("AVITO_CLIENT_ID") && serverEnv("AVITO_CLIENT_SECRET"));
}

export async function getAvitoAccessToken(): Promise<string> {
  const clientId = serverEnv("AVITO_CLIENT_ID");
  const clientSecret = serverEnv("AVITO_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("AVITO_CLIENT_ID и AVITO_CLIENT_SECRET не заданы в .env");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://api.avito.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Не удалось получить токен Авито");
  }

  const expiresIn = json.expires_in ?? 86_400;
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return json.access_token;
}

export async function resolveAvitoUserId(accessToken: string): Promise<number> {
  const fromEnv = serverEnv("AVITO_USER_ID");
  if (fromEnv) {
    const parsed = Number(fromEnv);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const self = await avitoApiCall<AvitoSelfAccount>("/core/v1/accounts/self", accessToken);
  if (!self.id) {
    throw new Error("Не удалось определить AVITO_USER_ID");
  }
  return self.id;
}
