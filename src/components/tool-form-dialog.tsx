import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  useToolCategories, useToolStatuses, useToolConditions,
  useCreateTool, useUpdateTool, type ToolRow,
} from "@/lib/tools-api";
import { useObjects } from "@/lib/objects-api";
import { useAllUsers } from "@/lib/users-api";

type Props = {
  open: boolean;
  onClose: () => void;
  tool?: ToolRow | null;
  defaultObjectId?: string | null;
};

export function ToolFormDialog({ open, onClose, tool, defaultObjectId }: Props) {
  const { data: categories = [] } = useToolCategories();
  const { data: statuses = [] } = useToolStatuses();
  const { data: conditions = [] } = useToolConditions();
  const { data: objects = [] } = useObjects();
  const { users } = useAllUsers();
  const create = useCreateTool();
  const update = useUpdateTool();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [status, setStatus] = useState("");
  const [condition, setCondition] = useState("");
  const [objectId, setObjectId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (tool) {
      setName(tool.name);
      setCategory(tool.category || "");
      setInvNumber(tool.inv_number || "");
      setStatus(tool.status);
      setCondition(tool.condition);
      setObjectId(tool.object_id ?? "");
      setAssigneeId(tool.assignee_id ?? "");
      setNotes(tool.notes || "");
    } else {
      setName("");
      setCategory(categories[0]?.name ?? "");
      setInvNumber("");
      setStatus(statuses[0]?.name ?? "Свободен");
      setCondition(conditions[0]?.name ?? "Рабочее");
      setObjectId(defaultObjectId ?? "");
      setAssigneeId("");
      setNotes("");
    }
  }, [open, tool, categories, statuses, conditions, defaultObjectId]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) return toast.error("Укажите название");
    const payload = {
      name: name.trim(),
      category: category.trim(),
      inv_number: invNumber.trim(),
      status,
      condition,
      object_id: objectId || null,
      assignee_id: assigneeId || null,
      notes: notes.trim(),
    };
    try {
      if (tool) {
        await update.mutateAsync({ id: tool.id, ...payload });
        toast.success("Инструмент обновлён");
      } else {
        await create.mutateAsync(payload);
        toast.success("Инструмент добавлен");
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">{tool ? "Редактировать инструмент" : "Добавить инструмент"}</div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Название">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm" placeholder="Например: Перфоратор Bosch GBH 2-26" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Категория">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Инв. номер">
              <input value={invNumber} onChange={(e) => setInvNumber(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Статус">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
                {statuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Состояние">
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
                {conditions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Объект">
              <select value={objectId} onChange={(e) => setObjectId(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
                <option value="">—</option>
                {objects.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <Field label="Ответственный">
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
                <option value="">—</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Заметка">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 h-10 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary">Отмена</button>
          <button onClick={submit} disabled={create.isPending || update.isPending} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Сохранить</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}