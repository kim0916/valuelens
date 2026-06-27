/**
 * AIChatView Integration Test — 실서버 연동 대화 100개
 * Node.js에서 ConversationEngine을 직접 실행
 * searchComplexFromSupabase → 실서버 URL로 패치
 */

// ── 환경 패치: Node.js에서 상대경로 API 호출 → 실서버로 ──
const BASE = "https://valuelens-rouge.vercel.app";
const _origFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => {
  if (typeof url === "string" && url.startsWith("/api/")) {
    url = BASE + url;
  }
  return _origFetch(url, opts);
};

import { createConversationEngine } from './src/engine/ConversationEngine.js';
import { createConversationState, summarizeState } from './src/engine/conversationState.js';
import { RESPONSE_TYPES } from './src/engine/responseGenerator.js';
import { ACTIONS } from './src/engine/conversationPolicy.js';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const engine = createConversationEngine();

// ─────────────────────────────────────────────
// 대화 러너
// ─────────────────────────────────────────────
async function runConv(label, turns, expect = {}) {
  let state = createConversationState();
  const log = [];
  let questionCount = 0;
  let contextLost   = false;
  let prevComplex   = null;
  const Q_ACTIONS = new Set([ACTIONS.ASK_AREA, ACTIONS.ASK_COMPLEX, ACTIONS.SHOW_CANDIDATES]);

  for (const input of turns) {
    await sleep(220);
    const { state: ns, response } = await engine.process(input, state);
    const action = response._debug?.action;
    const intent = response._debug?.intent;

    if (Q_ACTIONS.has(action)) questionCount++;

    // Context 유실 감지: 단지 있었는데 사라졌을 때
    if (prevComplex && !ns.currentComplex && action !== ACTIONS.RESET && action !== ACTIONS.UPDATE_REGION) {
      contextLost = true;
    }
    prevComplex = ns.currentComplex?.complex_name || null;
    state = ns;

    log.push({
      input,
      intent,
      action,
      type:    response.type,
      text:    response.text?.replace(/\*\*/g,"").slice(0, 55),
      complex: ns.currentComplex?.complex_name || null,
      area:    ns.currentArea || null,
    });
  }

  const reached = {
    complex: !!state.currentComplex,
    area:    !!state.currentArea,
  };

  // 기대값 검증
  const issues = [];
  if (expect.complex && !reached.complex) issues.push("단지미도달");
  if (expect.area    && !reached.area)    issues.push("평형미도달");
  if (expect.maxQ    !== undefined && questionCount > expect.maxQ) issues.push(`질문${questionCount}회`);
  if (expect.context && contextLost) issues.push("Context유실");

  const ok = issues.length === 0;
  const icon = ok ? "✅" : "❌";
  const last = log[log.length - 1];
  const summary = `단지:${reached.complex?"O":"X"} 평형:${reached.area?"O":"X"} Q:${questionCount}회`;
  const issueStr = issues.length ? ` [${issues.join(",")}]` : "";
  console.log(`${icon} ${label} — ${summary}${issueStr}`);
  if (!ok) {
    log.forEach(l => console.log(`     "${l.input}" → ${l.action}(${l.intent}) | ${l.text || ""}`));
  }
  return { label, ok, reached, questionCount, contextLost, issues, log };
}

// ─────────────────────────────────────────────
// 테스트 케이스 100개
// ─────────────────────────────────────────────
console.log("═".repeat(60));
console.log("  AIChatView Integration Test — 100 Conversations");
console.log("═".repeat(60));

const results = [];
async function t(label, turns, expect) {
  const r = await runConv(label, turns, expect);
  results.push(r);
  await sleep(100);
}

// ━━ 카테고리 1: 즉시 분석 (단지+평형 동시) ━━
console.log("\n[1] 즉시분석 — 단지+평형 동시입력 (질문 0회 목표)");
await t("잠실엘스 84",          ["잠실엘스 84"],           {complex:true, area:true, maxQ:0});
await t("헬리오시티 84",        ["헬리오시티 84"],          {complex:true, area:true, maxQ:0});
await t("반포자이 84",          ["반포자이 84"],            {complex:true, area:true, maxQ:0});
await t("래미안대치팰리스 84",  ["래미안대치팰리스 84"],    {complex:true, area:true, maxQ:0});
await t("마래푸 84",            ["마래푸 84"],              {complex:true, area:true, maxQ:0});
await t("잠실엘스 국평",        ["잠실엘스 국평"],          {complex:true, area:true, maxQ:0});
await t("잠실엘스 34평",        ["잠실엘스 34평"],          {complex:true, area:true, maxQ:0});
await t("헬리오시티 59",        ["헬리오시티 59"],          {complex:true, area:true, maxQ:0});
await t("동래래미안아이파크 84",["동래래미안아이파크 84"],   {complex:true, area:true, maxQ:0});
await t("84 잠실엘스",          ["84 잠실엘스"],            {complex:true, area:true, maxQ:0});
await t("잠실엘스 84㎡",        ["잠실엘스 84㎡"],          {complex:true, area:true, maxQ:0});
await t("잠실엘스 84평",        ["잠실엘스 84평"],          {complex:true, area:true, maxQ:0});
await t("국평 잠실엘스",        ["국평 잠실엘스"],          {complex:true, area:true, maxQ:0});
await t("34평 반포자이",        ["34평 반포자이"],          {complex:true, area:true, maxQ:0});
await t("고덕그라시움 84",      ["고덕그라시움 84"],         {complex:true, area:true, maxQ:0});

// ━━ 카테고리 2: 단지 → 평형 선택 (2턴) ━━
console.log("\n[2] 2턴 — 단지 검색 후 평형 선택");
await t("잠실엘스 → 84",       ["잠실엘스","84"],          {complex:true, area:true, maxQ:1});
await t("잠실엘스 → 59",       ["잠실엘스","59"],          {complex:true, area:true, maxQ:1});
await t("헬리오시티 → 84",     ["헬리오시티","84"],        {complex:true, area:true, maxQ:1});
await t("반포자이 → 84",       ["반포자이","84"],          {complex:true, area:true, maxQ:1});
await t("마래푸 → 34평",       ["마래푸","34평"],          {complex:true, area:true, maxQ:1});
await t("더샵송도아크베이 → 84",["더샵송도아크베이","84"],   {complex:true, area:true, maxQ:1});
await t("파크리오 → 84",       ["파크리오","84"],          {complex:true, area:true, maxQ:1});
await t("수성구 래미안 → 84",  ["수성구 래미안","84"],     {complex:true, maxQ:1});
await t("래미안수성 → 국평",   ["래미안수성","국평"],      {complex:true, maxQ:1});
await t("헬리오시티 → 1번",    ["헬리오시티","1번"],       {complex:true, maxQ:1});

// ━━ 카테고리 3: Context 유지 — 면적 변경 ━━
console.log("\n[3] Context 유지 — 면적 변경");
await t("잠실엘스84 → 아니 59",         ["잠실엘스 84","아니 59"],      {complex:true, area:true, context:true, maxQ:0});
await t("헬리오 84 → 59로 바꿔",        ["헬리오시티 84","59로 바꿔"],  {complex:true, area:true, context:true, maxQ:0});
await t("잠실엘스84 → 아니 25평",       ["잠실엘스 84","아니 25평"],    {complex:true, area:true, context:true, maxQ:0});
await t("반포자이84 → 59로 변경",       ["반포자이 84","59로 변경"],    {complex:true, context:true});
await t("잠실엘스 → 84 → 119",         ["잠실엘스","84","119"],        {complex:true, area:true, context:true, maxQ:1});

// ━━ 카테고리 4: Context 유지 — 후속 질문 ━━
console.log("\n[4] Context 유지 — 후속 질문 (전세/매수/최근거래)");
await t("잠실엘스84 → 전세는?",          ["잠실엘스 84","전세는?"],        {complex:true, area:true, context:true});
await t("헬리오84 → 최근 거래는?",       ["헬리오시티 84","최근 거래는?"], {complex:true, area:true, context:true});
await t("반포자이84 → 지금 사도 돼?",    ["반포자이 84","지금 사도 돼?"],  {complex:true, area:true, context:true});
await t("잠실엘스84 → 전세 → 매수",      ["잠실엘스 84","전세는?","지금 사도 돼?"], {complex:true, area:true, context:true});
await t("마래푸84 → 최근거래 → 전세",    ["마래푸 84","최근 거래는?","전세는?"], {complex:true, area:true, context:true});

// ━━ 카테고리 5: 후보 선택 ━━
console.log("\n[5] 후보 선택 — 복수 단지");
await t("송도 더샵 → 1번",   ["송도 더샵 84","1번"],  {complex:true, maxQ:0});
await t("송도 더샵 → 2번",   ["송도 더샵 84","2번"],  {complex:true, maxQ:0});
await t("해운대 자이 → 1번", ["해운대 자이 84","1번"],{complex:true, maxQ:0});
await t("래미안 대치 → 응",  ["대치 래미안 84","응"],  {complex:true, maxQ:0});

// ━━ 카테고리 6: 다른 후보 (그거 말고) ━━
console.log("\n[6] 다른 후보 — 그거 말고 / 다른 거");
await t("송도더샵 → 그거 말고",   ["송도 더샵","그거 말고"], {maxQ:0});
await t("래미안 → 다른 거",       ["래미안 대치","다른 거"], {maxQ:0});
await t("잠실 → 다른 거 → 1번",  ["잠실 자이","다른 거","1번"], {maxQ:0});

// ━━ 카테고리 7: 지역 변경 ━━
console.log("\n[7] 지역 변경");
await t("잠실엘스84 → 송도로",     ["잠실엘스 84","송도로 바꿔"],  {});
await t("반포자이84 → 강남으로",   ["반포자이 84","강남으로 변경"],{});
await t("헬리오84 → 부산으로",     ["헬리오시티 84","부산으로"],   {});
await t("빈 상태 → 수성구로",      ["수성구로 바꿔"],               {});

// ━━ 카테고리 8: 초기화 ━━
console.log("\n[8] 초기화 — 다시 / 처음부터");
await t("잠실엘스84 → 다시",       ["잠실엘스 84","다시"],        {});
await t("헬리오시티84 → 처음부터", ["헬리오시티 84","처음부터"],  {});
await t("3턴 후 다시",            ["잠실엘스","84","다시"],       {});

// ━━ 카테고리 9: 부정 (아니) ━━
console.log("\n[9] 부정 — 아니");
await t("단지 없을 때 아니",      ["아니"],                        {});
await t("후보 대기 중 아니",      ["송도 더샵","아니"],            {maxQ:0});
await t("단지 확정 후 아니",      ["잠실엘스","아니"],             {});
await t("면적 확정 후 아니",      ["잠실엘스 84","아니"],          {complex:true});

// ━━ 카테고리 10: 브랜드 표기 변형 ━━
console.log("\n[10] 브랜드 표기 변형");
await t("레미안 대치팰리스 84",   ["레미안 대치팰리스 84"],       {complex:true, area:true, maxQ:0});
await t("더샾 송도 아크베이 84",  ["더샾 송도 아크베이 84"],      {complex:true, maxQ:0});
await t("이편한세상 도마 84",     ["이편한세상 도마 84"],          {complex:true, maxQ:1});
await t("헤링턴 두정역 84",       ["헤링턴 두정역 84"],            {complex:true, maxQ:1});

// ━━ 카테고리 11: 지역 포함 자연어 ━━
console.log("\n[11] 지역+단지 자연어");
await t("수성구 래미안 84",       ["수성구 래미안 84"],            {complex:true, maxQ:0});
await t("부산 동래 래미안 84",    ["부산 동래 래미안 84"],         {complex:true, maxQ:0});
await t("대전 도마 포레나 84",    ["대전 도마 포레나 84"],         {complex:true, maxQ:0});
await t("광명 자이위브 84",       ["광명 자이위브 84"],            {complex:true, maxQ:0});
await t("의정부 자이 84",         ["의정부 자이 84"],              {complex:true, maxQ:0});

// ━━ 카테고리 12: 인사 / 초기 ━━
console.log("\n[12] 인사 / 빈 입력");
await t("안녕",              ["안녕"],          {});
await t("안녕하세요",        ["안녕하세요"],    {});
await t("시작",              ["시작"],          {});

// ━━ 카테고리 13: 없는 단지 (실패 처리) ━━
console.log("\n[13] 없는 단지 — 실패 응답 품질");
await t("없는단지이름abc",         ["없는단지이름abc123"],         {});
await t("알 수 없는 지역+단지",   ["강릉 무지개마을 84"],         {});

// ━━ 카테고리 14: 3턴+ 멀티턴 ━━
console.log("\n[14] 멀티턴 — 3턴 이상");
await t("잠실엘스→84→전세→다시→헬리오84",
  ["잠실엘스 84","전세는?","다시","헬리오시티 84"],
  {complex:true, area:true, context:true});
await t("반포→84→아니59→전세→매수",
  ["반포자이","84","아니 59","전세는?","지금 사도 돼?"],
  {complex:true, context:true});
await t("수성구→84→전세→그거말고",
  ["수성구 래미안","84","전세는?","그거 말고"],
  {complex:true, context:true});

// ━━ 카테고리 15: 확인 (응/맞아) ━━
console.log("\n[15] 확인 — 응 / 맞아");
await t("잠실엘스 → 응",         ["잠실엘스","응"],          {complex:true});
await t("후보 대기 → 맞아",      ["송도 더샵","맞아"],        {complex:true});
await t("잠실엘스84 → 응",       ["잠실엘스 84","응"],        {complex:true, area:true});

// ━━ 카테고리 16: 숫자 단독 평형 선택 ━━
console.log("\n[16] 숫자 단독 평형");
await t("잠실엘스 → 84(숫자)",    ["잠실엘스","84"],    {complex:true, area:true, maxQ:1});
await t("헬리오시티 → 59(숫자)",  ["헬리오시티","59"],  {complex:true, area:true, maxQ:1});
await t("파크리오 → 84(숫자)",    ["파크리오","84"],    {complex:true, area:true, maxQ:1});

// ━━ 카테고리 17: 가격 관련 질문 ━━
console.log("\n[17] 가격 질문");
await t("잠실엘스84 → 얼마면 괜찮아?", ["잠실엘스 84","얼마면 괜찮아?"],    {complex:true, area:true});
await t("헬리오84 → 적정가 알려줘",    ["헬리오시티 84","적정가 알려줘"],   {complex:true, area:true});

// ━━ 결과 집계 ━━
await sleep(500);
console.log("\n" + "═".repeat(60));
console.log(" [AIChatView Integration Report]");
console.log("═".repeat(60));

const total      = results.length;
const passed     = results.filter(r => r.ok).length;
const complexOk  = results.filter(r => r.reached.complex).length;
const areaOk     = results.filter(r => r.reached.area).length;
const noCtxLost  = results.filter(r => !r.contextLost).length;
const avgQ       = results.reduce((s,r)=>s+r.questionCount,0) / total;

// 후속 질문 성공률 (카테고리 4)
const followUpTests = results.filter(r => r.label.includes("전세") || r.label.includes("매수") || r.label.includes("최근거래"));
const followUpOk    = followUpTests.filter(r => r.reached.complex && !r.contextLost).length;

console.log(`\n연결 완료 여부:   ${passed}/${total} (${(passed/total*100).toFixed(1)}%) 시나리오 통과`);
console.log(`Context 유지율:   ${noCtxLost}/${total} (${(noCtxLost/total*100).toFixed(1)}%)`);
console.log(`평균 질문 수:     ${avgQ.toFixed(2)}회 (목표: 2회 이하)`);
console.log(`단지 도달률:      ${complexOk}/${total} (${(complexOk/total*100).toFixed(1)}%)`);
console.log(`평형 도달률:      ${areaOk}/${total} (${(areaOk/total*100).toFixed(1)}%)`);
console.log(`후속 질문 성공:   ${followUpOk}/${followUpTests.length} (${followUpTests.length?((followUpOk/followUpTests.length)*100).toFixed(0):0}%)`);

// 카테고리별 성공률
const cats = [
  ["즉시분석",     results.slice(0,15)],
  ["2턴",         results.slice(15,25)],
  ["면적변경",     results.slice(25,30)],
  ["후속질문",     results.slice(30,35)],
  ["후보선택",     results.slice(35,39)],
  ["다른후보",     results.slice(39,42)],
  ["지역변경",     results.slice(42,46)],
  ["초기화",       results.slice(46,49)],
  ["부정",         results.slice(49,53)],
  ["브랜드변형",   results.slice(53,57)],
  ["지역자연어",   results.slice(57,62)],
  ["인사",         results.slice(62,65)],
  ["없는단지",     results.slice(65,67)],
  ["멀티턴",       results.slice(67,70)],
  ["확인",         results.slice(70,73)],
  ["숫자평형",     results.slice(73,76)],
  ["가격질문",     results.slice(76,78)],
];

console.log("\n카테고리별 성공률:");
for (const [name, cat] of cats) {
  if (!cat.length) continue;
  const ok = cat.filter(r=>r.ok).length;
  const bar = "█".repeat(Math.round(ok/cat.length*10)) + "░".repeat(10-Math.round(ok/cat.length*10));
  console.log(`  ${name.padEnd(10)} ${bar} ${ok}/${cat.length}`);
}

// 실패 케이스
const failed = results.filter(r=>!r.ok);
if (failed.length > 0) {
  console.log(`\n발견된 버그 (${failed.length}건):`);
  // 이슈 유형별 집계
  const issueMap = {};
  failed.forEach(r => r.issues.forEach(i => { issueMap[i] = (issueMap[i]||0)+1; }));
  Object.entries(issueMap).sort((a,b)=>b[1]-a[1])
    .forEach(([k,v]) => console.log(`  ${k}: ${v}건`));
  console.log("\n  TOP 10 실패:");
  failed.slice(0,10).forEach(r => console.log(`  - ${r.label}: ${r.issues.join(", ")}`));
}

console.log("\n다음 작업:");
console.log("  1. Phase 3 — 상담 말투 + 결과 해설 레이어");
console.log("  2. 후속 질문 추천 ('이런 것도 물어보세요')");
console.log("  3. 1000개 QA 데이터 구축");
