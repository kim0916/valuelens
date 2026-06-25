// ValueLens Engine — 시장 분석 (매도 판단, 위험도, 시장 분류)
// ★ 계산 로직 수정 금지

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


export {
  analyzeSellerDecision,
  calculateSupplyShock, calculateVolumeRisk,
  calculatePopulationRisk, calculateEmploymentRisk, calculatePolicyRisk,
  SCHOOL_ZONES, SCARCITY_ZONES, PRIME_REGIONS, PREMIUM_LEVEL, CONF_CAP,
  RECON, estimateReconstructionStage,
  computeFairBands, classifyApartmentMarket,
};
