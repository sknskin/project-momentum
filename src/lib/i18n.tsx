"use client";

// 다국어 지원 (한국어/영어)
// Internationalization support (Korean/English)

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

/** 지원 언어 타입 / Supported language type */
export type Language = "ko" | "en";

/** localStorage 키 / localStorage key */
const STORAGE_KEY = "momentum-lang";

/** 기본 언어 / Default language */
const DEFAULT_LANGUAGE: Language = "ko";

/** 번역 사전 타입 / Translation dictionary type */
interface Translations {
  // 앱 제목 / App title
  appTitle: string;
  // 스캔 버튼 / Scan button
  scanNow: string;
  scanning: string;
  // 종목 수 / Stock count
  foundHotStocks: (n: number) => string;
  // 에러 메시지 / Error messages
  cannotFetchHotStocks: string;
  retry: string;
  apiOrNetworkError: string;
  // 시뮬레이션 안내 / Simulation notice
  socialBuzzSimulated: string;
  socialBuzzNotice: string;
  // 로딩 / Loading
  scanningMarket: string;
  // 빈 상태 / Empty state
  pressScanNow: string;
  // 모멘텀 시그널 / Momentum signal
  highMomentum: string;
  moderate: string;
  low: string;
  entryReadiness: string;
  // 엔트리 전략 / Entry strategy
  entryStrategy: string;
  entryZone: string;
  stopLoss: string;
  target1: string;
  target2: string;
  riskReward: string;
  // 엔트리 전략 노트 / Entry strategy notes
  notesHigh: string;
  notesModerate: string;
  notesLow: string;
  // 카드 라벨 / Card labels
  prevClose: string;
  vol: string;
  avgVol: string;
  catalysts: string;
  live: string;
  source: string;
  // 마켓 세션 / Market session
  preMarket: string;
  marketOpen: string;
  afterHours: string;
  marketClosed: string;
  // 스코어 기준 이름 (SNS 화제 종목 탭, 8기준)
  // Score criteria names (SNS Trending tab, 8 criteria)
  criteriaPreMarketVolume: string;
  criteriaPriceChange: string;
  criteriaPricePattern: string;
  criteriaNewsFreshness: string;
  criteriaGapHold: string;
  criteriaTradingValue: string;
  criteriaIntradayRange: string;
  criteriaTradingValueEfficiency: string;
  // 스코어 기준 이름 (저평가 종목 탭, 10기준)
  // Score criteria names (Undervalued tab, 10 criteria)
  criteriaVolumeRatio: string;
  criteria52WeekLowProximity: string;
  criteriaPriceTrend: string;
  criteriaPriceRecovery: string;
  criteriaSectorSentimentUV: string;
  criteria52WeekHighGap: string;
  criteriaInstitutionalVolume: string;
  criteriaPriceStability: string;
  criteriaSupportLevelProximity: string;
  criteriaBottomConfirmation: string;
  // 모달 라벨 / Modal labels
  modalPrevClose: string;
  modalDayHigh: string;
  modalDayLow: string;
  modal52WeekHigh: string;
  modal52WeekLow: string;
  modalScoreDetail: string;
  modalTotalScore: string;
  modalVolumeAnalysis: string;
  modalPreMarketVol: string;
  modalAvgVol: string;
  modalVolRatio: string;
  modalEntryStrategy: string;
  modalCatalysts: string;
  modalDisclaimerFooter: string;
  // 면책 조항 / Disclaimer
  riskDisclaimer: string;
  disclaimerText: string;
  notFinancialAdvice: string;
  // 카운트다운 / Countdown
  clickToRefresh: string;
  // 토글 버튼 / Toggle buttons
  themeToggle: string;
  langToggle: string;
  // 탭 라벨 / Tab labels
  tabUndervalued: string;
  tabTrending: string;
  // 저평가 점수 / Undervalue score
  undervalueScore: string;
  // 트렌딩 안내 / Trending notice
  trendingNotice: string;
  // 정렬 / Sorting
  sortByScore: string;
  sortByChange: string;
  sortByVolume: string;
  sortByTradingValue: string;
  // 검색 / Search
  searchPlaceholder: string;
  searchButton: string;
  // 시뮬레이션 배지 / Simulation badge
  simulatedBadge: string;
  // 세션 라벨 (카드용) / Session labels (for card)
  sessionPreMarket: string;
  sessionMarketOpen: string;
  sessionAfterHours: string;
  sessionClosed: string;
  // 카드 외 N개 기준 / Card remaining criteria
  andMoreCriteria: (n: number) => string;
  // 에러 배너 / Error banner
  errorBanner: string;
  // 알림 모달 / Alert modal
  alertConfirm: string;
  alertCancel: string;
  // 저평가 안내 / Undervalued notice
  undervaluedNotice: string;
  // 랭킹 테이블 헤더 / Ranking table headers
  rankingRank: string;
  rankingTicker: string;
  rankingScore: string;
  rankingChange: string;
  rankingTitle: string;
  // 툴팁 텍스트 / Tooltip texts
  tooltipUndervalued: string;
  tooltipTrending: string;
  tooltipRankingScore: string;
  // 기준별 도움말 툴팁 / Per-criterion help tooltips
  criteriaTooltips: Record<string, string>;
}

/** 한국어 번역 / Korean translations */
const ko: Translations = {
  appTitle: "모멘텀 스캐너",
  scanNow: "스캔 시작",
  scanning: "스캔 중...",
  foundHotStocks: (n: number) => `핫 종목 ${n}개 발견`,
  cannotFetchHotStocks: "현재 핫 종목을 가져올 수 없습니다",
  retry: "재시도",
  apiOrNetworkError:
    "Yahoo Finance API 오류이거나 네트워크 문제일 수 있습니다.",
  socialBuzzSimulated: "소셜 버즈 데이터는 시뮬레이션입니다",
  socialBuzzNotice:
    "⚠ 소셜 버즈 데이터는 시뮬레이션이며 실제 소셜 미디어 활동을 반영하지 않습니다. API를 사용할 수 없는 경우 데모 모드로 전환될 수 있습니다.",
  scanningMarket: "미국 시장에서 핫 종목 스캔 중...",
  pressScanNow: '"스캔 시작"을 눌러 미국 핫 종목을 찾아보세요',
  highMomentum: "높은 모멘텀",
  moderate: "보통",
  low: "낮음",
  entryReadiness: "진입 준비도",
  entryStrategy: "진입 전략",
  entryZone: "진입 구간:",
  stopLoss: "손절가:",
  target1: "목표가 1:",
  target2: "목표가 2:",
  riskReward: "손익비:",
  notesHigh:
    "강한 모멘텀 셋업입니다. 진입 구간 근처에서 타이트한 스탑으로 분할 매수를 고려하세요.",
  notesModerate:
    "보통 셋업입니다. 시장 개장 후 확인 신호를 기다린 후 진입하세요.",
  notesLow:
    "약한 셋업입니다. 관망만 하는 것을 권장합니다. 반전 위험이 높습니다.",
  prevClose: "전일 종가:",
  vol: "거래량:",
  avgVol: "평균 거래량:",
  catalysts: "촉매",
  live: "LIVE",
  source: "소스:",
  preMarket: "프리마켓",
  marketOpen: "정규장",
  afterHours: "시간외",
  marketClosed: "장 마감",
  criteriaPreMarketVolume: "프리마켓 거래량",
  criteriaPriceChange: "가격 변동률",
  criteriaPricePattern: "52주 최고가 근접도",
  criteriaNewsFreshness: "촉매 감지",
  criteriaGapHold: "갭업 크기",
  criteriaTradingValue: "거래대금",
  criteriaIntradayRange: "장중 변동 폭",
  criteriaTradingValueEfficiency: "거래대금 효율",
  criteriaVolumeRatio: "거래량 비율",
  criteria52WeekLowProximity: "52주 최저가 근접도",
  criteriaPriceTrend: "프리마켓 방향",
  criteriaPriceRecovery: "저가 대비 회복률",
  criteriaSectorSentimentUV: "가격 스프레드",
  criteria52WeekHighGap: "52주 최고가 갭",
  criteriaInstitutionalVolume: "저가 부근 거래량",
  criteriaPriceStability: "가격 변동 안정성",
  criteriaSupportLevelProximity: "지지선 근접도",
  criteriaBottomConfirmation: "바닥 확인",
  modalPrevClose: "전일 종가",
  modalDayHigh: "당일 고가",
  modalDayLow: "당일 저가",
  modal52WeekHigh: "52주 최고가",
  modal52WeekLow: "52주 최저가",
  modalScoreDetail: "스코어 상세",
  modalTotalScore: "총점",
  modalVolumeAnalysis: "거래량 분석",
  modalPreMarketVol: "프리마켓 거래량",
  modalAvgVol: "평균 거래량",
  modalVolRatio: "거래량 비율",
  modalEntryStrategy: "진입 전략",
  modalCatalysts: "촉매 이벤트",
  modalDisclaimerFooter: "이 정보는 투자 권유가 아닙니다",
  riskDisclaimer: "⚠ 투자 위험 고지 — 반드시 읽어주세요",
  disclaimerText:
    "이 도구는 교육 및 정보 제공 목적으로만 제공됩니다. 투자 조언을 구성하지 않습니다. " +
    "일부 기준(소셜 버즈, 시가총액, 연속 상승일, 거래량 추세)은 시뮬레이션 데이터이며 총점의 17~25%를 차지합니다. " +
    "가격 변동률·갭 크기 기준은 상승과 하락을 동일하게 취급하여 급락 종목도 높은 점수를 받을 수 있습니다. " +
    "저평가 탭은 기술적 가격 데이터만 사용하며 P/E, P/B 등 재무제표 기반 분석이 포함되지 않습니다. " +
    "진입 전략은 고정 비율 기반이며 실제 지지/저항선을 반영하지 않습니다. " +
    "거래 결정을 내리기 전에 항상 본인의 리서치를 수행하세요. 과거 수익률이 미래 수익을 보장하지 않습니다. " +
    "주식 거래에는 원금 손실 위험이 따릅니다.",
  notFinancialAdvice: "투자 조언이 아닙니다",
  clickToRefresh: "클릭하여 새로고침",
  themeToggle: "테마 전환",
  langToggle: "EN",
  tabUndervalued: "저평가 종목",
  tabTrending: "SNS 화제 종목",
  undervalueScore: "저평가 점수",
  trendingNotice: "Yahoo Finance 트렌딩 기반",
  sortByScore: "점수순",
  sortByChange: "변동률순",
  sortByVolume: "거래량순",
  sortByTradingValue: "거래대금순",
  searchPlaceholder: "종목 검색 (예: TSLA)",
  searchButton: "검색",
  simulatedBadge: "시뮬레이션",
  sessionPreMarket: "프리마켓",
  sessionMarketOpen: "정규장",
  sessionAfterHours: "시간외",
  sessionClosed: "장 마감",
  andMoreCriteria: (n: number) => `외 ${n}개 기준`,
  errorBanner: "데이터 갱신에 실패했습니다. 이전 데이터를 표시합니다.",
  alertConfirm: "확인",
  alertCancel: "취소",
  undervaluedNotice:
    "⚠ 52주 최저가 근접도, 거래량 급증, 가격 회복 패턴, 섹터 심리 등 12가지 기준으로 저평가 가능성을 분석합니다.",
  rankingRank: "순위",
  rankingTicker: "종목",
  rankingScore: "점수",
  rankingChange: "변동률",
  rankingTitle: "종목 순위",
  tooltipUndervalued:
    "52주 최저가 근접도, 거래량 급증, 가격 회복 패턴, 섹터 심리 등 12가지 기준으로 저평가 가능성을 분석합니다.",
  tooltipTrending:
    "프리마켓 거래량, 가격 변동률, 소셜 버즈, 섹터 모멘텀 등 12가지 기준으로 화제 종목을 분석합니다.",
  tooltipRankingScore:
    "점수가 높을수록 해당 기준에 부합하는 종목입니다. 최대 24점.",
  criteriaTooltips: {
    // SNS 화제 종목 기준 (8개) / SNS Trending criteria (8)
    preMarketVolume: "프리마켓 시간대의 거래량 수준을 평가합니다. 높은 거래량은 시장 관심도를 나타냅니다.",
    priceChange: "프리마켓 양의 가격 변동만 점수화합니다. 하락은 위험 신호이므로 0점 처리됩니다.",
    pricePattern: "현재 가격이 52주 최고가에 얼마나 근접한지 평가합니다. 가까울수록 강한 상승 모멘텀입니다.",
    newsFreshness: "거래량 급증, 큰 가격 변동 등에서 자동 감지된 촉매 신호 수를 평가합니다. 실제 뉴스 피드 아님.",
    gapHold: "전일 종가 대비 양의 갭(갭업)만 점수화합니다. 하락 갭은 위험 신호이므로 0점 처리됩니다.",
    tradingValue: "가격 × 거래량으로 산출되는 실제 거래 금액을 평가합니다. $50M 이상이면 높은 유동성입니다.",
    intradayRange: "전일 종가 대비 장중 고가-저가 범위를 측정합니다. 넓을수록 변동성이 큽니다.",
    tradingValueEfficiency: "양의 가격 변동에 대해서만 거래대금 대비 효율성을 평가합니다. 적은 거래대금으로 큰 상승이면 높은 효율.",
    // 저평가 종목 기준 (10개) / Undervalued criteria (10)
    volumeRatio: "평균 거래량 대비 현재 거래량의 비율로 시장 관심도를 평가합니다. 2배 이상이면 주목할 만합니다.",
    weekLowProximity: "현재 가격이 52주 최저가에 얼마나 가까운지 평가합니다. 가까울수록 저평가 가능성이 높습니다.",
    priceTrend: "프리마켓 양의 가격 변동을 측정합니다. 단일 시점 데이터이므로 장기 추세가 아닌 참고 지표입니다.",
    priceRecovery: "당일 저가에서 현재 가격까지의 회복률을 측정합니다. 회복은 매수세 유입 신호입니다.",
    sectorSentimentUV: "장중 고가-저가 스프레드로 가격 안정성을 평가합니다. 스프레드가 작을수록 안정적입니다.",
    weekHighGap: "52주 최고가와의 괴리율로 상승 여력을 평가합니다. 괴리가 클수록 회복 시 수익 잠재력이 높습니다.",
    institutionalVolume: "거래량이 높으면서 52주 최저가 근처인 종목을 감지합니다. 저가 부근 매수세 유입 신호입니다.",
    priceStability: "가격 변동의 안정성을 평가합니다. 안정적일수록 저평가 종목의 바닥 확인 가능성이 높습니다.",
    supportLevelProximity: "52주 최저가와 당일 저가의 중간값을 지지선으로 추정합니다. 지지선 근처는 반등 가능성이 높습니다.",
    bottomConfirmation: "52주 최저가 대비 10~25% 반등 = 바닥 확인 sweet spot. 너무 가까우면 아직 하락 중, 너무 멀면 이미 회복됨.",
  },
};

/** 영어 번역 / English translations */
const en: Translations = {
  appTitle: "Momentum Scanner",
  scanNow: "Scan Now",
  scanning: "Scanning...",
  foundHotStocks: (n: number) => `Found ${n} hot stocks`,
  cannotFetchHotStocks: "Cannot fetch hot stocks right now",
  retry: "Retry",
  apiOrNetworkError:
    "This may be a Yahoo Finance API error or a network issue.",
  socialBuzzSimulated: "Social buzz data is simulated",
  socialBuzzNotice:
    "⚠ Social buzz data is SIMULATED and does not reflect real social media activity. Live market data may fall back to demo mode if the API is unavailable.",
  scanningMarket: "Scanning US market for hot stocks...",
  pressScanNow: 'Press "Scan Now" to find hot US stocks',
  highMomentum: "HIGH MOMENTUM",
  moderate: "MODERATE",
  low: "LOW",
  entryReadiness: "Entry Readiness",
  entryStrategy: "Entry Strategy",
  entryZone: "Entry Zone:",
  stopLoss: "Stop Loss:",
  target1: "Target 1:",
  target2: "Target 2:",
  riskReward: "Risk/Reward:",
  notesHigh:
    "Strong momentum setup. Consider scaling in near entry zone with tight stop.",
  notesModerate:
    "Moderate setup. Wait for confirmation at market open before entering.",
  notesLow: "Weak setup. Consider watching only. High risk of reversal.",
  prevClose: "Prev Close:",
  vol: "Vol:",
  avgVol: "Avg Vol:",
  catalysts: "Catalysts",
  live: "LIVE",
  source: "Source:",
  preMarket: "PRE-MARKET",
  marketOpen: "MARKET OPEN",
  afterHours: "AFTER HOURS",
  marketClosed: "MARKET CLOSED",
  criteriaPreMarketVolume: "Pre-Market Volume",
  criteriaPriceChange: "Price Change",
  criteriaPricePattern: "52W High Proximity",
  criteriaNewsFreshness: "Catalyst Detection",
  criteriaGapHold: "Gap Up Size",
  criteriaTradingValue: "Trading Value",
  criteriaIntradayRange: "Intraday Range",
  criteriaTradingValueEfficiency: "Trading Value Efficiency",
  criteriaVolumeRatio: "Volume Ratio",
  criteria52WeekLowProximity: "52W Low Proximity",
  criteriaPriceTrend: "Pre-Market Direction",
  criteriaPriceRecovery: "Price Recovery from Lows",
  criteriaSectorSentimentUV: "Price Spread",
  criteria52WeekHighGap: "52W High Gap",
  criteriaInstitutionalVolume: "Volume Near Lows",
  criteriaPriceStability: "Price Stability",
  criteriaSupportLevelProximity: "Support Level Proximity",
  criteriaBottomConfirmation: "Bottom Confirmation",
  modalPrevClose: "Previous Close",
  modalDayHigh: "Day High",
  modalDayLow: "Day Low",
  modal52WeekHigh: "52-Week High",
  modal52WeekLow: "52-Week Low",
  modalScoreDetail: "Score Detail",
  modalTotalScore: "Total Score",
  modalVolumeAnalysis: "Volume Analysis",
  modalPreMarketVol: "Pre-Market Volume",
  modalAvgVol: "Average Volume",
  modalVolRatio: "Volume Ratio",
  modalEntryStrategy: "Entry Strategy",
  modalCatalysts: "Catalyst Events",
  modalDisclaimerFooter: "This is not investment advice",
  riskDisclaimer: "⚠ RISK DISCLAIMER — Please Read",
  disclaimerText:
    "This tool is for educational and informational purposes only. It does not constitute financial advice. " +
    "Some criteria (social buzz, market cap, consecutive up days, volume trend) use SIMULATED data accounting for 17-25% of the total score. " +
    "Price change and gap criteria treat rallies and crashes identically — a -8% drop scores the same as a +8% gain. " +
    "The 'Undervalued' tab uses only technical price data; no fundamental analysis (P/E, P/B, etc.) is included. " +
    "Entry strategies use fixed percentages and do not reflect actual support/resistance levels. " +
    "Always do your own research before making trading decisions. Past performance does not guarantee future results. " +
    "Trading stocks involves risk of loss of principal.",
  notFinancialAdvice: "Not Financial Advice",
  clickToRefresh: "Click to refresh now",
  themeToggle: "Toggle theme",
  langToggle: "한",
  tabUndervalued: "Undervalued Stocks",
  tabTrending: "SNS Trending",
  undervalueScore: "Undervalue Score",
  trendingNotice: "Based on Yahoo Finance trending data",
  sortByScore: "By Score",
  sortByChange: "By Change %",
  sortByVolume: "By Volume",
  sortByTradingValue: "By Trading Value",
  searchPlaceholder: "Search ticker (e.g. TSLA)",
  searchButton: "Search",
  simulatedBadge: "Simulated",
  sessionPreMarket: "PRE-MKT",
  sessionMarketOpen: "REGULAR",
  sessionAfterHours: "AFTER-HRS",
  sessionClosed: "CLOSED",
  andMoreCriteria: (n: number) => `+${n} more criteria`,
  errorBanner: "Failed to refresh data. Showing previous results.",
  alertConfirm: "OK",
  alertCancel: "Cancel",
  undervaluedNotice:
    "⚠ Analyzes undervaluation potential based on 12 criteria including 52-week low proximity, volume surge, price recovery patterns, and sector sentiment.",
  rankingRank: "Rank",
  rankingTicker: "Ticker",
  rankingScore: "Score",
  rankingChange: "Change",
  rankingTitle: "Stock Rankings",
  tooltipUndervalued:
    "Analyzes undervaluation potential based on 12 criteria including 52-week low proximity, volume surge, price recovery patterns, and sector sentiment.",
  tooltipTrending:
    "Analyzes trending stocks based on 12 criteria including pre-market volume, price change, social buzz, and sector momentum.",
  tooltipRankingScore:
    "A higher score means the stock better matches the criteria. Maximum 24 points.",
  criteriaTooltips: {
    // SNS Trending criteria (8)
    preMarketVolume: "Evaluates pre-market trading volume levels. High volume indicates strong market interest.",
    priceChange: "Only scores positive pre-market price changes. Declines are treated as risk signals and score 0.",
    pricePattern: "Evaluates how close the current price is to its 52-week high. Closer means stronger upward momentum.",
    newsFreshness: "Counts auto-detected catalyst signals from volume surges and large price moves. Not a real news feed.",
    gapHold: "Only scores positive gaps (gap ups). Downward gaps are risk signals and score 0.",
    tradingValue: "Evaluates actual trading value (price × volume). Over $50M indicates high liquidity.",
    intradayRange: "Measures the intraday high-low range relative to the previous close. Wider means more volatile.",
    tradingValueEfficiency: "Evaluates upside efficiency only. Large positive moves on small volume = high efficiency.",
    // Undervalued criteria (10)
    volumeRatio: "Evaluates market interest via the ratio of current volume to average volume. 2x or more is noteworthy.",
    weekLowProximity: "Evaluates proximity to the 52-week low. Closer means higher undervaluation potential.",
    priceTrend: "Measures positive pre-market change. Single data point — a reference indicator, not a long-term trend.",
    priceRecovery: "Measures recovery from the day low to current price. Recovery signals buying pressure.",
    sectorSentimentUV: "Evaluates price stability via intraday high-low spread. Smaller spread means more stable.",
    weekHighGap: "Evaluates upside potential based on the gap from the 52-week high. Larger gap = higher recovery potential.",
    institutionalVolume: "Detects high volume near 52-week lows — a buying pressure signal at low prices.",
    priceStability: "Evaluates price stability. More stable prices suggest a confirmed bottom for undervalued stocks.",
    supportLevelProximity: "Estimates support from the midpoint of 52W low and day low. Near support = higher bounce probability.",
    bottomConfirmation: "10-25% bounce from 52W low = sweet spot (confirmed bottom, still undervalued). Too close = still falling, too far = already recovered.",
  },
};

/** 번역 사전 맵 / Translation dictionary map */
const translations: Record<Language, Translations> = { ko, en };

/** 언어 컨텍스트 타입 / Language context type */
interface LanguageContextType {
  language: Language;
  t: Translations;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: DEFAULT_LANGUAGE,
  t: translations[DEFAULT_LANGUAGE],
  toggleLanguage: () => {},
});

/**
 * 언어 훅 — 현재 언어, 번역, 전환 함수 반환
 * Language hook — returns current language, translations, toggle function
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  return useContext(LanguageContext);
}

/**
 * 언어 프로바이더 컴포넌트
 * Language provider component
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  // localStorage에서 저장된 언어 복원
  // Restore saved language from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "ko" || saved === "en") {
        setLanguage(saved);
      }
    } catch (err) {
      console.error("[i18n] Failed to read language from localStorage:", err);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === "ko" ? "en" : "ko";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (err) {
        console.error("[i18n] Failed to save language to localStorage:", err);
      }
      return next;
    });
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
