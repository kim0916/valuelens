// ValueLens Engine — 시장 분석 (매도 판단, 위험도, 시장 분류)
// ★ 계산 로직 수정 금지

import { won, pct } from '../constants/grades.js';
import { computeTrimmedMean } from './stats.js';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function analyzeSellerDecision(f, r) {
  const mc = classifyApartmentMarket(f, r);
  const hold = r.engineMode === "hold";
  const isLowData = mc.specialMarketType === "lowData", isAbnormal = mc.specialMarketType === "abnormalInput";
  const isSpecial = ["redevelopment", "primePremium", "investmentPremium", "policyDriven"].includes(mc.specialMarketType);
  const provisional = hold || isLowData || isAbnormal;
  const v = sellVerdict(r); // 호가 적정성(보조)

  const desired = Number(f.currentPrice) || 0; // 희망 매도가
  const refPrice = isSpecial ? (mc.marketReferencePrice || r.fairPrice || 0) : (r.fairPrice || 0);
  const gapVsRef = refPrice ? (desired - refPrice) / refPrice : 0;
  const gapVsIntrinsic = mc.intrinsicFairPrice ? (desired - mc.intrinsicFairPrice) / mc.intrinsicFairPrice : null;
  const askingLevel = gapVsRef > 0.10 ? "호가 높음" : gapVsRef > 0.03 ? "약간 높음" : gapVsRef >= -0.03 ? "적정 호가" : gapVsRef >= -0.10 ? "낮은 호가" : "급매 수준";


  // ── 분석 적합도 (매수엔진과 동일 정의) ──
  const fitFloor = { redevelopment: 65, primePremium: 70, investmentPremium: 65, policyDriven: 65, semiPremium: 70 }[mc.specialMarketType];
  const fitScore = fitFloor != null ? Math.max(r.modelConf, fitFloor) : r.modelConf;
  const fitLabel = fitScore >= 80 ? "높음" : fitScore >= 60 ? "보통" : fitScore >= 40 ? "낮음" : "매우낮음";

  // ── 리스크 레이어 (매도 관점) ──
  const supplyRisk = calculateSupplyShock(f);       // TODO(API): 한국부동산원 입주물량
  const policyRisk = calculatePolicyRisk(f);        // TODO(API): 정비사업·토허제
  const opp = analyzeOpportunitySignals(f);         // TODO(API): 호재/악재 (적정가 미반영, 매도판단 보조)

  // ── MarketRisk 등급 (재사용) ──
  const mrLevel = provisional ? "평가 불가" : mc.specialMarketType === "investmentPremium" ? "매우높음" : isSpecial ? "높음" : mc.specialMarketType === "semiPremium" ? "보통" : (supplyRisk.level === "높음" ? "보통" : "낮음");

  // ── 매도 타이밍 (시점 요인만: 호재/악재 + 재건축 단계) — 공급·정책·프리미엄·가격은 다른 항목에서 1회만 반영 ──
  let t = 50;
  if (opp.opportunityLevel === "호재 우세") t -= 12; else if (opp.opportunityLevel === "악재 우세") t += 8;
  if (mc.specialMarketType === "redevelopment") { if (mc.stageScore < 40) t += 8; else if (mc.stageScore >= 85) t -= 14; }
  const sellTimingScore = clamp(Math.round(t), 5, 95);
  const sellTimingLabel = sellTimingScore >= 65 ? "매도 유리" : sellTimingScore >= 55 ? "매도 검토" : sellTimingScore >= 45 ? "중립" : sellTimingScore >= 35 ? "보유 유리" : "보유 검토";

  // ── 세후 실수령액 ── TODO(API): 보유·거주기간·세대수 정밀 반영
  const acq = Number(f.acqPrice) || (r.fairPrice ? Math.round(r.fairPrice * 0.8) : 0);
  const acqEstimated = !Number(f.acqPrice);
  const holdYears = Number(f.holdingYears) || 5;
  const oneHouse = f.oneHouse !== false, lived = f.lived !== false;
  const loanBalance = Number(f.loanBalance) || 0;
  const tax = (!provisional && desired) ? cgTax({ buy: acq, sell: desired, years: holdYears, oneHouse, lived }) : null;
  const brokerage = desired ? Math.round(desired * 0.004) : 0, otherCost = 200; // 기타비용 매수/매도 200만으로 통일(등기·중개부대·이사 등 개략)
  const capitalGain = Math.max(0, desired - acq);
  const afterTaxCash = desired ? desired - (tax ? tax.tax : 0) - brokerage - otherCost : 0;
  const netProceeds = afterTaxCash - loanBalance;
  const taxBurden = desired ? (tax ? tax.tax : 0) / desired : 0;
  const afterTaxScore = clamp(Math.round(82 - taxBurden * 280), 20, 95);

  // ── 보유 리스크 (공급·정책·프리미엄·재건축초기를 여기 1곳에서만 반영) ──
  let holdingRisk = 28; const riskBits = [];
  if (supplyRisk.level === "높음") { holdingRisk += 20; riskBits.push("공급 부담"); }
  if (policyRisk.level === "높음") { holdingRisk += 12; riskBits.push("정책 리스크"); }
  if (isSpecial && mc.premiumRatio > 0.6) { holdingRisk += 18; riskBits.push("프리미엄 과다"); }
  if (mc.specialMarketType === "redevelopment" && mc.stageScore < 40) { holdingRisk += 12; riskBits.push("재건축 초기 불확실성"); }
  holdingRisk = clamp(holdingRisk, 5, 95);

  // ── 거래 가능성 (유동성) — "가격이 적절한가"와 별개로 "실제로 팔릴 가능성". mock/AI 추정값 ──
  // TODO(API): 웹앱 전환 시 아래 실데이터로 대체
  //   - 국토부 실거래가 API 최근 거래량(3·6개월) / 동일 평형 최근 거래 횟수
  //   - 네이버부동산·호갱노노·직방 매물 호가 / 매물 수
  //   - KB시세 / 한국부동산원 거래량 통계
  const challengeAsk = isSpecial ? (refPrice + (mc.premiumAmount || 0) * 0.2) : refPrice * 1.05; // 참고 매도가 범위 상단(도전 호가)
  let liq = 72; const liqReasons = [];
  // 1) 최근 거래량 추정 (mock: 공급위험 높은 지역은 거래 회전 둔화)
  liq += supplyRisk.level === "높음" ? -10 : supplyRisk.level === "보통" ? -4 : 4;
  if (supplyRisk.level === "높음") liqReasons.push("공급 부담 지역 — 거래량 둔화 추정");
  // 2) 동일 평형 매물 경쟁 추정 (mock: 특수·투자수요 단지는 매수자 풀 제한)
  if (mc.specialMarketType === "investmentPremium") { liq -= 10; liqReasons.push("투자수요 의존 — 매수자 풀 제한"); }
  else if (isSpecial) { liq -= 6; liqReasons.push("특수시장 — 매수자 풀 상대적으로 좁음"); }
  // 3) 희망가 vs 최근 실거래(시세) 기준 차이
  if (gapVsRef > 0.10) { liq -= 22; liqReasons.push("희망가가 시세 기준 +10% 초과 — 매수 외면 가능"); }
  else if (gapVsRef > 0.05) { liq -= 12; liqReasons.push("희망가가 시세보다 다소 높음"); }
  else if (gapVsRef < -0.05) { liq += 8; liqReasons.push("시세 대비 낮은 호가 — 거래 유리"); }
  // 4) 희망가 vs 참고 매도가 범위 상단(도전 호가) 차이
  if (desired > challengeAsk * 1.02) { liq -= 15; liqReasons.push("참고 상단 호가를 넘는 가격 — 거래 어려움"); }
  // 5) 가격대
  if (desired > 250000) { liq -= 12; liqReasons.push("초고가 구간 — 수요층 한정"); }
  else if (desired > 150000) liq -= 5;
  // 6) 시장 위험도
  if (mrLevel === "매우높음") liq -= 8; else if (mrLevel === "높음") liq -= 4;
  const liquidityScore = clamp(Math.round(liq), 5, 98);
  const liquidityLevel = liquidityScore >= 80 ? "빠른 거래 가능" : liquidityScore >= 60 ? "보통" : liquidityScore >= 40 ? "거래 지연 가능" : "거래 어려움";
  const liquidityDelayCause = liqReasons.length ? liqReasons.slice(0, 2).join(" · ") : "특이 지연 요인 없음 — 통상 수준 추정";
  const liquidityNeedAdjust = gapVsRef > 0.05 || desired > challengeAsk * 1.02; // 호가 조정 필요 여부

  // ── 대체 전략 / 갈아타기 ──
  const purpose = f.sellPurpose || "현금화";
  let altScore = 55;
  if (netProceeds > 0) altScore += 10;
  if (purpose === "갈아타기") altScore += (netProceeds > desired * 0.3 ? 8 : -6);
  if (purpose === "투자금 회수" && capitalGain > 0) altScore += 6;
  const altStrategyScore = clamp(altScore, 10, 90);
  const opportunityCost = gapVsRef < -0.07 ? "지금 매도 시 시세 대비 낮은 가격 — 보유 시 회복 여력 참고" : (opp.opportunityLevel === "호재 우세" ? "보유 시 호재 반영 여력 존재 — 조기 매도 기회비용 있음" : "보유 추가 상승 여력은 제한적 — 현금화·재투자 검토 가능");

  // ── 가격 점수(매도 관점: 고평가일수록 매도 가점 — 가격은 여기서만 반영) ──
  const priceSellScore = clamp(Math.round(50 + gapVsRef * 250), 5, 95);
  const confScore = Math.round((r.dataConf + fitScore) / 2);

  // ── sellScore (가격25·보유리스크20·세후15·타이밍15·거래10·대체10·신뢰5 = 100) — 각 요인 1회만 반영 ──
  const sellScore = Math.round(priceSellScore * 0.25 + holdingRisk * 0.20 + afterTaxScore * 0.15 + sellTimingScore * 0.15 + liquidityScore * 0.10 + altStrategyScore * 0.10 + confScore * 0.05);

  // ── 보유 vs 매도 (sellScore 복사 아님 — 보유측/매도측 요인 집계) ──
  const sellSide = (gapVsRef > 0.05 ? 1 : 0) + (holdingRisk >= 55 ? 1 : 0) + (sellTimingScore >= 60 ? 1 : 0) + (taxBurden < 0.03 ? 1 : 0);
  const holdSide = (gapVsRef < -0.05 ? 1 : 0) + (opp.opportunityLevel === "호재 우세" ? 1 : 0) + (mc.specialMarketType === "redevelopment" && mc.stageScore >= 85 ? 1 : 0) + (lived ? 1 : 0);
  const holdingVsSellingResult = provisional ? "판단 보류" : sellSide > holdSide ? "매도 쪽 우세" : holdSide > sellSide ? "보유 쪽 우세" : "중립";
  const holdingVsSellingNote = provisional ? "데이터·입력값 보강 후 비교 가능" : `매도측 요인 ${sellSide}개 vs 보유측 요인 ${holdSide}개 — ` + (sellSide > holdSide ? "세후 실수령·거래 가능성을 확인하고 매도를 검토하세요." : holdSide > sellSide ? "급하지 않다면 보유 관점이 우세합니다." : "어느 한쪽이 뚜렷하지 않아 목적·자금 상황으로 결정하세요.");

  // ── 최종 판단 ──
  let finalSellDecision, sellerAction;
  if (provisional) { finalSellDecision = "판단 보류"; sellerAction = isAbnormal ? "희망 매도가 입력 오류 가능성 — 값 확인 후 재평가하세요" : "실거래·시세 데이터 부족 — 보강 후 재평가하세요"; }
  else {
    const _rising = isRisingMarket(f.region || "기타");
    const _trend  = getRegionTrend(f.region || "기타");
    const _trendStr = `${_trend > 0 ? "+" : ""}${_trend.toFixed(1)}%`;
    finalSellDecision =
      sellScore >= 80 ? (_rising ? "보유 리스크 점검" : "매도 검토 가능") :
      sellScore >= 65 ? (_rising ? "보유 유지 검토" : "매도 검토") :
      sellScore >= 50 ? (gapVsRef > 0.05 ? "고평가 주의 — 호가 조정 고려" : "보유 유지") :
      sellScore >= 35 ? "보유 유지" : "보유 유지 권고";
    if (mc.specialMarketType === "redevelopment" && mc.stageScore >= 85) finalSellDecision = "보유 유지"; // 후기 단계 = 고위험 보유
    const purposeNote = { "갈아타기": "갈아타기 자금·상급지 추가자금을 함께 점검하세요", "현금화": "현금화 시 세후 실수령액 기준으로 판단하세요", "손실 축소": "손실 축소가 목적이면 거래 가능성·호가 조정 폭을 우선 보세요", "세금 절감": "비과세·장기보유공제 요건(보유·거주기간)을 확인하세요", "투자금 회수": "양도차익과 세후 실수령액을 함께 보세요", "전세 전환 고민": "매도 대신 전세 전환 시 보증금·역전세 위험을 비교하세요" }[purpose] || "";
    sellerAction = ({
      "매도 검토 가능": "여건상 매도 검토가 가능합니다. 세후 실수령액과 거래 가능성을 확인하세요",
      "보유 리스크 점검": `상승장(${_trendStr})이지만 고평가 수준입니다. 목표가 도달 시 일부 매도를 고려하세요`,
      "보유 유지 검토": "지금은 보유 관점이 우세합니다. 시장 흐름을 보며 판단하세요",
      "매도 검토": "매도를 검토할 만합니다. 호가 조정 후 거래 가능성을 확인하세요",
      "고평가 주의 — 호가 조정 고려": "호가가 적정가 대비 높습니다. 조정 시 거래 가능성이 올라갑니다",
      "보유 유지": "지금은 보유 관점이 우세한 것으로 분석됩니다",
      "보유 유지 권고": "매도보다 보유 관점이 우세합니다",
    }[finalSellDecision] || "") + (purposeNote ? ` · ${purposeNote}` : "");
  }

  // ── 참고 매도가 범위 ──
  const base = isSpecial ? (mc.marketReferencePrice || r.fairPrice || 0) : (r.fairPrice || 0);
  const recommendedAskingRange = isSpecial
    ? { fast: Math.round(base * 0.97), real: Math.round(base), challenge: Math.round(base + (mc.premiumAmount || 0) * 0.2) }
    : { fast: Math.round(base * 0.97), real: Math.round(base), challenge: Math.round(base * 1.05) };

  // ── 매도 이유 5개 ──
  const sellerReasons = [];
  if (isSpecial) sellerReasons.push(`[가격] 희망 매도가 ${won(desired)} — 시장 기준가 ${won(refPrice)} 대비 ${gapVsRef >= 0 ? "+" : ""}${(gapVsRef * 100).toFixed(1)}%${gapVsIntrinsic != null ? ` · 실사용 적정가 ${won(mc.intrinsicFairPrice)} 대비 +${(gapVsIntrinsic * 100).toFixed(0)}%` : ""}`);
  else sellerReasons.push(`[가격] 희망 매도가 ${won(desired)} — 적정가 ${won(refPrice)} 대비 ${gapVsRef >= 0 ? "+" : ""}${(gapVsRef * 100).toFixed(1)}% (${askingLevel})`);
  sellerReasons.push(provisional || !tax ? "[세후] 세후 실수령액은 데이터 보강 후 계산됩니다 (취득가·보유기간 입력 시 정밀)" : `[세후] 세금·중개·대출상환 차감 후 약 ${won(netProceeds)} 남습니다 (양도세 ${won(tax.tax)} 추정${acqEstimated ? " · 취득가 추정" : ""})`);
  sellerReasons.push(`[보유] 보유 리스크 ${holdingRisk >= 60 ? "높음" : holdingRisk >= 40 ? "보통" : "낮음"}${riskBits.length ? ` (${riskBits.join("·")})` : ""} · 금리 상승 시 부담 증가 가능`);
  sellerReasons.push(`[시장] 매도 타이밍 ${sellTimingLabel} · 거래 가능성 ${liquidityLevel} · 시장 환경 ${mrLevel}`);
  if (isSpecial) sellerReasons.push(`[전략] 이 단지는 일반 적정가보다 프리미엄과 시장 위험을 분리해 해석해야 합니다 · ${opportunityCost}`);
  else sellerReasons.push(`[전략] 매도 목적 ‘${purpose}’ · ${opportunityCost}`);

  return {
    mc, isSpecial, provisional, sellVerdict: v,
    desired, refPrice, gapVsRef, gapVsIntrinsic, askingLevel,
    sellScore, finalSellDecision, sellerAction,
    sellTimingScore, sellTimingLabel,
    afterTaxCash, netProceeds, capitalGain, tax, brokerage, otherCost, loanBalance, acq, acqEstimated, afterTaxScore,
    holdingRisk, riskBits, holdingVsSellingResult, holdingVsSellingNote,
    liquidityScore, liquidityLevel, liquidityDelayCause, liquidityNeedAdjust, opportunityCost,
    altStrategyScore, purpose, recommendedAskingRange,
    dataConfidence: r.dataConf, dataConfLabel: r.dataConfLabel, fitScore, fitLabel, marketRiskLevel: mrLevel,
    supplyRisk, policyRisk, opportunity: opp, sellerReasons,
  };
}

// ── 취득세 (1주택 기준 누진, 만원) — 교육세·농특세 개략 포함 ──
// ── 취득세 (개략 추정, 만원) — 주택수·조정지역·85㎡·생애최초·교육세·농특세 반영 ──


function calculateSupplyShock(f) { // 입주물량 위험
  const heavy = /연수|송도|영통|광교|이의|검단|일산|운정|동탄|청라/.test((f.region || "") + (f.dong || ""));
  const score = Math.max(10, Math.min(90, heavy ? 70 + (((f.complexName || "").length) % 12) : 30 + (((f.dong || "").length) % 18)));
  const level = score >= 65 ? "높음" : score >= 40 ? "보통" : "낮음";
  return { score, level, warning: level === "높음" ? "향후 3년 입주물량이 많아 가격 약세 압력이 있을 수 있습니다" : "" };
}
function calculateVolumeRisk(f) { // 거래량 위험 (추세 데이터 미연동)
  return { volumeScore: 60, level: "보통", cliff: false, trendAvailable: false, warning: "", note: "거래량 추세 데이터 미연동 (TODO: 국토부 거래량 API)" };
}
function calculatePopulationRisk(f) { // 인구 위험
  const growing = /강남|서초|송파|용산|마포|성남|수원|송도|연수|영통/.test((f.region || ""));
  const populationScore = growing ? 72 : 52;
  return { populationScore, level: growing ? "낮음" : "보통", warning: growing ? "" : "장기 인구 추세 확인이 필요합니다" };
}
function calculateEmploymentRisk(f) { // 고용 위험
  const strong = /강남|서초|송파|영통|연수|송도|판교|성남|마포/.test((f.region || "") + (f.dong || ""));
  const employmentScore = strong ? 75 : 55;
  return { employmentScore, level: strong ? "낮음" : "보통", warning: "" };
}
function calculatePolicyRisk(f) { // 정책 위험 (재건축·토허제·정비·용적률)
  const age = f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : 0;
  const toho = /강남|서초|송파|용산|여의|목동|압구정|대치|반포|잠실/.test((f.region || "") + (f.dong || ""));
  let score = 38; const factors = [];
  if (age >= 30) { score += 25; factors.push("재건축 사업 단계 불확실성"); }
  if (toho) { score += 22; factors.push("토지거래허가·정비사업 규제 영향"); }
  score = Math.min(92, score);
  const level = score >= 65 ? "높음" : score >= 45 ? "보통" : "낮음";
  return { policyScore: score, level, factors, warning: level === "높음" ? "재건축·정책 규제 변수에 가격이 민감합니다" : "" };
}

// ════════ MARKET CLASSIFIER + PREMIUM ENGINE ════════
// 적정가 엔진(analyze)을 바꾸지 않고, 그 결과 위에서 시장 유형을 먼저 분류한다.
// TODO(상용화): 학군(학교알리미)·정비사업 단계·토허제·희소지역·정책 데이터 API 연결
const SCHOOL_ZONES = ["강남구", "서초구", "송파구", "양천구", "분당", "대치", "목동", "평촌", "중계", "방이"];
const SCARCITY_ZONES = ["강남", "서초", "송파", "용산", "목동", "분당", "판교", "여의도", "한강", "반포", "압구정", "잠실", "해운대", "수성"];
const PRIME_REGIONS = ["강남구", "서초구", "송파구", "용산구", "양천구", "성남시 분당구"];
const PREMIUM_LEVEL = (s) => (s >= 81 ? "초프리미엄" : s >= 61 ? "프리미엄" : s >= 31 ? "준프리미엄" : "일반");
const CONF_CAP = { normal: 95, semiPremium: 75, redevelopment: 45, primePremium: 55, investmentPremium: 50, policyDriven: 45, lowData: 30, abnormalInput: 20 };

// ── 재건축 단계 엔진 ── TODO(API): 현재 연식·키워드 기반 AI/mock 추정. 웹앱 전환 시 정비사업 고시/조합 정보 API로 교체할 것.
const RECON = {
  none: { label: "해당 없음", score: 0 }, possible: { label: "재건축 가능 연한", score: 15 },
  safetyDiagnosis: { label: "안전진단", score: 25 }, zoneDesignation: { label: "정비구역 지정", score: 40 },
  associationEstablished: { label: "조합 설립", score: 55 }, projectApproval: { label: "사업시행인가", score: 70 },
  managementDisposal: { label: "관리처분인가", score: 85 }, relocation: { label: "이주·철거", score: 90 },
  construction: { label: "착공", score: 95 }, completed: { label: "준공", score: 100 },
};
function estimateReconstructionStage(f, age) {
  if (f.reconstructionStage && RECON[f.reconstructionStage]) return f.reconstructionStage; // 사용자 선택 우선
  if (age == null) return "none";
  if (age >= 45 || f.redevelopmentExpected) return "associationEstablished";
  if (age >= 38) return "zoneDesignation";
  if (age >= 32) return "safetyDiagnosis";
  if (age >= 26) return "possible";
  return "none";
}
// ── 적정가 3단계 범위 (보수/기준/공격) — 표시용, 엔진 적정가 자체는 불변 ──
function computeFairBands(r, mc) {
  const t = mc && mc.specialMarketType;
  const special = t && !["normal", "semiPremium", "lowData", "abnormalInput"].includes(t);
  if (special && mc.marketReferencePrice) {
    const base = mc.marketReferencePrice;
    return { conservative: Math.round(mc.intrinsicFairPrice || base), base: Math.round(base), aggressive: Math.round(base + (mc.premiumAmount || 0) * 0.3), special: true };
  }
  const fp = r.fairPrice || 0;
  return { conservative: Math.round(fp * 0.95), base: Math.round(fp), aggressive: Math.round(fp * 1.05), special: false };
}

function classifyApartmentMarket(f, r) {
  const region = f.region || "", blob = (f.region || "") + (f.dong || "") + (f.complexName || "");
  const age = r.age != null ? r.age : (f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : null);
  const jr = r.actualRatio || 0;
  const intrinsicFairPrice = Math.round(r.jeonseFair || 0);
  const marketReferencePrice = Math.round(r.saleFair || r.fairPrice || 0);
  const premiumAmount = Math.max(0, marketReferencePrice - intrinsicFairPrice);
  const premiumRatio = intrinsicFairPrice ? premiumAmount / intrinsicFairPrice : 0;

  // ── PremiumScore 5개 서브점수 (mock/placeholder) ──
  let redevelopmentScore = 0;
  if (age != null && age >= 28) redevelopmentScore += 45;
  if (jr > 0 && jr < 0.5) redevelopmentScore += 30;
  if (f.redevelopmentExpected) redevelopmentScore += 15;
  if (/주공|시영|재건축|구축|한양|진주|미성/.test(f.complexName || "")) redevelopmentScore += 10;
  redevelopmentScore = Math.min(100, redevelopmentScore);
  const schoolPremiumScore = SCHOOL_ZONES.some((z) => blob.includes(z)) ? 75 : 30;       // TODO: 학교알리미
  const landScarcityScore = SCARCITY_ZONES.some((z) => blob.includes(z)) ? 80 : 30;       // TODO: 희소지역 데이터
  let investorDemandScore = 0;
  if (jr > 0 && jr < 0.35) investorDemandScore += 50;
  if (premiumRatio > 0.5) investorDemandScore += 35; else if (premiumRatio > 0.25) investorDemandScore += 18;
  investorDemandScore = Math.min(100, investorDemandScore);
  let policyDrivenScore = 0;                                                              // TODO: 정비사업·토허제 데이터
  if (age != null && age >= 30) policyDrivenScore += 35;
  if (/강남|서초|송파|용산|여의|목동|압구정|대치|반포|잠실/.test(blob)) policyDrivenScore += 30;
  policyDrivenScore = Math.min(100, policyDrivenScore);
  const subScores = { redevelopmentScore, schoolPremiumScore, landScarcityScore, investorDemandScore, policyDrivenScore };

  const premiumScore = clamp(Math.round(Math.max(redevelopmentScore, investorDemandScore, landScarcityScore) * 0.55 + schoolPremiumScore * 0.2 + landScarcityScore * 0.15 + policyDrivenScore * 0.1), 0, 100);
  const premiumLevel = PREMIUM_LEVEL(premiumScore);

  // ── 표본/입력 검증 ──
  const jUsed = r.jeonseUsed || (r.jeonseCalc && r.jeonseCalc.used) || 0;
  const sUsed = r.saleUsed || (r.saleCalc && r.saleCalc.used) || 0;
  const reasons = [], warnings = [];

  // ── specialMarketType 결정 (우선순위) ──
  // 이상치 제외 비율 60% 초과 시 데이터부족 처리 (computeTrimmedMean 미수정 — 레이어에서 판정)
  const jExcl = r.jeonseCalc && r.jeonseCalc.total ? (r.jeonseCalc.total - r.jeonseCalc.used) / r.jeonseCalc.total : 0;
  const sExcl = r.saleCalc && r.saleCalc.total ? (r.saleCalc.total - r.saleCalc.used) / r.saleCalc.total : 0;
  const highExclusion = jExcl > 0.6 || sExcl > 0.6;
  let specialMarketType = "normal";
  if (r.engineMode === "hold" && ((r.holdReason || "").includes("입력") || Math.abs(r.gapRatio || 0) > 0.5)) { specialMarketType = "abnormalInput"; reasons.push("현재가가 정제 시세와 ±50% 이상 차이 — 입력 오류 가능성"); }
  else if (r.engineMode === "hold" || (jUsed < 3 && sUsed < 3) || highExclusion) { specialMarketType = "lowData"; reasons.push(highExclusion ? "이상치 제외 비율 60% 초과 — 표본 신뢰 낮음" : "전세·매매 실거래 표본이 모두 부족"); }
  else if ((age != null && age >= 28 && jr > 0 && jr < 0.5) || f.redevelopmentExpected) { specialMarketType = "redevelopment"; reasons.push(`연식 ${age}년 · 전세가율 ${(jr * 100).toFixed(0)}% — 재건축 기대 반영`); }
  else if (jr > 0 && jr < 0.35 && sUsed >= 3 && premiumRatio > 0.4) { specialMarketType = "investmentPremium"; reasons.push(`전세가율 ${(jr * 100).toFixed(0)}% · 시장가-실사용가치 괴리 ${(premiumRatio * 100).toFixed(0)}% — 투자수요 우세`); }
  else if (PRIME_REGIONS.includes(region) && premiumScore >= 60) { specialMarketType = "primePremium"; reasons.push(`${region} · 프리미엄 점수 ${premiumScore} — 입지·희소성 프리미엄`); }
  else if (policyDrivenScore >= 60) { specialMarketType = "policyDriven"; reasons.push("재건축·정비·규제 등 정책 변수가 가격에 강하게 반영"); }
  else if (premiumScore >= 60) { specialMarketType = landScarcityScore >= 60 || schoolPremiumScore >= 60 ? "primePremium" : "investmentPremium"; reasons.push(`프리미엄 점수 ${premiumScore} — 일반 실거주형으로 보기 어려움`); }
  else if (premiumScore >= 31) { specialMarketType = "semiPremium"; reasons.push(`프리미엄 점수 ${premiumScore} — 준프리미엄, 보수적 판단 적용`); }
  else { reasons.push("일반 실거주형 아파트"); }

  if (["redevelopment", "primePremium", "investmentPremium", "policyDriven"].includes(specialMarketType)) {
    warnings.push("실사용 가치보다 재건축·학군·희소성·투자수요 프리미엄이 크게 반영된 단지입니다. 일반 전세 기반 적정가만으로 저평가/고평가를 단정하기 어렵습니다.");
    if (premiumRatio > 0.3) reasons.push(`실사용 적정가 ${won(intrinsicFairPrice)} vs 시장 기준가 ${won(marketReferencePrice)} (프리미엄 ${(premiumRatio * 100).toFixed(0)}%)`);
  }

  // ── 재건축 단계 (적정가는 안 바꾸고 프리미엄·위험·매수판단에만 반영) ──
  const reconstructionStage = estimateReconstructionStage(f, age);
  const stageScore = RECON[reconstructionStage].score;
  // ── 프리미엄 구성 분해 (premiumAmount를 구성요소별로 안분) ── TODO(API): 학군/희소성/정비사업/투자수요/정책 실데이터로 교체
  const wSchool = Math.max(0, schoolPremiumScore - 30);
  const wRedev = Math.round(redevelopmentScore * (0.5 + stageScore / 200));
  const wScarcity = Math.max(0, landScarcityScore - 30);
  const wLocation = PRIME_REGIONS.includes(region) ? 50 : 20;
  const wInvestor = investorDemandScore;
  const wPolicy = Math.max(0, policyDrivenScore - 20);
  const wSum = wSchool + wRedev + wScarcity + wLocation + wInvestor + wPolicy || 1;
  const alloc = (w) => Math.round(premiumAmount * (w / wSum));
  const premiumBreakdown = { schoolPremium: alloc(wSchool), redevelopmentPremium: alloc(wRedev), scarcityPremium: alloc(wScarcity), locationPremium: alloc(wLocation), investorDemandPremium: alloc(wInvestor), policyPremium: alloc(wPolicy) };

  return { specialMarketType, premiumScore, premiumLevel, classificationReasons: reasons.slice(0, 3), confidenceCap: CONF_CAP[specialMarketType], warnings, subScores, intrinsicFairPrice, marketReferencePrice, premiumAmount, premiumRatio, reconstructionStage, stageScore, premiumBreakdown };
}


function analyzeBuyerDecision(r, f) {
  const cur = Number(f.currentPrice) || 0;
  const age = r.age != null ? r.age : (f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : null);
  const jr = r.actualRatio || 0;
  // ── RISK LAYER (적정가 무관 — 판단/신뢰도/경고에만) ──
  const living = calculateLivingScore(f);
  const supplyRisk = calculateSupplyShock(f);
  const volumeRisk = calculateVolumeRisk(f);
  const populationRisk = calculatePopulationRisk(f);
  const employmentRisk = calculateEmploymentRisk(f);
  const policyRisk = calculatePolicyRisk(f);
  const locationRisk = { score: living.total, level: living.total >= 75 ? "낮음" : living.total >= 60 ? "보통" : "높음" };
  const riskLayer = { supplyRisk, volumeRisk, populationRisk, employmentRisk, locationRisk, policyRisk };
  const riskLayerScore = Math.round(((100 - supplyRisk.score) + volumeRisk.volumeScore + populationRisk.populationScore + employmentRisk.employmentScore + locationRisk.score + (100 - policyRisk.policyScore)) / 6);

  // ── MARKET CLASSIFIER (최상위 분류 — 모든 판단의 기준) ──
  const mc = classifyApartmentMarket(f, r);
  const specialMarketType = mc.specialMarketType;
  const isSpecial = ["redevelopment", "primePremium", "investmentPremium", "policyDriven"].includes(specialMarketType);
  const isSemi = specialMarketType === "semiPremium";
  const premiumScore = mc.premiumScore;
  const intrinsicFairPrice = mc.intrinsicFairPrice;
  const marketReferencePrice = mc.marketReferencePrice;
  const premiumAmount = mc.premiumAmount;
  const premiumRatio = mc.premiumRatio;
  const finalFairPrice = Math.round(r.fairPrice || 0);
  const gap = r.gapRatio || 0;
  // ── 분석 적합도 (분석 방식이 이 단지에 맞는 정도) — buyerScore/상단표시/scoreBreakdown 공통값 ──
  const fitFloor = { redevelopment: 65, primePremium: 70, investmentPremium: 65, policyDriven: 65, semiPremium: 70 }[specialMarketType];
  const fitScore = fitFloor != null ? Math.max(r.modelConf, fitFloor) : r.modelConf;
  const fitLabel = fitScore >= 80 ? "높음" : fitScore >= 60 ? "보통" : fitScore >= 40 ? "낮음" : "매우낮음";

  // 1) priceScore (가격 적정성) — 적정가 엔진 기반, 쌀수록 높음
  const priceScore = clamp(Math.round(55 - gap * 250), 5, 98);

  // ── 자금 가능성 ──
  const acqObj = acqTax(cur, (Number(f.areaExclusive) || 0) > 85, 1, PRIME_REGIONS.includes(f.region));
  const brokerage = Math.round(cur * 0.004), otherCost = 200; // 기타비용 매수/매도 200만 통일
  const totalBuyCost = cur + acqObj.total + brokerage + otherCost;
  const loan = Number(f.plannedLoanAmount) || 0;
  const cash = Number(f.availableCash) || 0;
  const income = Number(f.annualIncome) || 0;
  const existPay = Number(f.existingDebtPayment) || 0;
  const rate = Number(f.interestRate) || 3.8, years = Number(f.loanYears) || 30;
  const neededCash = Math.max(0, totalBuyCost - loan);
  const shortfallCash = Math.max(0, neededCash - cash);
  const monthlyPayment = monthlyPay(loan, rate, years);
  const monthlyRatio = income ? Math.round(((monthlyPayment * 12 + existPay) / income) * 100) : null;
  // 자금 정보 입력 여부 — 미입력 시 자금 판단 표시 안 함
  const hasFundInput = cash > 0 || loan > 0 || income > 0;
  const fundRisk = !income && !cash ? "미입력" : shortfallCash > 0 ? "자금부족" : monthlyRatio == null ? "소득미입력" : monthlyRatio > 45 ? "위험" : monthlyRatio > 30 ? "주의" : "안정";
  let affordabilityScore;
  if (!income && !cash) affordabilityScore = 50; // 미입력 중립
  else { affordabilityScore = 100; if (shortfallCash > 0) affordabilityScore -= 40; if (monthlyRatio != null && monthlyRatio > 45) affordabilityScore -= 30; else if (monthlyRatio != null && monthlyRatio > 30) affordabilityScore -= 12; affordabilityScore = clamp(affordabilityScore, 5, 98); }

  // ── 보유 가능성 ──
  const baseJeonse = (r.basis && r.basis.jeonse && r.basis.jeonse.value) || Math.round(cur * jr) || 0;
  const interestBurdenRatio = monthlyRatio; // 기존부채 포함 기준으로 통일 (자금·보유·최종판단 일관)
  const jeonseSafetyMargin = baseJeonse ? Math.round(((baseJeonse - loan) / baseJeonse) * 100) : null;
  const reverseJeonseRisk = baseJeonse && loan && baseJeonse < loan ? "높음" : (jeonseSafetyMargin != null && jeonseSafetyMargin < 20) ? "보통" : "낮음";
  const monthlyHoldingCost = monthlyPayment + 30; // +관리비 placeholder
  const rateShock = [0, 1, 2].map((d) => ({ delta: d, rate: (rate + d).toFixed(1), monthly: monthlyPay(loan, rate + d, years) }));
  const rateShockRisk = income ? ((rateShock[2].monthly * 12 + existPay) / income > 0.45 ? "높음" : "보통이하") : "소득미입력";
  let holdingScore;
  if (!income) holdingScore = 50;
  else { holdingScore = 90; if (reverseJeonseRisk === "높음") holdingScore -= 25; else if (reverseJeonseRisk === "보통") holdingScore -= 10; if (rateShockRisk === "높음") holdingScore -= 25; holdingScore = clamp(holdingScore, 5, 95); }

  // ── 시장 환경(시장 조건) 점수 — 추세 데이터 미연동, 가격은 priceScore로 별도 ──
  const shockScore = { 낮음: 90, 보통: 65, 높음: 40, 매우높음: 20 }[r.shock ? r.shock.level : "보통"] || 65;
  const supplyScore = { 낮음: 85, 보통: 60, 높음: 35 }[supplyRisk.level] || 60; // 공급은 supplyRisk(calculateSupplyShock)로 통일
  const ratePenalty = monthlyRatio != null && monthlyRatio > 45 ? 20 : monthlyRatio != null && monthlyRatio > 30 ? 10 : 0;
  const timingScore = clamp(Math.round(shockScore * 0.5 + supplyScore * 0.5 - ratePenalty), 5, 95); // 가격 이중반영 제거

  // ── 리스크 (안전도, 높을수록 안전) — 특수시장 위험은 marketRisk/최종판단에서만 반영(중복 제거) ──
  let riskScore = 72;
  riskScore -= supplyRisk.level === "높음" ? 15 : supplyRisk.level === "보통" ? 7 : 0;
  riskScore = clamp(riskScore, 5, 95);

  // ── 대체 후보 대비 (POOL 활용) ──
  const peers = POOL.length ? POOL : [];
  const avgDiscount = peers.length ? peers.reduce((s, c) => s + (c.fair - c.cur) / c.fair, 0) / peers.length : 0;
  const myDiscount = -gap;
  const comparisonResult = myDiscount > avgDiscount + 0.02 ? "우위" : myDiscount < avgDiscount - 0.02 ? "열위" : "평균";
  const comparisonScore = comparisonResult === "우위" ? 78 : comparisonResult === "평균" ? 55 : 35;

  // ── Opportunity Engine (호재·악재) — 적정가 미반영, 매수판단 보조 ──
  const opp = analyzeOpportunitySignals(f);
  const oppNorm = (opp.opportunityScore + 100) / 2; // -100~100 → 0~100
  // ── buyerScore (가격25·자금20·보유15·시장환경10·리스크10·호재악재10·입지5·분석적합도5) ──
  const livingScore = living.total;
  const locationScore = Math.round((living.items.교통 + living.items.학군) / 2);
  const buyerScore = Math.round(priceScore * 0.25 + affordabilityScore * 0.20 + holdingScore * 0.15 + timingScore * 0.10 + riskScore * 0.10 + oppNorm * 0.10 + locationScore * 0.05 + fitScore * 0.05);
  // ── 점수 분해 (가점/감점, 중립 50 기준 가중 기여분 — 합 ≈ buyerScore−50) ──
  const sgn = (s, w) => Math.round((s - 50) * w);
  const scoreBreakdown = [
    { label: "가격", score: priceScore, points: sgn(priceScore, 0.25) },
    { label: "자금", score: affordabilityScore, points: sgn(affordabilityScore, 0.20) },
    { label: "보유 가능성", score: holdingScore, points: sgn(holdingScore, 0.15) },
    { label: "시장 환경", score: timingScore, points: sgn(timingScore, 0.10) },
    { label: "공급·거래량", score: riskScore, points: sgn(riskScore, 0.10) },
    { label: "호재·악재", score: Math.round(oppNorm), points: sgn(oppNorm, 0.10) },
    { label: "입지", score: locationScore, points: sgn(locationScore, 0.05) },
    { label: "분석 적합도", score: fitScore, points: sgn(fitScore, 0.05) },
  ];

  // ── 신뢰도: 데이터40 + 모델30 + 리스크레이어30 → mock 차감 → 특수시장 상한 → 최저 20 ──
  const dataConfidence = r.dataConf, modelConfidence = r.modelConf;
  let decisionConfidence = Math.round(dataConfidence * 0.4 + modelConfidence * 0.3 + riskLayerScore * 0.3);
  // placeholder/mock 데이터 차감 (TODO(상용화): 실데이터 연결 시 해당 플래그 false → 차감 해제)
  const mockFlags = { school: true, supply: true, volume: true, popEmp: true, policy: true };
  let mockPenalty = 0;
  if (mockFlags.school) mockPenalty += 5;
  if (mockFlags.supply) mockPenalty += 5;
  if (mockFlags.volume) mockPenalty += 8;
  if (mockFlags.popEmp) mockPenalty += 8;
  if (mockFlags.policy) mockPenalty += 8;
  mockPenalty = Math.min(mockPenalty, 15); // 동일 원인(데모 데이터)에 대한 중복 차감 방지 — 총 -15 제한
  decisionConfidence -= mockPenalty;
  decisionConfidence = Math.max(20, decisionConfidence); // 특수시장이라고 신뢰도를 낮추지 않음 — 위험도는 MarketRisk로 분리
  // 일반 아파트 + 데이터·모델 충분 → 보조 신뢰도가 과도하게 낮아지지 않게 최소 70 보정
  if (specialMarketType === "normal" && r.dataConf >= 75 && r.modelConf >= 70) decisionConfidence = Math.max(decisionConfidence, 70);
  // ── MarketRisk (시장 위험도) — 재건축/강남/투자수요는 신뢰도가 아니라 위험도를 높인다 ──
  let mrs = 15;
  if (isSemi) mrs = 40;
  if (specialMarketType === "redevelopment") mrs = 70;
  else if (specialMarketType === "primePremium") mrs = 62;
  else if (specialMarketType === "investmentPremium") mrs = 75;
  else if (specialMarketType === "policyDriven") mrs = 68;
  if (premiumRatio > 1) mrs += 12;
  if (supplyRisk.level === "높음") mrs += 8;
  if (policyRisk.level === "높음") mrs += 6;
  if (specialMarketType === "redevelopment") mrs += mc.stageScore < 40 ? 8 : mc.stageScore >= 85 ? -6 : 0; // 초기 단계일수록 불확실성↑
  mrs = clamp(mrs, 5, 100);
  const marketRiskLevel = (specialMarketType === "lowData" || specialMarketType === "abnormalInput") ? "평가 불가" : mrs >= 75 ? "매우높음" : mrs >= 55 ? "높음" : mrs >= 35 ? "보통" : "낮음";
  const marketRisk = { score: mrs, level: marketRiskLevel };
  // 분석 적합도(fitScore/fitLabel)는 상단에서 계산 — buyerScore·scoreBreakdown과 동일 값 사용

  // ── 최종 판단 (고정 우선순위) ──
  // abnormal→보류 / lowData→보류 / 특수→투자검토·관망·고위험 / 자금부족→관망 / 부담>45→비추천 / 30~45→협상 / 점수
  let finalLabel, action;
  const mr = monthlyRatio; // 부담률(기존부채 포함)로 통일
  if (specialMarketType === "abnormalInput") { finalLabel = "판단 보류"; action = "현재가 입력 오류 가능성 — 값 확인 후 재분석하세요"; }
  else if (specialMarketType === "lowData") { finalLabel = "판단 보류"; action = "실거래·시세 데이터 부족 — 보강 후 재분석하세요"; }
  else if (isSpecial) {
    finalLabel = buyerScore >= 68 ? "가격 검토 가능" : buyerScore >= 52 ? "신중 접근" : "가격 부담 큼";
    action = finalLabel === "가격 부담 큼" ? "실사용가치 대비 프리미엄·리스크가 큽니다. 신중한 접근이 필요합니다" : "실사용가치와 시장가치를 분리해 가격 적정성을 판단하세요";
  }
  else if (shortfallCash > 0 && hasFundInput) { finalLabel = "자금 보강 필요"; action = `입력한 자금 기준으로 약 ${won(shortfallCash)}의 추가 자금이 필요합니다 (취득세·부대비용 포함)`; }
  else if (mr != null && mr > 45) { finalLabel = "자금 부담 큼"; action = `월상환 부담 ${mr}% (45% 초과) — 자금 여건 보강을 검토해보세요`; }
  else if (mr != null && mr >= 30) { finalLabel = "가격 협상 후 검토"; action = `월상환 부담 ${mr}% — 가격 협상으로 부담을 낮춘 뒤 검토하세요`; }
  else if (buyerScore >= 75) { finalLabel = "가격 조건 양호"; action = "적정가·자금·보유 여건 양호 — 가격 적정성 기준 매수를 검토해볼 수 있습니다"; }
  else if (buyerScore >= 55) { finalLabel = "협상 후 검토"; action = "가격 여건 보통 — 협상을 통한 가격 조정 후 검토를 고려해볼 수 있습니다"; }
  else if (buyerScore >= 40) { finalLabel = "신중 접근"; action = "가격·자금 여건 미흡 — 신중한 접근이 필요합니다"; }
  else { finalLabel = "가격 부담 큼"; action = "가격·자금·리스크 부담이 있습니다 — 신중한 접근이 필요합니다"; }
  // ── 정확도/신뢰도 위험 시 보수화 (일반 단지) ──
  if (!isSpecial && specialMarketType !== "abnormalInput" && specialMarketType !== "lowData") {
    const lowConf = decisionConfidence < 50 || mockPenalty >= 30;
    if (lowConf && finalLabel === "가격 조건 양호") { finalLabel = "협상 후 검토"; action = "데이터 신뢰도가 낮아 보수적으로 — 가격 협상 후 검토를 고려해볼 수 있습니다"; }
    else if (lowConf && finalLabel === "신중 접근" && buyerScore < 45) { finalLabel = "가격 부담 큼"; }
  }
  // ── 호재·악재 한 단계 조정 (일반 단지만, 자금 하드스톱 시 상향 금지, 특수시장 제외) ──
  if (!isSpecial && specialMarketType !== "lowData" && specialMarketType !== "abnormalInput") {
    const ladder = ["가격 부담 큼", "신중 접근", "협상 후 검토", "가격 조건 양호"];
    const finanHardStop = shortfallCash > 0 || (mr != null && mr > 45);
    let idx = ladder.indexOf(finalLabel);
    if (idx >= 0) {
      if (opp.opportunityLevel === "호재 우세" && !finanHardStop) idx = Math.min(3, idx + 1);
      else if (opp.opportunityLevel === "악재 우세") idx = Math.max(0, idx - 1);
      if (ladder[idx] !== finalLabel) { finalLabel = ladder[idx]; action += ` · 주변 ${opp.opportunityLevel} 반영`; }
    }
  }

  // ── 핵심 이유 5개 (가격·자금·보유/금리·시장위험·호재악재/특수) ──
  const reasons = [];
  if (isSpecial && premiumRatio > 0) reasons.push(`[가격] 실사용 ${won(intrinsicFairPrice)} vs 시장 ${won(marketReferencePrice)} — 프리미엄 ${(premiumRatio * 100).toFixed(0)}% 반영`);
  else reasons.push(gap < 0 ? `[가격] 적정가 대비 ${(Math.abs(gap) * 100).toFixed(1)}% 저평가 (현재 ${won(cur)} / 적정 ${won(finalFairPrice)})` : `[가격] 적정가 대비 ${(gap * 100).toFixed(1)}% ${gap > 0 ? "고평가" : "수준"} (현재 ${won(cur)} / 적정 ${won(finalFairPrice)})`);
  if ((income || cash) && shortfallCash > 0) reasons.push(`[자금] 추가 자금 약 ${won(shortfallCash)} 필요 (총 매입비용 ${won(totalBuyCost)}, 취득세·부대비용 포함)`);
  else if (income || cash) reasons.push(`[자금] 월상환 ${won(monthlyPayment)} · 소득대비 ${mr != null ? mr : "—"}% (${fundRisk})`);
  else reasons.push("[자금] 자금 정보 미입력 — 가격 위주 판단 (자금 입력 시 정밀화)");
  reasons.push(`[보유·금리] 월 보유비용 ${won(monthlyHoldingCost)}${income ? ` · 금리 +2%p 시 부담 ${rateShockRisk}` : " · 자금 입력 시 금리 시뮬 제공"}`);
  reasons.push(`[시장 위험] 시장 위험도 ${marketRisk.level} · 공급 ${supplyRisk.level}·정책 ${policyRisk.level} (데이터 신뢰도 ${r.dataConfLabel}·분석 적합도 ${fitLabel})${isSpecial && mc.reconstructionStage !== "none" ? ` · 재건축 ${RECON[mc.reconstructionStage].label}` : ""}`);
  if (isSpecial) reasons.push(`[특수시장] 이 단지는 일반 적정가보다 프리미엄과 시장 위험을 분리해서 해석해야 합니다 · 호재·악재 ${opp.summary}`);
  else reasons.push(`[호재·악재] ${opp.summary} — 적정가 미반영, 매수 판단 보조`);

  const sentences = buildBuyerSentences({ gap, specialMarketType, intrinsicFairPrice, marketReferencePrice, premiumRatio, shortfallCash, monthlyRatio, supplyLevel: supplyRisk.level, policyLevel: policyRisk.level, populationLevel: populationRisk.level });

  return {
    specialMarketType, isSpecial, isSemi, premiumScore, premiumLevel: mc.premiumLevel, classificationReasons: mc.classificationReasons, marketWarnings: mc.warnings, mc,
    intrinsicFairPrice, marketReferencePrice, finalFairPrice, premiumAmount, premiumRatio,
    priceScore, affordabilityScore, holdingScore, timingScore, riskScore, comparisonScore, livingScore, locationScore, buyerScore,
    dataConfidence, modelConfidence, decisionConfidence, marketRisk, fitScore, fitLabel, riskLayer, riskLayerScore,
    scoreBreakdown, premiumBreakdown: mc.premiumBreakdown, reconstructionStage: mc.reconstructionStage, stageScore: mc.stageScore, fairBands: computeFairBands(r, mc),
    affordability: { acqTax: acqObj.total, brokerage, otherCost, totalBuyCost, neededCash, shortfallCash, monthlyPayment, monthlyRatio, fundRisk },
    holding: { monthlyHoldingCost, interestBurdenRatio, reverseJeonseRisk, jeonseSafetyMargin, rateShock, rateShockRisk },
    timing: { score: timingScore, trendAvailable: false },
    comparison: { result: comparisonResult, score: comparisonScore }, opportunity: opp,
    finalLabel, action, reasons, sentences, hasFundInput,
  };
}

export {
  analyzeSellerDecision, analyzeBuyerDecision,
  calculateSupplyShock, calculateVolumeRisk,
  calculatePopulationRisk, calculateEmploymentRisk, calculatePolicyRisk,
  SCHOOL_ZONES, SCARCITY_ZONES, PRIME_REGIONS, PREMIUM_LEVEL, CONF_CAP,
  RECON, estimateReconstructionStage,
  computeFairBands, classifyApartmentMarket,
};
