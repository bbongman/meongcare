import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";

export type MedType = "heartworm" | "flea" | "tick" | "combo";

export const MED_LABELS: Record<MedType, { label: string; emoji: string; color: string }> = {
  heartworm: { label: "심장사상충", emoji: "🫀", color: "text-red-500" },
  flea: { label: "벼룩·진드기", emoji: "🐛", color: "text-amber-500" },
  tick: { label: "진드기 전용", emoji: "🕷️", color: "text-orange-500" },
  combo: { label: "종합 예방약", emoji: "💊", color: "text-purple-500" },
};

export interface MedRecord {
  id?: string;
  dogId: string;
  type: MedType;
  yearMonth: string;
  done: boolean;
  doneAt?: string;
  productName?: string;
}

export function usePreventionMeds(dogId: string) {
  const queryClient = useQueryClient();

  const { data: all = [] } = useQuery<MedRecord[]>({
    queryKey: ["prevention-meds", dogId],
    queryFn: () => apiFetch<MedRecord[]>(`/api/prevention-meds/${dogId}`),
    enabled: !!dogId,
  });

  const getRecord = useCallback(
    (type: MedType, yearMonth: string) =>
      all.find((r) => r.type === type && r.yearMonth === yearMonth),
    [all]
  );

  const toggleMutation = useMutation({
    mutationFn: ({ type, yearMonth, productName }: { type: MedType; yearMonth: string; productName?: string }) =>
      apiFetch<MedRecord>("/api/prevention-meds/toggle", {
        method: "POST",
        body: JSON.stringify({ dogId, type, yearMonth, productName }),
      }),
    onMutate: async ({ type, yearMonth }) => {
      await queryClient.cancelQueries({ queryKey: ["prevention-meds", dogId] });
      const prev = queryClient.getQueryData<MedRecord[]>(["prevention-meds", dogId]);
      queryClient.setQueryData<MedRecord[]>(["prevention-meds", dogId], (old = []) => {
        const existing = old.find((r) => r.type === type && r.yearMonth === yearMonth);
        if (existing) return old.map((r) => r.type === type && r.yearMonth === yearMonth ? { ...r, done: !r.done } : r);
        return [...old, { dogId, type, yearMonth, done: true }];
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["prevention-meds", dogId], context.prev);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["prevention-meds", dogId] }); },
  });

  const toggle = useCallback(
    (type: MedType, yearMonth: string, productName?: string) =>
      toggleMutation.mutateAsync({ type, yearMonth, productName }),
    [toggleMutation]
  );

  const months = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return result;
  }, []);

  return { all, getRecord, toggle, months };
}
