import { useAuth } from "@/lib/auth-context";

/** Ждём Supabase-сессию перед server functions чата (иначе 401 без Bearer). */
export function useChatSessionReady() {
  const { session, loading } = useAuth();
  return {
    ready: !loading && session != null,
    authLoading: loading,
    session,
  };
}
