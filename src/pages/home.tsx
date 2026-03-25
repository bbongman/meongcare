import { useState } from "react";
import { Plus, Bone, Activity, HeartPulse, CalendarClock, MoreHorizontal, Bell, X, Check, Stethoscope, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useDogs, type Dog } from "@/hooks/use-dogs";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { AddDogDialog } from "@/components/add-dog-dialog";
import { EditDogDialog } from "@/components/edit-dog-dialog";
import { DailyCheckDialog } from "@/components/daily-check-dialog";
import { useDailyLog } from "@/hooks/use-daily-log";
import { useSchedules, useAddSchedule, syncSchedulesToServer } from "@/hooks/use-schedules";
import { useVetVisits } from "@/hooks/use-vet-visits";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const MEAL_LABEL = ["안먹음", "조금", "보통", "잘먹음"];
const ENERGY_LABEL = ["축처짐", "보통", "활발"];
const ENERGY_COLOR = ["text-blue-400", "text-green-500", "text-orange-400"];

function TodayConditionBadge({ dogId }: { dogId: string }) {
  const { todayLog } = useDailyLog(dogId);
  if (!todayLog) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 relative z-10">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">오늘</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-semibold text-foreground">{MEAL_LABEL[todayLog.meal]}</span>
        <span className={`text-xs font-semibold ${ENERGY_COLOR[todayLog.energy]}`}>{ENERGY_LABEL[todayLog.energy]}</span>
        {todayLog.walk && <span className="text-xs">🦮</span>}
        {todayLog.poop && <span className="text-xs">💩</span>}
      </div>
    </div>
  );
}

function TodayCheckButton({ dogId, onClick }: { dogId: string; onClick: () => void }) {
  const { todayLog } = useDailyLog(dogId);
  const MEAL_EMOJI = ["😞", "😐", "🙂", "😋"];

  return (
    <div className="bg-orange-50/80 border border-orange-100 rounded-3xl p-5 cursor-pointer hover:bg-orange-100 transition-colors group" onClick={onClick}>
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary mb-4 group-hover:scale-110 transition-transform">
        <Activity className="w-6 h-6 stroke-[2.5px]" />
      </div>
      <h3 className="font-bold text-foreground">오늘 건강 체크</h3>
      {todayLog ? (
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-xs">{MEAL_EMOJI[todayLog.meal]}</span>
          {todayLog.walk && <span className="text-xs">🦮</span>}
          {todayLog.poop && <span className="text-xs">💩</span>}
          <span className="text-[10px] text-green-600 font-semibold">기록 완료</span>
        </div>
      ) : (
        <p className="text-xs font-medium text-muted-foreground mt-1">컨디션 기록하기</p>
      )}
    </div>
  );
}

function getHealthTip(dog: Dog): { emoji: string; title: string; body: string } {
  const { age, breed, weight } = dog;
  const w = weight || 0;

  // 몸무게 기반 보조 팁
  const weightTip = w > 0
    ? w < 4 ? `${w}kg 소형견은 저혈당에 취약하니 하루 2~3회 소량씩 나눠 급여하세요.`
    : w < 10 ? `${w}kg 중소형견은 하루 사료량 ${Math.round(w * 20)}~${Math.round(w * 25)}g 정도가 적당해요.`
    : w < 25 ? `${w}kg 중형견은 하루 사료량 ${Math.round(w * 15)}~${Math.round(w * 20)}g, 관절 건강에 신경 쓰세요.`
    : `${w}kg 대형견은 하루 사료량 ${Math.round(w * 12)}~${Math.round(w * 15)}g, 고관절과 심장 관리가 중요해요.`
    : "";

  if (age <= 1) return {
    emoji: "🍼",
    title: `퍼피 시기 · ${breed}`,
    body: `면역력이 약해요. 기초 예방접종(홍역·파보바이러스)을 꼭 완료하세요.${weightTip ? ` ${weightTip}` : " 성장기라 사료량을 점차 늘려주세요."}`,
  };
  if (age <= 3) return {
    emoji: "⚡",
    title: `활발한 청년기 · ${breed}`,
    body: `에너지가 넘치는 시기예요. 하루 30분 이상 산책이 필요해요.${weightTip ? ` ${weightTip}` : ""}`,
  };
  if (age <= 7) return {
    emoji: "💪",
    title: `건강한 성년기 · ${breed}`,
    body: `1년에 한 번 건강검진을 권장해요.${weightTip ? ` ${weightTip}` : " 치석이 쌓이기 쉬우니 주 2~3회 양치질이 중요해요."}`,
  };
  if (age <= 10) return {
    emoji: "🏥",
    title: `시니어 진입기 · ${breed}`,
    body: `심장·관절 질환을 주의하세요. 6개월마다 혈액검사를 권장해요.${weightTip ? ` ${weightTip}` : ""}`,
  };
  return {
    emoji: "❤️",
    title: `노령견 케어 · ${breed}`,
    body: `계단과 점프를 줄이고 관절 보조제를 고려하세요.${weightTip ? ` ${weightTip}` : " 식사량 변화나 음수량 증가에 주의하세요."}`,
  };
}

function HealthTipWidget({ dog }: { dog: Dog }) {
  const tip = getHealthTip(dog);
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0">
        {tip.emoji}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-blue-600 mb-0.5">{dog.name} 건강 팁 · {tip.title}</p>
        <p className="text-xs text-blue-800/80 leading-relaxed">{tip.body}</p>
      </div>
    </div>
  );
}

function RecentVetVisitWidget() {
  const { getRecent } = useVetVisits();
  const [, setLocation] = useLocation();
  const recent = getRecent(2);

  if (recent.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-3xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Stethoscope className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xs font-bold text-teal-700">최근 검진 기록</p>
        </div>
        <button
          onClick={() => setLocation("/health")}
          className="text-[11px] font-semibold text-teal-600 flex items-center gap-0.5 hover:text-teal-800 transition-colors"
        >
          전체보기 <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-2">
        {recent.map((visit) => (
          <div key={visit.id} className="bg-white/70 rounded-xl px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{visit.hospitalName || "병원명 미입력"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {visit.visitDate ? format(new Date(visit.visitDate), "M.dd (EEE)", { locale: ko }) : "날짜 미입력"}
                </span>
                {visit.diagnosis && (
                  <span className="text-[11px] text-teal-600 font-medium truncate">{visit.diagnosis}</span>
                )}
              </div>
            </div>
            {visit.totalPrice > 0 && (
              <span className="text-xs font-bold text-foreground shrink-0">{visit.totalPrice.toLocaleString()}원</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyReminderBanner() {
  const { data: schedules = [] } = useSchedules();
  const addSchedule = useAddSchedule();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("daily_reminder_dismissed") === "1");

  const hasReminder = schedules.some((s) => s.title.includes("건강 체크") && s.repeat === "daily");
  if (hasReminder || dismissed) return null;

  function setup() {
    addSchedule.mutate({
      type: "meal",
      title: "오늘 건강 체크",
      time: "20:00",
      repeat: "daily",
      enabled: true,
    }, {
      onSuccess: () => { syncSchedulesToServer(); setDismissed(true); localStorage.setItem("daily_reminder_dismissed", "1"); },
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-2xl px-4 py-3 flex items-center gap-3">
      <Bell className="w-4 h-4 text-violet-500 shrink-0" />
      <p className="text-xs text-violet-700 flex-1 font-medium">매일 저녁 8시에 건강 체크 알림 받기</p>
      <div className="flex gap-1.5 shrink-0">
        <button onClick={() => { setDismissed(true); localStorage.setItem("daily_reminder_dismissed", "1"); }} className="text-xs text-muted-foreground px-2 py-1 rounded-lg hover:bg-white/60">나중에</button>
        <button onClick={setup} disabled={addSchedule.isPending} className="text-xs font-bold text-white bg-violet-500 px-3 py-1 rounded-lg hover:bg-violet-600 transition-colors">설정</button>
      </div>
    </motion.div>
  );
}

function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, updateProfile } = useAuth();
  const [gender, setGender] = useState(user?.gender || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [memo, setMemo] = useState(user?.memo || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ gender: gender || undefined, phone: phone || undefined, memo: memo || undefined });
      setSaved(true);
      setTimeout(() => { setSaved(false); onOpenChange(false); }, 1000);
    } catch { }
    setSaving(false);
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
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const { data: dogs, isLoading } = useDogs();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const [dailyCheckOpen, setDailyCheckOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileEmoji = user?.gender === "male" ? "👨🏻" : user?.gender === "female" ? "👩🏻" : "🧑🏻";

  return (
    <Layout>
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <EditDogDialog
        dog={editingDog}
        open={!!editingDog}
        onOpenChange={(open) => { if (!open) setEditingDog(null); }}
      />
      {dogs && dogs.length > 0 && (
        <DailyCheckDialog
          dogs={dogs}
          open={dailyCheckOpen}
          onOpenChange={setDailyCheckOpen}
        />
      )}
      <div className="px-6 py-8 flex flex-col gap-8 min-h-full">
        {/* Header */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-4xl font-display text-primary flex items-center gap-2 drop-shadow-sm">
              멍케어 <span className="text-3xl">🐾</span>
            </h1>
            <p className="text-muted-foreground font-medium mt-1">반려견 건강 관리 파트너</p>
          </div>
          <button onClick={() => setProfileOpen(true)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shadow-inner hover:bg-secondary/80 transition-colors">
            <span className="text-xl">{profileEmoji}</span>
          </button>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-[2rem] bg-secondary/60" />
            <Skeleton className="h-16 w-full rounded-2xl bg-secondary/60" />
          </div>
        ) : !dogs || dogs.length === 0 ? (
          /* Empty State */
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12"
          >
            <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
              <span className="text-6xl z-10 drop-shadow-md">🐕</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2 font-display tracking-wide">첫 반려견을 맞이할 준비!</h2>
            <p className="text-muted-foreground mb-8 text-[15px] leading-relaxed">
              멍케어와 함께 사랑스러운 반려견의<br/>건강을 체계적으로 관리해보세요.
            </p>
            
            <AddDogDialog>
              <Button className="h-14 px-8 rounded-2xl text-lg font-bold shadow-lg shadow-primary/30 hover:-translate-y-1 transition-transform bg-gradient-to-br from-primary to-orange-500 w-full max-w-[280px]">
                <Plus className="w-6 h-6 mr-2 stroke-[3px]" />
                반려견 추가하기
              </Button>
            </AddDogDialog>
          </motion.div>
        ) : (
          /* Populated State */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">우리가족 댕댕이</h2>
              <AddDogDialog>
                <button className="text-sm font-bold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                  <Plus className="w-4 h-4 stroke-[3px]" /> 추가
                </button>
              </AddDogDialog>
            </div>

            {/* Dog Cards Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6 snap-x snap-mandatory">
              <AnimatePresence>
                {dogs.map((dog, i) => (
                  <motion.div
                    key={dog.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="min-w-[280px] w-[85%] snap-center shrink-0 bg-white border border-border/40 rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(255,107,53,0.08)] transition-all duration-300 relative overflow-hidden group"
                  >
                    {/* Decorative blob */}
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

                    <div className="flex justify-between items-start mb-5 relative z-10">
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary border-[3px] border-white shadow-md shrink-0">
                          {dog.photo ? (
                            <img src={dog.photo} alt={dog.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl bg-orange-50">🐕</div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground flex items-center gap-1.5">
                            {dog.name}
                            <span className="text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                              {dog.gender === 'male' ? '♂' : '♀'}
                            </span>
                          </h3>
                          <p className="text-sm text-muted-foreground font-medium mt-1 flex items-center gap-1">
                            <Bone className="w-3.5 h-3.5 text-primary" /> {dog.breed}
                          </p>
                        </div>
                      </div>
                      <button
                        className="text-muted-foreground/50 hover:text-foreground transition-colors p-1"
                        onClick={() => setEditingDog(dog)}
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 relative z-10">
                      <div className="bg-secondary/50 rounded-2xl p-3">
                        <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">나이</p>
                        <p className="font-bold text-foreground text-lg">{dog.age}<span className="text-sm font-medium text-muted-foreground ml-0.5">살</span></p>
                      </div>
                      <div className="bg-secondary/50 rounded-2xl p-3">
                        <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">몸무게</p>
                        {dog.weight ? (
                          <p className="font-bold text-foreground text-lg">{dog.weight}<span className="text-sm font-medium text-muted-foreground ml-0.5">kg</span></p>
                        ) : (
                          <p className="text-sm text-muted-foreground font-medium">미입력</p>
                        )}
                      </div>
                    </div>
                    <TodayConditionBadge dogId={dog.id} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 매일 건강 체크 리마인더 */}
            <DailyReminderBanner />

            {/* 최근 검진 기록 */}
            <RecentVetVisitWidget />

            {/* 나이 기반 건강 팁 */}
            {dogs[0] && <HealthTipWidget dog={dogs[0]} />}

            {/* Quick Actions */}
            <div className="mt-2 space-y-4">
              <h2 className="text-xl font-bold text-foreground mb-4">빠른 실행</h2>
              <div className="grid grid-cols-2 gap-4">
                <TodayCheckButton dogId={dogs[0].id} onClick={() => setDailyCheckOpen(true)} />
                <div
                  className="bg-purple-50/80 border border-purple-100 rounded-3xl p-5 cursor-pointer hover:bg-purple-100 transition-colors group"
                  onClick={() => setLocation("/schedule")}
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                    <CalendarClock className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold text-foreground">스케줄 확인</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-1">오늘 일정 보기</p>
                </div>
                <div className="col-span-2 bg-blue-50/80 border border-blue-100 rounded-3xl p-5 cursor-pointer hover:bg-blue-100 transition-colors group flex items-center gap-4" onClick={() => setLocation("/health")}>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                    <HeartPulse className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">AI 건강 분석</h3>
                    <p className="text-xs font-medium text-muted-foreground mt-1">증상을 입력하면 응급도를 알려드려요</p>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </Layout>
  );
}
