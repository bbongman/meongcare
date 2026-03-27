import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api";

export type HistoryType = "consultation" | "translation" | "product";

export interface ConsultationResult {
  urgency: "home" | "tomorrow" | "now";
  summary: string;
  advice: string;
  nextSteps: string[];
}

export interface TranslationResult {
  translation: string;
  mood: string;
  moodEmoji: string;
  detectedSound?: string;
  confidence: number;
  rawLabels?: string;
}

export interface ProductResult {
  productName: string;
  category: string;
  description: string;
  mainIngredients: string[];
  feedingGuide?: string;
  suitableAge: string;
  cautions: string[];
  rating: "추천" | "보통" | "주의";
  ratingReason: string;
}

export type HistoryResult = ConsultationResult | TranslationResult | ProductResult;

export interface HistoryItem {
  id: string;
  type: HistoryType;
  dogName: string;
  date: string;
  input: string;
  result: HistoryResult;
}

export function useHealthHistory() {
  const queryClient = useQueryClient();

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["ai-logs"],
    queryFn: async () => {
      const rows = await apiFetch<any[]>("/api/ai-logs");
      return rows.map(r => ({ ...r, date: r.createdAt }));
    },
  });

  const addMutation = useMutation({
    mutationFn: (item: { type: HistoryType; dogName: string; input: string; result: HistoryResult }) =>
      apiFetch("/api/ai-logs", { method: "POST", body: JSON.stringify(item) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ai-logs"] }); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/ai-logs/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ai-logs"] }); },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiFetch("/api/ai-logs", { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ai-logs"] }); },
  });

  const addItem = useCallback(
    (type: HistoryType, dogName: string, input: string, result: HistoryResult) =>
      addMutation.mutateAsync({ type, dogName, input, result }),
    [addMutation]
  );

  const removeItem = useCallback(
    (id: string) => removeMutation.mutateAsync(id),
    [removeMutation]
  );

  const clearAll = useCallback(
    () => clearMutation.mutateAsync(),
    [clearMutation]
  );

  return { history, addItem, removeItem, clearAll };
}
