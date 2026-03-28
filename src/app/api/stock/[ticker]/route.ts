// Yahoo Finance 프록시 API 라우트
// Yahoo Finance proxy API route

import { NextRequest } from "next/server";
import { StockApiResponse } from "@/lib/types";
import { fetchYahooChart } from "@/lib/yahooFinance";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  try {
    // 공유 모듈을 통해 Yahoo Finance API 호출 (캐시 + 타임아웃 + 429 재시도)
    // Call Yahoo Finance API via shared module (cache + timeout + 429 retry)
    const tickerData = await fetchYahooChart(symbol);

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
