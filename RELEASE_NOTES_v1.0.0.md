# ValueLens FairValue v1.0.0

> Release Date: 2026-06-30

## 요약

FairValue(적정가 분석) 엔진을 v1.0으로 Freeze한다. Context QA / Stress QA / Boundary QA 전체 통과를 확인했고, 출시를 막는 P0 버그는 없다.

## 포함 내용

- **FairValue 엔진 Freeze**: 적정가 계산 로직(`analyze.js`, `market.js`, `stats.js` 등)과 분석 흐름(Parser → ConversationEngine v2 → ResultChatBar → 결과화면)을 v1.0 기준으로 동결한다. 이후 변경은 새 버전 단위로 별도 검토한다.
- **Conversation Engine v2 적용**: 상태 전이 테이블 기반 StateMachine, Slot Registry, Command Dispatcher 구조로 동작. `?ce_v2=true`로 활성화.
- **Context QA: 7/7 PASS** — 단지 확정, 평형 변경, 매수 의견 전환, 다른 평형/다른 단지/처음/새 검색 등 컨텍스트 유지·전환 시나리오 전체 통과.
- **Stress QA: 6/6 PASS** — 오타, 띄어쓰기 불규칙, 평형 누락, 단지명 누락, 브랜드명만 입력 등 비정형 입력 시나리오 전체 통과. 특히 단지명 누락 시 영구 행잉되던 Critical 버그 해소.
- **Boundary QA: 5/5 PASS** — 평형 매칭 경계값(최소/최대 클램프, 정확 일치, 두 평형 사이 근접 매칭, ㎡↔평 단위 변환) 전체 통과.
- **P0 버그: 0건**.
- **남은 LOW 이슈는 Backlog로 관리**: 자연어 조사 처리, 가격범위 표시 역전, 신뢰도 라벨 불일치 등은 `BACKLOG.md`로 이동. Freeze를 막는 사유가 아님.

## 주요 수정 사항 (이번 Freeze 작업 범위)

- ResultChatBar에 Command Dispatcher 도입 — 처음/새 검색/다른 단지/다른 평형/매수 전환 명령을 독립 핸들러로 분리, ResultChatBar는 라우팅만 담당.
- `ActionHandlers`의 `askHandlers`에 `complex` 슬롯 핸들러 추가 — 단지명 누락 시 무응답(행잉) 버그 해소.
- "매수 의견" 진입을 신규 결과 화면을 만들지 않고 기존 "매수 추천"(`BuyView`, `aptTab="buy"`) 진입점에 연결.
- `extractComplexRaw`의 단지명 토큰 선택 기준을 longest → first로 변경 — 오타/늘어진 입력에서 단지명 오인식 해소.

## Freeze 이후 원칙

- 계산 로직은 어떤 이유로도 수정하지 않는다.
- 신규 버그 발견 시 P0 여부부터 판단하고, 구조 리팩토링은 다시 열지 않는다.
- 다음 개발 단계는 **Buy Engine v1.0 설계**다.
