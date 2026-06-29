/**
 * tests/ce_v2.unit.test.js
 * CE v2 단위 테스트 — StateMachine + SlotRegistry
 */

import { createSlotRegistry, SLOTS } from '../src/engine/v2/SlotRegistry.js';
import { createStateMachine, STATES, EVENTS } from '../src/engine/v2/StateMachine.js';

let pass = 0, fail = 0;
const failures = [];

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else { fail++; failures.push({ label, expected, actual }); }
}

// ─────────────────────────────────────────────
// SlotRegistry 테스트 (10개)
// ─────────────────────────────────────────────
const sr = createSlotRegistry();

check('slot-1 초기값 null', sr.get(SLOTS.COMPLEX), null);
check('slot-2 set/get', (() => { sr.set(SLOTS.COMPLEX, { complex_name: '헬리오시티' }); return sr.get(SLOTS.COMPLEX)?.complex_name; })(), '헬리오시티');
check('slot-3 merge', (() => { sr.merge({ dong: '잠실', purpose: 'fair' }); return sr.get('dong'); })(), '잠실');
check('slot-4 missing - complex없음', (() => createSlotRegistry().missingSlots()[0])(), SLOTS.COMPLEX);
check('slot-5 missing - dong없음', (() => {
  const s = createSlotRegistry();
  s.set(SLOTS.COMPLEX, { complex_name: 'A' });
  return s.missingSlots()[0];
})(), SLOTS.DONG);
check('slot-6 missing - purpose없음', (() => {
  const s = createSlotRegistry();
  s.merge({ [SLOTS.COMPLEX]: {}, [SLOTS.DONG]: '잠실' });
  return s.missingSlots()[0];
})(), SLOTS.PURPOSE);
check('slot-7 missing - area없음', (() => {
  const s = createSlotRegistry();
  s.merge({ [SLOTS.COMPLEX]: {}, [SLOTS.DONG]: '잠실', [SLOTS.PURPOSE]: 'fair' });
  return s.missingSlots()[0];
})(), SLOTS.AREA);
check('slot-8 missing - price없음', (() => {
  const s = createSlotRegistry();
  s.merge({ [SLOTS.COMPLEX]: {}, [SLOTS.DONG]: '잠실', [SLOTS.PURPOSE]: 'fair', [SLOTS.AREA]: { sqm: 84 } });
  return s.missingSlots()[0];
})(), SLOTS.PRICE);
check('slot-9 noPrice면 price 불필요', (() => {
  const s = createSlotRegistry();
  s.merge({ [SLOTS.COMPLEX]: {}, [SLOTS.DONG]: '잠실', [SLOTS.PURPOSE]: 'fair', [SLOTS.AREA]: { sqm: 84 }, [SLOTS.NO_PRICE]: true });
  return s.missingSlots().length;
})(), 0);
check('slot-10 reset', (() => { sr.reset(); return sr.get(SLOTS.COMPLEX); })(), null);

// ─────────────────────────────────────────────
// StateMachine 테스트 (10개)
// ─────────────────────────────────────────────
const sm = createStateMachine();

check('sm-1 초기 IDLE', sm.getState(), STATES.IDLE);
check('sm-2 INPUT → SEARCHING', (() => sm.transition(EVENTS.INPUT))(), STATES.SEARCHING);
check('sm-3 SEARCH_DONE → ASKING_PURPOSE', (() => sm.transition(EVENTS.SEARCH_DONE))(), STATES.ASKING_PURPOSE);
check('sm-4 PURPOSE_SET → ASKING_AREA', (() => sm.transition(EVENTS.PURPOSE_SET))(), STATES.ASKING_AREA);
check('sm-5 AREA_SET → CONFIRMING', (() => sm.transition(EVENTS.AREA_SET))(), STATES.CONFIRMING);
check('sm-6 CONFIRMED → ANALYZING', (() => sm.transition(EVENTS.CONFIRMED))(), STATES.ANALYZING);
check('sm-7 ANALYSIS_DONE → RESULT', (() => sm.transition(EVENTS.ANALYSIS_DONE))(), STATES.RESULT);
check('sm-8 RESULT + INPUT → SEARCHING', (() => sm.transition(EVENTS.INPUT))(), STATES.SEARCHING);
check('sm-9 잘못된 전이 무시', (() => { sm.transition('INVALID_EVENT'); return sm.getState(); })(), STATES.SEARCHING);
check('sm-10 RESET → IDLE', (() => sm.transition(EVENTS.RESET))(), STATES.IDLE);

// ─────────────────────────────────────────────
// StateMachine 병행 경로 (5개)
// ─────────────────────────────────────────────
check('sm-11 SEARCH_MULTI → SELECTING', (() => {
  const s = createStateMachine();
  s.transition(EVENTS.INPUT);
  return s.transition(EVENTS.SEARCH_MULTI);
})(), STATES.SELECTING);

check('sm-12 SELECTING + CANDIDATE_PICK → ASKING_PURPOSE', (() => {
  const s = createStateMachine();
  s.transition(EVENTS.INPUT);
  s.transition(EVENTS.SEARCH_MULTI);
  return s.transition(EVENTS.CANDIDATE_PICK);
})(), STATES.ASKING_PURPOSE);

check('sm-13 jumpTo CONFIRMING', (() => {
  const s = createStateMachine();
  s.jumpTo(STATES.CONFIRMING);
  return s.getState();
})(), STATES.CONFIRMING);

check('sm-14 CANCELLED → IDLE', (() => {
  const s = createStateMachine();
  s.jumpTo(STATES.CONFIRMING);
  return s.transition(EVENTS.CANCELLED);
})(), STATES.IDLE);

check('sm-15 onTransition 콜백', (() => {
  const s = createStateMachine();
  let captured = null;
  s.onTransition((next) => { captured = next; });
  s.transition(EVENTS.INPUT);
  return captured;
})(), STATES.SEARCHING);

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log(`  CE v2 Unit QA: ${pass}/${pass + fail} 통과`);
console.log('═══════════════════════════════════════');
if (failures.length > 0) {
  console.log('\n❌ 실패:');
  failures.forEach(f => {
    console.log(`  [${f.label}] expected=${JSON.stringify(f.expected)} actual=${JSON.stringify(f.actual)}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ 전체 통과\n');
}
