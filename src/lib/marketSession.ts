// 마켓 세션 감지 유틸리티
// Market session detection utility

import { MarketSession } from "./types";
import {
  PRE_MARKET_START_HOUR,
  MARKET_OPEN_HOUR,
  MARKET_OPEN_MINUTE,
  MARKET_CLOSE_HOUR,
  AFTER_HOURS_END_HOUR,
} from "./constants";

/**
 * 현재 ET(미국 동부시간) 기준 마켓 세션을 반환
 * Returns current market session based on Eastern Time
 */
export function getMarketSession(): MarketSession {
  const etTime = getEasternTime();
  const hour = etTime.getHours();
  const minute = etTime.getMinutes();

  // 프리마켓: 4:00 ~ 9:29 ET
  // Pre-market: 4:00 ~ 9:29 ET
  if (hour >= PRE_MARKET_START_HOUR && (hour < MARKET_OPEN_HOUR || (hour === MARKET_OPEN_HOUR && minute < MARKET_OPEN_MINUTE))) {
    return "PRE_MARKET";
  }

  // 정규장: 9:30 ~ 15:59 ET
  // Market open: 9:30 ~ 15:59 ET
  if (
    (hour === MARKET_OPEN_HOUR && minute >= MARKET_OPEN_MINUTE) ||
    (hour > MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR)
  ) {
    return "MARKET_OPEN";
  }

  // 애프터 아워: 16:00 ~ 19:59 ET
  // After hours: 16:00 ~ 19:59 ET
  if (hour >= MARKET_CLOSE_HOUR && hour < AFTER_HOURS_END_HOUR) {
    return "AFTER_HOURS";
  }

  // 나머지 시간: 마켓 종료
  // All other times: market closed
  return "CLOSED";
}

/**
 * 마켓 세션에 대한 표시 라벨을 반환
 * Returns display label for market session
 */
export function getSessionLabel(session: MarketSession): string {
  const labels: Record<MarketSession, string> = {
    PRE_MARKET: "PRE-MARKET",
    MARKET_OPEN: "MARKET OPEN",
    AFTER_HOURS: "AFTER HOURS",
    CLOSED: "MARKET CLOSED",
  };
  return labels[session];
}

/**
 * 현재 미국 동부시간(ET)을 Date 객체로 반환
 * Returns current Eastern Time as Date object
 */
function getEasternTime(): Date {
  const now = new Date();
  const etString = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  return new Date(etString);
}
