"use client";

// 종목 카드 스켈레톤 로딩 컴포넌트
// Ticker card skeleton loading component

/**
 * 펄스 애니메이션이 적용된 스켈레톤 블록
 * Skeleton block with pulse animation
 */
function SkeletonBlock({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{
        background: "var(--m-bar-bg)",
        ...style,
      }}
    />
  );
}

/**
 * 종목 카드 레이아웃을 모방한 스켈레톤 컴포넌트
 * Skeleton component mimicking ticker card layout
 */
export default function TickerCardSkeleton() {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "var(--m-card)",
        borderColor: "var(--m-border)",
      }}
    >
      {/* 상단: 심볼 + 회사명 + 점수 배지 */}
      {/* Top: Symbol + company name + score badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <SkeletonBlock className="h-5 w-20 mb-1.5" />
          <SkeletonBlock className="h-3 w-32" />
        </div>
        <SkeletonBlock className="h-12 w-12 rounded-full" />
      </div>

      {/* 가격 + 변동률 */}
      {/* Price + change */}
      <div className="mb-3">
        <div className="flex items-baseline gap-3">
          <SkeletonBlock className="h-7 w-24" />
          <SkeletonBlock className="h-5 w-16" />
        </div>
        <div className="flex gap-4 mt-1.5">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-3 w-20" />
        </div>
      </div>

      {/* 시그널 배지 */}
      {/* Signal badge */}
      <SkeletonBlock className="h-9 w-full rounded-lg mb-3" />

      {/* 5개 기준 바 */}
      {/* 5 criteria bars */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between mb-1">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-3 w-8" />
          </div>
          <SkeletonBlock className="h-2 w-full rounded-full" />
        </div>
      ))}

      {/* 엔트리 전략 */}
      {/* Entry strategy */}
      <SkeletonBlock className="h-24 w-full rounded-lg mt-3" />
    </div>
  );
}
