# ValueLens Calculation Engine

> 최종 수정: 2026-06-26
> ★★★ 이 문서에 기술된 로직은 절대 수정하지 않는다. ★★★

---

## 개요

ValueLens 계산 엔진은 다른 부동산 서비스와 차별화되는 핵심 경쟁력이다.
단순 시세 조회가 아니라, 실거래 데이터를 기반으로 한 **통계적 적정가 산출**이다.

---

## 핵심 원칙

| 원칙 | 내용 |
|------|------|
| strictMode | 이상치를 제거한 trimmed mean 사용 |
| 12개월 기준 | 최근 12개월 거래만 유효 |
| 5건 기준 | 거래 5건 미만이면 분석 보류 |
| 1층 제외 | 1층 거래는 시세 왜곡 방지를 위해 제외 |
| Supabase-first | DB 우선, MOLIT API는 fallback |

---

## computeTrimmedMean

ValueLens의 핵심 알고리즘.

```
1. 원본 거래 데이터 수집
2. 1층 거래 제거
3. 급매/특수관계 거래 제거 (urgent, related 플래그)
4. ±20% 이상치 제거 (trimming)
5. 잔여 데이터 산술 평균
6. 신뢰도 등급 산출 (A~D)
```

tryPeriods: [6, 12, 24] 개월 순으로 확장 시도.

---

## analyze() 출력 구조

```js
{
  // 적정가
  fairPrice:    number,   // 만원
  fairGrade:    "A"|"B"|"C"|"D"|"E",
  fairBand:     { low, mid, high },

  // 매수 판단
  buyGrade:     "A"|"B"|"C"|"D"|"E",
  buyVerdict:   string,

  // 전세
  jeonseRatio:  number,   // 전세가율 (0~1)
  baseJeonse:   number,   // 만원

  // 시장
  saleRef:      number,   // 실거래 기준가
  saleCount:    number,   // 분석에 사용된 거래 수
  headline:     string,   // 한줄 요약

  // 계산 메타
  jeonseCalc:   Object,
  saleCalc:     Object,
}
```

---

## 등급 기준 (A~E)

| 등급 | 의미 | 조건 |
|------|------|------|
| A | 매우 저평가 | 현재가 < 적정가 × 0.90 |
| B | 저평가 | 현재가 < 적정가 × 0.97 |
| C | 적정 가격 | 적정 범위 내 |
| D | 고평가 주의 | 현재가 > 적정가 × 1.05 |
| E | 고평가 | 현재가 > 적정가 × 1.10 |

---

## 세금 계산 (tax.js)

### 취득세 (acqTax)
- 1주택 표준 누진 (6억 이하 1%, 6~9억 1~3%, 9억 초과 3%)
- 조정대상지역, 다주택 중과 반영

### 양도세 (cgTax)
- 1가구 1주택 비과세 조건 반영
- 거주 기간, 보유 기간, 조정지역 여부 반영

---

## 파일 구조

| 파일 | 내용 |
|------|------|
| engine/analyze.js | 핵심 적정가 엔진 (★ 절대 수정 금지) |
| engine/market.js | 시장 분류, 매도 판단, 위험도 |
| engine/stats.js | computeTrimmedMean, computeDataTrust |
| engine/tax.js | 취득세, 양도세 계산 |
