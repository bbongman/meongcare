import { useState } from "react";
import { Check, Download, MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, updateProfile } = useAuth();
  const [gender, setGender] = useState(user?.gender || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [memo, setMemo] = useState(user?.memo || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function handleFeedback() {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true);
    try {
      await apiFetch("/api/feedback", { method: "POST", body: JSON.stringify({ message: feedbackText.trim() }) });
      setFeedbackSent(true);
      setTimeout(() => { setFeedbackSent(false); setFeedbackOpen(false); setFeedbackText(""); }, 1500);
    } catch {}
    setFeedbackSending(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ gender: gender || undefined, phone: phone || undefined, memo: memo || undefined });
      setSaved(true);
      setTimeout(() => { setSaved(false); onOpenChange(false); }, 1000);
    } catch { }
    setSaving(false);
  }

  async function handleExport() {
    try {
      const data = await apiFetch<Record<string, unknown>>("/api/backup");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `멍케어_백업_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-4 p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">보호자 정보</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">나중에 병원 방문 시 반려견 정보와 함께 전달할 수 있어요</p>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">이름</p>
            <p className="text-sm font-bold text-foreground bg-secondary/50 px-4 py-3 rounded-xl">{user?.name}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">성별</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setGender("male")}
                className={cn("flex-1 h-11 rounded-xl font-bold text-sm transition-all border-2",
                  gender === "male" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-card border-border/50 text-muted-foreground")}>
                남성
              </button>
              <button type="button" onClick={() => setGender("female")}
                className={cn("flex-1 h-11 rounded-xl font-bold text-sm transition-all border-2",
                  gender === "female" ? "bg-pink-50 border-pink-500 text-pink-700" : "bg-card border-border/50 text-muted-foreground")}>
                여성
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">연락처 <span className="font-normal">(선택)</span></p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full h-11 px-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">메모 <span className="font-normal">(선택)</span></p>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="알레르기, 특이사항 등"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saved ? <><Check className="w-4 h-4" /> 저장 완료</> : saving ? "저장 중..." : "저장하기"}
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> 백업
          </button>
          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> 의견 보내기
          </button>
        </div>
      </DialogContent>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="rounded-3xl max-w-sm mx-4 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">의견 보내기</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">개선 아이디어, 불편한 점, 원하는 기능을 알려주세요</p>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="여기에 자유롭게 작성해주세요..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary resize-none"
          />
          <button
            onClick={handleFeedback}
            disabled={feedbackSending || !feedbackText.trim()}
            className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {feedbackSent ? <><Check className="w-4 h-4" /> 전송 완료!</> : feedbackSending ? "전송 중..." : <><Send className="w-4 h-4" /> 보내기</>}
          </button>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
