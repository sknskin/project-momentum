// 저평가 종목 스크리너 API 라우트
// Undervalued stocks screener API route

import { TickerData, ScreenerApiResponse } from "@/lib/types";
import {
  UNDERVALUED_SCREENER_URLS,
  YAHOO_USER_AGENT,
  YAHOO_FINANCE_BASE_URL,
  SCREENER_MAX_TICKERS,
} from "@/lib/constants";

/**
 * Yahoo Finance 스크리너 응답에서 티커 심볼 추출
 * Extract ticker symbols from Yahoo Finance screener response
 */
function extractSymbolsFromScreener(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): string[] {
  try {
    // 스크리너 응답 구조: finance.result[0].quotes[].symbol
    // Screener response structure: finance.result[0].quotes[].symbol
    const quotes = data?.finance?.result?.[0]?.quotes;
    if (Array.isArray(quotes)) {
      return quotes
        .map((q: { symbol?: string }) => q.symbol)
        .filter((s: string | undefined): s is string => typeof s === "string" && s.length > 0);
    }
  } catch (err) {
    console.error("[undervalued/extractSymbolsFromScreener] Parse error:", err);
  }
  return [];
}

/**
 * Yahoo Finance 차트 API로 개별 종목 데이터 조회
 * Fetch individual stock data via Yahoo Finance chart API
 */
async function fetchStockData(symbol: string): Promise<TickerData> {
  const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}?interval=1m&range=1d`;

  const response = await fetch(url, {
    headers: { "User-Agent": YAHOO_USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API returned ${response.status} for ${symbol}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yahooData: Record<string, any> = await response.json();
  return extractTickerData(symbol, yahooData);
}

/**
 * Yahoo Finance 응답에서 주식 데이터를 추출
 * Extracts stock data from Yahoo Finance response
 */
function extractTickerData(
  symbol: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yahooData: Record<string, any>
): TickerData {
  const result = yahooData?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart result found for ${symbol}`);
  }

  const meta = result.meta;
  const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? 0;
  const regularMarketPrice = meta?.regularMarketPrice ?? prevClose;

  // 프리마켓 가격은 별도 필드에서 추출 시도
  // Try to extract pre-market price from dedicated fields
  const preMarketPrice =
    meta?.preMarketPrice ?? regularMarketPrice ?? prevClose;

  const preMarketChange = parseFloat(
    (preMarketPrice - prevClose).toFixed(2)
  );
  const preMarketChangePercent =
    prevClose > 0
      ? parseFloat(((preMarketChange / prevClose) * 100).toFixed(2))
      : 0;

  // 거래량 정보 추출
  // Extract volume information
  const indicators = result.indicators?.quote?.[0];
  const volumes: number[] = indicators?.volume?.filter(
    (v: number | null) => v !== null
  ) ?? [];
  const preMarketVolume = volumes.reduce(
    (sum: number, v: number) => sum + v,
    0
  );

  const avgDailyVolume =
    meta?.averageDailyVolume10Day ?? meta?.averageDailyVolume3Month ?? 10_000_000;

  const volumeRatio =
    avgDailyVolume > 0
      ? parseFloat((preMarketVolume / (avgDailyVolume * 0.05)).toFixed(2))
      : 0;

  // 고가/저가 추출
  // Extract high/low
  const highs: number[] = indicators?.high?.filter(
    (h: number | null) => h !== null
  ) ?? [];
  const lows: number[] = indicators?.low?.filter(
    (l: number | null) => l !== null
  ) ?? [];

  const dayHigh =
    highs.length > 0 ? Math.max(...highs) : preMarketPrice;
  const dayLow =
    lows.length > 0 ? Math.min(...lows) : preMarketPrice;

  const fiftyTwoWeekHigh = meta?.fiftyTwoWeekHigh ?? preMarketPrice * 1.3;
  const fiftyTwoWeekLow = meta?.fiftyTwoWeekLow ?? preMarketPrice * 0.6;

  // 촉매 이벤트
  // Catalyst events
  const catalysts: string[] = [];
  if (Math.abs(preMarketChangePercent) > 3) {
    catalysts.push("Significant price movement detected");
  }
  if (volumeRatio > 2) {
    catalysts.push("Unusual volume activity");
  }

  // 52주 최저가 근접 시 촉매 추가
  // Add catalyst if near 52-week low
  const distFromLow = fiftyTwoWeekLow > 0
    ? ((preMarketPrice - fiftyTwoWeekLow) / fiftyTwoWeekLow) * 100
    : 100;
  if (distFromLow <= 15) {
    catalysts.push("Near 52-week low — potential undervalue");
  }

  return {
    symbol: symbol.toUpperCase(),
    companyName: meta?.shortName ?? meta?.longName ?? `${symbol.toUpperCase()}`,
    prevClose,
    preMarketPrice,
    preMarketChange,
    preMarketChangePercent,
    preMarketVolume,
    avgDailyVolume,
    volumeRatio,
    dayHigh,
    dayLow,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    catalysts,
    isLive: true,
  };
}

/**
 * 저평가 가능성이 높은 종목의 심볼을 수집
 * Collect symbols of potentially undervalued stocks
 */
async function collectUndervaluedSymbols(): Promise<{ symbols: string[]; source: string }> {
  const allSymbols: string[] = [];
  let source = "";

  // most_actives + day_gainers 스크리너 엔드포인트 시도
  // Try most_actives + day_gainers screener endpoints
  for (const screener of UNDERVALUED_SCREENER_URLS) {
    try {
      console.log(`[undervalued] Trying: ${screener.label}`);
      const response = await fetch(screener.url, {
        headers: { "User-Agent": YAHOO_USER_AGENT },
        cache: "no-store",
      });

      if (!response.ok) {
        console.warn(`[undervalued] ${screener.label} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const symbols = extractSymbolsFromScreener(data);

      if (symbols.length > 0) {
        console.log(`[undervalued] ${screener.label}: found ${symbols.length} symbols`);
        allSymbols.push(...symbols);
        if (!source) {
          source = screener.label;
        }
      }
    } catch (err) {
      console.warn(`[undervalued] ${screener.label} failed:`, err);
    }
  }

  // 중복 제거 및 최대 개수 제한
  // Deduplicate and limit count
  const uniqueSymbols = [...new Set(allSymbols)].slice(0, SCREENER_MAX_TICKERS);

  return {
    symbols: uniqueSymbols,
    source: source || "Unknown",
  };
}

/**
 * 저평가 점수 계산 (서버 사이드에서 정렬용)
 * Calculate undervalue score for server-side sorting
 */
function calculateUndervalueRank(data: TickerData): number {
  let score = 0;

  // 52주 최저가 근접도 (가까울수록 높은 점수)
  // 52-week low proximity (closer = higher)
  const distFromLow = data.fiftyTwoWeekLow > 0
    ? ((data.preMarketPrice - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100
    : 100;
  if (distFromLow <= 10) score += 3;
  else if (distFromLow <= 25) score += 2;
  else if (distFromLow <= 50) score += 1;

  // 52주 최고가 갭 (클수록 높은 점수)
  // 52-week high gap (larger = higher)
  const gapFromHigh = data.fiftyTwoWeekHigh > 0
    ? ((data.fiftyTwoWeekHigh - data.preMarketPrice) / data.fiftyTwoWeekHigh) * 100
    : 0;
  if (gapFromHigh >= 40) score += 3;
  else if (gapFromHigh >= 20) score += 2;
  else if (gapFromHigh >= 10) score += 1;

  // 거래량 급증 (높을수록 매집 가능성)
  // Volume surge (higher = accumulation potential)
  if (data.volumeRatio >= 2) score += 2;
  else if (data.volumeRatio >= 1) score += 1;

  // 양의 변동률 (반등 가능성)
  // Positive change (recovery potential)
  if (data.preMarketChangePercent > 0) score += 1;

  return score;
}

export async function GET() {
  try {
    const { symbols, source } = await collectUndervaluedSymbols();

    if (symbols.length === 0) {
      const errorResponse: ScreenerApiResponse = {
        success: false,
        error: "현재 저평가 종목을 가져올 수 없습니다. 잠시 후 다시 시도해주세요.",
      };
      return Response.json(errorResponse, { status: 502 });
    }

    // 각 심볼에 대해 개별 주식 데이터 조회
    // Fetch individual stock data for each symbol
    const results = await Promise.allSettled(
      symbols.map((symbol) => fetchStockData(symbol))
    );

    const tickerDataList: TickerData[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        tickerDataList.push(result.value);
      }
    }

    if (tickerDataList.length === 0) {
      const errorResponse: ScreenerApiResponse = {
        success: false,
        error: "종목 심볼은 찾았으나 상세 데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.",
      };
      return Response.json(errorResponse, { status: 502 });
    }

    // 저평가 점수 기준으로 정렬 (높은 점수 우선)
    // Sort by undervalue score (highest first)
    tickerDataList.sort((a, b) => calculateUndervalueRank(b) - calculateUndervalueRank(a));

    console.log(`[undervalued] Successfully fetched ${tickerDataList.length}/${symbols.length} tickers from ${source}`);

    const successResponse: ScreenerApiResponse = {
      success: true,
      data: tickerDataList,
      source,
    };

    return Response.json(successResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[undervalued] Unexpected error:", message);

    const errorResponse: ScreenerApiResponse = {
      success: false,
      error: "현재 저평가 종목을 가져올 수 없습니다. 잠시 후 다시 시도해주세요.",
    };
    return Response.json(errorResponse, { status: 500 });
  }
}
