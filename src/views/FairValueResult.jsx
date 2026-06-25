// ValueLens — FairValueResult
// Phase 1-E: main.jsx에서 분리
// props / 함수명 / className / 계산 흐름 변경 금지

import React from 'react';
import { NAVY } from '../constants/brand.js';
import { won, pct } from '../constants/grades.js';
import { computeFairBands, classifyApartmentMarket, RECON } from '../engine/market.js';
import { computeDataTrust } from '../engine/stats.js';
import { writeSearchLog } from '../services/storage/searchLog.js';
import {
  AiNotice, DataTrustBadge, GradeInfoPopup,
  InputWarnings, MarketTypeBadge,
} from './shared.jsx';

function FairValueResult({ r, f, onBack, onNewSearch, onHome, areaOptions = [], currentUserId }) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [fairDetailOpen, setFairDetailOpen] = React.useState(false);
  const mc = classifyApartmentMarket(f, r);
  const hold = r.engineMode === "hold";
  const isLowData = mc.specialMarketType === "lowData";
  const isAbnormal = mc.specialMarketType === "abnormalInput";
  const isSpecial = ["redevelopment", "primePremium", "investmentPremium", "policyDriven"].includes(mc.specialMarketType);
  const provisional = hold || isLowData || isAbnormal; // 적정가 확정 금지 → 참고가/판단보류
  const jb = (r.basis && r.basis.jeonse) || {}, sb = (r.basis && r.basis.sale) || {};
  const jkb = r.jeonseCalc ? r.jeonseCalc.kbWeight : null, skb = r.saleCalc ? r.saleCalc.kbWeight : null;
  const kbHeavy = (jkb != null && jkb >= 0.6) || (skb != null && skb >= 0.6);
  const Row = ({ l, v }) => <div className="flex justify-between border-t border-slate-100 px-4 py-2.5 text-sm"><span className="text-slate-500">{l}</span><span className="font-semibold text-slate-800">{v}</span></div>;
  const Big = ({ l, v, tone }) => <div className="bg-orange-50 px-4 py-4 text-center"><p className="text-xs text-orange-500">{l}</p><p className={`mt-1 text-xl font-extrabold ${tone || "text-slate-800"}`}>{v}</p></div>;
  const trust = computeDataTrust(r, f.deals, f.saleDeals);
  React.useEffect(() => {
    writeSearchLog({
      region: f.region, dong: f.dong, complex_name: f.complexName,
      area_excl: f.areaExclusive || null,
      success: r.engineMode !== 'hold',
      fail_reason: r.engineMode === 'hold' ? r.holdReason : null,
      data_source: f.dataSource || 'unknown',
      sale_count: r.saleUsed || 0, rent_count: r.jeonseUsed || 0,
      jeonse_ratio: r.actualRatio || null, engine_mode: r.engineMode, buy_grade: r.buyGrade,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── 결론 카드 ── */}
      <div className="mb-4 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
        <div className="px-5 py-4 text-white" style={{ backgroundColor: NAVY }}>
          <p className="text-xs text-slate-300">{f.complexName} · {f.dong}{Number(f.areaExclusive) > 0 ? ` 전용 ${f.areaExclusive}㎡` : ""}</p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">적정가 판단</p>
              <p className="text-xl font-extrabold">{provisional ? "데이터 부족 — 분석 어려움" : r.gradeLabel}</p>
              {provisional && <p className="mt-1 text-xs text-slate-300">{r.holdReason}</p>}
              {!provisional && <p className="text-[11px] text-slate-400">ValueLens {r.buyGrade}등급 · {{ A:"적정가 대비 크게 낮음", B:"적정가 대비 낮음", C:"적정가 수준", D:"적정가 대비 높은 편", E:"적정가 대비 크게 높음" }[r.buyGrade] || ""}</p>}
            </div>
            {!provisional && (
              <div className="flex flex-col items-end gap-1">
                <GradeInfoPopup />
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">AI 적정가</p>
                  <p className="text-xl font-extrabold text-emerald-400">{won(r.fairPrice)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">현재가</p>
            <p className="mt-0.5 text-sm font-extrabold text-slate-900">{won(Number(f.currentPrice))}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">AI 적정가</p>
            <p className="mt-0.5 text-sm font-extrabold" style={{ color: NAVY }}>{provisional ? "—" : won(r.fairPrice)}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">{r.gapRatio < 0 ? "저평가" : "고평가"}</p>
            <p className={`mt-0.5 text-sm font-extrabold ${r.gapRatio < -0.03 ? "text-emerald-600" : r.gapRatio > 0.03 ? "text-red-500" : "text-slate-700"}`}>
              {provisional ? "—" : pct(r.gapRatio)}
            </p>
          </div>
        </div>
        {/* 한줄 결론 배너 */}
        {!provisional && (
          <div className={`border-t border-slate-100 px-5 py-2.5 text-sm font-semibold ${r.gapRatio < -0.05 ? "bg-emerald-50 text-emerald-800" : r.gapRatio > 0.05 ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-700"}`}>
            {r.headline}
          </div>
        )}
        {provisional && (
          <div className="border-t border-amber-100 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800">
            데이터 부족으로 신뢰도 있는 분석이 어렵습니다
          </div>
        )}
      </div>

      {/* ── AI 참고 안내 ── */}
      <AiNotice />

      {/* ── 데이터 신뢰도 ── */}
      <div className="mb-4"><DataTrustBadge trust={trust} /></div>

      <FairSaveBtn r={r} f={f} onBack={onBack} uid={currentUserId} />
      <InputWarnings r={r} f={f} />
      <div className="mb-4"><MarketTypeBadge mc={mc} /></div>

      {/* ── 상세 분석 접기/펼치기 ── */}
      <>
            <button onClick={() => setDetailOpen(v => !v)}
              className="mb-3 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
              <span className="text-xs font-semibold text-slate-600">상세 분석 보기 (전세가율 · 산출방식 · 적정가 범위)</span>
              <span className="text-xs text-slate-400">{detailOpen ? "접기 ▲" : "펼치기 ▼"}</span>
            </button>
            {detailOpen && (
              <>
      {/* ── 백테스트 v3: 핵심 지표 4개 카드 ── */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-400">분석 기준 전세 시세</p>
          <p className="mt-1 text-base font-bold text-slate-800">
            {r.jeonseUsed > 0 && r.basis?.jeonse?.value ? won(r.basis.jeonse.value) : "—"}
          </p>
          <p className="text-[10px] text-slate-400">{r.jeonseUsed}건 기준</p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">최근 전세 거래의 평균 시세입니다.</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-400">분석 기준 매매 시세</p>
          <p className="mt-1 text-base font-bold text-slate-800">
            {r.saleFair ? won(r.saleFair) : "—"}
          </p>
          <p className="text-[10px] text-slate-400">{r.saleUsed}건 기준</p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">최근 매매 거래의 평균 시세입니다.</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-400">적용 전세가율</p>
          <p className={`mt-1 text-base font-bold ${
            r.actualRatio == null ? "text-slate-400" :
            r.ratioWarn ? "text-orange-500" :
            r.actualRatio >= 0.55 ? "text-emerald-600" :
            r.actualRatio >= 0.45 ? "text-amber-600" : "text-orange-600"
          }`}>
            {r.actualRatio != null
              ? `${(r.actualRatio*100).toFixed(1)}%${r.ratioWarn ? " ⚠️" : ""}`
              : "계산불가"}
          </p>
          <p className="text-[10px] text-slate-400">
            {r.actualRatio != null
              ? (r.actualRatio >= 0.55 ? "실수요 견고" : r.actualRatio >= 0.45 ? "보통 수준" : "낮음 — 투자수요")
              : "—"}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">매매가 대비 전세가 비율입니다.</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-400">적정가 산출 방식</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {r.isPremium ? "프리미엄 반영" :
             r.engineMode === "jeonse" ? "전세 시세 중심" :
             r.engineMode === "blend"  ? "전세·매매 혼합" :
             r.engineMode === "sale"   ? "매매 시세 중심" : "보류"}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">
            {r.isPremium ? "단지 특성 추가 반영" :
             r.engineMode === "jeonse" ? "전세 거래 중심으로 계산했습니다." :
             r.engineMode === "blend"  ? "전세·매매 혼합으로 계산했습니다." :
             r.engineMode === "sale"   ? "매매 거래 중심으로 계산했습니다." : "—"}
          </p>
        </div>
      </div>
      {r.dataWarnings && r.dataWarnings.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">데이터 부족 — 분석 신뢰 낮음</p>
          {r.dataWarnings.map((w, i) => (
            <p key={i} className="mt-1 text-xs text-amber-700">· {w}</p>
          ))}
          <p className="mt-1.5 text-[11px] text-amber-600">실거래를 보강하거나 KB시세를 입력하면 정확도가 높아집니다.</p>
        </div>
      )}
      {provisional ? (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="px-6 py-6 text-white" style={{ backgroundColor: NAVY }}>
            <p className="text-sm text-slate-300">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? (() => { const opt=(areaOptions||[]).find(o=>String(o.areaSqm)===String(f.areaExclusive)); const {mainLabel}=areaButtonLabel(f.areaExclusive, opt?.supplySqm); return `${mainLabel} (전용 ${f.areaExclusive}㎡)`; })() : (f.pyeong ? `${f.pyeong}평형` : "")}</p>
            <h1 className="mt-2 text-xl font-bold">{isAbnormal ? "입력값 확인 필요" : "데이터 부족으로 신뢰도 있는 분석이 어렵습니다"}</h1>
            <p className="mt-1.5 text-sm text-amber-300">{isAbnormal ? "현재가가 정제 시세와 크게 차이납니다. 값 확인 후 다시 분석하세요." : r.holdReason}</p>
            {!isAbnormal && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white/15 px-2.5 py-1.5 text-xs text-slate-200">다른 면적 선택</span>
                <span className="rounded-lg bg-white/15 px-2.5 py-1.5 text-xs text-slate-200">KB시세 직접 입력</span>
              </div>
            )}
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-xs text-slate-400">참고가 (신뢰도 낮음 · 확정 아님)</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-700">{won(r.fairPrice)}</p>
          </div>
        </section>
      ) : isSpecial ? (
        <>
          <section className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-orange-200">
            <div className="px-6 py-5 text-white" style={{ backgroundColor: NAVY }}>
              <p className="text-sm text-slate-300">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? (() => { const opt=(areaOptions||[]).find(o=>String(o.areaSqm)===String(f.areaExclusive)); const {mainLabel}=areaButtonLabel(f.areaExclusive, opt?.supplySqm); return `${mainLabel} (전용 ${f.areaExclusive}㎡)`; })() : (f.pyeong ? `${f.pyeong}평형` : "")}</p>
              <h1 className="mt-1 text-lg font-bold">특수시장 — 가격 4분리 표시</h1>
            </div>
            <div className="grid grid-cols-2 gap-px bg-orange-100">
              <Big l="실사용 적정가" v={won(mc.intrinsicFairPrice)} />
              <Big l="시장 기준가" v={won(mc.marketReferencePrice)} />
              <Big l="프리미엄 금액" v={won(mc.premiumAmount)} tone="text-amber-600" />
              <Big l="프리미엄 비율" v={`${(mc.premiumRatio * 100).toFixed(0)}%`} tone="text-amber-600" />
            </div>
            <div className="bg-white px-5 py-3 text-center"><p className="text-xs text-slate-400">프리미엄 반영가 (엔진 산출)</p><p className="mt-0.5 text-lg font-bold" style={{ color: NAVY }}>{won(r.fairPrice)}</p></div>
          </section>
          <p className="mt-3 rounded-2xl bg-orange-50 p-4 text-xs leading-relaxed text-orange-800 ring-1 ring-orange-100">이 단지는 실사용 가치보다 재건축·학군·희소성·투자수요 프리미엄이 반영된 단지입니다. 일반 전세 기반 적정가만으로 저평가/고평가를 단정하기 어렵습니다.</p>
        </>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
          <div className="px-6 py-6 text-white" style={{ backgroundColor: NAVY }}>
            <p className="text-sm text-slate-300">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? (() => { const opt=(areaOptions||[]).find(o=>String(o.areaSqm)===String(f.areaExclusive)); const {mainLabel}=areaButtonLabel(f.areaExclusive, opt?.supplySqm); return `${mainLabel} (전용 ${f.areaExclusive}㎡)`; })() : (f.pyeong ? `${f.pyeong}평형` : "")}</p>
            <p className="mt-2 text-xs text-slate-300">엔진 산출 적정가</p>
            <p className="text-3xl font-extrabold">{won(r.fairPrice)}</p>
            <span className="mt-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-200">{r.modeName}</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="px-4 py-4 text-center"><p className="text-xs text-slate-400">현재 매물가</p><p className="mt-1 text-base font-bold text-slate-800">{won(Number(f.currentPrice))}</p></div>
            <div className="px-4 py-4 text-center"><p className="text-xs text-slate-400">안전마진가</p><p className="mt-1 text-base font-bold text-slate-800">{won(r.safetyPrice)}</p></div>
            <div className="px-4 py-4 text-center"><p className="text-xs text-slate-400">적정가 대비</p><p className={`mt-1 text-base font-bold ${r.gapRatio > 0 ? "text-red-600" : "text-emerald-600"}`}>{pct(r.gapRatio)}</p></div>
          </div>
        </section>
      )}

      {!provisional && (() => { const fb = computeFairBands(r, mc); return (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="px-4 py-2.5" style={{ backgroundColor: "#f1f5f9" }}><p className="text-sm font-bold text-slate-700">적정가 범위 <span className="font-normal text-slate-400">(보수 / 기준 / 공격)</span></p></div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">보수 적정가</p><p className="mt-0.5 text-base font-bold text-emerald-600">{won(fb.conservative)}</p></div>
            <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">기준 적정가</p><p className="mt-0.5 text-base font-bold" style={{ color: NAVY }}>{won(fb.base)}</p></div>
            <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">상단 참고가</p><p className="mt-0.5 text-base font-bold text-amber-600">{won(fb.aggressive)}</p></div>
          </div>
          <p className="px-4 pb-3 text-[11px] text-slate-400">상단 참고가는 매수 권장가가 아니라 {fb.special ? "시장 프리미엄이 유지될 때의 상단" : "단기 상단"} 참고값입니다.</p>
        </div>
      ); })()}

      {isSpecial && (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="px-4 py-2.5" style={{ backgroundColor: "#fff7ed" }}><p className="text-sm font-bold text-orange-700">프리미엄 구성 <span className="font-normal text-orange-400">(추정)</span></p></div>
          <div className="grid grid-cols-2 gap-px bg-slate-100">
            {[["학군", mc.premiumBreakdown.schoolPremium], ["재건축", mc.premiumBreakdown.redevelopmentPremium], ["희소성", mc.premiumBreakdown.scarcityPremium], ["입지", mc.premiumBreakdown.locationPremium], ["투자수요", mc.premiumBreakdown.investorDemandPremium], ["정책", mc.premiumBreakdown.policyPremium]].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between bg-white px-4 py-2.5 text-sm"><span className="text-slate-500">{l}</span><span className="font-semibold text-amber-600">{won(v)}</span></div>
            ))}
          </div>
          <p className="px-4 py-2 text-[11px] text-slate-400">프리미엄 총액 {won(mc.premiumAmount)}의 추정 구성입니다. TODO(API): 학군·정비사업·희소성 실데이터 연동 시 정밀화.</p>
        </div>
      )}

      {isSpecial && (
        <div className="mt-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-700">재건축 단계</p><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{RECON[mc.reconstructionStage].label} · {mc.stageScore}점</span></div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${mc.stageScore}%`, backgroundColor: NAVY }} /></div>
          <p className="mt-2 text-[11px] text-slate-400">재건축 단계는 적정가를 직접 바꾸지 않고 프리미엄·시장 위험도·매수 판단에만 반영됩니다. 현재 연식 기반 추정값 · TODO(API): 정비사업 고시·조합 정보 연동 예정.</p>
        </div>
      )}

      {/* 적정가 산출 근거 */}
      <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="px-4 py-3" style={{ backgroundColor: "#f1f5f9" }}>
          <p className="text-sm font-bold text-slate-700">적정가 산출 근거</p>
          <p className="text-[11px] text-slate-400 mt-0.5">AI가 실거래 데이터를 분석해 산출한 기준값입니다.</p>
        </div>

        {/* ── 핵심 4개 기본 노출 ── */}
        <Row l="분석 기준 전세 시세" v={r.jeonseFair ? `${won(r.jeonseFair)} (${r.jeonseUsed}건)` : "—"} />
        <Row l="분석 기준 매매 시세" v={r.saleFair ? `${won(r.saleFair)} (${r.saleUsed}건)` : "—"} />
        <Row l="적용 전세가율" v={r.usedRatio ? `${(r.usedRatio*100).toFixed(1)}% (${r.dynamicRatio ? "실측값" : "기준값"})` : "—"} />
        <Row l="데이터 신뢰도" v={r.dataConfLabel} />

        {/* ── 상세 분석 접힘 ── */}
        {(() => {
          const fs = (() => { const fl = { redevelopment: 65, primePremium: 70, investmentPremium: 65, policyDriven: 65, semiPremium: 70 }[mc.specialMarketType]; return fl != null ? Math.max(r.modelConf, fl) : r.modelConf; })();
          const mrLevel = (isLowData || isAbnormal) ? "평가 불가" : mc.specialMarketType === "investmentPremium" ? "매우높음" : isSpecial ? "높음" : mc.specialMarketType === "semiPremium" ? "보통" : "낮음";
          return (
            <>
              <button onClick={() => setFairDetailOpen(v => !v)}
                className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 text-left">
                <span className="text-xs font-semibold text-slate-500">상세 분석 보기</span>
                <span className="text-xs text-slate-400">{fairDetailOpen ? "접기 ▲" : "펼치기 ▼"}</span>
              </button>
              {fairDetailOpen && (
                <div className="border-t border-slate-100">
                  <Row l="적정가 산출 방식" v={r.isPremium ? "프리미엄 반영" : r.engineMode === "jeonse" ? "전세 시세 중심" : r.engineMode === "blend" ? "전세·매매 혼합" : r.engineMode === "sale" ? "매매 시세 중심" : "—"} />
                  <Row l="사용 거래 수 (전세/매매)" v={`${jb.used ?? 0} / ${sb.used ?? 0} 건`} />
                  <Row l="제외 거래 수 (전세/매매)" v={`${jb.excluded ?? 0} / ${sb.excluded ?? 0} 건`} />
                  <Row l="KB시세 가중치 (전세/매매)" v={`${jkb != null ? Math.round(jkb * 100) + "%" : "—"} / ${skb != null ? Math.round(skb * 100) + "%" : "—"}`} />
                  <Row l="거래 데이터 충분도" v={`${fs} · ${fs >= 80 ? "높음" : fs >= 60 ? "보통" : fs >= 40 ? "낮음" : "매우낮음"}`} />
                  <Row l="시장 환경 분석" v={mrLevel} />
                  <Row l="단지 특성" v={r.isPremium ? "재건축·학군·희소성 영향" : "일반"} />
                  {kbHeavy && <div className="bg-amber-50 px-4 py-2 text-xs text-amber-700">⚠ 실거래 표본이 적어 KB시세 의존도가 높습니다 — 신뢰도를 보수적으로 해석하세요.</div>}
                </div>
              )}
            </>
          );
        })()}
      </div>

      <p className="mt-5 px-2 text-[11px] leading-relaxed text-slate-400">시장 위험도는 계산 오류를 의미하지 않습니다. 재건축, 정책, 공급, 프리미엄 등에 따른 가격 변동성 위험을 의미합니다. 본 적정가는 공개 데이터와 입력값 기반 참고용 계산이며, 집 자체의 가치 평가에 한정됩니다. 매수 판단·자금·대출·세금은 매수 탭에서 확인하세요.</p>
              </>
            )}
      </>

      {/* ── PDF 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const gp = r.gapRatio != null ? `${Math.abs(r.gapRatio * 100).toFixed(1)}%` : "—";
            const gradeLabel = { A:"매우 저평가", B:"저평가", C:"적정 가격", D:"고평가 주의", E:"고평가", 보류:"판단 보류" }[r.buyGrade] || r.buyGrade;
            const text = `ValueLens 적정가 평가 리포트
${"=".repeat(40)}
발행일: ${date}
단지: ${f.complexName || "—"} ${f.dong ? `· ${f.dong}` : ""} ${Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}

[적정가 평가 결과]
  가격 평가 등급: ${r.buyGrade}등급 · ${gradeLabel}
  현재 매물가: ${won(Number(f.currentPrice))}
  AI 적정가: ${r.engineMode === "hold" ? "판단 보류" : won(r.fairPrice)}
  ${r.gapRatio < 0 ? "저평가율" : "고평가율"}: ${r.engineMode === "hold" ? "보류" : gp}
  보수적 참고가: ${r.safetyPrice ? won(r.safetyPrice) : "—"}
  분석 엔진: ${r.modeName || "—"}

[적정가 산출 근거]
${r.basis && r.basis.steps && r.basis.steps.length ? r.basis.steps.map(s => `  · ${s}`).join("\n") : "  · 데이터 부족으로 산출 보류"}

[데이터 현황]
  전세 표본: ${r.jeonseUsed || 0}건 · 신뢰도 ${r.dataConfLabel || "—"}
  매매 표본: ${r.saleUsed || 0}건
  시장충격: ${r.shock?.level || "—"}

${"=".repeat(40)}
본 보고서는 가격평가 참고자료이며,
감정평가서 · 투자자문 · 매수·매도 권유가 아닙니다.
공개 데이터와 사용자 입력값 기반의 참고용 분석이며,
실제 가격은 층·향·수리상태·시장상황에 따라 다를 수 있습니다.
최종 의사결정은 현장 확인 후 본인이 내려야 합니다.

이 리포트를 활용하기 전 확인하세요
================================
□ 공인중개사에게 현장 시세를 확인했나요?
□ 동일 단지 실거래가를 국토부 실거래가 공개시스템에서 직접 확인했나요?
□ 층·향·수리상태·동 위치에 따른 가격 차이를 고려했나요?

본 리포트는 AI 가격 적정성 참고자료이며
전문가 상담을 대체하지 않습니다.

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
매수·매도 결정은 사용자의 최종 판단과 전문가 상담을 통해 진행해야 합니다.
특히 데이터 부족, 전세가율 이상치, 재건축·학군·희소성 영향 단지는
분석 신뢰도가 낮을 수 있습니다.`;
            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ValueLens_적정가_${f.complexName || "평가"}_${date.replace(/\./g, "")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">적정가 평가 리포트 저장</p>
            <p className="mt-0.5 text-xs text-slate-400">등급·AI 적정가·산출 근거·데이터 현황 포함 · 계산식 제외</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>

      {/* ── 하단 네비게이션 CTA ── */}
      <div className="mt-6 space-y-3">
        <FairSaveBtn r={r} f={f} onBack={onBack} showFull uid={currentUserId} />
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-600 active:bg-slate-50">
            ← 다시 검색
          </button>
          <button onClick={onNewSearch}
            className="rounded-2xl border border-blue-100 bg-blue-50 py-4 text-sm font-bold text-blue-700 active:bg-blue-100">
            다른 단지 분석
          </button>
        </div>
        <button onClick={onHome}
          className="w-full rounded-2xl bg-slate-800 py-4 text-sm font-bold text-white active:bg-slate-700">
          처음으로
        </button>
      </div>
    </>
  );
}

export { FairValueResult };
