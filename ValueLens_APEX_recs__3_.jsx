import React, { useState, useEffect } from "react";
import { RotateCcw, X, ArrowUpRight, ArrowDownRight, Search, RefreshCw, Sparkles, AlertTriangle, Activity, Gauge } from "lucide-react";

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
.vl-root{font-family:'Sora',sans-serif;-webkit-font-smoothing:antialiased;}
.vl-mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;}
.vl-serif{font-family:'Fraunces',serif;}
.vl-input{width:100%;background:#0d0f13;border:1px solid rgba(255,255,255,0.09);color:#eceef1;font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;font-size:15px;padding:9px 11px;border-radius:9px;outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box;}
.vl-input:focus{border-color:#34d399;box-shadow:0 0 0 3px rgba(52,211,153,0.13);}
.vl-search{width:100%;background:#0d0f13;border:1px solid rgba(255,255,255,0.12);color:#eceef1;font-family:'Sora',sans-serif;font-size:15px;padding:12px 14px;border-radius:11px;outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box;}
.vl-search:focus{border-color:#34d399;box-shadow:0 0 0 3px rgba(52,211,153,0.13);}
.vl-name{background:transparent;border:none;color:#f4f5f7;font-family:'Fraunces',serif;font-size:22px;font-weight:600;outline:none;padding:0;}
.vl-select{background:#0d0f13;border:1px solid rgba(255,255,255,0.12);color:#cbd0d8;font-family:'Sora',sans-serif;font-size:12px;font-weight:600;border-radius:8px;padding:5px 8px;outline:none;cursor:pointer;}
.vl-card{transition:transform .22s cubic-bezier(.2,.7,.3,1),border-color .22s,box-shadow .22s;animation:vlrise .5s cubic-bezier(.2,.7,.3,1) both;}
.vl-card:hover{border-color:rgba(255,255,255,0.16);box-shadow:0 18px 40px -22px rgba(0,0,0,0.8);}
.vl-btn{transition:all .15s ease;cursor:pointer;}
.vl-btn:hover{filter:brightness(1.12);}
.vl-btn:active{transform:scale(.97);}
.vl-btn:disabled{opacity:.5;cursor:not-allowed;}
.vl-ghost{transition:all .15s ease;cursor:pointer;color:#6b7280;}
.vl-ghost:hover{color:#e5e7eb;}
@keyframes vlrise{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
@keyframes vlspin{to{transform:rotate(360deg);}}
.vl-spin{animation:vlspin 1s linear infinite;}
input.vl-slider{accent-color:#34d399;height:4px;cursor:pointer;}
.vl-label{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7b818c;font-weight:600;}
@media (max-width:480px){
  .vl-root{padding:24px 12px 56px !important;}
  .vl-root h1{font-size:30px !important;}
  .vl-card{padding-left:15px !important;padding-right:15px !important;}
  .vl-grid-3{grid-template-columns:1fr 1fr !important;}
}
`;

const KEY = "valuelens:state:v11-apex";
const LOGKEY = "valuelens:log:v2";
const OVKEY = "valuelens:overview:v1";
const MKTLOGKEY = "valuelens:mktlog:v1";
const BUYKEY = "valuelens:buyprices:v1";
const C = { buy: "#34d399", hold: "#fbbf24", trim: "#f87171" };
const ZONE = {
  buy: { label: "매수 추천", color: C.buy },
  hold: { label: "보유", color: C.hold },
  trim: { label: "매도 추천", color: C.trim },
};
const TYPES = [
  { v: "growth", label: "성장주 · PER" },
  { v: "cyclical", label: "사이클주 · 블렌드" },
  { v: "financial", label: "금융주 · PBR×ROE" },
  { v: "stable", label: "안정주 · PER" },
];

const SECTOR_GROUPS = [
  { group: "전체", items: [{ v: "any", label: "섹터 전체", en: "" }] },
  { group: "반도체", items: [
    { v: "semi_mem", label: "메모리(DRAM·낸드)", en: "memory semiconductors (DRAM, NAND, HBM)" },
    { v: "semi_foundry", label: "파운드리·시스템", en: "foundry / system semiconductors" },
    { v: "semi_fabless", label: "팹리스·AI칩", en: "fabless chip designers / AI chips (GPU, NPU)" },
    { v: "semi_equip", label: "장비", en: "semiconductor equipment makers" },
    { v: "semi_mat", label: "소재·부품(소부장)", en: "semiconductor materials and components" },
  ] },
  { group: "IT·인터넷", items: [
    { v: "it_platform", label: "인터넷·플랫폼", en: "internet / platform companies" },
    { v: "it_sw", label: "소프트웨어·SaaS", en: "software / SaaS companies" },
    { v: "it_ai", label: "AI·클라우드", en: "AI / cloud computing companies" },
    { v: "game", label: "게임", en: "video game developers / publishers" },
  ] },
  { group: "2차전지·자동차", items: [
    { v: "battery_cell", label: "배터리 셀", en: "EV battery cell manufacturers" },
    { v: "battery_mat", label: "배터리 소재", en: "EV battery materials (cathode, anode, electrolyte)" },
    { v: "ev", label: "전기차·완성차", en: "EV makers / automakers" },
    { v: "auto_parts", label: "자동차 부품", en: "auto parts suppliers" },
  ] },
  { group: "바이오·헬스케어", items: [
    { v: "pharma", label: "제약", en: "pharmaceutical companies" },
    { v: "biosimilar", label: "바이오시밀러·CDMO", en: "biosimilar / CDMO / contract drug manufacturing" },
    { v: "medical", label: "의료기기·진단", en: "medical devices / diagnostics" },
  ] },
  { group: "금융", items: [
    { v: "bank", label: "은행", en: "banks / banking holding companies" },
    { v: "broker", label: "증권", en: "securities / brokerage firms" },
    { v: "insure", label: "보험", en: "insurance companies" },
    { v: "fintech", label: "핀테크", en: "fintech companies" },
  ] },
  { group: "소재·화학", items: [
    { v: "chem", label: "화학", en: "chemical companies" },
    { v: "oil", label: "정유·에너지", en: "oil refining / energy" },
    { v: "steel", label: "철강·금속", en: "steel / metals" },
  ] },
  { group: "중공업·방산", items: [
    { v: "ship", label: "조선", en: "shipbuilding" },
    { v: "machine", label: "기계·중공업", en: "machinery / heavy industry" },
    { v: "defense", label: "방산", en: "defense / weapons manufacturers" },
    { v: "aero", label: "항공우주·로봇", en: "aerospace / robotics" },
  ] },
  { group: "소비·기타", items: [
    { v: "retail", label: "유통·이커머스", en: "retail / e-commerce" },
    { v: "food", label: "식음료", en: "food & beverage" },
    { v: "beauty", label: "화장품·뷰티", en: "cosmetics / beauty" },
    { v: "ent", label: "엔터·미디어", en: "entertainment / media / K-pop" },
    { v: "telecom", label: "통신", en: "telecom carriers" },
    { v: "constr", label: "건설·부동산", en: "construction / real estate / REIT" },
    { v: "util", label: "유틸리티", en: "utilities / power generation" },
  ] },
];
const SECTORS = SECTOR_GROUPS.reduce((a, g) => a.concat(g.items), []);

const DEFAULTS = {
  margin: 25,
  holdings: [
    { id: "1", name: "삼성전자", ticker: "005930", cur: "₩", type: "growth", eps: "60000", per: "7", epsCons: "45000", perCons: "6", epsOpt: "70000", perOpt: "8", scenMode: "manual", price: "328000", bps: "", fairPBR: "", roe: "", coe: "", growth: "2", industryScore: "50", trendScore: "50", relativeScore: "50", industryNote: "", trendNote: "", relativeNote: "", aiScoreAsOf: "", aiScoreSources: "", riskScore: "50", shareholderScore: "50", epsRevisionScore: "50", riskNote: "", shareholderNote: "", epsRevisionNote: "", dataSources: "", lastEarningsDate: "", nextEarningsDate: "", high52: "", low52: "", dividendYield: "", maxWeight: "", targetPeriod: "6-12m", note: "메모리 슈퍼사이클·forward EPS" },
    { id: "2", name: "SK하이닉스", ticker: "000660", cur: "₩", type: "growth", eps: "350000", per: "7", price: "2150000", bps: "", fairPBR: "", roe: "", coe: "", growth: "2", industryScore: "50", trendScore: "50", relativeScore: "50", industryNote: "", trendNote: "", relativeNote: "", aiScoreAsOf: "", aiScoreSources: "", riskScore: "50", shareholderScore: "50", epsRevisionScore: "50", riskNote: "", shareholderNote: "", epsRevisionNote: "", dataSources: "", lastEarningsDate: "", nextEarningsDate: "", high52: "", low52: "", dividendYield: "", maxWeight: "", targetPeriod: "6-12m", note: "HBM 구조적 성장·forward EPS" },
    { id: "3", name: "대한항공", ticker: "003490", cur: "₩", type: "cyclical", eps: "2200", per: "11", price: "25050", bps: "29659", fairPBR: "1.2", roe: "", coe: "", growth: "2", industryScore: "50", trendScore: "50", relativeScore: "50", industryNote: "", trendNote: "", relativeNote: "", aiScoreAsOf: "", aiScoreSources: "", riskScore: "50", shareholderScore: "50", epsRevisionScore: "50", riskNote: "", shareholderNote: "", epsRevisionNote: "", dataSources: "", lastEarningsDate: "", nextEarningsDate: "", high52: "", low52: "", dividendYield: "", maxWeight: "", targetPeriod: "6-12m", note: "유가 정상화 가정·PBR 병행" },
    { id: "4", name: "엔비디아", ticker: "NVDA", cur: "$", type: "growth", eps: "6.56", per: "32", price: "214.75", bps: "", fairPBR: "", roe: "", coe: "", growth: "2", industryScore: "50", trendScore: "50", relativeScore: "50", industryNote: "", trendNote: "", relativeNote: "", aiScoreAsOf: "", aiScoreSources: "", riskScore: "50", shareholderScore: "50", epsRevisionScore: "50", riskNote: "", shareholderNote: "", epsRevisionNote: "", dataSources: "", lastEarningsDate: "", nextEarningsDate: "", high52: "", low52: "", dividendYield: "", maxWeight: "", targetPeriod: "6-12m", note: "TTM EPS·forward로 바꾸면 적정가↑" },
  ],
};

function fmt(v, cur) {
  if (v === null || !isFinite(v)) return "—";
  if (cur === "$") return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

function fmtTime(iso) {
  try { return new Date(iso).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
}

// 사이클 과열도(0~100): 미래 예측이 아니라 "지금 사이클 어디쯤인가"를 보유 데이터로 추정하는 휴리스틱.
// 높을수록 과열(고점·고PBR) → 자산가치 쪽 비중을 키우라는 신호. 낮을수록 바닥권 → 성장 쪽 신뢰 가능.
function cycleHeat(h) {
  const price = parseFloat(h.price) || 0;
  const bps = parseFloat(h.bps) || 0;
  const high = parseFloat(h.high52) || 0;
  const low = parseFloat(h.low52) || 0;
  let heat = 50;
  const reasons = [];
  if (price > 0 && high > 0) {
    const ratio = price / high;
    if (ratio >= 0.9) { heat += 20; reasons.push("52주 고점 근처"); }
    else if (ratio >= 0.8) { heat += 10; reasons.push("고점권(80%↑)"); }
    else if (ratio <= 0.55) { heat -= 12; reasons.push("고점 대비 한참 아래"); }
  }
  if (price > 0 && low > 0) {
    const ratio = price / low;
    if (ratio <= 1.2) { heat -= 18; reasons.push("52주 저점 근처"); }
  }
  if (price > 0 && bps > 0) {
    const pbr = price / bps;
    if (pbr >= 4) { heat += 20; reasons.push(`PBR ${pbr.toFixed(1)}배 자산대비 비쌈`); }
    else if (pbr >= 2.5) { heat += 10; reasons.push(`PBR ${pbr.toFixed(1)}배`); }
    else if (pbr <= 1.2) { heat -= 15; reasons.push(`PBR ${pbr.toFixed(1)}배 자산대비 쌈`); }
  }
  heat = Math.max(0, Math.min(100, Math.round(heat)));
  // 과열일수록 성장 가중치를 낮춤(=사이클·자산가치 비중↑)
  const suggestW = Math.max(10, Math.min(90, 100 - heat));
  return { heat, suggestW, reasons, hasData: high > 0 || low > 0 || bps > 0 };
}

function getFair(h) {
  const eps = parseFloat(h.eps) || 0;
  const per = parseFloat(h.per) || 0;
  const bps = parseFloat(h.bps) || 0;
  const fpbr = parseFloat(h.fairPBR) || 0;
  const roe = parseFloat(h.roe) || 0;
  const coe = parseFloat(h.coe) || 9; // 비우면 요구수익률 기본 9%
  const growth = parseFloat(h.growth) || 0;
  // 부동산 "시세 비교"처럼: 적정 PER을 비우면 (10년 평균 PER + 동종 PER) / 2 로 자동 anchor
  const p10 = parseFloat(h.avg10yPER) || 0;
  const pPeer = parseFloat(h.peerPER) || 0;
  let avgPER = 0, perSrcAuto = null;
  if (p10 > 0 && pPeer > 0) { avgPER = (p10 + pPeer) / 2; perSrcAuto = "10년·동종 평균"; }
  else if (p10 > 0) { avgPER = p10; perSrcAuto = "10년평균"; }
  else if (pPeer > 0) { avgPER = pPeer; perSrcAuto = "동종평균"; }
  const avgPBR = parseFloat(h.avg10yPBR) || 0;
  const perEff = per > 0 ? per : avgPER;
  const perSrc = per > 0 ? "직접" : perSrcAuto;
  const perFair = eps * perEff;

  if (h.type === "financial") {
    // 은행·보험주는 ROE/COE 단순식보다 지속성장률(g)을 반영한 Gordon PBR이 더 현실적입니다.
    // 적정 PBR = (ROE - g) / (COE - g). 단, 말이 안 되는 극단값은 방어적으로 제한합니다.
    let jpbr = fpbr;
    if (roe > 0 && coe > 0) {
      jpbr = coe > growth ? (roe - growth) / (coe - growth) : roe / coe;
      jpbr = Math.max(0.2, Math.min(2.5, jpbr));
    }
    const fair = bps > 0 && jpbr > 0 ? bps * jpbr : perFair;
    return { method: "PBR×ROE-g", fair, jpbr, perFair: null, pbrFair: bps > 0 && jpbr > 0 ? bps * jpbr : null };
  }

  // 성장 적정가(순수 PER)와 사이클 적정가(PER+PBR 블렌드)를 둘 다 계산해 둠
  const growthFair = perFair;
  // 적정 PBR anchor 우선순위: 직접입력 → 10년 평균 PBR(시세 비교) → ROE·COE Gordon 자동
  let usedPBR = fpbr, pbrAuto = false, pbrSrc = fpbr > 0 ? "직접" : null;
  if (!(usedPBR > 0) && avgPBR > 0) {
    usedPBR = avgPBR;
    pbrSrc = "10년평균";
  }
  if (!(usedPBR > 0) && roe > 0 && coe > growth) {
    usedPBR = Math.max(0.2, Math.min(4, (roe - growth) / (coe - growth)));
    pbrAuto = true;
    pbrSrc = "ROE자동";
  }
  const pbrFair = bps > 0 && usedPBR > 0 ? bps * usedPBR : null;
  const cyclicalFair = pbrFair ? (perFair + pbrFair) / 2 : perFair;

  // 사이클 보정: cycleW(성장 가중치 0~100)가 지정되고 자산가치 데이터가 있으면 둘을 혼합
  const wRaw = h.cycleW;
  const hasW = wRaw !== "" && wRaw !== null && wRaw !== undefined && isFinite(parseFloat(wRaw));
  if (hasW && pbrFair) {
    const w = Math.max(0, Math.min(100, parseFloat(wRaw))) / 100;
    const fair = w * growthFair + (1 - w) * cyclicalFair;
    return { method: `성장×사이클 (성장 ${Math.round(w * 100)}%)`, fair, jpbr: usedPBR, pbrAuto, pbrSrc, perSrc, perEff, perFair: growthFair, pbrFair, growthFair, cyclicalFair, blended: true, w: Math.round(w * 100) };
  }

  if (h.type === "cyclical") {
    return { method: "PER+PBR 블렌드", fair: cyclicalFair, jpbr: usedPBR, pbrAuto, pbrSrc, perSrc, perEff, perFair, pbrFair, growthFair, cyclicalFair };
  }
  return { method: "PER", fair: perFair, jpbr: usedPBR, pbrAuto, pbrSrc, perSrc, perEff, perFair, pbrFair: null, growthFair, cyclicalFair };
}

// 보수/낙관 적정가 계산: manual 모드면 직접 입력한 eps/per로, auto 모드면 ±% 로
// 종목 유형별 보수/낙관 폭: 이익 변동이 큰 사이클주는 넓게, 안정주는 좁게 → 실제 불확실성 반영
function scenBand(type) {
  if (type === "cyclical") return { eDn: 0.6, eUp: 1.4, pDn: 0.75, pUp: 1.25 };
  if (type === "stable") return { eDn: 0.9, eUp: 1.1, pDn: 0.92, pUp: 1.08 };
  if (type === "financial") return { eDn: 0.85, eUp: 1.15, pDn: 0.88, pUp: 1.12 };
  return { eDn: 0.8, eUp: 1.2, pDn: 0.85, pUp: 1.15 }; // growth/기본
}

function scenarioFair(h, gFair, scenario) {
  const manual = h.scenMode === "manual";
  if (!manual) {
    return { consFair: gFair * (1 - scenario / 100), optFair: gFair * (1 + scenario / 100) };
  }
  // manual: 빈 칸은 유형별 폭으로 중립값에서 자동 계산 (한 점으로 주저앉지 않게)
  const epsN = parseFloat(h.eps) || 0, perN = parseFloat(h.per) || 0;
  const b = scenBand(h.type);
  const eC = parseFloat(h.epsCons) || epsN * b.eDn, pC = parseFloat(h.perCons) || perN * b.pDn;
  const eO = parseFloat(h.epsOpt) || epsN * b.eUp, pO = parseFloat(h.perOpt) || perN * b.pUp;
  // 사이클·금융주도 PER 기준 보수/낙관을 보여줌 (간결성 위해 PER식 사용)
  return { consFair: eC * pC, optFair: eO * pO };
}

// 매도 판단 (홀더 기준): 적정가에 와도 안 팖. "샀던 이유(펀더)가 깨질 때"가 핵심 매도 신호.
// 단 사이클주는 예외 — 정점(적정가·낙관가 도달)에 분할 차익실현.
function getSellSignal(h, r) {
  const price = parseFloat(h.price) || 0;
  const fair = r.fair || 0;
  const opt = r.optFair || fair;
  const cyclical = h.type === "cyclical";
  // 펀더멘털 악화 체크
  const epsN = parseFloat(h.eps) || 0;
  const epsPrev = parseFloat(h.epsPrev3m) || parseFloat(h.epsPrev1m) || 0;
  const epsRev = parseFloat(h.epsRevisionScore);
  const epsDown = epsPrev > 0 ? epsN < epsPrev * 0.97 : (isFinite(epsRev) ? epsRev < 45 : false);
  const roeN = parseFloat(h.roe) || 0;
  const roeWeak = roeN > 0 && roeN < 8;
  const debt = parseFloat(h.debtRatio);
  const debtHigh = isFinite(debt) && debt > 200;
  const reasons = [];
  if (epsDown) reasons.push("EPS 하향 전환");
  if (roeWeak) reasons.push("ROE 급락(<8%)");
  if (debtHigh) reasons.push("부채비율 급증(>200%)");
  const fundBroken = reasons.length > 0;

  let action = "보유", level = 0, color = "buy"; // level: 0 보유, 1 일부, 2 축소, 3 매도
  if (fundBroken) {
    action = "재검토 / 매도"; level = 3; color = "trim";
  } else if (cyclical) {
    if (price > 0 && opt > 0 && price >= opt) { action = "대부분 차익실현"; level = 3; color = "trim"; reasons.push("낙관가 도달 = 사이클 정점 신호"); }
    else if (price > 0 && fair > 0 && price >= fair) { action = "차익실현 시작"; level = 1; color = "hold"; reasons.push("적정가 도달 (사이클주는 정점에 분할매도)"); }
    else { reasons.push("정점 미도달 · 펀더 양호 → 보유"); }
  } else {
    if (price > 0 && opt > 0 && price >= opt * 1.1) { action = "일부 차익실현 검토"; level = 2; color = "hold"; reasons.push("낙관가도 +10% 초과 = 극단 고평가"); }
    else if (price >= fair && fair > 0) { reasons.push("적정가 위지만 펀더 양호 → 홀더는 보유"); }
    else { reasons.push("펀더 양호 · 고평가 아님"); }
  }
  return { action, level, color, reasons, fundBroken };
}

function compute(h, margin, scenario) {
  const price = parseFloat(h.price) || 0;
  const g = getFair(h);
  const buy = g.fair * (1 - margin / 100);
  const upside = price > 0 ? ((g.fair - price) / price) * 100 : 0;
  const { consFair, optFair } = scenarioFair(h, g.fair, scenario);
  let zone = "hold";
  if (price > 0 && price <= buy) zone = "buy";
  else if (price > g.fair) zone = "trim";
  const quality = getQualityScore(h, { price, buy, upside, zone, consFair, optFair, ...g });
  return { price, buy, upside, zone, consFair, optFair, quality, signal: getSignalText({ zone, upside }), ...g };
}

function getQualityScore(h, r) {
  let score = 50;
  const eps = parseFloat(h.eps) || 0;
  const per = parseFloat(h.per) || 0;
  const price = parseFloat(h.price) || 0;
  if (price > 0) score += 10;
  if (eps > 0 || h.type === "financial") score += 10;
  if (per > 0 || h.type === "financial") score += 10;
  if (h.type === "financial" && parseFloat(h.bps) > 0 && parseFloat(h.roe) > 0 && parseFloat(h.coe) > 0) score += 15;
  if (h.type === "cyclical" && parseFloat(h.bps) > 0 && parseFloat(h.fairPBR) > 0) score += 10;
  if (h.scenMode === "manual") score += 5;
  if (Math.abs(r.upside) < 8) score -= 10; // 적정가와 현재가가 너무 가까우면 신호 약함
  return Math.max(20, Math.min(90, Math.round(score)));
}

function getSignalText(r) {
  if (r.zone === "buy") return "가격 매력 큼";
  if (r.zone === "trim") return "고평가 주의";
  return Math.abs(r.upside) < 8 ? "중립·신호 약함" : "보유 구간";
}

function evaluateLog(e) {
  const prices = [parseFloat(e.price3m), parseFloat(e.price6m), parseFloat(e.price12m)].filter((x) => isFinite(x) && x > 0);
  if (!prices.length || !(e.price > 0)) return { status: "대기", ok: null, bestReturn: null };
  const best = Math.max(...prices);
  const last = prices[prices.length - 1];
  const ret = ((last - e.price) / e.price) * 100;
  const bestRet = ((best - e.price) / e.price) * 100;
  let ok = false;
  if (e.zone === "buy") ok = bestRet >= 10 || best >= e.fair * 0.9;
  else if (e.zone === "trim") ok = ret <= 0 || best < e.fair;
  else ok = ret > -10 && ret < 20;
  return { status: ok ? "성공" : "실패", ok, bestReturn: bestRet };
}

function accuracySummary(log) {
  const done = log.map(evaluateLog).filter((x) => x.ok !== null);
  if (!done.length) return { total: 0, ok: 0, pct: null };
  const ok = done.filter((x) => x.ok).length;
  return { total: done.length, ok, pct: Math.round((ok / done.length) * 100) };
}

function clampText(x, fallback = "") {
  return x === null || x === undefined ? fallback : String(x);
}

function inferFormulaPreset(h) {
  const name = `${h.name || ""} ${h.ticker || ""}`.toLowerCase();
  if (/kb|신한|하나|우리|금융|은행|insurance|bank|보험/.test(name)) return { type: "financial", label: "금융주 공식 고정", reason: "BPS·ROE·COE 중심" };
  if (/대한항공|항공|shipping|해운|steel|철강|정유|oil|자동차|현대차|기아|항공|airline/.test(name)) return { type: "cyclical", label: "사이클주 공식 고정", reason: "PER+PBR 블렌드" };
  if (/삼성전자|하이닉스|nvidia|엔비디아|tsmc|micron|카카오|naver|네이버|반도체|internet|software|플랫폼/.test(name)) return { type: "growth", label: "성장주 공식 고정", reason: "Forward EPS·PER 중심" };
  return { type: h.type || "growth", label: "현재 공식 유지", reason: "수동 확인 필요" };
}

function sourceCount(h) {
  const raw = [h.dataSources, h.aiScoreSources, h.sourceLinks, h.epsSource, h.perSource, h.priceSource].filter(Boolean).join(",");
  return raw ? raw.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).length : 0;
}

function dataConfidence(h, r) {
  let score = 35;
  const sources = sourceCount(h);
  if (sources >= 1) score += 10;
  if (sources >= 3) score += 10;
  if (parseFloat(h.price) > 0) score += 8;
  if (parseFloat(h.eps) > 0 || h.type === "financial") score += 8;
  if (parseFloat(h.per) > 0 || h.type === "financial") score += 8;
  if (h.aiScoreAsOf) score += 8;
  if (h.lockFormula === "true" || h.lockFormula === true) score += 8;
  if (r && Math.abs(r.upside) < 8) score -= 6;
  score = Math.max(10, Math.min(100, Math.round(score)));
  const label = score >= 75 ? "확실" : score >= 55 ? "보통" : "불확실";
  const color = score >= 75 ? C.buy : score >= 55 ? C.hold : C.trim;
  return { score, label, color, sources };
}

function enhancedAccuracySummary(log) {
  const base = accuracySummary(log);
  const horizons = [
    ["3m", "price3m", "3개월"],
    ["6m", "price6m", "6개월"],
    ["12m", "price12m", "12개월"],
  ].map(([key, field, label]) => {
    const rows = log.filter(e => parseFloat(e[field]) > 0 && parseFloat(e.price) > 0);
    const returns = rows.map(e => ((parseFloat(e[field]) - parseFloat(e.price)) / parseFloat(e.price)) * 100);
    const wins = rows.filter(e => {
      const after = parseFloat(e[field]);
      const ret = ((after - parseFloat(e.price)) / parseFloat(e.price)) * 100;
      if (e.zone === "buy") return ret >= 5 || after >= parseFloat(e.fair) * 0.9;
      if (e.zone === "trim") return ret <= 0 || after < parseFloat(e.fair);
      return ret > -10 && ret < 20;
    }).length;
    const avg = returns.length ? returns.reduce((a,b)=>a+b,0)/returns.length : null;
    return { key, label, total: rows.length, wins, pct: rows.length ? Math.round(wins/rows.length*100) : null, avg };
  });
  const byName = {};
  log.forEach(e => {
    const ev = evaluateLog(e);
    if (ev.ok === null) return;
    byName[e.name] = byName[e.name] || { total: 0, ok: 0 };
    byName[e.name].total += 1;
    if (ev.ok) byName[e.name].ok += 1;
  });
  const names = Object.entries(byName).map(([name, v]) => ({ name, ...v, pct: Math.round(v.ok/v.total*100) }));
  return { ...base, horizons, names };
}


// 공통: API 호출 + 재시도 + JSON 추출 (일시적 실패/형식 깨짐에 강하게)
// 텍스트에서 첫 번째 '균형 잡힌' JSON 객체만 추출 (뒤에 딴 글자·괄호가 붙어도 무시, 문자열 내 괄호 무시)
function extractFirstJSON(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null; // 균형 안 맞음(중간 잘림)
}

async function callJSON(prompt, maxTokens, retries, useSearch = true) {
  let lastErr;
  for (let attempt = 0; attempt <= (retries ?? 2); attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: maxTokens || 1000,
          messages: [{ role: "user", content: prompt }],
          ...(useSearch === false ? {} : { tools: [{ type: "web_search_20250305", name: "web_search" }] }),
        }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      let text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const balanced = extractFirstJSON(text);
      if (balanced) {
        try { return JSON.parse(balanced); } catch (_) { /* fall through */ }
      }
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try { return JSON.parse(m[0]); } catch (_) { /* fall through to salvage */ }
      }
      // 응답이 중간에 잘린 경우: { 부터 잡아서 미완성 끝부분 잘라내고 괄호 균형 맞춰 복구 시도
      const start = text.indexOf("{");
      if (start >= 0) {
        let s = text.slice(start)
          .replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "")  // 끝에 매달린 "키": 값 제거
          .replace(/,\s*$/, "");
        const opens = (s.match(/\{/g) || []).length, closes = (s.match(/\}/g) || []).length;
        const ob = (s.match(/\[/g) || []).length, cb = (s.match(/\]/g) || []).length;
        s += "]".repeat(Math.max(0, ob - cb)) + "}".repeat(Math.max(0, opens - closes));
        return JSON.parse(s);
      }
      throw new Error("no-json");
    } catch (e) {
      lastErr = e;
      // 마지막 시도가 아니면 잠깐 쉬고 재시도
      if (attempt < (retries ?? 2)) await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw lastErr || new Error("failed");
}

async function fetchStock(query) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a financial data assistant. TODAY'S DATE IS ${today}. Search the web for the latest data on this stock: "${query}", using the most recent figures available as of today (${today}). Always include the current year/month (and "${today}") in your search queries so you do not return stale prices.
First DETECT its category, then return ONLY a valid JSON object (no markdown, no code fences, no extra text) with EXACTLY these keys:
{
"name": Korean name,
"ticker": ticker code,
"currency": "₩" for a Korean (KRW) stock or "$" for a US (USD) stock,
"price": current share price as a plain number (no commas/symbols),
"type": one of "growth","cyclical","financial","stable",
"eps": forward/normalized EPS as a plain number, or null,
"per": a reasonable fair/target PER as a plain number, or null,
"epsCons": a CONSERVATIVE-scenario EPS (lower, e.g. cycle slowdown / weaker demand) as a plain number, or null,
"perCons": a CONSERVATIVE-scenario fair PER (lower multiple) as a plain number, or null,
"epsOpt": an OPTIMISTIC-scenario EPS (higher, e.g. strong upcycle) as a plain number, or null,
"perOpt": an OPTIMISTIC-scenario fair PER (higher multiple) as a plain number, or null,
"bps": book value per share as a plain number, or null,
"fairPBR": a reasonable fair PBR (for cyclical/asset-heavy stocks) as a plain number, or null,
"roe": return on equity (ROE) in percent as a plain number — ALWAYS provide your best estimate of the normalized/forward ROE for ANY company (not just financials); use null only if truly impossible to estimate,
"coe": a reasonable required return / cost of equity in percent (~8-10, default 9 if unsure) as a plain number,
"note": one short Korean sentence (max 20 chars) on the basis or a caveat,
"epsSource": "short source name for EPS",
"perSource": "short source name for PER/PBR",
"priceSource": "short source name for price",
"sourceLinks": "up to 3 source names or URLs separated by commas",
"avg10yPER": the stock's own multi-year (5-10yr) AVERAGE forward PER as a plain number, or null,
"avg10yPBR": the stock's own multi-year (5-10yr) AVERAGE PBR as a plain number, or null,
"peerPER": the peer/industry AVERAGE PER as a plain number, or null
}
Rules for "type" and which fields to fill:
- Banks, insurers, financial holding companies -> "financial": fill roe, coe, bps (eps/per can be null).
- Airlines, shipping, steel, autos, refiners, asset-heavy cyclicals -> "cyclical": fill eps (normalized), per, bps, fairPBR, roe.
- Tech, semiconductors, internet, high-growth -> "growth": fill eps (forward), per, and ALSO bps and roe when available.
- Utilities, telecom, consumer staples, high-dividend stable -> "stable": fill eps, per.
ALWAYS include "roe" (reported or your best normalized estimate) for every stock regardless of type — it is used to cross-check the fair PBR. ROE must be a sustainable/normalized figure, NOT a one-off peak. If you give a high EPS for a cyclical peak year, make sure ROE reflects a through-cycle level, not the peak. ALSO try to provide avg10yPER, avg10yPBR and peerPER for every stock — these historical/peer averages act like real-estate "comparable sales" and are the most robust anchor for what a FAIR multiple should be. When you set the neutral "per" (fair PER), prefer a value close to the stock's own multi-year average or the peer average rather than today's distorted multiple; for "fairPBR" prefer the stock's multi-year average PBR.
CRITICAL: for "growth" and "stable" types, "eps" MUST be the FORWARD (next 12 months / next fiscal year) consensus EPS, NEVER the trailing/TTM EPS. For "price", return the MOST RECENT available closing price (the latest trading session on or before ${today}). For the scenario fields: epsCons/perCons should be clearly LOWER than the neutral eps/per (downside case), and epsOpt/perOpt clearly HIGHER (upside case); keep them realistic, not extreme. Output numbers only for numeric fields (or null). You MUST output the JSON object even if some data is uncertain — estimate reasonably and never refuse.`;
  return callJSON(prompt, 1000, 2);
}

// 추천 종목 발굴: AI가 웹검색으로 "지금 저평가로 보이는" 후보를 던져준다.
// 주의 — 검증 안 된 빠른 스크리닝이라 confidence가 낮고, 담은 뒤 EPS/PER을 직접 확인해야 한다.
async function fetchRecommendations(opts) {
  const mkt = opts.market === "us" ? "US (USD) large/mid-cap"
    : opts.market === "kr" ? "Korean (KOSPI/KOSDAQ)"
    : "Korean or US";
  const typeLine = opts.type && opts.type !== "any" ? `Prefer "${opts.type}"-type stocks. ` : "";
  const sectorLine = opts.sectorEn ? `Only pick stocks in the ${opts.sectorEn} sector. ` : "";
  const prompt = `You are a value-investing idea generator. Based on your OWN KNOWLEDGE of ${mkt} stocks, list 6 names that are commonly regarded as UNDERVALUED on valuation grounds (low PER/PBR relative to the stock's own history or peers, or solid earnings relative to price). ${sectorLine}${typeLine}
Return ONLY a valid JSON object (no markdown, no code fences, no extra text) with EXACTLY this shape:
{
"list": [
  {
    "name": Korean stock name,
    "ticker": ticker code,
    "market": "KR" or "US",
    "type": one of "growth","cyclical","financial","stable",
    "sector": short Korean sector label (e.g. "반도체","은행","바이오"),
    "upside": a rough estimated percent below fair value as a plain POSITIVE number; higher = cheaper,
    "reason": one short Korean phrase (max ~24 chars) on why it looks cheap,
    "metric": short Korean phrase, e.g. "PER 8배·동종 대비 저평가",
    "confidence": "low" | "medium"
  }
]
}
Sort so the most undervalued (highest "upside") is FIRST. Keep "reason" and "metric" short. You are NOT checking live prices, so keep "upside" modest and "confidence" only "low" or "medium" — never exaggerate. Output the JSON object only; never refuse.`;
  return callJSON(prompt, 3000, 2, false);
}

// ===== 알곡기: 퀀트 100점 스크리너 =====
function quantHardFilter(m) {
  const n = (x) => { const v = parseFloat(x); return isFinite(v) ? v : null; };
  const roe = n(m.roe), eg = n(m.epsGrowth), rg = n(m.revGrowth), cap = n(m.marketCap);
  const minCap = m._minCap != null ? m._minCap : 1000;
  if (roe != null && roe < 8) return "ROE 8% 미만";
  if (eg != null && eg < 0) return "EPS 성장률 음수";
  if (rg != null && rg < 0) return "매출 성장률 음수";
  if (m.profitable === false) return "영업이익 적자";
  if (cap != null && cap < minCap) return "시총 " + minCap + "억 미만";
  return null;
}
function quantScore(m) {
  const n = (x) => { const v = parseFloat(x); return isFinite(v) ? v : null; };
  const roe = n(m.roe), eg = n(m.epsGrowth), rg = n(m.revGrowth), per = n(m.per), pbr = n(m.pbr), debt = n(m.debt), om = n(m.opMargin);
  const sRoe = roe == null ? 0 : roe >= 25 ? 25 : roe >= 20 ? 20 : roe >= 15 ? 15 : roe >= 10 ? 10 : roe >= 5 ? 5 : 0;
  const sEps = eg == null ? 0 : eg >= 30 ? 25 : eg >= 20 ? 20 : eg >= 10 ? 15 : eg >= 5 ? 10 : eg >= 0 ? 5 : 0;
  const sRev = rg == null ? 0 : rg >= 20 ? 15 : rg >= 15 ? 12 : rg >= 10 ? 9 : rg >= 5 ? 6 : rg >= 0 ? 3 : 0;
  const sPer = (per == null || per < 0) ? 0 : per <= 10 ? 15 : per <= 15 ? 12 : per <= 20 ? 9 : per <= 30 ? 6 : per <= 40 ? 3 : 0;
  const sPbr = (pbr == null || pbr < 0) ? 0 : pbr <= 1 ? 10 : pbr <= 2 ? 8 : pbr <= 3 ? 6 : pbr <= 5 ? 3 : 0;
  const sDebt = debt == null ? 0 : debt <= 30 ? 5 : debt <= 50 ? 4 : debt <= 100 ? 3 : debt <= 200 ? 1 : 0;
  const sOm = om == null ? 0 : om >= 20 ? 5 : om >= 15 ? 4 : om >= 10 ? 3 : om >= 5 ? 2 : 0;
  const bFcf = m.fcf3yPositive ? 5 : 0;
  const bEps = m.eps5yStreak ? 5 : 0;
  const total = sRoe + sEps + sRev + sPer + sPbr + sDebt + sOm + bFcf + bEps;
  const grade = total >= 90 ? "S+" : total >= 80 ? "S" : total >= 70 ? "A" : total >= 60 ? "B" : total >= 50 ? "C" : "D";
  return { sRoe, sEps, sRev, sPer, sPbr, sDebt, sOm, bFcf, bEps, total, grade };
}
function gradeColor(g) {
  return g === "S+" || g === "S" ? "#34d399" : g === "A" ? "#5eead4" : g === "B" ? "#fbbf24" : g === "C" ? "#fb923c" : "#f87171";
}
async function fetchScreen(opts) {
  const mkt = opts.country === "us" ? "US (NYSE/NASDAQ)" : opts.country === "kr" ? "Korean (KOSPI/KOSDAQ)" : "Korean or US";
  const sectorLine = opts.sectorEn ? "Only stocks in the " + opts.sectorEn + " sector. " : "";
  const prompt = "You are a 20-year quant investor. Based on your OWN KNOWLEDGE, list 12 real, sizeable " + mkt + " stocks (NOT ETFs) " + sectorLine + "that are reasonable value+growth candidates, each with its fundamental metrics.\n" +
"Return ONLY a valid JSON object (no markdown, no code fences):\n" +
"{\n\"list\": [\n  {\n" +
"    \"name\": Korean stock name,\n" +
"    \"ticker\": ticker code,\n" +
"    \"market\": \"KR\" or \"US\",\n" +
"    \"sector\": short Korean sector label,\n" +
"    \"roe\": ROE in percent (number),\n" +
"    \"epsGrowth\": 3-year average EPS growth in percent (number),\n" +
"    \"revGrowth\": 3-year average revenue growth in percent (number),\n" +
"    \"per\": PER (number),\n" +
"    \"pbr\": PBR (number),\n" +
"    \"debt\": debt-to-equity 부채비율 in percent (number),\n" +
"    \"opMargin\": operating margin 영업이익률 in percent (number),\n" +
"    \"marketCap\": market cap in 억원 (KRW 100M units; convert USD names too) (number),\n" +
"    \"profitable\": true if operating profit is currently positive,\n" +
"    \"fcf3yPositive\": true if free cash flow was positive in EACH of the last 3 years,\n" +
"    \"eps5yStreak\": true if EPS increased for 5 consecutive years\n" +
"  }\n]\n}\n" +
"Give exactly 12 candidates with realistic numbers from your knowledge. Output the JSON object only; never refuse.";
  return callJSON(prompt, 3500, 2, false);
}

async function fetchQuantMetrics(name, market) {
  const mk = market === "US" ? " (US market)" : market === "KR" ? " (Korean market)" : "";
  const prompt = "You are a quant analyst. Use WEB SEARCH to find the LATEST real fundamental metrics for the stock \"" + name + "\"" + mk + ". Search reliable sources (네이버증권 / Naver Finance for KR; Yahoo Finance / macrotrends for US).\n" +
"Return ONLY a valid JSON object (no markdown, no code fences):\n" +
"{\n" +
"  \"name\": Korean stock name,\n" +
"  \"ticker\": ticker code,\n" +
"  \"market\": \"KR\" or \"US\",\n" +
"  \"sector\": short Korean sector label,\n" +
"  \"roe\": latest ROE in percent (number),\n" +
"  \"epsGrowth\": 3-year average EPS growth in percent (number),\n" +
"  \"revGrowth\": 3-year average revenue growth in percent (number),\n" +
"  \"per\": current PER (number),\n" +
"  \"pbr\": current PBR (number),\n" +
"  \"debt\": debt-to-equity 부채비율 in percent (number),\n" +
"  \"opMargin\": operating margin 영업이익률 in percent (number),\n" +
"  \"marketCap\": market cap in 억원 (KRW 100M units; convert USD) (number),\n" +
"  \"profitable\": true if operating profit is currently positive,\n" +
"  \"fcf3yPositive\": true if free cash flow was positive in EACH of the last 3 years,\n" +
"  \"eps5yStreak\": true if EPS rose for 5 consecutive years,\n" +
"  \"estimated\": an array listing the field names whose values you could NOT confirm from real search results and had to ESTIMATE (e.g. [\"per\",\"fcf3yPositive\"]). Use the exact field names. If every value came from real search data, return an empty array []\n" +
"}\n" +
"Use the real searched figures. If a metric truly can't be found, estimate the most reasonable value (do NOT use null) AND add its field name to \"estimated\". Be honest about which fields are estimates. Output the JSON object only; never refuse.";
  return callJSON(prompt, 1500, 1, true);
}

// ===== 모내기: 매수 타이밍 30점 모델 =====
const PLANT_ITEMS = [
  ["trend", "가격 추세", "20/60/120일선 배열"],
  ["rsi", "RSI", "상승 전환 여부"],
  ["rs", "RS Index", "시장 대비 상대강도"],
  ["volume", "거래량", "20일 평균 대비"],
  ["stochastic", "스토캐스틱", "%K·%D 크로스"],
  ["golden", "골든크로스", "단기 이평선 배열"],
  ["foreign", "외국인 수급", "최근 5거래일"],
  ["inst", "기관 수급", "최근 5거래일"],
  ["market", "시장 환경", "지수 200일선"],
  ["vix", "변동성", "VIX 수준"],
];
function plantPts(g) { return g === "A" ? 3 : g === "B" ? 2 : g === "C" ? 1 : 0; }
function plantScore(items) {
  if (!items || typeof items !== "object") return 0;
  return PLANT_ITEMS.reduce((sum, it) => {
    const v = items[it[0]];
    const g = v && v.grade ? String(v.grade).toUpperCase() : "D";
    return sum + plantPts(g);
  }, 0);
}
function plantGrade(total) {
  return total >= 24 ? "A" : total >= 18 ? "B" : total >= 12 ? "C" : "D";
}
function plantLabel(g) { return g === "A" ? "강력 매수" : g === "B" ? "매수 가능" : g === "C" ? "관찰" : "대기"; }
function plantUpgrade(g, roe, epsGrowth) {
  const r = parseFloat(roe), e = parseFloat(epsGrowth);
  if (isFinite(r) && isFinite(e) && r >= 20 && e >= 20) return g === "D" ? "C" : g === "C" ? "B" : "A";
  return g;
}
function plantPlan(g) {
  if (g === "A") return { ratios: [30, 30, 20, 20], addDrop: 5, stop: 12 };
  if (g === "B") return { ratios: [20, 30, 30, 20], addDrop: 8, stop: 10 };
  if (g === "C") return { ratios: [10, 20, 30, 40], addDrop: 10, stop: 8 };
  return { ratios: [], addDrop: 0, stop: 0 };
}
function plantEntries(price, g) {
  const plan = plantPlan(g);
  const p = parseFloat(price);
  if (!plan.ratios.length || !isFinite(p)) return [];
  return plan.ratios.map((ratio, i) => ({ n: i + 1, ratio, price: p * (1 - (plan.addDrop / 100) * i) }));
}
function plantColor(g) { return g === "A" ? "#34d399" : g === "B" ? "#5eead4" : g === "C" ? "#fbbf24" : "#6b7280"; }
async function fetchPlant(name, market) {
  const mk = market === "US" ? " (US market)" : market === "KR" ? " (Korean market)" : "";
  const prompt = "You are a momentum/trend analyst (O'Neil·Minervini·Weinstein style). Use WEB SEARCH for the latest technical state of \"" + name + "\"" + mk + ", and grade EACH of 10 buy-timing criteria as A/B/C/D per this rubric:\n" +
"1 trend(가격추세 20/60/120일선): A=20>60>120 정배열+20일선 상승, B=20>60 상승전환, C=횡보, D=역배열\n" +
"2 rsi: A=50→70 상승, B=40→50 상승, C=30→40, D=30이하\n" +
"3 rs(RS Index vs 시장): A=상위20%+상승, B=상위20~50%+상승, C=중위, D=하위40%\n" +
"4 volume(20일 평균 대비): A=150%+, B=120~150%, C=80~120%, D=80%미만\n" +
"5 stochastic(%K/%D): A=20이하 골든크로스, B=20~40 골든, C=40~60, D=데드크로스\n" +
"6 golden(이평 골든크로스): A=5일>20일, B=10일>20일, C=근접, D=데드크로스\n" +
"7 foreign(외국인 최근5일): A=5일연속순매수, B=순매수우위, C=중립, D=순매도우위\n" +
"8 inst(기관 최근5일): A=5일연속순매수, B=순매수우위, C=중립, D=순매도우위\n" +
"9 market(시장환경 지수200일선): A=200일선위 상승, B=200일선위 횡보, C=근처, D=아래\n" +
"10 vix(변동성): A=VIX<20, B=20~25, C=25~30, D=30이상\n" +
"Return ONLY a valid JSON object (no markdown, no fences):\n" +
"{\n" +
"  \"name\": Korean name, \"ticker\": ticker, \"market\": \"KR\" or \"US\", \"price\": current price number,\n" +
"  \"items\": { \"trend\":{\"grade\":\"A\",\"note\":short Korean obs}, \"rsi\":{\"grade\":\"\",\"note\":\"\"}, \"rs\":{}, \"volume\":{}, \"stochastic\":{}, \"golden\":{}, \"foreign\":{}, \"inst\":{}, \"market\":{}, \"vix\":{} },\n" +
"  \"roe\": ROE percent number, \"epsGrowth\": 3-year avg EPS growth percent number,\n" +
"  \"estimated\": array of item keys you had to estimate (couldn't confirm from search); [] if all confirmed\n" +
"}\n" +
"Every item must have grade A/B/C/D and a short Korean note. For US stocks where 외국인/기관 개념이 약하면 institutional/fund flow로 판단. Use real searched values; estimate only when needed and list those keys in estimated. Output JSON only; never refuse.";
  return callJSON(prompt, 2200, 1, true);
}

// ===== 추수: 분할 매도 100점 모델 =====
const HARVEST_SIGNALS = [["maTrend", "20일선 하향 이탈"], ["macdDead", "MACD 데드크로스"], ["rsiFalling", "RSI 하락"], ["rsFalling", "RS Index 하락"], ["foreignSelling", "외국인 순매도"], ["instSelling", "기관 순매도"]];
const HARVEST_CUM = { A: 10, B: 30, C: 60, D: 100, HOLD: 0 };
const HARVEST_ADD = { A: 10, B: 20, C: 30, D: 40, HOLD: 0 };
function harvestFlowPts(v) { return v === "strong_sell" ? 15 : v === "turn_sell" ? 10 : v === "buy_decrease" ? 5 : 0; }
function harvestScore(t) {
  const n = (x) => { const v = parseFloat(x); return isFinite(v) ? v : null; };
  const rsi = n(t.rsi), rsRank = n(t.rsRank), ma = n(t.ma20Gap), vol = n(t.volRatio);
  const sRsi = rsi == null ? 0 : rsi >= 80 ? 20 : rsi >= 75 ? 15 : rsi >= 70 ? 10 : rsi >= 65 ? 5 : 0;
  const sRs = rsRank == null ? 0 : rsRank <= 1 ? 20 : rsRank <= 5 ? 15 : rsRank <= 10 ? 10 : rsRank <= 20 ? 5 : 0;
  const sMa = ma == null ? 0 : ma >= 30 ? 20 : ma >= 20 ? 15 : ma >= 15 ? 10 : ma >= 10 ? 5 : 0;
  const sVol = vol == null ? 0 : vol >= 200 ? 10 : vol >= 150 ? 5 : 0;
  const sForeign = harvestFlowPts(t.foreign);
  const sInst = harvestFlowPts(t.inst);
  return { sRsi, sRs, sMa, sVol, sForeign, sInst, total: sRsi + sRs + sMa + sVol + sForeign + sInst };
}
function harvestGradeRaw(total) { return total >= 80 ? "D" : total >= 60 ? "C" : total >= 40 ? "B" : total >= 20 ? "A" : "HOLD"; }
function harvestLabel(g) { return g === "A" ? "과열 초기" : g === "B" ? "과열 진행" : g === "C" ? "고점 형성 가능" : g === "D" ? "추세 종료 가능" : "보유"; }
function harvestColor(g) { return g === "D" ? "#f87171" : g === "C" ? "#fb923c" : g === "B" ? "#fbbf24" : g === "A" ? "#a3e635" : "#6b7280"; }
function harvestDowngrade(g) { return g === "D" ? "C" : g === "C" ? "B" : g === "B" ? "A" : g; }
function harvestForcedD(signals) {
  if (!signals) return false;
  return HARVEST_SIGNALS.reduce((c, s) => c + (signals[s[0]] ? 1 : 0), 0) >= 3;
}
function profitLadder(returnPct) {
  const r = parseFloat(returnPct);
  const steps = [[30, 10], [50, 20], [100, 30], [200, 20], [300, 20]];
  let cum = 0;
  const detail = steps.map((s) => { const reached = isFinite(r) && r >= s[0]; if (reached) cum += s[1]; return { th: s[0], pct: s[1], reached }; });
  return { cum, detail };
}
async function fetchHarvest(name, market) {
  const mk = market === "US" ? " (US market)" : market === "KR" ? " (Korean market)" : "";
  const prompt = "You are a sell-discipline / trend-following analyst (Livermore·O'Neil·Minervini·Weinstein). Use WEB SEARCH for the latest OVERHEATING/exit signals of \"" + name + "\"" + mk + ".\n" +
"Return ONLY a valid JSON object (no markdown, no fences):\n" +
"{\n" +
"  \"name\": Korean name, \"ticker\": ticker, \"market\": \"KR\" or \"US\", \"price\": current price number,\n" +
"  \"rsi\": current RSI 0-100 (number),\n" +
"  \"rsRank\": relative-strength rank vs market as a TOP percentile (e.g. 3 = top 3%) (number),\n" +
"  \"ma20Gap\": percent price is ABOVE the 20-day moving average (number; negative if below),\n" +
"  \"volRatio\": today's volume as percent of 20-day average (e.g. 180 = 180%) (number),\n" +
"  \"foreign\": one of \"strong_sell\",\"turn_sell\",\"buy_decrease\",\"none\" (외국인 최근10일: 강한순매도/순매도전환/순매수감소/해당없음),\n" +
"  \"inst\": one of the same four (기관 최근10일),\n" +
"  \"signals\": { \"maTrend\": true if price broke BELOW 20-day MA, \"macdDead\": true if MACD dead-cross, \"rsiFalling\": true if RSI falling, \"rsFalling\": true if RS Index falling, \"foreignSelling\": true if foreigners net-selling, \"instSelling\": true if institutions net-selling },\n" +
"  \"roe\": ROE percent (number), \"epsGrowth\": 3-year avg EPS growth percent (number),\n" +
"  \"estimated\": array of field keys you had to estimate; [] if all confirmed\n" +
"}\n" +
"For US stocks where 외국인/기관 개념이 약하면 institutional/fund flow로 판단. Use real searched values; estimate only if needed and list keys in estimated. Output JSON only; never refuse.";
  return callJSON(prompt, 2000, 1, true);
}

// ===== 최종 투자점수: 종목(알곡기 60%) + 타이밍(모내기 40%) =====
function finalScore(qualityTotal, timingTotal) {
  const q = Math.min(100, Math.max(0, parseFloat(qualityTotal) || 0));
  const tNorm = ((parseFloat(timingTotal) || 0) / 30) * 100;
  const total = Math.round(q * 0.6 + tNorm * 0.4);
  const grade = total >= 80 ? "S" : total >= 70 ? "A" : total >= 60 ? "B" : total >= 50 ? "C" : "D";
  return { total, grade, qPart: Math.round(q * 0.6), tPart: Math.round(tNorm * 0.4), qRaw: Math.round(q), tNorm: Math.round(tNorm) };
}
function finalColor(g) { return g === "S" ? "#34d399" : g === "A" ? "#5eead4" : g === "B" ? "#fbbf24" : g === "C" ? "#fb923c" : "#f87171"; }
function finalLabel(g) { return g === "S" ? "지금 강력 매수" : g === "A" ? "매수 우위" : g === "B" ? "관심 · 분할 진입" : g === "C" ? "관망" : "회피 · 대기"; }

function normalize(d, fallbackName) {
  const s = (x) => (x !== null && x !== undefined ? String(x) : "");
  const num = (x) => { const n = parseFloat(x); return isFinite(n) ? n : 0; };
  // 중립값
  const epsN = num(d.eps), perN = num(d.per);
  // 보수/낙관: AI가 줬으면 그대로, 없으면 유형별 폭으로 중립값에서 자동 생성 (사이클주는 넓게)
  const tb = scenBand(d.type || "growth");
  const epsCons = d.epsCons != null ? num(d.epsCons) : (epsN ? Math.round(epsN * tb.eDn) : 0);
  const perCons = d.perCons != null ? num(d.perCons) : (perN ? +(perN * tb.pDn).toFixed(1) : 0);
  const epsOpt = d.epsOpt != null ? num(d.epsOpt) : (epsN ? Math.round(epsN * tb.eUp) : 0);
  const perOpt = d.perOpt != null ? num(d.perOpt) : (perN ? +(perN * tb.pUp).toFixed(1) : 0);
  const hasScen = epsN > 0 && perN > 0; // 중립 EPS·PER이 있으면 시나리오 모드 활성화
  return {
    name: d.name || fallbackName || "종목",
    ticker: d.ticker || "",
    cur: d.currency === "$" ? "$" : "₩",
    type: d.type || "growth",
    eps: s(d.eps), per: s(d.per), price: s(d.price),
    epsCons: epsCons ? String(epsCons) : "", perCons: perCons ? String(perCons) : "",
    epsOpt: epsOpt ? String(epsOpt) : "", perOpt: perOpt ? String(perOpt) : "",
    bps: s(d.bps), fairPBR: s(d.fairPBR), roe: s(d.roe), coe: s(d.coe), growth: "2",
    epsSource: s(d.epsSource), perSource: s(d.perSource), priceSource: s(d.priceSource), sourceLinks: s(d.sourceLinks),
    avg10yPER: s(d.avg10yPER), avg10yPBR: s(d.avg10yPBR), peerPER: s(d.peerPER),
    lockFormula: "false", fixedType: "",
    industryScore: "50", trendScore: "50", relativeScore: "50",
    industryNote: "", trendNote: "", relativeNote: "", aiScoreAsOf: "", aiScoreSources: "",
    riskScore: "50", shareholderScore: "50", epsRevisionScore: "50",
    riskNote: "", shareholderNote: "", epsRevisionNote: "", dataSources: "",
    lastEarningsDate: "", nextEarningsDate: "", high52: "", low52: "", dividendYield: "", maxWeight: "", targetPeriod: "6-12m",
    note: d.note || "",
    cycleW: "",
    scenMode: hasScen ? "manual" : "auto",
  };
}

function clampScore(x, fallback = 50) {
  const n = parseFloat(x);
  if (!isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function valueScoreFromUpside(upside) {
  if (!isFinite(upside)) return 50;
  if (upside >= 50) return 95;
  if (upside >= 30) return 85;
  if (upside >= 15) return 75;
  if (upside >= 0) return 60;
  if (upside >= -10) return 45;
  if (upside >= -25) return 30;
  return 15;
}

function finalDecision(score) {
  if (score >= 80) return { label: "강매수", color: C.buy, note: "가치·실적·업황 모두 우호" };
  if (score >= 70) return { label: "매수", color: C.buy, note: "분할 접근 가능" };
  if (score >= 55) return { label: "보유", color: C.hold, note: "크게 싸거나 비싸진 않음" };
  if (score >= 40) return { label: "경계", color: C.hold, note: "확인 후 접근" };
  return { label: "매도/회피", color: C.trim, note: "리스크 우위" };
}

function getRiskAdjustedScore(raw, riskScore) {
  const risk = clampScore(riskScore, 50);
  // riskScore is safety quality: 100 = very safe, 0 = very risky.
  const adjustment = Math.round((risk - 50) * 0.18);
  return Math.max(0, Math.min(100, raw + adjustment));
}

function getFinalScore(h, r, sent) {
  const valueScore = valueScoreFromUpside(r.upside);
  const trendScore = clampScore(h.trendScore, 50);
  const industryScore = clampScore(h.industryScore, 50);
  const relativeScore = clampScore(h.relativeScore, 50);
  const riskScore = clampScore(h.riskScore, 50);
  const shareholderScore = clampScore(h.shareholderScore, 50);
  const epsRevisionScore = clampScore(h.epsRevisionScore, 50);
  const sentimentBase = scoreSentiment(sent);
  const sentimentScore = sentimentBase ? (100 - sentimentBase.score) : 50; // 과열일수록 감점, 공포일수록 가점
  const conf = dataConfidence(h, r);
  const rawScore = Math.round(
    valueScore * 0.28 + trendScore * 0.17 + industryScore * 0.15 +
    relativeScore * 0.10 + riskScore * 0.10 + epsRevisionScore * 0.07 +
    shareholderScore * 0.04 + sentimentScore * 0.04 + conf.score * 0.05
  );
  const finalScore = getRiskAdjustedScore(rawScore, riskScore);
  return { finalScore, rawScore, valueScore, trendScore, industryScore, relativeScore, riskScore, shareholderScore, epsRevisionScore, sentimentScore, confidenceScore: conf.score, decision: finalDecision(finalScore) };
}

function getBuyPlan(h, r, margin) {
  const price = r.price || 0;
  const fair = r.fair || 0;
  const buy = r.buy || 0;
  const cur = h.cur;
  const first = buy > 0 ? buy : fair * (1 - margin / 100);
  const second = first * 0.92;
  const third = first * 0.84;
  const stop = Math.min(first * 0.78, price * 0.88 || first * 0.78);
  const maxWeight = h.maxWeight || (clampScore(h.riskScore, 50) >= 70 ? "20" : clampScore(h.riskScore, 50) >= 45 ? "12" : "6");
  return { first, second, third, stop, maxWeight, label: `${fmt(first, cur)} / ${fmt(second, cur)} / ${fmt(third, cur)}` };
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((d - today) / 86400000);
}

function getEarningsWarning(h) {
  const d = daysUntil(h.nextEarningsDate);
  if (d === null) return null;
  if (d < 0) return { level: "after", color: C.hold, text: "실적 발표 후 EPS/PER 재검토 필요" };
  if (d <= 7) return { level: "high", color: C.trim, text: `실적 발표 ${d}일 전 · 변동성 주의` };
  if (d <= 21) return { level: "watch", color: C.hold, text: `실적 발표 ${d}일 전 · 신규 매수 신중` };
  return null;
}

function marketBand(score) {
  const s = clampScore(score, 50);
  if (s >= 75) return { label: "시장 우호", color: C.buy, action: "분할 진입 가능" };
  if (s >= 55) return { label: "시장 중립", color: C.hold, action: "종목별 선별" };
  if (s >= 40) return { label: "시장 경계", color: C.hold, action: "비중 축소·천천히" };
  return { label: "시장 위험", color: C.trim, action: "신규 진입 자제" };
}

function getMarketGate(score, finalScore) {
  const m = clampScore(score, 50);
  if (m < 40 && finalScore < 85) return { label: "대기", color: C.trim, note: "시장 필터가 약해서 신규 진입 보류" };
  if (m < 55 && finalScore < 75) return { label: "소액만", color: C.hold, note: "시장 불안정 · 1차만 가능" };
  return { label: "진입 가능", color: C.buy, note: "시장 필터 통과" };
}


function inferSector(h) {
  const name = `${h.name || ""} ${h.ticker || ""} ${h.sector || ""}`.toLowerCase();
  if (/삼성전자|하이닉스|nvidia|엔비디아|tsmc|micron|반도체|memory|semiconductor|hbm/.test(name)) return "반도체";
  if (/kb|신한|하나|우리|금융|은행|insurance|bank|보험/.test(name)) return "금융";
  if (/카카오|naver|네이버|플랫폼|internet|software|소프트웨어/.test(name)) return "플랫폼";
  if (/현대차|기아|자동차|auto|mobility/.test(name)) return "자동차";
  if (/대한항공|항공|airline|shipping|해운/.test(name)) return "운송";
  if (/바이오|bio|pharma|제약/.test(name)) return "바이오";
  return h.sector || "기타";
}

function getConsensusRevision(h) {
  const cur = parseFloat(h.epsCurrent) || parseFloat(h.eps) || 0;
  const prev1 = parseFloat(h.epsPrev1m) || 0;
  const prev3 = parseFloat(h.epsPrev3m) || 0;
  const one = cur > 0 && prev1 > 0 ? ((cur - prev1) / Math.abs(prev1)) * 100 : null;
  const three = cur > 0 && prev3 > 0 ? ((cur - prev3) / Math.abs(prev3)) * 100 : null;
  let label = "자료 부족";
  let color = "#6b7280";
  if (one !== null || three !== null) {
    const v = three !== null ? three : one;
    if (v >= 10) { label = "상향 강함"; color = C.buy; }
    else if (v >= 3) { label = "상향"; color = C.buy; }
    else if (v <= -10) { label = "하향 강함"; color = C.trim; }
    else if (v <= -3) { label = "하향"; color = C.trim; }
    else { label = "큰 변화 없음"; color = C.hold; }
  }
  return { one, three, label, color };
}

function getValueTrap(h, r, fs) {
  const per = parseFloat(h.per) || 0;
  const risk = clampScore(h.riskScore, 50);
  const trend = clampScore(h.trendScore, 50);
  const epsRev = clampScore(h.epsRevisionScore, 50);
  const flags = [];
  if (per > 0 && per <= 7 && trend < 45) flags.push("저PER인데 실적추세 약함");
  if (r.upside >= 30 && risk < 45) flags.push("상승여력은 크지만 리스크 점수 낮음");
  if (r.upside >= 20 && epsRev < 40) flags.push("적정가 대비 싸지만 EPS 하향 가능성");
  if (h.type === "financial" && parseFloat(h.roe) > 0 && parseFloat(h.roe) < 5) flags.push("금융주 ROE 낮음");
  if (h.type !== "financial" && per > 0 && parseFloat(h.eps) <= 0) flags.push("EPS가 없거나 음수");
  const level = flags.length >= 2 ? "높음" : flags.length === 1 ? "주의" : "낮음";
  const color = flags.length >= 2 ? C.trim : flags.length === 1 ? C.hold : C.buy;
  return { level, color, flags };
}

function getMultipleHistory(h) {
  const per = parseFloat(h.per) || 0;
  const pbr = parseFloat(h.fairPBR) || 0;
  const avgPER = parseFloat(h.avg10yPER) || 0;
  const avgPBR = parseFloat(h.avg10yPBR) || 0;
  const peerPER = parseFloat(h.peerPER) || 0;
  const refPER = avgPER || peerPER;
  let perText = "PER 기준 부족";
  let perColor = "#6b7280";
  if (per > 0 && refPER > 0) {
    const diff = ((per - refPER) / refPER) * 100;
    if (diff <= -25) { perText = `PER 역사/동종 대비 ${Math.round(Math.abs(diff))}% 낮음`; perColor = C.buy; }
    else if (diff >= 25) { perText = `PER 역사/동종 대비 ${Math.round(diff)}% 높음`; perColor = C.trim; }
    else { perText = "PER 역사/동종 대비 중립"; perColor = C.hold; }
  }
  let pbrText = "PBR 기준 부족";
  let pbrColor = "#6b7280";
  if (pbr > 0 && avgPBR > 0) {
    const diff = ((pbr - avgPBR) / avgPBR) * 100;
    if (diff <= -20) { pbrText = `PBR 10년 평균 대비 ${Math.round(Math.abs(diff))}% 낮음`; pbrColor = C.buy; }
    else if (diff >= 20) { pbrText = `PBR 10년 평균 대비 ${Math.round(diff)}% 높음`; pbrColor = C.trim; }
    else { pbrText = "PBR 10년 평균 대비 중립"; pbrColor = C.hold; }
  }
  return { perText, perColor, pbrText, pbrColor };
}

function getDiagnostics(h, r, fs, conf) {
  const warn = [];
  const info = [];
  const eps = parseFloat(h.eps);
  const per = parseFloat(h.per);
  const price = parseFloat(h.price);
  const bps = parseFloat(h.bps);
  const roe = parseFloat(h.roe);
  const coe = parseFloat(h.coe);
  if (!isFinite(price) || price <= 0) warn.push("현재가 누락/0");
  if (h.type !== "financial" && (!isFinite(eps) || eps <= 0)) warn.push("EPS 누락/음수");
  if (h.type !== "financial" && (!isFinite(per) || per <= 0)) warn.push("PER 누락/0");
  if (isFinite(per) && per >= 50) warn.push("PER 50배 이상 · 고평가/성장 가정 확인");
  if (h.type === "financial" && (!isFinite(bps) || bps <= 0)) warn.push("금융주 BPS 누락");
  if (h.type === "financial" && (!isFinite(roe) || roe <= 0)) warn.push("금융주 ROE 누락");
  if (h.type === "financial" && isFinite(roe) && roe > 0 && roe < 5) warn.push("ROE 5% 미만 · 수익성 약함");
  if (h.type === "financial" && isFinite(coe) && coe > 0 && isFinite(roe) && roe > 0 && roe < coe) warn.push("ROE가 요구수익률보다 낮음");
  if (conf.sources === 0) warn.push("데이터 출처 없음");
  if (conf.score < 55) warn.push("AI/데이터 신뢰도 낮음");
  if (parseFloat(h.debtRatio) > 200) warn.push("부채비율 200% 초과");
  if (parseFloat(h.interestCoverage) > 0 && parseFloat(h.interestCoverage) < 2) warn.push("이자보상배율 2배 미만");
  if (parseFloat(h.high52) > 0 && price > 0 && price > parseFloat(h.high52) * 0.95) info.push("52주 고점 근처");
  if (parseFloat(h.low52) > 0 && price > 0 && price < parseFloat(h.low52) * 1.15) info.push("52주 저점 근처");
  if (fs.finalScore >= 75 && warn.length >= 2) warn.push("점수는 높지만 경고가 많음 · 재검토");
  return { warn, info };
}

function aiConfidenceEngine(h, r, fs, conf) {
  const diag = getDiagnostics(h, r, fs, conf);
  let score = Math.round(conf.score * 0.45 + fs.confidenceScore * 0.25 + r.quality * 0.20 + (100 - Math.min(50, diag.warn.length * 15)) * 0.10);
  score = Math.max(0, Math.min(100, score));
  const stars = "★★★★★☆☆☆☆☆".slice(5 - Math.round(score / 20), 10 - Math.round(score / 20));
  const label = score >= 80 ? "높음" : score >= 60 ? "보통" : score >= 40 ? "낮음" : "매우 낮음";
  const color = score >= 80 ? C.buy : score >= 60 ? C.hold : C.trim;
  return { score, stars, label, color, warnings: diag.warn, infos: diag.info };
}

function getPortfolioRisk(holdings) {
  const rows = holdings.map(h => ({ h, weight: parseFloat(h.portfolioWeight || h.maxWeight) || 0, sector: inferSector(h) }));
  const total = rows.reduce((a, x) => a + x.weight, 0);
  const bySector = {};
  rows.forEach(x => { bySector[x.sector] = (bySector[x.sector] || 0) + x.weight; });
  const top = Object.entries(bySector).sort((a,b)=>b[1]-a[1])[0] || ["없음", 0];
  const maxStock = rows.sort((a,b)=>b.weight-a.weight)[0] || { h: { name: "없음" }, weight: 0 };
  const warnings = [];
  if (top[1] >= 50) warnings.push(`${top[0]} 섹터 집중 ${top[1]}%`);
  if (maxStock.weight >= 35) warnings.push(`${maxStock.h.name} 단일종목 비중 ${maxStock.weight}%`);
  if (total > 100) warnings.push("입력 비중 합계 100% 초과");
  if (warnings.length === 0) warnings.push("집중 위험 낮음");
  const score = Math.max(0, Math.min(100, 100 - warnings.filter(w=>!/낮음/.test(w)).length * 25 - Math.max(0, top[1] - 35)));
  return { total, topSector: top[0], topSectorWeight: top[1], maxStock: maxStock.h.name, maxStockWeight: maxStock.weight, warnings, score, color: score >= 75 ? C.buy : score >= 50 ? C.hold : C.trim };
}

function getSectorRankings(holdings, sentiment, margin, scenario) {
  const rows = holdings.map(h => {
    const r = compute(h, margin, scenario);
    const fs = getFinalScore(h, r, sentiment[h.id]);
    return { name: h.name, sector: inferSector(h), score: fs.finalScore, decision: fs.decision.label };
  });
  const by = {};
  rows.forEach(x => { by[x.sector] = by[x.sector] || []; by[x.sector].push(x); });
  return Object.entries(by).map(([sector, arr]) => ({ sector, arr: arr.sort((a,b)=>b.score-a.score) })).sort((a,b)=>b.arr[0].score-a.arr[0].score);
}

function principleScore(p) {
  const keys = ["noAllIn", "splitBuy", "stopRule", "sixMonth", "earningsChecked"];
  const got = keys.filter((k) => p[k]).length;
  return Math.round((got / keys.length) * 100);
}

// 목표기간별 판정: 기존 신호 종합 (3M=심리+시장, 6M=업황+실적+EPS수정, 12M=가치)
function horizonVerdict(h, r, fs, sent, market) {
  // 12개월 — 가치
  let m12;
  if (r.zone === "buy") m12 = { label: "매수 우호", color: C.buy };
  else if (r.zone === "trim") m12 = { label: "고평가 주의", color: C.trim };
  else m12 = { label: "보유 수준", color: C.hold };
  m12.note = `적정가 대비 ${r.upside >= 0 ? "+" : ""}${r.upside.toFixed(0)}%`;

  // 6개월 — 업황 + 실적 + EPS수정
  const ind = clampScore(h.industryScore, 50), tr = clampScore(h.trendScore, 50), ev = clampScore(h.epsRevisionScore, 50);
  const comp = Math.round((ind + tr + ev) / 3);
  let m6;
  if (comp >= 62) m6 = { label: "우호", color: C.buy };
  else if (comp >= 45) m6 = { label: "중립", color: C.hold };
  else m6 = { label: "비우호", color: C.trim };
  m6.note = `업황${ind}·실적${tr}·EPS${ev}`;

  // 3개월 — 단기 심리 (+ 시장 필터 하향 반영)
  let m3;
  const sc = scoreSentiment(sent);
  if (sc) {
    if (sc.score <= 30) m3 = { label: "진입 우호", color: C.buy };
    else if (sc.score <= 55) m3 = { label: "관망", color: C.hold };
    else if (sc.score <= 75) m3 = { label: "추격 신중", color: C.hold };
    else m3 = { label: "진입 자제", color: C.trim };
    if (clampScore(market && market.marketScore, 50) < 40 && m3.color === C.buy) { m3 = { label: "시장 위험·관망", color: C.hold }; }
    m3.note = `심리 ${sc.score}·${sc.band}`;
  } else m3 = { label: "—", color: "#565b64", note: "단기 탭에서 심리 분석 필요" };

  return { m3, m6, m12 };
}

// 하방 시나리오 (예측 아님 — 과거 변동폭·52주 위치·보수 시나리오 기반 참고용)
function getDownside(h, r) {
  const price = parseFloat(h.price) || 0;
  const high = parseFloat(h.high52) || 0;
  const low = parseFloat(h.low52) || 0;
  const cons = r.consFair || 0;
  const range52 = high > 0 && low > 0 ? Math.round(((high - low) / low) * 100) : null; // 과거 1년 변동폭
  const fromHigh = high > 0 && price > 0 ? Math.round(((price - high) / high) * 100) : null; // 52주 고점 대비
  const consDown = cons > 0 && price > 0 ? Math.round(((cons - price) / price) * 100) : null; // 보수 적정가까지(음수면 하방)
  // 참고용 하방 추정: 52주 저점까지 또는 보수 시나리오 중 더 보수적인 쪽
  const toLow = low > 0 && price > 0 ? Math.round(((low - price) / price) * 100) : null;
  const estDown = [consDown, toLow].filter((x) => x !== null && x < 0).sort((a, b) => a - b)[0] ?? null;
  return { range52, fromHigh, consDown, toLow, estDown };
}

async function fetchMarketFilter() {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a cautious market-risk assistant. TODAY'S DATE IS ${today}. Search the web for current broad market conditions relevant to Korean and US stocks. Return ONLY a valid JSON object with EXACTLY these keys:
{
"marketScore": number 0-100,
"kospiTrend": "up"|"flat"|"down",
"nasdaqTrend": "up"|"flat"|"down",
"ratePressure": "low"|"medium"|"high",
"fxRisk": "low"|"medium"|"high",
"volatility": "low"|"medium"|"high",
"note": "Korean summary max 45 chars",
"asof": "YYYY-MM-DD",
"sources": "short comma-separated source names"
}
Scoring guide: 100 very favourable risk-on market, 50 neutral, 0 high-risk market. Consider KOSPI/Nasdaq trend, US/Korea rates, USD/KRW, VIX/volatility, major macro events. Never refuse; estimate cautiously if uncertain.`;
  return callJSON(prompt, 900, 2);
}

async function fetchAIScore(h) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a cautious equity research assistant. TODAY'S DATE IS ${today}. Search the web for the latest available fundamentals, industry conditions, earnings trend, and peer valuation for this stock: "${h.name}" (${h.ticker || ""}). Return ONLY a valid JSON object with EXACTLY these keys:
{
"industryScore": number 0-100,
"trendScore": number 0-100,
"relativeScore": number 0-100,
"riskScore": number 0-100,
"shareholderScore": number 0-100,
"epsRevisionScore": number 0-100,
"industryNote": "Korean short reason max 32 chars",
"trendNote": "Korean short reason max 32 chars",
"relativeNote": "Korean short reason max 32 chars",
"riskNote": "Korean short reason max 32 chars",
"shareholderNote": "Korean short reason max 32 chars",
"epsRevisionNote": "Korean short reason max 32 chars",
"peerPER": number or null,
"peerPBR": number or null,
"avg10yPER": number or null,
"avg10yPBR": number or null,
"epsCurrent": current consensus forward EPS as a plain number or null,
"epsPrev1m": the consensus forward EPS as it stood about 1 month ago, plain number or null,
"epsPrev3m": the consensus forward EPS as it stood about 3 months ago, plain number or null,
"debtRatio": total-liabilities-to-equity ratio in percent or null,
"interestCoverage": interest coverage ratio (operating income / interest expense) as a number or null,
"sector": short Korean sector label (e.g. "반도체","금융","자동차","플랫폼","운송","바이오") or null,
"salesGrowth": number percent or null,
"opProfitGrowth": number percent or null,
"dividendYield": number percent or null,
"high52": number or null,
"low52": number or null,
"lastEarningsDate": "YYYY-MM-DD or empty",
"nextEarningsDate": "YYYY-MM-DD or empty",
"maxWeight": number percent suggested maximum portfolio weight or null,
"cyclePhase": one Korean word for the stock's current industry CYCLE phase: "회복기"|"호황기"|"정점"|"둔화"|"불황"|"중립" (e.g. semiconductors memory cycle, autos demand cycle, banks rate cycle),
"asof": "YYYY-MM-DD",
"sources": "short source names",
"sourceLinks": "up to 3 source names or URLs separated by commas",
"confidenceNote": "Korean short note on data reliability max 34 chars"
}
Scoring rules:
- industryScore: 0 bad industry cycle, 50 neutral, 100 very strong industry tailwind. Use sector-specific data: semiconductors memory/HBM/DRAM/NAND, banks rates/NIM/credit risk, autos sales/FX/inventory, internet ads/commerce/users, airlines oil/fx/travel demand, etc.
- trendScore: latest revenue/EPS/operating profit trend. 0 deteriorating sharply, 50 mixed, 100 improving strongly.
- relativeScore: compared with close peers and historical valuation. 0 very expensive/weak, 50 fair, 100 cheap with similar or better quality.
- riskScore: balance sheet / cash flow / margin / debt safety. 100 very safe, 0 very risky.
- shareholderScore: dividend yield, buybacks, capital return, governance. 100 very attractive, 50 ordinary, 0 weak.
- epsRevisionScore: whether consensus EPS/earnings estimates improved in the last 1-3 months. 100 upward revision, 50 mixed, 0 downward revision.
- high52/low52: 52-week high and low if available.
- maxWeight: suggested maximum portfolio weight for a cautious retail investor, considering risk and volatility.
- cyclePhase: judge where the stock's main industry sits in its cycle right now (회복기 recovering / 호황기 boom / 정점 peak / 둔화 slowing / 불황 trough / 중립 unclear). For cyclicals (semis, autos, shipping, steel) this is critical: a low PER at 정점 can be a value trap.
- avg10yPER/avg10yPBR: the stock's own multi-year (up to 10y) average PER and PBR. If full history unavailable, use the longest available average and note uncertainty.
- epsCurrent/epsPrev1m/epsPrev3m: the consensus forward EPS now vs ~1 and ~3 months ago, so the app can compute estimate revisions. Approximate if needed.
- debtRatio/interestCoverage: balance-sheet safety figures from the latest financials. For banks these may be N/A → use null.
Use recent data; if uncertain, use 50 and say uncertain. Do not exaggerate. Output numbers only for numeric fields. Include source names. Keep every note SHORT (under the stated char limits) so the JSON stays complete.`;
  return callJSON(prompt, 2400, 2);
}

// 심리: AI에게 "점수"가 아니라 검증가능한 사실만 받는다
async function fetchSentiment(name) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a market data assistant. TODAY'S DATE IS ${today}. Search the web for the LATEST AVAILABLE trading sentiment facts about the Korean/US stock: "${name}", as close to today (${today}) as possible.
Always include the current year and month (and "${today}" / "today") in your search queries so you do not return stale data. Use the SINGLE MOST RECENT trading session / latest published figures you can find — never data that is several days old if fresher data exists. The "asof" field MUST be the actual date of the freshest data you found, not an estimate.
Do NOT give an opinion score. Return ONLY a valid JSON object (no markdown, no code fences) with EXACTLY these keys, each based on real recent data you find:
{
"flow": one of "buy","neutral","sell"  // foreign+institutional net flow over the last ~5 trading days
"short": one of "rising","flat","falling"  // short-interest / short-selling balance trend
"news": one of "positive","neutral","negative"  // overall tone of news UP TO TODAY (${today}), INCLUDING weekend / after-hours / holiday news (news does NOT stop when the market is closed)
"rsi": one of "oversold","neutral","overbought"  // recent technical momentum (RSI ~ <30 / 30-70 / >70)
"trend": one of "up","flat","down"  // SHORT-TERM price trend over the last ~5-20 trading days (e.g. vs 5/20-day moving averages)
"ma5": the 5-day simple moving average PRICE as a plain number (no commas), or null,
"ma20": the 20-day simple moving average PRICE as a plain number, or null,
"volRatio": today's (latest session) trading volume divided by the 20-day average volume, as a plain decimal (e.g. 2.3 means 2.3x), or null,
"prevHigh": the nearest recent resistance / prior swing high / box-top PRICE as a plain number, or null,
"support": the nearest recent support / swing low PRICE (used for the stop-loss) as a plain number, or null,
"upperTail": true ONLY if the latest candle is a long-upper-wick / 윗꼬리 긴 장대양봉 (overhead-supply / chase-buy risk), otherwise false,
"asof": the reference date of the TRADING data (flow/short/rsi/ma/volume) in "YYYY-MM-DD" (this is the last trading session and may be a few days old on weekends/holidays),
"headlines": an array of up to 3 of the MOST RECENT relevant news items, each {"date":"YYYY-MM-DD","title":"short Korean headline, max ~34 chars"}, NEWEST FIRST. Include news from the last 1-2 days even if the market was closed (weekend/holiday). If you truly find no recent news, return [],
"note": one short Korean sentence (max 24 chars) summarizing why,
"sources": short comma-separated list of the source names you used
}
IMPORTANT: flow/short/rsi reflect the LAST TRADING SESSION (may be 6/5-style if today is a weekend), but "news" and "headlines" MUST reflect the newest news available up to ${today}, weekends included.
If a field is unknown, use the neutral middle value ("neutral"/"flat") for categoricals or null for the numeric chart fields (ma5/ma20/volRatio/prevHigh/support). Base every field on the FRESHEST figures you can actually find (ideally within the last 1-2 trading days of ${today}). You MUST output the JSON object — never refuse.`;
  return callJSON(prompt, 1500, 2);
}

// 전체 시장 현황: 지수·환율·금리·원자재·코인·뉴스를 한 번에 가져온다.
async function fetchMarketOverview() {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a market data assistant. TODAY'S DATE IS ${today}. Search the web for the LATEST AVAILABLE values (as close to ${today} as possible) for the global market dashboard below. Always include the current year/month (and "${today}") in your search queries so you do not return stale numbers; use the most recent session/quote you can find.
Return ONLY a valid JSON object (no markdown, no code fences). For every quote item use: "name" (short Korean label), "value" (plain number — NO commas, NO symbols, NO % sign), "changePct" (percent move vs previous close as a plain number, may be negative).
{
"asof": "YYYY-MM-DD of the freshest data",
"fearGreed": { "us": {"value": the CNN Fear & Greed Index as a 0-100 number, "label": short Korean label}, "kr": {"value": YOUR ESTIMATED 0-100 Fear&Greed score for the Korean (KOSPI) market, "label": short Korean label} },
"us": [ S&P 500, 나스닥, 다우 — 3 index items; each ALSO include "spark": an array of about 12 values = roughly the LAST 3 MONTHS of WEEKLY closes (oldest→newest) for a 3-month mini trend line ],
"kr": [ 코스피, 코스닥 — 2 index items; each ALSO include "spark": an array of about 12 values = roughly the LAST 3 MONTHS of WEEKLY closes (oldest→newest) ],
"fx": [ 원/달러 (USD/KRW, value in KRW), 원/뉴질랜드달러 (NZD/KRW, value in KRW), 달러인덱스(DXY) ],
"rates": [ government bond YIELDS in percent (value = yield in %): 미국 10년, 미국 2년, 한국 10년 ],
"commodities": [ WTI유가, 금, 은 ],
"crypto": [ return EXACTLY these 4 in this order — 비트코인, 이더리움, 리플(XRP), 테더(USDT) — all value in USD; include all four even if a value is uncertain ],
"news": [ up to 5 items, each {"title":"a SHORT ORIGINAL Korean summary YOU write yourself (max ~36 chars) — do NOT copy any headline verbatim","impact":"호재"|"악재"|"중립","asof":"YYYY-MM-DD","url":"the real source article URL (https://...)"} ]
}
Rules: value/changePct are plain numbers only. For Korean indices (코스피/코스닥) report the latest CLOSING INDEX LEVEL in points and verify the magnitude (코스피 is typically 2,000–4,000 points, 코스닥 typically 600–1,100) — NEVER a single stock's price; search Korean sources (네이버 증권 / 한국거래소) with today's date. For "fearGreed", search "CNN Fear and Greed Index" for the US 0-100 value. For Korea there is no clean public stock F&G number, so ESTIMATE a 0-100 value yourself from current KOSPI conditions (where the index sits within its 52-week range, recent momentum/trend, and the VKOSPI volatility level) — 0 = extreme fear, 100 = extreme greed. ALWAYS provide a KR number (never null). For "news", WRITE YOUR OWN concise Korean paraphrase of what happened and why it matters to stocks — never reproduce an article's exact wording; ALSO include the real source article "url" (a full https:// link from your search results) for each item. Put the newest / most market-moving news first. If a value is genuinely unavailable use null. You MUST output the JSON even if some fields are uncertain — estimate the freshest reasonable value and never refuse.`;
  return callJSON(prompt, 2200, 2);
}

function fgZone(v) {
  if (v == null || !isFinite(v)) return { label: "—", color: "#9aa0aa", desc: "" };
  if (v < 25) return { label: "극도의 공포", color: "#34d399", desc: "저점 신호 가능" };
  if (v < 45) return { label: "공포", color: "#5eead4", desc: "" };
  if (v <= 55) return { label: "중립", color: "#fbbf24", desc: "" };
  if (v <= 75) return { label: "탐욕", color: "#fb923c", desc: "" };
  return { label: "극도의 탐욕", color: "#f87171", desc: "과열 신호 가능" };
}
function FearGreedBar({ name, value }) {
  const v = (value != null && isFinite(parseFloat(value))) ? Math.round(parseFloat(value)) : null;
  const z = fgZone(v);
  return (
    <div style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 13px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#9aa0aa" }}>{name}</span>
        <span className="vl-mono" style={{ fontSize: 19, fontWeight: 800, color: z.color, marginLeft: "auto" }}>{v == null ? "—" : v}</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: z.color }}>{z.label}</span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 3, marginTop: 9, background: "linear-gradient(90deg,#34d399,#5eead4,#fbbf24,#fb923c,#f87171)" }}>
        {v != null && <div style={{ position: "absolute", left: "calc(" + v + "% - 6px)", top: -3, width: 12, height: 12, borderRadius: "50%", background: "#fff", border: "2px solid #0c0e11", boxShadow: "0 0 0 1px rgba(255,255,255,0.45)" }} />}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 9.5, color: "#6b7280" }}>
        <span>0 · 공포(저점)</span><span>탐욕(과열) · 100</span>
      </div>
      {z.desc && <div style={{ fontSize: 10.5, color: z.color, marginTop: 6, fontWeight: 700 }}>{z.desc}</div>}
    </div>
  );
}

const FG_ZONES = [
  { range: "0~25", label: "극도의 공포", color: "#34d399", desc: "시장 과매도 · 저점 신호 가능", action: "적극 매수 관점", aColor: "#34d399", note: "남들이 공포일 때가 기회 — 가치 좋은 종목 분할 매수" },
  { range: "25~45", label: "공포", color: "#5eead4", desc: "투자심리 위축", action: "매수 우위", aColor: "#34d399", note: "서두르지 말고 나눠서 분할 매수 고려" },
  { range: "45~55", label: "중립", color: "#fbbf24", desc: "심리 균형 구간", action: "보유 · 관망", aColor: "#fbbf24", note: "지수보다 개별 종목 가치로 판단" },
  { range: "55~75", label: "탐욕", color: "#fb923c", desc: "낙관 우세", action: "보유 · 신규 자제", aColor: "#fbbf24", note: "추격매수 자제, 비중 점검" },
  { range: "75~100", label: "극도의 탐욕", color: "#f87171", desc: "과열 · 고점 경계 신호", action: "차익실현 · 방어 관점", aColor: "#f87171", note: "신규 진입 보류, 분할 차익실현 고려" },
];

function Spark({ arr, up }) {
  const w = 120, h = 30;
  let series = (Array.isArray(arr) && arr.length >= 2) ? arr.map((x) => parseFloat(x)).filter((x) => isFinite(x)) : null;
  if (!series || series.length < 2) {
    const base = [0, 1, 0.6, 1.6, 1.3, 2.1, 2.6, 3.2]; // 데이터 없으면 방향만 보여주는 합성선
    series = up ? base : base.map((v) => -v);
  }
  const max = Math.max(...series), min = Math.min(...series);
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - ((v - min) / ((max - min) || 1)) * h;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  const color = up ? "#34d399" : "#f87171";
  return (
    <svg width="100%" height="30" viewBox={"0 0 " + w + " " + h} preserveAspectRatio="none" style={{ marginTop: 8, display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MarketGrid({ title, items, unit, showSpark }) {
  if (!items || !items.length) return null;
  return (
    <div className="vl-card" style={{ background: "#0f1115", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
      <div className="vl-label" style={{ marginBottom: 10 }}>{title}{showSpark ? <span style={{ fontSize: 10, color: "#565b64", fontWeight: 500, marginLeft: 8 }}>추세선 · 최근 3개월</span> : null}</div>
      <div className="vl-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
        {items.map((it, i) => {
          const ch = parseFloat(it.changePct);
          const up = isFinite(ch) ? ch >= 0 : null;
          const col = up === null ? "#9aa0aa" : up ? "#34d399" : "#f87171";
          const val = (it.value != null && isFinite(parseFloat(it.value))) ? parseFloat(it.value).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
          return (
            <div key={i} style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 11px" }}>
              <div style={{ fontSize: 11.5, color: "#9aa0aa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
              <div className="vl-mono" style={{ fontSize: 15, fontWeight: 700, color: "#f4f5f7", marginTop: 3 }}>{val}{unit ? <span style={{ fontSize: 10.5, color: "#6b7280" }}> {unit}</span> : null}</div>
              {isFinite(ch) && <div className="vl-mono" style={{ fontSize: 11.5, fontWeight: 700, color: col, marginTop: 2 }}>{up ? "▲" : "▼"} {Math.abs(ch).toFixed(2)}%</div>}
              {showSpark && <Spark arr={it.spark} up={up !== false} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function scoreSentiment(s) {
  if (!s) return null;
  const flowMap = { sell: 0, neutral: 50, buy: 100 };
  const newsMap = { negative: 0, neutral: 50, positive: 100 };
  const shortMap = { rising: 0, flat: 50, falling: 100 };
  const rsiMap = { oversold: 15, neutral: 50, overbought: 90 };
  const flow = flowMap[s.flow] ?? 50;
  const news = newsMap[s.news] ?? 50;
  const short = shortMap[s.short] ?? 50;
  const rsi = rsiMap[s.rsi] ?? 50;
  const score = Math.round(flow * 0.35 + news * 0.25 + short * 0.2 + rsi * 0.2);
  let band, color, timing;
  if (score <= 30) { band = "공포"; color = "#34d399"; timing = "분할 매수 우호적"; }
  else if (score <= 55) { band = "중립"; color = "#9aa0aa"; timing = "관망"; }
  else if (score <= 75) { band = "낙관"; color = "#fbbf24"; timing = "추격 매수 신중"; }
  else { band = "과열"; color = "#f87171"; timing = "신규 진입 자제"; }
  return { score, band, color, timing };
}

// 단타 점수 (100점) — 차트·거래량·돌파 기반. "싸다/비싸다"가 아니라 "지금 수급이 붙었나".
// 추세25 · 거래량25 · 돌파20 · 눌림목15 · 리스크15. 손절가 자동 계산 포함.
function dantaScore(s, price) {
  if (!s) return null;
  const ma5 = parseFloat(s.ma5) || 0;
  const ma20 = parseFloat(s.ma20) || 0;
  const volR = parseFloat(s.volRatio) || 0;
  const prevHigh = parseFloat(s.prevHigh) || 0;
  const support = parseFloat(s.support) || 0;
  const upperTail = s.upperTail === true || s.upperTail === "true";
  const p = price > 0 ? price : 0;
  const warn = [], parts = [];

  // 1. 추세 (25): 현재가 > 5일선 > 20일선 = 정배열
  let trend, tn;
  if (ma5 && ma20 && p) {
    if (p > ma5 && ma5 > ma20) { trend = 25; tn = "정배열 (현재가>5일>20일)"; }
    else if (p > ma5 && p > ma20) { trend = 19; tn = "현재가 이평선 위"; }
    else if (p < ma5 && ma5 < ma20) { trend = 3; tn = "역배열 (하락추세)"; warn.push("역배열 — 추세 약함"); }
    else { trend = 11; tn = "혼조"; }
  } else { trend = 12; tn = "이평선 데이터 없음"; }
  parts.push(["추세", trend, 25, tn]);

  // 2. 거래량 (25): 오늘 거래량 ≥ 20일 평균 2배 = 강함, 가격↑+거래량↑ 가점
  let vol, vn;
  if (volR > 0) {
    if (volR >= 3) { vol = 25; vn = `평균 ${volR.toFixed(1)}배 (폭발)`; }
    else if (volR >= 2) { vol = 22; vn = `평균 ${volR.toFixed(1)}배 (강함)`; }
    else if (volR >= 1.5) { vol = 16; vn = `평균 ${volR.toFixed(1)}배`; }
    else if (volR >= 1) { vol = 11; vn = "평균 수준"; }
    else { vol = 6; vn = "평균 이하 (한산)"; }
    if (p && ma5 && p > ma5 && volR >= 1.5) { vol = Math.min(25, vol + 2); vn += " · 상승+거래량"; }
  } else { vol = 12; vn = "거래량 데이터 없음"; }
  parts.push(["거래량", vol, 25, vn]);

  // 3. 돌파 (20): 전고점/저항 돌파
  let brk, bn;
  if (prevHigh && p) {
    const r = p / prevHigh;
    if (r >= 1.0) { brk = 20; bn = "전고점/저항 돌파"; }
    else if (r >= 0.97) { brk = 14; bn = "전고점 근접 (돌파 임박)"; }
    else if (r >= 0.9) { brk = 8; bn = "저항선 아래"; }
    else { brk = 4; bn = "전고점과 거리 있음"; }
  } else { brk = 10; bn = "전고점 데이터 없음"; }
  parts.push(["돌파", brk, 20, bn]);

  // 4. 눌림목 (15): 상승 후 이평선 근처 버팀 + 거래량 감소
  let pull, pn;
  if (ma5 && ma20 && p && ma5 > ma20) {
    const nearMa = (Math.abs(p - ma5) / p <= 0.03) || (Math.abs(p - ma20) / p <= 0.03);
    const volQuiet = volR > 0 && volR < 1;
    if (nearMa && volQuiet) { pull = 15; pn = "이평선 눌림목 + 거래량 감소 (이상적)"; }
    else if (nearMa) { pull = 10; pn = "이평선 근처 지지"; }
    else { pull = 6; pn = "추세 진행 중 (눌림목 아님)"; }
  } else { pull = 6; pn = "상승추세 아님/데이터 없음"; }
  parts.push(["눌림목", pull, 15, pn]);

  // 5. 리스크 (15): 손절 거리 + 윗꼬리. 손절가 자동 = 지지선 → 20일선 → 현재가-4%
  let stop = support || ma20 || (p ? Math.round(p * 0.96) : 0);
  if (p && stop >= p) stop = Math.round(p * 0.96);
  let risk, rn;
  if (p && stop) {
    const dist = (p - stop) / p;
    if (dist <= 0.03) { risk = 15; rn = `손절 거리 ${(dist * 100).toFixed(1)}% (타이트)`; }
    else if (dist <= 0.05) { risk = 11; rn = `손절 거리 ${(dist * 100).toFixed(1)}%`; }
    else if (dist <= 0.08) { risk = 7; rn = `손절 거리 ${(dist * 100).toFixed(1)}% (다소 멂)`; }
    else { risk = 3; rn = `손절 거리 ${(dist * 100).toFixed(1)}% (너무 멂)`; warn.push("손절선이 멀어 리스크 큼"); }
  } else { risk = 7; rn = "손절 계산 불가"; }
  if (upperTail) { risk = Math.max(0, risk - 5); warn.push("윗꼬리 긴 장대양봉 — 추격매수 위험"); }
  parts.push(["리스크", risk, 15, rn]);

  const total = trend + vol + brk + pull + risk;
  const entry = p;
  const riskAmt = entry && stop ? entry - stop : 0;
  const t1 = riskAmt > 0 ? Math.round(entry + riskAmt * 2) : (prevHigh > entry ? prevHigh : Math.round(entry * 1.04));
  const t2 = riskAmt > 0 ? Math.round(entry + riskAmt * 3) : Math.round(entry * 1.08);

  let status, color;
  if (total >= 75) { status = "강한 진입 신호 · 분할 진입 가능"; color = "#34d399"; }
  else if (total >= 60) { status = "관심 · 눌림목 확인 후 진입"; color = "#fbbf24"; }
  else if (total >= 40) { status = "관망"; color = "#9aa0aa"; }
  else { status = "회피 · 진입 자제"; color = "#f87171"; }

  return { total, parts, status, color, entry, stop, t1, t2, warn };
}

const SENT_KO = {
  flow: { buy: "수급: 외인·기관 순매수", neutral: "수급: 중립", sell: "수급: 외인·기관 순매도" },
  news: { positive: "뉴스: 긍정 우세", neutral: "뉴스: 중립", negative: "뉴스: 부정 우세" },
  short: { rising: "공매도: 증가", flat: "공매도: 보합", falling: "공매도: 감소" },
  rsi: { oversold: "RSI: 과매도", neutral: "RSI: 중립", overbought: "RSI: 과매수" },
  trend: { up: "단기추세: 상승", flat: "단기추세: 횡보", down: "단기추세: 하락" },
};

function SentimentPanel({ s }) {
  const sc = scoreSentiment(s);
  if (!sc) return null;
  return (
    <div style={{ marginTop: 16, background: "#0c0e11", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="vl-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Gauge size={13} /> 진입 타이밍 심리</span>
        <span className="vl-mono" style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>{sc.score} · {sc.band}</span>
      </div>
      <div style={{ position: "relative", height: 8, borderRadius: 5, overflow: "hidden", background: "linear-gradient(90deg,#1c7a57,#9a7416,#a83838)" }}>
        <div style={{ position: "absolute", left: sc.score + "%", top: -3, transform: "translateX(-50%)", width: 3, height: 14, background: "#fff", boxShadow: "0 0 6px rgba(255,255,255,.7)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 10, color: C.buy }}>공포</span>
        <span style={{ fontSize: 10, color: C.trim }}>과열</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: sc.color, fontWeight: 600 }}>→ {sc.timing}</div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
        {[["flow", s.flow], ["news", s.news], ["trend", s.trend], ["short", s.short], ["rsi", s.rsi]].map(([k, v]) => (
          v ? <span key={k} style={{ fontSize: 11.5, color: "#8b93a0" }}>· {(SENT_KO[k] && SENT_KO[k][v]) || k}</span> : null
        ))}
      </div>
      {s.note && <div style={{ marginTop: 8, fontSize: 12, color: "#9aa0aa", lineHeight: 1.5 }}>{s.note}</div>}
      {Array.isArray(s.headlines) && s.headlines.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="vl-label" style={{ fontSize: 10 }}>📰 최근 뉴스</span>
          {s.headlines.slice(0, 3).map((n, i) => (
            <div key={i} style={{ display: "flex", gap: 7, alignItems: "baseline" }}>
              <span className="vl-mono" style={{ fontSize: 10, color: "#6b7280", flexShrink: 0, minWidth: 64 }}>{n.date || "—"}</span>
              <span style={{ fontSize: 12, color: "#bcc2cc", lineHeight: 1.45 }}>{n.title}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 10.5, color: "#565b64", lineHeight: 1.5 }}>
        거래데이터 기준 {s.asof || "—"} <span style={{ color: "#454a52" }}>(최근 거래일)</span>{s.sources ? " · 출처 " + s.sources : ""}
      </div>
    </div>
  );
}

function DantaPanel({ s, price, cur }) {
  const d = dantaScore(s, price);
  if (!d) return null;
  return (
    <div style={{ marginTop: 16, background: "#0c0e11", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="vl-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Activity size={13} /> 단타 점수</span>
        <span className="vl-mono" style={{ fontSize: 19, fontWeight: 800, color: d.color }}>{d.total}<span style={{ fontSize: 12, color: "#6b7280", fontWeight: 400 }}>/100</span></span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: d.color, marginBottom: 11 }}>→ {d.status}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {d.parts.map(([label, sc, max, note], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
            <span style={{ width: 44, color: "#9aa0aa", flexShrink: 0 }}>{label}</span>
            <div style={{ width: 70, height: 6, borderRadius: 4, background: "#1a1d23", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ width: (sc / max * 100) + "%", height: "100%", background: sc / max >= 0.7 ? "#34d399" : sc / max >= 0.4 ? "#fbbf24" : "#f87171" }} />
            </div>
            <span className="vl-mono" style={{ width: 36, textAlign: "right", color: "#bcc2cc", flexShrink: 0 }}>{sc}/{max}</span>
            <span style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.3 }}>{note}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "#101216", borderRadius: 8, padding: "8px 11px" }}>
          <div className="vl-label" style={{ fontSize: 10, marginBottom: 4 }}>진입 / 손절 (자동)</div>
          <div className="vl-mono" style={{ fontSize: 12.5, lineHeight: 1.65 }}><span style={{ color: "#cbd0d8" }}>진입 {fmt(d.entry, cur)} 근처</span><br /><span style={{ color: "#f87171" }}>손절 {fmt(d.stop, cur)}</span></div>
        </div>
        <div style={{ background: "#101216", borderRadius: 8, padding: "8px 11px" }}>
          <div className="vl-label" style={{ fontSize: 10, marginBottom: 4 }}>목표가</div>
          <div className="vl-mono" style={{ fontSize: 12.5, lineHeight: 1.65, color: "#34d399" }}>1차 {fmt(d.t1, cur)}<br />2차 {fmt(d.t2, cur)}</div>
        </div>
      </div>
      {d.warn.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: "#fbbf24", lineHeight: 1.5 }}>⚠ {d.warn.join(" · ")}</div>
      )}
      <div style={{ marginTop: 9, fontSize: 10.5, color: "#565b64", lineHeight: 1.5 }}>손절 자동 = 지지선→20일선→현재가-4% · 목표 = 손절 대비 2R·3R · 차트값 {s.asof || "최근 거래일"} 기준 (시차 있을 수 있음)</div>
    </div>
  );
}

function ZoneBar({ buy, fair, price, cur }) {
  if (!(fair > 0)) return null;
  const lo = buy * 0.85, hi = fair * 1.15, span = hi - lo || 1;
  const p = (x) => Math.max(0, Math.min(100, ((x - lo) / span) * 100));
  const buyPct = p(buy), fairPct = p(fair), pricePct = p(price);
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ position: "relative", height: 10, borderRadius: 6, overflow: "hidden", display: "flex", background: "#0d0f13" }}>
        <div style={{ width: buyPct + "%", background: "linear-gradient(90deg,#0f3d2e,#1c7a57)" }} />
        <div style={{ width: (fairPct - buyPct) + "%", background: "linear-gradient(90deg,#5a4410,#9a7416)" }} />
        <div style={{ width: (100 - fairPct) + "%", background: "linear-gradient(90deg,#6e2424,#a83838)" }} />
      </div>
      {price > 0 && (
        <div style={{ position: "relative", height: 0 }}>
          <div style={{ position: "absolute", left: pricePct + "%", top: -16, transform: "translateX(-50%)" }}>
            <div style={{ width: 2, height: 16, background: "#fff", margin: "0 auto", boxShadow: "0 0 6px rgba(255,255,255,.6)" }} />
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span className="vl-mono" style={{ fontSize: 11, color: C.buy }}>매수 {fmt(buy, cur)}</span>
        <span className="vl-mono" style={{ fontSize: 11, color: C.hold }}>적정 {fmt(fair, cur)}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [holdings, setHoldings] = useState(DEFAULTS.holdings);
  const [margin, setMargin] = useState(DEFAULTS.margin);
  const [scenario, setScenario] = useState(15);
  const [log, setLog] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [freshId, setFreshId] = useState(null);
  const [err, setErr] = useState("");
  const [sentiment, setSentiment] = useState({});
  const [sentId, setSentId] = useState(null);
  const [tab, setTab] = useState("market");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [aiScoreId, setAiScoreId] = useState(null);
  const [recs, setRecs] = useState([]);
  const [recsBusy, setRecsBusy] = useState(false);
  const [recMarket, setRecMarket] = useState("kr");
  const [recType, setRecType] = useState("any");
  const [recSector, setRecSector] = useState("any");
  const [recAddId, setRecAddId] = useState("");
  const [recProgress, setRecProgress] = useState(null);
  const [scCountry, setScCountry] = useState("kr");
  const [scSector, setScSector] = useState("any");
  const [scMinCap, setScMinCap] = useState(1000);
  const [scNoEtf, setScNoEtf] = useState(true);
  const [screen, setScreen] = useState([]);
  const [screenBusy, setScreenBusy] = useState(false);
  const [screenOpenId, setScreenOpenId] = useState(null);
  const [screenProgress, setScreenProgress] = useState(null);
  const [plant, setPlant] = useState({});
  const [plantId, setPlantId] = useState(null);
  const [plantBulk, setPlantBulk] = useState(false);
  const [harvest, setHarvest] = useState({});
  const [harvestId, setHarvestId] = useState(null);
  const [harvestBulk, setHarvestBulk] = useState(false);
  const [buyPrices, setBuyPrices] = useState({});
  const [finalData, setFinalData] = useState({});
  const [finalId, setFinalId] = useState(null);
  const [finalBulk, setFinalBulk] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);
  const [market, setMarket] = useState({ marketScore: 50, kospiTrend: "flat", nasdaqTrend: "flat", ratePressure: "medium", fxRisk: "medium", volatility: "medium", note: "시장 필터 미갱신", asof: "", sources: "" });
  const [marketBusy, setMarketBusy] = useState(false);
  const [overview, setOverview] = useState(null);
  const [overviewBusy, setOverviewBusy] = useState(false);
  const [overviewAt, setOverviewAt] = useState(null);
  const [mktLog, setMktLog] = useState([]);
  const [mktLogOpen, setMktLogOpen] = useState(false);
  const [fgInfoOpen, setFgInfoOpen] = useState(false);
  const [principles, setPrinciples] = useState({ noAllIn: true, splitBuy: true, stopRule: false, sixMonth: true, earningsChecked: false });

  useEffect(() => {
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) {
          const r = await window.storage.get(KEY);
          if (r && r.value) {
            const st = JSON.parse(r.value);
            if (Array.isArray(st.holdings)) setHoldings(st.holdings);
            if (typeof st.margin === "number") setMargin(st.margin);
            if (typeof st.scenario === "number") setScenario(st.scenario);
            if (st.market) setMarket(st.market);
            if (st.principles) setPrinciples(st.principles);
            if (st.sentiment) setSentiment(st.sentiment);
          }
          const lg = await window.storage.get(LOGKEY);
          if (lg && lg.value) { const a = JSON.parse(lg.value); if (Array.isArray(a)) setLog(a); }
          const ov = await window.storage.get(OVKEY);
          if (ov && ov.value) { const o = JSON.parse(ov.value); if (o && o.data) { setOverview(o.data); setOverviewAt(o.at || null); } }
          const ml = await window.storage.get(MKTLOGKEY);
          if (ml && ml.value) { const a = JSON.parse(ml.value); if (Array.isArray(a)) setMktLog(a); }
          const bp = await window.storage.get(BUYKEY);
          if (bp && bp.value) { const o = JSON.parse(bp.value); if (o && typeof o === "object") setBuyPrices(o); }
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage)
          await window.storage.set(KEY, JSON.stringify({ holdings, margin, scenario, market, principles, sentiment }));
      } catch (e) {}
    })();
  }, [holdings, margin, scenario, market, principles, sentiment, loaded]);

  // 로드 후 기준값 없는 종목은 현재값을 기준으로 1회 채움 (기본 종목 포함)
  useEffect(() => {
    if (!loaded) return;
    setHoldings((hs) => hs.some((h) => !h.baseline) ? hs.map((h) => (h.baseline ? h : { ...h, baseline: { type: h.type, eps: h.eps, per: h.per, bps: h.bps, fairPBR: h.fairPBR, roe: h.roe, coe: h.coe, growth: h.growth, epsCons: h.epsCons, perCons: h.perCons, epsOpt: h.epsOpt, perOpt: h.perOpt, price: h.price, scenMode: h.scenMode } })) : hs);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage)
          await window.storage.set(LOGKEY, JSON.stringify(log));
      } catch (e) {}
    })();
  }, [log, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => { try { if (typeof window !== "undefined" && window.storage) await window.storage.set(MKTLOGKEY, JSON.stringify(mktLog)); } catch (e) {} })();
  }, [mktLog, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => { try { if (typeof window !== "undefined" && window.storage) await window.storage.set(BUYKEY, JSON.stringify(buyPrices)); } catch (e) {} })();
  }, [buyPrices, loaded]);

  const analyzeHarvest = async (id) => {
    if (harvestId || harvestBulk) return;
    const h = holdings.find((x) => x.id === id);
    if (!h) return;
    setHarvestId(id); setErr("");
    try {
      const d = await fetchHarvest(h.name, h.cur === "$" ? "US" : "KR");
      setHarvest((p) => ({ ...p, [id]: d }));
    } catch (e) { setErr(h.name + " 추수 분석 실패: " + (e && e.message ? e.message : String(e))); }
    setHarvestId(null);
  };
  const analyzeHarvestAll = async () => {
    if (harvestId || harvestBulk || !holdings.length) return;
    setHarvestBulk(true); setErr("");
    for (const h of holdings) {
      try { const d = await fetchHarvest(h.name, h.cur === "$" ? "US" : "KR"); setHarvest((p) => ({ ...p, [h.id]: d })); } catch (e) {}
    }
    setHarvestBulk(false);
  };

  const runFinal = async (h) => {
    const mkt = h.cur === "$" ? "US" : "KR";
    const m = await fetchQuantMetrics(h.name, mkt);
    let pd = plant[h.id];
    if (!pd) { pd = await fetchPlant(h.name, mkt); setPlant((p) => ({ ...p, [h.id]: pd })); }
    const qs = quantScore(m);
    const tTotal = plantScore(pd.items);
    const tBase = plantGrade(tTotal);
    const tg = plantUpgrade(tBase, pd.roe, pd.epsGrowth);
    const est = [].concat(Array.isArray(m.estimated) ? m.estimated : [], Array.isArray(pd.estimated) ? pd.estimated.map((k) => "타이밍:" + k) : []);
    return { qTotal: qs.total, qGrade: qs.grade, tTotal, tGrade: tg, estimated: est };
  };
  const analyzeFinal = async (id) => {
    if (finalId || finalBulk) return;
    const h = holdings.find((x) => x.id === id);
    if (!h) return;
    setFinalId(id); setErr("");
    try { const r = await runFinal(h); setFinalData((f) => ({ ...f, [id]: r })); }
    catch (e) { setErr(h.name + " 종합 분석 실패: " + (e && e.message ? e.message : String(e))); }
    setFinalId(null);
  };
  const analyzeFinalAll = async () => {
    if (finalId || finalBulk || !holdings.length) return;
    setFinalBulk(true); setErr("");
    for (const h of holdings) {
      try { const r = await runFinal(h); setFinalData((f) => ({ ...f, [h.id]: r })); } catch (e) {}
    }
    setFinalBulk(false);
  };

  const saveMktSnapshot = () => {
    if (!overview) return;
    const find = (arr, nm) => { const x = (arr || []).find((i) => (i.name || "").includes(nm)); return x ? { v: x.value, c: x.changePct } : null; };
    const rec = {
      at: new Date().toISOString(), asof: overview.asof || "",
      kospi: find(overview.kr, "코스피"), kosdaq: find(overview.kr, "코스닥"),
      sp: find(overview.us, "S&P") || find(overview.us, "500"), nasdaq: find(overview.us, "나스닥"),
      btc: find(overview.crypto, "비트"),
      fgUS: overview.fearGreed && overview.fearGreed.us ? overview.fearGreed.us.value : null,
      fgKR: overview.fearGreed && overview.fearGreed.kr ? overview.fearGreed.kr.value : null,
      news: Array.isArray(overview.news) ? overview.news.slice(0, 5) : [],
    };
    setMktLog((l) => [rec, ...l].slice(0, 60));
    setMktLogOpen(true);
  };
  const delMktRec = (at) => setMktLog((l) => l.filter((r) => r.at !== at));

  const update = (id, f, v) => setHoldings((hs) => hs.map((h) => (h.id === id ? { ...h, [f]: v } : h)));

  // 종목별 기준값(baseline) 스냅샷 / 원래대로 되돌리기 / 검증 잠금
  const BASE_FIELDS = ["type", "eps", "per", "bps", "fairPBR", "roe", "coe", "growth", "epsCons", "perCons", "epsOpt", "perOpt", "price", "scenMode", "cycleW"];
  const snapshot = (h) => { const o = {}; BASE_FIELDS.forEach((k) => { o[k] = h[k]; }); return o; };
  const setBaseline = (id) => { setHoldings((hs) => hs.map((h) => (h.id === id ? { ...h, baseline: snapshot(h) } : h))); setErr(""); };
  const revertToBaseline = (id) => setHoldings((hs) => hs.map((h) => (h.id === id && h.baseline ? { ...h, ...h.baseline } : h)));
  const toggleVerified = (id) => setHoldings((hs) => hs.map((h) => (h.id === id ? { ...h, verified: (h.verified === "true" || h.verified === true) ? "false" : "true" } : h)));
  const applyFormulaPreset = (id) => setHoldings((hs) => hs.map((h) => {
    if (h.id !== id) return h;
    const preset = inferFormulaPreset(h);
    return { ...h, type: preset.type, fixedType: preset.type, lockFormula: "true", formulaReason: preset.reason };
  }));
  const unlockFormulaPreset = (id) => update(id, "lockFormula", "false");
  const toggleCur = (id) => setHoldings((hs) => hs.map((h) => (h.id === id ? { ...h, cur: h.cur === "₩" ? "$" : "₩" } : h)));
  const remove = (id) => setHoldings((hs) => hs.filter((h) => h.id !== id));
  const reset = () => { setHoldings(DEFAULTS.holdings); setMargin(DEFAULTS.margin); setScenario(15); setErr(""); };

  const saveLog = (h, r) => {
    const entry = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      name: h.name, cur: h.cur, method: r.method,
      fair: Math.round(r.fair), price: Math.round(r.price),
      upside: r.upside, zone: r.zone, quality: r.quality, finalScore: getFinalScore(h, r, sentiment[h.id]).finalScore, decisionLabel: getFinalScore(h, r, sentiment[h.id]).decision.label, dataConfidence: dataConfidence(h, r).score, formula: h.fixedType || h.type, sources: h.dataSources || h.aiScoreSources || h.sourceLinks || "", industryScore: h.industryScore, trendScore: h.trendScore, relativeScore: h.relativeScore, eps: h.eps, per: h.per, price3m: "", price6m: "", price12m: "", action: "", note: "",
    };
    setLog((l) => [entry, ...l]);
  };
  const updateLogNote = (id, v) => setLog((l) => l.map((e) => (e.id === id ? { ...e, note: v } : e)));
  const updateLogField = (id, f, v) => setLog((l) => l.map((e) => (e.id === id ? { ...e, [f]: v } : e)));
  const acc = enhancedAccuracySummary(log);
  const deleteLog = (id) => setLog((l) => l.filter((e) => e.id !== id));

  const ACTION_KO = { full: "매수함", partial: "일부매수", watch: "관망", skip: "안삼", sold: "매도함", "": "미입력" };
  const exportCSV = () => {
    if (!log.length) { setErr("내보낼 기록이 없어요."); return; }
    try {
      const cols = ["기록일", "종목", "공식", "당시적정가", "당시현재가", "당시상승여력%", "프로그램판정", "AI점수", "데이터신뢰", "3개월후", "6개월후", "12개월후", "결과", "최고수익률%", "내행동", "메모"];
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = log.map((e) => {
        const ev = evaluateLog(e);
        return [e.date, e.name, e.formula || "", e.fair, e.price, (e.upside ?? "").toString().slice(0, 6), e.decisionLabel || (ZONE[e.zone] && ZONE[e.zone].label) || "", e.finalScore ?? "", e.dataConfidence ?? "", e.price3m || "", e.price6m || "", e.price12m || "", ev.status, ev.bestReturn !== null ? ev.bestReturn.toFixed(1) : "", ACTION_KO[e.action || ""], e.note || ""].map(esc).join(",");
      });
      const csv = "\uFEFF" + cols.map(esc).join(",") + "\n" + rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `valuelens_backtest_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setErr("CSV 내보내기 실패: " + (e && e.message ? e.message : "원인불명")); }
  };


  const onAdd = async () => {
    if (!query.trim() || adding) return;
    const q = query.trim().toLowerCase();
    const dup = holdings.find((h) => (h.name || "").toLowerCase() === q || (h.ticker || "").toLowerCase() === q);
    if (dup) { setErr(`이미 추가된 종목이에요: ${dup.name}`); return; }
    setAdding(true); setErr("");
    try {
      const d = await fetchStock(query.trim());
      // AI가 돌려준 이름/티커로도 중복 한 번 더 확인
      const nm = (d.name || "").toLowerCase(), tk = (d.ticker || "").toLowerCase();
      const dup2 = holdings.find((h) => (nm && (h.name || "").toLowerCase() === nm) || (tk && (h.ticker || "").toLowerCase() === tk));
      if (dup2) { setErr(`이미 추가된 종목이에요: ${dup2.name}`); setAdding(false); return; }
      const id = Date.now().toString();
      const obj = { id, ...normalize(d, query.trim()) };
      obj.baseline = snapshot(obj);
      setHoldings((hs) => [...hs, obj]);
      setFreshId(id);
      setQuery("");
    } catch (e) { setErr("불러오기 실패: " + (e && e.message ? e.message : String(e))); }
    setAdding(false);
  };

  const findRecs = async () => {
    if (recsBusy) return;
    const sec = SECTORS.find((s) => s.v === recSector);
    setRecsBusy(true); setRecsOpen(true); setErr(""); setRecs([]); setRecProgress(null);
    try {
      // 1) AI가 후보 이름 6개 던짐 (빠름, 검색 X)
      const d = await fetchRecommendations({ market: recMarket, type: recType, sectorEn: sec && sec.en ? sec.en : "" });
      let cands = Array.isArray(d) ? d : (Array.isArray(d && d.list) ? d.list : null);
      if (!cands && d && typeof d === "object") {
        for (const k in d) { if (Array.isArray(d[k]) && d[k].length && typeof d[k][0] === "object") { cands = d[k]; break; } }
      }
      cands = (Array.isArray(cands) ? cands : []).filter((x) => x && (x.name || x.ticker)).slice(0, 6);
      if (!cands.length) { setErr("후보를 못 받았어. 다시 시도해줘."); setRecsBusy(false); return; }

      // 2) 각 후보를 장기 탭과 동일한 엔진(fetchStock + getFair/compute)으로 실제 분석
      const evaluated = [];
      for (let i = 0; i < cands.length; i++) {
        const c = cands[i];
        const nm = (c.name || c.ticker || "").trim();
        setRecProgress({ done: i, total: cands.length, name: nm });
        try {
          const sd = await fetchStock(nm);
          const h = { id: "rec" + i + "_" + Date.now(), ...normalize(sd, nm) };
          const r = compute(h, margin, scenario);
          evaluated.push({
            name: h.name || nm, ticker: h.ticker || c.ticker || "",
            market: c.market || (h.cur === "$" ? "US" : "KR"),
            sector: c.sector || "", type: h.type, reason: c.reason || "", cur: h.cur,
            _holding: h, fair: r.fair, price: r.price, upside: r.upside, zone: r.zone, signal: r.signal,
          });
        } catch (e) { /* 한 종목 실패는 건너뜀 */ }
      }
      setRecProgress(null);

      // 3) 엔진 기준 저평가(상승여력 > 0)만, 높은 순으로
      const under = evaluated.filter((x) => isFinite(x.upside) && x.upside > 0).sort((a, b) => b.upside - a.upside);
      setRecs(under);
      if (!under.length) {
        setErr(evaluated.length
          ? "엔진 기준 지금 저평가 종목이 없어 (후보들이 다 적정가 이상). 섹터/시장 바꿔서 다시 찾아봐."
          : "후보 분석에 다 실패했어. 잠시 후 다시 시도해줘.");
      }
    } catch (e) { setErr("추천 실패: " + (e && e.message ? e.message : String(e))); }
    setRecProgress(null);
    setRecsBusy(false);
  };

  const addRecommended = async (rec) => {
    if (recAddId) return;
    const name = (rec.name || rec.ticker || "").trim();
    const h0 = rec._holding;
    if (!h0) { setErr("분석 데이터가 없어 — 다시 찾아줘."); return; }
    const nm = (h0.name || name).toLowerCase(), tk = (h0.ticker || "").toLowerCase();
    const dup = holdings.find((x) => (nm && (x.name || "").toLowerCase() === nm) || (tk && (x.ticker || "").toLowerCase() === tk));
    if (dup) { setErr("이미 추가된 종목이에요: " + dup.name); return; }
    setRecAddId(name); setErr("");
    const id = Date.now().toString();
    const obj = { ...h0, id };
    obj.baseline = snapshot(obj);
    setHoldings((hs) => [...hs, obj]);
    setFreshId(id);
    setRecs((rs) => rs.filter((x) => x !== rec));
    setRecAddId("");
  };

  const screenSearch = async () => {
    if (screenBusy) return;
    const sec = SECTORS.find((s) => s.v === scSector);
    setScreenBusy(true); setScreen([]); setErr(""); setScreenOpenId(null); setScreenProgress(null);
    try {
      // 1단계: 후보 이름 받기 (빠름, 검색 X)
      const d = await fetchScreen({ country: scCountry, sectorEn: sec && sec.en ? sec.en : "" });
      let list = Array.isArray(d) ? d : (Array.isArray(d && d.list) ? d.list : null);
      if (!list && d && typeof d === "object") { for (const k in d) { if (Array.isArray(d[k]) && d[k].length) { list = d[k]; break; } } }
      list = (Array.isArray(list) ? list : []).filter((x) => x && (x.name || x.ticker)).slice(0, 10);
      if (!list.length) { setErr("후보를 못 받았어. 다시 검색해줘."); setScreenBusy(false); return; }

      // 2단계: 각 후보를 실제 웹검색으로 정밀 채점
      const scored = [];
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const nm = (c.name || c.ticker || "").trim();
        setScreenProgress({ done: i, total: list.length, name: nm });
        try {
          const m = await fetchQuantMetrics(nm, c.market);
          m._minCap = scMinCap;
          if (quantHardFilter(m)) continue; // 하드필터 탈락
          const sc = quantScore(m);
          scored.push({ ...m, name: m.name || nm, ticker: m.ticker || c.ticker || "", sector: m.sector || c.sector || "", ...sc, _id: "sc" + i });
        } catch (e) { /* 한 종목 실패는 건너뜀 */ }
      }
      setScreenProgress(null);
      scored.sort((a, b) => b.total - a.total);
      setScreen(scored);
      if (!scored.length) setErr("하드필터(ROE<8·성장음수·적자·시총미달)에 다 걸렸거나 데이터를 못 가져왔어. 조건 완화하거나 다시 검색해봐.");
    } catch (e) { setErr("스크리닝 실패: " + (e && e.message ? e.message : String(e))); }
    setScreenProgress(null);
    setScreenBusy(false);
  };

  const exportScreenCSV = () => {
    if (!screen.length) return;
    const head = ["순위", "종목명", "티커", "총점", "등급", "ROE", "EPS성장", "매출성장", "PER", "PBR", "부채비율", "영업이익률", "FCF보너스", "EPS보너스"];
    const rows = screen.map((r, i) => [i + 1, r.name, r.ticker, r.total, r.grade, r.roe, r.epsGrowth, r.revGrowth, r.per, r.pbr, r.debt, r.opMargin, r.bFcf, r.bEps]);
    const csv = "\uFEFF" + [head, ...rows].map((r) => r.map((c) => '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"').join(",")).join("\n");
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "algokgi_screen_" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setErr("CSV 내보내기 실패: " + (e && e.message ? e.message : "원인불명")); }
  };

  const analyzePlant = async (id) => {
    if (plantId || plantBulk) return;
    const h = holdings.find((x) => x.id === id);
    if (!h) return;
    setPlantId(id); setErr("");
    try {
      const d = await fetchPlant(h.name, h.cur === "$" ? "US" : "KR");
      setPlant((p) => ({ ...p, [id]: d }));
    } catch (e) { setErr(h.name + " 모내기 분석 실패: " + (e && e.message ? e.message : String(e))); }
    setPlantId(null);
  };
  const analyzePlantAll = async () => {
    if (plantId || plantBulk || !holdings.length) return;
    setPlantBulk(true); setErr("");
    for (const h of holdings) {
      try { const d = await fetchPlant(h.name, h.cur === "$" ? "US" : "KR"); setPlant((p) => ({ ...p, [h.id]: d })); } catch (e) {}
    }
    setPlantBulk(false);
  };

  const loadOverview = async () => {
    if (overviewBusy) return;
    setOverviewBusy(true);
    try {
      const d = await fetchMarketOverview();
      const at = new Date().toISOString();
      setOverview(d); setOverviewAt(at);
      try { if (typeof window !== "undefined" && window.storage) await window.storage.set(OVKEY, JSON.stringify({ data: d, at })); } catch (e2) {}
    } catch (e) { setErr("시장 현황 로드 실패: " + (e && e.message ? e.message : String(e))); }
    setOverviewBusy(false);
  };
  // (자동 로드 제거: 앱 열 때마다 호출이 나가 한도에 빨리 닿는 걸 방지 — '갱신'을 눌러 불러옴)

  const refresh = async (id) => {
    const h = holdings.find((x) => x.id === id);
    if (!h || loadingId) return;
    setLoadingId(id); setErr("");
    try {
      const d = await fetchStock(h.name);
      const nd = normalize(d, h.name);
      // AI가 빈 값("")으로 준 칸은 기존 값을 유지 (덮어쓰기 방지)
      // 검증 잠금(verified) 시: 직접 확인한 가치 입력은 AI가 못 덮어씀 (가격·점수만 갱신)
      const locked = (h.verified === "true" || h.verified === true);
      const PROTECT = ["eps", "per", "bps", "fairPBR", "roe", "coe", "growth", "epsCons", "perCons", "epsOpt", "perOpt"];
      const merged = { ...h };
      Object.keys(nd).forEach((k) => {
        const v = nd[k];
        if (v === "" || v === null || v === undefined) return;
        if (locked && PROTECT.includes(k)) return;
        merged[k] = v;
      });
      // 핵심 숫자가 하나도 안 바뀌었는지 체크
      const changed = ["price", "eps", "per", "epsCons", "perCons", "epsOpt", "perOpt", "bps", "roe", "coe"]
        .some((k) => (merged[k] || "") !== (h[k] || ""));
      setHoldings((hs) => hs.map((x) => (x.id === id ? merged : x)));
      setFreshId(id);
      if (!changed && !locked) setErr(h.name + ": AI가 새 값을 못 찾았어요. 종목명을 더 구체적으로(예: 티커 포함) 하거나 다시 시도해보세요.");
      else if (locked) setErr(h.name + ": 🔒 검증 잠금 상태 — 가격만 갱신했고 EPS·PER 등 직접 입력값은 보호했어요.");
    } catch (e) { setErr(h.name + " 갱신 실패 (" + (e && e.message ? e.message : "원인불명") + "). 잠시 후 다시 시도해봐."); }
    setLoadingId(null);
  };

  const analyzeAIScore = async (id) => {
    const h = holdings.find((x) => x.id === id);
    if (!h || aiScoreId) return;
    setAiScoreId(id); setErr("");
    try {
      const d = await fetchAIScore(h);
      const merged = {
        ...h,
        industryScore: String(clampScore(d.industryScore, 50)),
        trendScore: String(clampScore(d.trendScore, 50)),
        relativeScore: String(clampScore(d.relativeScore, 50)),
        riskScore: String(clampScore(d.riskScore, 50)),
        shareholderScore: String(clampScore(d.shareholderScore, 50)),
        epsRevisionScore: String(clampScore(d.epsRevisionScore, 50)),
        industryNote: d.industryNote || "",
        trendNote: d.trendNote || "",
        relativeNote: d.relativeNote || "",
        riskNote: d.riskNote || "",
        shareholderNote: d.shareholderNote || "",
        epsRevisionNote: d.epsRevisionNote || "",
        peerPER: d.peerPER != null ? String(d.peerPER) : (h.peerPER || ""),
        peerPBR: d.peerPBR != null ? String(d.peerPBR) : (h.peerPBR || ""),
        avg10yPER: d.avg10yPER != null ? String(d.avg10yPER) : (h.avg10yPER || ""),
        avg10yPBR: d.avg10yPBR != null ? String(d.avg10yPBR) : (h.avg10yPBR || ""),
        epsPrev1m: d.epsPrev1m != null ? String(d.epsPrev1m) : (h.epsPrev1m || ""),
        epsPrev3m: d.epsPrev3m != null ? String(d.epsPrev3m) : (h.epsPrev3m || ""),
        epsCurrent: d.epsCurrent != null ? String(d.epsCurrent) : (h.epsCurrent || ""),
        debtRatio: d.debtRatio != null ? String(d.debtRatio) : (h.debtRatio || ""),
        interestCoverage: d.interestCoverage != null ? String(d.interestCoverage) : (h.interestCoverage || ""),
        sector: d.sector || h.sector || "",
        salesGrowth: d.salesGrowth != null ? String(d.salesGrowth) : (h.salesGrowth || ""),
        opProfitGrowth: d.opProfitGrowth != null ? String(d.opProfitGrowth) : (h.opProfitGrowth || ""),
        dividendYield: d.dividendYield != null ? String(d.dividendYield) : (h.dividendYield || ""),
        high52: d.high52 != null ? String(d.high52) : (h.high52 || ""),
        low52: d.low52 != null ? String(d.low52) : (h.low52 || ""),
        lastEarningsDate: d.lastEarningsDate || h.lastEarningsDate || "",
        nextEarningsDate: d.nextEarningsDate || h.nextEarningsDate || "",
        maxWeight: d.maxWeight != null ? String(d.maxWeight) : (h.maxWeight || ""),
        cyclePhase: d.cyclePhase || h.cyclePhase || "",
        dataSources: d.sources || "",
        sourceLinks: d.sourceLinks || h.sourceLinks || "",
        confidenceNote: d.confidenceNote || h.confidenceNote || "",
        aiScoreAsOf: d.asof || new Date().toISOString().slice(0, 10),
        aiScoreSources: d.sources || "",
      };
      setHoldings((hs) => hs.map((x) => (x.id === id ? merged : x)));
    } catch (e) { setErr(h.name + " AI 점수 계산 실패. 종목명/티커를 더 정확히 넣고 다시 해봐."); }
    setAiScoreId(null);
  };

  const analyzeMarket = async () => {
    if (marketBusy) return;
    setMarketBusy(true); setErr("");
    try {
      const d = await fetchMarketFilter();
      setMarket({
        marketScore: clampScore(d.marketScore, 50),
        kospiTrend: d.kospiTrend || "flat",
        nasdaqTrend: d.nasdaqTrend || "flat",
        ratePressure: d.ratePressure || "medium",
        fxRisk: d.fxRisk || "medium",
        volatility: d.volatility || "medium",
        note: d.note || "시장 필터 업데이트",
        asof: d.asof || new Date().toISOString().slice(0, 10),
        sources: d.sources || "",
      });
    } catch (e) { setErr("시장 필터 갱신 실패. 잠시 후 다시 시도해봐."); }
    setMarketBusy(false);
  };

  const togglePrinciple = (key) => setPrinciples((p) => ({ ...p, [key]: !p[key] }));

  const analyzeSentiment = async (id) => {
    const h = holdings.find((x) => x.id === id);
    if (!h || sentId) return;
    setSentId(id); setErr("");
    try {
      const s = await fetchSentiment(h.name);
      setSentiment((m) => ({ ...m, [id]: s }));
    } catch (e) { setErr(h.name + " 심리 분석 실패. 다시 시도해봐."); }
    setSentId(null);
  };

  // 단기 탭: 모든 종목 심리를 순차 갱신 (동시 호출 폭주 방지)
  const analyzeAll = async () => {
    if (bulkBusy) return;
    setBulkBusy(true); setErr("");
    for (const h of holdings) {
      try {
        const s = await fetchSentiment(h.name);
        setSentiment((m) => ({ ...m, [h.id]: s }));
      } catch (e) { /* 한 종목 실패해도 나머지 계속 */ }
    }
    setBulkBusy(false);
  };

  const field = (h, label, f, step) => {
    const isPrice = f === "price";
    const fresh = isPrice && freshId === h.id;
    return (
      <div>
        <div className="vl-label" style={{ marginBottom: 6, color: isPrice ? "#34d399" : undefined }}>{isPrice ? "현재가 · 직접입력" : label}</div>
        <input className="vl-input" type={step === "text" ? "text" : "number"} step={step === "text" ? undefined : step} value={h[f] || ""}
          onChange={(e) => { update(h.id, f, e.target.value); if (isPrice && freshId === h.id) setFreshId(null); }}
          style={isPrice ? { borderColor: fresh ? "#34d399" : "rgba(52,211,153,0.45)", boxShadow: fresh ? "0 0 0 3px rgba(52,211,153,0.13)" : "none" } : undefined} />
      </div>
    );
  };

  const mb = marketBand(market.marketScore);
  const ps = principleScore(principles);

  return (
    <div className="vl-root" style={{ minHeight: "100vh", background: "radial-gradient(1100px 500px at 12% -8%, rgba(52,211,153,0.10), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(120,80,200,0.06), transparent 55%), #08090c", color: "#eceef1", padding: "40px 18px 70px" }}>
      <style>{STYLE}</style>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <div style={{ marginBottom: 22 }}>
          <div className="vl-label" style={{ color: "#34d399", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={13} /> AI 자동입력 · 적정가+업황 점수 계산기
          </div>
          <h1 className="vl-serif" style={{ fontSize: 40, lineHeight: 1.05, margin: 0, fontWeight: 600, letterSpacing: "-0.01em" }}>
            종목 치면 <span style={{ fontStyle: "italic", color: "#34d399" }}>AI 점수</span>까지
          </h1>
          <p className="vl-mono" style={{ fontSize: 12.5, color: "#9aa0aa", marginTop: 12, lineHeight: 1.65 }}>
            성장주 → PER · 사이클주 → 블렌드<br />금융주 → PBR×ROE · 안정주 → PER
          </p>
        </div>

        <div className="vl-card" style={{ background: "#101216", border: "1px solid rgba(52,211,153,0.22)", borderRadius: 16, padding: 16, marginBottom: 14, animationDelay: "0ms" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={16} style={{ position: "absolute", left: 13, top: 14, color: "#6b7280" }} />
              <input className="vl-search" style={{ paddingLeft: 38 }} placeholder="종목명 입력 (예: 국민은행, KB금융, 애플)"
                value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }} disabled={adding} />
            </div>
            <button className="vl-btn" onClick={onAdd} disabled={adding}
              style={{ background: "#34d399", color: "#04130d", border: "none", borderRadius: 11, padding: "0 18px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              {adding ? <RefreshCw size={15} className="vl-spin" /> : <Sparkles size={15} />}
              {adding ? "검색 중" : "AI 채우기"}
            </button>
          </div>
          {err && <div style={{ marginTop: 10, fontSize: 12.5, color: C.trim, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} /> {err}</div>}
        </div>

        <div className="vl-card" style={{ background: "#101216", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 16, padding: "15px 16px", marginBottom: 14, animationDelay: "10ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span className="vl-label" style={{ color: "#34d399" }}>🔎 AI 추천 종목</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.13)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 6, padding: "2px 6px" }}>실험 · 참고용</span>
            <select className="vl-select" value={recMarket} onChange={(e) => setRecMarket(e.target.value)}>
              <option value="kr">한국</option>
              <option value="us">미국</option>
              <option value="any">전체</option>
            </select>
            <select className="vl-select" value={recType} onChange={(e) => setRecType(e.target.value)}>
              <option value="any">유형 전체</option>
              <option value="growth">성장주</option>
              <option value="cyclical">사이클주</option>
              <option value="financial">금융주</option>
              <option value="stable">안정주</option>
            </select>
            <select className="vl-select" value={recSector} onChange={(e) => setRecSector(e.target.value)}>
              {SECTOR_GROUPS.map((g) => g.group === "전체"
                ? g.items.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)
                : <optgroup key={g.group} label={g.group}>{g.items.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</optgroup>
              )}
            </select>
            <button className="vl-btn" onClick={findRecs} disabled={recsBusy}
              style={{ marginLeft: "auto", background: "rgba(52,211,153,0.14)", color: "#34d399", border: "1px solid rgba(52,211,153,0.4)", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              {recsBusy ? <RefreshCw size={14} className="vl-spin" /> : <Sparkles size={14} />}
              {recsBusy ? "찾는 중…" : "저평가 후보 찾기"}
            </button>
          </div>

          {recsOpen && (
            <div style={{ marginTop: 13 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 11, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "9px 12px" }}>
                <AlertTriangle size={13} style={{ color: C.hold, flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 11.5, color: "#c9bd96", margin: 0, lineHeight: 1.55 }}>
                  각 후보를 <b>장기 엔진(forward EPS·PER)으로 실제 계산</b>해서, 엔진 기준 저평가(상승여력 +)인 것만 높은 순으로 보여줘요 — 적정가·상승여력이 장기 탭과 동일. 단 forward EPS는 AI가 가져온 값이라 담은 뒤 확인 권장.
                </p>
              </div>

              {recsBusy && (
                <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12.5, color: "#8b93a0" }}>
                  {recProgress
                    ? "후보 분석 중… (" + (recProgress.done + 1) + "/" + recProgress.total + ") · " + recProgress.name
                    : "후보 추리는 중…"}
                  <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 6 }}>각 종목을 실제 적정가로 계산하느라 30초~1분 걸릴 수 있어요</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {recs.map((rec, i) => {
                  const z = rec.zone === "buy" ? { t: "매수 구간", c: C.buy } : rec.zone === "trim" ? { t: "고평가", c: C.trim } : { t: "보유 구간", c: C.hold };
                  const ty = (TYPES.find((t) => t.v === rec.type) || {}).label || rec.type || "";
                  const up = isFinite(parseFloat(rec.upside)) ? Math.round(parseFloat(rec.upside)) : null;
                  const rname = (rec.name || rec.ticker || "").trim();
                  const radding = recAddId === rname;
                  return (
                    <div key={(rec.ticker || "") + i} style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="vl-mono" style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? C.buy : "#6b7280", flexShrink: 0, width: 18, textAlign: "center" }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                          <span className="vl-serif" style={{ fontSize: 17, fontWeight: 600, color: "#f4f5f7" }}>{rec.name}</span>
                          <span className="vl-mono" style={{ fontSize: 11, color: "#6b7280" }}>{rec.ticker}</span>
                          {rec.market && <span className="vl-mono" style={{ fontSize: 10, color: "#8b93a0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, padding: "1px 5px" }}>{rec.market}</span>}
                          {rec.sector && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9aa0aa", background: "rgba(255,255,255,0.05)", borderRadius: 5, padding: "1px 6px" }}>{rec.sector}</span>}
                          {ty && <span style={{ fontSize: 10.5, color: "#6b7280" }}>{ty}</span>}
                          {up != null && <span className="vl-mono" style={{ fontSize: 11.5, fontWeight: 800, color: C.buy, background: "rgba(52,211,153,0.12)", borderRadius: 6, padding: "1px 7px", marginLeft: "auto" }}>저평가 +{up}%</span>}
                        </div>
                        <div className="vl-mono" style={{ fontSize: 12, color: "#cbd0d8", marginTop: 5 }}>적정가 {fmt(rec.fair, rec.cur)} · 현재가 {fmt(rec.price, rec.cur)}</div>
                        {rec.reason && <div style={{ fontSize: 12, color: "#8b93a0", marginTop: 3, lineHeight: 1.45 }}>{rec.reason}</div>}
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: z.c, marginTop: 4 }}>● {z.t}{rec.signal ? " · " + rec.signal : ""}</div>
                      </div>
                      <button className="vl-btn" onClick={() => addRecommended(rec)} disabled={!!recAddId}
                        style={{ background: radding ? "rgba(52,211,153,0.14)" : "#34d399", color: radding ? "#34d399" : "#04130d", border: radding ? "1px solid rgba(52,211,153,0.4)" : "none", borderRadius: 9, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {radding ? <RefreshCw size={13} className="vl-spin" /> : null}
                        {radding ? "담는 중" : "＋ 담기"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="vl-card" style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "15px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="vl-label" style={{ color: mb.color, marginBottom: 5 }}>🌐 시장 전체 필터</div>
              <div className="vl-mono" style={{ fontSize: 18, fontWeight: 800, color: mb.color }}>{market.marketScore}점 · {mb.label}</div>
              <div style={{ fontSize: 12, color: "#8b93a0", marginTop: 5, lineHeight: 1.55 }}>{market.note || "시장 필터 미갱신"} · {mb.action}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,auto)", gap: 7, fontSize: 11.5, color: "#9aa0aa" }}>
              <span>코스피 {market.kospiTrend}</span><span>나스닥 {market.nasdaqTrend}</span><span>금리 {market.ratePressure}</span>
              <span>환율 {market.fxRisk}</span><span>변동성 {market.volatility}</span><span>{market.asof || "기준일 없음"}</span>
            </div>
            <button className="vl-btn" onClick={analyzeMarket} disabled={marketBusy}
              style={{ background: mb.color, color: "#06100b", border: "none", borderRadius: 10, padding: "9px 13px", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
              {marketBusy ? <RefreshCw size={13} className="vl-spin" /> : <Activity size={13} />}
              {marketBusy ? "시장 확인 중" : "시장 필터 갱신"}
            </button>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="vl-label" style={{ marginBottom: 8 }}>✅ 투자 원칙 체크 · {ps}점</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 7 }}>
              {[["noAllIn","몰빵 금지"],["splitBuy","분할매수"],["stopRule","손절/재검토"],["sixMonth","6개월 보유 가능"],["earningsChecked","실적일 확인"]].map(([k, label]) => (
                <button key={k} className="vl-btn" onClick={() => togglePrinciple(k)}
                  style={{ background: principles[k] ? "rgba(52,211,153,0.13)" : "#0c0e11", border: "1px solid " + (principles[k] ? "rgba(52,211,153,0.38)" : "rgba(255,255,255,0.08)"), color: principles[k] ? "#7fe0c0" : "#7b818c", borderRadius: 9, padding: "8px 7px", fontSize: 11.5, fontWeight: 700 }}>
                  {principles[k] ? "✓ " : "□ "}{label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="vl-card" style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
          {(() => {
            const pr = getPortfolioRisk(holdings);
            const ranks = getSectorRankings(holdings, sentiment, margin, scenario);
            return (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div className="vl-label" style={{ color: pr.color, marginBottom: 4 }}>🧺 포트폴리오 위험도</div>
                    <div className="vl-mono" style={{ fontSize: 15, fontWeight: 800, color: pr.color }}>{pr.score}점 · {pr.warnings.join(" / ")}</div>
                    <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 4 }}>비중 합계 {pr.total}% · 최대 섹터 {pr.topSector} {pr.topSectorWeight}% · 최대 종목 {pr.maxStock} {pr.maxStockWeight}%</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {ranks.slice(0, 5).map((g) => (
                    <span key={g.sector} style={{ fontSize: 11.5, color: "#cbd0d8", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "4px 8px" }}>
                      {g.sector} 1위 {g.arr[0].name} {g.arr[0].score}점
                    </span>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* 장기 / 단기 탭 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            ["market", "🌐 시장현황", "지수·환율·유가·금리·코인·뉴스 한눈에", "#60a5fa"],
            ["long", "📈 감정평가", "forward EPS·PER 기준 적정가 평가", "#34d399"],
            ["screen", "🌾 알곡기", "퀀트 100점 스크리너 · 우량주 선별", "#fbbf24"],
            ["plant", "🌱 모내기", "매수 타이밍 · 30점 · 분할 진입", "#5eead4"],
            ["final", "🎯 최종점수", "종목+타이밍 종합 100점", "#a78bfa"],
            ["harvest", "🧺 추수", "분할 매도 · 100점 · 수익 극대화", "#fb923c"],
          ].map(([k, label, sub, col]) => {
            const on = tab === k;
            return (
              <button key={k} className="vl-btn" onClick={() => setTab(k)}
                style={{ flex: 1, textAlign: "left", background: on ? col + "16" : "#101216", border: "1px solid " + (on ? col + "66" : "rgba(255,255,255,0.08)"), borderRadius: 13, padding: "12px 15px", cursor: "pointer" }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: on ? col : "#cbd0d8" }}>{label}</div>
                <div style={{ fontSize: 10.5, color: on ? col + "cc" : "#6b7280", marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
              </button>
            );
          })}
        </div>

        {tab === "market" && (
        <>
        <div className="vl-card" style={{ background: "#101216", border: "1px solid rgba(96,165,250,0.22)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", animationDelay: "20ms" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="vl-label" style={{ color: "#60a5fa", marginBottom: 4 }}>🌐 전체 시장 현황</div>
            <div style={{ fontSize: 12, color: "#9aa0aa", lineHeight: 1.5 }}>
              {overviewAt ? <span style={{ color: "#60a5fa", fontWeight: 700 }}>마지막 갱신 {fmtTime(overviewAt)}</span> : null}
              {overviewAt && overview && overview.asof ? " · " : ""}
              {overview && overview.asof ? "데이터 기준 " + overview.asof : ""}
              {(overviewAt || (overview && overview.asof)) ? <br /> : null}
              미국·한국 지수·환율·유가·채권금리·금·은·비트코인 + 시장 영향 뉴스. 갱신 전까지 마지막 데이터를 유지해요.
            </div>
          </div>
          <button className="vl-btn" onClick={loadOverview} disabled={overviewBusy}
            style={{ background: "rgba(96,165,250,0.14)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.4)", borderRadius: 10, padding: "9px 15px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            {overviewBusy ? <RefreshCw size={14} className="vl-spin" /> : <RefreshCw size={14} />}
            {overviewBusy ? "불러오는 중…" : "갱신"}
          </button>
        </div>

        {err && <div style={{ marginBottom: 12, fontSize: 12.5, color: C.trim, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} /> {err}</div>}

        {overviewBusy && !overview && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#8b93a0" }}>
            <RefreshCw size={22} className="vl-spin" style={{ color: "#60a5fa" }} />
            <div style={{ fontSize: 13, marginTop: 12 }}>지수·환율·금리·원자재·코인·뉴스를 불러오는 중…</div>
          </div>
        )}

        {!overviewBusy && !overview && (
          <div style={{ textAlign: "center", padding: "44px 0", color: "#8b93a0" }}>
            <div style={{ fontSize: 13.5 }}>우상단 <b style={{ color: "#60a5fa" }}>갱신</b> 버튼을 눌러 시장 현황을 불러오세요.</div>
            <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 8 }}>(AI 호출이 1회 나가요)</div>
          </div>
        )}

        {overview && (
          <>
            {overview.fearGreed && (overview.fearGreed.us || overview.fearGreed.kr) && (
              <div className="vl-card" style={{ background: "#0f1115", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 8 }}>
                  <div className="vl-label">😨 공포 · 탐욕 지수 (Fear &amp; Greed)</div>
                  <button className="vl-btn" onClick={() => setFgInfoOpen((o) => !o)}
                    style={{ marginLeft: "auto", background: "rgba(255,255,255,0.05)", color: "#9aa0aa", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {fgInfoOpen ? "구간 설명 닫기 ▲" : "구간별 액션 보기 ▾"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                  <FearGreedBar name="🇺🇸 미국 (CNN)" value={overview.fearGreed.us && overview.fearGreed.us.value} />
                  <FearGreedBar name="🇰🇷 한국 (AI 추정)" value={overview.fearGreed.kr && overview.fearGreed.kr.value} />
                </div>
                {fgInfoOpen && (
                  <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 9 }}>
                    {FG_ZONES.map((z) => (
                      <div key={z.range} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span className="vl-mono" style={{ width: 56, fontSize: 11.5, fontWeight: 800, color: z.color, flexShrink: 0, paddingTop: 1 }}>{z.range}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5 }}><b style={{ color: z.color }}>{z.label}</b> <span style={{ color: "#8b93a0" }}>· {z.desc}</span></div>
                          <div style={{ marginTop: 3, display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: z.aColor, background: z.aColor + "20", borderRadius: 5, padding: "1px 7px", whiteSpace: "nowrap" }}>{z.action}</span>
                            <span style={{ fontSize: 11.5, color: "#9aa0aa", lineHeight: 1.45 }}>{z.note}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 1.55, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 11px" }}>
                      ※ 공포·탐욕은 <b style={{ color: "#9aa0aa" }}>역발상 지표</b>예요 — "남들이 공포일 때 사고, 탐욕일 때 판다"는 관점의 참고용. 투자 권유가 아니며 최종 판단·책임은 본인에게 있어요.
                    </div>
                  </div>
                )}
              </div>
            )}
            <MarketGrid title="🇺🇸 미국 증시" items={overview.us} showSpark />
            <MarketGrid title="🇰🇷 한국 증시" items={overview.kr} showSpark />
            <MarketGrid title="💱 환율" items={overview.fx} />
            <MarketGrid title="🛢️ 원자재 · 금·은" items={overview.commodities} />
            <MarketGrid title="🏦 채권 금리" items={overview.rates} unit="%" />
            <MarketGrid title="₿ 코인" items={overview.crypto} />

            {Array.isArray(overview.news) && overview.news.length > 0 && (
              <div className="vl-card" style={{ background: "#0f1115", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
                <div className="vl-label" style={{ marginBottom: 10 }}>📰 시장 영향 뉴스</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {overview.news.map((n, i) => {
                    const im = n.impact === "호재" ? { c: C.buy, bg: "rgba(52,211,153,0.12)" } : n.impact === "악재" ? { c: C.trim, bg: "rgba(248,113,113,0.12)" } : { c: "#9aa0aa", bg: "rgba(255,255,255,0.06)" };
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#0c0e11", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: im.c, background: im.bg, borderRadius: 6, padding: "2px 7px", flexShrink: 0, whiteSpace: "nowrap" }}>{n.impact || "중립"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {n.url
                            ? <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#e5e7eb", lineHeight: 1.45, textDecoration: "none", display: "block" }}>{n.title} <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700 }}>기사 ↗</span></a>
                            : <div style={{ fontSize: 13, color: "#e5e7eb", lineHeight: 1.45 }}>{n.title}</div>}
                          {n.asof && <div className="vl-mono" style={{ fontSize: 10.5, color: "#6b7280", marginTop: 3 }}>{n.asof}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p style={{ fontSize: 11.5, color: "#565b64", marginTop: 6, marginBottom: 4, lineHeight: 1.6, textAlign: "center" }}>
              AI가 웹검색으로 가져온 최신 추정치예요 · 실제 체결가/공식 지표와 다를 수 있어요
            </p>
          </>
        )}

        <div className="vl-card" style={{ background: "#0f1115", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="vl-label">📋 시장 기록 (스냅샷)</div>
            <button className="vl-btn" onClick={saveMktSnapshot} disabled={!overview}
              style={{ marginLeft: "auto", background: overview ? "rgba(96,165,250,0.14)" : "#16181d", color: overview ? "#60a5fa" : "#565b64", border: "1px solid " + (overview ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.08)"), borderRadius: 9, padding: "7px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
              ＋ 현재 시장 기록
            </button>
            <button className="vl-btn" onClick={() => setMktLogOpen((o) => !o)}
              style={{ background: "rgba(255,255,255,0.05)", color: "#9aa0aa", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, padding: "7px 11px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
              {mktLogOpen ? "접기 ▲" : "펴기 ▾"} ({mktLog.length})
            </button>
          </div>
          {mktLogOpen && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {mktLog.length === 0 ? (
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "12px 0", lineHeight: 1.6 }}>아직 기록이 없어요.<br />갱신 후 "＋ 현재 시장 기록"을 누르면 그 시점 스냅샷이 저장돼요.</div>
              ) : mktLog.map((r) => {
                const vv = (x) => (x && x.v != null && isFinite(parseFloat(x.v)) ? parseFloat(x.v).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—");
                return (
                  <div key={r.at} style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd0d8" }}>{fmtTime(r.at)}</span>
                      {r.asof && <span style={{ fontSize: 10.5, color: "#6b7280" }}>기준 {r.asof}</span>}
                      <button className="vl-btn" onClick={() => delMktRec(r.at)} style={{ marginLeft: "auto", background: "transparent", color: "#6b7280", border: "none", fontSize: 11, padding: "2px 4px" }}>삭제</button>
                    </div>
                    <div className="vl-mono" style={{ fontSize: 11.5, color: "#9aa0aa", marginTop: 5, lineHeight: 1.65 }}>
                      코스피 {vv(r.kospi)} · 코스닥 {vv(r.kosdaq)} · S&amp;P {vv(r.sp)} · 나스닥 {vv(r.nasdaq)}<br />
                      BTC {vv(r.btc)} · 공포탐욕 美 {r.fgUS == null ? "—" : Math.round(r.fgUS)} / 韓 {r.fgKR == null ? "—" : Math.round(r.fgKR)}
                    </div>
                    {Array.isArray(r.news) && r.news.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ fontSize: 10, color: "#565b64", fontWeight: 700 }}>📰 당시 뉴스</div>
                        {r.news.map((n, ni) => {
                          const ic = n.impact === "호재" ? C.buy : n.impact === "악재" ? C.trim : "#9aa0aa";
                          return (
                            <div key={ni} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11.5, lineHeight: 1.45 }}>
                              <span style={{ color: ic, fontWeight: 700, flexShrink: 0 }}>{n.impact || "중립"}</span>
                              {n.url
                                ? <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: "#9aa0aa", textDecoration: "none" }}>{n.title} <span style={{ color: "#60a5fa", fontSize: 10 }}>↗</span></a>
                                : <span style={{ color: "#9aa0aa" }}>{n.title}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}

        {tab === "long" && (
        <>
        <div className="vl-card" style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 20px", marginBottom: 22, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", animationDelay: "40ms" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
              <span className="vl-label">안전마진</span>
              <span className="vl-mono" style={{ fontSize: 14, color: "#34d399", fontWeight: 700 }}>{margin}%</span>
            </div>
            <input className="vl-slider" type="range" min="0" max="50" step="1" value={margin} onChange={(e) => setMargin(parseInt(e.target.value))} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
              <span className="vl-label">시나리오 폭 ± <span style={{ textTransform: "none", letterSpacing: 0, color: "#565b64", fontWeight: 400 }}>(간단모드 종목)</span></span>
              <span className="vl-mono" style={{ fontSize: 14, color: "#fbbf24", fontWeight: 700 }}>{scenario}%</span>
            </div>
            <input className="vl-slider" type="range" min="0" max="40" step="1" value={scenario} onChange={(e) => setScenario(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#fbbf24" }} />
          </div>
          <button className="vl-ghost vl-btn" onClick={reset} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, padding: "9px 13px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <RotateCcw size={14} /> 초기화
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {holdings.map((h, i) => {
            const r = compute(h, margin, scenario);
            const z = ZONE[r.zone];
            const up = r.upside >= 0;
            const busy = loadingId === h.id;
            const roeN = parseFloat(h.roe) || 0, coeN = parseFloat(h.coe) || 0;
            const sBusy = sentId === h.id;
            const sData = sentiment[h.id];
            const fs = getFinalScore(h, r, sData);
            const plan = getBuyPlan(h, r, margin);
            const aiBusy = aiScoreId === h.id;
            const earnWarn = getEarningsWarning(h);
            const gate = getMarketGate(market.marketScore, fs.finalScore);
            const conf = dataConfidence(h, r);
            const preset = inferFormulaPreset(h);
            const ch = cycleHeat(h);
            const sell = getSellSignal(h, r);
            return (
              <div key={h.id} className="vl-card" style={{ background: "#0f1115", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "22px 22px 24px", position: "relative", animationDelay: i * 55 + "ms", opacity: busy ? 0.6 : 1 }}>
                <div style={{ position: "absolute", top: 16, right: 14, display: "flex", gap: 4 }}>
                  <button className="vl-ghost vl-btn" onClick={() => analyzeAIScore(h.id)} disabled={aiBusy} title="AI로 업황·실적·비교 점수" style={{ background: "transparent", border: "none", padding: 4 }}>
                    <Sparkles size={15} className={aiBusy ? "vl-spin" : ""} />
                  </button>
                  <button className="vl-ghost vl-btn" onClick={() => refresh(h.id)} disabled={busy} title="AI로 다시 채우기" style={{ background: "transparent", border: "none", padding: 4 }}>
                    <RefreshCw size={15} className={busy ? "vl-spin" : ""} />
                  </button>
                  <button className="vl-ghost vl-btn" onClick={() => remove(h.id)} style={{ background: "transparent", border: "none", padding: 4 }}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 11, paddingRight: 60 }}>
                  <input className="vl-name" value={h.name} onChange={(e) => update(h.id, "name", e.target.value)} style={{ width: "auto", maxWidth: 180 }} />
                  <input className="vl-mono" value={h.ticker} onChange={(e) => update(h.id, "ticker", e.target.value)} style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 12, outline: "none", width: 60 }} />
                  <button className="vl-btn vl-mono" onClick={() => toggleCur(h.id)} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd0d8", borderRadius: 7, padding: "3px 10px", fontSize: 13, fontWeight: 700 }}>{h.cur}</button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 16px", flexWrap: "wrap" }}>
                  <select className="vl-select" value={h.type} onChange={(e) => update(h.id, "type", e.target.value)}>
                    {TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                  <button className="vl-btn" onClick={() => applyFormulaPreset(h.id)} title="종목명 기준 공식 고정" style={{ background: (h.lockFormula === "true" || h.lockFormula === true) ? "rgba(52,211,153,0.16)" : "rgba(255,255,255,0.06)", border: "1px solid " + ((h.lockFormula === "true" || h.lockFormula === true) ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.12)"), color: (h.lockFormula === "true" || h.lockFormula === true) ? C.buy : "#9aa0aa", borderRadius: 8, padding: "5px 9px", fontSize: 11.5, fontWeight: 700 }}>
                    🔒 {h.lockFormula === "true" || h.lockFormula === true ? `공식고정: ${h.fixedType || h.type}` : preset.label}
                  </button>
                  {(h.lockFormula === "true" || h.lockFormula === true) && <button className="vl-ghost vl-btn" onClick={() => unlockFormulaPreset(h.id)} style={{ background: "transparent", border: "none", fontSize: 11 }}>해제</button>}
                  <span style={{ fontSize: 11.5, color: conf.color, fontWeight: 700 }}>데이터 신뢰도 {conf.score} · {conf.label}</span>
                  {h.note && <span style={{ fontSize: 12, color: "#6b7280" }}>{h.note}</span>}
                </div>

                {h.type !== "financial" && (() => {
                  const on = h.cycleW !== "" && h.cycleW !== null && h.cycleW !== undefined && isFinite(parseFloat(h.cycleW));
                  const wNow = on ? Math.round(parseFloat(h.cycleW)) : ch.suggestW;
                  const hasBook = (parseFloat(h.bps) || 0) > 0 && (parseFloat(h.fairPBR) || 0) > 0;
                  const heatColor = ch.heat >= 70 ? C.trim : ch.heat >= 45 ? C.hold : C.buy;
                  const danger = ch.heat >= 70 && wNow >= 70 && hasBook;
                  return (
                    <div style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Gauge size={14} style={{ color: heatColor }} />
                        <span className="vl-label" style={{ color: "#9aa0aa" }}>사이클 보정</span>
                        <span style={{ fontSize: 11.5, color: "#6b7280" }}>성장↔자산가치 혼합</span>
                        <span style={{ marginLeft: "auto", fontSize: 11.5, color: heatColor, fontWeight: 700 }}>과열도 {ch.heat}{ch.hasData ? "" : " · 데이터부족"}</span>
                      </div>
                      {!on ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#8b93a0", flex: 1, minWidth: 160 }}>지금은 <b style={{ color: "#cbd0d8" }}>{h.type === "cyclical" ? "사이클 공식" : "성장 공식"}</b> 고정. 사이클 위험만큼 자산가치와 섞을까요?</span>
                          <button className="vl-btn" onClick={() => update(h.id, "cycleW", String(ch.suggestW))} disabled={!hasBook}
                            style={{ background: hasBook ? "rgba(52,211,153,0.14)" : "rgba(255,255,255,0.05)", border: "1px solid " + (hasBook ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"), color: hasBook ? C.buy : "#6b7280", borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                            자동 추천 · 성장 {ch.suggestW}%
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11 }}>
                            <span style={{ fontSize: 10.5, color: C.trim, fontWeight: 700, whiteSpace: "nowrap" }}>사이클 0</span>
                            <input className="vl-slider" type="range" min="0" max="100" step="5" value={wNow} onChange={(e) => update(h.id, "cycleW", e.target.value)} style={{ flex: 1 }} />
                            <span style={{ fontSize: 10.5, color: C.buy, fontWeight: 700, whiteSpace: "nowrap" }}>100 성장</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12.5, color: "#cbd0d8", fontWeight: 700 }}>성장 {wNow}% · 사이클 {100 - wNow}%</span>
                            <button className="vl-btn" onClick={() => update(h.id, "cycleW", String(ch.suggestW))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#9aa0aa", borderRadius: 7, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>자동 {ch.suggestW}%</button>
                            <button className="vl-ghost vl-btn" onClick={() => update(h.id, "cycleW", "")} style={{ background: "transparent", border: "none", fontSize: 11 }}>끄기</button>
                          </div>
                        </>
                      )}
                      {!hasBook && (
                        <div style={{ fontSize: 11, color: "#a98e3a", marginTop: 8, lineHeight: 1.5 }}>⚠ 작동하려면 아래 <b>BPS</b>와 <b>적정 PBR</b>이 필요해요. 자산가치 쪽 계산에 쓰입니다.</div>
                      )}
                      {ch.reasons.length > 0 && (
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 7, lineHeight: 1.5 }}>근거: {ch.reasons.join(" · ")}</div>
                      )}
                      {danger && (
                        <div style={{ fontSize: 11.5, color: C.trim, marginTop: 7, lineHeight: 1.5, fontWeight: 700 }}>⚠ 사이클 고점 신호인데 성장 비중이 높아요 — 이익이 꺾이면 EPS↓ × 멀티플↓ 이중 타격 위험</div>
                      )}
                    </div>
                  );
                })()}

                {freshId === h.id && (
                  <div style={{ marginBottom: 14, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 9, padding: "9px 12px", fontSize: 12.5, color: "#7fe0c0", lineHeight: 1.5 }}>
                    📱 <b>현재가를 네 증권사 앱에서 확인해 입력하세요.</b> AI가 채운 가격은 실시간이 아니라 시차가 있어요.
                  </div>
                )}

                <div style={{ marginBottom: 14, background: gate.color + "10", border: "1px solid " + gate.color + "44", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: gate.color }}>시장필터: {gate.label}</span>
                  <span style={{ fontSize: 12, color: "#9aa0aa" }}>{gate.note}</span>
                  {earnWarn && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: earnWarn.color }}>⚠ {earnWarn.text}</span>}
                  {!earnWarn && <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>실적 경고 없음</span>}
                </div>

                <div style={{ marginBottom: 14, background: "#0c0e11", border: "1px solid rgba(52,211,153,0.14)", borderRadius: 12, padding: "13px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <span className="vl-label" style={{ color: "#34d399" }}>AI 종합점수</span>
                    <span className="vl-mono" style={{ fontSize: 14, fontWeight: 800, color: fs.decision.color }}>{fs.finalScore}점 · {fs.decision.label}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(62px, 1fr))", gap: 7 }}>
                    {[["가치", fs.valueScore], ["실적", fs.trendScore], ["업황", fs.industryScore], ["비교", fs.relativeScore], ["리스크", fs.riskScore], ["EPS수정", fs.epsRevisionScore], ["환원", fs.shareholderScore], ["심리", fs.sentimentScore], ["신뢰", fs.confidenceScore]].map(([k, v]) => (
                      <div key={k} style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "7px 6px", textAlign: "center" }}>
                        <div style={{ fontSize: 10.5, color: "#6b7280" }}>{k}</div>
                        <div className="vl-mono" style={{ fontSize: 13, color: "#cbd0d8", fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 9, fontSize: 11.5, color: "#8b93a0", lineHeight: 1.55 }}>
                    · 업황: {h.industryNote || "AI 점수 미갱신"}<br />
                    · 실적: {h.trendNote || "AI 점수 미갱신"}<br />
                    · 비교: {h.relativeNote || "AI 점수 미갱신"}<br />
                    · 리스크: {h.riskNote || "AI 점수 미갱신"}<br />
                    · EPS수정: {h.epsRevisionNote || "AI 점수 미갱신"}<br />
                    · 주주환원: {h.shareholderNote || "AI 점수 미갱신"}
                    {h.aiScoreAsOf ? <><br />기준 {h.aiScoreAsOf}{h.aiScoreSources ? " · 출처 " + h.aiScoreSources : ""}</> : null}
                  </div>
                  <button className="vl-btn" onClick={() => analyzeAIScore(h.id)} disabled={aiBusy}
                    style={{ marginTop: 10, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.35)", color: "#34d399", borderRadius: 8, padding: "7px 11px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    {aiBusy ? <RefreshCw size={12} className="vl-spin" /> : <Sparkles size={12} />}
                    {aiBusy ? "AI 계산 중" : "업황·실적·리스크 AI 계산"}
                  </button>
                </div>

                {/* 목표기간별 판정 + 하방 시나리오 */}
                {(() => {
                  const v = horizonVerdict(h, r, fs, sData, market);
                  const dn = getDownside(h, r);
                  return (
                    <div style={{ marginBottom: 14, background: "#0c0e11", border: "1px solid rgba(127,200,255,0.16)", borderRadius: 12, padding: "13px 14px" }}>
                      <div className="vl-label" style={{ color: "#7fc8ff", marginBottom: 9 }}>🎯 목표기간별 판정 {h.cyclePhase ? <span style={{ marginLeft: 6, color: "#9aa0aa", textTransform: "none", letterSpacing: 0 }}>· 사이클: <b style={{ color: "#cbd0d8" }}>{h.cyclePhase}</b></span> : null}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[["3개월", "심리·시장", v.m3], ["6개월", "실적·업황", v.m6], ["12개월", "가치", v.m12]].map(([hd, basis, m]) => (
                          <div key={hd} style={{ flex: 1, background: m.color + "14", border: "1px solid " + m.color + "3a", borderRadius: 10, padding: "9px 8px" }}>
                            <div style={{ fontSize: 10.5, color: "#9aa0aa", fontWeight: 600 }}>{hd}</div>
                            <div style={{ fontSize: 8.5, color: "#6b7280", marginBottom: 4 }}>{basis}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.label}</div>
                            <div style={{ fontSize: 9, color: "#7a818c", marginTop: 2, lineHeight: 1.3 }}>{m.note}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11.5, color: "#9aa0aa", lineHeight: 1.6 }}>
                        <span className="vl-label" style={{ fontSize: 9.5, color: "#7a818c" }}>📉 하방 참고 (예측 아님)</span><br />
                        {dn.fromHigh !== null ? <>52주 고점 대비 <b style={{ color: dn.fromHigh <= -20 ? C.buy : "#cbd0d8" }}>{dn.fromHigh}%</b> · </> : null}
                        {dn.range52 !== null ? <>과거1년 변동폭 <b style={{ color: "#cbd0d8" }}>{dn.range52}%</b> · </> : null}
                        {dn.estDown !== null ? <>보수 시나리오 하방 <b style={{ color: C.trim }}>{dn.estDown}%</b></> : <span style={{ color: "#6b7280" }}>52주 고저 입력 시 더 정확</span>}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ marginBottom: 14, background: "#0c0e11", border: "1px solid rgba(248,113,113,0.16)", borderRadius: 12, padding: "13px 14px" }}>
                  {(() => {
                    const aiConf = aiConfidenceEngine(h, r, fs, conf);
                    const rev = getConsensusRevision(h);
                    const trap = getValueTrap(h, r, fs);
                    const hist = getMultipleHistory(h);
                    return (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 9 }}>
                          <span className="vl-label" style={{ color: aiConf.color }}>🧪 자동 오류·가치함정 체크</span>
                          <span className="vl-mono" style={{ color: aiConf.color, fontSize: 13, fontWeight: 800 }}>AI 신뢰도 {aiConf.score}점 · {aiConf.label} {aiConf.stars}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "8px 9px" }}>
                            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>컨센서스 변화</div>
                            <div style={{ fontSize: 12.5, color: rev.color, fontWeight: 800 }}>{rev.label}</div>
                            <div className="vl-mono" style={{ fontSize: 11, color: "#8b93a0", marginTop: 3 }}>1M {rev.one === null ? "—" : rev.one.toFixed(1)+"%"} · 3M {rev.three === null ? "—" : rev.three.toFixed(1)+"%"}</div>
                          </div>
                          <div style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "8px 9px" }}>
                            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>가치함정</div>
                            <div style={{ fontSize: 12.5, color: trap.color, fontWeight: 800 }}>{trap.level}</div>
                            <div style={{ fontSize: 11, color: "#8b93a0", marginTop: 3 }}>{trap.flags.length ? trap.flags.join(" · ") : "뚜렷한 함정 신호 없음"}</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div style={{ fontSize: 11.5, color: hist.perColor, background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "7px 9px" }}>{hist.perText}</div>
                          <div style={{ fontSize: 11.5, color: hist.pbrColor, background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "7px 9px" }}>{hist.pbrText}</div>
                        </div>
                        {(aiConf.warnings.length > 0 || aiConf.infos.length > 0) && (
                          <div style={{ marginTop: 8, fontSize: 11.5, color: aiConf.warnings.length ? C.trim : "#8b93a0", lineHeight: 1.55 }}>
                            {aiConf.warnings.length ? "⚠ " + aiConf.warnings.join(" / ") : "ℹ " + aiConf.infos.join(" / ")}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* 3~6개월 핵심 체크리스트 (EPS↑ · ROE · 부채 · 싸게) */}
                {(() => {
                  const epsN = parseFloat(h.eps) || 0;
                  const epsPrev = parseFloat(h.epsPrev3m) || parseFloat(h.epsPrev1m) || 0;
                  const epsRev = parseFloat(h.epsRevisionScore);
                  const roeN = parseFloat(h.roe) || 0;
                  const debt = parseFloat(h.debtRatio);
                  const epsUp = epsPrev > 0 ? epsN > epsPrev : (isFinite(epsRev) ? epsRev > 55 : null);
                  const roeOk = roeN > 0 ? roeN >= 10 : null;
                  const debtOk = isFinite(debt) && debt > 0 ? debt <= 120 : null;
                  const cheap = parseFloat(h.price) > 0 && r.fair > 0 ? r.upside >= 0 : null;
                  const items = [
                    ["EPS 증가?", epsUp],
                    ["ROE 좋은가 (≥10%)?", roeOk],
                    ["부채 적은가 (부채비율 ≤120%)?", debtOk],
                    ["싸게 거래 (현재가 ≤ 적정가)?", cheap],
                  ];
                  const pass = items.filter((x) => x[1] === true).length;
                  const known = items.filter((x) => x[1] !== null).length;
                  // 예측 성공률: 내 기록(log) 중 이 종목 신호가 6~12개월 뒤 맞았는지
                  const myLog = log.filter((e) => e.name === h.name);
                  const done = myLog.map(evaluateLog).filter((x) => x.ok !== null);
                  const wins = done.filter((x) => x.ok).length;
                  const acc = done.length ? Math.round((wins / done.length) * 100) : null;
                  return (
                    <div style={{ marginBottom: 14, background: "#0c0e11", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 12, padding: "13px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                        <span className="vl-label" style={{ color: C.buy }}>3~6개월 핵심 체크 · 가산점</span>
                        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 800, color: pass >= 3 ? C.buy : pass >= 2 ? C.hold : C.trim }}>{pass}/{known || 4} 충족</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {items.map(([label, ok], idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: ok === null ? "#6b7280" : ok ? "#cbd0d8" : "#9aa0aa" }}>
                            <span style={{ width: 16, textAlign: "center", color: ok === null ? "#6b7280" : ok ? C.buy : C.trim, fontWeight: 800 }}>{ok === null ? "–" : ok ? "✓" : "✗"}</span>
                            {label}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className="vl-label" style={{ color: "#9aa0aa" }}>예측 성공률</span>
                        <span style={{ fontSize: 11.5, color: "#6b7280" }}>내 기록 기준 · 누적</span>
                        {acc === null ? (
                          <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>아직 검증된 기록 없음 — 신호를 📌기록하고 6~12개월 뒤 확인</span>
                        ) : (
                          <span style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: 800, color: acc >= 60 ? C.buy : acc >= 45 ? C.hold : C.trim }}>{acc}% <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 11.5 }}>({done.length}회 중 {wins}회)</span></span>
                        )}
                      </div>
                      <div style={{ fontSize: 10.5, color: "#565b64", marginTop: 8 }}>데이터 없는 항목은 “–”. AI 자동입력하면 채워져요.</div>
                    </div>
                  );
                })()}

                <div style={{ marginBottom: 14, background: "#0c0e11", border: "1px solid rgba(251,191,36,0.16)", borderRadius: 12, padding: "13px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span className="vl-label" style={{ color: "#fbbf24" }}>데이터·리스크·매수전략</span>
                    <button className="vl-btn" onClick={() => update(h.id, "showDetail", h.showDetail === "true" ? "" : "true")} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#9aa0aa", borderRadius: 7, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>
                      {h.showDetail === "true" ? "▾ 접기" : "▸ 참고 항목 펼치기 (선택)"}
                    </button>
                  </div>
                  {(h.showDetail === "true") && (<>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11 }}>
                    {field(h, "리스크 안전점수", "riskScore", "1")}
                    {field(h, "EPS 수정점수", "epsRevisionScore", "1")}
                    {field(h, "배당/환원점수", "shareholderScore", "1")}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11, marginTop: 11 }}>
                    {field(h, "52주 고점", "high52", "any")}
                    {field(h, "52주 저점", "low52", "any")}
                    {field(h, "배당수익률 %", "dividendYield", "0.1")}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11, marginTop: 11 }}>
                    {field(h, "1개월 전 EPS", "epsPrev1m", "any")}
                    {field(h, "3개월 전 EPS", "epsPrev3m", "any")}
                    {field(h, "포트 비중 %", "portfolioWeight", "0.1")}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11, marginTop: 11 }}>
                    {field(h, "10년 평균 PER", "avg10yPER", "0.1")}
                    {field(h, "10년 평균 PBR", "avg10yPBR", "0.1")}
                    {field(h, "부채비율 %", "debtRatio", "0.1")}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11, marginTop: 11 }}>
                    {field(h, "이자보상배율", "interestCoverage", "0.1")}
                    {field(h, "섹터", "sector", "text")}
                    {field(h, "동종 평균 PER", "peerPER", "0.1")}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11, marginTop: 11 }}>
                    {field(h, "EPS 출처", "epsSource", "text")}
                    {field(h, "PER/PBR 출처", "perSource", "text")}
                    {field(h, "가격 출처", "priceSource", "text")}
                  </div>
                  <div style={{ marginTop: 11 }}>
                    {field(h, "출처 링크/메모", "sourceLinks", "text")}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11, marginTop: 11 }}>
                    {field(h, "실적발표일", "nextEarningsDate", "text")}
                    {field(h, "최대비중 %", "maxWeight", "0.1")}
                    <div>
                      <div className="vl-label" style={{ marginBottom: 6 }}>목표기간</div>
                      <select className="vl-select" value={h.targetPeriod || "6-12m"} onChange={(e) => update(h.id, "targetPeriod", e.target.value)} style={{ width: "100%", padding: "9px 10px" }}>
                        <option value="1-3m">1~3개월 · 단기</option>
                        <option value="6-12m">6~12개월 · 중기</option>
                        <option value="2y+">2년 이상 · 장기</option>
                      </select>
                    </div>
                  </div>
                  </>)}
                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "9px 10px" }}>
                      <div className="vl-label" style={{ marginBottom: 5 }}>분할매수 가격</div>
                      <div className="vl-mono" style={{ fontSize: 12.5, color: C.buy, lineHeight: 1.6 }}>1차 {fmt(plan.first, h.cur)}<br />2차 {fmt(plan.second, h.cur)}<br />3차 {fmt(plan.third, h.cur)}</div>
                    </div>
                    <div style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "9px 10px" }}>
                      <div className="vl-label" style={{ marginBottom: 5 }}>방어 기준</div>
                      <div className="vl-mono" style={{ fontSize: 12.5, color: C.trim, lineHeight: 1.6 }}>손절/재검토 {fmt(plan.stop, h.cur)}<br />최대비중 {plan.maxWeight}%<br />기간 {h.targetPeriod || "6-12m"}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, background: "#0c0e11", border: "1px solid " + (sell.level >= 3 ? "rgba(248,113,113,0.28)" : sell.level >= 1 ? "rgba(251,191,36,0.22)" : "rgba(52,211,153,0.18)"), borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="vl-label" style={{ color: "#9aa0aa" }}>매도 판단</span>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>홀더 기준{h.type === "cyclical" ? " · 사이클 차익실현" : ""}</span>
                      <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: C[sell.color] || C.buy }}>{sell.action}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: sell.fundBroken ? C.trim : "#8b93a0", marginTop: 6, lineHeight: 1.5 }}>
                      {sell.fundBroken ? "⚠ 샀던 이유가 깨짐 — " : ""}{sell.reasons.join(" · ")}
                    </div>
                  </div>
                  <div style={{ marginTop: 9, fontSize: 11.5, color: "#8b93a0", lineHeight: 1.55 }}>
                    출처: {h.dataSources || h.aiScoreSources || h.sourceLinks || "AI 계산 후 표시"} {h.sourceLinks ? ` · 링크/출처 ${h.sourceLinks}` : ""} {h.confidenceNote ? ` · 신뢰도 ${h.confidenceNote}` : ""} {h.nextEarningsDate ? `· 다음 실적 ${h.nextEarningsDate}` : ""}
                  </div>
                </div>

                {h.type === "financial" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11 }}>
                      {field(h, "ROE (%)", "roe", "0.1")}
                      {field(h, "요구수익률 (%)", "coe", "0.1")}
                      {field(h, "성장률 g (%)", "growth", "0.1")}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginTop: 11 }}>
                      {field(h, "BPS (주당순자산)", "bps", "any")}
                      {field(h, "현재가", "price", "any")}
                    </div>
                    {roeN > 0 && coeN > 0 && (
                      <div className="vl-mono" style={{ fontSize: 12, color: "#5d8f7a", marginTop: 10 }}>
                        → 적정 PBR 자동 = Gordon PBR = <b>{r.jpbr.toFixed(2)}배</b>
                      </div>
                    )}
                  </>
                ) : h.type === "cyclical" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11 }}>
                      {field(h, "예상 EPS", "eps", "any")}
                      {field(h, "적정 PER", "per", "0.1")}
                      {field(h, "현재가", "price", "any")}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11, marginTop: 11 }}>
                      {field(h, "BPS", "bps", "any")}
                      {field(h, "ROE (%)", "roe", "0.1")}
                      {field(h, "적정 PBR · 비우면 ROE로 자동", "fairPBR", "0.1")}
                    </div>
                    {r.pbrAuto && r.jpbr > 0 ? (
                      <div className="vl-mono" style={{ fontSize: 12, color: "#5d8f7a", marginTop: 10 }}>
                        → 적정 PBR 자동 = Gordon PBR = <b>{r.jpbr.toFixed(2)}배</b> <span style={{ color: "#6b7280", fontWeight: 400 }}>(ROE {parseFloat(h.roe) || 0}% · 요구수익률 {parseFloat(h.coe) || 9}% · g {parseFloat(h.growth) || 2}% 기반 · 빈 칸은 자동값)</span>
                      </div>
                    ) : (parseFloat(h.bps) > 0 && !(parseFloat(h.fairPBR) > 0) && !(parseFloat(h.roe) > 0)) && (
                      <div className="vl-mono" style={{ fontSize: 11.5, color: "#a98e3a", marginTop: 10, fontWeight: 400 }}>적정 PBR을 직접 넣거나, <b>ROE</b>만 넣으면 자동 계산돼요 (COE·g는 자동 9%·2%).</div>
                    )}
                  </>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11 }}>
                    {field(h, "예상 EPS", "eps", "any")}
                    {field(h, "적정 PER", "per", "0.1")}
                    {field(h, "현재가", "price", "any")}
                  </div>
                )}

                {/* 되돌리기 · 기준저장 · 검증잠금 + 실질 PER 사니티 체크 */}
                {(() => {
                  const verified = h.verified === "true" || h.verified === true;
                  const pN = parseFloat(h.price), eN = parseFloat(h.eps);
                  const realPER = pN > 0 && eN > 0 ? pN / eN : null;
                  const fairPER = parseFloat(h.per) || 0;
                  const farOff = realPER !== null && fairPER > 0 && (realPER / fairPER > 1.8 || realPER / fairPER < 0.55);
                  return (
                    <div style={{ marginTop: 11, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                      <button className="vl-btn" onClick={() => revertToBaseline(h.id)} disabled={!h.baseline} title="이 종목 입력값을 기준값으로 되돌리기"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#cbd0d8", borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 700 }}>↩ 원래대로</button>
                      <button className="vl-btn" onClick={() => setBaseline(h.id)} title="지금 값을 새 기준값으로 저장"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#cbd0d8", borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 700 }}>📌 기준 저장</button>
                      <button className="vl-btn" onClick={() => toggleVerified(h.id)} title="AI 갱신이 EPS·PER 등 직접 입력값을 못 덮어쓰게 잠금"
                        style={{ background: verified ? "rgba(52,211,153,0.16)" : "rgba(255,255,255,0.06)", border: "1px solid " + (verified ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.14)"), color: verified ? C.buy : "#9aa0aa", borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 700 }}>
                        {verified ? "🔒 검증됨" : "🔓 검증 잠금"}</button>
                      {realPER !== null && (
                        <span className="vl-mono" style={{ fontSize: 11.5, color: farOff ? C.trim : "#8b93a0", marginLeft: 2 }}>
                          현재 실질 PER ≈ {realPER.toFixed(1)}배{farOff ? " ⚠ 적정PER과 차이 큼 → EPS 확인" : ""}
                        </span>
                      )}
                    </div>
                  );
                })()}



                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 11 }}>
                  {field(h, "업황 점수", "industryScore", "1")}
                  {field(h, "실적추세 점수", "trendScore", "1")}
                  {field(h, "유사기업 점수", "relativeScore", "1")}
                </div>

                {/* 시나리오 모드 토글 + 보수/낙관 직접입력 */}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span className="vl-label">시나리오</span>
                    <div style={{ display: "inline-flex", background: "#0d0f13", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 2 }}>
                      {[["auto", "간단 ±%"], ["manual", "보수·낙관 직접"]].map(([m, lbl]) => (
                        <button key={m} className="vl-btn" onClick={() => update(h.id, "scenMode", m)}
                          style={{ background: (h.scenMode || "auto") === m ? "#34d399" : "transparent", color: (h.scenMode || "auto") === m ? "#04130d" : "#9aa0aa", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11.5, fontWeight: 700 }}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                  {h.scenMode === "manual" && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.trim }}>보수</span>
                        {field(h, "EPS", "epsCons", "any")}
                        {field(h, "PER", "perCons", "0.1")}
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#9aa0aa" }}>중립</span>
                        {field(h, "EPS", "eps", "any")}
                        {field(h, "PER", "per", "0.1")}
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.buy }}>낙관</span>
                        {field(h, "EPS", "epsOpt", "any")}
                        {field(h, "PER", "perOpt", "0.1")}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, lineHeight: 1.5 }}>빈 칸은 중립값으로 자동 계산돼요. 적정가(중립)는 위 기본 EPS·PER을 그대로 써요.</div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
                  <div>
                    <div className="vl-label" style={{ marginBottom: 4 }}>적정가 <span style={{ color: "#5d8f7a", fontWeight: 700 }}>· {r.method} · 중립</span></div>
                    <div className="vl-mono vl-serif" style={{ fontSize: 29, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>{fmt(r.fair, h.cur)}</div>
                    {((h.scenMode === "manual") || scenario > 0) && (
                      <div className="vl-mono" style={{ fontSize: 11.5, color: "#9aa0aa", marginTop: 4 }}>
                        범위 <span style={{ color: C.trim }}>{fmt(r.consFair, h.cur)}</span> <span style={{ color: "#6b7280" }}>~</span> <span style={{ color: C.buy }}>{fmt(r.optFair, h.cur)}</span> <span style={{ color: "#6b7280" }}>(보수~낙관)</span>
                      </div>
                    )}
                    {r.blended && (
                      <div className="vl-mono" style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>성장 {fmt(r.growthFair, h.cur)} <span style={{ color: "#4a4f57" }}>·</span> 사이클 {fmt(r.cyclicalFair, h.cur)} <span style={{ color: "#4a4f57" }}>→</span> 혼합 성장 {r.w}%</div>
                    )}
                    {r.method === "PER+PBR 블렌드" && r.pbrFair && (
                      <div className="vl-mono" style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>PER {fmt(r.perFair, h.cur)} · PBR {fmt(r.pbrFair, h.cur)}</div>
                    )}
                    {r.method === "PBR×ROE-g" && r.jpbr > 0 && (
                      <div className="vl-mono" style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>적정PBR {r.jpbr.toFixed(2)}배 × BPS</div>
                    )}
                    {h.type !== "financial" && (r.perSrc || r.pbrSrc) && (
                      <div style={{ fontSize: 10.5, color: "#5d8f7a", marginTop: 5, letterSpacing: ".02em" }}>
                        anchor{r.perSrc ? ` · 적정PER ${r.perSrc === "직접" ? "직접입력" : r.perSrc}` : ""}{r.pbrSrc ? ` · 적정PBR ${r.pbrSrc === "직접" ? "직접입력" : r.pbrSrc === "ROE자동" ? "ROE자동" : r.pbrSrc}` : ""}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="vl-label" style={{ marginBottom: 4 }}>매수가 (−{margin}%)</div>
                    <div className="vl-mono" style={{ fontSize: 18, color: C.buy, fontWeight: 500 }}>{fmt(r.buy, h.cur)}</div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div className="vl-label" style={{ marginBottom: 4 }}>현재가 대비</div>
                    <div className="vl-mono" style={{ fontSize: 18, fontWeight: 700, color: up ? C.buy : C.trim, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                      {up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{up ? "+" : ""}{r.upside.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11.5, color: "#9aa0aa", marginTop: 4 }}>신뢰도 {r.quality}점 · {r.signal}</div>
                  </div>
                </div>

                <ZoneBar buy={r.buy} fair={r.fair} price={r.price} cur={h.cur} />

                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: z.color + "1a", border: "1px solid " + z.color + "44", borderRadius: 8, padding: "6px 12px" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: z.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: z.color }}>{z.label}</span>
                    <span className="vl-mono" style={{ fontSize: 12, color: "#9aa0aa", marginLeft: 4 }}>현재 {fmt(r.price, h.cur)}</span>
                  </div>
                  <button className="vl-btn" onClick={() => saveLog(h, r)} title="이 추정을 기록장에 저장"
                    style={{ marginLeft: "auto", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#cbd0d8", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    📌 기록
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="vl-card" style={{ marginTop: 22, background: "#0c0e11", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 22, flexWrap: "wrap", animationDelay: "120ms" }}>
          {[["buy", "현재가가 매수가 이하 → 매수 추천"], ["hold", "매수가~적정가 사이 → 보유"], ["trim", "적정가보다 비쌈 → 매도 추천"]].map(([k, t]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: C[k] }} />
              <span style={{ fontSize: 12.5, color: "#9aa0aa" }}>{t}</span>
            </div>
          ))}
        </div>

        <div className="vl-card" style={{ marginTop: 16, background: "#0c0e11", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 20px", animationDelay: "160ms" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
            <span className="vl-serif" style={{ fontSize: 18, fontWeight: 600, color: "#f4f5f7" }}>📒 백테스트 기록장</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
              <span className="vl-mono" style={{ fontSize: 12, color: "#6b7280" }}>{log.length}건</span>
              <button className="vl-btn" onClick={exportCSV} disabled={!log.length} title="기록을 CSV로 내보내기"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#cbd0d8", borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 700 }}>
                💾 CSV 내보내기
              </button>
            </div>
          </div>
          <div style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11, padding: "11px 13px", marginBottom: 12 }}>
            <div className="vl-label" style={{ marginBottom: 5 }}>누적 정확도</div>
            <div className="vl-mono" style={{ fontSize: 17, fontWeight: 700, color: acc.pct === null ? "#6b7280" : "#34d399" }}>
              {acc.pct === null ? "아직 결과 없음" : `${acc.pct}% (${acc.ok}/${acc.total})`}
            </div>
            <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 5, lineHeight: 1.5 }}>3·6·12개월 후 가격을 입력하면 매수/보유/매도 판정이 실제로 맞았는지 자동 계산돼요.</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
            {acc.horizons.map((x) => (
              <div key={x.key} style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "9px 10px" }}>
                <div className="vl-label" style={{ marginBottom: 4 }}>{x.label} 리포트</div>
                <div className="vl-mono" style={{ fontSize: 14, color: x.pct === null ? "#6b7280" : C.buy, fontWeight: 800 }}>{x.pct === null ? "대기" : `${x.pct}%`}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{x.total ? `${x.wins}/${x.total} · 평균 ${x.avg.toFixed(1)}%` : "결과 입력 필요"}</div>
              </div>
            ))}
          </div>
          {acc.names.length > 0 && (
            <div style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "9px 10px", marginBottom: 12 }}>
              <div className="vl-label" style={{ marginBottom: 6 }}>종목별 승률</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {acc.names.slice(0, 8).map((x) => <span key={x.name} style={{ fontSize: 11.5, color: "#cbd0d8", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "4px 8px" }}>{x.name} {x.pct}%</span>)}
              </div>
            </div>
          )}
          {log.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
              각 종목의 <b style={{ color: "#9aa0aa" }}>📌 기록</b> 버튼을 누르면 그날의 적정가·현재가가 저장돼요. 6~12개월 뒤에 다시 보면 "내 추정이 맞았나?"를 확인할 수 있어요 — 이게 판단력을 키우는 핵심이에요.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {log.map((e) => {
                const ez = ZONE[e.zone] || ZONE.hold;
                const ev = evaluateLog(e);
                const eup = e.upside >= 0;
                return (
                  <div key={e.id} style={{ background: "#101216", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span className="vl-mono" style={{ fontSize: 11, color: "#6b7280" }}>{e.date}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#eceef1" }}>{e.name}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: ez.color, background: ez.color + "1a", borderRadius: 5, padding: "2px 7px" }}>{ez.label}</span>
                      <button className="vl-ghost vl-btn" onClick={() => deleteLog(e.id)} style={{ marginLeft: "auto", background: "transparent", border: "none", padding: 2 }}><X size={14} /></button>
                    </div>
                    <div className="vl-mono" style={{ fontSize: 12.5, color: "#9aa0aa", marginTop: 6 }}>
                      적정가 {fmt(e.fair, e.cur)} · 현재가 {fmt(e.price, e.cur)} · <span style={{ color: eup ? C.buy : C.trim }}>{eup ? "+" : ""}{e.upside.toFixed(1)}%</span> · 신호품질 {e.quality || "—"} · AI점수 {e.finalScore || "—"} · 데이터신뢰 {e.dataConfidence || "—"} · 공식 {e.formula || "—"}
                    </div>
                    <div className="vl-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 9 }}>
                      <input className="vl-input" type="number" placeholder="3개월 후" value={e.price3m || ""} onChange={(ev2) => updateLogField(e.id, "price3m", ev2.target.value)} />
                      <input className="vl-input" type="number" placeholder="6개월 후" value={e.price6m || ""} onChange={(ev2) => updateLogField(e.id, "price6m", ev2.target.value)} />
                      <input className="vl-input" type="number" placeholder="12개월 후" value={e.price12m || ""} onChange={(ev2) => updateLogField(e.id, "price12m", ev2.target.value)} />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: ev.ok === null ? "#6b7280" : ev.ok ? C.buy : C.trim }}>
                      결과: {ev.status}{ev.bestReturn !== null ? ` · 최고수익률 ${ev.bestReturn.toFixed(1)}%` : ""}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
                      <span className="vl-label" style={{ fontSize: 10 }}>프로그램</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: ez.color }}>{e.decisionLabel || ez.label}</span>
                      <span className="vl-label" style={{ fontSize: 10, marginLeft: 6 }}>내 행동</span>
                      <select className="vl-select" value={e.action || ""} onChange={(ev2) => updateLogField(e.id, "action", ev2.target.value)}>
                        <option value="">미입력</option>
                        <option value="full">매수함</option>
                        <option value="partial">일부 매수</option>
                        <option value="watch">관망</option>
                        <option value="skip">안 삼</option>
                        <option value="sold">매도함</option>
                      </select>
                      {ev.ok !== null && (e.action === "skip" || e.action === "watch") && (e.zone === "buy") && ev.ok &&
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: C.trim }}>← 매수신호 놓침</span>}
                      {ev.ok !== null && (e.action === "full" || e.action === "partial") && (e.zone === "buy") && !ev.ok &&
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: C.hold }}>← 들어갔는데 빗나감</span>}
                    </div>
                    <input className="vl-input" placeholder="결과 메모 (예: 6개월 뒤 OO원 도달 / 빗나감)" value={e.note} onChange={(ev) => updateLogNote(e.id, ev.target.value)}
                      style={{ marginTop: 9, fontSize: 13, fontFamily: "'Sora',sans-serif" }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 12, padding: "13px 16px", display: "flex", gap: 10 }}>
          <AlertTriangle size={15} style={{ color: C.hold, flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12.5, color: "#c9bd96", margin: 0, lineHeight: 1.6 }}>
            AI가 채운 값·유형·시장필터는 <b>웹 검색 기반 추정치</b>예요. 유형이 틀리면 위 드롭다운으로 직접 바꾸고, EPS·PER·ROE는 검증하세요. 시장필터는 적정가를 바꾸는 게 아니라 <b>진입 여부</b>를 조절합니다.
          </p>
        </div>
        </>
        )}

        {tab === "screen" && (
        <>
        <div className="vl-card" style={{ background: "#101216", border: "1px solid rgba(251,191,36,0.22)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, animationDelay: "40ms" }}>
          <div className="vl-label" style={{ color: "#fbbf24", marginBottom: 6 }}>🌾 알곡기 · 퀀트 100점 스크리너</div>
          <div style={{ fontSize: 12, color: "#9aa0aa", lineHeight: 1.55 }}>
            가치(PER·PBR)와 성장(EPS성장·ROE)을 한 번에 평가해 우량주를 가려내요. ROE 25 + EPS성장 25 + 매출 15 + PER 15 + PBR 10 + 부채 5 + 영업이익률 5 (+FCF·EPS연속 보너스 각 5) = 100점. 하드필터(ROE&lt;8 · 성장 음수 · 적자 · 시총 미달)는 점수 계산 전에 탈락.
          </div>
        </div>

        <div className="vl-card" style={{ background: "#0f1115", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, alignItems: "end" }}>
            <div>
              <div className="vl-label" style={{ marginBottom: 5 }}>국가</div>
              <select className="vl-input" value={scCountry} onChange={(e) => setScCountry(e.target.value)}>
                <option value="kr">🇰🇷 한국</option>
                <option value="us">🇺🇸 미국</option>
              </select>
            </div>
            <div>
              <div className="vl-label" style={{ marginBottom: 5 }}>산업군</div>
              <select className="vl-input" value={scSector} onChange={(e) => setScSector(e.target.value)}>
                {SECTOR_GROUPS.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</optgroup>)}
              </select>
            </div>
            <div>
              <div className="vl-label" style={{ marginBottom: 5 }}>최소 시총 (억원)</div>
              <input className="vl-input" type="number" value={scMinCap} onChange={(e) => setScMinCap(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <div className="vl-label" style={{ marginBottom: 5 }}>ETF</div>
              <button className="vl-btn" onClick={() => setScNoEtf((v) => !v)}
                style={{ width: "100%", background: scNoEtf ? "rgba(52,211,153,0.13)" : "#0c0e11", border: "1px solid " + (scNoEtf ? "rgba(52,211,153,0.38)" : "rgba(255,255,255,0.09)"), color: scNoEtf ? "#7fe0c0" : "#7b818c", borderRadius: 9, padding: "9px 8px", fontSize: 12.5, fontWeight: 700 }}>
                {scNoEtf ? "✓ ETF 제외" : "ETF 포함"}
              </button>
            </div>
            <button className="vl-btn" onClick={screenSearch} disabled={screenBusy}
              style={{ background: "#fbbf24", color: "#1a1404", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, whiteSpace: "nowrap" }}>
              {screenBusy ? <RefreshCw size={15} className="vl-spin" /> : <Search size={15} />}
              {screenBusy ? "스크리닝 중…" : "검색"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "9px 12px" }}>
          <AlertTriangle size={13} style={{ color: C.hold, flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11.5, color: "#c9bd96", margin: 0, lineHeight: 1.55 }}>
            각 후보를 <b>실제 웹검색으로 재무지표를 가져와</b> 위 100점 모델로 채점·정렬해요. 웹 데이터라 지식 기반보다 정확하지만, 검색에 특정 수치가 안 뜨면 <b>일부는 AI 추정</b>으로 메워요 (큰 베팅 전 직접 확인). 전체 시장이 아니라 <b>후보군(최대 10개) 스크리닝</b>이고, 정밀 모드라 1~2분 걸려요.
          </p>
        </div>

        {screenBusy && (
          <div style={{ textAlign: "center", padding: "18px 0", fontSize: 12.5, color: "#8b93a0" }}>
            {screenProgress
              ? "정밀 채점 중… (" + (screenProgress.done + 1) + "/" + screenProgress.total + ") · " + screenProgress.name
              : "후보 추리는 중…"}
            <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 6 }}>각 종목을 실제 웹검색으로 가져와 채점해요 — 1~2분 걸릴 수 있어요</div>
          </div>
        )}

        {!screenBusy && screen.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <div className="vl-label">결과 {screen.length}종목 · 총점순</div>
              <button className="vl-btn" onClick={exportScreenCSV}
                style={{ marginLeft: "auto", background: "rgba(96,165,250,0.13)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.4)", borderRadius: 9, padding: "7px 12px", fontSize: 12, fontWeight: 700 }}>
                ⬇ CSV 다운로드
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {screen.map((r, i) => {
                const gc = gradeColor(r.grade);
                const open = screenOpenId === r._id;
                const nv = (x, suf) => (x == null || !isFinite(parseFloat(x)) ? "—" : parseFloat(x).toFixed(1) + (suf || ""));
                return (
                  <div key={r._id} style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }} onClick={() => setScreenOpenId(open ? null : r._id)}>
                      <span className="vl-mono" style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? gc : "#6b7280", flexShrink: 0, width: 20, textAlign: "center" }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                          <span className="vl-serif" style={{ fontSize: 16, fontWeight: 600, color: "#f4f5f7" }}>{r.name}</span>
                          <span className="vl-mono" style={{ fontSize: 11, color: "#6b7280" }}>{r.ticker}</span>
                          {r.sector && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9aa0aa", background: "rgba(255,255,255,0.05)", borderRadius: 5, padding: "1px 6px" }}>{r.sector}</span>}
                        </div>
                        <div className="vl-mono" style={{ fontSize: 11.5, color: "#9aa0aa", marginTop: 4 }}>ROE {nv(r.roe, "%")} · EPS성장 {nv(r.epsGrowth, "%")} · PER {nv(r.per)} · PBR {nv(r.pbr)}{Array.isArray(r.estimated) && r.estimated.length > 0 && <span style={{ color: "#fb923c", fontWeight: 700 }}> · ⚠{r.estimated.length}개 추정</span>}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: gc, background: gc + "1f", borderRadius: 7, padding: "2px 9px" }}>{r.grade}</span>
                        <div className="vl-mono" style={{ fontSize: 15, fontWeight: 800, color: gc, marginTop: 4 }}>{r.total}점</div>
                      </div>
                    </div>
                    {open && (
                      <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        {Array.isArray(r.estimated) && r.estimated.length > 0 && (
                          <div style={{ fontSize: 10.5, color: "#fb923c", marginBottom: 9, lineHeight: 1.5, background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 7, padding: "6px 9px" }}>⚠ 검색에서 못 찾아 <b>AI 추정으로 메운 항목</b>이에요 — 부정확할 수 있어요</div>
                        )}
                        {[["ROE", "roe", r.sRoe, 25, nv(r.roe, "%")], ["EPS성장 (3년평균)", "epsGrowth", r.sEps, 25, nv(r.epsGrowth, "%")], ["매출성장 (3년평균)", "revGrowth", r.sRev, 15, nv(r.revGrowth, "%")], ["PER", "per", r.sPer, 15, nv(r.per)], ["PBR", "pbr", r.sPbr, 10, nv(r.pbr)], ["부채비율", "debt", r.sDebt, 5, nv(r.debt, "%")], ["영업이익률", "opMargin", r.sOm, 5, nv(r.opMargin, "%")]].map((row) => {
                          const est = Array.isArray(r.estimated) && r.estimated.includes(row[1]);
                          return (
                            <div key={row[1]} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
                              <span style={{ color: "#9aa0aa", flex: 1 }}>{row[0]}{est && <span style={{ color: "#fb923c", fontSize: 9.5, fontWeight: 800, marginLeft: 6, border: "1px solid rgba(251,146,60,0.4)", borderRadius: 4, padding: "0 4px" }}>AI 추정</span>}</span>
                              <span className="vl-mono" style={{ color: est ? "#fb923c" : "#cbd0d8", width: 64, textAlign: "right" }}>{row[4]}</span>
                              <span className="vl-mono" style={{ color: row[2] > 0 ? "#7fe0c0" : "#6b7280", width: 52, textAlign: "right", fontWeight: 700 }}>{row[2]}/{row[3]}</span>
                            </div>
                          );
                        })}
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(255,255,255,0.07)", fontSize: 11.5, color: "#9aa0aa", lineHeight: 1.6 }}>
                          FCF 3년 연속+ <b style={{ color: r.bFcf ? "#7fe0c0" : "#6b7280" }}>{r.bFcf ? "✓ +5" : "—"}</b>{Array.isArray(r.estimated) && r.estimated.includes("fcf3yPositive") && <span style={{ color: "#fb923c", fontSize: 9.5, fontWeight: 800 }}> (추정)</span>} · EPS 5년 연속↑ <b style={{ color: r.bEps ? "#7fe0c0" : "#6b7280" }}>{r.bEps ? "✓ +5" : "—"}</b>{Array.isArray(r.estimated) && r.estimated.includes("eps5yStreak") && <span style={{ color: "#fb923c", fontSize: 9.5, fontWeight: 800 }}> (추정)</span>} · 시총 {nv(r.marketCap)}억{Array.isArray(r.estimated) && r.estimated.includes("marketCap") && <span style={{ color: "#fb923c", fontSize: 9.5, fontWeight: 800 }}> (추정)</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!screenBusy && screen.length === 0 && !err && (
          <div style={{ textAlign: "center", padding: "26px 16px", color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
            <Search size={22} style={{ color: "#565b64" }} /><br />
            국가 · 산업군 · 최소 시총을 정하고 <b style={{ color: "#fbbf24" }}>검색</b>을 누르면<br />후보를 100점 모델로 채점해서 등급순으로 보여줘요.
          </div>
        )}
        </>
        )}

        {tab === "plant" && (
        <>
        <div className="vl-card" style={{ background: "#101216", border: "1px solid rgba(94,234,212,0.22)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, animationDelay: "40ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="vl-label" style={{ color: "#5eead4", marginBottom: 6 }}>🌱 모내기 · 매수 타이밍 (30점)</div>
              <div style={{ fontSize: 12, color: "#9aa0aa", lineHeight: 1.55 }}>"언제 살까"를 봐요. 추세·RSI·RS·거래량·스토캐스틱·골든크로스·수급·시장환경·VIX 10개 항목(각 A3~D0) = 30점 → 등급별 <b>분할 진입가</b>·추가매수·손절. 좋은 종목을 <b>하락이 아니라 상승 전환점</b>에서 사기 위한 거예요.</div>
            </div>
            <button className="vl-btn" onClick={analyzePlantAll} disabled={plantBulk || plantId || !holdings.length}
              style={{ background: "#5eead4", color: "#06302a", border: "none", borderRadius: 11, padding: "10px 16px", fontSize: 13.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              {plantBulk ? <RefreshCw size={15} className="vl-spin" /> : <Activity size={15} />}
              {plantBulk ? "분석 중…" : "전체 분석"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, background: "rgba(94,234,212,0.07)", border: "1px solid rgba(94,234,212,0.2)", borderRadius: 10, padding: "9px 12px" }}>
          <AlertTriangle size={13} style={{ color: "#5eead4", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11.5, color: "#a7c7c0", margin: 0, lineHeight: 1.55 }}>
            감정평가 보유종목 대상. 앱이 <b>웹검색으로</b> 기술적 상태를 가져와 채점해요 (추정 항목엔 "추정" 표시). <b>우량주 보정</b>: ROE≥20 &amp; EPS성장≥20이면 등급 1단계 ↑. 진입가는 현재가 기준 계산이라 참고용이에요.
          </p>
        </div>

        {holdings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "26px 16px", color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
            📈 감정평가 탭에서 종목을 먼저 추가해주세요.<br />모내기는 보유종목의 매수 타이밍을 봐요.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {holdings.map((h, i) => {
              const d = plant[h.id];
              const busy = plantId === h.id || plantBulk;
              let bodyEl = null;
              if (d) {
                const total = plantScore(d.items);
                const baseG = plantGrade(total);
                const g = plantUpgrade(baseG, d.roe, d.epsGrowth);
                const upgraded = g !== baseG;
                const gc = plantColor(g);
                const plan = plantPlan(g);
                const entries = plantEntries(d.price || h.price, g);
                const px = parseFloat(d.price || h.price);
                const stopPx = isFinite(px) && plan.stop ? px * (1 - plan.stop / 100) : null;
                bodyEl = (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: gc, background: gc + "1f", borderRadius: 8, padding: "3px 11px" }}>{g}등급 · {plantLabel(g)}</span>
                      <span className="vl-mono" style={{ fontSize: 14, fontWeight: 800, color: gc }}>{total}/30점</span>
                      {upgraded && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.12)", borderRadius: 5, padding: "2px 7px" }}>우량주 보정 ↑ ({baseG}→{g})</span>}
                    </div>
                    {g === "D" ? (
                      <div style={{ marginTop: 12, background: "#0c0e11", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", fontSize: 12.5, color: "#9aa0aa", lineHeight: 1.5 }}>
                        <b style={{ color: "#fb923c" }}>매수 대기.</b> 아직 상승 전환 신호가 약해요 — 추세·수급이 돌아설 때까지 기다리는 구간이에요.
                      </div>
                    ) : (
                      <div style={{ marginTop: 12, background: "#0c0e11", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
                        <div className="vl-label" style={{ marginBottom: 8 }}>분할 진입 ({entries.length}회) · 하락 시 -{plan.addDrop}%마다 추가</div>
                        {entries.map((e) => (
                          <div key={e.n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 12.5 }}>
                            <span style={{ color: "#9aa0aa", width: 44 }}>{e.n}차</span>
                            <span className="vl-mono" style={{ color: gc, fontWeight: 700, width: 52 }}>{e.ratio}%</span>
                            <span className="vl-mono" style={{ color: "#cbd0d8", marginLeft: "auto" }}>@ {fmt(e.price, h.cur)}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(255,255,255,0.07)", fontSize: 11.5, color: "#f87171", fontWeight: 700 }}>
                          손절 -{plan.stop}% {stopPx != null && <span className="vl-mono">(@ {fmt(stopPx, h.cur)})</span>}
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {PLANT_ITEMS.map((it) => {
                        const v = (d.items && d.items[it[0]]) || {};
                        const ig = v.grade ? String(v.grade).toUpperCase() : "D";
                        const igc = plantColor(ig);
                        const est = Array.isArray(d.estimated) && d.estimated.includes(it[0]);
                        return (
                          <div key={it[0]} style={{ background: "#0c0e11", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "7px 9px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 11, color: "#9aa0aa", flex: 1 }}>{it[1]}</span>
                              {est && <span style={{ fontSize: 8.5, fontWeight: 800, color: "#fb923c", border: "1px solid rgba(251,146,60,0.4)", borderRadius: 3, padding: "0 3px" }}>추정</span>}
                              <span style={{ fontSize: 12, fontWeight: 900, color: igc }}>{ig}</span>
                            </div>
                            {v.note && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2, lineHeight: 1.35 }}>{v.note}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <div key={h.id} className="vl-card" style={{ background: "#0f1115", border: "1px solid rgba(94,234,212,0.16)", borderRadius: 18, padding: "18px 20px", animationDelay: i * 55 + "ms" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <span className="vl-serif" style={{ fontSize: 19, fontWeight: 600, color: "#f4f5f7" }}>{h.name}</span>
                    <span className="vl-mono" style={{ fontSize: 12, color: "#6b7280" }}>{h.ticker}</span>
                    <span className="vl-mono" style={{ fontSize: 12.5, color: "#9aa0aa", marginLeft: "auto" }}>현재 {fmt(parseFloat(h.price) || 0, h.cur)}</span>
                    <button className="vl-btn" onClick={() => analyzePlant(h.id)} disabled={busy}
                      style={{ background: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.35)", color: "#5eead4", borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                      <RefreshCw size={12} className={plantId === h.id ? "vl-spin" : ""} />
                      {plantId === h.id ? "분석 중" : d ? "갱신" : "분석"}
                    </button>
                  </div>
                  {bodyEl || (
                    <div style={{ marginTop: 14, background: "#0c0e11", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
                      <Gauge size={20} style={{ color: "#6b7280" }} />
                      <div style={{ fontSize: 12.5, color: "#8b93a0", marginTop: 8, lineHeight: 1.5 }}>아직 분석 안 했어요.<br /><b style={{ color: "#5eead4" }}>분석</b>을 누르면 매수 타이밍을 채점해요.</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>
        )}

        {tab === "final" && (
        <>
        <div className="vl-card" style={{ background: "#101216", border: "1px solid rgba(167,139,250,0.22)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, animationDelay: "40ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="vl-label" style={{ color: "#a78bfa", marginBottom: 6 }}>🎯 최종 투자점수 (100점)</div>
              <div style={{ fontSize: 12, color: "#9aa0aa", lineHeight: 1.55 }}><b>좋은 종목 + 좋은 타이밍</b>을 한 점수로. 알곡기(종목 품질) <b>60%</b> + 모내기(매수 타이밍) <b>40%</b> 가중합. S(80+) 지금 강력매수 · A(70) 매수우위 · B(60) 관심 · C(50) 관망 · D 회피.</div>
            </div>
            <button className="vl-btn" onClick={analyzeFinalAll} disabled={finalBulk || finalId || !holdings.length}
              style={{ background: "#a78bfa", color: "#1e1340", border: "none", borderRadius: 11, padding: "10px 16px", fontSize: 13.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              {finalBulk ? <RefreshCw size={15} className="vl-spin" /> : <Activity size={15} />}
              {finalBulk ? "분석 중…" : "전체 분석"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 10, padding: "9px 12px" }}>
          <AlertTriangle size={13} style={{ color: "#a78bfa", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11.5, color: "#c3b8e8", margin: 0, lineHeight: 1.55 }}>
            보유종목마다 <b>알곡기(품질 100)</b>와 <b>모내기(타이밍 30→100환산)</b>를 웹검색으로 가져와 합산해요. 종목당 검색 2회라 다소 느려요. 모내기를 이미 돌렸으면 그 결과를 재사용해 더 빨라요.
          </p>
        </div>

        {holdings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "26px 16px", color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
            📈 감정평가 탭에서 종목을 먼저 추가해주세요.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {holdings.map((h, i) => {
              const r = finalData[h.id];
              const busy = finalId === h.id || finalBulk;
              let bodyEl = null;
              if (r) {
                const fs = finalScore(r.qTotal, r.tTotal);
                const fc = finalColor(fs.grade);
                bodyEl = (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: fc, lineHeight: 1 }}>{fs.grade}</div>
                        <div className="vl-mono" style={{ fontSize: 20, fontWeight: 800, color: fc, marginTop: 3 }}>{fs.total}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: fc, marginBottom: 7 }}>{finalLabel(fs.grade)}</div>
                        <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden", display: "flex" }}>
                          <div style={{ width: fs.qPart + "%", background: "#fbbf24" }} title="종목" />
                          <div style={{ width: fs.tPart + "%", background: "#5eead4" }} title="타이밍" />
                        </div>
                        <div className="vl-mono" style={{ fontSize: 10.5, color: "#9aa0aa", marginTop: 6, display: "flex", gap: 12 }}>
                          <span><span style={{ color: "#fbbf24" }}>●</span> 종목 {r.qGrade} ({r.qTotal}/100 ×0.6 = {fs.qPart})</span>
                          <span><span style={{ color: "#5eead4" }}>●</span> 타이밍 {r.tGrade} ({r.tTotal}/30 ×0.4 = {fs.tPart})</span>
                        </div>
                      </div>
                    </div>
                    {Array.isArray(r.estimated) && r.estimated.length > 0 && (
                      <div style={{ fontSize: 10, color: "#fb923c", marginTop: 10 }}>⚠ AI 추정 항목 {r.estimated.length}개 포함 (검색에서 못 찾음)</div>
                    )}
                  </div>
                );
              }
              return (
                <div key={h.id} className="vl-card" style={{ background: "#0f1115", border: "1px solid rgba(167,139,250,0.16)", borderRadius: 16, padding: "16px 18px", animationDelay: i * 55 + "ms" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <span className="vl-serif" style={{ fontSize: 18, fontWeight: 600, color: "#f4f5f7" }}>{h.name}</span>
                    <span className="vl-mono" style={{ fontSize: 12, color: "#6b7280" }}>{h.ticker}</span>
                    <button className="vl-btn" onClick={() => analyzeFinal(h.id)} disabled={busy}
                      style={{ marginLeft: "auto", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", color: "#a78bfa", borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                      <RefreshCw size={12} className={finalId === h.id ? "vl-spin" : ""} />
                      {finalId === h.id ? "분석 중" : r ? "갱신" : "종합 분석"}
                    </button>
                  </div>
                  {bodyEl || (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>종합 분석을 누르면 알곡기+모내기를 합산해 최종 점수를 매겨요.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>
        )}

        {tab === "harvest" && (
        <>
        <div className="vl-card" style={{ background: "#101216", border: "1px solid rgba(251,146,60,0.22)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, animationDelay: "40ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="vl-label" style={{ color: "#fb923c", marginBottom: 6 }}>🧺 추수 · 분할 매도 (100점)</div>
              <div style={{ fontSize: 12, color: "#9aa0aa", lineHeight: 1.55 }}>"매도 신호"가 아니라 <b>수익 극대화를 위한 분할매도</b> 엔진. RSI과열·RS·이격도·거래량·외국인·기관 = 100점 → A/B/C/D 등급별 <b>분할매도 비중</b>. 매수가 넣으면 <b>수익률 사다리</b>(대박주 너무 빨리 안 팔게)도 같이 떠요.</div>
            </div>
            <button className="vl-btn" onClick={analyzeHarvestAll} disabled={harvestBulk || harvestId || !holdings.length}
              style={{ background: "#fb923c", color: "#2a1505", border: "none", borderRadius: 11, padding: "10px 16px", fontSize: 13.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              {harvestBulk ? <RefreshCw size={15} className="vl-spin" /> : <Activity size={15} />}
              {harvestBulk ? "분석 중…" : "전체 분석"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: 10, padding: "9px 12px" }}>
          <AlertTriangle size={13} style={{ color: "#fb923c", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11.5, color: "#d8b896", margin: 0, lineHeight: 1.55 }}>
            전량매도 금지가 원칙 — A 10% → B 누적30% → C 누적60% → D 전량. <b>우량주 보호</b>(ROE≥20 &amp; EPS성장≥20): 등급 1단계 ↓. <b>추세종료</b>(20일선이탈·데드크로스·수급이탈 등 3개↑): 강제 D. 데이터는 웹검색(추정 항목 "추정" 표시).
          </p>
        </div>

        {holdings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "26px 16px", color: "#6b7280", fontSize: 13, lineHeight: 1.6 }}>
            📈 감정평가 탭에서 종목을 먼저 추가해주세요.<br />추수는 보유종목의 매도 타이밍을 봐요.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {holdings.map((h, i) => {
              const d = harvest[h.id];
              const busy = harvestId === h.id || harvestBulk;
              const bp = parseFloat(buyPrices[h.id]);
              let bodyEl = null;
              if (d) {
                const raw = harvestScore(d);
                const forced = harvestForcedD(d.signals);
                const gBase = forced ? "D" : harvestGradeRaw(raw.total);
                const protect = parseFloat(d.roe) >= 20 && parseFloat(d.epsGrowth) >= 20;
                const protectedNow = protect && !forced && gBase !== "HOLD";
                const g = protectedNow ? harvestDowngrade(gBase) : gBase;
                const gc = harvestColor(g);
                const cum = HARVEST_CUM[g], add = HARVEST_ADD[g], remain = 100 - cum;
                const px = parseFloat(d.price != null ? d.price : h.price);
                const retPct = isFinite(bp) && bp > 0 && isFinite(px) ? ((px - bp) / bp) * 100 : null;
                const ladder = retPct != null ? profitLadder(retPct) : null;
                const nv = (x, suf) => (x == null || !isFinite(parseFloat(x)) ? "—" : parseFloat(x).toFixed(1) + (suf || ""));
                const flowLabel = (v) => (v === "strong_sell" ? "강한 순매도" : v === "turn_sell" ? "순매도 전환" : v === "buy_decrease" ? "순매수 감소" : "해당없음");
                const firedSignals = HARVEST_SIGNALS.filter((s) => d.signals && d.signals[s[0]]);
                bodyEl = (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {g === "HOLD"
                        ? <span style={{ fontSize: 14, fontWeight: 800, color: "#6b7280", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "3px 11px" }}>보유 · 추수 신호 없음</span>
                        : <span style={{ fontSize: 15, fontWeight: 900, color: gc, background: gc + "1f", borderRadius: 8, padding: "3px 11px" }}>{g} 추수 · {harvestLabel(g)}</span>}
                      <span className="vl-mono" style={{ fontSize: 14, fontWeight: 800, color: gc }}>{raw.total}/100점</span>
                      {forced && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,0.13)", borderRadius: 5, padding: "2px 7px" }}>⚠ 추세종료 강제 D</span>}
                      {protectedNow && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.12)", borderRadius: 5, padding: "2px 7px" }}>우량주 보호 ↓ ({gBase}→{g})</span>}
                    </div>

                    {g !== "HOLD" && (
                      <div style={{ marginTop: 12, background: "#0c0e11", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 8, textAlign: "center" }}>
                        <div style={{ flex: 1 }}><div style={{ fontSize: 10.5, color: "#6b7280" }}>이번 추수</div><div className="vl-mono" style={{ fontSize: 18, fontWeight: 800, color: gc, marginTop: 2 }}>{add}%</div></div>
                        <div style={{ flex: 1, borderLeft: "1px solid rgba(255,255,255,0.07)", borderRight: "1px solid rgba(255,255,255,0.07)" }}><div style={{ fontSize: 10.5, color: "#6b7280" }}>누적 매도</div><div className="vl-mono" style={{ fontSize: 18, fontWeight: 800, color: "#cbd0d8", marginTop: 2 }}>{cum}%</div></div>
                        <div style={{ flex: 1 }}><div style={{ fontSize: 10.5, color: "#6b7280" }}>남은 보유</div><div className="vl-mono" style={{ fontSize: 18, fontWeight: 800, color: "#7fe0c0", marginTop: 2 }}>{remain}%</div></div>
                      </div>
                    )}

                    {ladder && (
                      <div style={{ marginTop: 10, background: "#0c0e11", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
                        <div className="vl-label" style={{ marginBottom: 8 }}>수익률 추수 · 현재 <span style={{ color: retPct >= 0 ? "#34d399" : "#f87171" }}>{retPct >= 0 ? "+" : ""}{retPct.toFixed(1)}%</span> → 누적 {ladder.cum}%</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {ladder.detail.map((s) => (
                            <span key={s.th} className="vl-mono" style={{ fontSize: 10.5, fontWeight: 700, color: s.reached ? "#fb923c" : "#565b64", background: s.reached ? "rgba(251,146,60,0.12)" : "rgba(255,255,255,0.03)", borderRadius: 5, padding: "2px 7px" }}>+{s.th}%→{s.pct}%</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 7 }}>기술 추수({cum}%)와 수익률 추수({ladder.cum}%) 중 <b style={{ color: "#fb923c" }}>큰 쪽</b>을 권장 — 대박주는 천천히.</div>
                      </div>
                    )}

                    <div style={{ marginTop: 12 }}>
                      {[["RSI 과열", raw.sRsi, 20, nv(d.rsi)], ["RS Index", raw.sRs, 20, nv(d.rsRank) + "% 상위"], ["20일선 이격도", raw.sMa, 20, nv(d.ma20Gap, "%")], ["거래량", raw.sVol, 10, nv(d.volRatio, "%")], ["외국인 수급", raw.sForeign, 15, flowLabel(d.foreign)], ["기관 수급", raw.sInst, 15, flowLabel(d.inst)]].map((row, ri) => (
                        <div key={ri} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
                          <span style={{ color: "#9aa0aa", flex: 1 }}>{row[0]}</span>
                          <span className="vl-mono" style={{ color: "#cbd0d8", width: 86, textAlign: "right" }}>{row[3]}</span>
                          <span className="vl-mono" style={{ color: row[1] > 0 ? "#fb923c" : "#6b7280", width: 48, textAlign: "right", fontWeight: 700 }}>{row[1]}/{row[2]}</span>
                        </div>
                      ))}
                    </div>

                    {firedSignals.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px dashed rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize: 10.5, color: "#f87171", fontWeight: 700, marginBottom: 5 }}>⚠ 추세종료 신호 {firedSignals.length}/6 {forced ? "(3개↑ → 강제 D)" : ""}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {firedSignals.map((s) => <span key={s[0]} style={{ fontSize: 10, color: "#f3a48c", background: "rgba(248,113,113,0.1)", borderRadius: 5, padding: "2px 7px" }}>{s[1]}</span>)}
                        </div>
                      </div>
                    )}
                    {Array.isArray(d.estimated) && d.estimated.length > 0 && (
                      <div style={{ fontSize: 10, color: "#fb923c", marginTop: 9 }}>⚠ 검색에서 못 찾아 AI 추정한 항목 {d.estimated.length}개 포함</div>
                    )}
                  </div>
                );
              }
              return (
                <div key={h.id} className="vl-card" style={{ background: "#0f1115", border: "1px solid rgba(251,146,60,0.16)", borderRadius: 18, padding: "18px 20px", animationDelay: i * 55 + "ms" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <span className="vl-serif" style={{ fontSize: 19, fontWeight: 600, color: "#f4f5f7" }}>{h.name}</span>
                    <span className="vl-mono" style={{ fontSize: 12, color: "#6b7280" }}>{h.ticker}</span>
                    <span className="vl-mono" style={{ fontSize: 12.5, color: "#9aa0aa", marginLeft: "auto" }}>현재 {fmt(parseFloat(h.price) || 0, h.cur)}</span>
                    <button className="vl-btn" onClick={() => analyzeHarvest(h.id)} disabled={busy}
                      style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.35)", color: "#fb923c", borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                      <RefreshCw size={12} className={harvestId === h.id ? "vl-spin" : ""} />
                      {harvestId === h.id ? "분석 중" : d ? "갱신" : "분석"}
                    </button>
                  </div>
                  <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: "#9aa0aa", whiteSpace: "nowrap" }}>내 매수가</span>
                    <input className="vl-input" type="number" placeholder="선택 입력 (수익률 추수용)" value={buyPrices[h.id] != null ? buyPrices[h.id] : ""}
                      onChange={(e) => setBuyPrices((b) => ({ ...b, [h.id]: e.target.value }))}
                      style={{ flex: 1, maxWidth: 200 }} />
                    {h.cur && <span style={{ fontSize: 11, color: "#6b7280" }}>{h.cur}</span>}
                  </div>
                  {bodyEl || (
                    <div style={{ marginTop: 12, background: "#0c0e11", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 12, padding: "16px", textAlign: "center" }}>
                      <Gauge size={20} style={{ color: "#6b7280" }} />
                      <div style={{ fontSize: 12.5, color: "#8b93a0", marginTop: 8, lineHeight: 1.5 }}>아직 분석 안 했어요.<br /><b style={{ color: "#fb923c" }}>분석</b>을 누르면 추수(매도) 점수를 매겨요.</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>
        )}

        <p style={{ fontSize: 11.5, color: "#565b64", marginTop: 18, lineHeight: 1.65, textAlign: "center" }}>
          참고용 계산 도구 · 투자 권유가 아니며 모든 판단과 책임은 본인에게 있습니다
        </p>
      </div>
    </div>
  );
}
