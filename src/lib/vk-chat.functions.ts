import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  exchangeVkCode,
  resolveVkAccessToken,
  saveVkConnection,
  vkAppConfigured,
  vkRedirectUri,
} from "./vk/vk-token";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendVkMessage, syncAllVkChat, syncVkHistory } from "./vk/vk-sync";

async function userCanChat(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("user_has_permission", {
    _user_id: userId,
    _key: "chat.view",
  });
  if (error) throw error;
  return Boolean(data);
}

export const getVkChatStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    const token = await resolveVkAccessToken(supabase, userId);
    const envToken = Boolean(process.env.VK_ACCESS_TOKEN);

    return {
      connected: Boolean(token),
      viaEnv: envToken,
      oauthAvailable: vkAppConfigured(),
      redirectUri: vkRedirectUri(),
      appId: process.env.VK_APP_ID ?? null,
    };
  });

export const getVkAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    const appId = process.env.VK_APP_ID;
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
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    const tokenData = await exchangeVkCode(data.code);
    await saveVkConnection(
      supabase,
      userId,
      tokenData.user_id,
      tokenData.access_token,
      tokenData.expires_in,
    );

    const sync = await syncAllVkChat(supabase, tokenData.access_token);
    return { ok: true as const, vkUserId: tokenData.user_id, sync };
  });

export const syncVkChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    const token = await resolveVkAccessToken(supabase, userId);
    if (!token) {
      throw new Error("VK не подключён. Укажите VK_ACCESS_TOKEN или авторизуйтесь через ВКонтакте.");
    }

    return syncAllVkChat(supabase, token);
  });

export const syncVkPeerMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { peerId: number }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    const token = await resolveVkAccessToken(supabase, userId);
    if (!token) {
      throw new Error("VK не подключён");
    }

    const count = await syncVkHistory(supabase, token, data.peerId, 100);
    return { count };
  });

export const sendVkChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { peerId: number; text: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    const text = data.text.trim();
    if (!text) throw new Error("Сообщение пустое");

    const token = await resolveVkAccessToken(supabase, userId);
    if (!token) {
      throw new Error("VK не подключён");
    }

    const messageId = await sendVkMessage(supabase, token, data.peerId, text);
    return { messageId };
  });
