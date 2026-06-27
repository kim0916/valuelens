// ValueLens — BuyResult
// Phase 1-E: main.jsx에서 분리
// props / 함수명 / className / 계산 흐름 변경 금지

import React from 'react';
import { NAVY } from '../constants/brand.js';
import { GS, won, pct } from '../constants/grades.js';
import { analyzeBuyerDecision, RECON } from '../engine/market.js';
import { computeDataTrust } from '../engine/stats.js';
import { scorePool, calculateLivingScore, calculateSupplyRisk, calculatePositiveFactors, calculateNegativeFactors } from '../recommendation/score.js';
import { writeSearchLog } from '../services/storage/searchLog.js';
import {
  AiNotice, DataTrustBadge, GradeInfoPopup,
  InputWarnings, MarketTypeBadge, BuySaveBtn,
} from './shared.jsx';

// ── OpportunityCard (BuyResult 전용) ──
function OpportunityCard({ opp }) {
  const t = opp.opportunityScore;
  const tone = t >= 30 ? "text-emerald-600" : t >= 10 ? "text-emerald-500" : t <= -30 ? "text-red-600" : t <= -10 ? "text-red-500" : "text-slate-500";
  const Sig = ({ x }) => (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-800">{x.title}</span><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${x.sourceType === "api" ? "bg-emerald-100 text-emerald-700" : x.sourceType === "ai" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>{x.sourceType === "api" ? "공공데이터" : x.sourceType === "ai" ? "AI요약" : "자체추정"}</span></div>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{x.description}</p>
      <p className="mt-1 text-[11px] text-slate-400">{x.category} · 영향 {x.impact} · 안정성 {x.confidence}{x.distanceNote ? ` · ${x.distanceNote}` : ""}</p>
    </div>
  );
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">주변 호재·악재 (매수 판단 보조)</h3>
        <span className={`text-lg font-extrabold ${tone}`}>{t > 0 ? "+" : ""}{t} · {opp.opportunityLevel}</span>
      </div>
      {opp.positiveSignals.length > 0 && <><p className="mt-3 text-xs font-semibold text-emerald-600">호재 {Math.min(3, opp.positiveSignals.length)}건</p><div className="mt-1.5 space-y-1.5">{opp.positiveSignals.slice(0, 3).map((x, i) => <Sig key={i} x={x} />)}</div></>}
      {opp.negativeSignals.length > 0 && <><p className="mt-3 text-xs font-semibold text-red-500">악재 {Math.min(3, opp.negativeSignals.length)}건</p><div className="mt-1.5 space-y-1.5">{opp.negativeSignals.slice(0, 3).map((x, i) => <Sig key={i} x={x} />)}</div></>}
      {opp.positiveSignals.length === 0 && opp.negativeSignals.length === 0 && <p className="mt-3 text-sm text-slate-500">현재 기준 두드러진 호재·악재 신호가 없습니다.</p>}
      <p className="mt-3 text-[11px] text-slate-400">수집 방식 · 공공데이터 {opp.sourceCoverage.apiCoverage}% / AI요약 {opp.sourceCoverage.aiCoverage}% / 자체추정 {opp.sourceCoverage.mockCoverage}% · 적정가에는 반영하지 않고 매수 판단 보조 요소로만 사용합니다.</p>
      {opp.sourceCoverage.mockCoverage >= 50 && <p className="mt-1 text-[11px] font-medium text-amber-600">현재 호재·악재는 자체 추정 비중이 높아 참고용이며, 실데이터 연동 시 정밀해집니다.</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">호재·악재 분석은 공개자료·공공데이터·AI 요약을 바탕으로 한 참고 정보입니다. 개발·교통·정비사업 계획은 변경·지연·무산될 수 있으며 가격 상승 또는 하락을 보장하지 않습니다.</p>
    </div>
  );
}

function BuyResult({ r, f, onBack, onSave, saved, onNewSearch, onChangeArea, onHome, areaOptions, currentArea, onSelectArea, currentUserId }) {
  const [detailOpen, setDetailOpen] = useState(false);

  // Phase 3: 계약 전 체크리스트 상태 (localStorage 저장)
  const buyCheckKey = `vl_buycheck_${(f.complexName||"").replace(/\s/g,"")}`;
  const [buyCheckState, setBuyCheckState] = useState(() => {
    try { const s = localStorage.getItem(buyCheckKey); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  React.useEffect(() => {
    try { localStorage.setItem(buyCheckKey, JSON.stringify(buyCheckState)); } catch {}
  }, [buyCheckState, buyCheckKey]);

  const BUY_CHECKLIST = [
    { id:"deals",    text:"최신 실거래 확인",    sub:"국토부 실거래가 공개시스템",    href:"https://rt.molit.go.kr",   btn:"국토부 실거래" },
    { id:"registry", text:"등기사항 확인",        sub:"권리관계·근저당·가처분 등",    href:"https://www.iros.go.kr",   btn:"대법원 등기소" },
    { id:"building", text:"건축물대장 확인",      sub:"용도·위반건축물·변경이력",     href:"https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A09010&CappBizCD=14000000003", btn:"정부24" },
    { id:"loan",     text:"대출 가능 금액 확인",  sub:"DSR·LTV 기준 실제 한도",      href:null,                       btn:null },
    { id:"special",  text:"계약 특약 확인",       sub:"잔금일·하자·전입신고 특약",   href:null,                       btn:null },
  ];
  const buyAllChecked = BUY_CHECKLIST.every(c => buyCheckState[c.id]);
  const s = GS[r.buyGrade], cheap = r.gapRatio < 0;
  const tone = (sc) => (sc >= 80 ? "text-emerald-600" : sc >= 60 ? "text-amber-600" : "text-orange-600");
  const mrTone2 = (lv) => lv === "매우높음" ? "text-red-600" : lv === "높음" ? "text-orange-600" : lv === "보통" ? "text-amber-600" : lv === "평가 불가" ? "text-slate-500" : "text-emerald-600";
  const shockTone = { 낮음: "text-emerald-600", 보통: "text-amber-600", 높음: "text-orange-600", 매우높음: "text-red-600" }[r.shock?.level ?? "보통"];
  const hold0 = r.engineMode === "hold";
  const living = calculateLivingScore(f), supply = calculateSupplyRisk(f), pos = calculatePositiveFactors(f), neg = calculateNegativeFactors(f);
  const sp = scorePool({ fair: r.fairPrice, cur: Number(f.currentPrice) || r.fairPrice, jr: r.actualRatio || 0.5, redev: r.saleType === "redev", conf: r.confLabel });
  const lvTone = (v) => (v >= 80 ? "text-emerald-600" : v >= 65 ? "text-slate-700" : "text-orange-500");
  const riskTone = { 낮음: "text-emerald-600", 보통: "text-amber-600", 높음: "text-red-500" };
  const bd = analyzeBuyerDecision(r, f);
  const isSpec = bd.isSpecial;

  // ── 등급 라벨 — 가격 평가형 (투자 권유 표현 제거) ──
  // Phase 3: 알파벳 등급 제거, 쉬운 표현 사용
  const gradeHero = {
    A: { label: "가격 매력 있음",   sub: "적정가보다 크게 낮은 수준",      bg: "bg-emerald-600" },
    B: { label: "가격 매력 있음",   sub: "적정가보다 낮은 수준",            bg: "bg-emerald-500" },
    C: { label: "적정 범위",        sub: "적정가 수준",                      bg: "bg-blue-600"    },
    D: { label: "가격 부담 있음",   sub: "적정가보다 높은 편 — 추가 확인 필요", bg: "bg-orange-500" },
    E: { label: "가격 부담 있음",   sub: "적정가보다 크게 높은 수준",       bg: "bg-red-600"     },
    보류: { label: "데이터 부족",   sub: "거래 데이터 부족으로 분석 제한",   bg: "bg-slate-400"  },
  }[r.buyGrade] || { label: r.buyGrade, sub: "", bg: "bg-slate-400" };

  // ── AI 한줄 의견 ──
  function aiSummary() {
    if (hold0) return ["현재 데이터로는 정확한 판단이 어렵습니다.", "실거래 데이터를 보강 후 다시 분석하세요."];
    const gp = Math.abs(r.gapRatio * 100).toFixed(1);
    const line1 = cheap
      ? `현재 가격은 적정가 대비 ${gp}% 낮은 수준입니다.`
      : `현재 가격은 적정가 대비 ${gp}% 높은 수준입니다.`;
    let line2;
    if (isSpec && r.saleType === "redev") line2 = "재건축 기대가 반영된 단지로, 실사용 가치와의 괴리를 고려하세요.";
    else if (r.buyGrade === "A" || r.buyGrade === "B") line2 = `${won(r.negotiation?.start || 0)} 이하에서 협상 시 가격 메리트가 있습니다.`;
    else if (r.buyGrade === "C") line2 = `협상을 통해 ${won(r.negotiation?.start || 0)} 수준을 검토해볼 수 있습니다.`;
    else if (r.buyGrade === "D") {
      const _ris = isRisingMarket(f.region || "기타");
      const _tr  = getRegionTrend(f.region || "기타");
      line2 = _ris
        ? `지역 시장 상승 중(${_tr > 0 ? "+" : ""}${_tr.toFixed(1)}%)이지만 고평가 수준입니다. 보유 리스크를 점검하세요.`
        : `적정가 대비 다소 높아 보유 리스크가 있습니다. 가격 조정 후 재검토를 고려해볼 수 있습니다.`;
    } else {
      const _ris = isRisingMarket(f.region || "기타");
      const _tr  = getRegionTrend(f.region || "기타");
      line2 = _ris
        ? `상승장(${_tr > 0 ? "+" : ""}${_tr.toFixed(1)}%)이지만 가격 부담이 큽니다. 신중한 접근이 필요합니다.`
        : `적정가 대비 가격 부담이 크며, 시세 조정을 기다리는 것도 방법입니다.`;
    }
    return [line1, line2];
  }
  const [aiLine1, aiLine2] = aiSummary();

  // ── AI 판단 근거 체크리스트 생성 ──
  function buildReasonChecks() {
    const checks = [];
    if (!hold0) {
      const gp = Math.abs(r.gapRatio * 100).toFixed(1);
      if (cheap) checks.push({ ok: true,  text: `적정가 대비 ${gp}% 저평가` });
      else       checks.push({ ok: false, text: `적정가 대비 ${gp}% 고평가` });
    }
    const jr = r.actualRatio;
    if (jr != null) {
      if (jr >= 0.55)      checks.push({ ok: true,  text: `전세가율 양호 (${(jr*100).toFixed(0)}%)` });
      else if (jr >= 0.40) checks.push({ ok: null,  text: `전세가율 보통 (${(jr*100).toFixed(0)}%)` });
      else                 checks.push({ ok: false, text: `전세가율 낮음 (${(jr*100).toFixed(0)}%) — 투자수요 의존` });
    }
    if (r.jeonseUsed >= 5) checks.push({ ok: true,  text: `전세 실거래 ${r.jeonseUsed}건 — 표본 충분` });
    else if (r.jeonseUsed >= 3) checks.push({ ok: null, text: `전세 실거래 ${r.jeonseUsed}건 — 표본 보통` });
    else checks.push({ ok: false, text: `전세 실거래 ${r.jeonseUsed}건 — 표본 부족` });
    const shk = r.shock?.level;
    if (shk === "낮음")    checks.push({ ok: true,  text: "시장충격 위험 낮음" });
    else if (shk === "보통") checks.push({ ok: null, text: "시장충격 보통 수준" });
    else                   checks.push({ ok: false, text: `시장충격 ${shk} — 가격 반영 지연 가능` });
    if (supply.level === "낮음") checks.push({ ok: true,  text: "공급 부담 적음" });
    else if (supply.level === "보통") checks.push({ ok: null, text: "공급 보통 수준" });
    else checks.push({ ok: false, text: "공급 부담 높음 — 입주물량 주의" });
    if (isSpec && r.saleType === "redev") checks.push({ ok: null, text: "재건축 기대가 시세에 반영됨" });
    return checks;
  }
  const reasonChecks = buildReasonChecks();

  // ── 매수 시나리오 ──
  function buildScenarios() {
    if (hold0 || !r.fairPrice) return [];
    const cur = Number(f.currentPrice) || 0;
    const fair = r.fairPrice;
    const gradeOf = (gap) => gap <= -0.15 ? "A" : gap <= -0.05 ? "B" : gap <= 0.05 ? "C" : gap <= 0.15 ? "D" : "E";
    const labelOf = (g) => ({ A:"매우 저평가", B:"저평가", C:"적정 가격", D:"고평가 주의", E:"고평가" }[g] || g);
    const colorOf = (g) => ({ A:"text-emerald-600", B:"text-emerald-500", C:"text-amber-600", D:"text-orange-500", E:"text-red-500" }[g] || "text-slate-600");
    const scenarios = [];
    // 현재가
    const g0 = gradeOf((cur - fair) / fair);
    scenarios.push({ price: cur, label: "현재 매물가", grade: g0, gradeLabel: labelOf(g0), color: colorOf(g0), highlight: false });
    // 협상 -2%
    const p1 = Math.round(cur * 0.98 / 100) * 100;
    const g1 = gradeOf((p1 - fair) / fair);
    scenarios.push({ price: p1, label: "협상 -2%", grade: g1, gradeLabel: labelOf(g1), color: colorOf(g1), highlight: g1 !== g0 });
    // 적정가
    const g2 = gradeOf(0);
    scenarios.push({ price: Math.round(fair), label: "AI 적정가", grade: g2, gradeLabel: labelOf(g2), color: colorOf(g2), highlight: true });
    // 안전매수가
    if (r.safetyPrice && r.safetyPrice !== fair) {
      const g3 = gradeOf((r.safetyPrice - fair) / fair);
      scenarios.push({ price: r.safetyPrice, label: "보수적 참고가", grade: g3, gradeLabel: labelOf(g3), color: "text-emerald-600", highlight: false });
    }
    return scenarios;
  }
  const scenarios = buildScenarios();

  // ── 위험요인 ──
  function buildRiskItems() {
    const risks = [];
    if (r.jeonseUsed < 3) risks.push({ label: "거래 표본 부족", desc: "최근 거래가 적어 분석 오차가 커질 수 있습니다. 참고용으로 활용하세요." });
    if (supply.level === "높음") risks.push({ label: "입주 물량 영향", desc: "향후 입주 예정 물량에 따라 가격 변동 가능성이 있습니다." });
    if (r.saleType === "redev") risks.push({ label: "재건축 단지 특성", desc: "재건축 기대가 반영된 단지입니다. 사업 지연·분담금 리스크를 함께 고려하세요." });
    if (r.actualRatio != null && r.actualRatio < 0.4) risks.push({ label: "전세가율 낮음", desc: "실거주 수요보다 투자 수요 비중이 높은 단지입니다." });
    if (r.shock?.level === "높음" || r.shock?.level === "매우높음") risks.push({ label: "시장 변동성 주의", desc: "현재 시장 상황에 따라 가격 반영이 지연될 수 있습니다." });
    if (bd.marketRisk?.level === "높음" || bd.marketRisk?.level === "매우높음") risks.push({ label: "시장 변동 가능성 높음", desc: "프리미엄·공급·정책 등 복합 요인으로 가격 변동 가능성이 있습니다." });
    if (r.dataConf < 50) risks.push({ label: "거래 표본 부족", desc: "거래 데이터가 적어 분석 결과가 제한적입니다. 참고용으로 활용하세요." });
    if (neg.list?.[0]) risks.push({ label: "지역 특성 참고", desc: neg.list[0] });
    // 중복 label 제거
    const seen = new Set();
    return risks.filter(r => { if (seen.has(r.label)) return false; seen.add(r.label); return true; }).slice(0, 4);
  }
  const riskItems = buildRiskItems();

  // ── 프리미엄형 표현 ──
  function premiumDesc() {
    if (!isSpec) return null;
    const mc = bd.mc;
    const pct_ = Math.round(mc.premiumRatio * 100);
    const types = [];
    if (mc.premiumBreakdown.redevelopmentPremium > 0) types.push("재건축");
    if (mc.premiumBreakdown.schoolPremium > 0) types.push("학군");
    if (mc.premiumBreakdown.scarcityPremium > 0) types.push("희소성");
    if (mc.premiumBreakdown.locationPremium > 0) types.push("입지");
    const typeStr = types.length ? types.join("·") : "시장";
    return `현재 시세에는 ${typeStr} 프리미엄이 크게 반영되어 있습니다. 전세가 기준 적정가보다 ${pct_}% 높은 수준에 거래되고 있습니다.`;
  }

  // ── 데이터 신뢰도 + 로그 write ──
  const trust = computeDataTrust(r, f.deals, f.saleDeals);
  React.useEffect(() => {
    writeSearchLog({
      region:       f.region,
      dong:         f.dong,
      complex_name: f.complexName,
      area_excl:    f.areaExclusive || null,
      success:      r.engineMode !== 'hold',
      fail_reason:  r.engineMode === 'hold' ? r.holdReason : null,
      data_source:  f.dataSource || 'unknown',
      sale_count:   r.saleUsed  || 0,
      rent_count:   r.jeonseUsed || 0,
      jeonse_ratio: r.actualRatio || null,
      engine_mode:  r.engineMode,
      buy_grade:    r.buyGrade,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── 결론 카드 (최상단 고정) ── */}
      <div className="mb-4 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
        <div className="px-5 py-4 text-white" style={{ backgroundColor: NAVY }}>
          <div className="flex items-start justify-between">
            <p className="text-xs text-slate-300">{f.complexName} · {f.dong}{Number(f.areaExclusive) > 0 ? ` 전용 ${f.areaExclusive}㎡` : ""}</p>
            {!hold0 && <GradeInfoPopup />}
          </div>
          {hold0 ? (
            <div className="mt-3">
              <p className="text-lg font-extrabold text-amber-300">데이터 부족 — 분석 어려움</p>
              <p className="mt-1 text-xs text-slate-300">{r.holdReason}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] text-slate-200">다른 면적 선택</span>
                <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] text-slate-200">KB시세 직접 입력</span>
              </div>
            </div>
          ) : (
            <>
              {/* Phase 3: 가격 판단 — 알파벳 등급 없이 쉬운 표현 */}
              <div className="mt-2">
                <p className="text-[11px] text-slate-400">현재 가격 판단</p>
                <p className={`text-2xl font-extrabold ${r.buyGrade === 'A' || r.buyGrade === 'B' ? 'text-emerald-400' : r.buyGrade === 'D' || r.buyGrade === 'E' ? 'text-red-400' : 'text-white'}`}>
                  {gradeHero.label}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  {gradeHero.sub}
                </p>
              </div>
              {/* 자금 판단 — 입력 시에만 표시 */}
              {bd.hasFundInput && (
                <div className="mt-2 rounded-xl bg-white/10 px-3 py-2">
                  <p className="text-[10px] text-slate-300">매수 판단</p>
                  <p className="text-sm font-bold text-white">{bd.finalLabel}</p>
                </div>
              )}
            </>
          )}
        </div>
        {/* 핵심 수치 3개 */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">현재가</p>
            <p className="mt-0.5 text-sm font-extrabold text-slate-900">{won(Number(f.currentPrice))}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">적정 범위</p>
            <p className="mt-0.5 text-xs font-bold" style={{ color: NAVY }}>
              {hold0 ? "—" : `${won(Math.round(r.fairPrice * 0.95))}~${won(Math.round(r.fairPrice * 1.05))}`}
            </p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">{r.gapRatio < 0 ? "저평가" : "고평가"}</p>
            <p className={`mt-0.5 text-sm font-extrabold ${r.gapRatio < -0.03 ? "text-emerald-600" : r.gapRatio > 0.03 ? "text-red-500" : "text-slate-700"}`}>
              {hold0 ? "—" : pct(r.gapRatio)}
            </p>
          </div>
        </div>
        {/* 액션 문구 */}
        {!hold0 && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-600">
            {bd.action}
          </div>
        )}
        {/* 자금 미입력 안내 */}
        {!hold0 && !bd.hasFundInput && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-[11px] text-slate-400">
            자금 정보를 입력하면 구매 가능 여부를 확인할 수 있습니다.
          </div>
        )}
      </div>

      {/* ── 자연어 한줄 결론 ── */}
      {!hold0 && (
        <div className={`mb-4 rounded-2xl px-5 py-4 ring-1 ${cheap ? "bg-emerald-50 ring-emerald-200" : r.buyGrade === "C" ? "bg-slate-50 ring-slate-200" : "bg-red-50 ring-red-200"}`}>
          <p className={`text-sm font-bold ${cheap ? "text-emerald-800" : r.buyGrade === "C" ? "text-slate-700" : "text-red-800"}`}>
            {aiLine1}
          </p>
          <p className={`mt-1 text-xs leading-relaxed ${cheap ? "text-emerald-700" : r.buyGrade === "C" ? "text-slate-500" : "text-red-700"}`}>
            {aiLine2}
          </p>
        </div>
      )}
      {hold0 && (
        <div className="mb-4 rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-200">
          <p className="text-sm font-bold text-slate-700">데이터 부족으로 신뢰도 있는 분석이 어렵습니다</p>
          <p className="mt-1 text-xs text-slate-500">{r.holdReason}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] text-slate-600">다른 면적 선택</span>
            <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] text-slate-600">KB시세 직접 입력</span>
          </div>
        </div>
      )}

      {/* ── 왜 이런 결과가 나왔나요? ── */}
      {!hold0 && (
        <div className="mb-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-bold text-slate-700">왜 이런 결과가 나왔나요?</p>
          <div className="space-y-2">
            {reasonChecks.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className={`mt-0.5 flex-shrink-0 text-base font-bold ${c.ok === true ? "text-emerald-500" : c.ok === false ? "text-red-400" : "text-amber-400"}`}>
                  {c.ok === true ? "✓" : c.ok === false ? "✗" : "△"}
                </span>
                <div>
                  <span className={`text-sm ${c.ok === false ? "text-slate-400" : "text-slate-700"}`}>{c.text}</span>
                  {c.ok === true && <span className="ml-1.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">좋음</span>}
                  {c.ok === null && <span className="ml-1.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">보통</span>}
                  {c.ok === false && <span className="ml-1.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">주의</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI 참고 안내 ── */}
      <AiNotice />

      {/* ── 데이터 신뢰도 ── */}
      <div className="mb-4"><DataTrustBadge trust={trust} /></div>

      <BuySaveBtn r={r} f={f} bd={bd} onBack={onBack} onSave={onSave} saved={saved} uid={currentUserId} />

      <InputWarnings r={r} f={f} />

      {r.dataWarnings && r.dataWarnings.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">데이터 부족 — 분석 신뢰 낮음</p>
          {r.dataWarnings.map((w, i) => (
            <p key={i} className="mt-1 text-xs text-amber-700">· {w}</p>
          ))}
          <p className="mt-1.5 text-[11px] text-amber-600">실거래를 보강하거나 KB시세를 입력하면 정확도가 높아집니다.</p>
        </div>
      )}

      {/* ── Hero: 가격 평가 등급 + 핵심 4개 ── */}
      <div className="mb-4 overflow-hidden rounded-3xl shadow-lg">
        <div className={`px-6 py-6 text-white ${gradeHero.bg}`}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-white/70">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}</p>
            <GradeInfoPopup />
          </div>
          <p className="mt-2 text-4xl font-extrabold">{r.gradeLabel}</p>
          <p className="mt-0.5 text-sm text-white/60">ValueLens {r.buyGrade}등급 · {gradeHero.sub}</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 bg-white">
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">AI 적정가</p>
            <p className="mt-1 text-xl font-extrabold" style={{ color: NAVY }}>{hold0 ? "—" : won(r.fairPrice)}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">현재 매물가</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{won(Number(f.currentPrice))}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">{cheap ? "저평가율" : "고평가율"}</p>
            <p className={`mt-1 text-xl font-extrabold ${cheap ? "text-emerald-600" : "text-red-500"}`}>{hold0 ? "보류" : pct(r.gapRatio)}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">추천 협상가</p>
            <p className="mt-1 text-base font-extrabold text-slate-900">{hold0 ? "—" : won(r.negotiation?.start || 0)}</p>
          </div>
        </div>
      </div>

      {/* ── [1] 프리미엄 설명 (특수시장만) ── */}
      {isSpec && premiumDesc() && (
        <div className="mb-4 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
          <p className="text-xs font-bold text-amber-800 mb-1">재건축·학군·희소성 영향 단지 안내</p>
          <p className="text-xs leading-relaxed text-amber-700">
            재건축 기대감 또는 희소성으로 인해 매매가가 전세가보다 높게 형성된 단지입니다.<br />
            현재 분석은 프리미엄 요인을 반영하여 계산되었습니다.
          </p>
          <p className="mt-2 text-xs text-amber-600">{premiumDesc()}</p>
        </div>
      )}

      {/* ── [3] 가격 시나리오 ── */}
      {scenarios.length > 0 && (
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-bold text-slate-700">가격별 평가</p>
          <p className="mb-3 text-xs text-slate-400">같은 단지를 얼마에 사느냐에 따라 가격 평가가 달라집니다.</p>
          <div className="space-y-2">
            {scenarios.map((s, i) => (
              <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 ${s.highlight ? "bg-slate-50 ring-1 ring-slate-200" : "bg-white"}`}>
                <div>
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">{won(s.price)}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${s.color}`}>{s.grade}등급</span>
                  <p className={`text-xs ${s.color}`}>{s.gradeLabel}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">※ 가격 평가는 AI 적정가 기준이며, 실제 매수 결정은 자금·시장 상황 등을 종합적으로 고려하세요.</p>
        </div>
      )}

      {/* ── [4] 최근 실거래 ── */}
      {(r.jeonseCalc || r.saleCalc) && (() => {
        const jDeals = (f.deals || []).filter(d => d.price && d.ym).slice(0, 4);
        const sDeals = (f.saleDeals || []).filter(d => d.price && d.ym).slice(0, 4);
        if (!jDeals.length && !sDeals.length) return null;
        return (
          <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="mb-3 text-sm font-bold text-slate-700">최근 실거래</p>
            {sDeals.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">매매 실거래</p>
                <div className="space-y-1.5">
                  {sDeals.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-400">{d.ym}</span>
                      <span className="font-bold text-slate-800">{won(d.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {jDeals.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">전세 실거래</p>
                <div className="space-y-1.5">
                  {jDeals.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-400">{d.ym}</span>
                      <span className="font-bold text-slate-800">{won(d.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-2 text-[11px] text-slate-400">AI 조회 기준 · 동일 단지 실거래가 (정제 전 원본)</p>
          </div>
        );
      })()}

      {/* ── [5] 위험요인 ── */}
      {riskItems.length > 0 && (
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-bold text-slate-700">확인이 필요한 사항</p>
          <div className="space-y-3">
            {riskItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 text-amber-400">⚠</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── [6] 실거주 · 투자 점수 ── */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 실거주 적합도 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-400">실거주 적합도</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={`text-lg font-extrabold ${living.total >= 75 ? "text-emerald-600" : living.total >= 60 ? "text-amber-600" : "text-red-500"}`}>
              {living.total >= 75 ? "좋음" : living.total >= 60 ? "보통" : "주의"}
            </p>
            <p className="text-xs text-slate-400">{living.total} / 100</p>
          </div>
          {/* 항목별 설명형 */}
          <div className="mt-2 space-y-1">
            {[
              { label: "교통 접근성", score: living.items.교통,
                good: "교통 접근성 양호", mid: "교통 접근성 보통", bad: "교통 접근성 다소 불편" },
              { label: "학군",       score: living.items.학군,
                good: "학군 경쟁력 양호", mid: "학군 경쟁력 보통", bad: "학군 경쟁력 낮음" },
              { label: "생활 편의",  score: living.items.상권,
                good: "생활 편의시설 풍부", mid: "생활 편의시설 보통", bad: "생활 편의시설 다소 부족" },
              { label: "건물 연식",  score: living.items.연식,
                good: "건물 연식 양호", mid: "건물 연식 보통", bad: "건물 연식 다소 오래됨" },
            ].map(({ label, score, good, mid, bad }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className={score >= 80 ? "text-emerald-600" : score >= 65 ? "text-amber-600" : "text-red-400"}>
                  {score >= 80 ? good : score >= 65 ? mid : bad}
                </span>
                <span className={`ml-2 flex-shrink-0 font-semibold ${score >= 80 ? "text-emerald-600" : score >= 65 ? "text-amber-600" : "text-red-400"}`}>
                  {score >= 80 ? "양호" : score >= 65 ? "보통" : "낮음"}
                </span>
              </div>
            ))}
          </div>
          <p className={`mt-2 text-[11px] leading-relaxed border-t border-slate-100 pt-2 ${living.total >= 75 ? "text-emerald-600" : living.total >= 60 ? "text-amber-600" : "text-slate-400"}`}>
            → {living.total >= 75 ? "실거주 환경이 전반적으로 양호합니다." : living.total >= 60 ? "실거주에는 무난한 수준입니다." : "실거주 환경이 다소 아쉬운 편입니다."}
          </p>
        </div>

        {/* 가격 매력도 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-400">가격 매력도</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={`text-lg font-extrabold ${sp.up >= 65 ? "text-emerald-600" : sp.up >= 40 ? "text-amber-600" : "text-red-500"}`}>
              {sp.up >= 65 ? "좋음" : sp.up >= 40 ? "보통" : "주의"}
            </p>
            <p className="text-xs text-slate-400">{sp.up} / 100</p>
          </div>
          {/* 항목별 설명형 */}
          <div className="mt-2 space-y-1 text-xs">
            {/* 가격 위치 */}
            <div className="flex items-center justify-between">
              <span className={sp.undervalue > 0.03 ? "text-emerald-600" : sp.undervalue < -0.03 ? "text-red-400" : "text-amber-600"}>
                {sp.undervalue > 0.03
                  ? `AI 적정가보다 ${(sp.undervalue * 100).toFixed(1)}% 저렴`
                  : sp.undervalue < -0.03
                    ? `AI 적정가보다 ${(Math.abs(sp.undervalue) * 100).toFixed(1)}% 높음`
                    : "AI 적정가 수준"}
              </span>
              <span className={`ml-2 flex-shrink-0 font-semibold ${sp.undervalue > 0.03 ? "text-emerald-600" : sp.undervalue < -0.03 ? "text-red-400" : "text-amber-600"}`}>
                {sp.undervalue > 0.03 ? "저평가" : sp.undervalue < -0.03 ? "고평가" : "적정"}
              </span>
            </div>
            {/* 협상 여지 */}
            <div className="flex items-center justify-between">
              <span className={sp.undervalue < -0.03 ? "text-red-400" : "text-amber-600"}>
                {sp.undervalue > 0.05 ? "가격 협상 여지 있음" : sp.undervalue < -0.03 ? "협상 여지는 제한적일 수 있습니다" : "협상 시 가격 조정 가능"}
              </span>
              <span className={`ml-2 flex-shrink-0 font-semibold ${sp.undervalue > 0.05 ? "text-emerald-600" : sp.undervalue < -0.03 ? "text-red-400" : "text-amber-600"}`}>
                {sp.undervalue > 0.05 ? "유리" : sp.undervalue < -0.03 ? "제한" : "보통"}
              </span>
            </div>
            {/* 안전 매수가 대비 */}
            {r.safetyPrice > 0 && Number(r.fairPrice) > 0 && (() => {
              const cur = Number(r.fairPrice || 0);
              const safe = Number(r.safetyPrice || 0);
              const aboveSafe = cur > safe;
              return (
                <div className="flex items-center justify-between">
                  <span className={aboveSafe ? "text-red-400" : "text-emerald-600"}>
                    {aboveSafe ? "보수적 참고가 대비 부담 있음" : "보수적 참고가 이하 — 여유 있음"}
                  </span>
                  <span className={`ml-2 flex-shrink-0 font-semibold ${aboveSafe ? "text-red-400" : "text-emerald-600"}`}>
                    {aboveSafe ? "주의" : "양호"}
                  </span>
                </div>
              );
            })()}
            {/* 가격 변동 가능성 */}
            <div className="flex items-center justify-between">
              <span className={sp.down < 40 ? "text-emerald-600" : sp.down < 65 ? "text-amber-600" : "text-red-400"}>
                {sp.down < 40 ? "가격 변동 가능성 낮음" : sp.down < 65 ? "가격 변동 가능성 보통" : "가격 변동 가능성 있음"}
              </span>
              <span className={`ml-2 flex-shrink-0 font-semibold ${sp.down < 40 ? "text-emerald-600" : sp.down < 65 ? "text-amber-600" : "text-red-400"}`}>
                {sp.down < 40 ? "낮음" : sp.down < 65 ? "보통" : "높음"}
              </span>
            </div>
          </div>
          <p className={`mt-2 text-[11px] leading-relaxed border-t border-slate-100 pt-2 ${sp.up >= 65 ? "text-emerald-600" : sp.up >= 40 ? "text-amber-600" : "text-red-400"}`}>
            → {sp.up >= 65 ? "가격 경쟁력이 높은 편입니다." : sp.up >= 40 ? "가격 메리트는 보통 수준입니다." : "가격 부담이 있어 신중한 접근이 필요합니다."}
          </p>
        </div>
      </div>

      {/* ── 매수 판단 카드 (상세) ── */}
      <div className="mb-4"><BuyerDecisionCard bd={bd} r={r} f={f} /></div>

      {/* ── 호재·악재 ── */}
      <div className="mb-4"><OpportunityCard opp={bd.opportunity} /></div>

      {/* ── 상세분석 접기/펼치기 ── */}
      <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => setDetailOpen(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-sm font-bold text-slate-700">상세 분석 보기</span>
          <span className="text-xs text-slate-400">{detailOpen ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
        {detailOpen && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-5">

            {/* 프리미엄 구성 */}
            {isSpec && (
              <div>
                <p className="mb-2 text-xs font-bold text-orange-700">프리미엄 구성 (추정)</p>
                <div className="grid grid-cols-2 gap-px bg-orange-100 overflow-hidden rounded-xl">
                  {[["학군", bd.mc.premiumBreakdown.schoolPremium], ["재건축", bd.mc.premiumBreakdown.redevelopmentPremium], ["희소성", bd.mc.premiumBreakdown.scarcityPremium], ["입지", bd.mc.premiumBreakdown.locationPremium]].map(([l, v]) => (
                    <div key={l} className="bg-orange-50 px-4 py-3 flex justify-between text-sm"><span className="text-slate-500">{l}</span><span className="font-bold text-amber-700">{won(v)}</span></div>
                  ))}
                </div>
              </div>
            )}

            {/* 재건축 단계 */}
            {isSpec && bd.reconstructionStage && bd.reconstructionStage !== "none" && (
              <div>
                <p className="mb-1 text-xs font-bold text-slate-600">재건축 단계</p>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-700">{RECON[bd.reconstructionStage].label}</span>
                  <span className="text-sm font-bold" style={{ color: NAVY }}>{bd.stageScore}점</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${bd.stageScore}%`, backgroundColor: NAVY }} /></div>
              </div>
            )}

            {/* 적정가 산출 근거 */}
            {!hold0 && r.basis && r.basis.steps.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">적정가 산출 근거</p>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <ol className="space-y-1 text-xs text-slate-600">{r.basis.steps.map((t, i) => <li key={i} className="flex gap-1.5"><span className="text-slate-400">{i < r.basis.steps.length - 1 ? "↓" : "="}</span><span>{t}</span></li>)}</ol>
                </div>
              </div>
            )}

            {/* 사용 거래 수 / 제외 거래 수 */}
            {(r.jeonseCalc || r.saleCalc) && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">데이터 표본</p>
                <div className="grid grid-cols-2 gap-2">
                  {r.jeonseCalc && <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs"><p className="text-slate-500">전세 표본</p><p className="mt-1 font-bold text-slate-800">사용 {r.jeonseCalc.used}건 · 제외 {r.jeonseCalc.excluded}건</p></div>}
                  {r.saleCalc && <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs"><p className="text-slate-500">매매 표본</p><p className="mt-1 font-bold text-slate-800">사용 {r.saleCalc.used}건 · 제외 {r.saleCalc.excluded}건</p></div>}
                </div>
              </div>
            )}

            {/* KB 가중치 */}
            {(r.jeonseCalc || r.saleCalc) && (
              <div className="text-xs text-slate-400">
                KB시세 가중치 · 전세 {r.jeonseCalc ? Math.round((r.jeonseCalc.kbWeight||0)*100)+"%" : "—"} / 매매 {r.saleCalc ? Math.round((r.saleCalc.kbWeight||0)*100)+"%" : "—"}
              </div>
            )}

            {/* 시장 위험도 */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">시장 위험도</span>
              <span className={`font-bold ${mrTone2(bd.marketRisk.level)}`}>{bd.marketRisk.level}</span>
            </div>

            {/* 시장충격 */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">시장충격 위험도</span>
              <span className={`font-bold ${shockTone}`}>{r.shock?.level ?? "보통"} <span className="text-xs font-normal text-slate-400">(지연 약 {r.shock?.lag ?? 3}개월)</span></span>
            </div>

          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>AI</span><h3 className="text-base font-semibold text-slate-800">AI 분석 설명</h3></div>
        <p className="text-base font-medium text-slate-900">{r.engineMode === "hold" ? `${r.headline} (등급 보류)` : isSpec ? `이 단지는 특수시장(${bd.premiumLevel})으로 분류되어 가격 등급(${r.buyGrade})은 참고용이며, 최종 판단은 상단 매수판단 카드를 따릅니다.` : `${r.headline} 매수등급은 ${r.buyGrade}(${r.gradeLabel})입니다.`}</p>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600"><p>{r.explain?.valuation}</p><p>{r.explain?.review}</p></div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="mb-2 text-xs font-semibold text-slate-500">매수 시 주의할 점</p><ul className="space-y-1.5 text-sm text-slate-600"><li>· 입력한 KB시세·전세가의 정확도가 결과에 직접 영향을 줍니다.</li><li>· 동일 단지라도 층·향·동·수리 상태에 따라 실제 가격은 달라질 수 있습니다.</li><li>· 본 결과는 참고용이며 최종 판단은 현장 확인 후 본인이 내려야 합니다.</li></ul></div>
      </div>

      {/* ── PDF 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const gp = Math.abs(r.gapRatio * 100).toFixed(1);
            const gradeLabel = { A:"매우 저평가", B:"저평가", C:"적정 가격", D:"고평가 주의", E:"고평가", 보류:"판단 보류" }[r.buyGrade] || r.buyGrade;
            const riskLines = (() => {
              const risks = [];
              if (r.jeonseUsed < 3) risks.push("거래 표본 부족");
              if (r.saleType === "redev") risks.push("재건축 기대가 반영");
              if (r.actualRatio != null && r.actualRatio < 0.4) risks.push("전세가율 낮음");
              if (r.shock?.level === "높음" || r.shock?.level === "매우높음") risks.push(`시장충격 ${r.shock.level}`);
              return risks.length ? risks.map(t => `    · ${t}`).join("\n") : "    · 특이 위험요인 없음";
            })();
            const scenarioLines = (() => {
              const cur = Number(f.currentPrice) || 0;
              const fair = r.fairPrice;
              if (!fair) return "";
              const gradeOf = (gap) => gap <= -0.15 ? "A(매우 저평가)" : gap <= -0.05 ? "B(저평가)" : gap <= 0.05 ? "C(적정 가격)" : gap <= 0.15 ? "D(고평가 주의)" : "E(고평가)";
              return [
                `    현재가 ${won(cur)} → ${gradeOf((cur-fair)/fair)}`,
                `    협상 -2% ${won(Math.round(cur*0.98/100)*100)} → ${gradeOf((Math.round(cur*0.98/100)*100-fair)/fair)}`,
                `    AI 적정가 ${won(Math.round(fair))} → C(적정 가격)`,
              ].join("\n");
            })();
            const text = `ValueLens 가격평가 리포트
${"=".repeat(40)}
발행일: ${date}
단지: ${f.complexName || "—"} ${f.dong ? `· ${f.dong}` : ""} ${Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}

[가격 평가 결과]
  가격 평가 등급: ${r.buyGrade}등급 · ${gradeLabel}
  현재 매물가: ${won(Number(f.currentPrice))}
  AI 적정가: ${r.engineMode === "hold" ? "판단 보류" : won(r.fairPrice)}
  ${cheap ? "저평가율" : "고평가율"}: ${r.engineMode === "hold" ? "보류" : `${gp}%`}
  추천 협상가: ${r.engineMode === "hold" ? "—" : won(r.negotiation?.start || 0)}

[AI 의견]
  ${cheap ? `현재 가격은 적정가 대비 ${gp}% 낮은 수준입니다.` : `현재 가격은 적정가 대비 ${gp}% 높은 수준입니다.`}
  ${r.buyGrade === "A" || r.buyGrade === "B" ? `${won(r.negotiation?.start || 0)} 이하에서 협상 시 가격 메리트가 있습니다.` : r.buyGrade === "C" ? `협상을 통해 ${won(r.negotiation?.start || 0)} 수준을 검토해볼 수 있습니다.` : `가격 조정 후 재검토를 고려해볼 수 있습니다.`}

[가격별 평가 시나리오]
${scenarioLines}

[확인이 필요한 위험요인]
${riskLines}

${"=".repeat(40)}
이 리포트를 활용하기 전 확인하세요
□ 공인중개사에게 현장 시세·매물 상태를 확인했나요?
□ 세무사에게 취득세·양도세 상담을 받았나요?
□ 은행·금융기관에서 실제 대출 가능액을 확인했나요?
□ 등기부등본·권리관계·압류 여부를 확인했나요?
□ 실제 현장 방문 및 주변 시세를 직접 확인했나요?

위 항목 확인 후 최종 결정하시기 바랍니다.
본 리포트는 AI 가격 적정성 참고자료이며
매수 권유·투자자문·감정평가서가 아닙니다.
본인 판단 하에 결정하시기 바랍니다.

━━━━━━━━━━━━━━━━━━
ValueLens 이용 전 확인사항

본 결과는 공공데이터, 사용자 입력,
AI 분석을 기반으로 생성된
가격평가 참고자료입니다.

감정평가서가 아닙니다.
투자자문이 아닙니다.
매수·매도 권유가 아닙니다.

실제 거래 전에는
공인중개사, 세무사, 금융기관 등
전문가와 확인하시기 바랍니다.
━━━━━━━━━━━━━━━━━━
Powered by ValueLens

[분석 주의사항 — ValueLens 엔진 v3]
본 리포트는 국토부 실거래 및 입력 데이터를 바탕으로 한 참고용 분석입니다.
ValueLens의 적정가는 보장 가격이나 감정평가액이 아니며,
매수·매도 결정은 본인 판단 하에 진행하시기 바랍니다.
특히 데이터 부족, 전세가율 이상치, 재건축·학군·희소성 영향 단지는
분석 신뢰도가 낮을 수 있습니다.`;
            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ValueLens_${f.complexName || "가격평가"}_${date.replace(/\./g, "")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">가격평가 리포트 저장</p>
            <p className="mt-0.5 text-xs text-slate-400">단지명·등급·AI 적정가·시나리오·위험요인 포함 · 계산식 제외</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>

      {/* ── 하단 네비게이션 CTA ── */}
      <div className="mt-6 space-y-3">
        {/* 같은 단지 다른 면적 */}
        {areaOptions && areaOptions.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-400">같은 단지 다른 면적</p>
            <div className="flex flex-wrap gap-2">
              {(areaOptions || []).filter(o => o && Number(o.areaSqm) > 0 && String(o.areaSqm) !== String(currentArea)).map((o, i) => (
                <button key={i}
                  onClick={() => onSelectArea && onSelectArea(Number(o.areaSqm))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 active:bg-slate-100">
                  전용 {o.areaSqm}㎡ ({Math.round(Number(o.areaSqm) / 3.3058)}평)
                </button>
              ))}
            </div>
          </div>
        )}\n        {/* 저장 버튼 */}
        {/* Phase 3: 계약 전 체크리스트 */}
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #bfdbfe",
          marginBottom:12, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px 10px", borderBottom:"1px solid #e8e4df" }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#1e40af", margin:"0 0 2px" }}>
              📋 계약 전 확인 체크리스트
            </p>
            <p style={{ fontSize:11, color:"#94a3b8", margin:0 }}>
              {BUY_CHECKLIST.filter(c=>buyCheckState[c.id]).length}/{BUY_CHECKLIST.length} 완료
            </p>
          </div>
          {BUY_CHECKLIST.map((item, idx) => {
            const done = !!buyCheckState[item.id];
            return (
              <div key={item.id} style={{ display:"flex", alignItems:"center", gap:10,
                padding:"10px 14px", borderBottom: idx < BUY_CHECKLIST.length-1 ? "1px solid #e8e4df" : "none",
                background: done ? "#f0fdf4" : "#fff", transition:"background 0.2s" }}>
                <button onClick={() => setBuyCheckState(p => ({...p, [item.id]:!p[item.id]}))}
                  style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                    border: done ? "none" : "2px solid #e8e4df",
                    background: done ? "#2F6F4F" : "transparent",
                    display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:0 }}>
                  {done && <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 6.5l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>}
                </button>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight: done ? 400 : 600, color: done ? "#64748b" : "#1e293b",
                    margin:0, textDecoration: done ? "line-through" : "none" }}>{item.text}</p>
                  <p style={{ fontSize:11, color:"#94a3b8", margin:"2px 0 0" }}>{item.sub}</p>
                </div>
                {item.href && (
                  <button onClick={() => window.open(item.href, "_blank", "noopener noreferrer")}
                    style={{ fontSize:11, fontWeight:600, color:"#1d4ed8", background:"#eff6ff",
                      border:"1px solid #bfdbfe", borderRadius:6, padding:"4px 8px",
                      cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                    {item.btn} ↗
                  </button>
                )}
              </div>
            );
          })}
          {buyAllChecked && (
            <div style={{ padding:"12px 14px", background:"#f0fdf4", borderTop:"1px solid #bbf7d0", textAlign:"center" }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#2F6F4F", margin:0 }}>
                ✅ 기본 확인이 완료됐어요!
              </p>
              <p style={{ fontSize:11, color:"#4ade80", margin:"3px 0 0" }}>
                안전한 계약을 위한 기본 확인이 완료되었습니다.
              </p>
            </div>
          )}
        </div>

        {/* 2×2 네비 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-600 active:bg-slate-50">
            ← 다시 분석
          </button>
          <button onClick={onNewSearch}
            className="rounded-2xl border border-blue-100 bg-blue-50 py-4 text-sm font-bold text-blue-700 active:bg-blue-100">
            다른 단지 분석
          </button>
        </div>
        <BuySaveBtn r={r} f={f} bd={bd} onBack={onBack} onSave={onSave} saved={saved} showFull uid={currentUserId} />
        <button onClick={onHome}
          className="w-full rounded-2xl bg-slate-800 py-4 text-sm font-bold text-white active:bg-slate-700">
          처음으로
        </button>
      </div>

    </>
  );
}

export { BuyResult };
