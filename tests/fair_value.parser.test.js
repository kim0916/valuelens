/**
 * fair_value.parser.test.js
 *
 * Parser QA (30개)
 * 목표: 문장에서 Slot을 정확히 추출하는지 검증
 *
 * Parser 원칙:
 * - 원문 그대로 추출 (정규화 없음)
 * - 브랜드 Alias, "아파트" 보정, Search 절대 없음
 * - 오직 추출만
 */

import { parseFairValueInput } from '../src/parser/fairValueParser.js';

let pass = 0;
let fail = 0;
const failures = [];

function check(label, input, field, expected) {
  const result = parseFairValueInput(input);
  const actual = result[field];
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push({ label, input, field, expected, actual });
  }
}

// ─────────────────────────────────────────────
// 1. Intent: FAIR_VALUE (5개)
// ─────────────────────────────────────────────
check('intent-1', '헬리오시티 얼마야',           'intent', 'FAIR_VALUE');
check('intent-2', '동부아파트 적정가 얼마예요',   'intent', 'FAIR_VALUE');
check('intent-3', '이 아파트 비싼 편인가요',      'intent', 'FAIR_VALUE');
check('intent-4', '래미안 분석해줘',              'intent', 'FAIR_VALUE');
check('intent-5', '지금 살 만한가요',             'intent', 'FAIR_VALUE');

// ─────────────────────────────────────────────
// 2. complexRaw 추출 (5개)
// 정규화 없음 — 원문 그대로
// ─────────────────────────────────────────────
check('complex-1', '헬리오시티 얼마야',           'complexRaw', '헬리오시티');
check('complex-2', '동부아파트 적정가요',         'complexRaw', '동부아파트');
check('complex-3', '동부 우동 24평 적정가',       'complexRaw', '동부');
check('complex-4', '래미안퍼스티지 시세가요',     'complexRaw', '래미안퍼스티지');
check('complex-5', '은마 요즘 얼마야',            'complexRaw', '은마');

// ─────────────────────────────────────────────
// 3. dong 추출 (5개)
// ─────────────────────────────────────────────
check('dong-1', '동부 우동 적정가요',             'dong', '우동');
check('dong-2', '잠실 헬리오시티 얼마예요',       'dong', '잠실');
check('dong-3', '반포 래미안 시세요',             'dong', '반포');
check('dong-4', '개포 주공 얼마야',               'dong', '개포');
check('dong-5', '헬리오시티 얼마야',              'dong', null);

// ─────────────────────────────────────────────
// 4. area 추출 (5개)
// pyeong 입력 → areaSqm 변환, sqm 직접 입력 → 그대로
// ─────────────────────────────────────────────
check('area-1', '헬리오시티 34평 얼마야',         'area', { pyeong: 34, sqm: 84 });
check('area-2', '래미안 84㎡ 적정가요',           'area', { pyeong: 33, sqm: 84 });
check('area-3', '동부 우동 24평 적정가',          'area', { pyeong: 24, sqm: 59 });
check('area-4', '전용 59 기준으로 봐줘요',        'area', { pyeong: 25, sqm: 59 });
check('area-5', '헬리오시티 얼마야',              'area', null);

// ─────────────────────────────────────────────
// 5. userPrice 추출 (5개)
// 단위: 만원
// ─────────────────────────────────────────────
check('price-1', '8억에 나왔는데 적당해요',       'userPrice', 80000);
check('price-2', '호가 9억 5천인데 비싼가요',     'userPrice', 95000);
check('price-3', '7.5억 급매 잡아야 할까요',      'userPrice', 75000);
check('price-4', '12억 5000에 나온 매물인데요',   'userPrice', 125000);
check('price-5', '헬리오시티 얼마야',             'userPrice', null);

// ─────────────────────────────────────────────
// 6. noPrice 추출 (5개)
// ─────────────────────────────────────────────
check('noprice-1', '가격은 몰라요 그냥 분석해줘', 'noPrice', true);
check('noprice-2', '시세 기준으로 봐줘요',        'noPrice', true);
check('noprice-3', '가격 모르는데 돼요',          'noPrice', true);
check('noprice-4', '알아서 찾아봐줘요',           'noPrice', true);
check('noprice-5', '헬리오시티 얼마야',           'noPrice', false);

// ─────────────────────────────────────────────
// 결과
// ─────────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log(`  Parser QA: ${pass}/${pass + fail} 통과`);
console.log('═══════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n❌ 실패 목록:');
  for (const f of failures) {
    console.log(`  [${f.label}] "${f.input}"`);
    console.log(`    ${f.field}: expected=${JSON.stringify(f.expected)} actual=${JSON.stringify(f.actual)}`);
  }
  process.exit(1);
} else {
  console.log('\n✅ 전체 통과\n');
}
