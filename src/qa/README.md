# ValueLens Conversation QA Dataset

## 목적

대화 엔진(parseIntent, classifyUserIntent, expectedAnswerType 흐름)을 감으로 수정하지 않고  
반복 실행 가능한 회귀 테스트 자산으로 관리한다.

기능 추가 또는 버그 수정 후 `node src/qa/qa_runner.js`를 실행해  
기존 케이스가 깨지지 않았는지 즉시 확인할 수 있다.

---

## 파일 구조

```
src/qa/
├── conversationQA.json   # QA Dataset (110개)
├── qa_runner.js          # 자동 테스트 러너
└── README.md             # 이 파일
```

---

## 카테고리 설명

| category | 설명 | 자동화 |
|---|---|---|
| `region_input` | 지역/동 단독 입력 (공릉동, 우동, 마포구) | ✅ parseIntent |
| `complex_search` | 단지명 입력 (동부아파트, 래미안대치팰리스) | ✅ parseIntent |
| `recommend` | 명시적 추천 요청 (7억 추천해줘) | ✅ parseIntent |
| `area_price_input` | 평형/가격/몰라 입력 | ✅ EAT 시뮬레이터 |
| `context_based_input` | 직전 질문 기반 입력 해석 | ✅ EAT 시뮬레이터 |
| `result_followup` | 결과 화면 후속 질문 | ⏭ 수동 QA |
| `manual_qa_required` | DB/UI 연동 필요, 구어체 추천 | ⏭ 수동 QA |

---

## expectedIntent 종류

| 값 | 설명 |
|---|---|
| `dong_search` | 동 이름 기준 검색 (complex_name 검색 금지) |
| `region_search` | 시/구/지역명 기준 검색 |
| `complex_search` | 단지명 기준 검색 |
| `recommend` | 예산/조건 기반 추천 |
| `price_analysis` | 적정가 분석 |
| `buy_opinion` | 매수 의견 |
| `jeonse_info` | 전세 정보 |
| `contract_check` | 계약 체크리스트 |
| `area_select` | 평형 선택 |
| `price_input` | 가격 입력 (만원 단위) |
| `unknown_price` | 가격 모름 → currentPrice=null, 실거래 기반 분석 |
| `change_area` | 결과 화면에서 다른 평형 선택 |
| `loan_calc` | 대출 계산 |

---

## expectedAnswerType 종류

직전 AI 질문에 따라 다음 사용자 입력 해석 방식이 달라진다.

| 값 | 직전 질문 예시 | 다음 입력 해석 |
|---|---|---|
| `dong` | "어느 동을 찾으시나요?" | dong 컬럼 검색만 (complex_name 검색 금지) |
| `complex` | "어떤 아파트를 찾으시나요?" | 단지명 검색 |
| `area` | "몇 평형을 확인할까요?" | 평형 파싱 |
| `price` | "현재 가격을 알고 계시나요?" | 가격 파싱 또는 unknown_price |
| `purpose` | "무엇을 확인할까요?" | 목적 파싱 |
| `sigungu` | "어느 우동을 찾으시나요?" | 시군구 선택 |
| `null` | (초기 상태) | 일반 parseIntent 흐름 |

---

## mustNotDo 의미

해당 케이스에서 절대 발생하면 안 되는 동작.

| 값 | 의미 |
|---|---|
| `complex_name_partial_search` | complex_name ILIKE 검색 금지 (동이름 입력 시) |
| `recommend_intent` | 추천 intent 발동 금지 |
| `show_recommend_list` | 추천 후보 목록 즉시 표시 금지 |
| `dong_search` | dong 검색 발동 금지 |
| `clear_context` | 현재 단지/지역 context 초기화 금지 |

---

## 자동 테스트 러너 실행

```bash
node src/qa/qa_runner.js
```

### 출력 예시

```
==============================================================
 ValueLens Conversation QA Runner v1.0
==============================================================
총 110개  |  ✅ PASS 100  ❌ FAIL 0  ⏭ SKIP 10
--------------------------------------------------------------
✅ region_input               25/25 pass
✅ complex_search             25/25 pass
✅ recommend                  15/15 pass
✅ area_price_input           15/15 pass
✅ context_based_input        14/14 pass
⏭ result_followup            0/0 pass  (10 skip)
==============================================================
```

---

## 자동화 범위 vs 수동 QA 범위

### 자동화 가능 (qa_runner.js)
- `parseIntent()` — 순수 함수, Node.js 직접 실행
- `classifyUserIntent()` — 순수 함수 (향후 추가 예정)
- `expectedAnswerType` 흐름 시뮬레이션

### 수동 QA 필요
- `ConversationEngine.process()` — Supabase fetch 포함
- 실제 DB 검색 결과 검증
- UI 렌더링, 칩 클릭 흐름
- 구어체 추천 표현 (`6억으로 어디가 좋아?` 등)

---

## 다음 단계: 1000개 확장

100개 QA + 자동 러너 검증 완료 후 아래 순서로 확장:

1. `classifyUserIntent` 자동 테스트 추가 (NLU 레이어)
2. 오타/표기 차이/브랜드 alias QA 100개 추가
3. 계약/등기부 질문 QA 50개 추가
4. ConversationEngine mock 테스트 환경 구축 (jest + MSW)
5. 전체 1000개로 확장

---

*최종 업데이트: 버그수정 P0(동이름 complexName 오추출), P1(평형선택→목적질문 흐름) 이후*
