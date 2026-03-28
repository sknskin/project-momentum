// SNS 화제 종목 스크리너 API 라우트 (Yahoo Finance 트렌딩 기반)
// SNS Trending stocks screener API route (based on Yahoo Finance trending)

import { TickerData, ScreenerApiResponse } from "@/lib/types";
import {
  SCREENER_URLS,
  TRENDING_URL,
  SCREENER_MAX_TICKERS,
} from "@/lib/constants";
import {
  fetchYahooChart,
  fetchYahooScreener,
  extractSymbolsFromScreener,
  extractSymbolsFromTrending,
} from "@/lib/yahooFinance";

/**
 * 트렌딩/화제 종목 심볼을 수집 (Yahoo Finance 트렌딩 우선)
 * Collect trending stock symbols (Yahoo Finance trending first)
 */
async function collectTrendingSymbols(): Promise<{ symbols: string[]; source: string }> {
  const allSymbols: string[] = [];
  let source = "";

  // 트렌딩 엔드포인트 우선 시도 (대중 관심 프록시)
  // Try trending endpoint first (public interest proxy)
  try {
    console.log("[trending] Trying: Yahoo Finance Trending US");
    const data = await fetchYahooScreener(TRENDING_URL);
    const symbols = extractSymbolsFromTrending(data);

    if (symbols.length > 0) {
      console.log(`[trending] Trending US: found ${symbols.length} symbols`);
      allSymbols.push(...symbols);
      source = "Yahoo Finance Trending US";
    }
  } catch (err) {
    console.warn("[trending] Trending US failed:", err);
  }

  // 프리마켓 활성 종목도 추가 (소셜 관심과 겹치는 경우 많음)
  // Also add pre-market actives (often overlaps with social interest)
  for (const screener of SCREENER_URLS) {
    try {
      console.log(`[trending] Trying: ${screener.label}`);
      const data = await fetchYahooScreener(screener.url);
      const symbols = extractSymbolsFromScreener(data);

      if (symbols.length > 0) {
        console.log(`[trending] ${screener.label}: found ${symbols.length} symbols`);
        allSymbols.push(...symbols);
        if (!source) {
          source = screener.label;
        }
      }
    } catch (err) {
      console.warn(`[trending] ${screener.label} failed:`, err);
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

export async function GET() {
  try {
    const { symbols, source } = await collectTrendingSymbols();

    if (symbols.length === 0) {
      const errorResponse: ScreenerApiResponse = {
        success: false,
        error: "현재 화제 종목을 가져올 수 없습니다. 잠시 후 다시 시도해주세요.",
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

    console.log(`[trending] Successfully fetched ${tickerDataList.length}/${symbols.length} tickers from ${source}`);

    const successResponse: ScreenerApiResponse = {
      success: true,
      data: tickerDataList,
      source,
    };

    return Response.json(successResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[trending] Unexpected error:", message);

    const errorResponse: ScreenerApiResponse = {
      success: false,
      error: "현재 화제 종목을 가져올 수 없습니다. 잠시 후 다시 시도해주세요.",
    };
    return Response.json(errorResponse, { status: 500 });
  }
}
