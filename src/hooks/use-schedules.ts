import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { userKey } from "@/lib/user-storage";
import { getAuthUserId } from "@/hooks/use-auth";

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

const BASE_KEY = "meongcare_schedules";

const getSchedulesFromStorage = (): Schedule[] => {
  const data = localStorage.getItem(userKey(BASE_KEY));
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const saveSchedulesToStorage = (schedules: Schedule[]) => {
  localStorage.setItem(userKey(BASE_KEY), JSON.stringify(schedules));
};

export function syncSchedulesToServer() {
  const schedules = getSchedulesFromStorage();
  const userId = getAuthUserId();
  fetch("/api/schedules/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schedules, userId }),
  }).catch(() => {});
}

export function useSchedules() {
  return useQuery({
    queryKey: ["schedules"],
    queryFn: () => getSchedulesFromStorage(),
  });
}

export function useAddSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Schedule, "id" | "createdAt">) => {
      const newSchedule: Schedule = {
        ...data,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      };
      const current = getSchedulesFromStorage();
      saveSchedulesToStorage([newSchedule, ...current]);
      return newSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      syncSchedulesToServer();
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Schedule> }) => {
      const schedules = getSchedulesFromStorage();
      const updated = schedules.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveSchedulesToStorage(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      syncSchedulesToServer();
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const schedules = getSchedulesFromStorage();
      saveSchedulesToStorage(schedules.filter((s) => s.id !== id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      syncSchedulesToServer();
    },
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
