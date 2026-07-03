import { createFileRoute } from "@tanstack/react-router";
import { Plus, CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { PageHeader } from "@/components/app-layout";
import { PhotoUploadDialog } from "@/components/photo-upload-dialog";
import { PhotoGrid } from "@/components/photo-grid";
import { usePhotos } from "@/lib/photos-api";
import { useAuth } from "@/lib/auth-context";
import { useObjects } from "@/lib/objects-api";
import { useTasks } from "@/lib/tasks-api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { usePermissions } from "@/lib/permissions";
import { FilterBar, FilterSelect, FILTER_ALL } from "@/components/filter-bar";

export const Route = createFileRoute("/photos")({ component: PhotosPage });

function PhotosPage() {
  const { canCreatePhotos } = usePermissions();
  const { data: photos = [] } = usePhotos();
  const { data: objects = [] } = useObjects();
  const { data: tasks = [] } = useTasks();
  const { displayName } = useAuth();
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [objectId, setObjectId] = useState<string>(FILTER_ALL);
  const [author, setAuthor] = useState<string>(FILTER_ALL);
  const [taskId, setTaskId] = useState<string>(FILTER_ALL);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const visible = photos.filter((p) => (p.images?.length ?? 0) > 0);

  const authors = useMemo(
    () => Array.from(new Set(visible.map((p) => p.author).filter(Boolean))).sort(),
    [visible],
  );

  const filteredTasks = useMemo(
    () => (objectId === FILTER_ALL ? tasks : tasks.filter((t) => t.object_id === objectId)),
    [tasks, objectId],
  );

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateRange?.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : null;
    const to = dateRange?.to
      ? new Date(dateRange.to).setHours(23, 59, 59, 999)
      : dateRange?.from
        ? new Date(dateRange.from).setHours(23, 59, 59, 999)
        : null;
    return visible.filter((p) => {
      if (objectId !== FILTER_ALL && p.objectId !== objectId) return false;
      if (author !== FILTER_ALL && p.author !== author) return false;
      if (taskId !== FILTER_ALL && p.taskId !== taskId) return false;
      if (from !== null && to !== null) {
        const t = new Date(p.createdAt).getTime();
        if (t < from || t > to) return false;
      }
      if (q) {
        const obj = objects.find((o) => o.id === p.objectId)?.name ?? "";
        const task = tasks.find((t) => t.id === p.taskId)?.title ?? "";
        const hay = `${p.note} ${p.author} ${obj} ${task}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visible, search, objectId, author, taskId, dateRange, objects, tasks]);

  const activeFiltersCount =
    (objectId !== FILTER_ALL ? 1 : 0) +
    (author !== FILTER_ALL ? 1 : 0) +
    (taskId !== FILTER_ALL ? 1 : 0) +
    (dateRange?.from ? 1 : 0);

  const resetFilters = () => {
    setObjectId(FILTER_ALL);
    setAuthor(FILTER_ALL);
    setTaskId(FILTER_ALL);
    setDateRange(undefined);
  };

  return (
    <>
      <PageHeader
        title="Фотоотчеты"
        description="Фотоотчеты с объектов от бригад и прорабов"
        actions={
          canCreatePhotos ? (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Добавить фотоотчет
            </button>
          ) : null
        }
      />
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Поиск по описанию, автору, объекту, задаче"
        filters={
          <>
            <FilterSelect
              value={objectId}
              onChange={(v) => { setObjectId(v); setTaskId(FILTER_ALL); }}
              placeholder="Объект"
              options={objects.map((o) => ({ value: o.id, label: o.name }))}
            />
            <FilterSelect
              value={author}
              onChange={setAuthor}
              placeholder="Автор"
              options={authors}
            />
            <FilterSelect
              value={taskId}
              onChange={setTaskId}
              placeholder="Задача"
              options={filteredTasks.map((t) => ({ value: t.id, label: t.title }))}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full sm:w-[200px] justify-start text-left font-normal text-sm",
                    !dateRange?.from && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>{format(dateRange.from, "d MMM", { locale: ru })} — {format(dateRange.to, "d MMM", { locale: ru })}</>
                    ) : (
                      format(dateRange.from, "d MMM yyyy", { locale: ru })
                    )
                  ) : (
                    <span>Период</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ru}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </>
        }
        activeFiltersCount={activeFiltersCount}
        onReset={resetFilters}
      />
      <PhotoGrid photos={list} empty="Фотоотчетов пока нет" />
      <PhotoUploadDialog
        open={open}
        onClose={() => setOpen(false)}
        author={displayName || "Пользователь"}
      />
    </>
  );
}