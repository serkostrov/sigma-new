import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCreateTask, useUpdateTask, type Task,
} from "@/lib/tasks-api";
import { useTaskStatusesCatalog, useTaskPrioritiesCatalog } from "@/lib/catalogs-api";
import { ColorDot } from "@/components/colored-badge";
import { useAllUsers } from "@/lib/users-api";
import { useObjects } from "@/lib/objects-api";
import { useObjectStages } from "@/lib/stages-api";
import { useAuth } from "@/lib/auth-context";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Task | null;
  defaultObjectId?: string | null;
  defaultStageId?: string | null;
  defaultDescription?: string;
  lockContext?: boolean;
};

const NONE = "__none__";

export function TaskFormDialog({
  open, onOpenChange, initial, defaultObjectId, defaultStageId, defaultDescription, lockContext,
}: Props) {
  const { user } = useAuth();
  const create = useCreateTask();
  const update = useUpdateTask();
  const { users } = useAllUsers();
  const { data: objects = [] } = useObjects();
  const { data: statusCat = [] } = useTaskStatusesCatalog();
  const { data: priorityCat = [] } = useTaskPrioritiesCatalog();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [assignee, setAssignee] = useState<string>(NONE);
  const [objectId, setObjectId] = useState<string>(NONE);
  const [stageId, setStageId] = useState<string>(NONE);

  const { data: stages = [] } = useObjectStages(objectId !== NONE ? objectId : undefined);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setDeadline(initial.deadline ?? "");
      setStatus(initial.status);
      setPriority(initial.priority);
      setAssignee(initial.assignee_id ?? NONE);
      setObjectId(initial.object_id ?? NONE);
      setStageId(initial.stage_id ?? NONE);
    } else {
      setTitle(""); setDescription(defaultDescription ?? ""); setDeadline("");
      setStatus(statusCat[0]?.name ?? "Назначена");
      setPriority(priorityCat[0]?.name ?? "Несрочная");
      setAssignee(NONE);
      setObjectId(defaultObjectId ?? NONE);
      setStageId(defaultStageId ?? NONE);
    }
  }, [open, initial, defaultObjectId, defaultStageId, defaultDescription, statusCat, priorityCat]);

  const submit = async () => {
    if (!title.trim()) return toast.error("Укажите название");
    const payload = {
      title: title.trim(),
      description: description,
      deadline: deadline || null,
      status,
      priority,
      assignee_id: assignee === NONE ? null : assignee,
      object_id: objectId === NONE ? null : objectId,
      stage_id: stageId === NONE ? null : stageId,
    };
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, ...payload } as any);
        toast.success("Задача обновлена");
      } else {
        await create.mutateAsync({ ...payload, created_by: user?.id ?? null } as any);
        toast.success("Задача создана");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Редактировать задачу" : "Новая задача"}</DialogTitle>
          <DialogDescription>Заполните детали задачи</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Название *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
          </div>
          <div className="md:col-span-2">
            <Label>Описание</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Дедлайн</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <Label>Приоритет</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {priorityCat.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    <span className="inline-flex items-center gap-2"><ColorDot color={p.color} />{p.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Статус</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusCat.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    <span className="inline-flex items-center gap-2"><ColorDot color={s.color} />{s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Исполнитель</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Не назначен —</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Проект</Label>
            <Select
              value={objectId}
              onValueChange={(v) => { setObjectId(v); setStageId(NONE); }}
              disabled={lockContext}
            >
              <SelectTrigger><SelectValue placeholder="Без проекта" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Без проекта —</SelectItem>
                {objects.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Этап</Label>
            <Select
              value={stageId}
              onValueChange={setStageId}
              disabled={lockContext || objectId === NONE}
            >
              <SelectTrigger><SelectValue placeholder="Без этапа" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Без этапа —</SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending}>
            {initial ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}