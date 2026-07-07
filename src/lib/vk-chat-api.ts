import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  connectVkWithCode,
  getVkAuthUrl,
  getVkChatStatus,
  markVkChatReadFn,
  sendVkChatMessage,
  syncVkChat,
  syncVkPeerMessages,
} from "./vk-chat.functions";
import { CHAT_UNREAD_KEY } from "./chat-unread-api";

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

function normalizePeerId(peerId: number | string): number {
  return Number(peerId);
}

async function fetchVkMessages(peerId: number): Promise<VkChatMessage[]> {
  const { data, error } = await (supabase as any)
    .from("vk_messages")
    .select("*")
    .eq("peer_id", peerId)
    .order("vk_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VkChatMessage[];
}

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
      const { data, error } = await (supabase as any)
        .from("vk_conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return ((data ?? []) as VkConversation[]).map((c) => ({
        ...c,
        peer_id: normalizePeerId(c.peer_id),
      }));
    },
  });
}

export function useVkMessages(peerId: number | null) {
  const normalizedPeerId = peerId != null ? normalizePeerId(peerId) : null;

  return useQuery({
    queryKey:
      normalizedPeerId != null ? VK_MESSAGES_KEY(normalizedPeerId) : ["vk", "messages", "none"],
    enabled: normalizedPeerId != null,
    queryFn: async (): Promise<VkChatMessage[]> => {
      if (normalizedPeerId == null) return [];
      await syncVkPeerMessages({ data: { peerId: normalizedPeerId } });
      return fetchVkMessages(normalizedPeerId);
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
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
    },
  });
}

export function useSyncVkPeer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (peerId: number) =>
      syncVkPeerMessages({ data: { peerId: normalizePeerId(peerId) } }),
    onSuccess: (_r, peerId) => {
      const id = normalizePeerId(peerId);
      qc.invalidateQueries({ queryKey: VK_MESSAGES_KEY(id) });
      qc.invalidateQueries({ queryKey: VK_CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
    },
  });
}

export function useSendVkMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { peerId: number; text: string }) =>
      sendVkChatMessage({ data: { ...input, peerId: normalizePeerId(input.peerId) } }),
    onSuccess: (_r, input) => {
      const id = normalizePeerId(input.peerId);
      qc.invalidateQueries({ queryKey: VK_MESSAGES_KEY(id) });
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
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
    },
  });
}

export function useMarkVkChatRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (peerId: number) => markVkChatReadFn({ data: { peerId: normalizePeerId(peerId) } }),
    onSuccess: (_r, peerId) => {
      const id = normalizePeerId(peerId);
      qc.invalidateQueries({ queryKey: VK_CONVERSATIONS_KEY });
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
      qc.setQueryData<VkConversation[]>(VK_CONVERSATIONS_KEY, (prev) =>
        prev?.map((c) => (normalizePeerId(c.peer_id) === id ? { ...c, unread_count: 0 } : c)),
      );
    },
  });
}
