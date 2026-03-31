import { useState } from "react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Dot, ReferenceLine } from "recharts";
import { useDogs } from "@/hooks/use-dogs";
import { useDailyLog } from "@/hooks/use-daily-log";
import { useWeightHistory } from "@/hooks/use-weight-history";
import { useVetVisits } from "@/hooks/use-vet-visits";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/hooks/use-auth";
import { FileDown } from "lucide-react";

const MEAL_LABEL = ["안먹음", "조금", "보통", "잘먹음"];
const ENERGY_LABEL = ["축처짐", "보통", "활발"];
const ENERGY_COLOR = ["#93c5fd", "#34d399", "#fb923c"];

function buildChartData(recentLogs: ReturnType<ReturnType<typeof useDailyLog>["recentLogs"]>, days: number) {
  const map = new Map(recentLogs.map((l) => [l.date, l]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    const log = map.get(key);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    return {
      label,
      meal: log?.meal ?? null,
      energy: log?.energy ?? null,
      walk: log?.walk ? 1 : 0,
      hasData: !!log,
    };
  });
}

function SummaryCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-3 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground font-medium">{title}</p>
      <p className={cn("text-xl font-bold", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function WeightSection({ dogId }: { dogId: string }) {
  const { records, addRecord } = useWeightHistory(dogId);
  const [input, setInput] = useState("");
  const storageKey = `weight_target_${dogId}`;
  const [targetInput, setTargetInput] = useState("");
  const [targetWeight, setTargetWeight] = useState<number | null>(() => {
    const v = localStorage.getItem(storageKey);
    return v ? parseFloat(v) : null;
  });

  function handleAdd() {
    const val = parseFloat(input);
    if (isNaN(val) || val <= 0) return;
    addRecord(val);
    setInput("");
  }

  function handleSetTarget() {
    const val = parseFloat(targetInput);
    if (isNaN(val) || val <= 0) {
      localStorage.removeItem(storageKey);
      setTargetWeight(null);
    } else {
      localStorage.setItem(storageKey, String(val));
      setTargetWeight(val);
    }
    setTargetInput("");
  }

  const chartData = records.map((r) => ({
    label: r.date.slice(5),
    weight: r.weight,
  }));

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground">체중 변화 ⚖️</p>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="kg"
            className="w-16 text-xs border border-border rounded-lg px-2 py-1 text-center focus:outline-none focus:border-primary"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button onClick={handleAdd} className="text-xs font-bold text-white bg-primary px-2.5 py-1 rounded-lg hover:bg-primary/90 transition-colors">
            기록
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground shrink-0">목표</span>
        <input
          type="number"
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          placeholder={targetWeight ? `${targetWeight}kg` : "목표 체중"}
          className="flex-1 text-xs border border-border rounded-lg px-2 py-1 text-center focus:outline-none focus:border-primary"
          onKeyDown={(e) => e.key === "Enter" && handleSetTarget()}
        />
        <button onClick={handleSetTarget} className="text-xs font-semibold text-primary px-2.5 py-1 rounded-lg border border-primary/30 hover:bg-primary/10 transition-colors shrink-0">
          설정
        </button>
        {targetWeight && (
          <span className="text-[11px] text-blue-500 font-bold shrink-0">{targetWeight}kg</span>
        )}
      </div>
      {chartData.length >= 2 && (() => {
        const last = chartData[chartData.length - 1].weight;
        const prev = chartData[chartData.length - 2].weight;
        const pct = Math.abs((last - prev) / prev) * 100;
        if (pct < 10) return null;
        const isUp = last > prev;
        return (
          <div className={cn("text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5", isUp ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
            {isUp ? "⚠️" : "📉"} 체중이 {pct.toFixed(0)}% {isUp ? "증가" : "감소"}했어요 — 수의사 상담을 권장해요
          </div>
        );
      })()}
      {chartData.length < 2 ? (
        <p className="text-xs text-muted-foreground text-center py-4">2개 이상 기록하면 그래프가 표시돼요</p>
      ) : (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData}>
            <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip formatter={(v: number) => [`${v}kg`, "체중"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            {targetWeight && (
              <ReferenceLine y={targetWeight} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: `목표 ${targetWeight}kg`, position: "insideTopRight", fontSize: 9, fill: "#3b82f6" }} />
            )}
            <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={<Dot r={3} fill="hsl(var(--primary))" />} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function VetCostSection() {
  const { visits } = useVetVisits();
  const thisYear = new Date().getFullYear();
  const yearVisits = visits.filter((v) => v.visitDate?.startsWith(String(thisYear)) && v.totalPrice > 0);
  const total = yearVisits.reduce((s, v) => s + v.totalPrice, 0);
  const lastYear = thisYear - 1;
  const lastYearTotal = visits
    .filter((v) => v.visitDate?.startsWith(String(lastYear)) && v.totalPrice > 0)
    .reduce((s, v) => s + v.totalPrice, 0);

  if (yearVisits.length === 0) return null;

  const diff = lastYearTotal > 0 ? total - lastYearTotal : null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-2">
      <p className="text-xs font-bold text-muted-foreground">진료비 현황 🏥</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground">{thisYear}년 누계</p>
          <p className="text-2xl font-bold text-foreground">{total.toLocaleString()}<span className="text-sm font-medium text-muted-foreground ml-1">원</span></p>
        </div>
        {diff !== null && (
          <p className={cn("text-xs font-semibold mb-1", diff > 0 ? "text-red-500" : "text-green-500")}>
            전년比 {diff > 0 ? "+" : ""}{diff.toLocaleString()}원
          </p>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {yearVisits.slice(0, 4).map((v) => (
          <span key={v.id} className="text-[11px] bg-secondary/60 px-2 py-0.5 rounded-full text-muted-foreground">
            {v.hospitalName || "병원"} {v.totalPrice.toLocaleString()}원
          </span>
        ))}
        {yearVisits.length > 4 && (
          <span className="text-[11px] text-muted-foreground/60">+{yearVisits.length - 4}건</span>
        )}
      </div>
    </div>
  );
}

function StatsContent({ dogId }: { dogId: string }) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const { recentLogs } = useDailyLog(dogId);
  const [, setLocation] = useLocation();
  const logs = recentLogs(period);
  const chartData = buildChartData(logs, period);

  const logsWithData = logs.filter((l) => l.meal !== undefined);
  const walkDays = logs.filter((l) => l.walk).length;
  const avgMeal = logsWithData.length
    ? (logsWithData.reduce((s, l) => s + l.meal, 0) / logsWithData.length).toFixed(1)
    : "-";
  const avgEnergy = logsWithData.length
    ? (logsWithData.reduce((s, l) => s + l.energy, 0) / logsWithData.length).toFixed(1)
    : "-";

  if (logsWithData.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <span className="text-5xl mb-4">📊</span>
        <p className="text-base font-bold text-foreground">아직 기록이 없어요</p>
        <p className="text-sm text-muted-foreground mt-1">홈에서 오늘 건강 체크를 해보세요</p>
        <button
          onClick={() => setLocation("/")}
          className="mt-4 px-5 py-2.5 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          홈으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 기간 선택 */}
      <div className="flex gap-2">
        {([7, 30] as const).map((d) => (
          <button
            key={d}
            onClick={() => setPeriod(d)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
              period === d ? "bg-primary text-white border-primary" : "bg-card border-border/50 text-muted-foreground"
            )}
          >
            {d === 7 ? "최근 7일" : "최근 30일"}
          </button>
        ))}
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryCard title="평균 식사" value={avgMeal === "-" ? "-" : MEAL_LABEL[Math.round(Number(avgMeal))]} sub={`점수 ${avgMeal}`} color="text-orange-500" />
        <SummaryCard title="산책 일수" value={`${walkDays}일`} sub={`/${period}일`} color="text-green-500" />
        <SummaryCard title="평균 기력" value={avgEnergy === "-" ? "-" : ENERGY_LABEL[Math.round(Number(avgEnergy))]} sub={`점수 ${avgEnergy}`} color="text-blue-500" />
      </div>

      {/* 식사 차트 */}
      <div className="bg-card border border-border/50 rounded-2xl p-4">
        <p className="text-xs font-bold text-muted-foreground mb-3">식사량 🍖</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} barSize={period === 7 ? 20 : 8}>
            <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={period === 30 ? 4 : 0} />
            <YAxis domain={[0, 3]} hide />
            <Tooltip
              formatter={(v: number) => [MEAL_LABEL[v] ?? "-", "식사"]}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Bar dataKey="meal" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.meal === null ? "#e5e7eb" : entry.meal >= 2 ? "#f97316" : entry.meal === 1 ? "#fbbf24" : "#d1d5db"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 기력 차트 */}
      <div className="bg-card border border-border/50 rounded-2xl p-4">
        <p className="text-xs font-bold text-muted-foreground mb-3">기력 ⚡</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData} barSize={period === 7 ? 20 : 8}>
            <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={period === 30 ? 4 : 0} />
            <YAxis domain={[0, 2]} hide />
            <Tooltip
              formatter={(v: number) => [ENERGY_LABEL[v] ?? "-", "기력"]}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Bar dataKey="energy" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.energy === null ? "#e5e7eb" : ENERGY_COLOR[entry.energy]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 산책 차트 */}
      <div className="bg-card border border-border/50 rounded-2xl p-4">
        <p className="text-xs font-bold text-muted-foreground mb-3">산책 🦮</p>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={chartData} barSize={period === 7 ? 20 : 8}>
            <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={period === 30 ? 4 : 0} />
            <YAxis domain={[0, 1]} hide />
            <Bar dataKey="walk" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.walk ? "#34d399" : entry.hasData ? "#d1fae5" : "#e5e7eb"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 체중 차트 */}
      <WeightSection dogId={dogId} />

      {/* 진료비 */}
      <VetCostSection />
    </div>
  );
}

export function StatsTab() {
  const { data: dogs = [] } = useDogs();
  const [selectedDogId, setSelectedDogId] = useState<string>(() => dogs[0]?.id ?? "");

  const activeDogId = selectedDogId || dogs[0]?.id;

  if (dogs.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <span className="text-5xl mb-4">🐾</span>
        <p className="text-base font-bold text-foreground">강아지를 먼저 등록해주세요</p>
      </div>
    );
  }

  return (
    <div>
      {dogs.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {dogs.map((dog) => (
            <button
              key={dog.id}
              onClick={() => setSelectedDogId(dog.id)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                activeDogId === dog.id ? "bg-primary text-white border-primary" : "bg-card border-border/50 text-muted-foreground"
              )}
            >
              {dog.name}
            </button>
          ))}
        </div>
      )}
      {activeDogId && (
        <>
          <StatsContent dogId={activeDogId} />
          <div className="mt-5">
            <button
              onClick={() => {
                const token = getAuthToken();
                window.open(`/api/report/${activeDogId}?token=${token}`, "_blank");
              }}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-muted-foreground bg-card border border-border/50 rounded-2xl hover:border-primary/40 hover:text-primary transition-colors"
            >
              <FileDown className="w-4 h-4" />
              건강 리포트 PDF로 저장
            </button>
          </div>
        </>
      )}
    </div>
  );
}
