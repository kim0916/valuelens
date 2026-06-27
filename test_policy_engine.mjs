/**
 * Conversation Policy Engine 테스트
 * 10개 Rule 전수 검증
 */
import { applyPolicy, applyPostSearchPolicy, ACTIONS } from './src/engine/conversationPolicy.js';
import { classifyIntent, INTENTS } from './src/engine/intentClassifier.js';
import { createConversationState } from './src/engine/conversationState.js';

// ─── 상태 팩토리 ───
const S = {
  empty:        () => createConversationState(),
  withComplex:  (name="잠실엘스") => ({ ...createConversationState(), currentComplex: { complex_name:name, area_list:"[84.8,84.97,60.0,119.93]" } }),
  withArea:     (name="잠실엘스", area=84) => ({ ...createConversationState(), currentComplex: { complex_name:name, area_list:"[84.8,84.97,60.0,119.93]" }, currentArea: area }),
  withCandidates: (n=3) => ({ ...createConversationState(), candidates: Array(n).fill({ complex_name:"테스트", area_list:"[]", sale_cnt:10 }) }),
  pendingArea:  (name="래미안수성") => ({ ...createConversationState(), currentComplex:{ complex_name:name, area_list:"[84.0,59.0,114.0]" }, pendingSlot:"area" }),
  pendingCandidate: (n=3) => ({ ...createConversationState(), candidates: Array(n).fill({ complex_name:"테스트", area_list:"[]", sale_cnt:10 }), pendingSlot:"candidate" }),
};

let pass=0, fail=0;
const fails=[];

function test(label, rule, got, expected) {
  const ok = got === expected;
  if(ok) { pass++; console.log(`  ✅ [Rule${rule}] ${label}`); }
  else    { fail++; fails.push(`Rule${rule}: ${label}`); console.log(`  ❌ [Rule${rule}] ${label}\n     → action: ${got} (기대: ${expected})`); }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 1: 단지+평형 확보 → 즉시 분석
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 1] 단지+평형 → 즉시 분석");
{
  const st = S.withArea();
  // 추가 면적 입력 → 이미 있으니 분석
  const {intent,extracted} = classifyIntent("적정가 알려줘", st);
  const d = applyPolicy(intent, extracted, st, "적정가 알려줘");
  test("단지+평형 있음 + 적정가 → analyze_now", 1, d.action, ACTIONS.ANALYZE_NOW);

  // 확인 → 분석
  const d2 = applyPolicy(INTENTS.CONFIRM, {}, st, "응");
  test("단지+평형 있음 + 응 → analyze_now", 1, d2.action, ACTIONS.ANALYZE_NOW);

  // postSearch: 단건 + 면적힌트
  const d3 = applyPostSearchPolicy([{complex_name:"잠실엘스", area_list:"[]", sale_cnt:100}], 84, st);
  test("postSearch 단건 + 면적힌트 → analyze_now", 1, d3.action, ACTIONS.ANALYZE_NOW);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 2: 단지만 → 실제 DB 평형 제시
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 2] 단지만 → 평형 제시");
{
  const st = S.withComplex();
  const {intent,extracted} = classifyIntent("응", st);
  const d = applyPolicy(intent, extracted, st, "응");
  test("단지 있음 + 확인 → ask_area", 2, d.action, ACTIONS.ASK_AREA);

  const d2 = applyPostSearchPolicy([{complex_name:"잠실엘스", area_list:"[]", sale_cnt:100}], null, st);
  test("postSearch 단건 + 힌트없음 → ask_area", 2, d2.action, ACTIONS.ASK_AREA);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 3: 평형만 있음
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 3] 평형 입력");
{
  // 단지 있음 → 면적 업데이트 후 분석
  const st1 = S.withComplex();
  const {intent:i1,extracted:e1} = classifyIntent("34평", {pendingSlot:"area"});
  const d1 = applyPolicy(i1, e1, st1, "34평");
  test("단지 있음 + 34평 → update_area (then_analyze)", 3, d1.action, ACTIONS.UPDATE_AREA);
  test("34평 → areaSqm=84", 3, String(d1.params.areaSqm), "84");

  // 단지 없음 → 단지 질문
  const st2 = S.empty();
  const d2 = applyPolicy(i1, e1, st2, "34평");
  test("단지 없음 + 34평 → ask_complex", 3, d2.action, ACTIONS.ASK_COMPLEX);

  // "아니 25평" → 면적 변경
  const {intent:i2,extracted:e2} = classifyIntent("아니 25평", {});
  const d3 = applyPolicy(i2, e2, st1, "아니 25평");
  test("단지 있음 + 아니 25평 → update_area", 3, d3.action, ACTIONS.UPDATE_AREA);
  test("아니 25평 → areaSqm=75", 3, String(d3.params.areaSqm), "75");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 4: 복수 단지 → 후보 선택
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 4] 복수 단지 → 후보 선택");
{
  const d = applyPostSearchPolicy(
    [{complex_name:"더샵A", sale_cnt:50},{complex_name:"더샵B", sale_cnt:20}],
    null, S.empty()
  );
  test("postSearch 복수 → show_candidates", 4, d.action, ACTIONS.SHOW_CANDIDATES);

  // 번호 선택
  const st = S.withCandidates(3);
  const {intent,extracted} = classifyIntent("2번", {pendingSlot:"candidate"});
  const d2 = applyPolicy(intent, extracted, st, "2번");
  test("2번 선택 → select_candidate", 4, d2.action, ACTIONS.SELECT_CANDIDATE);
  test("index=1 (2번→0-based)", 4, String(d2.params.index), "1");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 5: 후속 질문 → 현재 Context 유지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 5] 후속 질문 → Context 유지");
{
  const st = S.withArea();

  const {intent:i1} = classifyIntent("전세는?", st);
  const d1 = applyPolicy(i1, {}, st, "전세는?");
  test("전세 → analyze_jeonse (context 유지)", 5, d1.action, ACTIONS.ANALYZE_JEONSE);

  const {intent:i2} = classifyIntent("최근 거래는?", st);
  const d2 = applyPolicy(i2, {}, st, "최근 거래는?");
  test("최근거래 → analyze_recent (context 유지)", 5, d2.action, ACTIONS.ANALYZE_RECENT);

  const {intent:i3} = classifyIntent("지금 사도 돼?", st);
  const d3 = applyPolicy(i3, {}, st, "지금 사도 돼?");
  test("매수의견 → analyze_buy (context 유지)", 5, d3.action, ACTIONS.ANALYZE_BUY);

  // 단지 있지만 면적 없음 → ask_area
  const st2 = S.withComplex();
  const {intent:i4} = classifyIntent("전세는?", st2);
  const d4 = applyPolicy(i4, {}, st2, "전세는?");
  test("전세 + 평형미확정 → ask_area", 5, d4.action, ACTIONS.ASK_AREA);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 6: 새 지역 → Region만 변경
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 6] 지역 변경");
{
  const st = S.withArea();

  const {intent,extracted} = classifyIntent("송도로 바꿔", st);
  const d = applyPolicy(intent, extracted, st, "송도로 바꿔");
  test("송도로 바꿔 → update_region", 6, d.action, ACTIONS.UPDATE_REGION);
  test("region=송도", 6, d.params.region, "송도");

  // 기존 단지/면적 유지되어야 (update_region은 단지/면적 초기화하지 않음)
  // → conversationState.updateRegion이 초기화하는 건 올바른 동작
  // → Policy는 action만 반환하고 실행은 execute가 담당
  test("단지 있어도 region 변경 가능", 6, d.action, ACTIONS.UPDATE_REGION);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 7: 새 단지 → 이전 Context 종료
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 7] 새 단지 → Context 종료 후 새 시작");
{
  const st = S.withArea("잠실엘스");  // 잠실엘스 확정 상태

  // 다른 단지 입력 → new_complex
  const {intent,extracted} = classifyIntent("반포자이 84", st);
  const d = applyPolicy(intent, extracted, st, "반포자이 84");
  test("기존 단지 있을 때 새 단지 → new_complex", 7, d.action, ACTIONS.NEW_COMPLEX);
  test("needSearch=true", 7, String(d.needSearch), "true");

  // 같은 단지 이름 포함 → same complex (new_complex 아님)
  const {intent:i2,extracted:e2} = classifyIntent("잠실엘스 59", st);
  const d2 = applyPolicy(i2, e2, st, "잠실엘스 59");
  // 면적 변경 또는 분석 → update_area or analyze_now (new_complex 아님)
  test("같은 단지 + 평형 → update_area(not new_complex)", 7,
    d2.action !== ACTIONS.NEW_COMPLEX ? "not_new_complex" : "new_complex",
    "not_new_complex"
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 8: "아니" → 이전 단계 수정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 8] 아니 → 이전 단계");
{
  // 후보 대기 중 → 다음 후보
  const st1 = S.withCandidates(3);
  const d1 = applyPolicy(INTENTS.DENY, {}, st1, "아니");
  test("후보 대기 중 아니 → next_candidate", 8, d1.action, ACTIONS.NEXT_CANDIDATE);

  // 면적 확정 후 → 평형 재선택
  const st2 = S.withArea();
  const d2 = applyPolicy(INTENTS.DENY, {}, st2, "아니");
  test("면적 확정 후 아니 → ask_area", 8, d2.action, ACTIONS.ASK_AREA);

  // 단지 확정 후 → 새 단지
  const st3 = S.withComplex();
  const d3 = applyPolicy(INTENTS.DENY, {}, st3, "아니");
  test("단지 확정 후 아니 → new_complex", 8, d3.action, ACTIONS.NEW_COMPLEX);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 9: "다른 거" → 다음 후보
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 9] 다른 거 → 다음 후보");
{
  const {intent} = classifyIntent("다른 거", {});
  const d = applyPolicy(intent, {}, S.withCandidates(3), "다른 거");
  test("다른 거 → next_candidate", 9, d.action, ACTIONS.NEXT_CANDIDATE);

  const {intent:i2} = classifyIntent("그거 말고", {});
  const d2 = applyPolicy(i2, {}, S.withCandidates(2), "그거 말고");
  test("그거 말고 → next_candidate", 9, d2.action, ACTIONS.NEXT_CANDIDATE);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Rule 10: "다시" → Context 초기화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[Rule 10] 다시 → 초기화");
{
  const st = S.withArea();
  const {intent} = classifyIntent("다시", st);
  const d = applyPolicy(intent, {}, st, "다시");
  test("다시 → reset", 10, d.action, ACTIONS.RESET);

  const {intent:i2} = classifyIntent("처음부터", {});
  const d2 = applyPolicy(i2, {}, S.withArea(), "처음부터");
  test("처음부터 → reset", 10, d2.action, ACTIONS.RESET);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 종합 대화 시나리오 테스트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n[시나리오] 실제 대화 흐름");
{
  let state = S.empty();

  const scenario = [
    // 1. 단지 검색
    { input:"수성구 래미안", expectAction: ACTIONS.NEW_COMPLEX, label:"단지 검색" },
    // 2. 면적 선택 (가상으로 단지 확정 후)
    { input:"34평", state: S.withComplex("래미안수성"), expectAction: ACTIONS.UPDATE_AREA, label:"34평 선택" },
    // 3. 면적 변경
    { input:"아니 25평", state: S.withArea("래미안수성", 84), expectAction: ACTIONS.UPDATE_AREA, label:"아니 25평" },
    // 4. 후속 질문
    { input:"전세는?", state: S.withArea("래미안수성", 75), expectAction: ACTIONS.ANALYZE_JEONSE, label:"전세 질문" },
    // 5. 지역 변경
    { input:"송도로 바꿔", state: S.withArea(), expectAction: ACTIONS.UPDATE_REGION, label:"송도로 변경" },
    // 6. 새 단지
    { input:"잠실엘스84", state: S.withArea("수완GS자이"), expectAction: ACTIONS.NEW_COMPLEX, label:"새 단지 입력" },
    // 7. 다시
    { input:"다시", state: S.withArea(), expectAction: ACTIONS.RESET, label:"초기화" },
  ];

  for (const sc of scenario) {
    const st = sc.state || state;
    const {intent, extracted} = classifyIntent(sc.input, st);
    const d = applyPolicy(intent, extracted, st, sc.input);
    test(`시나리오: "${sc.input}" → ${sc.expectAction}`, "S", d.action, sc.expectAction);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 최종 리포트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n" + "═".repeat(55));
console.log(" [Conversation Policy Engine Report]");
console.log("═".repeat(55));
console.log(`통과: ${pass}건 / 실패: ${fail}건 / 총: ${pass+fail}건`);
console.log(`정확도: ${(pass/(pass+fail)*100).toFixed(1)}%`);
if (fails.length) {
  console.log("\n실패 케이스:");
  fails.forEach(f => console.log(`  - ${f}`));
}
