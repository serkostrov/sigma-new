import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactElement } from "react";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Save, X } from "lucide-react";
import { PageHeader } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useStageTemplates, useCreateStageTemplate, useUpdateStageTemplate,
  useDeleteStageTemplate, useReorderStageTemplates, type StageTemplate,
} from "@/lib/stages-api";
import {
  useObjectStatuses, useCreateStatus, useUpdateStatus, useDeleteStatus, type ObjectStatusRow,
  useObjectHealths, useCreateHealth, useUpdateHealth, useDeleteHealth, type ObjectHealthRow,
  useTaskStatusesCatalog, useCreateTaskStatus, useUpdateTaskStatus, useDeleteTaskStatus, type TaskStatusRow,
  useTaskPrioritiesCatalog, useCreateTaskPriority, useUpdateTaskPriority, useDeleteTaskPriority, type TaskPriorityRow,
} from "@/lib/catalogs-api";
import {
  useToolCategories, useCreateToolCategory, useUpdateToolCategory, useDeleteToolCategory, type ToolCategoryRow,
  useToolStatuses, useCreateToolStatus, useUpdateToolStatus, useDeleteToolStatus, type ToolStatusRow,
  useToolConditions, useCreateToolCondition, useUpdateToolCondition, useDeleteToolCondition, type ToolConditionRow,
} from "@/lib/tools-api";
import {
  useDocumentTypes, useCreateDocumentType, useUpdateDocumentType, useDeleteDocumentType, type DocumentType,
} from "@/lib/documents-api";
import {
  useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory, type ExpenseCategory,
} from "@/lib/expenses-api";
import {
  AccessMatrixSection,
  RoleAccessSection,
  RouteAccessSection,
  RoleOverviewSection,
} from "@/components/settings/role-access-settings";
import { ColoredBadge } from "@/components/colored-badge";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

async function swapOrder<T extends { id: string; sort_order: number }>(
  rows: T[],
  idx: number,
  dir: -1 | 1,
  update: (input: { id: string; sort_order: number }) => Promise<any>,
) {
  const j = idx + dir;
  if (j < 0 || j >= rows.length) return;
  const a = rows[idx], b = rows[j];
  try {
    await update({ id: a.id, sort_order: b.sort_order });
    await update({ id: b.id, sort_order: a.sort_order });
  } catch (e: any) {
    toast.error(e?.message ?? "Ошибка");
  }
}

type Group = "access" | "objects" | "stages" | "tasks" | "tools" | "documents" | "expenses";

type SubTab = { k: string; l: string; render: () => ReactElement };

const GROUPS: { k: Group; l: string; tabs: SubTab[] }[] = [
  {
    k: "access", l: "Доступ", tabs: [
      { k: "overview", l: "Обзор", render: () => <RoleOverviewSection /> },
      { k: "by_role", l: "По ролям", render: () => <RoleAccessSection /> },
      { k: "matrix", l: "Матрица", render: () => <AccessMatrixSection /> },
      { k: "routes", l: "Разделы", render: () => <RouteAccessSection /> },
    ],
  },
  {
    k: "objects", l: "Объекты", tabs: [
      { k: "statuses", l: "Статусы", render: () => <StatusesSection /> },
      { k: "healths", l: "Состояния", render: () => <HealthsSection /> },
    ],
  },
  {
    k: "stages", l: "Этапы", tabs: [
      { k: "stages", l: "Этапы работ", render: () => <StagesSection /> },
    ],
  },
  {
    k: "tasks", l: "Задачи", tabs: [
      { k: "task_statuses", l: "Статусы", render: () => <TaskStatusesSection /> },
      { k: "task_priorities", l: "Приоритеты", render: () => <TaskPrioritiesSection /> },
    ],
  },
  {
    k: "tools", l: "Инструменты", tabs: [
      { k: "tool_categories", l: "Категории", render: () => <ToolCategoriesSection /> },
      { k: "tool_statuses", l: "Статусы", render: () => <ToolStatusesSection /> },
      { k: "tool_conditions", l: "Состояния", render: () => <ToolConditionsSection /> },
    ],
  },
  {
    k: "documents", l: "Документы", tabs: [
      { k: "document_types", l: "Типы документов", render: () => <DocumentTypesSection /> },
    ],
  },
  {
    k: "expenses", l: "Расходы", tabs: [
      { k: "expense_categories", l: "Категории", render: () => <ExpenseCategoriesSection /> },
    ],
  },
];

function SettingsPage() {
  const { canManageCatalogs } = usePermissions();
  const visibleGroups = GROUPS.filter((g) => g.k === "access" || canManageCatalogs);
  const [group, setGroup] = useState<Group>("access");
  const current = visibleGroups.find((g) => g.k === group) ?? visibleGroups[0]!;
  const [subTab, setSubTab] = useState<string>(current.tabs[0].k);

  const onGroupChange = (g: Group) => {
    setGroup(g);
    const next = visibleGroups.find((x) => x.k === g) ?? visibleGroups[0]!;
    setSubTab(next.tabs[0].k);
  };

  const active = current.tabs.find((t) => t.k === subTab) ?? current.tabs[0];

  return (
    <>
      <PageHeader
        title="Настройки"
        description="Управление справочниками и разграничением доступа по ролям"
      />
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <nav className="bg-card border border-border rounded-xl p-2 h-fit">
          {visibleGroups.map((g) => (
            <button
              key={g.k}
              onClick={() => onGroupChange(g.k)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                group === g.k
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {g.l}
            </button>
          ))}
        </nav>
        <div className="bg-card border border-border rounded-xl">
          {current.tabs.length > 1 && (
            <div className="border-b border-border flex overflow-x-auto">
              {current.tabs.map((t) => (
                <button
                  key={t.k}
                  onClick={() => setSubTab(t.k)}
                  className={cn(
                    "px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                    subTab === t.k
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.l}
                </button>
              ))}
            </div>
          )}
          <div className="p-5 md:p-6">{active.render()}</div>
        </div>
      </div>
    </>
  );
}

function StagesSection() {
  const { data: stages = [] } = useStageTemplates();
  const create = useCreateStageTemplate();
  const update = useUpdateStageTemplate();
  const del = useDeleteStageTemplate();
  const reorder = useReorderStageTemplates();

  const [name, setName] = useState("");
  const [days, setDays] = useState(7);
  const [editing, setEditing] = useState<StageTemplate | null>(null);
  const [eName, setEName] = useState("");
  const [eDays, setEDays] = useState(0);

  const add = async () => {
    if (!name.trim()) return toast.error("Укажите название этапа");
    const sort_order = (stages.at(-1)?.sort_order ?? 0) + 1;
    try { await create.mutateAsync({ name: name.trim(), duration_days: days, sort_order }); setName(""); setDays(7); toast.success("Этап добавлен"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };
  const startEdit = (s: StageTemplate) => { setEditing(s); setEName(s.name); setEDays(s.duration_days); };
  const saveEdit = async () => {
    if (!editing) return;
    try { await update.mutateAsync({ id: editing.id, name: eName.trim(), duration_days: eDays }); setEditing(null); toast.success("Сохранено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= stages.length) return;
    const a = stages[idx], b = stages[j];
    try { await reorder.mutateAsync([{ id: a.id, sort_order: b.sort_order }, { id: b.id, sort_order: a.sort_order }]); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 items-end">
        <div><Label>Название этапа</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Демонтаж" /></div>
        <div><Label>Срок, дней</Label><Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value) || 1)} /></div>
        <Button onClick={add} disabled={create.isPending}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
      </div>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
            <div className="w-7 h-7 rounded-full bg-secondary grid place-items-center text-sm font-semibold">{i + 1}</div>
            {editing?.id === s.id ? (
              <>
                <Input className="flex-1" value={eName} onChange={(e) => setEName(e.target.value)} />
                <Input className="w-24" type="number" min={1} value={eDays} onChange={(e) => setEDays(Number(e.target.value) || 1)} />
                <Button size="sm" onClick={saveEdit}><Save className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">Срок: {s.duration_days} дн.</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === stages.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                  if (confirm(`Удалить этап «${s.name}»?`)) del.mutate(s.id);
                }}><Trash2 className="w-4 h-4" /></Button>
              </>
            )}
          </div>
        ))}
        {stages.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Этапов пока нет</div>}
      </div>
    </div>
  );
}

function StatusesSection() {
  const { data: rows = [] } = useObjectStatuses();
  const create = useCreateStatus();
  const update = useUpdateStatus();
  const del = useDeleteStatus();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ObjectStatusRow | null>(null);
  const [eName, setEName] = useState("");

  const add = async () => {
    if (!name.trim()) return toast.error("Укажите название");
    const sort_order = (rows.at(-1)?.sort_order ?? 0) + 1;
    try { await create.mutateAsync({ name: name.trim(), sort_order }); setName(""); toast.success("Статус добавлен"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };
  const save = async () => {
    if (!editing) return;
    try { await update.mutateAsync({ id: editing.id, name: eName.trim() }); setEditing(null); toast.success("Сохранено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1"><Label>Новый статус</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: На паузе" /></div>
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2 p-3 border border-border rounded-lg">
            {editing?.id === r.id ? (
              <>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={save}><Save className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <div className="flex-1 font-medium">{r.name}</div>
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, -1, (x) => update.mutateAsync(x))} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, 1, (x) => update.mutateAsync(x))} disabled={i === rows.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setEName(r.name); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                  if (confirm(`Удалить статус «${r.name}»?`)) del.mutate(r.id);
                }}><Trash2 className="w-4 h-4" /></Button>
              </>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Статусов пока нет</div>}
      </div>
    </div>
  );
}

function HealthsSection() {
  const { data: rows = [] } = useObjectHealths();
  const create = useCreateHealth();
  const update = useUpdateHealth();
  const del = useDeleteHealth();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<ObjectHealthRow | null>(null);
  const [eLabel, setELabel] = useState("");

  const add = async () => {
    if (!key.trim() || !label.trim()) return toast.error("Укажите ключ и название");
    const sort_order = (rows.at(-1)?.sort_order ?? 0) + 1;
    try { await create.mutateAsync({ key: key.trim(), label: label.trim(), sort_order }); setKey(""); setLabel(""); toast.success("Состояние добавлено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };
  const save = async () => {
    if (!editing) return;
    try { await update.mutateAsync({ id: editing.id, label: eLabel.trim() }); setEditing(null); toast.success("Сохранено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2 items-end">
        <div><Label>Ключ (латиница)</Label><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="ok / risk / ..." /></div>
        <div><Label>Название</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Например: Все в порядке" /></div>
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2 p-3 border border-border rounded-lg">
            <code className="text-xs px-2 py-1 rounded bg-secondary">{r.key}</code>
            {editing?.id === r.id ? (
              <>
                <Input value={eLabel} onChange={(e) => setELabel(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={save}><Save className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <div className="flex-1 font-medium">{r.label}</div>
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, -1, (x) => update.mutateAsync(x))} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, 1, (x) => update.mutateAsync(x))} disabled={i === rows.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setELabel(r.label); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                  if (confirm(`Удалить состояние «${r.label}»?`)) del.mutate(r.id);
                }}><Trash2 className="w-4 h-4" /></Button>
              </>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Состояний пока нет</div>}
      </div>
    </div>
  );
}

function ColoredCatalogSection<T extends { id: string; name: string; color: string; sort_order: number }>({
  rows, create, update, remove, defaultColor, placeholder,
}: {
  rows: T[];
  create: (input: { name: string; color: string; sort_order: number }) => Promise<any>;
  update: (input: { id: string; name?: string; color?: string; sort_order?: number }) => Promise<any>;
  remove: (id: string) => Promise<any>;
  defaultColor: string;
  placeholder: string;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [eColor, setEColor] = useState(defaultColor);

  const add = async () => {
    if (!name.trim()) return toast.error("Укажите название");
    const sort_order = (rows.at(-1)?.sort_order ?? 0) + 1;
    try { await create({ name: name.trim(), color, sort_order }); setName(""); setColor(defaultColor); toast.success("Добавлено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };
  const save = async (id: string) => {
    try { await update({ id, name: eName.trim(), color: eColor }); setEditingId(null); toast.success("Сохранено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-2 items-end">
        <div><Label>Название</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} /></div>
        <div>
          <Label>Цвет</Label>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 p-1 cursor-pointer" />
        </div>
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2 p-3 border border-border rounded-lg">
            {editingId === r.id ? (
              <>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} className="flex-1" />
                <Input type="color" value={eColor} onChange={(e) => setEColor(e.target.value)} className="h-10 w-16 p-1 cursor-pointer" />
                <Button size="sm" onClick={() => save(r.id)}><Save className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <ColoredBadge name={r.name} color={r.color} />
                <div className="flex-1" />
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, -1, (x) => update(x))} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, 1, (x) => update(x))} disabled={i === rows.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditingId(r.id); setEName(r.name); setEColor(r.color); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                  if (confirm(`Удалить «${r.name}»?`)) remove(r.id);
                }}><Trash2 className="w-4 h-4" /></Button>
              </>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Записей пока нет</div>}
      </div>
    </div>
  );
}

function TaskStatusesSection() {
  const { data: rows = [] } = useTaskStatusesCatalog();
  const create = useCreateTaskStatus();
  const update = useUpdateTaskStatus();
  const del = useDeleteTaskStatus();
  return (
    <ColoredCatalogSection<TaskStatusRow>
      rows={rows}
      create={(i) => create.mutateAsync(i)}
      update={(i) => update.mutateAsync(i)}
      remove={(id) => del.mutateAsync(id)}
      defaultColor="#3b82f6"
      placeholder="Например: В работе"
    />
  );
}

function TaskPrioritiesSection() {
  const { data: rows = [] } = useTaskPrioritiesCatalog();
  const create = useCreateTaskPriority();
  const update = useUpdateTaskPriority();
  const del = useDeleteTaskPriority();
  return (
    <ColoredCatalogSection<TaskPriorityRow>
      rows={rows}
      create={(i) => create.mutateAsync(i)}
      update={(i) => update.mutateAsync(i)}
      remove={(id) => del.mutateAsync(id)}
      defaultColor="#f59e0b"
      placeholder="Например: Срочная"
    />
  );
}

function ToolCategoriesSection() {
  const { data: rows = [] } = useToolCategories();
  const create = useCreateToolCategory();
  const update = useUpdateToolCategory();
  const del = useDeleteToolCategory();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ToolCategoryRow | null>(null);
  const [eName, setEName] = useState("");

  const add = async () => {
    if (!name.trim()) return toast.error("Укажите название");
    const sort_order = (rows.at(-1)?.sort_order ?? 0) + 1;
    try { await create.mutateAsync({ name: name.trim(), sort_order }); setName(""); toast.success("Добавлено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };
  const save = async () => {
    if (!editing) return;
    try { await update.mutateAsync({ id: editing.id, name: eName.trim() }); setEditing(null); toast.success("Сохранено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1"><Label>Новая категория</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Электроинструмент" /></div>
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2 p-3 border border-border rounded-lg">
            {editing?.id === r.id ? (
              <>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={save}><Save className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <div className="flex-1 font-medium">{r.name}</div>
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, -1, (x) => update.mutateAsync(x))} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, 1, (x) => update.mutateAsync(x))} disabled={i === rows.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setEName(r.name); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                  if (confirm(`Удалить «${r.name}»?`)) del.mutate(r.id);
                }}><Trash2 className="w-4 h-4" /></Button>
              </>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Категорий пока нет</div>}
      </div>
    </div>
  );
}

function ToolStatusesSection() {
  const { data: rows = [] } = useToolStatuses();
  const create = useCreateToolStatus();
  const update = useUpdateToolStatus();
  const del = useDeleteToolStatus();
  return (
    <ColoredCatalogSection<ToolStatusRow>
      rows={rows}
      create={(i) => create.mutateAsync(i)}
      update={(i) => update.mutateAsync(i)}
      remove={(id) => del.mutateAsync(id)}
      defaultColor="#3b82f6"
      placeholder="Например: На объекте"
    />
  );
}

function ToolConditionsSection() {
  const { data: rows = [] } = useToolConditions();
  const create = useCreateToolCondition();
  const update = useUpdateToolCondition();
  const del = useDeleteToolCondition();
  return (
    <ColoredCatalogSection<ToolConditionRow>
      rows={rows}
      create={(i) => create.mutateAsync(i)}
      update={(i) => update.mutateAsync(i)}
      remove={(id) => del.mutateAsync(id)}
      defaultColor="#10b981"
      placeholder="Например: Рабочее"
    />
  );
}

function SimpleNameCatalogSection<T extends { id: string; name: string; sort_order: number }>({
  rows,
  create,
  update,
  remove,
  newLabel,
  placeholder,
  emptyText,
}: {
  rows: T[];
  create: (input: { name: string; sort_order: number }) => Promise<any>;
  update: (input: { id: string } & Partial<T>) => Promise<any>;
  remove: (id: string) => Promise<any> | void;
  newLabel: string;
  placeholder: string;
  emptyText: string;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [eName, setEName] = useState("");

  const add = async () => {
    if (!name.trim()) return toast.error("Укажите название");
    const sort_order = (rows.at(-1)?.sort_order ?? 0) + 10;
    try { await create({ name: name.trim(), sort_order }); setName(""); toast.success("Добавлено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };
  const save = async () => {
    if (!editing) return;
    try { await update({ id: editing.id, name: eName.trim() } as any); setEditing(null); toast.success("Сохранено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1"><Label>{newLabel}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} /></div>
        <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Добавить</Button>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2 p-3 border border-border rounded-lg">
            {editing?.id === r.id ? (
              <>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={save}><Save className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <div className="flex-1 font-medium">{r.name}</div>
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, -1, (x) => update(x as any))} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => swapOrder(rows, i, 1, (x) => update(x as any))} disabled={i === rows.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setEName(r.name); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                  if (confirm(`Удалить «${r.name}»?`)) remove(r.id);
                }}><Trash2 className="w-4 h-4" /></Button>
              </>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">{emptyText}</div>}
      </div>
    </div>
  );
}

function DocumentTypesSection() {
  const { data: rows = [] } = useDocumentTypes();
  const create = useCreateDocumentType();
  const update = useUpdateDocumentType();
  const del = useDeleteDocumentType();
  return (
    <SimpleNameCatalogSection<DocumentType>
      rows={rows}
      create={(i) => create.mutateAsync(i)}
      update={(i) => update.mutateAsync(i as any)}
      remove={(id) => del.mutateAsync(id)}
      newLabel="Новый тип документа"
      placeholder="Например: Договор"
      emptyText="Типов документов пока нет"
    />
  );
}

function ExpenseCategoriesSection() {
  const { data: rows = [] } = useExpenseCategories();
  const create = useCreateExpenseCategory();
  const update = useUpdateExpenseCategory();
  const del = useDeleteExpenseCategory();
  return (
    <SimpleNameCatalogSection<ExpenseCategory>
      rows={rows}
      create={(i) => create.mutateAsync(i)}
      update={(i) => update.mutateAsync(i as any)}
      remove={(id) => del.mutateAsync(id)}
      newLabel="Новая категория расходов"
      placeholder="Например: Закупка материалов"
      emptyText="Категорий пока нет"
    />
  );
}