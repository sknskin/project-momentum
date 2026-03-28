// 모멘텀 스코어링 로직
// Momentum scoring logic

import { TickerData, ScoringResult, ScoreCriterion, EntryStrategy } from "./types";
import {
  MAX_SCORE_PER_CRITERION,
  HIGH_SIGNAL_THRESHOLD,
  MODERATE_SIGNAL_THRESHOLD,
  VOLUME_RATIO_HIGH,
  VOLUME_RATIO_MODERATE,
  CHANGE_PERCENT_HIGH,
  CHANGE_PERCENT_MODERATE,
  NEAR_52W_HIGH_THRESHOLD,
  CLOSE_TO_52W_HIGH_THRESHOLD,
  GAP_LARGE_THRESHOLD,
  GAP_MODERATE_THRESHOLD,
  SOCIAL_BUZZ_MIN,
  SOCIAL_BUZZ_MAX,
  TOTAL_CRITERIA_COUNT,
  TRADING_VALUE_HIGH,
  TRADING_VALUE_MODERATE,
  INTRADAY_RANGE_HIGH,
  INTRADAY_RANGE_MODERATE,
  MARKET_CAP_LARGE,
  MARKET_CAP_MID,
  CONSECUTIVE_UP_DAYS_HIGH,
  CONSECUTIVE_UP_DAYS_MODERATE,
  TRADING_EFFICIENCY_HIGH,
  TRADING_EFFICIENCY_MODERATE,
} from "./constants";

/**
 * C1: 프리마켓 가격 변동률 평가
 * C1: Pre-market price change evaluation
 */
function scorePreMarketChange(data: TickerData): ScoreCriterion {
  const absChange = Math.abs(data.preMarketChangePercent);
  let score = 0;

  if (absChange >= CHANGE_PERCENT_HIGH) {
    score = 2;
  } else if (absChange >= CHANGE_PERCENT_MODERATE) {
    score = 1;
  }

  return {
    key: "priceChange",
    name: "Pre-Market Change",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Strong move: ${data.preMarketChangePercent > 0 ? "+" : ""}${data.preMarketChangePercent}%`
        : score === 1
          ? `Moderate move: ${data.preMarketChangePercent > 0 ? "+" : ""}${data.preMarketChangePercent}%`
          : `Flat: ${data.preMarketChangePercent > 0 ? "+" : ""}${data.preMarketChangePercent}%`,
    isSimulated: false,
  };
}

/**
 * C2: 프리마켓 거래량 대비 평균 거래량 비율
 * C2: Pre-market volume vs average daily volume ratio
 */
function scoreVolumeRatio(data: TickerData): ScoreCriterion {
  const ratio = data.volumeRatio;
  let score = 0;

  if (ratio >= VOLUME_RATIO_HIGH) {
    score = 2;
  } else if (ratio >= VOLUME_RATIO_MODERATE) {
    score = 1;
  }

  return {
    key: "preMarketVolume",
    name: "Volume Surge",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `High volume: ${ratio.toFixed(1)}x average`
        : score === 1
          ? `Above average: ${ratio.toFixed(1)}x`
          : `Low volume: ${ratio.toFixed(1)}x average`,
    isSimulated: false,
  };
}

/**
 * C3: 갭 크기 평가 (전일 종가 대비 프리마켓 가격 갭)
 * C3: Gap size evaluation (pre-market price gap vs previous close)
 */
function scoreGapSize(data: TickerData): ScoreCriterion {
  // #11: Division by zero 방지
  // #11: Division by zero guard
  const gapPercent = data.prevClose > 0
    ? Math.abs(((data.preMarketPrice - data.prevClose) / data.prevClose) * 100)
    : 0;
  let score = 0;

  if (gapPercent >= GAP_LARGE_THRESHOLD) {
    score = 2;
  } else if (gapPercent >= GAP_MODERATE_THRESHOLD) {
    score = 1;
  }

  return {
    key: "gapHold",
    name: "Gap Size",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Large gap: ${gapPercent.toFixed(1)}%`
        : score === 1
          ? `Moderate gap: ${gapPercent.toFixed(1)}%`
          : `Small gap: ${gapPercent.toFixed(1)}%`,
    isSimulated: false,
  };
}

/**
 * C4: 52주 최고가 근접도
 * C4: Proximity to 52-week high
 */
function score52WeekProximity(data: TickerData): ScoreCriterion {
  // #5: 52주 데이터 없으면 0점
  // #5: 0 points when 52-week data is missing
  if (!data.has52WeekData || data.fiftyTwoWeekHigh === null || data.fiftyTwoWeekHigh <= 0) {
    return {
      key: "pricePattern",
      name: "52W High Proximity",
      score: 0,
      maxScore: MAX_SCORE_PER_CRITERION,
      description: "52-week data unavailable",
      isSimulated: false,
    };
  }

  const distanceFromHigh =
    ((data.fiftyTwoWeekHigh - data.preMarketPrice) / data.fiftyTwoWeekHigh) * 100;
  let score = 0;

  if (distanceFromHigh <= NEAR_52W_HIGH_THRESHOLD) {
    score = 2;
  } else if (distanceFromHigh <= CLOSE_TO_52W_HIGH_THRESHOLD) {
    score = 1;
  }

  return {
    key: "pricePattern",
    name: "52W High Proximity",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Near 52W high (${distanceFromHigh.toFixed(1)}% away)`
        : score === 1
          ? `Close to 52W high (${distanceFromHigh.toFixed(1)}% away)`
          : `Far from 52W high (${distanceFromHigh.toFixed(1)}% away)`,
    isSimulated: false,
  };
}

/**
 * C5: 촉매 이벤트 개수
 * C5: Catalyst events count
 */
function scoreCatalysts(data: TickerData): ScoreCriterion {
  const count = data.catalysts.length;
  let score = 0;

  if (count >= 3) {
    score = 2;
  } else if (count >= 1) {
    score = 1;
  }

  return {
    key: "newsFreshness",
    name: "Catalyst Events",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Multiple catalysts detected (${count})`
        : score === 1
          ? `Catalyst present (${count})`
          : "No catalysts detected",
    isSimulated: false,
  };
}

/**
 * C6: 소셜 버즈 점수 (시뮬레이션)
 * C6: Social buzz score (simulated)
 * 주의: 이 데이터는 시뮬레이션입니다
 * NOTE: This data is SIMULATED
 */
function scoreSocialBuzz(data: TickerData): ScoreCriterion {
  // 소셜 버즈는 심볼 해시 기반 시뮬레이션
  // Social buzz is simulated based on symbol hash
  const hash = data.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const buzzScore = SOCIAL_BUZZ_MIN + (hash % (SOCIAL_BUZZ_MAX - SOCIAL_BUZZ_MIN));

  let score = 0;
  if (buzzScore >= 70) {
    score = 2;
  } else if (buzzScore >= 40) {
    score = 1;
  }

  return {
    key: "socialBuzz",
    name: "Social Buzz (Simulated)",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `High buzz: ${buzzScore}/100 [SIMULATED]`
        : score === 1
          ? `Moderate buzz: ${buzzScore}/100 [SIMULATED]`
          : `Low buzz: ${buzzScore}/100 [SIMULATED]`,
    isSimulated: true,
  };
}

/**
 * C7: 가격 안정성 (프리마켓 내 고가-저가 스프레드)
 * C7: Price stability (pre-market high-low spread)
 */
function scorePriceStability(data: TickerData): ScoreCriterion {
  const spread =
    data.dayHigh > 0
      ? ((data.dayHigh - data.dayLow) / data.dayHigh) * 100
      : 0;
  let score = 0;

  // 스프레드가 작을수록 안정적 → 높은 점수
  // Smaller spread = more stable = higher score
  if (spread <= 2) {
    score = 2;
  } else if (spread <= 5) {
    score = 1;
  }

  return {
    key: "sectorSentiment",
    name: "Price Stability",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Stable: ${spread.toFixed(1)}% spread`
        : score === 1
          ? `Moderate: ${spread.toFixed(1)}% spread`
          : `Volatile: ${spread.toFixed(1)}% spread`,
    isSimulated: false,
  };
}

/**
 * C8: 거래대금 평가 (가격 x 거래량)
 * C8: Trading value evaluation (price x volume)
 */
function scoreTradingValue(data: TickerData): ScoreCriterion {
  const tradingValue = data.preMarketPrice * data.preMarketVolume;
  let score = 0;

  if (tradingValue >= TRADING_VALUE_HIGH) {
    score = 2;
  } else if (tradingValue >= TRADING_VALUE_MODERATE) {
    score = 1;
  }

  // 거래대금을 읽기 쉬운 형태로 포맷
  // Format trading value for readability
  const formatted =
    tradingValue >= 1_000_000
      ? `$${(tradingValue / 1_000_000).toFixed(1)}M`
      : `$${(tradingValue / 1_000).toFixed(0)}K`;

  return {
    key: "tradingValue",
    name: "Trading Value",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `High trading value: ${formatted}`
        : score === 1
          ? `Moderate trading value: ${formatted}`
          : `Low trading value: ${formatted}`,
    isSimulated: false,
  };
}

/**
 * C9: 전일 종가 대비 변동 폭 (장중 고가-저가 범위)
 * C9: Intraday range vs previous close
 */
function scoreIntradayRange(data: TickerData): ScoreCriterion {
  // #11: Division by zero 방지
  // #11: Division by zero guard
  const range =
    data.prevClose > 0
      ? ((data.dayHigh - data.dayLow) / data.prevClose) * 100
      : 0;
  let score = 0;

  if (range >= INTRADAY_RANGE_HIGH) {
    score = 2;
  } else if (range >= INTRADAY_RANGE_MODERATE) {
    score = 1;
  }

  return {
    key: "intradayRange",
    name: "Intraday Range",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Wide range: ${range.toFixed(1)}% of prev close`
        : score === 1
          ? `Moderate range: ${range.toFixed(1)}% of prev close`
          : `Narrow range: ${range.toFixed(1)}% of prev close`,
    isSimulated: false,
  };
}

/**
 * C10: 거래대금 대비 가격 변동 효율성 (C4/C10 중복 제거)
 * C10: Trading value efficiency — price change per dollar of volume
 */
function scoreTradingValueEfficiency(data: TickerData): ScoreCriterion {
  const tradingValue = data.preMarketPrice * data.preMarketVolume;
  // 거래대금(백만달러) 대비 가격 변동률의 절대값
  // Absolute price change percent per million dollars of trading value
  const tradingValueInMillions = tradingValue / 1_000_000;
  const efficiency = tradingValueInMillions > 0
    ? Math.abs(data.preMarketChangePercent) / tradingValueInMillions
    : 0;

  let score = 0;

  // 높은 효율성 = 적은 거래대금으로 큰 가격 변동
  // High efficiency = large price move with small trading value
  if (efficiency >= TRADING_EFFICIENCY_HIGH) {
    score = 2;
  } else if (efficiency >= TRADING_EFFICIENCY_MODERATE) {
    score = 1;
  }

  return {
    key: "tradingValueEfficiency",
    name: "Trading Value Efficiency",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `High efficiency: ${efficiency.toFixed(2)}%/$M`
        : score === 1
          ? `Moderate efficiency: ${efficiency.toFixed(2)}%/$M`
          : `Low efficiency: ${efficiency.toFixed(2)}%/$M`,
    isSimulated: false,
  };
}

/**
 * C11: 시가총액 규모 (시뮬레이션)
 * C11: Market cap category (simulated)
 * 주의: 시가총액은 시뮬레이션입니다
 * NOTE: Market cap is SIMULATED
 */
function scoreMarketCapCategory(data: TickerData): ScoreCriterion {
  // 시가총액을 가격 기반으로 추정 (시뮬레이션)
  // Estimate market cap from price (simulated)
  const hash = data.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const estimatedMarketCap = data.preMarketPrice * (1_000_000 + (hash % 500_000_000));

  let score = 0;
  let label: string;

  // 소형주일수록 높은 점수 (폭발적 성장 가능성)
  // Smaller cap = higher score (more explosive potential)
  if (estimatedMarketCap < MARKET_CAP_MID) {
    score = 2;
    label = "Small/Micro cap";
  } else if (estimatedMarketCap < MARKET_CAP_LARGE) {
    score = 1;
    label = "Mid cap";
  } else {
    score = 0;
    label = "Large cap";
  }

  return {
    key: "marketCapCategory",
    name: "Market Cap (Simulated)",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      `${label} [SIMULATED]`,
    isSimulated: true,
  };
}

/**
 * C12: 연속 상승일 (시뮬레이션)
 * C12: Consecutive up days (simulated)
 * 주의: 연속 상승일 데이터는 시뮬레이션입니다
 * NOTE: Consecutive up days data is SIMULATED
 */
function scoreConsecutiveUpDays(data: TickerData): ScoreCriterion {
  // 심볼 해시 + 가격 변동 기반 시뮬레이션
  // Simulated based on symbol hash + price change
  const hash = data.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const baseDays = hash % 6;
  // 양의 변동이면 연속 상승 가능성 높음
  // Positive change increases likelihood of consecutive up
  const consecutiveDays = data.preMarketChangePercent > 0 ? baseDays : Math.max(0, baseDays - 2);

  let score = 0;

  if (consecutiveDays >= CONSECUTIVE_UP_DAYS_HIGH) {
    score = 2;
  } else if (consecutiveDays >= CONSECUTIVE_UP_DAYS_MODERATE) {
    score = 1;
  }

  return {
    key: "consecutiveUpDays",
    name: "Consecutive Up Days (Simulated)",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Strong streak: ${consecutiveDays} days [SIMULATED]`
        : score === 1
          ? `Short streak: ${consecutiveDays} days [SIMULATED]`
          : `No streak: ${consecutiveDays} days [SIMULATED]`,
    isSimulated: true,
  };
}

/**
 * 전체 스코어 계산
 * Calculates the total momentum score for a ticker
 */
export function calculateScore(data: TickerData): ScoringResult {
  const criteria: ScoreCriterion[] = [
    scorePreMarketChange(data),
    scoreVolumeRatio(data),
    scoreGapSize(data),
    score52WeekProximity(data),
    scoreCatalysts(data),
    scoreSocialBuzz(data),
    scorePriceStability(data),
    scoreTradingValue(data),
    scoreIntradayRange(data),
    scoreTradingValueEfficiency(data),
    scoreMarketCapCategory(data),
    scoreConsecutiveUpDays(data),
  ];

  const total = criteria.reduce((sum, c) => sum + c.score, 0);
  const maxTotal = TOTAL_CRITERIA_COUNT * MAX_SCORE_PER_CRITERION;

  let signal: "HIGH" | "MODERATE" | "LOW";
  if (total >= HIGH_SIGNAL_THRESHOLD) {
    signal = "HIGH";
  } else if (total >= MODERATE_SIGNAL_THRESHOLD) {
    signal = "MODERATE";
  } else {
    signal = "LOW";
  }

  return { criteria, total, maxTotal, signal };
}

/**
 * 엔트리 전략 생성
 * Generates entry strategy based on ticker data and scoring
 */
export function generateEntryStrategy(
  data: TickerData,
  scoring: ScoringResult
): EntryStrategy {
  const entryPrice = data.preMarketPrice;
  const stopLossPercent = scoring.signal === "HIGH" ? 2 : scoring.signal === "MODERATE" ? 3 : 5;
  const target1Percent = scoring.signal === "HIGH" ? 3 : scoring.signal === "MODERATE" ? 2 : 1;
  const target2Percent = scoring.signal === "HIGH" ? 6 : scoring.signal === "MODERATE" ? 4 : 2;

  const stopLossPrice = parseFloat(
    (entryPrice * (1 - stopLossPercent / 100)).toFixed(2)
  );
  const target1Price = parseFloat(
    (entryPrice * (1 + target1Percent / 100)).toFixed(2)
  );
  const target2Price = parseFloat(
    (entryPrice * (1 + target2Percent / 100)).toFixed(2)
  );

  const riskAmount = entryPrice - stopLossPrice;
  const rewardAmount = target1Price - entryPrice;
  const rr = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(1) : "N/A";

  let notes: string;
  if (scoring.signal === "HIGH") {
    notes = "Strong momentum setup. Consider scaling in near entry zone with tight stop.";
  } else if (scoring.signal === "MODERATE") {
    notes = "Moderate setup. Wait for confirmation at market open before entering.";
  } else {
    notes = "Weak setup. Consider watching only. High risk of reversal.";
  }

  return {
    entryZone: `$${entryPrice.toFixed(2)}`,
    stopLoss: `$${stopLossPrice.toFixed(2)} (-${stopLossPercent}%)`,
    target1: `$${target1Price.toFixed(2)} (+${target1Percent}%)`,
    target2: `$${target2Price.toFixed(2)} (+${target2Percent}%)`,
    riskReward: `1:${rr}`,
    notes,
  };
}
