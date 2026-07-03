import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, Pencil, Trash2, Truck } from "lucide-react";
import { PageHeader } from "@/components/app-layout";
import { ColoredBadge } from "@/components/colored-badge";
import { ToolFormDialog } from "@/components/tool-form-dialog";
import { ToolMoveDialog } from "@/components/tool-move-dialog";
import {
  useToolsDb, useDeleteTool, useToolStatuses, useToolConditions,
  type ToolRow,
} from "@/lib/tools-api";
import { useObjects } from "@/lib/objects-api";
import { useAllUsers } from "@/lib/users-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/tools/archive")({ component: ArchivePage });

const ARCHIVE_STATUSES = ["Потерян", "Списан"] as const;

function ArchivePage() {
  const { canManageTools, filterTools } = usePermissions();
  const { data: tools = [], isLoading } = useToolsDb();
  const { data: statuses = [] } = useToolStatuses();
  const { data: conditions = [] } = useToolConditions();
  const { data: objects = [] } = useObjects();
  const { users } = useAllUsers();
  const del = useDeleteTool();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Все");
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
      if (!ARCHIVE_STATUSES.includes(t.status as any)) return false;
      if (statusFilter !== "Все" && t.status !== statusFilter) return false;
      if (q) {
        const hay = `${t.name} ${t.inv_number} ${t.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopedTools, query, statusFilter]);

  const remove = async (t: ToolRow) => {
    if (!confirm(`Удалить «${t.name}»?`)) return;
    try { await del.mutateAsync(t.id); toast.success("Удалено"); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };

  return (
    <>
      <div className="mb-3">
        <Link to="/tools" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> К инструментам
        </Link>
      </div>
      <PageHeader
        title="Архив инструмента"
        description="Потерянный и списанный инструмент"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию или инв. номеру"
            className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-card text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-card text-sm"
        >
          <option value="Все">Все статусы</option>
          {ARCHIVE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Название</th>
              <th className="px-4 py-3 font-medium">Категория</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Инв. №</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Состояние</th>
              <th className="px-4 py-3 font-medium">Последний объект</th>
              <th className="px-4 py-3 font-medium text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Загрузка…</td></tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Архив пуст</td></tr>
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
                  <td className="px-4 py-3">{t.object_id ? (objectsMap.get(t.object_id) ?? t.object_id) : "—"}</td>
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
