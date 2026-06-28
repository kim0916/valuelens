/**
 * ValueLens Conversation QA Runner
 * 자동 테스트 대상: parseIntent (레거시), _expectedAnswerType 흐름 시뮬레이션
 * 제외: ConversationEngine fetch, Supabase API, UI 렌더링
 *
 * 실행: node src/qa/qa_runner.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QA_PATH   = join(__dirname, 'conversationQA.json');

// ─────────────────────────────────────────────────────────
// parseIntent 순수 함수 (AIChatView에서 추출, 동일 로직)
// ─────────────────────────────────────────────────────────
function parsePriceInput(text) {
  if (!text) return null;
  let t = text.trim().replace(/[,\s]/g, '');
  const m1 = t.match(/^(\d+(?:\.\d+)?)억(\d+)(?:천만?)?$/);
  if (m1) {
    const uk = parseFloat(m1[1]) * 10000;
    const r  = parseInt(m1[2]);
    return Math.round(uk + (r <= 999 ? r * 1000 : r));
  }
  const m2 = t.match(/^(\d+(?:\.\d+)?)억$/);
  if (m2) return Math.round(parseFloat(m2[1]) * 10000);
  const m3 = t.match(/^(\d{4,})$/);
  if (m3) return parseInt(m3[1]);
  const m4 = t.match(/^(\d{1,3}(?:\.\d+)?)$/);
  if (m4) { const v = parseFloat(m4[1]); if (v >= 1) return Math.round(v * 10000); }
  return null;
}

function isNoPrice(text) {
  return /^(몰라|모름|모르겠|잘\s*모르|평균|실거래|기준으로|상관없|패스|skip|모르)/i.test(text.trim());
}

function parseIntent(raw) {
  const t = (raw || '').trim();
  const n = t.replace(/\s/g, '').toLowerCase();

  let intent = 'fair';
  if (/팔까|매도|팔려고|팔아야|호가|내집|내꺼|팔면/.test(n)) intent = 'sell';
  else if (/추천해줘|추천해주세요|추천좀|골라줘|골라주세요|찾아줘|찾아주세요/.test(n)) intent = 'recommend';
  else if (/예산.{0,10}(추천|아파트|단지)|\d+억.{0,5}(추천|이하|이상|안에서|정도)/.test(n)) intent = 'recommend';
  else if (/사도돼|사도될까|살만해|살만한가|살까|매수|지금사|살지/.test(n)) intent = 'buy';

  const pyeongMatch = t.match(/(\d+)\s*평/);
  const pyeong = pyeongMatch ? parseInt(pyeongMatch[1]) : null;
  const sqmMatch  = t.match(/(\d+(?:\.\d+)?)\s*(?:㎡|m²)/);
  const areaSqm = sqmMatch ? parseFloat(sqmMatch[1]) : (pyeong ? Math.round(pyeong * 3.305785) : null);

  const regionM = t.match(/([가-힣]{2,5}(?:특별시|광역시|특별자치시|도|시|구|군))(?!\w)/);
  const region  = regionM ? regionM[1] : null;
  const dongM   = t.match(/([가-힣]{2,5}동)/);
  const dong    = dongM ? dongM[1] : null;

  const price = parsePriceInput(t);
  const budget = intent === 'recommend' ? price : null;

  let complexName = null;
  if (intent !== 'recommend') {
    const dongAfter = t.match(/[가-힣]{2,5}동\s+([가-힣a-zA-Z0-9]+(?:\s+[가-힣a-zA-Z0-9]+)?)/);
    const guAfter   = t.match(/[가-힣]{2,5}[구시군]\s+([가-힣a-zA-Z0-9]+(?:\s+[가-힣a-zA-Z0-9]+)?)/);

    if (dongAfter && !/얼마|어때|사도|팔까|추천/.test(dongAfter[1])) {
      complexName = dongAfter[1].trim().replace(/\s*\d+평.*$/, '').replace(/\s*\d+㎡.*$/, '').trim();
    } else if (guAfter && !/얼마|어때|사도|팔까|추천/.test(guAfter[1])) {
      complexName = guAfter[1].trim().replace(/\s*\d+평.*$/, '').replace(/\s*\d+㎡.*$/, '').trim();
    } else {
      let cleaned = t
        .replace(/\d+억\d*(?:천만?)?/g, ' ')
        .replace(/\d+평/g, ' ')
        .replace(/\d+㎡/g, ' ')
        .replace(/\s+/g, ' ').trim();
      const tokens = cleaned.split(/\s+/).filter(tok =>
        tok.length >= 2 &&
        !/^(서울|경기|인천|부산|대구|광주|대전|울산|은|는|이|가|을|를|에|의|로|도)$/.test(tok) &&
        !/[구시군]$/.test(tok) &&
        !/^[가-힣]{1,4}동$/.test(tok) &&   // P0 fix
        tok !== dong
      );
      if (tokens.length > 0) complexName = tokens.sort((a, b) => b.length - a.length)[0];
    }
    if (complexName && /^(얼마|어때|사도|팔까|지금|현재|적정|시세|추천)$/.test(complexName)) {
      complexName = null;
    }
  }

  return { intent, complexName, region, dong, pyeong, areaSqm, price, budget };
}

// ─────────────────────────────────────────────────────────
// expectedAnswerType 흐름 시뮬레이터
// ─────────────────────────────────────────────────────────
function simulateExpectedAnswerType(userInput, eat) {
  const text = userInput.trim();

  if (eat === 'price') {
    const price = parsePriceInput(text);
    const noP   = isNoPrice(text);
    if (price) return { resolvedIntent: 'price_input',    resolvedContext: { price } };
    if (noP)   return { resolvedIntent: 'unknown_price',  resolvedContext: { price: null } };
    return       { resolvedIntent: 'price_invalid',       resolvedContext: {} };
  }

  if (eat === 'area') {
    const pyeongM = text.match(/(\d+)\s*평/);
    const sqmM    = text.match(/(\d+(?:\.\d+)?)\s*(?:㎡|m²)/);
    if (pyeongM) return { resolvedIntent: 'area_select', resolvedContext: { pyeong: parseInt(pyeongM[1]) } };
    if (sqmM)   return { resolvedIntent: 'area_select', resolvedContext: { areaSqm: parseFloat(sqmM[1]) } };
    return        { resolvedIntent: 'area_invalid', resolvedContext: {} };
  }

  if (eat === 'dong') {
    // dong 입력 → complex_name 검색 금지
    return { resolvedIntent: 'dong_search', resolvedContext: { dong: text }, searchMode: 'dong_column_only' };
  }

  if (eat === 'complex') {
    return { resolvedIntent: 'complex_search', resolvedContext: { complexName: text } };
  }

  if (eat === 'purpose') {
    if (/적정가|시세|가격/.test(text))    return { resolvedIntent: 'price_analysis', resolvedContext: {} };
    if (/매수|살까|살만/.test(text))      return { resolvedIntent: 'buy_opinion',    resolvedContext: {} };
    if (/전세/.test(text))               return { resolvedIntent: 'jeonse_info',    resolvedContext: {} };
    if (/계약|등기|체크/.test(text))     return { resolvedIntent: 'contract_check', resolvedContext: {} };
    return { resolvedIntent: 'unknown_purpose', resolvedContext: {} };
  }

  return { resolvedIntent: 'unknown', resolvedContext: {} };
}

// ─────────────────────────────────────────────────────────
// 테스트 실행
// ─────────────────────────────────────────────────────────
const INTENT_MAP = {
  // parseIntent intent → QA expectedIntent 매핑
  'fair':      ['dong_search','region_search','complex_search','price_analysis','area_select','price_input','unknown_price','complex_search_context','price_analysis_context'],
  'recommend': ['recommend'],
  'buy':       ['buy_opinion'],
  'sell':      ['sell_opinion'],
};

// parseIntent로 테스트 가능한 카테고리
const PARSE_INTENT_CATS = new Set(['region_input','complex_search','recommend']);
// eat 시뮬레이터로 테스트 가능한 카테고리
const EAT_CATS = new Set(['area_price_input','context_based_input']);

function runTests(qaData) {
  const results = { pass: 0, fail: 0, skip: 0, details: [] };

  for (const q of qaData) {
    const cat = q.category;
    let status, reason, got;

    // ── parseIntent 테스트 ──
    if (PARSE_INTENT_CATS.has(cat)) {
      const parsed = parseIntent(q.userInput);

      if (cat === 'region_input') {
        // mustNotDo: complex_name_partial_search → complexName이 없어야 함
        if (q.mustNotDo.includes('complex_name_partial_search') && parsed.complexName) {
          status = 'FAIL'; reason = `complexName='${parsed.complexName}' 추출됨 (금지)`;
        } else if (q.mustNotDo.includes('recommend_intent') && parsed.intent === 'recommend') {
          status = 'FAIL'; reason = `intent=recommend 발동 (금지)`;
        } else if (q.expectedContext.dong && parsed.dong !== q.expectedContext.dong) {
          status = 'FAIL'; reason = `dong='${parsed.dong}' (기대:'${q.expectedContext.dong}')`;
        } else {
          status = 'PASS'; reason = '';
        }
      }

      else if (cat === 'complex_search') {
        const expCx = q.expectedContext.complexName;
        if (q.mustNotDo.includes('recommend_intent') && parsed.intent === 'recommend') {
          status = 'FAIL'; reason = `intent=recommend 발동 (금지)`;
        } else if (expCx && parsed.complexName !== expCx) {
          status = 'FAIL'; reason = `complexName='${parsed.complexName}' (기대:'${expCx}')`;
        } else {
          status = 'PASS'; reason = '';
        }
      }

      else if (cat === 'recommend') {
        if (parsed.intent !== 'recommend') {
          status = 'FAIL'; reason = `intent='${parsed.intent}' (기대:recommend)`;
        } else {
          status = 'PASS'; reason = '';
        }
      }
    }

    // ── expectedAnswerType 시뮬레이터 테스트 ──
    else if (EAT_CATS.has(cat)) {
      const eat = q.currentState.expectedAnswerType;
      const sim = simulateExpectedAnswerType(q.userInput, eat);

      if (sim.resolvedIntent !== q.expectedIntent) {
        status = 'FAIL'; reason = `resolvedIntent='${sim.resolvedIntent}' (기대:'${q.expectedIntent}')`;
      } else if (eat === 'dong' && sim.searchMode !== 'dong_column_only') {
        status = 'FAIL'; reason = `dong 검색인데 searchMode 누락`;
      } else if (q.expectedContext.price !== undefined && sim.resolvedContext.price !== q.expectedContext.price) {
        status = 'FAIL'; reason = `price=${sim.resolvedContext.price} (기대:${q.expectedContext.price})`;
      } else {
        status = 'PASS'; reason = '';
      }
    }

    // ── 수동 QA 필요 카테고리 ──
    else {
      status = 'SKIP'; reason = '수동 QA 필요 (DB 연동/UI)';
      results.skip++;
      results.details.push({ id: q.id, cat, input: q.userInput, status, reason });
      continue;
    }

    if (status === 'PASS') results.pass++;
    else results.fail++;
    results.details.push({ id: q.id, cat, input: q.userInput, status, reason });
  }

  return results;
}

// ─────────────────────────────────────────────────────────
// 메인 실행
// ─────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(QA_PATH, 'utf-8'));
const results = runTests(raw.qa);

// 출력
const W = 62;
console.log('='.repeat(W));
console.log(' ValueLens Conversation QA Runner');
console.log('='.repeat(W));
console.log(`총 ${raw.totalCount}개  |  ✅ PASS ${results.pass}  ❌ FAIL ${results.fail}  ⏭ SKIP ${results.skip}`);
console.log('-'.repeat(W));

// 카테고리별 집계
const catStats = {};
for (const d of results.details) {
  if (!catStats[d.cat]) catStats[d.cat] = { pass:0, fail:0, skip:0 };
  catStats[d.cat][d.status.toLowerCase()]++;
}
for (const [cat, s] of Object.entries(catStats)) {
  const total = s.pass + s.fail + s.skip;
  const bar = s.skip === total ? '⏭' : s.fail === 0 ? '✅' : '❌';
  console.log(`${bar} ${cat.padEnd(25)} ${s.pass}/${total-s.skip} pass  ${s.skip > 0 ? `(${s.skip} skip)` : ''}`);
}

// 실패 케이스 상세
const fails = results.details.filter(d => d.status === 'FAIL');
if (fails.length > 0) {
  console.log('\n' + '-'.repeat(W));
  console.log('❌ 실패 케이스 상세');
  console.log('-'.repeat(W));
  for (const f of fails) {
    console.log(`  ${f.id} [${f.cat}]`);
    console.log(`    입력: "${f.input}"`);
    console.log(`    원인: ${f.reason}`);
  }
}

console.log('='.repeat(W));
console.log(`결과: PASS ${results.pass} / FAIL ${results.fail} / SKIP ${results.skip}`);
