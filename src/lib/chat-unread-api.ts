import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CHAT_UNREAD_KEY = ["chat", "unread"] as const;

export type ChatUnreadCounts = {
  /** Диалоги по объявлениям (Авито u2i) */
  listings: number;
  /** Личные сообщения (Авито u2u) */
  personal: number;
  avitoListings: number;
  avitoPersonal: number;
  total: number;
};

async function fetchChatUnreadCounts(): Promise<ChatUnreadCounts> {
  const { data, error } = await supabase
    .from("avito_conversations")
    .select("unread_count, chat_kind");

  if (error) throw error;

  let avitoListings = 0;
  let avitoPersonal = 0;
  for (const row of data ?? []) {
    const count = row.unread_count ?? 0;
    if (row.chat_kind === "u2u") {
      avitoPersonal += count;
    } else {
      avitoListings += count;
    }
  }

  return {
    listings: avitoListings,
    personal: avitoPersonal,
    avitoListings,
    avitoPersonal,
    total: avitoListings + avitoPersonal,
  };
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
    queryClient.invalidateQueries({ queryKey: ["avito", "conversations"] });
  };
}
