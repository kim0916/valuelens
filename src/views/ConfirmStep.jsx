// ValueLens — ConfirmStep
// Phase 1-E: main.jsx에서 분리
// props / 함수명 / className / 입력 구조 변경 금지

import React, { useState } from 'react';
import { NAVY } from '../constants/brand.js';
import { won, typicalPyeong } from '../constants/grades.js';
import { computeTrimmedMean } from '../engine/stats.js';

// ── DealsEditor (ConfirmStep 전용) ──
function DealsEditor({ title = "전세 실거래", deals, setDeals, kind = "jeonse" }) {
  const [open, setOpen] = useState(false);
  const list = deals || [];
  const add = () => setDeals([...list, { ym: "", price: "", floor: "", topFloor: "", banjiha: false, urgent: false, related: false }]);
  const upd = (i, k, v) => setDeals(list.map((d, j) => (j === i ? { ...d, [k]: v } : d)));
  const del = (i) => setDeals(list.filter((_, j) => j !== i));
  const flags = [["banjiha", "반지하"], ["urgent", kind === "sale" ? "급매" : "급전세"], ["related", "특수관계"]];
  const ip = "rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-600";
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold text-slate-700">{title} 입력 <span className="font-normal text-slate-400">(정제평균 자동산정 · 최근 6개월)</span></span>
        <span className="text-xs text-slate-400">{open ? "접기 ▲" : `${list.length}건 ▼`}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {list.length === 0 && <p className="text-xs text-slate-400">거래를 추가하면 기준 전세가를 자동 산정합니다. 비우면 위 수동 입력값을 사용합니다.</p>}
          {list.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white p-2 ring-1 ring-slate-100">
              <input value={d.ym} onChange={(e) => upd(i, "ym", e.target.value)} placeholder="2026-03" className={`w-20 ${ip}`} />
              <input type="number" value={d.price} onChange={(e) => upd(i, "price", e.target.value)} placeholder="가격" className={`w-20 ${ip}`} />
              <input type="number" value={d.floor} onChange={(e) => upd(i, "floor", e.target.value)} placeholder="층" className={`w-14 ${ip}`} />
              {flags.map(([k, l]) => (
                <button key={k} onClick={() => upd(i, k, !d[k])} className={`rounded-md px-2 py-1 text-xs font-medium ${d[k] ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}>{l}</button>
              ))}
              <button onClick={() => del(i)} className="ml-auto px-1 text-xs text-slate-300 hover:text-red-500">×</button>
            </div>
          ))}
          <button onClick={add} className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:bg-white">+ 거래 추가</button>
        </div>
      )}
    </div>
  );
}

function ConfirmStep({ p, f, onBack, onConfirm, mode = "buy", onRefetch, onBackToTop }) {
  // ConfirmStep 내부에서 직접 수정 가능한 상태 관리
  const [edit, setEdit] = useState({ ...p.ff });
  const [dealsOpen, setDealsOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const setE = (k, v) => setEdit((prev) => ({ ...prev, [k]: v }));

  const age = edit.buildYear ? new Date().getFullYear() - Number(edit.buildYear) : null;
  const isSell = mode === "sell";

  // ── 진입 경로 판별 ──
  // fromAI: 이미지 캡처 → AI 인식 경로 (_aiFilled=true, blockReason 없음)
  // fromData: 검색 후 데이터 부족 경로 (blockReason 있거나 데이터 소스가 supabase/molit)
  const fromAI = !!(edit._aiFilled && !p.blockReason);
  const fromData = !fromAI;

  // 항목별 인식 상태 판별 (AI 경로에서만 사용)
  const fieldStatus = (val) => val ? "auto" : "missing"; // auto=자동인식, missing=확인필요

  // 수정된 값으로 jeonseCalc·saleCalc 재계산
  const hasDeals = (edit.deals || []).some((d) => d.price && d.ym);
  const jeonseCalc = hasDeals
    ? computeTrimmedMean(edit.deals, Number(edit.kbJeonse) || 0, "jeonse")
    : p.jeonseCalc;
  const baseJeonse = jeonseCalc && jeonseCalc.value ? jeonseCalc.value : Number(edit.kbJeonse) || 0;
  const hasSaleDeals = (edit.saleDeals || []).some((d) => d.price && d.ym);
  const saleCalc = hasSaleDeals
    ? computeTrimmedMean(edit.saleDeals, Number(edit.kbSalePrice) || 0, "sale")
    : p.saleCalc;

  // 분석 실행 — 수정된 edit 값 기반으로 ff 재조립
  function handleConfirm() {
    if (!edit.currentPrice) { alert(isSell ? "희망 매도가를 입력하세요." : "현재 매물가를 입력하세요."); return; }
    if (!baseJeonse) { alert("기준 전세가 또는 전세 실거래를 입력하세요."); return; }
    const ff = {
      ...edit,
      currentPrice: Number(edit.currentPrice),
      baseJeonse,
      kbSalePrice: Number(edit.kbSalePrice) || 0,
      saleRef: saleCalc && saleCalc.value ? saleCalc.value : null,
      jeonseUsed: jeonseCalc ? jeonseCalc.used : 0,
      saleUsed: saleCalc ? saleCalc.used : 0,
      jeonseCalc, saleCalc,
      shockLevel: edit.shockLevel || "보통",
      dataSource: edit._aiFilled ? "ai" : "manual",
    };
    onConfirm({ ff, jeonseCalc, saleCalc });
  }

  const inp2 = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600";

  // 항목 상태 뱃지
  const AutoBadge = () => <span className="ml-1.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">✓ 자동 인식됨</span>;
  const MissingBadge = () => <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">확인 필요</span>;
  const OkBadge = () => <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">확인됨</span>;
  const NeedBadge = () => <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">직접 입력 필요</span>;

  const StatusBadge = ({ val }) => {
    if (fromAI) return fieldStatus(val) === "auto" ? <AutoBadge /> : <MissingBadge />;
    return val ? <OkBadge /> : <NeedBadge />;
  };

  return (
    <>
      {/* 헤더 */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← 수정</button>
        <h1 className="text-lg font-bold text-slate-900">
          {fromAI ? "AI 인식 결과 확인" : "최근 실거래 데이터가 부족합니다"}
        </h1>
        {onBackToTop && <button onClick={onBackToTop} className="ml-auto text-xs text-slate-400 hover:text-slate-600">처음으로</button>}
      </div>

      {/* 안내문 — 경로별 분기 */}
      <div className={`mb-4 rounded-2xl px-4 py-3 ring-1 ${fromAI ? "bg-blue-50 ring-blue-100" : "bg-blue-50 ring-blue-100"}`}>
        {fromAI ? (
          <>
            <p className="text-sm font-semibold text-blue-800">사진에서 인식한 정보를 확인해 주세요.</p>
            <p className="mt-0.5 text-xs text-blue-600">틀린 항목만 수정하면 됩니다. 부동산은 고가 의사결정이므로 주요 수치를 꼭 확인하세요.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-blue-800">최근 실거래 데이터가 부족합니다</p>
            <p className="mt-0.5 text-xs text-blue-600">최근 12개월 동안 해당 면적의 실거래가 부족합니다.<br />주상복합 또는 거래량이 적은 단지는 분석에 필요한 표본 수가 확보되지 않을 수 있습니다.<br />KB시세 또는 직접 확인한 시세를 입력하면 더 정확한 분석이 가능합니다.</p>
          </>
        )}
      </div>

      {/* AI 인식 요약 카드 — fromAI 경로에서만 표시 */}
      {fromAI && (
        <div className="mb-4 rounded-2xl bg-slate-50 ring-1 ring-slate-200 overflow-hidden">
          <div className="bg-slate-800 px-4 py-2.5">
            <p className="text-xs font-semibold text-slate-300">AI 인식 항목 요약</p>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { label: "시/도", val: edit.sido || edit.region?.split(" ")[0] },
              { label: "구/군", val: edit.region },
              { label: "동", val: edit.dong },
              { label: "단지명", val: edit.complexName },
              { label: "면적", val: Number(edit.areaExclusive) > 0 ? `${edit.areaExclusive}㎡` : null },
              { label: "현재 매물가", val: edit.currentPrice ? won(Number(edit.currentPrice)) : null },
              { label: "KB시세 (전세)", val: edit.kbJeonse ? won(Number(edit.kbJeonse)) : null },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-slate-500">{label}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${val ? "text-slate-800" : "text-slate-400"}`}>
                    {val || "—"}
                  </span>
                  <StatusBadge val={val} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 경고 메시지 — 데이터 부족 경로 */}
      {p.blockReason && (() => {
        const isDataShort = p.blockReason.includes("실거래 데이터가 부족") || p.blockReason.includes("불러오지 못했습니다");
        return (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-800">
            {isDataShort ? "최근 실거래 데이터가 부족합니다" : "추가 입력이 필요합니다"}
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            {isDataShort
              ? "최근 12개월 동안 해당 면적의 실거래가 확인되지 않았습니다.\n주상복합 또는 거래량이 적은 단지는 분석에 필요한 표본 수가 확보되지 않을 수 있습니다.\nKB시세 또는 직접 확인한 시세를 입력하면 더 정확한 분석이 가능합니다."
              : p.blockReason}
          </p>
          {Array.isArray(edit._aiAreaOptions) && edit._aiAreaOptions.length > 0 ? (
            <div className="mt-2">
              <p className="mb-1.5 text-xs font-medium text-amber-700">다른 면적으로 분석하려면 선택하세요:</p>
              <div className="flex flex-wrap gap-2">
                {edit._aiAreaOptions.map((o, i) => {
                  const { mainLabel, subLabel } = areaButtonLabel(o.areaSqm, o.supplySqm);
                  return (
                    <button key={i}
                      onClick={() => { onRefetch && onRefetch(o.areaSqm); }}
                      className="rounded-lg bg-white px-3 py-1.5 text-left ring-1 ring-red-300 active:bg-red-100">
                      <p className="text-xs font-bold text-red-700">{mainLabel}</p>
                      {subLabel && <p className="text-[10px] text-red-400 mt-0.5">{subLabel}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs text-red-500">아래에서 값을 직접 수정한 뒤 분석을 실행하세요.</p>
          )}
        </div>
        );
      })()}
      {/* 면적 변경 안내 */}
      {edit._areaChangedMsg && (
        <div className="mb-3 rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-200">
          <p className="text-xs font-semibold text-blue-700">{edit._areaChangedMsg}</p>
        </div>
      )}
      {Array.isArray(edit._aiWarns) && edit._aiWarns.length > 0 && (
        <div className="mb-4 space-y-1">
          {edit._aiWarns.map((w, i) => (
            <div key={i} className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700 ring-1 ring-amber-100">{w}</div>
          ))}
        </div>
      )}

      {/* 단지 정보 (읽기전용 요약) */}
      <div className="mb-4 rounded-2xl bg-slate-800 px-5 py-4 text-white">
        <p className="text-xs text-slate-400">조회 단지</p>
        <p className="mt-1 text-lg font-bold">
          {edit.complexName || "단지명 미확인"}
          {edit.dong ? ` · ${edit.dong}` : ""}
          {Number(edit.areaExclusive) > 0 ? ` ${areaButtonLabel(edit.areaExclusive).mainLabel}` : ""}
        </p>
        {Number(edit.areaExclusive) > 0 && (
          <p className="mt-0.5 text-xs text-slate-400">{areaButtonLabel(edit.areaExclusive).subLabel}</p>
        )}
        {/* 면적 옵션 — AI 인식 여부로 분기 */}
        {Array.isArray(edit._aiAreaOptions) && edit._aiAreaOptions.length > 0 && (() => {
          const hasAiArea = Number(edit.areaExclusive) > 0;
          return hasAiArea ? (
            // AI가 면적 인식 → 접힘 패턴
            <div className="mt-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-700 px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-slate-400">AI 추천 면적</p>
                  <p className="mt-0.5 text-sm font-bold text-white">{areaButtonLabel(edit.areaExclusive).mainLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">자동 인식됨</span>
                  <button
                    onClick={() => setAreaOpen(v => !v)}
                    className="rounded-lg bg-slate-600 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-500">
                    {areaOpen ? "접기 ▲" : "다른 면적 선택 ▼"}
                  </button>
                </div>
              </div>
              {areaOpen && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {edit._aiAreaOptions.map((o, i) => {
                    const { mainLabel, subLabel } = areaButtonLabel(o.areaSqm, o.supplySqm);
                    const selected = Number(edit.areaExclusive) === o.areaSqm;
                    return (
                      <button key={i} onClick={() => { setE("areaExclusive", String(o.areaSqm)); if (onRefetch) onRefetch(o.areaSqm); setAreaOpen(false); }}
                        className={`rounded-lg px-2.5 py-1.5 text-left ${selected ? "bg-white text-slate-900" : "bg-slate-700 text-slate-300"}`}>
                        <p className="text-xs font-semibold">{mainLabel}</p>
                        {subLabel && <p className="text-[10px] mt-0.5 text-slate-500">{subLabel}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // AI 면적 미인식 → 기존처럼 기본 노출
            <div className="mt-2">
              <p className="text-[11px] text-slate-400">면적을 선택하세요:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {edit._aiAreaOptions.map((o, i) => {
                  const { mainLabel, subLabel } = areaButtonLabel(o.areaSqm, o.supplySqm);
                  const selected = Number(edit.areaExclusive) === o.areaSqm;
                  return (
                    <button key={i} onClick={() => { setE("areaExclusive", String(o.areaSqm)); if (onRefetch) onRefetch(o.areaSqm); }}
                      className={`rounded-lg px-2.5 py-1.5 text-left ${selected ? "bg-white text-slate-900" : "bg-slate-700 text-slate-300"}`}>
                      <p className="text-xs font-semibold">{mainLabel}</p>
                      {subLabel && <p className="text-[10px] mt-0.5 text-slate-500">{subLabel}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── 핵심 수치 수정 카드 ── */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="mb-4 text-sm font-bold text-slate-700">핵심 데이터 확인 및 수정</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* 현재 매물가 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              {isSell ? "희망 매도가 (만원)" : "현재 매물가 (만원)"}
              <span className="ml-1 font-normal text-red-500">*필수</span>
              <StatusBadge val={edit.currentPrice} />
            </span>
            {fromAI && <p className="mb-1 text-[10px] text-slate-400">틀린 경우 직접 수정해 주세요. 예: 370000 = 37억</p>}
            <input type="number" className={inp2} value={edit.currentPrice} placeholder="예: 58000"
              onChange={(e) => setE("currentPrice", e.target.value)} />
          </label>

          {/* 전용면적 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">전용면적 (㎡)</span>
            <div className="flex gap-2">
              <input type="number" className={inp2} value={edit.areaExclusive} placeholder="예: 59.99"
                onChange={(e) => setE("areaExclusive", e.target.value)} />
              {Number(edit.areaExclusive) > 0 && onRefetch && (
                <button type="button" onClick={() => onRefetch(Number(edit.areaExclusive))}
                  className="shrink-0 rounded-xl bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-700">
                  재조회
                </button>
              )}
            </div>
            {Number(edit.areaExclusive) > 0 && (
              <p className="mt-1 text-[11px] text-slate-400">통상 약 {typicalPyeong(edit.areaExclusive)}평형 · 면적 입력 후 재조회 버튼 클릭</p>
            )}
          </label>

          {/* 실거래 상태 안내 — 원인별 구분 */}
          {edit._tradeStatus && edit._tradeStatus.code !== "OK" && (() => {
            const ts = edit._tradeStatus;
            const isApiFail  = ts.code === "API_FAIL";
            const isNoTrade  = ["COMPLEX_NO_TRADE","NAME_NO_MATCH","PERIOD_NO_TRADE"].includes(ts.code);
            const isLowData  = ["LOW_DATA","TOO_FEW"].includes(ts.code);
            const isAreaFail = ts.code === "AREA_NO_MATCH";
            const needKb = isApiFail || isNoTrade || ts.code === "JEONSE_SHORT";
            const label =
              isApiFail ? "API 조회 실패" :
              isNoTrade ? "단지 거래 없음" :
              ts.code === "JEONSE_AREA_SHORT" || ts.code === "AREA_SHORT_JEONSE_ELSEWHERE" ? "선택 면적 전세 실거래 부족" :
              ts.code === "SALE_SHORT" ? "매매 실거래 부족" :
              "선택 면적 실거래 부족";
            return (
              <label className="block col-span-2">
                <div className="mb-2 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
                  <p className="text-xs font-bold text-amber-800">{label}</p>
                  <p className="mt-0.5 text-[10px] text-amber-600">{ts.msg}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button"
                      onClick={() => { const q = ((edit.dong||"")+" "+(edit.complexName||"")).trim(); window.open("https://new.land.naver.com/search?keyword="+encodeURIComponent(q), "_blank", "noopener,noreferrer"); }}
                      className="rounded px-2 py-1 text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200">
                      네이버 KB시세 확인 →
                    </button>
                    {ts.canExpand && onRefetch && Number(edit.areaExclusive) > 0 && (
                      <button type="button"
                        onClick={() => onRefetch(Number(edit.areaExclusive))}
                        className="rounded px-2 py-1 text-[10px] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200">
                        면적 범위 확장 재조회
                      </button>
                    )}
                  </div>
                </div>
                {needKb && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-600">KB 매매시세 (만원)</p>
                      <input type="number" className={inp2} value={edit.kbSalePrice} placeholder="예: 50250"
                        onChange={(e) => setE("kbSalePrice", e.target.value)} />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-600">KB 전세시세 (만원)</p>
                      <input type="number" className={inp2} value={edit.kbJeonse} placeholder="예: 35000"
                        onChange={(e) => setE("kbJeonse", e.target.value)} />
                    </div>
                  </div>
                )}
              </label>
            );
          })()}

          {/* 기준 전세가 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              기준 전세가 (만원)
              <span className="ml-1 font-normal text-red-500">*필수</span>
              <StatusBadge val={jeonseCalc?.value || edit.baseJeonse || edit.kbJeonse} />
            </span>
            {fromAI && <p className="mb-1 text-[10px] text-slate-400">KB시세 캡처 시 자동 입력됩니다. 인식 안 되면 직접 입력해 주세요.</p>}
            <input type="number" className={inp2}
              value={jeonseCalc && jeonseCalc.value ? jeonseCalc.value : (edit.baseJeonse || edit.kbJeonse || "")}
              placeholder="예: 34000"
              onChange={(e) => setE("baseJeonse", e.target.value)} />
            {jeonseCalc && jeonseCalc.used > 0 && (
              <div className="mt-1">
                <p className="text-[11px] text-emerald-600">실거래 {jeonseCalc.used}건 정제평균 자동 반영</p>
                {jeonseCalc.excluded > 0 && jeonseCalc.reasonText && (
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">↳ {jeonseCalc.reasonText}</p>
                )}
              </div>
            )}
          </label>

          {/* 준공연도 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">준공연도</span>
            <input type="number" className={inp2} value={edit.buildYear} placeholder="예: 1999"
              onChange={(e) => setE("buildYear", e.target.value)} />
            {edit.buildYearWarning && (
              <p className="mt-1 text-[11px] text-amber-600 font-semibold">{edit.buildYearWarning} — 직접 입력하세요</p>
            )}
            {age !== null && (
              <p className="mt-1 text-[11px] text-slate-400">{age}년차{age >= 28 ? " · 재건축권" : ""}</p>
            )}
          </label>

          {/* 시장충격 위험도 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">시장충격 위험도</span>
            <select className={inp2} value={edit.shockLevel} onChange={(e) => setE("shockLevel", e.target.value)}>
              {["낮음", "보통", "높음", "매우높음"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>

          {/* 지역 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">지역 (시/구)</span>
            <input type="text" className={inp2} value={edit.region} placeholder="예: 노원구"
              onChange={(e) => setE("region", e.target.value)} />
          </label>

        </div>

        {/* 정제평균 요약 */}
        {(p.jeonseCalc || p.saleCalc) && (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-600 mb-1.5">AI 조회 정제평균 (참고)</p>
            {[["전세", p.jeonseCalc], ["매매", p.saleCalc]].map(([label, calc]) => calc ? (
              <div key={label} className="mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-slate-600">
                    {label} 정제평균 <span className="font-semibold text-slate-800">{won(calc.value)}</span>
                    {" "}({calc.total}건 → <span className="text-emerald-700 font-medium">{calc.used}건 사용</span>
                    {calc.excluded > 0 && <span className="text-amber-600"> · {calc.excluded}건 제외</span>})
                  </p>
                  {calc.isFallback && <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700">참고값</span>}
                  {calc.floor1Included && !calc.isFallback && <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700">1층포함</span>}
                  {calc.usedPeriod > 6 && <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-slate-200 text-slate-600">{calc.usedPeriod}개월</span>}
                </div>
                {calc.reasonText && (
                  <p className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">↳ {calc.reasonText}</p>
                )}
              </div>
            ) : null)}
          </div>
        )}
      </div>

      {/* ── 실거래 직접입력 (접기) ── 고급설정 흡수 */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button onClick={() => setDealsOpen(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left">
          <div>
            <span className="text-sm font-bold text-slate-700">실거래 직접 입력</span>
            <span className="ml-2 text-xs text-slate-400">(선택 · 입력 시 정제평균 자동 재계산)</span>
          </div>
          <span className="text-xs text-slate-400">{dealsOpen ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>

        {/* 파이프라인 진단 요약 — 항상 표시 */}
        {(() => {
          const pipe = edit._tradeStatus?.pipeline;
          if (!pipe) return null;
          const mkRow = (p, label) => {
            if (!p) return null;
            const tol = p.usedTolerance >= 0 ? `±${p.usedTolerance}㎡` : "전체";
            const conf = getDataConfidence(p.step6_final);
            const steps = `원본 ${p.step1_raw}건 → 단지명 ${p.step2_aptNm}건 → 면적(${tol}) ${p.step3_area}건 → 최종 ${p.step6_final}건 [신뢰도: ${conf.label}]`;
            const ok = p.step6_final > 0;
            return (
              <div key={label} className={`flex items-start gap-2 ${ok ? "" : "text-amber-700"}`}>
                <span className={`mt-0.5 shrink-0 text-[10px] font-bold ${ok ? "text-emerald-600" : "text-amber-500"}`}>{ok ? "✓" : "!"}</span>
                <div>
                  <span className="font-semibold">{label}</span>
                  <span className="ml-1">{steps}</span>
                  {!ok && p.failReason && <p className="mt-0.5 text-[10px] text-amber-600">↳ {p.failReason}</p>}
                </div>
              </div>
            );
          };
          return (
            <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">조회 파이프라인</p>
              {mkRow(pipe.sale, "매매")}
              {mkRow(pipe.jeonse, "전세")}
              {/* 다른 평형 거래 참고 표시 */}
              {(() => {
                const otherJ = edit._otherAreaJeonse || [];
                const otherS = edit._otherAreaSale   || [];
                const allOther = [...new Set([...otherJ, ...otherS].map(d => d.areaSqm))].sort((a,b)=>a-b).slice(0,5);
                if (!allOther.length) return null;
                return <p className="text-[10px] text-slate-400 mt-1">다른 평형 거래 있음 (전용 {allOther.join(", ")}㎡) — 선택 평형과 달라 분석 제외</p>;
              })()}
            </div>
          );
        })()}

        {dealsOpen && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            <DealsEditor title="전세 실거래" deals={edit.deals} setDeals={(d) => setE("deals", d)} kind="jeonse" />
            <DealsEditor title="매매 실거래" deals={edit.saleDeals} setDeals={(d) => setE("saleDeals", d)} kind="sale" />
            <p className="mt-3 text-[11px] text-slate-400">실거래를 입력하면 기준 전세가·매매시세가 자동으로 재계산됩니다.</p>
          </div>
        )}
      </div>

      {/* 안내 */}
      <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        표본이 적거나(각 5건 미만) 매물가가 시세에서 크게 벗어나면 판단이 <b>보류</b>될 수 있습니다. · 출처: {edit._aiSource || "AI 웹검색"}
      </div>

      {/* 버튼 */}
      <div className="mt-5 space-y-3">
        <button
          onClick={handleConfirm}
          className="w-full rounded-2xl py-4 text-lg font-extrabold text-white"
          style={{ backgroundColor: NAVY }}
        >
          {fromAI
            ? (isSell ? "확인 완료 · AI 매도 분석 시작" : mode === "fair" ? "확인 완료 · AI 적정가 분석 시작" : "확인 완료 · AI 매수판단 시작")
            : (isSell ? "추가 정보 입력 완료 · 분석 시작" : mode === "fair" ? "추가 정보 입력 완료 · 분석 시작" : "추가 정보 입력 완료 · 분석 시작")}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack} className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600">← 수정</button>
          {onBackToTop && (
            <button onClick={onBackToTop} className="rounded-2xl bg-slate-700 py-3 text-sm font-bold text-white">처음으로</button>
          )}
        </div>
      </div>
    </>
  );
}

export { ConfirmStep };
