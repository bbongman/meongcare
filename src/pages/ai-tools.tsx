import { useState } from "react";
import { Layout } from "@/components/layout";
import { TranslatorTab } from "@/components/health/TranslatorTab";
import { ProductTab } from "@/components/health/ProductTab";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "translator" | "product";

const TABS: { id: Tab; label: string; emoji: string; desc: string }[] = [
  { id: "translator", label: "강아지 번역기", emoji: "🐾", desc: "짖음을 말로 번역" },
  { id: "product", label: "제품 분석", emoji: "🔍", desc: "용품 사진으로 성분 확인" },
];

export default function AiTools() {
  const [activeTab, setActiveTab] = useState<Tab>("translator");

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI 도구</h1>
            <p className="text-xs text-muted-foreground mt-0.5">재미있고 유용한 AI 기능들</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-4 rounded-2xl border font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-card text-foreground border-border/50 hover:border-primary/30"
              )}
            >
              <span className="text-2xl">{tab.emoji}</span>
              <span className="text-sm">{tab.label}</span>
              <span className={cn("text-[11px]", activeTab === tab.id ? "text-white/70" : "text-muted-foreground")}>
                {tab.desc}
              </span>
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "translator" && <TranslatorTab />}
            {activeTab === "product" && <ProductTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}
