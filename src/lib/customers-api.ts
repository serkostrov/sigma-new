import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Customer = {
  id: string;
  full_name: string;
  phone: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type CustomerInput = {
  full_name: string;
  phone: string;
  notes?: string;
};

export const CUSTOMERS_KEY = ["customers"] as const;

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { error } = await supabase.from("customers").insert({
        full_name: input.full_name,
        phone: input.phone,
        notes: input.notes ?? "",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerInput & { id: string }) => {
      const { error } = await supabase
        .from("customers")
        .update({
          full_name: input.full_name,
          phone: input.phone,
          notes: input.notes ?? "",
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  });
}