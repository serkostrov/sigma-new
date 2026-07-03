import { useMemo } from "react";
import type { AppRole } from "./auth-context";
import { APP_ROLE_ORDER, useAuth } from "./auth-context";
import {
  type PermissionKey,
  roleHasPermission,
  type PermissionDef,
  PERMISSION_DEFS,
} from "./access-control";
import { usePermissionGrants } from "./permission-context";

export type NavItem = {
  to: string;
  label: string;
  exact?: boolean;
  permission?: PermissionKey;
};

type Overrides = Parameters<typeof roleHasPermission>[2];

export function primaryRole(roles: AppRole[]): AppRole | null {
  return APP_ROLE_ORDER.find((r) => roles.includes(r)) ?? null;
}

export function hasRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

function has(roles: AppRole[], key: PermissionKey, overrides: Overrides): boolean {
  return roleHasPermission(roles, key, overrides);
}

export function canSeeAllObjects(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "objects.view_all", overrides);
}

export function canCreateObjects(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "objects.create", overrides);
}

export function canEditObjects(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "objects.edit", overrides);
}

export function canDeleteObjects(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "objects.delete", overrides);
}

/** Создание или редактирование объектов (карточка, этапы) */
export function canManageObjects(roles: AppRole[], overrides: Overrides = {}): boolean {
  return canCreateObjects(roles, overrides) || canEditObjects(roles, overrides);
}

export function canCreateTasks(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tasks.create", overrides);
}

export function canEditTasks(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tasks.edit", overrides);
}

export function canDeleteTasks(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tasks.delete", overrides);
}

export function canSubmitTaskReview(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tasks.submit_review", overrides);
}

export function canReviewWork(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tasks.review", overrides);
}

export function canViewPhotos(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "photos.view", overrides);
}

export function canCreatePhotos(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "photos.create", overrides);
}

export function canEditPhotos(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "photos.edit", overrides);
}

export function canReviewPhotos(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "photos.review", overrides);
}

export function canSeeFinances(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "finances.view", overrides);
}

export function canManageFinances(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "finances.manage", overrides);
}

export function canViewFinanceWidgets(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "dashboard.finance_widgets", overrides);
}

export function canViewTools(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tools.view", overrides) || has(roles, "tools.view_assigned", overrides);
}

export function canManageTools(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tools.manage", overrides);
}

export function canViewDocuments(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "documents.view", overrides);
}

export function canManageDocuments(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "documents.manage", overrides);
}

export function canManageCustomers(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "customers.manage", overrides);
}

export function canManageBrigades(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "brigades.manage", overrides);
}

export function canManageCatalogs(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "settings.catalogs", overrides);
}

export function canManageRoles(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "users.manage_roles", overrides);
}

export function canManageUsers(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "users.view", overrides);
}

export function canManageAccessSettings(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "settings.access", overrides);
}

export function isForeman(roles: AppRole[], overrides: Overrides = {}): boolean {
  return (
    roles.includes("foreman") &&
    !canSeeAllObjects(roles, overrides) &&
    has(roles, "objects.view_scoped", overrides)
  );
}

export function isToolsKeeper(roles: AppRole[], overrides: Overrides = {}): boolean {
  return roles.includes("tools_keeper") && !canSeeAllObjects(roles, overrides);
}

export function canAccessTasks(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tasks.view", overrides) || has(roles, "tasks.view_own", overrides);
}

export function canViewAllTools(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tools.view", overrides);
}

/** Только «инструмент на мне» без доступа ко всему каталогу */
export function canViewAssignedToolsOnly(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tools.view_assigned", overrides) && !canViewAllTools(roles, overrides);
}

export function canViewAllTasks(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tasks.view", overrides);
}

/** Только назначенные задачи без доступа ко всем задачам */
export function canViewOwnTasksOnly(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "tasks.view_own", overrides) && !canViewAllTasks(roles, overrides);
}

export function canViewEstimates(roles: AppRole[], overrides: Overrides = {}): boolean {
  return has(roles, "estimates.view", overrides);
}

function filterNavItems(roles: AppRole[], overrides: Overrides, items: NavItem[]): NavItem[] {
  return items
    .filter((item) => {
      if (!item.permission) return true;
      switch (item.permission) {
        case "tasks.view":
        case "tasks.view_own":
          return canAccessTasks(roles, overrides);
        case "objects.view_all":
          return canSeeAllObjects(roles, overrides) || has(roles, "objects.view_scoped", overrides);
        case "objects.view_scoped":
          return has(roles, "objects.view_scoped", overrides) || canSeeAllObjects(roles, overrides);
        case "tools.view":
        case "tools.view_assigned":
          return canViewTools(roles, overrides);
        default:
          return has(roles, item.permission, overrides);
      }
    })
    .map(({ permission: _p, ...rest }) => rest);
}

const SCOPED_NAV_BLUEPRINT: NavItem[] = [
  { to: "/", label: "Главная", exact: true },
  { to: "/objects", label: "Мои объекты", permission: "objects.view_scoped" },
  { to: "/tasks", label: "Мои задачи", permission: "tasks.view_own" },
  { to: "/brigades", label: "Бригады", permission: "brigades.view" },
  { to: "/photos", label: "Фотоотчеты", permission: "photos.view" },
  { to: "/tools", label: "Инструмент на мне", permission: "tools.view_assigned" },
];

const TOOLS_KEEPER_NAV_BLUEPRINT: NavItem[] = [
  { to: "/", label: "Дашборд", exact: true },
  { to: "/tools", label: "Инструмент", permission: "tools.view" },
  { to: "/objects", label: "Объекты", permission: "objects.view_scoped" },
  { to: "/customers", label: "Заказчики", permission: "customers.view" },
  { to: "/brigades", label: "Бригады", permission: "brigades.view" },
  { to: "/settings", label: "Настройки", permission: "settings.view" },
];

const NAV_BLUEPRINT: NavItem[] = [
  { to: "/", label: "Дашборд", exact: true },
  { to: "/objects", label: "Объекты", permission: "objects.view_all" },
  { to: "/tasks", label: "Задачи", permission: "tasks.view" },
  { to: "/customers", label: "Заказчики", permission: "customers.view" },
  { to: "/brigades", label: "Бригады", permission: "brigades.view" },
  { to: "/photos", label: "Фотоотчеты", permission: "photos.view" },
  { to: "/tools", label: "Инструмент", permission: "tools.view" },
  { to: "/documents", label: "Документы", permission: "documents.view" },
  { to: "/expenses", label: "Расходы", permission: "finances.view" },
  { to: "/estimates", label: "Сметы", permission: "estimates.view" },
  { to: "/chat", label: "Чат", permission: "chat.view" },
  { to: "/users", label: "Пользователи", permission: "users.view" },
  { to: "/settings", label: "Настройки", permission: "settings.view" },
];

export function navForRoles(roles: AppRole[], overrides: Overrides = {}): NavItem[] {
  const role = primaryRole(roles);

  if (role === "foreman" && isForeman(roles, overrides)) {
    return filterNavItems(roles, overrides, SCOPED_NAV_BLUEPRINT);
  }

  if (role === "tools_keeper" && isToolsKeeper(roles, overrides)) {
    return filterNavItems(roles, overrides, TOOLS_KEEPER_NAV_BLUEPRINT);
  }

  return filterNavItems(roles, overrides, NAV_BLUEPRINT);
}

const ROUTE_RULES: { prefix: string; check: (roles: AppRole[], o: Overrides) => boolean }[] = [
  { prefix: "/chat", check: (r, o) => has(r, "chat.view", o) },
  { prefix: "/expenses", check: (r, o) => canSeeFinances(r, o) },
  { prefix: "/estimates", check: (r, o) => has(r, "estimates.view", o) },
  { prefix: "/users", check: (r, o) => canManageUsers(r, o) },
  { prefix: "/settings", check: (r, o) => has(r, "settings.view", o) },
  { prefix: "/tasks", check: (r, o) => canAccessTasks(r, o) },
  { prefix: "/documents", check: (r, o) => canViewDocuments(r, o) },
  { prefix: "/customers", check: (r, o) => has(r, "customers.view", o) },
  { prefix: "/brigades", check: (r, o) => has(r, "brigades.view", o) },
  { prefix: "/tools/archive", check: (r, o) => canViewAllTools(r, o) },
  { prefix: "/tools", check: (r, o) => canViewTools(r, o) },
  { prefix: "/photos", check: (r, o) => canViewPhotos(r, o) },
  { prefix: "/objects", check: (r, o) => canSeeAllObjects(r, o) || has(r, "objects.view_scoped", o) },
];

export function canAccessRoute(path: string, roles: AppRole[], overrides: Overrides = {}): boolean {
  if (path === "/" || path === "/auth") return true;
  for (const rule of ROUTE_RULES) {
    if (path === rule.prefix || path.startsWith(rule.prefix + "/")) {
      return rule.check(roles, overrides);
    }
  }
  return true;
}

/** Ограничение списка задач при праве «только свои задачи» */
export function filterTasksForViewer<T extends { assignee_id: string | null }>(
  tasks: T[],
  userId: string | undefined,
  ownOnly: boolean,
): T[] {
  if (!ownOnly || !userId) return tasks;
  return tasks.filter((t) => t.assignee_id === userId);
}

/** Ограничение списка инструмента при праве «инструмент на мне» */
export function filterToolsForViewer<T extends { assignee_id: string | null }>(
  tools: T[],
  userId: string | undefined,
  assignedOnly: boolean,
): T[] {
  if (!assignedOnly || !userId) return tools;
  return tools.filter((t) => t.assignee_id === userId);
}

export function usePermissions() {
  const { roles, user, displayName, isDirector, loading: authLoading } = useAuth();
  const { overrides, loading: grantsLoading, has: grantHas } = usePermissionGrants();

  return useMemo(
    () => ({
      roles,
      user,
      displayName,
      loading: authLoading || grantsLoading,
      primaryRole: primaryRole(roles),
      isDirector,
      overrides,
      has: grantHas,
      canSeeAllObjects: canSeeAllObjects(roles, overrides),
      canCreateObjects: canCreateObjects(roles, overrides),
      canEditObjects: canEditObjects(roles, overrides),
      canDeleteObjects: canDeleteObjects(roles, overrides),
      canManageObjects: canManageObjects(roles, overrides),
      canCreateTasks: canCreateTasks(roles, overrides),
      canEditTasks: canEditTasks(roles, overrides),
      canDeleteTasks: canDeleteTasks(roles, overrides),
      canSubmitTaskReview: canSubmitTaskReview(roles, overrides),
      canReviewWork: canReviewWork(roles, overrides),
      canViewPhotos: canViewPhotos(roles, overrides),
      canCreatePhotos: canCreatePhotos(roles, overrides),
      canEditPhotos: canEditPhotos(roles, overrides),
      canReviewPhotos: canReviewPhotos(roles, overrides),
      canSeeFinances: canSeeFinances(roles, overrides),
      canManageFinances: canManageFinances(roles, overrides),
      canViewFinanceWidgets: canViewFinanceWidgets(roles, overrides),
      canViewTools: canViewTools(roles, overrides),
      canViewAllTools: canViewAllTools(roles, overrides),
      canViewAssignedToolsOnly: canViewAssignedToolsOnly(roles, overrides),
      canViewAllTasks: canViewAllTasks(roles, overrides),
      canViewOwnTasksOnly: canViewOwnTasksOnly(roles, overrides),
      canViewEstimates: canViewEstimates(roles, overrides),
      filterTasks: <T extends { assignee_id: string | null }>(tasks: T[]) =>
        filterTasksForViewer(tasks, user?.id, canViewOwnTasksOnly(roles, overrides)),
      filterTools: <T extends { assignee_id: string | null }>(tools: T[]) =>
        filterToolsForViewer(tools, user?.id, canViewAssignedToolsOnly(roles, overrides)),
      canManageTools: canManageTools(roles, overrides),
      canViewDocuments: canViewDocuments(roles, overrides),
      canManageDocuments: canManageDocuments(roles, overrides),
      canManageCustomers: canManageCustomers(roles, overrides),
      canManageBrigades: canManageBrigades(roles, overrides),
      canManageCatalogs: canManageCatalogs(roles, overrides),
      canManageRoles: canManageRoles(roles, overrides),
      canManageUsers: canManageUsers(roles, overrides),
      canManageAccessSettings: canManageAccessSettings(roles, overrides),
      isForeman: isForeman(roles, overrides),
      isToolsKeeper: isToolsKeeper(roles, overrides),
      canAccessTasks: canAccessTasks(roles, overrides),
      nav: navForRoles(roles, overrides),
      canAccessRoute: (path: string) => canAccessRoute(path, roles, overrides),
    }),
    [roles, user, displayName, authLoading, grantsLoading, isDirector, overrides, grantHas],
  );
}

export type { PermissionKey, PermissionDef, Overrides };
