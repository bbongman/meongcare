import { useEffect, useRef, useState, useCallback } from "react";
import { Layout } from "@/components/layout";
import { MapPin, Timer, Footprints, Flame, Ruler, Users, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ["#f97316", "#22c55e", "#3b82f6", "#ec4899", "#a855f7", "#eab308", "#06b6d4"];
    const TOTAL = 120;

    interface Piece {
      x: number; y: number;
      vx: number; vy: number;
      rot: number; vrot: number;
      w: number; h: number;
      color: string;
      alpha: number;
    }

    const pieces: Piece[] = Array.from({ length: TOTAL }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 40,
      y: canvas.height * 0.45,
      vx: (Math.random() - 0.5) * 18,
      vy: -(Math.random() * 18 + 8),
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      w: Math.random() * 10 + 5,
      h: Math.random() * 5 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
    }));

    let frame = 0;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5;
        p.vx *= 0.99;
        p.rot += p.vrot;
        if (frame > 60) p.alpha -= 0.012;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (pieces.some(p => p.alpha > 0)) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[60] pointer-events-none"
    />
  );
}

declare global {
  interface Window {
    kakao: any;
    webkit?: { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> };
  }
}

const JEONJU_CENTER = { lat: 35.8489, lng: 127.1311 };

interface LatLng { lat: number; lng: number; }

interface WalkRecord {
  date: string;
  duration: number;
  distanceM: number;
  steps: number;
  calories: number;
}

interface ActiveEventInfo {
  session_id: string;
  event_id: string;
  title: string;
  start_at: string;
  lat: number;
  lng: number;
}

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  lat: number;
  lng: number;
  distance_m: number;
}

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDist(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

function waitForKakao(timeout = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) { resolve(); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.kakao && window.kakao.maps) { clearInterval(interval); resolve(); }
      else if (Date.now() - start > timeout) { clearInterval(interval); reject(new Error("카카오맵 로드 실패")); }
    }, 100);
  });
}

function getToken(): string | null {
  return localStorage.getItem("meongcare_token") || localStorage.getItem("knock_token");
}

export default function Walk() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const polylineRef = useRef<any>(null);
  const prevAccRef = useRef<number | null>(null);
  const myMarkerRef = useRef<any>(null);
  const participantMarkersRef = useRef<Map<string, any>>(new Map());
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const eventIdRef = useRef<string | null>(null);
  const currentPosRef = useRef<LatLng | null>(null);
  const distanceMRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  const [isWalking, setIsWalking] = useState<boolean>(() => localStorage.getItem("knock_walking") === "true");
  const [elapsed, setElapsed] = useState<number>(() => {
    const start = localStorage.getItem("knock_walk_start");
    if (start && localStorage.getItem("knock_walking") === "true") {
      return Math.floor((Date.now() - parseInt(start, 10)) / 1000);
    }
    return 0;
  });
  const [distanceM, setDistanceM] = useState(0);
  const [steps, setSteps] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<WalkRecord | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [activeEvent, setActiveEvent] = useState<ActiveEventInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantTotal, setParticipantTotal] = useState(0);

  const calories = Math.round(steps * 0.04);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // 마운트 시 활성 이벤트 세션 자동 감지
  useEffect(() => {
    async function fetchActiveEvent() {
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch("/api/walk/active-event", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (data) {
          setActiveEvent(data);
          // 이미 세션이 있으면 ref에 복원
          if (!sessionIdRef.current) {
            sessionIdRef.current = data.session_id;
            eventIdRef.current = data.event_id;
          }
        }
      } catch {}
    }
    fetchActiveEvent();
    // 1분마다 재확인 (이벤트 시작 감지)
    const interval = setInterval(fetchActiveEvent, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 활성 이벤트 있으면 참가자 poll 시작
  useEffect(() => {
    if (activeEvent && !pollIntervalRef.current) {
      startParticipantPoll(activeEvent.event_id);
    }
    return () => {
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    };
  }, [activeEvent?.event_id]);

  // 타이머
  useEffect(() => {
    if (isWalking) {
      timerRef.current = setInterval(() => {
        const start = localStorage.getItem("knock_walk_start");
        if (start) setElapsed(Math.floor((Date.now() - parseInt(start, 10)) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isWalking]);

  // 참가자 마커 업데이트
  function updateParticipantMarkers(list: Participant[]) {
    if (!mapRef.current || !window.kakao?.maps) return;
    const { maps } = window.kakao;
    const newIds = new Set(list.map(p => p.user_id));
    participantMarkersRef.current.forEach((marker, uid) => {
      if (!newIds.has(uid)) { marker.setMap(null); participantMarkersRef.current.delete(uid); }
    });
    list.forEach(p => {
      const pos = new maps.LatLng(p.lat, p.lng);
      const content = `<div style="background:#f97316;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.25)">${p.user_name}</div>`;
      if (participantMarkersRef.current.has(p.user_id)) {
        participantMarkersRef.current.get(p.user_id).setPosition(pos);
      } else {
        const overlay = new maps.CustomOverlay({ map: mapRef.current, position: pos, content, yAnchor: 1.3 });
        participantMarkersRef.current.set(p.user_id, overlay);
      }
    });
  }

  function startParticipantPoll(evId: string) {
    const token = getToken();
    if (!token) return;
    async function poll() {
      try {
        const res = await fetch(`/api/walk/participants?event_id=${evId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setParticipants(data.active || []);
          setParticipantTotal(data.total || 0);
          updateParticipantMarkers(data.active || []);
        }
      } catch {}
    }
    poll();
    pollIntervalRef.current = setInterval(poll, 5000);
  }

  function startLocationUpdate() {
    const token = getToken();
    if (!token) return;
    updateIntervalRef.current = setInterval(async () => {
      const sid = sessionIdRef.current;
      const pos = currentPosRef.current;
      if (!sid || !pos) return;
      try {
        await fetch("/api/walk/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId: sid, lat: pos.lat, lng: pos.lng, distanceM: distanceMRef.current }),
        });
      } catch {}
    }, 15000);
  }

  const pathRef = useRef<LatLng[]>([]);
  const lastTimestampRef = useRef<number>(0);
  const startGPSWithPath = useCallback(() => {
    if (!navigator.geolocation) return;
    pathRef.current = [];
    lastTimestampRef.current = 0;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // 정확도 25m 초과 시 무시
        if (pos.coords.accuracy > 25) return;

        const newPoint: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        currentPosRef.current = newPoint;

        const prev = pathRef.current;
        if (prev.length > 0) {
          const delta = haversine(prev[prev.length - 1], newPoint);
          const timeDeltaSec = lastTimestampRef.current > 0
            ? (pos.timestamp - lastTimestampRef.current) / 1000
            : 1;
          const speedMs = timeDeltaSec > 0 ? delta / timeDeltaSec : 0;

          // 1m 이상 이동 + 속도 7m/s(약 25km/h) 이하일 때만 반영 (GPS 점프 차단)
          if (delta >= 1 && speedMs < 7) {
            setDistanceM(d => { const next = d + delta; distanceMRef.current = next; return next; });
            pathRef.current = [...prev, newPoint];
          }
        } else {
          pathRef.current = [newPoint];
        }
        lastTimestampRef.current = pos.timestamp;

        if (mapRef.current && window.kakao?.maps) {
          const { maps } = window.kakao;
          const kakaoPath = pathRef.current.map(p => new maps.LatLng(p.lat, p.lng));
          if (polylineRef.current) {
            polylineRef.current.setPath(kakaoPath);
          } else {
            polylineRef.current = new maps.Polyline({
              map: mapRef.current, path: kakaoPath,
              strokeWeight: 4, strokeColor: "#22c55e", strokeOpacity: 0.9, strokeStyle: "solid",
            });
          }
          const myPos = new maps.LatLng(newPoint.lat, newPoint.lng);
          if (myMarkerRef.current) {
            myMarkerRef.current.setPosition(myPos);
          } else {
            myMarkerRef.current = new maps.CustomOverlay({
              map: mapRef.current, position: myPos,
              content: '<div style="width:14px;height:14px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
              yAnchor: 0.5,
            });
          }
          mapRef.current.panTo(myPos);
        }
      },
      (err) => {
        if (err.code === 1) showToast("위치 권한을 허용해 주세요.");
        else if (err.code === 2) showToast("GPS 신호를 찾을 수 없습니다.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, []);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (myMarkerRef.current) { myMarkerRef.current.setMap(null); myMarkerRef.current = null; }
    participantMarkersRef.current.forEach(m => m.setMap(null));
    participantMarkersRef.current.clear();
  }, []);

  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
    const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
    if (prevAccRef.current !== null && Math.abs(magnitude - prevAccRef.current) > 12) setSteps(s => s + 1);
    prevAccRef.current = magnitude;
  }, []);

  // 카카오맵 초기화
  useEffect(() => {
    let cancelled = false;
    async function initMap() {
      try {
        await waitForKakao();
        if (cancelled || !mapContainerRef.current) return;
        const { maps } = window.kakao;
        const center = new maps.LatLng(JEONJU_CENTER.lat, JEONJU_CENTER.lng);
        const map = new maps.Map(mapContainerRef.current, { center, level: 5 });
        mapRef.current = map;
        if (!cancelled) setMapReady(true);
      } catch {}
    }
    initMap();
    return () => { cancelled = true; };
  }, []);

  // 화면이 다시 켜지면 Wake Lock 재획득 (Android 일부 기기에서 자동 해제됨)
  useEffect(() => {
    async function reacquire() {
      if (isWalking && !wakeLockRef.current && "wakeLock" in navigator) {
        try { wakeLockRef.current = await (navigator as any).wakeLock.request("screen"); } catch {}
      }
    }
    document.addEventListener("visibilitychange", reacquire);
    return () => document.removeEventListener("visibilitychange", reacquire);
  }, [isWalking]);

  // GPS 시작 (이벤트 세션 자동 사용 or 신규 생성)
  async function handleStartGPS() {
    const token = getToken();
    let sid = sessionIdRef.current;

    if (!sid && token) {
      try {
        const body = activeEvent ? { eventId: activeEvent.event_id } : {};
        const res = await fetch("/api/walk/start", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (res.ok) { const d = await res.json(); sid = d.sessionId; sessionIdRef.current = sid; }
      } catch {}
    }

    distanceMRef.current = 0;
    localStorage.setItem("knock_walking", "true");
    localStorage.setItem("knock_walk_start", String(Date.now()));

    setIsWalking(true);
    setElapsed(0);
    setDistanceM(0);
    setSteps(0);
    prevAccRef.current = null;

    startGPSWithPath();

    // iOS 13+: DeviceMotion 권한 요청 후 걸음수 시작
    if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
      try {
        const result = await (DeviceMotionEvent as any).requestPermission();
        if (result === "granted") {
          window.addEventListener("devicemotion", handleMotion as EventListener);
        }
      } catch {}
    } else {
      window.addEventListener("devicemotion", handleMotion as EventListener);
    }

    // 화면 꺼짐 방지 (Wake Lock)
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch {}

    if (token) {
      startLocationUpdate();
      const evId = activeEvent?.event_id || eventIdRef.current;
      if (evId && !pollIntervalRef.current) startParticipantPoll(evId);
    }
  }

  async function handleStopWalk() {
    const finalElapsed = elapsed;
    const finalDist = distanceMRef.current;
    const finalSteps = steps;
    const finalCal = Math.round(finalSteps * 0.04);

    if (updateIntervalRef.current) { clearInterval(updateIntervalRef.current); updateIntervalRef.current = null; }
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }

    const token = getToken();
    const sid = sessionIdRef.current;
    if (token && sid) {
      try {
        await fetch("/api/walk/end", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId: sid, distanceM: finalDist }),
        });
      } catch {}
    }

    stopGPS();
    window.removeEventListener("devicemotion", handleMotion as EventListener);

    // Wake Lock 해제
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }

    localStorage.setItem("knock_walking", "false");
    localStorage.removeItem("knock_walk_start");

    sessionIdRef.current = null;
    setIsWalking(false);
    setActiveEvent(null);
    setParticipants([]);
    setParticipantTotal(0);

    setSummary({ date: new Date().toISOString(), duration: finalElapsed, distanceM: finalDist, steps: finalSteps, calories: finalCal });
    setShowSummary(true);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 4000);
  }

  function saveToHistory() {
    if (!summary) return;
    const existing: WalkRecord[] = JSON.parse(localStorage.getItem("walk_history") || "[]");
    existing.push(summary);
    localStorage.setItem("walk_history", JSON.stringify(existing));
    setShowSummary(false);
    setElapsed(0);
    showToast("산책 기록이 저장되었습니다.");
  }

  const myUserId = (() => {
    try {
      const token = getToken();
      if (!token) return null;
      return JSON.parse(atob(token.split(".")[1])).id || null;
    } catch { return null; }
  })();

  const otherParticipants = participants.filter(p => p.user_id !== myUserId);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100dvh-5rem)] overflow-y-auto">
        {/* 헤더 */}
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">지금 산책 중</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm text-muted-foreground">전주 덕진구</span>
              </div>
            </div>
            {isWalking && (
              <div className="flex items-center gap-2">
                {activeEvent && participantTotal > 1 && (
                  <div className="flex items-center gap-1 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-1">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs font-bold text-orange-600">{participantTotal}명 함께</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1.5">
                  <Timer className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-sm font-bold text-green-700 tabular-nums">{formatTime(elapsed)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 운동 통계 바 */}
          {isWalking && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { label: "시간", value: formatTime(elapsed), icon: <Timer className="w-3.5 h-3.5" /> },
                { label: "거리", value: formatDist(distanceM), icon: <Ruler className="w-3.5 h-3.5" /> },
                { label: "걸음", value: steps.toLocaleString(), icon: <Footprints className="w-3.5 h-3.5" /> },
                { label: "칼로리", value: `${calories}kcal`, icon: <Flame className="w-3.5 h-3.5" /> },
              ].map((item) => (
                <div key={item.label} className="bg-green-50 border border-green-100 rounded-xl px-2 py-2.5 flex flex-col items-center gap-1">
                  <div className="text-green-500">{item.icon}</div>
                  <p className="text-xs font-bold text-green-700 tabular-nums leading-tight text-center">{item.value}</p>
                  <p className="text-[10px] text-green-500 font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* 활성 이벤트 배너 */}
          {activeEvent && (
            <div className="mt-4 rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-bold text-orange-500 uppercase tracking-wide">이벤트 진행 중</span>
                {participantTotal > 0 && (
                  <div className="ml-auto flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-semibold text-orange-500">{participantTotal}명 참여 중</span>
                  </div>
                )}
              </div>
              <p className="text-sm font-bold text-foreground">{activeEvent.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(activeEvent.start_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 시작
              </p>
            </div>
          )}

          {/* 산책 시작/종료 버튼 */}
          <button
            onClick={isWalking ? handleStopWalk : handleStartGPS}
            className={cn(
              "mt-3 w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 relative overflow-hidden",
              isWalking
                ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                : activeEvent
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                : "bg-primary text-white shadow-lg shadow-primary/30"
            )}
          >
            {isWalking && <span className="absolute inset-0 rounded-2xl animate-pulse bg-green-400/30" />}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4" />
              {isWalking
                ? "산책 종료"
                : activeEvent
                ? "이벤트 산책 GPS 시작"
                : "산책 시작"}
            </span>
          </button>
        </div>

        {/* 함께 걷는 참가자 */}
        {isWalking && activeEvent && otherParticipants.length > 0 && (
          <div className="px-5 shrink-0 mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">함께 걷는 중</p>
            <div className="space-y-2">
              {otherParticipants.map(p => {
                const distKm = currentPosRef.current
                  ? haversine(currentPosRef.current, { lat: p.lat, lng: p.lng })
                  : null;
                return (
                  <div key={p.user_id} className="bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-orange-500">{p.user_name[0] || "?"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{p.user_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDist(p.distance_m)} 이동</p>
                    </div>
                    {distKm !== null && (
                      <span className="text-xs font-semibold text-primary">{formatDist(distKm)} 거리</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 카카오맵 */}
        <div className="mx-5 mt-2 mb-4 rounded-2xl overflow-hidden shadow-md relative shrink-0" style={{ height: 220 }}>
          <div ref={mapContainerRef} className="w-full h-full" />
          {!mapReady && (
            <div className="absolute inset-0 bg-secondary/60 flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-medium">지도 불러오는 중...</p>
            </div>
          )}
        </div>
      </div>

      <Confetti active={confetti} />

      {/* 산책 종료 요약 모달 */}
      {showSummary && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-center text-foreground mb-1">산책 완료!</h2>
            <p className="text-xs text-center text-muted-foreground mb-5">
              {new Date(summary.date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "총 시간", value: formatTime(summary.duration) },
                { label: "총 거리", value: formatDist(summary.distanceM) },
                { label: "걸음수", value: `${summary.steps.toLocaleString()}걸음` },
                { label: "칼로리", value: `${summary.calories}kcal` },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className="text-base font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <button onClick={saveToHistory} className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm mb-2">
              기록 저장
            </button>
            <button onClick={() => { setShowSummary(false); setElapsed(0); }} className="w-full py-3 rounded-2xl text-sm font-semibold text-muted-foreground">
              닫기
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-gray-800/90 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </Layout>
  );
}
