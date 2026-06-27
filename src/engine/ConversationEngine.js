/**
 * ValueLens Conversation Engine — ConversationEngine.js
 *
 * 공인중개사 AI 대화 엔진 메인 오케스트레이터.
 * 4개 엔진(State / Intent / Candidate / Response)을 연결한다.
 *
 * 사용법:
 *   const engine = createConversationEngine();
 *   const { state, response } = await engine.process("잠실 엘스 84", currentState);
 *
 * ★ 계산 로직(analyze.js) 호출은 이 파일에서 하지 않는다.
 *   분석 준비 완료(ready_to_analyze) 응답을 반환하면
 *   호출자(AIChatView)가 analyze.js를 실행한다.
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
} from './conversationState.js';

import {
  classifyIntent,
  INTENTS,
  pyeongToSqm,
} from './intentClassifier.js';

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
  responseJeonseInfo,
  responseGreeting,
  responseUnknown,
  responseError,
  RESPONSE_TYPES,
} from './responseGenerator.js';

import { searchComplexFromSupabase } from '../search/supabase.js';

// ─────────────────────────────────────────────
// 엔진 생성
// ─────────────────────────────────────────────
export function createConversationEngine() {
  return { process };
}

// ─────────────────────────────────────────────
// 메인 처리 함수
// ─────────────────────────────────────────────
/**
 * 사용자 입력을 처리하고 (새 상태, 응답)을 반환한다.
 *
 * @param {string}  input       — 사용자 입력 원문
 * @param {object}  state       — 현재 conversationState
 * @returns {{ state, response }}
 */
async function process(input, state = createConversationState()) {
  const text = (input || "").trim();
  if (!text) return { state, response: responseUnknown(state) };

  // ── 히스토리에 사용자 발화 추가 ──
  let s = addHistory(state, "user", text);

  // ── Intent 분류 ──
  const { intent, extracted } = classifyIntent(text, s);

  // ── Intent 라우팅 ──
  let response;
  [s, response] = await route(intent, extracted, text, s);

  // ── AI 응답 히스토리 추가 ──
  s = addHistory(s, "ai", response.text, intent);
  s = { ...s, lastIntent: intent };

  return { state: s, response };
}

// ─────────────────────────────────────────────
// Intent 라우터
// ─────────────────────────────────────────────
async function route(intent, extracted, rawText, state) {

  switch (intent) {

    // ── 인사 ──
    case INTENTS.GREETING:
      return [state, responseGreeting()];

    // ── 초기화 ──
    case INTENTS.RESET:
      return [resetContext(state), responseReset()];

    // ── 지역 변경 ──
    case INTENTS.CHANGE_REGION: {
      const newRegion = extracted.region || rawText.replace(/(으로|로|에서|바꿔|변경|검색).*/g, "").trim();
      const newState  = updateRegion(state, newRegion);
      return [newState, responseRegionChanged(newRegion)];
    }

    // ── 후보 선택 (번호) ──
    case INTENTS.CANDIDATE_SELECT: {
      const idx    = extracted.index ?? 0;
      const result = selectByIndex(state, idx);
      if (!result.ok) {
        const msg = result.reason === "out_of_range"
          ? `1번부터 ${result.max}번까지 선택할 수 있어요.`
          : `선택할 후보가 없어요. 단지를 다시 검색해 주세요.`;
        return [state, { type: RESPONSE_TYPES.ERROR, text: msg, ui: "message" }];
      }
      const newState  = updateComplex(state, result.complex, state.lastAreaHint);
      return handleComplexConfirmed(newState, state.lastAreaHint);
    }

    // ── 확인 (첫 번째 후보 선택 or 분석 진행) ──
    case INTENTS.CONFIRM: {
      if (state.pendingSlot === "candidate" && state.candidates.length > 0) {
        const newState = updateComplex(state, state.candidates[0], state.lastAreaHint);
        return handleComplexConfirmed(newState, state.lastAreaHint);
      }
      if (isReadyToAnalyze(state)) {
        return [state, responseReadyToAnalyze(state.currentComplex, state.currentArea)];
      }
      return [state, responseUnknown(state)];
    }

    // ── 부정 (다른 후보 or 초기화) ──
    case INTENTS.DENY: {
      if (state.candidates.length > 1) {
        // 나머지 후보 보여주기
        const remaining = state.candidates.slice(1);
        const newState  = { ...state, candidates: remaining };
        return [newState, responseCandidateList(remaining, state.lastSearchQuery || "", "deny_remaining")];
      }
      if (state.currentComplex) {
        // 단지는 있는데 부정 → 다른 단지 검색 유도
        return [resetContext(state), {
          type: RESPONSE_TYPES.NEED_MORE_INFO,
          text: `다른 단지를 알려주세요.`,
          ui:   "message",
        }];
      }
      return [state, responseUnknown(state)];
    }

    // ── 다른 후보 ──
    case INTENTS.CHANGE_CANDIDATE: {
      if (state.candidates.length > 1) {
        const remaining = state.candidates.slice(1);
        const newState  = { ...state, candidates: remaining };
        return [newState, responseCandidateList(remaining, state.lastSearchQuery || "", "next")];
      }
      return [state, {
        type: RESPONSE_TYPES.NEED_MORE_INFO,
        text: `다른 후보가 없어요. 단지명을 다시 입력해 주세요.`,
        ui:   "message",
      }];
    }

    // ── 면적 선택 ──
    case INTENTS.AREA_SELECT:
    case INTENTS.CHANGE_AREA: {
      const areaSqm = extracted.areaSqm || extractSqmFromText(rawText);
      if (!areaSqm) {
        return [state, { type: RESPONSE_TYPES.NEED_MORE_INFO, text: `몇 평인지 알려주세요.`, ui: "message" }];
      }

      // 단지가 확정된 경우 → 면적 업데이트
      if (state.currentComplex) {
        return handleAreaSelect(state, areaSqm);
      }

      // 단지가 없는 경우 → 면적 힌트로 저장하고 단지 검색 유도
      return [{ ...state, lastAreaHint: areaSqm }, {
        type: RESPONSE_TYPES.NEED_MORE_INFO,
        text: `${Math.round(areaSqm / 3.305785)}평으로 볼게요. 어떤 단지인가요?`,
        ui:   "message",
      }];
    }

    // ── 전세 정보 ──
    case INTENTS.JEONSE_INFO: {
      if (!state.currentComplex || !state.currentArea) {
        // 문장에 단지 힌트가 있으면 검색 시도
        const hint = extractComplexHint(rawText);
        if (hint) {
          const [searchState, searchResp] = await handleSearch(hint, state, 84);
          if (searchResp.type !== RESPONSE_TYPES.NOT_FOUND) {
            return [{ ...searchState, purpose: "jeonse" }, searchResp];
          }
        }
        return [updatePurpose(state, "jeonse"), responseNeedComplex("jeonse")];
      }
      return [updatePurpose(state, "jeonse"), {
        type: RESPONSE_TYPES.READY_TO_ANALYZE,
        text: `**${state.currentComplex.complex_name}** ${Math.round(state.currentArea / 3.305785)}평 전세 정보를 가져올게요...`,
        ui:   "analyzing",
        purpose: "jeonse",
      }];
    }

    // ── 최근 거래 ──
    case INTENTS.RECENT_DEALS: {
      if (!state.currentComplex || !state.currentArea) {
        return [state, responseNeedComplex("recent")];
      }
      return [state, {
        type: RESPONSE_TYPES.READY_TO_ANALYZE,
        text: `최근 거래 내역을 가져올게요...`,
        ui:   "analyzing",
        purpose: "recent_deals",
      }];
    }

    // ── 매수 의견 ──
    case INTENTS.BUY_OPINION: {
      if (!state.currentComplex || !state.currentArea) {
        return [state, responseNeedComplex("buy")];
      }
      return [updatePurpose(state, "buy"), {
        type: RESPONSE_TYPES.READY_TO_ANALYZE,
        text: `매수 판단 분석할게요...`,
        ui:   "analyzing",
        purpose: "buy",
      }];
    }

    // ── 가격 의견 / 적정가 ──
    case INTENTS.PRICE_OPINION:
    case INTENTS.PRICE_ANALYSIS: {
      if (!state.currentComplex || !state.currentArea) {
        const hint = extractComplexHint(rawText);
        if (hint) return await handleSearch(hint, state, null);
        return [state, responseNeedComplex("analysis")];
      }
      return [state, responseReadyToAnalyze(state.currentComplex, state.currentArea)];
    }

    // ── 단지 검색 (기본) ──
    case INTENTS.SEARCH_COMPLEX:
    default: {
      const areaHint = extracted.areaSqm || state.lastAreaHint || null;
      const query    = extracted.complexQuery || rawText;
      return await handleSearch(query, state, areaHint);
    }
  }
}

// ─────────────────────────────────────────────
// 단지 검색 처리
// ─────────────────────────────────────────────
async function handleSearch(query, state, areaHint) {
  if (!query || query.trim().length < 2) {
    return [state, {
      type: RESPONSE_TYPES.NEED_MORE_INFO,
      text: `어떤 단지를 찾으시나요? 단지명을 입력해 주세요.`,
      ui:   "message",
    }];
  }

  let complexes = [];
  try {
    const res  = await searchComplexFromSupabase(query, state.region || "", "");
    complexes  = res.complexes || [];
    const hint = res.areaHint || areaHint;

    const evaluation = evaluateCandidates(complexes, hint, state);
    let newState = {
      ...state,
      lastSearchQuery: query,
      lastAreaHint:    hint,
    };
    newState = updateCandidates(newState, complexes, hint);

    if (evaluation.strategy === "not_found") {
      return [newState, responseNotFound(query)];
    }

    if (evaluation.strategy === "ask_candidate") {
      return [newState, responseCandidateList(
        evaluation.candidates,
        query,
        evaluation.reason,
      )];
    }

    // 단지 자동 확정
    newState = updateComplex(newState, evaluation.selected, hint);

    if (evaluation.strategy === "ready" && evaluation.selectedArea) {
      newState = updateArea(newState, evaluation.selectedArea);
      return [newState, responseReadyToAnalyze(evaluation.selected, evaluation.selectedArea)];
    }

    // 면적 선택 필요
    return handleComplexConfirmed(newState, hint);

  } catch (e) {
    console.error("[ConversationEngine] 검색 오류:", e);
    return [state, responseError("검색 중 오류")];
  }
}

// ─────────────────────────────────────────────
// 단지 확정 후 처리
// ─────────────────────────────────────────────
function handleComplexConfirmed(state, areaHint) {
  const complex    = state.currentComplex;
  const areaGroups = getAreaGroups(state);

  // 면적이 이미 자동 선택됨
  if (state.currentArea) {
    return [state, responseReadyToAnalyze(complex, state.currentArea)];
  }

  // 면적 목록 없음 (DB 문제)
  if (areaGroups.length === 0) {
    return [state, {
      type: RESPONSE_TYPES.AREA_NOT_FOUND,
      text: `**${complex.complex_name}** 단지의 면적 데이터가 없어요.\n다른 단지를 검색해 주세요.`,
      ui:   "message",
    }];
  }

  // 면적 힌트 있으면 가장 가까운 것 자동 선택 시도
  if (areaHint) {
    const best = findBestAreaGroup(areaGroups, areaHint);
    if (best && best.diff <= 8) {
      const newState = updateArea(state, best.group.anchor);
      return [newState, responseReadyToAnalyze(complex, best.group.anchor)];
    }
  }

  // 면적 1개 → 자동
  if (areaGroups.length === 1) {
    const newState = updateArea(state, areaGroups[0].anchor);
    return [newState, responseReadyToAnalyze(complex, areaGroups[0].anchor)];
  }

  // 복수 면적 → 선택 요청
  return [state, responseAreaList(complex, areaGroups, areaHint)];
}

// ─────────────────────────────────────────────
// 면적 선택 처리
// ─────────────────────────────────────────────
function handleAreaSelect(state, areaSqm) {
  const complex    = state.currentComplex;
  const areaGroups = getAreaGroups(state);

  // 가장 가까운 그룹 찾기
  const best = findBestAreaGroup(areaGroups, areaSqm);

  if (!best || best.diff > 15) {
    // 해당 면적 없음
    return [state, responseAreaNotFound(complex, areaSqm, areaGroups)];
  }

  const newState = updateArea(state, best.group.anchor);
  return [newState, responseReadyToAnalyze(complex, best.group.anchor)];
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────
function extractSqmFromText(text) {
  const m = text.match(/(\d+)\s*(평|㎡)/);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "평" ? pyeongToSqm(n) : n;
}

function extractComplexHint(text) {
  // 전세/학군 등 키워드 제거 후 남은 텍스트
  const cleaned = text
    .replace(/전세|월세|학군|최근\s*거래|거래|적정가|시세|얼마|사도\s*돼|살\s*만해/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 2 ? cleaned : null;
}
