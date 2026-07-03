import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useBrigades,
  useBrigadeMembers,
  useCreateBrigade,
  useUpdateBrigade,
  useDeleteBrigade,
  type Brigade,
} from "@/lib/brigades-api";
import { useUsersByRole } from "@/lib/users-api";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/brigades")({ component: BrigadesPage });

function BrigadesPage() {
  const { canManageBrigades } = usePermissions();
  const { data: brigades, isLoading } = useBrigades();
  const { data: members } = useBrigadeMembers();
  const { users: foremen } = useUsersByRole("foreman");
  const [editing, setEditing] = useState<Brigade | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const del = useDeleteBrigade();

  const memberMap = useMemo(() => {
    const m = new Map<string, string[]>();
    (members ?? []).forEach((row) => {
      const arr = m.get(row.brigade_id) ?? [];
      arr.push(row.user_id);
      m.set(row.brigade_id, arr);
    });
    return m;
  }, [members]);

  const nameOf = (uid: string) =>
    foremen.find((u) => u.id === uid)?.label ?? "—";

  return (
    <div>
      <PageHeader
        title="Бригады"
        description="Бригады мастеров. Участники выбираются из пользователей с ролью «Мастер»."
        actions={
          canManageBrigades ? (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Новая бригада
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full p-10 grid place-items-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (brigades ?? []).length === 0 ? (
          <div className="col-span-full p-10 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl">
            Бригад пока нет
          </div>
        ) : (
          (brigades ?? []).map((b) => {
            const ids = memberMap.get(b.id) ?? [];
            return (
              <div key={b.id} className="bg-card border border-border rounded-xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base">{b.name}</h3>
                    {b.description && (
                      <p className="text-sm text-muted-foreground mt-1">{b.description}</p>
                    )}
                  </div>
                  {canManageBrigades && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(b.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Users className="w-3.5 h-3.5" />
                    Участники: {ids.length}
                  </div>
                  {ids.length ? (
                    <ul className="space-y-1">
                      {ids.map((uid) => (
                        <li key={uid} className="text-sm">{nameOf(uid)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Пусто</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BrigadeDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        initialMemberIds={editing ? memberMap.get(editing.id) ?? [] : []}
        foremen={foremen}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить бригаду?</AlertDialogTitle>
            <AlertDialogDescription>Действие нельзя отменить.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await del.mutateAsync(deleteId);
                  toast.success("Бригада удалена");
                } catch (e: any) {
                  toast.error(e?.message ?? "Не удалось удалить");
                } finally {
                  setDeleteId(null);
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BrigadeDialog({
  open,
  onOpenChange,
  initial,
  initialMemberIds,
  foremen,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Brigade | null;
  initialMemberIds: string[];
  foremen: { id: string; label: string }[];
}) {
  const create = useCreateBrigade();
  const update = useUpdateBrigade();

  return (
    <Dialog open={open} onOpenChange={onOpenChange} key={initial?.id ?? "new"}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Редактировать бригаду" : "Новая бригада"}</DialogTitle>
        </DialogHeader>
        <BrigadeForm
          initial={initial}
          initialMemberIds={initialMemberIds}
          foremen={foremen}
          pending={create.isPending || update.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (f) => {
            try {
              if (initial) {
                await update.mutateAsync({ id: initial.id, ...f });
                toast.success("Бригада обновлена");
              } else {
                await create.mutateAsync(f);
                toast.success("Бригада создана");
              }
              onOpenChange(false);
            } catch (e: any) {
              toast.error(e?.message ?? "Не удалось сохранить");
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function BrigadeForm({
  initial,
  initialMemberIds,
  foremen,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: Brigade | null;
  initialMemberIds: string[];
  foremen: { id: string; label: string }[];
  pending: boolean;
  onSubmit: (v: { name: string; description: string; member_ids: string[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(initialMemberIds);

  const toggle = (id: string) =>
    setMemberIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <div className="space-y-3">
        <div>
          <Label>Название</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Бригада №1" />
        </div>
        <div>
          <Label>Описание</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label className="mb-2 block">Участники (мастера)</Label>
          <div className="border border-border rounded-md max-h-56 overflow-y-auto divide-y divide-border">
            {foremen.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                Нет пользователей с ролью «Мастер». Назначьте роль в разделе «Пользователи».
              </div>
            ) : (
              foremen.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={memberIds.includes(u.id)}
                    onCheckedChange={() => toggle(u.id)}
                  />
                  <span className="text-sm">{u.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button
          disabled={pending || !name.trim()}
          onClick={() => onSubmit({ name: name.trim(), description: description.trim(), member_ids: memberIds })}
        >
          {pending ? "Сохранение…" : initial ? "Сохранить" : "Создать"}
        </Button>
      </DialogFooter>
    </>
  );
}