"use client";

// 스코어 기준 프로그레스 바 컴포넌트
// Score criteria progress bar component

import { ScoreCriterion, AnyCriterionKey } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

interface ScoreCriteriaBarProps {
  criterion: ScoreCriterion;
}

/**
 * 기준 키에 따른 번역된 이름 반환
 * Returns translated name based on criterion key
 */
function getTranslatedName(
  key: AnyCriterionKey,
  t: {
    criteriaPreMarketVolume: string;
    criteriaPriceChange: string;
    criteriaPricePattern: string;
    criteriaNewsFreshness: string;
    criteriaSectorSentiment: string;
    criteriaGapHold: string;
    criteriaSocialBuzz: string;
    criteriaTradingValue: string;
    criteriaIntradayRange: string;
    criteriaWeekHighProximity: string;
    criteriaMarketCapCategory: string;
    criteriaConsecutiveUpDays: string;
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
  }
): string {
  const map: Record<AnyCriterionKey, string> = {
    // SNS 화제 종목 기준 / SNS Trending criteria
    preMarketVolume: t.criteriaPreMarketVolume,
    priceChange: t.criteriaPriceChange,
    pricePattern: t.criteriaPricePattern,
    newsFreshness: t.criteriaNewsFreshness,
    sectorSentiment: t.criteriaSectorSentiment,
    gapHold: t.criteriaGapHold,
    socialBuzz: t.criteriaSocialBuzz,
    tradingValue: t.criteriaTradingValue,
    intradayRange: t.criteriaIntradayRange,
    weekHighProximity: t.criteriaWeekHighProximity,
    marketCapCategory: t.criteriaMarketCapCategory,
    consecutiveUpDays: t.criteriaConsecutiveUpDays,
    // 저평가 종목 기준 / Undervalued criteria
    volumeRatio: t.criteriaVolumeRatio,
    weekLowProximity: t.criteria52WeekLowProximity,
    priceTrend: t.criteriaPriceTrend,
    priceRecovery: t.criteriaPriceRecovery,
    sectorSentimentUV: t.criteriaSectorSentimentUV,
    weekHighGap: t.criteria52WeekHighGap,
    institutionalVolume: t.criteriaInstitutionalVolume,
    tradingValueVsMarketCap: t.criteriaTradingValueVsMarketCap,
    priceStability: t.criteriaPriceStability,
    supportLevelProximity: t.criteriaSupportLevelProximity,
    volumeTrend: t.criteriaVolumeTrend,
    bounceStrength: t.criteriaBounceStrength,
  };
  return map[key];
}

/**
 * 점수에 따른 바 색상 CSS 변수 반환
 * Returns bar color CSS variable based on score
 */
function getBarColor(score: number): string {
  if (score === 2) return "var(--m-accent)";
  if (score === 1) return "var(--m-moderate-color)";
  return "var(--m-low-color)";
}

/**
 * 점수에 따른 텍스트 색상 CSS 변수 반환
 * Returns text color CSS variable based on score
 */
function getTextColor(score: number): string {
  if (score === 2) return "var(--m-accent)";
  if (score === 1) return "var(--m-moderate-color)";
  return "var(--m-low-color)";
}

export default function ScoreCriteriaBar({ criterion }: ScoreCriteriaBarProps) {
  const { t } = useLanguage();
  const widthPercent = (criterion.score / criterion.maxScore) * 100;
  const translatedName = getTranslatedName(criterion.key, t);

  return (
    <div className="mb-2">
      {/* 라벨 및 점수 표시 */}
      {/* Label and score display */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs" style={{ color: "var(--m-text)" }}>
          {translatedName}
        </span>
        <span
          className="text-xs font-bold"
          style={{ color: getTextColor(criterion.score) }}
        >
          {criterion.score}/{criterion.maxScore}
        </span>
      </div>

      {/* 프로그레스 바 */}
      {/* Progress bar */}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: "var(--m-bar-bg)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${widthPercent}%`,
            background: getBarColor(criterion.score),
          }}
        />
      </div>

      {/* 설명 텍스트 */}
      {/* Description text */}
      <p className="text-[10px] mt-0.5" style={{ color: "var(--m-text-muted)" }}>
        {criterion.description}
      </p>
    </div>
  );
}
