import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./auth-context";

export type UserOption = {
  id: string;
  full_name: string;
  email: string;
  label: string;
};

export const USERS_WITH_ROLES_KEY = ["users_with_roles"] as const;

type ProfileRow = { id: string; full_name: string | null; email: string };
type RoleRow = { user_id: string; role: AppRole };

export function useUsersWithRoles() {
  return useQuery({
    queryKey: USERS_WITH_ROLES_KEY,
    queryFn: async () => {
      const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (pe) throw pe;
      if (re) throw re;
      const profiles = (p ?? []) as ProfileRow[];
      const roles = (r ?? []) as RoleRow[];
      return { profiles, roles };
    },
  });
}

export function useUsersByRole(role: AppRole) {
  const q = useUsersWithRoles();
  const users: UserOption[] = (() => {
    if (!q.data) return [];
    const ids = new Set(q.data.roles.filter((r) => r.role === role).map((r) => r.user_id));
    return q.data.profiles
      .filter((p) => ids.has(p.id))
      .map((p) => ({
        id: p.id,
        full_name: p.full_name || p.email,
        email: p.email,
        label: p.full_name || p.email,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "ru"));
  })();
  return { ...q, users };
}

export function useAllUsers() {
  const q = useUsersWithRoles();
  const users: UserOption[] = (() => {
    if (!q.data) return [];
    return q.data.profiles
      .map((p) => ({
        id: p.id,
        full_name: p.full_name || p.email,
        email: p.email,
        label: p.full_name || p.email,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "ru"));
  })();
  return { ...q, users };
}