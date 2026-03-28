// Yahoo Finance 프록시 API 라우트
// Yahoo Finance proxy API route

import { NextRequest } from "next/server";
import { TickerData, StockApiResponse } from "@/lib/types";
import { YAHOO_FINANCE_BASE_URL, YAHOO_USER_AGENT } from "@/lib/constants";

/**
 * Yahoo Finance 응답에서 주식 데이터를 추출
 * Extracts stock data from Yahoo Finance response
 */
function extractTickerData(
  symbol: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yahooData: Record<string, any>
): TickerData {
  try {
    const result = yahooData?.chart?.result?.[0];
    if (!result) {
      throw new Error("No chart result found");
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

    // 촉매 이벤트는 Yahoo API에서 직접 제공되지 않으므로 기본값 사용
    // Catalyst events are not directly available from Yahoo API, using defaults
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
  } catch (err) {
    // 파싱 실패 시 에러 로그 출력 후 예외 전파
    // Log parsing error and rethrow
    console.error(`[extractTickerData] Failed to parse data for ${symbol}:`, err);
    throw err;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  try {
    // Yahoo Finance API 호출
    // Call Yahoo Finance API
    const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}?interval=1m&range=1d`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": YAHOO_USER_AGENT,
      },
      // 캐시 방지: 항상 최신 데이터 요청
      // Prevent caching: always request fresh data
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned ${response.status}`);
    }

    const yahooData = await response.json();
    const tickerData = extractTickerData(symbol, yahooData);

    const apiResponse: StockApiResponse = {
      success: true,
      data: tickerData,
    };

    return Response.json(apiResponse);
  } catch (error) {
    // API 실패 시 에러 응답 반환 — 모의 데이터 없음
    // Return error response on API failure — no mock data
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[stock/${symbol}] Yahoo Finance API failed:`, message);

    const apiResponse: StockApiResponse = {
      success: false,
      error: `${symbol} 데이터를 가져올 수 없습니다: ${message}`,
    };

    return Response.json(apiResponse, { status: 502 });
  }
}
