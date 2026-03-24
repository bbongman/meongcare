import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

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

const STORAGE_KEY = "meongcare_health_history";

// 모듈 레벨 캐시 — 여러 컴포넌트가 동시에 마운트돼도 localStorage는 1번만 읽음
let _cache: HistoryItem[] | null = null;

function loadHistory(): HistoryItem[] {
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

function saveHistory(items: HistoryItem[]) {
  _cache = items;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useHealthHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);

  const addItem = useCallback((
    type: HistoryType,
    dogName: string,
    input: string,
    result: HistoryResult
  ) => {
    const item: HistoryItem = {
      id: uuidv4(),
      type,
      dogName,
      date: new Date().toISOString(),
      input,
      result,
    };
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 50); // 최대 50개
      saveHistory(next);
      return next;
    });
    return item;
  }, []);

  const removeItem = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, addItem, removeItem, clearAll };
}
