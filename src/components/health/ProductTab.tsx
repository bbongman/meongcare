import { useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { useDogs } from "@/hooks/use-dogs";
import { useHealthHistory } from "@/hooks/use-health-history";
import { DogSelector } from "@/components/health/DogSelector";
import { Loader2, Upload, Camera, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ProductResult {
  contentType: "product";
  productName: string;
  category: string;
  description: string;
  mainIngredients: string[];
  feedingGuide?: string;
  suitableAge: string;
  cautions: string[];
  rating: "추천" | "보통" | "주의";
  ratingReason: string;
}

interface FoodResult {
  contentType: "food";
  foodName: string;
  safety: "safe" | "caution" | "danger";
  safetyLabel: string;
  reason: string;
  symptoms: string[];
  tip: string;
}

type AnalysisResult = ProductResult | FoodResult;

const RATING_CONFIG = {
  추천: { color: "text-green-600", bg: "bg-green-50", border: "border-green-200", emoji: "✅" },
  보통: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", emoji: "🟡" },
  주의: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", emoji: "⚠️" },
};

const FOOD_SAFETY_CONFIG = {
  safe: { color: "text-green-700", bg: "bg-green-50", border: "border-green-200", emoji: "✅", label: "안전해요" },
  caution: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", emoji: "⚠️", label: "주의 필요" },
  danger: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", emoji: "🚫", label: "위험해요" },
};

export function ProductTab() {
  const { data: dogs } = useDogs();
  const { addItem } = useHealthHistory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const selectedDog = dogs?.find((d) => d.id === selectedDogId) ?? dogs?.[0] ?? null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setResult(null);
  }

  function handleReset() {
    setSelectedFile(null);
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setLoading(true);
    setError("");
    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile!);
      });

      const data = await apiFetch<any>("/api/analyze-product", {
        method: "POST",
        body: JSON.stringify({ dog: selectedDog, imageBase64, mediaType: selectedFile.type || "image/jpeg" }),
      });
      setResult(data);
      if (data.contentType === "food") {
        addItem("product", selectedDog?.name ?? "강아지", data.foodName, data);
      } else {
        addItem("product", selectedDog?.name ?? "강아지", data.productName, data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {dogs && dogs.length > 0 && (
        <DogSelector dogs={dogs} selectedId={selectedDogId} onSelect={setSelectedDogId} />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {!previewUrl ? (
        <div className="space-y-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full h-36 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-primary">지금 바로 촬영</p>
              <p className="text-xs text-primary/70 mt-0.5">용품·음식 모두 찍으면 자동 분석해요</p>
            </div>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3.5 rounded-2xl border border-border/60 bg-card flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">갤러리에서 선택</span>
          </button>
          <p className="text-[11px] text-center text-muted-foreground">사료·간식·용품 분석 + 사람 음식 먹어도 되는지 체크</p>
        </div>
      ) : (
        <div className="relative">
          <img src={previewUrl} alt="분석 대상" className="w-full h-52 object-contain rounded-2xl border border-border/50 bg-secondary/20" />
          <button
            onClick={handleReset}
            className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

      {previewUrl && !result && (
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
            !loading ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90" : "bg-muted text-muted-foreground"
          )}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>🔍</span>}
          {loading ? "분석 중..." : "분석하기"}
        </button>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {result.contentType === "food" ? (
              /* 음식 안전 결과 */
              (() => {
                const cfg = FOOD_SAFETY_CONFIG[result.safety];
                return (
                  <>
                    <div className={cn("rounded-2xl border p-5 flex items-start gap-4", cfg.bg, cfg.border)}>
                      <span className="text-4xl">{cfg.emoji}</span>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-0.5">{result.foodName}</p>
                        <p className={cn("text-2xl font-bold", cfg.color)}>{result.safetyLabel}</p>
                        <p className="text-sm text-foreground mt-1 leading-relaxed">{result.reason}</p>
                      </div>
                    </div>

                    {result.symptoms.length > 0 && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">주의 증상</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.symptoms.map((s, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 bg-white text-red-700 rounded-full border border-red-200">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.tip && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">팁</p>
                        <p className="text-sm text-blue-800">{result.tip}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={handleReset} className="flex-1 py-3 rounded-2xl border border-border/60 text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">
                        다른 음식 확인
                      </button>
                      <button
                        onClick={() => {
                          const text = `[멍케어 음식 체크]\n${result.foodName}: ${result.safetyLabel}\n${result.reason}`;
                          if (navigator.share) { navigator.share({ text }); }
                          else { navigator.clipboard.writeText(text); alert("클립보드에 복사됐어요!"); }
                        }}
                        className="px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                );
              })()
            ) : (
              /* 제품 분석 결과 */
              (() => {
                const ratingCfg = RATING_CONFIG[result.rating] ?? RATING_CONFIG["보통"];
                return (
                  <>
                    <div className={cn("rounded-2xl border p-4 flex items-start gap-3", ratingCfg.bg, ratingCfg.border)}>
                      <span className="text-2xl">{ratingCfg.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={cn("font-bold text-lg", ratingCfg.color)}>{result.rating}</p>
                          <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full text-muted-foreground">{result.category}</span>
                        </div>
                        <p className="text-sm text-foreground mt-0.5">{result.ratingReason}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">제품</p>
                        <p className="font-bold text-foreground">{result.productName}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{result.description}</p>
                      </div>
                      {result.mainIngredients?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">주요 성분</p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.mainIngredients.map((ing, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 bg-secondary rounded-full text-foreground">{ing}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">적합 나이</p>
                        <p className="text-sm text-foreground">{result.suitableAge}</p>
                      </div>
                      {result.feedingGuide && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">급여 가이드</p>
                          <p className="text-sm text-blue-800 font-medium">{result.feedingGuide}</p>
                        </div>
                      )}
                    </div>

                    {result.cautions?.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">주의사항</p>
                        <ul className="space-y-1">
                          {result.cautions.map((c, i) => (
                            <li key={i} className="text-sm text-amber-800 flex items-start gap-1.5">
                              <span className="shrink-0 mt-0.5">•</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={handleReset} className="flex-1 py-3 rounded-2xl border border-border/60 text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">
                        다른 제품 분석
                      </button>
                      <button
                        onClick={() => {
                          const text = `[멍케어 제품 분석]\n제품: ${result.productName}\n평가: ${result.rating} — ${result.ratingReason}\n\n${result.description}`;
                          if (navigator.share) { navigator.share({ text }); }
                          else { navigator.clipboard.writeText(text); alert("클립보드에 복사됐어요!"); }
                        }}
                        className="px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                );
              })()
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
