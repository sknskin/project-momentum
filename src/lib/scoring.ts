// ┌─────────────────────────────────────────────────────────────────────┐
// │ ⚠ WARNING — 이 스코어링 로직은 투자 조언이 아닙니다               │
// │ ⚠ WARNING — This scoring logic is NOT investment advice            │
// │                                                                     │
// │ 이 도구는 교육 및 정보 제공 목적으로만 제공됩니다.                 │
// │ 거래 결정 전 반드시 본인의 리서치를 수행하세요.                    │
// │                                                                     │
// │ 상세: docs/SCORING_LOGIC_AUDIT.md                                  │
// └─────────────────────────────────────────────────────────────────────┘
//
// SNS 화제 종목 스코어링 로직 (8기준, 최대 16점)
// SNS Trending stocks scoring logic (8 criteria, max 16 points)

import { TickerData, ScoringResult, ScoreCriterion, EntryStrategy } from "./types";
import {
  MAX_SCORE_PER_CRITERION,
  HIGH_SIGNAL_RATIO,
  MODERATE_SIGNAL_RATIO,
  VOLUME_RATIO_HIGH,
  VOLUME_RATIO_MODERATE,
  CHANGE_PERCENT_HIGH,
  CHANGE_PERCENT_MODERATE,
  NEAR_52W_HIGH_THRESHOLD,
  CLOSE_TO_52W_HIGH_THRESHOLD,
  GAP_LARGE_THRESHOLD,
  GAP_MODERATE_THRESHOLD,
  TRADING_VALUE_HIGH,
  TRADING_VALUE_MODERATE,
  INTRADAY_RANGE_HIGH,
  INTRADAY_RANGE_MODERATE,
  TRADING_EFFICIENCY_HIGH,
  TRADING_EFFICIENCY_MODERATE,
} from "./constants";

/**
 * C1: 프리마켓 가격 변동률 평가 (양의 변동만 점수화)
 * C1: Pre-market price change evaluation (positive change only)
 */
function scorePreMarketChange(data: TickerData): ScoreCriterion {
  // 양의 변동만 점수화 — 하락은 모멘텀이 아닌 위험 신호
  // Only positive change scores — decline is a risk signal, not momentum
  const change = data.preMarketChangePercent;
  let score = 0;

  if (change >= CHANGE_PERCENT_HIGH) {
    score = 2;
  } else if (change >= CHANGE_PERCENT_MODERATE) {
    score = 1;
  }

  return {
    key: "priceChange",
    name: "Pre-Market Change",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Strong rally: +${change.toFixed(2)}%`
        : score === 1
          ? `Moderate gain: +${change.toFixed(2)}%`
          : `Weak/negative: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
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
 * C3: 갭 크기 평가 (양의 갭만 점수화)
 * C3: Gap size evaluation (positive gap only)
 */
function scoreGapSize(data: TickerData): ScoreCriterion {
  // 양의 갭만 점수화 — 하락 갭은 위험 신호
  // Only positive gaps score — downward gaps are risk signals
  // #11: Division by zero 방지
  // #11: Division by zero guard
  const gapPercent = data.prevClose > 0
    ? ((data.preMarketPrice - data.prevClose) / data.prevClose) * 100
    : 0;
  let score = 0;

  if (gapPercent >= GAP_LARGE_THRESHOLD) {
    score = 2;
  } else if (gapPercent >= GAP_MODERATE_THRESHOLD) {
    score = 1;
  }

  return {
    key: "gapHold",
    name: "Gap Up Size",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Large gap up: +${gapPercent.toFixed(1)}%`
        : score === 1
          ? `Moderate gap up: +${gapPercent.toFixed(1)}%`
          : `Small/negative gap: ${gapPercent >= 0 ? "+" : ""}${gapPercent.toFixed(1)}%`,
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
 * C5: 촉매 감지 (자동 생성 — 실제 뉴스 피드 아님)
 * C5: Catalyst detection (auto-generated — not real news feed)
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
    name: "Catalyst Detection",
    score,
    maxScore: MAX_SCORE_PER_CRITERION,
    description:
      score === 2
        ? `Multiple signals detected (${count})`
        : score === 1
          ? `Signal present (${count})`
          : "No signals detected",
    isSimulated: false,
  };
}

/**
 * C6: 거래대금 평가 (가격 x 거래량)
 * C6: Trading value evaluation (price x volume)
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
 * C7: 전일 종가 대비 변동 폭 (장중 고가-저가 범위)
 * C7: Intraday range vs previous close
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
 * C8: 거래대금 대비 가격 변동 효율성 (양의 변동만)
 * C8: Trading value efficiency — positive price change per dollar of volume
 */
function scoreTradingValueEfficiency(data: TickerData): ScoreCriterion {
  const tradingValue = data.preMarketPrice * data.preMarketVolume;
  // 양의 가격 변동만 효율성 측정 — 하락 효율은 의미 없음
  // Only measure efficiency for positive changes — decline efficiency is meaningless
  const tradingValueInMillions = tradingValue / 1_000_000;
  const efficiency = tradingValueInMillions > 0 && data.preMarketChangePercent > 0
    ? data.preMarketChangePercent / tradingValueInMillions
    : 0;

  let score = 0;

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
 * 전체 스코어 계산 (8기준, 최대 16점)
 * Calculates the total momentum score (8 criteria, max 16 points)
 */
export function calculateScore(data: TickerData): ScoringResult {
  const criteria: ScoreCriterion[] = [
    scorePreMarketChange(data),
    scoreVolumeRatio(data),
    scoreGapSize(data),
    score52WeekProximity(data),
    scoreCatalysts(data),
    scoreTradingValue(data),
    scoreIntradayRange(data),
    scoreTradingValueEfficiency(data),
  ];

  const total = criteria.reduce((sum, c) => sum + c.score, 0);
  const maxTotal = criteria.length * MAX_SCORE_PER_CRITERION;

  // 비율 기반 시그널 판정 — 기준 개수와 무관하게 동작
  // Ratio-based signal — works regardless of criteria count
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
 * 엔트리 전략 생성
 * Generates entry strategy based on ticker data and scoring
 *
 * ⚠ 고정 % 기반 — 실제 지지/저항선, ATR, 거래량 프로파일 미반영
 * ⚠ Fixed % based — ignores actual S/R levels, ATR, volume profile
 */
export function generateEntryStrategy(
  data: TickerData,
  scoring: ScoringResult
): EntryStrategy {
  const entryPrice = data.preMarketPrice;
  const stopLossPercent = scoring.signal === "HIGH" ? 3 : scoring.signal === "MODERATE" ? 4 : 5;
  const target1Percent = scoring.signal === "HIGH" ? 5 : scoring.signal === "MODERATE" ? 3 : 2;
  const target2Percent = scoring.signal === "HIGH" ? 8 : scoring.signal === "MODERATE" ? 5 : 3;

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
    notes = "Strong momentum setup. Consider scaling in near entry zone with defined stop. R:R favors this setup.";
  } else if (scoring.signal === "MODERATE") {
    notes = "Average setup. Wait for market open confirmation. R:R is marginal — manage position size carefully.";
  } else {
    notes = "Weak setup. R:R unfavorable. Watch only — do not enter without additional confirmation from other sources.";
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
