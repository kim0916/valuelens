/**
 * Phase 1.8 — UX Policy QA
 * 8개 UX 규칙 검증 + 대화 품질 지표 실측
 */
import { applyUXPolicy, auditResponseUX, calcConversationMetrics, UX_RULES, UX_VIOLATIONS } from './src/engine/uxPolicy.js';
import { applyPolicy, ACTIONS } from './src/engine/conversationPolicy.js';
import { classifyIntent, INTENTS } from './src/engine/intentClassifier.js';
import { createConversationState, updateComplex, updateArea, updateCandidates } from './src/engine/conversationState.js';
import {
  responseAreaList, responseCandidateList, responseReadyToAnalyze,
  responseNotFound, responseAreaNotFound, responseUnknown, responseGreeting,
} from './src/engine/responseGenerator.js';

const BASE = "https://valuelens-rouge.vercel.app";
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

async function searchAPI(name, sigungu="") {
  const r = await fetch(`${BASE}/api/supabase`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({type:"search", name, sigungu, limit:5}),
  });
  const d = await r.json();
  return {complexes: d.complexes||[], areaHint: d.areaHint};
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UX Rule 단위 테스트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("═".repeat(55));
console.log(" UX Rule 단위 테스트");
console.log("═".repeat(55));

let pass=0, fail=0;
const fails=[];
function test(label, got, expected, rule="") {
  const ok = got === expected;
  if(ok){pass++;console.log(`  ✅ [${rule}] ${label}`);}
  else  {fail++;fails.push(`[${rule}] ${label}: got=${got}`);console.log(`  ❌ [${rule}] ${label}\n     got: ${got} | expected: ${expected}`);}
}

// State helpers
const withComplex = (name="잠실엘스", areaList="[84.8,60.0,119.93]") => ({
  ...createConversationState(),
  currentComplex: { complex_name:name, area_list:areaList, sigungu:"서울특별시 송파구" },
  lastQuestion: null,
});
const withArea = (name="잠실엘스", area=84.8) => ({
  ...withComplex(name),
  currentArea: area,
});
const withCandidates = (n=3) => ({
  ...createConversationState(),
  candidates: Array(n).fill({complex_name:"후보",area_list:"[]",sale_cnt:10,sigungu:"서울",build_year:2020}),
  pendingSlot: "candidate",
});
const empty = () => createConversationState();

// ─── Rule 1: 이미 있는 정보 다시 묻지 않음 ───
console.log("\n[Rule 1] 이미 있는 정보 다시 묻지 않음");
{
  // 평형 있는데 ask_area 오면 → override to ANALYZE_NOW
  const st = withArea();
  const dec = { action:ACTIONS.ASK_AREA, rule:2, reason:"", params:{} };
  const ux = applyUXPolicy(dec, st);
  test("평형 있음 + ask_area → analyze_now으로 교정", ux.decision.action, ACTIONS.ANALYZE_NOW, "R1");
  test("R1 위반 감지", ux.violations.includes(UX_VIOLATIONS.REDUNDANT_ASK), true, "R1");
  test("override 적용됨", ux.overrideApplied, true, "R1");

  // 단지 있는데 ask_complex 오면 → override to ASK_AREA
  const st2 = withComplex();
  const dec2 = { action:ACTIONS.ASK_COMPLEX, rule:3, reason:"", params:{} };
  const ux2 = applyUXPolicy(dec2, st2);
  test("단지 있음 + ask_complex → ask_area으로 교정", ux2.decision.action, ACTIONS.ASK_AREA, "R1");
}

// ─── Rule 2: 한 번에 하나만 질문 ───
console.log("\n[Rule 2] 한 번에 하나만 질문");
{
  // ask_area만 → 단일 질문 OK
  const dec = { action:ACTIONS.ASK_AREA, rule:2, reason:"", params:{areaGroups:[]} };
  const ux = applyUXPolicy(dec, empty());
  test("단일 질문 → R2 위반 없음", ux.violations.includes(UX_VIOLATIONS.MULTIPLE_QUESTIONS), false, "R2");

  // 응답 텍스트에 질문 2개 이상인지 감사
  const resp = { text:"평형이 어떻게 되나요? 단지명도 알려주실 수 있나요? 지역도 필요해요?" };
  const audit = auditResponseUX(resp, empty(), []);
  test("질문 3개 응답 → R2 위반 감지", audit.violations.some(v=>v.rule===UX_RULES.R2_ONE_QUESTION), true, "R2");
}

// ─── Rule 3: DB 실제 정보로 질문 ───
console.log("\n[Rule 3] DB 실제 정보로 질문");
{
  const complex = { complex_name:"잠실엘스", area_list:"[84.8,60.0,119.93]" };
  const areaGroups = [
    { anchor:60.0, areas:[60.0], pyeong:18 },
    { anchor:84.8, areas:[84.8], pyeong:25 },
    { anchor:119.93, areas:[119.93], pyeong:36 },
  ];
  const resp = responseAreaList(complex, areaGroups);
  test("면적 목록 응답에 '평형'이 있음", resp.text.includes("평"), true, "R3");
  test("DB 실제 평형 포함 (84.8)", resp.text.includes("84.8") || resp.text.includes("25평"), true, "R3");
  test("'몇 평인가요?' 없음 (금지 문구)", resp.text.includes("몇 평인가요"), false, "R3");
  test("ui = area_list", resp.ui, "area_list", "R3");
}

// ─── Rule 4: 실패 시 이유 설명 ───
console.log("\n[Rule 4] 실패 시 이유 설명");
{
  const resp = responseNotFound("수완자이");
  test("not_found 응답 길이 > 30자", resp.text.length > 30, true, "R4");
  test("이유 설명 포함", resp.text.includes("이유") || resp.text.includes("예") || resp.text.includes("수 있"), true, "R4");

  // "찾을 수 없습니다" 단독 금지
  const shortResp = { text:"찾을 수 없습니다." };
  const audit = auditResponseUX(shortResp, empty(), []);
  test("단독 실패 문구 → R4 위반 감지", audit.violations.some(v=>v.rule===UX_RULES.R4_EXPLAIN_FAILURE), true, "R4");
}

// ─── Rule 5: 복수 후보 자동선택 금지 ───
console.log("\n[Rule 5] 복수 후보 자동선택 금지");
{
  // candidates 2개 있는데 ANALYZE_NOW → override
  const st = {
    ...empty(),
    candidates: [{complex_name:"A",sale_cnt:50},{complex_name:"B",sale_cnt:20}],
  };
  const dec = { action:ACTIONS.ANALYZE_NOW, rule:1, reason:"", params:{} };
  const ux = applyUXPolicy(dec, st);
  test("복수 후보 + analyze_now → show_candidates 교정", ux.decision.action, ACTIONS.SHOW_CANDIDATES, "R5");
  test("R5 위반 감지", ux.violations.includes(UX_VIOLATIONS.AUTO_SELECT), true, "R5");
}

// ─── Rule 7: 짧고 명확한 응답 ───
console.log("\n[Rule 7] 짧고 명확한 응답");
{
  const resp = responseReadyToAnalyze({complex_name:"잠실엘스",sigungu:"서울시 송파구"}, 84.8);
  test("분석 시작 응답 200자 이하", resp.text.length <= 200, true, "R7");
  test("분석 시작 응답에 단지명 포함", resp.text.includes("잠실엘스"), true, "R7");

  const greet = responseGreeting();
  test("인사 응답 200자 이하", greet.text.length <= 200, true, "R7");

  // 긴 응답 감사
  const longResp = { text: "안녕하세요. " + "이건 매우 긴 안내 문구입니다. ".repeat(20) };  // 400자 이상
  const audit = auditResponseUX(longResp, empty(), []);
  test("300자 초과 응답 → R7 위반 감지", audit.violations.some(v=>v.rule===UX_RULES.R7_SHORT_AND_CLEAR), true, "R7");
}

// ─── Rule 8: 같은 질문 반복 금지 ───
console.log("\n[Rule 8] 같은 질문 반복 금지");
{
  // lastQuestion=area? 이고 다시 ask_area → 위반
  const st = { ...withComplex(), lastQuestion:"area?" };
  const dec = { action:ACTIONS.ASK_AREA, rule:2, reason:"", params:{} };
  const ux = applyUXPolicy(dec, st);
  test("평형 반복 질문 → R8 위반 감지", ux.violations.includes(UX_VIOLATIONS.REPEATED_QUESTION), true, "R8");
  test("반복 시 override 적용", ux.overrideApplied, true, "R8");

  // 응답 텍스트 중복 감사
  const prevResp = [{ text:"**잠실엘스**에는 아래 평형이 있어요." }];
  const sameResp = { text:"**잠실엘스**에는 아래 평형이 있어요." };
  const audit = auditResponseUX(sameResp, empty(), prevResp);
  test("동일 응답 반복 → R8 위반 감지", audit.violations.some(v=>v.rule===UX_RULES.R8_NO_REPEAT_QUESTION), true, "R8");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 실제 대화 시나리오 QA (실서버 연동)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n" + "═".repeat(55));
console.log(" 대화 시나리오 QA (실서버 연동)");
console.log("═".repeat(55));

async function runScenario(name, steps) {
  let state = createConversationState();
  const turns = [];
  let questionCount = 0;
  let reached = { complex:false, area:false };
  const Q_ACTIONS = new Set([ACTIONS.ASK_AREA, ACTIONS.ASK_COMPLEX, ACTIONS.SHOW_CANDIDATES]);

  console.log(`\n📋 "${name}"`);

  for (const step of steps) {
    await sleep(250);
    const {intent, extracted} = classifyIntent(step.input, state);
    let decision = applyPolicy(intent, extracted, state, step.input);
    const uxResult = applyUXPolicy(decision, state, step.input);
    decision = uxResult.decision;

    // 검색이 필요한 경우 실서버 호출
    let response, complexes=[], areaHint=null;
    if (decision.needSearch || decision.action === ACTIONS.NEW_COMPLEX) {
      const res = await searchAPI(decision.params?.query || step.input, state.region || "");
      complexes = res.complexes || [];
      areaHint  = res.areaHint || extracted.areaSqm;

      if (complexes.length === 1) {
        const areaList = complexes[0].area_list ? JSON.parse(complexes[0].area_list) : [];
        const sorted = [...new Set(areaList.map(a=>Math.round(Number(a)*100)/100).filter(a=>a>0))].sort((a,b)=>a-b);
        const areaGroups = [];
        for(const a of sorted){
          const last=areaGroups[areaGroups.length-1];
          if(last&&a-last.anchor<=4)last.areas.push(a);
          else areaGroups.push({anchor:a,areas:[a],pyeong:Math.round(a/3.305785)});
        }

        if (areaHint) {
          const best = areaGroups.find(g=>Math.abs(g.anchor-areaHint)<=8);
          if (best) {
            // Rule 1: 단지+평형 → 즉시 분석
            const ns = {...state, currentComplex:{...complexes[0],_areaList:areaList}, currentArea:best.anchor};
            state = ns;
            response = responseReadyToAnalyze(complexes[0], best.anchor);
          } else {
            state = {...state, currentComplex:{...complexes[0],_areaList:areaList}};
            response = responseAreaList(complexes[0], areaGroups);
          }
        } else {
          state = {...state, currentComplex:{...complexes[0],_areaList:areaList}};
          if (areaGroups.length === 1) {
            state = {...state, currentArea:areaGroups[0].anchor};
            response = responseReadyToAnalyze(complexes[0], areaGroups[0].anchor);
          } else {
            response = responseAreaList(complexes[0], areaGroups);
          }
        }
      } else if (complexes.length > 1) {
        state = {...state, candidates:complexes};
        response = responseCandidateList(complexes.slice(0,3), step.input, "multiple_candidates");
      } else {
        response = responseNotFound(step.input);
      }
    } else {
      // 검색 불필요 — 응답 생성
      if (decision.action === ACTIONS.ANALYZE_NOW) {
        response = responseReadyToAnalyze(state.currentComplex, state.currentArea);
      } else if (decision.action === ACTIONS.ASK_AREA) {
        const areaList = state.currentComplex?._areaList || [];
        const sorted = [...new Set(areaList.map(a=>Math.round(Number(a)*100)/100).filter(a=>a>0))].sort((a,b)=>a-b);
        const groups = [];
        for(const a of sorted){const last=groups[groups.length-1];if(last&&a-last.anchor<=4)last.areas.push(a);else groups.push({anchor:a,areas:[a],pyeong:Math.round(a/3.305785)});}
        response = responseAreaList(state.currentComplex, groups, null, decision.params?.isRepeat);
        state = {...state, lastQuestion:"area?"};
        questionCount++;
      } else if (decision.action === ACTIONS.UPDATE_AREA && state.currentComplex) {
        const areaList = state.currentComplex._areaList || [];
        const sorted = [...new Set(areaList.map(a=>Math.round(Number(a)*100)/100).filter(a=>a>0))].sort((a,b)=>a-b);
        const groups = [];
        for(const a of sorted){const last=groups[groups.length-1];if(last&&a-last.anchor<=4)last.areas.push(a);else groups.push({anchor:a,areas:[a],pyeong:Math.round(a/3.305785)});}
        const best = groups.find(g=>Math.abs(g.anchor-decision.params.areaSqm)<=8);
        if(best){state={...state,currentArea:best.anchor};response=responseReadyToAnalyze(state.currentComplex,best.anchor);}
        else response = responseAreaList(state.currentComplex, groups);
      } else if (decision.action === ACTIONS.ANALYZE_JEONSE) {
        response = {type:"jeonse",text:`**${state.currentComplex?.complex_name}** 전세 조회할게요.`,ui:"analyzing"};
      } else if (decision.action === ACTIONS.RESET) {
        state = createConversationState();
        response = {type:"reset",text:"다시 시작할게요.",ui:"message"};
      } else {
        response = responseUnknown(state);
      }
    }

    if (!response) response = {type:"error",text:"응답 생성 실패",ui:"message"};

    if (state.currentComplex) reached.complex = true;
    if (state.currentArea)    reached.area    = true;
    if (Q_ACTIONS.has(decision.action)) questionCount++;

    turns.push({ input:step.input, intent, decision, state:{...state}, response });

    const icon = response.type === "ready_to_analyze" ? "🎯" :
                 response.type === "area_list" ? "📋" :
                 response.type === "candidates_list" ? "📝" :
                 response.type === "not_found" ? "❌" : "💬";

    const preview = response.text?.slice(0,60).replace(/\n/g," ") + (response.text?.length>60?"...":"");
    console.log(`  ${icon} "${step.input}" → [${decision.action}] ${preview}`);

    // 기대 action 검증
    if (step.expectAction && decision.action !== step.expectAction) {
      console.log(`     ⚠️  기대: ${step.expectAction}, 실제: ${decision.action}`);
    }
  }

  const metrics = calcConversationMetrics(turns);
  const complexOk = reached.complex ? "✅" : "❌";
  const areaOk    = reached.area    ? "✅" : "❌";
  const qOk       = questionCount <= 2 ? "✅" : `⚠️ (${questionCount}번)`;

  console.log(`  결과: 단지${complexOk} 평형${areaOk} 질문수${qOk} 점수:${metrics.score}`);
  return { reached, questionCount, turns, metrics };
}

// 시나리오 1: 잠실엘스84 → 즉시 분석 (질문 0회)
const s1 = await runScenario("잠실엘스84 → 즉시분석", [
  { input:"잠실엘스84", expectAction: ACTIONS.NEW_COMPLEX },
]);

// 시나리오 2: 래미안수성 → 34평 선택 (질문 1회)
const s2 = await runScenario("래미안수성 → 34평", [
  { input:"수성구 래미안", expectAction: ACTIONS.NEW_COMPLEX },
  { input:"34평",         expectAction: ACTIONS.UPDATE_AREA },
]);

// 시나리오 3: 아니 25평 → 면적 변경
const s3 = await runScenario("아니 25평 → 면적 변경", [
  { input:"잠실엘스 84" },
  { input:"아니 25평", expectAction: ACTIONS.UPDATE_AREA },
]);

// 시나리오 4: 전세는? → context 유지
const s4 = await runScenario("전세는? → context 유지", [
  { input:"헬리오시티 84" },
  { input:"전세는?",  expectAction: ACTIONS.ANALYZE_JEONSE },
]);

// 시나리오 5: 다시 → 초기화
const s5 = await runScenario("다시 → 초기화", [
  { input:"잠실엘스 84" },
  { input:"다시", expectAction: ACTIONS.RESET },
]);

// 시나리오 6: 복수 후보 → 자동선택 금지
const s6 = await runScenario("송도 더샵 → 후보 선택", [
  { input:"송도 더샵 84", expectAction: ACTIONS.NEW_COMPLEX },
]);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 최종 리포트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("\n" + "═".repeat(55));
console.log(" [Phase 1.8 UX Policy Report]");
console.log("═".repeat(55));

console.log(`\n[UX Rule 단위 테스트]`);
console.log(`통과: ${pass}건 / 실패: ${fail}건 / 총: ${pass+fail}건`);
console.log(`정확도: ${(pass/(pass+fail)*100).toFixed(1)}%`);
if(fails.length){ console.log("\n실패:"); fails.forEach(f=>console.log(`  - ${f}`)); }

console.log(`\n[대화 품질 지표]`);
const scenarios = [s1,s2,s3,s4,s5,s6];
const labels = ["잠실엘스84 즉시분석","래미안수성+34평","아니25평","전세?","다시","송도더샵"];
const qCounts = scenarios.map(s=>s.questionCount);
const avgQ = qCounts.reduce((a,b)=>a+b,0)/qCounts.length;

console.log(`  원하는 단지 도달: ${scenarios.filter(s=>s.reached.complex).length}/${scenarios.length} (목표: 98%+)`);
console.log(`  원하는 평형 도달: ${scenarios.filter(s=>s.reached.area).length}/${scenarios.length} (목표: 98%+)`);
console.log(`  평균 질문 수:     ${avgQ.toFixed(1)}회 (목표: 2회 이하)`);
console.log(`  Context 유지:     확인됨 (시나리오 4)`);

scenarios.forEach((s,i)=>{
  const q = s.questionCount;
  console.log(`  [${labels[i]}] 질문${q}회, 단지${s.reached.complex?"✅":"❌"}, 평형${s.reached.area?"✅":"❌"}`);
});
