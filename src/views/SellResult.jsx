// ValueLens — SellResult
// Phase 1-E: main.jsx에서 분리
// props / 함수명 / className / 계산 흐름 변경 금지

import React from 'react';
import { NAVY } from '../constants/brand.js';
import { won } from '../constants/grades.js';
import { card } from '../constants/styles.js';
import { analyzeSellerDecision, RECON } from '../engine/market.js';
import { computeDataTrust } from '../engine/stats.js';
import { writeSearchLog } from '../services/storage/searchLog.js';
import {
  AiNotice, DataTrustBadge, GradeInfoPopup,
  InputWarnings, MarketTypeBadge, SellSaveBtn,
} from './shared.jsx';

function SellResult({ r, f, onBack, onNewSearch, onChangeArea, onHome, areaOptions, currentArea, onSelectArea, currentUserId }) {
  const sd = analyzeSellerDecision(f, r);
  const mc = sd.mc;
  const TONE =
    sd.finalSellDecision.includes("매도 검토 가능") ? "bg-blue-500" :
    sd.finalSellDecision.includes("보유 리스크") ? "bg-amber-500" :
    sd.finalSellDecision.includes("고평가 주의") ? "bg-orange-500" :
    sd.finalSellDecision.includes("보유 유지 검토") ? "bg-slate-500" :
    sd.finalSellDecision.includes("매도 검토") ? "bg-blue-400" :
    sd.finalSellDecision.includes("보유") ? "bg-emerald-600" :
    sd.finalSellDecision.includes("보류") ? "bg-slate-400" :
    "bg-slate-400";
  const mrTone = (lv) => lv === "매우높음" ? "text-red-600" : lv === "높음" ? "text-orange-600" : lv === "보통" ? "text-amber-600" : lv === "평가 불가" ? "text-slate-500" : "text-emerald-600";
  const Cell = ({ l, v, tone }) => <div className="px-3 py-2.5 text-center"><p className="text-[11px] text-slate-400">{l}</p><p className={`mt-0.5 text-sm font-bold ${tone || "text-slate-800"}`}>{v}</p></div>;
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
      {/* ── 결론 카드 (매도) ── */}
      <div className="mb-4 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
        <div className={`px-5 py-4 text-white ${TONE}`}>
          <p className="text-xs text-white/70">{f.complexName} · {f.dong}{Number(f.areaExclusive) > 0 ? ` 전용 ${f.areaExclusive}㎡` : ""}</p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-white/70">매도 판단</p>
              <p className="text-xl font-extrabold">{sd.finalSellDecision}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-right">
                <p className="text-[11px] text-white/70">희망 매도가</p>
                <p className="text-xl font-extrabold">{won(sd.desired)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">희망가</p>
            <p className="mt-0.5 text-sm font-extrabold text-slate-900">{won(sd.desired)}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">AI 적정가</p>
            <p className="mt-0.5 text-sm font-extrabold" style={{ color: NAVY }}>{won(r.fairPrice)}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">가격 위치</p>
            <p className={`mt-0.5 text-sm font-extrabold ${sd.gapVsRef > 0.03 ? "text-red-500" : sd.gapVsRef < -0.03 ? "text-blue-500" : "text-slate-700"}`}>{sd.askingLevel}</p>
          </div>
        </div>
        {sd.sellerAction && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-600">{sd.sellerAction}</div>
        )}
      </div>

      {/* ── 자연어 한줄 결론 (매도) ── */}
      {!sd.provisional && (() => {
        const isSellFav = sd.finalSellDecision.includes("매도 검토");
        const isHold    = sd.finalSellDecision.includes("보유");
        const bgCls  = isSellFav ? "bg-blue-50 ring-blue-200"    : isHold ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200";
        const txtCls = isSellFav ? "text-blue-800"               : isHold ? "text-emerald-800"               : "text-amber-800";
        const subCls = isSellFav ? "text-blue-700"               : isHold ? "text-emerald-700"               : "text-amber-700";
        const gapPct = Math.abs(sd.gapVsRef * 100).toFixed(1);
        const line1  = sd.gapVsRef > 0.03
          ? `희망 매도가가 AI 적정가보다 ${gapPct}% 높게 설정되어 있습니다.`
          : sd.gapVsRef < -0.03
            ? `희망 매도가가 AI 적정가보다 ${gapPct}% 낮은 수준입니다.`
            : "희망 매도가가 AI 적정가 수준에 있습니다.";
        const line2 = sd.sellerAction;
        return (
          <div className={`mb-4 rounded-2xl px-5 py-4 ring-1 ${bgCls}`}>
            <p className={`text-sm font-bold ${txtCls}`}>{line1}</p>
            <p className={`mt-1 text-xs leading-relaxed ${subCls}`}>{line2}</p>
          </div>
        );
      })()}
      {sd.provisional && (
        <div className="mb-4 rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-200">
          <p className="text-sm font-bold text-slate-700">현재 데이터로는 정확한 판단이 어렵습니다.</p>
          <p className="mt-1 text-xs text-slate-500">실거래 데이터를 보강 후 다시 분석하세요.</p>
        </div>
      )}

      {/* ── 판단 이유 박스 (매도) ── */}
      {!sd.provisional && (() => {
        const checks = [];
        const gapPct = Math.abs(sd.gapVsRef * 100).toFixed(1);
        if (sd.gapVsRef > 0.05)       checks.push({ ok: null,  text: `호가가 AI 적정가 대비 ${gapPct}% 높음 — 거래 가능성 확인 필요` });
        else if (sd.gapVsRef < -0.05) checks.push({ ok: true,  text: `호가가 AI 적정가 대비 ${gapPct}% 낮음 — 거래 유리` });
        else                           checks.push({ ok: true,  text: `호가가 AI 적정가 수준 — 적정 호가` });
        checks.push(
          sd.holdingVsSellingResult === "매도 쪽 우세"
            ? { ok: null,  text: `매도 요인이 다소 우세 — ${sd.holdingVsSellingNote || "현재 여건상 매도 검토 가능"}` }
            : sd.holdingVsSellingResult === "보유 쪽 우세"
              ? { ok: true,  text: `보유 우세 — ${sd.holdingVsSellingNote || "보유 관점이 우세한 것으로 분석됩니다"}` }
              : { ok: null,  text: "보유·매도 중립 — 목적에 따라 판단" }
        );
        const liqOk = sd.liquidityScore >= 60;
        checks.push({ ok: liqOk ? true : null, text: `거래 가능성 ${sd.liquidityLevel}${liqOk ? "" : " — 호가 조정 고려"}` });
        const riskOk = !["높음","매우높음"].includes(sd.marketRiskLevel);
        checks.push({ ok: riskOk ? true : false, text: `시장 환경 ${sd.marketRiskLevel}` });
        if (!sd.provisional && sd.tax)
          checks.push({ ok: true, text: `예상 세후 실수령액 약 ${won(sd.netProceeds)}` });
        return (
          <div className="mb-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100">
            <p className="mb-3 text-sm font-bold text-slate-700">왜 이런 결과가 나왔나요?</p>
            <div className="space-y-2">
              {checks.map((c, i) => (
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
        );
      })()}

      {/* ── AI 참고 안내 ── */}
      <AiNotice />

      {/* ── 데이터 신뢰도 ── */}
      <div className="mb-4"><DataTrustBadge trust={trust} /></div>

      <SellSaveBtn r={r} f={f} sd={sd} onBack={onBack} uid={currentUserId} />
      <InputWarnings r={r} f={f} />
      <div className="mb-4"><MarketTypeBadge mc={mc} /></div>

      {r.dataWarnings && r.dataWarnings.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">데이터 부족 — 분석 신뢰 낮음</p>
          {r.dataWarnings.map((w, i) => (
            <p key={i} className="mt-1 text-xs text-amber-700">· {w}</p>
          ))}
          <p className="mt-1.5 text-[11px] text-amber-600">실거래를 보강하거나 KB시세를 입력하면 정확도가 높아집니다.</p>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
        <div className="px-6 py-5 text-white" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center justify-between"><p className="text-xs text-slate-300">최종 매도 판단{sd.isSpecial ? ` · ${mc.premiumLevel || "특수시장"}` : ""}</p></div>
          <div className="mt-1.5 flex items-center gap-3"><span className={`rounded-xl px-3 py-1 text-xl font-extrabold text-white ${TONE}`}>{sd.finalSellDecision}</span></div>
          <p className="mt-3 text-sm leading-relaxed text-slate-200"><b className="text-white">AI 판단 요약</b> · {sd.sellerAction}</p>
        </div>
        <div className="grid grid-cols-3 gap-px border-b border-slate-100 bg-slate-100">
          <Cell l="가격 위치" v={sd.askingLevel} tone={sd.gapVsRef > 0.05 ? "text-red-500" : sd.gapVsRef < -0.05 ? "text-blue-500" : "text-slate-800"} />
          <Cell l="세후 실수령" v={!sd.provisional && sd.tax ? won(sd.netProceeds) : "—"} />
          <Cell l="시장 환경 분석" v={sd.marketRiskLevel} tone={mrTone(sd.marketRiskLevel)} />
        </div>
        <div className="bg-white px-5 py-1.5 text-center text-[11px] text-slate-400">데이터 신뢰도 {sd.dataConfLabel} · 거래 데이터 충분도 {sd.fitLabel}</div>
        {(sd.marketRiskLevel === "높음" || sd.marketRiskLevel === "매우높음") && <p className="bg-orange-50 px-5 py-2 text-[11px] leading-relaxed text-orange-700">시장 환경 분석은 재건축·정책·프리미엄·공급 등에 따른 가격 변동 가능성을 나타냅니다.</p>}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">희망 매도가 적정성</h3>
          <GradeInfoPopup />
        </div>
        <div className="mt-2 flex items-baseline gap-2"><span className="text-lg font-extrabold" style={{ color: NAVY }}>{won(sd.desired)}</span><span className={`text-sm font-semibold ${sd.gapVsRef > 0.03 ? "text-red-500" : sd.gapVsRef < -0.03 ? "text-blue-500" : "text-emerald-600"}`}>{sd.askingLevel}</span></div>
        <p className="mt-1 text-xs text-slate-500">{sd.isSpecial ? "시장 기준가" : "적정가"} {won(sd.refPrice)} 대비 {sd.gapVsRef >= 0 ? "+" : ""}{(sd.gapVsRef * 100).toFixed(1)}%{sd.isSpecial && sd.gapVsIntrinsic != null ? ` · 실사용 적정가 ${won(mc.intrinsicFairPrice)} 대비 +${(sd.gapVsIntrinsic * 100).toFixed(0)}%` : ""}</p>
        {sd.isSpecial && <p className="mt-1 text-[11px] text-amber-600">특수시장: 프리미엄 {(mc.premiumRatio * 100).toFixed(0)}% — 시장 분위기 변화 시 프리미엄 축소 위험을 함께 보세요.</p>}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="px-4 py-2.5" style={{ backgroundColor: "#f1f5f9" }}><p className="text-sm font-bold text-slate-700">참고 매도가 범위</p></div>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">빠른 거래</p><p className="mt-0.5 text-base font-bold text-blue-600">{won(sd.recommendedAskingRange.fast)}</p></div>
          <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">적정 거래</p><p className="mt-0.5 text-base font-bold" style={{ color: NAVY }}>{won(sd.recommendedAskingRange.real)}</p></div>
          <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">상단 참고 호가</p><p className="mt-0.5 text-base font-bold text-amber-600">{won(sd.recommendedAskingRange.challenge)}</p></div>
        </div>
        <p className="px-4 pb-3 text-[11px] text-slate-400">상단 참고 호가는 거래기간이 길어질 수 있는 높은 호가입니다.</p>
      </div>

      {!sd.provisional && sd.tax && (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h3 className="text-sm font-bold text-slate-700">세후 실수령액 개략 추정</h3>
          <div className="mt-2 flex items-baseline gap-2"><span className="text-2xl font-extrabold" style={{ color: NAVY }}>{won(sd.netProceeds)}</span><span className="text-xs text-slate-400">대출상환 후 손에 남는 돈 (개략 추정)</span></div>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between"><span>양도차익 개략</span><span>{won(sd.capitalGain)}</span></div>
            <div className="flex justify-between"><span>양도세 개략 추정 (지방소득세 10% 포함)</span><span className="text-red-500">− {won(sd.tax.tax)}</span></div>
            <div className="flex justify-between"><span>중개수수료(개략 0.4%)</span><span className="text-red-500">− {won(sd.brokerage)}</span></div>
            <div className="flex justify-between"><span>대출잔액 상환</span><span className="text-red-500">− {won(sd.loanBalance)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-700"><span>최종 실수령 개략 추정</span><span>{won(sd.netProceeds)}</span></div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{sd.tax.statusMsg || sd.tax.note} · 지방소득세 포함 · {sd.acqEstimated ? "취득가 미입력→추정" : "취득가 입력값 사용"} · 필요경비 미반영(0). 세금 숫자는 개략 추정이며 확정값이 아닙니다. 실제 세액은 보유기간, 거주요건, 세대 주택 수, 조정대상지역, 필요경비, 세법 변경, 일시적 2주택, 상속·증여·분양권·입주권 여부에 따라 달라질 수 있습니다. 세무사 확인을 권장합니다.</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={card}><h3 className="text-sm font-semibold text-slate-500">보유 vs 매도 <span className="font-normal text-slate-400">(종합 판단 보조)</span></h3><p className={`mt-2 text-base font-bold ${sd.holdingVsSellingResult === "매도 쪽 우세" ? "text-blue-600" : sd.holdingVsSellingResult === "보유 쪽 우세" ? "text-emerald-600" : "text-amber-600"}`}>{sd.holdingVsSellingResult}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{sd.holdingVsSellingNote}</p></div>
        <div className={card}><h3 className="text-sm font-semibold text-slate-500">거래 가능성</h3><p className={`mt-2 text-2xl font-bold ${sd.liquidityScore >= 80 ? "text-emerald-600" : sd.liquidityScore >= 60 ? "text-emerald-500" : sd.liquidityScore >= 40 ? "text-amber-600" : "text-orange-600"}`}>{sd.liquidityLevel}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">지연 원인: {sd.liquidityDelayCause}</p><p className="mt-0.5 text-[11px] text-slate-500">{sd.liquidityNeedAdjust ? "호가 조정 시 거래 가능성이 올라갈 수 있습니다." : "호가 수준은 거래에 큰 부담이 아닙니다."}</p><p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">거래 가능성은 실제 매수자 수요, 매물 경쟁, 호가 수준에 따라 달라질 수 있습니다.</p></div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-700">AI 매도 시점 참고</h3><span className="text-sm font-bold" style={{ color: NAVY }}>{sd.sellTimingLabel}</span></div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${sd.sellTimingScore}%`, backgroundColor: NAVY }} /></div>
        <p className="mt-2 text-[11px] text-slate-400">가격·시장·공급 등 복합 요인을 반영한 AI 참고 지표입니다.</p>
      </div>

      {sd.isSpecial && (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-200">
          <div className="px-4 py-2.5" style={{ backgroundColor: "#fff7ed" }}>
            <p className="text-sm font-bold text-orange-700">재건축·학군·희소성 영향 단지 안내</p>
            <p className="mt-0.5 text-xs text-orange-600">재건축 기대감 또는 희소성으로 인해 매매가가 전세가보다 높게 형성된 단지입니다. 현재 분석은 프리미엄 요인을 반영하여 계산되었습니다.</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-orange-100">
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">실사용 적정가</p><p className="mt-0.5 font-bold text-slate-800">{won(mc.intrinsicFairPrice)}</p></div>
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">시장 기준가</p><p className="mt-0.5 font-bold text-slate-800">{won(mc.marketReferencePrice)}</p></div>
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">프리미엄 금액</p><p className="mt-0.5 font-bold text-amber-600">{won(mc.premiumAmount)}</p></div>
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">프리미엄 비율</p><p className="mt-0.5 font-bold text-amber-600">{(mc.premiumRatio * 100).toFixed(0)}%</p></div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="text-slate-500">재건축 단계</span><span className="font-semibold text-slate-700">{RECON[mc.reconstructionStage].label} · {mc.stageScore}점</span></div>
          <p className="px-4 pb-3 text-[11px] leading-relaxed text-slate-400">{mc.specialMarketType === "redevelopment" && mc.stageScore >= 85 ? "관리처분·이주·착공에 가까워 보유 관점이 우세한 것으로 분석됩니다." : mc.specialMarketType === "redevelopment" ? "재건축 초기·프리미엄 과다 구간에서는 일부 차익실현(매도 검토)도 선택지입니다." : "프리미엄이 큰 단지는 시장 분위기 변화 시 프리미엄 축소 위험을 함께 고려하세요."} 사업 지연·분담금·정책 변경 가능성 존재.</p>
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h3 className="text-sm font-semibold text-slate-500">매도 판단 핵심 이유 5가지</h3>
        <ol className="mt-3 space-y-2.5">{sd.sellerReasons.map((t, i) => (<li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>{i + 1}</span><span>{t}</span></li>))}</ol>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-[11px] leading-relaxed text-slate-500">본 매도 분석은 공개 데이터와 사용자 입력값을 기반으로 한 참고용 계산입니다. 실제 세금·대출상환액·거래비용·매수자 수요·정책 변화·시장 상황에 따라 결과가 달라질 수 있습니다. 본 결과는 매도 권유나 투자자문이 아닙니다.</div>

      {/* ── PDF 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const gapPct = (Math.abs(sd.gapVsRef) * 100).toFixed(1);
            const text = `ValueLens 매도 가격평가 리포트
${"=".repeat(40)}
발행일: ${date}
단지: ${f.complexName || "—"} ${f.dong ? `· ${f.dong}` : ""} ${Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}

[매도 평가 결과]
  매도 판단: ${sd.finalSellDecision}
  희망 매도가: ${won(Number(f.currentPrice))}
  AI 적정가: ${won(sd.refPrice)}
  가격 위치: ${sd.askingLevel} (적정가 대비 ${sd.gapVsRef >= 0 ? "+" : ""}${gapPct}%)
  세후 실수령 개략: ${!sd.provisional && sd.tax ? won(sd.netProceeds) : "—"}

[참고 매도가 범위]
  빠른 거래: ${won(sd.recommendedAskingRange.fast)}
  적정 거래: ${won(sd.recommendedAskingRange.real)}
  상단 참고 호가: ${won(sd.recommendedAskingRange.challenge)}

[거래 가능성]
  ${sd.liquidityLevel} · ${sd.liquidityDelayCause}

[AI 매도 시점 참고]
  ${sd.sellTimingLabel}

[AI 판단 요약]
  ${sd.sellerAction}

${"=".repeat(40)}
이 리포트를 활용하기 전 확인하세요
□ 공인중개사에게 현장 시세·매물 경쟁력을 확인했나요?
□ 세무사에게 양도세를 상담받았나요?
   (보유기간·거주요건에 따라 세액이 크게 달라집니다)
□ 세후 실수령액을 세무사와 함께 계산했나요?
□ 대출 상환 일정·중도상환 수수료를 확인했나요?

위 항목 확인 후 최종 결정하시기 바랍니다.
본 리포트는 AI 가격 적정성 참고자료이며
매도 권유·투자자문·감정평가서가 아닙니다.
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
            a.download = `ValueLens_매도_${f.complexName || "가격평가"}_${date.replace(/\./g, "")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">매도 가격평가 리포트 저장</p>
            <p className="mt-0.5 text-xs text-slate-400">희망가·적정가·거래 가능성·AI 판단 요약 포함 · 계산식 제외</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>

      {/* ── 하단 네비게이션 CTA ── */}
      <div className="mt-6 space-y-3">
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
        )}
        <SellSaveBtn r={r} f={f} sd={sd} onBack={onBack} showFull uid={currentUserId} />
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-600 active:bg-slate-50">
            ← 다시 평가
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

export { SellResult };
