// 주식 데이터 관련 타입 정의
// Type definitions for stock data

/** 스코어링 기준 키 타입 (SNS 화제 종목 탭)
 *  Scoring criterion key type (SNS Trending tab) */
export type CriterionKey =
  | "preMarketVolume"
  | "priceChange"
  | "pricePattern"
  | "newsFreshness"
  | "sectorSentiment"
  | "gapHold"
  | "socialBuzz"
  | "tradingValue"
  | "intradayRange"
  | "tradingValueEfficiency"
  | "marketCapCategory"
  | "consecutiveUpDays";

/** 저평가 종목 스코어링 기준 키 타입
 *  Undervalued stocks scoring criterion key type */
export type UndervaluedCriterionKey =
  | "volumeRatio"
  | "weekLowProximity"
  | "priceTrend"
  | "priceRecovery"
  | "sectorSentimentUV"
  | "weekHighGap"
  | "institutionalVolume"
  | "tradingValueVsMarketCap"
  | "priceStability"
  | "supportLevelProximity"
  | "volumeTrend"
  | "bounceStrength";

/** 통합 스코어링 기준 키 타입
 *  Union scoring criterion key type */
export type AnyCriterionKey = CriterionKey | UndervaluedCriterionKey;

/** 개별 스코어링 기준 / Individual scoring criterion */
export interface ScoreCriterion {
  key: AnyCriterionKey;
  name: string;
  score: number;
  maxScore: number;
  description: string;
  /** 시뮬레이션 데이터 여부 / Whether this criterion uses simulated data */
  isSimulated: boolean;
}

/** 스코어링 결과 / Scoring result */
export interface ScoringResult {
  criteria: ScoreCriterion[];
  total: number;
  maxTotal: number;
  signal: "HIGH" | "MODERATE" | "LOW";
}

/** 종목 데이터 / Ticker data from API */
export interface TickerData {
  symbol: string;
  companyName: string;
  prevClose: number;
  preMarketPrice: number;
  preMarketChange: number;
  preMarketChangePercent: number;
  preMarketVolume: number;
  avgDailyVolume: number;
  volumeRatio: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  /** 52주 데이터 보유 여부 / Whether 52-week data is available */
  has52WeekData: boolean;
  catalysts: string[];
  isLive: boolean;
}

/** API 응답 / API response */
export type StockApiResponse =
  | { success: true; data: TickerData }
  | { success: false; error: string; data?: undefined };

/** 스크리너 API 응답 / Screener API response */
export type ScreenerApiResponse =
  | { success: true; data: TickerData[]; source: string }
  | { success: false; error: string };

/** 마켓 세션 종류 / Market session types */
export type MarketSession = "PRE_MARKET" | "MARKET_OPEN" | "AFTER_HOURS" | "CLOSED";

/** 엔트리 전략 / Entry strategy */
export interface EntryStrategy {
  entryZone: string;
  stopLoss: string;
  target1: string;
  target2: string;
  riskReward: string;
  notes: string;
}
