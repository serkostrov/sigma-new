import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Building2, AlertTriangle, ListChecks, Camera, Wrench, WrenchIcon,
  Banknote, Plus, PackageCheck, ChevronRight, Receipt,
} from "lucide-react";
import { PageHeader } from "@/components/app-layout";
import { StatusBadge } from "@/components/status-badge";
import { PhotoUploadDialog } from "@/components/photo-upload-dialog";
import { ProblemDialog } from "@/components/problem-dialog";
import { useObjects } from "@/lib/objects-api";
import { useTasks } from "@/lib/tasks-api";
import { useToolsDb } from "@/lib/tools-api";
import { usePhotos } from "@/lib/photos-api";
import { useExpenses, formatRub } from "@/lib/expenses-api";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { APP_ROLE_LABELS } from "@/lib/auth-context";
import type { SiteObject } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { isForeman, isToolsKeeper, primaryRole } = usePermissions();
  if (isForeman) return <ForemanHome />;
  return <ManagerHome isTools={isToolsKeeper} />;
}

// Parse DD.MM.YYYY → Date | null
function parseDeadline(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** Risk: object is active and (overdue OR ≤14 days left with progress<80%) */
function isAtRisk(o: SiteObject): boolean {
  if (o.status !== "В работе") return false;
  const dl = parseDeadline(o.deadline);
  if (!dl) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = daysBetween(dl, today);
  if (days < 0) return true;
  return days <= 14 && (o.progress ?? 0) < 80;
}

function isToday(iso: string) {
  const d = new Date(iso); const n = new Date();
  return d.toDateString() === n.toDateString();
}

function startOfMonthISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone?: "default" | "warn" | "danger" | "ok";
}) {
  const valueCls =
    tone === "danger" ? "text-red-700"
    : tone === "warn" ? "text-amber-700"
    : tone === "ok" ? "text-emerald-700"
    : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wide truncate">{label}</div>
        <div className={`mt-2 text-2xl font-semibold tracking-tight ${valueCls}`}>{value}</div>
      </div>
      <Icon className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
    </div>
  );
}

function IconAction({
  icon: Icon,
  to,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  title: string;
}) {
  return (
    <Link
      to={to}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <Icon className="w-4 h-4" />
    </Link>
  );
}

function QuickLink({ icon: Icon, to, children }: { icon: React.ComponentType<{ className?: string }>; to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
      <Icon className="w-4 h-4" />{children}
    </Link>
  );
}

function ManagerHome({ isTools }: { isTools: boolean }) {
  const {
    primaryRole,
    canSeeFinances,
    canViewFinanceWidgets,
    canViewPhotos,
    canViewTools,
    canCreateObjects,
    canCreateTasks,
    canManageFinances,
    canManageTools,
    canAccessTasks,
    filterTasks,
    filterTools,
  } = usePermissions();
  const { data: objects = [] } = useObjects();
  const { data: tasks = [] } = useTasks();
  const { data: tools = [] } = useToolsDb();
  const { data: photos = [] } = usePhotos();
  const { data: expenses = [] } = useExpenses({ dateFrom: startOfMonthISO() });

  const visibleTasks = useMemo(() => filterTasks(tasks), [tasks, filterTasks]);
  const visibleTools = useMemo(() => filterTools(tools), [tools, filterTools]);

  const inWork = useMemo(() => objects.filter((o) => o.status === "В работе"), [objects]);
  const showcase = useMemo(
    () => [...inWork, ...objects.filter((o) => o.status === "Согласование")].slice(0, 6),
    [inWork, objects],
  );
  const atRisk = useMemo(() => objects.filter(isAtRisk), [objects]);
  const todayTasks = useMemo(
    () => visibleTasks.filter((t) => t.deadline && parseDeadline(t.deadline)?.toDateString() === new Date().toDateString()),
    [visibleTasks],
  );
  const toolsOnSite = visibleTools.filter((t) => t.status === "На объекте");
  const toolsInRepair = visibleTools.filter((t) => t.status === "В ремонте");
  const toolsFree = visibleTools.filter((t) => t.status === "Свободен");
  const toolsProblem = visibleTools.filter((t) => t.status === "Потерян");
  const photosToday = photos.filter((p) => isToday(p.createdAt)).length;
  const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const objectNameById = (id: string | null) => (id ? objects.find((o) => o.id === id)?.name ?? "—" : "—");

  return (
    <>
      <PageHeader
        title={isTools ? "Дашборд по инструменту" : "Дашборд руководителя"}
        description={`Роль: ${primaryRole ? APP_ROLE_LABELS[primaryRole] : "—"} · Сегодня в работе ${inWork.length} объектов`}
        actions={
          isTools ? (
            canManageTools ? (
              <>
                <IconAction icon={PackageCheck} to="/tools" title="Выдать инструмент" />
                <IconAction icon={WrenchIcon} to="/tools" title="Принять с объекта" />
              </>
            ) : null
          ) : (
            <>
              {canCreateObjects && <IconAction icon={Plus} to="/objects" title="Создать объект" />}
              {canCreateTasks && <IconAction icon={ListChecks} to="/tasks" title="Добавить задачу" />}
              {canManageFinances && <IconAction icon={Receipt} to="/expenses" title="Добавить расход" />}
              {canManageTools && <IconAction icon={PackageCheck} to="/tools" title="Выдать инструмент" />}
            </>
          )
        }
      />

      <div className={`grid grid-cols-2 ${canViewFinanceWidgets ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 mb-6`}>
        <Stat icon={Building2} label="Объектов в работе" value={inWork.length} />
        <Stat icon={AlertTriangle} label="С риском просрочки" value={atRisk.length} tone={atRisk.length > 0 ? "danger" : "default"} />
        {canAccessTasks && (
          <Stat icon={ListChecks} label="Задач на сегодня" value={todayTasks.length} tone={todayTasks.length > 0 ? "warn" : "default"} />
        )}
        {canViewFinanceWidgets && (
          <Stat icon={Banknote} label="Расходы за месяц" value={formatRub(expensesTotal)} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="font-semibold">Объекты в работе</div>
              <div className="text-xs text-muted-foreground">Сводка по активным объектам</div>
            </div>
            <Link to="/objects" className="text-sm text-primary hover:underline">Все объекты</Link>
          </div>
          <div className="divide-y divide-border">
            {showcase.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Объектов пока нет</div>
            )}
            {showcase.map((o) => {
              const risk = isAtRisk(o);
              return (
                <Link key={o.id} to="/objects/$objectId" params={{ objectId: o.id }} className="px-5 py-3 flex items-center gap-4 hover:bg-secondary/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium truncate">{o.name}</div>
                      {risk && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-700">
                          <AlertTriangle className="w-3 h-3" /> Риск просрочки
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{o.address} · {o.brigade} · срок {o.deadline}</div>
                  </div>
                  <div className="hidden md:flex flex-col items-end gap-1 w-40">
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${o.progress}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground">{o.progress}%</div>
                  </div>
                  <StatusBadge value={o.status} />
                </Link>
              );
            })}
          </div>
        </div>

        {canAccessTasks && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="font-semibold">Задачи на сегодня</div>
            <Link to="/tasks" className="text-sm text-primary hover:underline">Все</Link>
          </div>
          <div className="divide-y divide-border">
            {todayTasks.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Задач на сегодня нет</div>
            )}
            {todayTasks.slice(0, 8).map((t) => (
              <Link key={t.id} to="/tasks/$taskId" params={{ taskId: t.id }} className="block px-5 py-3 hover:bg-secondary/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{objectNameById(t.object_id)}</div>
                  </div>
                  <StatusBadge value={t.priority} />
                </div>
              </Link>
            ))}
          </div>
        </div>
        )}

        {canViewPhotos && (
        <div className="lg:col-span-2 bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="font-semibold">Последние фотоотчеты</div>
            <Link to="/photos" className="text-sm text-primary hover:underline">Все отчеты</Link>
          </div>
          <div className="divide-y divide-border">
            {photos.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Фотоотчётов пока нет</div>
            )}
            {photos.slice(0, 5).map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-4">
                {p.images[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.note}
                    className="w-12 h-12 rounded-md object-cover border border-border"
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-md bg-gradient-to-br ${p.thumb}`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.note}</div>
                  <div className="text-xs text-muted-foreground truncate">{objectNameById(p.objectId)} · {p.author} · {p.date}</div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{p.count} фото</div>
              </div>
            ))}
          </div>
        </div>
        )}

        {canViewTools && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="font-semibold">Инструмент</div>
            <Link to="/tools" className="text-sm text-primary hover:underline">Перейти</Link>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Всего</span><span className="font-medium">{visibleTools.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Свободно</span><span className="font-medium">{toolsFree.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">На объектах</span><span className="font-medium">{toolsOnSite.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">В ремонте</span><span className="font-medium text-red-700">{toolsInRepair.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Потеряно</span><span className="font-medium text-amber-700">{toolsProblem.length}</span></div>
            <div className="pt-3 mt-1 border-t border-border space-y-3">
              {canViewPhotos && (
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Фотоотчёты сегодня</span><span className="font-medium">{photosToday}</span></div>
              )}
              {canSeeFinances && (
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Записей расходов</span><span className="font-medium">{expenses.length}</span></div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
}

function ForemanHome() {
  const { user, displayName } = useAuth();
  const { canCreatePhotos } = usePermissions();
  const userId = user?.id ?? null;
  const { data: objects = [] } = useObjects();
  const { data: tasks = [] } = useTasks();
  const { data: tools = [] } = useToolsDb();
  const { data: photos = [] } = usePhotos();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);

  const myObjects = useMemo(() => objects, [objects]);
  const myObjectIds = new Set(myObjects.map((o) => o.id));
  const myTasks = useMemo(
    () => tasks.filter((t) => userId && t.assignee_id === userId),
    [tasks, userId],
  );
  const todayTasks = myTasks.filter(
    (t) => t.deadline && parseDeadline(t.deadline)?.toDateString() === new Date().toDateString(),
  );
  const myToolsCount = tools.filter((t) => userId && t.assignee_id === userId).length;
  const myPhotosToday = photos.filter(
    (p) => (p.authorId === userId || (p.objectId && myObjectIds.has(p.objectId))) && isToday(p.createdAt),
  ).length;

  const objectNameById = (id: string | null) => (id ? objects.find((o) => o.id === id)?.name ?? "—" : "—");

  return (
    <>
      <div className="mb-4">
        <div className="text-xs text-muted-foreground">Сегодня · {displayName || "Мастер"}</div>
        <h1 className="text-2xl font-semibold tracking-tight">Главная</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {canCreatePhotos && (
          <button onClick={() => setPhotoOpen(true)} className="h-20 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex flex-col items-center justify-center gap-1 hover:bg-primary/90">
            <Camera className="w-6 h-6" />Добавить фотоотчет
          </button>
        )}
        <button onClick={() => setProblemOpen(true)} className={cn("h-20 rounded-xl bg-red-600 text-white font-semibold text-sm flex flex-col items-center justify-center gap-1 hover:bg-red-700", !canCreatePhotos && "col-span-2")}>
          <AlertTriangle className="w-6 h-6" />Сообщить о проблеме
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <MiniStat label="Объектов" value={myObjects.length} />
        <MiniStat label="Задач сегодня" value={todayTasks.length} tone="warn" />
        <MiniStat label="Фото сегодня" value={myPhotosToday} tone="ok" />
      </div>

      <Section title="Задачи на сегодня" linkTo="/tasks" linkLabel="Все задачи">
        <div className="space-y-2">
          {todayTasks.map((t) => (
            <Link key={t.id} to="/tasks/$taskId" params={{ taskId: t.id }} className="block bg-card border border-border rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{objectNameById(t.object_id)}</div>
                </div>
                <StatusBadge value={t.status} />
              </div>
            </Link>
          ))}
          {todayTasks.length === 0 && <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">На сегодня задач нет</div>}
        </div>
      </Section>

      <Section title="Мои объекты" linkTo="/objects" linkLabel="Все">
        <div className="space-y-2">
          {myObjects.map((o) => (
            <Link key={o.id} to="/objects/$objectId" params={{ objectId: o.id }} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{o.name}</div>
                <div className="text-xs text-muted-foreground truncate">{o.address}</div>
                <div className="mt-1.5 h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${o.progress}%` }} />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
          {myObjects.length === 0 && <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">Объектов нет</div>}
        </div>
      </Section>

      <Section title="Инструмент на мне" linkTo="/tools" linkLabel="Все">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div className="text-sm">
            <div className="font-semibold text-base">{myToolsCount} единиц</div>
            <div className="text-xs text-muted-foreground">закреплено за вами</div>
          </div>
          <Wrench className="w-6 h-6 text-primary" />
        </div>
      </Section>

      <PhotoUploadDialog open={photoOpen} onClose={() => setPhotoOpen(false)} author={displayName || "Мастер"} />
      <ProblemDialog open={problemOpen} onClose={() => setProblemOpen(false)} author={displayName || "Мастер"} />
    </>
  );
}

function MiniStat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warn" | "ok" }) {
  const cls = tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <div className={`text-2xl font-semibold ${cls}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
    </div>
  );
}

function Section({ title, linkTo, linkLabel, children }: { title: string; linkTo: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{title}</div>
        <Link to={linkTo as string} className="text-xs text-primary hover:underline">{linkLabel}</Link>
      </div>
      {children}
    </div>
  );
}