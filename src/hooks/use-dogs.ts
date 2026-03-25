import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { userKey } from "@/lib/user-storage";

// --- Schema & Types ---
export const dogSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  breed: z.string().min(1, "견종을 입력해주세요"),
  age: z.coerce.number().min(0, "올바른 나이를 입력해주세요"),
  gender: z.enum(["male", "female"]),
  weight: z.coerce.number().min(0).optional().default(0),
  neutered: z.boolean(),
  photo: z.string().nullable().optional(), // base64 string
});

export type DogInput = z.infer<typeof dogSchema>;

export interface Dog extends DogInput {
  id: string;
  createdAt: string;
}

const BASE_KEY = "meongcare_dogs";

// --- Helpers ---
const getDogsFromStorage = (): Dog[] => {
  const data = localStorage.getItem(userKey(BASE_KEY));
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse dogs from local storage", e);
    return [];
  }
};

const saveDogsToStorage = (dogs: Dog[]) => {
  try {
    localStorage.setItem(userKey(BASE_KEY), JSON.stringify(dogs));
  } catch (e) {
    console.error("Failed to save dogs to local storage", e);
  }
};

// --- Hooks ---

export function useDogs() {
  return useQuery({
    queryKey: ["dogs"],
    queryFn: () => getDogsFromStorage(),
  });
}

export function useDog(id: string) {
  return useQuery({
    queryKey: ["dogs", id],
    queryFn: () => {
      const dogs = getDogsFromStorage();
      return dogs.find((d) => d.id === id) || null;
    },
  });
}

export function useAddDog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: DogInput) => {
      const newDog: Dog = {
        ...data,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      
      const currentDogs = getDogsFromStorage();
      const updatedDogs = [newDog, ...currentDogs];
      saveDogsToStorage(updatedDogs);
      
      return newDog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dogs"] });
    },
  });
}

export function useUpdateDog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DogInput }) => {
      const currentDogs = getDogsFromStorage();
      const updatedDogs = currentDogs.map((d) =>
        d.id === id ? { ...d, ...data } : d
      );
      saveDogsToStorage(updatedDogs);
      return updatedDogs.find((d) => d.id === id)!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dogs"] });
    },
  });
}

export function useDeleteDog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const currentDogs = getDogsFromStorage();
      const updatedDogs = currentDogs.filter((d) => d.id !== id);
      saveDogsToStorage(updatedDogs);
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dogs"] });
    },
  });
}
