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

export const getAvitoChatStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabase, userId } = context;
      const accessError = await userCanChat(supabase, userId);
      if (accessError) {
        return {
          connected: false,
          configured: avitoCredentialsConfigured(),
          userId: null as number | null,
          messengerApiAvailable: false,
          error: accessError,
        };
      }

      const configured = avitoCredentialsConfigured();
      if (!configured) {
        return {
          connected: false,
          configured: false,
          userId: null as number | null,
          messengerApiAvailable: false,
          error: "AVITO_CLIENT_ID и AVITO_CLIENT_SECRET не заданы на сервере",
        };
      }

      const token = await getAvitoAccessToken();
      const avitoUserId = await resolveAvitoUserId(token);
      const cached = getAvitoMessengerApiAvailable();
      return {
        connected: true,
        configured: true,
        userId: avitoUserId,
        messengerApiAvailable: cached !== false,
        error: null as string | null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось подключиться к API Авито";
      return {
        connected: false,
        configured: avitoCredentialsConfigured(),
        userId: null as number | null,
        messengerApiAvailable: false,
        error: message,
      };
    }
  });

export const syncAvitoChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

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
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

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
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

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
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

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
    const accessError = await userCanChat(supabase, userId);
    if (accessError) throw new Error(accessError);

    if (!avitoCredentialsConfigured()) {
      return { ok: false as const };
    }

    await markAvitoChatRead(chatWriteDb(supabase), data.chatId);
    return { ok: true as const };
  });
