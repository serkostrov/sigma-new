import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PHOTOS_BUCKET = "photos";

export const PHOTO_REVIEW_PENDING = "Не проверен";
export const PHOTO_REVIEW_APPROVED = "Проверен";
export const PHOTO_REVIEW_REJECTED = "Есть замечание";

export type PhotoReviewStatus =
  | typeof PHOTO_REVIEW_PENDING
  | typeof PHOTO_REVIEW_APPROVED
  | typeof PHOTO_REVIEW_REJECTED;

export type PhotoReport = {
  id: string;
  objectId: string;
  taskId: string | null;
  stageId: string | null;
  author: string;
  authorId: string | null;
  note: string;
  date: string;
  createdAt: string;
  count: number;
  images: string[];
  imagePaths: string[];
  thumb: string;
  reviewStatus: PhotoReviewStatus;
  reviewComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

type Row = {
  id: string;
  object_id: string;
  task_id: string | null;
  stage_id: string | null;
  author_id: string | null;
  author_name: string;
  note: string;
  images: string[];
  created_at: string;
  review_status: string;
  review_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

const THUMB_GRADIENTS = [
  "from-blue-500/70 to-indigo-500/70",
  "from-emerald-500/70 to-teal-500/70",
  "from-amber-500/70 to-orange-500/70",
  "from-rose-500/70 to-pink-500/70",
  "from-violet-500/70 to-purple-500/70",
  "from-cyan-500/70 to-sky-500/70",
];
const thumbForId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return THUMB_GRADIENTS[h % THUMB_GRADIENTS.length];
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (sameDay) return `Сегодня, ${hh}:${mm}`;
  if (d.toDateString() === yest.toDateString()) return `Вчера, ${hh}:${mm}`;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}, ${hh}:${mm}`;
};

async function rowsToPhotos(rows: Row[]): Promise<PhotoReport[]> {
  const allPaths = rows.flatMap((r) => r.images || []);
  let urlMap = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data, error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(allPaths, 60 * 60);
    if (error) throw error;
    (data ?? []).forEach((d, i) => {
      if (d?.signedUrl) urlMap.set(allPaths[i], d.signedUrl);
    });
  }
  return rows.map((r) => {
    const imgs = (r.images || []).map((p) => urlMap.get(p) || "").filter(Boolean);
    return {
      id: r.id,
      objectId: r.object_id,
      taskId: r.task_id,
      stageId: r.stage_id,
      authorId: r.author_id,
      author: r.author_name || "—",
      note: r.note,
      date: formatDate(r.created_at),
      createdAt: r.created_at,
      count: (r.images || []).length,
      images: imgs,
      imagePaths: r.images || [],
      thumb: thumbForId(r.id),
      reviewStatus: (r.review_status || PHOTO_REVIEW_PENDING) as PhotoReviewStatus,
      reviewComment: r.review_comment,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
    };
  });
}

export function usePhotos() {
  return useQuery({
    queryKey: ["photo_reports"],
    queryFn: async (): Promise<PhotoReport[]> => {
      const { data, error } = await (supabase as any)
        .from("photo_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return rowsToPhotos(data as Row[]);
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useAddPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      objectId: string;
      taskId?: string | null;
      stageId?: string | null;
      author: string;
      authorId?: string | null;
      note: string;
      files: File[];
    }) => {
      if (input.files.length === 0) throw new Error("Нет фото для загрузки");
      const folder = `${input.objectId}/${Date.now()}`;
      const paths: string[] = [];
      for (const file of input.files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${folder}/${crypto.randomUUID()}.${safeExt}`;
        const { error: upErr } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) throw upErr;
        paths.push(path);
      }
      const { data, error } = await (supabase as any)
        .from("photo_reports")
        .insert({
          object_id: input.objectId,
          task_id: input.taskId || null,
          stage_id: input.stageId || null,
          author_id: input.authorId || null,
          author_name: input.author,
          note: input.note || "Фотоотчет",
          images: paths,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photo_reports"] });
    },
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; paths: string[] }) => {
      if (input.paths.length > 0) {
        await supabase.storage.from(PHOTOS_BUCKET).remove(input.paths);
      }
      const { error } = await (supabase as any)
        .from("photo_reports")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo_reports"] }),
  });
}

export function useUpdatePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      objectId: string;
      note: string;
      keepPaths: string[]; // existing storage paths to keep
      removePaths: string[]; // existing storage paths to delete
      newFiles: File[]; // new files to upload
    }) => {
      // upload new files
      const addedPaths: string[] = [];
      if (input.newFiles.length > 0) {
        const folder = `${input.objectId}/${Date.now()}`;
        for (const file of input.newFiles) {
          const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
          const path = `${folder}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(PHOTOS_BUCKET)
            .upload(path, file, { contentType: file.type || undefined, upsert: false });
          if (upErr) throw upErr;
          addedPaths.push(path);
        }
      }
      const finalPaths = [...input.keepPaths, ...addedPaths];
      const { error } = await (supabase as any)
        .from("photo_reports")
        .update({ note: input.note || "Фотоотчет", images: finalPaths })
        .eq("id", input.id);
      if (error) throw error;
      // remove deleted files from storage
      if (input.removePaths.length > 0) {
        await supabase.storage.from(PHOTOS_BUCKET).remove(input.removePaths).catch(() => {});
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo_reports"] }),
  });
}

export function useApprovePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reviewerId: string }) => {
      const { error } = await (supabase as any)
        .from("photo_reports")
        .update({
          review_status: PHOTO_REVIEW_APPROVED,
          review_comment: null,
          reviewed_by: input.reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo_reports"] }),
  });
}

export function useRejectPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reviewerId: string; comment: string }) => {
      const { error } = await (supabase as any)
        .from("photo_reports")
        .update({
          review_status: PHOTO_REVIEW_REJECTED,
          review_comment: input.comment,
          reviewed_by: input.reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo_reports"] }),
  });
}