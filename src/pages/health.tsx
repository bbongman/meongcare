import { useState } from "react";
import { Layout } from "@/components/layout";
import { ConsultationTab } from "@/components/health/ConsultationTab";
import { HistoryTab } from "@/components/health/HistoryTab";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "consultation" | "history";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "consultation", label: "AI 문진", emoji: "🩺" },
  { id: "history", label: "히스토리", emoji: "📋" },
];

export default function Health() {
  const [activeTab, setActiveTab] = useState<Tab>("consultation");

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

        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border",
                activeTab === tab.id
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
              )}
            >
              <span>{tab.emoji}</span>{tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
            {activeTab === "consultation" && <ConsultationTab />}
            {activeTab === "history" && <HistoryTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}
