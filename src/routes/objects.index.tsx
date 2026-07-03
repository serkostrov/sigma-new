import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, AlertTriangle, ListChecks, Camera, MapPin, User2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-layout";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney, HEALTH_LABEL, type SiteObject } from "@/lib/demo-data";
import { useData } from "@/lib/data-store";
import { usePhotos } from "@/lib/photos-api";
import { usePermissions } from "@/lib/permissions";
import { useObjects, useDeleteObject } from "@/lib/objects-api";
import { useStageTemplates } from "@/lib/stages-api";
import { ObjectFormDialog } from "@/components/object-form-dialog";
import { FilterBar, FilterSelect, FILTER_ALL } from "@/components/filter-bar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/objects/")({ component: ObjectsPage });
const ANY = FILTER_ALL;

function ObjectsPage() {
  const { isForeman, canCreateObjects, canEditObjects, canDeleteObjects, canSeeFinances } = usePermissions();
  const { tasks } = useData();
  const { data: photos = [] } = usePhotos();
  const { data: objects = [], isLoading } = useObjects();
  const del = useDeleteObject();
  const { data: stageTemplates = [] } = useStageTemplates();

  const [q, setQ] = useState("");
  const [fResp, setFResp] = useState(ANY);
  const [fStatus, setFStatus] = useState(ANY);
  const [fStage, setFStage] = useState(ANY);
  const [fForeman, setFForeman] = useState(ANY);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SiteObject | null>(null);
  const [toDelete, setToDelete] = useState<SiteObject | null>(null);

  const canCreate = canCreateObjects;
  const canEdit = canEditObjects;

  const responsibles = useMemo(() => Array.from(new Set(objects.map((o) => o.responsible).filter(Boolean))), [objects]);
  const foremans = useMemo(() => Array.from(new Set(objects.map((o) => o.foreman).filter(Boolean))), [objects]);
  const statuses = useMemo(() => Array.from(new Set(objects.map((o) => o.status))), [objects]);
  const stageOptions = useMemo(() => {
    const fromTpl = stageTemplates.map((t) => t.name);
    const fromObjs = objects.map((o) => o.currentStage).filter(Boolean);
    return Array.from(new Set([...fromTpl, ...fromObjs]));
  }, [stageTemplates, objects]);

  const filtered = objects.filter((o) => {
    const matchQ = !q || o.name.toLowerCase().includes(q.toLowerCase()) || o.address.toLowerCase().includes(q.toLowerCase());
    const matchResp = fResp === ANY || o.responsible === fResp;
    const matchStatus = fStatus === ANY || o.status === fStatus;
    const matchStage = fStage === ANY || o.currentStage === fStage;
    const matchForeman = fForeman === ANY || o.foreman === fForeman;
    return matchQ && matchResp && matchStatus && matchStage && matchForeman;
  });

  const activeFilters = [fResp, fStatus, fStage, fForeman].filter((v) => v !== ANY).length;
  const resetFilters = () => { setFResp(ANY); setFStatus(ANY); setFStage(ANY); setFForeman(ANY); };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success("Объект удалён");
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось удалить");
    } finally {
      setToDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title={isForeman ? "Мои объекты" : "Объекты"}
        description={
          isForeman
            ? "Объекты, закреплённые за вами"
            : "Все строительные объекты компании"
        }
        actions={
          canCreate ? (
            <button
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Создать объект
            </button>
          ) : null
        }
      />

      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Поиск по названию или адресу"
        filters={
          <>
            <FilterSelect value={fResp} onChange={setFResp} placeholder="Ответственный" options={responsibles} />
            <FilterSelect value={fStatus} onChange={setFStatus} placeholder="Статус" options={statuses} />
            <FilterSelect value={fStage} onChange={setFStage} placeholder="Этап" options={stageOptions} />
            <FilterSelect value={fForeman} onChange={setFForeman} placeholder="Прораб" options={foremans} />
          </>
        }
        activeFiltersCount={activeFilters}
        onReset={resetFilters}
      />

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          Загрузка объектов…
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((o) => {
          const taskCount = tasks.filter((t) => t.objectId === o.id).length;
          const lastPhoto = photos.find((p) => p.objectId === o.id);
          const healthLabel = HEALTH_LABEL[o.health];
          return (
            <div key={o.id} className="relative group">
            <Link
              to="/objects/$objectId"
              params={{ objectId: o.id }}
              className="block bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/40 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold group-hover:text-primary truncate">{o.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> <span className="truncate">{o.address}</span>
                  </div>
                </div>
                <StatusBadge value={o.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-muted-foreground">Заказчик</span>
                <span className="text-right truncate">{o.customer}</span>
                <span className="text-muted-foreground">Ответственный</span>
                <span className="text-right truncate">{o.responsible}</span>
                <span className="text-muted-foreground">Срок</span>
                <span className="text-right">{o.deadline}</span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Прогресс</span>
                  <span className="font-medium">{o.progress}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${o.progress}%` }} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="w-3.5 h-3.5" /> {taskCount} задач
                </span>
                <span className="inline-flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  {lastPhoto ? lastPhoto.date : "нет фото"}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                {canSeeFinances ? (
                  <div>
                    <div className="text-xs text-muted-foreground">Смета</div>
                    <div className="font-semibold">{o.budget ? formatMoney(o.budget) : "—"}</div>
                  </div>
                ) : (
                  <div />
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${
                    o.health === "ok"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : o.health === "questions"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {o.health !== "ok" && <AlertTriangle className="w-3 h-3" />}
                  {healthLabel}
                </span>
              </div>
            </Link>
            {(canEdit || canDeleteObjects) && (
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.preventDefault()}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-background/80 backdrop-blur border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => { setEditing(o); setFormOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Редактировать
                      </DropdownMenuItem>
                    )}
                    {canDeleteObjects && (
                      <DropdownMenuItem onClick={() => setToDelete(o)} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Удалить
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            </div>
          );
        })}
      </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          <User2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Объекты не найдены
        </div>
      )}

      <ObjectFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить объект?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.name} — действие необратимо. Связанные задачи и фотоотчёты останутся в системе.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}