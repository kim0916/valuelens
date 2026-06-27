/**
 * ValueLens Conversation Engine — ConversationEngine.js v2
 *
 * 처리 흐름:
 *   input
 *     → classifyIntent()          [intentClassifier]
 *       → applyPolicy()           [conversationPolicy] ← Phase 1.5 추가
 *         → execute(action)       [여기서 실행]
 *           → search/analyze API
 *             → response          [responseGenerator]
 *
 * ★ 계산 로직(analyze.js) 호출 금지.
 *   ready_to_analyze 반환 → 호출자(AIChatView)가 analyze.js 실행.
 */

import {
  createConversationState,
  updateCandidates,
  updateComplex,
  updateArea,
  updateRegion,
  resetContext,
  addHistory,
  isReadyToAnalyze,
  getAreaGroups,
  updatePurpose,
  summarizeState,
} from './conversationState.js';

import {
  classifyIntent,
  INTENTS,
  pyeongToSqm,
  sqmToPyeong,
} from './intentClassifier.js';

import {
  applyPolicy,
  applyPostSearchPolicy,
  logPolicy,
  ACTIONS,
} from './conversationPolicy.js';

import {
  evaluateCandidates,
  selectByIndex,
  findBestAreaGroup,
  areaGroupLabel,
} from './candidateSelector.js';

import {
  responseCandidateList,
  responseAreaList,
  responseReadyToAnalyze,
  responseNotFound,
  responseAreaNotFound,
  responseRegionChanged,
  responseReset,
  responseNeedComplex,
  responseGreeting,
  responseUnknown,
  responseError,
  RESPONSE_TYPES,
} from './responseGenerator.js';

import { searchComplexFromSupabase } from '../search/supabase.js';
import { parseUserInput, NLU_INTENTS } from './nlu/parseUserInput.js';
import { searchRecommendCandidates, buildRecommendResponse } from './nlu/recommendSearch.js';
import { applyUXPolicy, auditResponseUX, calcConversationMetrics } from './uxPolicy.js';
export { calcConversationMetrics };

// ─────────────────────────────────────────────
// 엔진 생성
// ─────────────────────────────────────────────
export function createConversationEngine() {
  return { process };
}

// ─────────────────────────────────────────────
// 메인 처리 함수
// ─────────────────────────────────────────────
async function process(input, state = createConversationState()) {
  const text = (input || "").trim();
  if (!text) return { state, response: responseUnknown(state) };

  // 1. 히스토리 추가
  let s = addHistory(state, "user", text);

  // 2. NLU 파이프라인 (Phase 2: NLU Brain)
  //    parseUserInput → 29개 Intent + 엔티티 추출 + Context 업데이트
  const nlu = parseUserInput(text, s);

  // 2a. NLU → 기존 intent 브릿지
  //     NLU 신규 Intent를 기존 Policy가 이해할 수 있는 형태로 변환
  const { intent, extracted, confidence } = bridgeNLUToLegacy(nlu, text, s);

  // 3. Policy 적용 → Action 결정
  const decision = applyPolicy(intent, extracted, s, text);
  logPolicy(decision, s);

  // 3.5. UX Policy 적용 (Phase 1.8)
  // 8개 UX 규칙 검사 → 위반 시 action 또는 응답 교정
  const uxResult = applyUXPolicy(decision, s, text);
  const finalDecision = uxResult.decision;
  if (uxResult.hasViolation) {
    console.log("[UX Policy] 위반:", uxResult.violations, "→ 교정:", uxResult.overrideApplied);
  }

  // 4. Action 실행
  let response;
  [s, response] = await execute(finalDecision, intent, extracted, text, s);

  // 5. AI 응답 히스토리 추가
  s = addHistory(s, "ai", response.text, intent);
  s = { ...s, lastIntent: intent };

  // 6. 디버그 메타 첨부 (개발/QA용)
  // UX 사후 감사
  const uxAudit = auditResponseUX(response, s, s.history.filter(h => h.role === "ai").map(h => ({ text: h.text })));

  response._debug = {
    intent,
    confidence,
    action:     finalDecision.action,
    rule:       finalDecision.rule,
    reason:     finalDecision.reason,
    uxViolations: uxResult.violations,
    uxAudit:    uxAudit.violations,
    state:      summarizeState(s),
  };

  return { state: s, response };
}

// ─────────────────────────────────────────────
// Action 실행기
// ─────────────────────────────────────────────
async function execute(decision, intent, extracted, rawText, state) {
  const { action, params } = decision;

  switch (action) {

    // ── 인사 ──
    case ACTIONS.GREET:
      return [state, responseGreeting()];

    // ── 초기화 (Rule 10) ──
    case ACTIONS.RESET:
      return [resetContext(state), responseReset()];

    // ── 지역 변경 (Rule 6) ──
    case ACTIONS.UPDATE_REGION: {
      const newRegion = params.region || rawText.replace(/(으로|로|에서|바꿔|변경).*/g, "").trim();
      const ns = updateRegion(state, newRegion);
      return [ns, responseRegionChanged(newRegion)];
    }

    // ── 평형 업데이트 (Rule 3) ──
    case ACTIONS.UPDATE_AREA: {
      const areaSqm = params.areaSqm;
      if (!state.currentComplex) {
        // 단지 없음 → 면적 힌트 저장 후 단지 질문
        return [
          { ...state, lastAreaHint: areaSqm },
          {
            type: RESPONSE_TYPES.NEED_MORE_INFO,
            text: `${sqmToPyeong(areaSqm)}평으로 볼게요. 어떤 단지인가요?`,
            ui:   "message",
          },
        ];
      }
      // 단지 있음 → 가장 가까운 면적 그룹으로 매칭
      const areaGroups = getAreaGroups(state);
      const best       = findBestAreaGroup(areaGroups, areaSqm);

      if (!best || best.diff > 15) {
        return [state, responseAreaNotFound(state.currentComplex, areaSqm, areaGroups)];
      }

      const ns = updateArea(state, best.group.anchor);
      // 평형 확정 후 매물가 질문으로 (자동 분석 금지)
      return [ns, responseReadyToAnalyze(ns.currentComplex, ns.currentArea)];
    }

    // ── 평형 질문 (Rule 2, 3) ──
    case ACTIONS.ASK_AREA: {
      if (!state.currentComplex) {
        return [state, responseNeedComplex(params.purpose || "analysis")];
      }
      const areaGroups = params.areaGroups || getAreaGroups(state);
      return [state, responseAreaList(state.currentComplex, areaGroups, state.lastAreaHint)];
    }

    // ── 단지 질문 ──
    case ACTIONS.ASK_COMPLEX:
      return [
        { ...state, lastAreaHint: params.pendingArea || state.lastAreaHint },
        responseNeedComplex(params.purpose || "analysis"),
      ];

    // ── 후보 선택 (Rule 4) ──
    case ACTIONS.SELECT_CANDIDATE: {
      const idx    = params.index ?? 0;
      const result = selectByIndex(state, idx);
      if (!result.ok) {
        const msg = result.reason === "out_of_range"
          ? `1번부터 ${result.max}번까지 선택할 수 있어요.`
          : `선택할 후보가 없어요.`;
        return [state, { type: RESPONSE_TYPES.ERROR, text: msg, ui: "message" }];
      }
      const ns = updateComplex(state, result.complex, state.lastAreaHint);
      return handlePostComplex(ns, state.lastAreaHint);
    }

    // ── 다음 후보 (Rule 9) ──
    case ACTIONS.NEXT_CANDIDATE: {
      const remaining = state.candidates.slice(1);
      if (remaining.length === 0) {
        return [state, {
          type: RESPONSE_TYPES.NEED_MORE_INFO,
          text: `더 이상 다른 후보가 없어요. 단지명을 다시 입력해 주세요.`,
          ui:   "message",
        }];
      }
      const ns = { ...state, candidates: remaining };
      return [ns, responseCandidateList(remaining, state.lastSearchQuery || "", "next")];
    }

    // ── 이전 단계 (Rule 8: 아니) ──
    case ACTIONS.PREV_STEP: {
      // 현재 사용 안 함 (DENY는 DENY 핸들러에서 처리)
      return [state, responseUnknown(state)];
    }

    // ── 즉시 분석 (Rule 1, 5) ──
    case ACTIONS.ANALYZE_NOW:
      if (isReadyToAnalyze(state)) {
        return [state, responseReadyToAnalyze(state.currentComplex, state.currentArea)];
      }
      return [state, responseUnknown(state)];

    // ── 전세 분석 (Rule 5) ──
    case ACTIONS.ANALYZE_JEONSE: {
      const ns = updatePurpose(state, "jeonse");
      return [ns, {
        type:    RESPONSE_TYPES.READY_TO_ANALYZE,
        text:    `**${state.currentComplex.complex_name}** ${sqmToPyeong(state.currentArea)}평 전세 정보를 가져올게요...`,
        ui:      "analyzing",
        purpose: "jeonse",
      }];
    }

    // ── 최근 거래 (Rule 5) ──
    case ACTIONS.ANALYZE_RECENT: {
      return [state, {
        type:    RESPONSE_TYPES.READY_TO_ANALYZE,
        text:    `최근 실거래 내역을 가져올게요...`,
        ui:      "analyzing",
        purpose: "recent_deals",
      }];
    }

    // ── 매수/적정가 분석 (Rule 5) ──
    case ACTIONS.ANALYZE_BUY: {
      const ns = updatePurpose(state, "buy");
      return [ns, {
        type:    RESPONSE_TYPES.READY_TO_ANALYZE,
        text:    `매수 분석을 시작할게요...`,
        ui:      "analyzing",
        purpose: "buy",
      }];
    }

    // ── 조건형 추천 검색 (NLU recommend_complex) ──
    case ACTIONS.RECOMMEND:
      return await handleRecommendSearch(extracted._nlu || {}, state);

    // ── 새 단지 Context (Rule 7, 1, 2) ──
    case ACTIONS.NEW_COMPLEX:
    case ACTIONS.SHOW_CANDIDATES:
      return await handleSearch(
        params.query || rawText,
        params.areaSqm || extracted.areaSqm || null,
        state,
        decision.rule,
      );

    // ── Unknown ──
    default:
      return [state, responseUnknown(state)];
  }
}

// ─────────────────────────────────────────────
// NLU → 기존 Intent 브릿지
// ─────────────────────────────────────────────
/**
 * NLU 결과(29개 Intent)를 기존 Policy가 이해하는 형태로 변환
 * 기존 classifyIntent 결과와 동일한 { intent, extracted, confidence } 반환
 */
function bridgeNLUToLegacy(nlu, rawText, state) {
  const I  = NLU_INTENTS;
  const LI = INTENTS;   // 기존 15개

  // NLU 신규 Intent → 기존 Intent 매핑
  const intentMap = {
    [I.SHOW_ALL_AREAS]:    LI.AREA_SELECT,      // 다 보여줘 → area_select로 처리 (전체 목록)
    [I.RECOMMEND_COMPLEX]: "recommend_complex",  // 신규 action으로 처리
    [I.CHANGE_BUDGET]:     LI.CONFIRM,           // 예산 변경 → context update
    [I.CHANGE_PURPOSE]:    LI.CONFIRM,
    [I.CHANGE_PREFERENCE]: LI.CONFIRM,
    [I.CHEAPER_OPTION]:    LI.CHANGE_CANDIDATE,  // 더 싼 거 → 다른 후보
    [I.LARGER_AREA]:       LI.CHANGE_AREA,
    [I.SMALLER_AREA]:      LI.CHANGE_AREA,
    [I.SIMILAR_COMPLEX]:   LI.CHANGE_CANDIDATE,
    [I.COMPARE_COMPLEX]:   LI.PRICE_ANALYSIS,
    [I.EXPLAIN_REASON]:    LI.PRICE_ANALYSIS,
    [I.CONTRACT_CHECK]:    LI.PRICE_ANALYSIS,
    [I.DATA_MISSING]:      LI.UNKNOWN,
    [I.UNKNOWN_FOLLOWUP]:  LI.UNKNOWN,
  };

  // 기존 Intent는 그대로
  const LEGACY_INTENTS = new Set(Object.values(INTENTS));
  let mappedIntent = LEGACY_INTENTS.has(nlu.intent)
    ? nlu.intent
    : (intentMap[nlu.intent] || LI.UNKNOWN);

  // SHOW_ALL_AREAS: state에 단지가 있으면 area_list 표시
  if (nlu.intent === I.SHOW_ALL_AREAS) {
    mappedIntent = state.currentComplex ? LI.AREA_SELECT : LI.SEARCH_COMPLEX;
  }

  // RECOMMEND_COMPLEX: 신규 action으로 라우팅
  if (nlu.intent === I.RECOMMEND_COMPLEX) {
    mappedIntent = "recommend_complex";  // execute()에서 ACTIONS.RECOMMEND로 처리
  }

  // price_analysis / jeonse_info 등 + 단지 없음 + complexQuery 있음
  // → 검색 먼저 해야 하므로 search_complex로 라우팅
  const analysisIntentsNeedSearch = new Set([
    LI.PRICE_ANALYSIS, LI.JEONSE_INFO, LI.BUY_OPINION, LI.RECENT_DEALS, LI.PRICE_OPINION
  ]);
  if (analysisIntentsNeedSearch.has(mappedIntent) && nlu.shouldSearch && !state.currentComplex) {
    mappedIntent = LI.SEARCH_COMPLEX;
  }

  // LARGER/SMALLER_AREA: 면적 힌트 계산
  let areaSqmOverride = nlu.areaSqm;
  if (nlu.intent === I.LARGER_AREA && state.currentArea) {
    areaSqmOverride = Math.round(state.currentArea * 1.25);
  }
  if (nlu.intent === I.SMALLER_AREA && state.currentArea) {
    areaSqmOverride = Math.round(state.currentArea * 0.75);
  }

  // extracted 구성 (기존 형식 + NLU 확장)
  const extracted = {
    areaSqm:      areaSqmOverride,
    pyeong:       areaSqmOverride ? Math.round(areaSqmOverride / 3.305785) : null,
    region:       nlu.region || nlu.sigungu,
    index:        nlu.selectedIndex,
    complexQuery: nlu.complexQuery,
    query:        nlu.complexQuery || rawText,
    budget:       nlu.budget,
    purpose:      nlu.purpose,
    family:       nlu.family,
    // NLU 원본 (추천 검색에서 활용)
    _nlu:         nlu,
  };

  return { intent: mappedIntent, extracted, confidence: nlu.confidence };
}

// ─────────────────────────────────────────────
// 조건형 추천 검색 처리
// ─────────────────────────────────────────────
async function handleRecommendSearch(nlu, state) {
  try {
    const { candidates, meta } = await searchRecommendCandidates(nlu);
    const resp = buildRecommendResponse(candidates, nlu, meta);

    if (candidates.length === 0) {
      return [state, { type: RESPONSE_TYPES.NOT_FOUND, text: resp.text, ui: "message" }];
    }

    // 후보 목록 반환 (자동 분석 금지)
    const newState = {
      ...state,
      candidates,
      lastSearchQuery:  meta.query,
      lastAreaHint:     nlu.areaSqm || null,
      region:           nlu.regionArea || nlu.sigungu || state.region,
      pendingSlot:      "candidate",
      lastQuestion:     "candidate?",
    };

    return [newState, {
      type:       RESPONSE_TYPES.CANDIDATES_LIST,
      text:       resp.text,
      candidates,
      ui:         "candidate_list",
    }];

  } catch (e) {
    console.error('[handleRecommendSearch]', e);
    return [state, responseError("추천 검색 중 오류가 발생했어요.")];
  }
}

// ─────────────────────────────────────────────
// 단지 검색 + Policy 재적용
// ─────────────────────────────────────────────
async function handleSearch(query, areaHint, state, ruleHint = 0) {
  if (!query || query.trim().length < 2) {
    return [state, {
      type: RESPONSE_TYPES.NEED_MORE_INFO,
      text: `어떤 단지를 찾으시나요?`,
      ui:   "message",
    }];
  }

  try {
    // Rule 7: 새 단지면 이전 Context 클리어
    const searchState = {
      ...state,
      currentComplex:    null,
      currentArea:       null,
      candidates:        [],
      selectedCandidate: null,
      lastSearchQuery:   query,
      lastAreaHint:      areaHint || state.lastAreaHint,
    };

    const res      = await searchComplexFromSupabase(query, state.region || "", "");
    const complexes = res.complexes || [];
    const hint     = res.areaHint || areaHint || searchState.lastAreaHint;

    // 검색 후 Policy 재적용 (Rule 1 / 2 / 4 분기)
    const postDecision = applyPostSearchPolicy(complexes, hint, searchState);
    logPolicy(postDecision, searchState);

    // ── 검색 결과 없음 ──
    if (complexes.length === 0) {
      return [searchState, responseNotFound(query)];
    }

    // ── Rule 4: 복수 후보 → 선택 (evaluateCandidates가 압도적 1위 판별) ──
    const evaluation = evaluateCandidates(complexes, hint, searchState);

    if (evaluation.strategy === "ask_candidate") {
      const ns = updateCandidates(searchState, complexes, hint);
      return [ns, responseCandidateList(evaluation.candidates, query, evaluation.reason)];
    }

    // ── 단 1건 or 압도적 1위 → 단지 확정 ──
    const ns = updateComplex(searchState, evaluation.selected, hint);

    // 단지 확정 후 항상 평형 목록 보여주기 (자동 분석 금지)

    // Rule 2: 단지만 확정, 평형 질문
    return handlePostComplex(ns, hint);

  } catch (e) {
    console.error("[ConversationEngine] 검색 오류:", e);
    return [state, responseError("검색 중 오류")];
  }
}

// ─────────────────────────────────────────────
// 단지 확정 후 처리 (Rule 1 or Rule 2)
// ─────────────────────────────────────────────
function handlePostComplex(state, areaHint) {
  const complex    = state.currentComplex;
  const areaGroups = getAreaGroups(state);

  // 면적이 이미 선택된 상태 → 바로 분석 (사용자가 이전에 선택한 경우)
  // 단, 새 단지 검색 시에는 이전 면적 무시하고 목록 다시 보여줌
  // (Rule 7: 새 단지 입력 시 currentArea 초기화됨)

  // 면적 데이터 없음
  if (areaGroups.length === 0) {
    return [state, {
      type: RESPONSE_TYPES.ERROR,
      text: `**${complex.complex_name}** 단지의 면적 데이터가 없어요.\n다른 단지를 검색해 주세요.`,
      ui:   "message",
    }];
  }

  // 항상 평형 목록 보여주기 (사용자가 직접 선택)
  // 면적 힌트 있어도 자동 선택 안 함
  return [state, responseAreaList(complex, areaGroups, areaHint)];
}
