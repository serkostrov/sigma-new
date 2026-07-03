import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  STAGES,
  type Stage,
  type StageStatus,
  type ObjectStatus,
  type SiteObject,
  type Health,
} from "./demo-data";

const TABLE = "site_objects";

type DbRow = {
  id: string;
  name: string;
  address: string;
  customer: string;
  responsible: string;
  status: string;
  foreman: string;
  foreman_id: string | null;
  brigade: string;
  brigade_id: string | null;
  deadline: string;
  progress: number;
  budget: number;
  health: string;
  risk: boolean;
  current_stage: string;
  stages_status: Record<string, string> | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
};

const emptyStages = (): Record<Stage, StageStatus> => {
  const o = {} as Record<Stage, StageStatus>;
  STAGES.forEach((s) => (o[s] = "Не начат"));
  return o;
};

const fromRow = (r: DbRow): SiteObject => ({
  id: r.id,
  name: r.name,
  address: r.address,
  customer: r.customer,
  responsible: r.responsible,
  status: r.status as ObjectStatus,
  foreman: r.foreman,
  foremanId: r.foreman_id,
  brigade: r.brigade,
  brigadeId: r.brigade_id,
  deadline: r.deadline,
  progress: r.progress,
  budget: Number(r.budget) || 0,
  health: r.health as Health,
  risk: r.risk,
  currentStage: r.current_stage as Stage,
  stagesStatus: {
    ...emptyStages(),
    ...((r.stages_status ?? {}) as Record<Stage, StageStatus>),
  },
  customerId: r.customer_id,
});

export type ObjectFormInput = Omit<SiteObject, "id"> & { id?: string };

const toRow = (o: ObjectFormInput) => ({
  ...(o.id ? { id: o.id } : {}),
  name: o.name,
  address: o.address,
  customer: o.customer,
  responsible: o.responsible,
  status: o.status,
  foreman: o.foreman,
  foreman_id: o.foremanId ?? null,
  brigade: o.brigade || "—",
  brigade_id: o.brigadeId ?? null,
  deadline: o.deadline || "—",
  progress: o.progress,
  budget: o.budget,
  health: o.health,
  risk: o.risk,
  current_stage: o.currentStage,
  stages_status: o.stagesStatus,
  customer_id: o.customerId ?? null,
});

export const OBJECTS_KEY = ["site_objects"] as const;

export function useObjects() {
  return useQuery({
    queryKey: OBJECTS_KEY,
    queryFn: async (): Promise<SiteObject[]> => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as DbRow[]).map(fromRow);
    },
  });
}

export function useObject(id: string | undefined) {
  return useQuery({
    queryKey: [...OBJECTS_KEY, id],
    enabled: !!id,
    queryFn: async (): Promise<SiteObject | null> => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? fromRow(data as DbRow) : null;
    },
  });
}

const newId = () => `obj-${Date.now().toString(36)}`;

export function useCreateObject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ObjectFormInput) => {
      const row = toRow({ ...input, id: input.id ?? newId() });
      const { error } = await (supabase as any).from(TABLE).insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OBJECTS_KEY }),
  });
}

export function useUpdateObject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ObjectFormInput & { id: string }) => {
      const { id, ...rest } = toRow(input);
      const { error } = await (supabase as any).from(TABLE).update(rest).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OBJECTS_KEY }),
  });
}

export function useDeleteObject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: OBJECTS_KEY }),
  });
}