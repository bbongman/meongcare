import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { MapPin, MessageCircle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    kakao: any;
  }
}

const JEONJU_CENTER = { lat: 35.8489, lng: 127.1311 };

const MOCK_DOGS = [
  {
    id: "1",
    name: "초코",
    breed: "포메라니안",
    size: "소형견",
    distance: "230m",
    minutesAgo: 5,
    lat: 35.8497,
    lng: 127.1325,
  },
  {
    id: "2",
    name: "메리",
    breed: "골든 리트리버",
    size: "대형견",
    distance: "510m",
    minutesAgo: 12,
    lat: 35.8478,
    lng: 127.1295,
  },
  {
    id: "3",
    name: "두부",
    breed: "비숑 프리제",
    size: "소형견",
    distance: "780m",
    minutesAgo: 3,
    lat: 35.8502,
    lng: 127.1340,
  },
  {
    id: "4",
    name: "루시",
    breed: "보더 콜리",
    size: "중형견",
    distance: "1.1km",
    minutesAgo: 20,
    lat: 35.8471,
    lng: 127.1278,
  },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function waitForKakao(timeout = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) { resolve(); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.kakao && window.kakao.maps) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error("카카오맵 로드 실패"));
      }
    }, 100);
  });
}

export default function Walk() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isWalking, setIsWalking] = useState<boolean>(() => {
    return localStorage.getItem("knock_walking") === "true";
  });
  const [elapsed, setElapsed] = useState<number>(() => {
    const start = localStorage.getItem("knock_walk_start");
    if (start && localStorage.getItem("knock_walking") === "true") {
      return Math.floor((Date.now() - parseInt(start, 10)) / 1000);
    }
    return 0;
  });
  const [greetedId, setGreetedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 타이머
  useEffect(() => {
    if (isWalking) {
      timerRef.current = setInterval(() => {
        const start = localStorage.getItem("knock_walk_start");
        if (start) {
          setElapsed(Math.floor((Date.now() - parseInt(start, 10)) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isWalking]);

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

        // 내 위치 마커
        const myMarkerImg = new maps.MarkerImage(
          "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
          new maps.Size(24, 35)
        );
        new maps.Marker({ map, position: center, image: myMarkerImg, title: "내 위치" });

        // 주변 강아지 마커
        MOCK_DOGS.forEach((dog) => {
          const pos = new maps.LatLng(dog.lat, dog.lng);
          const marker = new maps.Marker({ map, position: pos, title: dog.name });
          const infoContent = `<div style="padding:6px 10px;font-size:12px;font-weight:600;border-radius:8px;">${dog.name} (${dog.breed})</div>`;
          const infowindow = new maps.InfoWindow({ content: infoContent });
          maps.event.addListener(marker, "click", () => {
            infowindow.open(map, marker);
          });
        });

        if (!cancelled) setMapReady(true);
      } catch {
        // 지도 초기화 실패 — 지도 없이도 페이지는 동작
      }
    }
    initMap();
    return () => { cancelled = true; };
  }, []);

  function toggleWalk() {
    if (isWalking) {
      // 산책 종료
      localStorage.setItem("knock_walking", "false");
      localStorage.removeItem("knock_walk_start");
      setIsWalking(false);
      setElapsed(0);
    } else {
      // 산책 시작
      localStorage.setItem("knock_walking", "true");
      localStorage.setItem("knock_walk_start", String(Date.now()));
      setIsWalking(true);
      setElapsed(0);
    }
  }

  function handleGreet(id: string) {
    setGreetedId(id);
    setTimeout(() => setGreetedId(null), 2000);
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100dvh-5rem)]">
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
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1.5">
                <Timer className="w-3.5 h-3.5 text-green-600" />
                <span className="text-sm font-bold text-green-700 tabular-nums">{formatTime(elapsed)}</span>
              </div>
            )}
          </div>

          {/* 산책 시작/종료 버튼 */}
          <button
            onClick={toggleWalk}
            className={cn(
              "mt-4 w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 relative overflow-hidden",
              isWalking
                ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                : "bg-primary text-white shadow-lg shadow-primary/30"
            )}
          >
            {isWalking && (
              <span className="absolute inset-0 rounded-2xl animate-pulse bg-green-400/30" />
            )}
            <span className="relative z-10">
              {isWalking ? "산책 종료" : "산책 시작"}
            </span>
          </button>
        </div>

        {/* 근처 산책 중인 강아지 */}
        <div className="px-5 shrink-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">근처 산책 중인 강아지</p>
          <div className="space-y-2.5">
            {MOCK_DOGS.map((dog) => (
              <div
                key={dog.id}
                className="bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-3"
              >
                {/* 아바타 */}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                  🐶
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{dog.name}</p>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      dog.size === "소형견"
                        ? "bg-blue-50 text-blue-600"
                        : dog.size === "중형견"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-purple-50 text-purple-600"
                    )}>
                      {dog.size}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{dog.breed}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-xs font-semibold text-primary">{dog.distance}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-xs text-muted-foreground">{dog.minutesAgo}분 전</span>
                  </div>
                </div>

                {/* 인사하기 버튼 */}
                <button
                  onClick={() => handleGreet(dog.id)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 border",
                    greetedId === dog.id
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                  )}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {greetedId === dog.id ? "전송!" : "인사하기"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 카카오맵 */}
        <div className="flex-1 mx-5 mt-4 mb-2 rounded-2xl overflow-hidden shadow-md relative min-h-[160px]">
          <div ref={mapContainerRef} className="w-full h-full" />
          {!mapReady && (
            <div className="absolute inset-0 bg-secondary/60 flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-medium">지도 불러오는 중...</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
