// ValueLens — 공유 표시용 컴포넌트
// Phase 1-E: main.jsx에서 분리
// 계산 로직 / UI / 문구 / className / props 변경 금지

import React, { useState } from 'react';
import { NAVY } from '../constants/brand.js';
import { won } from '../constants/grades.js';
import { saveAnalysis } from '../services/storage/analysis.js';

// ── inputWarnings helper (InputWarnings 컴포넌트 전용) ──
function inputWarnings(r, f) {
  const w = [];
  const cur = Number(f.currentPrice) || 0;
  const jeonse = Number(f.kbJeonse) || (r && r.baseJeonse) || 0;
  const sale = Number(f.kbSalePrice) || cur || 0;
  if (cur <= 0) w.push({ tone: "red", msg: "현재 매매가격이 입력되지 않았거나 유효하지 않습니다. (판단 보류로 처리됩니다)" });
  if (jeonse > 0 && sale > 0 && jeonse >= sale) w.push({ tone: "red", msg: "입력한 전세가격이 매매가격 이상입니다. 실제 시장에서는 드문 사례이며 적정가 결과가 왜곡될 수 있습니다. 입력값을 다시 확인하세요." });
  const ratio = r && r.actualRatio != null ? r.actualRatio : (sale > 0 ? jeonse / sale : 0);
  if (ratio > 0.9) w.push({ tone: "amber", msg: "전세가율이 매우 높습니다. 입력값 또는 시장 특수 상황 여부를 확인하세요." });
  if (r && r.engineMode === "hold") w.push({ tone: "amber", msg: "거래 표본이 부족하거나 입력값이 불안정하여 결과 신뢰도가 낮습니다. 참고용으로만 활용하세요." });
  return w;
}

// ── 공유 컴포넌트 ──
function AiNotice() {
  return (
    <p className="mb-3 rounded-xl bg-slate-50 px-4 py-2.5 text-[11px] leading-relaxed text-slate-400 ring-1 ring-slate-100">
      ℹ️ 이 결과는 최근 실거래 데이터를 기반으로 AI가 분석한 참고 의견입니다.
    </p>
  );
}

function GradeInfoPopup() {
  const [open, setOpen] = React.useState(false);
  const GRADES = [
    { g: "A", label: "매우 저평가", desc: "AI 적정가 대비 15% 이상 낮음",     color: "bg-emerald-600" },
    { g: "B", label: "저평가",     desc: "AI 적정가 대비 5~15% 낮음",         color: "bg-emerald-500" },
    { g: "C", label: "적정 가격",  desc: "AI 적정가 ±5% 이내",               color: "bg-amber-400"   },
    { g: "D", label: "고평가 주의", desc: "AI 적정가 대비 5~15% 높음",        color: "bg-orange-500"  },
    { g: "E", label: "고평가",     desc: "AI 적정가 대비 15% 이상 높음",      color: "bg-red-600"     },
  ];
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-200 active:bg-slate-300"
      >
        ⓘ 등급 기준
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: NAVY }}>
              <p className="text-sm font-bold text-white">등급 기준 안내</p>
              <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="px-5 py-4">
              <p className="mb-3 text-xs text-slate-500">AI 적정가 대비 현재 시세 위치로 산출됩니다.</p>
              <div className="space-y-2">
                {GRADES.map(({ g, label, desc, color }) => (
                  <div key={g} className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white ${color}`}>{g}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
                등급은 가격 적정성 참고용이며 실제 매수 결정은<br />자금·시장 상황·현장 확인을 종합적으로 고려하세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DataTrustBadge({ trust }) {
  if (!trust) return null;
  return (
    <div className={`rounded-2xl border p-4 ${trust.gradeColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold">{trust.gradeLabel}</span>
        </div>
        <span className="text-xs text-slate-500">총 {trust.totalUsed}건 · 점수 {trust.score}/100</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="text-slate-400">매매 표본</p>
          <p className="font-bold">{trust.saleUsed}건</p>
        </div>
        <div>
          <p className="text-slate-400">전세 표본</p>
          <p className="font-bold">{trust.jeonseUsed}건</p>
        </div>
        <div>
          <p className="text-slate-400">최근 거래</p>
          <p className="font-bold">{trust.latestYm && trust.monthsAgo != null && !isNaN(trust.monthsAgo) ? (trust.monthsAgo === 0 ? '이번 달' : `${trust.monthsAgo}개월 전`) : trust.latestYm ? trust.latestYm : '—'}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px]">{trust.gradeDesc}</p>
      {!trust.sufficient && (
        <p className="mt-1 text-[11px] font-semibold">⚠ 데이터가 충분하지 않아 결과를 참고용으로만 활용하세요.</p>
      )}
    </div>
  );
}

function InputWarnings({ r, f }) {
  const w = inputWarnings(r, f);
  if (!w.length) return null;
  return (
    <div className="mb-4 space-y-2">
      {w.map((x, i) => (
        <div key={i} className={`rounded-2xl border px-4 py-2.5 text-[12px] leading-relaxed ${x.tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>⚠️ {x.msg}</div>
      ))}
    </div>
  );
}

function MarketTypeBadge({ mc }) {
  const MAP = {
    normal:          ["일반 단지",                    "bg-white ring-slate-100",        "bg-slate-100 text-slate-600"],
    semiPremium:     ["재건축·학군·희소성 영향 단지", "bg-amber-50 ring-amber-100",     "bg-amber-100 text-amber-700"],
    redevelopment:   ["재건축 기대 단지",             "bg-orange-50 ring-orange-200",   "bg-orange-100 text-orange-700"],
    primePremium:    ["프라임 입지 단지",             "bg-orange-50 ring-orange-200",   "bg-red-100 text-red-700"],
    investmentPremium:["투자수요 중심 단지",          "bg-orange-50 ring-orange-200",   "bg-red-100 text-red-700"],
    policyDriven:    ["정책 변수 영향 단지",          "bg-orange-50 ring-orange-200",   "bg-orange-100 text-orange-700"],
    lowData:         ["거래 데이터 부족",             "bg-slate-50 ring-slate-200",     "bg-slate-200 text-slate-600"],
    abnormalInput:   ["입력값 확인 필요",             "bg-slate-50 ring-slate-200",     "bg-slate-200 text-slate-600"],
  };
  const DESC = {
    normal:           "일반적인 전세·매매 기반으로 분석했습니다.",
    semiPremium:      "재건축 기대나 학군·희소성 요인이 일부 반영된 단지입니다. 실사용 가치와 시장 가격을 함께 보세요.",
    redevelopment:    "재건축 기대가 반영된 단지입니다. 사업 진행 여부와 분담금 리스크를 함께 고려하세요.",
    primePremium:     "입지·희소성 프리미엄이 있는 단지입니다. 전세 기반 적정가만으로 판단하기 어렵습니다.",
    investmentPremium:"전세가율이 낮아 투자 수요 비중이 높은 단지입니다. 실거주 목적이라면 신중하게 검토하세요.",
    policyDriven:     "정책 변수(재개발·용도변경 등)가 가격에 영향을 주는 단지입니다.",
    lowData:          "거래 데이터가 부족해 분석 신뢰도가 낮습니다. KB시세를 입력하면 정확도가 높아집니다.",
    abnormalInput:    "입력값이 시세와 크게 차이납니다. 현재가를 다시 확인해 주세요.",
  };
  const [label, wrapCls, tagCls] = MAP[mc.specialMarketType] || MAP.normal;
  const desc = DESC[mc.specialMarketType] || DESC.normal;
  return (
    <div className={`rounded-2xl p-4 ring-1 ${wrapCls}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${tagCls}`}>{label}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{desc}</p>
      {mc.warnings.length > 0 && <p className="mt-2 rounded-lg bg-orange-100/60 px-2.5 py-1.5 text-xs font-medium leading-relaxed text-orange-800">⚠ {mc.warnings[0]}</p>}
    </div>
  );
}


// ── SellSaveBtn ──
function SellSaveBtn({ r, f, sd, onBack, showFull, uid }) {
  const [savedId, setSavedId] = useState(null);
  const handleSave = () => {
    saveAnalysis({
      _uid: uid,
      id: `sell_${f.complexName}_${f.areaExclusive}_${Date.now()}`,
      type: "sell", complexName: f.complexName,
      area: f.areaExclusive ? `전용 ${f.areaExclusive}㎡` : "",
      region: f.region, savedAt: new Date().toISOString(),
      currentPrice: Number(f.currentPrice) || 0, aiFairPrice: r.fairPrice || 0,
      gradeLabel: sd.finalSellDecision || "",
      summary: `${sd.finalSellDecision} · AI 적정가 ${won(r.fairPrice)} · 희망가 ${won(sd.desired)}`,
      resultSnapshot: { fairPrice: r.fairPrice, finalSellDecision: sd.finalSellDecision,
        gapVsRef: sd.gapVsRef, askingLevel: sd.askingLevel, currentPrice: Number(f.currentPrice) || 0 },
    });
    setSavedId(true);
  };
  if (showFull) {
    return (
      <button onClick={handleSave} disabled={!!savedId}
        className={`w-full rounded-2xl py-3 text-sm font-semibold transition-colors ${savedId ? "bg-slate-100 text-slate-400" : "border border-emerald-200 bg-emerald-50 text-emerald-700 active:bg-emerald-100"}`}>
        {savedId ? "✓ 저장됨" : "💾 이 분석 저장하기"}
      </button>
    );
  }
  return (
    <div className="mb-4 flex items-center justify-between">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← 다시 평가</button>
      <button onClick={handleSave} disabled={!!savedId}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${savedId ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
        {savedId ? "✓ 저장됨" : "저장"}
      </button>
    </div>
  );
}


// ── BuySaveBtn ──
function BuySaveBtn({ r, f, bd, onBack, onSave, saved, showFull, uid }) {
  const [savedId, setSavedId] = useState(null);
  const handleSave = () => {
    saveAnalysis({
      _uid: uid,
      id: `buy_${f.complexName}_${f.areaExclusive}_${Date.now()}`,
      type: "buy", complexName: f.complexName,
      area: f.areaExclusive ? `전용 ${f.areaExclusive}㎡` : "",
      region: f.region, savedAt: new Date().toISOString(),
      currentPrice: Number(f.currentPrice) || 0, aiFairPrice: r.fairPrice || 0,
      gradeLabel: r.gradeLabel || "",
      summary: `${r.gradeLabel || ""} · AI 적정가 ${won(r.fairPrice)} · ${bd.finalLabel}`,
      resultSnapshot: { fairPrice: r.fairPrice, safetyPrice: r.safetyPrice, buyGrade: r.buyGrade,
        gradeLabel: r.gradeLabel, gapRatio: r.gapRatio, finalLabel: bd.finalLabel,
        currentPrice: Number(f.currentPrice) || 0 },
    });
    setSavedId(true);
  };

  if (showFull) {
    return (
      <button onClick={handleSave} disabled={!!savedId}
        className={`w-full rounded-2xl py-3 text-sm font-semibold transition-colors ${savedId ? "bg-slate-100 text-slate-400" : "border border-emerald-200 bg-emerald-50 text-emerald-700 active:bg-emerald-100"}`}>
        {savedId ? "✓ 저장됨" : "💾 이 분석 저장하기"}
      </button>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between">
      <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← 다시 분석</button>
      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={!!savedId}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${savedId ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {savedId ? "✓ 저장됨" : "저장"}
        </button>
        <button onClick={onSave} disabled={saved}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${saved ? "bg-slate-100 text-slate-400" : "text-white"}`}
          style={saved ? {} : { backgroundColor: NAVY }}>
          {saved ? "★ 관심단지" : "☆ 관심단지"}
        </button>
      </div>
    </div>
  );
}

export { AiNotice, GradeInfoPopup, DataTrustBadge, InputWarnings, MarketTypeBadge, SellSaveBtn, BuySaveBtn };
