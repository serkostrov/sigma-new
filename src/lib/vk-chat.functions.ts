import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { serverEnv } from "@/lib/server-env";
import {
  exchangeVkCode,
  resolveVkAccessToken,
  saveVkConnection,
  vkAppConfigured,
  vkRedirectUri,
} from "./vk/vk-token";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { chatWriteDb } from "./chat-db";
import {
  markVkPeerRead,
  sendVkMessage,
  syncAllVkChat,
  syncVkHistory,
} from "./vk/vk-sync";

async function userCanChat(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("user_has_permission", {
      _user_id: userId,
      _key: "chat.view",
    });
    if (error) return error.message;
    if (!data) return "Нет доступа к чату";
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Нет доступа к чату";
  }
}

export const getVkChatStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabase, userId } = context;
      const accessError = await userCanChat(supabase, userId);
      if (accessError) {
        return {
          connected: false,
          viaEnv: false,
          oauthAvailable: vkAppConfigured(),
          redirectUri: vkRedirectUri(),
          appId: serverEnv("VK_APP_ID") ?? null,
          error: accessError,
        };
      }

      const token = await resolveVkAccessToken(supabase, userId);
      const envToken = Boolean(serverEnv("VK_ACCESS_TOKEN"));

      return {
        connected: Boolean(token),
        viaEnv: envToken,
        oauthAvailable: vkAppConfigured(),
        redirectUri: vkRedirectUri(),
        appId: serverEnv("VK_APP_ID") ?? null,
        error: null as string | null,
      };
    } catch (error) {
      return {
        connected: false,
        viaEnv: false,
        oauthAvailable: vkAppConfigured(),
        redirectUri: vkRedirectUri(),
        appId: serverEnv("VK_APP_ID") ?? null,
        error: error instanceof Error ? error.message : "Не удалось проверить VK",
      };
    }
  });

export const getVkAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

    const appId = serverEnv("VK_APP_ID");
    if (!appId) {
      throw new Error("VK_APP_ID не задан");
    }

    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: appId,
      display: "page",
      redirect_uri: vkRedirectUri(),
      scope: "messages,offline",
      response_type: "code",
      v: "5.199",
      state,
    });

    return { url: `https://oauth.vk.com/authorize?${params}` };
  });

export const connectVkWithCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { code: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

    const tokenData = await exchangeVkCode(data.code);
    await saveVkConnection(
      supabase,
      userId,
      tokenData.user_id,
      tokenData.access_token,
      tokenData.expires_in,
    );

    const sync = await syncAllVkChat(chatWriteDb(supabase), tokenData.access_token);
    return { ok: true as const, vkUserId: tokenData.user_id, sync };
  });

export const syncVkChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

    const token = await resolveVkAccessToken(supabase, userId);
    if (!token) {
      throw new Error("VK не подключён. Укажите VK_ACCESS_TOKEN или авторизуйтесь через ВКонтакте.");
    }

    return syncAllVkChat(chatWriteDb(supabase), token);
  });

export const syncVkPeerMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { peerId: number }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

    const token = await resolveVkAccessToken(supabase, userId);
    if (!token) {
      throw new Error("VK не подключён");
    }

    const peerId = Number(data.peerId);
    const count = await syncVkHistory(chatWriteDb(supabase), token, peerId, 100);
    return { count };
  });

export const sendVkChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { peerId: number; text: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

    const text = data.text.trim();
    if (!text) throw new Error("Сообщение пустое");

    const token = await resolveVkAccessToken(supabase, userId);
    if (!token) {
      throw new Error("VK не подключён");
    }

    const messageId = await sendVkMessage(
      chatWriteDb(supabase),
      token,
      Number(data.peerId),
      text,
    );
    return { messageId };
  });

export const markVkChatReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { peerId: number }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

    const token = await resolveVkAccessToken(supabase, userId);
    if (!token) return { ok: false as const };

    await markVkPeerRead(chatWriteDb(supabase), token, Number(data.peerId));
    return { ok: true as const };
  });
