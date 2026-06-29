import { sqmToPyeong } from '../utils/pyeong.js';
// ValueLens Engine — 핵심 적정가 분석 엔진
// ★ 이 파일의 계산 로직은 절대 수정하지 않는다.

const FALLBACK_RATIO = 0.55; // 동적 전세가율 불가 시 보수값

const MARKET_TRENDS = {
  "강남구": -9.2, "서초구": -9.2, "송파구": -9.2,
  "노원구": 4.1,
  "성남시 분당구": 5.0, "분당구": 5.0,
  "연수구": 0.8,
  "마포구": -0.5,
};

function getRegionTrend(region) {
  if (!region) return 0.3;
  for (const [key, val] of Object.entries(MARKET_TRENDS)) {
    if (region.includes(key)) return val;
  }
  return 0.3;
}

function isRisingMarket(region) {
  return getRegionTrend(region) >= 2.0;
}

function isPremiumComplex(region, actualRatio, buildYear) {
  if (actualRatio == null) return false;
  if (["강남구","서초구","송파구"].some(g => (region||"").includes(g)) && actualRatio < 0.50) return true;
  if (actualRatio < 0.35) return true;
  if (buildYear && Number(buildYear) <= 1995 && actualRatio < 0.50) return true;
  return false;
}

function isExcludedType(areaSqm) {
  return Number(areaSqm) > 0 && Number(areaSqm) <= 20;
}

const CONFIG = {
  // targetRatio 제거 — 동적 전세가율 + FALLBACK_RATIO로 대체
  safetyMargin: 0.05,
  grade: { A: -0.15, B: -0.05, C: 0.05, D: 0.15 },
  bubble: { under: -0.1, over: 1.0 },
  shock: { 낮음: { lag: 1, pen: 0, step: 0 }, 보통: { lag: 1, pen: 0.07, step: 0 }, 높음: { lag: 2, pen: 0.15, step: 1 }, 매우높음: { lag: 3, pen: 0.25, step: 2 } },
  ratioBand: { jeonseMin: 0.5, blendMin: 0.45 }, // ≥0.50 전세엔진 / 0.45~0.50 혼합 / <0.45 매매엔진
  dynClamp: { lo: 0.3, hi: 0.85 },               // 동적 전세가율 허용 범위 (고급·대형 저전세가율 수용)
};
const GRADES = ["A", "B", "C", "D", "E"];
const LABEL = { A: "매우 저평가", B: "저평가", C: "적정 가격", D: "고평가 주의", E: "고평가", 보류: "판단 보류" };
const GS = {
  A: { solid: "bg-emerald-600", text: "text-emerald-700" },
  B: { solid: "bg-emerald-500", text: "text-emerald-600" },
  C: { solid: "bg-amber-400", text: "text-amber-700" },
  D: { solid: "bg-orange-500", text: "text-orange-700" },
  E: { solid: "bg-red-600", text: "text-red-700" },
  보류: { solid: "bg-slate-400", text: "text-slate-600" },
};
const won = (m) => { if (!m || isNaN(Number(m)) || Number(m) === 0) return "—"; return m >= 10000 ? (Math.round((m / 10000) * 100) / 100).toLocaleString() + "억" : Number(m).toLocaleString() + "만원"; };
const pct = (r) => (r > 0 ? "+" : "") + (r * 100).toFixed(1) + "%";
// 전용면적(㎡) → 통상 분양평형 추정 (한국 분양 관행 매핑). 못 구하면 0.
// typicalPyeong → pyeong.js sqmToPyeong 사용

// 공급면적(㎡)과 평수 계산 — supplySqm이 없으면 전용 × 1.35 추정
function supplyAreaInfo(exclusiveSqm, supplySqm) {
  const excl = Number(exclusiveSqm) || 0;
  if (supplySqm && Number(supplySqm) > 0) {
    const supply = Math.round(Number(supplySqm));
    return { supply, pyeong: sqmToPyeong(supply).pyeong, estimated: false };
  }
  // 공급면적 모르면 전용 ÷ 0.77 추정 (전용률 77% 가정 → 33평 정확)
  const supply = excl > 0 ? Math.round(excl / 0.77) : 0;
  return { supply, pyeong: supply > 0 ? sqmToPyeong(supply).pyeong : 0, estimated: true };
}

// 면적 버튼 라벨: 네이버 방식 — 공급면적(109㎡) 기준 + 하단 "전용 84.97㎡"
function areaButtonLabel(exclusiveSqm, supplySqm) {
  const excl = Number(exclusiveSqm) || 0;
  const supply = supplySqm && Number(supplySqm) > 0 ? Math.round(Number(supplySqm)) : null;
  if (supply) {
    const supplyPyeong = sqmToPyeong(supply).pyeong;
    return {
      mainLabel: `${supply}㎡ (${supplyPyeong}평)`,
      subLabel: `전용 ${excl}㎡ 기준 분석`,
    };
  }
  // 공급면적 없으면 전용 × 1.35 추정
  const estSupply = excl > 0 ? Math.round(excl / 0.77) : 0;
  const estPyeong = estSupply > 0 ? sqmToPyeong(estSupply).pyeong : 0;
  return {
    mainLabel: estSupply > 0 ? `${estSupply}㎡ (${estPyeong}평, 추정)` : `전용 ${excl}㎡`,
    subLabel: excl > 0 ? `전용 ${excl}㎡ 기준 분석` : "",
  };
}
// exclusivePyeong → pyeong.js 사용
const areaLabel = (sqm) => { sqm = Number(sqm) || 0; return sqm > 0 ? `전용 ${sqm}㎡ · 통상 약 ${typicalPyeong(sqm)}평형` : "면적 미확인"; };
const shift = (g, s) => GRADES[Math.max(0, Math.min(4, GRADES.indexOf(g) - s))];
// ratioOf 제거 — isPremiumComplex + FALLBACK_RATIO로 대체

function analyze(f) {
  // regionRatio 완전 제거 — 동적 전세가율 + FALLBACK_RATIO로 대체
  const jeonseUsed = f.jeonseUsed || 0, saleUsed = f.saleUsed || 0;
  const saleRef = f.saleRef || 0, baseJeonse = f.baseJeonse || 0;
  const actualRatio = saleRef > 0 && baseJeonse > 0 ? Math.round((baseJeonse / saleRef) * 1000) / 1000 : null;
  const buildYear = f.buildYear ? Number(f.buildYear) : null;
  const areaSqm   = Number(f.areaExclusive) || 0;

  // 표본 신뢰 등급 (전세 표본 5↑ 정상 / 3~4 보통 / 1~2 낮음 / 0 매우낮음)
  const lvl = (n) => (n >= 5 ? "정상" : n >= 3 ? "보통" : n >= 1 ? "낮음" : "매우낮음");
  const jLevel = lvl(jeonseUsed), sLevel = lvl(saleUsed);
  const jeonseReliable = jeonseUsed >= 3; // 전세 기반 적정가 사용 최소선 (1~2건은 미사용)
  const saleReliable = saleUsed >= 3;

  // 이상치 제거
  const isExcluded   = isExcludedType(areaSqm);
  const ratioInvalid = actualRatio != null && actualRatio > 1.0;
  const ratioWarn    = actualRatio != null && actualRatio > 0.80 && !ratioInvalid;

  // 프리미엄/재건축 판별
  const isPremium = isPremiumComplex(f.region, actualRatio, buildYear);

  // 동적 전세가율 (백테스트 v3)
  const CL = CONFIG.dynClamp;
  let dynamicRatio = null;
  if (jeonseReliable && saleReliable && actualRatio != null
      && actualRatio >= CL.lo && actualRatio <= CL.hi && !ratioInvalid) {
    dynamicRatio = actualRatio;
  }
  const usedRatio = dynamicRatio ?? FALLBACK_RATIO;

  // 전세기반 적정가 (구간별 보정)
  let jeonseFair;
  if (actualRatio != null && actualRatio >= 0.60 && jeonseReliable) {
    jeonseFair = Math.round(baseJeonse / usedRatio * 0.96);
  } else if (actualRatio != null && actualRatio >= 0.50 && jeonseReliable) {
    jeonseFair = Math.round(baseJeonse / usedRatio * 1.01);
  } else if (actualRatio != null && actualRatio >= 0.45 && jeonseReliable) {
    jeonseFair = Math.round(baseJeonse / usedRatio * 1.06);
  } else {
    jeonseFair = Math.round(baseJeonse / usedRatio);
  }
  const conservativePrice = Math.round(baseJeonse / FALLBACK_RATIO);
  const saleFair = saleRef;

  // 데이터 경고
  const dataWarnings = [];
  if (isExcluded) dataWarnings.push("소형(20㎡ 이하) 물건 — 아파트 엔진 미적용");
  if (ratioInvalid) dataWarnings.push("전세가율 100% 초과 — 데이터 오류 의심");
  if (ratioWarn) dataWarnings.push(`전세가율 ${(actualRatio*100).toFixed(0)}% 초과 — 역전세 또는 특수 사정 확인 필요`);
  if (jeonseUsed > 0 && jeonseUsed < 3) dataWarnings.push(`전세 실거래 ${jeonseUsed}건 — 3건 미만, 신뢰도 낮음`);
  if (saleUsed > 0 && saleUsed < 3) dataWarnings.push(`매매 실거래 ${saleUsed}건 — 3건 미만, 신뢰도 낮음`);

  // ── 엔진 분기 v3 (백테스트 기반) ──
  const B = CONFIG.ratioBand;
  let engineMode, mainPrice = null, holdReason = null;

  if (isExcluded) {
    engineMode = "hold"; holdReason = "소형(20㎡ 이하) 물건은 아파트 엔진 미적용";
  } else if (ratioInvalid) {
    engineMode = "hold"; holdReason = "전세가율 100% 초과 — 데이터 오류 의심, 입력값 확인 필요";
  } else if (!jeonseReliable && !saleReliable) {
    engineMode = "hold"; holdReason = `전세·매매 실거래 표본이 모두 부족합니다 (전세 ${jeonseUsed}건, 매매 ${saleUsed}건 — 각 3건 이상 필요)`;
  } else if (isPremium && saleReliable) {
    const premiumAdj = ["강남구","서초구","송파구"].some(g => (f.region||"").includes(g)) ? 1.05 : 1.0;
    engineMode = "sale"; mainPrice = Math.round(saleRef * premiumAdj);
  } else if (isPremium && jeonseReliable && actualRatio != null) {
    engineMode = "jeonse"; mainPrice = jeonseFair;
  } else if (isPremium) {
    engineMode = "hold"; holdReason = "재건축·학군·희소성 영향 단지 — 매매·전세 실거래 부족으로 판단 보류";
  } else if (actualRatio == null) {
    if (jeonseReliable) { engineMode = "jeonse"; mainPrice = jeonseFair; }
    else { engineMode = "hold"; holdReason = "전세 실거래 표본 부족 — 하단에서 실거래 직접 입력하거나 KB전세시세를 확인하세요"; }
  } else if (actualRatio >= B.jeonseMin) {              // ≥0.50 → 전세 엔진
    if (jeonseReliable) { engineMode = "jeonse"; mainPrice = jeonseFair; }
    else if (saleReliable) { engineMode = "sale"; mainPrice = saleFair; }
    else { engineMode = "hold"; holdReason = "전세 실거래 표본 부족 — 하단에서 직접 입력해 주세요"; }
  } else if (actualRatio >= B.blendMin) {              // 0.45~0.50 → 혼합
    if (jeonseReliable && saleReliable) { engineMode = "blend"; mainPrice = Math.round((jeonseFair + saleFair) / 2); }
    else if (saleReliable) { engineMode = "sale"; mainPrice = saleFair; }
    else if (jeonseReliable) { engineMode = "jeonse"; mainPrice = jeonseFair; }
    else { engineMode = "hold"; holdReason = "실거래 표본 부족 — 하단에서 직접 입력해 주세요"; }
  } else {                                              // <0.45 → 매매 엔진 (전세 부적합)
    if (saleReliable) { engineMode = "sale"; mainPrice = saleFair; }
    else { engineMode = "hold"; holdReason = "전세가율이 낮아 전세 기반 적정가가 부적합하고, 매매 표본도 부족합니다"; }
  }

  const fairPrice = mainPrice ?? (saleReliable ? saleFair : jeonseFair); // 표시 대표값
  const safetyPrice = Math.round(fairPrice * (1 - CONFIG.safetyMargin));
  const gapRatio = engineMode === "hold" || !mainPrice ? 0 : Math.round(((f.currentPrice - mainPrice) / mainPrice) * 10000) / 10000;

  // 매매 엔진일 때 '왜 전세가율이 낮은가' 분류 (재건축 노후 vs 신축 고급). 연식 필요.
  const age = f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : null;
  let saleType = null, saleNote = null;
  if (engineMode === "sale" || engineMode === "blend") {
    if (age != null && age >= 28) { saleType = "redev"; saleNote = `재건축 기대가 반영된 시세입니다. 전세 기반 실사용 가치(약 ${won(jeonseFair)})와 괴리가 크고, 재건축 진행·무산·분담금 리스크가 가격에 내재돼 있습니다. 아래 등급은 '시장 시세 대비' 판단이며 내재가치 기준이 아닙니다.`; }
    else if (age != null && age <= 12) { saleType = "premium"; saleNote = `전세가율이 낮은 신축·고급 단지입니다. 매매 시세가 실사용 가치를 앞서며, 등급은 시장 시세 추종 판단입니다.`; }
    else { saleType = "generic"; saleNote = `전세가율이 낮은 편이라 매매 비중을 높여 판단했습니다.${age == null ? " (연식 미입력 — 재건축 여부 판별 불가)" : ""}`; }
  }
  let bubbleIndex = null;
  if (f.m) {
    const sr = f.m.regionSaleGrowth ? f.m.saleGrowth / f.m.regionSaleGrowth : 0;
    const jr = f.m.regionJeonseGrowth ? f.m.jeonseGrowth / f.m.regionJeonseGrowth : 0;
    bubbleIndex = Math.round((sr - jr) * 1000) / 1000;
  }
  const sh = CONFIG.shock[f.shockLevel] ?? CONFIG.shock.보통;

  // ── 데이터 신뢰도(입력 표본 품질) vs 모델 신뢰도(엔진 적합도) 분리 ──
  const ord = { 정상: 0, 보통: 1, 낮음: 2, 매우낮음: 3 };
  const worse = (a, b) => (ord[a] >= ord[b] ? a : b);
  const mainLevel = engineMode === "sale" ? sLevel : engineMode === "blend" ? worse(jLevel, sLevel) : jLevel;
  const jc = f.jeonseCalc, sc = f.saleCalc;
  const mainCalc = engineMode === "sale" ? sc : engineMode === "blend" ? (ord[jLevel] >= ord[sLevel] ? jc : sc) : jc;
  const exclRatio = mainCalc && mainCalc.total ? mainCalc.excluded / mainCalc.total : 0;
  const kbW = mainCalc ? mainCalc.kbWeight || 0 : 0;
  let dataConf = ({ 정상: 88, 보통: 62, 낮음: 38, 매우낮음: 15 }[mainLevel] ?? 30);
  const samplePen = Math.max(Math.min(exclRatio, 0.5) * 0.4, kbW * 0.5); // 표본부족 페널티 1회만 (제외비율·KB가중 중 큰 쪽)
  dataConf = Math.round(dataConf * (1 - samplePen));
  if (f.dataSource === "ai") dataConf = Math.round(dataConf * 0.85); // AI 수집은 미검증이라 할인
  dataConf = Math.max(8, Math.min(95, dataConf));

  // ── 판단 보류 강화 ──
  if (engineMode !== "hold") {
    if (Math.abs(gapRatio) > 0.5) { engineMode = "hold"; holdReason = "입력 매물가가 정제 시세와 ±50% 이상 차이나 입력 오류가 의심됩니다"; }
    else if (dataConf < 28) { engineMode = "hold"; holdReason = "유효 표본·데이터 신뢰도가 낮아 판단을 보류합니다"; }
    else if (exclRatio > 0.6) { engineMode = "hold"; holdReason = "실거래 편차가 커 이상치 제외 비율이 과도합니다"; }
  }
  const isHold = engineMode === "hold";

  // 모델 신뢰도 (엔진이 이 케이스를 얼마나 잘 설명하는가)
  let modelConf = 82;
  if ((engineMode === "jeonse" || engineMode === "blend") && dynamicRatio == null) modelConf = Math.round(modelConf * 0.8);
  if (engineMode === "blend") modelConf = Math.round(modelConf * 0.85);
  if (saleType === "redev") modelConf = Math.round(modelConf * 0.85);   // 재건축 위험은 적합도가 아니라 MarketRisk로 처리
  else if (saleType === "premium") modelConf = Math.round(modelConf * 0.90);
  if (sh.step > 0) modelConf = Math.round(modelConf * (1 - sh.pen));
  if (!isHold) modelConf = Math.max(modelConf, 50); // 곱셈 누적 과도 방지: 비보류 분석 적합도 하한
  if (isHold) modelConf = Math.min(modelConf, 22);
  modelConf = Math.max(8, Math.min(95, modelConf));

  // 종합 신뢰도 (약한 쪽에 가중)
  let conf = isHold ? Math.min(dataConf, modelConf, 25) : Math.round(Math.min(dataConf, modelConf) * 0.65 + Math.max(dataConf, modelConf) * 0.35);
  conf = Math.max(8, conf);
  const lblOf = (v) => (v >= 70 ? "높음" : v >= 50 ? "보통" : v >= 32 ? "낮음" : "매우낮음");
  const confLabel = lblOf(conf), dataConfLabel = lblOf(dataConf), modelConfLabel = lblOf(modelConf);

  // ── 등급 ──
  const gradeOf = (gap) => gap <= CONFIG.grade.A ? "A" : gap <= CONFIG.grade.B ? "B" : gap <= CONFIG.grade.C ? "C" : gap <= CONFIG.grade.D ? "D" : "E";
  let buyGrade, gradeLabel;
  if (isHold) { buyGrade = "보류"; gradeLabel = "판단 보류"; }
  else {
    let g = gradeOf(gapRatio);
    if (bubbleIndex != null && engineMode !== "sale") { if (bubbleIndex <= CONFIG.bubble.under) g = shift(g, 1); else if (bubbleIndex >= CONFIG.bubble.over) g = shift(g, -1); }
    if (sh.step > 0) g = shift(g, -sh.step);
    buyGrade = g; gradeLabel = LABEL[g];
  }

  const ceiling = Math.min(f.currentPrice, fairPrice);
  const negotiation = { start: Math.round(ceiling * 0.96), max: Math.round(ceiling) };
  const discount = Math.max(0, Math.min(100, Math.round(50 - gapRatio * 200)));
  const shockScore = { 낮음: 100, 보통: 70, 높음: 45, 매우높음: 25 }[f.shockLevel] ?? 70;
  const priceHealthScore = isHold ? null : Math.round(discount * 0.5 + conf * 0.3 + shockScore * 0.2);

  const modeName = { jeonse: "전세 기반 엔진", blend: "혼합 엔진", sale: "매매 정제평균 엔진", hold: "판단 보류" }[engineMode];
  const ratioNote = actualRatio != null ? `전세가율 ${(actualRatio*100).toFixed(1)}% → ${modeName}${dynamicRatio ? ` (동적 전세가율 ${(dynamicRatio*100).toFixed(1)}% 적용)` : ` (fallback ${(FALLBACK_RATIO*100).toFixed(0)}% 적용)`}` : `매매 시세 없음 · ${modeName}`;

  // ── 추천 이유 3줄 ──
  const reasons = [];
  if (isHold) {
    reasons.push(`판단 보류 — ${holdReason}`);
    reasons.push(`전세 실거래 ${jeonseUsed}건 · 매매 실거래 ${saleUsed}건 (유효 표본 5건 이상 권장)`);
    reasons.push(`현재가 ${won(f.currentPrice)}는 등급 없이 참고 시세로만 비교하세요`);
  } else {
    const gp = Math.abs(gapRatio * 100).toFixed(1);
    reasons.push(`${modeName} 적정가 ${won(fairPrice)} 대비 현재가 ${won(f.currentPrice)} — ${gapRatio < 0 ? gp + "% 저렴" : gp + "% 비쌈"}`);
    if (saleType === "redev") reasons.push(`재건축 기대가 가격에 반영됨 — 전세 실사용가치 ${won(jeonseFair)}와 큰 괴리, 사업 무산·분담금 리스크 내재`);
    else if (saleType === "premium") reasons.push(`신축·고급 단지로 전세가율이 낮아 매매 시세를 기준으로 판단`);
    else if (engineMode === "jeonse") reasons.push(`전세가율 ${actualRatio} 정상권 — 전세 기반 적정가 신뢰 가능`);
    else reasons.push(`전세가율 ${actualRatio} 경계 — 전세·매매 혼합 기준`);
    reasons.push(`데이터 신뢰도 ${dataConfLabel} · 시장충격 ${f.shockLevel}`);
  }

  // ── 적정가 산출 근거 ──
  const basis = { jeonse: jc ? { value: jc.value, used: jc.used, excluded: jc.excluded, total: jc.total } : null, sale: sc ? { value: sc.value, used: sc.used, excluded: sc.excluded, total: sc.total } : null, ratioUsed: dynamicRatio ?? (engineMode === "jeonse" || engineMode === "blend" ? usedRatio : null), ratioKind: dynamicRatio ? "실측 동적" : (engineMode === "jeonse" || engineMode === "blend" ? "fallback" : null), steps: [] };
  if (!isHold) {
    if (engineMode === "jeonse") basis.steps = [`전세 정제평균 ${won(baseJeonse)} (사용 ${jeonseUsed}건)`, `÷ 전세가율 ${dynamicRatio ?? usedRatio} (${dynamicRatio ? "실측 동적" : "보수 fallback"})`, `= 전세 기반 적정가 ${won(fairPrice)}`];
    else if (engineMode === "sale") basis.steps = [`매매 정제평균 ${won(saleFair)} (사용 ${saleUsed}건)`, `전세 기반 참고가 ${won(jeonseFair)} — 전세가율 낮아 메인 미사용`, `= 매매 기준 적정가 ${won(fairPrice)}`];
    else basis.steps = [`전세 기반 ${won(jeonseFair)} · 매매 정제 ${won(saleFair)}`, `경계 전세가율 ${actualRatio} → 두 값 평균`, `= 혼합 적정가 ${won(fairPrice)}`];
  }

  let headline;
  if (engineMode === "hold") headline = "현재 데이터로는 판단을 보류합니다";
  else if (engineMode === "sale") headline = gapRatio > CONFIG.grade.C ? "매매 시세 대비 다소 높습니다" : gapRatio < CONFIG.grade.B ? "매매 시세 대비 저렴한 편입니다" : "매매 시세 수준입니다";
  else headline = gapRatio > CONFIG.grade.D ? "현재 가격은 적정가 대비 높습니다" : gapRatio > CONFIG.grade.C ? "협상 후 접근을 검토해볼 수 있습니다" : "현재 가격은 적정가 수준입니다";
  if (saleType === "redev") headline = "재건축 기대가 반영된 시세입니다";

  const explain = engineMode === "hold"
    ? { valuation: `${holdReason}. 이번 분석은 등급을 산출하지 않으며 참고용으로만 사용하세요.`, review: `전세 표본 ${jeonseUsed}건 · 매매 표본 ${saleUsed}건. 표본이 5건 이상 쌓이면 정상 판정이 가능합니다.`, negotiation: `${saleReliable ? `매매 정제평균(${won(saleFair)})` : jeonseReliable ? `전세 기반 참고가(${won(jeonseFair)})` : "참고 시세"}는 협상의 출발선 정도로만 보세요.` }
    : { valuation: `${ratioNote}. 현재 매물가(${won(f.currentPrice)})는 엔진 산출 적정가(${won(mainPrice)})보다 약 ${Math.abs(gapRatio * 100).toFixed(1)}% ${gapRatio < 0 ? "낮은" : "높은"} 수준입니다.`, review: engineMode === "sale" ? `이 단지는 전세가율이 낮아 전세 기반 적정가(참고 ${won(conservativePrice)})를 메인으로 쓰지 않고 매매 정제평균을 기준으로 판단했습니다.` : `보수 기준가(${won(conservativePrice)}) 대비로는 ${f.currentPrice > conservativePrice ? "다소 높은" : "낮은"} 편입니다. 안전마진 고려 시 ${won(safetyPrice)} 이하에서 부담이 낮아집니다.`, negotiation: `협상은 ${won(negotiation.start)} 선에서 시작해 ${won(negotiation.max)} 이내에서 마무리하는 접근을 참고하세요.` };

  return {
    engineMode, modeName, holdReason, fairPrice, jeonseFair, saleFair, conservativePrice, actualRatio, dynamicRatio, usedRatio, isPremium, ratioWarn, dataWarnings,
    jLevel, sLevel, mainLevel, jeonseUsed, saleUsed, age, saleType, saleNote, safetyPrice, gapRatio, buyGrade, gradeLabel, headline, bubbleIndex,
    confidenceScore: conf, confLabel, dataConf, dataConfLabel, modelConf, modelConfLabel, reasons, basis, ratioNote, negotiation, priceHealthScore, shock: { level: f.shockLevel || "보통", lag: sh.lag }, explain,
  };
}
// 매도 모드: 백테스트 v3 — 시장 방향성 필터 적용
// 매도 적중률 38.8%로 낮으므로 "매도 추천" 대신 "고평가 주의/보유 리스크 점검"으로 표현
function sellVerdict(r) {
  if (r.engineMode === "hold") return {
    key: "HOLD", label: "판단 보류", tone: "amber",
    advice: `${r.holdReason}. 호가 적정성을 평가하기엔 데이터가 부족합니다.`
  };
  const g = r.gapRatio;
  const region = r.region || "기타";
  const rising = isRisingMarket(region);
  const trend  = getRegionTrend(region);
  const trendStr = `${trend > 0 ? "+" : ""}${trend.toFixed(1)}%`;

  if (g > 0.10) {
    if (rising) return {
      key: "HIGH_RISING", label: "고평가 — 보유 리스크 점검", tone: "amber",
      advice: `적정가보다 10% 이상 높지만 지역 시장 상승 중(${trendStr})입니다. 목표가 도달 시 일부 매도를 고려하거나 보유 리스크를 점검하세요.`
    };
    return {
      key: "HIGH", label: "고평가 주의", tone: "red",
      advice: "적정가보다 10% 이상 높습니다. 호가 조정 또는 매도 검토가 필요합니다. 시장 약세 시 가격 조정 가능성이 있습니다."
    };
  }
  if (g > 0.03) {
    if (rising) return {
      key: "ABIT_RISING", label: "고평가 — 보유 가능", tone: "slate",
      advice: `지역 시장 상승 중(${trendStr})으로 보유 유지 가능합니다. 상승 추세 둔화 시 매도 검토를 고려해볼 수 있습니다.`
    };
    return {
      key: "ABIT", label: "고평가 주의", tone: "amber",
      advice: "적정가보다 다소 높습니다. 시장 강세 시 보유 가능하나, 거래량 감소 시 조정을 고려하세요."
    };
  }
  if (g >= -0.03) return {
    key: "FAIR", label: "적정 호가", tone: "emerald",
    advice: "적정가 수준의 호가입니다. 무난하게 거래될 가능성이 높습니다."
  };
  if (g >= -0.10) return {
    key: "LOW", label: "시세보다 낮음", tone: "blue",
    advice: "적정가보다 낮은 호가입니다. 빠른 거래를 원하면 적합하지만, 급하지 않다면 호가를 올릴 여지가 있습니다."
  };
  return {
    key: "TOOLOW", label: "매우 낮은 호가", tone: "blue",
    advice: "적정가 대비 10% 이상 낮습니다. 급매가 아니라면 호가를 재검토하세요."
  };
}


// ════════ SELL DECISION ENGINE ════════ (적정가 결과 r을 참고만 함 — 적정가 계산식 불변)
// sellVerdict는 '호가 적정성'만 판단하는 보조 함수로 격하. 최종 매도 판단은 analyzeSellerDecision이 담당.

export {
  FALLBACK_RATIO, MARKET_TRENDS,
  getRegionTrend, isRisingMarket, isPremiumComplex, isExcludedType,
  CONFIG, GRADES, LABEL, GS,
  analyze, sellVerdict,
};
