import { createContext, useContext, useMemo, ReactNode } from "react";
import type { AppRole } from "./auth-context";
import { useAuth } from "./auth-context";
import {
  type PermissionKey,
  roleHasPermission,
  effectivePermission,
  permissionsForRole,
} from "./access-control";
import { useRolePermissionOverrides } from "./role-permissions-api";

type Overrides = Partial<Record<AppRole, Partial<Record<PermissionKey, boolean>>>>;

type PermissionCtx = {
  loading: boolean;
  overrides: Overrides;
  has: (key: PermissionKey) => boolean;
  forRole: (role: AppRole) => Record<PermissionKey, boolean>;
  effective: (role: AppRole, key: PermissionKey) => boolean;
};

const Ctx = createContext<PermissionCtx>({
  loading: true,
  overrides: {},
  has: () => false,
  forRole: () => ({} as Record<PermissionKey, boolean>),
  effective: () => false,
});

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { roles, loading: authLoading } = useAuth();
  const { data: overrides = {}, isLoading } = useRolePermissionOverrides();

  const value = useMemo<PermissionCtx>(
    () => ({
      loading: authLoading || isLoading,
      overrides,
      has: (key) => roleHasPermission(roles, key, overrides),
      forRole: (role) => permissionsForRole(role, overrides),
      effective: (role, key) => effectivePermission(role, key, overrides),
    }),
    [roles, overrides, authLoading, isLoading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePermissionGrants() {
  return useContext(Ctx);
}
