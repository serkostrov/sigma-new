import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Trash2, Pencil, X, Plus, ListChecks, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useObject } from "@/lib/objects-api";
import {
  useObjectStage, useUpdateObjectStage, useDeleteObjectStage,
} from "@/lib/stages-api";
import { useAllUsers } from "@/lib/users-api";
import { useTasks } from "@/lib/tasks-api";
import { TaskListView } from "@/components/task-list-view";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { StageStatusSelect } from "@/components/stage-status-select";
import { usePhotos } from "@/lib/photos-api";
import { PhotoGrid } from "@/components/photo-grid";
import { PhotoUploadDialog } from "@/components/photo-upload-dialog";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
    </div>
  );
}

export const Route = createFileRoute("/objects/$objectId/stages/$stageId")({
  component: StageDetailPage,
});

const STAGE_STATUSES = ["Не начат", "В работе", "Готово"];

function StageDetailPage() {
  const { objectId, stageId } = useParams({ from: "/objects/$objectId/stages/$stageId" });
  const navigate = useNavigate();
  const { data: obj } = useObject(objectId);
  const { data: stage, isLoading } = useObjectStage(stageId);
  const { users } = useAllUsers();
  const update = useUpdateObjectStage();
  const del = useDeleteObjectStage();

  const [name, setName] = useState("");
  const [days, setDays] = useState(0);
  const [status, setStatus] = useState("Не начат");
  const [assignee, setAssignee] = useState<string>("__none__");
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [tab, setTab] = useState<"tasks" | "photos">("tasks");
  const { displayName } = useAuth();
  const {
    canEditObjects,
    canDeleteObjects,
    canCreateTasks,
    canCreatePhotos,
    canAccessTasks,
    canViewPhotos,
    filterTasks,
  } = usePermissions();
  const { data: stageTasksRaw = [] } = useTasks({ stageId: stageId });
  const stageTasks = filterTasks(stageTasksRaw);
  const { data: photos = [] } = usePhotos();
  const author = displayName || "Пользователь";
  const [photoTaskFilter, setPhotoTaskFilter] = useState<string>("all");
  const [photoOpen, setPhotoOpen] = useState(false);

  useEffect(() => {
    if (tab === "tasks" && !canAccessTasks && canViewPhotos) setTab("photos");
    if (tab === "photos" && !canViewPhotos && canAccessTasks) setTab("tasks");
  }, [tab, canAccessTasks, canViewPhotos]);

  const stageTaskIds = new Set(stageTasks.map((t) => t.id));
  const stagePhotos = photos.filter(
    (p) => p.stageId === stageId || (p.taskId && stageTaskIds.has(p.taskId)),
  );
  const filteredPhotos =
    photoTaskFilter === "all"
      ? stagePhotos
      : photoTaskFilter === "__none__"
      ? stagePhotos.filter((p) => !p.taskId)
      : stagePhotos.filter((p) => p.taskId === photoTaskFilter);

  const resetFromStage = () => {
    if (!stage) return;
    setName(stage.name);
    setDays(stage.duration_days);
    setStatus(stage.status);
    setAssignee(stage.assignee_id ?? "__none__");
    setStartedAt(stage.started_at ?? "");
    setFinishedAt(stage.finished_at ?? "");
    setNotes(stage.notes ?? "");
  };

  useEffect(() => {
    resetFromStage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (isLoading) {
    return <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">Загрузка…</div>;
  }
  if (!stage) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        Этап не найден.{" "}
        <Link to="/objects/$objectId" params={{ objectId }} className="text-primary hover:underline">
          Вернуться к объекту
        </Link>
      </div>
    );
  }

  const save = async () => {
    if (!name.trim()) return toast.error("Укажите название");
    try {
      await update.mutateAsync({
        id: stage.id,
        object_id: stage.object_id,
        name: name.trim(),
        duration_days: days,
        status,
        assignee_id: assignee === "__none__" ? null : assignee,
        started_at: startedAt || null,
        finished_at: finishedAt || null,
        notes,
      });
      toast.success("Сохранено");
      setEditMode(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  const remove = async () => {
    try {
      await del.mutateAsync({ id: stage.id, object_id: stage.object_id });
      toast.success("Этап удалён");
      navigate({ to: "/objects/$objectId", params: { objectId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  const assigneeUser = users.find((u) => u.id === stage.assignee_id);

  return (
    <>
      <Link
        to="/objects/$objectId"
        params={{ objectId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> {obj?.name ?? "К объекту"}
      </Link>

      <div className="bg-card border border-border rounded-xl p-5 md:p-6 mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Этап #{stage.sort_order}</div>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{stage.name}</h1>
              <StageStatusSelect
                value={stage.status}
                onChange={(v) => {
                  if (!canEditObjects) return;
                  setStatus(v);
                  update.mutate(
                    { id: stage.id, object_id: stage.object_id, status: v },
                    {
                      onSuccess: () => toast.success("Статус обновлён"),
                      onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
                    },
                  );
                }}
                disabled={!canEditObjects}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEditObjects && (
              editMode ? (
                <>
                  <Button onClick={save} disabled={update.isPending}>
                    <Save className="w-4 h-4 mr-1" /> Сохранить
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { resetFromStage(); setEditMode(false); }}
                  >
                    <X className="w-4 h-4 mr-1" /> Отмена
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditMode(true)}>
                  <Pencil className="w-4 h-4 mr-1" /> Редактировать
                </Button>
              )
            )}
            {canDeleteObjects && !editMode && (
              <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> Удалить
              </Button>
            )}
          </div>
        </div>

        {editMode ? (
          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="md:col-span-2">
              <Label>Название</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Срок, дней</Label>
              <Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value) || 1)} />
            </div>
            <div>
              <Label>Статус</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ответственный</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Не назначен —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div />
            <div>
              <Label>Дата начала</Label>
              <Input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
            </div>
            <div>
              <Label>Дата завершения</Label>
              <Input type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Заметки</Label>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Комментарии, важные детали по этапу…" />
            </div>
          </fieldset>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Field label="Срок" value={`${stage.duration_days} дн.`} />
            <Field label="Ответственный" value={assigneeUser?.label ?? "Не назначен"} />
            <Field label="Дата начала" value={stage.started_at ?? "—"} />
            <Field label="Дата завершения" value={stage.finished_at ?? "—"} />
            {stage.notes && (
              <div className="col-span-2 md:col-span-4">
                <div className="text-xs text-muted-foreground">Заметки</div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{stage.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="border-b border-border overflow-x-auto">
          <div className="flex min-w-max">
            {[
              ...(canAccessTasks ? [{ key: "tasks" as const, label: `Задачи этапа (${stageTasks.length})`, icon: ListChecks }] : []),
              ...(canViewPhotos ? [{ key: "photos" as const, label: `Фотоотчеты (${stagePhotos.length})`, icon: Camera }] : []),
            ].map((t) => {
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
          {tab === "tasks" && (
            <TaskListView
              tasks={stageTasks}
              hideProjectFilter
              hideStageFilter
              backContext={{ from: "stage", objectId: objectId, stageId: stageId }}
              actionSlot={
                canCreateTasks ? (
                  <button
                    onClick={() => setTaskOpen(true)}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" /> Добавить задачу
                  </button>
                ) : null
              }
            />
          )}
          {tab === "photos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Задача:</span>
                  <Select value={photoTaskFilter} onValueChange={setPhotoTaskFilter}>
                    <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="__none__">Без задачи</SelectItem>
                      {stageTasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canCreatePhotos && (
                  <Button onClick={() => setPhotoOpen(true)}>
                    <Camera className="w-4 h-4 mr-1" /> Прикрепить фотоотчет
                  </Button>
                )}
              </div>
              <PhotoGrid photos={filteredPhotos} empty="Фотоотчетов на этом этапе пока нет" />
            </div>
          )}
        </div>
      </div>

      <TaskFormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaultObjectId={objectId}
        defaultStageId={stageId}
        lockContext
      />

      <PhotoUploadDialog
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        defaultObjectId={objectId}
        defaultStageId={stageId}
        lockObject
        objectLabel={obj?.name}
        tasksOverride={stageTasks.map((t) => ({ id: t.id, title: t.title }))}
        author={author}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить этап?</AlertDialogTitle>
            <AlertDialogDescription>
              «{stage.name}» — действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
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