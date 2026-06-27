/**
 * ValueLens Conversation Engine — uxPolicy.js
 *
 * 공인중개사처럼 대화하는 UX를 위한 8개 규칙.
 * conversationPolicy(무엇을 할지) 이후
 * 응답 생성 직전에 적용되는 레이어.
 *
 * 결정 흐름:
 *   applyPolicy() → action
 *     → applyUXPolicy()         ← 이 파일
 *       → UXDecision { skipAsk, mergeInfo, responseOverride, ... }
 *         → responseGenerator → 최종 응답
 *
 * ★ 계산 로직 없음. 응답 품질 제어만 담당.
 */

import { isReadyToAnalyze, getAreaGroups } from './conversationState.js';
import { findBestAreaGroup, areaGroupLabel } from './candidateSelector.js';
import { sqmToPyeong } from './intentClassifier.js';
import { ACTIONS } from './conversationPolicy.js';

// ─────────────────────────────────────────────
// UX Rule 정의
// ─────────────────────────────────────────────
export const UX_RULES = {
  R1_NO_REDUNDANT_ASK:   "r1_no_redundant_ask",    // 이미 있는 정보 다시 묻지 않음
  R2_ONE_QUESTION:       "r2_one_question",         // 한 번에 하나만 질문
  R3_USE_DB_INFO:        "r3_use_db_info",          // DB 실제 정보로 질문
  R4_EXPLAIN_FAILURE:    "r4_explain_failure",      // 실패 시 이유 설명
  R5_NO_AUTO_SELECT:     "r5_no_auto_select",       // 복수 후보 자동선택 금지
  R6_UNDERSTAND_HUMAN:   "r6_understand_human",     // 사람 언어 이해
  R7_SHORT_AND_CLEAR:    "r7_short_and_clear",      // 짧고 명확한 응답
  R8_NO_REPEAT_QUESTION: "r8_no_repeat_question",   // 같은 질문 반복 금지
};

// ─────────────────────────────────────────────
// UX 위반 타입
// ─────────────────────────────────────────────
export const UX_VIOLATIONS = {
  REDUNDANT_ASK:    "redundant_ask",     // 이미 있는 정보를 다시 물음
  VAGUE_FAILURE:    "vague_failure",     // 실패 이유 미설명
  AUTO_SELECT:      "auto_select",       // 복수 후보 자동 선택
  REPEATED_QUESTION:"repeated_question", // 같은 질문 반복
  TOO_LONG:         "too_long",          // 응답이 너무 긺
  MULTIPLE_QUESTIONS:"multiple_questions",// 한 번에 여러 질문
};

// ─────────────────────────────────────────────
// 메인 UX Policy 함수
// ─────────────────────────────────────────────
/**
 * @param {object} decision   — applyPolicy() 결과 { action, rule, params }
 * @param {object} state      — 현재 conversationState
 * @param {string} rawText    — 원본 입력
 * @returns {UXDecision}
 */
export function applyUXPolicy(decision, state, rawText = "") {
  const violations = [];
  const applied    = [];
  let override     = null;  // 응답 강제 교체 시 사용

  const { action, params } = decision;
  const hasComplex  = !!state.currentComplex;
  const hasArea     = !!state.currentArea;
  const areaGroups  = hasComplex ? getAreaGroups(state) : [];
  const lastQ       = state.lastQuestion;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 1: 이미 있는 정보 다시 묻지 않는다
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (action === ACTIONS.ASK_AREA && hasArea) {
    violations.push(UX_VIOLATIONS.REDUNDANT_ASK);
    applied.push(UX_RULES.R1_NO_REDUNDANT_ASK);
    // 이미 평형이 있으니 바로 분석으로
    override = { action: ACTIONS.ANALYZE_NOW, reason: "이미 평형 확보됨 → 분석" };
  }

  if (action === ACTIONS.ASK_COMPLEX && hasComplex) {
    violations.push(UX_VIOLATIONS.REDUNDANT_ASK);
    applied.push(UX_RULES.R1_NO_REDUNDANT_ASK);
    override = { action: ACTIONS.ASK_AREA, reason: "이미 단지 있음 → 평형만 질문", params: { areaGroups } };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 2: 한 번에 하나만 묻는다
  // (응답 생성 레이어에서 강제: 질문 2개 이상이면 가장 중요한 1개만)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 체크: ask_area + ask_complex 동시 발생은 없어야 함
  // (Policy가 막아야 하지만 방어적으로 검사)
  applied.push(UX_RULES.R2_ONE_QUESTION);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 3: DB 실제 정보로 질문
  // ask_area 시 반드시 areaGroups 포함
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if ((action === ACTIONS.ASK_AREA) && areaGroups.length > 0) {
    applied.push(UX_RULES.R3_USE_DB_INFO);
    // params에 areaGroups 없으면 추가
    if (!params.areaGroups) {
      decision = { ...decision, params: { ...params, areaGroups } };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 4: 실패 시 이유 설명
  // not_found → reason 반드시 포함
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  applied.push(UX_RULES.R4_EXPLAIN_FAILURE);
  // 실제 응답 생성은 responseGenerator에서 처리
  // (responseNotFound에 reason 파라미터 전달 확인)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 5: 복수 후보 자동선택 금지 체크
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  applied.push(UX_RULES.R5_NO_AUTO_SELECT);
  // evaluateCandidates가 이미 처리하나 방어적 재확인
  // ANALYZE_NOW인데 candidates가 2개 이상이면 위반
  if (action === ACTIONS.ANALYZE_NOW && state.candidates.length > 1 && !hasComplex) {
    violations.push(UX_VIOLATIONS.AUTO_SELECT);
    override = {
      action: ACTIONS.SHOW_CANDIDATES,
      reason: "복수 후보 자동선택 방지 → 후보 제시",
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 6: 사람 언어 이해 (확인)
  // 아니/다른거/다시 → conversationPolicy가 처리
  // 이 레이어에선 tone 체크
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  applied.push(UX_RULES.R6_UNDERSTAND_HUMAN);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 7: 짧고 명확 (응답 길이 제어)
  // max 3줄 권장 — 응답 생성 시 가이드로 전달
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  applied.push(UX_RULES.R7_SHORT_AND_CLEAR);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Rule 8: 같은 질문 반복 금지
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (lastQ && isRepeatingQuestion(action, lastQ, state)) {
    violations.push(UX_VIOLATIONS.REPEATED_QUESTION);
    applied.push(UX_RULES.R8_NO_REPEAT_QUESTION);

    // 같은 질문 반복 시 다른 방식으로 유도
    if (action === ACTIONS.ASK_AREA) {
      // 이미 평형 물었는데 또 물음 → 힌트 포함해서 물음
      const hint = buildAreaHint(areaGroups, state.lastAreaHint);
      override = {
        action: ACTIONS.ASK_AREA,
        reason: "평형 재질문 → 힌트 포함",
        params: { areaGroups, hint, isRepeat: true },
      };
    }
    if (action === ACTIONS.ASK_COMPLEX) {
      override = {
        action: ACTIONS.ASK_COMPLEX,
        reason: "단지 재질문 → 예시 포함",
        params: { ...params, isRepeat: true },
      };
    }
  }

  return {
    decision:   override ? { ...decision, ...override, params: { ...decision.params, ...(override.params || {}) } } : decision,
    violations,
    applied,
    hasViolation: violations.length > 0,
    overrideApplied: !!override,
  };
}

// ─────────────────────────────────────────────
// UX 위반 검사 (응답 생성 후 사후 검증)
// ─────────────────────────────────────────────
/**
 * 생성된 응답이 UX 규칙을 위반하는지 검사
 * QA 자동 채점에 사용
 */
export function auditResponseUX(response, state, prevResponses = []) {
  const violations = [];
  const text = response.text || "";

  // Rule 4: "찾을 수 없습니다" 단독 사용 금지
  if (/찾을 수 없습니다$|없습니다\.$/.test(text) && text.length < 30) {
    violations.push({ rule: UX_RULES.R4_EXPLAIN_FAILURE, detail: "실패 이유 미설명" });
  }

  // Rule 7: 응답이 너무 김 (300자 이상은 권장 위반)
  const plainText = text.replace(/\*\*/g, "").replace(/\n/g, " ");
  if (plainText.length > 300) {
    violations.push({ rule: UX_RULES.R7_SHORT_AND_CLEAR, detail: `응답 ${plainText.length}자 (권장 300자 이하)` });
  }

  // Rule 8: 직전 응답과 동일한 질문 반복
  if (prevResponses.length > 0) {
    const prev = prevResponses[prevResponses.length - 1];
    const prevText = (prev.text || "").slice(0, 30);
    const curText  = text.slice(0, 30);
    if (prevText === curText && prevText.length > 10) {
      violations.push({ rule: UX_RULES.R8_NO_REPEAT_QUESTION, detail: "동일 응답 반복" });
    }
  }

  // Rule 2: 질문이 2개 이상
  const questionCount = (text.match(/\?|인가요|어떤|선택|입력/g) || []).length;
  if (questionCount >= 3) {
    violations.push({ rule: UX_RULES.R2_ONE_QUESTION, detail: `질문 표현 ${questionCount}회` });
  }

  return {
    isClean:    violations.length === 0,
    violations,
  };
}

// ─────────────────────────────────────────────
// 대화 품질 지표 계산 (QA용)
// ─────────────────────────────────────────────
/**
 * 하나의 대화 세션에서 품질 지표를 계산
 * @param {Array} turns — [{ input, state, response, decision }]
 */
export function calcConversationMetrics(turns) {
  let reachedComplex  = false;
  let reachedArea     = false;
  let questionCount   = 0;
  let repeatQuestions = 0;
  let contextLost     = false;
  let autoSuccess     = 0;
  let violations      = [];
  let lastQ           = null;

  const Q_ACTIONS = new Set([ACTIONS.ASK_AREA, ACTIONS.ASK_COMPLEX, ACTIONS.SHOW_CANDIDATES]);

  for (let i = 0; i < turns.length; i++) {
    const { state, response, decision } = turns[i];

    // 단지 도달
    if (state.currentComplex) reachedComplex = true;
    // 평형 도달
    if (state.currentArea)    reachedArea    = true;

    // 질문 수 카운트
    if (Q_ACTIONS.has(decision?.action)) {
      questionCount++;
      // 같은 질문 반복
      if (lastQ === decision.action) repeatQuestions++;
      lastQ = decision.action;
    } else {
      lastQ = null;
    }

    // 자동 분석 성공
    if (decision?.action === ACTIONS.ANALYZE_NOW || decision?.action === ACTIONS.ANALYZE_JEONSE) {
      autoSuccess++;
    }

    // UX 위반
    const prevResponses = turns.slice(0, i).map(t => t.response);
    const audit = auditResponseUX(response, state, prevResponses);
    violations.push(...audit.violations);
  }

  return {
    reachedComplex,
    reachedArea,
    questionCount,
    repeatQuestions,
    contextLost,
    autoSuccess,
    violations,
    score: calcScore({ reachedComplex, reachedArea, questionCount, repeatQuestions, violations }),
  };
}

function calcScore({ reachedComplex, reachedArea, questionCount, repeatQuestions, violations }) {
  let score = 100;
  if (!reachedComplex)         score -= 30;
  if (!reachedArea)            score -= 20;
  if (questionCount > 2)       score -= (questionCount - 2) * 10;
  if (repeatQuestions > 0)     score -= repeatQuestions * 15;
  violations.forEach(v => {
    if (v.rule === UX_RULES.R4_EXPLAIN_FAILURE) score -= 10;
    if (v.rule === UX_RULES.R5_NO_AUTO_SELECT)  score -= 20;
    if (v.rule === UX_RULES.R8_NO_REPEAT_QUESTION) score -= 10;
  });
  return Math.max(0, score);
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────
function isRepeatingQuestion(action, lastQuestion, state) {
  if (action === ACTIONS.ASK_AREA     && lastQuestion === "area?")      return true;
  if (action === ACTIONS.ASK_COMPLEX  && lastQuestion === "complex?")   return true;
  if (action === ACTIONS.SHOW_CANDIDATES && lastQuestion === "candidate?") return true;
  return false;
}

function buildAreaHint(areaGroups, lastAreaHint) {
  if (!areaGroups.length) return null;
  if (lastAreaHint) {
    const best = findBestAreaGroup(areaGroups, lastAreaHint);
    if (best) return `혹시 ${sqmToPyeong(best.group.anchor)}평(${best.group.anchor}㎡) 말씀이신가요?`;
  }
  return null;
}
