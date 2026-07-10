import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Проверка доступа к чату через RPC user_can_chat (роли + chat.view). */
export async function userCanChat(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("user_can_chat", {
      _user_id: userId,
    });
    if (error) return error.message;
    if (!data) return "Нет доступа к чату";
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Нет доступа к чату";
  }
}
