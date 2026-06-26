// ValueLens — ToolRouter.js v2
// Step 3: agentResult 표준화 + 요약 포맷 추가

import { analyze } from '../engine/analyze.js';
import { analyzeBuyerDecision, analyzeSellerDecision } from '../engine/market.js';
import { acqTax, cgTax } from '../engine/tax.js';
import { recommendByBudget } from '../recommendation/recommend.js';
import { searchComplexFromSupabase, getPriceSummaryFromSupabase } from '../search/supabase.js';
import { buildAnalysisInput } from '../search/input.js';

// ── agentResult 표준 포맷 ──
// { ok, tool, summary: { conclusion, keyNumbers, basis, trust, tab, rawData } }
function makeResult(tool, summary, rawData) {
  return { ok: true, tool, summary: { ...summary, tab: tabFor(tool) }, rawData };
}
function makeErr(tool, message) {
  return { ok: false, tool, summary: { conclusion: message, keyNumbers: [], basis: "", trust: "" }, rawData: null };
}
function tabFor(tool) {
  return { fair:"fair", buy:"buy", reco:"reco", acqTax:"tax", cgTax:"tax", loan_info:"tax" }[tool] || "fair";
}

function won(v) {
  if (!v && v !== 0) return "-";
  const n = Number(v);
  if (n >= 10000) return `${(n/10000).toFixed(1)}억`;
  return `${n.toLocaleString()}만원`;
}

// ── Tool 1: 단지 검색 ──
async function toolSearchComplex(complexName, region) {
  try {
    const results = await searchComplexFromSupabase(complexName, region || "", "");
    if (!results || results.length === 0)
      return makeErr("search", `"${complexName}" 단지를 찾지 못했어요. 단지명을 다시 확인해주세요.`);
    return { ok: true, tool: "search", data: results };
  } catch { return makeErr("search", "단지 검색 중 오류가 발생했어요."); }
}

// ── Tool 2: 적정가 (fair) ──
async function toolFairValue(memory) {
  const { complexName, area, region } = memory;
  const searchRes = await toolSearchComplex(complexName, region);
  if (!searchRes.ok) return searchRes;
  const complex = searchRes.data[0];

  const areaNum = area ? parseFloat(area) : null;
  const areaExcl = areaNum ? (area.includes("평") ? Math.round(areaNum * 3.3) : areaNum) : null;

  let priceSummary;
  try {
    priceSummary = await getPriceSummaryFromSupabase(
      complex.complex_id, complex.complex_name, complex.sigungu, areaExcl
    );
  } catch { return makeErr("fair", "가격 데이터를 가져오는 중 오류가 발생했어요."); }
  if (!priceSummary) return makeErr("fair", "해당 평형의 거래 데이터가 부족해요.");

  const form = {
    complexName: complex.complex_name, region: complex.sigungu || region || "",
    areaExclusive: areaExcl ? String(Math.round(areaExcl)) : "",
    currentPrice: priceSummary.median_price || 0,
    kbJeonse: priceSummary.jeonse_price || 0,
    buildYear: complex.build_year || 0,
  };

  let r;
  try {
    const analysisInput = buildAnalysisInput(priceSummary, form, areaExcl);
    r = analyze(analysisInput);
  } catch { return makeErr("fair", "적정가 계산 중 오류가 발생했어요."); }

  const fairPrice = r.fairPrice || 0;
  const curPrice  = form.currentPrice;
  const diff      = curPrice - fairPrice;
  const diffPct   = fairPrice ? Math.round((diff / fairPrice) * 100) : 0;
  const grade     = r.gradeLabel || r.buyGrade || "-";
  const overUnder = diff > 0 ? `시세보다 ${Math.abs(diffPct)}% 고평가` : diff < 0 ? `시세보다 ${Math.abs(diffPct)}% 저평가` : "적정 수준";

  return makeResult("fair", {
    conclusion: `${complex.complex_name} ${area || ""} — AI 적정가 ${won(fairPrice)}, ${overUnder}`,
    keyNumbers: [
      { label: "AI 적정가",  value: won(fairPrice) },
      { label: "현재 시세",  value: won(curPrice) },
      { label: "등급",        value: grade },
      { label: "전세가율",   value: r.jeonseRatio ? `${r.jeonseRatio}%` : "-" },
    ],
    basis: `실거래 ${r.sampleCount || 0}건 기반 · ${complex.sigungu || region || ""}`,
    trust: r.dataConfidence || "보통",
  }, { complex, form, analysisResult: r });
}

// ── Tool 3: 매수 판단 (buy) ──
async function toolBuyAnalysis(memory) {
  const fairRes = await toolFairValue(memory);
  if (!fairRes.ok) return fairRes;

  const { form, analysisResult: r } = fairRes.rawData;
  let bd;
  try {
    bd = analyzeBuyerDecision(r, { ...form, currentPrice: form.currentPrice });
  } catch { return makeErr("buy", "매수 판단 계산 중 오류가 발생했어요."); }

  const verdict  = bd.finalLabel || "-";
  const grade    = r.gradeLabel || "-";
  const fairPrice = r.fairPrice || 0;

  return makeResult("buy", {
    conclusion: `${form.complexName} — ${verdict}`,
    keyNumbers: [
      { label: "매수 의견",  value: verdict },
      { label: "AI 적정가",  value: won(fairPrice) },
      { label: "등급",        value: grade },
      { label: "전세가율",   value: r.jeonseRatio ? `${r.jeonseRatio}%` : "-" },
    ],
    basis: `실거래 ${r.sampleCount || 0}건 기반 · ${form.region}`,
    trust: r.dataConfidence || "보통",
  }, { ...fairRes.rawData, buyDecision: bd });
}

// ── Tool 4: 예산 추천 (reco) ──
function toolReco(memory) {
  try {
    const budget  = memory.budgetNum || 0;
    const region  = memory.region || "전체";
    // 평형 계산 — 평/㎡ 구분 정확히
    const areaRaw = memory.area ? parseFloat(memory.area) : 0;
    const pyeong  = areaRaw > 0
      ? (memory.area?.includes("평") ? areaRaw : Math.round(areaRaw / 3.305785))
      : 0;
    const results = recommendByBudget({ budget, region, pyeong });
    if (!results || results.length === 0)
      return makeErr("reco", "조건에 맞는 추천 단지를 찾지 못했어요. 예산이나 지역을 변경해보세요.");

    const top = results[0];
    return makeResult("reco", {
      conclusion: `${memory.budget || budget + "만원"} 예산 ${region}${pyeong ? ` ${pyeong}평대` : ""} 기준 — ${results.length}개 단지 추천`,
      keyNumbers: [
        { label: "추천 1위",  value: top.name || top.complexName || "-" },
        { label: "예상가",     value: won(top.fair || top.fairPrice) },
        { label: "등급",        value: top.grade || "-" },
        { label: "총 후보",    value: `${results.length}개` },
      ],
      basis: `예산 ${memory.budget} · ${region} 기준`,
      trust: "실거래 기반",
    }, results);
  } catch { return makeErr("reco", "추천 중 오류가 발생했어요."); }
}

// ── Tool 5: 취득세 ──
function toolAcqTax(memory, params) {
  try {
    const price  = params?.buyPrice || memory.buyPrice || memory.budgetNum || 0;
    const houses = memory.houseCount ?? 1;
    const tax    = acqTax(price, false, houses, false, false);
    const rate   = price ? Math.round((tax / price) * 100 * 10) / 10 : 0;
    return makeResult("acqTax", {
      conclusion: `${won(price)} 기준 취득세 ${won(tax)} (약 ${rate}%)`,
      keyNumbers: [
        { label: "매수가",   value: won(price) },
        { label: "취득세",   value: won(tax) },
        { label: "세율",     value: `${rate}%` },
        { label: "보유 주택", value: `${houses}주택` },
      ],
      basis: "취득세법 기준 (농특세·지방교육세 포함)",
      trust: "참고용 — 정확한 금액은 세무사 확인 필요",
    }, { price, houses, tax });
  } catch { return makeErr("acqTax", "취득세 계산 중 오류가 발생했어요."); }
}

// ── Tool 6: 양도세 ──
function toolCgTax(memory) {
  try {
    const buy   = memory.buyPrice  || 0;
    const sell  = memory.sellPrice || 0;
    const years = memory.holdingYears || 1;
    const houses = memory.houseCount ?? 1;
    const tax   = cgTax({ buy, sell, years, houses });
    const gain  = sell - buy;
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
  } catch { return makeErr("cgTax", "양도세 계산 중 오류가 발생했어요."); }
}

// ── 메인 라우터 ──
async function routeTool(goal, memory, params) {
  switch (goal) {
    case "fair":     return await toolFairValue(memory);
    case "buy":      return await toolBuyAnalysis(memory);
    case "reco":     return toolReco(memory);
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

export { routeTool, tabFor };
