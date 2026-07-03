import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Truck, Archive, Wrench } from "lucide-react";
import { PageHeader } from "@/components/app-layout";
import { ColoredBadge } from "@/components/colored-badge";
import { ToolFormDialog } from "@/components/tool-form-dialog";
import { ToolMoveDialog } from "@/components/tool-move-dialog";
import { FilterBar, FilterSelect, FilterToggle, FILTER_ALL } from "@/components/filter-bar";
import {
  useToolsDb, useDeleteTool, useToolCategories, useToolStatuses, useToolConditions,
  type ToolRow,
} from "@/lib/tools-api";
import { useObjects } from "@/lib/objects-api";
import { useAllUsers } from "@/lib/users-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/tools/")({ component: ToolsPage });

function ToolsPage() {
  const { canManageTools, filterTools, canViewAllTools } = usePermissions();
  const { data: tools = [], isLoading } = useToolsDb();
  const { data: categories = [] } = useToolCategories();
  const { data: statuses = [] } = useToolStatuses();
  const { data: conditions = [] } = useToolConditions();
  const { data: objects = [] } = useObjects();
  const { users } = useAllUsers();
  const del = useDeleteTool();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(FILTER_ALL);
  const [showRepair, setShowRepair] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; tool: ToolRow | null }>({ open: false, tool: null });
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; tool: ToolRow | null }>({ open: false, tool: null });

  const objectsMap = useMemo(() => new Map(objects.map((o) => [o.id, o.name])), [objects]);
  const usersMap = useMemo(() => new Map(users.map((u) => [u.id, u.label])), [users]);
  const statusByName = useMemo(() => new Map(statuses.map((s) => [s.name, s])), [statuses]);
  const conditionByName = useMemo(() => new Map(conditions.map((c) => [c.name, c])), [conditions]);

  const scopedTools = useMemo(() => filterTools(tools), [tools, filterTools]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedTools.filter((t) => {
      // archive statuses never appear in the main list
      if (t.status === "Потерян" || t.status === "Списан") return false;
      // hide "В ремонте" unless the toggle is on (or explicitly filtered)
      if (t.status === "В ремонте" && !showRepair && statusFilter !== "В ремонте") return false;
      if (statusFilter !== FILTER_ALL && t.status !== statusFilter) return false;
      if (categoryFilter !== FILTER_ALL && t.category !== categoryFilter) return false;
      if (q) {
        const hay = `${t.name} ${t.inv_number} ${t.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopedTools, query, statusFilter, categoryFilter, showRepair]);

  const remove = async (t: ToolRow) => {
    if (!confirm(`Удалить «${t.name}»?`)) return;
    try { await del.mutateAsync(t.id); toast.success("Удалено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };

  return (
    <>
      <PageHeader
        title="Инструмент"
        description="Учёт инструмента: где находится, у кого, в каком состоянии"
        actions={
          <div className="flex items-center gap-2">
            {canViewAllTools && (
              <Link
                to="/tools/archive"
                className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-card text-sm hover:bg-secondary"
              >
                <Archive className="w-4 h-4" /> Архив
              </Link>
            )}
            {canManageTools && (
              <button
                onClick={() => setDialog({ open: true, tool: null })}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> Добавить инструмент
              </button>
            )}
          </div>
        }
      />

      <FilterBar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Поиск по названию или инв. номеру"
        filters={
          <>
            <FilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="Категория"
              options={categories.map((c) => c.name)}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Статус"
              options={statuses
                .filter((s) => s.name !== "Потерян" && s.name !== "Списан")
                .map((s) => s.name)}
            />
          </>
        }
        extras={
          <FilterToggle active={showRepair} onToggle={() => setShowRepair((v) => !v)}>
            <Wrench className="w-4 h-4" /> Показать в ремонте
          </FilterToggle>
        }
        activeFiltersCount={
          (statusFilter !== FILTER_ALL ? 1 : 0) +
          (categoryFilter !== FILTER_ALL ? 1 : 0) +
          (showRepair ? 1 : 0)
        }
        onReset={() => {
          setStatusFilter(FILTER_ALL);
          setCategoryFilter(FILTER_ALL);
          setShowRepair(false);
        }}
      />

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Название</th>
              <th className="px-4 py-3 font-medium">Категория</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Инв. №</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Состояние</th>
              <th className="px-4 py-3 font-medium">Объект</th>
              <th className="px-4 py-3 font-medium">Ответственный</th>
              <th className="px-4 py-3 font-medium text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Загрузка…</td></tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Инструмент не найден</td></tr>
            )}
            {list.map((t) => {
              const s = statusByName.get(t.status);
              const c = conditionByName.get(t.condition);
              return (
                <tr key={t.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">
                    <Link to="/tools/$toolId" params={{ toolId: t.id }} className="hover:text-primary">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.category || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t.inv_number || "—"}</td>
                  <td className="px-4 py-3">
                    {s ? <ColoredBadge name={s.name} color={s.color} /> : <span className="text-xs">{t.status}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c ? <ColoredBadge name={c.name} color={c.color} /> : <span className="text-xs">{t.condition}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.object_id
                      ? (objectsMap.get(t.object_id) ?? t.object_id)
                      : t.status === "В ремонте"
                        ? "Ремонт"
                        : t.status === "Свободен"
                          ? "Склад"
                          : "—"}
                  </td>
                  <td className="px-4 py-3">{t.assignee_id ? (usersMap.get(t.assignee_id) ?? "—") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {canManageTools && (
                      <div className="inline-flex gap-1">
                        <button onClick={() => setMoveDialog({ open: true, tool: t })} className={cn("p-1.5 rounded-md hover:bg-secondary")} aria-label="Переместить">
                          <Truck className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDialog({ open: true, tool: t })} className={cn("p-1.5 rounded-md hover:bg-secondary")} aria-label="Редактировать">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(t)} className="p-1.5 rounded-md hover:bg-secondary text-destructive" aria-label="Удалить">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ToolFormDialog
        open={dialog.open}
        tool={dialog.tool}
        onClose={() => setDialog({ open: false, tool: null })}
      />
      {moveDialog.tool && (
        <ToolMoveDialog
          open={moveDialog.open}
          tool={moveDialog.tool}
          onClose={() => setMoveDialog({ open: false, tool: null })}
        />
      )}
    </>
  );
}
