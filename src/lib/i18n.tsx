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
  // 스코어 기준 이름 (SNS 화제 종목 탭)
  // Score criteria names (SNS Trending tab)
  criteriaPreMarketVolume: string;
  criteriaPriceChange: string;
  criteriaPricePattern: string;
  criteriaNewsFreshness: string;
  criteriaSectorSentiment: string;
  criteriaGapHold: string;
  criteriaSocialBuzz: string;
  criteriaTradingValue: string;
  criteriaIntradayRange: string;
  criteriaTradingValueEfficiency: string;
  criteriaMarketCapCategory: string;
  criteriaConsecutiveUpDays: string;
  // 스코어 기준 이름 (저평가 종목 탭)
  // Score criteria names (Undervalued tab)
  criteriaVolumeRatio: string;
  criteria52WeekLowProximity: string;
  criteriaPriceTrend: string;
  criteriaPriceRecovery: string;
  criteriaSectorSentimentUV: string;
  criteria52WeekHighGap: string;
  criteriaInstitutionalVolume: string;
  criteriaTradingValueVsMarketCap: string;
  criteriaPriceStability: string;
  criteriaSupportLevelProximity: string;
  criteriaVolumeTrend: string;
  criteriaBounceStrength: string;
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
  criteriaPricePattern: "가격 패턴",
  criteriaNewsFreshness: "뉴스 최신도",
  criteriaSectorSentiment: "섹터 심리",
  criteriaGapHold: "갭 유지",
  criteriaSocialBuzz: "소셜 버즈",
  criteriaTradingValue: "거래대금",
  criteriaIntradayRange: "전일 대비 변동 폭",
  criteriaTradingValueEfficiency: "거래대금 대비 가격 변동",
  criteriaMarketCapCategory: "시가총액 규모",
  criteriaConsecutiveUpDays: "연속 상승일",
  criteriaVolumeRatio: "거래량 비율",
  criteria52WeekLowProximity: "52주 최저가 근접도",
  criteriaPriceTrend: "가격 추세 패턴",
  criteriaPriceRecovery: "저가 대비 회복률",
  criteriaSectorSentimentUV: "섹터 심리",
  criteria52WeekHighGap: "52주 최고가 갭",
  criteriaInstitutionalVolume: "기관 관심 거래량",
  criteriaTradingValueVsMarketCap: "거래대금 대비 시가총액",
  criteriaPriceStability: "가격 변동 안정성",
  criteriaSupportLevelProximity: "지지선 근접도",
  criteriaVolumeTrend: "거래량 증가 추세",
  criteriaBounceStrength: "반등 강도",
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
  riskDisclaimer: "⚠ 투자 위험 고지",
  disclaimerText:
    "이 도구는 교육 및 정보 제공 목적으로만 제공됩니다. 투자 조언을 구성하지 않습니다. " +
    "소셜 버즈 데이터는 시뮬레이션이며 실제 소셜 미디어 분석에 기반하지 않습니다. " +
    "거래 결정을 내리기 전에 항상 본인의 리서치를 수행하세요. 과거 수익률이 미래 수익을 보장하지 않습니다. " +
    "주식 거래에는 손실 위험이 따릅니다.",
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
  criteriaPricePattern: "Price Pattern",
  criteriaNewsFreshness: "News Freshness",
  criteriaSectorSentiment: "Sector Sentiment",
  criteriaGapHold: "Gap Hold",
  criteriaSocialBuzz: "Social Buzz",
  criteriaTradingValue: "Trading Value",
  criteriaIntradayRange: "Intraday Range",
  criteriaTradingValueEfficiency: "Trading Value Efficiency",
  criteriaMarketCapCategory: "Market Cap Category",
  criteriaConsecutiveUpDays: "Consecutive Up Days",
  criteriaVolumeRatio: "Volume Ratio",
  criteria52WeekLowProximity: "52W Low Proximity",
  criteriaPriceTrend: "Price Trend Pattern",
  criteriaPriceRecovery: "Price Recovery from Lows",
  criteriaSectorSentimentUV: "Sector Sentiment",
  criteria52WeekHighGap: "52W High Gap",
  criteriaInstitutionalVolume: "Institutional Volume Interest",
  criteriaTradingValueVsMarketCap: "Trading Value vs Market Cap",
  criteriaPriceStability: "Price Stability",
  criteriaSupportLevelProximity: "Support Level Proximity",
  criteriaVolumeTrend: "Volume Trend",
  criteriaBounceStrength: "Bounce Strength",
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
  riskDisclaimer: "⚠ RISK DISCLAIMER",
  disclaimerText:
    "This tool is for educational and informational purposes only. It does not constitute financial advice. " +
    "Social buzz data is SIMULATED and not based on real social media analysis. " +
    "Always do your own research before making trading decisions. Past performance does not guarantee future results. " +
    "Trading stocks involves risk of loss.",
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
