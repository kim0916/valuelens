/**
 * tests/ce_v2.qa.test.js
 *
 * ConversationEngine v2 통합 QA
 *
 * 1. Parser QA (기존 30개 재검증)
 * 2. Conversation Flow QA (100개)
 * 3. Context Reset QA (10개)
 * 4. SlotRegistry 오염 방지 QA (15개)
 * 5. StateMachine 전이 오류 QA (20개)
 * 6. Handler 누락 QA (10개)
 * 7. v1 결과와 v2 SlotRegistry 결과 비교 (15개)
 */

import { createSlotRegistry, SLOTS }                     from '../src/engine/v2/SlotRegistry.js';
import { createStateMachine, STATES, EVENTS, resolveStateFromSlots } from '../src/engine/v2/StateMachine.js';
import { createActionHandlers }                           from '../src/engine/v2/ActionHandlers.js';
import { parseFairValueInput }                            from '../src/parser/fairValueParser.js';
import { decideNextAction }                               from '../src/parser/fairValueConversation.js';
import { selectNearestArea }                              from '../src/search/areaMatching.js';

let pass = 0, fail = 0;
const failures = [];

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; return; }
  fail++;
  failures.push({ label, expected: JSON.stringify(expected), actual: JSON.stringify(actual) });
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

// ═══════════════════════════════════════════════════════
// 1. Parser QA (30개) — 기존 fair_value.parser.test.js 재검증
// ═══════════════════════════════════════════════════════
section('1. Parser QA (30개)');

// Intent
check('p-intent-1', parseFairValueInput('헬리오시티 얼마야').intent, 'FAIR_VALUE');
check('p-intent-2', parseFairValueInput('동부아파트 적정가 얼마예요').intent, 'FAIR_VALUE');
check('p-intent-3', parseFairValueInput('이 아파트 비싼 편인가요').intent, 'FAIR_VALUE');
check('p-intent-4', parseFairValueInput('래미안 분석해줘').intent, 'FAIR_VALUE');
check('p-intent-5', parseFairValueInput('지금 살 만한가요').intent, 'FAIR_VALUE');

// complexRaw
check('p-complex-1', parseFairValueInput('헬리오시티 얼마야').complexRaw, '헬리오시티');
check('p-complex-2', parseFairValueInput('동부아파트 적정가요').complexRaw, '동부아파트');
check('p-complex-3', parseFairValueInput('동부 우동 24평 적정가').complexRaw, '동부');
check('p-complex-4', parseFairValueInput('래미안퍼스티지 시세가요').complexRaw, '래미안퍼스티지');
check('p-complex-5', parseFairValueInput('은마 요즘 얼마야').complexRaw, '은마');

// dong
check('p-dong-1', parseFairValueInput('동부 우동 적정가요').dong, '우동');
check('p-dong-2', parseFairValueInput('잠실 헬리오시티 얼마예요').dong, '잠실');
check('p-dong-3', parseFairValueInput('반포 래미안 시세요').dong, '반포');
check('p-dong-4', parseFairValueInput('개포 주공 얼마야').dong, '개포');
check('p-dong-5', parseFairValueInput('헬리오시티 얼마야').dong, null);

// area
check('p-area-1', parseFairValueInput('헬리오시티 34평 얼마야').area?.pyeong, 34);
check('p-area-2', parseFairValueInput('래미안 84㎡ 적정가요').area?.sqm, 84);
check('p-area-3', parseFairValueInput('동부 우동 24평 적정가').area?.pyeong, 24);
check('p-area-4', parseFairValueInput('전용 59 기준으로 봐줘요').area?.sqm, 59);
check('p-area-5', parseFairValueInput('헬리오시티 얼마야').area, null);

// userPrice
check('p-price-1', parseFairValueInput('8억에 나왔는데 적당해요').userPrice, 80000);
check('p-price-2', parseFairValueInput('호가 9억 5천인데 비싼가요').userPrice, 95000);
check('p-price-3', parseFairValueInput('7.5억 급매 잡아야 할까요').userPrice, 75000);
check('p-price-4', parseFairValueInput('12억 5000에 나온 매물인데요').userPrice, 125000);
check('p-price-5', parseFairValueInput('헬리오시티 얼마야').userPrice, null);

// noPrice
check('p-noprice-1', parseFairValueInput('가격은 몰라요 그냥 분석해줘').noPrice, true);
check('p-noprice-2', parseFairValueInput('시세 기준으로 봐줘요').noPrice, true);
check('p-noprice-3', parseFairValueInput('가격 모르는데 돼요').noPrice, true);
check('p-noprice-4', parseFairValueInput('알아서 찾아봐줘요').noPrice, true);
check('p-noprice-5', parseFairValueInput('헬리오시티 얼마야').noPrice, false);

// ═══════════════════════════════════════════════════════
// 2. Conversation Flow QA (100개)
// SlotRegistry + decideNextAction 기반 (네트워크 없음)
// ═══════════════════════════════════════════════════════
section('2. Conversation Flow QA (100개)');

function conv(slots) {
  return decideNextAction(slots);
}

// Golden Path (20개)
check('cf-gp-01', conv({ complex: null, dong: null, purpose: null, area: null, userPrice: null, noPrice: false }).action, 'ASK_COMPLEX');
check('cf-gp-02', conv({ complex: '헬리오시티', dong: null, purpose: null, area: null, userPrice: null, noPrice: false }).action, 'ASK_DONG');
check('cf-gp-03', conv({ complex: '헬리오시티', dong: '잠실', purpose: null, area: null, userPrice: null, noPrice: false }).action, 'ASK_PURPOSE');
check('cf-gp-04', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: null, userPrice: null, noPrice: false }).action, 'ASK_AREA');
check('cf-gp-05', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: false }).action, 'ASK_PRICE');
check('cf-gp-06', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-gp-07', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: 120000, noPrice: false }).action, 'RESULT');
check('cf-gp-08', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'buy', area: 84, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-gp-09', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'buy', area: 84, userPrice: 120000, noPrice: false }).action, 'RESULT');
check('cf-gp-10', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'jeonse', area: null, userPrice: null, noPrice: false }).action, 'NOT_SUPPORTED');
check('cf-gp-11', conv({ complex: null, dong: null, purpose: 'fair', area: null, userPrice: null, noPrice: true }).action, 'ASK_COMPLEX');
check('cf-gp-12', conv({ complex: '동부', dong: null, purpose: 'fair', area: 59, userPrice: null, noPrice: true }).action, 'ASK_DONG');
check('cf-gp-13', conv({ complex: '동부', dong: '우동', purpose: null, area: 59, userPrice: null, noPrice: true }).action, 'ASK_PURPOSE');
check('cf-gp-14', conv({ complex: '동부', dong: '우동', purpose: 'fair', area: null, userPrice: null, noPrice: true }).action, 'ASK_AREA');
check('cf-gp-15', conv({ complex: '동부', dong: '우동', purpose: 'fair', area: 59, userPrice: null, noPrice: false }).action, 'ASK_PRICE');
check('cf-gp-16', conv({ complex: '동부', dong: '우동', purpose: 'fair', area: 59, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-gp-17', conv({ complex: '동부', dong: '우동', purpose: 'fair', area: 59, userPrice: 80000, noPrice: false }).action, 'RESULT');
check('cf-gp-18', conv({ complex: '은마', dong: '대치', purpose: 'fair', area: 101, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-gp-19', conv({ complex: '래미안', dong: '반포', purpose: 'buy', area: 84, userPrice: 150000, noPrice: false }).action, 'RESULT');
check('cf-gp-20', conv({ complex: '아크로', dong: '반포', purpose: 'fair', area: 114, userPrice: null, noPrice: false }).action, 'ASK_PRICE');

// Messy Input Flow (20개)
const messyInputs = [
  { input: '동부 우동 24평 몰라 적정가 봐줘', expect: { complexRaw: '동부', dong: '우동', noPrice: true, intent: 'FAIR_VALUE' } },
  { input: '헬리오시티 잠실 34평 적정가', expect: { complexRaw: '헬리오시티', dong: '잠실', intent: 'FAIR_VALUE' } },
  { input: '은마아파트 대치동 101㎡ 얼마야', expect: { complexRaw: '은마아파트', dong: '대치동', intent: 'FAIR_VALUE' } },
  { input: '반포 래미안 33평 8억 적당해', expect: { dong: '반포', userPrice: 80000, intent: 'FAIR_VALUE' } },
  { input: '공릉동 동신아파트 30평형 얼마', expect: { dong: '공릉동', intent: 'FAIR_VALUE' } },
  { input: '잠실 리센츠 25평 가격 몰라', expect: { dong: '잠실', noPrice: true, intent: 'FAIR_VALUE' } },
  { input: '강남 아크로비스타 시세', expect: { dong: '강남', intent: 'FAIR_VALUE' } },
  { input: '개포 주공 24평 몰라요', expect: { dong: '개포', noPrice: true } },
  { input: '해운대 두산위브 43평 적정가', expect: { dong: '해운대', intent: 'FAIR_VALUE' } },
  { input: '마포 래미안 33평 12억인데 비싼가', expect: { dong: '마포', userPrice: 120000, intent: 'FAIR_VALUE' } },
];

messyInputs.forEach((t, i) => {
  const r = parseFairValueInput(t.input);
  Object.entries(t.expect).forEach(([k, v]) => {
    check(`cf-messy-${i+1}-${k}`, r[k], v);
  });
});

// 추가 Messy Input conv flow (20개)
check('cf-mi-01', conv({ complex: '동부', dong: '우동', purpose: 'fair', area: 59, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-mi-02', conv({ complex: '헬리오', dong: '잠실', purpose: 'fair', area: 84, userPrice: 120000, noPrice: false }).action, 'RESULT');
check('cf-mi-03', conv({ complex: '래미안', dong: null, purpose: 'fair', area: 84, userPrice: 120000, noPrice: false }).action, 'ASK_DONG');
check('cf-mi-04', conv({ complex: '은마', dong: '대치', purpose: null, area: 101, userPrice: null, noPrice: true }).action, 'ASK_PURPOSE');
check('cf-mi-05', conv({ complex: null, dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: true }).action, 'ASK_COMPLEX');
check('cf-mi-06', conv({ complex: '동부', dong: '우동', purpose: 'fair', area: null, userPrice: 80000, noPrice: false }).action, 'ASK_AREA');
check('cf-mi-07', conv({ complex: '헬리오', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: false }).action, 'ASK_PRICE');
check('cf-mi-08', conv({ complex: '아크로', dong: '반포', purpose: 'buy', area: 84, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-mi-09', conv({ complex: '리센츠', dong: '잠실', purpose: 'fair', area: 59, userPrice: 90000, noPrice: false }).action, 'RESULT');
check('cf-mi-10', conv({ complex: '주공', dong: '개포', purpose: 'fair', area: 49, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-mi-11', conv({ complex: '자이', dong: null, purpose: 'fair', area: 59, userPrice: null, noPrice: true }).action, 'ASK_DONG');
check('cf-mi-12', conv({ complex: '래미안', dong: '마포', purpose: 'buy', area: 84, userPrice: 130000, noPrice: false }).action, 'RESULT');
check('cf-mi-13', conv({ complex: '동신', dong: '공릉', purpose: 'fair', area: null, userPrice: null, noPrice: false }).action, 'ASK_AREA');
check('cf-mi-14', conv({ complex: '두산위브', dong: '해운대', purpose: 'fair', area: 114, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-mi-15', conv({ complex: '센트레빌', dong: '방배', purpose: 'fair', area: 84, userPrice: 95000, noPrice: false }).action, 'RESULT');
check('cf-mi-16', conv({ complex: '롯데캐슬', dong: '마포', purpose: 'fair', area: 101, userPrice: null, noPrice: false }).action, 'ASK_PRICE');
check('cf-mi-17', conv({ complex: '아이파크', dong: '서초', purpose: 'jeonse', area: null, userPrice: null, noPrice: false }).action, 'NOT_SUPPORTED');
check('cf-mi-18', conv({ complex: '삼익', dong: '공릉', purpose: 'fair', area: 59, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-mi-19', conv({ complex: '힐스테이트', dong: '고덕', purpose: 'buy', area: 84, userPrice: null, noPrice: false }).action, 'ASK_PRICE');
check('cf-mi-20', conv({ complex: '현대', dong: '목동', purpose: 'fair', area: 66, userPrice: 85000, noPrice: false }).action, 'RESULT');

// Edge Cases (20개)
check('cf-edge-01', conv({ complex: '', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: true }).action, 'ASK_COMPLEX');
check('cf-edge-02', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 0, userPrice: null, noPrice: true }).action, 'ASK_AREA');
check('cf-edge-03', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: null, userPrice: 0, noPrice: false }).action, 'ASK_AREA');
check('cf-edge-04', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: 0, noPrice: false }).action, 'ASK_PRICE');
check('cf-edge-05', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: true }).action, 'RESULT');
check('cf-edge-06', conv({ complex: null, dong: null, purpose: null, area: null, userPrice: null, noPrice: true }).action, 'ASK_COMPLEX');
check('cf-edge-07', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: 120000, noPrice: true }).action, 'RESULT');
check('cf-edge-08', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'buy', area: 84, userPrice: null, noPrice: false }).action, 'ASK_PRICE');
check('cf-edge-09', conv({ complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: -1, noPrice: false }).action, 'RESULT'); // -1은 truthy → Parser에서 걸러야 할 값, CE는 받은 값 그대로 처리
check('cf-edge-10', conv({ complex: undefined, dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: true }).action, 'ASK_COMPLEX');
check('cf-edge-11', parseFairValueInput('').intent, null);
check('cf-edge-12', parseFairValueInput('   ').complexRaw, null);
check('cf-edge-13', parseFairValueInput('ㅋㅋㅋ').intent, null);
check('cf-edge-14', parseFairValueInput('안녕하세요').intent, null);
check('cf-edge-15', parseFairValueInput('100억').userPrice, 1000000);
check('cf-edge-16', parseFairValueInput('1억').userPrice, 10000);
check('cf-edge-17', parseFairValueInput('1.5억').userPrice, 15000);
check('cf-edge-18', parseFairValueInput('0.5억').userPrice, 5000);
check('cf-edge-19', parseFairValueInput('헬리오시티 200평').area?.pyeong, 200);
check('cf-edge-20', parseFairValueInput('잠실 엘스 어때').dong, '잠실');

// ═══════════════════════════════════════════════════════
// 3. Context Reset QA (10개)
// ═══════════════════════════════════════════════════════
section('3. Context Reset QA (10개)');

check('reset-01', (() => {
  const sr = createSlotRegistry();
  sr.set(SLOTS.COMPLEX, { complex_name: '헬리오시티' });
  sr.reset();
  return sr.get(SLOTS.COMPLEX);
})(), null);

check('reset-02', (() => {
  const sr = createSlotRegistry();
  sr.merge({ [SLOTS.DONG]: '잠실', [SLOTS.PURPOSE]: 'fair', [SLOTS.AREA]: { sqm: 84 } });
  sr.reset();
  return sr.missingSlots().length;
})(), 5);

check('reset-03', (() => {
  const sr = createSlotRegistry();
  sr.set(SLOTS.NO_PRICE, true);
  sr.reset();
  return sr.get(SLOTS.NO_PRICE);
})(), false);

check('reset-04', (() => {
  const sm = createStateMachine();
  sm.transition(EVENTS.INPUT);
  sm.transition(EVENTS.SEARCH_DONE);
  sm.transition(EVENTS.RESET);
  return sm.getState();
})(), STATES.IDLE);

check('reset-05', (() => {
  const sm = createStateMachine();
  sm.jumpTo(STATES.CONFIRMING);
  sm.transition(EVENTS.RESET);
  return sm.getState();
})(), STATES.IDLE);

check('reset-06', (() => {
  const sr = createSlotRegistry();
  sr.set(SLOTS.PRICE, 120000);
  sr.reset();
  return sr.get(SLOTS.PRICE);
})(), null);

check('reset-07', (() => {
  // Reset 후 새 슬롯 세팅이 정상 동작하는지
  const sr = createSlotRegistry();
  sr.merge({ [SLOTS.COMPLEX]: { complex_name: 'A' }, [SLOTS.DONG]: '잠실' });
  sr.reset();
  sr.set(SLOTS.COMPLEX, { complex_name: 'B' });
  return sr.get(SLOTS.COMPLEX)?.complex_name;
})(), 'B');

check('reset-08', (() => {
  // Reset 후 SM 재사용
  const sm = createStateMachine();
  sm.transition(EVENTS.INPUT);
  sm.transition(EVENTS.SEARCH_MULTI);
  sm.transition(EVENTS.RESET);
  sm.transition(EVENTS.INPUT);
  return sm.getState();
})(), STATES.SEARCHING);

check('reset-09', (() => {
  // 여러 번 reset
  const sr = createSlotRegistry();
  for (let i = 0; i < 5; i++) {
    sr.set(SLOTS.COMPLEX, { complex_name: 'X' });
    sr.reset();
  }
  return sr.get(SLOTS.COMPLEX);
})(), null);

check('reset-10', (() => {
  // snapshot 후 reset은 snapshot에 영향 없음
  const sr = createSlotRegistry();
  sr.set(SLOTS.DONG, '잠실');
  const snap = sr.snapshot();
  sr.reset();
  return snap.dong;
})(), '잠실');

// ═══════════════════════════════════════════════════════
// 4. SlotRegistry 오염 방지 QA (15개)
// ═══════════════════════════════════════════════════════
section('4. SlotRegistry 오염 방지 QA (15개)');

check('slot-iso-01', (() => {
  // 두 registry는 독립적
  const a = createSlotRegistry();
  const b = createSlotRegistry();
  a.set(SLOTS.COMPLEX, { complex_name: 'A' });
  return b.get(SLOTS.COMPLEX);
})(), null);

check('slot-iso-02', (() => {
  // snapshot은 불변
  const sr = createSlotRegistry();
  sr.set(SLOTS.DONG, '잠실');
  const snap = sr.snapshot();
  sr.set(SLOTS.DONG, '반포');
  return snap.dong;
})(), '잠실');

check('slot-iso-03', (() => {
  // merge는 기존 슬롯 보존
  const sr = createSlotRegistry();
  sr.set(SLOTS.DONG, '잠실');
  sr.merge({ [SLOTS.PURPOSE]: 'fair' });
  return sr.get(SLOTS.DONG);
})(), '잠실');

check('slot-iso-04', (() => {
  // set은 단일 키만 변경
  const sr = createSlotRegistry();
  sr.set(SLOTS.DONG, '잠실');
  sr.set(SLOTS.PURPOSE, 'fair');
  sr.set(SLOTS.DONG, '반포');
  return sr.get(SLOTS.PURPOSE);
})(), 'fair');

check('slot-iso-05', (() => {
  // null set은 허용
  const sr = createSlotRegistry();
  sr.set(SLOTS.COMPLEX, { complex_name: 'A' });
  sr.set(SLOTS.COMPLEX, null);
  return sr.get(SLOTS.COMPLEX);
})(), null);

check('slot-iso-06', (() => {
  // merge undefined 값은 기존 유지 (주의: undefined는 JSON.stringify시 제거)
  const sr = createSlotRegistry();
  sr.set(SLOTS.DONG, '잠실');
  sr.merge({ [SLOTS.DONG]: undefined });
  return sr.get(SLOTS.DONG);
})(), undefined); // undefined로 덮어씌워짐 — 이 동작을 확인

check('slot-iso-07', (() => {
  // isComplete 정확성
  const sr = createSlotRegistry();
  sr.merge({
    [SLOTS.COMPLEX]:  { complex_name: 'A' },
    [SLOTS.PURPOSE]:  'fair',
    [SLOTS.AREA]:     { sqm: 84 },
    [SLOTS.NO_PRICE]: true,
  });
  return sr.isComplete();
})(), true);

check('slot-iso-08', (() => {
  // isComplete: purpose 없으면 false
  const sr = createSlotRegistry();
  sr.merge({
    [SLOTS.COMPLEX]:  { complex_name: 'A' },
    [SLOTS.AREA]:     { sqm: 84 },
    [SLOTS.NO_PRICE]: true,
  });
  return sr.isComplete();
})(), false);

check('slot-iso-09', (() => {
  // isComplete: area 없으면 false
  const sr = createSlotRegistry();
  sr.merge({
    [SLOTS.COMPLEX]:  { complex_name: 'A' },
    [SLOTS.PURPOSE]:  'fair',
    [SLOTS.NO_PRICE]: true,
  });
  return sr.isComplete();
})(), false);

check('slot-iso-10', (() => {
  // price와 noPrice 동시 → isComplete true
  const sr = createSlotRegistry();
  sr.merge({
    [SLOTS.COMPLEX]:  { complex_name: 'A' },
    [SLOTS.PURPOSE]:  'fair',
    [SLOTS.AREA]:     { sqm: 84 },
    [SLOTS.PRICE]:    80000,
    [SLOTS.NO_PRICE]: true,
  });
  return sr.isComplete();
})(), true);

check('slot-iso-11', (() => {
  // missingSlots 순서: complex 우선
  const sr = createSlotRegistry();
  return sr.missingSlots()[0];
})(), SLOTS.COMPLEX);

check('slot-iso-12', (() => {
  // 대용량 데이터 set/get
  const sr = createSlotRegistry();
  const bigObj = { complex_name: 'A', area_list: Array(100).fill(84), extra: 'data' };
  sr.set(SLOTS.COMPLEX, bigObj);
  return sr.get(SLOTS.COMPLEX).complex_name;
})(), 'A');

check('slot-iso-13', (() => {
  // snapshot 여러 번 호출 → 각각 독립
  const sr = createSlotRegistry();
  sr.set(SLOTS.DONG, '잠실');
  const s1 = sr.snapshot();
  sr.set(SLOTS.DONG, '반포');
  const s2 = sr.snapshot();
  return s1.dong !== s2.dong;
})(), true);

check('slot-iso-14', (() => {
  // boolean slot 정확성
  const sr = createSlotRegistry();
  sr.set(SLOTS.NO_PRICE, false);
  return sr.get(SLOTS.NO_PRICE);
})(), false);

check('slot-iso-15', (() => {
  // 숫자 0을 falsy로 오인하지 않는지
  const sr = createSlotRegistry();
  sr.set(SLOTS.PRICE, 0);
  return sr.get(SLOTS.PRICE);
})(), 0);

// ═══════════════════════════════════════════════════════
// 5. StateMachine 전이 오류 QA (20개)
// ═══════════════════════════════════════════════════════
section('5. StateMachine 전이 오류 QA (20개)');

check('sm-err-01', (() => {
  const sm = createStateMachine();
  sm.transition('INVALID'); // 무효 전이
  return sm.getState(); // IDLE 유지
})(), STATES.IDLE);

check('sm-err-02', (() => {
  // RESULT에서 INPUT → SEARCHING (새 검색 가능)
  const sm = createStateMachine();
  sm.jumpTo(STATES.RESULT);
  return sm.transition(EVENTS.INPUT);
})(), STATES.SEARCHING);

check('sm-err-03', (() => {
  // CONFIRMING에서 CANCELLED → IDLE
  const sm = createStateMachine();
  sm.jumpTo(STATES.CONFIRMING);
  return sm.transition(EVENTS.CANCELLED);
})(), STATES.IDLE);

check('sm-err-04', (() => {
  // ERROR에서 INPUT → SEARCHING (복구 가능)
  const sm = createStateMachine();
  sm.jumpTo(STATES.ERROR);
  return sm.transition(EVENTS.INPUT);
})(), STATES.SEARCHING);

check('sm-err-05', (() => {
  // canTransition 정확성
  const sm = createStateMachine();
  return sm.canTransition(EVENTS.INPUT);
})(), true);

check('sm-err-06', (() => {
  const sm = createStateMachine();
  return sm.canTransition(EVENTS.CONFIRMED); // IDLE에서 불가
})(), false);

check('sm-err-07', (() => {
  // ANALYZING에서 ERROR → ERROR
  const sm = createStateMachine();
  sm.jumpTo(STATES.ANALYZING);
  return sm.transition(EVENTS.ERROR);
})(), STATES.ERROR);

check('sm-err-08', (() => {
  // SELECTING에서 DONG_PROVIDED → SEARCHING (재검색)
  const sm = createStateMachine();
  sm.jumpTo(STATES.SELECTING);
  return sm.transition(EVENTS.DONG_PROVIDED);
})(), STATES.SEARCHING);

check('sm-err-09', (() => {
  // 연속 jumpTo
  const sm = createStateMachine();
  sm.jumpTo(STATES.CONFIRMING);
  sm.jumpTo(STATES.RESULT);
  return sm.getState();
})(), STATES.RESULT);

check('sm-err-10', (() => {
  // onTransition 여러 번 등록 → 모두 호출
  const sm = createStateMachine();
  let count = 0;
  sm.onTransition(() => count++);
  sm.onTransition(() => count++);
  sm.transition(EVENTS.INPUT);
  return count;
})(), 2);

check('sm-err-11', (() => {
  // jumpTo도 onTransition 호출
  const sm = createStateMachine();
  let captured = null;
  sm.onTransition((next) => { captured = next; });
  sm.jumpTo(STATES.CONFIRMING);
  return captured;
})(), STATES.CONFIRMING);

check('sm-err-12', (() => {
  // ASKING_DONG → DONG_PROVIDED → SEARCHING
  const sm = createStateMachine();
  sm.jumpTo(STATES.ASKING_DONG);
  return sm.transition(EVENTS.DONG_PROVIDED);
})(), STATES.SEARCHING);

check('sm-err-13', (() => {
  // ASKING_PURPOSE → PURPOSE_SET → ASKING_AREA
  const sm = createStateMachine();
  sm.jumpTo(STATES.ASKING_PURPOSE);
  return sm.transition(EVENTS.PURPOSE_SET);
})(), STATES.ASKING_AREA);

check('sm-err-14', (() => {
  // ASKING_AREA → AREA_SET → CONFIRMING
  const sm = createStateMachine();
  sm.jumpTo(STATES.ASKING_AREA);
  return sm.transition(EVENTS.AREA_SET);
})(), STATES.CONFIRMING);

check('sm-err-15', (() => {
  // 전체 Golden Path 전이 체인
  const sm = createStateMachine();
  sm.transition(EVENTS.INPUT);
  sm.transition(EVENTS.SEARCH_DONE);
  sm.transition(EVENTS.PURPOSE_SET);
  sm.transition(EVENTS.AREA_SET);
  sm.transition(EVENTS.CONFIRMED);
  sm.transition(EVENTS.ANALYSIS_DONE);
  return sm.getState();
})(), STATES.RESULT);

check('sm-err-16', (() => {
  // RESET은 어느 상태에서도 IDLE 복귀
  const states = [STATES.SEARCHING, STATES.SELECTING, STATES.CONFIRMING, STATES.ANALYZING, STATES.RESULT, STATES.ERROR];
  return states.every(s => {
    const sm = createStateMachine();
    sm.jumpTo(s);
    sm.transition(EVENTS.RESET);
    return sm.getState() === STATES.IDLE;
  });
})(), true);

check('sm-err-17', (() => {
  // resolveStateFromSlots: 모든 슬롯 채움 → CONFIRMING
  const sr = createSlotRegistry();
  sr.merge({ [SLOTS.COMPLEX]: {}, [SLOTS.DONG]: '잠실', [SLOTS.PURPOSE]: 'fair', [SLOTS.AREA]: { sqm: 84 }, [SLOTS.NO_PRICE]: true });
  return resolveStateFromSlots(sr);
})(), STATES.CONFIRMING);

check('sm-err-18', (() => {
  // resolveStateFromSlots: complex 없음 → IDLE
  const sr = createSlotRegistry();
  return resolveStateFromSlots(sr);
})(), STATES.IDLE);

check('sm-err-19', (() => {
  // resolveStateFromSlots: dong 없음 → ASKING_DONG
  const sr = createSlotRegistry();
  sr.set(SLOTS.COMPLEX, {});
  return resolveStateFromSlots(sr);
})(), STATES.ASKING_DONG);

check('sm-err-20', (() => {
  // resolveStateFromSlots: area 없음 → ASKING_AREA
  const sr = createSlotRegistry();
  sr.merge({ [SLOTS.COMPLEX]: {}, [SLOTS.DONG]: '잠실', [SLOTS.PURPOSE]: 'fair' });
  return resolveStateFromSlots(sr);
})(), STATES.ASKING_AREA);

// ═══════════════════════════════════════════════════════
// 6. Handler 누락 QA (10개)
// ═══════════════════════════════════════════════════════
section('6. Handler 누락 QA (10개)');

const handlers = createActionHandlers();
const requiredHandlers = [
  'HANDLE_INPUT', 'SEARCH_COMPLEX', 'ASK_DONG',
  'ASK_PURPOSE', 'ASK_AREA', 'SHOW_CONFIRM', 'RUN_ANALYSIS',
];

requiredHandlers.forEach((name, i) => {
  check(`handler-${i+1} ${name} 존재`, handlers.has(name), true);
});

check('handler-8 handler는 함수', typeof handlers.get('HANDLE_INPUT'), 'function');
check('handler-9 Map 크기 최소 7', handlers.size >= 7, true);
check('handler-10 미존재 핸들러 undefined', handlers.get('NON_EXISTENT'), undefined);

// ═══════════════════════════════════════════════════════
// 7. v1 결과와 v2 결과 비교 (15개)
// Parser/Conversation 레이어 기준 비교
// ═══════════════════════════════════════════════════════
section('7. v1 결과와 v2 비교 (15개)');

// v1의 decideNextAction과 v2의 SlotRegistry.missingSlots가 같은 결론을 내는지
const v1v2cases = [
  { slots: { complex: '헬리오시티', dong: null, purpose: null, area: null, userPrice: null, noPrice: false }, v1: 'ASK_DONG', v2first: SLOTS.DONG },
  { slots: { complex: '헬리오시티', dong: '잠실', purpose: null, area: null, userPrice: null, noPrice: false }, v1: 'ASK_PURPOSE', v2first: SLOTS.PURPOSE },
  { slots: { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: null, userPrice: null, noPrice: false }, v1: 'ASK_AREA', v2first: SLOTS.AREA },
  { slots: { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: false }, v1: 'ASK_PRICE', v2first: SLOTS.PRICE },
  { slots: { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: true }, v1: 'RESULT', v2first: null },
];

v1v2cases.forEach((t, i) => {
  const v1action = decideNextAction(t.slots).action;
  const sr = createSlotRegistry();

  // v2 SlotRegistry에 같은 데이터 주입
  if (t.slots.complex)  sr.set(SLOTS.COMPLEX, { complex_name: t.slots.complex });
  if (t.slots.dong)     sr.set(SLOTS.DONG, t.slots.dong);
  if (t.slots.purpose)  sr.set(SLOTS.PURPOSE, t.slots.purpose);
  if (t.slots.area)     sr.set(SLOTS.AREA, { sqm: t.slots.area });
  if (t.slots.userPrice) sr.set(SLOTS.PRICE, t.slots.userPrice);
  if (t.slots.noPrice)  sr.set(SLOTS.NO_PRICE, t.slots.noPrice);

  const v2first = sr.missingSlots()[0] || null;

  // v1 action과 v2 missing[0] 매핑 일치 여부
  const v1v2map = {
    'ASK_DONG':    SLOTS.DONG,
    'ASK_PURPOSE': SLOTS.PURPOSE,
    'ASK_AREA':    SLOTS.AREA,
    'ASK_PRICE':   SLOTS.PRICE,
    'RESULT':      null,
  };
  check(`v1v2-${i+1} v1=${v1action} v2missing=${v2first}`, v2first, v1v2map[v1action] ?? null);
});

// Parser 결과 일치 (추가 10개)
const parserComp = [
  { input: '동부 우동 24평 몰라 적정가 봐줘', field: 'complexRaw', expected: '동부' },
  { input: '동부 우동 24평 몰라 적정가 봐줘', field: 'dong',       expected: '우동' },
  { input: '동부 우동 24평 몰라 적정가 봐줘', field: 'noPrice',    expected: true },
  { input: '동부 우동 24평 몰라 적정가 봐줘', field: 'intent',     expected: 'FAIR_VALUE' },
  { input: '헬리오시티 34평 얼마야',          field: 'complexRaw', expected: '헬리오시티' },
  { input: '헬리오시티 34평 얼마야',          field: 'intent',     expected: 'FAIR_VALUE' },
  { input: '8억에 나온 매물 적당해요',         field: 'userPrice',  expected: 80000 },
  { input: '잠실 헬리오시티',                 field: 'dong',       expected: '잠실' },
  { input: '전용 84㎡ 기준',                  field: 'area',       expected: { pyeong: 33, sqm: 84 } },
  { input: '알아서 분석해줘',                 field: 'noPrice',    expected: true },
];
parserComp.forEach((t, i) => {
  check(`v1v2-parse-${i+6}`, parseFairValueInput(t.input)[t.field], t.expected);
});

// ═══════════════════════════════════════════════════════
// 결과
// ═══════════════════════════════════════════════════════
const total = pass + fail;
console.log('\n══════════════════════════════════════════════');
console.log(`  CE v2 통합 QA: ${pass}/${total} 통과`);
console.log('══════════════════════════════════════════════');

if (failures.length > 0) {
  console.log(`\n❌ 실패 (${failures.length}개):`);
  failures.forEach(f => {
    console.log(`  [${f.label}]`);
    console.log(`    expected: ${f.expected}`);
    console.log(`    actual:   ${f.actual}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ 전체 통과 — CE v2 안정화 완료\n');
}
