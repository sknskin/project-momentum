// 저평가 종목 스코어링 로직
// Undervalued stocks scoring logic

import { TickerData, ScoringResult, ScoreCriterion, EntryStrategy } from "./types";
import {
  MAX_SCORE_PER_CRITERION,
  HIGH_SIGNAL_THRESHOLD,
  MODERATE_SIGNAL_THRESHOLD,
  VOLUME_RATIO_HIGH,
  VOLUME_RATIO_MODERATE,
  TOTAL_CRITERIA_COUNT,
  NEAR_52W_LOW_THRESHOLD,
  CLOSE_TO_52W_LOW_THRESHOLD,
  HIGH_GAP_FROM_52W_HIGH_THRESHOLD,
  MODERATE_GAP_FROM_52W_HIGH_THRESHOLD,
  RECOVERY_HIGH_THRESHOLD,
  RECOVERY_MODERATE_THRESHOLD,
  ACCUMULATION_RATIO_HIGH,
  ACCUMULATION_RATIO_MODERATE,
  STABILITY_SPREAD_HIGH,
  STABILITY_SPREAD_MODERATE,
  BOUNCE_STRENGTH_HIGH,
  BOUNCE_STRENGTH_MODERATE,
} from "./constants";

/**
 * C1: 거래량 비율 평가
 * C1: Volume ratio evaluation
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
    key: "volumeRatio",
    name: "Volume Ratio",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `High volume: ${ratio.toFixed(1)}x average`
        : score === 1
          ? `Above average: ${ratio.toFixed(1)}x`
          : `Low volume: ${ratio.toFixed(1)}x average`,
  };
}

/**
 * C2: 52주 최저가 근접도 (가까울수록 높은 점수)
 * C2: 52-week low proximity (closer = higher score)
 */
function score52WeekLowProximity(data: TickerData): ScoreCriterion {
  const distanceFromLow =
    data.fiftyTwoWeekLow > 0
      ? ((data.preMarketPrice - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100
      : 100;

  let score = 0;

  // 52주 최저가에 가까울수록 저평가 가능성 높음
  // Closer to 52-week low = higher undervalue potential
  if (distanceFromLow <= NEAR_52W_LOW_THRESHOLD) {
    score = 2;
  } else if (distanceFromLow <= CLOSE_TO_52W_LOW_THRESHOLD) {
    score = 1;
  }

  return {
    key: "weekLowProximity",
    name: "52W Low Proximity",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Near 52W low (+${distanceFromLow.toFixed(1)}% from low)`
        : score === 1
          ? `Close to 52W low (+${distanceFromLow.toFixed(1)}% from low)`
          : `Far from 52W low (+${distanceFromLow.toFixed(1)}% from low)`,
  };
}

/**
 * C3: 가격 추세 패턴 (양의 변동이면 반등 시그널)
 * C3: Price trend pattern (positive change = recovery signal)
 */
function scorePriceTrend(data: TickerData): ScoreCriterion {
  const changePercent = data.preMarketChangePercent;
  let score = 0;

  // 양의 가격 변동 = 반등 가능성
  // Positive price change = potential recovery
  if (changePercent >= 3) {
    score = 2;
  } else if (changePercent >= 1) {
    score = 1;
  }

  return {
    key: "priceTrend",
    name: "Price Trend",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Strong recovery trend: +${changePercent.toFixed(2)}%`
        : score === 1
          ? `Mild recovery: +${changePercent.toFixed(2)}%`
          : `Weak/negative trend: ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`,
  };
}

/**
 * C4: 최근 저가 대비 가격 회복률
 * C4: Recent price recovery from lows
 */
function scorePriceRecovery(data: TickerData): ScoreCriterion {
  // 당일 저가 대비 현재 가격의 회복률 계산
  // Calculate recovery rate from day low to current price
  const recoveryPercent =
    data.dayLow > 0
      ? ((data.preMarketPrice - data.dayLow) / data.dayLow) * 100
      : 0;

  let score = 0;

  if (recoveryPercent >= RECOVERY_HIGH_THRESHOLD) {
    score = 2;
  } else if (recoveryPercent >= RECOVERY_MODERATE_THRESHOLD) {
    score = 1;
  }

  return {
    key: "priceRecovery",
    name: "Price Recovery",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Strong recovery from lows: +${recoveryPercent.toFixed(1)}%`
        : score === 1
          ? `Moderate recovery: +${recoveryPercent.toFixed(1)}%`
          : `Minimal recovery: +${recoveryPercent.toFixed(1)}%`,
  };
}

/**
 * C5: 가격 안정성 (섹터 심리 프록시)
 * C5: Price stability (sector sentiment proxy)
 */
function scoreSectorSentiment(data: TickerData): ScoreCriterion {
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
    key: "sectorSentimentUV",
    name: "Sector Sentiment",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Stable: ${spread.toFixed(1)}% spread`
        : score === 1
          ? `Moderate: ${spread.toFixed(1)}% spread`
          : `Volatile: ${spread.toFixed(1)}% spread`,
  };
}

/**
 * C6: 52주 최고가 대비 갭 (갭이 클수록 저평가)
 * C6: Gap from 52-week high (larger gap = more undervalued)
 */
function score52WeekHighGap(data: TickerData): ScoreCriterion {
  const gapFromHigh =
    data.fiftyTwoWeekHigh > 0
      ? ((data.fiftyTwoWeekHigh - data.preMarketPrice) / data.fiftyTwoWeekHigh) * 100
      : 0;

  let score = 0;

  // 52주 최고가에서 멀수록 저평가 가능성 높음
  // Farther from 52-week high = more undervalued potential
  if (gapFromHigh >= HIGH_GAP_FROM_52W_HIGH_THRESHOLD) {
    score = 2;
  } else if (gapFromHigh >= MODERATE_GAP_FROM_52W_HIGH_THRESHOLD) {
    score = 1;
  }

  return {
    key: "weekHighGap",
    name: "52W High Gap",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Large gap from high: ${gapFromHigh.toFixed(1)}% below`
        : score === 1
          ? `Moderate gap: ${gapFromHigh.toFixed(1)}% below`
          : `Near high: ${gapFromHigh.toFixed(1)}% below`,
  };
}

/**
 * C7: 기관 관심도 프록시 (거래량 기반)
 * C7: Institutional interest proxy via volume
 */
function scoreInstitutionalVolume(data: TickerData): ScoreCriterion {
  // 높은 거래량 + 저가 = 기관 매집 가능성
  // High volume + low price = potential institutional accumulation
  const ratio = data.volumeRatio;
  const nearLow =
    data.fiftyTwoWeekLow > 0
      ? ((data.preMarketPrice - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100
      : 100;

  let score = 0;

  // 거래량이 높으면서 저가 근처 = 기관 매집 시그널
  // High volume near lows = institutional accumulation signal
  if (ratio >= VOLUME_RATIO_HIGH && nearLow <= CLOSE_TO_52W_LOW_THRESHOLD) {
    score = 2;
  } else if (ratio >= VOLUME_RATIO_MODERATE && nearLow <= CLOSE_TO_52W_LOW_THRESHOLD * 2) {
    score = 1;
  }

  return {
    key: "institutionalVolume",
    name: "Institutional Volume",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `High volume near lows — accumulation signal (${ratio.toFixed(1)}x vol)`
        : score === 1
          ? `Moderate volume interest (${ratio.toFixed(1)}x vol)`
          : `Low institutional signal (${ratio.toFixed(1)}x vol)`,
  };
}

/**
 * C8: 거래대금 대비 시가총액 비율 (매집 시그널)
 * C8: Trading value vs estimated market cap (accumulation signal)
 * 주의: 시가총액은 시뮬레이션입니다
 * NOTE: Market cap is SIMULATED
 */
function scoreTradingValueVsMarketCap(data: TickerData): ScoreCriterion {
  const tradingValue = data.preMarketPrice * data.preMarketVolume;
  // 시가총액을 심볼 해시 기반으로 추정 (시뮬레이션)
  // Estimate market cap from symbol hash (simulated)
  const hash = data.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const estimatedMarketCap = data.preMarketPrice * (1_000_000 + (hash % 500_000_000));
  const ratio = estimatedMarketCap > 0 ? (tradingValue / estimatedMarketCap) * 100 : 0;

  let score = 0;

  // 높은 비율 = 매집 시그널
  // High ratio = accumulation signal
  if (ratio >= ACCUMULATION_RATIO_HIGH) {
    score = 2;
  } else if (ratio >= ACCUMULATION_RATIO_MODERATE) {
    score = 1;
  }

  return {
    key: "tradingValueVsMarketCap",
    name: "Trading Value vs Market Cap",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `High accumulation signal: ${ratio.toFixed(2)}% [SIMULATED]`
        : score === 1
          ? `Moderate accumulation: ${ratio.toFixed(2)}% [SIMULATED]`
          : `Low accumulation: ${ratio.toFixed(2)}% [SIMULATED]`,
  };
}

/**
 * C9: 가격 변동 안정성 (가격 대비 장중 변동폭)
 * C9: Price stability (intraday range vs price)
 */
function scorePriceStabilityUV(data: TickerData): ScoreCriterion {
  const range =
    data.preMarketPrice > 0
      ? ((data.dayHigh - data.dayLow) / data.preMarketPrice) * 100
      : 0;
  let score = 0;

  // 변동폭이 작을수록 안정적인 회복 신호
  // Smaller range = stable recovery signal
  if (range <= STABILITY_SPREAD_HIGH) {
    score = 2;
  } else if (range <= STABILITY_SPREAD_MODERATE) {
    score = 1;
  }

  return {
    key: "priceStability",
    name: "Price Stability",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Very stable: ${range.toFixed(1)}% range`
        : score === 1
          ? `Moderately stable: ${range.toFixed(1)}% range`
          : `Unstable: ${range.toFixed(1)}% range`,
  };
}

/**
 * C10: 이전 지지선 근접도 (52주 최저가와 당일 저가의 중간값 대비)
 * C10: Support level proximity (near midpoint of 52W low and day low)
 */
function scoreSupportLevelProximity(data: TickerData): ScoreCriterion {
  // 지지선을 52주 최저가와 당일 저가의 중간값으로 추정
  // Estimate support level as midpoint of 52W low and day low
  const supportLevel =
    data.fiftyTwoWeekLow > 0 && data.dayLow > 0
      ? (data.fiftyTwoWeekLow + data.dayLow) / 2
      : 0;

  const distance =
    supportLevel > 0
      ? ((data.preMarketPrice - supportLevel) / supportLevel) * 100
      : 100;

  let score = 0;

  // 지지선에 가까울수록 반등 가능성 높음
  // Closer to support = higher bounce potential
  if (distance <= 5) {
    score = 2;
  } else if (distance <= 15) {
    score = 1;
  }

  return {
    key: "supportLevelProximity",
    name: "Support Level Proximity",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Near support: +${distance.toFixed(1)}% above`
        : score === 1
          ? `Close to support: +${distance.toFixed(1)}% above`
          : `Far from support: +${distance.toFixed(1)}% above`,
  };
}

/**
 * C11: 거래량 증가 추세 (시뮬레이션)
 * C11: Volume trend (simulated)
 * 주의: 거래량 추세 데이터는 시뮬레이션입니다
 * NOTE: Volume trend data is SIMULATED
 */
function scoreVolumeTrend(data: TickerData): ScoreCriterion {
  // 거래량 비율과 심볼 해시로 추세 시뮬레이션
  // Simulate trend using volume ratio and symbol hash
  const hash = data.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const trendBias = hash % 3; // 0: decreasing, 1: flat, 2: increasing

  let score = 0;
  let label: string;

  // 거래량 비율이 높으면 증가 추세로 간주
  // Higher volume ratio biases toward increasing trend
  if (trendBias === 2 || data.volumeRatio >= VOLUME_RATIO_HIGH) {
    score = 2;
    label = "Increasing";
  } else if (trendBias === 1 || data.volumeRatio >= VOLUME_RATIO_MODERATE) {
    score = 1;
    label = "Flat";
  } else {
    score = 0;
    label = "Decreasing";
  }

  return {
    key: "volumeTrend",
    name: "Volume Trend (Simulated)",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      `${label} volume trend [SIMULATED]`,
  };
}

/**
 * C12: 반등 강도 (52주 최저가 대비 회복률)
 * C12: Bounce strength (recovery from 52-week low)
 */
function scoreBounceStrength(data: TickerData): ScoreCriterion {
  const bouncePercent =
    data.fiftyTwoWeekLow > 0
      ? ((data.preMarketPrice - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100
      : 0;

  let score = 0;

  if (bouncePercent >= BOUNCE_STRENGTH_HIGH) {
    score = 2;
  } else if (bouncePercent >= BOUNCE_STRENGTH_MODERATE) {
    score = 1;
  }

  return {
    key: "bounceStrength",
    name: "Bounce Strength",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Strong bounce: +${bouncePercent.toFixed(1)}% from 52W low`
        : score === 1
          ? `Moderate bounce: +${bouncePercent.toFixed(1)}% from 52W low`
          : `Weak bounce: +${bouncePercent.toFixed(1)}% from 52W low`,
  };
}

/**
 * 저평가 종목 전체 스코어 계산
 * Calculates the total undervalue score for a ticker
 */
export function calculateUndervaluedScore(data: TickerData): ScoringResult {
  const criteria: ScoreCriterion[] = [
    scoreVolumeRatio(data),
    score52WeekLowProximity(data),
    scorePriceTrend(data),
    scorePriceRecovery(data),
    scoreSectorSentiment(data),
    score52WeekHighGap(data),
    scoreInstitutionalVolume(data),
    scoreTradingValueVsMarketCap(data),
    scorePriceStabilityUV(data),
    scoreSupportLevelProximity(data),
    scoreVolumeTrend(data),
    scoreBounceStrength(data),
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
 * 저평가 종목용 엔트리 전략 생성
 * Generates entry strategy for undervalued stocks
 */
export function generateUndervaluedEntryStrategy(
  data: TickerData,
  scoring: ScoringResult
): EntryStrategy {
  const entryPrice = data.preMarketPrice;
  const stopLossPercent = scoring.signal === "HIGH" ? 3 : scoring.signal === "MODERATE" ? 5 : 7;
  const target1Percent = scoring.signal === "HIGH" ? 5 : scoring.signal === "MODERATE" ? 3 : 2;
  const target2Percent = scoring.signal === "HIGH" ? 10 : scoring.signal === "MODERATE" ? 6 : 3;

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
    notes = "Strong undervalue signal. Consider gradual accumulation near entry zone.";
  } else if (scoring.signal === "MODERATE") {
    notes = "Moderate undervalue signal. Wait for market confirmation before entering.";
  } else {
    notes = "Weak undervalue signal. Monitor only. May be undervalued for good reason.";
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
