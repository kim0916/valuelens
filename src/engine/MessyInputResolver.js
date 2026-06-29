import { sqmToPyeong } from '../constants/areaMapping.js';
/**
 * src/engine/MessyInputResolver.js
 * 사용자 자유 입력 → entity 추출 → pendingContext 누적
 */

import { parseAreaInput } from '../constants/areaMapping.js';

// ── 브랜드 별칭 ──
const BRAND_ALIAS = {
  '래미안': ['레미안','래미얀','레미얀'],
  '자이':   ['쟈이','지에이'],
  '동부아파트': ['동부아파트','동부'],
  '헬리오시티': ['헬리오시티','헬리오'],
  '리센츠': ['리센츠','리센스','리센쓰'],
  '한보':   ['한보아파트','한보'],
};

function normalizeBrand(text) {
  let t = text;
  for (const [canonical, aliases] of Object.entries(BRAND_ALIAS)) {
    for (const alias of aliases) {
      // 이미 canonical이 들어있으면 스킵
      if (t.includes(canonical)) break;
      if (t.includes(alias)) {
        t = t.replace(alias, canonical);
        break;
      }
    }
  }
  // "동부아파트아파트" 같은 중복 방지
  t = t.replace(/아파트아파트/g, '아파트').replace(/타운타운/g, '타운');
  return t;
}

// ── STOP_WORDS ──
const STOP_WORDS = new Set([
  '아파트','적정가','매수','전세','시세','분석','봐줘','알려줘','어때','살까','살만해',
  '가격','얼마','몰라','모름','그냥','시세로','실거래로','추천','좋은','좋아','있잖아',
  '거기','그거','해줘','확인','조회','보여줘','전체','전부','보여','이야','인데','이면',
  '이고','니가','알아서','로','은','는','이','가','을','를','에','의','도','만',
  '부터','까지','에서','으로','아무거나','뭐든','뭐나','어디든','아무데나',
  '실거주로','실거주','주로','그냥해줘','진행','시작','해줘요',
  // 추천 조건어 (단지명으로 오인 방지)
  '학군','학교','신혼부부','신혼','역세권','투자','갭투자','실거주','가족','애들',
  '아이','키우기','좋은곳','좋은데','어디가','어디','살까','곳','데','추천',
]);

const REGION_KW = ['송도','해운대','강남','강북','강서','강동','판교','분당','일산','광교','마포','용산','성수'];

// ── 지역/동 추출 ──
function extractRegion(text) {
  const dongs = [...text.matchAll(/([가-힣]{1,4}동)/g)].map(m => m[1]);
  const gus   = [...text.matchAll(/([가-힣]{2,4}[구군])/g)].map(m => m[1]);
  const rh    = REGION_KW.find(r => text.includes(r)) || null;
  return { dong: dongs[0] || null, sigungu: gus[0] || null, regionHint: rh };
}

// ── 단지명 추출 ──
function extractComplexName(text) {
  const normalized = normalizeBrand(text);
  // 알려진 브랜드 직접 매칭 먼저
  for (const canonical of Object.keys(BRAND_ALIAS)) {
    if (normalized.includes(canonical)) return canonical;
  }
  // 일반 추출
  let cleaned = normalized
    .replace(/[0-9]+\s*평형?대?/g, ' ')
    .replace(/[0-9]+\s*(?:㎡|m2)/gi, ' ')
    .replace(/[0-9]+\s*억/g, ' ')
    .replace(/[가-힣]{1,4}동/g, ' ')
    .replace(/[가-힣]{2,4}[구군]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const tokens = cleaned.split(/\s+/).filter(tok =>
    tok.length >= 2 &&
    !STOP_WORDS.has(tok) &&
    !/^[0-9]/.test(tok) &&
    !/^[가-힣]{1}$/.test(tok)
  );
  if (!tokens.length) return null;
  return tokens.sort((a, b) => b.length - a.length)[0];
}

// ── 면적 추출 ──
function extractArea(text) {
  const pats = [
    /전용\s*([0-9]+(?:\.[0-9]+)?)\s*(?:㎡|m2)?/i,
    /([0-9]+(?:\.[0-9]+)?)\s*(?:㎡|m2)/i,
    /([0-9]+)\s*평형?대?/,
  ];
  for (const p of pats) {
    const m = text.match(p);
    if (m) { const r = parseAreaInput(m[0]); if (r) return r; }
  }
  // 숫자만 (다른 숫자와 구분: 억 단위 제외)
  const cleaned = text.replace(/[0-9]+\s*억/g, '');
  const n = cleaned.match(/\b([0-9]+)\b/);
  if (n) {
    const v = parseInt(n[1]);
    if (v >= 10 && v <= 200) { const r = parseAreaInput(String(v)); if (r) return r; }
  }
  return null;
}

// ── 목적 추출 ──
function extractPurpose(text) {
  if (/매수|살까|살만|사도\s*돼|살지|buy|투자/i.test(text)) return 'buy';
  if (/전세/i.test(text)) return 'jeonse';
  if (/적정가|시세|가격|얼마|봐줘|분석|확인|fair/i.test(text)) return 'fair';
  return null;
}

// ── noPrice ──
const NO_PRICE_RE = /몰라|모름|모르겠|없어|없음|패스|그냥|skip|상관없|시세로|실거래로|실거래\s*기준|최근\s*거래로|니가\s*알아서|알아서\s*해줘|시세\s*몰라|가격\s*몰라|잘\s*모르/i;
function extractNoPrice(text) { return NO_PRICE_RE.test(text); }

// ── 예산 ──
function extractBudget(text) {
  const m = text.match(/([0-9]+(?:\.[0-9]+)?)\s*억/);
  return m ? Math.round(parseFloat(m[1]) * 10000) : null;
}

// ── 추천 ──
const RECOMMEND_RE = /추천|좋은\s*데|어디가\s*좋|어디\s*살까|골라줘|찾아줘|좋은\s*곳|살만한\s*데/i;
function isRecommend(text) { return RECOMMEND_RE.test(text); }

// ── 추천 조건 ──
function extractRecommendCondition(text) {
  const c = [];
  if (/애|아이|아기|초등|중학|학군|학교|키우기/i.test(text)) c.push('family');
  if (/신혼|새집|신축/i.test(text)) c.push('newlywed');
  if (/역세권|지하철|역\s/i.test(text)) c.push('subway');
  if (/학원가?/i.test(text)) c.push('academy');
  if (/투자|갭/i.test(text)) c.push('investment');
  if (/실거주|실입주/i.test(text)) c.push('live');
  return c.length ? c : null;
}

// ── 일반 질문 ──
const GENERAL_RE = /계약|등기부|전세\s*사기|갭투자|재건축|리모델링|공시지가|취득세|양도세|층수|탑층|저층|몇\s*층/i;
function isGeneral(text) { return GENERAL_RE.test(text); }

/**
 * 메인 함수
 */
export function resolveMessyInput(text, existingContext = {}) {
  const t = text.trim();

  const region    = extractRegion(t);
  const cq        = extractComplexName(t);
  const area      = extractArea(t);
  const purpose   = extractPurpose(t);
  const budget    = extractBudget(t);
  const noPrice   = extractNoPrice(t);
  const recommend = isRecommend(t);
  const general   = isGeneral(t);
  const rcond     = extractRecommendCondition(t);

  // noPrice=true이고 purpose 없으면 기본값 'fair'
  const effectivePurpose = purpose || (noPrice ? 'fair' : null);

  const merged = {
    dong:               existingContext.dong         || region.dong,
    sigungu:            existingContext.sigungu      || region.sigungu,
    regionHint:         existingContext.regionHint   || region.regionHint,
    complexQuery:       existingContext.complexQuery  || cq,
    areaSqm:            existingContext.areaSqm      || area?.areaSqm  || null,
    inputPyeong:        existingContext.inputPyeong  || area?.inputPyeong || null,
    purpose:            existingContext.purpose      || effectivePurpose,
    budget:             existingContext.budget       || budget,
    noPrice:            existingContext.noPrice      || noPrice,
    currentPrice:       existingContext.currentPrice !== undefined
                          ? existingContext.currentPrice
                          : (noPrice ? null : undefined),
    isRecommend:        existingContext.isRecommend  || recommend || (rcond != null && !cq),
    recommendCondition: existingContext.recommendCondition || rcond,
    isGeneral:          general,
  };

  const nextAction = decideNextAction(merged);
  return { merged, nextAction };
}

function decideNextAction(ctx) {
  if (ctx.isGeneral)   return { type: 'general_question' };
  if (ctx.isRecommend) return { type: 'recommend' };

  if (!ctx.complexQuery) {
    if (ctx.dong || ctx.regionHint || ctx.sigungu)
      return { type: 'ask', field: 'complex',
        message: `${ctx.dong || ctx.regionHint}의 어떤 단지를 찾으시나요?` };
    return { type: 'pass_to_ce' };
  }

  if (!ctx.purpose)
    return { type: 'ask', field: 'purpose',
      message: `${ctx.complexQuery}에서 무엇을 확인할까요?` };

  if (ctx.purpose === 'jeonse') return { type: 'not_supported' };

  if (!ctx.areaSqm) {
    // 지역 정보 없으면 CE로 패스 → CE가 검색 후 지역 질문 처리
    if (!ctx.dong && !ctx.sigungu && !ctx.regionHint)
      return { type: 'pass_to_ce' };
    return { type: 'ask', field: 'area',
      message: `${ctx.complexQuery}의 몇 평형을 확인할까요?\n예: 25평, 84㎡` };
  }

  // 적정가: 가격 질문 없이 바로 confirm_analysis (실거래 중앙값 자동 사용)
  // 매수(buy)는 나중에 별도 처리
  if (ctx.currentPrice === undefined && !ctx.noPrice && ctx.purpose === 'buy') {
    const pyeong = ctx.inputPyeong || sqmToPyeong(ctx.areaSqm).pyeong;
    const loc = [ctx.sigungu?.split(' ').slice(-1)[0], ctx.dong].filter(Boolean).join(' ');
    return { type: 'ask', field: 'price',
      message: `${loc ? loc + ' ' : ''}${ctx.complexQuery} ${pyeong}평 매수 분석을 진행할게요.\n현재 매물 가격을 알고 계시나요?` };
  }

  const pyeong = ctx.inputPyeong || sqmToPyeong(ctx.areaSqm).pyeong;
  const loc = [ctx.sigungu?.split(' ').slice(-1)[0], ctx.dong].filter(Boolean).join(' ');
  const purposeKr = ctx.purpose === 'buy' ? '매수 분석' : '적정가';
  const summary = `${loc ? loc + ' ' : ''}${ctx.complexQuery} ${pyeong}평 ${purposeKr}을 분석해드리겠습니다.`;
  return { type: 'confirm_analysis', summary };
}

export function debugResolve(text, ctx = {}) {
  const { merged: m, nextAction: na } = resolveMessyInput(text, ctx);
  return { input: text, extracted: m, nextAction: na };
}
