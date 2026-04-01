import { useState } from "react";
import { useHealthHistory, HistoryItem, ConsultationResult, TranslationResult, ProductResult, BehaviorResult, FoodResult } from "@/hooks/use-health-history";
import { useDogs } from "@/hooks/use-dogs";
import { useDailyLog } from "@/hooks/use-daily-log";
import { Trash2, ChevronDown, ChevronUp, Share2, LayoutList, LayoutGrid, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string; border: string }> = {
  consultation: { label: "AI 문진", emoji: "🩺", color: "bg-blue-100 text-blue-700", border: "border-blue-200" },
  translation: { label: "번역기", emoji: "🐾", color: "bg-purple-100 text-purple-700", border: "border-purple-200" },
  product: { label: "제품 분석", emoji: "🔍", color: "bg-orange-100 text-orange-700", border: "border-orange-200" },
  behavior: { label: "행동 & 훈련", emoji: "🐕‍🦺", color: "bg-indigo-100 text-indigo-700", border: "border-indigo-200" },
  food: { label: "음식 체크", emoji: "🍖", color: "bg-green-100 text-green-700", border: "border-green-200" },
};

const URGENCY_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  home:     { emoji: "🏠", label: "집에서 케어", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  tomorrow: { emoji: "🏥", label: "내일 병원 방문", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  now:      { emoji: "🚨", label: "즉시 응급실", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

function buildShareText(item: HistoryItem): string {
  const date = format(new Date(item.date), "M월 d일 HH:mm", { locale: ko });
  if (item.type === "consultation") {
    const r = item.result as ConsultationResult;
    const urgencyLabel = { home: "집에서 케어", tomorrow: "내일 병원 방문", now: "즉시 응급실" }[r.urgency];
    return `[멍케어 AI 문진] ${date}\n강아지: ${item.dogName}\n증상: ${item.input}\n\n응급도: ${urgencyLabel}\n요약: ${r.summary}\n케어: ${r.advice}`;
  }
  if (item.type === "translation") {
    const r = item.result as TranslationResult;
    return `[멍케어 번역기] ${date}\n강아지: ${item.dogName}\n기분: ${r.moodEmoji} ${r.mood}\n\n"${r.translation}"`;
  }
  if (item.type === "behavior") {
    const r = item.result as BehaviorResult;
    return `[멍케어 행동상담] ${date}\n강아지: ${item.dogName}\n질문: ${item.input}\n\n분류: ${r.category}\n요약: ${r.summary}`;
  }
  if (item.type === "food") {
    const r = item.result as FoodResult;
    return `[멍케어 음식체크] ${date}\n강아지: ${item.dogName}\n음식: ${r.food}\n판정: ${r.safetyLabel}\n\n${r.reason}`;
  }
  if (item.type === "product") {
    const r = item.result as ProductResult;
    return `[멍케어 제품분석] ${date}\n강아지: ${item.dogName}\n제품: ${r.productName}\n평가: ${r.rating} — ${r.ratingReason}`;
  }
  return `[멍케어] ${date}\n강아지: ${item.dogName}\n${item.input}`;
}

// ── 카드형 상세 내용 렌더러 ────────────────────────────────────────────────
function DetailContent({ item }: { item: HistoryItem }) {
  if (item.type === "consultation") {
    const r = item.result as ConsultationResult;
    const urg = URGENCY_CONFIG[r.urgency];
    return (
      <div className="space-y-3">
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold", urg?.bg, urg?.color)}>
          <span className="text-lg">{urg?.emoji}</span>
          {urg?.label}
        </div>
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">요약</p>
          <p className="text-sm text-foreground leading-relaxed">{r.summary}</p>
        </div>
        {r.advice && (
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">케어 방법</p>
            <p className="text-sm text-foreground leading-relaxed">{r.advice}</p>
          </div>
        )}
        {r.nextSteps?.length > 0 && (
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">체크리스트</p>
            <ul className="space-y-1.5">
              {r.nextSteps.map((step, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (item.type === "translation") {
    const r = item.result as TranslationResult;
    return (
      <div className="space-y-3">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
          <span className="text-3xl">{r.moodEmoji}</span>
          <p className="text-sm font-bold text-purple-700 mt-1">{r.mood}</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">번역</p>
          <p className="text-sm text-foreground leading-relaxed">"{r.translation}"</p>
        </div>
        {r.detectedSound && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <span>감지된 소리:</span><span className="font-semibold text-foreground">{r.detectedSound}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <span>신뢰도:</span><span className="font-semibold text-foreground">{r.confidence}%</span>
        </div>
      </div>
    );
  }

  if (item.type === "behavior") {
    const r = item.result as BehaviorResult;
    return (
      <div className="space-y-3">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 bg-indigo-100 rounded-full">{r.category}</span>
          <p className="text-sm font-bold text-indigo-900 mt-2 leading-snug">{r.summary}</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">원인 분석</p>
          <p className="text-sm text-foreground leading-relaxed">{r.cause}</p>
        </div>
        {r.steps?.length > 0 && (
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">훈련 방법</p>
            <ul className="space-y-1.5">
              {r.steps.map((s) => (
                <li key={s.step} className="text-sm text-foreground flex items-start gap-2">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">{s.step}</span>
                  <span><span className="font-semibold">{s.title}</span> — {s.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.caution && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <p className="text-[11px] font-bold text-red-600 mb-0.5">주의사항</p>
            <p className="text-xs text-red-700">{r.caution}</p>
          </div>
        )}
      </div>
    );
  }

  if (item.type === "food") {
    const r = item.result as FoodResult;
    const safetyStyle = { safe: "bg-green-50 border-green-200 text-green-800", caution: "bg-yellow-50 border-yellow-200 text-yellow-800", danger: "bg-red-50 border-red-200 text-red-800" }[r.safety] ?? "bg-secondary border-border text-foreground";
    return (
      <div className="space-y-3">
        <div className={cn("border rounded-xl p-3", safetyStyle)}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">{r.food}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60">{r.safetyLabel}</span>
          </div>
          <p className="text-sm mt-2 leading-relaxed">{r.reason}</p>
        </div>
        {r.symptoms?.length > 0 && (
          <div className="bg-secondary/50 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">주의 증상</p>
            <div className="flex flex-wrap gap-1">
              {r.symptoms.map((s, i) => (
                <span key={i} className="text-xs bg-card border border-border px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}
        {r.tip && (
          <div className="bg-secondary/50 rounded-xl px-3 py-2">
            <p className="text-xs text-muted-foreground">{r.tip}</p>
          </div>
        )}
      </div>
    );
  }

  // product
  const r = item.result as ProductResult;
  const ratingConfig = { 추천: { emoji: "✅", color: "text-green-700", bg: "bg-green-50 border-green-200" }, 보통: { emoji: "🟡", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" }, 주의: { emoji: "⚠️", color: "text-red-700", bg: "bg-red-50 border-red-200" } }[r.rating] ?? { emoji: "🔍", color: "text-foreground", bg: "bg-secondary border-border" };
  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold", ratingConfig.bg, ratingConfig.color)}>
        <span className="text-lg">{ratingConfig.emoji}</span>
        {r.rating} — {r.ratingReason}
      </div>
      {r.description && (
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">제품 설명</p>
          <p className="text-sm text-foreground leading-relaxed">{r.description}</p>
        </div>
      )}
      {r.mainIngredients?.length > 0 && (
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">주요 성분</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {r.mainIngredients.map((ing, i) => (
              <span key={i} className="text-xs bg-card border border-border px-2 py-0.5 rounded-full">{ing}</span>
            ))}
          </div>
        </div>
      )}
      {r.cautions?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-amber-700 mb-1">주의사항</p>
          <ul className="space-y-1">
            {r.cautions.map((c, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                <span className="shrink-0 text-amber-500">•</span>{c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── 리스트형 카드 (접기/펼치기) ───────────────────────────────────────────
function ListCard({ item, onRemove }: { item: HistoryItem; onRemove: () => void }) {
  const cfg = TYPE_CONFIG[item.type];
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleShare() {
    const text = buildShareText(item);
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else await navigator.clipboard.writeText(text);
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", cfg.color)}>
              {cfg.emoji} {cfg.label}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{item.dogName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleShare} className="text-muted-foreground/40 hover:text-primary transition-colors p-1">
              <Share2 className="w-3.5 h-3.5" />
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={onRemove} className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">삭제</button>
                <button onClick={() => setConfirmDelete(false)} className="text-[11px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">취소</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-muted-foreground/40 hover:text-red-400 transition-colors p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-foreground font-medium line-clamp-2">{item.input}</p>

        {/* 한줄 미리보기 */}
        {item.type === "consultation" && (item.result as ConsultationResult).summary && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
            {URGENCY_CONFIG[(item.result as ConsultationResult).urgency]?.emoji} {(item.result as ConsultationResult).summary}
          </p>
        )}
        {item.type === "translation" && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
            {(item.result as TranslationResult).moodEmoji} {(item.result as TranslationResult).translation}
          </p>
        )}
        {item.type === "product" && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
            {(item.result as ProductResult).rating === "추천" ? "✅" : (item.result as ProductResult).rating === "주의" ? "⚠️" : "🟡"} {(item.result as ProductResult).ratingReason}
          </p>
        )}
        {item.type === "behavior" && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
            {(item.result as BehaviorResult).category} — {(item.result as BehaviorResult).summary}
          </p>
        )}
        {item.type === "food" && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
            {(item.result as FoodResult).safetyLabel} — {(item.result as FoodResult).reason}
          </p>
        )}

        <div className="flex items-center justify-between mt-2.5">
          <p className="text-[11px] text-muted-foreground/60">
            {format(new Date(item.date), "M월 d일 HH:mm", { locale: ko })}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-0.5 text-[11px] text-primary font-semibold hover:opacity-70 transition-opacity"
          >
            {expanded ? "접기" : "자세히"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 bg-secondary/20 p-4">
          <DetailContent item={item} />
        </div>
      )}
    </div>
  );
}

// ── 카드형 (전체 내용 펼침) ───────────────────────────────────────────────
function FullCard({ item, onRemove }: { item: HistoryItem; onRemove: () => void }) {
  const cfg = TYPE_CONFIG[item.type];
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleShare() {
    const text = buildShareText(item);
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else await navigator.clipboard.writeText(text);
  }

  return (
    <div className={cn("rounded-2xl border-2 bg-card overflow-hidden", cfg.border)}>
      {/* 헤더 */}
      <div className={cn("px-4 py-3 flex items-center justify-between", cfg.color.replace("text-", "bg-").replace("-700", "-50").replace("-100", "-50"))}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{cfg.emoji}</span>
          <div>
            <p className="text-xs font-bold">{cfg.label}</p>
            <p className="text-[11px] opacity-70">{item.dogName} · {format(new Date(item.date), "M월 d일 HH:mm", { locale: ko })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleShare} className="opacity-50 hover:opacity-100 transition-opacity p-1">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={onRemove} className="text-[11px] font-bold text-red-500 bg-white px-1.5 py-0.5 rounded-md border border-red-200">삭제</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-muted-foreground bg-white px-1.5 py-0.5 rounded-md border">취소</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="opacity-40 hover:opacity-80 transition-opacity p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 입력값 */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">입력</p>
        <p className="text-sm text-foreground font-medium">{item.input}</p>
      </div>

      {/* 전체 상세 내용 */}
      <div className="px-4 pb-4 pt-3">
        <DetailContent item={item} />
      </div>
    </div>
  );
}

type FilterType = "all" | "consultation" | "translation" | "product" | "behavior" | "food";

const FILTERS: { id: FilterType; label: string; emoji: string }[] = [
  { id: "all", label: "전체", emoji: "📋" },
  { id: "consultation", label: "문진", emoji: "🩺" },
  { id: "translation", label: "번역", emoji: "🐾" },
  { id: "product", label: "제품", emoji: "🔍" },
  { id: "behavior", label: "행동", emoji: "🐕‍🦺" },
  { id: "food", label: "음식", emoji: "🍖" },
];

import { MEAL_LABEL, ENERGY_LABEL } from "@/lib/constants";

interface TimelineEntry {
  date: string;
  type: "log" | "consultation";
  meal?: number;
  energy?: number;
  walk?: boolean;
  memo?: string;
  urgency?: string;
  summary?: string;
}

function SymptomTimeline() {
  const { data: dogs = [] } = useDogs();
  const { history } = useHealthHistory();
  const dogId = dogs[0]?.id ?? "";
  const { allLogs } = useDailyLog(dogId);

  const entries: TimelineEntry[] = [];

  for (const log of allLogs) {
    if (log.memo || log.meal === 0 || log.energy === 0) {
      entries.push({ date: log.date, type: "log", meal: log.meal, energy: log.energy, walk: log.walk, memo: log.memo });
    }
  }

  for (const item of history) {
    if (item.type === "consultation") {
      const r = item.result as ConsultationResult;
      entries.push({ date: item.date.slice(0, 10), type: "consultation", urgency: r.urgency, summary: r.summary });
    }
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));
  const recent = entries.slice(0, 30);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl mb-3">📊</span>
        <p className="font-bold text-foreground">타임라인이 비어있어요</p>
        <p className="text-sm text-muted-foreground mt-1">메모가 있는 일일 기록이나 AI 문진 결과가 여기 표시돼요</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {recent.map((entry, i) => (
          <div key={`${entry.date}-${entry.type}-${i}`} className="relative">
            <div className={cn(
              "absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-background",
              entry.type === "consultation" ? "bg-blue-500 text-white" : "bg-secondary text-muted-foreground"
            )}>
              {entry.type === "consultation" ? "🩺" : "📝"}
            </div>
            <div className="bg-card border border-border/50 rounded-2xl p-3">
              <p className="text-[11px] text-muted-foreground font-medium mb-1">
                {format(new Date(entry.date + "T00:00:00"), "M월 d일 (EEE)", { locale: ko })}
              </p>
              {entry.type === "consultation" ? (
                <div>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                    entry.urgency === "now" ? "bg-red-100 text-red-700" :
                    entry.urgency === "tomorrow" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                  )}>
                    {URGENCY_CONFIG[entry.urgency!]?.label}
                  </span>
                  <p className="text-sm text-foreground mt-1.5 leading-relaxed">{entry.summary}</p>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2 flex-wrap mb-1">
                    {entry.meal !== undefined && entry.meal <= 1 && (
                      <span className="text-xs font-semibold text-red-500">식사: {MEAL_LABEL[entry.meal]}</span>
                    )}
                    {entry.energy !== undefined && entry.energy === 0 && (
                      <span className="text-xs font-semibold text-blue-500">기력: {ENERGY_LABEL[entry.energy]}</span>
                    )}
                    {entry.walk && <span className="text-xs text-green-600">산책O</span>}
                  </div>
                  {entry.memo && <p className="text-sm text-foreground leading-relaxed">{entry.memo}</p>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistoryTab() {
  const { history, removeItem, clearAll } = useHealthHistory();
  const [filter, setFilter] = useState<FilterType>("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [cardView, setCardView] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const filtered = filter === "all" ? history : history.filter((i) => i.type === filter);

  return (
    <div className="space-y-3">
      {/* 모드 전환 */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setShowTimeline(false)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
            !showTimeline ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border/50"
          )}
        >
          <LayoutList className="w-3.5 h-3.5" />분석 기록
        </button>
        <button
          onClick={() => setShowTimeline(true)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
            showTimeline ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border/50"
          )}
        >
          <Clock className="w-3.5 h-3.5" />증상 타임라인
        </button>
      </div>

      {showTimeline ? (
        <SymptomTimeline />
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">📋</span>
          <p className="font-bold text-foreground">기록이 없어요</p>
          <p className="text-sm text-muted-foreground mt-1">AI 문진, 번역기, 제품 분석 결과가 여기 쌓여요</p>
        </div>
      ) : (
      <>
      {/* 필터 + 뷰 토글 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border",
              filter === f.id
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border/50"
            )}
          >
            <span>{f.emoji}</span>{f.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {/* 뷰 토글 */}
          <button
            onClick={() => setCardView((v) => !v)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all",
              cardView
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border/50"
            )}
            title={cardView ? "리스트 보기" : "카드 보기"}
          >
            {cardView ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
            {cardView ? "카드" : "목록"}
          </button>

          {/* 전체 삭제 */}
          {confirmClear ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { clearAll(); setConfirmClear(false); }} className="text-xs text-red-500 font-bold px-2 py-0.5 bg-red-50 rounded-full border border-red-200">삭제</button>
              <button onClick={() => setConfirmClear(false)} className="text-xs text-muted-foreground font-semibold px-2 py-0.5 bg-secondary rounded-full">취소</button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)} className="text-xs text-red-400 hover:text-red-500 font-semibold transition-colors px-1">전체삭제</button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length}개</p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-muted-foreground">해당 유형의 기록이 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) =>
            cardView
              ? <FullCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
              : <ListCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}
