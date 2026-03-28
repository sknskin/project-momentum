// SNS 화제 종목 스크리너 API 라우트 (Yahoo Finance 트렌딩 기반)
// SNS Trending stocks screener API route (based on Yahoo Finance trending)

import { TickerData, ScreenerApiResponse } from "@/lib/types";
import {
  SCREENER_URLS,
  TRENDING_URL,
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
    console.error("[trending/extractSymbolsFromScreener] Parse error:", err);
  }
  return [];
}

/**
 * Yahoo Finance 트렌딩 응답에서 티커 심볼 추출
 * Extract ticker symbols from Yahoo Finance trending response
 */
function extractSymbolsFromTrending(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): string[] {
  try {
    // 트렌딩 응답 구조: finance.result[0].quotes[].symbol
    // Trending response structure: finance.result[0].quotes[].symbol
    const results = data?.finance?.result;
    if (Array.isArray(results)) {
      const symbols: string[] = [];
      for (const group of results) {
        const quotes = group?.quotes;
        if (Array.isArray(quotes)) {
          for (const q of quotes) {
            if (typeof q?.symbol === "string" && q.symbol.length > 0) {
              symbols.push(q.symbol);
            }
          }
        }
      }
      return symbols;
    }
  } catch (err) {
    console.error("[trending/extractSymbolsFromTrending] Parse error:", err);
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
    catalysts.push("Significant pre-market movement detected");
  }
  if (volumeRatio > 2) {
    catalysts.push("Unusual volume activity");
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
    const response = await fetch(TRENDING_URL, {
      headers: { "User-Agent": YAHOO_USER_AGENT },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      const symbols = extractSymbolsFromTrending(data);

      if (symbols.length > 0) {
        console.log(`[trending] Trending US: found ${symbols.length} symbols`);
        allSymbols.push(...symbols);
        source = "Yahoo Finance Trending US";
      }
    }
  } catch (err) {
    console.warn("[trending] Trending US failed:", err);
  }

  // 프리마켓 활성 종목도 추가 (소셜 관심과 겹치는 경우 많음)
  // Also add pre-market actives (often overlaps with social interest)
  for (const screener of SCREENER_URLS) {
    try {
      console.log(`[trending] Trying: ${screener.label}`);
      const response = await fetch(screener.url, {
        headers: { "User-Agent": YAHOO_USER_AGENT },
        cache: "no-store",
      });

      if (!response.ok) {
        console.warn(`[trending] ${screener.label} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
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
