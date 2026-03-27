import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";

export interface DailyLog {
  id: string;
  dogId: string;
  date: string; // YYYY-MM-DD
  meal: 0 | 1 | 2 | 3;
  walk: boolean;
  poop: boolean;
  pee: boolean;
  energy: 0 | 1 | 2;
  memo: string;
}

export function useDailyLog(dogId: string) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: logs = [] } = useQuery<DailyLog[]>({
    queryKey: ["daily-logs", dogId],
    queryFn: () => apiFetch<DailyLog[]>(`/api/daily-logs/${dogId}`),
    enabled: !!dogId,
  });

  const todayLog = logs.find((l) => l.date === today) ?? null;

  const saveLogMutation = useMutation({
    mutationFn: (data: Omit<DailyLog, "id" | "dogId" | "date"> & { date?: string }) =>
      apiFetch<DailyLog>("/api/daily-logs", {
        method: "POST",
        body: JSON.stringify({ ...data, dogId, date: data.date ?? today }),
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["daily-logs", dogId] }); },
  });

  const saveLog = useCallback(
    (data: Omit<DailyLog, "id" | "dogId" | "date">) => saveLogMutation.mutateAsync(data),
    [saveLogMutation]
  );

  const saveLogForDate = useCallback(
    (date: string, data: Omit<DailyLog, "id" | "dogId" | "date">) =>
      saveLogMutation.mutateAsync({ ...data, date }),
    [saveLogMutation]
  );

  const recentLogs = useCallback((days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return logs
      .filter((l) => l.date >= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  const allLogs = useMemo(
    () => [...logs].sort((a, b) => b.date.localeCompare(a.date)),
    [logs]
  );

  return { todayLog, saveLog, saveLogForDate, recentLogs, allLogs };
}
