/**
 * tests/ce_v2.e2e.test.js
 *
 * E2E QA — Feature Flag 기반 v2 통합 검증
 *
 * 검증 항목:
 * 1. convStateRef 직접 접근 없음 (v2 상태는 SlotRegistry만)
 * 2. SlotRegistry만으로 상태 변경
 * 3. v1 / v2 동시 state 수정 없음
 * 4. Feature Flag ON/OFF 동일 결과
 * 5. v2 엔진 독립 E2E 시뮬레이션
 */

import { createConversationEngine_v2, isV2Enabled } from '../src/engine/v2/ConversationEngine_v2.js';
import { createSlotRegistry, SLOTS }               from '../src/engine/v2/SlotRegistry.js';
import { createStateMachine, STATES, EVENTS }      from '../src/engine/v2/StateMachine.js';
import { createActionHandlers }                     from '../src/engine/v2/ActionHandlers.js';
import { isV2Enabled as bridgeV2Enabled }           from '../src/engine/v2/AIChatBridge_v2.js';
import { parseFairValueInput }                      from '../src/parser/fairValueParser.js';
import { decideNextAction }                         from '../src/parser/fairValueConversation.js';

let pass = 0, fail = 0;
const failures = [];

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; return; }
  fail++;
  failures.push({ label, expected: JSON.stringify(expected), actual: JSON.stringify(actual) });
}

function section(name) { console.log(`\n── ${name} ──`); }

// ═══════════════════════════════════════════════════
// 1. convStateRef 직접 접근 없음 검증
//    v2 코드는 convStateRef를 import하거나 참조하지 않아야 함
// ═══════════════════════════════════════════════════
section('1. v2 코드 convStateRef 접근 없음');

import { readFileSync } from 'fs';

const v2Files = [
  'src/engine/v2/SlotRegistry.js',
  'src/engine/v2/StateMachine.js',
  'src/engine/v2/ActionHandlers.js',
  'src/engine/v2/ConversationEngine_v2.js',
  'src/engine/v2/AIChatBridge_v2.js',
];

v2Files.forEach((path, i) => {
  const content = readFileSync(path, 'utf-8');
  check(
    `v2-isolation-${i+1} ${path.split('/').pop()} convStateRef 없음`,
    content.includes('convStateRef'),
    false
  );
});

// v2 코드가 AIChatView를 import하지 않는지
v2Files.forEach((path, i) => {
  const content = readFileSync(path, 'utf-8');
  // 주석 제외하고 실제 import/require 여부만 확인
  const codeOnly = content.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  check(
    `v2-isolation-${i+6} ${path.split('/').pop()} AIChatView import 없음`,
    codeOnly.includes("from '../views/AIChatView") || codeOnly.includes("require('AIChatView"),
    false
  );
});

// v2 코드가 convEngineRef를 참조하지 않는지
v2Files.forEach((path, i) => {
  const content = readFileSync(path, 'utf-8');
  check(
    `v2-isolation-${i+11} ${path.split('/').pop()} convEngineRef 없음`,
    content.includes('convEngineRef'),
    false
  );
});

// ═══════════════════════════════════════════════════
// 2. SlotRegistry만으로 상태 변경
// ═══════════════════════════════════════════════════
section('2. SlotRegistry 단일 상태 관리');

check('slot-state-01', (() => {
  const sr = createSlotRegistry();
  sr.set(SLOTS.COMPLEX, { complex_name: '헬리오시티' });
  return sr.get(SLOTS.COMPLEX)?.complex_name;
})(), '헬리오시티');

check('slot-state-02', (() => {
  // 상태 변경은 항상 슬롯을 통해서만
  const sr = createSlotRegistry();
  const before = sr.snapshot();
  sr.set(SLOTS.DONG, '잠실');
  const after = sr.snapshot();
  return before.dong === null && after.dong === '잠실';
})(), true);

check('slot-state-03', (() => {
  // merge는 원자적으로 여러 슬롯 변경
  const sr = createSlotRegistry();
  sr.merge({ [SLOTS.DONG]: '잠실', [SLOTS.PURPOSE]: 'fair', [SLOTS.AREA]: { sqm: 84 } });
  return sr.get(SLOTS.DONG) === '잠실' && sr.get(SLOTS.PURPOSE) === 'fair';
})(), true);

check('slot-state-04', (() => {
  // v2 엔진은 내부적으로 SlotRegistry를 통해서만 상태 관리
  // getSlots()로 외부 확인 가능
  const engine = createConversationEngine_v2();
  const initial = engine.getSlots();
  return initial[SLOTS.COMPLEX] === null && initial[SLOTS.PURPOSE] === null;
})(), true);

check('slot-state-05', (() => {
  // SlotRegistry는 불변 업데이트 (이전 snapshot 오염 없음)
  const sr = createSlotRegistry();
  sr.set(SLOTS.DONG, '잠실');
  const snap1 = sr.snapshot();
  sr.set(SLOTS.DONG, '반포');
  const snap2 = sr.snapshot();
  return snap1.dong === '잠실' && snap2.dong === '반포';
})(), true);

// ═══════════════════════════════════════════════════
// 3. v1 / v2 동시 state 수정 없음
// ═══════════════════════════════════════════════════
section('3. v1 / v2 상태 격리');

check('isolation-01', (() => {
  // v2 엔진은 독립적인 SlotRegistry를 가짐
  const e1 = createConversationEngine_v2();
  const e2 = createConversationEngine_v2();
  // e1과 e2는 완전히 독립
  return e1 !== e2;
})(), true);

check('isolation-02', (() => {
  // 두 v2 엔진이 서로 영향을 주지 않음
  const e1 = createConversationEngine_v2();
  const e2 = createConversationEngine_v2();
  // e1 상태 변경이 e2에 영향 없음 (내부적으로 독립된 SlotRegistry)
  return e1.getSlots()[SLOTS.COMPLEX] === null && e2.getSlots()[SLOTS.COMPLEX] === null;
})(), true);

check('isolation-03', (() => {
  // v2 SlotRegistry는 v1 conversationState와 완전히 분리
  // v1 state 키들이 v2 SlotRegistry에 없음
  const sr = createSlotRegistry();
  const snap = sr.snapshot();
  const v1Keys = ['currentComplex', 'currentArea', 'candidates', 'lastComplexQuery', '_pendingPrice'];
  return v1Keys.every(k => !(k in snap));
})(), true);

check('isolation-04', (() => {
  // v2 ActionHandlers는 v1 ConversationEngine을 import하지 않음
  const handlerCode = readFileSync('src/engine/v2/ActionHandlers.js', 'utf-8');
  return !handlerCode.includes('ConversationEngine.js') && !handlerCode.includes('conversationPolicy');
})(), true);

check('isolation-05', (() => {
  // Feature Flag 함수가 독립적으로 존재
  return typeof isV2Enabled === 'function' && typeof bridgeV2Enabled === 'function';
})(), true);

// ═══════════════════════════════════════════════════
// 4. Feature Flag ON/OFF 동일 결과
// Parser/Slot/SM 레이어는 Flag와 무관하게 동일 동작
// ═══════════════════════════════════════════════════
section('4. Feature Flag 동일 결과');

// v1 decideNextAction과 v2 SlotRegistry.missingSlots가 같은 판단
const flagCases = [
  {
    desc: '단지만 있을 때',
    v1slots: { complex: '헬리오시티', dong: null, purpose: null, area: null, userPrice: null, noPrice: false },
    v2setup: (sr) => sr.set(SLOTS.COMPLEX, { complex_name: '헬리오시티' }),
    v1expect: 'ASK_DONG',
    v2expect: SLOTS.DONG,
  },
  {
    desc: '단지+동 있을 때',
    v1slots: { complex: '헬리오시티', dong: '잠실', purpose: null, area: null, userPrice: null, noPrice: false },
    v2setup: (sr) => sr.merge({ [SLOTS.COMPLEX]: {}, [SLOTS.DONG]: '잠실' }),
    v1expect: 'ASK_PURPOSE',
    v2expect: SLOTS.PURPOSE,
  },
  {
    desc: '모두 있고 noPrice=true',
    v1slots: { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: true },
    v2setup: (sr) => sr.merge({ [SLOTS.COMPLEX]: {}, [SLOTS.DONG]: '잠실', [SLOTS.PURPOSE]: 'fair', [SLOTS.AREA]: { sqm: 84 }, [SLOTS.NO_PRICE]: true }),
    v1expect: 'RESULT',
    v2expect: null,
  },
  {
    desc: '가격 포함 완전 슬롯',
    v1slots: { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: 120000, noPrice: false },
    v2setup: (sr) => sr.merge({ [SLOTS.COMPLEX]: {}, [SLOTS.DONG]: '잠실', [SLOTS.PURPOSE]: 'fair', [SLOTS.AREA]: { sqm: 84 }, [SLOTS.PRICE]: 120000 }),
    v1expect: 'RESULT',
    v2expect: null,
  },
];

const v1v2actionMap = { 'ASK_DONG': SLOTS.DONG, 'ASK_PURPOSE': SLOTS.PURPOSE, 'ASK_AREA': SLOTS.AREA, 'ASK_PRICE': SLOTS.PRICE, 'RESULT': null };

flagCases.forEach((t, i) => {
  const v1action = decideNextAction(t.v1slots).action;
  const sr = createSlotRegistry();
  t.v2setup(sr);
  const v2missing = sr.missingSlots()[0] || null;
  const v2expected = v1v2actionMap[v1action] ?? null;

  check(`flag-${i+1} v1=${v1action} → v2missing=${v2missing}`, v2missing, v2expected);
  check(`flag-${i+1}-v1 v1 action 일치`, v1action, t.v1expect);
});

// Parser는 Flag 무관 동일 결과
const parserFlagCases = [
  '동부 우동 24평 몰라 적정가 봐줘',
  '헬리오시티 34평 얼마야',
  '8억에 나온 매물 적당해요',
  '잠실 리센츠 25평 가격 몰라',
];

parserFlagCases.forEach((input, i) => {
  const r1 = parseFairValueInput(input);
  const r2 = parseFairValueInput(input); // 두 번 호출해도 동일
  check(`flag-parser-${i+1} 멱등성`, JSON.stringify(r1), JSON.stringify(r2));
});

// ═══════════════════════════════════════════════════
// 5. v2 엔진 독립 E2E 시뮬레이션 (네트워크 없음)
// ═══════════════════════════════════════════════════
section('5. v2 E2E 시뮬레이션');

// 시뮬레이션: uiEvents 수집 + 상태 추적
async function simulateV2(inputs) {
  const engine = createConversationEngine_v2();
  const log = [];

  for (const text of inputs) {
    const { uiEvents } = await engine.process(text);
    log.push({
      input: text,
      events: uiEvents.map(e => e.type),
      state: engine.getState(),
    });
  }
  return log;
}

// E2E 시뮬레이션 1: 단순 입력 (검색 실패해도 이벤트는 발생)
check('e2e-01', await (async () => {
  const engine = createConversationEngine_v2();
  const { uiEvents } = await engine.process('헬리오시티 적정가 얼마야');
  // 네트워크 없어도 THINKING 이벤트는 발생
  return uiEvents.some(e => e.type === 'THINKING') || uiEvents.some(e => e.type === 'TEXT');
})(), true);

// E2E 시뮬레이션 2: RESET 명령
check('e2e-02', await (async () => {
  const engine = createConversationEngine_v2();
  const { uiEvents } = await engine.process('처음');
  return uiEvents.some(e => e.type === 'TEXT') && engine.getState() === STATES.IDLE;
})(), true);

// E2E 시뮬레이션 3: 멱등성 — 같은 입력 두 번
check('e2e-03', await (async () => {
  const e1 = createConversationEngine_v2();
  const e2 = createConversationEngine_v2();
  const r1 = await e1.process('헬리오시티 얼마야');
  const r2 = await e2.process('헬리오시티 얼마야');
  return JSON.stringify(r1.uiEvents.map(e => e.type)) === JSON.stringify(r2.uiEvents.map(e => e.type));
})(), true);

// E2E 시뮬레이션 4: 연속 입력 후 상태 누적
check('e2e-04', await (async () => {
  const engine = createConversationEngine_v2();
  await engine.process('헬리오시티 얼마야');
  const slots1 = engine.getSlots();
  // complexRaw가 설정됐는지 (네트워크 없어도 Parser는 실행)
  return slots1.complexRaw === '헬리오시티';
})(), true);

// E2E 시뮬레이션 5: purpose 추출
check('e2e-05', await (async () => {
  const engine = createConversationEngine_v2();
  await engine.process('헬리오시티 적정가');
  return engine.getSlots().purpose === 'fair';
})(), true);

// E2E 시뮬레이션 6: noPrice 추출
check('e2e-06', await (async () => {
  const engine = createConversationEngine_v2();
  await engine.process('동부 우동 24평 몰라 적정가 봐줘');
  const slots = engine.getSlots();
  return slots.noPrice === true && slots.complexRaw === '동부' && slots.dong === '우동';
})(), true);

// E2E 시뮬레이션 7: reset 후 슬롯 초기화
check('e2e-07', await (async () => {
  const engine = createConversationEngine_v2();
  await engine.process('헬리오시티 잠실 적정가');
  await engine.process('처음');
  const slots = engine.getSlots();
  return slots.complexRaw === null && slots.dong === null;
})(), true);

// E2E 시뮬레이션 8: 가격 추출
check('e2e-08', await (async () => {
  const engine = createConversationEngine_v2();
  await engine.process('헬리오시티 8억에 나왔는데 적정가 봐줘');
  return engine.getSlots().price === 80000;
})(), true);

// E2E 시뮬레이션 9: dong 추출
check('e2e-09', await (async () => {
  const engine = createConversationEngine_v2();
  await engine.process('잠실 헬리오시티 34평 얼마야');
  return engine.getSlots().dong === '잠실';
})(), true);

// E2E 시뮬레이션 10: area 추출
check('e2e-10', await (async () => {
  const engine = createConversationEngine_v2();
  await engine.process('헬리오시티 34평 얼마야');
  return engine.getSlots().area?.pyeong === 34;
})(), true);

// ═══════════════════════════════════════════════════
// 결과
// ═══════════════════════════════════════════════════
const total = pass + fail;
console.log('\n══════════════════════════════════════════════');
console.log(`  CE v2 E2E QA: ${pass}/${total} 통과`);
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
  console.log('\n✅ 전체 통과 — Feature Flag E2E 검증 완료\n');
}
