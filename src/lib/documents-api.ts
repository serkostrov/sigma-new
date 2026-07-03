import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DOCUMENTS_BUCKET = "documents";

export type DocumentFolder = {
  id: string;
  object_id: string;
  parent_id: string | null;
  name: string;
  created_by: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  object_id: string;
  folder_id: string | null;
  name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  doc_type: string;
  uploaded_by: string | null;
  uploaded_by_name: string;
  created_at: string;
};

export type DocumentType = {
  id: string;
  name: string;
  sort_order: number;
};

// ---------- Document types catalog ----------

export function useDocumentTypes() {
  return useQuery({
    queryKey: ["document_types"],
    queryFn: async (): Promise<DocumentType[]> => {
      const { data, error } = await (supabase as any)
        .from("document_types")
        .select("id,name,sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DocumentType[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; sort_order?: number }) => {
      const { data, error } = await (supabase as any)
        .from("document_types")
        .insert({ name: input.name, sort_order: input.sort_order ?? 100 })
        .select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document_types"] }),
  });
}

export function useUpdateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; sort_order?: number }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any)
        .from("document_types").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document_types"] }),
  });
}

export function useDeleteDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("document_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["document_types"] }),
  });
}

// ---------- Folders ----------

export function useDocumentFolders(objectId?: string) {
  return useQuery({
    queryKey: ["document_folders", objectId ?? "all"],
    queryFn: async (): Promise<DocumentFolder[]> => {
      let q = (supabase as any).from("document_folders").select("*");
      if (objectId) q = q.eq("object_id", objectId);
      const { data, error } = await q.order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DocumentFolder[];
    },
  });
}

export function useCreateDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      object_id: string;
      parent_id: string | null;
      name: string;
      created_by: string | null;
    }) => {
      const { data, error } = await (supabase as any)
        .from("document_folders").insert(input).select("*").single();
      if (error) throw error;
      return data as DocumentFolder;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["document_folders", vars.object_id] });
      qc.invalidateQueries({ queryKey: ["document_folders", "all"] });
    },
  });
}

export function useDeleteDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("document_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_folders"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// ---------- Documents ----------

export function useDocuments(filter?: {
  objectId?: string;
  folderId?: string | null; // null = root, undefined = no folder filter
  docType?: string;
}) {
  const key = ["documents", filter?.objectId ?? "all", filter?.folderId === undefined ? "any" : String(filter.folderId), filter?.docType ?? "any"];
  return useQuery({
    queryKey: key,
    queryFn: async (): Promise<DocumentRow[]> => {
      let q = (supabase as any).from("documents").select("*");
      if (filter?.objectId) q = q.eq("object_id", filter.objectId);
      if (filter?.folderId !== undefined) {
        if (filter.folderId === null) q = q.is("folder_id", null);
        else q = q.eq("folder_id", filter.folderId);
      }
      if (filter?.docType) q = q.eq("doc_type", filter.docType);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });
}

export async function getDocumentSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      object_id: string;
      folder_id: string | null;
      doc_type: string;
      file: File;
      uploaded_by: string | null;
      uploaded_by_name: string;
    }) => {
      const ext = input.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${input.object_id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, input.file, {
          contentType: input.file.type || undefined,
          upsert: false,
        });
      if (upErr) throw upErr;
      const { data, error } = await (supabase as any)
        .from("documents")
        .insert({
          object_id: input.object_id,
          folder_id: input.folder_id,
          name: input.file.name,
          file_path: path,
          mime_type: input.file.type || "",
          size_bytes: input.file.size,
          doc_type: input.doc_type,
          uploaded_by: input.uploaded_by,
          uploaded_by_name: input.uploaded_by_name,
        })
        .select("*").single();
      if (error) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]).catch(() => {});
        throw error;
      }
      return data as DocumentRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; file_path: string }) => {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([input.file_path]).catch(() => {});
      const { error } = await (supabase as any)
        .from("documents").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useUpdateDocumentName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await (supabase as any)
        .from("documents").update({ name: input.name }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}