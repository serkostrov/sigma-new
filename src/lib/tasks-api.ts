import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const TASK_STATUSES = ["Назначена", "В работе", "Ожидание", "Выполнена", "На проверке", "Возвращена"] as const;
export const TASK_ACTIVE_STATUSES = ["Назначена", "В работе", "Ожидание", "Возвращена"] as const;
export const TASK_STATUS_REVIEW = "На проверке";
export const TASK_STATUS_RETURNED = "Возвращена";
export const TASK_STATUS_DONE = "Выполнена";
export const TASK_PRIORITIES = ["Несрочная", "Срочная", "Важная"] as const;
export type TaskStatus = string;
export type TaskPriority = string;

export type Task = {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: string | null;
  assignee_id: string | null;
  object_id: string | null;
  stage_id: string | null;
  review_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string;
  text: string;
  edited: boolean;
  created_at: string;
  updated_at: string;
};

const TASKS_KEY = (f?: { objectId?: string | null; stageId?: string | null }) =>
  ["tasks", f ?? {}] as const;
const TASK_KEY = (id?: string) => ["task", id] as const;
const COMMENTS_KEY = (taskId?: string) => ["task_comments", taskId] as const;

export function useTasks(filter?: { objectId?: string; stageId?: string }) {
  return useQuery({
    queryKey: TASKS_KEY(filter),
    queryFn: async (): Promise<Task[]> => {
      let q = (supabase as any).from("tasks").select("*").order("created_at", { ascending: false });
      if (filter?.objectId) q = q.eq("object_id", filter.objectId);
      if (filter?.stageId) q = q.eq("stage_id", filter.stageId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: TASK_KEY(id),
    enabled: !!id,
    queryFn: async (): Promise<Task | null> => {
      const { data, error } = await (supabase as any)
        .from("tasks").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Task | null;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Task>) => {
      const { data, error } = await (supabase as any)
        .from("tasks").insert(input).select("*").single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Task> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("tasks").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: TASK_KEY(v.id) });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: COMMENTS_KEY(taskId),
    enabled: !!taskId,
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await (supabase as any)
        .from("task_comments").select("*").eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TaskComment[];
    },
  });
}

export function useAddTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { task_id: string; author_id: string; text: string }) => {
      const { error } = await (supabase as any).from("task_comments").insert(input);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: COMMENTS_KEY(v.task_id) }),
  });
}

export function useUpdateTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; task_id: string; text: string }) => {
      const { error } = await (supabase as any)
        .from("task_comments")
        .update({ text: input.text, edited: true })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: COMMENTS_KEY(v.task_id) }),
  });
}

export function useDeleteTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; task_id: string }) => {
      const { error } = await (supabase as any).from("task_comments").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: COMMENTS_KEY(v.task_id) }),
  });
}

export function useSubmitTaskForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await (supabase as any)
        .from("tasks")
        .update({
          status: TASK_STATUS_REVIEW,
          review_comment: null,
          reviewed_by: null,
          reviewed_at: null,
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: (_d, taskId) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: TASK_KEY(taskId) });
    },
  });
}

export function useApproveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { taskId: string; reviewerId: string }) => {
      const { error } = await (supabase as any)
        .from("tasks")
        .update({
          status: TASK_STATUS_DONE,
          reviewed_by: input.reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.taskId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: TASK_KEY(v.taskId) });
    },
  });
}

export function useRejectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { taskId: string; reviewerId: string; comment: string }) => {
      const { error } = await (supabase as any)
        .from("tasks")
        .update({
          status: TASK_STATUS_RETURNED,
          review_comment: input.comment,
          reviewed_by: input.reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.taskId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: TASK_KEY(v.taskId) });
    },
  });
}