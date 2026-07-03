import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Brigade = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type BrigadeMember = {
  id: string;
  brigade_id: string;
  user_id: string;
};

export type BrigadeInput = {
  name: string;
  description?: string;
  member_ids: string[];
};

export const BRIGADES_KEY = ["brigades"] as const;
export const BRIGADE_MEMBERS_KEY = ["brigade_members"] as const;

export function useBrigades() {
  return useQuery({
    queryKey: BRIGADES_KEY,
    queryFn: async (): Promise<Brigade[]> => {
      const { data, error } = await supabase
        .from("brigades")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Brigade[];
    },
  });
}

export function useBrigadeMembers() {
  return useQuery({
    queryKey: BRIGADE_MEMBERS_KEY,
    queryFn: async (): Promise<BrigadeMember[]> => {
      const { data, error } = await supabase.from("brigade_members").select("*");
      if (error) throw error;
      return (data ?? []) as BrigadeMember[];
    },
  });
}

async function setMembers(brigade_id: string, member_ids: string[]) {
  const { error: delErr } = await supabase
    .from("brigade_members")
    .delete()
    .eq("brigade_id", brigade_id);
  if (delErr) throw delErr;
  if (member_ids.length) {
    const { error: insErr } = await supabase
      .from("brigade_members")
      .insert(member_ids.map((user_id) => ({ brigade_id, user_id })));
    if (insErr) throw insErr;
  }
}

export function useCreateBrigade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BrigadeInput) => {
      const { data, error } = await supabase
        .from("brigades")
        .insert({ name: input.name, description: input.description ?? "" })
        .select("id")
        .single();
      if (error) throw error;
      await setMembers((data as { id: string }).id, input.member_ids);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRIGADES_KEY });
      qc.invalidateQueries({ queryKey: BRIGADE_MEMBERS_KEY });
    },
  });
}

export function useUpdateBrigade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BrigadeInput & { id: string }) => {
      const { error } = await supabase
        .from("brigades")
        .update({ name: input.name, description: input.description ?? "" })
        .eq("id", input.id);
      if (error) throw error;
      await setMembers(input.id, input.member_ids);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRIGADES_KEY });
      qc.invalidateQueries({ queryKey: BRIGADE_MEMBERS_KEY });
    },
  });
}

export function useDeleteBrigade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brigades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRIGADES_KEY });
      qc.invalidateQueries({ queryKey: BRIGADE_MEMBERS_KEY });
    },
  });
}