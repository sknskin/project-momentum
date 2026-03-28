"use client";

// 다크/라이트 테마 컨텍스트 (View Transition API 사용)
// Dark/light theme context (using View Transition API)

import {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

/** 테마 타입 / Theme type */
export type Theme = "dark" | "light";

/** localStorage 키 / localStorage key */
const STORAGE_KEY = "momentum-theme";

/** 기본 테마 / Default theme */
const DEFAULT_THEME: Theme = "dark";

/** 테마 컨텍스트 타입 / Theme context type */
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
});

/**
 * 테마 훅 — 현재 테마와 전환 함수 반환
 * Theme hook — returns current theme and toggle function
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * 테마 프로바이더 — View Transition API로 블러 크로스페이드 전환
 * Theme provider — blur crossfade transition via View Transition API
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const transitioning = useRef(false);

  // DOM에 테마 클래스 적용 및 localStorage 저장
  // Apply theme class to DOM and persist to localStorage
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      console.error("[theme] Failed to save theme to localStorage:", err);
    }
  }, [theme]);

  // 테마 전환 — View Transition API 블러 크로스페이드
  // Theme toggle — View Transition API blur crossfade
  const toggleTheme = useCallback(() => {
    if (transitioning.current) return;
    transitioning.current = true;

    if (document.startViewTransition) {
      const t = document.startViewTransition(() =>
        setTheme((prev) => (prev === "dark" ? "light" : "dark"))
      );
      t.finished.then(() => {
        transitioning.current = false;
      });
    } else {
      setTheme((prev) => (prev === "dark" ? "light" : "dark"));
      transitioning.current = false;
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
