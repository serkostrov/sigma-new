import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StageTemplate = {
  id: string;
  name: string;
  duration_days: number;
  sort_order: number;
};

export type ObjectStage = {
  id: string;
  object_id: string;
  name: string;
  duration_days: number;
  sort_order: number;
  status: string;
  assignee_id: string | null;
  notes: string;
  started_at: string | null;
  finished_at: string | null;
};

const TEMPLATES_KEY = ["stage_templates"] as const;
const OBJ_STAGES_KEY = (objectId?: string) => ["object_stages", objectId] as const;
const OBJ_STAGE_KEY = (id?: string) => ["object_stage", id] as const;

export function useStageTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async (): Promise<StageTemplate[]> => {
      const { data, error } = await (supabase as any)
        .from("stage_templates")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as StageTemplate[];
    },
  });
}

export function useCreateStageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; duration_days: number; sort_order: number }) => {
      const { error } = await (supabase as any).from("stage_templates").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useUpdateStageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<StageTemplate> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("stage_templates").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useDeleteStageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("stage_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useReorderStageTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      for (const it of items) {
        const { error } = await (supabase as any)
          .from("stage_templates")
          .update({ sort_order: it.sort_order })
          .eq("id", it.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useObjectStages(objectId: string | undefined) {
  return useQuery({
    queryKey: OBJ_STAGES_KEY(objectId),
    enabled: !!objectId,
    queryFn: async (): Promise<ObjectStage[]> => {
      const { data, error } = await (supabase as any)
        .from("object_stages")
        .select("*")
        .eq("object_id", objectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ObjectStage[];
    },
  });
}

export function useAllStages() {
  return useQuery({
    queryKey: ["object_stages", "all"] as const,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("object_stages")
        .select("id,name,object_id,sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as { id: string; name: string; object_id: string; sort_order: number }[];
    },
  });
}

export function useObjectStage(id: string | undefined) {
  return useQuery({
    queryKey: OBJ_STAGE_KEY(id),
    enabled: !!id,
    queryFn: async (): Promise<ObjectStage | null> => {
      const { data, error } = await (supabase as any)
        .from("object_stages")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ObjectStage | null;
    },
  });
}

export function useAddDefaultStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (objectId: string) => {
      const { data: tmpls, error: terr } = await (supabase as any)
        .from("stage_templates")
        .select("*")
        .order("sort_order", { ascending: true });
      if (terr) throw terr;
      const rows = (tmpls as StageTemplate[]).map((t) => ({
        object_id: objectId,
        name: t.name,
        duration_days: t.duration_days,
        sort_order: t.sort_order,
        status: "Не начат",
      }));
      if (rows.length === 0) return;
      const { error } = await (supabase as any).from("object_stages").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, objectId) =>
      qc.invalidateQueries({ queryKey: OBJ_STAGES_KEY(objectId) }),
  });
}

export function useCreateObjectStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ObjectStage, "id">) => {
      const { error } = await (supabase as any).from("object_stages").insert(input);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: OBJ_STAGES_KEY(v.object_id) }),
  });
}

export function useUpdateObjectStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ObjectStage> & { id: string; object_id: string }) => {
      const { id, object_id: _o, ...rest } = input;
      const { error } = await (supabase as any).from("object_stages").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: OBJ_STAGES_KEY(v.object_id) });
      qc.invalidateQueries({ queryKey: OBJ_STAGE_KEY(v.id) });
    },
  });
}

export function useDeleteObjectStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; object_id: string }) => {
      const { error } = await (supabase as any).from("object_stages").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: OBJ_STAGES_KEY(v.object_id) }),
  });
}