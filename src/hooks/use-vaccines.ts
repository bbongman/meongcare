import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "@/lib/api";

export interface VaccineRecord {
  id: string;
  dogId: string;
  vaccineName: string;
  date: string; // YYYY-MM-DD
  hospitalName: string;
  nextDate: string; // YYYY-MM-DD
  notes: string;
  createdAt: string;
}

export function useVaccines(dogId: string) {
  const queryClient = useQueryClient();

  const { data: all = [] } = useQuery<VaccineRecord[]>({
    queryKey: ["vaccines", dogId],
    queryFn: () => apiFetch<VaccineRecord[]>(`/api/vaccines/${dogId}`),
    enabled: !!dogId,
  });

  const records = useMemo(
    () => [...all].sort((a, b) => b.date.localeCompare(a.date)),
    [all]
  );

  const addRecord = useMutation({
    mutationFn: (data: Omit<VaccineRecord, "id" | "dogId" | "createdAt">) =>
      apiFetch<VaccineRecord>("/api/vaccines", { method: "POST", body: JSON.stringify({ ...data, dogId }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vaccines", dogId] }); queryClient.invalidateQueries({ queryKey: ["vaccines-upcoming"] }); },
  });

  const removeRecord = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/vaccines/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vaccines", dogId] }); queryClient.invalidateQueries({ queryKey: ["vaccines-upcoming"] }); },
  });

  const upcomingVaccine = useMemo(
    () => records.filter((v) => v.nextDate).sort((a, b) => a.nextDate.localeCompare(b.nextDate))[0] ?? null,
    [records]
  );

  return {
    records,
    addRecord: (data: Omit<VaccineRecord, "id" | "dogId" | "createdAt">) => addRecord.mutateAsync(data),
    removeRecord: (id: string) => removeRecord.mutateAsync(id),
    upcomingVaccine,
  };
}

export function useAllUpcomingVaccines() {
  const { data = [] } = useQuery<VaccineRecord[]>({
    queryKey: ["vaccines-upcoming"],
    queryFn: () => apiFetch<VaccineRecord[]>("/api/vaccines/upcoming/all"),
  });
  return data;
}
