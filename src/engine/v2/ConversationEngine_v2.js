/**
 * src/engine/v2/ConversationEngine_v2.js
 *
 * v2 진입점.
 * SlotRegistry + StateMachine + ActionHandlers 조합.
 *
 * 기존 ConversationEngine과 동일한 인터페이스 유지:
 *   const engine = createConversationEngine_v2()
 *   const { uiEvents } = await engine.process(text)
 *
 * AIChatView에서 import 경로만 바꾸면 교체 완료.
 */

import { createSlotRegistry }   from './SlotRegistry.js';
import { createStateMachine, STATES, EVENTS, resolveStateFromSlots } from './StateMachine.js';
import { createActionHandlers }  from './ActionHandlers.js';
import { parseFairValueInput }   from '../../parser/fairValueParser.js';

export function createConversationEngine_v2() {
  const slots    = createSlotRegistry();
  const sm       = createStateMachine();
  const handlers = createActionHandlers();
  const uiQueue  = [];

  // UI 이벤트 emit 함수
  const emit = (event) => uiQueue.push(event);

  // 핸들러 컨텍스트
  const makeCtx = (text) => ({ slots, sm, emit, text });

  return {
    /**
     * 사용자 입력 처리
     * @returns { uiEvents: Array } — UI가 처리할 이벤트 목록
     */
    async process(text) {
      uiQueue.length = 0; // 큐 초기화

      const ctx = makeCtx(text);

      // RESET 감지
      if (/^(처음|리셋|reset|초기화|새로)$/i.test(text.trim())) {
        slots.reset();
        sm.transition(EVENTS.RESET);
        emit({ type: 'TEXT', content: '처음부터 다시 시작합니다. 어떤 아파트가 궁금하세요?' });
        return { uiEvents: [...uiQueue] };
      }

      // Messy Input: 여러 Slot이 한 문장에 있는 경우
      // Parser가 추출 → 상태 점프
      const parsed = parseFairValueInput(text);
      const hasIntent = parsed.intent === 'FAIR_VALUE';

      if (hasIntent) {
        // Slot 병합 먼저
        if (parsed.complexRaw) slots.set('complexRaw', parsed.complexRaw);
        if (parsed.dong)       slots.set('dong',       parsed.dong);
        if (parsed.area)       slots.set('area',       parsed.area);
        if (parsed.purpose || hasIntent) slots.set('purpose', parsed.purpose || 'fair');
        if (parsed.userPrice)  slots.set('price',   parsed.userPrice);
        if (parsed.noPrice)    slots.set('noPrice', true);

        // 상태 점프 후 처리
        const targetState = resolveStateFromSlots(slots);
        if (targetState !== STATES.IDLE) {
          sm.jumpTo(targetState);
        }
      }

      // 현재 상태에 맞는 핸들러 실행
      await handlers.get('HANDLE_INPUT')(ctx);

      return { uiEvents: [...uiQueue] };
    },

    getSlots:  () => slots.snapshot(),
    getState:  () => sm.getState(),
    reset:     () => { slots.reset(); sm.transition(EVENTS.RESET); },
  };
}

/**
 * v2 활성화 여부 (Feature Flag)
 * 환경변수 또는 localStorage로 제어
 */
export function isV2Enabled() {
  try {
    return localStorage.getItem('ce_v2') === 'true'
      || import.meta.env.VITE_CE_V2 === 'true';
  } catch {
    return false;
  }
}
