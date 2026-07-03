import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Download, Trash2, Search, Pencil, Check, X } from "lucide-react";
import { PageHeader } from "@/components/app-layout";
import {
  useDocuments, useDocumentTypes, useDeleteDocument, useUpdateDocumentName,
  getDocumentSignedUrl, formatFileSize,
} from "@/lib/documents-api";
import { useObjects } from "@/lib/objects-api";
import { usePermissions } from "@/lib/permissions";
import { toast } from "sonner";

export const Route = createFileRoute("/documents")({ component: DocumentsPage });

function DocumentsPage() {
  const { canManageDocuments } = usePermissions();
  const { data: objects = [] } = useObjects();
  const { data: types = [] } = useDocumentTypes();
  const [objectFilter, setObjectFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: docs = [] } = useDocuments({
    objectId: objectFilter === "all" ? undefined : objectFilter,
    docType: typeFilter === "all" ? undefined : typeFilter,
  });
  const deleteDoc = useDeleteDocument();
  const updateName = useUpdateDocumentName();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const objectName = (id: string) =>
    objects.find((o: any) => o.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      d.uploaded_by_name.toLowerCase().includes(q),
    );
  }, [docs, search]);

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
    <>
      <PageHeader
        title="Документы"
        description="Все документы по всем объектам"
      />

      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или автору"
            className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-card text-sm"
          />
        </div>
        <select
          value={objectFilter}
          onChange={(e) => setObjectFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-card text-sm min-w-[180px]"
        >
          <option value="all">Все объекты</option>
          {objects.map((o: any) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-card text-sm min-w-[160px]"
        >
          <option value="all">Все типы</option>
          {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-secondary/60 text-xs text-muted-foreground font-medium">
          <div className="col-span-4">Документ</div>
          <div className="col-span-2">Тип</div>
          <div className="col-span-3">Объект</div>
          <div className="col-span-2">Автор</div>
          <div className="col-span-1 text-right">Действия</div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((d) => (
            <div key={d.id} className="px-4 py-3 md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-secondary/40">
              <div className="col-span-4 flex items-center gap-2 min-w-0 group">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  {editingId === d.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && editingName.trim()) {
                            try { await updateName.mutateAsync({ id: d.id, name: editingName.trim() }); setEditingId(null); }
                            catch (err: any) { toast.error(err?.message ?? "Ошибка"); }
                          } else if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-8 px-2 rounded-md border border-border bg-card text-sm w-full"
                      />
                      <button
                        onClick={async () => {
                          if (!editingName.trim()) return;
                          try { await updateName.mutateAsync({ id: d.id, name: editingName.trim() }); setEditingId(null); }
                          catch (err: any) { toast.error(err?.message ?? "Ошибка"); }
                        }}
                        className="p-1.5 rounded-md hover:bg-secondary"
                        aria-label="Сохранить"
                      >
                        <Check className="w-4 h-4 text-primary" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md hover:bg-secondary" aria-label="Отмена">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{d.name}</div>
                      {canManageDocuments && (
                        <button
                          onClick={() => { setEditingId(d.id); setEditingName(d.name); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-secondary transition-opacity"
                          aria-label="Переименовать"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(d.size_bytes)} · {new Date(d.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground mt-1 md:mt-0">{d.doc_type}</div>
              <div className="col-span-3 text-sm text-muted-foreground truncate">
                <Link to="/objects/$objectId" params={{ objectId: d.object_id }} className="hover:text-primary hover:underline">
                  {objectName(d.object_id)}
                </Link>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground truncate">{d.uploaded_by_name || "—"}</div>
              <div className="col-span-1 flex md:justify-end gap-1 mt-2 md:mt-0">
                <button onClick={() => onDownload(d.file_path, d.name)} className="p-2 rounded-md hover:bg-secondary" aria-label="Скачать">
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
          {filtered.length === 0 && (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              Документов нет. Загрузите файлы со страницы объекта.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
