import { useState, useCallback } from "react";

export interface WeightRecord {
  date: string; // YYYY-MM-DD
  weight: number;
}

const STORAGE_KEY = "meongcare_weight_history";
let _cache: Record<string, WeightRecord[]> | null = null;

function load(): Record<string, WeightRecord[]> {
  if (_cache) return _cache;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    _cache = data ? JSON.parse(data) : {};
    return _cache!;
  } catch {
    _cache = {};
    return _cache;
  }
}

function save(data: Record<string, WeightRecord[]>) {
  _cache = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
