import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface WeightRecord {
  id: string;
  dogId: string;
  date: string;
  weight: number;
}

export function useWeightHistory(dogId: string) {
  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery<WeightRecord[]>({
    queryKey: ["weight", dogId],
    queryFn: () => apiFetch<WeightRecord[]>(`/api/weight/${dogId}`),
    enabled: !!dogId,
    select: (data) => [...data].sort((a, b) => a.date.localeCompare(b.date)),
  });

  const mutation = useMutation({
    mutationFn: (weight: number) =>
      apiFetch<WeightRecord>("/api/weight", {
        method: "POST",
        body: JSON.stringify({ dogId, weight }),
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["weight", dogId] }); },
  });

  const addRecord = useCallback((weight: number) => mutation.mutate(weight), [mutation]);

  return { records, addRecord };
}
