// 상수 정의
// Constant definitions

/** 자동 새로고침 간격 (밀리초) / Auto-refresh interval in milliseconds */
export const REFRESH_INTERVAL_MS = 60_000;

/** 자동 새로고침 간격 (초) / Auto-refresh interval in seconds */
export const REFRESH_INTERVAL_SEC = 60;

/** 프리마켓 시작 시간 (ET, 24시간제) / Pre-market start hour in ET */
export const PRE_MARKET_START_HOUR = 4;

/** 프리마켓 종료 및 정규장 시작 (ET) / Pre-market end / Market open hour in ET */
export const MARKET_OPEN_HOUR = 9;
export const MARKET_OPEN_MINUTE = 30;

/** 정규장 종료 시간 (ET) / Market close hour in ET */
export const MARKET_CLOSE_HOUR = 16;

/** 애프터 아워 종료 시간 (ET) / After hours end in ET */
export const AFTER_HOURS_END_HOUR = 20;

/** Yahoo Finance 스크리너 API URL 목록 (장 전 활성, 상승, 거래량 활발 순) */
/** Yahoo Finance screener API URL list (pre-market actives, gainers, most actives) */
export const SCREENER_URLS = [
  {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives_pre_market&count=25",
    label: "Yahoo Finance Pre-Market Actives",
  },
  {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=25",
    label: "Yahoo Finance Day Gainers",
  },
  {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=25",
    label: "Yahoo Finance Most Actives",
  },
] as const;

/** Yahoo Finance 트렌딩 API URL / Yahoo Finance trending API URL */
export const TRENDING_URL = "https://query1.finance.yahoo.com/v1/finance/trending/US";

/** 스크리너 최대 종목 수 / Maximum tickers from screener */
export const SCREENER_MAX_TICKERS = 20;

/** 스코어링 기준 최대 점수 / Max score per criterion */
export const MAX_SCORE_PER_CRITERION = 2;

/** 시그널 판정 비율 (maxTotal 대비) — 기준 개수와 무관하게 동작
 *  Signal threshold ratios (vs maxTotal) — works regardless of criteria count */
export const HIGH_SIGNAL_RATIO = 0.75;
export const MODERATE_SIGNAL_RATIO = 0.42;

/** 거래대금 임계값 ($) / Trading value thresholds ($) */
export const TRADING_VALUE_HIGH = 50_000_000;
export const TRADING_VALUE_MODERATE = 10_000_000;

/** 장중 변동폭 임계값 (%) / Intraday range thresholds (%) */
export const INTRADAY_RANGE_HIGH = 10;
export const INTRADAY_RANGE_MODERATE = 5;

/** 저평가: 가격 안정성 스프레드 임계값은 아래로 이동
 *  (시뮬레이션 기준 관련 상수 제거: MARKET_CAP, CONSECUTIVE_UP_DAYS, ACCUMULATION_RATIO) */

/** 저평가: 가격 안정성 스프레드 임계값 (%)
 *  Undervalued: Price stability spread thresholds (%) */
export const STABILITY_SPREAD_HIGH = 2;
export const STABILITY_SPREAD_MODERATE = 5;

/** 저평가: 바닥 확인 sweet spot (52주 최저가 대비 반등률 %)
 *  Undervalued: Bottom confirmation sweet spot (bounce % from 52W low)
 *  10~25% 반등 = 바닥 확인 + 아직 저평가 구간 (2점)
 *  5~35% 반등 = 회복 초기 또는 중기 (1점)  */
export const BOUNCE_SWEET_SPOT_MIN = 10;
export const BOUNCE_SWEET_SPOT_MAX = 25;
export const BOUNCE_WIDER_MIN = 5;
export const BOUNCE_WIDER_MAX = 35;

/** 거래량 비율 임계값 / Volume ratio thresholds */
export const VOLUME_RATIO_HIGH = 2.0;
export const VOLUME_RATIO_MODERATE = 1.0;

/** 프리마켓 변동률 임계값 (%) / Pre-market change percent thresholds */
export const CHANGE_PERCENT_HIGH = 3.0;
export const CHANGE_PERCENT_MODERATE = 1.0;

/** Yahoo Finance API 기본 URL / Yahoo Finance API base URL */
export const YAHOO_FINANCE_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

/** Yahoo Finance User-Agent 헤더 / Yahoo Finance User-Agent header */
export const YAHOO_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** 52주 최고가 근접률 임계값 (%) / 52-week high proximity thresholds */
export const NEAR_52W_HIGH_THRESHOLD = 5;
export const CLOSE_TO_52W_HIGH_THRESHOLD = 10;

/** 갭 크기 임계값 (%) / Gap size thresholds */
export const GAP_LARGE_THRESHOLD = 5.0;
export const GAP_MODERATE_THRESHOLD = 2.0;

/** (소셜 버즈 시뮬레이션 상수 제거 — 시뮬레이션 기준 삭제됨) */

/** 저평가 스코어링: 52주 최저가 근접 임계값 (%)
 *  Undervalued scoring: 52-week low proximity thresholds (%) */
export const NEAR_52W_LOW_THRESHOLD = 10;
export const CLOSE_TO_52W_LOW_THRESHOLD = 25;

/** 저평가 스코어링: 52주 최고가 갭 임계값 (%)
 *  Undervalued scoring: 52-week high gap thresholds (%) */
export const HIGH_GAP_FROM_52W_HIGH_THRESHOLD = 40;
export const MODERATE_GAP_FROM_52W_HIGH_THRESHOLD = 20;

/** 저평가 스코어링: 가격 회복률 임계값 (%)
 *  Undervalued scoring: price recovery from low thresholds (%) */
export const RECOVERY_HIGH_THRESHOLD = 10;
export const RECOVERY_MODERATE_THRESHOLD = 3;

/** 저평가 스크리너 URL 목록 (저평가 스크리너 우선, 활성/상승 종목은 폴백)
 *  Undervalued screener URL list (undervalued screeners first, actives/gainers as fallback) */
export const UNDERVALUED_SCREENER_URLS = [
  {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=undervalued_large_caps&count=25",
    label: "Yahoo Finance Undervalued Large Caps",
  },
  {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=undervalued_growth_stocks&count=25",
    label: "Yahoo Finance Undervalued Growth Stocks",
  },
] as const;

/** 저평가 스크리너 폴백 URL (저평가 스크리너 실패 시 사용)
 *  Undervalued screener fallback URLs (used when undervalued screeners fail) */
export const UNDERVALUED_FALLBACK_URLS = [
  {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=25",
    label: "Yahoo Finance Most Actives (Fallback)",
  },
  {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=25",
    label: "Yahoo Finance Day Gainers (Fallback)",
  },
] as const;

/** 평균 일일 거래량 기본값 (소형주 대응)
 *  Default average daily volume (realistic for small caps) */
export const DEFAULT_AVG_DAILY_VOLUME = 500_000;

/** Yahoo Finance fetch 타임아웃 (밀리초)
 *  Yahoo Finance fetch timeout (milliseconds) */
export const FETCH_TIMEOUT_MS = 8_000;

/** Yahoo Finance 캐시 유효 시간 (밀리초)
 *  Yahoo Finance cache TTL (milliseconds) */
export const CACHE_TTL_MS = 45_000;

/** 429 재시도 대기 시간 (밀리초)
 *  429 retry wait time (milliseconds) */
export const RATE_LIMIT_RETRY_DELAY_MS = 2_000;

/** 거래대금 효율성 임계값 (가격 변동 % / 거래대금 백만달러)
 *  Trading value efficiency thresholds (price change % / trading value $M) */
export const TRADING_EFFICIENCY_HIGH = 1.0;
export const TRADING_EFFICIENCY_MODERATE = 0.3;
