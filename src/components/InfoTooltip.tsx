"use client";

// 정보 툴팁 컴포넌트 — (?) 아이콘에 호버/탭 시 설명 팝업 표시
// Info tooltip component — shows explanation popup on hover/tap of (?) icon
// Portal 기반으로 모달/스크롤 컨테이너 내에서도 잘리지 않음
// Portal-based so it never gets clipped by modal/scroll containers

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface InfoTooltipProps {
  /** 툴팁에 표시할 텍스트 / Text to display in tooltip */
  text: string;
}

/** 툴팁 최대 너비 (px) / Tooltip max width (px) */
const TOOLTIP_MAX_WIDTH = 280;

/** 뷰포트 여백 (px) / Viewport margin (px) */
const VIEWPORT_MARGIN = 12;

/** 아이콘과 툴팁 사이 간격 (px) / Gap between icon and tooltip (px) */
const TOOLTIP_GAP = 8;

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const iconRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  /**
   * 아이콘의 뷰포트 좌표 기반으로 툴팁 위치 계산
   * Calculate tooltip position based on icon's viewport coordinates
   */
  const calculatePosition = useCallback(() => {
    const icon = iconRef.current;
    const tooltip = tooltipRef.current;
    if (!icon || !tooltip) return;

    const iconRect = icon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipHeight = tooltipRect.height;
    const tooltipWidth = tooltipRect.width;

    // 기본: 아이콘 아래 중앙 정렬
    // Default: centered below icon
    let top = iconRect.bottom + TOOLTIP_GAP;
    let left = iconRect.left + iconRect.width / 2 - tooltipWidth / 2;
    let newPlacement: "below" | "above" = "below";

    // 아래 공간 부족 → 위로 배치
    // Not enough space below → position above
    if (top + tooltipHeight > window.innerHeight - VIEWPORT_MARGIN) {
      top = iconRect.top - TOOLTIP_GAP - tooltipHeight;
      newPlacement = "above";
    }

    // 위로도 부족하면 다시 아래로 (최선의 선택)
    // If above is also clipped, fall back to below
    if (top < VIEWPORT_MARGIN) {
      top = iconRect.bottom + TOOLTIP_GAP;
      newPlacement = "below";
    }

    // 좌측 뷰포트 초과 방지
    // Prevent left viewport overflow
    if (left < VIEWPORT_MARGIN) {
      left = VIEWPORT_MARGIN;
    }

    // 우측 뷰포트 초과 방지
    // Prevent right viewport overflow
    if (left + tooltipWidth > window.innerWidth - VIEWPORT_MARGIN) {
      left = window.innerWidth - VIEWPORT_MARGIN - tooltipWidth;
    }

    setPosition({ top, left });
    setPlacement(newPlacement);
  }, []);

  // 표시될 때 위치 계산 (2프레임 대기로 정확한 크기 측정)
  // Calculate position when visible (wait 2 frames for accurate sizing)
  useEffect(() => {
    if (visible) {
      // 첫 번째 프레임: DOM 렌더링
      // First frame: DOM rendered
      requestAnimationFrame(() => {
        // 두 번째 프레임: 레이아웃 완료 후 위치 계산
        // Second frame: calculate after layout
        requestAnimationFrame(calculatePosition);
      });
    } else {
      setPosition(null);
    }
  }, [visible, calculatePosition]);

  // 스크롤/리사이즈 시 위치 재계산
  // Recalculate on scroll/resize
  useEffect(() => {
    if (!visible) return;

    const handleReposition = () => {
      calculatePosition();
    };

    // 캡처 단계에서 스크롤 감지 (모달 내부 스크롤 포함)
    // Capture phase to detect scroll inside modals
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [visible, calculatePosition]);

  // 외부 클릭 시 닫기 (모바일)
  // Close on outside click (mobile)
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const icon = iconRef.current;
      const tooltip = tooltipRef.current;
      if (
        icon && !icon.contains(e.target as Node) &&
        tooltip && !tooltip.contains(e.target as Node)
      ) {
        setVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visible]);

  // 툴팁 포털 렌더링
  // Tooltip portal rendering
  const tooltipPortal = visible
    ? createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-3 py-2 rounded-lg border text-[11px] leading-relaxed"
          style={{
            top: position ? `${position.top}px` : "-9999px",
            left: position ? `${position.left}px` : "-9999px",
            maxWidth: `${TOOLTIP_MAX_WIDTH}px`,
            width: "max-content",
            background: "var(--m-card)",
            borderColor: "var(--m-border)",
            color: "var(--m-text)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
            opacity: position ? 1 : 0,
            transition: "opacity 0.15s ease-out",
            pointerEvents: "none",
          }}
          role="tooltip"
        >
          {/* 화살표 (CSS border trick) / Arrow indicator */}
          <div
            className="absolute w-2 h-2 rotate-45 border"
            style={{
              background: "var(--m-card)",
              borderColor: "var(--m-border)",
              ...(placement === "below"
                ? { top: -4, borderRight: "none", borderBottom: "none" }
                : { bottom: -4, borderLeft: "none", borderTop: "none" }),
              left: (() => {
                if (!iconRef.current || !position) return "50%";
                const iconRect = iconRef.current.getBoundingClientRect();
                const iconCenter = iconRect.left + iconRect.width / 2;
                const arrowLeft = iconCenter - position.left - 4;
                // 화살표가 툴팁 범위 내에 유지되도록 클램프
                // Clamp arrow within tooltip bounds
                return `${Math.max(12, Math.min(arrowLeft, TOOLTIP_MAX_WIDTH - 12))}px`;
              })(),
            }}
          />
          {text}
        </div>,
        document.body
      )
    : null;

  return (
    <span className="inline-flex items-center">
      <button
        ref={iconRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setVisible((prev) => !prev);
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-bold leading-none cursor-pointer transition-colors"
        style={{
          borderColor: "var(--m-text-muted)",
          color: "var(--m-text-muted)",
          background: "transparent",
        }}
        aria-label="Info"
      >
        ?
      </button>
      {tooltipPortal}
    </span>
  );
}
