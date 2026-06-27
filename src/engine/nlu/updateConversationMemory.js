/**
 * ValueLens NLU — updateConversationMemory.js
 *
 * NLU 결과를 기반으로 Conversation State를 업데이트한다.
 * 짧은 입력이라도 이전 Context를 최대한 유지한다.
 * ★ 계산 로직 없음. 상태 업데이트만.
 */

import { NLU_INTENTS } from './classifyUserIntent.js';

// ─────────────────────────────────────────────
// Context Action 정의
// ─────────────────────────────────────────────
export const CONTEXT_ACTIONS = {
  KEEP_ALL:           "keep_all",         // 모든 context 유지
  UPDATE_AREA:        "update_area",      // 면적만 변경
  UPDATE_REGION:      "update_region",    // 지역 변경 (단지 초기화)
  NEW_COMPLEX:        "new_complex",      // 새 단지 검색 (이전 context 종료)
  UPDATE_BUDGET:      "update_budget",    // 예산 업데이트
  UPDATE_PURPOSE:     "update_purpose",   // 목적 업데이트
  SHOW_CANDIDATES:    "show_candidates",  // 후보 목록 표시
  SHOW_ALL_AREAS:     "show_all_areas",   // 모든 평형 표시
  NEXT_CANDIDATE:     "next_candidate",   // 다음 후보
  SELECT_CANDIDATE:   "select_candidate", // 후보 번호 선택
  RESET:              "reset",            // 전체 초기화
  CONFIRM:            "confirm",          // 현재 context 확인
  DENY:               "deny",             // 현재 context 부정
  ASK_COMPLEX:        "ask_complex",      // 단지 질문
  ASK_AREA:           "ask_area",         // 면적 질문
  RECOMMEND:          "recommend",        // 추천 검색
  INFO_ONLY:          "info_only",        // 정보성 응답 (context 변경 없음)
};

// ─────────────────────────────────────────────
// 검색 전 검증 규칙 (작업 5)
// ─────────────────────────────────────────────
const NON_SEARCH_INTENTS = new Set([
  NLU_INTENTS.SHOW_ALL_AREAS,
  NLU_INTENTS.CHANGE_CANDIDATE,
  NLU_INTENTS.CHANGE_AREA,
  NLU_INTENTS.AREA_SELECT,
  NLU_INTENTS.CONFIRM,
  NLU_INTENTS.DENY,
  NLU_INTENTS.RESET,
  NLU_INTENTS.CANDIDATE_SELECT,
  NLU_INTENTS.JEONSE_INFO,
  NLU_INTENTS.RECENT_DEALS,
  NLU_INTENTS.SCHOOL_INFO,
  NLU_INTENTS.BUY_OPINION,
  NLU_INTENTS.PRICE_OPINION,
  NLU_INTENTS.PRICE_ANALYSIS,
  NLU_INTENTS.EXPLAIN_REASON,
  NLU_INTENTS.CONTRACT_CHECK,
  NLU_INTENTS.DATA_MISSING,
  NLU_INTENTS.UNKNOWN_FOLLOWUP,
  NLU_INTENTS.LARGER_AREA,
  NLU_INTENTS.SMALLER_AREA,
  NLU_INTENTS.GREETING,
  NLU_INTENTS.UNKNOWN,
]);

/**
 * 검색 API 호출이 필요한지 검증
 * 검색하면 안 되는 입력을 단지명으로 검색하는 오류 방지
 */
export function shouldSearch(intent, entities, state) {
  // 명시적으로 검색 불필요한 intent — 단, 아래 예외 적용
  if (NON_SEARCH_INTENTS.has(intent)) {
    const hasComplexHint = !!(entities.complexQuery || entities.brand);
    const hasRegion = !!(entities.sigungu || entities.regionArea || entities.dong);

    // 예외 1: 단지 미확정 + complexQuery/지역 있음 → 단지 먼저 검색
    if (!state.currentComplex && (hasComplexHint || hasRegion)) return true;

    // 예외 2: 단지 확정됐는데 다른 단지명 입력 → 새 단지 검색 (Rule 7)
    // 단, complexQuery가 실제로 있을 때만 (후속 질문은 complexQuery 없음)
    if (state.currentComplex && hasComplexHint && entities.complexQuery) {
      const curName = (state.currentComplex.complex_name || "").replace(/\s/g, "");
      const newQuery = (entities.complexQuery || "").replace(/\s/g, "");
      const isSame = newQuery.length >= 2 && curName.includes(newQuery.slice(0, 3));
      if (!isSame && newQuery.length >= 2) return true;  // 다른 단지 → 검색 필요
    }

    return false;
  }

  // 면적만 있고 단지명 없으면 검색 안 함 (area-only 입력 방지)
  if (entities.areaSqm != null && !entities.complexQuery && !entities.sigungu) return false;

  // 후속어 패턴은 검색 안 함
  const FOLLOWUP_PATTERNS = /^(다\s*보여줘|그거\s*말고|아니|응|맞아|그래|다시|그걸로)$/;
  if (FOLLOWUP_PATTERNS.test((entities._rawText || "").trim())) return false;

  // 단지명이나 지역이 있으면 검색
  if (entities.complexQuery || entities.sigungu || entities.regionArea) return true;

  // 추천/검색 intent
  if (intent === NLU_INTENTS.SEARCH_COMPLEX || intent === NLU_INTENTS.RECOMMEND_COMPLEX) return true;

  return false;
}

// ─────────────────────────────────────────────
// Context 업데이트 메인
// ─────────────────────────────────────────────
/**
 * Intent + 엔티티 + 현재 State → contextAction + 업데이트된 State 반환
 *
 * @param {string} intent    — NLU_INTENTS 중 하나
 * @param {object} entities  — extractEntities 결과
 * @param {object} state     — 현재 conversationState
 * @returns {{ contextAction, updatedState, searchQuery, areaHint }}
 */
export function updateConversationMemory(intent, entities, state) {
  const hasComplex = !!state.currentComplex;
  const hasArea    = !!state.currentArea;
  const hasCands   = state.candidates?.length > 0;

  // 공통 업데이트 헬퍼
  const keep = (extra = {}) => ({
    contextAction: CONTEXT_ACTIONS.KEEP_ALL,
    updatedState:  { ...state, ...extra },
    searchQuery:   null,
    areaHint:      entities.areaSqm || null,
  });

  switch (intent) {

    // ── 초기화 ──
    case NLU_INTENTS.RESET:
      return {
        contextAction: CONTEXT_ACTIONS.RESET,
        updatedState:  { ...state, currentComplex:null, currentArea:null, candidates:[], region:null, pendingSlot:null, lastAreaHint:null },
        searchQuery: null, areaHint: null,
      };

    // ── 확인 ──
    case NLU_INTENTS.CONFIRM:
      if (hasCands) return { contextAction: CONTEXT_ACTIONS.SELECT_CANDIDATE, updatedState: state, searchQuery: null, areaHint: null, selectedIndex: 0 };
      return keep();

    // ── 부정 ──
    case NLU_INTENTS.DENY:
      if (hasCands) return { contextAction: CONTEXT_ACTIONS.NEXT_CANDIDATE, updatedState: { ...state, candidates: state.candidates.slice(1) }, searchQuery: null, areaHint: null };
      if (hasArea)  return { contextAction: CONTEXT_ACTIONS.UPDATE_AREA, updatedState: { ...state, currentArea: null, pendingSlot: "area", lastQuestion: "area?" }, searchQuery: null, areaHint: null };
      return keep();

    // ── 다른 후보 ──
    case NLU_INTENTS.CHANGE_CANDIDATE:
      return {
        contextAction: CONTEXT_ACTIONS.NEXT_CANDIDATE,
        updatedState:  { ...state, candidates: (state.candidates||[]).slice(1) },
        searchQuery: null, areaHint: null,
      };

    // ── 후보 선택 (번호) ──
    case NLU_INTENTS.CANDIDATE_SELECT: {
      const idx = entities.candidateIndex ?? 0;
      return { contextAction: CONTEXT_ACTIONS.SELECT_CANDIDATE, updatedState: state, searchQuery: null, areaHint: null, selectedIndex: idx };
    }

    // ── 면적 선택/변경 ──
    case NLU_INTENTS.AREA_SELECT:
    case NLU_INTENTS.CHANGE_AREA: {
      const sqm = entities.areaSqm;
      if (!sqm) return keep();
      if (hasComplex) {
        return { contextAction: CONTEXT_ACTIONS.UPDATE_AREA, updatedState: { ...state, currentArea: null, lastAreaHint: sqm }, searchQuery: null, areaHint: sqm };
      }
      // 단지 없으면 면적 힌트 저장 후 단지 질문
      return { contextAction: CONTEXT_ACTIONS.ASK_COMPLEX, updatedState: { ...state, lastAreaHint: sqm }, searchQuery: null, areaHint: sqm };
    }

    // ── 지역 변경 ──
    case NLU_INTENTS.CHANGE_REGION: {
      const newRegion = entities.regionArea || entities.sigungu || entities.dong;
      return {
        contextAction: CONTEXT_ACTIONS.UPDATE_REGION,
        updatedState:  { ...state, region: newRegion, currentComplex: null, currentArea: null, candidates: [], pendingSlot: null },
        searchQuery: null, areaHint: null,
      };
    }

    // ── 모든 평형 보기 ──
    case NLU_INTENTS.SHOW_ALL_AREAS:
      if (hasComplex) return { contextAction: CONTEXT_ACTIONS.SHOW_ALL_AREAS, updatedState: state, searchQuery: null, areaHint: null };
      if (state.region) return { contextAction: CONTEXT_ACTIONS.SHOW_CANDIDATES, updatedState: state, searchQuery: null, areaHint: null };
      return { contextAction: CONTEXT_ACTIONS.ASK_COMPLEX, updatedState: state, searchQuery: null, areaHint: null };

    // ── 큰/작은 평수 ──
    case NLU_INTENTS.LARGER_AREA: {
      const curArea = state.currentArea;
      const hint = curArea ? Math.round(curArea * 1.2) : null;
      return { contextAction: CONTEXT_ACTIONS.UPDATE_AREA, updatedState: { ...state, currentArea: null, lastAreaHint: hint }, searchQuery: null, areaHint: hint };
    }
    case NLU_INTENTS.SMALLER_AREA: {
      const curArea2 = state.currentArea;
      const hint2 = curArea2 ? Math.round(curArea2 * 0.8) : null;
      return { contextAction: CONTEXT_ACTIONS.UPDATE_AREA, updatedState: { ...state, currentArea: null, lastAreaHint: hint2 }, searchQuery: null, areaHint: hint2 };
    }

    // ── 예산 변경 ──
    case NLU_INTENTS.CHANGE_BUDGET:
      return keep({ budget: entities.budget });

    // ── 목적 변경 ──
    case NLU_INTENTS.CHANGE_PURPOSE:
      return keep({ purpose: entities.purpose });

    // ── 후속 질문 (context 유지) ──
    case NLU_INTENTS.JEONSE_INFO:
    case NLU_INTENTS.RECENT_DEALS:
    case NLU_INTENTS.BUY_OPINION:
    case NLU_INTENTS.PRICE_ANALYSIS:
    case NLU_INTENTS.PRICE_OPINION:
    case NLU_INTENTS.SCHOOL_INFO:
    case NLU_INTENTS.EXPLAIN_REASON:
    case NLU_INTENTS.CONTRACT_CHECK:
    case NLU_INTENTS.DATA_MISSING:
    case NLU_INTENTS.COMPARE_COMPLEX:
    case NLU_INTENTS.SIMILAR_COMPLEX:
    case NLU_INTENTS.CHEAPER_OPTION:
      return { contextAction: CONTEXT_ACTIONS.INFO_ONLY, updatedState: state, searchQuery: null, areaHint: entities.areaSqm || null };

    // ── 추천 ──
    case NLU_INTENTS.RECOMMEND_COMPLEX: {
      const query = buildSearchQuery(entities, state);
      return {
        contextAction: CONTEXT_ACTIONS.RECOMMEND,
        updatedState:  {
          ...state,
          region:  entities.regionArea || entities.sigungu || state.region,
          budget:  entities.budget  || state.budget,
          purpose: entities.purpose || state.purpose,
          family:  entities.family  || state.family,
        },
        searchQuery: query,
        areaHint: entities.areaSqm || null,
      };
    }

    // ── 단지 검색 ──
    case NLU_INTENTS.SEARCH_COMPLEX: {
      const q = entities.complexQuery || entities.complexName;
      const sg = entities.sigungu || entities.regionArea || state.region || "";
      // 이전 단지와 다른 단지이면 context 종료
      const isSame = hasComplex && state.currentComplex?.complex_name?.includes((q || "").slice(0, 4));
      return {
        contextAction: isSame ? CONTEXT_ACTIONS.KEEP_ALL : CONTEXT_ACTIONS.NEW_COMPLEX,
        updatedState:  isSame ? state : { ...state, currentComplex: null, currentArea: null, candidates: [] },
        searchQuery: q || null,
        searchSigungu: sg,
        areaHint: entities.areaSqm || null,
      };
    }

    // ── 기타 ──
    case NLU_INTENTS.GREETING:
    case NLU_INTENTS.UNKNOWN_FOLLOWUP:
    case NLU_INTENTS.UNKNOWN:
      return keep();

    default:
      return keep();
  }
}

// ─────────────────────────────────────────────
// 검색 쿼리 생성 헬퍼
// ─────────────────────────────────────────────
function buildSearchQuery(entities, state) {
  const parts = [];
  const region = entities.regionArea || entities.sigungu || entities.dong || state.region;
  if (region) parts.push(region);
  if (entities.complexQuery) parts.push(entities.complexQuery);
  if (entities.brand) parts.push(entities.brand);
  return parts.join(" ") || null;
}
