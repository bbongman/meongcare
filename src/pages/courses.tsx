import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { MapPin, Clock, ChevronRight, Users, Route, TreePine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ───────────────────────────────────────
// 데이터 정의
// ───────────────────────────────────────

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

interface WalkEvent {
  id: string;
  courseId: string;
  title: string;
  date: string;
  time: string;
  currentParticipants: number;
  maxParticipants: number;
  status: "open" | "full" | "completed";
  host: string;
}

const COURSES: Course[] = [
  {
    id: "c1",
    name: "전주천 바람쐬는길",
    distance: "4km",
    minutes: 60,
    difficulty: "쉬움",
    startPoint: "전주자연생태박물관",
    tags: ["초보OK", "평지", "그늘"],
    lat: 35.8219,
    lng: 127.1089,
  },
  {
    id: "c2",
    name: "덕진공원 연꽃길",
    distance: "2km",
    minutes: 30,
    difficulty: "쉬움",
    startPoint: "덕진공원 정문",
    tags: ["초보OK", "포토스팟"],
    lat: 35.8489,
    lng: 127.1311,
  },
  {
    id: "c3",
    name: "완산칠봉 숲길",
    distance: "3km",
    minutes: 50,
    difficulty: "보통",
    startPoint: "완산공원 입구",
    tags: ["숲길", "오르막"],
    lat: 35.8073,
    lng: 127.12,
  },
  {
    id: "c4",
    name: "삼천 하천길",
    distance: "5km",
    minutes: 80,
    difficulty: "쉬움",
    startPoint: "삼천교",
    tags: ["평지", "넓은길"],
    lat: 35.815,
    lng: 127.105,
  },
  {
    id: "c5",
    name: "한옥마을 외곽길",
    distance: "2.5km",
    minutes: 40,
    difficulty: "쉬움",
    startPoint: "전주한옥마을 남문",
    tags: ["관광", "포토스팟"],
    lat: 35.815,
    lng: 127.153,
  },
];

const TODAY = new Date();
const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;

const INITIAL_EVENTS: WalkEvent[] = [
  {
    id: "e1",
    courseId: "c1",
    title: "전주천 아침 산책",
    date: fmt(TODAY),
    time: "07:30",
    currentParticipants: 2,
    maxParticipants: 5,
    status: "open",
    host: "산책왕멍멍",
  },
  {
    id: "e2",
    courseId: "c2",
    title: "덕진공원 연꽃 구경",
    date: fmt(TODAY),
    time: "10:00",
    currentParticipants: 4,
    maxParticipants: 4,
    status: "full",
    host: "덕진동댕댕",
  },
  {
    id: "e3",
    courseId: "c4",
    title: "삼천 저녁 산책 모임",
    date: fmt(TODAY),
    time: "18:30",
    currentParticipants: 1,
    maxParticipants: 6,
    status: "open",
    host: "왈왈대장",
  },
  {
    id: "e4",
    courseId: "c5",
    title: "한옥마을 포토 산책",
    date: fmt(TODAY),
    time: "14:00",
    currentParticipants: 3,
    maxParticipants: 3,
    status: "full",
    host: "인스타독",
  },
];

const LS_KEY = "knock_event_joined";

function loadJoined(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveJoined(joined: Record<string, boolean>) {
  localStorage.setItem(LS_KEY, JSON.stringify(joined));
}

// ───────────────────────────────────────
// 서브 컴포넌트
// ───────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: Course["difficulty"] }) {
  const color =
    difficulty === "쉬움"
      ? "bg-emerald-50 text-emerald-600"
      : difficulty === "보통"
        ? "bg-amber-50 text-amber-600"
        : "bg-red-50 text-red-500";
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", color)}>
      {difficulty}
    </span>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      {tag}
    </span>
  );
}

interface EventCardProps {
  event: WalkEvent;
  course: Course | undefined;
  joined: boolean;
  onToggle: (id: string) => void;
}

function EventCard({ event, course, joined, onToggle }: EventCardProps) {
  const isFull = event.status === "full";
  const isCompleted = event.status === "completed";
  const disabled = (isFull && !joined) || isCompleted;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3",
        disabled && "opacity-60",
      )}
    >
      {/* 상단 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-gray-900 leading-tight truncate">
            {event.title}
          </p>
          {course && (
            <p className="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {course.startPoint}
            </p>
          )}
        </div>

        {/* 상태 뱃지 */}
        {isFull && (
          <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
            마감
          </span>
        )}
        {isCompleted && (
          <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
            종료
          </span>
        )}
      </div>

      {/* 날짜·시간 + 인원 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[13px] text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {event.date} {event.time}
          </span>
          <span className="text-gray-200">|</span>
          <span className="text-[11px] text-gray-400">by {event.host}</span>
        </div>

        {/* 인원 pill */}
        <span
          className={cn(
            "text-[13px] font-bold px-3 py-1 rounded-full flex items-center gap-1",
            isFull
              ? "bg-gray-100 text-gray-400"
              : "bg-blue-50 text-blue-500",
          )}
        >
          <Users className="w-3.5 h-3.5" />
          {event.currentParticipants}/{event.maxParticipants}명
        </span>
      </div>

      {/* 버튼 */}
      {!isCompleted && (
        <button
          onClick={() => !disabled && onToggle(event.id)}
          disabled={disabled && !joined}
          className={cn(
            "w-full py-2.5 rounded-xl text-[14px] font-bold transition-all",
            joined
              ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
              : isFull
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white active:scale-[0.98] hover:bg-blue-600",
          )}
        >
          {joined ? "참가 취소" : isFull ? "마감됨" : "참가하기"}
        </button>
      )}
    </div>
  );
}

interface CourseCardProps {
  course: Course;
}

function CourseCard({ course }: CourseCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      {/* 제목 + 난이도 */}
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-[15px] text-gray-900">{course.name}</p>
        <DifficultyBadge difficulty={course.difficulty} />
      </div>

      {/* 출발 */}
      <p className="text-xs text-gray-400 flex items-center gap-1 -mt-1">
        <MapPin className="w-3 h-3 shrink-0 text-blue-400" />
        {course.startPoint}
      </p>

      {/* 거리·시간 */}
      <div className="flex items-center gap-4 text-[13px] text-gray-600">
        <span className="flex items-center gap-1.5 font-semibold">
          <Route className="w-4 h-4 text-blue-400" />
          {course.distance}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-300" />
          약 {course.minutes}분
        </span>
      </div>

      {/* 태그 */}
      <div className="flex flex-wrap gap-1.5">
        {course.tags.map((t) => (
          <TagPill key={t} tag={t} />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────
// 메인 페이지
// ───────────────────────────────────────

export default function CoursesPage() {
  const [events, setEvents] = useState<WalkEvent[]>(INITIAL_EVENTS);
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setJoined(loadJoined());
  }, []);

  function toggleJoin(eventId: string) {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    const isJoined = joined[eventId];
    const newJoined = { ...joined, [eventId]: !isJoined };

    // 낙관적 업데이트
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        const delta = isJoined ? -1 : 1;
        const next = { ...e, currentParticipants: e.currentParticipants + delta };
        next.status = next.currentParticipants >= next.maxParticipants ? "full" : "open";
        return next;
      }),
    );

    setJoined(newJoined);
    saveJoined(newJoined);
  }

  const todayEvents = events.filter((e) => e.status !== "completed");
  const courseMap = Object.fromEntries(COURSES.map((c) => [c.id, c]));

  return (
    <Layout>
      <div className="px-4 pt-5 pb-4 space-y-7">
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">
              전주 산책 코스
            </h1>
            <p className="text-[13px] text-gray-400 mt-0.5">강아지와 함께하는 전주 추천 코스</p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-500 border border-blue-100">
            전주 · 베타
          </span>
        </div>

        {/* ── 오늘의 이벤트 ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-gray-800">오늘의 이벤트</h2>
            <span className="text-[12px] text-gray-400">{fmt(TODAY)}</span>
          </div>

          {todayEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-gray-400 text-sm">
              오늘 예정된 이벤트가 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  course={courseMap[ev.courseId]}
                  joined={!!joined[ev.id]}
                  onToggle={toggleJoin}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── 코스 목록 ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-extrabold text-gray-800">코스 목록</h2>
            <span className="text-[12px] text-gray-400">{COURSES.length}개</span>
          </div>

          <div className="space-y-3">
            {COURSES.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
