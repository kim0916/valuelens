// api/screener.js
// AI 검토 후보 (Screener) — realestate_price_summary 기반 1차 필터
// ⚠️ 계산 로직 변경 금지 / raw 테이블 조회 금지 / AI 적정가 엔진 미변경
import { createClient } from '@supabase/supabase-js';

const ENV = {
  url:  process.env.SUPABASE_URL,
  anon: process.env.SUPABASE_ANON_KEY,
};

let supabase;
try {
  supabase = createClient(ENV.url, ENV.anon);
} catch (e) {
  console.error('[screener] createClient 실패:', e);
}

// ────────────────────────────────────────────────
// 점수 함수 (각 함수 분리 → 향후 가중치 조정 용이)
// ────────────────────────────────────────────────

// ① 예산 적합도 (30점)
function scoreBudget({ saleAvg, budget, totalBudget }) {
  if (!saleAvg || !totalBudget) return 0;
  if (saleAvg > totalBudget * 1.05) return 0;           // 예산 5% 초과 → 0
  if (saleAvg <= budget) return 30;                      // 예산 이하 → 만점
  // 예산~예산+5% 사이 → 비례감점
  const over = (saleAvg - budget) / (totalBudget * 0.05);
  return Math.round(30 * (1 - Math.min(1, over)));
}

// ② 가격 매력도 (25점) — ValueLens 핵심: 전세가율 기반
// price_summary 단계에서는 jeonse_ratio로 실수요 견고도 근사
// (정밀 fair값은 클릭 후 매수탭 AI 엔진에서 산출)
function scoreValue({ jeonseRatio, saleAvg, rentAvg }) {
  const ratio = jeonseRatio || (rentAvg && saleAvg ? rentAvg / saleAvg : 0);
  if (!ratio) return 10; // 데이터 없으면 기본
  if (ratio >= 0.70) return 25;
  if (ratio >= 0.60) return 21;
  if (ratio >= 0.50) return 16;
  if (ratio >= 0.40) return 10;
  return 5; // 전세가율 낮음 → 투자수요 의존
}

// ③ 거래 안정성 (15점)
function scoreLiquidity({ saleCnt, rentCnt, periodYmEnd }) {
  const monthsAgo = monthDiff(periodYmEnd);
  const freshness = monthsAgo <= 3 ? 5 : monthsAgo <= 6 ? 3 : monthsAgo <= 12 ? 1 : 0;
  const vol = saleCnt >= 15 ? 7 : saleCnt >= 8 ? 5 : saleCnt >= 3 ? 3 : saleCnt >= 1 ? 1 : 0;
  const rent = rentCnt >= 5 ? 3 : rentCnt >= 2 ? 2 : rentCnt >= 1 ? 1 : 0;
  return Math.min(15, freshness + vol + rent);
}

// ④ 데이터 신뢰도 (20점)
function scoreTrust({ saleCnt, rentCnt, periodYmEnd }) {
  const monthsAgo = monthDiff(periodYmEnd);
  let score = 0;
  score += saleCnt >= 15 ? 8 : saleCnt >= 8 ? 6 : saleCnt >= 3 ? 3 : saleCnt >= 1 ? 1 : 0;
  score += rentCnt >= 8  ? 6 : rentCnt >= 3  ? 4 : rentCnt >= 1 ? 2 : 0;
  score += monthsAgo <= 3 ? 6 : monthsAgo <= 6 ? 3 : monthsAgo <= 12 ? 1 : 0;
  return Math.min(20, score);
}

// ⑤ 목적 적합도 (10점) — purpose별 가중치 분기
function scorePurpose({ purpose, jeonseRatio, buildYear, saleCnt }) {
  const age = new Date().getFullYear() - (Number(buildYear) || 2000);
  if (purpose === 'live') {
    // 실거주: 실수요(전세가율) + 신축 선호
    let s = 4;
    if (jeonseRatio >= 0.55) s += 3;
    if (age <= 10) s += 3;
    else if (age <= 20) s += 2;
    return Math.min(10, s);
  }
  if (purpose === 'invest') {
    // 투자: 전세가율 적정 구간 + 거래량
    let s = 3;
    if (jeonseRatio >= 0.45 && jeonseRatio <= 0.70) s += 4;
    if (saleCnt >= 5) s += 3;
    return Math.min(10, s);
  }
  if (purpose === 'move') {
    // 갈아타기: 실거주+자금효율
    let s = 4;
    if (jeonseRatio >= 0.50) s += 3;
    if (age <= 15) s += 3;
    return Math.min(10, s);
  }
  if (purpose === 'jeonse') {
    // 전세끼고 매수: 전세가율 높을수록 유리
    let s = 2;
    if (jeonseRatio >= 0.65) s += 6;
    else if (jeonseRatio >= 0.55) s += 4;
    else if (jeonseRatio >= 0.45) s += 2;
    return Math.min(10, s);
  }
  return 5;
}

// 총점 산출
function calcAiScore(params) {
  const budget    = scoreBudget(params);
  const value     = scoreValue(params);
  const liquidity = scoreLiquidity(params);
  const trust     = scoreTrust(params);
  const purpose   = scorePurpose(params);
  const total     = budget + value + liquidity + trust + purpose;

  return {
    total: Math.min(100, total),
    breakdown: { budget, value, liquidity, trust, purpose },
    stars: {
      budget:    toStars(budget,    30),
      value:     toStars(value,     25),
      liquidity: toStars(liquidity, 15),
      trust:     toStars(trust,     20),
      purpose:   toStars(purpose,   10),
    },
  };
}

// 점수 → 별점 (5점 만점)
function toStars(score, max) {
  return Math.round((score / max) * 5);
}

// period_ym_end → 몇 달 전인지
function monthDiff(ymStr) {
  if (!ymStr) return 99;
  const ym = String(ymStr).replace('-', '');
  const y = parseInt(ym.slice(0, 4));
  const m = parseInt(ym.slice(4, 6));
  const now = new Date();
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
}

// 만원 → 억 표시
function won(man) {
  if (!man) return '—';
  const uk = Math.floor(man / 10000);
  const rest = man % 10000;
  if (uk > 0 && rest > 0) return `${uk}억 ${rest.toLocaleString()}만`;
  if (uk > 0) return `${uk}억`;
  return `${man.toLocaleString()}만`;
}

// ────────────────────────────────────────────────
// AI 선정 이유 / 검토 포인트 / 한줄 요약
// ────────────────────────────────────────────────

function buildReasons({ saleAvg, jeonseRatio, saleCnt, rentCnt, budget, buildYear, scoreBreakdown }) {
  const reasons = [];
  const age = new Date().getFullYear() - (Number(buildYear) || 2000);

  if (saleAvg && saleAvg <= budget)
    reasons.push(`예산 조건 충족 (현재가 ${won(saleAvg)})`);

  if (jeonseRatio >= 0.60)
    reasons.push(`전세가율 양호 (${(jeonseRatio * 100).toFixed(0)}%) — 실수요 기반 견고`);
  else if (jeonseRatio >= 0.50)
    reasons.push(`전세가율 보통 (${(jeonseRatio * 100).toFixed(0)}%)`);

  if (saleCnt >= 8)
    reasons.push(`최근 거래량 충분 (${saleCnt}건)`);
  else if (saleCnt >= 3)
    reasons.push(`최근 거래 확인 가능 (${saleCnt}건)`);

  if (saleCnt >= 5 && rentCnt >= 3)
    reasons.push('데이터 신뢰도 높음 — 매매·전세 모두 충분한 표본');

  if (age <= 10)
    reasons.push(`신축 단지 (${age}년차) — 관리 부담 적음`);

  return reasons.slice(0, 4);
}

function buildCautions({ buildYear, saleCnt, jeonseRatio, saleAvg, budget, totalBudget }) {
  const age = new Date().getFullYear() - (Number(buildYear) || 2000);
  const cautions = [];

  if (age >= 30)
    cautions.push(`${age}년차 구축 — 재건축 진행 여부 확인 필요`);
  else if (age >= 20)
    cautions.push(`${age}년차 아파트 — 수선 이력·관리비 확인 권장`);

  if (saleCnt < 3)
    cautions.push(`최근 거래량 부족 (${saleCnt}건) — 시세 정확도 낮을 수 있음`);

  if (jeonseRatio > 0 && jeonseRatio < 0.40)
    cautions.push(`전세가율 낮음 (${(jeonseRatio * 100).toFixed(0)}%) — 투자수요 의존 단지`);

  if (saleAvg && totalBudget && saleAvg > budget * 0.92 && saleAvg <= totalBudget)
    cautions.push('예산 대비 가격이 촉박 — 취득세·부대비용 별도 확인 필요');

  return cautions.slice(0, 3);
}

function buildSummary({ aiScore, saleCnt, jeonseRatio, purpose, cautions }) {
  if (aiScore >= 82) return '현재 조건에서 가장 균형이 좋은 후보입니다.';
  if (aiScore >= 72 && purpose === 'live') return '실거주 목적이라면 우선적으로 검토할 만한 후보입니다.';
  if (aiScore >= 72 && purpose === 'invest') return '투자 조건과 부합하는 후보입니다. 매수탭에서 정밀 분석을 권장합니다.';
  if (saleCnt < 3) return '거래량이 적어 시세 정확도가 낮을 수 있습니다. 추가 확인을 권장합니다.';
  if (jeonseRatio > 0 && jeonseRatio < 0.40) return '가격 수준은 적정하나 실수요 기반을 추가로 확인하세요.';
  if (cautions.length >= 2) return '조건은 근접하나 일부 검토 포인트가 있습니다. 매수탭에서 정밀 확인 후 판단하세요.';
  return '예산과 조건이 근접한 후보입니다. 매수탭에서 정밀 분석 후 판단하세요.';
}

function buildReviewLabel(aiScore, cautions) {
  if (cautions.length >= 2) return '🟠 신중 검토';
  if (aiScore >= 75) return '🟢 우선 검토';
  if (aiScore >= 55) return '🟡 비교 검토';
  return '🟠 신중 검토';
}

// ────────────────────────────────────────────────
// 평형 변환
// ────────────────────────────────────────────────
function toPyeong(areaSqm) {
  return Math.round(Number(areaSqm) / 3.3058);
}

// ────────────────────────────────────────────────
// price_summary 컬럼명 안전 추출 (다양한 컬럼명 대응)
// 실제 DB 컬럼명 확인 전 안전망
// ────────────────────────────────────────────────
function extractSaleAvg(row) {
  return row.sale_avg_man       // 추정 1
    || row.avg_sale_price_man   // 추정 2
    || row.sale_price_avg       // 추정 3
    || row.avg_price_man        // 추정 4
    || null;
}
function extractRentAvg(row) {
  return row.rent_avg_man
    || row.avg_rent_price_man
    || row.jeonse_avg_man
    || row.avg_deposit_man
    || null;
}
function extractJeonseRatio(row) {
  // DB에 있으면 직접 사용, 없으면 계산
  if (row.jeonse_ratio) return Number(row.jeonse_ratio);
  const s = extractSaleAvg(row);
  const r = extractRentAvg(row);
  if (s && r) return r / s;
  return null;
}

// ────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용' });
    return;
  }

  const {
    budget     = 0,       // 총예산 (만원, 보유현금+대출)
    equity     = 0,       // 보유현금 (만원)
    maxLoan    = 0,       // 대출가능금액 (만원)
    income     = 0,       // 연소득 (만원, 향후 DSR 참고용)
    region     = '',      // 지역 필터 (구·동)
    pyeong     = 0,       // 평형 필터 (±7평 허용)
    purpose    = 'live',  // live / invest / move / jeonse
    limit      = 10,
  } = req.body;

  if (!supabase) {
    res.status(500).json({ error: 'Supabase 초기화 실패' });
    return;
  }

  const budgetNum     = Number(budget);
  const equityNum     = Number(equity);
  const maxLoanNum    = Number(maxLoan);
  const totalBudget   = equityNum + maxLoanNum; // 실질 구매력 상한
  const effectiveBudget = budgetNum || totalBudget;

  if (!effectiveBudget) {
    res.status(400).json({ error: '예산(budget) 또는 보유현금+대출가능금액을 입력해주세요.' });
    return;
  }

  try {
    // ── STEP 1: price_summary에서 예산 범위 후보 최대 500개 조회 ──
    // 예산의 40%~105% 범위 (너무 싼 것도 포함 → 점수에서 반영)
    let q = supabase
      .from('realestate_price_summary')
      .select('*')
      .gte('sale_avg_man', effectiveBudget * 0.35)
      .lte('sale_avg_man', effectiveBudget * 1.05)
      .order('period_ym_end', { ascending: false })
      .limit(500);

    if (region) q = q.ilike('sigungu', `%${region}%`);

    const { data: summaryRows, error: summaryErr } = await q;
    if (summaryErr) throw summaryErr;

    if (!summaryRows || summaryRows.length === 0) {
      // price_summary에 sale_avg_man 컬럼이 없을 수 있음 → 컬럼명 확인용 fallback
      const { data: sampleRow } = await supabase
        .from('realestate_price_summary')
        .select('*')
        .limit(1);

      return res.status(200).json({
        candidates: [],
        meta: {
          total_pool: 0, filtered: 0, returned: 0,
          region, budget: effectiveBudget, purpose,
          debug: {
            note: 'sale_avg_man 컬럼 없거나 데이터 없음. 아래 columns를 확인하세요.',
            availableColumns: sampleRow?.[0] ? Object.keys(sampleRow[0]) : [],
          },
        },
      });
    }

    // ── STEP 2: complexes 정보 조인 (complex_id 기준) ──
    const complexIds = [...new Set(
      summaryRows.filter(r => r.complex_id).map(r => r.complex_id)
    )];

    let complexMap = {};
    if (complexIds.length > 0) {
      const { data: complexRows } = await supabase
        .from('realestate_complexes')
        .select('id, complex_name, sigungu, legal_dong, build_year, area_list')
        .in('id', complexIds.slice(0, 300)); // 안전 limit

      if (complexRows) {
        complexRows.forEach(c => { complexMap[c.id] = c; });
      }
    }

    // ── STEP 3: 1차 필터 (평형 + 유효 데이터) ──
    let filtered = summaryRows.filter(row => {
      const saleAvg = extractSaleAvg(row);
      if (!saleAvg || saleAvg <= 0) return false; // 가격 없으면 제외

      // 평형 필터
      if (pyeong) {
        const pye = toPyeong(row.area_excl);
        if (Math.abs(pye - Number(pyeong)) > 7) return false;
      }
      return true;
    }).slice(0, 100); // 점수 산출 대상 최대 100개

    // ── STEP 4: AI 적합도 점수 산출 ──
    const scored = filtered.map(row => {
      const saleAvg     = extractSaleAvg(row);
      const rentAvg     = extractRentAvg(row);
      const jeonseRatio = extractJeonseRatio(row);
      const complex     = complexMap[row.complex_id] || {};
      const buildYear   = complex.build_year || row.build_year || null;
      const legalDong   = complex.legal_dong || row.legal_dong || '';
      const sigungu     = complex.sigungu || row.sigungu || '';
      const saleCnt     = Number(row.sale_cnt) || 0;
      const rentCnt     = Number(row.rent_cnt) || 0;

      const params = {
        saleAvg, rentAvg, jeonseRatio,
        budget: effectiveBudget, totalBudget,
        saleCnt, rentCnt,
        periodYmEnd: row.period_ym_end,
        buildYear, purpose,
      };

      const score   = calcAiScore(params);
      const reasons = buildReasons({ saleAvg, jeonseRatio, saleCnt, rentCnt, budget: effectiveBudget, buildYear, scoreBreakdown: score.breakdown });
      const cautions = buildCautions({ buildYear, saleCnt, jeonseRatio, saleAvg, budget: effectiveBudget, totalBudget });
      const summary = buildSummary({ aiScore: score.total, saleCnt, jeonseRatio, purpose, cautions });
      const reviewLabel = buildReviewLabel(score.total, cautions);

      return {
        complex_id:    row.complex_id,
        complex_name:  row.complex_name || complex.complex_name || '—',
        sigungu:       sigungu,
        legal_dong:    legalDong,
        area_excl:     Number(row.area_excl) || 0,
        pyeong:        toPyeong(row.area_excl),
        build_year:    buildYear,
        age:           buildYear ? new Date().getFullYear() - Number(buildYear) : null,
        sale_avg_man:  saleAvg,
        rent_avg_man:  rentAvg,
        jeonse_ratio:  jeonseRatio,
        sale_cnt:      saleCnt,
        rent_cnt:      rentCnt,
        period_ym_end: row.period_ym_end,
        ai_score:      score.total,
        score_breakdown: score.breakdown,
        stars:         score.stars,
        reasons,
        cautions,
        summary,
        review_label:  reviewLabel,
      };
    });

    // ── STEP 5: 정렬 → 상위 limit개 반환 ──
    const candidates = scored
      .sort((a, b) => b.ai_score - a.ai_score)
      .slice(0, Math.min(limit, 20)); // 최대 20개

    res.setHeader('Cache-Control', 's-maxage=300'); // 5분 CDN 캐시
    res.status(200).json({
      candidates,
      meta: {
        total_pool: summaryRows.length,
        filtered:   filtered.length,
        returned:   candidates.length,
        region, budget: effectiveBudget, purpose,
      },
    });

  } catch (e) {
    console.error('[screener]', e?.message || e);
    res.status(500).json({
      error: e?.message || '서버 오류',
      candidates: [],
    });
  }
}
