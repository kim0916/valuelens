// ValueLens — ToolRouter.js v3
// fair: Supabase fuzzy search → 1개/여러개/0개 분기

import { analyze } from '../engine/analyze.js';
import { analyzeBuyerDecision } from '../engine/market.js';
import { acqTax, cgTax } from '../engine/tax.js';
import { recommendByBudget } from '../recommendation/recommend.js';
import { searchComplexFromSupabase, getPriceSummaryFromSupabase } from '../search/supabase.js';
import { buildAnalysisInput } from '../search/input.js';
import { sqmToPyeong, pyeongToSqm } from '../utils/pyeong.js';

function makeResult(tool, summary, rawData) {
  return { ok: true, tool, summary: { ...summary, tab: tabFor(tool) }, rawData };
}
function makeErr(tool, message) {
  return { ok: false, tool, summary: { conclusion: message, keyNumbers: [], basis: "", trust: "" }, rawData: null };
}
function tabFor(tool) {
  return { fair:"fair", buy:"buy", reco:"reco", acqTax:"tax", cgTax:"tax", loan_info:"tax", fair_select:"fair" }[tool] || "fair";
}
function won(v) {
  if (!v && v !== 0) return "-";
  const n = Number(v);
  if (n >= 10000) return `${(n/10000).toFixed(1)}억`;
  return `${n.toLocaleString()}만원`;
}

// ── 적정가 (fair) — Supabase fuzzy search ──
async function toolFairValue(memory) {
  const { complexQuery, complexName, area, region } = memory;
  const searchKw = complexQuery || complexName;
  if (!searchKw) return makeErr("fair", "분석할 아파트를 알려주세요.\n예: 동신아파트, 리센츠, 은마");

  let complexes = [];
  try {
    // 스마트 검색: "공릉동 동신" → 마지막 토큰으로 검색, 앞 토큰은 지역 힌트
    const tokens = searchKw.trim().split(/\s+/);
    const complexKw  = tokens.length >= 2 ? tokens[tokens.length - 1] : tokens[0];
    const regionHint = tokens.length >= 2 ? tokens[0] : (region || "");
    const res = await searchComplexFromSupabase(complexKw, regionHint, "");
    complexes = res.complexes || [];
    // 결과 없으면 전체 쿼리로 재시도
    if (complexes.length === 0 && tokens.length >= 2) {
      const res2 = await searchComplexFromSupabase(searchKw, region || "", "");
      complexes = res2.complexes || [];
    }
  } catch {
    return makeErr("fair", "단지 검색 중 오류가 발생했어요.");
  }

  if (complexes.length === 0)
    return makeErr("fair", `"${searchKw}"와 일치하는 단지를 찾지 못했어요.\n더 자세히 입력해주세요. 예: 공릉동 동신, 잠실 리센츠`);

  if (complexes.length > 1) {
    return {
      ok: true, tool: "fair_select",
      summary: {
        conclusion: `"${searchKw}"로 ${complexes.length}개 단지를 찾았어요. 분석할 단지를 선택해주세요.`,
        keyNumbers: [], basis: "", trust: "", tab: "fair",
      },
      rawData: { complexes, area, memory },
    };
  }

  return await runFairAnalysis(complexes[0], area, region);
}

async function runFairAnalysis(complex, area, region) {
  const areaNum  = area ? parseFloat(area) : null;
  const areaExcl = areaNum ? (area.includes("평") ? pyeongToSqm(areaNum) : areaNum) : null;
  const sigungu  = complex.sigungu || region || "";
  const name     = complex.complex_name;
  const cid      = complex.complex_id || complex.id || null;

  // ── 1차: summary API ──
  let priceSummary = null;
  try {
    priceSummary = await getPriceSummaryFromSupabase(cid, name, sigungu, areaExcl);
  } catch { /* fallback으로 진행 */ }

  // ── 2차: deals API fallback (summary 없거나 currentPrice=0) ──
  let rawInput = null;
  if (!priceSummary || !priceSummary.median_price) {
    try {
      const dealsRes = await fetch('/api/supabase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'deals', complex_id: cid, complex_name: name, sigungu }),
      });
      const dealsData = await dealsRes.json();

      let saleRaw  = dealsData.saleDeals || [];
      let rentRaw  = dealsData.rentDeals || [];

      // 면적 필터 ±3㎡
      if (areaExcl) {
        saleRaw = saleRaw.filter(d => Math.abs(Number(d.area_excl) - areaExcl) <= 3);
        rentRaw = rentRaw.filter(d => Math.abs(Number(d.area_excl) - areaExcl) <= 3
                               && (!d.monthly_man || Number(d.monthly_man) === 0));
      }

      const sale   = saleRaw.map(d => ({ ym: d.contract_ym||"", price: Number(d.deal_amount_man)||0,
                                         floor: Number(d.floor)||5, areaSqm: Number(d.area_excl)||0 }))
                             .filter(d => d.price > 0 && d.ym);
      const jeonse = rentRaw.map(d => ({ ym: d.contract_ym||"", price: Number(d.deposit_man)||0,
                                         floor: Number(d.floor)||5, areaSqm: Number(d.area_excl)||0 }))
                             .filter(d => d.price > 0 && d.ym);

      if (sale.length < 3)
        return makeErr("fair", `${name} 최근 실거래 데이터가 부족해요 (${sale.length}건).
현재 매물가를 직접 입력하면 분석할 수 있어요.`);

      rawInput = {
        sale, jeonse,
        areaSqm:      areaExcl || 0,
        region:       sigungu,
        dong:         complex.legal_dong || "",
        complexName:  name,
        buildYear:    complex.build_year || null,
        currentPrice: 0,  // buildAnalysisInput이 실거래로 자동 계산
        kbSalePrice:  0,
        kbJeonse:     0,
        tradeStatus:  { code: "OK" },
        areaOptions:  [],
      };
    } catch {
      return makeErr("fair", "실거래 데이터를 가져오는 중 오류가 발생했어요.");
    }
  }

  // ── 분석 실행 ──
  let r;
  const baseForm = { region: sigungu, dong: complex.legal_dong||"", complexName: name,
                     areaExclusive: areaExcl ? String(Math.round(areaExcl)) : "" };

  try {
    if (rawInput) {
      // deals fallback 경로
      const built = buildAnalysisInput(rawInput, baseForm, areaExcl ? Math.round(areaExcl) : 0);
      if (!built?.ff) return makeErr("fair", "분석 데이터를 구성하지 못했어요.");
      r = analyze(built.ff);
      r.jeonseCalc = built.jeonseCalc;
      r.saleCalc   = built.saleCalc;
    } else {
      // summary 경로
      const form = { ...baseForm, currentPrice: priceSummary.median_price || 0,
                     kbJeonse: priceSummary.jeonse_price || 0, buildYear: complex.build_year || 0 };
      const analysisInput = buildAnalysisInput(priceSummary, form, areaExcl);
      r = analyze(analysisInput);
    }
  } catch {
    return makeErr("fair", "적정가 계산 중 오류가 발생했어요.");
  }

  const form = { ...baseForm,
    currentPrice: r.saleCalc?.value || priceSummary?.median_price || 0,
    buildYear: complex.build_year || 0,
  };

  const fairPrice = r.fairPrice || 0;
  const curPrice  = form.currentPrice;
  const diff      = curPrice - fairPrice;
  const diffPct   = fairPrice ? Math.round((diff / fairPrice) * 100) : 0;
  const grade     = r.gradeLabel || r.buyGrade || "-";
  const overUnder = diff > 0
    ? `시세보다 ${Math.abs(diffPct)}% 고평가`
    : diff < 0 ? `시세보다 ${Math.abs(diffPct)}% 저평가` : "적정 수준";

  return makeResult("fair", {
    conclusion: `${complex.complex_name} ${area || ""} — AI 적정가 ${won(fairPrice)}, ${overUnder}`,
    keyNumbers: [
      { label: "AI 적정가", value: won(fairPrice) },
      { label: "현재 시세", value: won(curPrice) },
      { label: "등급",      value: grade },
      { label: "전세가율",  value: r.jeonseRatio ? `${r.jeonseRatio}%` : "-" },
    ],
    basis: `실거래 ${r.sampleCount || 0}건 기반 · ${complex.sigungu || region || ""}`,
    trust: r.dataConfidence || "보통",
  }, { complex, form, analysisResult: r });
}

// ── 매수 판단 (buy) ──
async function toolBuyAnalysis(memory) {
  const fairRes = await toolFairValue(memory);
  if (!fairRes.ok) return fairRes;
  if (fairRes.tool === "fair_select") return fairRes;

  const { form, analysisResult: r } = fairRes.rawData;
  let bd;
  try {
    bd = analyzeBuyerDecision(r, { ...form, currentPrice: form.currentPrice });
  } catch {
    return makeErr("buy", "매수 판단 계산 중 오류가 발생했어요.");
  }

  return makeResult("buy", {
    conclusion: `${form.complexName} — ${bd.finalLabel || "-"}`,
    keyNumbers: [
      { label: "매수 의견", value: bd.finalLabel || "-" },
      { label: "AI 적정가", value: won(r.fairPrice || 0) },
      { label: "등급",      value: r.gradeLabel || "-" },
      { label: "전세가율",  value: r.jeonseRatio ? `${r.jeonseRatio}%` : "-" },
    ],
    basis: `실거래 ${r.sampleCount || 0}건 기반 · ${form.region}`,
    trust: r.dataConfidence || "보통",
  }, { ...fairRes.rawData, buyDecision: bd });
}

// ── 예산 추천 (reco) ──
function toolReco(memory) {
  try {
    const budget  = memory.budgetNum || 0;
    const region  = memory.region || "전체";
    const areaRaw = memory.area ? parseFloat(memory.area) : 0;
    const pyeong  = areaRaw > 0
      ? (memory.area?.includes("평") ? areaRaw : sqmToPyeong(areaRaw).pyeong)
      : 0;
    const results = recommendByBudget({ budget, region, pyeong });
    if (!results || results.length === 0)
      return makeErr("reco", "조건에 맞는 추천 단지를 찾지 못했어요. 예산이나 지역을 변경해보세요.");

    const top = results[0];
    return makeResult("reco", {
      conclusion: `${memory.budget || `${budget}만원`} 예산 ${region}${pyeong ? ` ${pyeong}평대` : ""} 기준 — ${results.length}개 단지 추천`,
      keyNumbers: [
        { label: "추천 1위", value: top.name || top.complexName || "-" },
        { label: "예상가",   value: won(top.fair || top.fairPrice) },
        { label: "등급",     value: top.grade || "-" },
        { label: "총 후보",  value: `${results.length}개` },
      ],
      basis: `예산 ${memory.budget} · ${region} 기준`,
      trust: "실거래 기반",
    }, results);
  } catch {
    return makeErr("reco", "추천 중 오류가 발생했어요.");
  }
}

// ── 취득세 ──
function toolAcqTax(memory, params) {
  try {
    const price  = params?.buyPrice || memory.buyPrice || memory.budgetNum || 0;
    const houses = memory.houseCount ?? 1;
    const tax    = acqTax(price, false, houses, false, false);
    const rate   = price ? Math.round((tax / price) * 100 * 10) / 10 : 0;
    return makeResult("acqTax", {
      conclusion: `${won(price)} 기준 취득세 ${won(tax)} (약 ${rate}%)`,
      keyNumbers: [
        { label: "매수가",    value: won(price) },
        { label: "취득세",    value: won(tax) },
        { label: "세율",      value: `${rate}%` },
        { label: "보유 주택", value: `${houses}주택` },
      ],
      basis: "취득세법 기준 (농특세·지방교육세 포함)",
      trust: "참고용 — 정확한 금액은 세무사 확인 필요",
    }, { price, houses, tax });
  } catch {
    return makeErr("acqTax", "취득세 계산 중 오류가 발생했어요.");
  }
}

// ── 양도세 ──
function toolCgTax(memory) {
  try {
    const buy    = memory.buyPrice  || 0;
    const sell   = memory.sellPrice || 0;
    const years  = memory.holdingYears || 1;
    const houses = memory.houseCount ?? 1;
    const tax    = cgTax({ buy, sell, years, houses });
    const gain   = sell - buy;
    return makeResult("cgTax", {
      conclusion: `양도차익 ${won(gain)} 기준 양도세 약 ${won(tax)}`,
      keyNumbers: [
        { label: "매수가",   value: won(buy) },
        { label: "매도가",   value: won(sell) },
        { label: "양도차익", value: won(gain) },
        { label: "양도세",   value: won(tax) },
      ],
      basis: `보유기간 ${years}년 · ${houses}주택 기준`,
      trust: "참고용 — 정확한 금액은 세무사 확인 필요",
    }, { buy, sell, years, houses, tax });
  } catch {
    return makeErr("cgTax", "양도세 계산 중 오류가 발생했어요.");
  }
}

// ── 메인 라우터 ──
async function routeTool(goal, memory, params) {
  switch (goal) {
    case "fair": return await toolFairValue(memory);
    case "buy":  return await toolBuyAnalysis(memory);
    case "reco": return toolReco(memory);
    case "loan": {
      const raw = (params?._rawText || "").toLowerCase();
      if (/취득세/.test(raw)) return toolAcqTax(memory, params);
      if (/양도세/.test(raw)) return toolCgTax(memory);
      return makeResult("loan_info", {
        conclusion: "자금 관련 질문을 더 구체적으로 입력해주세요.",
        keyNumbers: [],
        basis: "예: 취득세 얼마야?, 양도세 계산해줘",
        trust: "",
      }, null);
    }
    default:
      return makeResult("guide", { conclusion: null, keyNumbers: [], basis: "", trust: "" }, null);
  }
}

export { routeTool, tabFor, runFairAnalysis };
