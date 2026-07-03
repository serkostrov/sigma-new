import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDocumentTypes, useUploadDocument, formatFileSize } from "@/lib/documents-api";
import { toast } from "sonner";

export function DocumentUploadDialog({
  open,
  onClose,
  objectId,
  folderId,
}: {
  open: boolean;
  onClose: () => void;
  objectId: string;
  folderId: string | null;
}) {
  const { user, displayName } = useAuth();
  const { data: types = [] } = useDocumentTypes();
  const upload = useUploadDocument();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>("");

  useEffect(() => {
    if (open && !docType && types.length > 0) {
      const def = types.find((t) => t.name === "Прочее") ?? types[0];
      setDocType(def.name);
    }
  }, [open, types, docType]);

  if (!open) return null;

  const submit = async () => {
    if (!file || !docType || upload.isPending) return;
    try {
      await upload.mutateAsync({
        object_id: objectId,
        folder_id: folderId,
        doc_type: docType,
        file,
        uploaded_by: user?.id ?? null,
        uploaded_by_name: displayName || user?.email || "—",
      });
      toast.success("Документ загружен");
      setFile(null);
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось загрузить");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/50 p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <div className="font-semibold">Загрузить документ</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Тип документа</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
            >
              {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Файл</label>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-1 w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-secondary/40 transition grid place-items-center text-sm text-muted-foreground"
            >
              {file ? (
                <div className="text-center">
                  <div className="font-medium text-foreground truncate max-w-[260px]">{file.name}</div>
                  <div className="text-xs">{formatFileSize(file.size)}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5" />
                  <span>Выберите файл</span>
                </div>
              )}
            </button>
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-2">
          <button onClick={onClose} disabled={upload.isPending} className="flex-1 h-11 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary disabled:opacity-50">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={!file || upload.isPending}
            className="flex-[2] h-11 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {upload.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {upload.isPending ? "Загрузка..." : "Загрузить"}
          </button>
        </div>
      </div>
    </div>
  );
}