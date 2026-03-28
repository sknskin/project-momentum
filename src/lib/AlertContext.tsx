"use client";

// 알림/확인 모달 컨텍스트
// Alert/Confirm modal context

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

/** 모달 타입 / Modal type */
export type AlertType = "alert" | "confirm" | "success" | "error" | "warning";

/** 모달 옵션 / Modal options */
export interface AlertOptions {
  type?: AlertType;
  title?: string;
  /** 자동 닫기 시간 (밀리초, success 타입 전용)
   *  Auto-dismiss time in ms (success type only) */
  autoDismissMs?: number;
}

/** 모달 내부 상태 / Modal internal state */
interface AlertState {
  isOpen: boolean;
  message: string;
  type: AlertType;
  title?: string;
  autoDismissMs?: number;
}

/** 컨텍스트 타입 / Context type */
interface AlertContextType {
  /** 정보 알림 (단일 "확인" 버튼) / Informational alert (single "OK" button) */
  alert: (message: string, options?: AlertOptions) => Promise<void>;
  /** 확인 대화 상자 ("확인" + "취소") / Confirm dialog ("OK" + "Cancel") */
  confirm: (message: string, options?: AlertOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType>({
  alert: async () => {},
  confirm: async () => false,
});

/**
 * 알림 훅 — alert, confirm 함수 반환
 * Alert hook — returns alert and confirm functions
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAlert() {
  return useContext(AlertContext);
}

/**
 * 알림 프로바이더 + 렌더링 모달
 * Alert provider + rendered modal
 */
export function AlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertState>({
    isOpen: false,
    message: "",
    type: "alert",
  });

  // resolve 콜백 보관 / Store resolve callback
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  /**
   * 모달 열기
   * Open modal
   */
  const openModal = useCallback(
    (message: string, type: AlertType, title?: string, autoDismissMs?: number): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setState({ isOpen: true, message, type, title, autoDismissMs });
      });
    },
    []
  );

  /**
   * 모달 닫기 (결과 반환)
   * Close modal (return result)
   */
  const closeModal = useCallback((result: boolean) => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  }, []);

  const alert = useCallback(
    async (message: string, options?: AlertOptions): Promise<void> => {
      await openModal(
        message,
        options?.type ?? "alert",
        options?.title,
        options?.autoDismissMs
      );
    },
    [openModal]
  );

  const confirm = useCallback(
    async (message: string, options?: AlertOptions): Promise<boolean> => {
      return openModal(
        message,
        options?.type ?? "confirm",
        options?.title,
        options?.autoDismissMs
      );
    },
    [openModal]
  );

  return (
    <AlertContext.Provider value={{ alert, confirm }}>
      {children}
      {state.isOpen && (
        <AlertModal
          message={state.message}
          type={state.type}
          title={state.title}
          autoDismissMs={state.autoDismissMs}
          onConfirm={() => closeModal(true)}
          onCancel={() => closeModal(false)}
        />
      )}
    </AlertContext.Provider>
  );
}

// ─── 내부 모달 컴포넌트 / Internal modal component ───

interface AlertModalProps {
  message: string;
  type: AlertType;
  title?: string;
  autoDismissMs?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 타입별 아이콘 반환
 * Returns icon based on type
 */
function getIcon(type: AlertType): string {
  switch (type) {
    case "success":
      return "✓";
    case "error":
      return "✕";
    case "warning":
      return "!";
    case "confirm":
      return "?";
    default:
      return "i";
  }
}

/**
 * 타입별 액센트 색상 반환
 * Returns accent color based on type
 */
function getAccentColor(type: AlertType): string {
  switch (type) {
    case "success":
      return "var(--m-green)";
    case "error":
      return "var(--m-high)";
    case "warning":
      return "var(--m-moderate-color)";
    default:
      return "var(--m-accent)";
  }
}

import { useEffect, useRef as useRefHook } from "react";

function AlertModal({
  message,
  type,
  title,
  autoDismissMs,
  onConfirm,
  onCancel,
}: AlertModalProps) {
  const modalRef = useRefHook<HTMLDivElement>(null);
  const isConfirmType = type === "confirm";
  const accentColor = getAccentColor(type);
  const icon = getIcon(type);

  // Escape 키로 닫기, Enter로 확인
  // Close on Escape, confirm on Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        onConfirm();
      }
      // 포커스 트랩 / Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // 첫 번째 버튼에 포커스
    // Focus first button
    if (modalRef.current) {
      const firstBtn = modalRef.current.querySelector<HTMLElement>("button");
      if (firstBtn) firstBtn.focus();
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);

  // 자동 닫기 (success 타입 전용)
  // Auto-dismiss (success type only)
  useEffect(() => {
    if (type === "success" && autoDismissMs && autoDismissMs > 0) {
      const timer = setTimeout(onConfirm, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [type, autoDismissMs, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="w-full max-w-sm mx-4 rounded-xl border p-5 animate-[alertIn_0.2s_ease-out]"
        style={{
          background: "var(--m-bg)",
          borderColor: "var(--m-border)",
        }}
      >
        {/* 아이콘 */}
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              color: accentColor,
              border: `2px solid ${accentColor}`,
            }}
          >
            {icon}
          </div>
        </div>

        {/* 제목 / Title */}
        {title && (
          <h3
            className="text-center text-sm font-bold mb-2"
            style={{ color: "var(--m-text)" }}
          >
            {title}
          </h3>
        )}

        {/* 메시지 / Message */}
        <p
          className="text-center text-sm mb-4 leading-relaxed"
          style={{ color: "var(--m-text-muted)" }}
        >
          {message}
        </p>

        {/* 버튼 / Buttons */}
        <div className={`flex gap-2 ${isConfirmType ? "justify-center" : "justify-center"}`}>
          {isConfirmType && (
            <button
              onClick={onCancel}
              className="px-5 py-2 text-sm font-bold rounded-lg border transition-colors cursor-pointer"
              style={{
                background: "var(--m-card)",
                borderColor: "var(--m-border)",
                color: "var(--m-text-muted)",
              }}
            >
              취소
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-5 py-2 text-sm font-bold rounded-lg transition-colors cursor-pointer"
            style={{
              background: accentColor,
              color: "var(--m-bg)",
            }}
          >
            확인
          </button>
        </div>
      </div>

      {/* 애니메이션 / Animation */}
      <style>{`
        @keyframes alertIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
