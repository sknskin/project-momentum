// ┌─────────────────────────────────────────────────────────────────────┐
// │ ⚠ WARNING — 이 스코어링 로직은 투자 조언이 아닙니다               │
// │ ⚠ WARNING — This scoring logic is NOT investment advice            │
// │                                                                     │
// │ 이 도구는 교육 및 정보 제공 목적으로만 제공됩니다.                 │
// │ 펀더멘털 분석(P/E, P/B, DCF) 없이 가격/거래량만으로 판단합니다.  │
// │ 52주 최저가 근접 = 기업 위기일 수 있습니다.                       │
// │                                                                     │
// │ 상세: docs/SCORING_LOGIC_AUDIT.md                                  │
// └─────────────────────────────────────────────────────────────────────┘
//
// 저평가 종목 스코어링 로직 (10기준, 최대 20점)
// Undervalued stocks scoring logic (10 criteria, max 20 points)

import { TickerData, ScoringResult, ScoreCriterion, EntryStrategy } from "./types";
import {
  MAX_SCORE_PER_CRITERION,
  HIGH_SIGNAL_RATIO,
  MODERATE_SIGNAL_RATIO,
  VOLUME_RATIO_HIGH,
  VOLUME_RATIO_MODERATE,
  NEAR_52W_LOW_THRESHOLD,
  CLOSE_TO_52W_LOW_THRESHOLD,
  HIGH_GAP_FROM_52W_HIGH_THRESHOLD,
  MODERATE_GAP_FROM_52W_HIGH_THRESHOLD,
  RECOVERY_HIGH_THRESHOLD,
  RECOVERY_MODERATE_THRESHOLD,
  STABILITY_SPREAD_HIGH,
  STABILITY_SPREAD_MODERATE,
  BOUNCE_SWEET_SPOT_MIN,
  BOUNCE_SWEET_SPOT_MAX,
  BOUNCE_WIDER_MIN,
  BOUNCE_WIDER_MAX,
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
    isSimulated: false,
  };
}

/**
 * C2: 52주 최저가 근접도 (가까울수록 높은 점수)
 * C2: 52-week low proximity (closer = higher score)
 */
function score52WeekLowProximity(data: TickerData): ScoreCriterion {
  // #5: 52주 데이터 없으면 0점
  // #5: 0 points when 52-week data is missing
  if (!data.has52WeekData || data.fiftyTwoWeekLow === null || data.fiftyTwoWeekLow <= 0) {
    return {
      key: "weekLowProximity",
      name: "52W Low Proximity",
      score: 0,
      maxScore: MAX_SCORE_PER_CRITERION,
      description: "52-week data unavailable",
      isSimulated: false,
    };
  }

  const distanceFromLow =
    ((data.preMarketPrice - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100;

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
    isSimulated: false,
  };
}

/**
 * C3: 프리마켓 방향 (양의 변동이면 반등 시그널)
 * C3: Pre-market direction (positive change = recovery signal)
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
    name: "Pre-Market Direction",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Strong recovery signal: +${changePercent.toFixed(2)}%`
        : score === 1
          ? `Mild positive move: +${changePercent.toFixed(2)}%`
          : `Weak/negative: ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`,
    isSimulated: false,
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
    isSimulated: false,
  };
}

/**
 * C5: 가격 스프레드 (장중 고가-저가 변동폭)
 * C5: Price spread (intraday high-low range)
 */
function scorePriceSpread(data: TickerData): ScoreCriterion {
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
    name: "Price Spread",
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
 * C6: 52주 최고가 대비 갭 (갭이 클수록 저평가)
 * C6: Gap from 52-week high (larger gap = more undervalued)
 */
function score52WeekHighGap(data: TickerData): ScoreCriterion {
  // #5: 52주 데이터 없으면 0점
  // #5: 0 points when 52-week data is missing
  if (!data.has52WeekData || data.fiftyTwoWeekHigh === null || data.fiftyTwoWeekHigh <= 0) {
    return {
      key: "weekHighGap",
      name: "52W High Gap",
      score: 0,
      maxScore: MAX_SCORE_PER_CRITERION,
      description: "52-week data unavailable",
      isSimulated: false,
    };
  }

  const gapFromHigh =
    ((data.fiftyTwoWeekHigh - data.preMarketPrice) / data.fiftyTwoWeekHigh) * 100;

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
    isSimulated: false,
  };
}

/**
 * C7: 저가 부근 거래량 (거래량 + 52주 최저가 조합)
 * C7: Volume near lows (volume ratio + 52W low proximity combined)
 */
function scoreVolumeNearLows(data: TickerData): ScoreCriterion {
  // 높은 거래량 + 저가 = 매수세 유입 가능성
  // High volume + low price = potential buying pressure
  const ratio = data.volumeRatio;
  const nearLow =
    data.fiftyTwoWeekLow !== null && data.fiftyTwoWeekLow > 0
      ? ((data.preMarketPrice - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100
      : 100;

  let score = 0;

  // 거래량이 높으면서 저가 근처 = 매수세 유입 시그널
  // High volume near lows = buying pressure signal
  if (ratio >= VOLUME_RATIO_HIGH && nearLow <= CLOSE_TO_52W_LOW_THRESHOLD) {
    score = 2;
  } else if (ratio >= VOLUME_RATIO_MODERATE && nearLow <= CLOSE_TO_52W_LOW_THRESHOLD * 2) {
    score = 1;
  }

  return {
    key: "institutionalVolume",
    name: "Volume Near Lows",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `High volume near lows — buying signal (${ratio.toFixed(1)}x vol)`
        : score === 1
          ? `Moderate volume interest (${ratio.toFixed(1)}x vol)`
          : `Low volume signal (${ratio.toFixed(1)}x vol)`,
    isSimulated: false,
  };
}

/**
 * C8: 가격 변동 안정성 (가격 대비 장중 변동폭)
 * C8: Price stability (intraday range vs price)
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
    isSimulated: false,
  };
}

/**
 * C9: 이전 지지선 근접도 (52주 최저가와 당일 저가의 중간값 대비)
 * C9: Support level proximity (near midpoint of 52W low and day low)
 */
function scoreSupportLevelProximity(data: TickerData): ScoreCriterion {
  // #5: 52주 데이터 없으면 0점
  // #5: 0 points when 52-week data is missing
  if (data.fiftyTwoWeekLow === null || data.fiftyTwoWeekLow <= 0) {
    return {
      key: "supportLevelProximity",
      name: "Support Level Proximity",
      score: 0,
      maxScore: MAX_SCORE_PER_CRITERION,
      description: "52-week data unavailable",
      isSimulated: false,
    };
  }

  // 지지선을 52주 최저가와 당일 저가의 중간값으로 추정
  // Estimate support level as midpoint of 52W low and day low
  const supportLevel =
    data.dayLow > 0
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
    isSimulated: false,
  };
}

/**
 * C10: 바닥 확인 (52주 최저가 대비 적정 반등 sweet spot)
 * C10: Bottom confirmation (moderate bounce from 52W low = sweet spot)
 *
 * C2(52주 저가 근접)와 상호보완적으로 동작:
 * - C2: "가격이 저렴한가?" (52주 최저가 근접)
 * - C10: "바닥이 확인되었는가?" (적정 수준 반등 = 매수세 유입 확인)
 * - 10~25% 반등 = 바닥 확인 + 아직 저평가 구간 (최고점)
 */
function scoreBottomConfirmation(data: TickerData): ScoreCriterion {
  // #5: 52주 데이터 없으면 0점
  // #5: 0 points when 52-week data is missing
  if (data.fiftyTwoWeekLow === null || data.fiftyTwoWeekLow <= 0) {
    return {
      key: "bottomConfirmation",
      name: "Bottom Confirmation",
      score: 0,
      maxScore: MAX_SCORE_PER_CRITERION,
      description: "52-week data unavailable",
      isSimulated: false,
    };
  }

  const bouncePercent =
    ((data.preMarketPrice - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100;

  let score = 0;

  // Sweet spot: 10~25% 반등 = 바닥 확인 + 아직 저평가 구간
  // Sweet spot: 10-25% bounce = confirmed bottom + still undervalued
  if (bouncePercent >= BOUNCE_SWEET_SPOT_MIN && bouncePercent <= BOUNCE_SWEET_SPOT_MAX) {
    score = 2;
  } else if (bouncePercent >= BOUNCE_WIDER_MIN && bouncePercent <= BOUNCE_WIDER_MAX) {
    score = 1;
  }

  return {
    key: "bottomConfirmation",
    name: "Bottom Confirmation",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Confirmed bottom: +${bouncePercent.toFixed(1)}% from 52W low (sweet spot)`
        : score === 1
          ? `Possible bottom: +${bouncePercent.toFixed(1)}% from 52W low`
          : bouncePercent < BOUNCE_WIDER_MIN
            ? `Still near bottom: +${bouncePercent.toFixed(1)}% (not confirmed)`
            : `Already recovered: +${bouncePercent.toFixed(1)}% (above sweet spot)`,
    isSimulated: false,
  };
}

/**
 * 저평가 종목 전체 스코어 계산 (10기준, 최대 20점)
 * Calculates the total undervalue score (10 criteria, max 20 points)
 */
export function calculateUndervaluedScore(data: TickerData): ScoringResult {
  const criteria: ScoreCriterion[] = [
    scoreVolumeRatio(data),
    score52WeekLowProximity(data),
    scorePriceTrend(data),
    scorePriceRecovery(data),
    scorePriceSpread(data),
    score52WeekHighGap(data),
    scoreVolumeNearLows(data),
    scorePriceStabilityUV(data),
    scoreSupportLevelProximity(data),
    scoreBottomConfirmation(data),
  ];

  const total = criteria.reduce((sum, c) => sum + c.score, 0);
  const maxTotal = criteria.length * MAX_SCORE_PER_CRITERION;

  // 비율 기반 시그널 판정
  // Ratio-based signal threshold
  let signal: "HIGH" | "MODERATE" | "LOW";
  if (total >= Math.ceil(maxTotal * HIGH_SIGNAL_RATIO)) {
    signal = "HIGH";
  } else if (total >= Math.ceil(maxTotal * MODERATE_SIGNAL_RATIO)) {
    signal = "MODERATE";
  } else {
    signal = "LOW";
  }

  return { criteria, total, maxTotal, signal };
}

/**
 * 저평가 종목용 엔트리 전략 생성
 * Generates entry strategy for undervalued stocks
 *
 * ⚠ 고정 % 기반 — 실제 지지/저항선, ATR, 거래량 프로파일 미반영
 * ⚠ Fixed % based — ignores actual S/R levels, ATR, volume profile
 * ⚠ 펀더멘털 미반영: 가격 기반만으로 "저평가" 판단은 위험
 * ⚠ No fundamentals: judging "undervalued" from price alone is risky
 */
export function generateUndervaluedEntryStrategy(
  data: TickerData,
  scoring: ScoringResult
): EntryStrategy {
  const entryPrice = data.preMarketPrice;
  const stopLossPercent = scoring.signal === "HIGH" ? 5 : scoring.signal === "MODERATE" ? 7 : 10;
  const target1Percent = scoring.signal === "HIGH" ? 8 : scoring.signal === "MODERATE" ? 5 : 3;
  const target2Percent = scoring.signal === "HIGH" ? 15 : scoring.signal === "MODERATE" ? 10 : 5;

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
    notes = "Strong undervalue signal with technical confirmation. Consider gradual accumulation. Verify fundamentals (P/E, debt) before acting.";
  } else if (scoring.signal === "MODERATE") {
    notes = "Moderate signal. Wait for broader market confirmation. Research company fundamentals — stock may be cheap for valid reasons.";
  } else {
    notes = "Weak signal. The stock may be declining for fundamental reasons (debt, revenue loss). Do not enter without thorough fundamental analysis.";
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
