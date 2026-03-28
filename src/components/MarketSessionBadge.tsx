"use client";

// 마켓 세션 배지 컴포넌트
// Market session badge component

import { useEffect, useState } from "react";
import { MarketSession } from "@/lib/types";
import { getMarketSession } from "@/lib/marketSession";
import { useLanguage } from "@/lib/i18n";

/**
 * 세션별 배지 CSS 색상 변수 반환
 * Returns badge CSS color variable per session
 */
function getBadgeAccent(session: MarketSession): string {
  switch (session) {
    case "PRE_MARKET":
      return "var(--m-accent)";
    case "MARKET_OPEN":
      return "var(--m-green)";
    case "AFTER_HOURS":
      return "var(--m-moderate-color)";
    case "CLOSED":
      return "var(--m-low-color)";
  }
}

/**
 * 마켓 세션에 대한 번역된 라벨 반환
 * Returns translated label for market session
 */
function getLocalizedSessionLabel(
  session: MarketSession,
  t: {
    preMarket: string;
    marketOpen: string;
    afterHours: string;
    marketClosed: string;
  }
): string {
  const labels: Record<MarketSession, string> = {
    PRE_MARKET: t.preMarket,
    MARKET_OPEN: t.marketOpen,
    AFTER_HOURS: t.afterHours,
    CLOSED: t.marketClosed,
  };
  return labels[session];
}

export default function MarketSessionBadge() {
  const [session, setSession] = useState<MarketSession>("CLOSED");
  const { t } = useLanguage();

  useEffect(() => {
    // 초기 세션 감지
    // Initial session detection
    setSession(getMarketSession());

    // 30초마다 세션 갱신
    // Refresh session every 30 seconds
    const interval = setInterval(() => {
      setSession(getMarketSession());
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const isPulse = session === "PRE_MARKET";
  const accent = getBadgeAccent(session);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border"
      style={{
        background: `color-mix(in srgb, ${accent} 20%, transparent)`,
        color: accent,
        borderColor: `color-mix(in srgb, ${accent} 40%, transparent)`,
      }}
    >
      {/* 프리마켓일 때 펄스 애니메이션 / Pulse animation during pre-market */}
      {isPulse && (
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: accent }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: accent }}
          />
        </span>
      )}
      {getLocalizedSessionLabel(session, t)}
    </span>
  );
}
