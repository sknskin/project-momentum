# Momentum Scanner

## 프로젝트 개요

미국 주식 프리마켓 모멘텀 스크리너 웹 애플리케이션입니다.
프리마켓(장전) 시간대에 강한 모멘텀을 보이는 종목을 7가지 기준으로 분석하여
진입 준비도(Entry Readiness)를 HIGH / MODERATE / LOW로 판별합니다.

## 주요 기능

### 7가지 스코어링 기준 (각 0~2점, 총 14점 만점)

| 기준 | 설명 |
|------|------|
| C1. Pre-Market Change | 프리마켓 가격 변동률 평가 (±3% 이상 = 2점) |
| C2. Volume Surge | 프리마켓 거래량 대비 평균 거래량 비율 (2x 이상 = 2점) |
| C3. Gap Size | 전일 종가 대비 프리마켓 갭 크기 (5% 이상 = 2점) |
| C4. 52W High Proximity | 52주 최고가 근접도 (5% 이내 = 2점) |
| C5. Catalyst Events | 촉매 이벤트 개수 (3개 이상 = 2점) |
| C6. Social Buzz (Simulated) | 소셜 버즈 점수 — **시뮬레이션 데이터** |
| C7. Price Stability | 프리마켓 고가-저가 스프레드 안정성 |

### 시그널 판정
- **HIGH** (10점 이상): 강한 모멘텀 — 진입 적극 고려
- **MODERATE** (6~9점): 보통 모멘텀 — 확인 후 진입
- **LOW** (5점 이하): 약한 모멘텀 — 관망 권장

### 기타 기능
- 60초 자동 새로고침
- 마켓 세션 감지 (PRE-MARKET / MARKET OPEN / AFTER HOURS / CLOSED)
- 인기 종목(Hot Tickers) 프리셋 원클릭
- LIVE / DEMO MODE 배지 표시
- 모바일 반응형 디자인
- 엔트리 전략 자동 생성 (Entry Zone, Stop Loss, Target, Risk/Reward)

## 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.x | React 풀스택 프레임워크 |
| React | 19.x | UI 라이브러리 |
| TypeScript | 5.x | 타입 안전 |
| Tailwind CSS | 4.x | 유틸리티 CSS |
| Yahoo Finance API | v8 | 실시간 주가 데이터 |

## 폴더 구조

```
momentum/
├── docs/                          # 문서
│   ├── README.md                  # 프로젝트 문서 (현재 파일)
│   ├── 로컬실행가이드.md            # 로컬 실행 가이드
│   ├── 아키텍처.md                 # 아키텍처 문서
│   └── 기획서.md                   # 기획서
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── stock/
│   │   │       └── [ticker]/
│   │   │           └── route.ts   # Yahoo Finance 프록시 API
│   │   ├── globals.css            # 글로벌 다크 테마 스타일
│   │   ├── layout.tsx             # 루트 레이아웃
│   │   └── page.tsx               # 메인 스캐너 UI
│   ├── components/
│   │   ├── EntryStrategyBox.tsx    # 엔트리 전략 표시
│   │   ├── MarketSessionBadge.tsx  # 마켓 세션 배지
│   │   ├── RefreshCountdown.tsx    # 60초 카운트다운
│   │   ├── ScoreCriteriaBar.tsx    # 스코어 프로그레스 바
│   │   └── TickerCard.tsx          # 종목 카드
│   └── lib/
│       ├── constants.ts           # 상수 정의
│       ├── marketSession.ts       # 마켓 세션 감지
│       ├── mockData.ts            # 모의 데이터 생성
│       ├── scoring.ts             # 스코어링 로직
│       └── types.ts               # TypeScript 타입 정의
├── package.json
├── tsconfig.json
└── postcss.config.mjs
```

## 로컬 설정 및 실행

### 사전 요구사항
- Node.js 18.x 이상
- pnpm 9.x 이상

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 시작
pnpm start
```

개발 서버 실행 후 `http://localhost:3000` 에서 접근할 수 있습니다.

## API 가이드

### `GET /api/stock/[ticker]`

Yahoo Finance에서 종목 데이터를 프록시하여 반환합니다.
API 실패 시 자동으로 모의(Mock) 데이터로 폴백됩니다.

**요청 예시:**
```
GET /api/stock/TSLA
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "symbol": "TSLA",
    "companyName": "Tesla, Inc.",
    "prevClose": 175.50,
    "preMarketPrice": 182.30,
    "preMarketChange": 6.80,
    "preMarketChangePercent": 3.87,
    "preMarketVolume": 2500000,
    "avgDailyVolume": 45000000,
    "volumeRatio": 1.11,
    "dayHigh": 183.10,
    "dayLow": 181.00,
    "fiftyTwoWeekHigh": 299.29,
    "fiftyTwoWeekLow": 138.80,
    "catalysts": ["Significant pre-market movement detected"],
    "isLive": true
  }
}
```

**응답 필드 설명:**

| 필드 | 타입 | 설명 |
|------|------|------|
| `isLive` | boolean | `true`: Yahoo Finance 실시간 데이터, `false`: 모의 데이터 |
| `preMarketChangePercent` | number | 전일 종가 대비 프리마켓 변동률 (%) |
| `volumeRatio` | number | 프리마켓 거래량 / (평균 일일 거래량 × 5%) |
| `catalysts` | string[] | 감지된 촉매 이벤트 목록 |

## 스크린샷

> 스크린샷은 추후 추가 예정입니다.

## 라이선스

MIT License

## 면책 조항

이 도구는 교육 및 정보 제공 목적으로만 사용됩니다. 금융 자문을 구성하지 않습니다.
소셜 버즈 데이터는 **시뮬레이션**이며 실제 소셜 미디어 분석을 기반으로 하지 않습니다.
거래 결정을 내리기 전에 항상 자체 조사를 수행하십시오.
과거 실적은 미래 결과를 보장하지 않습니다. 주식 거래에는 손실 위험이 수반됩니다.
