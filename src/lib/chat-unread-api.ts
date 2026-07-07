import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AVITO_CONVERSATIONS_KEY } from "./avito-chat-api";
import { VK_CONVERSATIONS_KEY } from "./vk-chat-api";

export const CHAT_UNREAD_KEY = ["chat", "unread"] as const;

export type ChatUnreadCounts = {
  avito: number;
  vk: number;
  total: number;
};

async function fetchChatUnreadCounts(): Promise<ChatUnreadCounts> {
  const [avitoRes, vkRes] = await Promise.all([
    supabase.from("avito_conversations").select("unread_count"),
    supabase.from("vk_conversations").select("unread_count"),
  ]);

  if (avitoRes.error) throw avitoRes.error;
  if (vkRes.error) throw vkRes.error;

  const avito = (avitoRes.data ?? []).reduce((sum, row) => sum + (row.unread_count ?? 0), 0);
  const vk = (vkRes.data ?? []).reduce((sum, row) => sum + (row.unread_count ?? 0), 0);

  return { avito, vk, total: avito + vk };
}

export function useChatUnreadCounts(enabled = true) {
  return useQuery({
    queryKey: CHAT_UNREAD_KEY,
    enabled,
    queryFn: fetchChatUnreadCounts,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useInvalidateChatUnread(queryClient: ReturnType<typeof useQueryClient>) {
  return () => {
    queryClient.invalidateQueries({ queryKey: CHAT_UNREAD_KEY });
    queryClient.invalidateQueries({ queryKey: AVITO_CONVERSATIONS_KEY });
    queryClient.invalidateQueries({ queryKey: VK_CONVERSATIONS_KEY });
  };
}
