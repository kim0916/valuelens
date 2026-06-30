/**
 * src/engine/v2/AIChatBridge_v2.js
 *
 * CE v2의 uiEvents → AIChatView 메시지 포맷 변환
 *
 * AIChatView는 건드리지 않음.
 * 이 브릿지가 v1 메시지 포맷으로 변환해서 전달.
 *
 * Feature Flag ON → v2 엔진 + 이 브릿지
 * Feature Flag OFF → v1 엔진 (기존 코드)
 */

import { createConversationEngine_v2 } from './ConversationEngine_v2.js';

/**
 * uiEvent → AIChatView 호환 메시지 변환
 */
export function uiEventToMessage(event, { addMsg, replaceLastAI, runAnalysis, createConfirmMsg, typicalPyeong }) {
  switch (event.type) {

    case 'THINKING':
      replaceLastAI({ role: 'ai', type: 'thinking', content: '잠깐만요, 확인해볼게요~ 🔍' });
      return;

    case 'TEXT':
      replaceLastAI({ role: 'ai', type: 'text', content: event.content });
      return;

    case 'CANDIDATES':
      replaceLastAI({
        role: 'ai',
        type: 'candidates',
        content: event.prompt || '찾으시는 단지를 선택해 주세요.',
        data: event.data,
        onSelect: async (cx) => {
          addMsg({ role: 'user', type: 'text', content: cx.complex_name });
          addMsg({ role: 'ai',  type: 'thinking', content: '잠깐만요, 확인해볼게요~ 🔍' });
          await event.onSelect(cx);
        },
      });
      return;

    case 'ASK_DONG':
      replaceLastAI({
        role: 'ai', type: 'text',
        content: `${event.complexName}가 어느 지역에 있나요?\n동/구 이름을 입력해 주세요. 예: 우동, 잠실, 공릉동`,
      });
      return;

    case 'PURPOSE_CHIPS':
      replaceLastAI({
        role: 'ai', type: 'purpose_chips',
        content: `${event.complexName}에서 무엇을 확인할까요?`,
        choices: event.choices || ['적정가', '매수 의견'],
        onSelect: event.onSelect,
      });
      return;

    case 'AREA_CHIPS':
      replaceLastAI({
        role: 'ai', type: 'area_chips',
        content: `${event.complex?.complex_name || ''}는 어떤 평형을 확인할까요?`,
        areaGroups: event.areaOptions || [],
        complex: event.complex,
        onSelect: event.onSelect,
      });
      return;

    case 'CONFIRM':
      replaceLastAI(createConfirmMsg(
        { complex_name: event.payload.complexName, legal_dong: event.payload.dong, sigungu: event.payload.sigungu },
        event.payload.areaSqm,
        event.payload.purpose,
        event.payload.inputPyeong,
        event.payload.matchedPyeong,
        event.onConfirm,
        event.onEdit,
        event.onCancel,
      ));
      return;

    case 'RUN_ANALYSIS':
      console.log('[v2] Bridge RUN_ANALYSIS');
      runAnalysis(event.complex, {
        intent:        event.purpose === 'buy' ? 'buy' : 'fair',
        areaSqm:       event.areaSqm,
        currentPrice:  event.price || null,
        skipAreaCheck: true,
      }).then(event.onDone).catch(event.onError);
      return;

    case 'RESULT':
      // runAnalysis가 직접 결과 화면으로 이동하므로 별도 처리 없음
      return;

    case 'ERROR':
      replaceLastAI({ role: 'ai', type: 'text', content: event.message || '오류가 발생했습니다. 다시 시도해 주세요.' });
      return;

    default:
      console.warn('[v2 Bridge] 알 수 없는 uiEvent:', event.type);
  }
}

/**
 * Feature Flag 확인 (단일 소스 — 이 함수가 AIChatView가 실제로 import해서 쓰는 버전)
 * 우선순위: URL ?ce_v2= (있으면 localStorage에 기록) > localStorage('ce_v2') > VITE_CE_V2 env
 *
 * URL에 ?ce_v2=true/false가 있으면 localStorage에 기록해서 다음부터도 유지되게 한다.
 * (개발자도구 없이 브라우저 주소창만으로 QA 켜고 끄기 가능)
 */
export function isV2Enabled() {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has('ce_v2')) {
        const val = params.get('ce_v2') === 'true' ? 'true' : 'false';
        localStorage.setItem('ce_v2', val);
        return val === 'true';
      }
    }
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('ce_v2') : null;
    if (stored !== null) return stored === 'true';

    // localStorage에 값이 없으면 빌드 시점 env 기본값을 따른다.
    return import.meta.env.VITE_CE_V2 === 'true';
  } catch {
    return false;
  }
}

/**
 * v2 엔진 인스턴스 생성
 */
export function createV2Engine() {
  return createConversationEngine_v2();
}
