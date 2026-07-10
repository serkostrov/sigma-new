import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChatSessionReady } from "@/lib/chat-session-query";
import {
  getAvitoChatStatus,
  markAvitoChatReadFn,
  sendAvitoChatAttachment,
  sendAvitoChatMessage,
  syncAvitoChat,
  syncAvitoChatMessagesFn,
} from "./avito-chat.functions";
import { CHAT_UNREAD_KEY } from "./chat-unread-api";
import { sortAvitoMessages, type AvitoChatKind } from "./avito/avito-client";
import {
  AVITO_ATTACHMENT_ACCEPT,
  AVITO_ATTACHMENT_MAX_BYTES,
  AVITO_IMAGE_MAX_BYTES,
  avitoAttachmentKind,
  avitoUnsupportedFileMessage,
  isAvitoNativeImage,
  resolveAttachmentMimeType,
} from "./avito/avito-media";

export {
  AVITO_ATTACHMENT_ACCEPT,
  AVITO_ATTACHMENT_MAX_BYTES,
  AVITO_IMAGE_MAX_BYTES,
};

export type { AvitoChatKind };

export type AvitoConversation = {
  chat_id: string;
  chat_kind: AvitoChatKind;
  title: string;
  photo_url: string | null;
  item_title: string | null;
  source_url: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type AvitoChatMessage = {
  chat_id: string;
  message_id: string;
  author_id: number | null;
  text: string;
  message_type: string;
  image_url: string | null;
  link_url: string | null;
  link_title: string | null;
  is_outgoing: boolean;
  avito_created: number;
  message_seq: number;
};

export const avitoConversationsKey = (kind: AvitoChatKind) =>
  ["avito", "conversations", kind] as const;

export const AVITO_MESSAGES_KEY = (chatId: string) => ["avito", "messages", chatId] as const;
export const AVITO_STATUS_KEY = ["avito", "status"] as const;

/** @deprecated use avitoConversationsKey */
export const AVITO_CONVERSATIONS_KEY = ["avito", "conversations"] as const;

async function fetchAvitoMessages(chatId: string): Promise<AvitoChatMessage[]> {
  const { data, error } = await (supabase as any)
    .from("avito_messages")
    .select("*")
    .eq("chat_id", chatId);
  if (error) throw error;
  return sortAvitoMessages((data ?? []) as AvitoChatMessage[]);
}

async function fetchAvitoPreview(chatId: string): Promise<AvitoChatMessage[]> {
  const { data, error } = await (supabase as any)
    .from("avito_conversations")
    .select("chat_id, last_message_text, last_message_at")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.last_message_text) return [];

  const avitoCreated = data.last_message_at
    ? Math.floor(new Date(data.last_message_at as string).getTime() / 1000)
    : 0;

  return [
    {
      chat_id: chatId,
      message_id: `preview-${chatId}`,
      author_id: null,
      text: data.last_message_text as string,
      message_type: "text",
      image_url: null,
      link_url: null,
      link_title: null,
      is_outgoing: false,
      avito_created: avitoCreated,
      message_seq: 0,
    },
  ];
}

export function useAvitoChatStatus() {
  const { ready, authLoading } = useChatSessionReady();
  const query = useQuery({
    queryKey: AVITO_STATUS_KEY,
    queryFn: () => getAvitoChatStatus(),
    enabled: ready,
    retry: 1,
  });
  return {
    ...query,
    isLoading: authLoading || query.isLoading,
  };
}

export function useAvitoConversations(kind: AvitoChatKind) {
  return useQuery({
    queryKey: avitoConversationsKey(kind),
    queryFn: async (): Promise<AvitoConversation[]> => {
      const { data, error } = await (supabase as any)
        .from("avito_conversations")
        .select("*")
        .eq("chat_kind", kind)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as AvitoConversation[];
    },
  });
}

export function useAvitoMessages(
  chatId: string | null,
  messengerApiAvailable: boolean | undefined,
) {
  return useQuery({
    queryKey:
      chatId != null
        ? [...AVITO_MESSAGES_KEY(chatId), messengerApiAvailable ?? "unknown"]
        : ["avito", "messages", "none"],
    enabled: chatId != null,
    queryFn: async (): Promise<AvitoChatMessage[]> => {
      if (chatId == null) return [];
      if (messengerApiAvailable !== false) {
        const sync = await syncAvitoChatMessagesFn({ data: { chatId } });
        if (sync.messengerApiAvailable) {
          const stored = await fetchAvitoMessages(chatId);
          if (stored.length > 0) return sortAvitoMessages(stored);
        }
      }

      return sortAvitoMessages(await fetchAvitoPreview(chatId));
    },
  });
}

export function useSyncAvitoChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAvitoChat(),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["avito", "conversations"] });
      qc.invalidateQueries({ queryKey: ["avito", "messages"] });
      qc.setQueryData(AVITO_STATUS_KEY, (prev: Awaited<ReturnType<typeof getAvitoChatStatus>> | undefined) =>
        prev
          ? { ...prev, messengerApiAvailable: result.messengerApiAvailable }
          : prev,
      );
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
    },
  });
}

export function useSyncAvitoChatMessages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => syncAvitoChatMessagesFn({ data: { chatId } }),
    onSuccess: (_r, chatId) => {
      qc.invalidateQueries({ queryKey: AVITO_MESSAGES_KEY(chatId) });
      qc.invalidateQueries({ queryKey: ["avito", "conversations"] });
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
    },
  });
}

export function useSendAvitoMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { chatId: string; text: string }) =>
      sendAvitoChatMessage({ data: input }),
    onSuccess: (_r, input) => {
      qc.invalidateQueries({ queryKey: AVITO_MESSAGES_KEY(input.chatId) });
      qc.invalidateQueries({ queryKey: ["avito", "conversations"] });
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
    },
  });
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function useSendAvitoAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { chatId: string; file: File }) => {
      const { file, chatId } = input;
      if (file.size > AVITO_ATTACHMENT_MAX_BYTES) {
        throw new Error(`Файл «${file.name}» больше 50 МБ`);
      }

      const mimeType = resolveAttachmentMimeType(file.name, file.type || "");
      const kind = avitoAttachmentKind(mimeType);
      if (kind === "image" && file.size > AVITO_IMAGE_MAX_BYTES) {
        throw new Error(`Изображение «${file.name}» больше 24 МБ (лимит Авито)`);
      }

      const fileDataBase64 = await fileToBase64(file);
      return sendAvitoChatAttachment({
        data: {
          chatId,
          fileName: file.name,
          mimeType,
          fileDataBase64,
        },
      });
    },
    onSuccess: (_r, input) => {
      qc.invalidateQueries({ queryKey: AVITO_MESSAGES_KEY(input.chatId) });
      qc.invalidateQueries({ queryKey: ["avito", "conversations"] });
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
    },
  });
}

export function avitoAttachmentHint(file: File): string | null {
  const mimeType = resolveAttachmentMimeType(file.name, file.type || "");
  const kind = avitoAttachmentKind(mimeType);
  if (kind === "image" && isAvitoNativeImage(mimeType) && file.size <= AVITO_IMAGE_MAX_BYTES) {
    return null;
  }
  return avitoUnsupportedFileMessage(kind);
}

export function useMarkAvitoChatRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => markAvitoChatReadFn({ data: { chatId } }),
    onSuccess: (_r, chatId) => {
      qc.invalidateQueries({ queryKey: ["avito", "conversations"] });
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
    },
  });
}
