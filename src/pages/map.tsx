import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { Loader2, MapPin, Phone, Navigation, ExternalLink, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    kakao: any;
  }
}

interface Place {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  place_url: string;
  x: string;
  y: string;
  distance: string;
}

type Status = "idle" | "loading-sdk" | "loading-location" | "loading-search" | "ready" | "error";

import { getFavVets, toggleFavVet } from "@/hooks/use-fav-vets";

const CATEGORIES = [
  { label: "동물병원", emoji: "🏥", keywords: ["동물병원"] },
  { label: "애견미용", emoji: "✂️", keywords: ["애견미용"] },
  { label: "펫호텔", emoji: "🏨", keywords: ["펫호텔"] },
  { label: "애견카페", emoji: "☕", keywords: ["애견카페", "반려동물카페", "펫카페", "도그카페"] },
];

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
        reject(new Error("카카오맵을 불러오지 못했습니다.\n도메인 등록 또는 API 키를 확인해주세요."));
      }
    }, 100);
  });
}

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);
  const [showDiag, setShowDiag] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("동물병원");
  const [isSearching, setIsSearching] = useState(false);
  const [radius, setRadius] = useState(3000);
  const [manualQuery, setManualQuery] = useState("");
  const [favIds, setFavIds] = useState<Set<string>>(() => new Set(getFavVets().map((f) => f.id)));

  const apiKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
  const currentDomain = window.location.origin;

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setStatus("loading-sdk");
        await waitForKakao();
        if (cancelled) return;

        setStatus("loading-location");
        const coords = await getCurrentLocation();
        if (cancelled) return;
        coordsRef.current = coords;

        setStatus("loading-search");
        initMap(coords.lat, coords.lng);
        await doSearch(coords.lat, coords.lng, ["동물병원"]);
        if (cancelled) return;

        setStatus("ready");
      } catch (e: any) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(e.message || "지도를 불러오지 못했습니다.");
        }
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !coordsRef.current) return;
    const { lat, lng } = coordsRef.current;
    const cat = CATEGORIES.find(c => c.label === activeCategory);
    const keywords = cat?.keywords ?? [activeCategory];
    setIsSearching(true);
    setSelectedId(null);
    doSearch(lat, lng, keywords).finally(() => setIsSearching(false));
  }, [activeCategory, radius]);

  function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("이 브라우저는 위치 서비스를 지원하지 않아요."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationDenied(true);
            reject(new Error("location_denied"));
          } else {
            reject(new Error("위치를 가져오지 못했어요. 잠시 후 다시 시도해주세요."));
          }
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  function initMap(lat: number, lng: number) {
    if (!mapContainerRef.current) return;
    const { maps } = window.kakao;
    const center = new maps.LatLng(lat, lng);
    const map = new maps.Map(mapContainerRef.current, { center, level: 4 });
    mapRef.current = map;
    const myMarkerImg = new maps.MarkerImage(
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
      new maps.Size(24, 35)
    );
    new maps.Marker({ map, position: center, image: myMarkerImg, title: "내 위치" });
  }

  function searchKeyword(lat: number, lng: number, keyword: string): Promise<Place[]> {
    if (!window.kakao?.maps) return Promise.resolve([]);
    const { maps } = window.kakao;
    const ps = new maps.services.Places();
    return new Promise<Place[]>((resolve) => {
      ps.keywordSearch(
        keyword,
        (data: Place[], st: string) => {
          resolve(st === maps.services.Status.OK ? data : []);
        },
        {
          location: new maps.LatLng(lat, lng),
          radius,
          sort: maps.services.SortBy.DISTANCE,
        }
      );
    });
  }

  async function doSearch(lat: number, lng: number, keywords: string[]): Promise<void> {
    const results = await Promise.all(keywords.map(kw => searchKeyword(lat, lng, kw)));
    const seen = new Set<string>();
    const merged: Place[] = [];
    for (const list of results) {
      for (const place of list) {
        if (!seen.has(place.id)) {
          seen.add(place.id);
          merged.push(place);
        }
      }
    }
    merged.sort((a, b) => parseInt(a.distance || "0") - parseInt(b.distance || "0"));
    const top = merged.slice(0, 15);
    setPlaces(top);
    addMarkers(top);
  }

  function doManualSearch(query: string) {
    if (!window.kakao?.maps || !query.trim()) return;
    const { maps } = window.kakao;
    const ps = new maps.services.Places();
    setIsSearching(true);
    setPlaces([]);
    ps.keywordSearch(query, (data: Place[], st: string) => {
      if (st === maps.services.Status.OK) {
        setPlaces(data.slice(0, 10));
        if (data[0] && mapRef.current) {
          const center = new maps.LatLng(parseFloat(data[0].y), parseFloat(data[0].x));
          mapRef.current.setCenter(center);
          addMarkers(data.slice(0, 10));
        }
      } else {
        setPlaces([]);
      }
      setIsSearching(false);
    });
  }

  function addMarkers(list: Place[]) {
    const { maps } = window.kakao;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    list.forEach((h) => {
      const pos = new maps.LatLng(parseFloat(h.y), parseFloat(h.x));
      const marker = new maps.Marker({ map: mapRef.current, position: pos, title: h.place_name });
      markersRef.current.push(marker);
      maps.event.addListener(marker, "click", () => {
        setSelectedId(h.id);
        mapRef.current.panTo(pos);
      });
    });
  }

  function focusPlace(h: Place) {
    setSelectedId(h.id);
    if (mapRef.current) {
      mapRef.current.panTo(new window.kakao.maps.LatLng(parseFloat(h.y), parseFloat(h.x)));
      mapRef.current.setLevel(3);
    }
  }

  const isLoading = ["loading-sdk", "loading-location", "loading-search"].includes(status);
  const loadingText =
    status === "loading-sdk" ? "지도 불러오는 중..." :
    status === "loading-location" ? "내 위치 확인 중..." :
    `주변 ${activeCategory} 검색 중...`;

  const activeCat = CATEGORIES.find(c => c.label === activeCategory);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100dvh-5rem)]">
        {/* Header */}
        <div className="px-5 pt-6 pb-3 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">주변 장소 찾기</h1>
              <p className="text-sm text-muted-foreground mt-0.5">반경 {radius / 1000}km 이내를 검색해요</p>
            </div>
            <button
              onClick={() => setShowDiag(v => !v)}
              title="진단 정보"
              className="mt-1 w-8 h-8 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors text-muted-foreground text-sm shrink-0"
            >
              🔍
            </button>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all duration-200 border",
                  activeCategory === cat.label
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-card text-foreground border-border/60 hover:border-primary/40"
                )}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Radius + Open Only Toggle */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex gap-1">
              {[1000, 3000, 5000].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold border transition-all",
                    radius === r
                      ? "bg-primary text-white border-primary"
                      : "bg-card text-muted-foreground border-border/50 hover:border-primary/30"
                  )}
                >
                  {r / 1000}km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnostic Panel */}
        {showDiag && (
          <div className="mx-4 mb-3 bg-gray-900 text-gray-100 rounded-2xl p-4 text-xs space-y-2 font-mono shrink-0">
            <p className="text-yellow-400 font-bold text-sm">🔍 진단 정보</p>
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <span className="text-gray-400 shrink-0">현재 도메인</span>
                <span className="text-green-400 break-all">{currentDomain}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0">API 키</span>
                <span className={apiKey ? "text-green-400" : "text-red-400"}>
                  {apiKey ? `✅ 설정됨 (${apiKey.slice(0, 8)}...)` : "❌ 없음"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0">SDK 로드</span>
                <span className={window.kakao?.maps ? "text-green-400" : "text-red-400"}>
                  {window.kakao?.maps ? "✅ 성공" : "❌ 실패 (도메인 미등록 또는 키 오류)"}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-2 text-gray-400 leading-relaxed">
              카카오 개발자 콘솔 → 내 애플리케이션 → 플랫폼 → Web 플랫폼 등록에서<br />
              <span className="text-yellow-300 break-all">{currentDomain}</span>
              <br />이 등록되어 있어야 합니다.
            </div>
          </div>
        )}

        {/* Map */}
        <div className="relative mx-4 rounded-2xl overflow-hidden shrink-0 shadow-md" style={{ height: 220 }}>
          <div ref={mapContainerRef} className="w-full h-full" />
          {(isLoading || isSearching) && (
            <div className="absolute inset-0 bg-secondary/80 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">
                {isSearching ? `주변 ${activeCategory} 검색 중...` : loadingText}
              </p>
            </div>
          )}
          {status === "error" && !isLoading && (
            <div className="absolute inset-0 bg-secondary/90 flex flex-col items-center justify-center gap-3 px-6 text-center">
              {locationDenied ? (
                <>
                  <span className="text-3xl">📍</span>
                  <p className="text-sm font-bold text-foreground">위치 접근이 필요해요</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    위치를 허용하거나, 직접 검색해보세요
                  </p>
                  <form
                    onSubmit={(e) => {
      e.preventDefault();
      // SDK는 이미 로드됨. 지도가 없으면 기본 좌표(서울 시청)로 초기화
      if (!mapRef.current && window.kakao?.maps && mapContainerRef.current) {
        initMap(37.5665, 126.9780);
      }
      setStatus("ready");
      doManualSearch(manualQuery);
    }}
                    className="flex gap-2 w-full max-w-xs"
                  >
                    <input
                      value={manualQuery}
                      onChange={(e) => setManualQuery(e.target.value)}
                      placeholder="예: 강남역 동물병원"
                      className="flex-1 h-9 px-3 rounded-xl border border-border/60 bg-white text-sm focus:outline-none focus:border-primary/50"
                    />
                    <button type="submit" className="h-9 px-3 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1">
                      <Search className="w-3.5 h-3.5" />검색
                    </button>
                  </form>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    위치 허용 후 새로고침
                  </button>
                </>
              ) : (
                <>
                  <span className="text-3xl">⚠️</span>
                  <p className="text-sm font-medium text-foreground whitespace-pre-line">{errorMsg}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.location.reload()}
                      className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-full hover:bg-primary/20 transition-colors"
                    >
                      다시 시도
                    </button>
                    <button
                      onClick={() => setShowDiag(v => !v)}
                      className="text-xs font-bold text-muted-foreground bg-muted/50 px-4 py-2 rounded-full hover:bg-muted transition-colors"
                    >
                      진단 정보
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>


        {/* Place List */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-2">
          {(isLoading || isSearching) && places.length === 0 && (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-secondary/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {status === "ready" && !isSearching && places.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-3">{activeCat?.emoji ?? "🔍"}</span>
              <p className="text-sm font-bold text-foreground">주변 {activeCategory}이(가) 없어요</p>
              <p className="text-xs text-muted-foreground mt-1">검색 반경을 넓혀보세요</p>
            </div>
          )}

          {places.map((h, i) => {
            const isSelected = selectedId === h.id;
            const distNum = Number(h.distance);
            const dist = h.distance
              ? distNum >= 1000
                ? (distNum / 1000).toFixed(1) + "km"
                : h.distance + "m"
              : "";
            return (
              <button
                key={h.id}
                onClick={() => focusPlace(h)}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 transition-all duration-200 flex items-start gap-3",
                  isSelected
                    ? "bg-primary/5 border-primary/40 shadow-sm shadow-primary/10"
                    : "bg-card border-border/50 hover:border-primary/30"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold",
                  isSelected ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                )}>
                  {isSelected ? activeCat?.emoji ?? "📍" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-foreground truncate">{h.place_name}</p>
                    {dist && (
                      <span className="shrink-0 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {dist}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {h.road_address_name || h.address_name}
                  </p>
                  {h.phone && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" />
                      {h.phone}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = toggleFavVet(h);
                      setFavIds(new Set(updated.map((f) => f.id)));
                    }}
                    className={cn(
                      "w-8 h-8 border rounded-xl flex items-center justify-center transition-colors",
                      favIds.has(h.id)
                        ? "bg-amber-50 border-amber-200 text-amber-500"
                        : "bg-secondary border-border/50 text-muted-foreground/40 hover:text-amber-400"
                    )}
                  >
                    <Star className={cn("w-3.5 h-3.5", favIds.has(h.id) && "fill-current")} />
                  </button>
                  {h.phone && (
                    <a
                      href={`tel:${h.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <a
                    href={`https://map.kakao.com/link/to/${encodeURIComponent(h.place_name)},${h.y},${h.x}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={h.place_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 hover:bg-yellow-100 transition-colors"
                    title="카카오맵에서 보기"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
