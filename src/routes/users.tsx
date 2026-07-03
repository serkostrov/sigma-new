import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-layout";
import { useAuth, AppRole, APP_ROLE_LABELS, APP_ROLE_ORDER } from "@/lib/auth-context";
import { usePermissions } from "@/lib/permissions";
import { UserCog, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/users")({ component: UsersPage });

type ProfileRow = { id: string; email: string; full_name: string | null; created_at: string };
type RoleRow = { id: string; user_id: string; role: AppRole };

function UsersPage() {
  const { user: me } = useAuth();
  const { canManageRoles } = usePermissions();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("user_roles").select("*"),
    ]);
    setProfiles((p ?? []) as ProfileRow[]);
    setRoles((r ?? []) as RoleRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const rolesOf = (uid: string) => roles.filter((r) => r.user_id === uid).map((r) => r.role);

  const setUserRole = async (uid: string, newRole: AppRole) => {
    setErr(null);
    setSavingId(uid);
    try {
      const existing = roles.filter((r) => r.user_id === uid);
      if (existing.length) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .in("id", existing.map((r) => r.id));
        if (error) throw error;
      }
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: newRole });
      if (error) throw error;
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Пользователи"
        description="Сотрудники системы и их роли. Назначать роли может только Руководитель."
      />

      {!canManageRoles && (
        <div className="mb-4 text-sm bg-amber-50 text-amber-900 border border-amber-200 rounded-md px-4 py-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          У вас нет прав изменять роли. Список доступен для просмотра.
        </div>
      )}
      {err && (
        <div className="mb-4 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md px-4 py-3">
          {err}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1fr_220px_140px] gap-4 px-5 py-3 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div>Сотрудник</div>
          <div>Email</div>
          <div>Роль</div>
          <div>Дата</div>
        </div>

        {loading ? (
          <div className="p-10 grid place-items-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Нет пользователей</div>
        ) : (
          profiles.map((p) => {
            const userRoles = rolesOf(p.id);
            const current = APP_ROLE_ORDER.find((r) => userRoles.includes(r));
            return (
              <div
                key={p.id}
                className="md:grid md:grid-cols-[1fr_1fr_220px_140px] gap-4 px-5 py-4 border-t border-border items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary text-primary grid place-items-center text-sm font-semibold">
                    {(p.full_name || p.email)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {p.full_name || "—"}
                      {p.id === me?.id && <span className="ml-2 text-xs text-muted-foreground">(это вы)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground md:hidden">{p.email}</div>
                  </div>
                </div>
                <div className="hidden md:block text-sm text-muted-foreground">{p.email}</div>
                <div className="mt-2 md:mt-0">
                  {canManageRoles ? (
                    <select
                      value={current ?? ""}
                      disabled={savingId === p.id}
                      onChange={(e) => setUserRole(p.id, e.target.value as AppRole)}
                      className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    >
                      <option value="" disabled>Выберите роль</option>
                      {APP_ROLE_ORDER.map((r) => (
                        <option key={r} value={r}>{APP_ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <UserCog className="w-3.5 h-3.5 text-muted-foreground" />
                      {current ? APP_ROLE_LABELS[current] : "Без роли"}
                    </span>
                  )}
                </div>
                <div className="mt-2 md:mt-0 text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("ru-RU")}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}