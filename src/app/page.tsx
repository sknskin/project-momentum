"use client";

// 메인 스캐너 UI 페이지 — 저평가 종목 / SNS 화제 종목 탭 구성
// Main scanner UI page — Undervalued / SNS Trending tabs

import { Suspense, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TickerData, ScreenerApiResponse, StockApiResponse } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import TickerCard from "@/components/TickerCard";
import TickerCardSkeleton from "@/components/TickerCardSkeleton";
import ErrorBoundary from "@/components/ErrorBoundary";
import StockDetailModal from "@/components/StockDetailModal";
import MarketSessionBadge from "@/components/MarketSessionBadge";
import RefreshCountdown from "@/components/RefreshCountdown";
import { calculateScore, generateEntryStrategy } from "@/lib/scoring";
import { calculateUndervaluedScore, generateUndervaluedEntryStrategy } from "@/lib/scoringUndervalued";

/** 탭 타입 / Tab type */
type TabType = "undervalued" | "trending";

/** 정렬 키 타입 / Sort key type */
type SortKey = "score" | "change" | "volume" | "tradingValue";

/** 유효한 탭 값 상수 / Valid tab value constants */
const VALID_TABS: TabType[] = ["undervalued", "trending"];
const DEFAULT_TAB: TabType = "undervalued";

/** 탭별 API 경로 / API path per tab */
const TAB_API_MAP: Record<TabType, string> = {
  undervalued: "/api/screener/undervalued",
  trending: "/api/screener/trending",
};

/** 스켈레톤 카드 수 / Number of skeleton cards */
const SKELETON_COUNT = 6;

/**
 * 페이지 래퍼 — useSearchParams를 위한 Suspense 경계 제공
 * Page wrapper — provides Suspense boundary for useSearchParams
 */
export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageContent />
    </Suspense>
  );
}

/**
 * 로딩 폴백 UI
 * Loading fallback UI
 */
function HomePageFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--m-bg)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--m-accent)", borderTopColor: "transparent" }}
        />
      </div>
    </div>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL에서 탭 상태 읽기
  // Read tab state from URL
  const tabParam = searchParams.get("tab") as TabType | null;
  const activeTab: TabType =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : DEFAULT_TAB;

  // 탭별 데이터 상태
  // Per-tab data state
  const [undervaluedTickers, setUndervaluedTickers] = useState<TickerData[]>([]);
  const [trendingTickers, setTrendingTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undervaluedSource, setUndervaluedSource] = useState<string | null>(null);
  const [trendingSource, setTrendingSource] = useState<string | null>(null);

  // #15: 에러 배너 상태 (이전 데이터를 유지하면서 에러 표시)
  // #15: Error banner state (show error while keeping previous data)
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // #6: 정렬 키 상태
  // #6: Sort key state
  const [sortKey, setSortKey] = useState<SortKey>("score");

  // #7: 검색 입력 상태
  // #7: Search input state
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);

  // 선택된 종목 (모달 표시용)
  // Selected ticker (for modal display)
  const [selectedTicker, setSelectedTicker] = useState<TickerData | null>(null);

  const { t, toggleLanguage, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // 초기 로드 여부 추적 (중복 호출 방지)
  // Track initial load to prevent duplicate calls
  const hasFetchedRef = useRef<Record<TabType, boolean>>({
    undervalued: false,
    trending: false,
  });

  /**
   * 탭 전환 핸들러 — URL 파라미터 업데이트
   * Tab switch handler — updates URL param
   */
  const switchTab = useCallback(
    (tab: TabType) => {
      router.push(`?tab=${tab}`, { scroll: false });
    },
    [router]
  );

  /**
   * 현재 활성 탭의 티커/소스/세터 반환
   * Returns current active tab's tickers, source, and setters
   */
  const getActiveTabState = useCallback(() => {
    if (activeTab === "undervalued") {
      return {
        tickers: undervaluedTickers,
        source: undervaluedSource,
        setTickers: setUndervaluedTickers,
        setSource: setUndervaluedSource,
      };
    }
    return {
      tickers: trendingTickers,
      source: trendingSource,
      setTickers: setTrendingTickers,
      setSource: setTrendingSource,
    };
  }, [activeTab, undervaluedTickers, undervaluedSource, trendingTickers, trendingSource]);

  /**
   * 특정 탭의 스크리너 API를 호출
   * Fetch screener API for a specific tab
   */
  const fetchTabData = useCallback(
    async (tab: TabType): Promise<void> => {
      setLoading(true);
      setError(null);
      setErrorBanner(null);

      const apiPath = TAB_API_MAP[tab];
      const setTickers = tab === "undervalued" ? setUndervaluedTickers : setTrendingTickers;
      const setSource = tab === "undervalued" ? setUndervaluedSource : setTrendingSource;
      const currentTickers = tab === "undervalued" ? undervaluedTickers : trendingTickers;

      try {
        const response = await fetch(apiPath);
        const data = (await response.json()) as ScreenerApiResponse;

        if (!response.ok || !data.success) {
          const errorMsg =
            "error" in data ? data.error : t.cannotFetchHotStocks;

          // #15: 이전 데이터가 있으면 배너로 에러 표시, 데이터 유지
          // #15: If previous data exists, show error as banner and keep data
          if (currentTickers.length > 0) {
            setErrorBanner(errorMsg);
          } else {
            setError(errorMsg);
          }
          return;
        }

        setTickers(data.data);
        setSource(data.source);
      } catch (err) {
        console.error(`[fetchTabData:${tab}] Unexpected error:`, err);
        const errorMsg = t.cannotFetchHotStocks;

        // #15: 이전 데이터가 있으면 배너로 에러 표시
        // #15: If previous data exists, show error as banner
        if (currentTickers.length > 0) {
          setErrorBanner(errorMsg);
        } else {
          setError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    },
    [t.cannotFetchHotStocks, undervaluedTickers, trendingTickers]
  );

  // 탭 변경 시 데이터 미로드 상태이면 자동 fetch
  // Auto-fetch on tab change if data not yet loaded
  useEffect(() => {
    if (!hasFetchedRef.current[activeTab]) {
      hasFetchedRef.current[activeTab] = true;
      fetchTabData(activeTab);
    }
  }, [activeTab, fetchTabData]);

  /**
   * Scan Now 버튼 핸들러
   * Scan Now button handler
   */
  const handleScanNow = useCallback(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  /**
   * 자동 새로고침 핸들러 (활성 탭만)
   * Auto-refresh handler (active tab only)
   */
  const handleRefresh = useCallback(() => {
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  /**
   * #7: 수동 검색 핸들러
   * #7: Manual search handler
   */
  const handleSearch = useCallback(async () => {
    const symbol = searchInput.trim().toUpperCase();
    if (!symbol) return;

    setSearching(true);
    try {
      const response = await fetch(`/api/stock/${symbol}`);
      const data = (await response.json()) as StockApiResponse;

      if (data.success && data.data) {
        // 현재 활성 탭의 세터를 사용하여 결과를 맨 위에 추가
        // Add result to top of current active tab
        const setTickers = activeTab === "undervalued" ? setUndervaluedTickers : setTrendingTickers;
        setTickers((prev) => {
          // 이미 있는 종목이면 중복 추가하지 않음
          // Skip if already in list
          const exists = prev.some((t) => t.symbol === data.data.symbol);
          if (exists) return prev;
          return [data.data, ...prev];
        });
        setSearchInput("");
      } else {
        const errorMsg = data.error ?? `${symbol} 데이터를 가져올 수 없습니다`;
        setErrorBanner(errorMsg);
      }
    } catch (err) {
      console.error("[handleSearch] Unexpected error:", err);
      setErrorBanner(t.cannotFetchHotStocks);
    } finally {
      setSearching(false);
    }
  }, [searchInput, activeTab, t.cannotFetchHotStocks]);

  // 현재 탭의 데이터
  // Current tab data
  const { tickers, source } = getActiveTabState();

  // #6: 정렬된 티커 목록 (useMemo)
  // #6: Sorted tickers list (useMemo)
  const sortedTickers = useMemo(() => {
    if (tickers.length === 0) return tickers;

    const sorted = [...tickers];
    switch (sortKey) {
      case "score":
        sorted.sort((a, b) => {
          const scoreA = activeTab === "undervalued"
            ? calculateUndervaluedScore(a).total
            : calculateScore(a).total;
          const scoreB = activeTab === "undervalued"
            ? calculateUndervaluedScore(b).total
            : calculateScore(b).total;
          return scoreB - scoreA;
        });
        break;
      case "change":
        sorted.sort((a, b) => Math.abs(b.preMarketChangePercent) - Math.abs(a.preMarketChangePercent));
        break;
      case "volume":
        sorted.sort((a, b) => b.preMarketVolume - a.preMarketVolume);
        break;
      case "tradingValue":
        sorted.sort((a, b) =>
          (b.preMarketPrice * b.preMarketVolume) - (a.preMarketPrice * a.preMarketVolume)
        );
        break;
    }
    return sorted;
  }, [tickers, sortKey, activeTab]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--m-bg)" }}
      suppressHydrationWarning
    >
      {/* 헤더 영역 / Header area */}
      <header
        className="sticky top-0 z-10 backdrop-blur-sm border-b"
        style={{
          background: "color-mix(in srgb, var(--m-bg) 95%, transparent)",
          borderColor: "var(--m-card)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* 제목 행: 앱 이름 + 세션 배지 + 토글 + 카운트다운 */}
          {/* Title row: App name + session badge + toggles + countdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h1
                className="text-xl md:text-2xl font-bold"
                style={{ color: "var(--m-text)" }}
              >
                {t.appTitle}
              </h1>
              <MarketSessionBadge />
            </div>
            <div className="flex items-center gap-2">
              {/* 테마 토글 버튼 / Theme toggle button */}
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 text-xs font-bold rounded-full border transition-colors cursor-pointer"
                style={{
                  background: "var(--m-card)",
                  borderColor: "var(--m-border)",
                  color: "var(--m-text)",
                }}
                title={t.themeToggle}
                aria-label={t.themeToggle}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              {/* 언어 토글 버튼 / Language toggle button */}
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 text-xs font-bold rounded-full border transition-colors cursor-pointer"
                style={{
                  background: "var(--m-card)",
                  borderColor: "var(--m-border)",
                  color: "var(--m-accent)",
                }}
                title={language === "ko" ? "Switch to English" : "한국어로 전환"}
                aria-label={language === "ko" ? "Switch to English" : "한국어로 전환"}
              >
                {t.langToggle}
              </button>

              <RefreshCountdown onRefresh={handleRefresh} />
            </div>
          </div>

          {/* 탭 바 / Tab bar */}
          <div className="flex gap-0 mb-4 border-b" style={{ borderColor: "var(--m-border)" }}>
            <button
              onClick={() => switchTab("undervalued")}
              className="px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer relative"
              style={{
                color: activeTab === "undervalued" ? "var(--m-accent)" : "var(--m-text-muted)",
                background: "transparent",
              }}
            >
              {t.tabUndervalued}
              {/* 활성 탭 밑줄 / Active tab underline */}
              {activeTab === "undervalued" && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "var(--m-accent)" }}
                />
              )}
            </button>
            <button
              onClick={() => switchTab("trending")}
              className="px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer relative"
              style={{
                color: activeTab === "trending" ? "var(--m-accent)" : "var(--m-text-muted)",
                background: "transparent",
              }}
            >
              {t.tabTrending}
              {/* 활성 탭 밑줄 / Active tab underline */}
              {activeTab === "trending" && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "var(--m-accent)" }}
                />
              )}
            </button>
          </div>

          {/* Scan Now 버튼 + 데이터 소스 배지 + 종목 수 */}
          {/* Scan Now button + data source badge + stock count */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleScanNow}
              disabled={loading}
              className="px-8 py-3 font-bold text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              style={{
                background: "var(--m-accent)",
                color: "var(--m-bg)",
              }}
            >
              {loading ? t.scanning : t.scanNow}
            </button>

            {/* #6: 정렬 드롭다운 / Sort dropdown */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-3 py-2 text-xs font-bold rounded-lg border cursor-pointer"
              style={{
                background: "var(--m-card)",
                borderColor: "var(--m-border)",
                color: "var(--m-text)",
              }}
            >
              <option value="score">{t.sortByScore}</option>
              <option value="change">{t.sortByChange}</option>
              <option value="volume">{t.sortByVolume}</option>
              <option value="tradingValue">{t.sortByTradingValue}</option>
            </select>

            {/* 데이터 소스 배지 / Data source badge */}
            {source && !loading && (
              <span
                className="px-3 py-1.5 text-xs font-medium rounded-full border"
                style={{
                  background: "var(--m-card)",
                  color: "var(--m-accent)",
                  borderColor: "color-mix(in srgb, var(--m-accent) 30%, transparent)",
                }}
              >
                {t.source} {source}
              </span>
            )}

            {/* 종목 수 표시 / Stock count display */}
            {tickers.length > 0 && !loading && (
              <span className="text-sm" style={{ color: "var(--m-text-muted)" }}>
                {t.foundHotStocks(tickers.length)}
              </span>
            )}
          </div>

          {/* #7: 수동 종목 검색 / Manual ticker search */}
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder={t.searchPlaceholder}
              className="flex-1 max-w-xs px-3 py-2 text-sm rounded-lg border"
              style={{
                background: "var(--m-card)",
                borderColor: "var(--m-border)",
                color: "var(--m-text)",
              }}
              disabled={searching}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchInput.trim()}
              className="px-4 py-2 text-sm font-bold rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              style={{
                background: "var(--m-card)",
                borderColor: "var(--m-accent)",
                color: "var(--m-accent)",
              }}
            >
              {searching ? "..." : t.searchButton}
            </button>
          </div>

          {/* #13: 탭별 안내 문구 (수정: 이전에 뒤바뀌어 있었음) */}
          {/* #13: Per-tab notice (fix: was previously swapped) */}
          <p className="mt-2 text-[10px]" style={{ color: "var(--m-moderate-color)" }}>
            {activeTab === "trending" ? t.trendingNotice : t.socialBuzzNotice}
          </p>
        </div>
      </header>

      {/* 메인 콘텐츠: 종목 카드 그리드 */}
      {/* Main content: Ticker card grid */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        {/* #15: 에러 배너 (이전 데이터 위에 표시) */}
        {/* #15: Error banner (shown above existing results) */}
        {errorBanner && (
          <div
            className="mb-4 p-3 rounded-lg border flex items-center justify-between"
            style={{
              background: "color-mix(in srgb, var(--m-moderate-color) 10%, transparent)",
              borderColor: "color-mix(in srgb, var(--m-moderate-color) 30%, transparent)",
            }}
          >
            <p className="text-xs" style={{ color: "var(--m-moderate-color)" }}>
              {errorBanner}
            </p>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-xs font-bold ml-3 cursor-pointer"
              style={{ color: "var(--m-text-muted)" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* #14: 스켈레톤 로딩 UI (초기 로드 시) */}
        {/* #14: Skeleton loading UI (during initial load) */}
        {loading && tickers.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <TickerCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* 에러 상태 (데이터가 없는 경우만) */}
        {/* Error state (only when no data) */}
        {error && !loading && tickers.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <p className="text-4xl mb-4">⚠️</p>
              <p
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--m-high)" }}
              >
                {error}
              </p>
              <p className="text-sm mb-6" style={{ color: "var(--m-text-muted)" }}>
                {t.apiOrNetworkError}
              </p>
              <button
                onClick={handleScanNow}
                className="px-6 py-2.5 font-bold text-sm rounded-lg transition-colors cursor-pointer"
                style={{
                  background: "var(--m-accent)",
                  color: "var(--m-bg)",
                }}
              >
                {t.retry}
              </button>
            </div>
          </div>
        )}

        {/* 빈 상태 (에러 없이 데이터도 없는 경우) */}
        {/* Empty state (no error and no data) */}
        {!loading && !error && tickers.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-4xl mb-4">📈</p>
              <p className="text-lg" style={{ color: "var(--m-text-muted)" }}>
                {t.pressScanNow}
              </p>
            </div>
          </div>
        )}

        {/* 종목 카드 그리드 (데스크톱 2열, 모바일 1열) */}
        {/* Ticker card grid (2-col desktop, 1-col mobile) */}
        {sortedTickers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedTickers.map((ticker) => (
              <ErrorBoundary key={ticker.symbol}>
                <TickerCard
                  data={ticker}
                  scoringMode={activeTab === "undervalued" ? "undervalued" : "trending"}
                  onClick={setSelectedTicker}
                />
              </ErrorBoundary>
            ))}
          </div>
        )}
      </main>

      {/* 종목 상세 모달 / Stock detail modal */}
      {selectedTicker && (() => {
        const mode = activeTab === "undervalued" ? "undervalued" : "trending";
        const modalScoring = mode === "undervalued"
          ? calculateUndervaluedScore(selectedTicker)
          : calculateScore(selectedTicker);
        const modalStrategy = mode === "undervalued"
          ? generateUndervaluedEntryStrategy(selectedTicker, modalScoring)
          : generateEntryStrategy(selectedTicker, modalScoring);

        return (
          <StockDetailModal
            data={selectedTicker}
            scoring={modalScoring}
            strategy={modalStrategy}
            scoringMode={mode}
            onClose={() => setSelectedTicker(null)}
          />
        );
      })()}

      {/* 하단 면책 조항 배너 / Bottom risk disclaimer banner */}
      <footer
        className="mt-auto border-t"
        style={{ borderColor: "var(--m-card)" }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div
            className="p-3 rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--m-high) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--m-high) 20%, transparent)",
            }}
          >
            <p
              className="text-xs font-bold mb-1"
              style={{ color: "var(--m-high)" }}
            >
              {t.riskDisclaimer}
            </p>
            <p
              className="text-[10px] leading-relaxed"
              style={{ color: "color-mix(in srgb, var(--m-high) 70%, var(--m-text-muted))" }}
            >
              {t.disclaimerText}
            </p>
          </div>
          <p
            className="text-center text-[10px] mt-3"
            style={{ color: "var(--m-text-dim)" }}
          >
            {t.appTitle} &copy; {new Date().getFullYear()} | {t.notFinancialAdvice}
          </p>
        </div>
      </footer>
    </div>
  );
}
