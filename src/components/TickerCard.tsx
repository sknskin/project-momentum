"use client";

// 종목 카드 컴포넌트
// Ticker card component

import { useMemo } from "react";
import { TickerData, ScoringResult, MarketSession } from "@/lib/types";
import { calculateScore, generateEntryStrategy } from "@/lib/scoring";
import { calculateUndervaluedScore, generateUndervaluedEntryStrategy } from "@/lib/scoringUndervalued";
import { getMarketSession } from "@/lib/marketSession";
import { useLanguage } from "@/lib/i18n";
import ScoreCriteriaBar from "./ScoreCriteriaBar";
import EntryStrategyBox from "./EntryStrategyBox";

/** 스코어링 모드 타입 / Scoring mode type */
export type ScoringMode = "trending" | "undervalued";

/** 카드에 표시할 최대 기준 수 / Max criteria to show on card */
const CARD_MAX_CRITERIA = 5;

interface TickerCardProps {
  data: TickerData;
  /** 스코어링 모드 (기본: trending)
   *  Scoring mode (default: trending) */
  scoringMode?: ScoringMode;
  /** 카드 클릭 시 호출되는 콜백
   *  Callback called when card is clicked */
  onClick?: (data: TickerData) => void;
}

/**
 * 시그널에 따른 배지 스타일 반환
 * Returns badge style based on signal
 */
function getSignalBadge(
  signal: ScoringResult["signal"],
  t: { highMomentum: string; moderate: string; low: string }
): {
  label: string;
  colorVar: string;
  emoji: string;
} {
  switch (signal) {
    case "HIGH":
      return { label: t.highMomentum, colorVar: "var(--m-high)", emoji: "🔥" };
    case "MODERATE":
      return { label: t.moderate, colorVar: "var(--m-moderate-color)", emoji: "⚡" };
    case "LOW":
      return { label: t.low, colorVar: "var(--m-low-color)", emoji: "💤" };
  }
}

/**
 * 총점에 따른 배지 배경색 반환
 * Returns badge background color based on total score
 */
function getScoreBadgeColor(total: number, maxTotal: number): string {
  const ratio = total / maxTotal;
  if (ratio >= 0.7) return "var(--m-high)";
  if (ratio >= 0.45) return "var(--m-moderate-color)";
  return "var(--m-low-color)";
}

/**
 * 변동률 색상 반환
 * Returns color for price change percentage
 */
function getChangeColor(changePercent: number): string {
  if (changePercent > 0) return "var(--m-green)";
  if (changePercent < 0) return "var(--m-high)";
  return "var(--m-text-muted)";
}

/**
 * 숫자를 간략하게 포맷 (예: 1.5M, 230K)
 * Formats number to short form (e.g., 1.5M, 230K)
 */
function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return vol.toString();
}

/**
 * 마켓 세션에 대한 번역된 라벨 반환 (카드용)
 * Returns translated session label for card display
 */
function getSessionLabel(
  session: MarketSession,
  t: {
    sessionPreMarket: string;
    sessionMarketOpen: string;
    sessionAfterHours: string;
    sessionClosed: string;
  }
): string {
  const map: Record<MarketSession, string> = {
    PRE_MARKET: t.sessionPreMarket,
    MARKET_OPEN: t.sessionMarketOpen,
    AFTER_HOURS: t.sessionAfterHours,
    CLOSED: t.sessionClosed,
  };
  return map[session];
}

/**
 * 마켓 세션에 따른 배지 색상
 * Badge color based on market session
 */
function getSessionColor(session: MarketSession): string {
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

export default function TickerCard({ data, scoringMode = "trending", onClick }: TickerCardProps) {
  const { t } = useLanguage();

  // 스코어링 모드에 따라 다른 스코어링/전략 사용
  // Use different scoring/strategy based on scoring mode
  const scoring = scoringMode === "undervalued"
    ? calculateUndervaluedScore(data)
    : calculateScore(data);
  const strategy = scoringMode === "undervalued"
    ? generateUndervaluedEntryStrategy(data, scoring)
    : generateEntryStrategy(data, scoring);
  const signalInfo = getSignalBadge(scoring.signal, t);

  // 엔트리 전략 노트를 번역된 텍스트로 교체
  // Replace entry strategy notes with translated text
  const translatedNotes =
    scoring.signal === "HIGH"
      ? t.notesHigh
      : scoring.signal === "MODERATE"
        ? t.notesModerate
        : t.notesLow;
  const localizedStrategy = { ...strategy, notes: translatedNotes };

  // #9: 기준을 점수 내림차순으로 정렬, 상위 5개만 표시
  // #9: Sort criteria by score descending, show top 5 only
  const sortedCriteria = useMemo(() => {
    return [...scoring.criteria].sort((a, b) => b.score - a.score);
  }, [scoring.criteria]);
  const topCriteria = sortedCriteria.slice(0, CARD_MAX_CRITERIA);
  const remainingCount = sortedCriteria.length - CARD_MAX_CRITERIA;

  // #12: 세션 인식 라벨
  // #12: Session-aware label
  const session = useMemo(() => getMarketSession(), []);
  const sessionLabel = getSessionLabel(session, t);
  const sessionColor = getSessionColor(session);

  return (
    <div
      className="rounded-xl border p-4 transition-colors cursor-pointer hover:border-[var(--m-accent)]"
      style={{
        background: "var(--m-card)",
        borderColor: "var(--m-border)",
      }}
      onClick={() => onClick?.(data)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(data);
        }
      }}
    >
      {/* 상단: 심볼, 회사명, LIVE/DEMO 배지 */}
      {/* Top: Symbol, company name, LIVE/DEMO badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold" style={{ color: "var(--m-text)" }}>
              {data.symbol}
            </h3>
            {/* 라이브 배지 / Live badge */}
            <span
              className="px-2 py-0.5 text-[10px] font-bold rounded-full border"
              style={{
                background: "color-mix(in srgb, var(--m-green) 20%, transparent)",
                color: "var(--m-green)",
                borderColor: "color-mix(in srgb, var(--m-green) 40%, transparent)",
              }}
            >
              {t.live}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--m-text-muted)" }}>
            {data.companyName}
          </p>
        </div>

        {/* 총점 배지 / Total score badge */}
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full text-white text-sm font-bold"
          style={{ background: getScoreBadgeColor(scoring.total, scoring.maxTotal) }}
        >
          {scoring.total}/{scoring.maxTotal}
        </div>
      </div>

      {/* 프리마켓 가격 변동 (크게 표시) + 세션 라벨 */}
      {/* Pre-market price change (large display) + session label */}
      <div className="mb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold font-mono" style={{ color: "var(--m-text)" }}>
            ${data.preMarketPrice.toFixed(2)}
          </span>
          <span
            className="text-xl font-bold font-mono"
            style={{ color: getChangeColor(data.preMarketChangePercent) }}
          >
            {data.preMarketChangePercent > 0 ? "+" : ""}
            {data.preMarketChangePercent.toFixed(2)}%
          </span>
          {/* #12: 세션 라벨 배지 / Session label badge */}
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{
              color: sessionColor,
              background: `color-mix(in srgb, ${sessionColor} 15%, transparent)`,
            }}
          >
            {sessionLabel}
          </span>
        </div>
        <div className="flex gap-4 mt-1 text-xs" style={{ color: "var(--m-text-muted)" }}>
          <span>{t.prevClose} ${data.prevClose.toFixed(2)}</span>
          <span>{t.vol} {formatVolume(data.preMarketVolume)}</span>
          <span>{t.avgVol} {formatVolume(data.avgDailyVolume)}</span>
        </div>
      </div>

      {/* 엔트리 시그널 / Entry readiness signal */}
      <div
        className="flex items-center gap-2 mb-3 py-2 px-3 rounded-lg"
        style={{ background: "var(--m-card-inner)" }}
      >
        <span className="text-sm">{signalInfo.emoji}</span>
        <span className="text-sm font-bold" style={{ color: signalInfo.colorVar }}>
          {signalInfo.label}
        </span>
        <span className="text-xs ml-auto" style={{ color: "var(--m-text-muted)" }}>
          {t.entryReadiness}
        </span>
      </div>

      {/* #9: 상위 5개 스코어링 기준 바 + 나머지 개수 표시 */}
      {/* #9: Top 5 scoring criteria bars + remaining count */}
      <div className="mb-3">
        {topCriteria.map((criterion, index) => (
          <ScoreCriteriaBar key={index} criterion={criterion} />
        ))}
        {remainingCount > 0 && (
          <p className="text-[10px] mt-1" style={{ color: "var(--m-text-muted)" }}>
            {t.andMoreCriteria(remainingCount)}
          </p>
        )}
      </div>

      {/* 촉매 요약 / Catalyst summary */}
      {data.catalysts.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-bold mb-1" style={{ color: "var(--m-moderate-color)" }}>
            {t.catalysts}
          </h4>
          <div className="flex flex-wrap gap-1">
            {data.catalysts.map((catalyst, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-[10px] rounded-full border"
                style={{
                  background: "color-mix(in srgb, var(--m-moderate-color) 10%, transparent)",
                  color: "var(--m-moderate-color)",
                  borderColor: "color-mix(in srgb, var(--m-moderate-color) 20%, transparent)",
                }}
              >
                {catalyst}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 엔트리 전략 / Entry strategy */}
      <EntryStrategyBox strategy={localizedStrategy} />
    </div>
  );
}
