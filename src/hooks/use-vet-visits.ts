import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { userKey } from "@/lib/user-storage";

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

const BASE_KEY = "meongcare_vet_visits";

function loadVisits(): VetVisit[] {
  try {
    const data = localStorage.getItem(userKey(BASE_KEY));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveVisits(items: VetVisit[]) {
  localStorage.setItem(userKey(BASE_KEY), JSON.stringify(items));
}

export function useVetVisits() {
  const [visits, setVisits] = useState<VetVisit[]>(loadVisits);

  const addVisit = useCallback((visit: Omit<VetVisit, "id" | "createdAt">) => {
    const item: VetVisit = {
      ...visit,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setVisits((prev) => {
      const next = [item, ...prev].slice(0, 100);
      saveVisits(next);
      return next;
    });
    return item;
  }, []);

  const removeVisit = useCallback((id: string) => {
    setVisits((prev) => {
      const next = prev.filter((v) => v.id !== id);
      saveVisits(next);
      return next;
    });
  }, []);

  const getRecent = useCallback((count = 3) => {
    return visits.slice(0, count);
  }, [visits]);

  return { visits, addVisit, removeVisit, getRecent };
}
