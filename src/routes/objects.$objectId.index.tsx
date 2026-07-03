import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  ListChecks,
  MessageSquare,
  Wrench,
  FolderArchive,
  LayoutGrid,
  Layers,
  AlertTriangle,
  Send,
  Pencil,
  Trash2,
  ChevronRight,
  Plus,
  Truck,
  Wallet,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { PhotoUploadDialog } from "@/components/photo-upload-dialog";
import { DocumentsBrowser } from "@/components/documents-browser";
import { ExpensesView } from "@/components/expenses-view";
import { useAuth } from "@/lib/auth-context";
import {
  STAGES,
  formatMoney,
  HEALTH_LABEL,
  sumEstimateAfterDiscount,
} from "@/lib/demo-data";
import { useData } from "@/lib/data-store";
import { usePhotos } from "@/lib/photos-api";
import { useObject, useDeleteObject } from "@/lib/objects-api";
import { useObjectStages, useAddDefaultStages, useUpdateObjectStage } from "@/lib/stages-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoGrid } from "@/components/photo-grid";
import { StageStatusSelect } from "@/components/stage-status-select";
import { useToolsDb, useToolStatuses, useToolConditions } from "@/lib/tools-api";
import { ColoredBadge } from "@/components/colored-badge";
import { ToolMoveDialog } from "@/components/tool-move-dialog";
import { useAllUsers } from "@/lib/users-api";
import { useTasks } from "@/lib/tasks-api";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { TaskListView } from "@/components/task-list-view";
import { ObjectFormDialog } from "@/components/object-form-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/objects/$objectId/")({ component: ObjectDetail });

type Tab =
  | "overview"
  | "stages"
  | "tasks"
  | "photos"
  | "tools"
  | "documents"
  | "expenses"
  | "comments";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Обзор", icon: LayoutGrid },
  { key: "stages", label: "Этапы работ", icon: Layers },
  { key: "tasks", label: "Задачи", icon: ListChecks },
  { key: "photos", label: "Фотоотчеты", icon: Camera },
  { key: "tools", label: "Инструмент", icon: Wrench },
  { key: "documents", label: "Документы", icon: FolderArchive },
  { key: "expenses", label: "Расходы", icon: Wallet },
  { key: "comments", label: "Комментарии", icon: MessageSquare },
];

function ObjectDetail() {
  const { objectId } = useParams({ from: "/objects/$objectId/" });
  const navigate = useNavigate();
  const { data: obj, isLoading } = useObject(objectId);
  const del = useDeleteObject();
  const { data: objStages = [] } = useObjectStages(objectId);
  const addDefaults = useAddDefaultStages();
  const updateStage = useUpdateObjectStage();
  const { users: allUsers } = useAllUsers();
  const tabStorageKey = `object-tab:${objectId}`;
  const [tab, setTabState] = useState<Tab>(() => {
    if (typeof window === "undefined") return "overview";
    const saved = window.sessionStorage.getItem(tabStorageKey) as Tab | null;
    return saved ?? "overview";
  });
  const setTab = (next: Tab) => {
    setTabState(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(tabStorageKey, next);
    }
  };
  const [photoDialog, setPhotoDialog] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [moveToolId, setMoveToolId] = useState<string | null>(null);
  const [photoStageFilter, setPhotoStageFilter] = useState<string>("all");
  const [photoTaskFilter, setPhotoTaskFilter] = useState<string>("all");
  const { tasks, objectComments, addObjectComment, estimates } = useData();
  const { data: photos = [] } = usePhotos();
  const {
    canEditObjects,
    canDeleteObjects,
    canCreateTasks,
    canCreatePhotos,
    canSeeFinances,
    canAccessTasks,
    canViewDocuments,
    canViewPhotos,
    canViewTools,
    canManageTools,
    filterTasks,
    filterTools,
    isToolsKeeper,
  } = usePermissions();
  const { displayName } = useAuth();
  const author = displayName || "Пользователь";
  const { data: dbTasks = [] } = useTasks({ objectId });
  const visibleTasks = filterTasks(dbTasks);
  const { data: dbTools = [] } = useToolsDb({ objectId });
  const visibleTools = filterTools(dbTools);
  const { data: toolStatuses = [] } = useToolStatuses();
  const { data: toolConditions = [] } = useToolConditions();

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
        Загрузка объекта…
      </div>
    );
  }

  if (!obj) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        Объект не найден.{" "}
        <Link to="/objects" className="text-primary hover:underline">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  const objTasks = tasks.filter((t) => t.objectId === obj.id);
  const objPhotos = photos.filter((p) => p.objectId === obj.id);
  const objComments = objectComments.filter((c) => c.objectId === obj.id);

  const visibleTabs = TABS.filter((t) => {
    if (t.key === "expenses" && !canSeeFinances) return false;
    if (t.key === "tasks" && (isToolsKeeper || !canAccessTasks)) return false;
    if (t.key === "documents" && !canViewDocuments) return false;
    if (t.key === "photos" && !canViewPhotos) return false;
    if (t.key === "tools" && !canViewTools) return false;
    return true;
  });

  return (
    <>
      <Link
        to="/objects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Все объекты
      </Link>

      <div className="bg-card border border-border rounded-xl p-5 md:p-6 mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{obj.name}</h1>
              <StatusBadge value={obj.status} />
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium",
                  obj.health === "ok"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : obj.health === "questions"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200",
                )}
              >
                {obj.health !== "ok" && <AlertTriangle className="w-3 h-3" />}
                {HEALTH_LABEL[obj.health]}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">{obj.address}</div>
          </div>
          {(canEditObjects || canDeleteObjects) && (
            <div className="flex flex-wrap gap-2">
              {canEditObjects && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  <Pencil className="w-4 h-4" /> Редактировать
                </button>
              )}
              {canDeleteObjects && (
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-card border border-border text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" /> Удалить
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Field label="Заказчик" value={obj.customer} />
          <Field label="Ответственный" value={obj.responsible} />
          <Field label="Прораб" value={obj.foreman} />
          <Field label="Бригада" value={obj.brigade} />
          <Field label="Срок" value={obj.deadline} />
          <Field label="Текущий этап" value={obj.currentStage} />
          {canSeeFinances && (
            <Field label="Сумма сметы" value={obj.budget ? formatMoney(obj.budget) : "—"} />
          )}
          <div>
            <div className="text-xs text-muted-foreground">Прогресс</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${obj.progress}%` }} />
              </div>
              <span className="text-sm font-medium">{obj.progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="border-b border-border overflow-x-auto">
          <div className="flex min-w-max">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 md:px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 md:p-6">
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Block title="Текущий этап">
                <div className="text-lg font-semibold">{obj.currentStage}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Статус: {obj.stagesStatus[obj.currentStage]}
                </div>
              </Block>
              <Block title="Ответственные">
                <ul className="space-y-1.5 text-sm">
                  <li><span className="text-muted-foreground">Руководитель:</span> {obj.responsible}</li>
                  <li><span className="text-muted-foreground">Прораб:</span> {obj.foreman}</li>
                  <li><span className="text-muted-foreground">Бригада:</span> {obj.brigade}</li>
                </ul>
              </Block>
              <Block title={`Задачи (${visibleTasks.length})`} action={<button onClick={() => setTab("tasks")} className="text-xs text-primary hover:underline">Все</button>}>
                <div className="space-y-2">
                  {visibleTasks.slice(0, 4).map((t) => (
                    <Link
                      key={t.id}
                      to="/tasks/$taskId"
                      params={{ taskId: t.id }}
                      search={{ from: "object", objectId: obj.id }}
                      className="flex items-center justify-between gap-2 text-sm hover:text-primary"
                    >
                      <span className="truncate">{t.title}</span>
                      <StatusBadge value={t.status} />
                    </Link>
                  ))}
                  {visibleTasks.length === 0 && <div className="text-sm text-muted-foreground">Нет задач</div>}
                </div>
              </Block>
              <Block title="Последние фотоотчеты" action={<button onClick={() => setTab("photos")} className="text-xs text-primary hover:underline">Все</button>}>
                <div className="grid grid-cols-3 gap-2">
                  {objPhotos.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      to="/photos/$photoId"
                      params={{ photoId: p.id }}
                      title={p.note}
                      className="aspect-square rounded-md overflow-hidden block hover:opacity-90 transition"
                    >
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0]} alt={p.note} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${p.thumb}`} />
                      )}
                    </Link>
                  ))}
                  {objPhotos.length === 0 && <div className="text-sm text-muted-foreground col-span-3">Фотоотчетов пока нет</div>}
                </div>
              </Block>
              <Block title={`Инструмент (${visibleTools.length})`} action={<button onClick={() => setTab("tools")} className="text-xs text-primary hover:underline">Все</button>}>
                <div className="space-y-1.5 text-sm">
                  {visibleTools.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.inv_number || "—"}</span>
                    </div>
                  ))}
                  {visibleTools.length === 0 && <div className="text-sm text-muted-foreground">Инструмент не закреплён</div>}
                </div>
              </Block>
              <Block title="Комментарии" action={<button onClick={() => setTab("comments")} className="text-xs text-primary hover:underline">Все</button>}>
                <div className="space-y-2">
                  {objComments.slice(-2).map((c) => (
                    <div key={c.id} className="text-sm">
                      <div className="text-xs text-muted-foreground">{c.author} · {c.date}</div>
                      <div>{c.text}</div>
                    </div>
                  ))}
                  {objComments.length === 0 && <div className="text-sm text-muted-foreground">Нет комментариев</div>}
                </div>
              </Block>
            </div>
          )}

          {tab === "stages" && (
            <div className="space-y-3">
              {objStages.length === 0 && canEditObjects && (
                <div className="border border-dashed border-border rounded-lg p-6 text-center">
                  <div className="text-sm text-muted-foreground mb-3">Этапы для этого объекта ещё не созданы</div>
                  <button
                    onClick={async () => {
                      try { await addDefaults.mutateAsync(obj.id); toast.success("Этапы добавлены"); }
                      catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
                    }}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    <Layers className="w-4 h-4" /> Добавить этапы по умолчанию
                  </button>
                </div>
              )}
              {objStages.map((s, i) => {
                const assignee = allUsers.find((u) => u.id === s.assignee_id);
                return (
                  <div key={s.id} className="group flex items-center gap-3 p-4 border border-border rounded-lg hover:border-primary/40 hover:shadow-sm transition-all">
                    <Link
                      to="/objects/$objectId/stages/$stageId"
                      params={{ objectId: obj.id, stageId: s.id }}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary grid place-items-center text-sm font-semibold">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium group-hover:text-primary truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          Срок: {s.duration_days} дн. · Задач: {objTasks.filter((t) => t.stage === s.name).length}
                          {assignee ? ` · Ответственный: ${assignee.label}` : " · Ответственный не назначен"}
                        </div>
                      </div>
                    </Link>
                    {canEditObjects && (
                      <StageStatusSelect
                        value={s.status}
                        onChange={(v) =>
                          updateStage.mutate(
                            { id: s.id, object_id: s.object_id, status: v },
                            {
                              onSuccess: () => toast.success("Статус обновлён"),
                              onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
                            },
                          )
                        }
                      />
                    )}
                    <Link
                      to="/objects/$objectId/stages/$stageId"
                      params={{ objectId: obj.id, stageId: s.id }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "tasks" && (
            <TaskListView
              tasks={visibleTasks}
              hideProjectFilter
              backContext={{ from: "object", objectId: obj.id }}
              actionSlot={
                canCreateTasks ? (
                  <button
                    onClick={() => setTaskDialogOpen(true)}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" /> Добавить задачу
                  </button>
                ) : null
              }
            />
          )}

          {tab === "photos" && (
            (() => {
              const tasksInStage = photoStageFilter === "all"
                ? visibleTasks
                : visibleTasks.filter((t) => t.stage_id === photoStageFilter);
              const filtered = objPhotos.filter((p) => {
                if (photoStageFilter !== "all") {
                  if (p.stageId === photoStageFilter) return true;
                  if (p.taskId && tasksInStage.some((t) => t.id === p.taskId)) return true;
                  return false;
                }
                return true;
              }).filter((p) => {
                if (photoTaskFilter === "all") return true;
                if (photoTaskFilter === "__none__") return !p.taskId;
                return p.taskId === photoTaskFilter;
              });
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Этап:</span>
                      <Select value={photoStageFilter} onValueChange={(v) => { setPhotoStageFilter(v); setPhotoTaskFilter("all"); }}>
                        <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          {objStages.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Задача:</span>
                      <Select value={photoTaskFilter} onValueChange={setPhotoTaskFilter}>
                        <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="__none__">Без задачи</SelectItem>
                          {tasksInStage.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    </div>
                    {canCreatePhotos && (
                      <button
                        onClick={() => setPhotoDialog(true)}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                      >
                        <Camera className="w-4 h-4" /> Добавить фотоотчёт
                      </button>
                    )}
                  </div>
                  <PhotoGrid photos={filtered} empty={canCreatePhotos ? "Фотоотчетов нет. Нажмите «Добавить фотоотчёт»." : "Фотоотчетов нет."} />
                </div>
              );
            })()
          )}

          {tab === "tools" && (
            <div className="space-y-2">
              {visibleTools.map((t) => {
                const ts = toolStatuses.find((x) => x.name === t.status);
                const tc = toolConditions.find((x) => x.name === t.condition);
                return (
                  <div
                    key={t.id}
                    className="p-4 border border-border rounded-lg flex items-center justify-between gap-3 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <Link
                      to="/tools/$toolId"
                      params={{ toolId: t.id }}
                      search={{ from: "object", objectId: obj.id }}
                      className="min-w-0 flex-1"
                    >
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.category || "—"} · Инв. № {t.inv_number || "—"}
                        {t.assignee_id ? ` · ${allUsers.find((u) => u.id === t.assignee_id)?.label ?? ""}` : ""}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {ts && <ColoredBadge name={ts.name} color={ts.color} />}
                      {tc && <ColoredBadge name={tc.name} color={tc.color} />}
                      {canManageTools && (
                        <button
                          onClick={() => setMoveToolId(t.id)}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-card border border-border text-xs font-medium hover:bg-secondary"
                        >
                          <Truck className="w-3.5 h-3.5" /> Переместить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {dbTools.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Инструмент не закреплён за объектом</div>}
            </div>
          )}

          {tab === "documents" && <DocumentsBrowser objectId={obj.id} />}

          {tab === "expenses" && <ExpensesView lockedObjectId={obj.id} />}

          {tab === "comments" && (
            <CommentsPanel
              comments={objComments}
              onAdd={(text) => addObjectComment(obj.id, author, text)}
            />
          )}
        </div>
      </div>

      <PhotoUploadDialog
        open={photoDialog}
        onClose={() => setPhotoDialog(false)}
        defaultObjectId={obj.id}
        author={author}
      />

      <ObjectFormDialog open={editOpen} onOpenChange={setEditOpen} initial={obj} />

      {(() => {
        const movingTool = dbTools.find((t) => t.id === moveToolId);
        return movingTool ? (
          <ToolMoveDialog
            open={!!movingTool}
            tool={movingTool}
            onClose={() => setMoveToolId(null)}
          />
        ) : null;
      })()}

      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        defaultObjectId={obj.id}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить объект?</AlertDialogTitle>
            <AlertDialogDescription>
              {obj.name} — действие необратимо. Связанные задачи и фотоотчёты останутся в системе.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await del.mutateAsync(obj.id);
                  toast.success("Объект удалён");
                  navigate({ to: "/objects" });
                } catch (e: any) {
                  toast.error(e?.message ?? "Не удалось удалить");
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
    </div>
  );
}

function Block({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

function CommentsPanel({
  comments,
  onAdd,
}: {
  comments: { id: string; author: string; text: string; date: string }[];
  onAdd: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="p-3 border border-border rounded-lg">
            <div className="text-xs text-muted-foreground">{c.author} · {c.date}</div>
            <div className="text-sm mt-1">{c.text}</div>
          </div>
        ))}
        {comments.length === 0 && <div className="text-sm text-muted-foreground">Комментариев пока нет</div>}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать комментарий..."
          className="flex-1 h-10 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => {
            if (!text.trim()) return;
            onAdd(text.trim());
            setText("");
          }}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-1"
        >
          <Send className="w-4 h-4" /> Отправить
        </button>
      </div>
    </div>
  );
}