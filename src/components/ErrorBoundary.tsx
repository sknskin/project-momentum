"use client";

// React Error Boundary 컴포넌트
// React Error Boundary component

import { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 에러 발생 시 표시할 폴백 UI (선택)
   *  Fallback UI to show on error (optional) */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 자식 컴포넌트의 렌더링 에러를 포착하는 Error Boundary
 * Catches rendering errors in child components
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 커스텀 폴백이 있으면 사용, 없으면 기본 에러 UI
      // Use custom fallback if provided, else default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="rounded-xl border p-4 text-center"
          style={{
            background: "var(--m-card)",
            borderColor: "color-mix(in srgb, var(--m-high) 30%, var(--m-border))",
          }}
        >
          <p className="text-sm mb-1" style={{ color: "var(--m-high)" }}>
            렌더링 오류가 발생했습니다
          </p>
          <p className="text-[10px]" style={{ color: "var(--m-text-muted)" }}>
            {this.state.error?.message ?? "Unknown error"}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
