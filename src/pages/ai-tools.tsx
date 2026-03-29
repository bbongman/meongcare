import { useState } from "react";
import { Layout } from "@/components/layout";
import { TranslatorTab } from "@/components/health/TranslatorTab";
import { ProductTab } from "@/components/health/ProductTab";
import { FoodCheckTab } from "@/components/health/FoodCheckTab";
import { BehaviorTab } from "@/components/health/BehaviorTab";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "behavior" | "food" | "product" | "translator";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "behavior", label: "행동 & 훈련", emoji: "🐕‍🦺" },
  { id: "food", label: "음식 체크", emoji: "🍖" },
  { id: "product", label: "제품 분석", emoji: "🔍" },
  { id: "translator", label: "번역기", emoji: "🐾" },
];

export default function AiTools() {
  const [activeTab, setActiveTab] = useState<Tab>("behavior");

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI 도구</h1>
            <p className="text-xs text-muted-foreground mt-0.5">재미있고 유용한 AI 기능들</p>
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
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "behavior" && <BehaviorTab />}
            {activeTab === "food" && <FoodCheckTab />}
            {activeTab === "product" && <ProductTab />}
            {activeTab === "translator" && <TranslatorTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}
