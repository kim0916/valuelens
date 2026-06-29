/**
 * fair_value.conversation.test.js
 *
 * Conversation QA (20개)
 * 목표: 추출된 Slot으로 올바른 다음 행동을 하는지 검증
 *
 * Parser QA와 독립적으로 실행.
 * Parser 통과 ≠ Conversation 통과.
 *
 * Golden Path:  단지 → 동 → 목적 → 평형 → 가격 → 결과
 * Messy Input:  채워진 Slot은 질문 생략
 */

import { decideNextAction } from '../src/parser/fairValueConversation.js';

let pass = 0;
let fail = 0;
const failures = [];

function check(label, slots, expectedAction) {
  const result = decideNextAction(slots);
  const ok = result.action === expectedAction;
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push({ label, slots, expectedAction, actual: result.action, reason: result.reason });
  }
}

// ─────────────────────────────────────────────
// Golden Path (10개)
// 단계별 하나씩 채워가며 질문 순서 검증
// ─────────────────────────────────────────────

// 아무것도 없음 → 단지 질문
check('gp-1',
  { complex: null, dong: null, purpose: null, area: null, userPrice: null, noPrice: false },
  'ASK_COMPLEX'
);

// 단지만 → 동 질문
check('gp-2',
  { complex: '헬리오시티', dong: null, purpose: null, area: null, userPrice: null, noPrice: false },
  'ASK_DONG'
);

// 단지+동 → 목적 질문
check('gp-3',
  { complex: '헬리오시티', dong: '잠실', purpose: null, area: null, userPrice: null, noPrice: false },
  'ASK_PURPOSE'
);

// 단지+동+목적 → 평형 질문
check('gp-4',
  { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: null, userPrice: null, noPrice: false },
  'ASK_AREA'
);

// 단지+동+목적+평형, 가격 모름 미표시 → 가격 질문
check('gp-5',
  { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: false },
  'ASK_PRICE'
);

// 단지+동+목적+평형+noPrice → 결과 (가격 질문 생략)
check('gp-6',
  { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: null, noPrice: true },
  'RESULT'
);

// 단지+동+목적+평형+가격 → 결과
check('gp-7',
  { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: 84, userPrice: 120000, noPrice: false },
  'RESULT'
);

// 전세 → 미지원
check('gp-8',
  { complex: '헬리오시티', dong: '잠실', purpose: 'jeonse', area: null, userPrice: null, noPrice: false },
  'NOT_SUPPORTED'
);

// 단지+동+매수+평형+noPrice → 결과
check('gp-9',
  { complex: '헬리오시티', dong: '잠실', purpose: 'buy', area: 84, userPrice: null, noPrice: true },
  'RESULT'
);

// 단지+동+매수+평형+가격 → 결과
check('gp-10',
  { complex: '헬리오시티', dong: '잠실', purpose: 'buy', area: 84, userPrice: 120000, noPrice: false },
  'RESULT'
);

// ─────────────────────────────────────────────
// Messy Input (10개)
// 채워진 Slot은 질문 생략
// ─────────────────────────────────────────────

// 단지+동+목적 있음 → 평형 질문 (동/목적 질문 생략)
check('mi-1',
  { complex: '동부', dong: '우동', purpose: 'fair', area: null, userPrice: null, noPrice: false },
  'ASK_AREA'
);

// 단지+동+목적+평형+noPrice → 결과 (질문 전부 생략)
check('mi-2',
  { complex: '동부', dong: '우동', purpose: 'fair', area: 59, userPrice: null, noPrice: true },
  'RESULT'
);

// 단지+동+목적+평형+가격 → 결과
check('mi-3',
  { complex: '동부', dong: '우동', purpose: 'fair', area: 59, userPrice: 80000, noPrice: false },
  'RESULT'
);

// 동 없음 → 동 질문 (목적+평형 있어도)
check('mi-4',
  { complex: '동부', dong: null, purpose: 'fair', area: 59, userPrice: null, noPrice: true },
  'ASK_DONG'
);

// 목적 없음 → 목적 질문 (동+평형 있어도)
check('mi-5',
  { complex: '동부', dong: '우동', purpose: null, area: 59, userPrice: null, noPrice: true },
  'ASK_PURPOSE'
);

// noPrice 미표시 → 가격 질문 (단지+동+목적+평형 있어도)
check('mi-6',
  { complex: '동부', dong: '우동', purpose: 'fair', area: 59, userPrice: null, noPrice: false },
  'ASK_PRICE'
);

// 동 없음 → 동 질문 (가격 있어도)
check('mi-7',
  { complex: '헬리오시티', dong: null, purpose: 'fair', area: 84, userPrice: 120000, noPrice: false },
  'ASK_DONG'
);

// 가격 있어도 평형 없으면 평형 질문
check('mi-8',
  { complex: '헬리오시티', dong: '잠실', purpose: 'fair', area: null, userPrice: 80000, noPrice: false },
  'ASK_AREA'
);

// 목적 없음 → 목적 질문 (가격 있어도)
check('mi-9',
  { complex: '헬리오시티', dong: '잠실', purpose: null, area: 84, userPrice: 120000, noPrice: false },
  'ASK_PURPOSE'
);

// complex 없음 → 단지 질문 (noPrice 있어도)
check('mi-10',
  { complex: null, dong: null, purpose: 'fair', area: null, userPrice: null, noPrice: true },
  'ASK_COMPLEX'
);

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log(`  Conversation QA: ${pass}/${pass + fail} 통과`);
console.log('═══════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n❌ 실패 목록:');
  for (const f of failures) {
    console.log(`  [${f.label}]`);
    console.log(`    slots: ${JSON.stringify(f.slots)}`);
    console.log(`    expected=${f.expectedAction} actual=${f.actual}`);
    if (f.reason) console.log(`    reason: ${f.reason}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ 전체 통과\n');
}
