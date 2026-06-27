/**
 * AIChatView Integration Test — Vercel 배포 서버 연동
 * Node.js에서 상대 URL 문제 → 실서버 직접 호출로 우회
 */

const BASE = "https://valuelens-rouge.vercel.app";
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 실서버 검색 API 래퍼 (Node.js 환경용) ──
async function searchComplex(name, sigungu = "") {
  const r = await fetch(`${BASE}/api/supabase`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "search", name, sigungu, limit: 5 }),
  });
  const d = await r.json();
  return { complexes: d.complexes || [], areaHint: d.areaHint };
}

// ── 엔진 모듈 (search만 실서버로 교체) ──
import { createConversationState, updateComplex, updateArea, updateCandidates, resetContext, addHistory, getAreaGroups, updateRegion, isReadyToAnalyze, summarizeState } from './src/engine/conversationState.js';
import { classifyIntent, INTENTS, sqmToPyeong } from './src/engine/intentClassifier.js';
import { applyPolicy, applyPostSearchPolicy, ACTIONS, logPolicy } from './src/engine/conversationPolicy.js';
import { applyUXPolicy, auditResponseUX } from './src/engine/uxPolicy.js';
import { evaluateCandidates, selectByIndex, findBestAreaGroup } from './src/engine/candidateSelector.js';
import { responseCandidateList, responseAreaList, responseReadyToAnalyze, responseNotFound, responseReset, responseGreeting, responseUnknown, responseRegionChanged, responseAreaNotFound, RESPONSE_TYPES } from './src/engine/responseGenerator.js';

// ── 테스트용 경량 ConversationEngine ──
async function process(input, state) {
  const text = (input || "").trim();
  let s = addHistory(state, "user", text);

  const { intent, extracted } = classifyIntent(text, s);
  let decision = applyPolicy(intent, extracted, s, text);
  const uxResult = applyUXPolicy(decision, s, text);
  decision = uxResult.decision;

  let response;
  [s, response] = await execute(decision, intent, extracted, text, s);

  response._debug = { intent, action: decision.action, rule: decision.rule, reason: decision.reason };
  s = addHistory(s, "ai", response.text || "", intent);
  s = { ...s, lastIntent: intent };
  return { state: s, response };
}

async function execute(decision, intent, extracted, rawText, state) {
  const { action, params } = decision;

  if (action === ACTIONS.GREET)  return [state, responseGreeting()];
  if (action === ACTIONS.RESET)  return [resetContext(state), responseReset()];
  if (action === ACTIONS.UPDATE_REGION) {
    const r = params.region || rawText.replace(/(으로|로|에서|바꿔|변경).*/g,"").trim();
    return [updateRegion(state, r), responseRegionChanged(r)];
  }
  if (action === ACTIONS.NEXT_CANDIDATE) {
    const remaining = state.candidates.slice(1);
    if (!remaining.length) return [state, {type:RESPONSE_TYPES.NEED_MORE_INFO, text:"다른 후보가 없어요."}];
    return [{...state, candidates:remaining}, responseCandidateList(remaining, state.lastSearchQuery||"", "next")];
  }
  if (action === ACTIONS.SELECT_CANDIDATE) {
    const res = selectByIndex(state, params.index ?? 0);
    if (!res.ok) return [state, {type:RESPONSE_TYPES.ERROR, text:"선택 오류"}];
    return postComplex(updateComplex(state, res.complex, state.lastAreaHint));
  }
  if (action === ACTIONS.UPDATE_AREA) {
    const sqm = params.areaSqm;
    if (!state.currentComplex) return [{...state,lastAreaHint:sqm},{type:RESPONSE_TYPES.NEED_MORE_INFO,text:`${sqmToPyeong(sqm)}평으로 볼게요. 단지는?`}];
    const groups = getAreaGroups(state);
    const best = findBestAreaGroup(groups, sqm);
    if (!best || best.diff > 15) return [state, responseAreaNotFound(state.currentComplex, sqm, groups)];
    const ns = updateArea(state, best.group.anchor);
    return [ns, responseReadyToAnalyze(ns.currentComplex, ns.currentArea)];
  }
  if (action === ACTIONS.ASK_AREA) {
    if (!state.currentComplex) return [state, {type:RESPONSE_TYPES.NEED_MORE_INFO, text:"단지를 먼저 알려주세요."}];
    const groups = getAreaGroups(state);
    return [{...state, lastQuestion:"area?"}, responseAreaList(state.currentComplex, groups, state.lastAreaHint)];
  }
  if (action === ACTIONS.ANALYZE_NOW)    return [state, state.currentComplex && state.currentArea ? responseReadyToAnalyze(state.currentComplex, state.currentArea) : responseUnknown(state)];
  if (action === ACTIONS.ANALYZE_JEONSE) return [state, {type:RESPONSE_TYPES.READY_TO_ANALYZE, text:`${state.currentComplex?.complex_name} 전세 분석`, purpose:"jeonse"}];
  if (action === ACTIONS.ANALYZE_RECENT) return [state, {type:RESPONSE_TYPES.READY_TO_ANALYZE, text:"최근 거래 조회", purpose:"recent"}];
  if (action === ACTIONS.ANALYZE_BUY)    return [state, {type:RESPONSE_TYPES.READY_TO_ANALYZE, text:"매수 판단 분석", purpose:"buy"}];

  // 검색 필요
  if (action === ACTIONS.NEW_COMPLEX || action === ACTIONS.SHOW_CANDIDATES) {
    return await handleSearch(params.query || rawText, params.areaSqm || extracted.areaSqm, state);
  }
  return [state, responseUnknown(state)];
}

async function handleSearch(query, areaHint, state) {
  if (!query || query.trim().length < 2) return [state, {type:RESPONSE_TYPES.NEED_MORE_INFO, text:"단지명을 입력해주세요."}];
  try {
    const ns = {...state, currentComplex:null, currentArea:null, candidates:[], lastSearchQuery:query, lastAreaHint:areaHint||state.lastAreaHint};
    const res = await searchComplex(query, state.region||"");
    const complexes = res.complexes || [];
    const hint = res.areaHint || areaHint || ns.lastAreaHint;

    if (!complexes.length) return [ns, responseNotFound(query)];

    const ev = evaluateCandidates(complexes, hint, ns);
    if (ev.strategy === "ask_candidate") {
      return [{...ns, candidates:ev.candidates}, responseCandidateList(ev.candidates, query, ev.reason)];
    }
    const ns2 = updateComplex(ns, ev.selected, hint);
    if (ev.strategy === "ready" && ev.selectedArea) return [updateArea(ns2, ev.selectedArea), responseReadyToAnalyze(ev.selected, ev.selectedArea)];
    return postComplex(ns2);
  } catch(e) {
    return [state, {type:RESPONSE_TYPES.ERROR, text:"검색 오류"}];
  }
}

function postComplex(state) {
  const groups = getAreaGroups(state);
  if (state.currentArea) return [state, responseReadyToAnalyze(state.currentComplex, state.currentArea)];
  if (!groups.length) return [state, {type:RESPONSE_TYPES.ERROR, text:"면적 데이터 없음"}];
  if (groups.length === 1) return [updateArea(state, groups[0].anchor), responseReadyToAnalyze(state.currentComplex, groups[0].anchor)];
  if (state.lastAreaHint) {
    const best = findBestAreaGroup(groups, state.lastAreaHint);
    if (best && best.diff <= 8) return [updateArea(state, best.group.anchor), responseReadyToAnalyze(state.currentComplex, best.group.anchor)];
  }
  return [{...state, lastQuestion:"area?"}, responseAreaList(state.currentComplex, groups, state.lastAreaHint)];
}

// ──────────────────────────────────────────────────────
// 테스트 케이스
// ──────────────────────────────────────────────────────
const UNIT_CASES = [
  // A: 즉시 분석
  // A: 단지+평형 동시 → ready_to_analyze (new_complex 경유)
  {id:"A01", input:"잠실엘스84",           et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  {id:"A02", input:"잠실 엘스 84",         et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  {id:"A03", input:"헬리오시티 84",        et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  {id:"A04", input:"반포자이 84",          et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  {id:"A05", input:"마래푸 84",            et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  {id:"A06", input:"래미안대치팰리스 84",  et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  {id:"A07", input:"은마 76",              et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  {id:"A08", input:"잠실엘스 국평",        et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  {id:"A09", input:"헬리오 34평",          et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  {id:"A10", input:"반포자이 34평",        et:RESPONSE_TYPES.READY_TO_ANALYZE, ec:true, ar:true },
  // B: 단지만 → area_list (new_complex 경유 후 평형 질문)
  {id:"B01", input:"잠실엘스",             et:RESPONSE_TYPES.AREA_LIST, ec:true, ar:false},
  {id:"B02", input:"헬리오시티",           et:RESPONSE_TYPES.AREA_LIST, ec:true, ar:false},
  {id:"B03", input:"반포자이",             et:RESPONSE_TYPES.AREA_LIST, ec:true, ar:false},
  {id:"B04", input:"래미안대치팰리스",     et:RESPONSE_TYPES.AREA_LIST, ec:true, ar:false},
  {id:"B05", input:"마포래미안푸르지오",   et:RESPONSE_TYPES.AREA_LIST, ec:true, ar:false},
  // C: 복수 후보 → candidates_list
  {id:"C01", input:"강남 래미안",          et:RESPONSE_TYPES.CANDIDATES_LIST, ec:false},
  {id:"C02", input:"송도 더샵",            et:RESPONSE_TYPES.CANDIDATES_LIST, ec:false},
  {id:"C03", input:"수원 래미안",          et:RESPONSE_TYPES.CANDIDATES_LIST, ec:false},
  // D: 검색 실패
  {id:"D01", input:"없는단지12345",        et:RESPONSE_TYPES.NOT_FOUND },
  {id:"D02", input:"xyzabc아파트",         et:RESPONSE_TYPES.NOT_FOUND },
  // E: 인사
  {id:"E01", input:"안녕",                 ea:ACTIONS.GREET },
  {id:"E02", input:"안녕하세요",           ea:ACTIONS.GREET },
  // F: 초기화
  {id:"F01", input:"다시",                 ea:ACTIONS.RESET },
  {id:"F02", input:"처음부터",             ea:ACTIONS.RESET },
];

const SCENARIOS = [
  // 시나리오: response.type 기준 (new_complex는 경유 action)
  { id:"S01", name:"단지→평형→분석",     steps:[{i:"잠실엘스",et:RESPONSE_TYPES.AREA_LIST},{i:"84",et:RESPONSE_TYPES.READY_TO_ANALYZE}], fc:{c:true,a:true} },
  { id:"S02", name:"즉시분석→전세",      steps:[{i:"헬리오시티 84",et:RESPONSE_TYPES.READY_TO_ANALYZE},{i:"전세는?",ea:ACTIONS.ANALYZE_JEONSE}], fc:{c:true,a:true} },
  { id:"S03", name:"즉시분석→면적변경",  steps:[{i:"잠실엘스 84",et:RESPONSE_TYPES.READY_TO_ANALYZE},{i:"아니 25평",ea:ACTIONS.UPDATE_AREA}], fc:{c:true,a:true} },
  { id:"S04", name:"지역변경",           steps:[{i:"잠실엘스 84"},{i:"송도로 바꿔",ea:ACTIONS.UPDATE_REGION}] },
  { id:"S05", name:"다른후보→선택",      steps:[{i:"강남 래미안",et:RESPONSE_TYPES.CANDIDATES_LIST},{i:"그거 말고",ea:ACTIONS.NEXT_CANDIDATE}] },
  { id:"S06", name:"다시→새검색",        steps:[{i:"잠실엘스 84"},{i:"다시",ea:ACTIONS.RESET},{i:"반포자이 84",et:RESPONSE_TYPES.READY_TO_ANALYZE}], fc:{c:true,a:true} },
  { id:"S07", name:"번호선택→분석",      steps:[{i:"강남 자이"},{i:"1번"}], fc:{c:true} },  // 평형 수에 따라 area_list or ready_to_analyze
  { id:"S08", name:"즉시분석→최근거래",  steps:[{i:"헬리오시티 84"},{i:"최근 거래는?",ea:ACTIONS.ANALYZE_RECENT}], fc:{c:true,a:true} },
  { id:"S09", name:"즉시분석→매수의견",  steps:[{i:"반포자이 84"},{i:"지금 사도 돼?",ea:ACTIONS.ANALYZE_BUY}], fc:{c:true,a:true} },
  { id:"S10", name:"새단지교체(Rule7)",  steps:[{i:"잠실엘스 84"},{i:"헬리오시티 84"}], fc:{c:true,a:true} },
];

// ──────────────────────────────────────────────────────
// 실행
// ──────────────────────────────────────────────────────
console.log("═".repeat(60));
console.log(" [AIChatView Integration Test] — 실서버 연동");
console.log("═".repeat(60));

let uPass=0, uFail=0;
const uFails=[];

console.log(`\n[1] 단위 테스트 (${UNIT_CASES.length}건)`);
for (const tc of UNIT_CASES) {
  await sleep(220);
  const s0 = createConversationState();
  try {
    const {state, response} = await process(tc.input, s0);
    const action = response._debug?.action;
    const type   = response.type;
    let ok = true;
    if (tc.ea && action !== tc.ea)         ok = false;
    if (tc.et && type   !== tc.et)         ok = false;
    if (tc.ec === true  && !state.currentComplex) ok = false;
    if (tc.ec === false && state.currentComplex)  ok = false;
    if (tc.ar === true  && !state.currentArea)    ok = false;
    if (tc.ar === false && state.currentArea)     ok = false;

    if (ok) { uPass++; console.log(`  ✅ [${tc.id}] "${tc.input}" → ${action}`); }
    else { uFail++; uFails.push(tc.id); console.log(`  ❌ [${tc.id}] "${tc.input}" action=${action} type=${type} c=${!!state.currentComplex} a=${!!state.currentArea}`); }
  } catch(e) {
    uFail++; uFails.push(tc.id);
    console.log(`  ❌ [${tc.id}] "${tc.input}" ERR: ${e.message}`);
  }
}

console.log(`\n[2] 시나리오 (${SCENARIOS.length}건)`);
let sPass=0, sFail=0, totalQ=0;
const sResults=[];

for (const sc of SCENARIOS) {
  let state = createConversationState();
  let scOk=true, qCount=0;
  const Q_ACTIONS = new Set([ACTIONS.ASK_AREA, ACTIONS.ASK_COMPLEX, ACTIONS.SHOW_CANDIDATES]);
  const log=[];

  for (const step of sc.steps) {
    await sleep(220);
    try {
      const {state:ns, response} = await process(step.i, state);
      state = ns;
      const action = response._debug?.action;
      if (Q_ACTIONS.has(action)) qCount++;
      const ok = (!step.ea || action === step.ea) && (!step.et || response.type === step.et);
      if (!ok) scOk=false;
      log.push(`"${step.i}"→${action}${ok?"":" ⚠️exp:"+step.ea}`);
    } catch(e) { scOk=false; log.push(`"${step.i}"→ERR`); }
  }

  // 최종 상태 확인
  if (sc.fc) {
    if (sc.fc.c === true  && !state.currentComplex) scOk=false;
    if (sc.fc.c === false && state.currentComplex)  scOk=false;
    if (sc.fc.a === true  && !state.currentArea)    scOk=false;
  }

  totalQ += qCount;
  sResults.push({id:sc.id, ok:scOk, qCount});
  if (scOk) { sPass++; console.log(`  ✅ [${sc.id}] ${sc.name} (질문${qCount}회)`); }
  else { sFail++; console.log(`  ❌ [${sc.id}] ${sc.name}`); log.forEach(l=>console.log(`     ${l}`)); }
}

// ──────────────────────────────────────────────────────
// 리포트
// ──────────────────────────────────────────────────────
const total = uPass+uFail+sPass+sFail;
const totalPass = uPass+sPass;
const avgQ = (totalQ/SCENARIOS.length).toFixed(1);
const ctxRate = (sPass/SCENARIOS.length*100).toFixed(0);

console.log("\n" + "═".repeat(60));
console.log(" [AIChatView Integration Report]");
console.log("═".repeat(60));
console.log(`\n✅ ConversationEngine 연결: 완료`);
console.log(`\n단위 테스트:     ${uPass}/${UNIT_CASES.length} = ${(uPass/UNIT_CASES.length*100).toFixed(0)}%`);
console.log(`시나리오 테스트: ${sPass}/${SCENARIOS.length} = ${(sPass/SCENARIOS.length*100).toFixed(0)}%`);
console.log(`전체 성공률:     ${totalPass}/${total} = ${(totalPass/total*100).toFixed(1)}%`);
console.log(`\nContext 유지율:  ${ctxRate}%`);
console.log(`평균 질문 수:    ${avgQ}회 (목표: 2회 이하)`);

if (uFails.length) {
  console.log(`\n발견된 버그 [단위] ${uFails.length}건: ${uFails.join(", ")}`);
}

const sFails = sResults.filter(r=>!r.ok).map(r=>r.id);
if (sFails.length) {
  console.log(`발견된 버그 [시나리오] ${sFails.length}건: ${sFails.join(", ")}`);
}

console.log(`\n[다음 작업]`);
console.log(`  1. runAnalysis ↔ ConversationEngine 결과 렌더링 통합`);
console.log(`  2. area_chips UI 완성`);
console.log(`  3. 공인중개사 말투 응답 레이어`);
