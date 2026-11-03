import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/axios";

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

function invalidateCategoryQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["categories"] });
}

export function useCategories(ownerUsername?: string | null) {
  return useQuery<Category[]>({
    queryKey: ["categories", ownerUsername ?? "me"],
    queryFn: async () => {
      const endpoint = ownerUsername ? `/users/${ownerUsername}/categories` : "/categories";
      const { data } = await api.get(endpoint);
      return data.data ?? [];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string; color: string }) => {
      const { data } = await api.post("/categories", payload);
      return data.data as Category;
    },
    onSuccess: () => {
      invalidateCategoryQueries(queryClient);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: { name: string; color: string } }) => {
      const { data } = await api.put(`/categories/${id}`, payload);
      return data.data as Category;
    },
    onSuccess: () => {
      invalidateCategoryQueries(queryClient);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      invalidateCategoryQueries(queryClient);
    },
  });
}
