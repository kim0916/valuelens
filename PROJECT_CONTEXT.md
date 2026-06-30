# PROJECT_CONTEXT.md

> 최종 수정: 2026-06-30

## 현재 버전

**v1.0.0** — FairValue v1.0 Freeze 완료

## 상태

| 영역 | 상태 |
|------|------|
| FairValue 엔진 (적정가 분석) | ✅ Freeze (v1.0.0) — 계산 로직 변경 금지 |
| Conversation Engine v2 | ✅ 적용 완료 (`?ce_v2=true`) |
| Context QA | ✅ 7/7 PASS |
| Stress QA | ✅ 6/6 PASS |
| Boundary QA | ✅ 5/5 PASS |
| P0 버그 | 0건 |
| LOW 이슈 | Backlog로 이동 관리 (`BACKLOG.md`) |

## Freeze 범위

FairValue v1.0 Freeze는 다음을 의미한다.

- 적정가 분석 흐름(Parser → ConversationEngine v2 → ResultChatBar → 결과화면)의 구조 변경을 더 이상 진행하지 않는다.
- `src/engine/analyze.js`, `src/engine/market.js`, `src/engine/stats.js` 등 계산 로직은 절대 수정하지 않는다.
- 신규 버그가 발견되면 P0(출시 차단) 여부만 판단해서 최소 범위로 수정하고, 구조 리팩토링은 다시 열지 않는다.

## 다음 개발 단계

**Buy Engine v1.0 설계** — `CURRENT_TASK.md` 참고.

## 참고 문서

- `docs/architecture.md` — 전체 아키텍처
- `docs/calculation-engine.md` — 적정가 계산 로직 (Freeze, 수정 금지)
- `docs/roadmap.md` — 장기 로드맵
- `BACKLOG.md` — Freeze 이후로 미룬 LOW 이슈 목록
