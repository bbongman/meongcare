import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type ScheduleType = "meal" | "medicine" | "walk" | "vaccine";
export type RepeatType = "daily" | "weekly" | "monthly" | "none";

export interface Schedule {
  id: string;
  type: ScheduleType;
  title: string;
  time: string;
  repeat: RepeatType;
  dogId?: string;
  dogName?: string;
  medicineName?: string;
  vaccineDate?: string;
  enabled: boolean;
  createdAt: string;
}

export function useSchedules() {
  return useQuery<Schedule[]>({
    queryKey: ["schedules"],
    queryFn: () => apiFetch<Schedule[]>("/api/schedules"),
  });
}

export function useAddSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Schedule, "id" | "createdAt">) =>
      apiFetch<Schedule>("/api/schedules", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Schedule> }) =>
      apiFetch<Schedule>(`/api/schedules/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/schedules/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedules"] }); },
  });
}

export const SCHEDULE_LABELS: Record<ScheduleType, { label: string; emoji: string; color: string; bg: string }> = {
  meal: { label: "밥 시간", emoji: "🍖", color: "text-orange-500", bg: "bg-orange-50 border-orange-100" },
  medicine: { label: "약 복용", emoji: "💊", color: "text-blue-500", bg: "bg-blue-50 border-blue-100" },
  walk: { label: "산책", emoji: "🦮", color: "text-green-500", bg: "bg-green-50 border-green-100" },
  vaccine: { label: "예방접종", emoji: "💉", color: "text-purple-500", bg: "bg-purple-50 border-purple-100" },
};

export const REPEAT_LABELS: Record<RepeatType, string> = {
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
  none: "반복 없음",
};

// 레거시 호환 - 더 이상 localStorage를 쓰지 않으므로 no-op
export function syncSchedulesToServer() {}
