# ValueLens Coding Rules

> 최종 수정: 2026-06-26
> ★★★ 이 문서의 규칙은 어떤 상황에서도 예외 없이 적용된다. ★★★

---

## 절대 수정 금지 목록

아래 함수와 엔진은 **어떤 이유로도 수정하지 않는다.**
리팩토링, 최적화, 버그 수정을 이유로도 건드리지 않는다.
수정이 필요한 경우 반드시 팀 전체 합의 후 별도 브랜치에서 진행한다.

---

### 1. `analyze()`
**파일:** `engine/analyze.js` (origin: `main.jsx` L463)

ValueLens의 핵심 적정가 계산 함수.
전세가율, KB시세, 실거래 trimmed mean을 조합해 A~E 등급을 산출한다.
이 함수의 출력이 바뀌면 전체 서비스의 신뢰도가 무너진다.

```
절대 금지:
- 가중치 변경
- 등급 기준 변경
- FALLBACK_RATIO 변경
- strictMode 해제
- 12개월 기준 변경
- 5건 미만 기준 변경
```

---

### 2. `sellVerdict()`
**파일:** `engine/analyze.js` (origin: `main.jsx` L671)

매도 판단 함수. analyze() 결과를 받아 매도 타이밍을 판단한다.
출력 텍스트와 조건 분기를 변경하지 않는다.

---

### 3. `computeFairBands()`
**파일:** `engine/market.js` (origin: `main.jsx` L1914)

적정가 밴드(저점/중간/고점) 계산 함수.
analyze()와 쌍을 이루며, 결과 화면의 밴드 차트에 직접 영향을 준다.

---

### 4. Tax Engine
**파일:** `engine/tax.js` (origin: `main.jsx` L884)

**포함 함수:**
- `acqStdRate()` — 취득세 표준 누진율
- `acqTax()` — 취득세 계산
- `cgTax()` — 양도세 계산

세금 계산은 법적 기준에 근거한다.
세법 개정이 있을 경우에만, 근거 조문을 명시하고 수정한다.

---

### 5. Market Engine
**파일:** `engine/market.js` (origin: `main.jsx` L719~L1998)

**포함 함수:**
- `analyzeSellerDecision()` — 매도 판단 종합
- `classifyApartmentMarket()` — 시장 유형 분류
- `calculateSupplyShock()` — 입주물량 위험
- `calculateVolumeRisk()` — 거래량 위험
- `calculatePopulationRisk()` — 인구 위험
- `calculateEmploymentRisk()` — 고용 위험
- `calculatePolicyRisk()` — 정책 위험

시장 분류 로직과 위험도 계산은 ValueLens의 판단 근거다.
임의로 수정하면 사용자에게 잘못된 판단을 제공할 수 있다.

---

### 6. `computeTrimmedMean()`
**파일:** `engine/stats.js` (origin: `main.jsx` L1124)

실거래 데이터에서 이상치를 제거한 평균을 계산하는 핵심 통계 함수.

```
절대 금지:
- trimming 비율 변경 (현재 ±20%)
- 1층 제외 로직 제거
- 급매/특수관계 필터 제거
- tryPeriods [6, 12, 24] 순서 변경
```

---

## 수정 가능한 것

| 항목 | 조건 |
|------|------|
| UI 레이아웃 | 언제든 가능 |
| 색상, 폰트 | 언제든 가능 |
| 에러 메시지 | 언제든 가능 — 단, 아래 Message Dictionary 규칙을 따른다 |
| 검색 UX | 계산 결과에 영향 없는 경우 |
| 새 기능 추가 | 기존 함수 수정 없이 추가만 |

---

## 사용자 메시지 — Message Dictionary 강제

> v1.0.1부터 적용. `src/messages/` 참고.

ValueLens는 FairValue/Buy/Sell/추천/계약분석 전체에서 하나의 Message Dictionary(`src/messages/messageDictionary.js`)를 공유한다.

```
절대 금지:
- addAI("문자열"), emit({ type: 'TEXT', content: "문자열" }), setMessage("문자열") 처럼
  사용자에게 보이는 문자열을 코드에 직접 쓰는 것
```

```
반드시:
- getMessage(KEY, params) 또는 getMessageText(KEY, params)만 호출한다
- 새 상황(Situation)이 생기면 messageDictionary.js에 Key를 추가하고 호출부에서는 그 Key만 쓴다
- Key는 기능(fair/buy/sell)이 아니라 상황 기준으로 만든다 — 같은 상황이면 도메인 간에 Key를 재사용한다
```

문구의 어조·표현 규칙은 `docs/ai-personality-guide.md`를 따른다.

---

## 규칙 위반 시

- 위반 코드는 즉시 롤백한다.
- 이전 commit으로 되돌린다.
- 원인을 분석하고 docs를 업데이트한다.
