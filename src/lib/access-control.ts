import type { AppRole } from "./auth-context";
import { APP_ROLE_LABELS, APP_ROLE_ORDER } from "./auth-context";

export const APP_ROLES = APP_ROLE_ORDER;

export type PermissionKey =
  | "objects.view_all"
  | "objects.view_scoped"
  | "objects.create"
  | "objects.edit"
  | "objects.delete"
  | "tasks.view"
  | "tasks.view_own"
  | "tasks.create"
  | "tasks.edit"
  | "tasks.delete"
  | "tasks.submit_review"
  | "tasks.review"
  | "photos.view"
  | "photos.create"
  | "photos.edit"
  | "photos.review"
  | "finances.view"
  | "finances.manage"
  | "estimates.view"
  | "tools.view"
  | "tools.manage"
  | "tools.view_assigned"
  | "documents.view"
  | "documents.manage"
  | "customers.view"
  | "customers.manage"
  | "brigades.view"
  | "brigades.manage"
  | "users.view"
  | "users.manage_roles"
  | "settings.view"
  | "settings.catalogs"
  | "settings.access"
  | "dashboard.finance_widgets"
  | "chat.view";

export type PermissionCategory =
  | "objects"
  | "tasks"
  | "photos"
  | "finances"
  | "tools"
  | "documents"
  | "directories"
  | "admin";

export type PermissionDef = {
  key: PermissionKey;
  label: string;
  description: string;
  category: PermissionCategory;
  /** Нельзя отключить для роли (системное ограничение) */
  lockedFor?: Partial<Record<AppRole, boolean>>;
};

export const PERMISSION_CATEGORIES: { key: PermissionCategory; label: string }[] = [
  { key: "objects", label: "Объекты" },
  { key: "tasks", label: "Задачи" },
  { key: "photos", label: "Фотоотчёты" },
  { key: "finances", label: "Финансы" },
  { key: "tools", label: "Инструмент" },
  { key: "documents", label: "Документы" },
  { key: "directories", label: "Справочники" },
  { key: "admin", label: "Администрирование" },
];

export const PERMISSION_DEFS: PermissionDef[] = [
  {
    key: "objects.view_all",
    label: "Все объекты",
    description: "Просмотр полного списка объектов без ограничения по прорабу или бригаде",
    category: "objects",
  },
  {
    key: "objects.view_scoped",
    label: "Свои объекты",
    description: "Доступ к объектам, где пользователь назначен прорабом или входит в бригаду",
    category: "objects",
    lockedFor: { foreman: true },
  },
  {
    key: "objects.create",
    label: "Создание объектов",
    description: "Добавление новых строительных объектов",
    category: "objects",
  },
  {
    key: "objects.edit",
    label: "Редактирование объектов",
    description: "Изменение карточки объекта, этапов и ответственных",
    category: "objects",
  },
  {
    key: "objects.delete",
    label: "Удаление объектов",
    description: "Безвозвратное удаление объектов из системы",
    category: "objects",
  },
  {
    key: "tasks.view",
    label: "Все задачи",
    description: "Просмотр задач по доступным объектам",
    category: "tasks",
  },
  {
    key: "tasks.view_own",
    label: "Свои задачи",
    description: "Просмотр только назначенных на пользователя задач",
    category: "tasks",
    lockedFor: { foreman: true },
  },
  {
    key: "tasks.create",
    label: "Создание задач",
    description: "Постановка новых задач на объектах",
    category: "tasks",
  },
  {
    key: "tasks.edit",
    label: "Редактирование задач",
    description: "Изменение описания, сроков и исполнителей",
    category: "tasks",
  },
  {
    key: "tasks.delete",
    label: "Удаление задач",
    description: "Удаление задач из системы",
    category: "tasks",
  },
  {
    key: "tasks.submit_review",
    label: "Отправка на проверку",
    description: "Исполнитель отправляет задачу руководству на согласование",
    category: "tasks",
  },
  {
    key: "tasks.review",
    label: "Проверка задач",
    description: "Принятие или возврат задач с замечанием",
    category: "tasks",
  },
  {
    key: "photos.view",
    label: "Просмотр фотоотчётов",
    description: "Доступ к списку и деталям фотоотчётов",
    category: "photos",
  },
  {
    key: "photos.create",
    label: "Создание фотоотчётов",
    description: "Загрузка фото с объектов",
    category: "photos",
  },
  {
    key: "photos.edit",
    label: "Редактирование фотоотчётов",
    description: "Изменение описания и состава фотографий",
    category: "photos",
  },
  {
    key: "photos.review",
    label: "Проверка фотоотчётов",
    description: "Подтверждение отчётов или оставление замечаний",
    category: "photos",
  },
  {
    key: "finances.view",
    label: "Просмотр финансов",
    description: "Бюджеты, расходы, сводки и финансовые виджеты",
    category: "finances",
  },
  {
    key: "finances.manage",
    label: "Управление расходами",
    description: "Создание и редактирование записей расходов",
    category: "finances",
  },
  {
    key: "estimates.view",
    label: "Просмотр смет",
    description: "Доступ к разделу смет и итоговым суммам",
    category: "finances",
  },
  {
    key: "tools.view",
    label: "Весь инструмент",
    description: "Просмотр полного каталога инструмента",
    category: "tools",
  },
  {
    key: "tools.view_assigned",
    label: "Инструмент на мне",
    description: "Просмотр инструмента, закреплённого за пользователем",
    category: "tools",
    lockedFor: { foreman: true },
  },
  {
    key: "tools.manage",
    label: "Управление инструментом",
    description: "Выдача, приём, перемещение и учёт инструмента",
    category: "tools",
  },
  {
    key: "documents.view",
    label: "Просмотр документов",
    description: "Доступ к документам на объектах",
    category: "documents",
  },
  {
    key: "documents.manage",
    label: "Управление документами",
    description: "Загрузка, редактирование и удаление документов",
    category: "documents",
  },
  {
    key: "customers.view",
    label: "Просмотр заказчиков",
    description: "Доступ к справочнику заказчиков",
    category: "directories",
  },
  {
    key: "customers.manage",
    label: "Управление заказчиками",
    description: "Создание и редактирование заказчиков",
    category: "directories",
  },
  {
    key: "brigades.view",
    label: "Просмотр бригад",
    description: "Доступ к справочнику бригад и составу",
    category: "directories",
  },
  {
    key: "brigades.manage",
    label: "Управление бригадами",
    description: "Создание бригад и назначение участников",
    category: "directories",
  },
  {
    key: "users.view",
    label: "Просмотр пользователей",
    description: "Доступ к списку пользователей системы",
    category: "admin",
  },
  {
    key: "users.manage_roles",
    label: "Назначение ролей",
    description: "Изменение ролей пользователей (только руководитель)",
    category: "admin",
    lockedFor: { director: true },
  },
  {
    key: "settings.view",
    label: "Доступ к настройкам",
    description: "Просмотр раздела настроек системы",
    category: "admin",
  },
  {
    key: "settings.catalogs",
    label: "Справочники",
    description: "Редактирование статусов, этапов и каталогов в настройках",
    category: "admin",
  },
  {
    key: "settings.access",
    label: "Настройка доступа",
    description: "Изменение матрицы прав ролей",
    category: "admin",
    lockedFor: { director: true },
  },
  {
    key: "dashboard.finance_widgets",
    label: "Финансовые виджеты",
    description: "Отображение расходов и бюджетов на дашборде",
    category: "finances",
  },
  {
    key: "chat.view",
    label: "Чат VK",
    description: "Просмотр и ответы на личные сообщения ВКонтакте",
    category: "admin",
  },
];

const allKeys = () => PERMISSION_DEFS.map((d) => d.key);

const grant = (...keys: PermissionKey[]): Record<PermissionKey, boolean> => {
  const m = Object.fromEntries(allKeys().map((k) => [k, false])) as Record<PermissionKey, boolean>;
  keys.forEach((k) => (m[k] = true));
  return m;
};

/** Базовые права по ролям — совпадают с RLS и бизнес-логикой по умолчанию */
export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, Record<PermissionKey, boolean>> = {
  director: grant(...allKeys()),
  deputy_director: grant(
    ...allKeys().filter((k) => k !== "users.manage_roles" && k !== "settings.access"),
  ),
  rop: grant(
    "objects.view_all",
    "objects.create",
    "objects.edit",
    "tasks.view",
    "tasks.create",
    "tasks.edit",
    "tasks.delete",
    "tasks.review",
    "photos.view",
    "photos.create",
    "photos.edit",
    "photos.review",
    "tools.view",
    "tools.manage",
    "documents.view",
    "documents.manage",
    "customers.view",
    "customers.manage",
    "brigades.view",
    "brigades.manage",
    "settings.view",
    "settings.catalogs",
  ),
  foreman: grant(
    "objects.view_scoped",
    "tasks.view_own",
    "tasks.edit",
    "tasks.submit_review",
    "photos.view",
    "photos.create",
    "photos.edit",
    "tools.view_assigned",
    "brigades.view",
  ),
  tools_keeper: grant(
    "objects.view_scoped",
    "tools.view",
    "tools.manage",
    "customers.view",
    "brigades.view",
    "settings.view",
  ),
};

export function isPermissionLocked(role: AppRole, key: PermissionKey): boolean {
  const def = PERMISSION_DEFS.find((d) => d.key === key);
  if (!def?.lockedFor) return false;
  const locked = def.lockedFor[role];
  return locked === true;
}

export function effectivePermission(
  role: AppRole,
  key: PermissionKey,
  overrides: Partial<Record<AppRole, Partial<Record<PermissionKey, boolean>>>>,
): boolean {
  if (isPermissionLocked(role, key)) {
    return DEFAULT_ROLE_PERMISSIONS[role][key];
  }
  const override = overrides[role]?.[key];
  if (override !== undefined) return override;
  return DEFAULT_ROLE_PERMISSIONS[role][key];
}

export function roleHasPermission(
  roles: AppRole[],
  key: PermissionKey,
  overrides: Partial<Record<AppRole, Partial<Record<PermissionKey, boolean>>>>,
): boolean {
  return roles.some((r) => effectivePermission(r, key, overrides));
}

export function permissionsForRole(
  role: AppRole,
  overrides: Partial<Record<AppRole, Partial<Record<PermissionKey, boolean>>>>,
): Record<PermissionKey, boolean> {
  return Object.fromEntries(
    allKeys().map((k) => [k, effectivePermission(role, k, overrides)]),
  ) as Record<PermissionKey, boolean>;
}

export function countEnabledForRole(
  role: AppRole,
  overrides: Partial<Record<AppRole, Partial<Record<PermissionKey, boolean>>>>,
): number {
  return allKeys().filter((k) => effectivePermission(role, k, overrides)).length;
}

export { APP_ROLE_LABELS };
