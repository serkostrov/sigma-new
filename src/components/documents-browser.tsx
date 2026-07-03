import { useMemo, useState } from "react";
import {
  FolderPlus, Upload, Folder, FileText, ChevronRight, Download, Trash2, Home, Pencil, Check, X,
} from "lucide-react";
import {
  useDocumentFolders, useDocuments, useCreateDocumentFolder, useDeleteDocumentFolder,
  useDeleteDocument, useDocumentTypes, useUpdateDocumentName, getDocumentSignedUrl, formatFileSize,
  type DocumentFolder, type DocumentRow,
} from "@/lib/documents-api";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/permissions";
import { DocumentUploadDialog } from "@/components/document-upload-dialog";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DocumentsBrowser({ objectId }: { objectId: string }) {
  const { user } = useAuth();
  const { canManageDocuments } = usePermissions();
  const { data: folders = [] } = useDocumentFolders(objectId);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { data: types = [] } = useDocumentTypes();
  const { data: docs = [] } = useDocuments({
    objectId,
    folderId: currentFolderId,
    docType: typeFilter === "all" ? undefined : typeFilter,
  });
  const createFolder = useCreateDocumentFolder();
  const deleteFolder = useDeleteDocumentFolder();
  const deleteDoc = useDeleteDocument();
  const updateDocName = useUpdateDocumentName();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const subFolders = useMemo(
    () => folders.filter((f) => f.parent_id === currentFolderId),
    [folders, currentFolderId],
  );

  const breadcrumbs = useMemo(() => {
    const result: DocumentFolder[] = [];
    let cur = folders.find((f) => f.id === currentFolderId) ?? null;
    while (cur) {
      result.unshift(cur);
      cur = cur.parent_id ? folders.find((f) => f.id === cur!.parent_id) ?? null : null;
    }
    return result;
  }, [folders, currentFolderId]);

  const submitCreateFolder = async () => {
    const name = folderName.trim();
    if (!name) return;
    try {
      await createFolder.mutateAsync({
        object_id: objectId,
        parent_id: currentFolderId,
        name,
        created_by: user?.id ?? null,
      });
      toast.success("Папка создана");
      setFolderName("");
      setFolderDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось создать");
    }
  };

  const onDownload = async (path: string, name: string) => {
    try {
      const url = await getDocumentSignedUrl(path);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка скачивания");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-1 text-sm flex-wrap min-w-0">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary text-muted-foreground"
          >
            <Home className="w-3.5 h-3.5" /> Корень
          </button>
          {breadcrumbs.map((b) => (
            <span key={b.id} className="inline-flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <button
                onClick={() => setCurrentFolderId(b.id)}
                className="px-2 py-1 rounded hover:bg-secondary"
              >
                {b.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-card text-sm"
          >
            <option value="all">Все типы</option>
            {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          {canManageDocuments && (
            <>
              <button
                onClick={() => { setFolderName(""); setFolderDialogOpen(true); }}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-card border border-border text-sm font-medium hover:bg-secondary"
              >
                <FolderPlus className="w-4 h-4" /> Папка
              </button>
              <button
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                <Upload className="w-4 h-4" /> Загрузить
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {subFolders.map((f) => (
          <div key={f.id} className="p-3 border border-border rounded-lg flex items-center justify-between gap-3 hover:border-primary/40 hover:shadow-sm transition-all">
            <button
              onClick={() => setCurrentFolderId(f.id)}
              className="flex items-center gap-3 min-w-0 flex-1 text-left"
            >
              <Folder className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{f.name}</div>
                <div className="text-xs text-muted-foreground">Папка</div>
              </div>
            </button>
            {(canManageDocuments) && (
              <button
                onClick={async () => {
                  if (!window.confirm(`Удалить папку «${f.name}»? Документы внутри будут перемещены в корень.`)) return;
                  try { await deleteFolder.mutateAsync(f.id); toast.success("Папка удалена"); }
                  catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
                }}
                className="p-2 rounded-md hover:bg-destructive/10 text-destructive"
                aria-label="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {docs.map((d) => (
          <div key={d.id} className="group p-3 border border-border rounded-lg flex items-center justify-between gap-3 hover:border-primary/40 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                {editingDocId === d.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          const name = editingName.trim();
                          if (!name) return;
                          try {
                            await updateDocName.mutateAsync({ id: d.id, name });
                            toast.success("Название обновлено");
                            setEditingDocId(null);
                          } catch (err: any) {
                            toast.error(err?.message ?? "Ошибка");
                          }
                        } else if (e.key === "Escape") {
                          setEditingDocId(null);
                        }
                      }}
                      className="h-8 text-sm"
                    />
                    <button
                      onClick={async () => {
                        const name = editingName.trim();
                        if (!name) return;
                        try {
                          await updateDocName.mutateAsync({ id: d.id, name });
                          toast.success("Название обновлено");
                          setEditingDocId(null);
                        } catch (err: any) {
                          toast.error(err?.message ?? "Ошибка");
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-green-100 text-green-600"
                      aria-label="Сохранить"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingDocId(null)}
                      className="p-1.5 rounded-md hover:bg-red-100 text-red-600"
                      aria-label="Отменить"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{d.name}</div>
                    {canManageDocuments && (
                      <button
                        onClick={() => {
                          setEditingDocId(d.id);
                          setEditingName(d.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-secondary text-muted-foreground transition-opacity"
                        aria-label="Редактировать название"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {d.doc_type} · {formatFileSize(d.size_bytes)} · {d.uploaded_by_name || "—"} · {new Date(d.created_at).toLocaleDateString("ru-RU")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onDownload(d.file_path, d.name)}
                className="p-2 rounded-md hover:bg-secondary"
                aria-label="Скачать"
              >
                <Download className="w-4 h-4" />
              </button>
              {canManageDocuments && (
                <button
                  onClick={async () => {
                    if (!window.confirm(`Удалить «${d.name}»?`)) return;
                    try { await deleteDoc.mutateAsync({ id: d.id, file_path: d.file_path }); toast.success("Удалено"); }
                    catch (e: any) { toast.error(e?.message ?? "Ошибка"); }
                  }}
                  className="p-2 rounded-md hover:bg-destructive/10 text-destructive"
                  aria-label="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {subFolders.length === 0 && docs.length === 0 && (
          <div className="border border-dashed border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
            Здесь пока пусто. Создайте папку или загрузите документ.
          </div>
        )}
      </div>

      <DocumentUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        objectId={objectId}
        folderId={currentFolderId}
      />

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новая папка</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Название папки</label>
            <Input
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitCreateFolder(); }}
              placeholder="Например, Договоры"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>Отмена</Button>
            <Button onClick={submitCreateFolder} disabled={!folderName.trim() || createFolder.isPending}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}