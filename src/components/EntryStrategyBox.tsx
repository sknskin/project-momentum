"use client";

// 엔트리 전략 표시 컴포넌트
// Entry strategy display component

import { EntryStrategy } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

interface EntryStrategyBoxProps {
  strategy: EntryStrategy;
}

export default function EntryStrategyBox({ strategy }: EntryStrategyBoxProps) {
  const { t } = useLanguage();

  return (
    <div
      className="mt-3 p-3 rounded-lg border"
      style={{
        background: "var(--m-card-strategy)",
        borderColor: "var(--m-border-strategy)",
      }}
    >
      {/* 제목 / Title */}
      <h4
        className="text-xs font-bold mb-2 uppercase tracking-wider"
        style={{ color: "var(--m-accent)" }}
      >
        {t.entryStrategy}
      </h4>

      {/* 전략 상세 정보 그리드 */}
      {/* Strategy details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span style={{ color: "var(--m-text-muted)" }}>{t.entryZone}</span>
          <span className="ml-1 font-mono" style={{ color: "var(--m-text)" }}>
            {strategy.entryZone}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--m-text-muted)" }}>{t.stopLoss}</span>
          <span className="ml-1 font-mono" style={{ color: "var(--m-high)" }}>
            {strategy.stopLoss}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--m-text-muted)" }}>{t.target1}</span>
          <span className="ml-1 font-mono" style={{ color: "var(--m-green)" }}>
            {strategy.target1}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--m-text-muted)" }}>{t.target2}</span>
          <span className="ml-1 font-mono" style={{ color: "var(--m-green)" }}>
            {strategy.target2}
          </span>
        </div>
        <div className="col-span-2">
          <span style={{ color: "var(--m-text-muted)" }}>{t.riskReward}</span>
          <span
            className="ml-1 font-mono font-bold"
            style={{ color: "var(--m-moderate-color)" }}
          >
            {strategy.riskReward}
          </span>
        </div>
      </div>

      {/* 참고 사항 / Notes */}
      <p className="mt-2 text-[10px] italic" style={{ color: "var(--m-note-text)" }}>
        {strategy.notes}
      </p>
    </div>
  );
}
