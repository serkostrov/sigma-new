import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Layers } from "lucide-react";
import {
  STAGES,
  type SiteObject,
  type ObjectStatus,
  type Stage,
  type StageStatus,
  type Health,
} from "@/lib/demo-data";
import {
  useCreateObject,
  useUpdateObject,
  type ObjectFormInput,
} from "@/lib/objects-api";
import { useCustomers } from "@/lib/customers-api";
import { useUsersByRole } from "@/lib/users-api";
import { useBrigades } from "@/lib/brigades-api";
import { useObjectStatuses, useObjectHealths } from "@/lib/catalogs-api";
import { usePermissions } from "@/lib/permissions";
import {
  useStageTemplates, useObjectStages, useAddDefaultStages,
  useCreateObjectStage, useUpdateObjectStage, useDeleteObjectStage,
} from "@/lib/stages-api";
import { toast } from "sonner";

const STAGE_STATUSES: StageStatus[] = ["Не начат", "В работе", "Готово"];

const empty = (): ObjectFormInput => ({
  name: "",
  address: "",
  customer: "",
  customerId: null,
  responsible: "",
  status: "Заявка",
  foreman: "",
  foremanId: null,
  brigade: "—",
  brigadeId: null,
  deadline: "—",
  progress: 0,
  budget: 0,
  health: "ok",
  risk: false,
  currentStage: STAGES[0],
  stagesStatus: STAGES.reduce(
    (acc, s) => ({ ...acc, [s]: "Не начат" }),
    {} as Record<Stage, StageStatus>,
  ),
});

export function ObjectFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: SiteObject | null;
}) {
  const [form, setForm] = useState<ObjectFormInput>(empty());
  const create = useCreateObject();
  const update = useUpdateObject();
  const isEdit = !!initial;

  const { data: customers } = useCustomers();
  const { users: rops } = useUsersByRole("rop");
  const { users: foremen } = useUsersByRole("foreman");
  const { data: brigades } = useBrigades();
  const { data: statuses = [] } = useObjectStatuses();
  const { data: healths = [] } = useObjectHealths();
  const { canSeeFinances, canCreateObjects, canEditObjects } = usePermissions();
  const { data: templates = [] } = useStageTemplates();
  const { data: objectStages = [] } = useObjectStages(initial?.id);
  const addDefaults = useAddDefaultStages();
  const createStage = useCreateObjectStage();
  const updateStage = useUpdateObjectStage();
  const deleteStage = useDeleteObjectStage();

  const [newStageName, setNewStageName] = useState("");
  const [newStageDays, setNewStageDays] = useState(7);

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : empty());
  }, [open, initial]);

  const set = <K extends keyof ObjectFormInput>(k: K, v: ObjectFormInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Укажите название объекта");
      return;
    }
    if (isEdit && !canEditObjects) {
      toast.error("Нет прав на редактирование объектов");
      return;
    }
    if (!isEdit && !canCreateObjects) {
      toast.error("Нет прав на создание объектов");
      return;
    }
    try {
      if (isEdit && initial) {
        await update.mutateAsync({ ...form, id: initial.id });
        toast.success("Объект обновлён");
      } else {
        await create.mutateAsync(form);
        toast.success("Объект создан");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось сохранить");
    }
  };

  const pending = create.isPending || update.isPending;

  const stageNames = objectStages.map((s) => s.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать объект" : "Новый объект"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Название</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Например: Купчино, Пеники 24" />
          </div>
          <div className="md:col-span-2">
            <Label>Адрес</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <Label>Заказчик</Label>
            <Select
              value={form.customerId ?? "__none__"}
              onValueChange={(v) => {
                if (v === "__none__") {
                  set("customerId", null);
                  set("customer", "");
                } else {
                  const c = (customers ?? []).find((x) => x.id === v);
                  set("customerId", v);
                  set("customer", c?.full_name ?? "");
                }
              }}
            >
              <SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Не выбран —</SelectItem>
                {(customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}{c.phone ? ` · ${c.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(customers ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Добавьте заказчиков в разделе «Заказчики».
              </p>
            )}
          </div>
          <div>
            <Label>Ответственный (РОП)</Label>
            <Select
              value={form.responsible || "__none__"}
              onValueChange={(v) => set("responsible", v === "__none__" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Не выбран —</SelectItem>
                {rops.map((u) => (
                  <SelectItem key={u.id} value={u.label}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rops.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Нет пользователей с ролью «РОП».
              </p>
            )}
          </div>
          <div>
            <Label>Прораб (мастер)</Label>
            <Select
              value={form.foremanId ?? "__none__"}
              onValueChange={(v) => {
                if (v === "__none__") {
                  setForm((f) => ({ ...f, foremanId: null, foreman: "" }));
                } else {
                  const u = foremen.find((x) => x.id === v);
                  setForm((f) => ({ ...f, foremanId: v, foreman: u?.label ?? "" }));
                }
              }}
            >
              <SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Не выбран —</SelectItem>
                {foremen.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {foremen.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Нет пользователей с ролью «Мастер».
              </p>
            )}
          </div>
          <div>
            <Label>Бригада</Label>
            <Select
              value={form.brigadeId ?? "—"}
              onValueChange={(v) => {
                if (v === "—") {
                  setForm((f) => ({ ...f, brigadeId: null, brigade: "—" }));
                } else {
                  const b = (brigades ?? []).find((x) => x.id === v);
                  setForm((f) => ({ ...f, brigadeId: v, brigade: b?.name ?? "—" }));
                }
              }}
            >
              <SelectTrigger><SelectValue placeholder="Не выбрана" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="—">— Не выбрана —</SelectItem>
                {(brigades ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Статус</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as ObjectStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Текущий этап</Label>
            <Select value={form.currentStage} onValueChange={(v) => set("currentStage", v as Stage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(stageNames.length > 0 ? stageNames : (templates.map((t) => t.name)))
                  .map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Срок</Label>
            <Input value={form.deadline} onChange={(e) => set("deadline", e.target.value)} placeholder="дд.мм.гггг" />
          </div>
          <div>
            <Label>Прогресс, %</Label>
            <Input type="number" min={0} max={100} value={form.progress} onChange={(e) => set("progress", Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
          </div>
          {canSeeFinances && (
            <div>
              <Label>Бюджет, ₽</Label>
              <Input type="number" min={0} value={form.budget} onChange={(e) => set("budget", Number(e.target.value) || 0)} />
            </div>
          )}
          <div>
            <Label>Состояние</Label>
            <Select value={form.health} onValueChange={(v) => set("health", v as Health)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {healths.map((h) => <SelectItem key={h.id} value={h.key}>{h.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label className="cursor-pointer">Риск просрочки</Label>
            <Switch checked={form.risk} onCheckedChange={(v) => set("risk", v)} />
          </div>

          <div className="md:col-span-2 mt-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="block">Этапы объекта</Label>
              {isEdit && initial && canEditObjects && (
                <Button
                  type="button" variant="outline" size="sm"
                  disabled={addDefaults.isPending || templates.length === 0}
                  onClick={async () => {
                    try { await addDefaults.mutateAsync(initial.id); toast.success("Этапы по умолчанию добавлены"); }
                    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
                  }}
                >
                  <Layers className="w-4 h-4 mr-1" /> Добавить этапы по умолчанию
                </Button>
              )}
            </div>
            {!isEdit ? (
              <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-3">
                Этапы можно будет добавить после создания объекта — на карточке объекта появится кнопка «Добавить этапы по умолчанию», либо настройте свои в разделе «Настройки».
              </div>
            ) : canEditObjects ? (
              <div className="space-y-2">
                {objectStages.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 border border-border rounded-md px-3 py-2">
                    <span className="w-6 h-6 rounded-full bg-secondary grid place-items-center text-xs font-semibold">{s.sort_order}</span>
                    <span className="flex-1 text-sm truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.duration_days} дн.</span>
                    <Select
                      value={s.status}
                      onValueChange={(v) => updateStage.mutate({ id: s.id, object_id: s.object_id, status: v })}
                    >
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGE_STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button" size="icon" variant="ghost" className="text-destructive h-8 w-8"
                      onClick={() => { if (confirm(`Удалить этап «${s.name}»?`)) deleteStage.mutate({ id: s.id, object_id: s.object_id }); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {objectStages.length === 0 && (
                  <div className="text-xs text-muted-foreground">Этапов пока нет</div>
                )}
                <div className="flex gap-2 items-end pt-2">
                  <div className="flex-1">
                    <Label className="text-xs">Новый этап</Label>
                    <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Название" />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Дней</Label>
                    <Input type="number" min={1} value={newStageDays} onChange={(e) => setNewStageDays(Number(e.target.value) || 1)} />
                  </div>
                  <Button
                    type="button" size="sm"
                    onClick={async () => {
                      if (!newStageName.trim() || !initial) return;
                      const sort_order = (objectStages.at(-1)?.sort_order ?? 0) + 1;
                      try {
                        await createStage.mutateAsync({
                          object_id: initial.id, name: newStageName.trim(),
                          duration_days: newStageDays, sort_order, status: "Не начат",
                          assignee_id: null, notes: "", started_at: null, finished_at: null,
                        });
                        setNewStageName(""); setNewStageDays(7);
                      } catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : objectStages.length > 0 ? (
              <div className="space-y-2">
                {objectStages.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 border border-border rounded-md px-3 py-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-secondary grid place-items-center text-xs font-semibold">{s.sort_order}</span>
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.duration_days} дн. · {s.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Этапов пока нет</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Сохранение…" : isEdit ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}