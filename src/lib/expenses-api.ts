import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENTS_BUCKET, getDocumentSignedUrl } from "@/lib/documents-api";

export const EXPENSE_BUCKET = DOCUMENTS_BUCKET;

export type Expense = {
  id: string;
  name: string;
  amount: number;
  spent_on: string; // YYYY-MM-DD
  object_id: string;
  stage_id: string | null;
  task_id: string | null;
  category_id: string | null;
  comment: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseAttachment = {
  id: string;
  expense_id: string;
  name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  sort_order: number;
};

const CATEGORIES_KEY = ["expense_categories"] as const;

export function useExpenseCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async (): Promise<ExpenseCategory[]> => {
      const { data, error } = await (supabase as any)
        .from("expense_categories")
        .select("id,name,sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExpenseCategory[];
    },
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; sort_order: number }) => {
      const { error } = await (supabase as any).from("expense_categories").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useUpdateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<ExpenseCategory>) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("expense_categories").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("expense_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export type ExpensesFilter = {
  objectId?: string;
  stageId?: string;
  taskId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useExpenses(filter?: ExpensesFilter) {
  const key = [
    "expenses",
    filter?.objectId ?? "all",
    filter?.stageId ?? "any",
    filter?.taskId ?? "any",
    filter?.dateFrom ?? "",
    filter?.dateTo ?? "",
  ];
  return useQuery({
    queryKey: key,
    queryFn: async (): Promise<Expense[]> => {
      let q = (supabase as any).from("expenses").select("*");
      if (filter?.objectId) q = q.eq("object_id", filter.objectId);
      if (filter?.stageId) q = q.eq("stage_id", filter.stageId);
      if (filter?.taskId) q = q.eq("task_id", filter.taskId);
      if (filter?.dateFrom) q = q.gte("spent_on", filter.dateFrom);
      if (filter?.dateTo) q = q.lte("spent_on", filter.dateTo);
      const { data, error } = await q
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });
}

export function useExpenseAttachments(expenseIds: string[]) {
  const key = ["expense_attachments", [...expenseIds].sort().join(",")];
  return useQuery({
    queryKey: key,
    enabled: expenseIds.length > 0,
    queryFn: async (): Promise<ExpenseAttachment[]> => {
      const { data, error } = await (supabase as any)
        .from("expense_attachments")
        .select("*")
        .in("expense_id", expenseIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExpenseAttachment[];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      amount: number;
      spent_on: string;
      object_id: string;
      stage_id: string | null;
      task_id: string | null;
      category_id: string | null;
      comment: string | null;
      created_by: string | null;
      created_by_name: string;
      files: File[];
    }) => {
      const { files, ...row } = input;
      const { data, error } = await (supabase as any)
        .from("expenses").insert(row).select("*").single();
      if (error) throw error;
      const expense = data as Expense;
      if (files.length > 0) {
        const attachments: any[] = [];
        for (const file of files) {
          const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
          const path = `expenses/${expense.id}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(EXPENSE_BUCKET)
            .upload(path, file, { contentType: file.type || undefined, upsert: false });
          if (upErr) throw upErr;
          attachments.push({
            expense_id: expense.id,
            name: file.name,
            file_path: path,
            mime_type: file.type || "",
            size_bytes: file.size,
            uploaded_by: input.created_by,
          });
        }
        const { error: aErr } = await (supabase as any)
          .from("expense_attachments").insert(attachments);
        if (aErr) throw aErr;
      }
      return expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expense_attachments"] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Expense> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("expenses").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const { data: atts } = await (supabase as any)
        .from("expense_attachments").select("file_path").eq("expense_id", input.id);
      const paths = ((atts ?? []) as { file_path: string }[]).map((a) => a.file_path);
      if (paths.length > 0) {
        await supabase.storage.from(EXPENSE_BUCKET).remove(paths).catch(() => {});
      }
      const { error } = await (supabase as any).from("expenses").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expense_attachments"] });
    },
  });
}

export function useDeleteExpenseAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; file_path: string }) => {
      await supabase.storage.from(EXPENSE_BUCKET).remove([input.file_path]).catch(() => {});
      const { error } = await (supabase as any)
        .from("expense_attachments").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense_attachments"] }),
  });
}

export async function getExpenseAttachmentUrl(path: string) {
  return getDocumentSignedUrl(path);
}

export function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(amount);
}