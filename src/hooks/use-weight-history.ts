import { useState, useCallback } from "react";
import { userKey } from "@/lib/user-storage";

export interface WeightRecord {
  date: string; // YYYY-MM-DD
  weight: number;
}

const BASE_KEY = "meongcare_weight_history";

function load(): Record<string, WeightRecord[]> {
  try {
    const data = localStorage.getItem(userKey(BASE_KEY));
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function save(data: Record<string, WeightRecord[]>) {
  localStorage.setItem(userKey(BASE_KEY), JSON.stringify(data));
}

export function useWeightHistory(dogId: string) {
  const [allData, setAllData] = useState<Record<string, WeightRecord[]>>(load);
  const records = (allData[dogId] ?? []).sort((a, b) => a.date.localeCompare(b.date));

  const addRecord = useCallback((weight: number) => {
    const date = new Date().toISOString().slice(0, 10);
    setAllData((prev) => {
      const dogRecords = prev[dogId] ?? [];
      const existing = dogRecords.find((r) => r.date === date);
      const next = existing
        ? dogRecords.map((r) => r.date === date ? { ...r, weight } : r)
        : [...dogRecords, { date, weight }].slice(-60); // 최근 60개
      const updated = { ...prev, [dogId]: next };
      save(updated);
      return updated;
    });
  }, [dogId]);

  return { records, addRecord };
}
