import { useState, useCallback } from "react";

const KEY_PREFIX = "meongcare_schedule_done_";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(): string {
  return `${KEY_PREFIX}${todayKey()}`;
}

function getChecked(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey()) || "[]"));
  } catch {
    return new Set();
  }
}

export function useScheduleCheck() {
  const [checked, setChecked] = useState<Set<string>>(getChecked);

  const toggle = useCallback((scheduleId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(scheduleId)) {
        next.delete(scheduleId);
      } else {
        next.add(scheduleId);
      }
      localStorage.setItem(storageKey(), JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isChecked = useCallback((scheduleId: string) => checked.has(scheduleId), [checked]);

  return { checked, toggle, isChecked };
}
