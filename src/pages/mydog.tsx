import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  HeartPulse,
  Syringe,
  BarChart2,
  BookOpen,
  CalendarClock,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";

interface DogProfile {
  name: string;
  breed: string;
  age: string;
  tags: string[];
  photo?: string;
}

function loadDogProfile(): DogProfile | null {
  try {
    // 멍케어 기존 강아지 데이터 키 시도
    const raw =
      localStorage.getItem("meongcare_dog") ||
      localStorage.getItem("knock_dog") ||
      null;
    if (raw) return JSON.parse(raw);
  } catch {
    // 파싱 실패 시 fallback
  }
  return null;
}

const MENU_SECTIONS = [
  {
    title: "건강",
    items: [
      {
        id: "health",
        label: "건강 기록",
        desc: "검진 · 예방약 · AI 문진",
        icon: HeartPulse,
        href: "/health",
        color: "text-rose-500",
        bg: "bg-rose-50",
      },
      {
        id: "vaccine",
        label: "예방접종 일정",
        desc: "접종 D-day 알림",
        icon: Syringe,
        href: "/health?tab=vaccine",
        color: "text-purple-500",
        bg: "bg-purple-50",
      },
      {
        id: "stats",
        label: "건강 통계",
        desc: "체중 · 활동량 그래프",
        icon: BarChart2,
        href: "/health?tab=stats",
        color: "text-blue-500",
        bg: "bg-blue-50",
      },
    ],
  },
  {
    title: "일상",
    items: [
      {
        id: "diary",
        label: "일기",
        desc: "오늘 하루를 기록해요",
        icon: BookOpen,
        href: "/diary",
        color: "text-amber-500",
        bg: "bg-amber-50",
      },
      {
        id: "schedule",
        label: "스케줄",
        desc: "밥 · 약 · 산책 알림",
        icon: CalendarClock,
        href: "/schedule",
        color: "text-green-500",
        bg: "bg-green-50",
      },
    ],
  },
];

export default function MyDog() {
  const [dog, setDog] = useState<DogProfile | null>(null);

  useEffect(() => {
    const profile = loadDogProfile();
    if (profile) {
      setDog(profile);
    } else {
      // 데이터 없을 때 기본값
      setDog({
        name: "내 강아지",
        breed: "품종 미등록",
        age: "-",
        tags: ["활발함"],
      });
    }
  }, []);

  return (
    <Layout>
      <div className="px-5 pt-6 pb-4 flex flex-col gap-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-xl font-bold text-foreground">내 강아지</h1>
        </div>

        {/* 강아지 프로필 카드 */}
        <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            {/* 아바타 */}
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-3xl overflow-hidden">
              {dog?.photo ? (
                <img src={dog.photo} alt={dog?.name} className="w-full h-full object-cover" />
              ) : (
                "🐾"
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground truncate">{dog?.name ?? "..."}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{dog?.breed}</p>
              {dog?.age && dog.age !== "-" && (
                <p className="text-xs text-muted-foreground mt-0.5">{dog.age}</p>
              )}
              {/* 성격 태그 */}
              {dog?.tags && dog.tags.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {dog.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-semibold bg-primary/8 text-primary border border-primary/15 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 프로필 편집 버튼 */}
          <button className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border/60 bg-secondary/40 text-sm font-semibold text-muted-foreground hover:bg-secondary/70 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
            프로필 편집
          </button>
        </div>

        {/* 메뉴 섹션 */}
        <div className="flex flex-col gap-5">
          {MENU_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {section.title}
              </p>
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
                {section.items.map((item, idx) => {
                  const Icon = item.icon;
                  const isLast = idx === section.items.length - 1;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 active:bg-secondary/60 transition-colors",
                        !isLast && "border-b border-border/40"
                      )}
                    >
                      {/* 아이콘 */}
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                        <Icon className={cn("w-4.5 h-4.5", item.color)} strokeWidth={2.2} />
                      </div>

                      {/* 텍스트 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>

                      {/* 화살표 */}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
