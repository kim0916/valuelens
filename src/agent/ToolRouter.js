// ValueLens — ToolRouter.js
// Step 2: goal → 기존 엔진 호출 Adapter
// 기존 엔진 로직 수정 금지 — 호출만 담당

import { analyze } from '../engine/analyze.js';
import { analyzeBuyerDecision, analyzeSellerDecision } from '../engine/market.js';
import { computeTrimmedMean } from '../engine/stats.js';
import { acqTax, cgTax } from '../engine/tax.js';
import { recommendByBudget } from '../recommendation/recommend.js';
import { searchComplexFromSupabase, getPriceSummaryFromSupabase } from '../search/supabase.js';
import { buildAnalysisInput } from '../search/input.js';

// ── Tool 결과 포맷 ──
function ok(tool, data)  { return { ok: true,  tool, data }; }
function err(tool, msg)  { return { ok: false, tool, error: msg }; }

// ── Tool 1: 단지 검색 ──
async function toolSearchComplex(complexName, region) {
  try {
    const sigungu = region || "";
    const results = await searchComplexFromSupabase(complexName, sigungu, "");
    if (!results || results.length === 0)
      return err("search", `"${complexName}" 단지를 찾지 못했어요. 단지명을 다시 확인해주세요.`);
    return ok("search", results);
  } catch (e) {
    return err("search", "단지 검색 중 오류가 발생했어요.");
  }
}

// ── Tool 2: 가격 요약 조회 ──
async function toolGetPriceSummary(complexId, complexName, sigungu, areaExcl) {
  try {
    const summary = await getPriceSummaryFromSupabase(complexId, complexName, sigungu, areaExcl);
    if (!summary) return err("price", "가격 데이터를 찾지 못했어요.");
    return ok("price", summary);
  } catch (e) {
    return err("price", "가격 데이터 조회 중 오류가 발생했어요.");
  }
}

// ── Tool 3: 적정가 분석 (fair) ──
async function toolFairValue(memory) {
  const { complexName, area, region } = memory;
  // 1. 단지 검색
  const searchResult = await toolSearchComplex(complexName, region);
  if (!searchResult.ok) return searchResult;
  const complex = searchResult.data[0];

  // 2. 면적 파악
  const areaNum = area ? parseFloat(area) : null;
  const areaExcl = areaNum ? (area.includes("평") ? areaNum * 3.3 : areaNum) : null;

  // 3. 가격 요약
  const priceResult = await toolGetPriceSummary(
    complex.complex_id, complex.complex_name, complex.sigungu, areaExcl
  );
  if (!priceResult.ok) return priceResult;

  // 4. buildAnalysisInput
  const form = {
    complexName: complex.complex_name,
    region: complex.sigungu || region || "",
    areaExclusive: areaExcl ? String(Math.round(areaExcl)) : "",
    currentPrice: priceResult.data.median_price || 0,
    kbJeonse: priceResult.data.jeonse_price || 0,
    buildYear: complex.build_year || 0,
  };
  const analysisInput = buildAnalysisInput(priceResult.data, form, areaExcl);

  // 5. analyze
  const r = analyze(analysisInput);
  return ok("fair", { complex, form, analysisInput, result: r });
}

// ── Tool 4: 매수 판단 (buy) ──
async function toolBuyAnalysis(memory) {
  const fairResult = await toolFairValue(memory);
  if (!fairResult.ok) return fairResult;

  const { form, analysisInput, result: r } = fairResult.data;
  const bd = analyzeBuyerDecision(r, { ...form, currentPrice: form.currentPrice });
  return ok("buy", { ...fairResult.data, buyDecision: bd });
}

// ── Tool 5: 예산 추천 (reco) ──
function toolReco(memory) {
  try {
    const budget = memory.budgetNum || 0;
    const region = memory.region || "전체";
    const areaMatch = memory.area ? parseFloat(memory.area) : 0;
    const pyeong = areaMatch && memory.area?.includes("평") ? areaMatch
                 : areaMatch ? Math.round(areaMatch / 3.3) : 0;
    const results = recommendByBudget({ budget, region, pyeong });
    if (!results || results.length === 0)
      return err("reco", "조건에 맞는 추천 단지를 찾지 못했어요. 예산이나 지역을 바꿔서 다시 시도해보세요.");
    return ok("reco", results);
  } catch (e) {
    return err("reco", "추천 중 오류가 발생했어요.");
  }
}

// ── Tool 6: 취득세 계산 (loan/acqTax) ──
function toolAcqTax(memory, params) {
  try {
    const price  = params.buyPrice || memory.buyPrice || memory.budgetNum || 0;
    const houses = memory.houseCount ?? 1;
    const result = acqTax(price, false, houses, false, false);
    return ok("acqTax", { price, houses, taxAmount: result });
  } catch (e) {
    return err("acqTax", "취득세 계산 중 오류가 발생했어요.");
  }
}

// ── Tool 7: 양도세 계산 (loan/cgTax) ──
function toolCgTax(memory) {
  try {
    const buy   = memory.buyPrice  || 0;
    const sell  = memory.sellPrice || 0;
    const years = memory.holdingYears || 1;
    const result = cgTax({ buy, sell, years, houses: memory.houseCount ?? 1 });
    return ok("cgTax", { buy, sell, years, taxAmount: result });
  } catch (e) {
    return err("cgTax", "양도세 계산 중 오류가 발생했어요.");
  }
}

// ── 메인 라우터 ──
async function routeTool(goal, memory, params) {
  switch (goal) {
    case "fair":     return await toolFairValue(memory);
    case "buy":      return await toolBuyAnalysis(memory);
    case "reco":     return toolReco(memory);
    case "loan": {
      const raw = (params?._rawText || "").toLowerCase();
      if (/취득세/.test(raw))             return toolAcqTax(memory, params);
      if (/양도세/.test(raw))             return toolCgTax(memory);
      // 그 외 loan 질문 → 안내만
      return ok("loan_info", { message: "자금 관련 질문을 구체적으로 입력해주세요.\n예: 취득세 얼마야?, 양도세 계산해줘" });
    }
    case "sell":
    case "contract":
    case "region":
    case "photo":
      // Step 2 범위 외 — 안내 응답만
      return ok("guide", { message: null });
    default:
      return err("unknown", "질문 의도를 파악하지 못했어요. 다시 입력해주세요.");
  }
}

export { routeTool, toolFairValue, toolBuyAnalysis, toolReco, toolAcqTax, toolCgTax };
