import { createFileRoute, Link, useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Trash2, Send, Check, X, Camera, ClipboardCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ColoredBadge } from "@/components/colored-badge";
import { colorChipStyle, ColorDot } from "@/components/colored-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTaskStatusesCatalog, useTaskPrioritiesCatalog } from "@/lib/catalogs-api";
import { TaskFormDialog } from "@/components/task-form-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  useTask, useDeleteTask,
  useUpdateTask,
  useTaskComments, useAddTaskComment, useUpdateTaskComment, useDeleteTaskComment,
  useSubmitTaskForReview, useApproveTask, useRejectTask,
  TASK_ACTIVE_STATUSES, TASK_STATUS_REVIEW, TASK_STATUS_RETURNED, TASK_STATUS_DONE,
} from "@/lib/tasks-api";
import { useAllUsers } from "@/lib/users-api";
import { useObject } from "@/lib/objects-api";
import { useObjectStage } from "@/lib/stages-api";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-store";
import { usePhotos } from "@/lib/photos-api";
import { PhotoUploadDialog } from "@/components/photo-upload-dialog";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { PhotoEditDialog } from "@/components/photo-edit-dialog";
import { TaskRejectDialog } from "@/components/task-reject-dialog";
import { usePermissions } from "@/lib/permissions";

type TaskSearch = {
  from?: "tasks" | "object" | "stage";
  objectId?: string;
  stageId?: string;
};

export const Route = createFileRoute("/tasks/$taskId")({
  component: TaskDetailPage,
  validateSearch: (s: Record<string, unknown>): TaskSearch => ({
    from: (s.from as TaskSearch["from"]) ?? undefined,
    objectId: typeof s.objectId === "string" ? s.objectId : undefined,
    stageId: typeof s.stageId === "string" ? s.stageId : undefined,
  }),
});

function TaskDetailPage() {
  const { taskId } = useParams({ from: "/tasks/$taskId" });
  const search = useSearch({ from: "/tasks/$taskId" });
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(taskId);
  const del = useDeleteTask();
  const update = useUpdateTask();
  const { users } = useAllUsers();
  const { data: obj } = useObject(task?.object_id ?? undefined);
  const { data: stage } = useObjectStage(task?.stage_id ?? undefined);
  const { data: statusCat = [] } = useTaskStatusesCatalog();
  const { data: priorityCat = [] } = useTaskPrioritiesCatalog();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const { user } = useAuth();
  const { canReviewWork, canEditTasks, canDeleteTasks, canSubmitTaskReview, canCreatePhotos, canEditPhotos, canViewOwnTasksOnly } = usePermissions();
  const submitReview = useSubmitTaskForReview();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();

  const { data: allPhotos = [] } = usePhotos();
  const taskPhotos = allPhotos.filter((p) => p.taskId === taskId);

  const back: { to: any; params?: any; label: string } = (() => {
    if (search.from === "stage" && search.objectId && search.stageId) {
      return {
        to: "/objects/$objectId/stages/$stageId",
        params: { objectId: search.objectId, stageId: search.stageId },
        label: "К этапу",
      };
    }
    if (search.from === "object" && search.objectId) {
      return {
        to: "/objects/$objectId",
        params: { objectId: search.objectId },
        label: "К объекту",
      };
    }
    return { to: "/tasks", label: "Все задачи" };
  })();

  if (isLoading) {
    return <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">Загрузка…</div>;
  }
  if (!task) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        Задача не найдена.{" "}
        <Link to="/tasks" className="text-primary hover:underline">К списку задач</Link>
      </div>
    );
  }

  if (canViewOwnTasksOnly && task.assignee_id !== user?.id) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        Нет доступа к этой задаче.{" "}
        <Link to="/tasks" className="text-primary hover:underline">К списку задач</Link>
      </div>
    );
  }

  const assignee = users.find((u) => u.id === task.assignee_id);
  const author = users.find((u) => u.id === task.created_by);
  const reviewer = users.find((u) => u.id === task.reviewed_by);
  const statusColor = statusCat.find((s) => s.name === task.status)?.color ?? "#64748b";
  const priorityColor = priorityCat.find((p) => p.name === task.priority)?.color ?? "#64748b";

  const isAssignee = user?.id === task.assignee_id;
  const canSubmitForReview =
    canSubmitTaskReview &&
    isAssignee &&
    (TASK_ACTIVE_STATUSES as readonly string[]).includes(task.status);
  const canReview = canReviewWork && task.status === TASK_STATUS_REVIEW;
  const canResubmit = canSubmitTaskReview && isAssignee && task.status === TASK_STATUS_RETURNED;

  const changeStatus = (status: string) => {
    if (status === TASK_STATUS_DONE && taskPhotos.length === 0) {
      toast.error("Для завершения задачи прикрепите фотоотчет");
      return;
    }
    if (status === TASK_STATUS_REVIEW || status === TASK_STATUS_RETURNED) return;
    update.mutate({ id: task.id, status }, {
      onSuccess: () => toast.success("Статус обновлён"),
      onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
    });
  };

  const handleSubmitForReview = async () => {
    try {
      await submitReview.mutateAsync(task.id);
      toast.success("Задача отправлена на проверку");
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  const handleApprove = async () => {
    if (!user) return;
    if (taskPhotos.length === 0) {
      toast.error("Для принятия задачи нужен фотоотчёт");
      return;
    }
    try {
      await approveTask.mutateAsync({ taskId: task.id, reviewerId: user.id });
      toast.success("Задача принята");
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  const handleReject = async (comment: string) => {
    if (!user) return;
    try {
      await rejectTask.mutateAsync({ taskId: task.id, reviewerId: user.id, comment });
      toast.success("Задача возвращена с замечанием");
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  const remove = async () => {
    try {
      await del.mutateAsync(task.id);
      toast.success("Задача удалена");
      navigate({ to: back.to, params: back.params });
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  return (
    <>
      <Link to={back.to} params={back.params} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> {back.label}
      </Link>

      <div className="bg-card border border-border rounded-xl p-5 md:p-6 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {(canEditTasks || canReviewWork) ? (
                <Select value={task.status} onValueChange={changeStatus}>
                  <SelectTrigger
                    className="h-7 w-auto min-w-[150px] px-2.5 text-xs font-medium border-0 rounded-full gap-2"
                    style={colorChipStyle(statusColor)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusCat.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        <span className="inline-flex items-center gap-2">
                          <ColorDot color={s.color} />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <ColoredBadge name={task.status} color={statusColor} />
              )}
              <ColoredBadge name={task.priority} color={priorityColor} />
              {task.deadline && (
                <span className="text-sm text-muted-foreground">Срок: {task.deadline}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canEditTasks && (
              <Button onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-1" /> Редактировать
              </Button>
            )}
            {canDeleteTasks && (
              <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> Удалить
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Field label="Постановщик" value={author?.label ?? "—"} />
          <Field label="Исполнитель" value={assignee?.label ?? "Не назначен"} />
          <Field
            label="Проект"
            value={obj?.name ?? "—"}
            href={obj ? { to: "/objects/$objectId", params: { objectId: obj.id } } : undefined}
          />
          <Field
            label="Этап"
            value={stage?.name ?? "—"}
            href={stage && obj ? { to: "/objects/$objectId/stages/$stageId", params: { objectId: obj.id, stageId: stage.id } } : undefined}
          />
        </div>

        {task.description && (
          <div className="mt-6">
            <div className="text-xs text-muted-foreground mb-1">Описание</div>
            <div className="text-sm whitespace-pre-wrap">{task.description}</div>
          </div>
        )}

        {task.review_comment && (
          <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50/80">
            <div className="text-xs font-medium text-amber-800 mb-1">Замечание проверки</div>
            <div className="text-sm whitespace-pre-wrap">{task.review_comment}</div>
            {reviewer && (
              <div className="text-xs text-muted-foreground mt-2">
                {reviewer.label}
                {task.reviewed_at && ` · ${new Date(task.reviewed_at).toLocaleString("ru-RU")}`}
              </div>
            )}
          </div>
        )}

        {(canSubmitForReview || canReview || canResubmit) && (
          <div className="mt-6 flex flex-wrap gap-2">
            {canSubmitForReview && (
              <Button onClick={handleSubmitForReview} disabled={submitReview.isPending}>
                <ClipboardCheck className="w-4 h-4 mr-1" /> Отправить на проверку
              </Button>
            )}
            {canResubmit && (
              <Button onClick={handleSubmitForReview} disabled={submitReview.isPending}>
                <RotateCcw className="w-4 h-4 mr-1" /> Повторно отправить
              </Button>
            )}
            {canReview && (
              <>
                <Button onClick={handleApprove} disabled={approveTask.isPending}>
                  <Check className="w-4 h-4 mr-1" /> Принять
                </Button>
                <Button variant="outline" className="text-destructive" onClick={() => setRejectOpen(true)}>
                  <X className="w-4 h-4 mr-1" /> Вернуть с замечанием
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <PhotosBlock
        taskId={task.id}
        objectId={task.object_id}
        stageId={task.stage_id}
        objectLabel={obj?.name}
        canCreatePhotos={canCreatePhotos}
        canEditPhotos={canEditPhotos}
      />
      <div className="mt-4" />
      <CommentsBlock taskId={task.id} />

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} initial={task} />

      <TaskRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        pending={rejectTask.isPending}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
            <AlertDialogDescription>«{task.title}» — действие необратимо.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, value, href }: { label: string; value: string; href?: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {href ? (
        <Link {...href} className="text-sm font-medium mt-1 text-primary hover:underline block">
          {value}
        </Link>
      ) : (
        <div className="text-sm font-medium mt-1">{value}</div>
      )}
    </div>
  );
}

function CommentsBlock({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const { data: comments = [] } = useTaskComments(taskId);
  const { users } = useAllUsers();
  const add = useAddTaskComment();
  const upd = useUpdateTaskComment();
  const del = useDeleteTaskComment();

  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const send = async () => {
    if (!text.trim() || !user) return;
    try {
      await add.mutateAsync({ task_id: taskId, author_id: user.id, text: text.trim() });
      setText("");
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  const saveEdit = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      await upd.mutateAsync({ id, task_id: taskId, text: editingText.trim() });
      setEditingId(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить комментарий?")) return;
    try {
      await del.mutateAsync({ id, task_id: taskId });
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6">
      <div className="font-semibold mb-4">Комментарии ({comments.length})</div>
      <div className="space-y-3 mb-4">
        {comments.map((c) => {
          const u = users.find((x) => x.id === c.author_id);
          const mine = user?.id === c.author_id;
          const isEditing = editingId === c.id;
          return (
            <div key={c.id} className="p-3 border border-border rounded-lg">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{u?.label ?? "Пользователь"}</span>
                  {" · "}{new Date(c.created_at).toLocaleString("ru-RU")}
                  {c.edited && <span className="ml-1 italic">(изменено)</span>}
                </div>
                {mine && !isEditing && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditingId(c.id); setEditingText(c.text); }}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground"
                      title="Редактировать"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea rows={2} value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(c.id)}>
                      <Check className="w-4 h-4 mr-1" /> Сохранить
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4 mr-1" /> Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm whitespace-pre-wrap">{c.text}</div>
              )}
            </div>
          );
        })}
        {comments.length === 0 && (
          <div className="text-sm text-muted-foreground">Комментариев пока нет</div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать комментарий…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button onClick={send} disabled={!text.trim() || add.isPending}>
          <Send className="w-4 h-4 mr-1" /> Отправить
        </Button>
      </div>
    </div>
  );
}

function PhotosBlock({
  taskId,
  objectId,
  stageId,
  objectLabel,
  canCreatePhotos,
  canEditPhotos,
}: {
  taskId: string;
  objectId: string | null;
  stageId: string | null;
  objectLabel?: string;
  canCreatePhotos: boolean;
  canEditPhotos: boolean;
}) {
  const { data: photos = [] } = usePhotos();
  const { user, displayName } = useAuth();
  const author = displayName || "Пользователь";
  const addComment = useAddTaskComment();
  const [open, setOpen] = useState(false);
  const list = photos.filter((p) => p.taskId === taskId);
  const allImages = list.flatMap((p) => p.images ?? []);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const editing = list.find((p) => p.id === editId) ?? null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6 mb-4">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="font-semibold">Фотоотчет ({allImages.length})</div>
        {objectId && canCreatePhotos && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Camera className="w-4 h-4 mr-1" /> Прикрепить фотоотчет
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">Фото пока нет</div>
      ) : (
        <div className="space-y-5">
          {list.map((p) => {
            const offset = list
              .slice(0, list.indexOf(p))
              .reduce((s, r) => s + (r.images?.length ?? 0), 0);
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.note}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.author} · {p.date} · {p.count} фото
                    </div>
                  </div>
                  {canEditPhotos && (
                    <Button size="sm" variant="outline" onClick={() => setEditId(p.id)}>
                      <Pencil className="w-4 h-4 mr-1" /> Редактировать
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {(p.images ?? []).map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox(offset + i)}
                      className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary hover:opacity-90 transition"
                    >
                      <img src={src} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <PhotoLightbox
        images={allImages}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
      {editing && (
        <PhotoEditDialog open={!!editing} onClose={() => setEditId(null)} photo={editing} />
      )}
      {objectId && (
        <PhotoUploadDialog
          open={open}
          onClose={() => setOpen(false)}
          defaultObjectId={objectId}
          defaultTaskId={taskId}
          defaultStageId={stageId ?? undefined}
          lockObject
          lockTask
          objectLabel={objectLabel}
          author={author}
          onSubmitted={({ note }) => {
            if (note && user) {
              addComment.mutate({ task_id: taskId, author_id: user.id, text: note });
            }
          }}
        />
      )}
    </div>
  );
}