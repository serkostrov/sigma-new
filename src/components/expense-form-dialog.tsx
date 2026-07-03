import { useEffect, useRef, useState } from "react";
import { X, Loader2, Wallet, Upload, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useObjects } from "@/lib/objects-api";
import { useObjectStages } from "@/lib/stages-api";
import { useTasks } from "@/lib/tasks-api";
import { useCreateExpense, useExpenseCategories } from "@/lib/expenses-api";
import { formatFileSize } from "@/lib/documents-api";

export function ExpenseFormDialog({
  open,
  onClose,
  lockedObjectId,
  defaultStageId,
  defaultTaskId,
}: {
  open: boolean;
  onClose: () => void;
  lockedObjectId?: string;
  defaultStageId?: string;
  defaultTaskId?: string;
}) {
  const { user, displayName } = useAuth();
  const { data: objects = [] } = useObjects();
  const { data: categories = [] } = useExpenseCategories();
  const create = useCreateExpense();
  const fileRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState(today);
  const [objectId, setObjectId] = useState<string>(lockedObjectId ?? "");
  const [stageId, setStageId] = useState<string>(defaultStageId ?? "");
  const [taskId, setTaskId] = useState<string>(defaultTaskId ?? "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const { data: stages = [] } = useObjectStages(objectId || undefined);
  const { data: objTasks = [] } = useTasks(objectId ? { objectId } : undefined);

  useEffect(() => {
    if (!open) return;
    setName("");
    setAmount("");
    setSpentOn(today);
    setObjectId(lockedObjectId ?? "");
    setStageId(defaultStageId ?? "");
    setTaskId(defaultTaskId ?? "");
    setCategoryId("");
    setComment("");
    setFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lockedObjectId, defaultStageId, defaultTaskId]);

  if (!open) return null;

  const submit = async () => {
    if (create.isPending) return;
    const trimmedName = name.trim();
    const amountNum = Number(amount.replace(",", "."));
    if (!trimmedName) return toast.error("Укажите название");
    if (!objectId) return toast.error("Выберите объект");
    if (!Number.isFinite(amountNum) || amountNum <= 0) return toast.error("Укажите сумму");
    if (!spentOn) return toast.error("Укажите дату");
    try {
      await create.mutateAsync({
        name: trimmedName,
        amount: amountNum,
        spent_on: spentOn,
        object_id: objectId,
        stage_id: stageId || null,
        task_id: taskId || null,
        category_id: categoryId || null,
        comment: comment.trim() || null,
        created_by: user?.id ?? null,
        created_by_name: displayName || user?.email || "—",
        files,
      });
      toast.success("Расход добавлен");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось сохранить");
    }
  };

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/50 p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-border max-h-[95vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <div className="font-semibold">Новый расход</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <Field label="Название">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Цемент М500"
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Сумма, ₽">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
              />
            </Field>
            <Field label="Дата">
              <input
                type="date"
                value={spentOn}
                onChange={(e) => setSpentOn(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
              />
            </Field>
          </div>

          <Field label="Объект">
            <select
              value={objectId}
              onChange={(e) => { setObjectId(e.target.value); setStageId(""); setTaskId(""); }}
              disabled={!!lockedObjectId}
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm disabled:opacity-70"
            >
              <option value="">— Выберите объект —</option>
              {objects.map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Категория (необязательно)">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
            >
              <option value="">— Не выбрана —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Этап (необязательно)">
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                disabled={!objectId}
                className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm disabled:opacity-70"
              >
                <option value="">— Не выбран —</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Задача (необязательно)">
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={!objectId}
                className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm disabled:opacity-70"
              >
                <option value="">— Не выбрана —</option>
                {objTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Документы (необязательно)">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-secondary/40 transition grid place-items-center text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Прикрепить файлы
              </div>
            </button>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm bg-secondary/50 rounded-md px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(f.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <Field label="Комментарий">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm"
              placeholder="Подробности по расходу"
            />
          </Field>
        </div>

        <div className="p-5 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            disabled={create.isPending}
            className="flex-1 h-11 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={create.isPending}
            className="flex-[2] h-11 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {create.isPending ? "Сохранение…" : "Добавить расход"}
          </button>
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