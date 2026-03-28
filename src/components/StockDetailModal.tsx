"use client";

// 종목 상세 모달 컴포넌트
// Stock detail modal component

import { useEffect, useRef, useCallback } from "react";
import { TickerData, ScoringResult, ScoreCriterion, EntryStrategy } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import ScoreCriteriaBar from "./ScoreCriteriaBar";

/** 모달 Props / Modal Props */
interface StockDetailModalProps {
  data: TickerData;
  scoring: ScoringResult;
  strategy: EntryStrategy;
  /** 스코어링 모드 / Scoring mode */
  scoringMode: "trending" | "undervalued";
  /** 모달 닫기 핸들러 / Close handler */
  onClose: () => void;
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
 * 변동률 색상 반환
 * Returns color for price change percentage
 */
function getChangeColor(changePercent: number): string {
  if (changePercent > 0) return "var(--m-green)";
  if (changePercent < 0) return "var(--m-high)";
  return "var(--m-text-muted)";
}

/**
 * 시그널 배지 정보 반환
 * Returns signal badge info
 */
function getSignalStyle(signal: ScoringResult["signal"]): {
  colorVar: string;
  bgVar: string;
  emoji: string;
} {
  switch (signal) {
    case "HIGH":
      return {
        colorVar: "var(--m-high)",
        bgVar: "color-mix(in srgb, var(--m-high) 15%, transparent)",
        emoji: "🔥",
      };
    case "MODERATE":
      return {
        colorVar: "var(--m-moderate-color)",
        bgVar: "color-mix(in srgb, var(--m-moderate-color) 15%, transparent)",
        emoji: "⚡",
      };
    case "LOW":
      return {
        colorVar: "var(--m-low-color)",
        bgVar: "color-mix(in srgb, var(--m-low-color) 15%, transparent)",
        emoji: "💤",
      };
  }
}

/**
 * 52주 범위 내 현재가 위치 비율 계산 (0~100)
 * Calculates current price position within 52-week range (0~100)
 */
function calculate52WeekPosition(
  currentPrice: number,
  low: number,
  high: number
): number {
  if (high <= low || high === 0) return 0;
  const position = ((currentPrice - low) / (high - low)) * 100;
  return Math.max(0, Math.min(100, position));
}

/**
 * 원형 진행률 SVG 컴포넌트
 * Circular progress SVG component
 */
function CircularProgress({
  total,
  maxTotal,
  signal,
}: {
  total: number;
  maxTotal: number;
  signal: ScoringResult["signal"];
}) {
  const RADIUS = 40;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const ratio = maxTotal > 0 ? total / maxTotal : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - ratio);

  const signalStyle = getSignalStyle(signal);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* 배경 원 / Background circle */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--m-bar-bg)"
          strokeWidth="8"
        />
        {/* 진행률 원 / Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={signalStyle.colorVar}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* 점수 텍스트 / Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-lg font-bold font-mono"
          style={{ color: signalStyle.colorVar }}
        >
          {total}
        </span>
        <span className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>
          / {maxTotal}
        </span>
      </div>
    </div>
  );
}

export default function StockDetailModal({
  data,
  scoring,
  strategy,
  scoringMode,
  onClose,
}: StockDetailModalProps) {
  const { t } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // 엔트리 전략 노트를 번역된 텍스트로 교체
  // Replace entry strategy notes with translated text
  const translatedNotes =
    scoring.signal === "HIGH"
      ? t.notesHigh
      : scoring.signal === "MODERATE"
        ? t.notesModerate
        : t.notesLow;
  const localizedStrategy = { ...strategy, notes: translatedNotes };

  const signalStyle = getSignalStyle(scoring.signal);
  const signalLabel =
    scoring.signal === "HIGH"
      ? t.highMomentum
      : scoring.signal === "MODERATE"
        ? t.moderate
        : t.low;

  /**
   * Escape 키 핸들러
   * Escape key handler
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      // 포커스 트랩 / Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  // 마운트 시 스크롤 잠금 + 포커스 관리
  // On mount: scroll lock + focus management
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    // 모달 내 첫 포커스 가능 요소에 포커스
    // Focus first focusable element in modal
    if (modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      // 이전 포커스 요소로 복원
      // Restore focus to previously focused element
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [handleKeyDown]);

  /**
   * 오버레이 클릭 시 닫기
   * Close on overlay click
   */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // 52주 범위 내 현재가 위치
  // Current price position within 52-week range
  const weekPosition = calculate52WeekPosition(
    data.preMarketPrice,
    data.fiftyTwoWeekLow,
    data.fiftyTwoWeekHigh
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.6)" }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`${data.symbol} ${data.companyName}`}
    >
      {/* 모달 본체 — 모바일: 풀스크린 바텀시트, 데스크톱: 중앙 모달 */}
      {/* Modal body — Mobile: full-screen bottom sheet, Desktop: centered modal */}
      <div
        ref={modalRef}
        className="
          w-full max-h-[95vh] md:max-h-[85vh] md:max-w-2xl md:rounded-xl
          rounded-t-xl overflow-y-auto
          border-t md:border
          animate-[slideUp_0.3s_ease-out]
        "
        style={{
          background: "var(--m-bg)",
          borderColor: "var(--m-border)",
        }}
      >
        {/* ===== 헤더 ===== */}
        {/* ===== Header ===== */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between p-4 border-b backdrop-blur-sm"
          style={{
            background: "color-mix(in srgb, var(--m-bg) 95%, transparent)",
            borderColor: "var(--m-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--m-text)" }}
            >
              {data.symbol}
            </h2>
            <span
              className="text-sm"
              style={{ color: "var(--m-text-muted)" }}
            >
              {data.companyName}
            </span>
            {/* LIVE 배지 / LIVE badge */}
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
          {/* 닫기 버튼 / Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full border transition-colors cursor-pointer"
            style={{
              background: "var(--m-card)",
              borderColor: "var(--m-border)",
              color: "var(--m-text-muted)",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* ===== 가격 섹션 ===== */}
          {/* ===== Price Section ===== */}
          <section>
            <div className="flex items-baseline gap-3 mb-2">
              <span
                className="text-3xl font-bold font-mono"
                style={{ color: "var(--m-text)" }}
              >
                ${data.preMarketPrice.toFixed(2)}
              </span>
              <span
                className="text-xl font-bold font-mono"
                style={{ color: getChangeColor(data.preMarketChangePercent) }}
              >
                {data.preMarketChangePercent > 0 ? "+" : ""}
                {data.preMarketChangePercent.toFixed(2)}%
              </span>
              <span
                className="text-sm font-mono"
                style={{ color: getChangeColor(data.preMarketChange) }}
              >
                ({data.preMarketChange > 0 ? "+" : ""}${data.preMarketChange.toFixed(2)})
              </span>
            </div>

            {/* 가격 상세 그리드 / Price detail grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div
                className="p-2 rounded-lg"
                style={{ background: "var(--m-card-inner)" }}
              >
                <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                  {t.modalPrevClose}
                </span>
                <span className="font-mono font-bold" style={{ color: "var(--m-text)" }}>
                  ${data.prevClose.toFixed(2)}
                </span>
              </div>
              <div
                className="p-2 rounded-lg"
                style={{ background: "var(--m-card-inner)" }}
              >
                <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                  {t.modalDayHigh}
                </span>
                <span className="font-mono font-bold" style={{ color: "var(--m-green)" }}>
                  ${data.dayHigh.toFixed(2)}
                </span>
              </div>
              <div
                className="p-2 rounded-lg"
                style={{ background: "var(--m-card-inner)" }}
              >
                <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                  {t.modalDayLow}
                </span>
                <span className="font-mono font-bold" style={{ color: "var(--m-high)" }}>
                  ${data.dayLow.toFixed(2)}
                </span>
              </div>
            </div>

            {/* 52주 범위 바 / 52-week range bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] mb-1">
                <span style={{ color: "var(--m-text-muted)" }}>
                  {t.modal52WeekLow}: ${data.fiftyTwoWeekLow.toFixed(2)}
                </span>
                <span style={{ color: "var(--m-text-muted)" }}>
                  {t.modal52WeekHigh}: ${data.fiftyTwoWeekHigh.toFixed(2)}
                </span>
              </div>
              <div
                className="relative w-full h-3 rounded-full overflow-hidden"
                style={{ background: "var(--m-bar-bg)" }}
              >
                {/* 현재가 위치 마커 / Current price position marker */}
                <div
                  className="absolute top-0 h-full w-1 rounded-full"
                  style={{
                    left: `${weekPosition}%`,
                    background: "var(--m-accent)",
                    transform: "translateX(-50%)",
                  }}
                />
                {/* 범위 채움 / Range fill */}
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${weekPosition}%`,
                    background: "color-mix(in srgb, var(--m-accent) 30%, transparent)",
                  }}
                />
              </div>
              <div
                className="text-center text-[10px] mt-1"
                style={{ color: "var(--m-accent)" }}
              >
                {weekPosition.toFixed(0)}%
              </div>
            </div>
          </section>

          {/* ===== 스코어 상세 섹션 ===== */}
          {/* ===== Score Detail Section ===== */}
          <section>
            <h3
              className="text-sm font-bold mb-3 uppercase tracking-wider"
              style={{ color: "var(--m-accent)" }}
            >
              {t.modalScoreDetail}
            </h3>

            {/* 총점 + 시그널 배지 */}
            {/* Total score + Signal badge */}
            <div className="flex items-center gap-4 mb-4">
              <CircularProgress
                total={scoring.total}
                maxTotal={scoring.maxTotal}
                signal={scoring.signal}
              />
              <div>
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    background: signalStyle.bgVar,
                    color: signalStyle.colorVar,
                  }}
                >
                  {signalStyle.emoji} {signalLabel}
                </span>
                <p className="text-xs mt-1" style={{ color: "var(--m-text-muted)" }}>
                  {t.modalTotalScore}: {scoring.total}/{scoring.maxTotal}
                </p>
              </div>
            </div>

            {/* 12개 기준 바 / 12 criteria bars */}
            <div className="space-y-0">
              {scoring.criteria.map((criterion: ScoreCriterion, index: number) => (
                <ScoreCriteriaBar key={index} criterion={criterion} />
              ))}
            </div>
          </section>

          {/* ===== 거래량 분석 섹션 ===== */}
          {/* ===== Volume Analysis Section ===== */}
          <section>
            <h3
              className="text-sm font-bold mb-3 uppercase tracking-wider"
              style={{ color: "var(--m-accent)" }}
            >
              {t.modalVolumeAnalysis}
            </h3>

            <div className="grid grid-cols-3 gap-3 text-sm mb-3">
              <div
                className="p-2 rounded-lg text-center"
                style={{ background: "var(--m-card-inner)" }}
              >
                <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                  {t.modalPreMarketVol}
                </span>
                <span className="font-mono font-bold" style={{ color: "var(--m-text)" }}>
                  {formatVolume(data.preMarketVolume)}
                </span>
              </div>
              <div
                className="p-2 rounded-lg text-center"
                style={{ background: "var(--m-card-inner)" }}
              >
                <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                  {t.modalAvgVol}
                </span>
                <span className="font-mono font-bold" style={{ color: "var(--m-text)" }}>
                  {formatVolume(data.avgDailyVolume)}
                </span>
              </div>
              <div
                className="p-2 rounded-lg text-center"
                style={{ background: "var(--m-card-inner)" }}
              >
                <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                  {t.modalVolRatio}
                </span>
                <span
                  className="font-mono font-bold"
                  style={{
                    color: data.volumeRatio >= 2 ? "var(--m-green)" : "var(--m-text)",
                  }}
                >
                  {data.volumeRatio.toFixed(1)}x
                </span>
              </div>
            </div>

            {/* 거래량 비교 바 / Volume comparison bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: "var(--m-text-muted)" }}>{t.modalPreMarketVol}</span>
                  <span style={{ color: "var(--m-text)" }}>{formatVolume(data.preMarketVolume)}</span>
                </div>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--m-bar-bg)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, (data.preMarketVolume / Math.max(data.avgDailyVolume, 1)) * 100)}%`,
                      background: "var(--m-accent)",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: "var(--m-text-muted)" }}>{t.modalAvgVol}</span>
                  <span style={{ color: "var(--m-text)" }}>{formatVolume(data.avgDailyVolume)}</span>
                </div>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--m-bar-bg)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "100%",
                      background: "var(--m-text-muted)",
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ===== 엔트리 전략 섹션 ===== */}
          {/* ===== Entry Strategy Section ===== */}
          <section>
            <h3
              className="text-sm font-bold mb-3 uppercase tracking-wider"
              style={{ color: "var(--m-accent)" }}
            >
              {t.modalEntryStrategy}
            </h3>

            <div
              className="p-3 rounded-lg border"
              style={{
                background: "var(--m-card-strategy)",
                borderColor: "var(--m-border-strategy)",
              }}
            >
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                    {t.entryZone}
                  </span>
                  <span className="font-mono font-bold" style={{ color: "var(--m-text)" }}>
                    {localizedStrategy.entryZone}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                    {t.stopLoss}
                  </span>
                  <span className="font-mono font-bold" style={{ color: "var(--m-high)" }}>
                    {localizedStrategy.stopLoss}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                    {t.target1}
                  </span>
                  <span className="font-mono font-bold" style={{ color: "var(--m-green)" }}>
                    {localizedStrategy.target1}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                    {t.target2}
                  </span>
                  <span className="font-mono font-bold" style={{ color: "var(--m-green)" }}>
                    {localizedStrategy.target2}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px]" style={{ color: "var(--m-text-muted)" }}>
                    {t.riskReward}
                  </span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: "var(--m-moderate-color)" }}
                  >
                    {localizedStrategy.riskReward}
                  </span>
                </div>
              </div>

              {/* 참고 사항 / Notes */}
              <p
                className="mt-3 text-xs italic p-2 rounded"
                style={{
                  color: "var(--m-note-text)",
                  background: "color-mix(in srgb, var(--m-accent) 5%, transparent)",
                }}
              >
                {localizedStrategy.notes}
              </p>
            </div>
          </section>

          {/* ===== 촉매 섹션 ===== */}
          {/* ===== Catalyst Section ===== */}
          {data.catalysts.length > 0 && (
            <section>
              <h3
                className="text-sm font-bold mb-3 uppercase tracking-wider"
                style={{ color: "var(--m-accent)" }}
              >
                {t.modalCatalysts}
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.catalysts.map((catalyst, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-xs rounded-full border"
                    style={{
                      background: "color-mix(in srgb, var(--m-moderate-color) 10%, transparent)",
                      color: "var(--m-moderate-color)",
                      borderColor: "color-mix(in srgb, var(--m-moderate-color) 30%, transparent)",
                    }}
                  >
                    {catalyst}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ===== 면책 조항 푸터 ===== */}
          {/* ===== Disclaimer Footer ===== */}
          <footer
            className="pt-3 border-t text-center"
            style={{ borderColor: "var(--m-border)" }}
          >
            <p className="text-[10px]" style={{ color: "var(--m-text-dim)" }}>
              {t.modalDisclaimerFooter}
            </p>
          </footer>
        </div>
      </div>

      {/* 슬라이드 업 애니메이션 / Slide up animation */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
