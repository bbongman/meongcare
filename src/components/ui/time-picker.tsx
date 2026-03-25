import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

const ITEM_H = 48;
const SIDE = 2;
const COPIES = 5;

const AM_PM = ["오전", "오후"];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const containerH = ITEM_H * (SIDE * 2 + 1);
const padH = ITEM_H * SIDE;

function itemStyle(dist: number) {
  if (dist === 0) return { fontSize: 20, fontWeight: 700, opacity: 1 };
  if (dist === 1) return { fontSize: 15, fontWeight: 500, opacity: 0.55 };
  if (dist === 2) return { fontSize: 13, fontWeight: 400, opacity: 0.25 };
  return { fontSize: 12, fontWeight: 400, opacity: 0.1 };
}

// ── 오전/오후 전용 (루프 없음) ────────────────────────────────────────────────
function SimpleCol({
  items,
  selectedIndex,
  onSettle,
  className,
}: {
  items: string[];
  selectedIndex: number;
  onSettle: (i: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!mounted.current) {
      el.scrollTop = selectedIndex * ITEM_H;
      mounted.current = true;
    } else {
      el.scrollTo({ top: selectedIndex * ITEM_H, behavior: "smooth" });
    }
  }, [selectedIndex]);

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ height: containerH }}>
      <div
        className="absolute bg-secondary rounded-xl pointer-events-none"
        style={{ top: padH, height: ITEM_H, left: 4, right: 4 }}
      />
      <div
        ref={ref}
        className="relative h-full overflow-y-scroll"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        <div style={{ height: padH }} />
        {items.map((label, i) => {
          const s = itemStyle(Math.abs(i - selectedIndex));
          return (
            <div
              key={i}
              className="flex items-center justify-center cursor-pointer select-none text-foreground transition-all duration-100"
              style={{ height: ITEM_H, ...s }}
              onClick={() => {
                ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
                onSettle(i);
              }}
            >
              {label}
            </div>
          );
        })}
        <div style={{ height: padH }} />
      </div>
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: padH, background: "linear-gradient(to bottom, hsl(var(--card)) 20%, transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: padH, background: "linear-gradient(to top, hsl(var(--card)) 20%, transparent)" }} />
    </div>
  );
}

// ── 순환 스크롤 컬럼 (시/분) ─────────────────────────────────────────────────
function WheelCol({
  items,
  selectedIndex,
  onSettle,
  className,
}: {
  items: string[];
  selectedIndex: number;
  onSettle: (i: number) => void;
  className?: string;
}) {
  const n = items.length;
  const midBase = Math.floor(COPIES / 2) * n;

  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef<number | null>(null);
  const mounted = useRef(false);
  const clickPending = useRef(false);

  // 마우스 드래그 (데스크톱)
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);
  const dragDelta = useRef(0);

  const [centerV, setCenterV] = useState(() => midBase + selectedIndex);

  // 가상 아이템 목록
  const virtual = Array.from({ length: COPIES * n }, (_, vi) => ({
    vi,
    ai: vi % n,
    label: items[vi % n],
  }));

  // selectedIndex 외부 변경 시에만 스크롤 보정
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!mounted.current) {
      const init = midBase + selectedIndex;
      el.scrollTop = init * ITEM_H;
      setCenterV(init);
      mounted.current = true;
      return;
    }

    // 클릭으로 인한 반응은 무시 (클릭이 직접 스크롤 위치를 잡음)
    if (clickPending.current) return;

    const cur = Math.round(el.scrollTop / ITEM_H);
    const curAi = ((cur % n) + n) % n;
    if (curAi === selectedIndex) return; // 이미 올바른 위치

    // 최단 방향으로 이동
    const diff = ((selectedIndex - curAi + n) % n);
    const steps = diff > n / 2 ? diff - n : diff;
    const target = cur + steps;
    el.scrollTo({ top: target * ITEM_H, behavior: "smooth" });
    setCenterV(target);
  }, [selectedIndex, n, midBase]);

  // 마우스 드래그 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragDelta.current = 0;
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = ref.current?.scrollTop ?? 0;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !ref.current) return;
      const dy = dragStartY.current - e.clientY;
      dragDelta.current = Math.abs(dy);
      ref.current.scrollTop = dragStartScrollTop.current + dy;
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    // 스크롤 중 실시간 스타일 업데이트 (RAF)
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (el) setCenterV(Math.round(el.scrollTop / ITEM_H));
    });

    // 정착 처리
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (!el) return;
      const raw = Math.round(el.scrollTop / ITEM_H);
      const ai = ((raw % n) + n) % n;

      el.scrollTo({ top: raw * ITEM_H, behavior: "smooth" });
      setCenterV(raw);

      // 가장자리면 중간 복사본으로 silent 점프
      if (raw < n || raw >= n * (COPIES - 1)) {
        const jump = midBase + ai;
        setTimeout(() => {
          if (el) { el.scrollTop = jump * ITEM_H; setCenterV(jump); }
        }, 320);
      }

      onSettle(ai);
    }, 150);
  }, [n, midBase, onSettle]);

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ height: containerH }}>
      <div
        className="absolute bg-secondary rounded-xl pointer-events-none"
        style={{ top: padH, height: ITEM_H, left: 4, right: 4 }}
      />
      <div
        ref={ref}
        className="relative h-full overflow-y-scroll"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", cursor: "grab" } as React.CSSProperties}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
      >
        <div style={{ height: padH }} />
        {virtual.map(({ vi, ai, label }) => {
          const s = itemStyle(Math.abs(vi - centerV));
          return (
            <div
              key={vi}
              className="flex items-center justify-center cursor-pointer select-none text-foreground transition-all duration-100"
              style={{ height: ITEM_H, ...s }}
              onClick={() => {
                if (dragDelta.current > 15) return; // 드래그였으면 클릭 무시
                clickPending.current = true;
                ref.current?.scrollTo({ top: vi * ITEM_H, behavior: "smooth" });
                setCenterV(vi);
                setTimeout(() => { clickPending.current = false; }, 600);
              }}
            >
              {label}
            </div>
          );
        })}
        <div style={{ height: padH }} />
      </div>
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: padH, background: "linear-gradient(to bottom, hsl(var(--card)) 20%, transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: padH, background: "linear-gradient(to top, hsl(var(--card)) 20%, transparent)" }} />
    </div>
  );
}

// ── 타임피커 ──────────────────────────────────────────────────────────────────
export function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [hStr, mStr] = value.split(":");
  const h24 = parseInt(hStr ?? "8", 10);
  const min = parseInt(mStr ?? "0", 10);

  const isPM = h24 >= 12;
  const hour12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const ampmIdx = isPM ? 1 : 0;
  const hourIdx = hour12 - 1; // 0~11

  function toH24(ampmI: number, hourI: number) {
    const h12 = hourI + 1;
    return ampmI === 1 ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;
  }

  function emit(ai: number, hi: number, mi: number) {
    const h = toH24(ai, hi);
    onChange(`${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center rounded-2xl border border-border/60 bg-card overflow-hidden px-1 py-1 gap-0.5">
      <SimpleCol
        items={AM_PM}
        selectedIndex={ampmIdx}
        onSettle={(i) => emit(i, hourIdx, min)}
        className="w-[72px]"
      />
      <div className="w-px bg-border/30 self-stretch my-4 shrink-0" />
      <WheelCol
        items={HOURS}
        selectedIndex={hourIdx}
        onSettle={(i) => emit(ampmIdx, i, min)}
        className="flex-1"
      />
      <span className="text-xl font-bold text-muted-foreground/50 shrink-0 pb-0.5">:</span>
      <WheelCol
        items={MINUTES}
        selectedIndex={min}
        onSettle={(i) => emit(ampmIdx, hourIdx, i)}
        className="flex-1"
      />
    </div>
  );
}
