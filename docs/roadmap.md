# ValueLens Roadmap

> 최종 수정: 2026-06-26

---

## Phase 1 — 리팩토링 (진행 중)

목표: main.jsx(9,300줄) → 모듈화 구조

| 단계 | 내용 | 상태 |
|------|------|------|
| 1-A | constants, engine, recommendation, loan 분리 | ✅ 완료 |
| 1-B | search 분리 | ✅ 완료 |
| 1-C | services 계층 구축 + docs 작성 | ✅ 완료 |
| 1-D | main.jsx → import 연결, 빌드 검증 | 🔲 예정 |
| 1-E | components 분리 | 🔲 예정 |
| 1-F | views 분리 | 🔲 예정 |
| 1-G | app 분리 | 🔲 예정 |

---

## Phase 2 — AI Agent 강화

| 기능 | 내용 | 예상 시점 |
|------|------|---------|
| 음성 입력 안정화 | Web Speech API + 폴백 처리 | Phase 2 초 |
| Smart Intent v2 | Claude API 기반 파싱 (규칙 기반 → LLM) | Phase 2 중 |
| 캐시 레이어 | Upstash Redis, 시장 데이터 캐싱 | Phase 2 중 |
| 비교 분석 | 단지 A vs B 비교 엔진 | Phase 2 후 |

---

## Phase 3 — Vision & Document AI

| 기능 | 내용 |
|------|------|
| 사진 분석 | Claude Vision — 아파트 외관, 명판, 캡처 인식 |
| PDF 분석 | 등기부등본, 건축물대장, 계약서 파싱 |
| OCR 파이프라인 | 사진 → 텍스트 → Intent → 분석 자동화 |

---

## Phase 4 — 상업화

| 기능 | 내용 |
|------|------|
| 유료 플랜 | 분석 횟수 제한, 프리미엄 기능 |
| 알림 | 관심 단지 가격 변동 알림 |
| 포트폴리오 | 보유 물건 통합 관리 |
| API | 외부 서비스 연동 API 제공 |

---

## 핵심 불변 사항

어떤 Phase에서도 아래는 변경하지 않는다.

- 적정가 계산 로직 (analyze.js)
- strictMode, 12개월/5건 기준
- Supabase-first + MOLIT fallback 구조
- 사용자 데이터 보안 정책
