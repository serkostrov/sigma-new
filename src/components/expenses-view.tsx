import { useMemo, useState } from "react";
import { Plus, Wallet, Trash2, Paperclip, FileText, Download, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";
import { useObjects } from "@/lib/objects-api";
import { useObjectStages, useAllStages } from "@/lib/stages-api";
import { useTasks } from "@/lib/tasks-api";
import {
  useExpenses,
  useExpenseAttachments,
  useDeleteExpense,
  useDeleteExpenseAttachment,
  getExpenseAttachmentUrl,
  formatRub,
  useExpenseCategories,
  type Expense,
} from "@/lib/expenses-api";
import { formatFileSize } from "@/lib/documents-api";
import { ExpenseFormDialog } from "@/components/expense-form-dialog";

export function ExpensesView({
  lockedObjectId,
  headerSlot,
}: {
  lockedObjectId?: string;
  headerSlot?: (addButton: React.ReactNode) => React.ReactNode;
}) {
  const { canManageFinances } = usePermissions();
  const { data: objects = [] } = useObjects();
  const { data: allStages = [] } = useAllStages();
  const { data: categories = [] } = useExpenseCategories();
  const [openDialog, setOpenDialog] = useState(false);

  // Filters
  const [objectFilter, setObjectFilter] = useState<string>(lockedObjectId ?? "all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const effectiveObjectId = lockedObjectId ?? (objectFilter === "all" ? undefined : objectFilter);

  // Load stages & tasks for the currently selected object (for filter dropdowns)
  const { data: scopedStages = [] } = useObjectStages(effectiveObjectId);
  const { data: scopedTasks = [] } = useTasks(effectiveObjectId ? { objectId: effectiveObjectId } : undefined);

  const { data: expenses = [], isLoading } = useExpenses({
    objectId: effectiveObjectId,
    stageId: stageFilter === "all" ? undefined : stageFilter,
    taskId: taskFilter === "all" ? undefined : taskFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const filteredExpenses = useMemo(
    () => (categoryFilter === "all" ? expenses : expenses.filter((e) => e.category_id === categoryFilter)),
    [expenses, categoryFilter],
  );

  const expenseIds = useMemo(() => filteredExpenses.map((e) => e.id), [filteredExpenses]);
  const { data: attachments = [] } = useExpenseAttachments(expenseIds);
  const attByExpense = useMemo(() => {
    const m: Record<string, typeof attachments> = {};
    for (const a of attachments) (m[a.expense_id] ??= []).push(a);
    return m;
  }, [attachments]);

  const total = useMemo(() => filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0), [filteredExpenses]);

  const objectName = (id: string) => objects.find((o: any) => o.id === id)?.name ?? id;
  const stageName = (id: string | null) => (id ? allStages.find((s) => s.id === id)?.name ?? "—" : null);
  const categoryName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name ?? null : null);
  const taskName = (id: string | null) => {
    if (!id) return null;
    return scopedTasks.find((t) => t.id === id)?.title ?? "Задача";
  };

  const addButton = canManageFinances ? (
    <button
      onClick={() => setOpenDialog(true)}
      className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
    >
      <Plus className="w-4 h-4" /> Добавить расход
    </button>
  ) : null;

  return (
    <div className="space-y-4">
      {headerSlot && headerSlot(addButton)}

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-3">
        {!lockedObjectId && (
          <Filter label="Объект">
            <select
              value={objectFilter}
              onChange={(e) => { setObjectFilter(e.target.value); setStageFilter("all"); setTaskFilter("all"); }}
              className="h-10 px-3 rounded-md border border-border bg-card text-sm min-w-[180px]"
            >
              <option value="all">Все объекты</option>
              {objects.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Filter>
        )}
        <Filter label="Этап">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            disabled={!effectiveObjectId}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm min-w-[160px] disabled:opacity-60"
          >
            <option value="all">Все этапы</option>
            {scopedStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Filter>
        <Filter label="Задача">
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            disabled={!effectiveObjectId}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm min-w-[160px] disabled:opacity-60"
          >
            <option value="all">Все задачи</option>
            {scopedTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Filter>
        <Filter label="Категория">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm min-w-[180px]"
          >
            <option value="all">Все категории</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Filter>
        <Filter label="С">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          />
        </Filter>
        <Filter label="По">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          />
        </Filter>
        {(dateFrom || dateTo || stageFilter !== "all" || taskFilter !== "all" || categoryFilter !== "all" || (!lockedObjectId && objectFilter !== "all")) && (
          <button
            onClick={() => {
              setDateFrom(""); setDateTo("");
              setStageFilter("all"); setTaskFilter("all"); setCategoryFilter("all");
              if (!lockedObjectId) setObjectFilter("all");
            }}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm hover:bg-secondary"
          >
            Сбросить
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="w-4 h-4" />
          Итого: <span className="font-semibold text-foreground">{formatRub(total)}</span>
          <span className="text-xs">· {filteredExpenses.length} {pluralize(filteredExpenses.length, ["запись", "записи", "записей"])}</span>
        </div>
        {!headerSlot && addButton}
      </div>

      <div className="space-y-2">
        {isLoading && (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">Загрузка…</div>
        )}
        {!isLoading && filteredExpenses.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
            Расходов пока нет
          </div>
        )}
        {filteredExpenses.map((e) => (
          <ExpenseRow
            key={e.id}
            expense={e}
            attachments={attByExpense[e.id] ?? []}
            objectName={objectName(e.object_id)}
            stageName={stageName(e.stage_id)}
            taskName={taskName(e.task_id)}
            categoryName={categoryName(e.category_id)}
            canManage={canManageFinances}
          />
        ))}
      </div>

      <ExpenseFormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        lockedObjectId={lockedObjectId}
      />
    </div>
  );
}

function ExpenseRow({
  expense,
  attachments,
  objectName,
  stageName,
  taskName,
  categoryName,
  canManage,
}: {
  expense: Expense;
  attachments: { id: string; name: string; file_path: string; size_bytes: number }[];
  objectName: string;
  stageName: string | null;
  taskName: string | null;
  categoryName: string | null;
  canManage: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const del = useDeleteExpense();
  const delAtt = useDeleteExpenseAttachment();

  const openFile = async (path: string, name: string) => {
    try {
      const url = await getExpenseAttachmentUrl(path);
      const a = document.createElement("a");
      a.href = url; a.download = name; a.target = "_blank"; a.rel = "noopener noreferrer";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="p-4 flex items-start gap-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Развернуть"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="font-medium truncate">{expense.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                <span>{formatDate(expense.spent_on)}</span>
                <span>·</span>
                <span className="truncate">{objectName}</span>
                {stageName && (<><span>·</span><span>Этап: {stageName}</span></>)}
                {taskName && (<><span>·</span><span>Задача: {taskName}</span></>)}
                {categoryName && (<><span>·</span><span>{categoryName}</span></>)}
                {attachments.length > 0 && (
                  <><span>·</span><span className="inline-flex items-center gap-1"><Paperclip className="w-3 h-3" />{attachments.length}</span></>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold tabular-nums">{formatRub(Number(expense.amount))}</div>
              <div className="text-xs text-muted-foreground">{expense.created_by_name}</div>
            </div>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => {
              if (!confirm("Удалить расход?")) return;
              del.mutate({ id: expense.id }, {
                onSuccess: () => toast.success("Удалено"),
                onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
              });
            }}
            className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            aria-label="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {expense.comment && (
            <div className="text-sm whitespace-pre-wrap">{expense.comment}</div>
          )}
          {attachments.length > 0 ? (
            <div className="space-y-1.5">
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-sm bg-secondary/50 rounded-md px-3 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(a.size_bytes)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openFile(a.file_path, a.name)}
                      className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-primary"
                      title="Скачать"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {canManage && (
                      <button
                        onClick={() => {
                          if (!confirm("Удалить файл?")) return;
                          delAtt.mutate({ id: a.id, file_path: a.file_path }, {
                            onError: (e: any) => toast.error(e?.message ?? "Ошибка"),
                          });
                        }}
                        className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-destructive"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !expense.comment && <div className="text-sm text-muted-foreground">Нет дополнительной информации</div>
          )}
        </div>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return d; }
}

function pluralize(n: number, forms: [string, string, string]) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}