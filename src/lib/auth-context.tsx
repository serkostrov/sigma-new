import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "director" | "rop" | "deputy_director" | "foreman" | "tools_keeper";

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  director: "Руководитель",
  rop: "РОП",
  deputy_director: "Зам руководителя",
  foreman: "Мастер",
  tools_keeper: "Ответственный за инструмент",
};

export const APP_ROLE_ORDER: AppRole[] = [
  "director",
  "deputy_director",
  "rop",
  "foreman",
  "tools_keeper",
];

interface AuthCtx {
  loading: boolean;
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isDirector: boolean;
  primaryRoleLabel: string;
  displayName: string;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  loading: true,
  session: null,
  user: null,
  roles: [],
  isDirector: false,
  primaryRoleLabel: "",
  displayName: "",
  refreshRoles: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);

  const loadRoles = async (uid: string | undefined) => {
    if (!uid) {
      setRoles([]);
      return;
    }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  };

  const loadProfile = async (uid: string | undefined) => {
    if (!uid) {
      setProfileName(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("full_name,email").eq("id", uid).maybeSingle();
    setProfileName((data?.full_name as string | null) || (data?.email as string | null) || null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setTimeout(() => {
        loadRoles(sess?.user?.id);
        loadProfile(sess?.user?.id);
      }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      Promise.all([
        loadRoles(data.session?.user?.id),
        loadProfile(data.session?.user?.id),
      ]).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const isDirector = roles.includes("director");
  const primary = APP_ROLE_ORDER.find((r) => roles.includes(r));
  const primaryRoleLabel = primary ? APP_ROLE_LABELS[primary] : "Без роли";
  const displayName =
    profileName ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "";

  return (
    <Ctx.Provider
      value={{
        loading,
        session,
        user,
        roles,
        isDirector,
        primaryRoleLabel,
        displayName,
        refreshRoles: () => loadRoles(user?.id),
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);