import { useState } from "react";
import { Plus, Bone, Activity, CalendarDays, CalendarClock, MoreHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import { useDogs, type Dog } from "@/hooks/use-dogs";
import { Layout } from "@/components/layout";
import { AddDogDialog } from "@/components/add-dog-dialog";
import { EditDogDialog } from "@/components/edit-dog-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { data: dogs, isLoading } = useDogs();
  const [, setLocation] = useLocation();
  const [editingDog, setEditingDog] = useState<Dog | null>(null);

  return (
    <Layout>
      <EditDogDialog
        dog={editingDog}
        open={!!editingDog}
        onOpenChange={(open) => { if (!open) setEditingDog(null); }}
      />
      <div className="px-6 py-8 flex flex-col gap-8 min-h-full">
        {/* Header */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-4xl font-display text-primary flex items-center gap-2 drop-shadow-sm">
              멍케어 <span className="text-3xl">🐾</span>
            </h1>
            <p className="text-muted-foreground font-medium mt-1">반려견 건강 관리 파트너</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shadow-inner cursor-pointer hover:bg-secondary/80 transition-colors">
            <span className="text-xl">👩🏻</span>
          </div>
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
                        <p className="font-bold text-foreground text-lg">{dog.weight}<span className="text-sm font-medium text-muted-foreground ml-0.5">kg</span></p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Quick Actions */}
            <div className="mt-2 space-y-4">
              <h2 className="text-xl font-bold text-foreground mb-4">빠른 실행</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50/80 border border-orange-100 rounded-3xl p-5 cursor-pointer hover:bg-orange-100 transition-colors group" onClick={() => setLocation("/health")}>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary mb-4 group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold text-foreground">오늘 건강 체크</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-1">컨디션 기록하기</p>
                </div>
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
                <div className="bg-blue-50/80 border border-blue-100 rounded-3xl p-5 cursor-pointer hover:bg-blue-100 transition-colors group" onClick={() => setLocation("/schedule")}>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                    <CalendarDays className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold text-foreground">예방접종 관리</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-1">일정 확인하기</p>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </Layout>
  );
}
