import { useState, useRef } from "react";
import { Mic, MicOff, Send, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDogs } from "@/hooks/use-dogs";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";

type SheetState = "open" | "listening" | "processing" | "clarify" | "preview";

interface ParseResult {
  intent: "schedule" | "vetVisit" | "vaccine" | "weight" | "clarify" | "unknown";
  data?: Record<string, any>;
  question?: string;
}

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  meal: "식사",
  medicine: "약",
  walk: "산책",
  vaccine: "예방접종",
};

const REPEAT_LABELS: Record<string, string> = {
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
  none: "없음",
};

const INTENT_LABELS: Record<string, string> = {
  schedule: "스케줄 추가",
  vetVisit: "진료 기록 추가",
  vaccine: "예방접종 기록 추가",
  weight: "체중 기록",
};

export function VoiceCommandFab() {
  const [open, setOpen] = useState(false);
  const [sheetState, setSheetState] = useState<SheetState>("open");
  const [text, setText] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [clarifyCount, setClarifyCount] = useState(0);

  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: dogs = [] } = useDogs();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = format(new Date(), "yyyy-MM-dd");
  const speechSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);

  function openSheet() {
    setOpen(true);
    setSheetState("open");
    setTimeout(() => inputRef.current?.focus(), 150);
  }

  function close() {
    setOpen(false);
    setText("");
    setLiveTranscript("");
    setResult(null);
    setHistory([]);
    setClarifyCount(0);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let final = "";
    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim = e.results[i][0].transcript;
      }
      setLiveTranscript(final + interim);
    };
    recognition.onend = () => {
      if (final.trim()) {
        setText(final.trim());
        sendToServer(final.trim());
      } else {
        setSheetState("open");
        setLiveTranscript("");
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    recognition.onerror = () => {
      setSheetState("open");
      setLiveTranscript("");
      toast({ description: "음성 인식 실패. 텍스트로 입력해 주세요.", variant: "destructive" });
    };

    recognitionRef.current = recognition;
    recognition.start();
    setSheetState("listening");
    setLiveTranscript("");
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function handleSendClick() {
    const msg = text.trim();
    if (!msg) return;
    sendToServer(msg);
  }

  async function sendToServer(msg: string) {
    setSheetState("processing");
    setText("");
    setLiveTranscript("");

    const newHistory = [...history, { role: "user", content: msg }];

    try {
      const parsed = await apiFetch<ParseResult>("/api/voice-command", {
        method: "POST",
        body: JSON.stringify({
          transcript: msg,
          dogs: dogs.map((d) => ({ id: d.id, name: d.name, breed: d.breed, age: d.age })),
          today,
          history,
        }),
      });

      if (parsed.intent === "clarify") {
        if (clarifyCount >= 2) {
          toast({ description: "이해하지 못했어요. 직접 입력해 주세요." });
          close();
          return;
        }
        setHistory([...newHistory, { role: "assistant", content: JSON.stringify(parsed) }]);
        setClarifyCount((c) => c + 1);
        setResult(parsed);
        setSheetState("clarify");
        setTimeout(() => inputRef.current?.focus(), 150);
      } else if (parsed.intent === "unknown") {
        toast({ description: "이해하지 못했어요. 다시 말씀해 주세요." });
        setSheetState("open");
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setHistory(newHistory);
        setResult(parsed);
        setSheetState("preview");
      }
    } catch {
      toast({ description: "서버 오류가 발생했어요.", variant: "destructive" });
      setSheetState("open");
    }
  }

  async function handleConfirm() {
    if (!result?.data) return;
    setSheetState("processing");
    const { intent, data } = result;

    try {
      if (intent === "schedule") {
        await apiFetch("/api/schedules", {
          method: "POST",
          body: JSON.stringify({
            type: data.type || "meal",
            title: data.title || "알림",
            time: data.time || "09:00",
            repeat: data.repeat || "none",
            dogId: data.dogId || undefined,
            dogName: data.dogName || undefined,
            medicineName: data.medicineName || undefined,
            vaccineDate: data.vaccineDate || undefined,
            enabled: true,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
      } else if (intent === "vetVisit") {
        await apiFetch("/api/vet-visits", {
          method: "POST",
          body: JSON.stringify({
            dogName: data.dogName || "",
            hospitalName: data.hospitalName || "",
            visitDate: data.visitDate || today,
            items: data.items || [],
            totalPrice: data.totalPrice || 0,
            diagnosis: data.diagnosis || "",
            prescriptions: data.prescriptions || [],
            nextVisitDate: data.nextVisitDate || "",
            notes: data.notes || "",
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["vet-visits"] });
      } else if (intent === "vaccine") {
        await apiFetch("/api/vaccines", {
          method: "POST",
          body: JSON.stringify({
            dogId: data.dogId || "",
            vaccineName: data.vaccineName || "",
            date: data.date || today,
            hospitalName: data.hospitalName || "",
            nextDate: data.nextDate || "",
            notes: data.notes || "",
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["vaccines"] });
      } else if (intent === "weight") {
        await apiFetch("/api/weight", {
          method: "POST",
          body: JSON.stringify({
            dogId: data.dogId || "",
            weight: data.weight || 0,
            date: data.date || today,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["weight"] });
      }

      toast({ description: "저장했어요!" });
      close();
    } catch (err: any) {
      toast({ description: err.message || "저장 실패", variant: "destructive" });
      setSheetState("preview");
    }
  }

  function renderPreviewRows() {
    if (!result?.data) return null;
    const { intent, data } = result;
    const rows: { label: string; value: string }[] = [];

    if (intent === "schedule") {
      rows.push({ label: "종류", value: SCHEDULE_TYPE_LABELS[data.type] || data.type || "-" });
      if (data.dogName) rows.push({ label: "강아지", value: data.dogName });
      if (data.title) rows.push({ label: "제목", value: data.title });
      if (data.time) rows.push({ label: "시간", value: data.time });
      if (data.vaccineDate) rows.push({ label: "날짜", value: data.vaccineDate });
      if (data.medicineName) rows.push({ label: "약 이름", value: data.medicineName });
      rows.push({ label: "반복", value: REPEAT_LABELS[data.repeat] || "없음" });
    } else if (intent === "vetVisit") {
      if (data.dogName) rows.push({ label: "강아지", value: data.dogName });
      if (data.hospitalName) rows.push({ label: "병원", value: data.hospitalName });
      rows.push({ label: "날짜", value: data.visitDate || today });
      if (data.diagnosis) rows.push({ label: "진단", value: data.diagnosis });
      if (data.nextVisitDate) rows.push({ label: "다음 방문", value: data.nextVisitDate });
      if (data.notes) rows.push({ label: "메모", value: data.notes });
    } else if (intent === "vaccine") {
      if (data.dogName) rows.push({ label: "강아지", value: data.dogName });
      if (data.vaccineName) rows.push({ label: "백신", value: data.vaccineName });
      rows.push({ label: "날짜", value: data.date || today });
      if (data.hospitalName) rows.push({ label: "병원", value: data.hospitalName });
      if (data.nextDate) rows.push({ label: "다음 접종", value: data.nextDate });
    } else if (intent === "weight") {
      if (data.dogName) rows.push({ label: "강아지", value: data.dogName });
      if (data.weight != null) rows.push({ label: "체중", value: `${data.weight} kg` });
      rows.push({ label: "날짜", value: data.date || today });
    }

    return rows;
  }

  if (!open) {
    return (
      <button
        onClick={openSheet}
        className="absolute bottom-[4.5rem] right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform"
        aria-label="AI 입력"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  const rows = renderPreviewRows();

  return (
    <>
      <div className="absolute inset-0 z-[55] bg-black/20" onClick={close} />
      <div
        className="absolute bottom-0 left-0 right-0 z-[60] bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom-4"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        <div className="px-4 pb-2 space-y-3">
          {/* 되묻기 */}
          {sheetState === "clarify" && result?.question && (
            <div className="bg-primary/10 rounded-xl p-3 space-y-2">
              <p className="text-sm text-primary font-medium">{result.question}</p>
              {dogs.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {dogs.map((dog) => (
                    <button
                      key={dog.id}
                      onClick={() => sendToServer(dog.name)}
                      className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium active:scale-95 transition-transform"
                    >
                      {dog.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 프리뷰 */}
          {sheetState === "preview" && rows && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {INTENT_LABELS[result?.intent || ""] || "이렇게 저장할게요"}
              </p>
              <div className="bg-secondary/50 rounded-xl p-3 space-y-1.5">
                {rows.map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground truncate max-w-[60%] text-right">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 실시간 음성 텍스트 */}
          {sheetState === "listening" && liveTranscript && (
            <p className="text-sm text-muted-foreground px-1">{liveTranscript}</p>
          )}

          {/* 분석 중 */}
          {sheetState === "processing" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              분석 중...
            </div>
          )}

          {/* 텍스트 입력 */}
          {(sheetState === "open" || sheetState === "clarify") && (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendClick()}
                placeholder="예: 초코 내일 오전 10시 약 알림"
                className="flex-1 bg-secondary rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              />
              {speechSupported && (
                <button
                  onClick={startListening}
                  className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform"
                  aria-label="음성 입력"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={handleSendClick}
                disabled={!text.trim()}
                className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
                aria-label="전송"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 음성 녹음 중 */}
          {sheetState === "listening" && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-red-50 rounded-xl px-4 py-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-500">듣고 있어요...</span>
              </div>
              <button
                onClick={stopListening}
                className="w-11 h-11 rounded-full bg-red-100 text-red-500 flex items-center justify-center active:scale-90 transition-transform"
                aria-label="녹음 중지"
              >
                <MicOff className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* 프리뷰 확인/취소 */}
          {sheetState === "preview" && (
            <div className="flex gap-2">
              <button
                onClick={close}
                className="flex-1 py-3 rounded-xl bg-secondary text-sm font-medium text-muted-foreground active:scale-95 transition-transform"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition-transform"
              >
                저장하기
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
