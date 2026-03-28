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
export const SCREENER_MAX_TICKERS = 25;

/** 스코어링 기준 최대 점수 / Max score per criterion */
export const MAX_SCORE_PER_CRITERION = 2;

/** 전체 기준 개수 / Total number of criteria */
export const TOTAL_CRITERIA_COUNT = 7;

/** 최대 총점 / Maximum total score */
export const MAX_TOTAL_SCORE = MAX_SCORE_PER_CRITERION * TOTAL_CRITERIA_COUNT;

/** 시그널 임계값 / Signal thresholds */
export const HIGH_SIGNAL_THRESHOLD = 10;
export const MODERATE_SIGNAL_THRESHOLD = 6;

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

/** 소셜 버즈 시뮬레이션 범위 / Social buzz simulation range */
export const SOCIAL_BUZZ_MIN = 10;
export const SOCIAL_BUZZ_MAX = 100;

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

/** 저평가 스크리너 URL 목록
 *  Undervalued screener URL list */
export const UNDERVALUED_SCREENER_URLS = [
  {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=25",
    label: "Yahoo Finance Most Actives",
  },
  {
    url: "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=25",
    label: "Yahoo Finance Day Gainers",
  },
] as const;
