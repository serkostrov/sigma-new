import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  avitoCredentialsConfigured,
  getAvitoAccessToken,
  resolveAvitoUserId,
} from "./avito/avito-token";
import { getAvitoMessengerApiAvailable } from "./avito/avito-messenger-access";
import { chatWriteDb } from "@/lib/chat-db";
import {
  sendAvitoAttachment,
  sendAvitoMessage,
  syncAllAvitoChat,
  syncAvitoChatMessages,
  markAvitoChatRead,
} from "./avito/avito-sync";
import { AVITO_ATTACHMENT_MAX_BYTES } from "./avito/avito-media";

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
      return {
        connected: false,
        userId: null as number | null,
        messengerApiAvailable: false,
      };
    }

    try {
      const token = await getAvitoAccessToken();
      const avitoUserId = await resolveAvitoUserId(token);
      const cached = getAvitoMessengerApiAvailable();
      return {
        connected: true,
        userId: avitoUserId,
        messengerApiAvailable: cached !== false,
      };
    } catch {
      return {
        connected: false,
        userId: null as number | null,
        messengerApiAvailable: false,
      };
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

    return syncAllAvitoChat(chatWriteDb(supabase));
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
      chatWriteDb(supabase),
      token,
      avitoUserId,
      data.chatId,
      100,
    );
    return {
      count,
      messengerApiAvailable: getAvitoMessengerApiAvailable() !== false,
    };
  });

export const sendAvitoChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { chatId: string; text: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    if (!avitoCredentialsConfigured()) {
      throw new Error(
        "Авито не подключён. Укажите AVITO_CLIENT_ID и AVITO_CLIENT_SECRET в .env",
      );
    }

    const text = data.text.trim();
    if (!text) throw new Error("Сообщение пустое");
    if (text.length > 1000) {
      throw new Error("Сообщение не должно быть длиннее 1000 символов");
    }

    const messageId = await sendAvitoMessage(chatWriteDb(supabase), data.chatId, text);
    return { messageId };
  });

export const sendAvitoChatAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: {
      chatId: string;
      fileName: string;
      mimeType: string;
      fileDataBase64: string;
    }) => data,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    if (!avitoCredentialsConfigured()) {
      throw new Error(
        "Авито не подключён. Укажите AVITO_CLIENT_ID и AVITO_CLIENT_SECRET в .env",
      );
    }

    const fileName = data.fileName.trim();
    if (!fileName) throw new Error("Имя файла не указано");

    const bytes = Uint8Array.from(Buffer.from(data.fileDataBase64, "base64"));
    if (bytes.byteLength > AVITO_ATTACHMENT_MAX_BYTES) {
      throw new Error("Файл больше 50 МБ");
    }

    return sendAvitoAttachment(
      chatWriteDb(supabase),
      data.chatId,
      fileName,
      data.mimeType || "application/octet-stream",
      bytes,
    );
  });

export const markAvitoChatReadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { chatId: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!(await userCanChat(supabase, userId))) {
      throw new Error("Нет доступа к чату");
    }

    if (!avitoCredentialsConfigured()) {
      return { ok: false as const };
    }

    await markAvitoChatRead(chatWriteDb(supabase), data.chatId);
    return { ok: true as const };
  });
