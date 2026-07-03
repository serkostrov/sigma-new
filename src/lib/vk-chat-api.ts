import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  connectVkWithCode,
  getVkAuthUrl,
  getVkChatStatus,
  sendVkChatMessage,
  syncVkChat,
  syncVkPeerMessages,
} from "./vk-chat.functions";

export type VkConversation = {
  peer_id: number;
  title: string;
  photo_url: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type VkChatMessage = {
  vk_message_id: number;
  peer_id: number;
  from_id: number;
  text: string;
  is_outgoing: boolean;
  vk_date: number;
};

export const VK_CONVERSATIONS_KEY = ["vk", "conversations"] as const;
export const VK_MESSAGES_KEY = (peerId: number) => ["vk", "messages", peerId] as const;
export const VK_STATUS_KEY = ["vk", "status"] as const;

export function useVkChatStatus() {
  return useQuery({
    queryKey: VK_STATUS_KEY,
    queryFn: () => getVkChatStatus(),
  });
}

export function useVkConversations() {
  return useQuery({
    queryKey: VK_CONVERSATIONS_KEY,
    queryFn: async (): Promise<VkConversation[]> => {
      const { data, error } = await supabase
        .from("vk_conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as VkConversation[];
    },
  });
}

export function useVkMessages(peerId: number | null) {
  return useQuery({
    queryKey: peerId != null ? VK_MESSAGES_KEY(peerId) : ["vk", "messages", "none"],
    enabled: peerId != null,
    queryFn: async (): Promise<VkChatMessage[]> => {
      if (peerId == null) return [];
      const { data, error } = await supabase
        .from("vk_messages")
        .select("*")
        .eq("peer_id", peerId)
        .order("vk_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VkChatMessage[];
    },
  });
}

export function useSyncVkChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncVkChat(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VK_CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: ["vk", "messages"] });
    },
  });
}

export function useSyncVkPeer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (peerId: number) => syncVkPeerMessages({ data: { peerId } }),
    onSuccess: (_r, peerId) => {
      qc.invalidateQueries({ queryKey: VK_MESSAGES_KEY(peerId) });
      qc.invalidateQueries({ queryKey: VK_CONVERSATIONS_KEY });
    },
  });
}

export function useSendVkMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { peerId: number; text: string }) =>
      sendVkChatMessage({ data: input }),
    onSuccess: (_r, input) => {
      qc.invalidateQueries({ queryKey: VK_MESSAGES_KEY(input.peerId) });
      qc.invalidateQueries({ queryKey: VK_CONVERSATIONS_KEY });
    },
  });
}

export function useVkAuthUrl() {
  return useMutation({
    mutationFn: () => getVkAuthUrl(),
  });
}

export function useConnectVk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => connectVkWithCode({ data: { code } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VK_STATUS_KEY });
      qc.invalidateQueries({ queryKey: VK_CONVERSATIONS_KEY });
    },
  });
}
