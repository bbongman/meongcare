import { useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { useDogs } from "@/hooks/use-dogs";
import { useVetVisits, type VetVisit } from "@/hooks/use-vet-visits";
import { DogSelector } from "@/components/health/DogSelector";
import { Loader2, Camera, Upload, Trash2, Calendar, MapPin, Stethoscope, Pill, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface ParsedReceipt {
  hospitalName: string;
  visitDate: string;
  items: { name: string; price: number }[];
  totalPrice: number;
  diagnosis: string;
  prescriptions: string[];
  nextVisitDate: string;
  notes: string;
  confidence: "high" | "medium" | "low";
}

const CONFIDENCE_LABEL = {
  high: { text: "인식 정확도 높음", color: "text-green-600", bg: "bg-green-50" },
  medium: { text: "일부 판독 불확실", color: "text-amber-600", bg: "bg-amber-50" },
  low: { text: "판독 불확실 — 직접 확인 필요", color: "text-red-600", bg: "bg-red-50" },
};

function VetVisitCard({ visit, onDelete }: { visit: VetVisit; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <Stethoscope className="w-5 h-5 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">
            {visit.hospitalName || "병원명 미입력"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {visit.visitDate ? format(new Date(visit.visitDate), "yyyy.MM.dd (EEE)", { locale: ko }) : "날짜 미입력"}
            </span>
            {visit.totalPrice > 0 && (
              <span className="text-xs font-semibold text-foreground">
                {visit.totalPrice.toLocaleString()}원
              </span>
            )}
          </div>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold">{visit.dogName}</span>
              </div>

              {visit.diagnosis && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">진단</p>
                  <p className="text-sm text-foreground">{visit.diagnosis}</p>
                </div>
              )}

              {visit.items.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">진료 항목</p>
                  <div className="space-y-1">
                    {visit.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-foreground">{item.name}</span>
                        {item.price > 0 && <span className="text-muted-foreground">{item.price.toLocaleString()}원</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {visit.prescriptions.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">처방</p>
                  <div className="flex flex-wrap gap-1.5">
                    {visit.prescriptions.map((rx, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full flex items-center gap-1">
                        <Pill className="w-3 h-3" />{rx}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {visit.nextVisitDate && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-700">
                    다음 내원: {format(new Date(visit.nextVisitDate), "yyyy.MM.dd (EEE)", { locale: ko })}
                  </span>
                </div>
              )}

              {visit.notes && (
                <p className="text-xs text-muted-foreground bg-secondary/50 rounded-xl px-3 py-2">{visit.notes}</p>
              )}

              {confirmDelete ? (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">정말 삭제할까요?</span>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg bg-secondary">취소</button>
                  <button onClick={onDelete} className="text-xs text-white bg-red-500 hover:bg-red-600 transition-colors px-2 py-1 rounded-lg font-semibold">삭제</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors pt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />삭제
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function VetVisitTab() {
  const { data: dogs } = useDogs();
  const { visits, addVisit, removeVisit } = useVetVisits();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    hospitalName: "",
    visitDate: new Date().toISOString().slice(0, 10),
    diagnosis: "",
    totalPrice: "",
    notes: "",
  });

  const selectedDog = dogs?.find((d) => d.id === selectedDogId) ?? dogs?.[0] ?? null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setParsed(null);
    setSaved(false);
  }

  function handleReset() {
    setSelectedFile(null);
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setParsed(null);
    setError("");
    setSaved(false);
    setManualMode(false);
    setManualForm({ hospitalName: "", visitDate: new Date().toISOString().slice(0, 10), diagnosis: "", totalPrice: "", notes: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function handleManualSave() {
    addVisit({
      dogName: selectedDog?.name ?? "강아지",
      hospitalName: manualForm.hospitalName,
      visitDate: manualForm.visitDate,
      items: [],
      totalPrice: parseFloat(manualForm.totalPrice) || 0,
      diagnosis: manualForm.diagnosis,
      prescriptions: [],
      nextVisitDate: "",
      notes: manualForm.notes,
    });
    setSaved(true);
    setTimeout(() => handleReset(), 1500);
  }

  async function handleParse() {
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

      const data = await apiFetch<any>("/api/parse-receipt", {
        method: "POST",
        body: JSON.stringify({ dog: selectedDog, imageBase64, mediaType: selectedFile.type || "image/jpeg" }),
      });
      setParsed(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (!parsed) return;
    addVisit({
      dogName: selectedDog?.name ?? "강아지",
      hospitalName: parsed.hospitalName,
      visitDate: parsed.visitDate,
      items: parsed.items,
      totalPrice: parsed.totalPrice,
      diagnosis: parsed.diagnosis,
      prescriptions: parsed.prescriptions,
      nextVisitDate: parsed.nextVisitDate,
      notes: parsed.notes,
    });
    setSaved(true);
    setTimeout(() => {
      handleReset();
    }, 1500);
  }

  const confCfg = parsed ? CONFIDENCE_LABEL[parsed.confidence] ?? CONFIDENCE_LABEL.medium : null;

  return (
    <div className="space-y-4">
      {dogs && dogs.length > 0 && (
        <DogSelector dogs={dogs} selectedId={selectedDogId} onSelect={setSelectedDogId} />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {!previewUrl && !saved && !manualMode ? (
        <div className="space-y-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full h-36 rounded-2xl border-2 border-dashed border-teal-400/40 bg-teal-50/50 flex flex-col items-center justify-center gap-2 hover:bg-teal-50 transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-100/80 flex items-center justify-center">
              <Camera className="w-6 h-6 text-teal-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-teal-700">영수증/진단서 촬영</p>
              <p className="text-xs text-teal-600/70 mt-0.5">카메라로 찍으면 AI가 자동 인식해요</p>
            </div>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3.5 rounded-2xl border border-border/60 bg-card flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
          >
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">갤러리에서 선택</span>
          </button>
          <button
            onClick={() => setManualMode(true)}
            className="w-full py-3.5 rounded-2xl border border-border/60 bg-card flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
          >
            <Stethoscope className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">직접 입력하기</span>
          </button>
          <p className="text-[11px] text-center text-muted-foreground">영수증, 진료확인서, 진단서 모두 인식 가능해요</p>
        </div>
      ) : manualMode && !saved ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">병원명</p>
              <input
                type="text"
                value={manualForm.hospitalName}
                onChange={(e) => setManualForm((p) => ({ ...p, hospitalName: e.target.value }))}
                placeholder="동물병원 이름"
                className="w-full h-11 px-3 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">방문 날짜</p>
              <input
                type="date"
                value={manualForm.visitDate}
                onChange={(e) => setManualForm((p) => ({ ...p, visitDate: e.target.value }))}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">진단명 <span className="font-normal">(선택)</span></p>
              <input
                type="text"
                value={manualForm.diagnosis}
                onChange={(e) => setManualForm((p) => ({ ...p, diagnosis: e.target.value }))}
                placeholder="피부염, 위장염 등"
                className="w-full h-11 px-3 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">진료비 <span className="font-normal">(선택)</span></p>
              <div className="relative">
                <input
                  type="number"
                  value={manualForm.totalPrice}
                  onChange={(e) => setManualForm((p) => ({ ...p, totalPrice: e.target.value }))}
                  placeholder="0"
                  className="w-full h-11 px-3 pr-8 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:border-teal-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">메모 <span className="font-normal">(선택)</span></p>
              <textarea
                value={manualForm.notes}
                onChange={(e) => setManualForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="특이사항, 처방 내용 등"
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground resize-none focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-3.5 rounded-2xl border border-border/60 bg-card text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleManualSave}
              disabled={!manualForm.hospitalName && !manualForm.visitDate}
              className={cn(
                "flex-1 py-3.5 rounded-2xl text-sm font-bold transition-colors",
                manualForm.hospitalName || manualForm.visitDate
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20 hover:bg-teal-700"
                  : "bg-muted text-muted-foreground"
              )}
            >
              저장하기
            </button>
          </div>
        </div>
      ) : previewUrl && !saved ? (
        <div className="relative">
          <img src={previewUrl} alt="영수증" className="w-full h-52 object-contain rounded-2xl border border-border/50 bg-secondary/20" />
          <button
            onClick={handleReset}
            className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>
      ) : null}

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

      {previewUrl && !parsed && !saved && (
        <button
          onClick={handleParse}
          disabled={loading}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
            !loading ? "bg-teal-600 text-white shadow-md shadow-teal-600/20 hover:bg-teal-700" : "bg-muted text-muted-foreground"
          )}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
          {loading ? "AI가 영수증을 읽고 있어요..." : "영수증 분석하기"}
        </button>
      )}

      <AnimatePresence>
        {parsed && !saved && confCfg && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className={cn("rounded-xl px-3 py-2 text-xs font-semibold text-center", confCfg.bg, confCfg.color)}>
              {confCfg.text}
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
              {parsed.hospitalName && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-500 shrink-0" />
                  <p className="font-bold text-foreground">{parsed.hospitalName}</p>
                </div>
              )}
              {parsed.visitDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-500 shrink-0" />
                  <p className="text-sm text-foreground">
                    {format(new Date(parsed.visitDate), "yyyy년 M월 d일 (EEE)", { locale: ko })}
                  </p>
                </div>
              )}
              {parsed.diagnosis && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">진단</p>
                  <p className="text-sm text-foreground font-medium">{parsed.diagnosis}</p>
                </div>
              )}
            </div>

            {parsed.items.length > 0 && (
              <div className="rounded-2xl border border-border/50 bg-card p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">진료 항목</p>
                <div className="space-y-1.5">
                  {parsed.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-foreground">{item.name}</span>
                      {item.price > 0 && <span className="text-muted-foreground font-medium">{item.price.toLocaleString()}원</span>}
                    </div>
                  ))}
                </div>
                {parsed.totalPrice > 0 && (
                  <div className="flex justify-between text-sm font-bold mt-3 pt-2 border-t border-border/30">
                    <span className="text-foreground">합계</span>
                    <span className="text-teal-600">{parsed.totalPrice.toLocaleString()}원</span>
                  </div>
                )}
              </div>
            )}

            {parsed.prescriptions.length > 0 && (
              <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
                <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wide mb-2">처방 약품</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.prescriptions.map((rx, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-white text-purple-700 rounded-full border border-purple-200 flex items-center gap-1">
                      <Pill className="w-3 h-3" />{rx}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {parsed.nextVisitDate && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-blue-700">
                  다음 내원: {format(new Date(parsed.nextVisitDate), "yyyy.MM.dd (EEE)", { locale: ko })}
                </span>
              </div>
            )}

            {parsed.notes && (
              <p className="text-xs text-muted-foreground bg-secondary/50 rounded-xl px-3 py-2">{parsed.notes}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 py-3.5 rounded-2xl border border-border/60 bg-card text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors"
              >
                다시 촬영
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3.5 rounded-2xl bg-teal-600 text-white text-sm font-bold shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-colors"
              >
                저장하기
              </button>
            </div>
          </motion.div>
        )}

        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-3xl">
              ✅
            </div>
            <p className="font-bold text-foreground">저장 완료!</p>
            <p className="text-sm text-muted-foreground">검진 기록이 저장됐어요</p>
          </motion.div>
        )}
      </AnimatePresence>

      {visits.length > 0 && !parsed && !previewUrl && !saved && (
        <div className="pt-2">
          <p className="text-sm font-bold text-foreground mb-3">검진 기록</p>
          <div className="space-y-2">
            {visits.map((visit) => (
              <VetVisitCard key={visit.id} visit={visit} onDelete={() => removeVisit(visit.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
