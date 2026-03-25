import { useState, useRef } from "react";
import { useDogs } from "@/hooks/use-dogs";
import { useHealthHistory } from "@/hooks/use-health-history";
import { DogSelector } from "@/components/health/DogSelector";
import { Loader2, Mic, MicOff, Square, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const CONTEXTS = [
  { value: "밥 줄 시간이 됐을 때", emoji: "🍖", label: "밥 시간" },
  { value: "산책을 나가고 싶을 때", emoji: "🦮", label: "산책" },
  { value: "혼자 집에 있을 때", emoji: "🏠", label: "혼자 있을 때" },
  { value: "낯선 사람이 왔을 때", emoji: "🚶", label: "낯선 사람" },
  { value: "놀아달라고 할 때", emoji: "🎾", label: "놀아줘" },
  { value: "보호자가 돌아왔을 때", emoji: "🥰", label: "반가울 때" },
  { value: "무서운 소리가 났을 때", emoji: "⚡", label: "무서울 때" },
  { value: "잠들기 전에", emoji: "😴", label: "자기 전" },
];

interface TranslateResult {
  translation: string;
  mood: string;
  moodEmoji: string;
  detectedSound?: string;
  confidence: number;
  rawLabels?: string;
}

export function TranslatorTab() {
  const { data: dogs = [] } = useDogs();
  const { addItem } = useHealthHistory();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [isOtherDog, setIsOtherDog] = useState(false);
  const [otherDogName, setOtherDogName] = useState("");
  const [context, setContext] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [error, setError] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedDog = isOtherDog ? null : (dogs?.find((d) => d.id === selectedDogId) ?? dogs?.[0] ?? null);
  const displayName = isOtherDog ? (otherDogName.trim() || "강아지") : (displayName);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setRecorded(true);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);

      // 최대 10초 자동 중지 — recorder 직접 참조해 클로저 문제 회피
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          const next = s + 1;
          if (next >= 10) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            if (recorder.state === "recording") recorder.stop();
            setRecording(false);
          }
          return next;
        });
      }, 1000);
    } catch {
      setError("마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  function resetRecording() {
    setAudioBlob(null);
    setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setRecorded(false);
    setResult(null);
    setError("");
    setRecordingSeconds(0);
  }

  async function handleTranslate() {
    if (!audioBlob) return;
    setLoading(true);
    setError("");
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const res = await fetch("/api/classify-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: audioBlob.type,
          dog: isOtherDog ? (otherDogName.trim() ? { name: otherDogName.trim() } : null) : selectedDog,
          context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      addItem("translation", displayName, `녹음 / ${context ?? "상황 미선택"}`, data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 강아지 선택 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setIsOtherDog(false)}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
              !isOtherDog ? "bg-primary text-white border-primary" : "bg-card border-border/50 text-muted-foreground"
            )}
          >
            내 강아지
          </button>
          <button
            onClick={() => setIsOtherDog(true)}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
              isOtherDog ? "bg-primary text-white border-primary" : "bg-card border-border/50 text-muted-foreground"
            )}
          >
            다른 강아지
          </button>
        </div>
        {!isOtherDog && dogs.length > 0 ? (
          <DogSelector dogs={dogs} selectedId={selectedDogId} onSelect={setSelectedDogId} />
        ) : isOtherDog ? (
          <input
            type="text"
            value={otherDogName}
            onChange={(e) => setOtherDogName(e.target.value)}
            placeholder="강아지 이름 (선택)"
            className="w-full h-10 px-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
          />
        ) : null}
      </div>

      {/* 녹음 영역 */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 flex flex-col items-center gap-4">
        {!recorded ? (
          <>
            <p className="text-xs text-muted-foreground">
              {recording ? `녹음 중... ${recordingSeconds}초 / 최대 10초` : "버튼을 눌러 강아지 소리를 녹음하세요"}
            </p>

            <button
              onClick={recording ? stopRecording : startRecording}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg",
                recording
                  ? "bg-red-500 text-white animate-pulse shadow-red-200"
                  : "bg-primary text-white shadow-primary/20 hover:bg-primary/90 active:scale-95"
              )}
            >
              {recording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            {recording && (
              <div className="flex gap-1">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className={cn("w-2 h-2 rounded-full transition-all",
                    i < recordingSeconds ? "bg-red-400" : "bg-muted")} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <span className="text-3xl">✅</span>
            <p className="text-sm font-semibold text-foreground">녹음 완료!</p>
            {audioUrl && <audio controls src={audioUrl} className="w-full h-10" />}
            <button onClick={resetRecording}
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
              <MicOff className="w-3.5 h-3.5" />다시 녹음
            </button>
          </>
        )}
      </div>

      {/* 상황 선택 */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          상황 <span className="text-muted-foreground/50 normal-case font-normal">(선택사항)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CONTEXTS.map((c) => (
            <button key={c.value} onClick={() => setContext(context === c.value ? null : c.value)}
              className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                context === c.value ? "bg-primary/10 border-primary/40 text-primary" : "bg-card border-border/50 text-foreground")}>
              <span>{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

      {/* 번역 버튼 */}
      <button onClick={handleTranslate} disabled={!recorded || loading}
        className={cn("w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
          recorded && !loading ? "bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed")}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>🐾</span>}
        {loading ? "AI가 분석 중..." : "번역하기"}
      </button>

      {/* 결과 */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{result.moodEmoji}</span>
              <div>
                <p className="text-xs text-muted-foreground">현재 기분</p>
                <p className="font-bold text-foreground">{result.mood}</p>
              </div>
              <div className="ml-auto text-right">
                {result.detectedSound && (
                  <p className="text-xs font-semibold text-primary">{result.detectedSound}</p>
                )}
                <p className="text-xs text-muted-foreground">신뢰도 {result.confidence}%</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-border/40">
              <p className="text-xs text-primary font-semibold mb-1">🐶 {displayName}의 말</p>
              <p className="text-sm text-foreground leading-relaxed">{result.translation}</p>
            </div>

            {result.rawLabels && (
              <p className="text-[11px] text-muted-foreground/60">AI 감지: {result.rawLabels}</p>
            )}

            <p className="text-[11px] text-muted-foreground text-center">재미를 위한 번역이에요. 정확하지 않을 수 있어요.</p>

            <div className="flex gap-2">
              <button onClick={resetRecording}
                className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors">
                다시 번역
              </button>
              <button
                onClick={() => {
                  const text = `🐶 ${displayName}의 말\n\n${result.moodEmoji} ${result.mood}\n"${result.translation}"\n\n멍케어 AI 번역기`;
                  if (navigator.share) {
                    navigator.share({ text });
                  } else {
                    navigator.clipboard.writeText(text);
                    alert("클립보드에 복사됐어요!");
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
