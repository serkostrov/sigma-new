import { useEffect, useRef, useState } from "react";
import { Camera, X, Upload, Trash2, Loader2 } from "lucide-react";
import { OBJECTS, FOREMAN_NAME } from "@/lib/demo-data";
import { useAddPhoto } from "@/lib/photos-api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useObjects } from "@/lib/objects-api";
import { useTasks } from "@/lib/tasks-api";

export function PhotoUploadDialog({
  open,
  onClose,
  defaultObjectId,
  defaultTaskId,
  defaultStageId,
  lockObject,
  lockTask,
  objectLabel,
  tasksOverride,
  author = FOREMAN_NAME,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  defaultObjectId?: string;
  defaultTaskId?: string;
  defaultStageId?: string;
  lockObject?: boolean;
  lockTask?: boolean;
  objectLabel?: string;
  tasksOverride?: { id: string; title: string }[];
  author?: string;
  onSubmitted?: (data: { note: string; images: string[]; taskId?: string }) => void;
}) {
  const addPhoto = useAddPhoto();
  const { user } = useAuth();
  const { data: dbObjects = [] } = useObjects();
  const objectList = dbObjects.length > 0
    ? dbObjects.map((o: any) => ({ id: o.id, name: o.name }))
    : OBJECTS.map((o) => ({ id: o.id, name: o.name }));
  const [objectId, setObjectId] = useState(defaultObjectId ?? objectList[0]?.id ?? "");
  const { data: dbTasksForObj = [] } = useTasks({ objectId });
  const [taskId, setTaskId] = useState(defaultTaskId ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const objectTasks = tasksOverride
    ?? dbTasksForObj.map((t: any) => ({ id: t.id, title: t.title }));

  const onFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const urls = arr.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...arr]);
    setPreviews((prev) => [...prev, ...urls]);
    if (inputRef.current) inputRef.current.value = "";
  };
  const removeAt = (i: number) => {
    setFiles((prev) => prev.filter((_, j) => j !== i));
    setPreviews((prev) => {
      const url = prev[i];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, j) => j !== i);
    });
  };

  const submit = async () => {
    if (files.length < 1 || addPhoto.isPending) return;
    const noteText = note.trim();
    const effectiveTaskId = taskId || defaultTaskId || undefined;
    try {
      await addPhoto.mutateAsync({
        objectId,
        taskId: effectiveTaskId ?? null,
        stageId: defaultStageId ?? null,
        author,
        authorId: user?.id ?? null,
        note: noteText || "Фотоотчет",
        files,
      });
      onSubmitted?.({ note: noteText, images: [], taskId: effectiveTaskId });
      setDone(true);
      setTimeout(() => {
        previews.forEach((url) => URL.revokeObjectURL(url));
        setDone(false);
        setNote("");
        setFiles([]);
        setPreviews([]);
        onClose();
      }, 900);
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось загрузить фото");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/50 p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-border max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <div className="font-semibold">Добавить фотоотчет</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary" aria-label="Закрыть">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center mx-auto text-2xl">✓</div>
            <div className="mt-3 font-semibold">Фотоотчет отправлен</div>
            <div className="text-sm text-muted-foreground mt-1">Руководитель увидит его в карточке объекта</div>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4 overflow-y-auto">
              {lockObject ? (
                <div>
                  <label className="text-xs text-muted-foreground">Объект</label>
                  <div className="mt-1 h-10 px-3 rounded-md border border-border bg-secondary/40 text-sm flex items-center">
                    {objectLabel ?? objectList.find((o) => o.id === objectId)?.name ?? "—"}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-muted-foreground">Объект</label>
                  <select
                    value={objectId}
                    onChange={(e) => { setObjectId(e.target.value); setTaskId(""); }}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
                  >
                    {objectList.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!lockTask && (
                <div>
                  <label className="text-xs text-muted-foreground">Задача (необязательно)</label>
                  <select
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
                  >
                    <option value="">— без привязки —</option>
                    {objectTasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-2">
                  Фотографии {files.length > 0 && <span className="text-foreground">· {files.length}</span>}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-secondary/40 transition grid place-items-center text-sm text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5" />
                    <span>Нажмите, чтобы выбрать фото (можно несколько)</span>
                  </div>
                </button>
                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                        <img src={src} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAt(i)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition"
                          aria-label="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Комментарий</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Что сделано, замечания..."
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={onClose} disabled={addPhoto.isPending} className="flex-1 h-11 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-50">
                Отмена
              </button>
              <button
                onClick={submit}
                disabled={files.length < 1 || addPhoto.isPending}
                className="flex-[2] h-11 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {addPhoto.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {addPhoto.isPending
                  ? "Загрузка..."
                  : files.length > 0
                    ? `Отправить (${files.length} фото)`
                    : "Добавьте фото"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}