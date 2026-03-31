import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { ConsultationTab } from "@/components/health/ConsultationTab";
import { HistoryTab } from "@/components/health/HistoryTab";
import { StatsTab } from "@/components/health/StatsTab";
import { VetVisitTab } from "@/components/health/VetVisitTab";
import { VaccineTab } from "@/components/health/VaccineTab";
import { PreventionTab } from "@/components/health/PreventionTab";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, X, ChevronUp, ChevronDown, LayoutList } from "lucide-react";
import { useUserSettings } from "@/hooks/use-user-settings";

type Tab = "consultation" | "vet-visit" | "vaccine" | "prevention" | "stats" | "history";

const ALL_TABS: { id: Tab; label: string; emoji: string; desc: string }[] = [
  { id: "consultation", label: "AI 문진", emoji: "🩺", desc: "증상 입력으로 응급도 확인" },
  { id: "vet-visit", label: "검진 기록", emoji: "🏥", desc: "병원 영수증 OCR 저장" },
  { id: "vaccine", label: "예방접종", emoji: "💉", desc: "접종 일정 및 D-day 알림" },
  { id: "prevention", label: "예방약", emoji: "💊", desc: "월별 예방약 체크" },
  { id: "stats", label: "통계", emoji: "📊", desc: "건강 데이터 시각화" },
  { id: "history", label: "히스토리", emoji: "📋", desc: "AI 분석 결과 기록" },
];

const DEFAULT_ORDER = ALL_TABS.map(t => t.id);

function mergeOrder(saved: string[]): Tab[] {
  const ids = ALL_TABS.map(t => t.id);
  const valid = saved.filter((id): id is Tab => ids.includes(id as Tab));
  const missing = ids.filter(id => !valid.includes(id));
  return [...valid, ...missing];
}

export default function Health() {
  const [activeTab, setActiveTab] = useState<Tab>("consultation");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { tabOrder: savedOrder, saveSettings } = useUserSettings();

  const tabOrder: Tab[] = savedOrder.length > 0 ? mergeOrder(savedOrder) : DEFAULT_ORDER;

  function setTabOrder(next: Tab[]) {
    saveSettings({ tabOrder: next });
  }

  const orderedTabs = tabOrder.map(id => ALL_TABS.find(t => t.id === id)!).filter(Boolean);

  function moveTab(index: number, dir: -1 | 1) {
    const next = [...tabOrder];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setTabOrder(next);
  }

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <span className="text-xl">❤️‍🩹</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">건강 관리</h1>
            <p className="text-xs text-muted-foreground mt-0.5">AI 문진으로 응급도를 확인해요</p>
          </div>
        </div>

        {/* 탭 바 */}
        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1 min-w-0">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {orderedTabs.map((tab) => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.88 }}
                transition={{ duration: 0.08 }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors border",
                  activeTab === tab.id
                    ? "bg-primary text-white border-primary shadow-sm px-3 py-2"
                    : "bg-card text-muted-foreground border-border/50 hover:border-primary/30 px-2.5 py-2"
                )}
              >
                <span>{tab.emoji}</span>
                {activeTab === tab.id && <span>{tab.label}</span>}
              </motion.button>
            ))}
          </div>
          </div>
          {/* 목록/편집 버튼 */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 w-8 h-8 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
            {activeTab === "consultation" && <ConsultationTab />}
            {activeTab === "vet-visit" && <VetVisitTab />}
            {activeTab === "vaccine" && <VaccineTab />}
            {activeTab === "prevention" && <PreventionTab />}
            {activeTab === "stats" && <StatsTab />}
            {activeTab === "history" && <HistoryTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 전체 목록 + 편집 드로어 */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* 배경 */}
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            {/* 드로어 */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              {/* 핸들 */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              <div className="px-5 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-foreground">메뉴 편집</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">순서를 바꿔 자주 쓰는 탭을 앞으로</p>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {orderedTabs.map((tab, index) => (
                    <div
                      key={tab.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer",
                        activeTab === tab.id
                          ? "bg-primary/5 border-primary/30"
                          : "bg-card border-border/50"
                      )}
                      onClick={() => { setActiveTab(tab.id); setDrawerOpen(false); }}
                    >
                      {/* 아이콘 */}
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-xl">{tab.emoji}</span>
                      </div>

                      {/* 텍스트 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          {tab.label}
                          {activeTab === tab.id && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">현재</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tab.desc}</p>
                      </div>

                      {/* 순서 버튼 */}
                      <div
                        className="flex flex-col gap-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => moveTab(index, -1)}
                          disabled={index === 0}
                          className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-20 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveTab(index, 1)}
                          disabled={index === orderedTabs.length - 1}
                          className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-20 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { setTabOrder(ALL_TABS.map(t => t.id)); }}
                  className="mt-4 w-full py-2.5 text-xs font-semibold text-muted-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                >
                  기본 순서로 초기화
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}
