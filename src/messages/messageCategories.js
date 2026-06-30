/**
 * src/messages/messageCategories.js
 *
 * ValueLens 플랫폼 공통 Message Category.
 * Fair/Buy/Sell/추천/계약분석 어디서든 동일한 카테고리 집합을 사용한다.
 */

export const MessageCategory = Object.freeze({
  ERROR:       'ERROR',        // 시스템/데이터 문제로 요청을 처리하지 못함 (사용자 잘못 아님)
  WARNING:     'WARNING',      // 요청대로 처리하긴 했지만 사용자가 알아야 할 단서가 붙음 (예: 가장 가까운 값으로 대체)
  CONFIRM:     'CONFIRM',      // 사용자 입력을 해석한 결과를 보여주고 승인을 구함
  SUCCESS:     'SUCCESS',      // 요청한 작업이 정상적으로 끝남
  GUIDE:       'GUIDE',        // 다음에 뭘 입력하면 되는지 안내 (질문형)
  EMPTY:       'EMPTY',        // 데이터/후보가 0건 — 오류는 아니고 "없는 게 맞는 상태"
  FOLLOWUP:    'FOLLOWUP',     // 결과 화면 등에서 다음 행동을 유도하는 보조 발화
  UNSUPPORTED: 'UNSUPPORTED',  // 기능 자체가 아직 없음 (ERROR와 달리 사용자 잘못이 아님)
});

/**
 * 한 화면에서 여러 메시지가 동시에 발생할 수 있는 경우의 우선순위.
 * 숫자가 작을수록 우선순위가 높다 (먼저 노출/먼저 처리).
 * 의미 없는 중복 메시지가 동시에 뜨는 것을 막기 위한 기준선.
 */
export const MESSAGE_PRIORITY_ORDER = [
  MessageCategory.ERROR,
  MessageCategory.WARNING,
  MessageCategory.CONFIRM,
  MessageCategory.SUCCESS,
  MessageCategory.GUIDE,
  MessageCategory.FOLLOWUP,
  MessageCategory.EMPTY,
  MessageCategory.UNSUPPORTED,
];

export function compareMessagePriority(categoryA, categoryB) {
  const a = MESSAGE_PRIORITY_ORDER.indexOf(categoryA);
  const b = MESSAGE_PRIORITY_ORDER.indexOf(categoryB);
  return (a === -1 ? Infinity : a) - (b === -1 ? Infinity : b);
}

/**
 * 메시지 후보 배열에서 우선순위가 가장 높은 것 하나만 고른다.
 * 동시에 여러 situation이 트리거된 화면에서 "의미 없는 중복 노출"을 막을 때 사용.
 */
export function pickHighestPriorityMessage(messages) {
  if (!messages || messages.length === 0) return null;
  return [...messages].sort((m1, m2) => compareMessagePriority(m1.category, m2.category))[0];
}
