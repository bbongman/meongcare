import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "@/lib/api";

// --- Schema & Types ---
export const dogSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  breed: z.string().min(1, "견종을 입력해주세요"),
  age: z.coerce.number().min(0, "올바른 나이를 입력해주세요"),
  gender: z.enum(["male", "female"]),
  weight: z.coerce.number().min(0).optional().default(0),
  neutered: z.boolean(),
  photo: z.string().nullable().optional(),
  birthday: z.string().optional(),
});

export type DogInput = z.infer<typeof dogSchema>;

export interface Dog extends DogInput {
  id: string;
  createdAt: string;
}

// --- Hooks ---

export function useDogs() {
  return useQuery<Dog[]>({
    queryKey: ["dogs"],
    queryFn: () => apiFetch<Dog[]>("/api/dogs"),
  });
}

export function useDog(id: string) {
  return useQuery<Dog | null>({
    queryKey: ["dogs", id],
    queryFn: async () => {
      const dogs = await apiFetch<Dog[]>("/api/dogs");
      return dogs.find((d) => d.id === id) ?? null;
    },
  });
}

export function useAddDog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DogInput) => apiFetch<Dog>("/api/dogs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dogs"] }); },
  });
}

export function useUpdateDog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DogInput }) =>
      apiFetch<Dog>(`/api/dogs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dogs"] }); },
  });
}

export function useDeleteDog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/dogs/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dogs"] }); },
  });
}
