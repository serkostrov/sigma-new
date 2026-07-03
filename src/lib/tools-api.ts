import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ToolCategoryRow = { id: string; name: string; sort_order: number };
export type ToolStatusRow = { id: string; name: string; color: string; sort_order: number };
export type ToolConditionRow = { id: string; name: string; color: string; sort_order: number };

export type ToolRow = {
  id: string;
  name: string;
  category: string;
  inv_number: string;
  status: string;
  condition: string;
  object_id: string | null;
  assignee_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ToolInput = {
  name: string;
  category?: string;
  inv_number?: string;
  status?: string;
  condition?: string;
  object_id?: string | null;
  assignee_id?: string | null;
  notes?: string;
};

const CATEGORIES_KEY = ["tool_categories"] as const;
const STATUSES_KEY = ["tool_statuses"] as const;
const CONDITIONS_KEY = ["tool_conditions"] as const;
const TOOLS_KEY = ["tools_db"] as const;

// ===== Categories =====
export function useToolCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async (): Promise<ToolCategoryRow[]> => {
      const { data, error } = await (supabase as any)
        .from("tool_categories").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ToolCategoryRow[];
    },
  });
}
export function useCreateToolCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; sort_order: number }) => {
      const { error } = await (supabase as any).from("tool_categories").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}
export function useUpdateToolCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ToolCategoryRow> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("tool_categories").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}
export function useDeleteToolCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tool_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

// ===== Statuses =====
export function useToolStatuses() {
  return useQuery({
    queryKey: STATUSES_KEY,
    queryFn: async (): Promise<ToolStatusRow[]> => {
      const { data, error } = await (supabase as any)
        .from("tool_statuses").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ToolStatusRow[];
    },
  });
}
export function useCreateToolStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: string; sort_order: number }) => {
      const { error } = await (supabase as any).from("tool_statuses").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}
export function useUpdateToolStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ToolStatusRow> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("tool_statuses").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}
export function useDeleteToolStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tool_statuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}

// ===== Conditions =====
export function useToolConditions() {
  return useQuery({
    queryKey: CONDITIONS_KEY,
    queryFn: async (): Promise<ToolConditionRow[]> => {
      const { data, error } = await (supabase as any)
        .from("tool_conditions").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ToolConditionRow[];
    },
  });
}
export function useCreateToolCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: string; sort_order: number }) => {
      const { error } = await (supabase as any).from("tool_conditions").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONDITIONS_KEY }),
  });
}
export function useUpdateToolCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ToolConditionRow> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("tool_conditions").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONDITIONS_KEY }),
  });
}
export function useDeleteToolCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tool_conditions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONDITIONS_KEY }),
  });
}

// ===== Tools =====
export function useToolsDb(params?: { objectId?: string }) {
  return useQuery({
    queryKey: [...TOOLS_KEY, params?.objectId ?? "all"],
    queryFn: async (): Promise<ToolRow[]> => {
      let q = (supabase as any).from("tools").select("*").order("created_at", { ascending: false });
      if (params?.objectId) q = q.eq("object_id", params.objectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ToolRow[];
    },
  });
}

export function useCreateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ToolInput) => {
      const { error } = await (supabase as any).from("tools").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TOOLS_KEY }),
  });
}
export function useUpdateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ToolInput> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("tools").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TOOLS_KEY }),
  });
}

// Update tool and attach a note to the auto-created movement row
export function useMoveTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<ToolInput> & { id: string; note?: string }
    ) => {
      const { id, note, ...rest } = input;
      const { error } = await (supabase as any).from("tools").update(rest).eq("id", id);
      if (error) throw error;
      if (note && note.trim()) {
        const { data: latest } = await (supabase as any)
          .from("tool_movements")
          .select("id")
          .eq("tool_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest?.id) {
          await (supabase as any)
            .from("tool_movements")
            .update({ note: note.trim() })
            .eq("id", latest.id);
        }
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: TOOLS_KEY });
      qc.invalidateQueries({ queryKey: ["tool", v.id] });
      qc.invalidateQueries({ queryKey: ["tool_movements", v.id] });
    },
  });
}
export function useDeleteTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TOOLS_KEY }),
  });
}

// ===== Single tool =====
export function useTool(id: string | undefined) {
  return useQuery({
    queryKey: ["tool", id],
    enabled: !!id,
    queryFn: async (): Promise<ToolRow | null> => {
      const { data, error } = await (supabase as any)
        .from("tools").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as ToolRow | null;
    },
  });
}

// ===== Movements =====
export type ToolMovementRow = {
  id: string;
  tool_id: string;
  from_object_id: string | null;
  to_object_id: string | null;
  from_assignee_id: string | null;
  to_assignee_id: string | null;
  from_status: string | null;
  to_status: string | null;
  note: string;
  created_at: string;
};

export function useToolMovements(toolId: string | undefined) {
  return useQuery({
    queryKey: ["tool_movements", toolId],
    enabled: !!toolId,
    queryFn: async (): Promise<ToolMovementRow[]> => {
      const { data, error } = await (supabase as any)
        .from("tool_movements").select("*").eq("tool_id", toolId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ToolMovementRow[];
    },
  });
}