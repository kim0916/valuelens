/**
 * ValueLens Conversation Engine — conversationPolicy.js
 *
 * AI가 다음에 무엇을 해야 하는지 결정하는 Policy Engine.
 * ConversationEngine.route() 진입 전 미들웨어로 동작한다.
 *
 * 결정 흐름:
 *   사용자 입력
 *     → classifyIntent (intentClassifier)
 *       → applyPolicy (여기)         ← 이 파일
 *         → action 결정
 *           → ConversationEngine.execute()
 *
 * ★ 이 파일은 "무엇을 할지 결정"만 한다.
 *   실제 검색/분석 실행은 ConversationEngine이 담당한다.
 *   계산 로직 없음.
 */

import { INTENTS } from './intentClassifier.js';
import { isReadyToAnalyze, getAreaGroups } from './conversationState.js';

// ─────────────────────────────────────────────
// Action 정의 — Policy가 결정하는 "다음 행동"
// ─────────────────────────────────────────────
export const ACTIONS = {
  // 분석 실행
  ANALYZE_NOW:         "analyze_now",        // 즉시 분석 (단지+평형 확보)
  ANALYZE_JEONSE:      "analyze_jeonse",     // 전세 분석
  ANALYZE_BUY:         "analyze_buy",        // 매수 판단 분석
  ANALYZE_RECENT:      "analyze_recent",     // 최근 거래 조회

  // 정보 수집
  ASK_AREA:            "ask_area",           // 평형 질문 (DB 실제 평형 제시)
  ASK_COMPLEX:         "ask_complex",        // 단지 질문
  SHOW_CANDIDATES:     "show_candidates",    // 후보 목록 제시

  // 컨텍스트 조작
  UPDATE_AREA:         "update_area",        // 평형만 변경
  UPDATE_REGION:       "update_region",      // 지역만 변경
  NEW_COMPLEX:         "new_complex",        // 새 단지 시작 (이전 Context 종료)
  NEXT_CANDIDATE:      "next_candidate",     // 다음 후보
  PREV_STEP:           "prev_step",          // 이전 단계 수정 ("아니")
  RESET:               "reset",             // 전체 초기화

  // 선택
  SELECT_CANDIDATE:    "select_candidate",   // 후보 번호 선택
  CONFIRM_AND_ANALYZE: "confirm_and_analyze",// 확인 후 분석

  // NLU 신규 (Phase 2)
  RECOMMEND:           "recommend",          // 조건형 추천 검색

  // 안내
  GREET:               "greet",             // 인사
  UNKNOWN:             "unknown",           // 분류 불가
};

// ─────────────────────────────────────────────
// Policy Decision 구조체
// ─────────────────────────────────────────────
/**
 * @typedef {Object} PolicyDecision
 * @property {string}  action      — ACTIONS 중 하나
 * @property {number}  rule        — 적용된 Rule 번호 (1~10)
 * @property {string}  reason      — 결정 이유 (디버그용)
 * @property {object}  params      — 행동에 필요한 파라미터
 * @property {boolean} needSearch  — 검색 API 호출 필요 여부
 */

// ─────────────────────────────────────────────
// 메인 Policy 함수
// ─────────────────────────────────────────────
/**
 * Intent + State → Action 결정
 *
 * @param {string} intent    — classifyIntent 결과
 * @param {object} extracted — 추출된 파라미터 { areaSqm, region, index, ... }
 * @param {object} state     — 현재 conversationState
 * @param {string} rawText   — 원본 입력 (Rule 판단 보조)
 * @returns {PolicyDecision}
 */
export function applyPolicy(intent, extracted, state, rawText = "") {
  const hasComplex  = !!state.currentComplex;
  const hasArea     = !!state.currentArea;
  const hasCandidates = state.candidates && state.candidates.length > 0;
  const areaSqm     = extracted.areaSqm || null;
  const areaGroups  = hasComplex ? getAreaGroups(state) : [];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 10: "다시" → Context 전체 초기화
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (intent === INTENTS.RESET) {
    return decide(ACTIONS.RESET, 10, "다시/초기화 입력");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 8: "아니" → 이전 단계 수정
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (intent === INTENTS.DENY) {
    if (hasCandidates) {
      // 후보 대기 중 아니 → 다음 후보
      return decide(ACTIONS.NEXT_CANDIDATE, 8, "후보 대기 중 부정 → 다음 후보");
    }
    if (hasArea) {
      // 면적 확정 후 아니 → 면적 재선택
      return decide(ACTIONS.ASK_AREA, 8, "면적 확정 후 부정 → 면적 재선택", { areaGroups });
    }
    if (hasComplex) {
      // 단지 확정 후 아니 → 다른 단지 검색
      return decide(ACTIONS.NEW_COMPLEX, 8, "단지 확정 후 부정 → 새 단지");
    }
    return decide(ACTIONS.UNKNOWN, 8, "부정할 컨텍스트 없음");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 9: "다른 거" → 다음 후보
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (intent === INTENTS.CHANGE_CANDIDATE) {
    return decide(ACTIONS.NEXT_CANDIDATE, 9, "다른 후보 요청");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 6: 새 지역 입력 → Region만 변경
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (intent === INTENTS.CHANGE_REGION) {
    const newRegion = extracted.region || extractRegionFromText(rawText);
    return decide(ACTIONS.UPDATE_REGION, 6, `지역 변경 → ${newRegion}`, { region: newRegion });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 5: 후속 질문 → 현재 Context 유지
  // (전세/학군/최근거래/매수의견)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (intent === INTENTS.JEONSE_INFO) {
    if (hasComplex && hasArea) return decide(ACTIONS.ANALYZE_JEONSE, 5, "전세 분석 — 컨텍스트 유지");
    if (hasComplex)            return decide(ACTIONS.ASK_AREA, 5, "전세 요청 — 평형 미확정", { areaGroups, purpose: "jeonse" });
    return decide(ACTIONS.ASK_COMPLEX, 5, "전세 요청 — 단지 미확정", { purpose: "jeonse" });
  }

  if (intent === INTENTS.RECENT_DEALS) {
    if (hasComplex && hasArea) return decide(ACTIONS.ANALYZE_RECENT, 5, "최근거래 — 컨텍스트 유지");
    if (hasComplex)            return decide(ACTIONS.ASK_AREA, 5, "최근거래 — 평형 미확정", { areaGroups });
    return decide(ACTIONS.ASK_COMPLEX, 5, "최근거래 — 단지 미확정");
  }

  if (intent === INTENTS.BUY_OPINION) {
    if (hasComplex && hasArea) return decide(ACTIONS.ANALYZE_BUY, 5, "매수 판단 — 컨텍스트 유지");
    if (hasComplex)            return decide(ACTIONS.ASK_AREA, 5, "매수 판단 — 평형 미확정", { areaGroups });
    return decide(ACTIONS.ASK_COMPLEX, 5, "매수 판단 — 단지 미확정");
  }

  if (intent === INTENTS.PRICE_ANALYSIS) {
    if (hasComplex && hasArea) return decide(ACTIONS.ANALYZE_NOW, 5, "적정가 분석 — 컨텍스트 유지");
    if (hasComplex)            return decide(ACTIONS.ASK_AREA, 5, "적정가 — 평형 미확정", { areaGroups });
    return decide(ACTIONS.ASK_COMPLEX, 5, "적정가 — 단지 미확정");
  }

  if (intent === INTENTS.PRICE_OPINION) {
    if (hasComplex && hasArea) return decide(ACTIONS.ANALYZE_NOW, 5, "가격 의견 — 컨텍스트 유지");
    return decide(ACTIONS.ASK_COMPLEX, 5, "가격 의견 — 단지 미확정");
  }

  if (intent === INTENTS.SCHOOL_INFO) {
    // 학군 정보: Context 있으면 유지, 없으면 단지 질문
    return decide(ACTIONS.UNKNOWN, 5, "학군 — 외부 연동 준비 중");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 3: 평형만 있음
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (intent === INTENTS.AREA_SELECT || intent === INTENTS.CHANGE_AREA) {
    if (!areaSqm) {
      return decide(ACTIONS.ASK_AREA, 3, "평형 표현 있으나 수치 추출 실패", { areaGroups });
    }

    if (hasComplex) {
      // Rule 3-A: 단지 있음 → 평형 업데이트 후 분석
      return decide(ACTIONS.UPDATE_AREA, 3, `단지 있음 + 평형 변경 → 분석`, {
        areaSqm,
        thenAnalyze: true,
      });
    }

    if (hasCandidates) {
      // 후보 대기 중 평형 입력 → 일단 저장
      return decide(ACTIONS.UPDATE_AREA, 3, "후보 대기 중 평형 저장", { areaSqm, thenAnalyze: false });
    }

    // Rule 3-B: 단지 없음 → 단지 질문
    return decide(ACTIONS.ASK_COMPLEX, 3, "평형만 있음 — 단지 미확정", { pendingArea: areaSqm });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 4: 후보 선택
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (intent === INTENTS.CANDIDATE_SELECT) {
    const idx = extracted.index ?? 0;
    return decide(ACTIONS.SELECT_CANDIDATE, 4, `후보 ${idx + 1}번 선택`, { index: idx });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 확인 (응/맞아)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (intent === INTENTS.CONFIRM) {
    if (state.pendingSlot === "candidate" && hasCandidates) {
      return decide(ACTIONS.SELECT_CANDIDATE, 4, "후보 확인 → 첫 번째 선택", { index: 0 });
    }
    if (isReadyToAnalyze(state)) {
      return decide(ACTIONS.ANALYZE_NOW, 1, "확인 — 분석 준비 완료 → 즉시 분석");
    }
    if (hasComplex && !hasArea) {
      return decide(ACTIONS.ASK_AREA, 2, "확인 — 단지 확정 후 평형 질문", { areaGroups });
    }
    return decide(ACTIONS.UNKNOWN, 0, "확인할 컨텍스트 없음");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 인사
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (intent === INTENTS.GREETING) {
    return decide(ACTIONS.GREET, 0, "인사");
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 7: 새 단지 입력 → 이전 Context 종료 후 새 Context
  // Rule 1: 단지+평형 → 즉시 분석
  // Rule 2: 단지만   → 실제 DB 평형 제시
  // Rule 4: 복수 단지 → 후보 선택
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ── 조건형 추천 검색 (NLU Phase 2) ──
  if (intent === "recommend_complex") {
    return decide(ACTIONS.RECOMMEND, 2, "NLU 조건형 추천", {
      query:    extracted.complexQuery || extracted.query,
      areaSqm:  extracted.areaSqm || null,
      needSearch: true,
      _nlu: extracted._nlu,
    });
  }

  if (intent === INTENTS.SEARCH_COMPLEX || intent === INTENTS.UNKNOWN) {
    const isNewComplex = hasComplex && !isSameComplexHint(rawText, state.currentComplex);

    if (isNewComplex) {
      // Rule 7: 이전 Context 종료
      return decide(ACTIONS.NEW_COMPLEX, 7, "새 단지 입력 — 이전 Context 종료", {
        query:    extracted.complexQuery || rawText,
        areaSqm:  areaSqm,
        needSearch: true,
      });
    }

    // 같은 단지 + 새 평형 입력 → Rule 3 (면적만 변경)
    if (hasComplex && areaSqm && !isNewComplex) {
      return decide(ACTIONS.UPDATE_AREA, 3, "같은 단지 + 평형 변경 → update_area", {
        areaSqm,
        thenAnalyze: true,
      });
    }

    // 새 Context (단지 없는 상태에서 검색)
    if (areaSqm) {
      // 단지+평형 동시 입력 → Rule 1 or Rule 4 (검색 후 판단)
      return decide(ACTIONS.NEW_COMPLEX, 1, "단지+평형 동시 입력 → 검색 후 분석", {
        query:    extracted.complexQuery || rawText,
        areaSqm,
        needSearch: true,
      });
    }

    // 단지만 입력 → Rule 2 (검색 후 평형 제시)
    return decide(ACTIONS.NEW_COMPLEX, 2, "단지만 입력 → 검색 후 평형 제시", {
      query:    extracted.complexQuery || rawText,
      areaSqm:  null,
      needSearch: true,
    });
  }

  return decide(ACTIONS.UNKNOWN, 0, `분류 불가 — intent:${intent}`);
}

// ─────────────────────────────────────────────
// Rule 1 체크: 단지+평형 확보 → 즉시 분석 가능
// ─────────────────────────────────────────────
export function checkRule1(state) {
  return isReadyToAnalyze(state);
}

// ─────────────────────────────────────────────
// Rule 2 체크: 단지 있고 평형 없음 → 평형 제시
// ─────────────────────────────────────────────
export function checkRule2(state) {
  return !!state.currentComplex && !state.currentArea;
}

// ─────────────────────────────────────────────
// Rule 4 체크: 복수 후보 → 선택 필요
// ─────────────────────────────────────────────
export function checkRule4(state) {
  return state.candidates && state.candidates.length > 1 && !state.currentComplex;
}

// ─────────────────────────────────────────────
// Policy 결과를 검색 실행 후 재평가
// (검색 결과에 따라 Rule 1/2/4 분기)
// ─────────────────────────────────────────────
export function applyPostSearchPolicy(complexes, areaHint, state) {
  if (!complexes || complexes.length === 0) {
    return decide(ACTIONS.UNKNOWN, 0, "검색 결과 없음 → not_found");
  }

  if (complexes.length === 1) {
    // 단 1건
    if (areaHint) {
      // 면적 힌트 있음 → Rule 1 경로 (candidateSelector가 자동 선택 시도)
      return decide(ACTIONS.ANALYZE_NOW, 1, "단건 + 면적힌트 → 자동 선택 후 분석 시도");
    }
    // Rule 2: 단지만 → 평형 제시
    return decide(ACTIONS.ASK_AREA, 2, "단건 — 평형 제시");
  }

  // Rule 4: 복수 → 후보 제시
  return decide(ACTIONS.SHOW_CANDIDATES, 4, `복수 단지(${complexes.length}건) → 후보 선택`);
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────
function decide(action, rule, reason, params = {}) {
  return {
    action,
    rule,
    reason,
    params,
    needSearch: params.needSearch === true,
  };
}

function isSameComplexHint(rawText, currentComplex) {
  if (!currentComplex || !rawText) return false;
  const name = (currentComplex.complex_name || "").replace(/\s/g, "").slice(0, 5);
  const text = rawText.replace(/\s/g, "");
  return text.includes(name);
}

function extractRegionFromText(text) {
  return text.replace(/(으로|로|에서|바꿔|변경|보여줘).*/g, "").trim();
}

// ─────────────────────────────────────────────
// Policy 로그 (디버그용)
// ─────────────────────────────────────────────
export function logPolicy(decision, state) {
  console.log(
    `[Policy] Rule${decision.rule} → ${decision.action} | ${decision.reason}`,
    `| complex:${state.currentComplex?.complex_name || "없음"}`,
    `| area:${state.currentArea || "없음"}`,
    `| candidates:${state.candidates?.length || 0}`,
  );
}
