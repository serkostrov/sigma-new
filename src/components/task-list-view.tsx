import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LayoutGrid, Table as TableIcon } from "lucide-react";
import { FilterBar, FilterSelect as SharedFilterSelect, FILTER_ALL } from "@/components/filter-bar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ColoredBadge, ColorDot, colorChipStyle } from "@/components/colored-badge";
import { cn } from "@/lib/utils";
import { useUpdateTask, type Task, type TaskStatus } from "@/lib/tasks-api";
import { useAllUsers } from "@/lib/users-api";
import { useObjects } from "@/lib/objects-api";
import { useAllStages } from "@/lib/stages-api";
import { useTaskStatusesCatalog, useTaskPrioritiesCatalog, type TaskStatusRow } from "@/lib/catalogs-api";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";

const ALL = FILTER_ALL;
const WAITING_STATUS = "Ожидание";
const DONE_STATUS = "Выполнена";

export type BackContext =
  | { from: "tasks" }
  | { from: "object"; objectId: string }
  | { from: "stage"; objectId: string; stageId: string };

export function TaskListView({
  tasks,
  hideProjectFilter = false,
  hideStageFilter = false,
  backContext,
  actionSlot,
}: {
  tasks: Task[];
  hideProjectFilter?: boolean;
  hideStageFilter?: boolean;
  backContext?: BackContext;
  actionSlot?: React.ReactNode;
}) {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [fStatus, setFStatus] = useState<string>(ALL);
  const [fPriority, setFPriority] = useState<string>(ALL);
  const [fAssignee, setFAssignee] = useState<string>(ALL);
  const [fObject, setFObject] = useState<string>(ALL);
  const [fStage, setFStage] = useState<string>(ALL);
  const [showWaiting, setShowWaiting] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const { users } = useAllUsers();
  const { data: objects = [] } = useObjects();
  const { data: stages = [] } = useAllStages();
  const { data: statusCat = [] } = useTaskStatusesCatalog();
  const { data: priorityCat = [] } = useTaskPrioritiesCatalog();
  const update = useUpdateTask();
  const { canEditTasks, canReviewWork } = usePermissions();
  const canChangeStatus = canEditTasks || canReviewWork;

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.label])), [users]);
  const objMap = useMemo(() => new Map(objects.map((o) => [o.id, o.name])), [objects]);
  const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s.name])), [stages]);
  const statusColorMap = useMemo(() => new Map(statusCat.map((s) => [s.name, s.color])), [statusCat]);
  const priorityColorMap = useMemo(() => new Map(priorityCat.map((p) => [p.name, p.color])), [priorityCat]);
  const searchProp = backContext as any;

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (fStatus !== ALL && t.status !== fStatus) return false;
      if (fStatus === ALL) {
        if (!showWaiting && t.status === WAITING_STATUS) return false;
        if (!showDone && t.status === DONE_STATUS) return false;
      }
      if (fPriority !== ALL && t.priority !== fPriority) return false;
      if (fAssignee !== ALL && (t.assignee_id ?? "") !== fAssignee) return false;
      if (!hideProjectFilter && fObject !== ALL && (t.object_id ?? "") !== fObject) return false;
      if (!hideStageFilter && fStage !== ALL && (t.stage_id ?? "") !== fStage) return false;
      return true;
    });
  }, [tasks, fStatus, fPriority, fAssignee, fObject, fStage, hideProjectFilter, hideStageFilter, showWaiting, showDone]);

  function changeStatus(id: string, status: TaskStatus) {
    update.mutate({ id, status }, {
      onSuccess: () => toast.success("Статус обновлён"),
      onError: (e: any) => toast.error(e?.message ?? "Не удалось обновить"),
    });
  }

  const activeFiltersCount =
    (fStatus !== ALL ? 1 : 0) +
    (fPriority !== ALL ? 1 : 0) +
    (fAssignee !== ALL ? 1 : 0) +
    (!hideProjectFilter && fObject !== ALL ? 1 : 0) +
    (!hideStageFilter && fStage !== ALL ? 1 : 0);
  const resetFilters = () => {
    setFStatus(ALL); setFPriority(ALL); setFAssignee(ALL); setFObject(ALL); setFStage(ALL);
  };

  return (
    <div className="space-y-3">
      <FilterBar
        filters={
          <>
            <SharedFilterSelect value={fStatus} onChange={setFStatus} placeholder="Статус" options={statusCat.map((s) => s.name)} />
            <SharedFilterSelect value={fPriority} onChange={setFPriority} placeholder="Приоритет" options={priorityCat.map((p) => p.name)} />
            <SharedFilterSelect
              value={fAssignee} onChange={setFAssignee} placeholder="Исполнитель"
              options={users.map((u) => ({ value: u.id, label: u.label }))}
            />
            {!hideProjectFilter && (
              <SharedFilterSelect
                value={fObject} onChange={setFObject} placeholder="Объект"
                options={objects.map((o) => ({ value: o.id, label: o.name }))}
              />
            )}
            {!hideStageFilter && (
              <SharedFilterSelect
                value={fStage} onChange={setFStage} placeholder="Этап"
                options={stages.map((s) => ({ value: s.id, label: s.name }))}
              />
            )}
          </>
        }
        extras={
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setView("table")}
                aria-label="Таблица"
                title="Таблица"
                className={cn("inline-flex items-center justify-center h-9 w-9",
                  view === "table" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50")}
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                aria-label="Канбан"
                title="Канбан"
                className={cn("inline-flex items-center justify-center h-9 w-9 border-l border-border",
                  view === "kanban" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            {actionSlot}
          </div>
        }
        activeFiltersCount={activeFiltersCount}
        onReset={resetFilters}
      />

      <div className="flex flex-wrap items-center gap-4 -mt-1">
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox checked={showWaiting} onCheckedChange={(v) => setShowWaiting(!!v)} />
          <span className="text-muted-foreground">Показывать «{WAITING_STATUS}»</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox checked={showDone} onCheckedChange={(v) => setShowDone(!!v)} />
          <span className="text-muted-foreground">Показывать «{DONE_STATUS}»</span>
        </label>
      </div>

      {view === "table" ? (
        <TableView
          tasks={filtered}
          userMap={userMap} objMap={objMap} stageMap={stageMap}
          statusCat={statusCat}
          statusColorMap={statusColorMap}
          priorityColorMap={priorityColorMap}
          onChangeStatus={changeStatus}
          canChangeStatus={canChangeStatus}
          hideProject={hideProjectFilter}
          hideStage={hideStageFilter}
          searchProp={searchProp}
        />
      ) : (
        <KanbanView
          tasks={filtered}
          userMap={userMap} objMap={objMap}
          statusCat={statusCat}
          priorityColorMap={priorityColorMap}
          onChangeStatus={changeStatus}
          canChangeStatus={canChangeStatus}
          searchProp={searchProp}
        />
      )}
    </div>
  );
}



function TableView({
  tasks, userMap, objMap, stageMap, statusCat, statusColorMap, priorityColorMap,
  onChangeStatus, canChangeStatus, hideProject, hideStage, searchProp,
}: {
  tasks: Task[];
  userMap: Map<string, string>;
  objMap: Map<string, string>;
  stageMap: Map<string, string>;
  statusCat: TaskStatusRow[];
  statusColorMap: Map<string, string>;
  priorityColorMap: Map<string, string>;
  onChangeStatus: (id: string, s: TaskStatus) => void;
  canChangeStatus: boolean;
  hideProject: boolean;
  hideStage: boolean;
  searchProp: any;
}) {
  if (tasks.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-10 border border-border rounded-xl">Задач нет</div>;
  }
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Название</th>
              {!hideProject && <th className="px-3 py-2 font-medium">Объект</th>}
              {!hideStage && <th className="px-3 py-2 font-medium">Этап</th>}
              <th className="px-3 py-2 font-medium">Исполнитель</th>
              <th className="px-3 py-2 font-medium">Срок</th>
              <th className="px-3 py-2 font-medium">Приоритет</th>
              <th className="px-3 py-2 font-medium w-[190px]">Статус</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-secondary/30">
                <td className="px-3 py-2">
                  <Link to="/tasks/$taskId" params={{ taskId: t.id }} search={searchProp} className="font-medium hover:underline">
                    {t.title}
                  </Link>
                </td>
                {!hideProject && (
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.object_id ? objMap.get(t.object_id) ?? "—" : "—"}
                  </td>
                )}
                {!hideStage && (
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.stage_id ? stageMap.get(t.stage_id) ?? "—" : "—"}
                  </td>
                )}
                <td className="px-3 py-2 text-muted-foreground">
                  {t.assignee_id ? userMap.get(t.assignee_id) ?? "—" : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{t.deadline ?? "—"}</td>
                <td className="px-3 py-2">
                  <ColoredBadge name={t.priority} color={priorityColorMap.get(t.priority) ?? "#64748b"} />
                </td>
                <td className="px-3 py-2">
                  {canChangeStatus ? (
                    <Select value={t.status} onValueChange={(v) => onChangeStatus(t.id, v as TaskStatus)}>
                      <SelectTrigger
                        className="h-7 w-[170px] px-2.5 text-xs font-medium border-0 rounded-full"
                        style={colorChipStyle(statusColorMap.get(t.status) ?? "#64748b")}
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
                    <ColoredBadge name={t.status} color={statusColorMap.get(t.status) ?? "#64748b"} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KanbanView({
  tasks, userMap, objMap, statusCat, priorityColorMap, onChangeStatus, canChangeStatus, searchProp,
}: {
  tasks: Task[];
  userMap: Map<string, string>;
  objMap: Map<string, string>;
  statusCat: TaskStatusRow[];
  priorityColorMap: Map<string, string>;
  onChangeStatus: (id: string, s: TaskStatus) => void;
  canChangeStatus: boolean;
  searchProp: any;
}) {
  const [dragOver, setDragOver] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {statusCat.map((colDef) => {
        const col = colDef.name;
        const items = tasks.filter((t) => t.status === col);
        const isOver = dragOver === col;
        return (
          <div
            key={col}
            onDragOver={canChangeStatus ? (e) => { e.preventDefault(); setDragOver(col); } : undefined}
            onDragLeave={canChangeStatus ? () => setDragOver((c) => (c === col ? null : c)) : undefined}
            onDrop={canChangeStatus ? (e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/task-id");
              const from = e.dataTransfer.getData("text/task-status");
              if (id && from !== col) onChangeStatus(id, col);
            } : undefined}
            className={cn(
              "bg-secondary/50 border rounded-xl p-3 min-h-[220px] transition-colors",
              isOver ? "border-primary bg-primary/5" : "border-border",
            )}
            style={isOver ? undefined : { borderTopWidth: 3, borderTopColor: colDef.color }}
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="font-semibold text-sm inline-flex items-center gap-2">
                <ColorDot color={colDef.color} /> {col}
              </div>
              <span className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded-full border border-border">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable={canChangeStatus}
                  onDragStart={canChangeStatus ? (e) => {
                    e.dataTransfer.setData("text/task-id", t.id);
                    e.dataTransfer.setData("text/task-status", t.status);
                    e.dataTransfer.effectAllowed = "move";
                  } : undefined}
                  className={cn(
                    "bg-card border border-border rounded-lg p-3 hover:border-primary/40",
                    canChangeStatus && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <Link
                    to="/tasks/$taskId"
                    params={{ taskId: t.id }}
                    search={searchProp}
                    className="block"
                    draggable={false}
                  >
                    <div className="font-medium text-sm">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t.object_id ? objMap.get(t.object_id) ?? "Проект" : "Без проекта"}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate">
                        {t.assignee_id ? userMap.get(t.assignee_id) ?? "—" : "Не назначен"}
                      </span>
                      <ColoredBadge name={t.priority} color={priorityColorMap.get(t.priority) ?? "#64748b"} />
                    </div>
                    {t.deadline && (
                      <div className="text-xs text-muted-foreground mt-1">Срок: {t.deadline}</div>
                    )}
                  </Link>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6">Перетащите задачу сюда</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}