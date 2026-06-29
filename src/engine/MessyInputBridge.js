/**
 * src/engine/MessyInputBridge.js
 *
 * MessyInputResolver 결과 → ConversationEngine state 매핑
 *
 * 역할: 정보 변환만. DB 검색/runAnalysis/CE 우회 없음.
 * CE가 이미 읽는 필드에 MessyInputResolver 결과를 담아서
 * CE가 자연스럽게 price_analysis 흐름으로 진입하도록 한다.
 *
 * CE가 실제로 읽는 핵심 state 필드 (ConversationEngine.js 분석 결과):
 *   - lastComplexQuery : handleSearch(query) 호출 시 사용
 *   - lastDong         : dong→sigungu 역추적에 사용
 *   - region           : 지역 컨텍스트
 *   - lastAreaHint     : 평형 힌트 (단지 없을 때 저장)
 *   - currentComplex   : 단지 확정 여부
 *   - _resolvedPurpose : AIChatView의 pendingPurpose
 *   - _resolvedNoPrice : noPrice 플래그
 */

/**
 * MessyInputResolver merged → CE state 매핑
 * @param {object} merged - resolveMessyInput().merged
 * @param {object} currentState - 현재 convStateRef.current
 * @returns {object} mappedState - CE.process()에 전달할 state
 */
export function bridgeToState(merged, currentState) {
  return {
    ...currentState,

    // ── 단지 검색 힌트 ──
    // CE의 handleSearch(query)가 사용하는 필드
    lastComplexQuery: merged.complexQuery || currentState.lastComplexQuery || null,
    lastSearchQuery:  merged.complexQuery || currentState.lastSearchQuery  || null,

    // ── 지역 힌트 ──
    // CE의 parseUserInput → extractEntities → state.region/lastDong 활용
    lastDong: merged.dong    || currentState.lastDong || null,
    region:   merged.sigungu || merged.regionHint
              || currentState.region || null,

    // ── 면적 힌트 ──
    // CE의 handleSearch → searchState.lastAreaHint로 전달
    lastAreaHint:    merged.areaSqm     || currentState.lastAreaHint    || null,
    lastPyeongHint:  merged.inputPyeong || currentState.lastPyeongHint  || null,

    // ── 목적/가격 힌트 (AIChatView pending 필드) ──
    _resolvedPurpose: merged.purpose  || currentState._resolvedPurpose || null,
    _resolvedNoPrice: merged.noPrice  || currentState._resolvedNoPrice || false,
    _resolvedBudget:  merged.budget   || currentState._resolvedBudget  || null,

    // ── 기존 AIChatView pending 필드도 동기화 ──
    _pendingCandidateQuery: merged.complexQuery || currentState._pendingCandidateQuery || null,
    _pendingDong:           merged.dong         || currentState._pendingDong           || null,
    _pendingArea:           merged.areaSqm      || currentState._pendingArea           || null,
    _pendingInputPyeong:    merged.inputPyeong  || currentState._pendingInputPyeong    || null,
    _pendingPurpose:        merged.purpose      || currentState._pendingPurpose        || null,

    // ── CE intent override: NLU 오분류 방지 ──
    // CE process()에서 classifiedIntent가 GREETING/UNKNOWN일 때 이 값으로 대체
    resolvedIntent: merged.purpose === 'buy'      ? 'buy_analysis'
                  : merged.purpose === 'jeonse'   ? 'jeonse_info'
                  : merged.purpose === 'fair'      ? 'price_analysis'
                  : merged.purpose === 'recommend' ? 'recommendation'
                  : (currentState.resolvedIntent || null),
  };
}

/**
 * Bridge 적용 후 디버그 로그 (DEV only)
 */
export function logBridge(merged, mappedState, label = '') {
  if (typeof import.meta !== 'undefined' && !import.meta.env?.DEV) return;
  console.group(`[MessyInputBridge] ${label}`);
  console.log('MIR 추출:', {
    complexQuery: merged.complexQuery,
    dong:         merged.dong,
    areaSqm:      merged.areaSqm,
    inputPyeong:  merged.inputPyeong,
    purpose:      merged.purpose,
    noPrice:      merged.noPrice,
    budget:       merged.budget,
  });
  console.log('CE state 매핑:', {
    lastComplexQuery: mappedState.lastComplexQuery,
    lastDong:         mappedState.lastDong,
    region:           mappedState.region,
    lastAreaHint:     mappedState.lastAreaHint,
    _resolvedPurpose: mappedState._resolvedPurpose,
    _resolvedNoPrice: mappedState._resolvedNoPrice,
  });
  console.groupEnd();
}
