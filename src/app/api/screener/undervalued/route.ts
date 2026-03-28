// 저평가 종목 스크리너 API 라우트
// Undervalued stocks screener API route

import { TickerData, ScreenerApiResponse } from "@/lib/types";
import {
  UNDERVALUED_SCREENER_URLS,
  UNDERVALUED_FALLBACK_URLS,
  SCREENER_MAX_TICKERS,
} from "@/lib/constants";
import {
  fetchYahooScreener,
  extractSymbolsFromScreener,
  fetchYahooChart,
} from "@/lib/yahooFinance";

/**
 * 저평가 가능성이 높은 종목의 심볼을 수집
 * Collect symbols of potentially undervalued stocks
 */
async function collectUndervaluedSymbols(): Promise<{ symbols: string[]; source: string }> {
  const allSymbols: string[] = [];
  let source = "";

  // 저평가 스크리너 URL 우선 시도
  // Try undervalued screener URLs first
  for (const screener of UNDERVALUED_SCREENER_URLS) {
    try {
      console.log(`[undervalued] Trying: ${screener.label}`);
      const data = await fetchYahooScreener(screener.url);
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

  // 저평가 스크리너에서 결과가 없으면 폴백 URL 시도
  // If no results from undervalued screeners, try fallback URLs
  if (allSymbols.length === 0) {
    console.log("[undervalued] No results from undervalued screeners, trying fallbacks...");
    for (const screener of UNDERVALUED_FALLBACK_URLS) {
      try {
        console.log(`[undervalued] Trying fallback: ${screener.label}`);
        const data = await fetchYahooScreener(screener.url);
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
  if (data.fiftyTwoWeekLow !== null && data.fiftyTwoWeekLow > 0) {
    const distFromLow = ((data.preMarketPrice - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100;
    if (distFromLow <= 10) score += 3;
    else if (distFromLow <= 25) score += 2;
    else if (distFromLow <= 50) score += 1;
  }

  // 52주 최고가 갭 (클수록 높은 점수)
  // 52-week high gap (larger = higher)
  if (data.fiftyTwoWeekHigh !== null && data.fiftyTwoWeekHigh > 0) {
    const gapFromHigh = ((data.fiftyTwoWeekHigh - data.preMarketPrice) / data.fiftyTwoWeekHigh) * 100;
    if (gapFromHigh >= 40) score += 3;
    else if (gapFromHigh >= 20) score += 2;
    else if (gapFromHigh >= 10) score += 1;
  }

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
      symbols.map((symbol) => fetchYahooChart(symbol))
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
