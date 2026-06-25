# ValueLens AI Property Agent

> 최종 수정: 2026-06-26

---

## 개념

ValueLens는 "부동산 계산기"가 아니다.
사용자가 말하면 AI가 이해하고, ValueLens 엔진으로 답하는 **AI Property Agent**다.

> "공릉동 동부 25평 어때?"
> → AI가 의도를 파악하고
> → DB에서 단지를 찾고
> → 엔진으로 계산하고
> → 결과를 대화로 전달한다.

---

## 입력 파이프라인

```
텍스트 입력
    └→ parseIntent() → routeByIntent() → Engine

음성 입력
    └→ Web Speech API → 텍스트 → parseIntent()

사진 입력 (Phase 3)
    └→ Claude Vision → OCR 텍스트 → parseIntent()

문서 입력 (Phase 3)
    └→ Claude Document AI → 구조화 데이터 → Engine
```

---

## Intent 구조

```js
{
  intent:      "fair" | "buy" | "sell" | "recommend" | "compare",
  complexName: string | null,
  region:      string | null,   // 시군구
  dong:        string | null,   // 법정동
  pyeong:      number | null,   // 평형
  areaSqm:     number | null,   // 전용면적(㎡)
  price:       number | null,   // 가격(만원)
  budget:      number | null,   // 예산(만원)
  purpose:     "live" | "invest" | "school" | "rebuild" | "transport",
  raw:         string,           // 원본 입력
}
```

---

## 분기 규칙

| 입력 키워드 | Intent |
|------------|--------|
| 팔까, 매도, 내 집, 호가 | sell |
| 추천, 예산, ~억으로 | recommend |
| 사도 돼, 매수, 살까 | buy |
| 비교 | compare |
| 나머지 | fair (기본값) |

---

## 응답 흐름 (채팅 UI)

```
user → 질문
    ↓
ai_thinking (로딩)
    ↓
단지 특정 가능?
  Y → runAnalysis() → ai_result (ResultCard)
  N (복수) → ai_candidates (단지 선택 UI)
  N (0건) → ai_clarify (검색 유도)
    ↓
"상세 분석 보기" → 기존 BuyView/SellView/FairValueResult
```

---

## Phase별 AI 수준

| Phase | AI 수준 |
|-------|--------|
| 1 (현재) | 규칙 기반 Intent 파싱 |
| 2 | Claude API — 복잡한 질문, 맥락 유지 |
| 3 | Vision + Document AI 연결 |
| 4 | 멀티턴 대화, 포트폴리오 컨텍스트 |

---

## 비용 원칙

- 규칙으로 해결 가능한 것은 API 호출하지 않는다.
- 시장 데이터는 캐시한다 (cacheService).
- Vision API는 사용자 명시적 요청 시에만 호출한다.
