import { useState } from "react";
import { motion } from "framer-motion";
import { useDogs } from "@/hooks/use-dogs";
import { usePreventionMeds, MED_LABELS, type MedType, type MedRecord } from "@/hooks/use-prevention-meds";
import { DogSelector } from "@/components/health/DogSelector";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MED_TYPES: MedType[] = ["heartworm", "flea", "tick", "combo"];

const MED_INTERVAL: Record<MedType, { label: string; months: number }> = {
  heartworm: { label: "매월 1회", months: 1 },
  flea:      { label: "1~3개월 1회", months: 3 },
  tick:      { label: "1~3개월 1회", months: 3 },
  combo:     { label: "매월 1회", months: 1 },
};

function getLastDoneDate(all: MedRecord[], type: MedType): Date | null {
  const done = all
    .filter((r) => r.type === type && r.done && r.doneAt)
    .sort((a, b) => new Date(b.doneAt!).getTime() - new Date(a.doneAt!).getTime());
  return done[0] ? new Date(done[0].doneAt!) : null;
}

function elapsedMonths(from: Date): number {
  const now = new Date();
  return (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
}

function MonthLabel({ yearMonth }: { yearMonth: string }) {
  const [year, month] = yearMonth.split("-");
  const now = new Date();
  const isThis = now.getFullYear() === Number(year) && now.getMonth() + 1 === Number(month);
  return (
    <span className={cn("text-xs font-bold", isThis ? "text-primary" : "text-muted-foreground")}>
      {isThis ? "이번 달" : `${month}월`}
    </span>
  );
}

export function PreventionTab() {
  const { data: dogs } = useDogs();
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const activeDogId = selectedDogId ?? dogs?.[0]?.id ?? "";
  const { all, getRecord, toggle, months } = usePreventionMeds(activeDogId);
  const [activeTypes, setActiveTypes] = useState<MedType[]>(["heartworm", "flea"]);

  if (!dogs || dogs.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <span className="text-5xl mb-4">💊</span>
        <p className="text-base font-bold text-foreground">강아지를 먼저 등록해주세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DogSelector dogs={dogs} selectedId={selectedDogId} onSelect={setSelectedDogId} />

      {/* 약품 타입 선택 */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">관리할 예방약 선택</p>
        <div className="flex flex-wrap gap-2">
          {MED_TYPES.map((type) => {
            const cfg = MED_LABELS[type];
            const active = activeTypes.includes(type);
            return (
              <motion.button
                key={type}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.08 }}
                onClick={() => setActiveTypes((prev) =>
                  prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                )}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors",
                  active ? "bg-primary text-white border-primary shadow-sm shadow-primary/25" : "bg-card border-border/50 text-muted-foreground"
                )}
              >
                <span>{cfg.emoji}</span>{cfg.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 타입별 주기 + 타임라인 */}
      <div className="space-y-2">
        {activeTypes.map((type) => {
          const cfg = MED_LABELS[type];
          const interval = MED_INTERVAL[type];
          const lastDate = getLastDoneDate(all, type);
          const elapsed = lastDate ? elapsedMonths(lastDate) : null;
          const overdue = elapsed !== null && elapsed > interval.months;
          const steps = interval.months + 1;

          return (
            <div key={type} className="rounded-xl border border-border/50 bg-card px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">{cfg.emoji} {cfg.label}</span>
                <span className="text-[11px] text-muted-foreground">권장 {interval.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: steps }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-1.5 rounded-full",
                        elapsed === null
                          ? "bg-secondary"
                          : i < Math.min(elapsed, steps)
                            ? overdue ? "bg-red-400" : "bg-primary"
                            : "bg-secondary"
                      )}
                    />
                  ))}
                </div>
                <span className={cn("text-[11px] font-semibold shrink-0",
                  elapsed === null ? "text-muted-foreground"
                  : overdue ? "text-red-500"
                  : elapsed === 0 ? "text-primary"
                  : "text-foreground"
                )}>
                  {elapsed === null ? "기록 없음"
                    : elapsed === 0 ? "이번 달 완료"
                    : `${elapsed}개월 전`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 월별 체크 테이블 */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        {/* 헤더 */}
        <div className="grid bg-secondary/40 px-4 py-2 border-b border-border/30" style={{ gridTemplateColumns: `1fr ${activeTypes.map(() => "3.5rem").join(" ")}` }}>
          <span className="text-[11px] font-bold text-muted-foreground">월</span>
          {activeTypes.map((type) => (
            <span key={type} className="text-[11px] font-bold text-muted-foreground text-center">{MED_LABELS[type].emoji}</span>
          ))}
        </div>

        {/* 월별 행 */}
        {months.map((ym) => (
          <div
            key={ym}
            className="grid px-4 py-3 border-b border-border/20 last:border-0 items-center"
            style={{ gridTemplateColumns: `1fr ${activeTypes.map(() => "3.5rem").join(" ")}` }}
          >
            <MonthLabel yearMonth={ym} />
            {activeTypes.map((type) => {
              const rec = getRecord(type, ym);
              const done = rec?.done ?? false;
              return (
                <div key={type} className="flex justify-center">
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    transition={{ duration: 0.08 }}
                    onClick={() => toggle(type, ym)}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors border-2",
                      done
                        ? "bg-primary border-primary text-white shadow-sm shadow-primary/30"
                        : "bg-secondary/50 border-border/40 text-muted-foreground/30 hover:border-primary/30"
                    )}
                  >
                    {done ? <Check className="w-4 h-4 stroke-[3px]" /> : <span className="text-xs">—</span>}
                  </motion.button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        체크하면 완료 표시. 탭 하면 다시 미완료로 변경돼요
      </p>

      {/* 이번 달 미완료 알림 */}
      {(() => {
        const thisMonth = format(new Date(), "yyyy-MM");
        const undone = activeTypes.filter((type) => !getRecord(type, thisMonth)?.done);
        if (undone.length === 0) return (
          <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-3 text-center">
            <p className="text-sm font-bold text-green-700">이번 달 예방약 모두 완료했어요!</p>
          </div>
        );
        return (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-xs font-bold text-amber-700 mb-1">이번 달 미완료</p>
            <div className="flex flex-wrap gap-1.5">
              {undone.map((type) => (
                <span key={type} className="text-xs px-2.5 py-1 bg-white rounded-full border border-amber-200 text-amber-700 flex items-center gap-1">
                  {MED_LABELS[type].emoji} {MED_LABELS[type].label}
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
