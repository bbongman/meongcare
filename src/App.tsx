import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { X } from "lucide-react";

import { useAuth, AuthProvider } from "@/hooks/use-auth";

// Pages
import Login from "./pages/login";
import Home from "./pages/home";
import Map from "./pages/map";
import Health from "./pages/health";
import AiTools from "./pages/ai-tools";
import Schedule from "./pages/schedule";
import Diary from "./pages/diary";
import Admin from "./pages/admin";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Since it's local storage, no need to aggressively refetch
      staleTime: Infinity,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/map" component={Map} />
      <Route path="/health" component={Health} />
      <Route path="/ai" component={AiTools} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/diary" component={Diary} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 이미 설치됨 (standalone 모드)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // 이미 닫음
    if (localStorage.getItem("pwa_install_dismissed")) return;

    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const android = /android/.test(ua);

    if (ios || android) {
      setIsIos(ios);
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-white border border-border shadow-2xl rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4">
      <img src="/icons/icon-96x96.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">멍케어를 홈 화면에 추가하세요</p>
        {isIos ? (
          <p className="text-xs text-muted-foreground mt-1">
            Safari 하단의 <span className="inline-block align-middle text-base leading-none">⬆</span> 공유 버튼 → <strong>"홈 화면에 추가"</strong>를 눌러주세요
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            브라우저 메뉴 <strong>⋮</strong> → <strong>"홈 화면에 추가"</strong> 또는 주소창의 설치 버튼을 눌러주세요
          </p>
        )}
      </div>
      <button
        onClick={() => { setShow(false); localStorage.setItem("pwa_install_dismissed", "1"); }}
        className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <img src="/icons/icon-96x96.png" alt="" className="w-14 h-14 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <InstallBanner />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AuthGate />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
