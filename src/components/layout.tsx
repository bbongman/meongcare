import { Link, useLocation } from "wouter";
import { Home, MapPin, HeartPulse, Sparkles, CalendarClock, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { VoiceCommandFab } from "./VoiceCommandFab";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: "/", label: "홈", icon: Home },
    { path: "/health", label: "건강", icon: HeartPulse },
    { path: "/schedule", label: "스케줄", icon: CalendarClock },
    { path: "/ai", label: "AI 도구", icon: Sparkles },
    { path: "/map", label: "지도", icon: MapPin },
  ];

  return (
    <div className="h-[100dvh] bg-background flex flex-col relative w-full max-w-md mx-auto shadow-2xl shadow-black/5 overflow-hidden border-x border-border/50">
      {/* 사용자 바 */}
      {user && (
        <div className="flex items-center justify-end px-4 pt-2 pb-0 shrink-0">
          <button onClick={logout} className="flex items-center gap-1 text-[11px] text-muted-foreground/40 hover:text-red-400 transition-colors py-1 px-1.5 rounded-lg hover:bg-red-50">
            <LogOut className="w-3 h-3" />
            로그아웃
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-28 hide-scrollbar" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
        {children}
      </main>

      {/* AI 자연어 입력 FAB */}
      {user && <VoiceCommandFab />}

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-card border-t border-border/50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-50 rounded-t-2xl px-2 pt-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <motion.div
                key={item.path}
                whileTap={{ scale: 0.85 }}
                transition={{ duration: 0.08 }}
                className="flex-1"
              >
              <Link
                href={item.path}
                className="flex flex-col items-center justify-center gap-1.5 focus:outline-none group relative w-full"
              >
                {isActive && (
                  <div className="absolute -top-3 w-10 h-1 bg-primary rounded-b-full shadow-[0_2px_8px_rgba(255,107,53,0.5)]" />
                )}
                <div 
                  className={cn(
                    "p-2 rounded-xl transition-all duration-300 ease-out",
                    isActive 
                      ? "bg-primary/10 text-primary scale-110" 
                      : "text-muted-foreground hover:bg-secondary group-hover:text-foreground"
                  )}
                >
                  <Icon className="w-6 h-6 stroke-[2.5px]" />
                </div>
                <span 
                  className={cn(
                    "text-[10px] font-semibold transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
              </motion.div>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
