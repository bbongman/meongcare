import { useState } from "react";
import { useDogs } from "@/hooks/use-dogs";
import { useVaccines } from "@/hooks/use-vaccines";
import { DogSelector } from "@/components/health/DogSelector";
import { Trash2, Plus, Calendar, ChevronRight, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";

const COMMON_VACCINES = [
  "종합백신 (DHPPL)",
  "코로나장염",
  "켄넬코프",
  "광견병",
  "인플루엔자",
  "심장사상충 예방",
  "외부기생충 예방",
  "기타",
];

function getDDayText(dateStr: string) {
  const diff = differenceInDays(new Date(dateStr), new Date());
  if (diff < 0) return `D+${Math.abs(diff)}`;
  if (diff === 0) return "D-Day";
  return `D-${diff}`;
}

function getDDayColor(dateStr: string) {
  const diff = differenceInDays(new Date(dateStr), new Date());
  if (diff < 0) return "bg-gray-100 text-gray-500";
  if (diff <= 7) return "bg-red-100 text-red-600 font-bold";
  if (diff <= 30) return "bg-orange-100 text-orange-600";
  return "bg-blue-100 text-blue-600";
}

interface FormState {
  vaccineName: string;
  date: string;
  hospitalName: string;
  nextDate: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  vaccineName: "",
  date: new Date().toISOString().slice(0, 10),
  hospitalName: "",
  nextDate: "",
  notes: "",
};

export function VaccineTab() {
  const { data: dogs } = useDogs();
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const activeDogId = selectedDogId ?? dogs?.[0]?.id ?? "";
  const { records, addRecord, removeRecord } = useVaccines(activeDogId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleSave() {
    if (!form.vaccineName || !form.date) return;
    addRecord({ ...form });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  if (!dogs || dogs.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <span className="text-5xl mb-4">💉</span>
        <p className="text-base font-bold text-foreground">강아지를 먼저 등록해주세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DogSelector dogs={dogs} selectedId={selectedDogId} onSelect={setSelectedDogId} />

      <motion.button
        onClick={() => setShowForm(!showForm)}
        whileTap={{ scale: 0.96 }} transition={{ duration: 0.08 }}
        className={cn(
          "w-full py-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors",
          showForm
            ? "bg-secondary border-border/60 text-muted-foreground"
            : "bg-primary text-white border-primary shadow-sm hover:bg-primary/90"
        )}
      >
        <Plus className="w-4 h-4" />
        {showForm ? "취소" : "접종 기록 추가"}
      </motion.button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-border/50 bg-card p-4 space-y-3"
          >
            <p className="text-sm font-bold text-foreground">접종 정보 입력</p>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">백신 종류</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_VACCINES.map((v) => (
                  <motion.button
                    key={v}
                    onClick={() => setForm((p) => ({ ...p, vaccineName: v }))}
                    whileTap={{ scale: 0.88 }} transition={{ duration: 0.08 }}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-colors",
                      form.vaccineName === v
                        ? "bg-primary text-white border-primary"
                        : "bg-secondary border-border/40 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {v}
                  </motion.button>
                ))}
              </div>
              {form.vaccineName === "기타" && (
                <input
                  type="text"
                  placeholder="백신명 직접 입력"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary"
                  onChange={(e) => setForm((p) => ({ ...p, vaccineName: e.target.value }))}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">접종일</p>
                <input
                  type="date"
                  value={form.date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">다음 접종일 <span className="font-normal">(선택)</span></p>
                <input
                  type="date"
                  value={form.nextDate}
                  min={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, nextDate: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">병원명 <span className="font-normal">(선택)</span></p>
              <input
                type="text"
                value={form.hospitalName}
                onChange={(e) => setForm((p) => ({ ...p, hospitalName: e.target.value }))}
                placeholder="동물병원 이름"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">메모 <span className="font-normal">(선택)</span></p>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="부작용, 특이사항 등"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <motion.button
              onClick={handleSave}
              disabled={!form.vaccineName || !form.date}
              whileTap={form.vaccineName && form.date ? { scale: 0.96 } : undefined} transition={{ duration: 0.08 }}
              className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-bold disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              저장하기
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {records.length === 0 && !showForm ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-3">
            <Syringe className="w-7 h-7 text-purple-400" />
          </div>
          <p className="text-sm font-bold text-foreground">접종 기록이 없어요</p>
          <p className="text-xs text-muted-foreground mt-1">위 버튼을 눌러 기록을 추가해보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((rec) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/50 bg-card p-4 flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <Syringe className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-foreground truncate">{rec.vaccineName}</p>
                  {confirmDeleteId === rec.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-muted-foreground px-2 py-0.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">취소</button>
                      <button onClick={() => { removeRecord(rec.id); setConfirmDeleteId(null); }} className="text-xs text-white bg-red-500 hover:bg-red-600 transition-colors px-2 py-0.5 rounded-lg font-semibold">삭제</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(rec.id)} className="text-muted-foreground/40 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(rec.date), "yyyy.MM.dd", { locale: ko })}
                  </span>
                  {rec.hospitalName && (
                    <span className="text-xs text-muted-foreground">{rec.hospitalName}</span>
                  )}
                </div>
                {rec.nextDate && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">다음 접종</span>
                    <span className="text-xs font-semibold text-foreground">{format(new Date(rec.nextDate), "yyyy.MM.dd")}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", getDDayColor(rec.nextDate))}>
                      {getDDayText(rec.nextDate)}
                    </span>
                  </div>
                )}
                {rec.notes && <p className="text-xs text-muted-foreground mt-1">{rec.notes}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
