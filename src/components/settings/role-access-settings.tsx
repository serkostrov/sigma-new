import { Fragment } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Lock,
  RotateCcw,
  Save,
  Check,
  X,
  LayoutGrid,
  UserCog,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/auth-context";
import {
  APP_ROLES,
  APP_ROLE_LABELS,
  PERMISSION_CATEGORIES,
  PERMISSION_DEFS,
  DEFAULT_ROLE_PERMISSIONS,
  permissionsForRole,
  countEnabledForRole,
  isPermissionLocked,
  effectivePermission,
  type PermissionKey,
} from "@/lib/access-control";
import {
  useRolePermissionOverrides,
  useSaveRolePermissions,
  useResetRolePermissions,
} from "@/lib/role-permissions-api";
import { usePermissions } from "@/lib/permissions";

export function AccessMatrixSection() {
  const { data: overrides = {}, isLoading } = useRolePermissionOverrides();
  const { canManageAccessSettings } = usePermissions();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground text-center py-10">Загрузка матрицы…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-secondary/30">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground leading-relaxed">
          Матрица отражает эффективные права каждой роли. Зелёная ячейка — разрешено,
          серая — запрещено, замок — системное ограничение. Изменения вносятся во вкладке
          «По ролям» (доступно руководителю). Базовая защита данных на уровне БД (RLS)
          не ослабляется настройками интерфейса.
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left font-medium px-4 py-3 sticky left-0 bg-secondary/40 z-10 min-w-[220px]">
                Право
              </th>
              {APP_ROLES.map((role) => (
                <th key={role} className="text-center font-medium px-3 py-3 whitespace-nowrap">
                  <div className="text-xs">{APP_ROLE_LABELS[role]}</div>
                  <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                    {countEnabledForRole(role, overrides)}/{PERMISSION_DEFS.length}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_CATEGORIES.map((cat) => {
              const defs = PERMISSION_DEFS.filter((d) => d.category === cat.key);
              if (defs.length === 0) return null;
              return (
                <Fragment key={cat.key}>
                  <tr className="bg-muted/30">
                    <td
                      colSpan={APP_ROLES.length + 1}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {cat.label}
                    </td>
                  </tr>
                  {defs.map((def) => (
                    <tr key={def.key} className="border-b border-border/60 hover:bg-secondary/20">
                      <td className="px-4 py-2.5 sticky left-0 bg-card z-10">
                        <div className="font-medium">{def.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {def.description}
                        </div>
                      </td>
                      {APP_ROLES.map((role) => {
                        const on = effectivePermission(role, def.key, overrides);
                        const locked = isPermissionLocked(role, def.key);
                        return (
                          <td key={role} className="text-center px-3 py-2.5">
                            {locked ? (
                              <span title="Системное ограничение" className="inline-flex text-muted-foreground">
                                <Lock className="w-4 h-4 mx-auto" />
                              </span>
                            ) : on ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {!canManageAccessSettings && (
        <p className="text-xs text-muted-foreground text-center">
          Редактирование матрицы доступно только руководителю
        </p>
      )}
    </div>
  );
}

export function RoleAccessSection() {
  const { data: overrides = {}, isLoading } = useRolePermissionOverrides();
  const save = useSaveRolePermissions();
  const reset = useResetRolePermissions();
  const { canManageAccessSettings } = usePermissions();

  const [selectedRole, setSelectedRole] = useState<AppRole>("director");
  const [draft, setDraft] = useState<Record<PermissionKey, boolean>>(
    () => permissionsForRole("director", {}),
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setDraft(permissionsForRole(selectedRole, overrides));
    setDirty(false);
  }, [selectedRole, overrides, isLoading]);

  const enabledCount = useMemo(
    () => Object.values(draft).filter(Boolean).length,
    [draft],
  );

  const toggle = (key: PermissionKey, value: boolean) => {
    if (isPermissionLocked(selectedRole, key)) return;
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const saveRole = async () => {
    try {
      await save.mutateAsync({ role: selectedRole, grants: draft });
      toast.success(`Права роли «${APP_ROLE_LABELS[selectedRole]}» сохранены`);
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось сохранить");
    }
  };

  const resetRole = async () => {
    if (!confirm(`Сбросить права роли «${APP_ROLE_LABELS[selectedRole]}» к значениям по умолчанию?`)) return;
    try {
      await reset.mutateAsync(selectedRole);
      toast.success("Права сброшены");
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground text-center py-10">Загрузка…</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
      <nav className="space-y-1 h-fit">
        {APP_ROLES.map((role) => {
          const count = countEnabledForRole(role, overrides);
          const active = selectedRole === role;
          return (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
                active
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <div className="font-medium text-sm">{APP_ROLE_LABELS[role]}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {count} из {PERMISSION_DEFS.length} прав
              </div>
            </button>
          );
        })}
      </nav>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-border bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">{APP_ROLE_LABELS[selectedRole]}</div>
              <div className="text-xs text-muted-foreground">
                Активно {enabledCount} прав · по умолчанию{" "}
                {Object.values(DEFAULT_ROLE_PERMISSIONS[selectedRole]).filter(Boolean).length}
              </div>
            </div>
          </div>
          {canManageAccessSettings && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetRole}
                disabled={reset.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-1" /> Сбросить
              </Button>
              <Button
                size="sm"
                onClick={saveRole}
                disabled={!dirty || save.isPending}
              >
                <Save className="w-4 h-4 mr-1" />
                {save.isPending ? "Сохранение…" : "Сохранить"}
              </Button>
            </div>
          )}
        </div>

        {!canManageAccessSettings && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            У вас есть доступ только для просмотра. Изменять права может руководитель.
          </div>
        )}

        {PERMISSION_CATEGORIES.map((cat) => {
          const defs = PERMISSION_DEFS.filter((d) => d.category === cat.key);
          if (defs.length === 0) return null;
          const catEnabled = defs.filter((d) => draft[d.key]).length;
          return (
            <div key={cat.key} className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                <div className="font-medium text-sm">{cat.label}</div>
                <div className="text-xs text-muted-foreground">
                  {catEnabled}/{defs.length}
                </div>
              </div>
              <div className="divide-y divide-border">
                {defs.map((def) => {
                  const locked = isPermissionLocked(selectedRole, def.key);
                  const on = draft[def.key];
                  return (
                    <div
                      key={def.key}
                      className={cn(
                        "flex items-start gap-4 px-4 py-3",
                        locked && "opacity-70 bg-muted/20",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{def.label}</span>
                          {locked && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                              <Lock className="w-3 h-3" /> Системное
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {def.description}
                        </p>
                      </div>
                      <Switch
                        checked={on}
                        disabled={!canManageAccessSettings || locked}
                        onCheckedChange={(v) => toggle(def.key, v)}
                        aria-label={def.label}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ROUTE_ACCESS_ROWS: {
  path: string;
  label: string;
  description: string;
  permission: PermissionKey;
}[] = [
  { path: "/", label: "Дашборд", description: "Главная страница", permission: "objects.view_all" },
  { path: "/objects", label: "Объекты", description: "Список и карточки объектов", permission: "objects.view_all" },
  { path: "/tasks", label: "Задачи", description: "Список и карточки задач", permission: "tasks.view" },
  { path: "/photos", label: "Фотоотчёты", description: "Фотоотчёты с объектов", permission: "photos.view" },
  { path: "/tools", label: "Инструмент", description: "Учёт и выдача инструмента", permission: "tools.view" },
  { path: "/documents", label: "Документы", description: "Документы объектов", permission: "documents.view" },
  { path: "/customers", label: "Заказчики", description: "Справочник заказчиков", permission: "customers.view" },
  { path: "/brigades", label: "Бригады", description: "Справочник бригад", permission: "brigades.view" },
  { path: "/expenses", label: "Расходы", description: "Финансовый учёт", permission: "finances.view" },
  { path: "/estimates", label: "Сметы", description: "Сметная документация", permission: "estimates.view" },
  { path: "/users", label: "Пользователи", description: "Управление пользователями", permission: "users.view" },
  { path: "/settings", label: "Настройки", description: "Справочники и доступ", permission: "settings.view" },
];

export function RouteAccessSection() {
  const { data: overrides = {}, isLoading } = useRolePermissionOverrides();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground text-center py-10">Загрузка…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-secondary/30">
        <LayoutGrid className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground leading-relaxed">
          Видимость разделов меню и доступ к маршрутам определяется набором прав роли.
          При отсутствии права раздел скрывается из навигации, а прямой переход по URL
          перенаправляет на главную.
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left font-medium px-4 py-3">Раздел</th>
              <th className="text-left font-medium px-4 py-3">Требуемое право</th>
              {APP_ROLES.map((role) => (
                <th key={role} className="text-center font-medium px-2 py-3 text-xs whitespace-nowrap">
                  {APP_ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROUTE_ACCESS_ROWS.map((row) => (
              <tr key={row.path} className="border-b border-border/60 hover:bg-secondary/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.label}</div>
                  <div className="text-xs text-muted-foreground">{row.description}</div>
                  <code className="text-[10px] text-muted-foreground">{row.path}</code>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px]">
                  {PERMISSION_DEFS.find((d) => d.key === row.permission)?.label ?? row.permission}
                </td>
                {APP_ROLES.map((role) => {
                  const allowed =
                    row.path === "/"
                      ? true
                      : row.permission === "tasks.view"
                        ? effectivePermission(role, "tasks.view", overrides) ||
                          effectivePermission(role, "tasks.view_own", overrides)
                        : row.permission === "objects.view_all"
                          ? effectivePermission(role, "objects.view_all", overrides) ||
                            effectivePermission(role, "objects.view_scoped", overrides)
                          : row.permission === "tools.view"
                            ? effectivePermission(role, "tools.view", overrides) ||
                              effectivePermission(role, "tools.view_assigned", overrides)
                            : effectivePermission(role, row.permission, overrides);
                  return (
                    <td key={role} className="text-center px-2 py-3">
                      {allowed ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RoleOverviewSection() {
  const { data: overrides = {}, isLoading } = useRolePermissionOverrides();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground text-center py-10">Загрузка…</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {APP_ROLES.map((role) => {
        const total = PERMISSION_DEFS.length;
        const enabled = countEnabledForRole(role, overrides);
        const pct = Math.round((enabled / total) * 100);
        return (
          <div key={role} className="border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <UserCog className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">{APP_ROLE_LABELS[role]}</div>
                <div className="text-xs text-muted-foreground">{enabled} активных прав</div>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-1">
              {PERMISSION_CATEGORIES.map((cat) => {
                const defs = PERMISSION_DEFS.filter((d) => d.category === cat.key);
                const catOn = defs.filter((d) => effectivePermission(role, d.key, overrides)).length;
                return (
                  <div key={cat.key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{cat.label}</span>
                    <span className="font-medium">{catOn}/{defs.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
