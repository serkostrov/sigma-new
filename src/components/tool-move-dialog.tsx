import { useEffect, useState } from "react";
import { X, Truck, Building2, Wrench, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { useMoveTool, useToolStatuses, type ToolRow } from "@/lib/tools-api";
import { useObjects } from "@/lib/objects-api";
import { useAllUsers } from "@/lib/users-api";

type Props = {
  open: boolean;
  onClose: () => void;
  tool: ToolRow;
};

const ON_OBJECT = "На объекте";
const FREE = "Свободен";
const IN_REPAIR = "В ремонте";

type Dest = "object" | "repair" | "free";

export function ToolMoveDialog({ open, onClose, tool }: Props) {
  const { data: objects = [] } = useObjects();
  const { users } = useAllUsers();
  const { data: statuses = [] } = useToolStatuses();
  const move = useMoveTool();

  const [objectId, setObjectId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [dest, setDest] = useState<Dest>("object");

  useEffect(() => {
    if (!open) return;
    setObjectId(tool.object_id ?? "");
    setAssigneeId(tool.assignee_id ?? "");
    setNote("");
    setDest(tool.status === IN_REPAIR ? "repair" : "object");
  }, [open, tool]);

  if (!open) return null;

  const statusExists = (n: string) => statuses.some((s) => s.name === n);

  const submit = async () => {
    let newObjectId: string | null = null;
    let newAssignee: string | null = null;
    let status = tool.status;
    let okMsg = "Инструмент перемещён";

    if (dest === "object") {
      if (!objectId) return toast.error("Выберите объект");
      newObjectId = objectId;
      newAssignee = assigneeId || null;
      if (statusExists(ON_OBJECT)) status = ON_OBJECT;
      okMsg = "Инструмент перемещён на объект";
    } else if (dest === "repair") {
      newObjectId = null;
      newAssignee = null;
      if (statusExists(IN_REPAIR)) status = IN_REPAIR;
      okMsg = "Инструмент отправлен в ремонт";
    } else {
      newObjectId = null;
      newAssignee = null;
      if (statusExists(FREE)) status = FREE;
      okMsg = "Инструмент возвращён на склад";
    }

    try {
      await move.mutateAsync({
        id: tool.id,
        object_id: newObjectId,
        assignee_id: newAssignee,
        status,
        note,
      });
      toast.success(okMsg);
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  const destOptions: { key: Dest; label: string; icon: typeof Truck }[] = [
    { key: "object", label: "На объект", icon: Building2 },
    { key: "repair", label: "В ремонт", icon: Wrench },
    { key: "free", label: "На склад", icon: PackageOpen },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold flex items-center gap-2"><Truck className="w-4 h-4" /> Переместить инструмент</div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Куда</div>
            <div className="grid grid-cols-3 gap-2">
              {destOptions.map((o) => {
                const Icon = o.icon;
                const active = dest === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setDest(o.key)}
                    className={`h-16 rounded-md border text-xs font-medium flex flex-col items-center justify-center gap-1 transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {dest === "object" && (
            <>
              <label className="block">
                <div className="text-xs text-muted-foreground mb-1">Объект</div>
                <select value={objectId} onChange={(e) => setObjectId(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
                  <option value="">— Не выбран —</option>
                  {objects.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>
              <label className="block">
                <div className="text-xs text-muted-foreground mb-1">Ответственный</div>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
                  <option value="">—</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </select>
              </label>
            </>
          )}

          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Комментарий</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={dest === "repair" ? "Например: не запускается, передан в сервис" : "Например: выдал прорабу под подпись"}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
          </label>
          <div className="text-xs text-muted-foreground">
            Статус изменится автоматически: «{ON_OBJECT}», «{IN_REPAIR}» или «{FREE}».
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 h-10 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary">Отмена</button>
          <button onClick={submit} disabled={move.isPending || (dest === "object" && !objectId)} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            Переместить
          </button>
        </div>
      </div>
    </div>
  );
}