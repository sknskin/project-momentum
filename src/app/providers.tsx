"use client";

// 프로바이더 래퍼 (테마 + 언어)
// Provider wrapper (theme + language)

import { type ReactNode } from "react";
import { ThemeProvider } from "@/lib/ThemeContext";
import { LanguageProvider } from "@/lib/i18n";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}
