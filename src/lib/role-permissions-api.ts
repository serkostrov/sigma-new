import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./auth-context";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionKey,
  PERMISSION_DEFS,
} from "./access-control";

export type RolePermissionRow = {
  role: AppRole;
  permission_key: PermissionKey;
  enabled: boolean;
  updated_at: string;
};

export const ROLE_PERMISSIONS_KEY = ["role_permissions"] as const;

type Overrides = Partial<Record<AppRole, Partial<Record<PermissionKey, boolean>>>>;

function rowsToOverrides(rows: RolePermissionRow[]): Overrides {
  const o: Overrides = {};
  for (const r of rows) {
    if (!o[r.role]) o[r.role] = {};
    o[r.role]![r.permission_key] = r.enabled;
  }
  return o;
}

export function useRolePermissionOverrides() {
  return useQuery({
    queryKey: ROLE_PERMISSIONS_KEY,
    queryFn: async (): Promise<Overrides> => {
      const { data, error } = await (supabase as any)
        .from("role_permissions")
        .select("role, permission_key, enabled, updated_at");
      if (error) throw error;
      return rowsToOverrides((data ?? []) as RolePermissionRow[]);
    },
    staleTime: 60_000,
  });
}

export function useSaveRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      role: AppRole;
      grants: Record<PermissionKey, boolean>;
    }) => {
      const { role, grants } = input;
      const defaults = DEFAULT_ROLE_PERMISSIONS[role];
      const toUpsert: { role: AppRole; permission_key: string; enabled: boolean }[] = [];
      const toDelete: { role: AppRole; permission_key: string }[] = [];

      for (const def of PERMISSION_DEFS) {
        const key = def.key;
        const desired = grants[key];
        const isDefault = defaults[key] === desired;
        if (isDefault) {
          toDelete.push({ role, permission_key: key });
        } else {
          toUpsert.push({ role, permission_key: key, enabled: desired });
        }
      }

      if (toDelete.length > 0) {
        for (const d of toDelete) {
          const { error } = await (supabase as any)
            .from("role_permissions")
            .delete()
            .eq("role", d.role)
            .eq("permission_key", d.permission_key);
          if (error) throw error;
        }
      }

      if (toUpsert.length > 0) {
        const { error } = await (supabase as any)
          .from("role_permissions")
          .upsert(toUpsert, { onConflict: "role,permission_key" });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLE_PERMISSIONS_KEY }),
  });
}

export function useResetRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: AppRole) => {
      const { error } = await (supabase as any)
        .from("role_permissions")
        .delete()
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ROLE_PERMISSIONS_KEY }),
  });
}
