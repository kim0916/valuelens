// ValueLens — TaxView
// Phase 1 Cleanup: main.jsx에서 분리
// props / 함수명 / className / 세금 계산 로직 변경 금지

import React, { useState } from 'react';
import { NAVY } from '../constants/brand.js';
import { won } from '../constants/grades.js';
import { acqTax, cgTax } from '../engine/tax.js';

// ── TaxView 전용 상수 ──
const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:bg-white";

// ── 세금 계산 래퍼 (engine/tax.js 위임) ──
function calculateAcquisitionTax({ price, area85over = false, houses = 1, regulated = false, firstTime = false }) { return acqTax(price, area85over, houses, regulated, firstTime); }
function calculateCapitalGainsTax(args) { return cgTax(args); }

function TaxView({ buyCtx, sellCtx }) {
  const [mode, setMode] = useState("acq");
  const [price, setPrice] = useState(""), [area, setArea] = useState(""), [houses, setHouses] = useState("1"), [regulated, setRegulated] = useState(false), [firstTime, setFirstTime] = useState(false);
  const [buyP, setBuyP] = useState(""), [sellP, setSellP] = useState(""), [years, setYears] = useState("5"), [livedY, setLivedY] = useState(""), [oneHouse, setOneHouse] = useState(true), [expenses, setExpenses] = useState(""), [loanBal, setLoanBal] = useState(""), [acqRegulated, setAcqRegulated] = useState(false), [sellHouses, setSellHouses] = useState("1");
  const [cx, setCx] = useState({ temp2: false, inherit: false, right: false, rental: false, corp: false, expenseManual: false }); // 고난도 세무 케이스 플래그 (정밀계산 X, 주의표시용)
  const COMPLEX = [["temp2", "일시적 2주택 가능성 있음"], ["inherit", "상속/증여 주택 포함"], ["right", "분양권/입주권 보유"], ["rental", "임대사업자"], ["corp", "법인 보유"], ["expenseManual", "필요경비 직접 입력"]];
  const anyComplex = Object.values(cx).some(Boolean);
  const acq = price ? calculateAcquisitionTax({ price: Number(price), area85over: Number(area) > 85, houses: Number(houses), regulated, firstTime }) : null;
  const cgt = buyP && sellP ? calculateCapitalGainsTax({ buy: Number(buyP), sell: Number(sellP), years: Number(years), oneHouse, lived: Number(livedY) > 0, livedYears: livedY === "" ? null : Number(livedY), expenses: Number(expenses) || 0, acquiredRegulated: acqRegulated, houses: Number(sellHouses) || (oneHouse ? 1 : 2) }) : null;
  const ETC = 200, BROK = (p) => Math.round(p * 0.004);
  const buyBrok = price ? BROK(Number(price)) : 0, buyTotalCash = price ? Number(price) + (acq ? acq.total : 0) + buyBrok + ETC : 0;
  const sellBrok = sellP ? BROK(Number(sellP)) : 0, netCash = sellP && cgt ? Number(sellP) - cgt.tax - sellBrok - (Number(loanBal) || 0) - ETC : 0;
  const Row = ({ l, v, strong }) => <div className={`flex justify-between border-t border-slate-100 px-4 py-2.5 text-sm ${strong ? "bg-slate-50 font-bold text-slate-800" : ""}`}><span className={strong ? "text-slate-700" : "text-slate-500"}>{l}</span><span className="font-semibold text-slate-800">{v}</span></div>;
  return (
    <>
      <header className="mb-6 text-center"><h1 className="text-2xl font-bold text-slate-900">부동산 세금 계산</h1><p className="mt-2 text-sm text-slate-500">매수 시 취득세 / 매도 시 양도세를 개략 추정합니다.</p></header>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setMode("acq")} className={`flex-1 rounded-2xl py-3 text-sm font-bold ${mode === "acq" ? "text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`} style={mode === "acq" ? { backgroundColor: NAVY } : {}}>매수 세금 (취득세)</button>
        <button onClick={() => setMode("cgt")} className={`flex-1 rounded-2xl py-3 text-sm font-bold ${mode === "cgt" ? "text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`} style={mode === "cgt" ? { backgroundColor: NAVY } : {}}>매도 세금 (양도세)</button>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        {((Number(price) < 0) || (Number(buyP) < 0) || (Number(sellP) < 0)) && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700">⚠️ 음수 금액은 계산에 사용할 수 없습니다. (0으로 처리됩니다)</div>}
        {mode === "acq" ? (
          <>
            {buyCtx && buyCtx.price ? <button onClick={() => { setPrice(String(buyCtx.price)); setArea(String(buyCtx.area || "")); }} className="mb-4 w-full rounded-xl bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700">↓ 매수 화면에서 분석한 값 불러오기 ({won(buyCtx.price)})</button> : null}
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">매수가 (만원)</span><input type="number" className={inp} value={price} placeholder="50000" onChange={(e) => setPrice(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">전용면적 (㎡)</span><input type="number" className={inp} value={area} placeholder="59" onChange={(e) => setArea(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">보유 주택 수</span><input type="number" className={inp} value={houses} onChange={(e) => setHouses(e.target.value)} /></label>
              <div className="flex flex-col justify-end gap-1.5 pb-2.5">
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={regulated} onChange={(e) => setRegulated(e.target.checked)} />조정대상지역</label>
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={firstTime} onChange={(e) => setFirstTime(e.target.checked)} />생애최초 (12억 이하)</label>
              </div>
            </div>
            {acq && (
              <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <div className="px-4 py-3 text-white" style={{ backgroundColor: NAVY }}><p className="text-xs text-slate-300">총 필요 현금 개략 추정 (매수가 + 부대비용)</p><p className="text-2xl font-bold">{won(buyTotalCash)}</p></div>
                <Row l="매수가" v={won(Number(price))} />
                <Row l={`취득세 본세 (세율 ${(acq.rate * 100).toFixed(1)}%)`} v={won(acq.main)} />
                {acq.firstHomeDiscount > 0 && <Row l="└ 생애최초 감면" v={`− ${won(acq.firstHomeDiscount)}`} />}
                <Row l="지방교육세" v={won(acq.edu)} /><Row l="농어촌특별세 (85㎡ 초과)" v={won(acq.farm)} />
                <Row l="중개수수료 (개략 0.4%)" v={won(buyBrok)} /><Row l="기타 비용 개략 (법무·등기 등)" v={won(ETC)} />
                <Row l="총 필요 현금 개략 추정" v={won(buyTotalCash)} strong />
                <p className="bg-slate-50 px-4 py-2 text-[11px] text-slate-400">중개수수료는 0.4% 개략입니다. TODO(API/정책): 실제 중개보수 상한요율표로 교체 예정. · 총 필요 현금은 추천후보 탭 「내 조건」의 보유 현금·대출 가능액 개략 추정과 함께 해석하세요(보유 현금 + 대출 가능액 ≥ 총 필요 현금 여부).</p>
              </div>
            )}
          </>
        ) : (
          <>
            {sellCtx && sellCtx.sellPrice ? <button onClick={() => { setBuyP(String(sellCtx.acqPrice || "")); setSellP(String(sellCtx.sellPrice)); setYears(String(sellCtx.years || 5)); setLoanBal(String(sellCtx.loanBalance || "")); }} className="mb-4 w-full rounded-xl bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700">↓ 매도 화면에서 평가한 값 불러오기 ({won(sellCtx.sellPrice)})</button> : null}
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">취득가 (만원)</span><input type="number" className={inp} value={buyP} placeholder="40000" onChange={(e) => setBuyP(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">매도가 (만원)</span><input type="number" className={inp} value={sellP} placeholder="60000" onChange={(e) => setSellP(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">보유기간 (년)</span><input type="number" className={inp} value={years} onChange={(e) => setYears(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">실거주기간 (년)</span><input type="number" className={inp} value={livedY} placeholder="0" onChange={(e) => setLivedY(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">필요경비 (만원, 선택)</span><input type="number" className={inp} value={expenses} placeholder="0" onChange={(e) => setExpenses(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">대출잔액 (만원)</span><input type="number" className={inp} value={loanBal} placeholder="0" onChange={(e) => setLoanBal(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">현재 주택 수</span><input type="number" className={inp} value={sellHouses} onChange={(e) => setSellHouses(e.target.value)} /></label>
              <div className="flex flex-col justify-end gap-1.5 pb-2.5">
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={oneHouse} onChange={(e) => setOneHouse(e.target.checked)} />1세대 1주택</label>
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={acqRegulated} onChange={(e) => setAcqRegulated(e.target.checked)} />취득 당시 조정대상지역</label>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-600">복잡 세무 케이스 체크 (정밀 계산 아님 · 해당 시 세무사 확인 필요)</p>
              <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {COMPLEX.map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={cx[k]} onChange={(e) => setCx((p) => ({ ...p, [k]: e.target.checked }))} />{label}</label>
                ))}
              </div>
            </div>
            {anyComplex && (
              <div className="mt-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700">⚠️ 복잡 세무 케이스입니다.</p>
                <p className="mt-1 text-xs leading-relaxed text-red-600">본 계산은 일반 1주택·다주택 기준의 <b>단순 개략 추정</b>이며, 체크하신 항목(일시적 2주택·상속/증여·분양권/입주권·임대사업자·법인 등)은 별도 세법이 적용되어 <b>이 추정에 반영되지 않았습니다</b>. 실제 세액은 반드시 <b>세무사 확인을 권장합니다.</b></p>
              </div>
            )}
            {cgt && (
              <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <div className="px-4 py-3 text-white" style={{ backgroundColor: NAVY }}><p className="text-xs text-slate-300">최종 실수령액 개략 추정 (대출상환 후)</p><p className="text-2xl font-bold">{won(netCash)}</p></div>
                <div className={`px-4 py-2 text-xs font-semibold ${cgt.exempt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{cgt.statusMsg}</div>
                <Row l="매도가" v={won(Number(sellP))} />
                <Row l={`양도차익 (필요경비 ${Number(expenses) > 0 ? won(Number(expenses)) + " 반영" : "0"} 차감)`} v={won(cgt.gain)} />
                {cgt.over > 0 && cgt.over !== cgt.gain && <Row l="└ 과세 대상 (12억 초과분)" v={won(cgt.over)} />}
                {cgt.ltd > 0 && <Row l={`└ 장기보유특별공제 ${Math.round(cgt.ltd * 100)}%`} v={`− ${won(Math.round(cgt.over * cgt.ltd))}`} />}
                <Row l="과세표준 (기본공제 250만 차감)" v={won(cgt.taxable || 0)} />
                <Row l="양도소득세 본세 개략 추정" v={won(cgt.baseTax || 0)} /><Row l="지방소득세 (10%)" v={won(cgt.localTax || 0)} />
                <Row l="양도세 합계 개략 추정" v={won(cgt.tax)} />
                <Row l="중개수수료 (개략 0.4%)" v={won(sellBrok)} /><Row l="대출잔액 상환" v={won(Number(loanBal) || 0)} /><Row l="기타 비용 개략" v={won(ETC)} />
                <Row l="최종 실수령액 개략 추정" v={won(netCash)} strong />
              </div>
            )}
          </>
        )}
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">세금 숫자는 <b>개략 추정</b>이며 최종 확정값이 아닙니다. 실제 세액은 보유기간, 거주요건, 세대 주택 수, 조정대상지역, 필요경비, 세법 변경, 일시적 2주택, 상속·증여·분양권·입주권 여부에 따라 달라질 수 있습니다. <b>세무사 확인이 필요합니다.</b></p>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h3 className="text-sm font-bold text-slate-700">세금 주의사항</h3>
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-500">
          <li>· 본 계산은 일반적인 1세대 1주택·다주택 케이스의 <b>개략 추정</b>이며 실제 세액과 다를 수 있습니다.</li>
          <li>· 세율·공제·비과세 기준은 <b>세법 변경</b>으로 달라질 수 있습니다.</li>
          <li>· 아래 경우는 별도 계산식이 필요해 <b>이번 추정에 반영되지 않았습니다</b> — 세무사 확인이 필요합니다:</li>
          <li className="pl-3 text-slate-400">일시적 2주택 비과세 / 상속·증여주택 / 분양권·입주권 / 재건축 입주권 전환 / 법인 보유 / 임대사업자 / 조정대상지역 지정·해제 이력 / 필요경비 상세 분류 / 실제 중개보수 상한요율표 / 종합부동산세</li>
          <li>· 최종 의사결정 전 반드시 세무 전문가의 확인을 받으세요.</li>
        </ul>
      </div>

      {/* ── 세금 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const buyP = Number(buyCtx?.price) || 0;
            const sellP = Number(sellCtx?.price) || 0;
            const acq = buyP > 0 ? acqTax(buyP) : null;
            const text = `ValueLens 세금 개략 추정 리포트
${"=".repeat(40)}
발행일: ${date}
⚠ 본 리포트의 세금 수치는 개략 추정이며 확정값이 아닙니다.
   반드시 세무사 확인 후 의사결정 하세요.

${buyP > 0 ? `[매수 세금 개략]
  매수가: ${won(buyP)}
  취득세 개략: ${acq ? won(acq.total) : "—"}
  (세율·공제는 주택 수·조정지역·면적에 따라 달라짐)
` : ""}${sellP > 0 ? `[매도 세금 개략]
  매도가: ${won(sellP)}
  (양도세는 취득가·보유기간·거주요건·주택 수에 따라 크게 달라짐)
  세무사를 통해 정확한 세액을 확인하세요.
` : ""}
[반영되지 않은 항목]
  · 일시적 2주택 비과세
  · 상속·증여주택 / 분양권·입주권
  · 임대사업자 / 법인 보유
  · 조정대상지역 지정·해제 이력
  · 필요경비 상세 분류
  · 종합부동산세

${"=".repeat(40)}
📋 세금은 반드시 세무사와 상담하세요
□ 세무사에게 취득세 정확한 세액을 확인했나요?
□ 양도세는 보유기간·거주요건·주택 수에 따라 크게 달라집니다.
   세무사 상담을 받았나요?
□ 일시적 2주택·분양권·입주권 등 특수 상황을
   세무사에게 알렸나요?
□ 종합부동산세·재산세 부담도 함께 확인했나요?

본 리포트의 세금 수치는 개략 추정이며
실제 세액과 다를 수 있습니다.
반드시 세무사 확인 후 의사결정 하세요.

[엔진 주의사항]
본 리포트는 국토부 실거래 및 입력 데이터를 바탕으로 한 참고용 분석입니다.
ValueLens의 적정가는 보장 가격이나 감정평가액이 아니며,
특히 데이터 부족, 전세가율 이상치, 재건축·학군·희소성 영향 단지는
분석 신뢰도가 낮을 수 있습니다.

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
            a.download = `ValueLens_세금개략_${date.replace(/\./g, "")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">📄 세금 개략 추정 리포트 저장</p>
            <p className="mt-0.5 text-xs text-amber-600">⚠ 개략 추정값 · 반드시 세무사 확인 필요</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>
    </>
  );
}

export { TaxView };
