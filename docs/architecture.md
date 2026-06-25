# ValueLens Architecture

> 최종 수정: 2026-06-26
> 버전: Phase 1-C

---

## 개요

ValueLens는 단순 부동산 계산기가 아니다.
**AI Property Agent** — 사용자가 말하면 AI가 이해하고, 검증된 엔진으로 답하는 부동산 AI다.

---

## 핵심 철학

| 구성 요소 | 역할 | 비유 |
|---------|------|------|
| Search | 단지 특정, 데이터 조회 | 심장 |
| Engine (Analyze) | 적정가 계산, 시장 판단 | 두뇌 |
| AI (Intent + Chat) | 사용자 의도 파악, 대화 | 비서 |
| Services | 외부 연결 추상화 | 신경계 |
| Views | 결과 출력 | 얼굴 |

---

## 데이터 흐름

```
입력 (텍스트 / 음성 / 사진 / 문서)
    ↓
services/ai — Intent 파싱 (parseIntent)
    ↓
services/supabase — 단지 검색 (searchApartment)
    ↓
services/molit — 실거래 데이터 (fallback)
    ↓
engine/analyze — 적정가 계산
engine/market  — 시장 분류
engine/stats   — 통계 계산
    ↓
recommendation — 투자 판단 보조
    ↓
AI Chat — 결과 요약 + 후속 대화
    ↓
views/Result — 화면 출력
```

---

## 폴더 구조

```
src/
├── constants/          디자인 토큰, 프리셋 데이터
│   ├── brand.js
│   ├── grades.js
│   └── presets.js
│
├── engine/             핵심 계산 엔진 (★ 절대 수정 금지)
│   ├── analyze.js      적정가 분석
│   ├── market.js       시장 분류, 매도 판단
│   ├── stats.js        통계 (trimmed mean, 신뢰도)
│   └── tax.js          세금 계산
│
├── recommendation/     투자 판단 보조
│   ├── recommend.js    예산 기반 추천
│   ├── pool.js         단지 풀
│   └── score.js        점수 계산
│
├── loan/               대출 계산
│   └── loanEngine.js
│
├── search/             심장 — 데이터 조회 레이어
│   ├── supabase.js     Supabase 단지 검색
│   ├── molit.js        국토부 API
│   ├── apartment.js    통합 조회 (Supabase + MOLIT fallback)
│   ├── input.js        분석 입력 빌더
│   ├── alias.js        단지명 정규화
│   ├── utils.js        면적 그룹핑, 파싱 유틸
│   └── location.js     법정동 코드 매핑
│
├── services/           외부 연결 추상화 (신경계)
│   ├── supabase/
│   │   ├── apartmentService.js
│   │   └── summaryService.js
│   ├── molit/
│   │   └── molitService.js
│   ├── ai/
│   │   └── aiService.js
│   ├── storage/
│   │   └── storageService.js
│   └── cache/
│       └── cacheService.js
│
├── views/              출력 레이어 (Phase 1-F)
├── components/         공통 UI (Phase 1-E)
└── app/                앱 구조 (Phase 1-G)
```

---

## 계층 규칙

1. **views**는 services만 호출한다. search를 직접 호출하지 않는다.
2. **services**는 search와 engine을 조합한다.
3. **search**는 외부 API(Supabase, MOLIT)와 통신한다.
4. **engine**은 순수 계산만 한다. 외부 통신 없음.
5. **AI**는 services를 통해 engine과 search를 호출한다.

---

## 불변 원칙

- `engine/` 내부 계산 로직은 절대 수정하지 않는다.
- strictMode, 12개월 거래 기준, ≥5건 기준은 변경하지 않는다.
- Supabase-first, MOLIT fallback 구조를 유지한다.
