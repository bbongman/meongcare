import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface VetVisitItem {
  name: string;
  price: number;
}

export interface VetVisit {
  id: string;
  dogName: string;
  hospitalName: string;
  visitDate: string;
  items: VetVisitItem[];
  totalPrice: number;
  diagnosis: string;
  prescriptions: string[];
  nextVisitDate: string;
  notes: string;
  receiptPhoto?: string;
  createdAt: string;
}

export function useVetVisits() {
  const queryClient = useQueryClient();

  const { data: visits = [] } = useQuery<VetVisit[]>({
    queryKey: ["vet-visits"],
    queryFn: () => apiFetch<VetVisit[]>("/api/vet-visits"),
  });

  const addMutation = useMutation({
    mutationFn: (visit: Omit<VetVisit, "id" | "createdAt">) =>
      apiFetch<VetVisit>("/api/vet-visits", { method: "POST", body: JSON.stringify(visit) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vet-visits"] }); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/vet-visits/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vet-visits"] }); },
  });

  const addVisit = useCallback(
    (visit: Omit<VetVisit, "id" | "createdAt">) => addMutation.mutateAsync(visit),
    [addMutation]
  );

  const removeVisit = useCallback(
    (id: string) => removeMutation.mutateAsync(id),
    [removeMutation]
  );

  const getRecent = useCallback(
    (count = 3) => visits.slice(0, count),
    [visits]
  );

  return { visits, addVisit, removeVisit, getRecent };
}
