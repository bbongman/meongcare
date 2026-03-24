import { Layout } from "@/components/layout";
import { motion } from "framer-motion";

export default function Diary() {
  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center"
      >
        <div className="relative mb-8">
          <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center shadow-inner relative z-10 overflow-hidden">
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="text-6xl drop-shadow-md"
            >
              📔
            </motion.div>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/5 rounded-[100%] blur-sm" />
        </div>
        
        <h1 className="text-3xl font-display font-bold text-foreground mb-3">건강 다이어리</h1>
        <p className="text-muted-foreground leading-relaxed font-medium bg-card px-6 py-4 rounded-2xl shadow-sm border border-border/50">
          매일매일 식사량과 산책, 배변 상태를<br/>
          꼼꼼하게 기록할 수 있는 <strong className="text-primary">다이어리</strong>가<br/>
          곧 출시됩니다!
        </p>
      </motion.div>
    </Layout>
  );
}
