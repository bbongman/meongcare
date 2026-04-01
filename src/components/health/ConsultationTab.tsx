import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { useDogs } from "@/hooks/use-dogs";
import { useHealthHistory } from "@/hooks/use-health-history";
import { useDailyLog } from "@/hooks/use-daily-log";
import { DogSelector } from "@/components/health/DogSelector";
import { Loader2, Sparkles, AlertTriangle, CheckCircle, Clock, ChevronRight, MapPin, RotateCcw, BookmarkCheck, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Urgency = "home" | "tomorrow" | "now";
type PageState = "input" | "analyzing" | "result";

interface AssessmentResult {
  urgency: Urgency;
  summary: string;
  advice: string;
  nextSteps: string[];
}

const URGENCY_CONFIG: Record<Urgency, { label: string; Icon: typeof CheckCircle; color: string; bg: string; border: string; badge: string; emoji: string; description: string }> = {
  home: {
    label: "집에서 케어", Icon: CheckCircle,
    color: "text-green-600", bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700",
    emoji: "🏠", description: "현재 안정적인 상태예요. 집에서 케어하며 지켜보세요.",
  },
  tomorrow: {
    label: "내일 병원 방문", Icon: Clock,
    color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700",
    emoji: "🏥", description: "24시간 이내 병원 방문을 권장해요.",
  },
  now: {
    label: "지금 당장 응급실", Icon: AlertTriangle,
    color: "text-red-600", bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700",
    emoji: "🚨", description: "즉시 응급 동물병원으로 이동하세요!",
  },
};

const INPUT_TIPS = [
  { emoji: "⏱️", text: "언제부터 — \"어제부터\", \"3일 전부터\"" },
  { emoji: "🔢", text: "횟수 — \"구토 3번\", \"하루종일\"" },
  { emoji: "🩸", text: "색·모양 — \"혈변\", \"노란 구토물\"" },
  { emoji: "🍽️", text: "식욕·음수 — \"밥 안 먹음\", \"물을 엄청 마심\"" },
  { emoji: "🐾", text: "행동 변화 — \"기운 없음\", \"한쪽 다리를 듦\"" },
];

const SYMPTOM_EXAMPLES = [
  "밥을 안 먹고 기운이 없어요",
  "계속 구토를 해요",
  "다리를 절뚝거려요",
  "눈이 충혈되고 눈물이 많이 나요",
  "숨을 가쁘게 쉬어요",
];

function SaveToLogButton({ dogId, summary }: { dogId: string; summary: string }) {
  const { todayLog, saveLog } = useDailyLog(dogId);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const prevMemo = todayLog?.memo ?? "";
    const addedMemo = `[AI 문진] ${summary}`;
    saveLog({
      meal: todayLog?.meal ?? 2,
      walk: todayLog?.walk ?? false,
      poop: todayLog?.poop ?? false,
      pee: todayLog?.pee ?? false,
      energy: todayLog?.energy ?? 1,
      memo: prevMemo ? `${prevMemo}\n${addedMemo}` : addedMemo,
    });
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-2 text-sm text-green-600 font-semibold">
        <BookmarkCheck className="w-4 h-4" />오늘 기록에 저장됐어요
      </div>
    );
  }

  return (
    <button
      onClick={handleSave}
      className="w-full py-3.5 rounded-2xl border border-border/60 bg-card text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
    >
      <BookmarkCheck className="w-4 h-4" />오늘 기록에 저장
    </button>
  );
}

export function ConsultationTab() {
  const [, navigate] = useLocation();
  const { data: dogs } = useDogs();
  const { addItem } = useHealthHistory();
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [pageState, setPageState] = useState<PageState>("input");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [autoRedirectCancelled, setAutoRedirectCancelled] = useState(false);

  const selectedDog = dogs?.find((d) => d.id === selectedDogId) ?? dogs?.[0] ?? null;

  useEffect(() => {
    if (result?.urgency !== "now" || autoRedirectCancelled) return;
    if (countdown <= 0) { navigate("/map"); return; }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [result?.urgency, countdown, navigate, autoRedirectCancelled]);

  async function handleAnalyze() {
    if (!symptoms.trim()) return;
    setError("");
    setPageState("analyzing");
    try {
      const data = await apiFetch<AssessmentResult>("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ dog: selectedDog, symptoms }),
      });
      setResult(data);
      setCountdown(5);
      setAutoRedirectCancelled(false);
      setPageState("result");
      addItem("consultation", selectedDog?.name ?? "강아지", symptoms, data);
    } catch (err: any) {
      setError(err.message || "분석 중 오류가 발생했습니다.");
      setPageState("input");
    }
  }

  function handleReset() {
    setSymptoms(""); setResult(null); setError(""); setPageState("input");
  }

  return (
    <AnimatePresence mode="wait">
      {pageState === "input" && (
        <motion.div key="input" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
          {dogs && dogs.length > 0 && (
            <DogSelector dogs={dogs} selectedId={selectedDogId} onSelect={setSelectedDogId} />
          )}

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="text-xs font-bold text-blue-600 mb-2">이렇게 입력하면 더 정확해요</p>
            <ul className="space-y-1">
              {INPUT_TIPS.map((tip) => (
                <li key={tip.text} className="flex items-center gap-2 text-xs text-blue-700/80">
                  <span>{tip.emoji}</span><span>{tip.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">증상 입력</p>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={"증상을 자세히 입력해주세요\n예: 어제부터 밥을 안 먹고 구토를 2번 했어요. 기운도 없고 배를 만지면 싫어해요."}
              className="w-full min-h-[140px] rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">빠른 선택</p>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_EXAMPLES.map((ex) => (
                <motion.button key={ex} onClick={() => setSymptoms(ex)}
                  whileTap={{ scale: 0.88 }} transition={{ duration: 0.08 }}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary border border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
                  {ex}
                </motion.button>
              ))}
            </div>
          </div>

          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

          <motion.button onClick={handleAnalyze} disabled={!symptoms.trim()}
            whileTap={symptoms.trim() ? { scale: 0.96 } : undefined} transition={{ duration: 0.08 }}
            className={cn("w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors",
              symptoms.trim() ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed")}>
            <Sparkles className="w-4 h-4" />AI 분석하기
          </motion.button>
          <p className="text-[11px] text-center text-muted-foreground">AI 분석은 참고용입니다. 정확한 진단은 수의사에게 받으세요.</p>
        </motion.div>
      )}

      {pageState === "analyzing" && (
        <motion.div key="analyzing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-[1.5rem] bg-blue-50 flex items-center justify-center"><span className="text-4xl">🩺</span></div>
            <Loader2 className="absolute -bottom-1 -right-1 w-7 h-7 text-primary animate-spin bg-white rounded-full p-1 shadow-md" />
          </div>
          <div className="text-center">
            <p className="font-bold text-foreground">AI가 증상을 분석하고 있어요</p>
            <p className="text-sm text-muted-foreground mt-1">잠깐만 기다려주세요...</p>
          </div>
        </motion.div>
      )}

      {pageState === "result" && result && (() => {
        const config = URGENCY_CONFIG[result.urgency];
        const Icon = config.Icon;
        return (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className={cn("rounded-2xl border p-5", config.bg, config.border)}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl", config.badge)}>{config.emoji}</div>
                <div>
                  <span className={cn("text-xs font-bold uppercase tracking-wider", config.color)}>응급도</span>
                  <p className={cn("text-lg font-bold", config.color)}>{config.label}</p>
                </div>
                <Icon className={cn("w-6 h-6 ml-auto", config.color)} />
              </div>
              <p className="text-sm text-foreground font-medium">{config.description}</p>
            </div>

            {result.urgency === "now" && !autoRedirectCancelled && (
              <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-red-600">주변 동물병원으로 이동합니다</p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xl font-bold text-red-600">{countdown}초</span>
                  <button
                    onClick={() => setAutoRedirectCancelled(true)}
                    className="text-xs font-semibold text-red-400 bg-white border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border/50 bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">AI 분석 요약</p>
              <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">케어 방법</p>
              <p className="text-sm text-foreground leading-relaxed">{result.advice}</p>
            </div>
            {result.nextSteps?.length > 0 && (
              <div className="rounded-2xl border border-border/50 bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">체크리스트</p>
                <ul className="space-y-2">
                  {result.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />{step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedDog && (
              <SaveToLogButton dogId={selectedDog.id} summary={result.summary} />
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={handleReset}
                className="flex-1 py-3.5 rounded-2xl border border-border/60 bg-card text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                <RotateCcw className="w-4 h-4" />다시 분석
              </button>
              <button
                onClick={() => {
                  const text = `[멍케어 AI 문진 결과]\n\n응급도: ${config.label} ${config.emoji}\n${result.summary}\n\n케어 방법:\n${result.advice}${result.nextSteps?.length ? `\n\n체크리스트:\n${result.nextSteps.map((s) => `- ${s}`).join("\n")}` : ""}`;
                  if (navigator.share) {
                    navigator.share({ title: "멍케어 AI 문진 결과", text });
                  } else {
                    navigator.clipboard.writeText(text);
                  }
                }}
                className="py-3.5 px-4 rounded-2xl border border-border/60 bg-card text-sm font-semibold text-foreground flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
              >
                <Share2 className="w-4 h-4" />공유
              </button>
              {(result.urgency === "tomorrow" || result.urgency === "now") && (
                <button onClick={() => navigate("/map")}
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors">
                  <MapPin className="w-4 h-4" />병원 찾기
                </button>
              )}
            </div>
            <p className="text-[11px] text-center text-muted-foreground">AI 분석은 참고용입니다. 정확한 진단은 수의사에게 받으세요.</p>
          </motion.div>
        );
      })()}
    </AnimatePresence>
  );
}
