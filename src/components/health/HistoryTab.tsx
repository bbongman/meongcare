import { useState } from "react";
import { useHealthHistory, HistoryItem, ConsultationResult, TranslationResult, ProductResult } from "@/hooks/use-health-history";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const TYPE_CONFIG = {
  consultation: { label: "AI 문진", emoji: "🩺", color: "bg-blue-100 text-blue-700" },
  translation: { label: "번역기", emoji: "🐾", color: "bg-purple-100 text-purple-700" },
  product: { label: "제품 분석", emoji: "🔍", color: "bg-orange-100 text-orange-700" },
};

const URGENCY_EMOJI: Record<string, string> = {
  home: "🏠",
  tomorrow: "🏥",
  now: "🚨",
};

function HistoryCard({ item, onRemove }: { item: HistoryItem; onRemove: () => void }) {
  const cfg = TYPE_CONFIG[item.type];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* 카드 헤더 — 항상 표시 */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", cfg.color)}>
              {cfg.emoji} {cfg.label}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{item.dogName}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onRemove} className="text-muted-foreground/40 hover:text-red-400 transition-colors p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-sm text-foreground font-medium truncate">{item.input}</p>

        {/* 요약 미리보기 */}
        {item.type === "consultation" && item.result && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-base">{URGENCY_EMOJI[item.result.urgency] ?? "🩺"}</span>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.result.summary}</p>
          </div>
        )}
        {item.type === "translation" && item.result && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-base">{item.result.moodEmoji}</span>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.result.translation}</p>
          </div>
        )}
        {item.type === "product" && item.result && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-base">{item.result.rating === "추천" ? "✅" : item.result.rating === "주의" ? "⚠️" : "🟡"}</span>
            <p className="text-xs text-muted-foreground">{item.result.rating} — {item.result.ratingReason}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
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

      {/* 상세 내용 — 펼쳤을 때만 */}
      {expanded && (
        <div className="border-t border-border/40 bg-secondary/30 p-4 space-y-2.5 text-xs">
          {item.type === "consultation" && (() => {
            const r = item.result as ConsultationResult;
            return (
              <>
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">케어 방법</p>
                  <p className="text-foreground leading-relaxed">{r.advice}</p>
                </div>
                {r.nextSteps?.length > 0 && (
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">체크리스트</p>
                    <ul className="space-y-1">
                      {r.nextSteps.map((step, i) => (
                        <li key={i} className="text-foreground flex items-start gap-1.5">
                          <span className="shrink-0 text-primary">•</span>{step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}

          {item.type === "translation" && (() => {
            const r = item.result as TranslationResult;
            return (
              <>
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">기분</p>
                  <p className="text-foreground">{r.moodEmoji} {r.mood}</p>
                </div>
                {r.detectedSound && (
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">감지된 소리</p>
                    <p className="text-foreground">{r.detectedSound}</p>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">신뢰도</p>
                  <p className="text-foreground">{r.confidence}%</p>
                </div>
              </>
            );
          })()}

          {item.type === "product" && (() => {
            const r = item.result as ProductResult;
            return (
              <>
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">제품 설명</p>
                  <p className="text-foreground leading-relaxed">{r.description}</p>
                </div>
                {r.mainIngredients?.length > 0 && (
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">주요 성분</p>
                    <p className="text-foreground">{r.mainIngredients.join(", ")}</p>
                  </div>
                )}
                {r.cautions?.length > 0 && (
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">주의사항</p>
                    <ul className="space-y-0.5">
                      {r.cautions.map((c, i) => (
                        <li key={i} className="text-foreground flex items-start gap-1.5">
                          <span className="shrink-0 text-amber-500">•</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

type FilterType = "all" | "consultation" | "translation" | "product";

const FILTERS: { id: FilterType; label: string; emoji: string }[] = [
  { id: "all", label: "전체", emoji: "📋" },
  { id: "consultation", label: "문진", emoji: "🩺" },
  { id: "translation", label: "번역", emoji: "🐾" },
  { id: "product", label: "제품", emoji: "🔍" },
];

export function HistoryTab() {
  const { history, removeItem, clearAll } = useHealthHistory();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? history : history.filter((i) => i.type === filter);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">📋</span>
        <p className="font-bold text-foreground">기록이 없어요</p>
        <p className="text-sm text-muted-foreground mt-1">AI 문진, 번역기, 제품 분석 결과가 여기 쌓여요</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all border",
              filter === f.id
                ? "bg-primary text-white border-primary"
                : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
            )}
          >
            <span>{f.emoji}</span>{f.label}
          </button>
        ))}
        <button
          onClick={() => { if (confirm("전체 기록을 삭제할까요?")) clearAll(); }}
          className="ml-auto text-xs text-red-400 hover:text-red-500 font-semibold transition-colors shrink-0 px-2"
        >
          전체 삭제
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length}개</p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-muted-foreground">해당 유형의 기록이 없어요</p>
        </div>
      ) : (
        filtered.map((item) => (
          <HistoryCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
        ))
      )}
    </div>
  );
}
