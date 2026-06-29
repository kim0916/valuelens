/**
 * fair_value.regression.test.js
 *
 * Regression QA
 * 이 두 개는 절대 깨지면 안 됩니다.
 *
 * #1 Golden Path: 동부아파트 → 우동 → 적정가 → 25평 → 몰라요 → 결과
 * #2 Messy Input: 동부 우동 24평 몰라 적정가 봐줘 → 결과
 */

import { parseFairValueInput } from '../src/parser/fairValueParser.js';
import { decideNextAction } from '../src/parser/fairValueConversation.js';

let pass = 0;
let fail = 0;
const failures = [];

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push({ label, expected, actual });
  }
}

// ─────────────────────────────────────────────
// Regression #1: Golden Path
// 동부아파트 → 우동 → 적정가 → 25평 → 몰라요 → 결과
// ─────────────────────────────────────────────

// Step 1: "동부아파트"
const r1 = parseFairValueInput('동부아파트');
check('reg1-parse-1', r1.complexRaw, '동부아파트');
check('reg1-parse-1-dong', r1.dong, null);
check('reg1-conv-1', decideNextAction({ complex: r1.complexRaw, dong: null, purpose: null, area: null, userPrice: null, noPrice: false }).action, 'ASK_DONG');

// Step 2: 사용자가 "우동" 입력
const r2 = parseFairValueInput('우동');
check('reg1-parse-2', r2.dong, '우동');
check('reg1-conv-2', decideNextAction({ complex: '동부아파트', dong: '우동', purpose: null, area: null, userPrice: null, noPrice: false }).action, 'ASK_PURPOSE');

// Step 3: 사용자가 "적정가" 입력
const r3 = parseFairValueInput('적정가');
check('reg1-parse-3', r3.intent, 'FAIR_VALUE');
check('reg1-conv-3', decideNextAction({ complex: '동부아파트', dong: '우동', purpose: 'fair', area: null, userPrice: null, noPrice: false }).action, 'ASK_AREA');

// Step 4: 사용자가 "25평" 입력
const r4 = parseFairValueInput('25평');
check('reg1-parse-4', r4.area?.pyeong, 25);
check('reg1-conv-4', decideNextAction({ complex: '동부아파트', dong: '우동', purpose: 'fair', area: 59, userPrice: null, noPrice: false }).action, 'ASK_PRICE');

// Step 5: 사용자가 "몰라요" 입력
const r5 = parseFairValueInput('몰라요');
check('reg1-parse-5', r5.noPrice, true);
check('reg1-conv-5', decideNextAction({ complex: '동부아파트', dong: '우동', purpose: 'fair', area: 59, userPrice: null, noPrice: true }).action, 'RESULT');

// ─────────────────────────────────────────────
// Regression #2: Messy Input
// "동부 우동 24평 몰라 적정가 봐줘" → 결과
// ─────────────────────────────────────────────

const r6 = parseFairValueInput('동부 우동 24평 몰라 적정가 봐줘');
check('reg2-parse-complex',   r6.complexRaw, '동부');
check('reg2-parse-dong',      r6.dong,       '우동');
check('reg2-parse-area',      r6.area?.pyeong, 24);
check('reg2-parse-noPrice',   r6.noPrice,    true);
check('reg2-parse-intent',    r6.intent,     'FAIR_VALUE');
check('reg2-parse-userPrice', r6.userPrice,  null);

check('reg2-conv', decideNextAction({
  complex:   r6.complexRaw,
  dong:      r6.dong,
  purpose:   'fair',           // intent → purpose 매핑은 CE 담당, 여기선 수동 주입
  area:      r6.area?.sqm,
  userPrice: r6.userPrice,
  noPrice:   r6.noPrice,
}).action, 'RESULT');

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log(`  Regression QA: ${pass}/${pass + fail} 통과`);
console.log('═══════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n❌ 실패 목록:');
  for (const f of failures) {
    console.log(`  [${f.label}]`);
    console.log(`    expected=${JSON.stringify(f.expected)}`);
    console.log(`    actual  =${JSON.stringify(f.actual)}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ 전체 통과 — 이 두 흐름은 절대 깨지면 안 됩니다\n');
}
