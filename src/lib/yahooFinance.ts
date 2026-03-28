// Yahoo Finance API 공통 모듈 — fetch, 캐싱, 데이터 추출
// Yahoo Finance API shared module — fetch, caching, data extraction

import { TickerData } from "./types";
import {
  YAHOO_FINANCE_BASE_URL,
  YAHOO_USER_AGENT,
  FETCH_TIMEOUT_MS,
  CACHE_TTL_MS,
  RATE_LIMIT_RETRY_DELAY_MS,
  DEFAULT_AVG_DAILY_VOLUME,
} from "./constants";

// ─── 인메모리 캐시 / In-memory cache ───
const cache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * 캐시에서 데이터 조회 (TTL 이내이면 반환)
 * Get data from cache (returns if within TTL)
 */
function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * 캐시에 데이터 저장
 * Store data in cache
 */
function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * AbortController 기반 타임아웃 fetch
 * Fetch with AbortController-based timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 429 감지 및 1회 재시도 포함 fetch
 * Fetch with 429 detection and single retry
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetchWithTimeout(url, options);

  // 429 Too Many Requests → 2초 대기 후 1회 재시도
  // 429 Too Many Requests → wait 2s then retry once
  if (response.status === 429) {
    console.warn(`[yahooFinance] 429 rate-limited for ${url}, retrying after ${RATE_LIMIT_RETRY_DELAY_MS}ms...`);
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
    return fetchWithTimeout(url, options);
  }

  return response;
}

/**
 * Yahoo Finance 차트 API 호출 (캐시 + 타임아웃 + 429 재시도)
 * Fetch Yahoo Finance chart API (with cache + timeout + 429 retry)
 */
export async function fetchYahooChart(symbol: string): Promise<TickerData> {
  const cacheKey = `chart:${symbol.toUpperCase()}`;

  // 캐시 확인 / Check cache
  const cached = getCached<TickerData>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${YAHOO_FINANCE_BASE_URL}/${symbol}?interval=1m&range=1d`;

  const response = await fetchWithRetry(url, {
    headers: { "User-Agent": YAHOO_USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API returned ${response.status} for ${symbol}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yahooData: Record<string, any> = await response.json();
  const tickerData = extractTickerData(symbol, yahooData);

  // 결과 캐싱 / Cache result
  setCache(cacheKey, tickerData);

  return tickerData;
}

/**
 * Yahoo Finance 스크리너/트렌딩 API 호출 (캐시 + 타임아웃 + 429 재시도)
 * Fetch Yahoo Finance screener/trending API (with cache + timeout + 429 retry)
 */
export async function fetchYahooScreener(
  url: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const cacheKey = `screener:${url}`;

  // 캐시 확인 / Check cache
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cached = getCached<Record<string, any>>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetchWithRetry(url, {
    headers: { "User-Agent": YAHOO_USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Yahoo screener returned ${response.status}`);
  }

  const data = await response.json();

  // 결과 캐싱 / Cache result
  setCache(cacheKey, data);

  return data;
}

/**
 * Yahoo Finance 스크리너 응답에서 티커 심볼 추출
 * Extract ticker symbols from Yahoo Finance screener response
 */
export function extractSymbolsFromScreener(
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
    console.error("[extractSymbolsFromScreener] Parse error:", err);
  }
  return [];
}

/**
 * Yahoo Finance 트렌딩 응답에서 티커 심볼 추출
 * Extract ticker symbols from Yahoo Finance trending response
 */
export function extractSymbolsFromTrending(
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
    console.error("[extractSymbolsFromTrending] Parse error:", err);
  }
  return [];
}

/**
 * Yahoo Finance 응답에서 주식 데이터를 추출
 * Extracts stock data from Yahoo Finance response
 */
export function extractTickerData(
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

  // #10: avgDailyVolume 기본값을 500,000으로 변경 (소형주 대응)
  // #10: Change avgDailyVolume default to 500,000 (realistic for small caps)
  const avgDailyVolume =
    meta?.averageDailyVolume10Day ?? meta?.averageDailyVolume3Month ?? DEFAULT_AVG_DAILY_VOLUME;

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

  // #5: 52주 데이터가 없으면 null로 설정 (가짜 값 대신)
  // #5: Set to null if 52-week data is not available (instead of fake values)
  const raw52High = meta?.fiftyTwoWeekHigh ?? null;
  const raw52Low = meta?.fiftyTwoWeekLow ?? null;
  const has52WeekData = raw52High !== null && raw52Low !== null;

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
    fiftyTwoWeekHigh: raw52High,
    fiftyTwoWeekLow: raw52Low,
    has52WeekData,
    catalysts,
    isLive: true,
  };
}

/**
 * 저평가 종목 전용 데이터 추출 (52주 저가 근접 촉매 추가)
 * Undervalued-specific data extraction (adds 52W low proximity catalyst)
 */
export function extractTickerDataUndervalued(
  symbol: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yahooData: Record<string, any>
): TickerData {
  const data = extractTickerData(symbol, yahooData);

  // 52주 최저가 근접 시 촉매 추가
  // Add catalyst if near 52-week low
  if (data.fiftyTwoWeekLow !== null && data.fiftyTwoWeekLow > 0) {
    const distFromLow = ((data.preMarketPrice - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100;
    if (distFromLow <= 15) {
      data.catalysts.push("Near 52-week low — potential undervalue");
    }
  }

  return data;
}
