import { useState, useEffect } from "react";
import { Plus, Bell, Trash2, Clock, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useSchedules,
  useAddSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  syncSchedulesToServer,
  SCHEDULE_LABELS,
  REPEAT_LABELS,
  type ScheduleType,
  type RepeatType,
} from "@/hooks/use-schedules";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useDogs } from "@/hooks/use-dogs";

const TYPES: { type: ScheduleType; label: string; emoji: string }[] = [
  { type: "meal", label: "밥 시간", emoji: "🍖" },
  { type: "medicine", label: "약 복용", emoji: "💊" },
  { type: "walk", label: "산책", emoji: "🦮" },
  { type: "vaccine", label: "예방접종", emoji: "💉" },
];

function getDiffDays(vaccineDate: string): number {
  const target = new Date(vaccineDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDDayText(vaccineDate: string): string {
  const diff = getDiffDays(vaccineDate);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function getDDayColor(vaccineDate: string): string {
  const diff = getDiffDays(vaccineDate);
  if (diff <= 1) return "bg-red-500 text-white";
  if (diff <= 7) return "bg-orange-400 text-white";
  return "bg-purple-100 text-purple-600";
}

export default function Schedule() {
  const { data: schedules = [] } = useSchedules();
  const { data: dogs = [] } = useDogs();
  const addSchedule = useAddSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const { isSupported: pushSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ScheduleType>("meal");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("08:00");
  const [repeat, setRepeat] = useState<RepeatType>("daily");
  const [medicineName, setMedicineName] = useState("");
  const [vaccineDate, setVaccineDate] = useState("");
  const [selectedDogId, setSelectedDogId] = useState<string>("_all");
  const [filterType, setFilterType] = useState<ScheduleType | "all">("all");

  async function handleResubscribe() {
    await unsubscribe();
    await subscribe();
    syncSchedulesToServer();
    setTestMsg("재구독 완료! 테스트를 눌러보세요.");
    setTimeout(() => setTestMsg(null), 3000);
  }

  async function handleRequestNotif() {
    const ok = await subscribe();
    if (ok) {
      // 구독 직후 현재 스케줄 서버에 동기화
      syncSchedulesToServer();
    }
  }

  async function handleTestNotif() {
    setTestMsg(null);
    try {
      // 구독 안 되어 있으면 먼저 구독
      if (!isSubscribed) {
        const ok = await subscribe();
        if (!ok) { setTestMsg("알림 허용이 필요해요."); setTimeout(() => setTestMsg(null), 4000); return; }
        syncSchedulesToServer();
      }
      const res = await fetch("/api/push-test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setTestMsg(data.error);
      else setTestMsg("테스트 알림을 보냈어요! 잠시 후 도착해요.");
    } catch {
      setTestMsg("전송 실패. 서버를 확인해주세요.");
    }
    setTimeout(() => setTestMsg(null), 4000);
  }

  function resetForm() {
    setTitle("");
    setTime("08:00");
    setRepeat("daily");
    setMedicineName("");
    setVaccineDate("");
    setSelectedDogId("_all");
    setSelectedType("meal");
  }

  function handleSubmit() {
    const dog = selectedDogId === "_all" ? undefined : dogs.find((d) => d.id === selectedDogId);
    const finalTitle =
      title.trim() ||
      (selectedType === "medicine" && medicineName ? `${medicineName} 복용` :
       selectedType === "vaccine" ? "예방접종" :
       SCHEDULE_LABELS[selectedType].label);

    addSchedule.mutate({
      type: selectedType,
      title: finalTitle,
      time,
      repeat,
      dogId: selectedDogId === "_all" ? undefined : selectedDogId || undefined,
      dogName: dog?.name,
      medicineName: selectedType === "medicine" ? medicineName : undefined,
      vaccineDate: selectedType === "vaccine" ? vaccineDate : undefined,
      enabled: true,
    });
    setOpen(false);
    resetForm();
  }

  const filtered = filterType === "all" ? schedules : schedules.filter((s) => s.type === filterType);

  const urgentVaccines = schedules.filter((s) => {
    if (s.type !== "vaccine" || !s.vaccineDate || !s.enabled) return false;
    const target = new Date(s.vaccineDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 7 && diff >= 0;
  });

  return (
    <Layout>
      <div className="px-5 py-7 flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground">스케줄 & 알림</h1>
            <p className="text-sm text-muted-foreground mt-0.5">반려견 일정을 관리해요</p>
          </div>
          <Button
            size="sm"
            onClick={() => { setOpen(true); resetForm(); }}
            className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 gap-1.5 px-4"
          >
            <Plus className="w-4 h-4 stroke-[3px]" />
            추가
          </Button>
        </header>

        {/* Push Notification Banner */}
        {pushSupported ? (
          isSubscribed ? (
            <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-sm font-medium text-green-700 flex-1">앱이 꺼져도 알림이 와요</p>
              <button
                onClick={handleResubscribe}
                className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
              >
                재구독
              </button>
              <button
                onClick={handleTestNotif}
                className="text-xs font-semibold text-green-600 bg-white border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-50 transition-colors shrink-0"
              >
                테스트
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">푸시 알림 허용하기</p>
                <p className="text-xs text-muted-foreground mt-0.5">앱이 꺼져도 시간에 맞춰 알림이 와요</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={handleTestNotif}
                  disabled={pushLoading}
                  className="text-xs font-semibold text-orange-600 bg-white border border-orange-200 px-2.5 py-1 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  테스트
                </button>
                <Button
                  size="sm"
                  onClick={handleRequestNotif}
                  disabled={pushLoading}
                  className="shrink-0 rounded-xl bg-primary text-white text-xs px-3 h-8"
                >
                  {pushLoading ? "..." : "허용"}
                </Button>
              </div>
            </motion.div>
          )
        ) : (
          <div className="bg-secondary border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">이 브라우저는 푸시 알림을 지원하지 않아요</p>
          </div>
        )}
        {testMsg && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-medium">
            {testMsg}
          </div>
        )}

        {/* 예방접종 전체 현황 */}
        {schedules.some((s) => s.type === "vaccine") && (
          <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">💉 예방접종 현황</p>
              <button
                onClick={() => { setFilterType("vaccine"); }}
                className="text-xs text-purple-600 font-semibold hover:underline"
              >
                전체 보기
              </button>
            </div>
            <div className="space-y-2">
              {schedules.filter((s) => s.type === "vaccine" && s.vaccineDate).slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    {s.dogName && <p className="text-xs text-muted-foreground">{s.dogName}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{s.vaccineDate}</p>
                    {s.vaccineDate && (
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", getDDayColor(s.vaccineDate))}>
                        {getDDayText(s.vaccineDate)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Urgent Vaccine Alerts */}
        <AnimatePresence>
          {urgentVaccines.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-2"
            >
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">⚠️ 임박한 예방접종</p>
              {urgentVaccines.map((s) => (
                <div key={s.id} className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💉</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{s.title}</p>
                      {s.dogName && <p className="text-xs text-muted-foreground">{s.dogName}</p>}
                    </div>
                  </div>
                  {s.vaccineDate && (
                    <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", getDDayColor(s.vaccineDate))}>
                      {getDDayText(s.vaccineDate)}
                    </span>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
          {[{ type: "all" as const, label: "전체", emoji: "📋" }, ...TYPES].map((t) => (
            <button
              key={t.type}
              onClick={() => setFilterType(t.type)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-all duration-200",
                filterType === t.type
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Schedule List */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <span className="text-5xl mb-4">🗓️</span>
            <p className="text-base font-bold text-foreground">등록된 스케줄이 없어요</p>
            <p className="text-sm text-muted-foreground mt-1">+ 추가 버튼으로 일정을 만들어보세요</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((s, i) => {
                const meta = SCHEDULE_LABELS[s.type];
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      "border rounded-2xl p-4 flex items-center gap-4 transition-opacity",
                      meta.bg,
                      !s.enabled && "opacity-50"
                    )}
                  >
                    <div className="text-2xl shrink-0">{meta.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground text-sm">{s.title}</p>
                        {s.type === "vaccine" && s.vaccineDate && (
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", getDDayColor(s.vaccineDate))}>
                            {getDDayText(s.vaccineDate)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <Clock className="w-3 h-3" />
                          {s.type !== "vaccine" ? s.time : (s.vaccineDate || "")}
                        </span>
                        {s.type !== "vaccine" && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                            <RefreshCw className="w-3 h-3" />
                            {REPEAT_LABELS[s.repeat]}
                          </span>
                        )}
                        {s.dogName && (
                          <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full font-medium text-muted-foreground">
                            🐾 {s.dogName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={s.enabled}
                        onCheckedChange={(checked) =>
                          updateSchedule.mutate({ id: s.id, updates: { enabled: checked } })
                        }
                        className="data-[state=checked]:bg-primary scale-90"
                      />
                      <button
                        onClick={() => deleteSchedule.mutate(s.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Schedule Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-sm mx-4 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">스케줄 추가</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Type Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-muted-foreground">알림 종류</Label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => setSelectedType(t.type)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                      selectedType === t.type
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span>{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dog selector */}
            {dogs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">반려견 선택 (선택사항)</Label>
                <Select value={selectedDogId} onValueChange={setSelectedDogId}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="모든 반려견" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">모든 반려견</SelectItem>
                    {dogs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.photo ? "" : "🐾 "}{d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Medicine Name */}
            {selectedType === "medicine" && (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">약 이름</Label>
                <Input
                  placeholder="예: 심장사상충 예방약"
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  className="rounded-xl h-11"
                />
              </div>
            )}

            {/* Custom Title */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-muted-foreground">알림 제목 (선택사항)</Label>
              <Input
                placeholder={
                  selectedType === "meal" ? "예: 아침 밥 주기" :
                  selectedType === "medicine" ? "예: 약 먹이기" :
                  selectedType === "walk" ? "예: 저녁 산책" :
                  "예: 광견병 예방접종"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>

            {/* Vaccine Date or Time */}
            {selectedType === "vaccine" ? (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">예방접종 날짜</Label>
                <Input
                  type="date"
                  value={vaccineDate}
                  onChange={(e) => setVaccineDate(e.target.value)}
                  className="rounded-xl h-11"
                />
                <p className="text-xs text-muted-foreground">D-7, D-1에 자동으로 알림이 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">알림 시간</Label>
                <TimePicker value={time} onChange={setTime} />
              </div>
            )}

            {/* Repeat */}
            {selectedType !== "vaccine" && (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">반복</Label>
                <Select value={repeat} onValueChange={(v) => setRepeat(v as RepeatType)}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">매일</SelectItem>
                    <SelectItem value="weekly">매주</SelectItem>
                    <SelectItem value="monthly">매월</SelectItem>
                    <SelectItem value="none">반복 없음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl h-11">
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addSchedule.isPending || (selectedType === "vaccine" && !vaccineDate)}
              className="flex-1 rounded-xl h-11 bg-primary text-white shadow-md shadow-primary/25"
            >
              {addSchedule.isPending ? "저장 중..." : "저장하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
