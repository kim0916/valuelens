/**
 * ValueLens NLU — parseUserInput.js
 *
 * NLU 메인 파이프라인.
 * 사용자 입력 → 표준 NLU 결과 구조 변환.
 *
 * 처리 순서:
 *   1. normalizeText         (정규화)
 *   2. extractEntities       (엔티티 추출)
 *   3. classifyUserIntent    (Intent 분류)
 *   4. shouldSearch          (검색 전 검증)
 *   5. updateConversationMemory (Context 업데이트)
 *
 * ★ 계산 로직 없음. 파이프라인 조율만.
 * ★ UI 변경 없음. 검색 API 구조 유지.
 */

import { normalizeText } from './normalizeRealEstateTerms.js';
import { extractEntities } from './extractEntities.js';
import { classifyUserIntent, NLU_INTENTS } from './classifyUserIntent.js';
import { updateConversationMemory, shouldSearch, CONTEXT_ACTIONS } from './updateConversationMemory.js';
import { sqmToPyeong } from '../../utils/pyeong.js';

// ─────────────────────────────────────────────
// NLU 결과 구조체 정의
// ─────────────────────────────────────────────
/**
 * @typedef {Object} NLUResult
 * @property {string}  intent        — 분류된 Intent
 * @property {number}  confidence    — 분류 신뢰도 (0~1)
 * @property {string}  contextAction — Context에 취할 행동
 *
 * @property {string|null}  region       — 추출된 지역 (약칭/생활권)
 * @property {string|null}  sigungu      — 시군구
 * @property {string|null}  dong         — 동
 * @property {string|null}  complexName  — 확정 단지명
 * @property {string|null}  complexQuery — 검색 쿼리 (확정 안 된 경우 포함)
 * @property {string|null}  brand        — 브랜드명
 * @property {number|null}  areaSqm      — 전용㎡
 * @property {string|null}  areaType     — exact | range | relative | approx
 * @property {object|null}  areaRange    — { min, max } ㎡
 * @property {string|null}  areaDir      — larger | smaller
 * @property {object|null}  budget       — { min, max, exact, raw }
 * @property {string|null}  purpose      — live | invest | buy | sell | jeonse
 * @property {string|null}  family       — children | single | elderly | ...
 * @property {string|null}  commute      — 출퇴근 목적지
 * @property {string[]|null} preference  — ['school', 'quiet', 'transit', ...]
 *
 * @property {boolean} shouldSearch    — 검색 API 호출 필요 여부
 * @property {string|null} searchQuery — 검색 쿼리 문자열
 * @property {string}  searchSigungu  — 검색 시 sigungu 힌트
 * @property {object}  updatedState   — 업데이트된 conversationState
 * @property {string}  _normalized    — 정규화된 입력 텍스트
 * @property {number}  _ts            — 처리 timestamp
 */

// ─────────────────────────────────────────────
// 메인 파이프라인
// ─────────────────────────────────────────────
/**
 * @param {string} rawInput  — 사용자 원본 입력
 * @param {object} state     — 현재 conversationState
 * @returns {NLUResult}
 */
export function parseUserInput(rawInput, state = {}) {
  const ts   = Date.now();
  const raw  = (rawInput || "").trim();

  // ── Step 1: 텍스트 정규화 ──
  const normalized = normalizeText(raw);

  // ── Step 2: 엔티티 추출 ──
  const entities = extractEntities(normalized, state);
  entities._rawText = raw; // 검증용 원본 보존

  // ── Step 3: Intent 분류 ──
  const { intent, confidence } = classifyUserIntent(normalized, entities, state);

  // ── Step 4: 검색 전 검증 ──
  const needSearch = shouldSearch(intent, entities, state);

  // ── Step 5: Context 업데이트 ──
  const memory = updateConversationMemory(intent, entities, state);

  // ── 결과 조립 ──
  const result = {
    // 핵심
    intent,
    confidence,
    contextAction:  memory.contextAction,

    // 지역
    region:       entities.regionArea,
    sigungu:      entities.sigungu,
    dong:         entities.dong,

    // 단지
    complexName:  entities.complexName,
    complexQuery: memory.searchQuery || entities.complexQuery,
    brand:        entities.brand,

    // 면적
    areaSqm:      entities.areaSqm,
    areaType:     entities.areaType,
    areaRange:    entities.areaRange,
    areaDir:      entities.areaDir,
    areaSubType:  entities.areaSubType,

    // 예산/목적
    budget:       entities.budget,
    purpose:      entities.purpose,
    family:       entities.family,
    commute:      entities.commute,
    preference:   entities.preference,

    // 검색 파라미터
    shouldSearch: needSearch,
    searchQuery:   memory.searchQuery,
    searchSigungu: memory.searchSigungu || entities.sigungu || entities.regionArea || state.region || "",
    areaHint:      memory.areaHint,

    // 상태
    updatedState:  memory.updatedState,
    selectedIndex: memory.selectedIndex,

    // 메타
    _normalized:   normalized,
    _raw:          raw,
    _ts:           ts,
  };

  // 개발 환경 로그
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    console.log(`[NLU] "${raw}" → intent=${intent}(${(confidence*100).toFixed(0)}%) action=${memory.contextAction} search=${needSearch}`);
  }

  return result;
}

// ─────────────────────────────────────────────
// 기존 intentClassifier 브릿지
// ConversationEngine이 기존 classifyIntent를 사용하는 부분을
// parseUserInput으로 교체 시 사용
// ─────────────────────────────────────────────
/**
 * 기존 intentClassifier.js의 classifyIntent와 호환되는 래퍼.
 * ConversationEngine → NLU 전환 시 호출부 최소 수정.
 */
export function parseAsLegacyIntent(rawInput, state = {}) {
  const nlu = parseUserInput(rawInput, state);

  // 기존 extracted 형식으로 변환
  const extracted = {
    areaSqm:       nlu.areaSqm,
    pyeong:        nlu.areaSqm ? sqmToPyeong(nlu.areaSqm).pyeong : null,
    region:        nlu.region || nlu.sigungu,
    index:         nlu.selectedIndex,
    complexQuery:  nlu.complexQuery,
    query:         nlu.complexQuery || rawInput,
    budget:        nlu.budget,
    purpose:       nlu.purpose,
    family:        nlu.family,
    // NLU 확장 필드
    _nlu:          nlu,
  };

  return {
    intent:     nlu.intent,
    confidence: nlu.confidence,
    extracted,
  };
}

// ─────────────────────────────────────────────
// 테스트 유틸
// ─────────────────────────────────────────────
export { NLU_INTENTS, CONTEXT_ACTIONS };
