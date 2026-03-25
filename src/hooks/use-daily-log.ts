import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

export interface DailyLog {
  id: string;
  dogId: string;
  date: string; // YYYY-MM-DD
  meal: 0 | 1 | 2 | 3;       // 0=안먹음 1=조금 2=보통 3=잘먹음
  walk: boolean;
  poop: boolean;
  pee: boolean;
  energy: 0 | 1 | 2;          // 0=축처짐 1=보통 2=활발
  memo: string;
}

const STORAGE_KEY = "meongcare_daily_logs";
let _cache: DailyLog[] | null = null;

function load(): DailyLog[] {
  if (_cache) return _cache;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    _cache = data ? JSON.parse(data) : [];
    return _cache!;
  } catch {
    _cache = [];
    return _cache;
  }
}

function save(logs: DailyLog[]) {
  _cache = logs;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to save daily logs", e);
  }
}

export function useDailyLog(dogId: string) {
  const [logs, setLogs] = useState<DailyLog[]>(load);
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = logs.find((l) => l.dogId === dogId && l.date === today) ?? null;

  const saveLog = useCallback((data: Omit<DailyLog, "id" | "dogId" | "date">) => {
    setLogs((prev) => {
      const existing = prev.find((l) => l.dogId === dogId && l.date === today);
      const next = existing
        ? prev.map((l) => l.id === existing.id ? { ...l, ...data } : l)
        : [{ id: uuidv4(), dogId, date: today, ...data }, ...prev].slice(0, 365);
      save(next);
      return next;
    });
  }, [dogId, today]);

  const recentLogs = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);
    cutoff.setHours(0, 0, 0, 0);
    return logs
      .filter((l) => l.dogId === dogId && new Date(l.date) >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  return { todayLog, saveLog, recentLogs };
}
