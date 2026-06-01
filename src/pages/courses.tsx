import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { MapPin, Clock, Users, Route, Zap, Navigation, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ───────────────────────────────────────
// 타입
// ───────────────────────────────────────

declare global {
  interface Window {
    kakao: any;
    __knockCourseSelect: (id: string) => void;
    __knockCourseClose: () => void;
    __knockEventClose: () => void;
    __knockScrollToEvent: (id: string) => void;
  }
}

interface Course {
  id: string;
  name: string;
  distance: string;
  minutes: number;
  difficulty: "쉬움" | "보통" | "어려움";
  startPoint: string;
  tags: string[];
  lat: number;
  lng: number;
}

interface ApiEvent {
  id: string;
  course_id: string | null;
  type: "regular" | "bungae";
  title: string;
  description: string;
  start_at: string;
  creator_name: string;
  lat: number;
  lng: number;
  max_participants: number | null;
  participant_count: number;
  isJoined: boolean;
  distKm?: number;
}

interface Toast {
  message: string;
  color: "green" | "gray" | "red";
}

// ───────────────────────────────────────
// 코스 데이터
// ───────────────────────────────────────

const COURSES: Course[] = [
  { id: "c1", name: "전주천 바람쐬는길", distance: "4km", minutes: 60, difficulty: "쉬움", startPoint: "전주자연생태관", tags: ["초보OK", "평지", "그늘"], lat: 35.811593, lng: 127.162588 },
  { id: "c2", name: "덕진공원 연꽃길", distance: "2km", minutes: 30, difficulty: "쉬움", startPoint: "덕진공원 정문", tags: ["초보OK", "포토스팟"], lat: 35.847488, lng: 127.121025 },
  { id: "c3", name: "완산칠봉 숲길", distance: "3km", minutes: 50, difficulty: "보통", startPoint: "완산공원 입구", tags: ["숲길", "오르막"], lat: 35.804624, lng: 127.141921 },
  { id: "c4", name: "삼천 하천길", distance: "5km", minutes: 80, difficulty: "쉬움", startPoint: "삼천교", tags: ["평지", "넓은길"], lat: 35.759004, lng: 127.122067 },
  { id: "c5", name: "한옥마을 외곽길", distance: "2.5km", minutes: 40, difficulty: "쉬움", startPoint: "전주한옥마을", tags: ["관광", "포토스팟"], lat: 35.814777, lng: 127.152557 },
];

const COURSE_MAP = Object.fromEntries(COURSES.map((c) => [c.id, c]));

// ───────────────────────────────────────
// 유틸
// ───────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtStartAt(iso: string): string {
  const d = new Date(iso);
  const mm = d.getMonth() + 1, dd = d.getDate();
  const day = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0"), min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd}(${day}) ${hh}:${min}`;
}

function getToken() {
  return localStorage.getItem("meongcare_token") || localStorage.getItem("knock_token") || "";
}

async function subscribePush(eventTitle: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const keyRes = await fetch("/api/vapid-public-key");
  const { publicKey } = await keyRes.json();
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/"));
    const key = new Uint8Array(raw.split("").map((c) => c.charCodeAt(0)));
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
  const token = getToken();
  const clientId = localStorage.getItem("meongcare_push_client_id") || crypto.randomUUID();
  localStorage.setItem("meongcare_push_client_id", clientId);
  await fetch("/api/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub.toJSON(), clientId }),
  });
  void eventTitle;
}

// ───────────────────────────────────────
// 카카오맵 유틸
// ───────────────────────────────────────

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

function buildCourseOverlay(course: Course, eventCount: number): string {
  const diffColor = course.difficulty === "쉬움" ? "#059669" : course.difficulty === "보통" ? "#d97706" : "#ef4444";
  return `<div style="background:#fff;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.13);padding:14px 16px 12px;min-width:200px;max-width:240px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;position:relative;">
    <button onclick="window.__knockCourseClose()" style="position:absolute;top:8px;right:10px;background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:0;">×</button>
    <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px;padding-right:20px;">${course.name}</p>
    <p style="font-size:11px;color:#6b7280;margin:0 0 8px;">📍 ${course.startPoint}</p>
    <div style="display:flex;gap:8px;margin-bottom:10px;">
      <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${diffColor}18;color:${diffColor};">${course.difficulty}</span>
      <span style="font-size:12px;font-weight:600;color:#374151;">${course.distance}</span>
    </div>
    ${eventCount > 0 ? `<p style="font-size:11px;color:#3b82f6;margin:0 0 8px;font-weight:600;">📅 예정 이벤트 ${eventCount}개</p>` : ""}
    <button onclick="window.__knockCourseSelect('${course.id}')" style="width:100%;padding:8px 0;background:#3b82f6;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;">이벤트 보기</button>
  </div>`;
}

function buildEventOverlay(event: ApiEvent, course: Course | null): string {
  const typeColor = event.type === "bungae" ? "#f97316" : "#3b82f6";
  const typeLabel = event.type === "bungae" ? "⚡ 번개" : "📅 정기";
  const countText = event.max_participants != null
    ? `${event.participant_count}/${event.max_participants}명`
    : `${event.participant_count}명`;
  return `<div style="background:#fff;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:14px 16px 12px;min-width:210px;max-width:250px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;position:relative;">
    <button onclick="window.__knockEventClose()" style="position:absolute;top:8px;right:10px;background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;padding:0;">×</button>
    <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;background:${typeColor}18;color:${typeColor};border:1px solid ${typeColor}40;">${typeLabel}</span>
    <p style="font-size:14px;font-weight:700;color:#111827;margin:6px 0 4px;padding-right:20px;line-height:1.3;">${event.title}</p>
    ${course ? `<p style="font-size:11px;color:#6b7280;margin:0 0 6px;">📍 ${course.startPoint}</p>` : ""}
    <p style="font-size:12px;color:#374151;margin:0 0 4px;">🕐 ${fmtStartAt(event.start_at)}</p>
    <p style="font-size:12px;color:#374151;margin:0 0 10px;">👥 ${countText} · by ${event.creator_name}</p>
    <button onclick="window.__knockScrollToEvent('${event.id}')" style="width:100%;padding:8px 0;background:${typeColor};color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;">참가 신청하기</button>
  </div>`;
}

function buildEventMarker(type: "regular" | "bungae"): string {
  const color = type === "bungae" ? "#f97316" : "#3b82f6";
  return `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;"></div>`;
}

// ───────────────────────────────────────
// 카운트다운 훅
// ───────────────────────────────────────

function useCountdown(iso: string) {
  const [text, setText] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(iso).getTime() - Date.now();
      if (diff <= 0) { setText("진행 중"); return; }
      const totalMin = Math.floor(diff / 60000);
      const h = Math.floor(totalMin / 60), m = totalMin % 60;
      if (totalMin < 60) setText(`${m}분 후`);
      else if (h < 24) setText(`${h}시간 ${m}분 후`);
      else setText(`${Math.floor(h / 24)}일 후`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [iso]);
  return text;
}

// ───────────────────────────────────────
// 서브 컴포넌트
// ───────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: Course["difficulty"] }) {
  const color = difficulty === "쉬움" ? "bg-emerald-50 text-emerald-600" : difficulty === "보통" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500";
  return <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", color)}>{difficulty}</span>;
}

function TagPill({ tag }: { tag: string }) {
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tag}</span>;
}

interface EventCardProps {
  event: ApiEvent;
  onToggle: (ev: ApiEvent) => void;
  onShowOnMap: (ev: ApiEvent) => void;
  showDist?: boolean;
}

function EventCard({ event, onToggle, onShowOnMap, showDist }: EventCardProps) {
  const countdown = useCountdown(event.start_at);
  const started = new Date(event.start_at) < new Date();
  const isFull = event.max_participants != null && event.participant_count >= event.max_participants;
  const course = event.course_id ? COURSE_MAP[event.course_id] : null;
  const disabled = (isFull && !event.isJoined) || started;

  return (
    <div
      id={`event-card-${event.id}`}
      className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3", disabled && "opacity-60")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {event.type === "bungae"
              ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-500 border border-orange-100">번개</span>
              : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-500 border border-blue-100">정기</span>
            }
            <p className="font-bold text-[15px] text-gray-900 leading-tight truncate">{event.title}</p>
          </div>
          {course && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0 text-blue-300" />
              {course.startPoint}
              {showDist && event.distKm != null && (
                <span className="ml-1 text-blue-400 font-medium">
                  {event.distKm < 1 ? `${Math.round(event.distKm * 1000)}m` : `${event.distKm.toFixed(1)}km`}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* 지도에서 보기 버튼 */}
          <button
            onClick={() => onShowOnMap(event)}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-50 px-2 py-1 rounded-lg active:scale-95 transition-all"
          >
            <MapPin className="w-3 h-3" />
            지도
          </button>
          {started
            ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-500">진행 중</span>
            : isFull
              ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">마감</span>
              : <span className="text-[12px] font-bold text-blue-500">{countdown}</span>
          }
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[12px] text-gray-500">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtStartAt(event.start_at)}</span>
          <span className="text-gray-200">|</span>
          <span className="text-[11px] text-gray-400">by {event.creator_name}</span>
        </div>
        <span className={cn("text-[12px] font-bold flex items-center gap-1", isFull ? "text-gray-400" : "text-blue-500")}>
          <Users className="w-3.5 h-3.5" />
          {event.participant_count}{event.max_participants != null ? `/${event.max_participants}명` : "명"}
        </span>
      </div>

      {event.description && (
        <p className="text-[12px] text-gray-500 leading-relaxed -mt-1">{event.description}</p>
      )}

      {!started && (
        <button
          onClick={() => !disabled && onToggle(event)}
          disabled={isFull && !event.isJoined}
          className={cn(
            "w-full py-2.5 rounded-xl text-[14px] font-bold transition-all",
            event.isJoined ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
              : isFull ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-500 text-white active:scale-[0.98] hover:bg-blue-600",
          )}
        >
          {event.isJoined ? "참가 취소" : isFull ? "마감됨" : "참가하기"}
        </button>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-[15px] text-gray-900">{course.name}</p>
        <DifficultyBadge difficulty={course.difficulty} />
      </div>
      <p className="text-xs text-gray-400 flex items-center gap-1 -mt-1">
        <MapPin className="w-3 h-3 shrink-0 text-blue-400" />{course.startPoint}
      </p>
      <div className="flex items-center gap-4 text-[13px] text-gray-600">
        <span className="flex items-center gap-1.5 font-semibold"><Route className="w-4 h-4 text-blue-400" />{course.distance}</span>
        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-300" />약 {course.minutes}분</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {course.tags.map((t) => <TagPill key={t} tag={t} />)}
      </div>
    </div>
  );
}

// ───────────────────────────────────────
// 번개 만들기 Bottom Sheet
// ───────────────────────────────────────

interface BungaeSheetProps {
  myLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onCreate: (ev: ApiEvent) => void;
  onToast: (msg: string, color: Toast["color"]) => void;
}

function BungaeSheet({ myLocation, onClose, onCreate, onToast }: BungaeSheetProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [maxP, setMaxP] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedCourse = courseId ? COURSE_MAP[courseId] : null;
  const lat = selectedCourse ? selectedCourse.lat : myLocation?.lat;
  const lng = selectedCourse ? selectedCourse.lng : myLocation?.lng;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { onToast("제목을 입력해주세요", "red"); return; }
    if (!dateStr || !timeStr) { onToast("날짜와 시간을 입력해주세요", "red"); return; }
    if (lat == null || lng == null) { onToast("출발 장소를 선택해주세요", "red"); return; }
    const startAt = new Date(`${dateStr}T${timeStr}`).toISOString();
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ courseId: courseId || null, title: title.trim(), description: desc.trim(), startAt, lat, lng, maxParticipants: maxP ? parseInt(maxP) : null }),
      });
      const data = await res.json();
      if (!res.ok) { onToast(data.error || "오류가 발생했어요", "red"); return; }
      onCreate(data.event);
      onToast("번개 모임이 등록됐어요!", "green");
      onClose();
    } catch { onToast("오류가 발생했어요", "red"); }
    finally { setLoading(false); }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl max-h-[88dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h2 className="text-[18px] font-extrabold text-gray-900">번개 모임 만들기</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[13px] font-semibold text-gray-600 mb-1.5 block">제목 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 덕진공원 저녁 산책 같이 가실 분!"
              className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-600 mb-1.5 block">출발 코스 (선택)</label>
            <select value={courseId} onChange={e => setCourseId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:border-blue-400 bg-white">
              <option value="">코스 없음 (직접 위치 사용)</option>
              {COURSES.map(c => <option key={c.id} value={c.id}>{c.name} — {c.startPoint}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[13px] font-semibold text-gray-600 mb-1.5 block">날짜 *</label>
              <input type="date" min={today} value={dateStr} onChange={e => setDateStr(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:border-blue-400" />
            </div>
            <div className="flex-1">
              <label className="text-[13px] font-semibold text-gray-600 mb-1.5 block">시간 *</label>
              <input type="time" value={timeStr} onChange={e => setTimeStr(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-600 mb-1.5 block">최대 인원 (선택)</label>
            <input type="number" min="2" max="50" value={maxP} onChange={e => setMaxP(e.target.value)} placeholder="제한 없음"
              className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-gray-600 mb-1.5 block">한마디 (선택)</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="예: 소형견 환영, 천천히 걷는 코스예요" rows={2}
              className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-12 rounded-xl bg-orange-500 text-white font-bold text-[15px] hover:bg-orange-600 disabled:opacity-50 transition-all active:scale-[0.98]">
            {loading ? "등록 중..." : "번개 모임 등록하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────────────────────
// 메인 페이지
// ───────────────────────────────────────

export default function CoursesPage() {
  const [allEvents, setAllEvents] = useState<ApiEvent[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<ApiEvent[] | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBungae, setShowBungae] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "nearby">("all");
  const [mapReady, setMapReady] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const activeOverlayRef = useRef<any>(null);
  const eventMarkersRef = useRef<any[]>([]);
  const eventSectionRef = useRef<HTMLDivElement>(null);
  const courseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function showToast(message: string, color: Toast["color"]) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, color });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/events", { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setAllEvents(data.events || []);
    } catch { setAllEvents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // 지도에서 이벤트 표시
  function showEventOnMap(event: ApiEvent) {
    if (!mapRef.current || !window.kakao) return;
    const { maps } = window.kakao;
    const pos = new maps.LatLng(event.lat, event.lng);

    // 이전 오버레이 닫기
    if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }

    // 지도 이동
    mapRef.current.setCenter(pos);
    mapRef.current.setLevel(4);

    // 이벤트 오버레이 표시
    const course = event.course_id ? COURSE_MAP[event.course_id] : null;
    const overlay = new maps.CustomOverlay({
      map: mapRef.current,
      position: pos,
      content: buildEventOverlay(event, course),
      yAnchor: 1.4,
    });
    activeOverlayRef.current = overlay;

    // 지도 섹션으로 스크롤
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function requestNearby() {
    if (!navigator.geolocation) { showToast("이 기기는 위치 서비스를 지원하지 않아요", "red"); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        try {
          const res = await fetch(`/api/events?lat=${loc.lat}&lng=${loc.lng}&radius=5`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const data = await res.json();
          setNearbyEvents(data.events || []);
          setActiveTab("nearby");
          if (mapRef.current) {
            const { maps } = window.kakao;
            mapRef.current.setCenter(new maps.LatLng(loc.lat, loc.lng));
            mapRef.current.setLevel(6);
          }
        } catch { showToast("이벤트를 불러오지 못했어요", "red"); }
        setLocationLoading(false);
      },
      () => { showToast("위치 권한을 허용해주세요", "red"); setLocationLoading(false); },
    );
  }

  async function toggleJoin(event: ApiEvent) {
    const token = getToken();
    if (!token) { showToast("로그인이 필요해요", "red"); return; }
    try {
      if (event.isJoined) {
        await fetch(`/api/events/${event.id}/join`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        showToast("참가를 취소했어요", "gray");
      } else {
        const res = await fetch(`/api/events/${event.id}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { const d = await res.json(); showToast(d.error || "오류가 발생했어요", "red"); return; }
        subscribePush(event.title).catch(() => {});
        showToast(`${event.title} 참가 완료! 당일 알림을 드릴게요`, "green");
      }
      await fetchEvents();
      if (nearbyEvents && myLocation) {
        const res2 = await fetch(`/api/events?lat=${myLocation.lat}&lng=${myLocation.lng}&radius=5`, { headers: { Authorization: `Bearer ${token}` } });
        const d2 = await res2.json();
        setNearbyEvents(d2.events || []);
      }
    } catch { showToast("오류가 발생했어요", "red"); }
  }

  // 지도 초기화 (최초 1회)
  useEffect(() => {
    let cancelled = false;

    window.__knockCourseClose = () => {
      if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }
    };
    window.__knockEventClose = () => {
      if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }
    };
    window.__knockScrollToEvent = (id: string) => {
      if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }
      const el = document.getElementById(`event-card-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.__knockCourseSelect = (id: string) => {
      if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }
      const el = courseRefs.current[id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      else eventSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    async function initMap() {
      try {
        await waitForKakao();
        if (cancelled || !mapContainerRef.current) return;
        const { maps } = window.kakao;
        const center = new maps.LatLng(35.8075, 127.14);
        const map = new maps.Map(mapContainerRef.current, { center, level: 7 });
        mapRef.current = map;

        COURSES.forEach((course) => {
          const pos = new maps.LatLng(course.lat, course.lng);
          const marker = new maps.Marker({ map, position: pos, title: course.name });
          maps.event.addListener(marker, "click", () => {
            if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }
            const eventCount = (allEventsRef.current || []).filter(e => e.course_id === course.id).length;
            const overlay = new maps.CustomOverlay({ map, position: pos, content: buildCourseOverlay(course, eventCount), yAnchor: 1.3 });
            activeOverlayRef.current = overlay;
          });
        });

        maps.event.addListener(map, "click", () => {
          if (activeOverlayRef.current) { activeOverlayRef.current.setMap(null); activeOverlayRef.current = null; }
        });

        if (!cancelled) setMapReady(true);
      } catch { /* 지도 없이도 동작 */ }
    }
    initMap();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // allEvents ref (지도 클릭 핸들러에서 최신값 참조)
  const allEventsRef = useRef(allEvents);
  useEffect(() => { allEventsRef.current = allEvents; }, [allEvents]);

  // 이벤트 마커 업데이트 (allEvents 변경 시)
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao) return;
    const { maps } = window.kakao;

    // 기존 이벤트 마커 제거
    eventMarkersRef.current.forEach(m => m.setMap(null));
    eventMarkersRef.current = [];

    allEvents.forEach((event) => {
      const pos = new maps.LatLng(event.lat, event.lng);
      const markerOverlay = new maps.CustomOverlay({
        map: mapRef.current,
        position: pos,
        content: buildEventMarker(event.type),
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 5,
      });

      // 마커 클릭 이벤트는 CustomOverlay에서 DOM 이벤트로 처리
      const markerEl = markerOverlay.getContent ? null : null;
      void markerEl;

      // 클릭 가능하도록 마커 위에 클릭 오버레이
      const clickOverlay = new maps.CustomOverlay({
        map: mapRef.current,
        position: pos,
        content: `<div onclick="window.__knockShowEvent('${event.id}')" style="width:24px;height:24px;cursor:pointer;background:transparent;"></div>`,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 6,
      });

      eventMarkersRef.current.push(markerOverlay, clickOverlay);
    });

    // 이벤트 클릭 글로벌 핸들러
    (window as any).__knockShowEvent = (id: string) => {
      const event = allEventsRef.current.find(e => e.id === id);
      if (event) showEventOnMap(event);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, mapReady]);

  const displayEvents = activeTab === "nearby" && nearbyEvents !== null ? nearbyEvents : allEvents;
  const upcomingEvents = displayEvents.filter(e => new Date(e.start_at) > new Date(Date.now() - 3600 * 1000));

  return (
    <Layout>
      {/* 토스트 */}
      {toast && (
        <div className={cn(
          "fixed bottom-24 left-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold text-center",
          toast.color === "green" ? "bg-emerald-500 text-white" : toast.color === "red" ? "bg-red-500 text-white" : "bg-gray-600 text-white",
        )}>
          {toast.message}
        </div>
      )}

      {showBungae && (
        <BungaeSheet
          myLocation={myLocation}
          onClose={() => setShowBungae(false)}
          onCreate={(ev) => setAllEvents(prev => [ev, ...prev])}
          onToast={showToast}
        />
      )}

      <div className="px-4 pt-5 pb-28 space-y-7">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">전주 산책 코스</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">강아지와 함께하는 전주 추천 코스</p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-500 border border-blue-100">전주 · 베타</span>
        </div>

        {/* 지도 범례 */}
        <div ref={mapSectionRef} className="space-y-2">
          <div className="relative w-full h-[240px] rounded-2xl overflow-hidden shadow-md">
            <div ref={mapContainerRef} className="w-full h-full" />
            {!mapReady && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <p className="text-xs text-gray-400">지도 불러오는 중...</p>
              </div>
            )}
          </div>
          {mapReady && (
            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                정기 이벤트
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                번개 모임
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">마커 탭 → 상세 보기</div>
            </div>
          )}
        </div>

        {/* 이벤트 섹션 */}
        <section ref={eventSectionRef} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-gray-800">산책 이벤트</h2>
            <button
              onClick={() => setShowBungae(true)}
              className="flex items-center gap-1.5 text-[12px] font-bold text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl active:scale-[0.97] transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              번개 만들기
            </button>
          </div>

          {/* 탭 */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className={cn("flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all", activeTab === "all" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500")}
            >
              전체 이벤트
            </button>
            <button
              onClick={() => { if (nearbyEvents === null) requestNearby(); else setActiveTab("nearby"); }}
              disabled={locationLoading}
              className={cn("flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all", activeTab === "nearby" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500")}
            >
              <Navigation className="w-3.5 h-3.5" />
              {locationLoading ? "확인 중..." : "내 주변"}
            </button>
          </div>

          {/* 이벤트 목록 */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-2">
              <p className="text-gray-400 text-sm">{activeTab === "nearby" ? "반경 5km 내 이벤트가 없어요" : "예정된 이벤트가 없어요"}</p>
              <p className="text-gray-300 text-xs">번개 모임을 직접 만들어보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <div key={ev.id} ref={(el) => { if (ev.course_id) courseRefs.current[ev.course_id] = el; }}>
                  <EventCard event={ev} onToggle={toggleJoin} onShowOnMap={showEventOnMap} showDist={activeTab === "nearby"} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 코스 목록 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-extrabold text-gray-800">코스 목록</h2>
            <span className="text-[12px] text-gray-400">{COURSES.length}개</span>
          </div>
          <div className="space-y-3">
            {COURSES.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        </section>
      </div>

      {/* 번개 FAB */}
      <button
        onClick={() => setShowBungae(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-orange-500 text-white shadow-xl flex items-center justify-center active:scale-95 transition-all hover:bg-orange-600"
      >
        <Zap className="w-6 h-6" />
      </button>
    </Layout>
  );
}
