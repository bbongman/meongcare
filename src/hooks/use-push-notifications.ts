import { useState, useEffect } from "react";
import { getAuthToken } from "@/hooks/use-auth";

const CLIENT_ID_KEY = "meongcare_push_client_id";

function getOrCreateClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

async function reRegisterWithServer(sub: PushSubscription) {
  const clientId = getOrCreateClientId();
  const token = getAuthToken();
  if (!token) return;
  await fetch("/api/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub.toJSON(), clientId }),
  }).catch(() => {});
}

export function usePushNotifications() {
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setIsSubscribed(true);
        // 서버 재시작 시를 대비해 재등록
        reRegisterWithServer(sub);
      }
    });
  }, []);

  async function subscribe(): Promise<boolean> {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch("/api/vapid-public-key");
      const { publicKey } = await keyRes.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const token = getAuthToken();
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          clientId: getOrCreateClientId(),
        }),
      });

      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error("Push subscribe error:", e);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch("/api/push-unsubscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: getOrCreateClientId() }),
      }).catch(() => {});
    }
    setIsSubscribed(false);
  }

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
