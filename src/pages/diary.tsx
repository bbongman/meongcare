import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronDown, Edit2, ChevronLeft, ChevronRight, LayoutList, CalendarDays, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import { useDogs, type Dog } from "@/hooks/use-dogs";
import { useDailyLog, type DailyLog } from "@/hooks/use-daily-log";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MEAL_OPTIONS = [
  { value: 0 as const, label: "안먹음", emoji: "😞" },
  { value: 1 as const, label: "조금", emoji: "😐" },
  { value: 2 as const, label: "보통", emoji: "🙂" },
  { value: 3 as const, label: "잘먹음", emoji: "😋" },
];

const ENERGY_OPTIONS = [
  { value: 0 as const, label: "축처짐", emoji: "😴" },
  { value: 1 as const, label: "보통", emoji: "😊" },
  { value: 2 as const, label: "활발", emoji: "🐕" },
];

const MEAL_LABEL = ["안먹음", "조금", "보통", "잘먹음"];
const ENERGY_LABEL = ["축처짐", "보통", "활발"];
const ENERGY_COLOR = ["text-blue-400", "text-green-500", "text-orange-400"];

type LogData = Omit<DailyLog, "id" | "dogId" | "date">;

function EditLogForm({ log, onSave, onDone }: { log: DailyLog; onSave: (data: LogData) => void; onDone: () => void }) {
  const [meal, setMeal] = useState<DailyLog["meal"]>(log.meal);
  const [walk, setWalk] = useState(log.walk);
  const [poop, setPoop] = useState(log.poop);
  const [pee, setPee] = useState(log.pee);
  const [energy, setEnergy] = useState<DailyLog["energy"]>(log.energy);
  const [memo, setMemo] = useState(log.memo);
  const { toast } = useToast();

  function handleSave() {
    onSave({ meal, walk, poop, pee, energy, memo });
    toast({ title: "수정 완료!" });
    onDone();
  }

  return (
    <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-3">
      <div>
        <p className="text-xs font-bold mb-2">🍖 식사</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MEAL_OPTIONS.map((opt) => (
            <motion.button key={opt.value} onClick={() => setMeal(opt.value)}
              whileTap={{ scale: 0.88 }} transition={{ duration: 0.08 }}
              className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors",
                meal === opt.value ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary/50 border-border/40 text-muted-foreground")}>
              <span className="text-lg">{opt.emoji}</span>{opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-2">활동</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "산책", emoji: "🦮", value: walk, set: setWalk },
            { label: "대변", emoji: "💩", value: poop, set: setPoop },
            { label: "소변", emoji: "💧", value: pee, set: setPee },
          ].map((item) => (
            <motion.button key={item.label} onClick={() => item.set(!item.value)}
              whileTap={{ scale: 0.88 }} transition={{ duration: 0.08 }}
              className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors",
                item.value ? "bg-green-50 border-green-300 text-green-700" : "bg-secondary/50 border-border/40 text-muted-foreground")}>
              <span className="text-lg">{item.emoji}</span>{item.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-2">⚡ 활력</p>
        <div className="grid grid-cols-3 gap-1.5">
          {ENERGY_OPTIONS.map((opt) => (
            <motion.button key={opt.value} onClick={() => setEnergy(opt.value)}
              whileTap={{ scale: 0.88 }} transition={{ duration: 0.08 }}
              className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors",
                energy === opt.value ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary/50 border-border/40 text-muted-foreground")}>
              <span className="text-lg">{opt.emoji}</span>{opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-1.5">📝 메모</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="특이사항을 적어두세요"
          className="w-full h-16 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/40"
        />
      </div>

      <div className="flex gap-2">
        <motion.button onClick={onDone}
          whileTap={{ scale: 0.96 }} transition={{ duration: 0.08 }}
          className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">
          취소
        </motion.button>
        <motion.button onClick={handleSave}
          whileTap={{ scale: 0.96 }} transition={{ duration: 0.08 }}
          className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
          저장
        </motion.button>
      </div>
    </div>
  );
}

function LogEntry({ log, onSave }: { log: DailyLog; onSave: (data: LogData) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const isToday = log.date === today;
  const dateObj = new Date(log.date + "T00:00:00");

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      <button
        onClick={() => { setExpanded(!expanded); setEditing(false); }}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-foreground">
              {format(dateObj, "M월 d일 (EEE)", { locale: ko })}
            </p>
            {isToday && (
              <span className="text-[10px] font-bold text-white bg-primary px-1.5 py-0.5 rounded-full">오늘</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{MEAL_LABEL[log.meal]}</span>
            <span className={cn("text-xs font-medium", ENERGY_COLOR[log.energy])}>{ENERGY_LABEL[log.energy]}</span>
            {log.walk && <span className="text-xs">🦮</span>}
            {log.poop && <span className="text-xs">💩</span>}
            {log.pee && <span className="text-xs">💧</span>}
            {log.memo && <span className="text-xs text-muted-foreground truncate max-w-[120px]">📝 {log.memo}</span>}
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", expanded && "rotate-180")} />
      </button>

      <AnimatePresence>
        {expanded && !editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-secondary/50 rounded-xl px-3 py-2">
                  <p className="text-muted-foreground font-medium mb-0.5">식사</p>
                  <p className="font-bold text-foreground">{MEAL_LABEL[log.meal]}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl px-3 py-2">
                  <p className="text-muted-foreground font-medium mb-0.5">활력</p>
                  <p className={cn("font-bold", ENERGY_COLOR[log.energy])}>{ENERGY_LABEL[log.energy]}</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap text-xs">
                {[
                  { label: "산책", value: log.walk, emoji: "🦮" },
                  { label: "대변", value: log.poop, emoji: "💩" },
                  { label: "소변", value: log.pee, emoji: "💧" },
                ].map((item) => (
                  <span key={item.label} className={cn("px-2.5 py-1.5 rounded-xl font-semibold",
                    item.value ? "bg-green-50 text-green-700" : "bg-secondary/50 text-muted-foreground")}>
                    {item.emoji} {item.label}
                    {!item.value && <span className="ml-1 opacity-50">✕</span>}
                  </span>
                ))}
              </div>
              {log.memo && (
                <p className="text-xs text-muted-foreground bg-secondary/30 rounded-xl px-3 py-2 leading-relaxed">{log.memo}</p>
              )}
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <Edit2 className="w-3 h-3" /> 수정하기
              </button>
            </div>
          </motion.div>
        )}

        {expanded && editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <EditLogForm
              log={log}
              onSave={onSave}
              onDone={() => { setEditing(false); setExpanded(false); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CalendarView({ logs, onLogSave, dogId }: { logs: DailyLog[]; onLogSave: (date: string, data: LogData) => void; dogId: string }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addingDate, setAddingDate] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const logMap = new Map(logs.map((l) => [l.date, l]));

  // 월의 첫 번째 날 요일 (0=일)
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 6행 맞추기
  while (cells.length % 7 !== 0) cells.push(null);

  function getDotColor(day: number): string | null {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const log = logMap.get(key);
    if (!log) return null;
    if (log.energy === 2) return "bg-orange-400";
    if (log.energy === 1) return "bg-green-400";
    return "bg-blue-400";
  }

  function isToday(day: number) {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  }

  function getDateKey(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedLog = selectedDate ? logMap.get(selectedDate) : null;

  return (
    <div className="space-y-3">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-bold text-foreground">{year}년 {month + 1}월</p>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
          disabled={year === today.getFullYear() && month === today.getMonth()}
          className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center">
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
          <p key={d} className={cn("text-[11px] font-bold py-1", i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground")}>{d}</p>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const dot = getDotColor(day);
          const dateKey = getDateKey(day);
          const selected = selectedDate === dateKey;
          const hasLog = !!logMap.get(dateKey);
          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(selected ? null : dateKey)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors",
                selected ? "bg-primary/10" : hasLog ? "hover:bg-secondary/60" : "hover:bg-secondary/30",
                isToday(day) && "ring-1 ring-primary ring-offset-1"
              )}
            >
              <span className={cn("text-xs font-semibold",
                idx % 7 === 0 ? "text-red-400" : idx % 7 === 6 ? "text-blue-400" : "text-foreground",
                !hasLog && "text-muted-foreground/50"
              )}>{day}</span>
              {dot ? (
                <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
              ) : (
                <span className="w-1.5 h-1.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex gap-3 justify-center text-[10px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />활발</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />보통</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />축처짐</span>
      </div>

      {/* 선택된 날 상세 */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {selectedLog ? (
              <LogEntry
                log={selectedLog}
                onSave={(data) => onLogSave(selectedDate, data)}
              />
            ) : addingDate === selectedDate ? (
              <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                <div className="px-4 pt-3 pb-1 border-b border-border/30">
                  <p className="text-sm font-bold">{selectedDate.slice(5).replace("-", "월 ")}일 기록 추가</p>
                </div>
                <EditLogForm
                  log={{ id: "", dogId, date: selectedDate, meal: 2, walk: false, poop: false, pee: false, energy: 1, memo: "" }}
                  onSave={(data) => {
                    onLogSave(selectedDate, data);
                    setAddingDate(null);
                  }}
                  onDone={() => setAddingDate(null)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 bg-secondary/30 rounded-2xl">
                <p className="text-sm text-muted-foreground">{selectedDate.slice(5).replace("-", "월 ")}일 기록 없음</p>
                <button
                  onClick={() => setAddingDate(selectedDate)}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
                >
                  기록하기
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DiaryContent({ dog }: { dog: Dog }) {
  const { allLogs, saveLogForDate } = useDailyLog(dog.id);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [query, setQuery] = useState("");

  const filteredLogs = query.trim()
    ? allLogs.filter((l) => l.memo?.toLowerCase().includes(query.toLowerCase()))
    : allLogs;

  const header = (
    <div className="space-y-2 mb-3">
      <div className="flex justify-end">
        <div className="flex bg-secondary rounded-xl p-0.5 gap-0.5">
          <button
            onClick={() => setView("list")}
            className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              view === "list" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground")}
          >
            <LayoutList className="w-3.5 h-3.5" />목록
          </button>
          <button
            onClick={() => setView("calendar")}
            className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              view === "calendar" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground")}
          >
            <CalendarDays className="w-3.5 h-3.5" />캘린더
          </button>
        </div>
      </div>
      {view === "list" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메모 검색..."
            className="w-full h-9 pl-8 pr-8 rounded-xl border border-border/60 bg-secondary/40 text-sm focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/60"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (allLogs.length === 0) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4 text-4xl">📔</div>
          <p className="text-base font-bold text-foreground">아직 기록이 없어요</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            홈에서 오늘 건강 체크를<br/>시작해보세요
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      {view === "list" ? (
        <div className="space-y-2">
          {filteredLogs.length === 0 && query ? (
            <div className="text-center py-10 text-sm text-muted-foreground">"{query}" 검색 결과가 없어요</div>
          ) : filteredLogs.map((log) => (
            <LogEntry
              key={log.id}
              log={log}
              onSave={(data) => saveLogForDate(log.date, data)}
            />
          ))}
        </div>
      ) : (
        <CalendarView
          logs={allLogs}
          onLogSave={(date, data) => saveLogForDate(date, data)}
          dogId={dog.id}
        />
      )}
    </>
  );
}

export default function Diary() {
  const { data: dogs = [] } = useDogs();
  const [selectedDogId, setSelectedDogId] = useState<string>(() => dogs[0]?.id ?? "");

  const activeDogId = selectedDogId || dogs[0]?.id;
  const activeDog = dogs.find((d) => d.id === activeDogId) ?? dogs[0];

  if (dogs.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <span className="text-5xl mb-4">🐾</span>
          <p className="text-base font-bold text-foreground">강아지를 먼저 등록해주세요</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-xl">📔</div>
          <div>
            <h1 className="text-xl font-bold text-foreground">건강 다이어리</h1>
            <p className="text-xs text-muted-foreground mt-0.5">날짜별 건강 기록을 확인해요</p>
          </div>
        </div>

        {dogs.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {dogs.map((dog) => (
              <button
                key={dog.id}
                onClick={() => setSelectedDogId(dog.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                  activeDogId === dog.id
                    ? "bg-primary text-white border-primary"
                    : "bg-card border-border/50 text-muted-foreground hover:border-primary/30"
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

        {activeDog && <DiaryContent dog={activeDog} />}
      </div>
    </Layout>
  );
}
