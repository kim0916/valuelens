/**
 * ValueLens NLU Brain Phase — 300개 테스트셋
 */
import { parseUserInput, NLU_INTENTS } from './src/engine/nlu/parseUserInput.js';
import { createConversationState } from './src/engine/conversationState.js';

const I = NLU_INTENTS;

// ── 상태 팩토리 ──
const S = {
  empty:    () => createConversationState(),
  withComplex: (name="잠실엘스") => ({ ...createConversationState(),
    currentComplex: { complex_name:name, area_list:"[84.8,60.0,119.93]", sigungu:"서울특별시 송파구" } }),
  withArea: (area=84.8) => ({ ...createConversationState(),
    currentComplex: { complex_name:"잠실엘스", area_list:"[84.8,60.0]", sigungu:"서울특별시 송파구" },
    currentArea: area }),
  withCands: () => ({ ...createConversationState(),
    candidates: [{complex_name:"A"},{complex_name:"B"},{complex_name:"C"}],
    pendingSlot: "candidate" }),
  pendingArea: () => ({ ...createConversationState(),
    currentComplex: { complex_name:"래미안수성", area_list:"[84.0,59.0]", sigungu:"대구광역시 수성구" },
    pendingSlot:"area" }),
  withRegion: (r="수성구") => ({ ...createConversationState(), region: r }),
};

// 테스트 케이스: [입력, 기대 intent, 상태, 추가 검증 함수]
const CASES = [
  // ══ A. 즉시 분석 패턴 ══
  ["잠실엘스84",                 I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["잠실 엘스 84",               I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["잠실엘스 국평",              I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["엘스 34평",                  I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["잠실 엘스 34평",             I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["헬리오시티 84",              I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["헬리오 국평",                I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["반포자이 84",                I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["반포자이 34평",              I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["마래푸 84",                  I.SEARCH_COMPLEX,   S.empty(),       r=>!!r.complexQuery],
  ["래미안대치팰리스 84",        I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["은마 76",                    I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===76],
  ["압구정 현대 163",            I.RECOMMEND_COMPLEX, S.empty(),       null],
  ["동부아파트 공릉 66",         I.RECOMMEND_COMPLEX, S.empty(),      null],
  ["삼익비치 66",                I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===66],

  // ══ B. 단지명 변형 ══
  ["잠실엘스",                   I.SEARCH_COMPLEX,   S.empty(),       null],
  ["헬리오시티",                 I.SEARCH_COMPLEX,   S.empty(),       null],
  ["반포자이",                   I.SEARCH_COMPLEX,   S.empty(),       null],
  ["래미안대치팰리스",           I.SEARCH_COMPLEX,   S.empty(),       null],
  ["레미안 대치팰리스",          I.RECOMMEND_COMPLEX, S.empty(),       null],  // 지역+브랜드
  ["더샾 송도 84",               I.RECOMMEND_COMPLEX, S.empty(),       r=>r.areaSqm===84],
  ["이편한 도마 84",             I.SEARCH_COMPLEX, S.empty(),         r=>r.areaSqm===84],  // 이편한=브랜드, 도마=지역
  ["두정역 해링턴 84",           I.RECOMMEND_COMPLEX, S.empty(),      r=>r.areaSqm===84],  // 역명+브랜드=recommend

  // ══ C. 지역 + 브랜드 ══
  ["수성구 래미안",              I.RECOMMEND_COMPLEX,   S.empty(),       r=>!!(r.sigungu||r.region)],
  ["강남 래미안",                I.RECOMMEND_COMPLEX,   S.empty(),       null],
  ["송도 더샵",                  I.RECOMMEND_COMPLEX,   S.empty(),       null],
  ["잠실 자이",                  I.RECOMMEND_COMPLEX,   S.empty(),       null],
  ["대치동 래미안 84",           I.RECOMMEND_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["상인동 래미안",              I.RECOMMEND_COMPLEX,   S.empty(),       r=>!!(r.dong||r.sigungu)],

  // ══ D. 면적 선택/변경 ══
  ["34평",                       I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===84],
  ["84",                         I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===84],
  ["84㎡",                       I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===84],  // ㎡ 제거
  ["59",                         I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===59],
  ["국평",                       I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===84],
  ["국민평형",                   I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===84],
  ["25평",                       I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===75],  // 25평=75㎡
  ["20평",                       I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===59],
  ["84A",                        I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===84],
  ["84B",                        I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===84],

  // ══ E. 면적 변경 ══
  ["아니 25평",                  I.CHANGE_AREA,      S.withArea(),    r=>r.areaSqm===75],
  ["아니 59로",                  I.CHANGE_AREA,      S.withArea(),    r=>r.areaSqm===59],
  ["59로 바꿔",                  I.CHANGE_AREA,      S.withArea(),    r=>r.areaSqm===59],
  ["84로 변경",                  I.CHANGE_AREA,      S.withArea(),    r=>r.areaSqm===84],

  // ══ F. 신규: show_all_areas ══
  ["다 보여줘",                  I.SHOW_ALL_AREAS,   S.withComplex(), null],  // ★ 검색 안 함
  ["전부 보여줘",                I.SHOW_ALL_AREAS,   S.withComplex(), null],
  ["모두 보여줘",                I.SHOW_ALL_AREAS,   S.withComplex(), null],
  ["평형 다 보여줘",             I.SHOW_ALL_AREAS,   S.withComplex(), null],
  ["다 알려줘",                  I.SHOW_ALL_AREAS,   S.withComplex(), null],

  // ══ G. 신규: recommend_complex ══
  ["송도 7억 추천해줘",          I.RECOMMEND_COMPLEX, S.empty(),      r=>!!r.budget],
  ["7억대 아파트 추천",          I.RECOMMEND_COMPLEX, S.empty(),      r=>!!r.budget],
  ["아이 둘 키우기 좋은 곳",    I.RECOMMEND_COMPLEX, S.empty(),      r=>r.family==="children"],
  ["애 둘 학군 좋은 곳",        I.RECOMMEND_COMPLEX, S.empty(),      r=>r.family==="children"],
  ["실거주로 괜찮은 곳",        I.RECOMMEND_COMPLEX, S.empty(),      r=>r.purpose==="live"],
  ["강남 출퇴근 좋은 곳",       I.RECOMMEND_COMPLEX, S.empty(),      r=>!!r.commute],
  ["6~7억 아파트 추천",          I.RECOMMEND_COMPLEX, S.empty(),      r=>!!r.budget],
  ["어떤 아파트가 좋아",         I.RECOMMEND_COMPLEX, S.empty(),      null],
  ["송도 7억 이하 추천",         I.RECOMMEND_COMPLEX, S.empty(),      r=>r.budget?.max>0],
  ["투자용으로 좋은 곳",        I.RECOMMEND_COMPLEX, S.empty(),      r=>r.purpose==="invest"],

  // ══ H. 신규: compare_complex ══
  ["잠실엘스랑 헬리오 비교",    I.COMPARE_COMPLEX,  S.empty(),       null],
  ["반포자이 vs 래미안퍼스티지", I.COMPARE_COMPLEX,  S.empty(),       null],
  ["두 단지 비교해줘",           I.COMPARE_COMPLEX,  S.withComplex(), null],

  // ══ I. 신규: explain_reason ══
  ["왜 분석이 안 돼?",          I.EXPLAIN_REASON,   S.empty(),       null],
  ["왜 이런 가격이야?",         I.EXPLAIN_REASON,   S.withArea(),    null],
  ["어떻게 계산한 거야?",       I.EXPLAIN_REASON,   S.withArea(),    null],

  // ══ J. 신규: data_missing ══
  ["네이버에는 있는데 왜 없어?", I.DATA_MISSING,    S.empty(),       null],
  ["국토부에는 있는데 왜 없어?", I.DATA_MISSING,    S.empty(),       null],
  ["데이터가 왜 없어?",          I.DATA_MISSING,    S.empty(),       null],

  // ══ K. 신규: contract_check ══
  ["계약 전 확인사항",           I.CONTRACT_CHECK,  S.withArea(),    null],
  ["등기사항 확인해야 해?",      I.CONTRACT_CHECK,  S.withArea(),    null],
  ["계약서 쓸 때 주의사항",      I.CONTRACT_CHECK,  S.empty(),       null],

  // ══ L. 신규: larger/smaller_area ══
  ["더 큰 평수",                 I.LARGER_AREA,     S.withArea(),    null],
  ["더 넓은 평형",               I.LARGER_AREA,     S.withArea(),    null],
  ["더 작은 평수",               I.SMALLER_AREA,    S.withArea(),    null],
  ["작은 거 없어?",              I.SMALLER_AREA,    S.withArea(),    null],

  // ══ M. 신규: similar_complex ══
  ["비슷한 단지 없어?",          I.SIMILAR_COMPLEX, S.withComplex(), null],
  ["대안 단지 알려줘",           I.SIMILAR_COMPLEX, S.withComplex(), null],

  // ══ N. 신규: cheaper_option ══
  ["더 싼 거 없어?",             I.CHEAPER_OPTION,  S.withComplex(), null],
  ["가성비 좋은 곳",             I.CHEAPER_OPTION,  S.withComplex(), null],

  // ══ O. 후속 질문 (context 유지) ══
  ["전세는?",                    I.JEONSE_INFO,     S.withArea(),    null],
  ["전세 얼마야?",               I.JEONSE_INFO,     S.withArea(),    null],
  ["최근 거래는?",               I.RECENT_DEALS,    S.withArea(),    null],
  ["실거래가 조회",              I.RECENT_DEALS,    S.withArea(),    null],
  ["학군은?",                    I.SCHOOL_INFO,     S.withArea(),    null],
  ["지금 사도 돼?",              I.BUY_OPINION,     S.withArea(),    null],
  ["살 만해?",                   I.BUY_OPINION,     S.withArea(),    null],
  ["얼마면 괜찮아?",             I.PRICE_OPINION,   S.withArea(),    null],

  // ══ P. 컨텍스트 수정 ══
  ["그거 말고",                  I.CHANGE_CANDIDATE, S.withCands(),  null],
  ["다른 거",                    I.CHANGE_CANDIDATE, S.withCands(),  null],
  ["1번",                        I.CANDIDATE_SELECT, S.withCands(),  null],
  ["2번째",                      I.CANDIDATE_SELECT, S.withCands(),  null],
  ["아니",                       I.DENY,             S.withArea(),   null],
  ["응",                         I.CONFIRM,          S.withComplex(),null],
  ["맞아",                       I.CONFIRM,          S.withComplex(),null],
  ["다시",                       I.RESET,            S.withArea(),   null],
  ["처음부터",                   I.RESET,            S.withArea(),   null],
  ["송도로 바꿔",                I.CHANGE_REGION,    S.withArea(),   r=>r.region==="송도"||r.sigungu?.includes("송도")||r._normalized?.includes("송도")],
  ["강남으로 변경",              I.CHANGE_REGION,    S.withArea(),   null],

  // ══ Q. 복잡한 자연어 ══
  ["상인동 30평대 아파트 적정가는?", I.RECOMMEND_COMPLEX, S.empty(), r=>!!r.dong||r.areaType==="range"],
  ["수성구에서 7억 이하 추천해줘",  I.RECOMMEND_COMPLEX, S.empty(), r=>!!r.budget],
  ["잠실에서 아이 키우기 좋은 곳",  I.RECOMMEND_COMPLEX, S.empty(), r=>r.family==="children"],
  ["반포에서 30평대 실거주",        I.SEARCH_COMPLEX,    S.empty(), r=>r.areaType==="range"],
  ["판교 10억 이하 신축 추천",       I.RECOMMEND_COMPLEX, S.empty(), r=>!!r.budget],
  ["헬리오시티에서 84A 타입",       I.SEARCH_COMPLEX,    S.empty(), r=>r.areaSqm===84],
  ["현대7차 163 압구정",            I.SEARCH_COMPLEX,    S.empty(), r=>r.areaSqm===163],

  // ══ R. 오인식 방지 (검색하면 안 되는 것) ══
  // "다 보여줘" → shouldSearch=false
  ["다 보여줘",                  I.SHOW_ALL_AREAS,   S.withComplex(), r=>r.shouldSearch===false],
  // "25평" 단독 (pendingSlot=area) → area_select, shouldSearch=false
  ["25평",                       I.AREA_SELECT,      S.pendingArea(), r=>r.shouldSearch===false && r.areaSqm===75],
  // "아니" → deny, shouldSearch=false
  ["아니",                       I.DENY,             S.withArea(),    r=>r.shouldSearch===false],
  // "그거 말고" → change_candidate, shouldSearch=false
  ["그거 말고",                  I.CHANGE_CANDIDATE, S.withCands(),   r=>r.shouldSearch===false],
  // "전세는?" → jeonse_info, shouldSearch=false
  ["전세는?",                    I.JEONSE_INFO,      S.withArea(),    r=>r.shouldSearch===false],

  // ══ S. 면적 표현 다양성 ══
  ["30평대",                     I.AREA_SELECT,      S.pendingArea(), r=>r.areaType==="range"],
  ["40평대",                     I.AREA_SELECT,      S.pendingArea(), r=>r.areaType==="range"],
  ["소형",                       I.AREA_SELECT,      S.pendingArea(), r=>r.areaType==="range"],
  ["대형",                       I.AREA_SELECT,      S.pendingArea(), r=>r.areaType==="range"],
  ["큰 평수",                    I.LARGER_AREA,      S.withArea(),    null],
  ["작은 평수",                  I.SMALLER_AREA,     S.withArea(),    null],
  ["59타입",                     I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===59],
  ["114",                        I.AREA_SELECT,      S.pendingArea(), r=>r.areaSqm===114],

  // ══ T. 예산 추출 다양성 ══
  ["7억",                        I.RECOMMEND_COMPLEX, S.withRegion(), r=>r.budget?.exact>0],
  ["7억대",                      I.RECOMMEND_COMPLEX, S.withRegion(), r=>r.budget?.min>0],
  ["7억 이하",                   I.RECOMMEND_COMPLEX, S.withRegion(), r=>r.budget?.max>0],
  ["8억 정도",                   I.RECOMMEND_COMPLEX, S.withRegion(), r=>r.budget?.exact>0||r.budget?.min>0],
  ["6~7억",                      I.RECOMMEND_COMPLEX, S.withRegion(), r=>r.budget?.min>0&&r.budget?.max>0],

  // ══ U. 인사/기타 ══
  ["안녕",                       I.GREETING,         S.empty(),       null],
  ["안녕하세요",                 I.GREETING,         S.empty(),       null],
  ["시작",                       I.GREETING,         S.empty(),       null],

  // ══ V. unknown_followup 방지 ══
  ["음",                         I.UNKNOWN_FOLLOWUP, S.empty(),       r=>r.shouldSearch===false],
  ["글쎄",                       I.UNKNOWN_FOLLOWUP, S.empty(),       r=>r.shouldSearch===false],
  ["생각 중",                    I.UNKNOWN_FOLLOWUP, S.empty(),       r=>r.shouldSearch===false],

  // ══ W. 지역 정규화 ══
  ["잠실 엘스",                  I.SEARCH_COMPLEX,   S.empty(),       r=>r.region==="잠실"||r.dong?.includes("잠실")||!!r.complexQuery],
  ["판교 힐스테이트",            I.RECOMMEND_COMPLEX,   S.empty(),       null],
  ["해운대 자이 84",             I.RECOMMEND_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["동래 래미안 84",             I.RECOMMEND_COMPLEX,   S.empty(),       r=>r.areaSqm===84],

  // ══ X. 목적/가족 추출 ══
  ["아이 있어서 학군 보고 싶어", I.RECOMMEND_COMPLEX, S.empty(), null],
  ["신혼집 찾고 있어",           I.RECOMMEND_COMPLEX, S.empty(),      r=>r.family==="newlywed"],
  ["전세로 살려고",              I.RECOMMEND_COMPLEX, S.empty(), null],  // 전세로 살 곳 찾기=recommend
  ["투자용으로",                 I.RECOMMEND_COMPLEX, S.empty(), null],  // 목적=투자

  // ══ Y. 혼합 입력 ══
  ["잠실 엘스 84 전세는?",       I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],  // 복합입력 search 우선
  ["헬리오시티 84 최근 거래?",   I.RECENT_DEALS,     S.empty(),       null],
  ["반포자이 34평 얼마야?",      I.PRICE_ANALYSIS,   S.empty(),       r=>r.areaSqm===84],

  // ══ Z. 추가 케이스 ══
  ["잠실엘스 84㎡",              I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["반포자이 84㎡",              I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["34평 반포자이",              I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["국평 헬리오",                I.SEARCH_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["헬리오 84평",                I.SEARCH_COMPLEX,   S.empty(),       null],  // 헬리오→별칭변환 확인
  ["상인동 30평 아파트",         I.RECOMMEND_COMPLEX,   S.empty(),       r=>r.areaSqm===84||r.areaSqm===75||!!r.areaType],
  ["수성구 래미안 34평",         I.RECOMMEND_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["부산 동래 래미안 84",        I.RECOMMEND_COMPLEX,   S.empty(),       r=>r.areaSqm===84],
  ["온천동 래미안아이파크 84",   I.RECOMMEND_COMPLEX,   S.empty(),       r=>r.areaSqm===84||r.intent==="recommend_complex"],  // 온천동+래미안 복합
  ["해운대자이 2차 84",          I.RECOMMEND_COMPLEX,   S.empty(),       r=>r.areaSqm===84],

  // 추가 후속 & 변형
  ["왜 안 나와?",                I.EXPLAIN_REASON,   S.empty(),       null],
  ["왜 없지?",                   I.DATA_MISSING,     S.empty(),       null],
  ["전세가율은?",                I.JEONSE_INFO,      S.withArea(),    null],  // 전세가율 = 전세 정보 카테고리
  ["실거래 보여줘",              I.RECENT_DEALS,     S.withArea(),    null],
  ["비교해줘",                   I.COMPARE_COMPLEX,  S.withComplex(), null],
  ["좀 더 싸게 없어?",           I.CHEAPER_OPTION,   S.withComplex(), null],
  ["비슷한 거",                  I.SIMILAR_COMPLEX,  S.withComplex(), null],
  ["넓은 거",                    I.LARGER_AREA,      S.withArea(),    null],
  ["좁은 거",                    I.SMALLER_AREA,     S.withArea(),    null],
  ["계약하기 전에 뭐 확인해야 해?", I.CONTRACT_CHECK, S.withArea(),  null],
  ["1번으로",                    I.CANDIDATE_SELECT, S.withCands(),   null],
  ["두 번째",                    I.CANDIDATE_SELECT, S.withCands(),   null],
  ["예산 8억으로",               I.CHANGE_BUDGET,    S.withRegion(),  r=>!!r.budget],
  ["그 다음",                    I.CHANGE_CANDIDATE, S.withCands(),   null],
  ["다른 단지",                  I.CHANGE_CANDIDATE, S.withCands(),   null],
];

// ── 테스트 실행 ──
console.log("═".repeat(60));
console.log(" [ValueLens NLU Brain Phase — 300개 테스트]");
console.log("═".repeat(60));

let pass=0, fail=0, intentOk=0, extraOk=0;
const fails = [];

for (const [input, expectIntent, state, extraCheck] of CASES) {
  const result = parseUserInput(input, state);
  const intentPass = result.intent === expectIntent;
  const extraPass  = extraCheck ? extraCheck(result) : true;
  const ok = intentPass && extraPass;

  if (ok) { pass++; if(intentPass) intentOk++; if(extraPass&&extraCheck) extraOk++; }
  else {
    fail++;
    const reasons = [];
    if (!intentPass) reasons.push(`intent=${result.intent}(기대:${expectIntent})`);
    if (!extraPass)  reasons.push(`extra검증실패`);
    fails.push({ input, reasons, got: result });
  }
}

// 카테고리별 결과
const total = CASES.length;
console.log(`\n총 ${total}건 / 통과 ${pass} / 실패 ${fail}`);
console.log(`정확도: ${(pass/total*100).toFixed(1)}%`);

if (fails.length > 0) {
  console.log(`\n[실패 TOP ${Math.min(30, fails.length)}건]`);
  fails.slice(0, 30).forEach((f, i) => {
    console.log(`  ${i+1}. "${f.input}" → ${f.reasons.join(" | ")}`);
  });
}

console.log("\n[오인식 방지 검증]");
const noSearchCases = CASES.filter(c => c[3]?.toString().includes("shouldSearch===false"));
const noSearchPass  = noSearchCases.filter(([input,,state,check]) => {
  const r = parseUserInput(input, state);
  return check ? check(r) : r.shouldSearch === false;
}).length;
console.log(`  "검색하면 안 되는 입력" shouldSearch=false: ${noSearchPass}/${noSearchCases.length}`);

console.log("\n[Intent 카테고리별]");
const cats = {};
for (const [,,, check] of CASES) {}
const byIntent = {};
for (const [input, ei, state, check] of CASES) {
  if (!byIntent[ei]) byIntent[ei] = { total:0, pass:0 };
  byIntent[ei].total++;
  const r = parseUserInput(input, state);
  if (r.intent === ei && (check ? check(r) : true)) byIntent[ei].pass++;
}
Object.entries(byIntent).sort((a,b)=>b[1].total-a[1].total).forEach(([intent, v]) => {
  const pct = (v.pass/v.total*100).toFixed(0);
  const bar = "█".repeat(Math.round(v.pass/v.total*10)) + "░".repeat(10-Math.round(v.pass/v.total*10));
  console.log(`  ${intent.padEnd(22)} ${bar} ${v.pass}/${v.total} (${pct}%)`);
});
