import { useState, useRef } from "react";
import { Search, Camera, AlertTriangle, CheckCircle, AlertCircle, X } from "lucide-react";
import { useDogs } from "@/hooks/use-dogs";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FoodResult {
  food: string;
  safety: "safe" | "caution" | "danger";
  safetyLabel: string;
  reason: string;
  symptoms: string[];
  tip: string;
}

const SAFETY_CONFIG = {
  safe: { color: "bg-green-50 border-green-200 text-green-800", icon: CheckCircle, iconColor: "text-green-500", badge: "bg-green-100 text-green-700" },
  caution: { color: "bg-yellow-50 border-yellow-200 text-yellow-800", icon: AlertCircle, iconColor: "text-yellow-500", badge: "bg-yellow-100 text-yellow-700" },
  danger: { color: "bg-red-50 border-red-200 text-red-800", icon: AlertTriangle, iconColor: "text-red-500", badge: "bg-red-100 text-red-700" },
};

const CACHED_FOODS: Record<string, FoodResult> = {
  포도: { food: "포도", safety: "danger", safetyLabel: "위험해요", reason: "포도와 건포도는 강아지에게 신부전을 유발하는 독성 물질을 포함하고 있어요. 소량으로도 치명적일 수 있어요.", symptoms: ["구토", "설사", "무기력", "식욕 저하", "신부전"], tip: "포도 한 알도 절대 주지 마세요. 섭취 즉시 동물병원에 가세요." },
  건포도: { food: "건포도", safety: "danger", safetyLabel: "위험해요", reason: "건포도는 포도를 농축한 것으로 독성이 더 강해요. 소량으로도 급성 신부전을 유발할 수 있어요.", symptoms: ["구토", "무기력", "신부전"], tip: "절대 금지. 섭취 즉시 동물병원에 가세요." },
  양파: { food: "양파", safety: "danger", safetyLabel: "위험해요", reason: "양파의 유기황 화합물이 강아지의 적혈구를 파괴해 용혈성 빈혈을 일으켜요. 익혀도 독성이 사라지지 않아요.", symptoms: ["빈혈", "잇몸 창백", "구토", "무기력", "호흡 곤란"], tip: "양파·대파·마늘·부추 등 파류는 모두 금지예요." },
  마늘: { food: "마늘", safety: "danger", safetyLabel: "위험해요", reason: "마늘은 양파보다 독성이 약 5배 강해요. 적혈구를 파괴해 빈혈을 유발할 수 있어요.", symptoms: ["빈혈", "구토", "설사", "무기력"], tip: "사람 음식 조리 시 마늘이 들어간 음식은 강아지에게 주지 마세요." },
  초콜릿: { food: "초콜릿", safety: "danger", safetyLabel: "위험해요", reason: "초콜릿의 테오브로민과 카페인이 강아지의 심장과 신경계에 독성을 일으켜요. 다크 초콜릿일수록 더 위험해요.", symptoms: ["구토", "설사", "과호흡", "경련", "심부정맥"], tip: "초콜릿·코코아·카카오 모두 금지. 섭취 시 즉시 동물병원에 가세요." },
  아보카도: { food: "아보카도", safety: "danger", safetyLabel: "위험해요", reason: "아보카도의 퍼신 성분이 구토와 설사를 유발하며, 씨앗은 질식 위험도 있어요.", symptoms: ["구토", "설사", "무기력", "호흡 곤란"], tip: "과육, 씨앗, 껍질 모두 주지 마세요." },
  자일리톨: { food: "자일리톨", safety: "danger", safetyLabel: "위험해요", reason: "자일리톨은 강아지의 인슐린을 급격히 분비시켜 저혈당을 유발하고, 간부전으로 이어질 수 있어요.", symptoms: ["저혈당", "구토", "무기력", "경련", "간부전"], tip: "껌·사탕·치약 등 자일리톨 함유 제품은 절대 닿지 않게 하세요." },
  닭고기: { food: "닭고기", safety: "safe", safetyLabel: "안전해요", reason: "닭고기는 단백질이 풍부하고 소화가 잘 되는 강아지 친화적인 음식이에요. 단, 양념 없이 익혀서 주세요.", symptoms: [], tip: "뼈(특히 조리된 닭뼈)는 금지. 날것보다 삶은 닭가슴살이 좋아요." },
  당근: { food: "당근", safety: "safe", safetyLabel: "안전해요", reason: "당근은 베타카로틴, 식이섬유가 풍부하고 칼로리가 낮아 강아지에게 훌륭한 간식이에요.", symptoms: [], tip: "생당근은 치아 건강에도 좋아요. 과식하지 않도록 적당량만 주세요." },
  수박: { food: "수박", safety: "safe", safetyLabel: "안전해요", reason: "수박은 수분이 많아 여름철 수분 보충에 좋아요. 씨앗과 껍질을 제거하고 과육만 주세요.", symptoms: [], tip: "씨앗은 소화 장애, 껍질은 복통을 유발할 수 있어요. 과육만 소량씩 주세요." },
  연어: { food: "연어", safety: "caution", safetyLabel: "주의 필요", reason: "익힌 연어는 오메가-3가 풍부해 좋지만, 날연어에는 기생충이 있을 수 있어요.", symptoms: ["기생충 감염 (날것 시)", "구토", "설사"], tip: "반드시 완전히 익혀서 주세요. 뼈 제거 필수." },
  사과: { food: "사과", safety: "safe", safetyLabel: "안전해요", reason: "사과는 비타민 A·C와 섬유질이 풍부한 좋은 간식이에요. 씨앗과 심은 제거하세요.", symptoms: [], tip: "씨앗에는 미량의 시안화물이 있어요. 껍질 벗긴 과육만 소량 주세요." },
  블루베리: { food: "블루베리", safety: "safe", safetyLabel: "안전해요", reason: "블루베리는 항산화 성분이 풍부하고 강아지에게 안전한 과일이에요.", symptoms: [], tip: "작은 크기라 질식 위험은 낮지만 과식하지 않도록 주세요." },
  커피: { food: "커피", safety: "danger", safetyLabel: "위험해요", reason: "카페인이 강아지의 신경계와 심장에 독성을 일으켜요. 커피, 차, 에너지 드링크 모두 위험해요.", symptoms: ["과흥분", "심박수 증가", "경련", "구토"], tip: "카페인 함유 음료는 절대 금지." },
  우유: { food: "우유", safety: "caution", safetyLabel: "주의 필요", reason: "많은 강아지가 유당불내증을 가지고 있어 소화 장애를 일으킬 수 있어요.", symptoms: ["설사", "복통", "가스"], tip: "락토프리 우유나 강아지 전용 우유를 소량 주는 게 안전해요." },
  고구마: { food: "고구마", safety: "safe", safetyLabel: "안전해요", reason: "고구마는 베타카로틴, 식이섬유, 비타민이 풍부한 건강한 간식이에요.", symptoms: [], tip: "반드시 익혀서 주세요. 소량씩 급여하고 당뇨견은 제한하세요." },
};

const QUICK_FOODS = ["포도", "양파", "초콜릿", "아보카도", "닭고기", "당근", "수박", "연어"];

export function FoodCheckTab() {
  const { data: dogs = [] } = useDogs();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FoodResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const dogName = dogs[0]?.name;

  async function check(food: string) {
    const trimmed = food.trim();
    if (!trimmed) return;
    setResult(null);
    setError("");

    // 캐시된 음식이면 즉시 표시하되, DB 저장은 백그라운드로 진행
    const cached = CACHED_FOODS[trimmed];
    if (cached) {
      setResult(cached);
      apiFetch<FoodResult>("/api/check-food", {
        method: "POST",
        body: JSON.stringify({ food: trimmed, dogName }),
      }).catch(() => {});
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<FoodResult>("/api/check-food", {
        method: "POST",
        body: JSON.stringify({ food: trimmed, dogName }),
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
    check(input);
  }

  const cfg = result ? SAFETY_CONFIG[result.safety] : null;
  const Icon = cfg?.icon;

  return (
    <div className="space-y-4">
      {/* 검색창 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="음식 이름 입력 (예: 포도, 아보카도...)"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:border-primary bg-card"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-opacity"
        >
          {loading ? "확인 중..." : "체크"}
        </button>
      </form>

      {/* 빠른 선택 */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">자주 묻는 음식</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FOODS.map((f) => (
            <button
              key={f}
              onClick={() => { setInput(f); check(f); }}
              className="px-3 py-1.5 text-xs font-semibold bg-card border border-border/50 rounded-xl hover:border-primary/40 hover:text-primary transition-colors"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">{error}</div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3 animate-pulse">
          <div className="h-5 bg-secondary rounded w-1/3" />
          <div className="h-3 bg-secondary rounded w-full" />
          <div className="h-3 bg-secondary rounded w-2/3" />
        </div>
      )}

      {/* 결과 */}
      {result && cfg && Icon && (
        <div className={cn("border rounded-2xl p-5 space-y-3", cfg.color)}>
          <div className="flex items-center gap-3">
            <Icon className={cn("w-6 h-6 shrink-0", cfg.iconColor)} />
            <div className="flex-1">
              <p className="font-bold text-base">{result.food}</p>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", cfg.badge)}>
                {result.safetyLabel}
              </span>
            </div>
            <button onClick={() => setResult(null)} className="opacity-50 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm leading-relaxed">{result.reason}</p>

          {result.symptoms.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-1">주의 증상</p>
              <div className="flex flex-wrap gap-1">
                {result.symptoms.map((s, i) => (
                  <span key={i} className="text-[11px] bg-white/60 px-2 py-0.5 rounded-lg">{s}</span>
                ))}
              </div>
            </div>
          )}

          {result.tip && (
            <p className="text-xs bg-white/50 rounded-xl px-3 py-2">{result.tip}</p>
          )}
        </div>
      )}

      {/* 안내 */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="text-5xl mb-3">🍖</span>
          <p className="text-sm font-bold text-foreground">먹어도 될까요?</p>
          <p className="text-xs text-muted-foreground mt-1">음식 이름을 입력하면 강아지에게<br />안전한지 바로 알려드려요</p>
        </div>
      )}
    </div>
  );
}
