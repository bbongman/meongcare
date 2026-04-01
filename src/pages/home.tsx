import { useState, useEffect, useRef } from "react";
import { Plus, Bone, Activity, HeartPulse, CalendarClock, MoreHorizontal, Bell, X, Stethoscope, ChevronRight, Pencil, Share2, Timer, Square, Star, Phone } from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ProfileDialog } from "@/components/profile-dialog";
import { InstallGuideDialog } from "@/components/install-guide-dialog";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useLocation } from "wouter";
import { useDogs, type Dog } from "@/hooks/use-dogs";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { AddDogDialog } from "@/components/add-dog-dialog";
import { EditDogDialog } from "@/components/edit-dog-dialog";
import { DailyCheckDialog } from "@/components/daily-check-dialog";
import { useDailyLog } from "@/hooks/use-daily-log";
import { useSchedules, useAddSchedule, syncSchedulesToServer, SCHEDULE_LABELS } from "@/hooks/use-schedules";
import { useVetVisits } from "@/hooks/use-vet-visits";
import { usePreventionMeds, MED_LABELS, type MedType } from "@/hooks/use-prevention-meds";
import { useWeightHistory } from "@/hooks/use-weight-history";
import { useScheduleCheck } from "@/hooks/use-schedule-check";
import { getFavVets } from "@/hooks/use-fav-vets";
import { useAllUpcomingVaccines } from "@/hooks/use-vaccines";
import { differenceInDays } from "date-fns";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MEAL_LABEL, ENERGY_LABEL, ENERGY_COLOR } from "@/lib/constants";
import { getBreedDiseases } from "@/lib/breed-diseases";
import { getDisplayAge, getBirthdayDiff, toHumanAge, getHealthTip } from "@/lib/dog-utils";
import { motion, AnimatePresence } from "framer-motion";

function TodayConditionBadge({ dogId }: { dogId: string }) {
  const { todayLog } = useDailyLog(dogId);
  if (!todayLog) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 relative z-10">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">오늘</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-semibold text-foreground">{MEAL_LABEL[todayLog.meal]}</span>
        <span className={`text-xs font-semibold ${ENERGY_COLOR[todayLog.energy]}`}>{ENERGY_LABEL[todayLog.energy]}</span>
        {todayLog.walk && <span className="text-xs">🦮</span>}
        {todayLog.poop && <span className="text-xs">💩</span>}
      </div>
    </div>
  );
}

function WalkTimerWidget({ dogId }: { dogId: string }) {
  const { todayLog, saveLog } = useDailyLog(dogId);
  const storageKey = `walk_timer_${dogId}`;
  const [startTime, setStartTime] = useState<number | null>(() => {
    const v = localStorage.getItem(storageKey);
    return v ? parseInt(v) : null;
  });
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!startTime) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [startTime]);

  function handleStart() {
    const now = Date.now();
    localStorage.setItem(storageKey, String(now));
    setStartTime(now);
  }

  function handleStop() {
    const mins = Math.round(elapsed / 60);
    localStorage.removeItem(storageKey);
    setStartTime(null);
    const prevMemo = todayLog?.memo ?? "";
    const walkMemo = `산책 ${mins}분`;
    saveLog({
      meal: todayLog?.meal ?? 2,
      walk: true,
      poop: todayLog?.poop ?? false,
      pee: todayLog?.pee ?? false,
      energy: todayLog?.energy ?? 1,
      memo: prevMemo ? `${prevMemo}\n${walkMemo}` : walkMemo,
    });
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (startTime) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-3xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦮</span>
            <p className="text-xs font-bold text-green-700">산책 중</p>
          </div>
          <p className="text-2xl font-bold text-green-600 tabular-nums">{mm}:{ss}</p>
        </div>
        <button
          onClick={handleStop}
          className="w-full py-3 rounded-2xl bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
        >
          <Square className="w-4 h-4" />산책 종료 및 기록
        </button>
      </motion.div>
    );
  }

  return null;
}

function TodayCheckButton({ dogId, onClick, hasLog }: { dogId: string; onClick: () => void; hasLog: boolean }) {
  return (
    <div className="bg-orange-50/80 border border-orange-100 rounded-3xl p-5 cursor-pointer hover:bg-orange-100 transition-colors group" onClick={onClick}>
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary mb-4 group-hover:scale-110 transition-transform">
        <Activity className="w-6 h-6 stroke-[2.5px]" />
      </div>
      <h3 className="font-bold text-foreground">오늘 건강 체크</h3>
      <p className="text-xs font-medium text-muted-foreground mt-1">{hasLog ? "수정하기" : "컨디션 기록하기"}</p>
    </div>
  );
}

function TodayStatusCard({ dogId, dogName, onEdit }: { dogId: string; dogName?: string; onEdit: () => void }) {
  const { todayLog, recentLogs } = useDailyLog(dogId);

  if (!todayLog) return null;

  const MEAL_BG = ["bg-gray-300", "bg-yellow-300", "bg-orange-400", "bg-orange-500"];
  const ENERGY_BG = ["bg-blue-300", "bg-green-400", "bg-orange-400"];

  const recent = recentLogs(7);
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const log = recent.find((l) => l.date === key);
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, energy: log ? log.energy : null };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-3xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{dogName ? `${dogName}의 오늘 컨디션` : "오늘 컨디션"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</p>
        </div>
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 게이지 */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">식사량</span>
            <span className="text-xs font-bold text-foreground">{MEAL_LABEL[todayLog.meal]}</span>
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", MEAL_BG[todayLog.meal])}
              style={{ width: `${(todayLog.meal / 3) * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">기력</span>
            <span className="text-xs font-bold text-foreground">{ENERGY_LABEL[todayLog.energy]}</span>
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", ENERGY_BG[todayLog.energy])}
              style={{ width: `${(todayLog.energy / 2) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 아이콘 배지 */}
      <div className="flex gap-2">
        {[
          { label: "산책", value: todayLog.walk, icon: "🦮" },
          { label: "배변", value: todayLog.poop, icon: "💩" },
          { label: "소변", value: todayLog.pee, icon: "💧" },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold",
              value ? "bg-green-50 text-green-700 border border-green-200" : "bg-secondary text-muted-foreground border border-border/30"
            )}
          >
            <span>{icon}</span>{label}
            {value ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 opacity-40" />}
          </div>
        ))}
      </div>

      {/* 7일 기력 스파크라인 */}
      {recent.length >= 2 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">최근 7일 기력 흐름</p>
          <ResponsiveContainer width="100%" height={56}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number | null) => [v !== null ? ENERGY_LABEL[v] : "-", "기력"]}
                contentStyle={{ fontSize: 10, borderRadius: 8 }}
              />
              <Area
                type="monotone"
                dataKey="energy"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#energyGrad)"
                connectNulls
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {todayLog.memo && (
        <p className="text-xs text-muted-foreground bg-secondary rounded-xl px-3 py-2">{todayLog.memo}</p>
      )}
    </motion.div>
  );
}

function WeeklyHealthWidget({ dogId, dogName }: { dogId: string; dogName: string }) {
  const { recentLogs } = useDailyLog(dogId);
  const logs = recentLogs(7);
  if (logs.length < 3) return null;

  const walkDays = logs.filter((l) => l.walk).length;
  const avgMeal = logs.reduce((s, l) => s + l.meal, 0) / logs.length;
  const avgEnergy = logs.reduce((s, l) => s + l.energy, 0) / logs.length;
  const energyIdx = Math.round(avgEnergy);
  const mealIdx = Math.round(avgMeal);
  const energyColor = energyIdx === 2 ? "text-orange-500" : energyIdx === 1 ? "text-green-500" : "text-blue-400";

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-3xl p-4">
      <p className="text-xs font-bold text-violet-600 mb-3">{dogName} · 이번 주 요약</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/70 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-green-500">{walkDays}일</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">산책 / 7일</p>
        </div>
        <div className="bg-white/70 rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-orange-500">{MEAL_LABEL[mealIdx]}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">평균 식사</p>
        </div>
        <div className="bg-white/70 rounded-2xl p-3 text-center">
          <p className={cn("text-xl font-bold", energyColor)}>{ENERGY_LABEL[energyIdx]}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">평균 기력</p>
        </div>
      </div>
    </div>
  );
}

function HealthTipWidget({ dog }: { dog: Dog }) {
  const tip = getHealthTip(dog);
  const breedInfo = getBreedDiseases(dog.breed);
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0">
          {tip.emoji}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-blue-600 mb-0.5">{dog.name} 건강 팁 · {tip.title}</p>
          <p className="text-xs text-blue-800/80 leading-relaxed">{tip.body}</p>
        </div>
      </div>
      {breedInfo && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-3xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🔬</span>
            <p className="text-xs font-bold text-rose-600">{dog.breed} 주의 질환</p>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {breedInfo.diseases.map((d) => (
              <span key={d} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-rose-200 text-rose-600 font-semibold">{d}</span>
            ))}
          </div>
          <p className="text-xs text-rose-700/80 leading-relaxed">{breedInfo.tip}</p>
        </div>
      )}
    </div>
  );
}

function UpcomingVetWidget() {
  const { visits } = useVetVisits();
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = visits
    .filter((v) => v.nextVisitDate && v.nextVisitDate >= today)
    .sort((a, b) => a.nextVisitDate.localeCompare(b.nextVisitDate))[0];
  if (!upcoming) return null;
  const diff = differenceInDays(new Date(upcoming.nextVisitDate), new Date());
  const urgent = diff <= 7;
  return (
    <div className={cn("border rounded-3xl p-4 flex items-center gap-3", urgent ? "bg-red-50 border-red-100" : "bg-teal-50 border-teal-100")}>
      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm text-xl shrink-0">🏥</div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold", urgent ? "text-red-600" : "text-teal-700")}>
          {urgent ? "다음 진료 임박!" : "다음 진료 예정"}
        </p>
        <p className="text-sm font-semibold text-foreground truncate">{upcoming.hospitalName || "병원 방문"}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(upcoming.nextVisitDate), "M월 d일 (EEE)", { locale: ko })}
          {diff === 0 ? " — 오늘!" : diff > 0 ? ` — D-${diff}` : ` — D+${Math.abs(diff)}`}
        </p>
      </div>
      <button onClick={() => setLocation("/health")} className={cn("text-[11px] font-semibold shrink-0", urgent ? "text-red-500" : "text-teal-500")}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function RecentVetVisitWidget() {
  const { getRecent } = useVetVisits();
  const [, setLocation] = useLocation();
  const recent = getRecent(2);

  if (recent.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-3xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Stethoscope className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xs font-bold text-teal-700">최근 검진 기록</p>
        </div>
        <button
          onClick={() => setLocation("/health")}
          className="text-[11px] font-semibold text-teal-600 flex items-center gap-0.5 hover:text-teal-800 transition-colors"
        >
          전체보기 <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-2">
        {recent.map((visit) => (
          <div key={visit.id} className="bg-white/70 rounded-xl px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{visit.hospitalName || "병원명 미입력"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {visit.visitDate ? format(new Date(visit.visitDate), "M.dd (EEE)", { locale: ko }) : "날짜 미입력"}
                </span>
                {visit.diagnosis && (
                  <span className="text-[11px] text-teal-600 font-medium truncate">{visit.diagnosis}</span>
                )}
              </div>
            </div>
            {visit.totalPrice > 0 && (
              <span className="text-xs font-bold text-foreground shrink-0">{visit.totalPrice.toLocaleString()}원</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingVaccineWidget() {
  const upcoming = useAllUpcomingVaccines();
  const [, setLocation] = useLocation();
  if (upcoming.length === 0) return null;
  const next = upcoming[0];
  const diff = differenceInDays(new Date(next.nextDate), new Date());
  const urgent = diff <= 7;
  return (
    <div className={cn(
      "border rounded-3xl p-4 flex items-center gap-3",
      urgent ? "bg-red-50 border-red-100" : "bg-purple-50 border-purple-100"
    )}>
      <div className={cn("w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm text-xl shrink-0")}>
        💉
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold", urgent ? "text-red-600" : "text-purple-700")}>
          {urgent ? "예방접종 임박!" : "예방접종 예정"}
        </p>
        <p className="text-sm font-semibold text-foreground truncate">{next.vaccineName}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(next.nextDate), "M월 d일 (EEE)", { locale: ko })}
          {diff === 0 ? " — 오늘!" : diff > 0 ? ` — D-${diff}` : ` — D+${Math.abs(diff)}`}
        </p>
      </div>
      <button
        onClick={() => setLocation("/health")}
        className={cn("text-[11px] font-semibold shrink-0", urgent ? "text-red-500" : "text-purple-500")}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

const MED_TYPES: MedType[] = ["heartworm", "flea", "tick", "combo"];

function PreventionMedsWidget({ dogId }: { dogId: string }) {
  const { getRecord, months } = usePreventionMeds(dogId);
  const [, setLocation] = useLocation();
  const yearMonth = months[0];
  // 이전 달에 한 번이라도 사용한 타입만 체크
  const trackedTypes = MED_TYPES.filter((t) =>
    months.slice(1).some((m) => getRecord(t, m)?.done)
  );
  const undone = trackedTypes.filter((t) => !getRecord(t, yearMonth)?.done);
  if (undone.length === 0) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm text-base">💊</div>
          <p className="text-xs font-bold text-amber-700">이번 달 예방약 미완료</p>
        </div>
        <button
          onClick={() => setLocation("/health")}
          className="text-[11px] font-semibold text-amber-600 flex items-center gap-0.5 hover:text-amber-800 transition-colors"
        >
          체크하기 <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {undone.map((t) => (
          <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-white border border-amber-200 text-amber-700 font-semibold flex items-center gap-1">
            {MED_LABELS[t].emoji} {MED_LABELS[t].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TodayScheduleWidget() {
  const { data: schedules = [] } = useSchedules();
  const { isChecked, toggle } = useScheduleCheck();
  const [, setLocation] = useLocation();

  const now = new Date();

  const todaySchedules = schedules
    .filter((s) => {
      if (!s.enabled) return false;
      if (s.repeat === "daily") return true;
      if (s.repeat === "weekly") return true;
      if (s.repeat === "monthly") return true;
      if (s.repeat === "none") {
        const created = new Date(s.createdAt);
        return created.toDateString() === now.toDateString();
      }
      return false;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const remaining = todaySchedules.filter((s) => !isChecked(s.id));
  const doneCount = todaySchedules.length - remaining.length;

  if (todaySchedules.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm text-base">
            <CalendarClock className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-700">오늘 할 일</p>
            {doneCount > 0 && (
              <p className="text-[10px] text-indigo-400">{doneCount}개 완료 / {todaySchedules.length}개</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setLocation("/schedule")}
          className="text-[11px] font-semibold text-indigo-600 flex items-center gap-0.5"
        >
          전체보기 <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      {remaining.length === 0 ? (
        <div className="bg-white/70 rounded-xl px-3 py-2.5 text-center">
          <p className="text-xs text-green-600 font-semibold">오늘 일정 모두 완료!</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {todaySchedules.slice(0, 5).map((s) => {
            const done = isChecked(s.id);
            return (
              <div key={s.id} className={cn("rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all", done ? "bg-white/40" : "bg-white/70")}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                    done ? "bg-green-500 border-green-500 text-white" : "border-indigo-300 hover:border-indigo-500"
                  )}
                >
                  {done && <span className="text-[10px] font-bold">✓</span>}
                </button>
                <span className={cn("text-base", done && "opacity-40")}>{SCHEDULE_LABELS[s.type]?.emoji ?? "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", done ? "text-muted-foreground line-through" : "text-foreground")}>{s.title}</p>
                </div>
                <span className={cn("text-xs font-bold shrink-0", done ? "text-muted-foreground/50" : "text-indigo-600")}>{s.time}</span>
              </div>
            );
          })}
          {todaySchedules.length > 5 && (
            <p className="text-[11px] text-center text-indigo-400">+{todaySchedules.length - 5}개 더</p>
          )}
        </div>
      )}
    </div>
  );
}

function WeightAlertWidget({ dogId, dogName }: { dogId: string; dogName: string }) {
  const { user } = useAuth();
  const { records } = useWeightHistory(dogId);
  const [, setLocation] = useLocation();
  const storageKey = `weight_target_${user?.id}_${dogId}`;
  const targetWeight = (() => {
    const v = localStorage.getItem(storageKey);
    return v ? parseFloat(v) : null;
  })();

  if (!targetWeight || records.length === 0) return null;

  const latest = records[records.length - 1];
  const diff = latest.weight - targetWeight;
  if (diff <= 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm text-xl shrink-0">
        <span>⚖️</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-red-600">{dogName} 체중 목표 초과!</p>
        <p className="text-sm font-semibold text-foreground">
          {latest.weight}kg <span className="text-red-500">(+{diff.toFixed(1)}kg)</span>
        </p>
        <p className="text-xs text-muted-foreground">목표 {targetWeight}kg</p>
      </div>
      <button
        onClick={() => setLocation("/health")}
        className="text-[11px] font-semibold text-red-500 shrink-0"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function HealthAlertBanner({ dogId, dogName }: { dogId: string; dogName: string }) {
  const { recentLogs } = useDailyLog(dogId);
  const [, setLocation] = useLocation();
  const logs = recentLogs(3);
  if (logs.length < 2) return null;

  const alerts: string[] = [];
  if (logs.every((l) => l.meal === 0)) alerts.push("식사를 거부하고 있어요");
  if (logs.every((l) => l.energy === 0)) alerts.push("기력이 계속 떨어져 있어요");
  if (logs.length >= 3 && logs.every((l) => !l.poop)) alerts.push("3일째 배변이 없어요");

  if (alerts.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-3xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🚨</span>
        <p className="text-xs font-bold text-red-600">{dogName} 건강 주의</p>
      </div>
      <ul className="space-y-1 mb-3">
        {alerts.map((a) => (
          <li key={a} className="text-sm text-red-700 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{a}
          </li>
        ))}
      </ul>
      <button
        onClick={() => setLocation("/health")}
        className="w-full py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
      >
        AI 문진으로 확인하기
      </button>
    </div>
  );
}

function FavVetsWidget() {
  const favs = getFavVets();
  const [, setLocation] = useLocation();
  if (favs.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 rounded-3xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm text-base">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-xs font-bold text-amber-700">즐겨찾기 병원</p>
        </div>
        <button
          onClick={() => setLocation("/map")}
          className="text-[11px] font-semibold text-amber-600 flex items-center gap-0.5"
        >
          지도 <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        {favs.slice(0, 3).map((fav) => (
          <div key={fav.id} className="bg-white/70 rounded-xl px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{fav.name}</p>
              {fav.phone && <p className="text-xs text-muted-foreground">{fav.phone}</p>}
            </div>
            {fav.phone && (
              <a
                href={`tel:${fav.phone}`}
                className="w-8 h-8 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center text-green-600 shrink-0"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BirthdayBanner({ dogs }: { dogs: Dog[] }) {
  const birthdayDogs = dogs.filter((d) => d.birthday && getBirthdayDiff(d.birthday) === 0);
  if (birthdayDogs.length === 0) return null;
  const names = birthdayDogs.map((d) => d.name).join(", ");
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-pink-400 to-rose-400 rounded-3xl p-5 text-white text-center shadow-lg shadow-pink-200"
    >
      <p className="text-3xl mb-2">🎂🎉</p>
      <p className="text-lg font-bold">{names}의 생일이에요!</p>
      <p className="text-sm text-white/80 mt-1">오늘 하루도 건강하고 행복하게!</p>
    </motion.div>
  );
}

function PushNotifBanner() {
  const { isSupported, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const { user } = useAuth();
  const dismissKey = `meongcare_push_banner_dismissed_${user?.id}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === "1");

  if (!isSupported || isSubscribed || dismissed) return null;

  async function handleAllow() {
    const ok = await subscribe();
    if (ok) {
      syncSchedulesToServer();
      setDismissed(true);
      localStorage.setItem(dismissKey, "1");
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-center gap-3">
      <Bell className="w-4 h-4 text-orange-500 shrink-0" />
      <p className="text-xs text-orange-700 flex-1 font-medium">알림을 허용하면 스케줄 시간에 푸시 알림을 받을 수 있어요</p>
      <div className="flex gap-1.5 shrink-0">
        <button onClick={() => { setDismissed(true); localStorage.setItem(dismissKey, "1"); }} className="text-xs text-muted-foreground px-2 py-1 rounded-lg hover:bg-white/60">나중에</button>
        <button onClick={handleAllow} disabled={isLoading} className="text-xs font-bold text-white bg-orange-500 px-3 py-1 rounded-lg hover:bg-orange-600 transition-colors">{isLoading ? "..." : "허용"}</button>
      </div>
    </motion.div>
  );
}

function DailyReminderBanner() {
  const { data: schedules = [] } = useSchedules();
  const addSchedule = useAddSchedule();
  const { user } = useAuth();
  const dismissKey = `meongcare_daily_reminder_dismissed_${user?.id}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === "1");

  const hasReminder = schedules.some((s) => s.title.includes("건강 체크") && s.repeat === "daily");
  if (hasReminder || dismissed) return null;

  function setup() {
    addSchedule.mutate({
      type: "meal",
      title: "오늘 건강 체크",
      time: "20:00",
      repeat: "daily",
      enabled: true,
    }, {
      onSuccess: () => { syncSchedulesToServer(); setDismissed(true); localStorage.setItem(dismissKey, "1"); },
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-2xl px-4 py-3 flex items-center gap-3">
      <Bell className="w-4 h-4 text-violet-500 shrink-0" />
      <p className="text-xs text-violet-700 flex-1 font-medium">매일 저녁 8시에 건강 체크 알림 받기</p>
      <div className="flex gap-1.5 shrink-0">
        <button onClick={() => { setDismissed(true); localStorage.setItem(dismissKey, "1"); }} className="text-xs text-muted-foreground px-2 py-1 rounded-lg hover:bg-white/60">나중에</button>
        <button onClick={setup} disabled={addSchedule.isPending} className="text-xs font-bold text-white bg-violet-500 px-3 py-1 rounded-lg hover:bg-violet-600 transition-colors">설정</button>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { data: dogs, isLoading } = useDogs();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const [dailyCheckOpen, setDailyCheckOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  function handleFirstDogAdded() {
    if (!localStorage.getItem("pwa_install_prompted")) {
      setShowInstallGuide(true);
      localStorage.setItem("pwa_install_prompted", "1");
    }
  }
  const [activeDogIdx, setActiveDogIdx] = useState(0);
  const activeDog = dogs?.[activeDogIdx] ?? dogs?.[0];
  const activeDogId = activeDog?.id ?? "";
  const { todayLog: firstDogTodayLog } = useDailyLog(activeDogId);
  const [walkTimerKey, setWalkTimerKey] = useState(0);

  const profileEmoji = user?.gender === "male" ? "👨🏻" : user?.gender === "female" ? "👩🏻" : "🧑🏻";

  return (
    <Layout>
      <InstallGuideDialog open={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <EditDogDialog
        dog={editingDog}
        open={!!editingDog}
        onOpenChange={(open) => { if (!open) setEditingDog(null); }}
      />
      {dogs && dogs.length > 0 && (
        <DailyCheckDialog
          dogs={dogs}
          open={dailyCheckOpen}
          onOpenChange={setDailyCheckOpen}
        />
      )}
      <div className="px-6 py-8 flex flex-col gap-8 min-h-full">
        {/* Header */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-4xl font-display text-primary flex items-center gap-2 drop-shadow-sm">
              멍케어 <span className="text-3xl">🐾</span>
            </h1>
            <p className="text-muted-foreground font-medium mt-1">반려견 건강 관리 파트너</p>
          </div>
          <button onClick={() => setProfileOpen(true)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shadow-inner hover:bg-secondary/80 transition-colors">
            <span className="text-xl">{profileEmoji}</span>
          </button>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-[2rem] bg-secondary/60" />
            <Skeleton className="h-16 w-full rounded-2xl bg-secondary/60" />
          </div>
        ) : !dogs || dogs.length === 0 ? (
          /* Empty State */
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12"
          >
            <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
              <span className="text-6xl z-10 drop-shadow-md">🐕</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 font-display tracking-wide">첫 반려견을 맞이할 준비!</h2>
            <p className="text-muted-foreground mb-8 text-[15px] leading-relaxed">
              멍케어와 함께 사랑스러운 반려견의<br/>건강을 체계적으로 관리해보세요.
            </p>
            
            <AddDogDialog onSuccess={handleFirstDogAdded}>
              <Button className="h-14 px-8 rounded-2xl text-lg font-bold shadow-lg shadow-primary/30 hover:-translate-y-1 transition-transform bg-gradient-to-br from-primary to-orange-500 w-full max-w-[280px]">
                <Plus className="w-6 h-6 mr-2 stroke-[3px]" />
                반려견 추가하기
              </Button>
            </AddDogDialog>
          </motion.div>
        ) : (
          /* Populated State */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">우리가족 댕댕이</h2>
              <AddDogDialog>
                <button className="text-sm font-bold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                  <Plus className="w-4 h-4 stroke-[3px]" /> 추가
                </button>
              </AddDogDialog>
            </div>

            {/* 생일 배너 */}
            <BirthdayBanner dogs={dogs} />

            {/* Dog Cards Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6 snap-x snap-mandatory">
              <AnimatePresence>
                {dogs.map((dog, i) => (
                  <motion.div
                    key={dog.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="min-w-[280px] w-[85%] snap-center shrink-0 bg-white border border-border/40 rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(255,107,53,0.08)] transition-all duration-300 relative overflow-hidden group"
                  >
                    {/* Decorative blob */}
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

                    <div className="flex justify-between items-start mb-5 relative z-10">
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary border-[3px] border-white shadow-md shrink-0">
                          {dog.photo ? (
                            <img src={dog.photo} alt={dog.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl bg-orange-50">🐕</div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground flex items-center gap-1.5">
                            {dog.name}
                            <span className="text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                              {dog.gender === 'male' ? '♂' : '♀'}
                            </span>
                          </h3>
                          <p className="text-sm text-muted-foreground font-medium mt-1 flex items-center gap-1">
                            <Bone className="w-3.5 h-3.5 text-primary" /> {dog.breed}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="text-muted-foreground/50 hover:text-primary transition-colors p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            const age = getDisplayAge(dog);
                            const humanAge = toHumanAge(age, dog.weight);
                            const text = `[멍케어] ${dog.name} 프로필\n\n${dog.breed} · ${dog.gender === "male" ? "남아" : "여아"}${dog.neutered ? " (중성화)" : ""}\n나이: ${age}살 (사람 나이 ${humanAge}살)\n${dog.weight ? `몸무게: ${dog.weight}kg` : ""}`;
                            if (navigator.share) {
                              navigator.share({ title: `${dog.name} 프로필`, text });
                            } else {
                              navigator.clipboard.writeText(text);
                            }
                          }}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          className="text-muted-foreground/50 hover:text-foreground transition-colors p-1"
                          onClick={() => setEditingDog(dog)}
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {dog.birthday && (() => {
                      const diff = getBirthdayDiff(dog.birthday);
                      if (diff === null) return null;
                      if (diff === 0) return (
                        <div className="relative z-10 bg-pink-50 border border-pink-200 rounded-2xl px-3 py-2 flex items-center gap-2 mb-1">
                          <span className="text-base">🎂</span>
                          <span className="text-xs font-bold text-pink-600">오늘 {dog.name} 생일이에요!</span>
                        </div>
                      );
                      if (diff <= 7) return (
                        <div className="relative z-10 bg-pink-50/60 border border-pink-100 rounded-2xl px-3 py-2 flex items-center gap-2 mb-1">
                          <span className="text-sm">🎂</span>
                          <span className="text-xs font-semibold text-pink-500">생일 D-{diff}</span>
                        </div>
                      );
                      return null;
                    })()}

                    <div className="grid grid-cols-2 gap-3 relative z-10">
                      <div className="bg-secondary/50 rounded-2xl p-3">
                        <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">나이</p>
                        <p className="font-bold text-foreground text-lg">{getDisplayAge(dog)}<span className="text-sm font-medium text-muted-foreground ml-0.5">살</span></p>
                        <span className="text-[11px] font-bold text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full mt-1.5 inline-block">사람 {toHumanAge(getDisplayAge(dog), dog.weight)}살</span>
                      </div>
                      <div className="bg-secondary/50 rounded-2xl p-3">
                        <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">몸무게</p>
                        {dog.weight ? (
                          <p className="font-bold text-foreground text-lg">{dog.weight}<span className="text-sm font-medium text-muted-foreground ml-0.5">kg</span></p>
                        ) : (
                          <p className="text-sm text-muted-foreground font-medium">미입력</p>
                        )}
                      </div>
                    </div>
                    <TodayConditionBadge dogId={dog.id} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 다견가정 전환 */}
            {dogs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dogs.map((dog, i) => (
                  <button
                    key={dog.id}
                    onClick={() => setActiveDogIdx(i)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5",
                      activeDogIdx === i
                        ? "bg-primary text-white border-primary"
                        : "bg-card border-border/50 text-muted-foreground"
                    )}
                  >
                    {dog.photo ? (
                      <img src={dog.photo} alt="" className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <span className="text-xs">🐕</span>
                    )}
                    {dog.name}
                  </button>
                ))}
              </div>
            )}

            {/* 건강 이상 감지 */}
            {dogs.map((dog) => (
              <HealthAlertBanner key={`alert-${dog.id}`} dogId={dog.id} dogName={dog.name} />
            ))}

            {/* 주간 건강 요약 */}
            <WeeklyHealthWidget dogId={activeDog.id} dogName={activeDog.name} />

            {/* 오늘 할 일 요약 */}
            <TodayScheduleWidget />

            {/* 푸시 알림 허용 유도 */}
            <PushNotifBanner />

            {/* 매일 건강 체크 리마인더 */}
            <DailyReminderBanner />

            {/* 이번 달 예방약 미완료 */}
            <PreventionMedsWidget dogId={activeDog.id} />

            {/* 체중 목표 초과 알림 */}
            <WeightAlertWidget dogId={activeDog.id} dogName={activeDog.name} />

            {/* 예방접종 예정 알림 */}
            <UpcomingVaccineWidget />

            {/* 다음 진료 예정 */}
            <UpcomingVetWidget />

            {/* 즐겨찾기 병원 */}
            <FavVetsWidget />

            {/* 최근 검진 기록 */}
            <RecentVetVisitWidget />

            {/* 건강 팁 */}
            {dogs.length === 1 ? (
              <HealthTipWidget dog={dogs[0]} />
            ) : (
              <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-6 px-6 snap-x snap-mandatory pb-1">
                {dogs.map((dog) => (
                  <div key={dog.id} className="min-w-[280px] w-[85%] snap-center shrink-0">
                    <HealthTipWidget dog={dog} />
                  </div>
                ))}
              </div>
            )}

            {/* 산책 타이머 (진행 중일 때만) */}
            <WalkTimerWidget key={walkTimerKey} dogId={activeDog.id} />

            {/* 오늘 컨디션 카드 — 모든 강아지 */}
            <AnimatePresence>
              {dogs.map((dog) => (
                <TodayStatusCard key={dog.id} dogId={dog.id} dogName={dogs.length > 1 ? dog.name : undefined} onEdit={() => setDailyCheckOpen(true)} />
              ))}
            </AnimatePresence>

            {/* Quick Actions */}
            <div className="mt-2 space-y-4">
              <h2 className="text-xl font-bold text-foreground mb-4">빠른 실행</h2>
              <div className="grid grid-cols-2 gap-4">
                <TodayCheckButton dogId={activeDog.id} onClick={() => setDailyCheckOpen(true)} hasLog={!!firstDogTodayLog} />
                <div
                  className="bg-green-50/80 border border-green-100 rounded-3xl p-5 cursor-pointer hover:bg-green-100 transition-colors group"
                  onClick={() => {
                    const key = `walk_timer_${activeDog.id}`;
                    if (!localStorage.getItem(key)) {
                      localStorage.setItem(key, String(Date.now()));
                      setWalkTimerKey((k) => k + 1);
                    }
                  }}
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-green-500 mb-4 group-hover:scale-110 transition-transform">
                    <Timer className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold text-foreground">산책 시작</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-1">타이머로 기록하기</p>
                </div>
                <div
                  className="bg-purple-50/80 border border-purple-100 rounded-3xl p-5 cursor-pointer hover:bg-purple-100 transition-colors group"
                  onClick={() => setLocation("/schedule")}
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                    <CalendarClock className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold text-foreground">스케줄 확인</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-1">오늘 일정 보기</p>
                </div>
                <div className="col-span-2 bg-blue-50/80 border border-blue-100 rounded-3xl p-5 cursor-pointer hover:bg-blue-100 transition-colors group flex items-center gap-4" onClick={() => setLocation("/health")}>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                    <HeartPulse className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">AI 건강 분석</h3>
                    <p className="text-xs font-medium text-muted-foreground mt-1">증상을 입력하면 응급도를 알려드려요</p>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </Layout>
  );
}
