/**
 * src/engine/v2/ActionHandlers.js
 *
 * Map 기반 액션 핸들러.
 * if/else 없음.
 * 새 기능 추가 = handlers.set('NEW_ACTION', fn) 한 줄.
 */

import { STATES, EVENTS } from './StateMachine.js';
import { SLOTS }           from './SlotRegistry.js';
import { selectNearestArea, getAreaOptions } from '../../search/areaMatching.js';
import { searchComplexFromSupabase }          from '../../search/supabase.js';
import { parseFairValueInput }               from '../../parser/fairValueParser.js';
import { sqmToPyeong }                       from '../../utils/pyeong.js';
import { getMessageText }                    from '../../messages/getMessage.js';

/**
 * 핸들러 컨텍스트 타입:
 * {
 *   slots: SlotRegistry,
 *   sm:    StateMachine,
 *   emit:  (uiEvent) => void,   // UI에 이벤트 전달
 *   text:  string,              // 사용자 원문
 * }
 */

// ─────────────────────────────────────────────
// 공통 유틸
// ─────────────────────────────────────────────
async function searchAndResolve(ctx, query, dong) {
  const res   = await searchComplexFromSupabase(query, '', dong || '');
  const pool  = res.fromSupabase ? res.complexes : [];
  return pool;
}

/**
 * ASKING_AREA 전용 Area Resolver.
 * 단지가 이미 확정된 상태("어떤 평형을 확인할까요?" 질문 이후)에서
 * 단위 없는 순수 숫자("24", "30")만 처리한다.
 * Parser는 손대지 않음 — 평/평형/평대/평형대/㎡/m2/전용 단위가 붙은 입력은
 * 그대로 parseFairValueInput이 처리하므로 이 함수는 호출되지 않는다.
 *
 * 한국 아파트 입력 관행 기준 (ValueLens는 한국 아파트 AI):
 *   10~49 → 평, 50 이상 → ㎡
 * 이후 현재 단지의 실제 area_list에서 가장 가까운 평형을 선택한다.
 *
 * @returns {'RESOLVED'|'PASS'} PASS면 호출자가 기존 흐름(HANDLE_INPUT)을 계속 진행
 */
function resolveAreaNumberInput(ctx) {
  const { slots, sm, emit, text } = ctx;
  if (sm.getState() !== STATES.ASKING_AREA) return 'PASS';

  const trimmed = text.trim();
  if (!/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) return 'PASS'; // 단위 있는 입력은 기존 Parser 경로로

  const num = parseFloat(trimmed);
  const cx  = slots.get(SLOTS.COMPLEX);
  const areaOptions = getAreaOptions(cx?.area_list);
  if (areaOptions.length === 0) return 'PASS';

  // 한국 아파트 입력 관행: 10~49 → 평, 50 이상 → ㎡
  const inputPyeong = num >= 50 ? sqmToPyeong(num).pyeong : num;

  const matched = selectNearestArea(inputPyeong, areaOptions);
  if (!matched) return 'PASS';

  slots.set(SLOTS.AREA, {
    sqm: matched.areaSqm, pyeong: inputPyeong,
    matchedPyeong: matched.matchedPyeong, inputPyeong, boundary: matched.boundary,
  });

  let message;
  if (matched.isSame) {
    message = getMessageText('AREA_MATCHED', { matchedPyeong: matched.matchedPyeong });
  } else if (matched.boundary === 'below') {
    message = getMessageText('AREA_BELOW_MIN', { inputPyeong, matchedPyeong: matched.matchedPyeong });
  } else if (matched.boundary === 'above') {
    message = getMessageText('AREA_ABOVE_MAX', { inputPyeong, matchedPyeong: matched.matchedPyeong });
  } else {
    message = getMessageText('AREA_NEAREST', { inputPyeong, matchedPyeong: matched.matchedPyeong });
  }
  emit({ type: 'TEXT', content: message });
  sm.transition(EVENTS.AREA_SET);
  return 'RESOLVED';
}

function buildNearNote(area) {
  if (!area?.inputPyeong || !area?.matchedPyeong || area.inputPyeong === area.matchedPyeong) return '';
  if (area.boundary === 'below') {
    return ` (이 단지에는 ${area.inputPyeong}평형이 없어 가장 작은 ${area.matchedPyeong}평형으로 분석합니다.)`;
  }
  if (area.boundary === 'above') {
    return ` (이 단지에는 ${area.inputPyeong}평형이 없어 가장 큰 ${area.matchedPyeong}평형으로 분석합니다.)`;
  }
  return ` (입력하신 ${area.inputPyeong}평과 가장 가까운 ${area.matchedPyeong}평형입니다.)`;
}

function buildConfirmPayload(slots) {
  const cx      = slots.get(SLOTS.COMPLEX);
  const area    = slots.get(SLOTS.AREA);
  const purpose = slots.get(SLOTS.PURPOSE) || 'fair';
  return {
    complexName:   cx?.complex_name || slots.get(SLOTS.COMPLEX_RAW) || '',
    dong:          cx?.legal_dong   || slots.get(SLOTS.DONG) || '',
    sigungu:       cx?.sigungu      || '',
    inputPyeong:   area?.inputPyeong  || area?.pyeong || null,
    matchedPyeong: area?.matchedPyeong || area?.pyeong || null,
    areaSqm:       area?.sqm          || null,
    purpose,
    purposeKr:     purpose === 'buy' ? '매수 분석' : '적정가',
    nearNote:      buildNearNote(area),
  };
}

// ─────────────────────────────────────────────
// 핸들러 Map
// ─────────────────────────────────────────────
export function createActionHandlers() {
  const handlers = new Map();

  // ── INPUT: 사용자 입력 처리 ──
  handlers.set('HANDLE_INPUT', async (ctx) => {
    // ASKING_AREA 상태에서 단위 없는 순수 숫자 입력 처리 (Area Resolver)
    // Parser보다 먼저 체크 — 단위 있는 입력은 'PASS'로 기존 흐름 유지
    if (resolveAreaNumberInput(ctx) === 'RESOLVED') {
      await handlers.get('SHOW_CONFIRM')(ctx);
      return;
    }

    const { slots, sm, emit, text } = ctx;

    // 1. Parser로 Slot 추출
    const parsed = parseFairValueInput(text);

    // 2. 추출된 Slot 병합
    if (parsed.complexRaw) slots.set(SLOTS.COMPLEX_RAW, parsed.complexRaw);
    if (parsed.dong)       slots.set(SLOTS.DONG,        parsed.dong);
    if (parsed.area)       slots.set(SLOTS.AREA,        parsed.area);
    if (parsed.purpose || parsed.intent === 'FAIR_VALUE') {
      slots.set(SLOTS.PURPOSE, parsed.purpose || 'fair');
    }
    if (parsed.userPrice)  slots.set(SLOTS.PRICE,    parsed.userPrice);
    if (parsed.noPrice)    slots.set(SLOTS.NO_PRICE, true);


    // 3. 부족한 Slot 확인 → 적절한 액션 실행
    const missing = slots.missingSlots();
    const nextAction = missing[0];

    if (!nextAction) {
      // 모두 채워짐 → confirm으로
      await handlers.get('SHOW_CONFIRM')(ctx);
      return;
    }

    // complex 없으면 검색 필요
    if (!slots.get(SLOTS.COMPLEX) && slots.get(SLOTS.COMPLEX_RAW)) {
      await handlers.get('SEARCH_COMPLEX')(ctx);
      return;
    }

    // 각 missing slot별 질문
    const askHandlers = {
      complex: 'ASK_COMPLEX',  // 단지명조차 없는 경우 (예: "25평 적정가")
      dong:    'ASK_DONG',
      purpose: 'ASK_PURPOSE',
      area:    'ASK_AREA',
      price:   'SHOW_CONFIRM',  // 가격은 confirm 카드에서 처리
    };
    const handler = askHandlers[nextAction];
    if (handler && handlers.has(handler)) {
      await handlers.get(handler)(ctx);
    } else {
      console.warn('[v2 HANDLE_INPUT] ⚠️ 처리할 핸들러 없음! nextAction:', nextAction, '— 아무 응답도 안 나갑니다');
    }
  });

  // ── ASK_COMPLEX: 단지명이 전혀 없는 입력(예: "25평 적정가") 처리 ──
  handlers.set('ASK_COMPLEX', async (ctx) => {
    const { emit } = ctx;
    emit({ type: 'TEXT', content: getMessageText('COMPLEX_REQUIRED_DETAILED') });
  });

  // ── SEARCH_COMPLEX ──
  handlers.set('SEARCH_COMPLEX', async (ctx) => {
    const { slots, sm, emit } = ctx;
    const query = slots.get(SLOTS.COMPLEX_RAW) || '';
    const dong  = slots.get(SLOTS.DONG) || '';

    emit({ type: 'THINKING' });
    sm.transition(EVENTS.INPUT);

    const pool = await searchAndResolve(ctx, query, dong);

    if (pool.length === 0) {
      sm.transition(EVENTS.SEARCH_NONE);
      emit({ type: 'TEXT', content: getMessageText('COMPLEX_NOT_FOUND', { query }) });
      return;
    }

    if (pool.length === 1) {
      slots.set(SLOTS.COMPLEX, pool[0]);
      sm.transition(EVENTS.SEARCH_DONE);
      await handlers.get('HANDLE_INPUT')(ctx); // 다음 missing slot 처리
      return;
    }

    // 복수 후보
    sm.transition(EVENTS.SEARCH_MULTI);
    emit({
      type: 'CANDIDATES',
      data: pool,
      prompt: `${query} 후보입니다. 찾으시는 단지를 선택해 주세요.`,
      onSelect: async (cx) => {
        slots.set(SLOTS.COMPLEX, cx);
        sm.transition(EVENTS.CANDIDATE_PICK);
        await handlers.get('HANDLE_INPUT')(ctx);
      },
    });

    // 복수 지역이면 지역 질문도 추가
    const regions = [...new Set(pool.map(c => c.sigungu).filter(Boolean))];
    if (regions.length > 1) {
      emit({
        type: 'TEXT',
        content: getMessageText('DONG_REQUIRED', { query }),
      });
    }
  });

  // ── ASK_DONG ──
  handlers.set('ASK_DONG', async (ctx) => {
    const { slots, sm, emit } = ctx;
    const name = slots.get(SLOTS.COMPLEX_RAW) || '단지';
    sm.jumpTo(STATES.ASKING_DONG);
    emit({ type: 'ASK_DONG', complexName: name });
  });

  // ── ASK_PURPOSE ──
  handlers.set('ASK_PURPOSE', async (ctx) => {
    const { slots, sm, emit } = ctx;
    const cx = slots.get(SLOTS.COMPLEX);
    sm.jumpTo(STATES.ASKING_PURPOSE);
    emit({
      type: 'PURPOSE_CHIPS',
      complexName: cx?.complex_name || '',
      choices: ['적정가', '매수 의견'],
      onSelect: async (choice) => {
        const purpose = choice === '매수 의견' ? 'buy' : 'fair';
        slots.set(SLOTS.PURPOSE, purpose);
        sm.transition(EVENTS.PURPOSE_SET);
        await handlers.get('HANDLE_INPUT')(ctx);
      },
    });
  });

  // ── ASK_AREA ──
  handlers.set('ASK_AREA', async (ctx) => {
    const { slots, sm, emit } = ctx;
    const cx = slots.get(SLOTS.COMPLEX);
    const areaListRaw = cx?.area_list;
    const areaOptions = areaListRaw ? getAreaOptions(areaListRaw) : [];

    sm.jumpTo(STATES.ASKING_AREA);
    emit({
      type: 'AREA_CHIPS',
      complex: cx,
      areaOptions,
      onSelect: async (selectedSqm) => {
        const { sqmToPyeong } = await import('../../constants/areaMapping.js');
        const pyeong = sqmToPyeong(selectedSqm).pyeong;
        slots.set(SLOTS.AREA, { sqm: selectedSqm, pyeong, matchedPyeong: pyeong, inputPyeong: pyeong });
        sm.transition(EVENTS.AREA_SET);
        await handlers.get('SHOW_CONFIRM')(ctx);
      },
    });
  });

  // ── SHOW_CONFIRM ──
  handlers.set('SHOW_CONFIRM', async (ctx) => {
    const { slots, sm, emit } = ctx;

    // area hint 있으면 nearest 매핑
    const cx      = slots.get(SLOTS.COMPLEX);
    const area    = slots.get(SLOTS.AREA);
    if (cx && area && !area.matchedPyeong) {
      const areaOptions = getAreaOptions(cx.area_list);
      if (areaOptions.length > 0) {
        const matched = selectNearestArea(area.inputPyeong || area.pyeong, areaOptions);
        if (matched) {
          slots.set(SLOTS.AREA, {
            ...area,
            sqm:          matched.areaSqm,
            matchedPyeong: matched.matchedPyeong,
            boundary:      matched.boundary,
          });
        }
      }
    }

    sm.jumpTo(STATES.CONFIRMING);
    emit({
      type: 'CONFIRM',
      payload: buildConfirmPayload(slots),
      onConfirm: async () => {
        sm.transition(EVENTS.CONFIRMED);
        await handlers.get('RUN_ANALYSIS')(ctx);
      },
      onEdit: () => {
        sm.transition(EVENTS.CANCELLED);
        emit({ type: 'TEXT', content: getMessageText('EDIT_REQUEST') });
      },
      onCancel: () => {
        sm.transition(EVENTS.CANCELLED);
        slots.reset();
        emit({ type: 'TEXT', content: getMessageText('CANCELLED_FRESH_START') });
      },
    });
  });

  // ── RUN_ANALYSIS ──
  handlers.set('RUN_ANALYSIS', async (ctx) => {
    const { slots, sm, emit } = ctx;
    sm.jumpTo(STATES.ANALYZING);
    emit({ type: 'THINKING' });

    const cx      = slots.get(SLOTS.COMPLEX);
    const area    = slots.get(SLOTS.AREA);
    const purpose = slots.get(SLOTS.PURPOSE) || 'fair';
    const price   = slots.get(SLOTS.PRICE)   || null;

    emit({
      type: 'RUN_ANALYSIS',
      complex:  cx,
      areaSqm:  area?.sqm || area?.matchedPyeong,
      purpose,
      price,
      onDone: (result) => {
        sm.transition(EVENTS.ANALYSIS_DONE);
        emit({ type: 'RESULT', result });
      },
      onError: (err) => {
        sm.transition(EVENTS.ERROR);
        emit({ type: 'ERROR', message: err.message });
      },
    });
  });

  return handlers;
}
