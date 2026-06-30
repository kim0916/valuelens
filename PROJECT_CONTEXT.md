# ValueLens Project Handbook (PROJECT_CONTEXT.md)

> 최종 수정: 2026-06-30

# 1. 프로젝트 목표

대한민국에서 가장 신뢰받는 아파트 AI 의사결정 서비스 구축

핵심 서비스 - 적정가(FairValue) - 매수(Buy) - 추천(Recommendation)

개발 우선순위 정확도 → 신뢰성 → UX → 기능추가

------------------------------------------------------------------------

# 2. 현재 상태

## 완료

-   ConversationEngine v2
-   StateMachine
-   SlotRegistry
-   ActionHandlers
-   Intent Dictionary
-   Area Resolver
-   Boundary Logic
-   **FairValue v1.0 Freeze** (Git Tag `v1.0.0`) — Context QA 7/7, Stress QA 6/6, Boundary QA 5/5 PASS, P0 0건
-   **Message Architecture 1단계** — `src/messages/`(messageCategories / messageDictionary / getMessage) 신규 구축, FairValue v2 흐름(FairValueResult.jsx, ActionHandlers.js, ConversationEngine_v2.js)의 사용자 메시지 39건을 하드코딩 문자열 → Message Dictionary 참조로 전환 완료 (문구 내용 변경 없음, 자동 검증 39/39 PASS)

## 진행 중

**FairValue v1.0.1 UX Patch** — Message Architecture 인프라는 완료, 실제 문구 통일/개선(Style Guide 적용)은 아직 시작 전.

-   `docs/ai-personality-guide.md` 초안 작성 완료, 아직 미적용
-   `messageDictionary.js`의 `DUPLICATE_SITUATIONS`에 기록된 6개 그룹(같은 상황, 다른 콜사이트마다 다른 문구)이 다음에 통일해야 할 대상
-   BuyResult.jsx / SellResult.jsx / AIChatView.jsx / main.jsx 등 FairValue v2 흐름 밖의 하드코딩 문자열은 아직 이전 전이라 남아있음 (다음 단계 범위)

## 다음 단계

1. Message Dictionary 문구 통일 (Style Guide 적용, `DUPLICATE_SITUATIONS` 우선)
2. Buy / Sell / Recommendation 쪽 메시지도 같은 Dictionary로 이전
3. Buy → Recommendation → 계약서/PDF 분석

------------------------------------------------------------------------

# 3. 아키텍처

User ↓ AIChatView ↓ ConversationEngine_v2 ↓ ActionHandlers ↓
AIChatBridge ↓ Analysis Engine ↓ FairValueResult / BuyResult

결과 화면(ResultChatBar)은 결과 이후의 후속 대화를 담당한다.

**Message Layer(신규)**: 위 모든 단계에서 사용자에게 보이는 문자열은 직접 쓰지 않고 `src/messages/getMessage.js`의 `getMessage(KEY, params)` / `getMessageText(KEY, params)`만 거친다. Key는 기능(Fair/Buy/Sell)이 아니라 상황(Situation) 기준이며, 도메인 간에 재사용한다.

------------------------------------------------------------------------

# 4. 개발 원칙

절대 지킬 것

-   Parser를 함부로 수정하지 않는다.
-   if 땜질 금지
-   임시 fallback 금지
-   중복 로직 금지
-   기존 구조 재사용
-   Context 유지
-   Golden Path 우선
-   Freeze 전 신규 기능 추가 금지
-   **(v1.0.0 Freeze 이후 추가)** `analyze.js` 등 계산 로직은 어떤 이유로도 수정하지 않는다
-   **(Message Architecture 이후 추가)** 사용자에게 보이는 문자열은 코드에 직접 쓰지 않고 Message Dictionary를 거친다 (`docs/coding-rules.md` 참고)

------------------------------------------------------------------------

# 5. QA 기준

Golden Path Natural Language Context Stress Boundary

Freeze 조건

-   Context QA 7/7 PASS ✅ (v1.0.0에서 달성)
-   Stress QA 6/6 PASS ✅ (v1.0.0에서 달성)
-   Boundary QA 5/5 PASS ✅ (v1.0.0에서 달성)

------------------------------------------------------------------------

# 6. Bug 우선순위

P0 - 먹통 - 영구 로딩 - 결과 오류 - Context 붕괴

P1 - UX - 문구

P2 - 오타 인식 - 편의 기능

------------------------------------------------------------------------

# 7. 작업 순서

1.  원인 분석
2.  설계
3.  구현
4.  QA
5.  Freeze

QA만 반복하거나 기능을 먼저 추가하지 않는다.

------------------------------------------------------------------------

# 8. Claude 작업 규칙

새 채팅에서는 반드시 이 문서를 먼저 읽는다.

추측하지 않는다.

프로젝트 원칙을 우선한다.

작업 종료 시 이 문서를 최신 상태로 업데이트한다.
