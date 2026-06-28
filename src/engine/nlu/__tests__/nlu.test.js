/**
 * ValueLens NLU 회귀 테스트
 * 배포 전 반드시 실행: node src/engine/nlu/__tests__/nlu.test.js
 * 실패 케이스 있으면 배포 금지
 */
import { parseUserInput } from '../parseUserInput.js';

const TESTS = [
  // ── 단지명 검색 ──
  ['더샵그린워크1차',           'search_complex'],
  ['더샵송도마리나베이',         'search_complex'],
  ['랜드마크시티센트럴더샵',     'search_complex'],
  ['송도더샵퍼스트파크F15BL',    'search_complex'],
  ['래미안블레스티지',           'search_complex'],
  ['개포래미안포레스트',         'search_complex'],
  ['홍제원현대',                 'search_complex'],
  ['은마아파트',                 'search_complex'],
  ['상계주공',                   'search_complex'],
  ['동송하이클래스',             'search_complex'],

  // ── 붙여쓰기+의도어 ──
  ['홍제아파트적정가는',         'price_analysis'],
  ['은마아파트얼마야',           'price_analysis'],

  // ── 추천 ──
  ['강남 래미안',                'recommend_complex'],
  ['송도 더샵',                  'recommend_complex'],
  ['7억대 마포구 아파트',        'recommend_complex'],
  ['연수동 학군 좋은 아파트',    'recommend_complex'],

  // ── 적정가 ──
  ['얼마야',                     'price_analysis'],
  ['가격 어때요',                'price_analysis'],
  ['지금 시세 얼마야',           'price_analysis'],
  ['가격이 적당해',              'price_analysis'],

  // ── 전세 ──
  ['전세는',                     'jeonse_info'],
  ['전세 얼마야',                'jeonse_info'],
  ['보증금 수준은',              'jeonse_info'],
  ['전세 살 수 있어',            'jeonse_info'],

  // ── 최근거래 ──
  ['최근 거래 흐름은',           'recent_deals'],
  ['실제 거래가격 얼마야',       'recent_deals'],
  ['언제 팔렸어',                'recent_deals'],

  // ── 매수의견 ──
  ['살까요',                     'buy_opinion'],
  ['매수 의견은',                'buy_opinion'],
  ['사도 될까',                  'buy_opinion'],

  // ── 다른평형 ──
  ['다른 평형은',                'larger_area'],
  ['다른평형은',                 'larger_area'],
  ['평형 바꿔줘',                'larger_area'],

  // ── 지역+브랜드 붙여쓰기 (단지명) ──
  ['잠실래미안',                 'search_complex'],
  ['목동현대',                   'search_complex'],
  ['광교힐스테이트',             'search_complex'],
  ['판교푸르지오',               'search_complex'],
  ['잠실래미안파인뷰',           'search_complex'],

  // ── 지역+브랜드 띄어쓰기 (추천) ──
  ['잠실 래미안',                'recommend_complex'],
  ['목동 현대',                  'recommend_complex'],

  // ── 오타 변형 단지명 ──
  ['레미안블레스티지',           'search_complex'],
  ['해링턴플레이스',             'search_complex'],

  // ── 매수의견 추가 패턴 ──
  ['투자 가치 있어',             'buy_opinion'],
  ['살만해',                     'buy_opinion'],
  ['지금 매수 괜찮아',           'buy_opinion'],

  // ── 추천 추가 패턴 ──
  ['역세권 아파트 강남',         'recommend_complex'],
  ['30평대 송파구 아파트',       'recommend_complex'],

  // ── 기타 ──
  ['응',                         'confirm'],
  ['아니',                       'deny'],
  ['다시',                       'reset'],
  ['처음으로',                   'reset'],
];

let pass = 0, fail = 0;
const failures = [];

for (const [text, expected] of TESTS) {
  const r = parseUserInput(text, {});
  if (r.intent === expected) {
    pass++;
  } else {
    fail++;
    failures.push({ text, expected, got: r.intent });
  }
}

console.log('\n═══════════════════════════════════════');
console.log(`  NLU 회귀 테스트: ${pass}/${TESTS.length} 통과`);
console.log('═══════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n❌ 실패 케이스:');
  for (const f of failures) {
    console.log(`  "${f.text}" → ${f.got} (기대: ${f.expected})`);
  }
  console.log('\n⛔ 배포 금지 — 위 케이스 수정 후 재실행\n');
  process.exit(1);
} else {
  console.log('\n✅ 전체 통과 — 배포 가능\n');
  process.exit(0);
}
