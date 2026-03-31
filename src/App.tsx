import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { X } from "lucide-react";

import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { queryClient } from "@/lib/query-client";

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

function KakaoRedirect() {
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isKakao = /KAKAOTALK/i.test(ua);
    if (!isKakao) return;

    const isAndroid = /Android/i.test(ua);
    const isIos = /iPhone|iPad|iPod/i.test(ua);

    if (isAndroid) {
      // Android: intent 스킴으로 기본 브라우저에서 열기
      const url = window.location.href;
      const host = window.location.host;
      const path = window.location.pathname + window.location.search + window.location.hash;
      window.location.replace(
        `intent://${host}${path}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`
      );
    } else if (isIos) {
      setShowIosGuide(true);
    }
  }, []);

  if (!showIosGuide) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center px-8 text-center">
      <img src="/icons/icon-192x192.png" alt="" className="w-20 h-20 rounded-3xl shadow-lg mb-6" />
      <h2 className="text-xl font-bold text-foreground mb-2">외부 브라우저에서 열어주세요</h2>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        카카오톡 내부 브라우저에서는 일부 기능(알림, 홈 화면 추가)이 제한됩니다.
      </p>
      <div className="bg-secondary/60 rounded-2xl p-5 w-full space-y-3 text-left">
        <p className="text-xs font-bold text-foreground">Safari로 여는 방법</p>
        <ol className="space-y-2.5">
          <li className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
            화면 우측 하단 <strong className="text-foreground mx-1">···</strong> 버튼 탭
          </li>
          <li className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
            <strong className="text-foreground">"Safari로 열기"</strong> 선택
          </li>
        </ol>
      </div>
    </div>
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
          <KakaoRedirect />
          <AuthGate />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
