"use client";

// 프로바이더 래퍼 (테마 + 언어 + 알림)
// Provider wrapper (theme + language + alert)

import { type ReactNode } from "react";
import { ThemeProvider } from "@/lib/ThemeContext";
import { LanguageProvider } from "@/lib/i18n";
import { AlertProvider } from "@/lib/AlertContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AlertProvider>{children}</AlertProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
