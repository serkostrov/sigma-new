import { createFileRoute, Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2, History, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ColoredBadge } from "@/components/colored-badge";
import { ToolFormDialog } from "@/components/tool-form-dialog";
import { ToolMoveDialog } from "@/components/tool-move-dialog";
import {
  useTool, useToolMovements, useToolStatuses, useToolConditions, useDeleteTool,
} from "@/lib/tools-api";
import { useObjects } from "@/lib/objects-api";
import { useAllUsers } from "@/lib/users-api";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/permissions";

type ToolSearch = { from?: "object"; objectId?: string };

export const Route = createFileRoute("/tools/$toolId")({
  component: ToolDetail,
  validateSearch: (s: Record<string, unknown>): ToolSearch => ({
    from: s.from === "object" ? "object" : undefined,
    objectId: typeof s.objectId === "string" ? s.objectId : undefined,
  }),
});

function ToolDetail() {
  const { toolId } = useParams({ from: "/tools/$toolId" });
  const search = useSearch({ from: "/tools/$toolId" });
  const navigate = useNavigate();
  const { data: tool, isLoading } = useTool(toolId);
  const { data: movements = [] } = useToolMovements(toolId);
  const { data: statuses = [] } = useToolStatuses();
  const { data: conditions = [] } = useToolConditions();
  const { data: objects = [] } = useObjects();
  const { users } = useAllUsers();
  const del = useDeleteTool();
  const { user } = useAuth();
  const { canManageTools, canViewAssignedToolsOnly } = usePermissions();
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const objMap = useMemo(() => new Map(objects.map((o) => [o.id, o.name])), [objects]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.label])), [users]);
  const statusMap = useMemo(() => new Map(statuses.map((s) => [s.name, s])), [statuses]);
  const condMap = useMemo(() => new Map(conditions.map((c) => [c.name, c])), [conditions]);

  if (isLoading) {
    return <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">Загрузка…</div>;
  }
  if (!tool) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        Инструмент не найден.{" "}
        <Link to="/tools" className="text-primary hover:underline">К списку</Link>
      </div>
    );
  }

  if (canViewAssignedToolsOnly && tool.assignee_id !== user?.id) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center">
        Нет доступа к этому инструменту.{" "}
        <Link to="/tools" className="text-primary hover:underline">К списку</Link>
      </div>
    );
  }

  const s = statusMap.get(tool.status);
  const c = condMap.get(tool.condition);

  const backFromObject = search.from === "object" && search.objectId;

  const remove = async () => {
    if (!confirm(`Удалить «${tool.name}»?`)) return;
    try { await del.mutateAsync(tool.id); toast.success("Удалено"); navigate({ to: "/tools" }); }
    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const locLabel = (objectId: string | null | undefined, status: string | null | undefined): string => {
    if (objectId) return objMap.get(objectId) ?? objectId;
    if (status === "В ремонте") return "Ремонт";
    if (status === "Свободен") return "Склад";
    return "—";
  };

  return (
    <>
      {backFromObject ? (
        <Link to="/objects/$objectId" params={{ objectId: search.objectId! }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> К объекту
        </Link>
      ) : (
        <Link to="/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Все инструменты
        </Link>
      )}

      <div className="bg-card border border-border rounded-xl p-5 md:p-6 mb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{tool.name}</h1>
              {s && <ColoredBadge name={s.name} color={s.color} />}
              {c && <ColoredBadge name={c.name} color={c.color} />}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {tool.category || "Без категории"} · Инв. № {tool.inv_number || "—"}
            </div>
          </div>
          {canManageTools && (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setMoveOpen(true)} className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-card border border-border text-sm font-medium hover:bg-secondary">
                <Truck className="w-4 h-4" /> Переместить
              </button>
              <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                <Pencil className="w-4 h-4" /> Редактировать
              </button>
              <button onClick={remove} className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-card border border-border text-destructive hover:bg-destructive/10" aria-label="Удалить">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Field label="Категория" value={tool.category || "—"} />
          <Field label="Инв. №" value={tool.inv_number || "—"} />
          <Field label="Статус" value={tool.status} />
          <Field label="Состояние" value={tool.condition} />
          <Field
            label="Текущий объект"
            value={locLabel(tool.object_id, tool.status)}
            objectId={tool.object_id ?? undefined}
          />
          <Field label="Ответственный" value={tool.assignee_id ? (userMap.get(tool.assignee_id) ?? "—") : "—"} />
        </div>

        {tool.notes && (
          <div className="mt-4 p-3 border border-border rounded-md bg-secondary/40 text-sm whitespace-pre-wrap">{tool.notes}</div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 md:p-6 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-muted-foreground" />
          <div className="font-semibold">История перемещений</div>
        </div>
        {movements.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">История пуста</div>
        ) : (
          <div className="overflow-x-auto -mx-5 md:-mx-6">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium whitespace-nowrap">Дата</th>
                  <th className="px-4 py-2 font-medium">Объект</th>
                  <th className="px-4 py-2 font-medium">Ответственный</th>
                  <th className="px-4 py-2 font-medium">Статус</th>
                  <th className="px-4 py-2 font-medium">Комментарий</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m) => {
                  const fromObj = locLabel(m.from_object_id, m.from_status);
                  const toObj = locLabel(m.to_object_id, m.to_status);
                  const fromAsg = m.from_assignee_id ? (userMap.get(m.from_assignee_id) ?? "—") : "—";
                  const toAsg = m.to_assignee_id ? (userMap.get(m.to_assignee_id) ?? "—") : "—";
                  const objChanged = m.from_object_id !== m.to_object_id;
                  const asgChanged = m.from_assignee_id !== m.to_assignee_id;
                  const stChanged = m.from_status !== m.to_status;
                  return (
                    <tr key={m.id} className="align-top">
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(m.created_at)}</td>
                      <td className="px-4 py-2">{objChanged ? <span>{fromObj} → <b>{toObj}</b></span> : <span className="text-muted-foreground">{toObj}</span>}</td>
                      <td className="px-4 py-2">{asgChanged ? <span>{fromAsg} → <b>{toAsg}</b></span> : <span className="text-muted-foreground">{toAsg}</span>}</td>
                      <td className="px-4 py-2">{stChanged ? <span>{m.from_status ?? "—"} → <b>{m.to_status ?? "—"}</b></span> : <span className="text-muted-foreground">{m.to_status ?? "—"}</span>}</td>
                      <td className="px-4 py-2 text-muted-foreground">{m.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToolFormDialog open={editOpen} tool={tool} onClose={() => setEditOpen(false)} />
      <ToolMoveDialog open={moveOpen} tool={tool} onClose={() => setMoveOpen(false)} />
    </>
  );
}

function Field({ label, value, objectId }: { label: string; value: string; objectId?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1">
        {objectId ? (
          <Link to="/objects/$objectId" params={{ objectId }} className="text-primary hover:underline">{value}</Link>
        ) : value}
      </div>
    </div>
  );
}