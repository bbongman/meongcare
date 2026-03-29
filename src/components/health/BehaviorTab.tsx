import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { useDogs } from "@/hooks/use-dogs";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BehaviorStep {
  step: number;
  title: string;
  desc: string;
}

interface BehaviorResult {
  category: string;
  summary: string;
  cause: string;
  steps: BehaviorStep[];
  tips: string[];
  caution: string;
}

const QUICK_QUESTIONS = [
  { label: "과도한 짖음", q: "자꾸 짖어요. 어떻게 줄일 수 있나요?" },
  { label: "물기/공격성", q: "사람 손이나 발을 물려고 해요" },
  { label: "배변 훈련", q: "배변 훈련을 어떻게 시켜야 하나요?" },
  { label: "분리불안", q: "혼자 두면 심하게 불안해하고 짖어요" },
  { label: "산책 중 끌기", q: "산책할 때 리드줄을 너무 세게 당겨요" },
  { label: "식탐/음식 집착", q: "음식에 지나치게 집착하고 지키려 해요" },
  { label: "점프 올라타기", q: "사람한테 자꾸 점프해서 올라타요" },
  { label: "사회화 문제", q: "다른 강아지나 사람을 너무 무서워해요" },
];

const CATEGORY_COLOR: Record<string, string> = {
  "행동문제": "bg-red-50 text-red-700 border-red-200",
  "훈련방법": "bg-blue-50 text-blue-700 border-blue-200",
  "심리/감정": "bg-purple-50 text-purple-700 border-purple-200",
  "일반상식": "bg-green-50 text-green-700 border-green-200",
};

export function BehaviorTab() {
  const { data: dogs = [] } = useDogs();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BehaviorResult | null>(null);
  const [error, setError] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const dog = dogs[0];

  async function ask(question: string) {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    setExpandedStep(null);
    try {
      const data = await apiFetch<BehaviorResult>("/api/ask-behavior", {
        method: "POST",
        body: JSON.stringify({ question: question.trim(), dog: dog ?? null }),
      });
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(input);
  }

  const categoryStyle = result ? (CATEGORY_COLOR[result.category] ?? "bg-gray-50 text-gray-700 border-gray-200") : "";

  return (
    <div className="space-y-4">
      {/* 강아지 컨텍스트 */}
      {dog && (
        <div className="bg-secondary/50 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-sm">🐶</span>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{dog.name}</span> 기준으로 답변해드려요
            <span className="ml-1">({dog.breed}, {dog.age}살)</span>
          </p>
        </div>
      )}

      {/* 입력창 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="행동 문제나 훈련 방법 질문하기..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:border-primary bg-card"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-opacity"
        >
          {loading ? "분석 중..." : "질문"}
        </button>
      </form>

      {/* 빠른 선택 */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">자주 묻는 문제</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map(({ label, q }) => (
            <button
              key={label}
              onClick={() => { setInput(q); ask(q); }}
              className="px-3 py-1.5 text-xs font-semibold bg-card border border-border/50 rounded-xl hover:border-primary/40 hover:text-primary transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">{error}</div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-secondary rounded-2xl" />
          <div className="h-24 bg-secondary rounded-2xl" />
          <div className="h-32 bg-secondary rounded-2xl" />
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="space-y-3">
          {/* 요약 헤더 */}
          <div className={cn("border rounded-2xl p-4 space-y-2", categoryStyle)}>
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", categoryStyle)}>
                {result.category}
              </span>
            </div>
            <p className="text-sm font-bold leading-snug">{result.summary}</p>
          </div>

          {/* 원인 */}
          <div className="bg-card border border-border/50 rounded-2xl p-4">
            <p className="text-xs font-bold text-muted-foreground mb-2">원인 분석</p>
            <p className="text-sm text-foreground leading-relaxed">{result.cause}</p>
          </div>

          {/* 훈련 단계 */}
          {result.steps.length > 0 && (
            <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-muted-foreground mb-3">훈련 방법</p>
              {result.steps.map((s) => (
                <div key={s.step} className="border border-border/40 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                    onClick={() => setExpandedStep(expandedStep === s.step ? null : s.step)}
                  >
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {s.step}
                    </span>
                    <span className="text-sm font-semibold text-foreground flex-1">{s.title}</span>
                    {expandedStep === s.step
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    }
                  </button>
                  {expandedStep === s.step && (
                    <div className="px-4 pb-3 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/30">
                      {s.desc}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 팁 */}
          {result.tips.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-2">추가 팁</p>
              <ul className="space-y-1">
                {result.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-amber-800 flex gap-2">
                    <span className="shrink-0">•</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 주의사항 */}
          {result.caution && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <p className="text-xs font-bold text-red-600 mb-1">주의사항</p>
              <p className="text-xs text-red-700">{result.caution}</p>
            </div>
          )}
        </div>
      )}

      {/* 빈 상태 */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="text-5xl mb-3">🐕‍🦺</span>
          <p className="text-sm font-bold text-foreground">행동 & 훈련 상담</p>
          <p className="text-xs text-muted-foreground mt-1">짖음, 물기, 배변훈련 등<br />어떤 것이든 물어보세요</p>
        </div>
      )}
    </div>
  );
}
