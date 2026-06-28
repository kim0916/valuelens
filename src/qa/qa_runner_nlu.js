/**
 * ValueLens NLU QA Runner v1.0
 * 대상: classifyUserIntent(text, entities, state)
 * 실행: node src/qa/qa_runner_nlu.js
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const nlu = require(path.join(__dirname, 'nlu_bundle_cjs.js'));
const { classifyUserIntent } = nlu;
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'nluQA.json'), 'utf-8'));

let pass=0, fail=0;
const fails=[], catStats={};

for (const q of raw.qa) {
  const {id,category,userInput,entities={},state={},expectedIntent,mustNotBe=[],note}=q;
  if (!catStats[category]) catStats[category]={pass:0,fail:0};
  let status,reason,got;
  try {
    const r = classifyUserIntent(userInput, entities, state);
    got = r.intent;
    if (got !== expectedIntent) { status='FAIL'; reason=`intent='${got}' (기대:'${expectedIntent}')`; }
    else if (mustNotBe.includes(got)) { status='FAIL'; reason=`mustNotBe 위반: ${got}`; }
    else { status='PASS'; reason=''; }
  } catch(e) { status='FAIL'; reason=`예외: ${e.message}`; got='ERROR'; }
  catStats[category][status.toLowerCase()]++;
  if (status==='PASS') pass++;
  else { fail++; fails.push({id,category,input:userInput,got,expected:expectedIntent,reason,note}); }
}

const W=66;
const pct=Math.round(pass/raw.totalCount*100);
const bar='█'.repeat(Math.round(pass/raw.totalCount*20)).padEnd(20,'░');
console.log('='.repeat(W));
console.log(' ValueLens NLU QA Runner — classifyUserIntent 단위 테스트');
console.log('='.repeat(W));
console.log(`총 ${raw.totalCount}개  |  ✅ PASS ${pass}  ❌ FAIL ${fail}`);
console.log(`진행률: [${bar}] ${pct}%`);
console.log('-'.repeat(W));
for (const [c,s] of Object.entries(catStats)) {
  const t=s.pass+s.fail;
  console.log(`${s.fail===0?'✅':'❌'} ${c.padEnd(16)} ${String(s.pass).padStart(3)}/${String(t).padStart(3)} pass`);
}
if (fails.length) {
  console.log('\n'+'─'.repeat(W));
  console.log(`❌ 실패 ${fails.length}개 상세`);
  console.log('─'.repeat(W));
  for (const f of fails) {
    console.log(`  ${f.id} [${f.category}]`);
    console.log(`    입력: "${f.input}"`);
    console.log(`    결과: ${f.got}  기대: ${f.expected}`);
    console.log(`    원인: ${f.reason}`);
    if (f.note) console.log(`    메모: ${f.note}`);
  }
}
console.log('='.repeat(W));
console.log(`최종: PASS ${pass} / FAIL ${fail} / 총 ${raw.totalCount}`);
process.exit(fail > 0 ? 1 : 0);
