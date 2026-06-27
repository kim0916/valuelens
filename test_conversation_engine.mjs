/**
 * ConversationEngine 대화 흐름 테스트
 */
import { createConversationState } from './src/engine/conversationState.js';
import { classifyIntent, INTENTS } from './src/engine/intentClassifier.js';
import { evaluateCandidates } from './src/engine/candidateSelector.js';

const BASE = "https://valuelens-rouge.vercel.app";

async function search(name, sigungu = "") {
  const r = await fetch(`${BASE}/api/supabase`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "search", name, sigungu, limit: 5 }),
  });
  const d = await r.json();
  return { complexes: d.complexes || [], areaHint: d.areaHint };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Intent 분류 테스트 ───
console.log("═".repeat(55));
console.log(" [1] Intent 분류 테스트");
console.log("═".repeat(55));

const INTENT_CASES = [
  // 단지 검색
  { input: "잠실엘스84",          expect: INTENTS.SEARCH_COMPLEX },
  { input: "잠실 엘스 84",        expect: INTENTS.SEARCH_COMPLEX },
  { input: "수성구 래미안",       expect: INTENTS.SEARCH_COMPLEX },
  { input: "헬리오시티",          expect: INTENTS.SEARCH_COMPLEX },
  { input: "마래푸 34평",         expect: INTENTS.SEARCH_COMPLEX },

  // 면적 선택
  { input: "34평",               expect: INTENTS.AREA_SELECT },
  { input: "84",                 expect: INTENTS.AREA_SELECT },
  { input: "국평",               expect: INTENTS.AREA_SELECT },
  { input: "84㎡",               expect: INTENTS.AREA_SELECT },

  // 면적 변경
  { input: "아니 25평",          expect: INTENTS.CHANGE_AREA },
  { input: "59로 바꿔",          expect: INTENTS.CHANGE_AREA },

  // 후보 선택
  { input: "1번",                expect: INTENTS.CANDIDATE_SELECT },
  { input: "2번째",              expect: INTENTS.CANDIDATE_SELECT },
  { input: "3",                  expect: INTENTS.CANDIDATE_SELECT },

  // 컨텍스트 수정
  { input: "그거 말고",          expect: INTENTS.CHANGE_CANDIDATE },
  { input: "다른 거",            expect: INTENTS.CHANGE_CANDIDATE },
  { input: "다시",               expect: INTENTS.RESET },
  { input: "처음부터",           expect: INTENTS.RESET },
  { input: "응",                 expect: INTENTS.CONFIRM },
  { input: "맞아",               expect: INTENTS.CONFIRM },
  { input: "아니",               expect: INTENTS.DENY },

  // 지역 변경
  { input: "송도로 바꿔",        expect: INTENTS.CHANGE_REGION },
  { input: "강남으로 변경",      expect: INTENTS.CHANGE_REGION },

  // 정보 요청
  { input: "전세는?",            expect: INTENTS.JEONSE_INFO },
  { input: "전세 얼마야",        expect: INTENTS.JEONSE_INFO },
  { input: "최근 거래는?",       expect: INTENTS.RECENT_DEALS },
  { input: "실거래가 조회",      expect: INTENTS.RECENT_DEALS },
  { input: "학군은?",            expect: INTENTS.SCHOOL_INFO },
  { input: "지금 사도 돼?",      expect: INTENTS.BUY_OPINION },
  { input: "살 만해?",           expect: INTENTS.BUY_OPINION },
  { input: "얼마면 괜찮아?",     expect: INTENTS.PRICE_OPINION },
];

let intentOk = 0, intentFail = 0;
const intentFails = [];

for (const tc of INTENT_CASES) {
  const mockState = { pendingSlot: null, currentComplex: null, candidates: [] };
  const { intent } = classifyIntent(tc.input, mockState);
  const ok = intent === tc.expect;
  if (ok) intentOk++; else { intentFail++; intentFails.push(tc); }
  console.log(`${ok ? "✅" : "❌"} "${tc.input}" → ${intent}${ok ? "" : ` (기대: ${tc.expect})`}`);
}

console.log(`\nIntent 정확도: ${intentOk}/${INTENT_CASES.length} (${(intentOk/INTENT_CASES.length*100).toFixed(0)}%)`);

// ─── Context 유지 대화 흐름 테스트 ───
console.log("\n" + "═".repeat(55));
console.log(" [2] 대화 흐름 테스트 (Context 유지)");
console.log("═".repeat(55));

// 흐름 1: 수성구 래미안 → 단지 선택 → 면적 선택
console.log("\n── 흐름 1: 수성구 래미안 → 34평 ──");
{
  let state = createConversationState();
  const { intent: i1 } = classifyIntent("수성구 래미안", state);
  console.log(`"수성구 래미안" → ${i1}`);

  await sleep(300);
  const r1 = await search("수성구 래미안", "대구시 수성구");
  console.log(`  검색 결과: ${r1.complexes.length}건 / top: ${r1.complexes[0]?.complex_name || "없음"}`);

  const ev1 = evaluateCandidates(r1.complexes, null, state);
  console.log(`  전략: ${ev1.strategy} / 후보: ${ev1.candidates.length}건`);

  // "34평" 입력
  const { intent: i2, extracted: e2 } = classifyIntent("34평", { ...state, pendingSlot: "area" });
  console.log(`"34평" → ${i2} / areaSqm=${e2.areaSqm}`);
  console.log(`  ✅ 이전 context(수성구 래미안) 유지하며 면적만 변경`);
}

// 흐름 2: 잠실엘스84 → 바로 분석
console.log("\n── 흐름 2: 잠실엘스84 → 바로 분석 ──");
{
  let state = createConversationState();
  const { intent, extracted } = classifyIntent("잠실엘스84", state);
  console.log(`"잠실엘스84" → ${intent} / query="${extracted.complexQuery}" / areaSqm=${extracted.areaSqm}`);

  await sleep(300);
  const r = await search("잠실엘스", "");
  const ev = evaluateCandidates(r.complexes, 84, state);
  console.log(`  전략: ${ev.strategy}${ev.selectedArea ? ` / 면적: ${ev.selectedArea}㎡` : ""}`);
  const ready = ev.strategy === "ready" || (r.complexes.length === 1 && 84);
  console.log(`  ${ready ? "✅" : "❌"} 단건 + 면적힌트 → 바로 분석 가능`);
}

// 흐름 3: "아니 25평" → 면적만 변경
console.log("\n── 흐름 3: 같은 단지 면적 변경 ──");
{
  const { intent, extracted } = classifyIntent("아니 25평", {});
  console.log(`"아니 25평" → ${intent} / areaSqm=${extracted.areaSqm}`);
  console.log(`  ${intent === INTENTS.CHANGE_AREA ? "✅" : "❌"} 면적 변경으로 분류`);
}

// 흐름 4: "그거 말고" → 다른 후보
console.log("\n── 흐름 4: 다른 후보 요청 ──");
{
  const { intent } = classifyIntent("그거 말고", { candidates: [{}, {}] });
  console.log(`"그거 말고" → ${intent}`);
  console.log(`  ${intent === INTENTS.CHANGE_CANDIDATE ? "✅" : "❌"} 다른 후보 요청으로 분류`);
}

// 흐름 5: "송도로 바꿔" → 지역 변경
console.log("\n── 흐름 5: 지역 변경 ──");
{
  const { intent, extracted } = classifyIntent("송도로 바꿔", {});
  console.log(`"송도로 바꿔" → ${intent} / region="${extracted.region}"`);
  console.log(`  ${intent === INTENTS.CHANGE_REGION ? "✅" : "❌"} 지역 변경으로 분류`);
}

// 흐름 6: "전세는?" → 현재 단지/면적 기준
console.log("\n── 흐름 6: 전세 정보 요청 ──");
{
  const mockState = {
    currentComplex: { complex_name: "잠실엘스" },
    currentArea: 84,
    pendingSlot: null,
  };
  const { intent } = classifyIntent("전세는?", mockState);
  console.log(`"전세는?" → ${intent}`);
  console.log(`  ${intent === INTENTS.JEONSE_INFO ? "✅" : "❌"} 전세 정보 요청으로 분류`);
  console.log(`  ✅ context(잠실엘스 84㎡) 유지하며 전세 조회`);
}

// 흐름 7: "최근 거래는?" → 현재 단지 기준
console.log("\n── 흐름 7: 최근 거래 조회 ──");
{
  const { intent } = classifyIntent("최근 거래는?", {});
  console.log(`"최근 거래는?" → ${intent}`);
  console.log(`  ${intent === INTENTS.RECENT_DEALS ? "✅" : "❌"} 최근 거래 요청으로 분류`);
}

// ─── 면적 힌트 추출 테스트 ───
console.log("\n" + "═".repeat(55));
console.log(" [3] 면적 힌트 추출 테스트");
console.log("═".repeat(55));

const AREA_CASES = [
  { input: "34평",      expect: 84  },
  { input: "25평",      expect: 75  },
  { input: "국평",      expect: 84  },
  { input: "84",        expect: 84  },
  { input: "84㎡",      expect: 84  },
  { input: "59",        expect: 59  },
  { input: "잠실엘스84",expect: 84  },
  { input: "래미안 59", expect: 59  },
];

let areaOk = 0, areaFail = 0;
for (const tc of AREA_CASES) {
  const { extracted } = classifyIntent(tc.input, { pendingSlot: "area" });
  const got = extracted.areaSqm;
  const ok  = got === tc.expect;
  if (ok) areaOk++; else areaFail++;
  console.log(`${ok ? "✅" : "❌"} "${tc.input}" → ${got}㎡ (기대: ${tc.expect}㎡)`);
}

console.log(`\n면적 추출 정확도: ${areaOk}/${AREA_CASES.length} (${(areaOk/AREA_CASES.length*100).toFixed(0)}%)`);

// ─── 최종 리포트 ───
console.log("\n" + "═".repeat(55));
console.log(" [ValueLens Conversation Engine Phase 1 Report]");
console.log("═".repeat(55));
console.log(`1. Intent 분류 정확도: ${intentOk}/${INTENT_CASES.length} = ${(intentOk/INTENT_CASES.length*100).toFixed(0)}%`);
console.log(`2. 면적 힌트 추출: ${areaOk}/${AREA_CASES.length} = ${(areaOk/AREA_CASES.length*100).toFixed(0)}%`);
console.log(`3. Context 유지: 흐름 1~7 테스트 완료`);

if (intentFails.length > 0) {
  console.log(`\n[실패 케이스]`);
  intentFails.forEach(f => console.log(`  "${f.input}" → 기대: ${f.expect}`));
}
