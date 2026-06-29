/**
 * tests/pyeong.qa.test.js
 * 평형 표준화 QA — 모든 단지에서 동일하게 동작해야 함
 */
import { sqmToPyeong, pyeongToSqm, nearestPyeong, areaOptionsFromList } from '../src/utils/pyeong.js';

let pass = 0, fail = 0;
const failures = [];
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; return; }
  fail++;
  failures.push({ label, expected: JSON.stringify(expected), actual: JSON.stringify(actual) });
}

// ── sqmToPyeong ──
check('sqm-1  59.34㎡ → 25평', sqmToPyeong(59.34).pyeong, 25);
check('sqm-2  84.79㎡ → 33평', sqmToPyeong(84.79).pyeong, 33);
check('sqm-3 114.17㎡ → 43평', sqmToPyeong(114.17).pyeong, 43);
check('sqm-4  59.99㎡ → 25평', sqmToPyeong(59.99).pyeong, 25);
check('sqm-5  84.97㎡ → 33평', sqmToPyeong(84.97).pyeong, 33);
check('sqm-6 114.98㎡ → 43평', sqmToPyeong(114.98).pyeong, 43);
check('sqm-7   0㎡   → 0평',   sqmToPyeong(0).pyeong, 0);

// ── pyeongToSqm ──
check('p2s-1 25평 → 59㎡',  pyeongToSqm(25), 59);
check('p2s-2 33평 → 84㎡',  pyeongToSqm(33), 84);
check('p2s-3 43평 → 114㎡', pyeongToSqm(43), 114);

// ── nearestPyeong — 필수 케이스 ──
const opts1 = [{ areaSqm:59.34, pyeong:25 }, { areaSqm:84.79, pyeong:33 }, { areaSqm:114.17, pyeong:43 }];
check('near-1 24평 → 25평', nearestPyeong(24, opts1)?.matchedPyeong, 25);
check('near-2 30평 → 33평', nearestPyeong(30, opts1)?.matchedPyeong, 33);
check('near-3 34평 → 33평', nearestPyeong(34, opts1)?.matchedPyeong, 33);
check('near-4 41평 → 43평', nearestPyeong(41, opts1)?.matchedPyeong, 43);
check('near-5 25평 정확일치', nearestPyeong(25, opts1)?.isSame, true);
check('near-6 없는평형 최근접', nearestPyeong(50, opts1)?.matchedPyeong, 43);
check('near-7 helperText 생성', nearestPyeong(30, opts1)?.helperText, '입력하신 30평과 가장 가까운 평형입니다.');
check('near-8 정확일치 helperText 없음', nearestPyeong(25, opts1)?.helperText, '');

// ── areaOptionsFromList ──
const opts2 = areaOptionsFromList([59.34, 84.79, 114.17]);
check('aol-1 length', opts2.length, 3);
check('aol-2 첫번째 pyeong', opts2[0].pyeong, 25);
check('aol-3 두번째 pyeong', opts2[1].pyeong, 33);
check('aol-4 문자열 파싱',   areaOptionsFromList('[59.34,84.79]')[0].pyeong, 25);
check('aol-5 null 안전',     areaOptionsFromList(null).length, 0);

// ── sqmToPyeong과 areaMapping.js 결과 일치 ──
import { sqmToPyeong as fromMapping } from '../src/constants/areaMapping.js';
[59.34, 84.79, 114.17, 59.99, 84.97, 114.98].forEach(sqm => {
  check(`compat-${sqm} mapping일치`, sqmToPyeong(sqm).pyeong, fromMapping(sqm).pyeong);
});

console.log('\n═══════════════════════════════════════');
console.log(`  Pyeong QA: ${pass}/${pass+fail} 통과`);
console.log('═══════════════════════════════════════');
if (failures.length) {
  failures.forEach(f => console.log(`  ❌ [${f.label}] expected=${f.expected} actual=${f.actual}`));
  process.exit(1);
} else {
  console.log('\n✅ 전체 통과 — 평형 표준화 완료\n');
}
