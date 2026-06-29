/**
 * src/parser/FairValueAdapter.js
 *
 * 역할: fairValueParser 결과 → ConversationEngine state 매핑
 *
 * Parser는 원문 추출만.
 * Adapter는 추출된 Slot을 CE가 읽는 state 필드로 변환.
 * Search/정규화는 CE/Search Layer가 담당.
 */

import { parseFairValueInput } from './fairValueParser.js';
import { decideNextAction }    from './fairValueConversation.js';

/**
 * 입력 텍스트 → Parser → CE state 매핑
 * @param {string} text
 * @param {object} currentState - convStateRef.current
 * @returns {{ slots, nextAction, mappedState }}
 */
export function adaptFairValue(text, currentState = {}) {
  const slots = parseFairValueInput(text);

  // 기존 컨텍스트와 병합 (이미 아는 정보 유지)
  const merged = {
    complex:   slots.complexRaw || currentState._fv_complex   || null,
    dong:      slots.dong       || currentState._fv_dong      || null,
    purpose:   slots.intent === 'FAIR_VALUE'
                 ? (currentState._fv_purpose || 'fair')
                 : (currentState._fv_purpose || null),
    area:      slots.area?.sqm  || currentState._fv_area      || null,
    userPrice: slots.userPrice  || currentState._fv_userPrice || null,
    noPrice:   slots.noPrice    || currentState._fv_noPrice   || false,
  };

  const nextAction = decideNextAction(merged);

  // CE state 매핑
  const mappedState = {
    ...currentState,
    // FairValue 전용 Slot 저장
    _fv_complex:    merged.complex,
    _fv_dong:       merged.dong,
    _fv_purpose:    merged.purpose,
    _fv_area:       merged.area,
    _fv_userPrice:  merged.userPrice,
    _fv_noPrice:    merged.noPrice,
    // CE 기존 필드 동기화 (검색/지역 파이프라인)
    lastComplexQuery: merged.complex   || currentState.lastComplexQuery || null,
    lastDong:         merged.dong      || currentState.lastDong         || null,
    lastAreaHint:     merged.area      || currentState.lastAreaHint     || null,
    _resolvedPurpose: merged.purpose   || currentState._resolvedPurpose || null,
    _resolvedNoPrice: merged.noPrice   || currentState._resolvedNoPrice || false,
    _pendingInputPyeong: slots.area?.pyeong || currentState._pendingInputPyeong || null,
  };

  return { slots, merged, nextAction, mappedState };
}

/**
 * FV Slot 초기화 (새 단지 검색 시작 시)
 */
export function resetFVSlots(currentState = {}) {
  return {
    ...currentState,
    _fv_complex:   null,
    _fv_dong:      null,
    _fv_purpose:   null,
    _fv_area:      null,
    _fv_userPrice: null,
    _fv_noPrice:   false,
  };
}
