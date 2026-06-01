import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Map, Route, ChevronRight, Heart, MessageCircle, PawPrint, Plus, X, List, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

// ───────────────────────────────────────
// 타입
// ───────────────────────────────────────

declare global {
  interface Window {
    kakao: any;
    __knockPostClose: () => void;
  }
}

interface Post {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  like_count: number;
  isLiked: boolean;
  distKm?: number;
}

// ───────────────────────────────────────
// 유틸
// ───────────────────────────────────────

function getToken() {
  return localStorage.getItem("meongcare_token") || localStorage.getItem("knock_token") || "";
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function waitForKakao(timeout = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) { resolve(); return; }
    const start = Date.now();
    const iv = setInterval(() => {
      if (window.kakao && window.kakao.maps) { clearInterval(iv); resolve(); }
      else if (Date.now() - start > timeout) { clearInterval(iv); reject(); }
    }, 100);
  });
}

function buildPostOverlay(post: Post): string {
  const preview = post.content.length > 60 ? post.content.slice(0, 60) + "..." : post.content;
  return `<div style="background:#fff;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:13px 15px 12px;max-width:240px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;position:relative;">
    <button onclick="window.__knockPostClose()" style="position:absolute;top:7px;right:9px;background:none;border:none;cursor:pointer;font-size:15px;color:#9ca3af;padding:0;">×</button>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;">
      <div style="width:22px;height:22px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:11px;">🐾</span>
      </div>
      <span style="font-size:12px;font-weight:700;color:#1f2937;">${post.user_name}</span>
      <span style="font-size:11px;color:#9ca3af;">${timeAgo(post.created_at)}</span>
    </div>
    <p style="font-size:13px;color:#374151;line-height:1.5;margin:0 0 9px;">${preview}</p>
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:12px;color:#ef4444;">♥ ${post.like_count}</span>
    </div>
  </div>`;
}

// ───────────────────────────────────────
// 게시글 카드
// ───────────────────────────────────────

function PostCard({ post, onLike, onDelete, currentUserId }: {
  post: Post;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
          <PawPrint size={15} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800">{post.user_name}</span>
          <span className="text-xs text-gray-400 ml-2">{timeAgo(post.created_at)}</span>
        </div>
        {post.lat != null && (
          <MapPin size={13} className="text-blue-300 flex-shrink-0" />
        )}
        {currentUserId && post.user_id === currentUserId && (
          <button onClick={() => onDelete(post.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-3">{post.content}</p>
      <div className="flex items-center gap-4">
        <button onClick={() => onLike(post.id)} className="flex items-center gap-1.5 active:scale-95 transition-transform">
          <Heart size={16} className={post.isLiked ? "text-red-500 fill-red-500" : "text-gray-300"} />
          <span className={cn("text-xs font-medium", post.isLiked ? "text-red-500" : "text-gray-400")}>{post.like_count}</span>
        </button>
        <button className="flex items-center gap-1.5 active:scale-95 transition-transform">
          <MessageCircle size={16} className="text-gray-300" />
          <span className="text-xs font-medium text-gray-400">0</span>
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────
// 메인
// ───────────────────────="────────────────

const MOCK_NOTIFICATIONS = [
  { id: 1, text: "산책왕멍멍님이 [전주천 아침 산책]에 참가했어요", time: "5분 전" },
  { id: 2, text: "덕진공원 이벤트가 내일 오전 10시에 시작해요", time: "1시간 전" },
  { id: 3, text: "초코가 근처에 있어요! 인사를 건네볼까요?", time: "2시간 전" },
];

export default function CommunityPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [viewMode, setViewMode] = useState<"feed" | "map">("feed");
  const [mapReady, setMapReady] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [nearbyPosts, setNearbyPosts] = useState<Post[] | null>(null);

  const [writeOpen, setWriteOpen] = useState(false);
  const [writeContent, setWriteContent] = useState("");
  const [attachLocation, setAttachLocation] = useState(false);
  const [writeLocation, setWriteLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [notiOpen, setNotiOpen] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const activeOverlayRef = useRef<any>(null);
  const postMarkersRef = useRef<any[]>([]);

  // ── 게시글 불러오기 ──
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts", { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch { setPosts([]); }
    finally { setLoadingPosts(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // 알림 외부 클릭 닫기
  useEffect(() => {
    if (!notiOpen) return;
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) setNotiOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notiOpen]);

  // ── 좋아요 ──
  async function handleLike(postId: string) {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: data.liked, like_count: data.likeCount } : p));
    } catch {}
  }

  // ── 게시글 삭제 ──
  async function handleDelete(postId: string) {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/posts/${postId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch {}
  }

  // ── 글쓰기 위치 첨부 ──
  function toggleAttachLocation() {
    if (attachLocation) {
      setAttachLocation(false);
      setWriteLocation(null);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWriteLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAttachLocation(true);
      },
      () => {},
    );
  }

  // ── 게시글 작성 ──
  async function handlePost() {
    const trimmed = writeContent.trim();
    if (!trimmed) return;
    const token = getToken();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: trimmed, lat: writeLocation?.lat ?? null, lng: writeLocation?.lng ?? null }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(prev => [data.post, ...prev]);
        setWriteContent("");
        setWriteOpen(false);
        setAttachLocation(false);
        setWriteLocation(null);
      }
    } catch {}
    finally { setSubmitting(false); }
  }

  // ── 내 주변 게시글 (지도뷰에서 사용) ──
  async function requestNearbyPosts(loc: { lat: number; lng: number }) {
    const res = await fetch(`/api/posts?lat=${loc.lat}&lng=${loc.lng}&radius=3`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    setNearbyPosts(data.posts || []);
    return data.posts as Post[];
  }

  // ── 지도 뷰 전환 ──
  async function switchToMap() {
    setViewMode("map");
    if (!navigator.geolocation) {
      initMapWithPosts(posts, null);
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        const nearby = await requestNearbyPosts(loc).catch(() => posts.filter(p => p.lat != null));
        initMapWithPosts(nearby, loc);
        setLocationLoading(false);
      },
      () => {
        initMapWithPosts(posts.filter(p => p.lat != null), null);
        setLocationLoading(false);
      },
    );
  }

  // ── 지도 초기화 + 마커 ──
  async function initMapWithPosts(postsToShow: Post[], center: { lat: number; lng: number } | null) {
    try {
      await waitForKakao();
      if (!mapContainerRef.current) return;
      const { maps } = window.kakao;

      const centerLatLng = center
        ? new maps.LatLng(center.lat, center.lng)
        : new maps.LatLng(35.8075, 127.14);

      if (mapRef.current) {
        mapRef.current.setCenter(centerLatLng);
        mapRef.current.setLevel(center ? 5 : 7);
      } else {
        mapRef.current = new maps.Map(mapContainerRef.current, { center: centerLatLng, level: center ? 5 : 7 });
      }

      window.__knockPostClose = () => {
        if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }
      };

      maps.event.addListener(mapRef.current, "click", () => {
        if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }
      });

      // 기존 마커 제거
      postMarkersRef.current.forEach(m => m.setMap(null));
      postMarkersRef.current = [];

      // 내 위치 마커
      if (center) {
        const myMarker = new maps.CustomOverlay({
          map: mapRef.current,
          position: new maps.LatLng(center.lat, center.lng),
          content: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.3);"></div>`,
          yAnchor: 0.5, xAnchor: 0.5, zIndex: 10,
        });
        postMarkersRef.current.push(myMarker);
      }

      // 게시글 마커
      postsToShow.forEach((post) => {
        if (post.lat == null || post.lng == null) return;
        const pos = new maps.LatLng(post.lat, post.lng);

        const dot = new maps.CustomOverlay({
          map: mapRef.current,
          position: pos,
          content: `<div style="width:12px;height:12px;border-radius:50%;background:#f97316;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);cursor:pointer;" onclick="window.__knockShowPost('${post.id}')"></div>`,
          yAnchor: 0.5, xAnchor: 0.5, zIndex: 5,
        });
        postMarkersRef.current.push(dot);
      });

      // 게시글 클릭 글로벌 핸들러
      const postsMap = Object.fromEntries(postsToShow.map(p => [p.id, p]));
      (window as any).__knockShowPost = (id: string) => {
        const post = postsMap[id];
        if (!post || post.lat == null || post.lng == null) return;
        if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }
        const overlay = new maps.CustomOverlay({
          map: mapRef.current,
          position: new maps.LatLng(post.lat, post.lng),
          content: buildPostOverlay(post),
          yAnchor: 1.35,
        });
        activeOverlayRef.current = overlay;
      };

      setMapReady(true);
    } catch {}
  }

  // 지도→피드 전환 시 정리
  function switchToFeed() {
    setViewMode("feed");
    setNearbyPosts(null);
  }

  const displayPosts = viewMode === "map" && nearbyPosts !== null ? nearbyPosts : posts;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-28">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-xl text-gray-900 tracking-tight">노크</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium">전주 덕진구</span>

            {/* 뷰 전환 */}
            <div className="flex bg-gray-100 rounded-xl p-0.5">
              <button
                onClick={switchToFeed}
                className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all", viewMode === "feed" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400")}
              >
                <List size={13} />
                피드
              </button>
              <button
                onClick={() => viewMode !== "map" && switchToMap()}
                className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all", viewMode === "map" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400")}
              >
                <Map size={13} />
                지도
              </button>
            </div>

            {/* 알림 */}
            <div className="relative" ref={notiRef}>
              <button className="relative p-1" onClick={() => setNotiOpen(v => !v)}>
                <Bell size={22} className="text-gray-500" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
              </button>
              <div className={cn(
                "absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 origin-top",
                notiOpen ? "opacity-100 scale-y-100 translate-y-0" : "opacity-0 scale-y-95 -translate-y-2 pointer-events-none",
              )}>
                <div className="px-4 py-3 border-b border-gray-50">
                  <span className="text-sm font-semibold text-gray-800">알림</span>
                </div>
                {MOCK_NOTIFICATIONS.map(n => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <span className="mt-1.5 w-2 h-2 flex-shrink-0 rounded-full bg-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{n.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 지도 뷰 ── */}
        {viewMode === "map" && (
          <div className="flex flex-col">
            {/* 지도 */}
            <div className="relative w-full" style={{ height: "55dvh" }}>
              <div ref={mapContainerRef} className="w-full h-full" />
              {(!mapReady || locationLoading) && (
                <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center gap-2">
                  <Navigation size={20} className="text-blue-400 animate-pulse" />
                  <p className="text-xs text-gray-400">{locationLoading ? "내 위치 확인 중..." : "지도 불러오는 중..."}</p>
                </div>
              )}
              {mapReady && (
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white" />
                  <span className="text-[11px] text-gray-500 font-medium">동네 게시글</span>
                  <span className="text-[11px] text-gray-400">탭하면 내용 보기</span>
                </div>
              )}
            </div>

            {/* 지도 아래 게시글 목록 */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-bold text-gray-700">
                  {nearbyPosts !== null ? `내 주변 게시글 ${nearbyPosts.length}개` : "게시글"}
                </p>
                {myLocation && (
                  <span className="text-[11px] text-blue-400 flex items-center gap-1">
                    <Navigation size={11} />반경 3km
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl mx-4 border border-gray-100 divide-y divide-gray-50">
              {displayPosts.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  {nearbyPosts !== null ? "반경 3km 내 게시글이 없어요" : "게시글이 없어요"}
                </div>
              ) : (
                displayPosts.map(post => (
                  <PostCard key={post.id} post={post} onLike={handleLike} onDelete={handleDelete} currentUserId={user?.id} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── 피드 뷰 ── */}
        {viewMode === "feed" && (
          <div className="px-5 pt-5 space-y-4">
            {/* 빠른 액션 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/walk")}
                className="flex items-center justify-center gap-2 bg-blue-500 text-white font-semibold text-sm py-4 rounded-2xl shadow-sm active:scale-95 transition-transform"
              >
                <Map size={18} />지금 산책 중
              </button>
              <button
                onClick={() => navigate("/courses")}
                className="flex items-center justify-center gap-2 bg-white text-blue-500 font-semibold text-sm py-4 rounded-2xl border border-blue-200 active:scale-95 transition-transform"
              >
                <Route size={18} />코스 참가하기
              </button>
            </div>

            {/* 이벤트 배너 */}
            <button
              onClick={() => navigate("/courses")}
              className="w-full flex items-center justify-between bg-blue-500 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform"
            >
              <div>
                <p className="text-xs text-blue-100 font-medium mb-0.5">오늘의 이벤트</p>
                <p className="text-sm text-white font-semibold">덕진공원 코스 이벤트 · 3/5명 참가 중</p>
              </div>
              <ChevronRight size={18} className="text-blue-200 flex-shrink-0" />
            </button>

            {/* 동네 피드 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">동네 피드</p>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {loadingPosts ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">불러오는 중...</div>
                ) : posts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">첫 게시글을 작성해보세요!</div>
                ) : (
                  posts.map(post => (
                    <PostCard key={post.id} post={post} onLike={handleLike} onDelete={handleDelete} currentUserId={user?.id} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 글쓰기 FAB */}
      <button
        className="fixed right-5 bottom-24 w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-20"
        onClick={() => setWriteOpen(true)}
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* 글쓰기 오버레이 */}
      <div
        className={cn("fixed inset-0 z-30 transition-opacity duration-300", writeOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={() => setWriteOpen(false)}
      />

      {/* 글쓰기 시트 */}
      <div className={cn("fixed left-0 right-0 bottom-0 z-40 bg-white rounded-t-3xl px-5 pt-5 pb-10 transition-transform duration-300", writeOpen ? "translate-y-0" : "translate-y-full")}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-bold text-gray-900">글쓰기</span>
          <button onClick={() => setWriteOpen(false)} className="p-1 text-gray-400 active:scale-95 transition-transform">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
            <PawPrint size={13} className="text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-gray-700">{user?.name ?? "익명"}</span>
        </div>

        <textarea
          className="w-full h-32 resize-none text-sm text-gray-800 placeholder-gray-300 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-300 transition-colors"
          placeholder="동네 이웃에게 공유할 이야기를 적어주세요"
          value={writeContent}
          onChange={e => setWriteContent(e.target.value)}
        />

        {/* 위치 첨부 토글 */}
        <button
          onClick={toggleAttachLocation}
          className={cn(
            "mt-2 flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all",
            attachLocation ? "bg-blue-50 text-blue-500 border border-blue-200" : "bg-gray-100 text-gray-400",
          )}
        >
          <MapPin size={13} />
          {attachLocation ? "위치 첨부됨 (지도에 표시)" : "위치 첨부하기"}
        </button>

        <button
          onClick={handlePost}
          disabled={!writeContent.trim() || submitting}
          className="mt-3 w-full py-3.5 bg-blue-500 disabled:bg-gray-200 text-white disabled:text-gray-400 font-semibold text-sm rounded-2xl transition-colors active:scale-95"
        >
          {submitting ? "등록 중..." : "게시하기"}
        </button>
      </div>
    </Layout>
  );
}
