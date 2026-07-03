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
      const { data, error } = await supabase
        .from("avito_conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as AvitoConversation[];
    },
  });
}

export function useAvitoMessages(chatId: string | null) {
  return useQuery({
    queryKey: chatId != null ? AVITO_MESSAGES_KEY(chatId) : ["avito", "messages", "none"],
    enabled: chatId != null,
    queryFn: async (): Promise<AvitoChatMessage[]> => {
      if (chatId == null) return [];
      const { data, error } = await supabase
        .from("avito_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("avito_created", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AvitoChatMessage[];
    },
  });
}

export function useSyncAvitoChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncAvitoChat(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AVITO_CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: ["avito", "messages"] });
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
