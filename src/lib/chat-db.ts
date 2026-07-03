import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ChatDb = SupabaseClient<Database>;

/** Shared chat cache writes — service role when available, else user JWT. */
export function chatWriteDb(userSupabase: ChatDb): ChatDb {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return supabaseAdmin as ChatDb;
  }
  return userSupabase;
}
