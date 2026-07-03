import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  avitoCredentialsConfigured,
  getAvitoAccessToken,
  resolveAvitoUserId,
} from "./avito/avito-token";
import {
  sendAvitoMessage,
  syncAllAvitoChat,
  syncAvitoChatMessages,
} from "./avito/avito-sync";

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

export const getAvitoChatStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    const configured = avitoCredentialsConfigured();
    if (!configured) {
      return { connected: false, userId: null as number | null };
    }

    try {
      const token = await getAvitoAccessToken();
      const avitoUserId = await resolveAvitoUserId(token);
      return { connected: true, userId: avitoUserId };
    } catch {
      return { connected: false, userId: null as number | null };
    }
  });

export const syncAvitoChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    if (!avitoCredentialsConfigured()) {
      throw new Error(
        "Авито не подключён. Укажите AVITO_CLIENT_ID и AVITO_CLIENT_SECRET в .env",
      );
    }

    return syncAllAvitoChat(supabase);
  });

export const syncAvitoChatMessagesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { chatId: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    const token = await getAvitoAccessToken();
    const avitoUserId = await resolveAvitoUserId(token);
    const count = await syncAvitoChatMessages(
      supabase,
      token,
      avitoUserId,
      data.chatId,
      100,
    );
    return { count };
  });

export const sendAvitoChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { chatId: string; text: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    const text = data.text.trim();
    if (!text) throw new Error("Сообщение пустое");

    const messageId = await sendAvitoMessage(supabase, data.chatId, text);
    return { messageId };
  });
