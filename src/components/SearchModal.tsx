"use client";

// 종목 검색 모달 — 검색 입력 + 상세 결과를 모달 내에서 표시
// Stock search modal — search input + detailed results shown within modal

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { TickerData, StockApiResponse, ScoringResult } from "@/lib/types";
import { calculateScore, generateEntryStrategy } from "@/lib/scoring";
import { calculateUndervaluedScore, generateUndervaluedEntryStrategy } from "@/lib/scoringUndervalued";
import { useLanguage } from "@/lib/i18n";
import ScoreCriteriaBar from "./ScoreCriteriaBar";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoringMode: "trending" | "undervalued";
}

/**
 * 숫자를 읽기 쉬운 형태로 포맷
 * Format number for readability
 */
function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return vol.toString();
}

export default function SearchModal({ isOpen, onClose, scoringMode }: SearchModalProps) {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<TickerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // 모달 열릴 때 입력창 포커스
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setInput("");
      setResult(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Escape 키 닫기
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // 스크롤 락
  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const handleSearch = useCallback(async () => {
    const symbol = input.trim().toUpperCase();
    if (!symbol) return;

    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/stock/${symbol}`);
      const data = (await response.json()) as StockApiResponse;

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(("error" in data ? data.error : null) || `${symbol} 데이터를 가져올 수 없습니다`);
      }
    } catch {
      setError(t.cannotFetchHotStocks);
    } finally {
      setSearching(false);
    }
  }, [input, t.cannotFetchHotStocks]);

  if (!isOpen) return null;

  const scoring: ScoringResult | null = result
    ? (scoringMode === "undervalued" ? calculateUndervaluedScore(result) : calculateScore(result))
    : null;

  const strategy = result && scoring
    ? (scoringMode === "undervalued"
      ? generateUndervaluedEntryStrategy(result, scoring)
      : generateEntryStrategy(result, scoring))
    : null;

  const changeColor = result
    ? result.preMarketChangePercent > 0 ? "var(--m-green)" : result.preMarketChangePercent < 0 ? "var(--m-high)" : "var(--m-text-muted)"
    : "var(--m-text-muted)";

  // 거래대금 계산
  // Calculate trading value
  const tradingValue = result ? result.preMarketPrice * result.preMarketVolume : 0;

  // 52주 범위 바 퍼센트 계산
  // Calculate 52-week range bar percentage
  const range52WeekPercent = result && result.has52WeekData && result.fiftyTwoWeekLow !== null && result.fiftyTwoWeekHigh !== null && result.fiftyTwoWeekHigh > result.fiftyTwoWeekLow
    ? ((result.preMarketPrice - result.fiftyTwoWeekLow) / (result.fiftyTwoWeekHigh - result.fiftyTwoWeekLow)) * 100
    : null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up p-2 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--m-card)", borderColor: "var(--m-border)" }}
      >
        {/* 닫기 버튼 / Close button */}
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          style={{ color: "var(--m-text-muted)" }}
        >
          <X size={16} />
        </button>

        {/* 제목 / Title */}
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--m-text)" }}>
          {t.searchButton}
        </h2>

        {/* 검색 입력 / Search input */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--m-text-muted)" }}
            />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="TSLA, NVDA, AAPL..."
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border"
              style={{
                background: "var(--m-bg)",
                borderColor: "var(--m-border)",
                color: "var(--m-text)",
              }}
              disabled={searching}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !input.trim()}
            className="px-5 py-2.5 text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            style={{
              background: "var(--m-accent)",
              color: "var(--m-bg)",
            }}
          >
            {searching ? "..." : t.searchButton}
          </button>
        </div>

        {/* 로딩 / Loading */}
        {searching && (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--m-accent)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* 에러 / Error */}
        {error && !searching && (
          <div className="py-6 text-center">
            <p className="text-sm" style={{ color: "var(--m-high)" }}>{error}</p>
          </div>
        )}

        {/* 결과 / Result */}
        {result && scoring && strategy && !searching && (
          <div>
            {/* 종목 헤더 / Stock header */}
            <div className="flex items-start justify-between mb-4 pb-3 border-b" style={{ borderColor: "var(--m-border)" }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" style={{ color: "var(--m-text)" }}>{result.symbol}</span>
                  <span
                    className="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                    style={{
                      background: "color-mix(in srgb, var(--m-green) 20%, transparent)",
                      color: "var(--m-green)",
                      borderColor: "color-mix(in srgb, var(--m-green) 40%, transparent)",
                    }}
                  >
                    LIVE
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--m-text-muted)" }}>{result.companyName}</p>
              </div>
              {/* 총점 원형 / Total score circle */}
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full text-white text-base font-bold"
                style={{
                  background: scoring.total / scoring.maxTotal >= 0.7 ? "var(--m-high)" : scoring.total / scoring.maxTotal >= 0.4 ? "var(--m-moderate-color)" : "var(--m-low-color)",
                }}
              >
                {scoring.total}/{scoring.maxTotal}
              </div>
            </div>

            {/* 2열 레이아웃 (데스크톱) / Two-column layout (desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* 좌측: 가격 정보 + 시그널 / Left: Price info + signal */}
              <div>
                {/* 가격 / Price */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold font-mono" style={{ color: "var(--m-text)" }}>
                      ${result.preMarketPrice.toFixed(2)}
                    </span>
                    <span className="text-lg font-bold font-mono" style={{ color: changeColor }}>
                      {result.preMarketChangePercent > 0 ? "+" : ""}{result.preMarketChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* 가격 상세 그리드 / Price detail grid */}
                <div
                  className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 rounded-lg mb-3"
                  style={{ background: "var(--m-card-inner)" }}
                >
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>{t.modalPrevClose}</p>
                    <p className="text-sm font-mono font-bold" style={{ color: "var(--m-text)" }}>${result.prevClose.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>{t.modalDayHigh}</p>
                    <p className="text-sm font-mono font-bold" style={{ color: "var(--m-text)" }}>${result.dayHigh.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>{t.modalDayLow}</p>
                    <p className="text-sm font-mono font-bold" style={{ color: "var(--m-text)" }}>${result.dayLow.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>{t.modalVolRatio}</p>
                    <p className="text-sm font-mono font-bold" style={{ color: "var(--m-text)" }}>{result.volumeRatio.toFixed(1)}x</p>
                  </div>
                </div>

                {/* 52주 범위 바 / 52-week range bar */}
                {result.has52WeekData && result.fiftyTwoWeekLow !== null && result.fiftyTwoWeekHigh !== null && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--m-text-muted)" }}>
                      <span>{t.modal52WeekLow}</span>
                      <span>{t.modal52WeekHigh}</span>
                    </div>
                    <div className="relative h-2 rounded-full" style={{ background: "var(--m-bar-bg)" }}>
                      {range52WeekPercent !== null && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
                          style={{
                            left: `clamp(0%, ${range52WeekPercent}%, 100%)`,
                            background: "var(--m-accent)",
                            borderColor: "var(--m-card)",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono mt-1" style={{ color: "var(--m-text)" }}>
                      <span>${result.fiftyTwoWeekLow.toFixed(2)}</span>
                      <span>${result.fiftyTwoWeekHigh.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* 시그널 / Signal */}
                <div
                  className="flex items-center gap-2 py-2 px-3 rounded-lg mb-3"
                  style={{ background: "var(--m-card-inner)" }}
                >
                  <span className="text-sm">
                    {scoring.signal === "HIGH" ? "🔥" : scoring.signal === "MODERATE" ? "⚡" : "💤"}
                  </span>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: scoring.signal === "HIGH" ? "var(--m-high)" : scoring.signal === "MODERATE" ? "var(--m-moderate-color)" : "var(--m-low-color)",
                    }}
                  >
                    {scoring.signal === "HIGH" ? t.highMomentum : scoring.signal === "MODERATE" ? t.moderate : t.low}
                  </span>
                </div>

                {/* 거래량 분석 / Volume analysis */}
                <div
                  className="p-3 rounded-lg mb-3"
                  style={{ background: "var(--m-card-inner)" }}
                >
                  <h4 className="text-xs font-bold mb-2" style={{ color: "var(--m-text)" }}>
                    {t.modalVolumeAnalysis}
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>{t.modalPreMarketVol}</p>
                      <p className="text-sm font-mono font-bold" style={{ color: "var(--m-text)" }}>{formatVolume(result.preMarketVolume)}</p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>{t.modalAvgVol}</p>
                      <p className="text-sm font-mono font-bold" style={{ color: "var(--m-text)" }}>{formatVolume(result.avgDailyVolume)}</p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>{t.modalVolRatio}</p>
                      <p className="text-sm font-mono font-bold" style={{ color: result.volumeRatio >= 2 ? "var(--m-green)" : "var(--m-text)" }}>
                        {result.volumeRatio.toFixed(1)}x
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>{t.criteriaTradingValue}</p>
                      <p className="text-sm font-mono font-bold" style={{ color: "var(--m-text)" }}>
                        {tradingValue >= 1_000_000 ? `$${(tradingValue / 1_000_000).toFixed(1)}M` : `$${(tradingValue / 1_000).toFixed(0)}K`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 진입 전략 / Entry strategy */}
                <div
                  className="p-3 rounded-lg"
                  style={{
                    background: "var(--m-card-inner)",
                    border: "1px solid var(--m-border-strategy, var(--m-border))",
                  }}
                >
                  <h4 className="text-xs font-bold mb-2" style={{ color: "var(--m-text)" }}>
                    {t.modalEntryStrategy}
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div>
                      <span style={{ color: "var(--m-text-muted)" }}>{t.entryZone}</span>
                    </div>
                    <div className="text-right font-mono font-bold" style={{ color: "var(--m-text)" }}>
                      {strategy.entryZone}
                    </div>
                    <div>
                      <span style={{ color: "var(--m-text-muted)" }}>{t.stopLoss}</span>
                    </div>
                    <div className="text-right font-mono font-bold" style={{ color: "var(--m-high)" }}>
                      {strategy.stopLoss}
                    </div>
                    <div>
                      <span style={{ color: "var(--m-text-muted)" }}>{t.target1}</span>
                    </div>
                    <div className="text-right font-mono font-bold" style={{ color: "var(--m-green)" }}>
                      {strategy.target1}
                    </div>
                    <div>
                      <span style={{ color: "var(--m-text-muted)" }}>{t.target2}</span>
                    </div>
                    <div className="text-right font-mono font-bold" style={{ color: "var(--m-green)" }}>
                      {strategy.target2}
                    </div>
                    <div>
                      <span style={{ color: "var(--m-text-muted)" }}>{t.riskReward}</span>
                    </div>
                    <div className="text-right font-mono font-bold" style={{ color: "var(--m-accent)" }}>
                      {strategy.riskReward}
                    </div>
                  </div>
                  <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--m-text-muted)" }}>
                    {strategy.notes}
                  </p>
                </div>
              </div>

              {/* 우측: 스코어링 기준 바 / Right: Scoring criteria bars */}
              <div>
                <h4 className="text-xs font-bold mb-2" style={{ color: "var(--m-text)" }}>
                  {t.modalScoreDetail}
                </h4>
                {scoring.criteria.map((criterion, index) => (
                  <ScoreCriteriaBar key={index} criterion={criterion} />
                ))}
              </div>
            </div>

            {/* 촉매 / Catalysts */}
            {result.catalysts.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-bold mb-1" style={{ color: "var(--m-moderate-color)" }}>
                  {t.modalCatalysts}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.catalysts.map((c, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[10px] rounded-full border"
                      style={{
                        background: "color-mix(in srgb, var(--m-moderate-color) 10%, transparent)",
                        color: "var(--m-moderate-color)",
                        borderColor: "color-mix(in srgb, var(--m-moderate-color) 20%, transparent)",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 면책 조항 / Disclaimer */}
            <p className="text-[10px] text-center" style={{ color: "var(--m-text-dim, var(--m-text-muted))" }}>
              {t.modalDisclaimerFooter}
            </p>
          </div>
        )}

        {/* 빈 상태 / Empty state */}
        {!result && !error && !searching && (
          <div className="py-8 text-center">
            <Search size={32} style={{ color: "var(--m-text-muted)", margin: "0 auto", marginBottom: 8 }} />
            <p className="text-sm" style={{ color: "var(--m-text-muted)" }}>
              {t.searchPlaceholder}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
