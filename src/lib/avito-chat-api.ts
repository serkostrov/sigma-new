import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getAvitoChatStatus,
  sendAvitoChatMessage,
  syncAvitoChat,
  syncAvitoChatMessagesFn,
} from "./avito-chat.functions";

export type AvitoConversation = {
  chat_id: string;
  title: string;
  photo_url: string | null;
  item_title: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type AvitoChatMessage = {
  chat_id: string;
  message_id: string;
  author_id: number | null;
  text: string;
  is_outgoing: boolean;
  avito_created: number;
};

export const AVITO_CONVERSATIONS_KEY = ["avito", "conversations"] as const;
export const AVITO_MESSAGES_KEY = (chatId: string) => ["avito", "messages", chatId] as const;
export const AVITO_STATUS_KEY = ["avito", "status"] as const;

async function fetchAvitoMessages(chatId: string): Promise<AvitoChatMessage[]> {
  const { data, error } = await (supabase as any)
    .from("avito_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("avito_created", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AvitoChatMessage[];
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
      is_outgoing: false,
      avito_created: avitoCreated,
    },
  ];
}

export function useAvitoChatStatus() {
  return useQuery({
    queryKey: AVITO_STATUS_KEY,
    queryFn: () => getAvitoChatStatus(),
  });
}

export function useAvitoConversations() {
  return useQuery({
    queryKey: AVITO_CONVERSATIONS_KEY,
    queryFn: async (): Promise<AvitoConversation[]> => {
      const { data, error } = await (supabase as any)
        .from("avito_conversations")
        .select("*")
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
          if (stored.length > 0) return stored;
        }
      }

      return fetchAvitoPreview(chatId);
    },
  });
}

export function useSyncAvitoChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAvitoChat(),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: AVITO_CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: ["avito", "messages"] });
      qc.setQueryData(AVITO_STATUS_KEY, (prev: Awaited<ReturnType<typeof getAvitoChatStatus>> | undefined) =>
        prev
          ? { ...prev, messengerApiAvailable: result.messengerApiAvailable }
          : prev,
      );
    },
  });
}

export function useSyncAvitoChatMessages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => syncAvitoChatMessagesFn({ data: { chatId } }),
    onSuccess: (_r, chatId) => {
      qc.invalidateQueries({ queryKey: AVITO_MESSAGES_KEY(chatId) });
      qc.invalidateQueries({ queryKey: AVITO_CONVERSATIONS_KEY });
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
      qc.invalidateQueries({ queryKey: AVITO_CONVERSATIONS_KEY });
    },
  });
}
