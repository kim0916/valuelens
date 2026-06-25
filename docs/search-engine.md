# ValueLens Search Engine

> 최종 수정: 2026-06-26

---

## 개요

Search는 ValueLens의 심장이다.
사용자 입력(단지명, 지역, 평형)을 받아
분석 가능한 정형 데이터로 변환하는 핵심 레이어다.

---

## 검색 우선순위

```
1. Supabase DB (realestate_complexes — 35,000+ 단지)
    ↓ 실패/불충분
2. MOLIT API (국토부 실거래 API)
    ↓ 실패
3. 사용자 직접 입력 (KB시세 수동 입력)
```

---

## 단지명 정규화 파이프라인

```
사용자 입력
    ↓
resolveAlias()     — 별칭 사전 매핑 (더샾→더샵, 헤링턴→해링턴)
    ↓
normalizeAptName() — 공백/특수문자 제거
    ↓
Supabase 검색      — complex_name ILIKE '%{name}%'
    ↓
matchAptName()     — 결과 정밀 매칭
```

---

## 공백 포함 복합 검색어 처리

"대치 래미안" 입력 시:
```
tokens = ["대치", "래미안"]
combined1 = "대치래미안"   → Supabase 검색
combined2 = "래미안대치"   → Supabase 검색
rest      = "래미안"       → Supabase 검색
→ 결과 합산, 중복 제거
```

---

## 관련 검색어 생성

검색 결과에서 `legal_dong` 기반으로 지역 prefix 추출:
```
"래미안" 검색 → 결과에서 "상계동 래미안", "대치동 래미안" 파생
→ 관련 검색어로 표시
```

---

## buildAnalysisInput

search/ 레이어의 최종 출력.
Engine이 소비하는 형식으로 raw 데이터를 변환한다.

```js
buildAnalysisInput(rawData, baseForm, askedArea)
→ {
    ff:         // Engine 입력 형식
    jeonseCalc: // 전세 계산 결과
    saleCalc:   // 매매 계산 결과
  }
```

---

## 핵심 파일

| 파일 | 역할 |
|------|------|
| search/supabase.js | Supabase 단지 검색, 관련 검색어 생성 |
| search/molit.js | 국토부 API 실거래 조회 |
| search/apartment.js | 통합 조회 (Supabase + MOLIT fallback) |
| search/input.js | Engine 입력 포맷 변환 |
| search/alias.js | 단지명 별칭 사전 |
| search/location.js | 법정동 코드 매핑 |
| search/utils.js | 면적 그룹핑, 가격 파싱 |
