import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ObjectStatusRow = { id: string; name: string; sort_order: number };
export type ObjectHealthRow = { id: string; key: string; label: string; sort_order: number };
export type TaskStatusRow = { id: string; name: string; color: string; sort_order: number };
export type TaskPriorityRow = { id: string; name: string; color: string; sort_order: number };

const STATUSES_KEY = ["object_statuses"] as const;
const HEALTHS_KEY = ["object_health_states"] as const;

export function useObjectStatuses() {
  return useQuery({
    queryKey: STATUSES_KEY,
    queryFn: async (): Promise<ObjectStatusRow[]> => {
      const { data, error } = await (supabase as any)
        .from("object_statuses")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ObjectStatusRow[];
    },
  });
}

export function useCreateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; sort_order: number }) => {
      const { error } = await (supabase as any).from("object_statuses").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}
export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ObjectStatusRow> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("object_statuses").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}
export function useDeleteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("object_statuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}

export function useObjectHealths() {
  return useQuery({
    queryKey: HEALTHS_KEY,
    queryFn: async (): Promise<ObjectHealthRow[]> => {
      const { data, error } = await (supabase as any)
        .from("object_health_states")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ObjectHealthRow[];
    },
  });
}

export function useCreateHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: string; label: string; sort_order: number }) => {
      const { error } = await (supabase as any).from("object_health_states").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: HEALTHS_KEY }),
  });
}
export function useUpdateHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ObjectHealthRow> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("object_health_states").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: HEALTHS_KEY }),
  });
}
export function useDeleteHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("object_health_states").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: HEALTHS_KEY }),
  });
}

// ===== Task statuses =====
const TASK_STATUSES_KEY = ["task_statuses"] as const;

export function useTaskStatusesCatalog() {
  return useQuery({
    queryKey: TASK_STATUSES_KEY,
    queryFn: async (): Promise<TaskStatusRow[]> => {
      const { data, error } = await (supabase as any)
        .from("task_statuses").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data as TaskStatusRow[];
    },
  });
}
export function useCreateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: string; sort_order: number }) => {
      const { error } = await (supabase as any).from("task_statuses").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_STATUSES_KEY }),
  });
}
export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TaskStatusRow> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("task_statuses").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_STATUSES_KEY }),
  });
}
export function useDeleteTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("task_statuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_STATUSES_KEY }),
  });
}

// ===== Task priorities =====
const TASK_PRIORITIES_KEY = ["task_priorities"] as const;

export function useTaskPrioritiesCatalog() {
  return useQuery({
    queryKey: TASK_PRIORITIES_KEY,
    queryFn: async (): Promise<TaskPriorityRow[]> => {
      const { data, error } = await (supabase as any)
        .from("task_priorities").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data as TaskPriorityRow[];
    },
  });
}
export function useCreateTaskPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: string; sort_order: number }) => {
      const { error } = await (supabase as any).from("task_priorities").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_PRIORITIES_KEY }),
  });
}
export function useUpdateTaskPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TaskPriorityRow> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("task_priorities").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_PRIORITIES_KEY }),
  });
}
export function useDeleteTaskPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("task_priorities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_PRIORITIES_KEY }),
  });
}