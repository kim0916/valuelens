/**
 * src/engine/v2/StateMachine.js
 *
 * 대화 상태 전이만 담당.
 * if/else 없음 — 전이 테이블로 관리.
 */

export const STATES = {
  IDLE:          'IDLE',
  SEARCHING:     'SEARCHING',
  SELECTING:     'SELECTING',    // 복수 후보 선택 대기
  ASKING_DONG:   'ASKING_DONG',
  ASKING_PURPOSE:'ASKING_PURPOSE',
  ASKING_AREA:   'ASKING_AREA',
  CONFIRMING:    'CONFIRMING',
  ANALYZING:     'ANALYZING',
  RESULT:        'RESULT',
  ERROR:         'ERROR',
};

export const EVENTS = {
  INPUT:          'INPUT',
  SEARCH_DONE:    'SEARCH_DONE',
  SEARCH_MULTI:   'SEARCH_MULTI',
  SEARCH_NONE:    'SEARCH_NONE',
  CANDIDATE_PICK: 'CANDIDATE_PICK',
  DONG_PROVIDED:  'DONG_PROVIDED',
  PURPOSE_SET:    'PURPOSE_SET',
  AREA_SET:       'AREA_SET',
  CONFIRMED:      'CONFIRMED',
  CANCELLED:      'CANCELLED',
  ANALYSIS_DONE:  'ANALYSIS_DONE',
  ERROR:          'ERROR',
  RESET:          'RESET',
};

// 전이 테이블: { [state]: { [event]: nextState } }
const TRANSITIONS = {
  [STATES.IDLE]: {
    [EVENTS.INPUT]:       STATES.SEARCHING,
    [EVENTS.RESET]:       STATES.IDLE,
  },
  [STATES.SEARCHING]: {
    [EVENTS.SEARCH_DONE]:  STATES.ASKING_PURPOSE,   // 단지 1개 확정
    [EVENTS.SEARCH_MULTI]: STATES.SELECTING,          // 복수 후보
    [EVENTS.SEARCH_NONE]:  STATES.IDLE,               // 못 찾음
    [EVENTS.ERROR]:        STATES.ERROR,
    [EVENTS.RESET]:        STATES.IDLE,
  },
  [STATES.SELECTING]: {
    [EVENTS.CANDIDATE_PICK]: STATES.ASKING_PURPOSE,
    [EVENTS.DONG_PROVIDED]:  STATES.SEARCHING,        // 지역 좁혀서 재검색
    [EVENTS.RESET]:          STATES.IDLE,
  },
  [STATES.ASKING_DONG]: {
    [EVENTS.DONG_PROVIDED]: STATES.SEARCHING,
    [EVENTS.RESET]:         STATES.IDLE,
  },
  [STATES.ASKING_PURPOSE]: {
    [EVENTS.PURPOSE_SET]: STATES.ASKING_AREA,
    [EVENTS.RESET]:       STATES.IDLE,
  },
  [STATES.ASKING_AREA]: {
    [EVENTS.AREA_SET]: STATES.CONFIRMING,
    [EVENTS.RESET]:    STATES.IDLE,
  },
  [STATES.CONFIRMING]: {
    [EVENTS.CONFIRMED]:  STATES.ANALYZING,
    [EVENTS.CANCELLED]:  STATES.IDLE,
    [EVENTS.RESET]:      STATES.IDLE,
  },
  [STATES.ANALYZING]: {
    [EVENTS.ANALYSIS_DONE]: STATES.RESULT,
    [EVENTS.ERROR]:          STATES.ERROR,
    [EVENTS.RESET]:          STATES.IDLE,
  },
  [STATES.RESULT]: {
    [EVENTS.INPUT]:  STATES.SEARCHING,   // 새 검색
    [EVENTS.RESET]:  STATES.IDLE,
  },
  [STATES.ERROR]: {
    [EVENTS.INPUT]:  STATES.SEARCHING,
    [EVENTS.RESET]:  STATES.IDLE,
  },
};

export function createStateMachine(initialState = STATES.IDLE) {
  let current = initialState;
  const listeners = [];

  return {
    getState: () => current,

    transition: (event) => {
      const next = TRANSITIONS[current]?.[event];
      if (!next) {
        console.warn(`[SM] 유효하지 않은 전이: ${current} + ${event}`);
        return current;
      }
      const prev = current;
      current = next;
      listeners.forEach(fn => fn(next, prev, event));
      return next;
    },

    canTransition: (event) => !!TRANSITIONS[current]?.[event],

    onTransition: (fn) => { listeners.push(fn); },

    // Messy Input: 여러 슬롯이 채워진 경우 직접 상태 점프
    jumpTo: (state) => {
      const prev = current;
      current = state;
      listeners.forEach(fn => fn(state, prev, 'JUMP'));
    },
  };
}

/**
 * Slot 상태를 보고 가장 적합한 StateMachine 상태 결정
 * Messy Input 처리에 사용
 */
export function resolveStateFromSlots(slots) {
  const missing = slots.missingSlots();
  if (missing.length === 0)               return STATES.CONFIRMING;
  if (missing[0] === 'complex')           return STATES.IDLE;
  if (missing[0] === 'dong')              return STATES.ASKING_DONG;
  if (missing[0] === 'purpose')           return STATES.ASKING_PURPOSE;
  if (missing[0] === 'area')              return STATES.ASKING_AREA;
  if (missing[0] === 'price')             return STATES.CONFIRMING; // noPrice면 스킵
  return STATES.IDLE;
}
