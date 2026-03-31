import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { syncSchedulesToServer } from "@/hooks/use-schedules";

// Service Worker 등록
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(console.error);

  // SW 준비 후 스케줄 + 푸시 구독 재등록 (서버 재시작 대비)
  navigator.serviceWorker.ready.then(async (reg) => {
    syncSchedulesToServer();
    // 기존 구독이 있으면 서버에 재등록
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const clientId = localStorage.getItem("meongcare_push_client_id");
      const token = localStorage.getItem("meongcare_token");
      if (clientId && token) {
        fetch("/api/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subscription: sub.toJSON(), clientId }),
        }).catch(() => {});
      }
    }
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
