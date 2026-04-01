import { useState } from "react";
import { useDogs } from "@/hooks/use-dogs";
import { DogSelector } from "@/components/health/DogSelector";
import { cn } from "@/lib/utils";

type ActivityLevel = "low" | "normal" | "high";

const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string; emoji: string; factor: number }[] = [
  { id: "low", label: "적음", emoji: "😴", factor: 0.8 },
  { id: "normal", label: "보통", emoji: "🐕", factor: 1.0 },
  { id: "high", label: "많음", emoji: "🏃", factor: 1.2 },
];

function calcDailyKcal(weightKg: number, age: number, neutered: boolean, activity: ActivityLevel): number {
  const rer = 70 * Math.pow(weightKg, 0.75);
  let factor = 1.6;
  if (age <= 1) factor = 2.5;
  else if (age <= 3) factor = 1.8;
  else if (age >= 8) factor = 1.2;
  if (neutered) factor *= 0.9;
  const actMult = ACTIVITY_OPTIONS.find((a) => a.id === activity)!.factor;
  return Math.round(rer * factor * actMult);
}

function calcFoodGrams(kcal: number, kcalPer100g: number): number {
  return Math.round((kcal / kcalPer100g) * 100);
}

export function FeedingCalcTab() {
  const { data: dogs } = useDogs();
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityLevel>("normal");
  const [kcalPer100g, setKcalPer100g] = useState("350");

  const dog = dogs?.find((d) => d.id === selectedDogId) ?? dogs?.[0] ?? null;
  const weight = dog?.weight ?? 0;
  const age = dog?.age ?? 3;
  const neutered = dog?.neutered ?? false;

  const dailyKcal = weight > 0 ? calcDailyKcal(weight, age, neutered, activity) : 0;
  const foodGrams = dailyKcal > 0 && parseFloat(kcalPer100g) > 0
    ? calcFoodGrams(dailyKcal, parseFloat(kcalPer100g))
    : 0;

  return (
    <div className="space-y-4">
      {dogs && dogs.length > 0 && (
        <DogSelector dogs={dogs} selectedId={selectedDogId} onSelect={setSelectedDogId} />
      )}

      {!dog || weight <= 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl block mb-4">🍽️</span>
          <p className="text-base font-bold text-foreground">체중 정보가 필요해요</p>
          <p className="text-sm text-muted-foreground mt-1">강아지 프로필에서 체중을 먼저 입력해주세요</p>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground">활동량</p>
            <div className="flex gap-2">
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setActivity(opt.id)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all text-center",
                    activity === opt.id
                      ? "bg-primary text-white border-primary"
                      : "bg-card border-border/50 text-muted-foreground"
                  )}
                >
                  <span className="block text-lg mb-0.5">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground">사료 열량 (100g당)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={kcalPer100g}
                onChange={(e) => setKcalPer100g(e.target.value)}
                className="flex-1 text-sm border border-border rounded-xl px-3 py-2 text-center focus:outline-none focus:border-primary"
              />
              <span className="text-xs text-muted-foreground shrink-0">kcal/100g</span>
            </div>
            <p className="text-[11px] text-muted-foreground">사료 포장지 뒷면에서 확인하세요 (보통 300~400)</p>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-5 text-center space-y-3">
            <p className="text-xs font-bold text-orange-600">{dog.name}의 하루 권장량</p>
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-3xl font-bold text-orange-600">{dailyKcal}</p>
                <p className="text-xs text-muted-foreground mt-0.5">kcal/일</p>
              </div>
              {foodGrams > 0 && (
                <div>
                  <p className="text-3xl font-bold text-amber-600">{foodGrams}g</p>
                  <p className="text-xs text-muted-foreground mt-0.5">사료/일</p>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>체중 {weight}kg · {age}살 · {neutered ? "중성화O" : "중성화X"} · 활동량 {ACTIVITY_OPTIONS.find((a) => a.id === activity)!.label}</p>
              <p>하루 {Math.round(foodGrams / 2)}g씩 2회 급여 권장</p>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="text-xs font-bold text-blue-600 mb-1">참고</p>
            <ul className="text-xs text-blue-700/80 space-y-0.5">
              <li>- 개체별 대사량이 다르므로 ±20% 조정이 필요할 수 있어요</li>
              <li>- 간식은 하루 칼로리의 10% 이내로 제한하세요</li>
              <li>- 체중 변화를 보며 양을 조절해주세요</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
