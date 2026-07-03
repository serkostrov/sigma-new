import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useObjects } from "@/lib/objects-api";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  type Customer,
} from "@/lib/customers-api";
import { Phone, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/customers")({ component: CustomersPage });

function CustomersPage() {
  const { canManageCustomers } = usePermissions();
  const { data: customers, isLoading } = useCustomers();
  const { data: objects } = useObjects();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const del = useDeleteCustomer();

  const objectsByCustomerId = new Map<string, string[]>();
  (objects ?? []).forEach((o) => {
    const cid = (o as any).customer_id as string | undefined;
    if (!cid) return;
    const arr = objectsByCustomerId.get(cid) ?? [];
    arr.push(o.name);
    objectsByCustomerId.set(cid, arr);
  });

  return (
    <div>
      <PageHeader
        title="Заказчики"
        description="Справочник заказчиков. Выбирается при создании объекта."
        actions={
          canManageCustomers ? (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Новый заказчик
            </Button>
          ) : undefined
        }
      />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.2fr_180px_1.5fr_120px] gap-4 px-5 py-3 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div>ФИО</div>
          <div>Телефон</div>
          <div>Объекты</div>
          <div className="text-right">Действия</div>
        </div>

        {isLoading ? (
          <div className="p-10 grid place-items-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (customers ?? []).length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            Заказчиков пока нет
          </div>
        ) : (
          (customers ?? []).map((c) => {
            const objs = objectsByCustomerId.get(c.id) ?? [];
            return (
              <div
                key={c.id}
                className="md:grid md:grid-cols-[1.2fr_180px_1.5fr_120px] gap-4 px-5 py-4 border-t border-border items-center"
              >
                <div className="font-medium text-sm">{c.full_name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  {c.phone ? (
                    <>
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${c.phone}`} className="hover:text-foreground">{c.phone}</a>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {objs.length ? objs.join(", ") : "—"}
                </div>
                <div className="flex md:justify-end gap-2 mt-2 md:mt-0">
                  {canManageCustomers && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CustomerDialog open={open} onOpenChange={setOpen} initial={editing} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заказчика?</AlertDialogTitle>
            <AlertDialogDescription>
              Действие нельзя отменить. Связь с объектами будет очищена.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await del.mutateAsync(deleteId);
                  toast.success("Заказчик удалён");
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

function CustomerDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Customer | null;
}) {
  const create = useCreateCustomer();
  const update = useUpdateCustomer();

  return (
    <Dialog open={open} onOpenChange={onOpenChange} key={initial?.id ?? "new"}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Редактировать заказчика" : "Новый заказчик"}</DialogTitle>
        </DialogHeader>
        <CustomerForm
          initial={initial}
          onSubmit={async (f) => {
            try {
              if (initial) {
                await update.mutateAsync({ id: initial.id, ...f });
                toast.success("Заказчик обновлён");
              } else {
                await create.mutateAsync(f);
                toast.success("Заказчик создан");
              }
              onOpenChange(false);
            } catch (e: any) {
              toast.error(e?.message ?? "Не удалось сохранить");
            }
          }}
          pending={create.isPending || update.isPending}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CustomerForm({
  initial,
  onSubmit,
  pending,
  onCancel,
}: {
  initial: Customer | null;
  onSubmit: (v: { full_name: string; phone: string; notes: string }) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <>
      <div className="space-y-3">
        <div>
          <Label>ФИО</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" />
        </div>
        <div>
          <Label>Телефон</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
        </div>
        <div>
          <Label>Комментарий</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button
          disabled={pending || !fullName.trim()}
          onClick={() => onSubmit({ full_name: fullName.trim(), phone: phone.trim(), notes: notes.trim() })}
        >
          {pending ? "Сохранение…" : initial ? "Сохранить" : "Создать"}
        </Button>
      </DialogFooter>
    </>
  );
}