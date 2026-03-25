import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useDailyLog, type DailyLog } from "@/hooks/use-daily-log";
import { type Dog } from "@/hooks/use-dogs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DailyCheckDialogProps {
  dogs: Dog[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MEAL_OPTIONS = [
  { value: 0, label: "안먹음", emoji: "😞" },
  { value: 1, label: "조금", emoji: "😐" },
  { value: 2, label: "보통", emoji: "🙂" },
  { value: 3, label: "잘먹음", emoji: "😋" },
] as const;

const ENERGY_OPTIONS = [
  { value: 0, label: "축처짐", emoji: "😴" },
  { value: 1, label: "보통", emoji: "😊" },
  { value: 2, label: "활발", emoji: "🐕" },
] as const;

function DailyCheckForm({ dog, onSaved }: { dog: Dog; onSaved: () => void }) {
  const { todayLog, saveLog } = useDailyLog(dog.id);
  const { toast } = useToast();

  const [meal, setMeal] = useState<DailyLog["meal"]>(todayLog?.meal ?? 2);
  const [walk, setWalk] = useState(todayLog?.walk ?? false);
  const [poop, setPoop] = useState(todayLog?.poop ?? false);
  const [pee, setPee] = useState(todayLog?.pee ?? false);
  const [energy, setEnergy] = useState<DailyLog["energy"]>(todayLog?.energy ?? 1);
  const [memo, setMemo] = useState(todayLog?.memo ?? "");

  const handleSave = () => {
    saveLog({ meal, walk, poop, pee, energy, memo });
    toast({ title: "오늘 기록 저장 완료!", description: `${dog.name}의 컨디션이 저장됐어요.` });
    onSaved();
  };

  return (
    <div className="p-6 space-y-6">
      <p className="text-sm text-muted-foreground">
        {dog.name}의 오늘 컨디션을 기록해요
        {todayLog && <span className="ml-2 text-xs text-primary font-semibold">오늘 이미 기록됨 (수정 가능)</span>}
      </p>

      {/* 식사 */}
      <div>
        <p className="text-sm font-bold text-foreground mb-2">🍖 식사</p>
        <div className="grid grid-cols-4 gap-2">
          {MEAL_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setMeal(opt.value)}
              className={cn("flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-semibold transition-all",
                meal === opt.value ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary/50 border-border/40 text-muted-foreground hover:border-primary/20")}>
              <span className="text-xl">{opt.emoji}</span>{opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 산책/배변 */}
      <div>
        <p className="text-sm font-bold text-foreground mb-2">활동</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "산책", emoji: "🦮", value: walk, set: setWalk },
            { label: "대변", emoji: "💩", value: poop, set: setPoop },
            { label: "소변", emoji: "💧", value: pee, set: setPee },
          ].map((item) => (
            <button key={item.label} onClick={() => item.set(!item.value)}
              className={cn("flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-semibold transition-all",
                item.value ? "bg-green-50 border-green-300 text-green-700" : "bg-secondary/50 border-border/40 text-muted-foreground hover:border-primary/20")}>
              <span className="text-xl">{item.emoji}</span>{item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 에너지 */}
      <div>
        <p className="text-sm font-bold text-foreground mb-2">⚡ 활력</p>
        <div className="grid grid-cols-3 gap-2">
          {ENERGY_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setEnergy(opt.value)}
              className={cn("flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-semibold transition-all",
                energy === opt.value ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary/50 border-border/40 text-muted-foreground hover:border-primary/20")}>
              <span className="text-xl">{opt.emoji}</span>{opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 메모 */}
      <div>
        <p className="text-sm font-bold text-foreground mb-2">📝 메모 (선택)</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="특이사항을 적어두세요"
          className="w-full h-20 rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <Button onClick={handleSave}
        className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-orange-500 shadow-lg shadow-primary/25">
        저장하기
      </Button>
    </div>
  );
}

export function DailyCheckDialog({ dogs, open, onOpenChange }: DailyCheckDialogProps) {
  const [selectedDogId, setSelectedDogId] = useState<string>(dogs[0]?.id ?? "");

  useEffect(() => {
    if (open) setSelectedDogId(dogs[0]?.id ?? "");
  }, [open]);

  const selectedDog = dogs.find((d) => d.id === selectedDogId) ?? dogs[0];
  if (!selectedDog) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 rounded-[2rem] shadow-2xl">
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 px-6 py-4 flex items-center justify-between">
          <DialogTitle className="text-xl font-bold font-display tracking-wide">
            오늘 건강 체크
          </DialogTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-secondary hover:bg-secondary/80" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 강아지 2마리 이상일 때만 선택 탭 표시 */}
        {dogs.length > 1 && (
          <div className="flex gap-2 px-6 pt-4 overflow-x-auto">
            {dogs.map((dog) => (
              <button
                key={dog.id}
                onClick={() => setSelectedDogId(dog.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 border transition-all",
                  selectedDogId === dog.id
                    ? "bg-primary text-white border-primary"
                    : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
                )}
              >
                {dog.photo
                  ? <img src={dog.photo} className="w-4 h-4 rounded-full object-cover" alt="" />
                  : <span>🐕</span>}
                {dog.name}
              </button>
            ))}
          </div>
        )}

        <DailyCheckForm key={`${selectedDog.id}_${open}`} dog={selectedDog} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
