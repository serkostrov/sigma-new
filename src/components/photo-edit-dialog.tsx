import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, X, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdatePhoto, type PhotoReport } from "@/lib/photos-api";

export function PhotoEditDialog({
  open,
  onClose,
  photo,
}: {
  open: boolean;
  onClose: () => void;
  photo: PhotoReport;
}) {
  const update = useUpdatePhoto();
  const [note, setNote] = useState(photo.note);
  // existing photos: parallel arrays of paths + signed urls
  const initialExisting = useMemo(
    () => photo.imagePaths.map((path, i) => ({ path, url: photo.images[i] ?? "" })),
    [photo],
  );
  const [existing, setExisting] = useState(initialExisting);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNote(photo.note);
      setExisting(initialExisting);
      setRemovedPaths([]);
      setNewFiles([]);
      setNewPreviews([]);
    }
  }, [open, photo, initialExisting]);

  useEffect(() => {
    return () => {
      newPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const onFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const urls = arr.map((f) => URL.createObjectURL(f));
    setNewFiles((prev) => [...prev, ...arr]);
    setNewPreviews((prev) => [...prev, ...urls]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeExisting = (path: string) => {
    setExisting((prev) => prev.filter((e) => e.path !== path));
    setRemovedPaths((prev) => [...prev, path]);
  };

  const removeNew = (i: number) => {
    setNewFiles((prev) => prev.filter((_, j) => j !== i));
    setNewPreviews((prev) => {
      const url = prev[i];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, j) => j !== i);
    });
  };

  const totalCount = existing.length + newFiles.length;

  const submit = async () => {
    if (totalCount < 1) {
      toast.error("В фотоотчёте должно быть хотя бы одно фото");
      return;
    }
    try {
      await update.mutateAsync({
        id: photo.id,
        objectId: photo.objectId,
        note: note.trim(),
        keepPaths: existing.map((e) => e.path),
        removePaths: removedPaths,
        newFiles,
      });
      toast.success("Фотоотчёт обновлён");
      newPreviews.forEach((u) => URL.revokeObjectURL(u));
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось сохранить");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/50 p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-border max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <div className="font-semibold">Редактировать фотоотчёт</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary" aria-label="Закрыть">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs text-muted-foreground">Название</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Название фотоотчёта"
              className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Фотографии <span className="text-foreground">· {totalCount}</span>
            </div>
            {(existing.length > 0 || newPreviews.length > 0) && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {existing.map((e) => (
                  <div key={e.path} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    <img src={e.url} alt="Фото" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExisting(e.path)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {newPreviews.map((src, i) => (
                  <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-primary/40 group">
                    <img src={src} alt={`Новое фото ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNew(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              className="w-full h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-secondary/40 transition grid place-items-center text-sm text-muted-foreground"
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="w-5 h-5" />
                <span>Добавить ещё фото</span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-5 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            disabled={update.isPending}
            className="flex-1 h-11 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={update.isPending || totalCount < 1}
            className="flex-[2] h-11 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {update.isPending ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}