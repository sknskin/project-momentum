"use client";

// 새로고침 카운트다운 컴포넌트
// Refresh countdown component

import { useEffect, useState, useCallback } from "react";
import { REFRESH_INTERVAL_SEC } from "@/lib/constants";
import { useLanguage } from "@/lib/i18n";

interface RefreshCountdownProps {
  onRefresh: () => void;
}

/** SVG 원형 카운트다운의 반지름 / SVG circular countdown radius */
const CIRCLE_RADIUS = 14;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export default function RefreshCountdown({ onRefresh }: RefreshCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SEC);
  const { t } = useLanguage();

  /**
   * 카운트다운 리셋
   * Reset countdown
   */
  const resetCountdown = useCallback(() => {
    setSecondsLeft(REFRESH_INTERVAL_SEC);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onRefresh();
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onRefresh]);

  // 원형 프로그레스 오프셋 계산
  // Calculate circular progress offset
  const progress = secondsLeft / REFRESH_INTERVAL_SEC;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  return (
    <button
      onClick={() => {
        onRefresh();
        resetCountdown();
      }}
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full border transition-colors cursor-pointer"
      style={{
        background: "var(--m-card)",
        borderColor: "var(--m-border-strategy)",
      }}
      title={t.clickToRefresh}
    >
      {/* 원형 카운트다운 SVG / Circular countdown SVG */}
      <svg width="32" height="32" viewBox="0 0 36 36" className="rotate-[-90deg]">
        {/* 배경 원 / Background circle */}
        <circle
          cx="18"
          cy="18"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="var(--m-bar-bg)"
          strokeWidth="3"
        />
        {/* 프로그레스 원 / Progress circle */}
        <circle
          cx="18"
          cy="18"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="var(--m-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="text-xs font-mono" style={{ color: "var(--m-text)" }}>
        {secondsLeft}s
      </span>
    </button>
  );
}
