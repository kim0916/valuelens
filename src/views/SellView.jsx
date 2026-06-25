// ValueLens — SellView
// Phase 1-E: main.jsx에서 분리
// props / 함수명 / className / 화면 흐름 변경 금지

import React, { useState, useRef } from 'react';
import { NAVY } from '../constants/brand.js';
import { typicalPyeong } from '../constants/grades.js';
import { SAMPLE, EMPTY } from '../constants/presets.js';
import { analyze } from '../engine/analyze.js';
import { getLawdCd } from '../search/location.js';
import { fetchMolitData } from '../search/molit.js';
import { fetchApartmentData } from '../search/apartment.js';
import { buildAnalysisInput } from '../search/input.js';
import { groupAreasByPyeong, getDataConfidence } from '../search/utils.js';
import { getOrCreateDeviceId } from '../utils/device.js';
import { ConfirmStep } from './ConfirmStep.jsx';
import { SellResult } from './SellResult.jsx';

function SellView({ onContext, currentUserId, currentUserEmail }) {
  // ── BuyView와 동일한 아키텍처 ──
  // · LocationPicker → Supabase 검색 → MOLIT fallback
  // · AI 웹검색 제거: fetchApartmentData() 재사용
  // · region은 LocationPicker 선택 시 즉시 저장 (AI 의존 없음)
  // · rawMolitRef: 24개월 데이터 1회 캐싱, 면적 변경 시 로컬 재필터
  const [f, setF] = useState(EMPTY);
  const [r, setR] = useState(null);
  const [pending, setPending] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState(null);
  const [areaOptions, setAreaOptions] = useState([]);
  const [fetchingAreas, setFetchingAreas] = useState(false);
  const [listingPriceInput, setListingPriceInput] = useState("");
  const abortRef = useRef(null);
  // 국토부 원본 24개월 캐시 — 면적 변경 시 재호출 없이 로컬 재필터
  const rawMolitRef = useRef(null);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // ── 로컬 재필터 (rawMolitRef 있을 때, API 재호출 없음) ──
  function refilterByArea(overrideArea, exclusiveAreas) {
    const raw = rawMolitRef.current;
    if (!raw) return null;
    const areaTarget = exclusiveAreas && exclusiveAreas.length > 0
      ? exclusiveAreas : Number(overrideArea) || null;
    if (!areaTarget) return null;
    const filterDeals = (deals) => {
      if (!areaTarget) return deals;
      if (Array.isArray(areaTarget)) return deals.filter(d => areaTarget.some(a => Math.abs(d.areaSqm - a) <= 3));
      return deals.filter(d => Math.abs(d.areaSqm - Number(areaTarget)) <= 3);
    };
    return { ...raw, sale: filterDeals(raw.sale), jeonse: filterDeals(raw.jeonse), areaSqm: Number(overrideArea) || 0 };
  }


  // ── 분석 횟수 제한 체크 ──
  async function checkAnalysisLimit() {
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/check-analysis-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_and_record',
          userId: currentUserId || null,
          userEmail: currentUserEmail || null,
          deviceId,
        }),
      });
      if (res.status === 429) {
        const d = await res.json();
        setAiMsg(d.message || '오늘 무료 분석 1회를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요.');
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[checkAnalysisLimit] 오류 (통과):', e?.message);
      return true;
    }
  }

  // ── LocationPicker 완료 시 면적 목록 로드 (BuyView와 동일) ──
  async function fetchAreasFor(region, dong, complexName, exactAptNm, sido) {
    if (!complexName || !region) return;
    setFetchingAreas(true); setAiMsg(null); setAreaOptions([]);
    // 1) Supabase 면적 목록 우선
    try {
      const sbRes = await fetch('/api/supabase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'areas', complex_name: exactAptNm || complexName, sigungu: region }),
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (sbData.areas && sbData.areas.length > 0) {
          setAreaOptions(groupAreasByPyeong(sbData.areas)
            .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) })));
          setFetchingAreas(false);
          return;
        }
      }
    } catch (e) { console.warn('[SellView] Supabase areas 실패:', e.message); }
    // 2) MOLIT fallback
    try {
      let lawdCd = null;
      try {
        const lr = await fetch("/api/lawdCd", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lawdCd", sigungu: region, sido: sido || "" }),
        });
        lawdCd = (await lr.json()).lawdCd || null;
      } catch(e) {}
      if (!lawdCd) lawdCd = getLawdCd(dong, region);
      if (!lawdCd) { setAiMsg(`지역 코드를 찾지 못했습니다 (${region})`); setFetchingAreas(false); return; }
      const result = await fetchMolitData(lawdCd, exactAptNm || complexName, "", 12);
      const allAreas = [...(result.sale || []), ...(result.jeonse || [])].map(d => d.areaSqm).filter(a => a > 0);
      const opts = groupAreasByPyeong(allAreas).map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: g.pyeong }));
      if (opts.length > 0) setAreaOptions(opts);
      else { setAiMsg("최근 실거래가 없습니다. KB시세를 직접 입력하세요."); set("_needKbInput", true); }
    } catch(e) { setAiMsg("면적 조회 실패 — 지역명을 확인하세요."); }
    finally { setFetchingAreas(false); }
  }

  // ── quickSearch: BuyView와 동일 경로 (Supabase → MOLIT, AI 없음) ──
  async function quickSearch(overrideArea, overrideForm, exclusiveAreas = null) {
    const ff = overrideForm ? { ...f, ...overrideForm } : f;
    const listingPrice = Number(String(listingPriceInput).replace(/,/g, "")) || 0;
    if (!ff.complexName) { setAiMsg("단지를 선택하세요."); return; }

    // 면적 변경 + 캐시 있으면 로컬 재필터
    // MOLIT 데이터(dataSource !== 'supabase')는 항상 Supabase 재조회 (BuyView와 동일)
    const isSameComplex = rawMolitRef.current &&
      rawMolitRef.current.dataSource === 'supabase' &&
      rawMolitRef.current.complexName === (ff.exactAptNm || ff.complexName) &&
      rawMolitRef.current.dong === ff.dong;
    const isAreaChange = overrideArea && isSameComplex;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setAiLoading(true); setAiMsg(null); setPending(null);

    try {
      let rawData;
      if (isAreaChange) {
        rawData = refilterByArea(overrideArea, exclusiveAreas);
        if (!rawData) rawData = await _fetchRawData(ff, overrideArea, exclusiveAreas);
      } else {
        rawData = await _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas);
      }
      _processRawData(rawData, ff, overrideArea, exclusiveAreas);
    } catch (e) {
      console.error('[SellView] quickSearch 오류:', e);
      const userMsg = e.message && !e.message.includes("undefined") && !e.message.includes("serviceKey") && !e.message.includes("API 호출")
        ? e.message
        : "실거래 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.";
      setAiMsg(userMsg);
    } finally { setAiLoading(false); }
  }

  // ── Supabase 우선 조회 (BuyView _fetchRawDataSupabase와 동일 로직) ──
  async function _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas) {
    const complexId  = ff.complexId || null;
    const complexName = ff.exactAptNm || ff.complexName || "";
    const sigungu    = ff.region || "";
    const targetArea = overrideArea ? Number(overrideArea) : Number(ff.areaExclusive) || 0;

    // STEP 1: 단지 검색
    let complexInfo = null;
    try {
      const r1 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "search", name: complexName, sigungu, limit: 5 }),
      });
      const d1 = await r1.json();
      if (d1.complexes && d1.complexes.length > 0) {
        complexInfo = d1.complexes.find(c => complexId && c.id === complexId) || d1.complexes[0];
      }
    } catch(e) { console.warn('[SellView] Supabase search 실패:', e.message); }

    // 단지 미매칭 → MOLIT fallback
    if (!complexInfo) return await _fetchRawData(ff, overrideArea, exclusiveAreas);

    const useComplexId   = complexInfo.id;
    const useComplexName = complexInfo.complex_name;

    // STEP 2: deals 조회 — 면적 필터 없이 전체 조회 후 클라이언트 필터
    // (rawMolitRef에 전체 데이터 저장 → 면적 변경 시 refilterByArea 정상 동작)
    let saleDealsAll = [], rentDealsAll = [];
    try {
      const r4 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deals", complex_id: useComplexId, complex_name: useComplexName, sigungu }),
      });
      const d4 = await r4.json();
      saleDealsAll = d4.saleDeals || [];
      rentDealsAll = d4.rentDeals || [];
    } catch(e) { console.warn('[SellView] Supabase deals 실패:', e.message); }

    // 선택 면적으로 클라이언트 필터 (±3㎡)
    const filterByArea = (deals, area) => area ? deals.filter(d => Math.abs(Number(d.area_excl) - area) <= 3) : deals;
    const saleDeals = filterByArea(saleDealsAll, targetArea);
    const rentDeals = filterByArea(rentDealsAll, targetArea);

    // STEP 3: 거래 없음 → MOLIT fallback 후 없으면 명확한 상태 반환
    if (saleDeals.length === 0 && rentDeals.length === 0) {
      const molitData = await _fetchRawData(ff, overrideArea, exclusiveAreas);
      if (molitData && (molitData.sale?.length > 0 || molitData.jeonse?.length > 0)) return molitData;
      return {
        sale: [], jeonse: [],
        areaOptions: complexInfo.area_list
          ? groupAreasByPyeong(JSON.parse(complexInfo.area_list))
              .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: Math.round(g.rep / 3.3058) })) : [],
        buildYear: complexInfo.build_year || null, lawdCd: null,
        tradeStatus: { code: "PERIOD_NO_TRADE", msg: `최근 1년 실거래 데이터가 부족합니다. 직접 확인한 가격을 입력해 주세요.`, pipeline: { source: "supabase" } },
        dataSource: "supabase",
      };
    }

    // STEP 4: 변환
    const toSale = (d) => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deal_amount_man)||0, ym: d.contract_ym||"", aptNm: d.complex_name || useComplexName, floor: d.floor||0, cancelDate: d.cancel_date||null });
    const toRent = (d) => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deposit_man)||0,    ym: d.contract_ym||"", aptNm: d.complex_name || useComplexName, floor: d.floor||0, monthly: Number(d.monthly_man)||0 });
    const sale   = saleDeals.map(toSale).filter(d => d.price > 0 && d.areaSqm > 0);
    const jeonse = rentDeals.map(toRent).filter(d => d.price > 0 && d.areaSqm > 0);

    // STEP 5: 신뢰도 계산 (BuyView와 동일)
    const sbSaleConf = getDataConfidence(sale.length);
    const sbRentConf = getDataConfidence(jeonse.length);
    const sbStatus = (!sbSaleConf.canAnalyze && !sbRentConf.canAnalyze)
      ? { code: "TOO_FEW",  msg: `거래 건수 부족 (매매 ${sale.length}건·전세 ${jeonse.length}건) — 참고용으로만 표시됩니다`, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } }
      : (sbSaleConf.level === "낮음" || sbRentConf.level === "낮음")
        ? { code: "LOW_DATA", msg: `거래 부족 — 참고용 분석 (매매 ${sale.length}건·전세 ${jeonse.length}건)`, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } }
        : { code: "OK", msg: null, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } };

    const data = {
      sale, jeonse, dataSource: "supabase",
      areaOptions: complexInfo.area_list
        ? groupAreasByPyeong(JSON.parse(complexInfo.area_list))
            .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: Math.round(g.rep / 3.3058) })) : [],
      buildYear: complexInfo.build_year || null, lawdCd: null,
      tradeStatus: sbStatus,
    };
    rawMolitRef.current = {
      ...data,
      // 전체 deals 보관 (면적 필터 전) → 면적 변경 시 refilterByArea 정상 동작
      sale:   saleDealsAll.map(d => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deal_amount_man)||0, ym: d.contract_ym||"", aptNm: d.complex_name||useComplexName, floor: d.floor||0, cancelDate: d.cancel_date||null })).filter(d => d.price>0 && d.areaSqm>0),
      jeonse: rentDealsAll.map(d => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deposit_man)||0,    ym: d.contract_ym||"", aptNm: d.complex_name||useComplexName, floor: d.floor||0, monthly: Number(d.monthly_man)||0 })).filter(d => d.price>0 && d.areaSqm>0),
      complexName: ff.exactAptNm || ff.complexName, dong: ff.dong, dataSource: "supabase"
    };
    return data;
  }

  async function _fetchRawData(ff, overrideArea, exclusiveAreas) {
    const data = await fetchApartmentData({
      complexName:    ff.complexName,
      exactAptNm:     ff.exactAptNm,
      dong:           ff.dong,
      region:         ff.region,
      sido:           ff.sido || "",
      areaExclusive:  overrideArea ? String(overrideArea) : ff.areaExclusive,
      exclusiveAreas: exclusiveAreas || null,
    });
    rawMolitRef.current = { ...data, complexName: ff.exactAptNm || ff.complexName, dong: ff.dong, dataSource: 'molit' };
    return data;
  }

  async function _processRawData(rawData, ff, overrideArea, exclusiveAreas) {
    const rawWithInput = {
      ...rawData,
      currentPrice: Number(ff.currentPrice) || rawData.currentPrice || 0,
      kbSalePrice:  Number(ff.kbSalePrice)  || rawData.kbSalePrice  || 0,
      kbJeonse:     Number(ff.kbJeonse)     || rawData.kbJeonse     || 0,
      buildYear:    ff.buildYear || rawData.buildYear || 0,
    };
    const effectiveArea = Number(overrideArea) || Number(ff.areaExclusive) || Number(f.areaExclusive) || 0;
    const { filled, ff: builtFf, jeonseCalc, saleCalc, blockReason } = buildAnalysisInput(rawWithInput, ff, effectiveArea);
    if (overrideArea) filled.areaExclusive = String(overrideArea);
    if (ff.buildYear && !filled.buildYear) filled.buildYear = ff.buildYear;

    const preservedPrice = Number(String(listingPriceInput).replace(/,/g, "")) || Number(ff.currentPrice) || Number(f.currentPrice) || 0;
    // tradeStatus를 f에 저장 → UI에서 원인별 메시지 표시
    setF({ ...filled, currentPrice: preservedPrice, _tradeStatus: rawData.tradeStatus || null });
    const opts = filled._aiAreaOptions?.length > 0 ? filled._aiAreaOptions : (rawData.areaOptions || []);
    setAreaOptions(opts);

    const finalCurrentPrice = preservedPrice;
    const finalBlockReason  = !finalCurrentPrice ? "희망 매도가를 입력하세요." : blockReason;
    const pendingFf = builtFf
      ? { ...builtFf, currentPrice: finalCurrentPrice }
      : { ...filled,  currentPrice: finalCurrentPrice, baseJeonse: Number(filled.kbJeonse) || 0,
          kbSalePrice: Number(filled.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0,
          jeonseCalc: null, saleCalc: null, dataSource: "ai" };

    // ── B안: ConfirmStep 조건부 자동 스킵 (SellView) ──
    const tradeCode = rawData.tradeStatus?.code || "OK";
    const dataOk = ["OK","LOW_DATA","TOO_FEW","JEONSE_SHORT","JEONSE_AREA_SHORT"].includes(tradeCode);
    const canAutoSkip = finalCurrentPrice > 0 && !finalBlockReason && dataOk && builtFf != null;

    if (canAutoSkip) {
      // 분석 횟수 제한 체크 (TODO: 유료화 시 서버사이드 계산으로 이전)
      const allowed = await checkAnalysisLimit();
      if (!allowed) return;
      const autoFf = { ...pendingFf, currentPrice: finalCurrentPrice };
      const res = analyze(autoFf);
      res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
      setR(res); setPending(null);
      if (onContext) onContext({ acqPrice: Number(f.acqPrice) || 0, sellPrice: Number(autoFf.currentPrice), years: Number(f.holdingYears) || 5, loanBalance: Number(f.loanBalance) || 0 });
    } else {
      setPending({ ff: pendingFf, jeonseCalc, saleCalc, blockReason: finalBlockReason });
    }
  }

  // ── doAnalyze: ConfirmStep에서 수정된 값으로 분석 실행 ──
  async function doAnalyze(updated) {
    const src = updated || pending;
    if (!src) return;
    // 분석 횟수 제한 체크 (TODO: 유료화 시 서버사이드 계산으로 이전)
    const allowed = await checkAnalysisLimit();
    if (!allowed) { setPending(null); return; }
    const { ff, jeonseCalc, saleCalc } = src;
    const res = analyze(ff);
    res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
    setR(res); setPending(null);
    if (onContext) onContext({ acqPrice: Number(f.acqPrice) || 0, sellPrice: Number(ff.currentPrice), years: Number(f.holdingYears) || 5, loanBalance: Number(f.loanBalance) || 0 });
  }

  if (r) return <SellResult r={r} f={f} onBack={() => setR(null)}
    onNewSearch={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
    onChangeArea={() => { setR(null); }}
    onHome={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
    areaOptions={areaOptions} currentArea={f.areaExclusive} currentUserId={currentUserId}
    onSelectArea={async (area) => {
      setR(null);
      setPending(null);
      set("areaExclusive", String(area));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAiLoading(true);
      try {
        const rawData = await _fetchRawDataSupabase(
          { ...f, areaExclusive: String(area) }, area, null
        );
        const rawWithInput = {
          ...rawData,
          currentPrice: Number(f.currentPrice) || 0,
          kbSalePrice: Number(f.kbSalePrice) || 0,
          kbJeonse: Number(f.kbJeonse) || 0,
          buildYear: f.buildYear || rawData.buildYear || 0,
        };
        const { ff: builtFf, jeonseCalc, saleCalc } = buildAnalysisInput(rawWithInput, { ...f, areaExclusive: String(area) }, Number(area));
        if (builtFf && Number(f.currentPrice) > 0) {
          const res = analyze({ ...builtFf, currentPrice: Number(f.currentPrice) });
          res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
          set("areaExclusive", String(area));
          setAreaOptions(rawData.areaOptions || []);
          setR(res);
        } else {
          set("areaExclusive", String(area));
          setAreaOptions(rawData.areaOptions || []);
          setAiMsg('면적을 변경했습니다. 현재 매물가 확인 후 조회하세요.');
        }
      } catch(e) {
        setAiMsg(`면적 변경 실패: ${e.message}`);
      } finally {
        setAiLoading(false);
      }
    }}
  />;
  if (pending) return (
    <ConfirmStep
      p={pending} f={f} mode="sell"
      onBack={() => setPending(null)}
      onConfirm={doAnalyze}
      onRefetch={(area) => { set("areaExclusive", String(area)); quickSearch(area); }}
      onBackToTop={() => { setPending(null); setR(null); setF({ ...EMPTY }); setAiMsg(null); rawMolitRef.current = null; }}
    />
  );

  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">이 가격에 팔아도 될까요?</h1>
        <p className="mt-2 text-sm text-slate-500">단지를 선택하고 희망 매도가를 입력하면 실거래·시세 기반으로 평가합니다.</p>
      </header>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        {/* 진입 안내 */}
        {!f.complexName && (
          <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
            <p className="text-sm font-bold text-blue-800">분석 순서</p>
            <div className="mt-2 space-y-1 text-xs text-blue-600">
              <p>시/도 → 구/군 → 동 → 단지명 순으로 선택</p>
              <p>면적 선택</p>
              <p>③ 희망 매도가 입력</p>
              <p>AI 분석 버튼 클릭</p>
            </div>
          </div>
        )}

        <p className="mb-3 text-sm font-bold text-slate-800">① 단지 검색</p>

        {/* 선택된 단지 표시 */}
        {f.complexName && f.region ? (
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-800 px-4 py-3">
            <div>
              <p className="text-xs text-slate-400">{f.region} · {f.dong}</p>
              <p className="text-base font-bold text-white">{f.complexName}</p>
            </div>
            <button
              onClick={() => { setF(p => ({ ...p, region: "", dong: "", complexName: "", areaExclusive: "" })); setAreaOptions([]); setAiMsg(null); rawMolitRef.current = null; setListingPriceInput(""); }}
              className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600">
              변경
            </button>
          </div>
        ) : (
          <LocationPicker onComplete={({ sido, sigungu, dong, complexName, exactAptNm, complexId, buildYear, areaList }) => {
            setF(p => ({ ...p, region: sigungu, sido, dong, complexName, exactAptNm,
              complexId: complexId || null,
              buildYear: buildYear || p.buildYear,
              areaExclusive: "" }));
            rawMolitRef.current = null;
            setAreaOptions([]);
            setListingPriceInput("");
            if (areaList && areaList.length > 0) {
              setAreaOptions(groupAreasByPyeong(areaList)
                .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) })));
            } else {
              setTimeout(() => fetchAreasFor(sigungu, dong, complexName, exactAptNm, sido), 100);
            }
          }} />
        )}

        {/* ── STEP 1: 면적 선택 ── */}
        {areaOptions.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${f.areaExclusive ? "bg-emerald-500" : "bg-amber-500"}`}>
                {f.areaExclusive ? "✓" : "1"}
              </span>
              <p className="text-sm font-bold text-slate-700">면적 선택</p>
              {!f.areaExclusive && <p className="text-xs text-amber-600">← 분석할 면적을 선택하세요</p>}
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <div className="flex flex-wrap gap-2">
                {areaOptions.map((o, i) => {
                  const { mainLabel, subLabel } = areaButtonLabel(o.areaSqm, o.supplySqm);
                  const selected = String(f.areaExclusive) === String(o.areaSqm);
                  return (
                    <button key={i}
                      onClick={() => { set("areaExclusive", String(o.areaSqm)); setAiMsg(null); }}
                      className={`rounded-xl px-3 py-2 text-left border transition-all ${selected ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:border-amber-400"}`}>
                      <p className="text-sm font-semibold leading-tight">{mainLabel}</p>
                      {subLabel && <p className={`text-[10px] mt-0.5 ${selected ? "text-amber-100" : "text-slate-400"}`}>{subLabel}</p>}
                    </button>
                  );
                })}
              </div>
              {f.areaExclusive && (() => {
                const sel = areaOptions.find(o => String(o.areaSqm) === String(f.areaExclusive));
                const { mainLabel } = sel ? areaButtonLabel(sel.areaSqm, sel.supplySqm) : { mainLabel: `전용 ${f.areaExclusive}㎡` };
                return <p className="mt-1.5 text-xs text-amber-700">분석 기준: 전용 {sel ? sel.areaSqm : f.areaExclusive}㎡ ({Math.round(Number(sel ? sel.areaSqm : f.areaExclusive) / 3.3058)}평)</p>;
              })()}
            </div>
          </div>
        )}
        {fetchingAreas && <p className="mt-2 text-xs text-slate-400 text-center">면적 조회 중…</p>}

        {/* ── STEP 2: 희망 매도가 입력 ── */}
        {f.complexName && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${listingPriceInput ? "bg-emerald-500" : "bg-slate-400"}`}>
                {listingPriceInput ? "✓" : "2"}
              </span>
              <p className="text-sm font-bold text-slate-700">희망 매도가 입력</p>
              {!listingPriceInput && <p className="text-xs text-slate-400">내가 팔고 싶은 금액 (만원)</p>}
            </div>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" value={listingPriceInput} placeholder="예: 50000  (= 5억원)"
              onChange={(e) => setListingPriceInput(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-slate-500"
            />
          </div>
        )}

        {/* 실거래 상태 안내 */}
        {f._tradeStatus && f._tradeStatus.code !== "OK" && (() => {
          const ts = f._tradeStatus;
          const isNoTrade  = ["COMPLEX_NO_TRADE","NAME_NO_MATCH","PERIOD_NO_TRADE"].includes(ts.code);
          const isLowData  = ["LOW_DATA","TOO_FEW"].includes(ts.code);
          const isAreaFail = ts.code === "AREA_NO_MATCH";
          const needKb = ["API_FAIL", "COMPLEX_NO_TRADE", "NAME_NO_MATCH", "PERIOD_NO_TRADE", "AREA_NO_MATCH"].includes(ts.code) || (ts.jeonseShort && !ts.canExpand);
          const boxColor = isNoTrade ? "bg-red-50 ring-red-200" : isLowData ? "bg-amber-50 ring-amber-200" : isAreaFail ? "bg-orange-50 ring-orange-200" : "bg-amber-50 ring-amber-200";
          return (
            <div className={`mt-3 rounded-2xl p-4 ring-1 ${boxColor}`}>
              <p className="text-sm font-bold text-amber-800">{ts.msg}</p>
              {needKb && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-amber-700">KB매매시세 (만원)</p>
                    <input type="number" value={f.kbSalePrice} placeholder="예: 50250"
                      onChange={(e) => set("kbSalePrice", e.target.value)}
                      className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-amber-700">KB전세시세 (만원)</p>
                    <input type="number" value={f.kbJeonse} placeholder="예: 35500"
                      onChange={(e) => set("kbJeonse", e.target.value)}
                      className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
                  </div>
                </div>
              )}
              <p className="mt-2 text-[10px] text-amber-500">네이버 부동산 → 시세/실거래가 탭 → KB시세 중간값 확인 후 입력</p>
            </div>
          );
        })()}

        {/* ── STEP 3: AI 분석 실행 ── */}
        {f.complexName && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">3</span>
              <p className="text-sm font-bold text-slate-700">AI 분석 실행</p>
            </div>
            {!listingPriceInput && (
              <p className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                ↑ 희망 매도가를 입력하면 분석을 시작할 수 있습니다.
              </p>
            )}
            <button
              onClick={() => quickSearch(f.areaExclusive || undefined)}
              disabled={aiLoading}
              className={`w-full rounded-2xl py-4 text-lg font-extrabold text-white transition-opacity ${!listingPriceInput ? "opacity-40" : "opacity-100"}`}
              style={{ backgroundColor: NAVY }}>
              {aiLoading
                ? "조회 중… (실거래 데이터 수집 중)"
                : rawMolitRef.current && rawMolitRef.current.complexName === (f.exactAptNm || f.complexName)
                  ? "다시 분석 (면적 변경됨)"
                  : "이 가격에 팔아도 될까? — 매도 분석"}
            </button>
          </div>
        )}
        {aiLoading && (
          <button onClick={() => { if (abortRef.current) abortRef.current.abort(); setAiLoading(false); setAiMsg("조회가 취소되었습니다."); }}
            className="mt-2 w-full rounded-2xl border border-red-200 py-2.5 text-sm font-medium text-red-500">
            ⬛ 조회 취소
          </button>
        )}
        {aiMsg && (() => {
          const isDataShort = aiMsg.includes("실거래가 없습니다") || aiMsg.includes("실거래 데이터가 부족") || aiMsg.includes("실거래를 불러오지 못") || aiMsg.includes("불러오지 못했습니다");
          if (isDataShort) {
            return (
              <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-4 ring-1 ring-blue-200">
                <p className="text-sm font-bold text-blue-800">아파트는 찾았습니다.</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                  하지만 최근 12개월간 분석에 필요한 실거래 데이터가 부족합니다.<br />
                  확인한 시세 또는 KB시세를 입력하면 분석을 계속 진행할 수 있습니다.
                </p>
                <button
                  onClick={() => {
                    const ff = { ...f, currentPrice: Number(f.currentPrice)||0, baseJeonse: Number(f.kbJeonse)||0, kbSalePrice: Number(f.kbSalePrice)||0, jeonseUsed:0, saleUsed:0, jeonseCalc:null, saleCalc:null, dataSource:"manual" };
                    setPending({ ff, jeonseCalc:null, saleCalc:null, blockReason: "최근 1년 실거래 데이터가 부족합니다. 직접 확인한 가격을 입력해 주세요." });
                  }}
                  className="mt-3 block w-full rounded-xl bg-blue-600 py-2.5 text-center text-xs font-bold text-white active:bg-blue-700">
                  시세 직접 입력 →
                </button>
              </div>
            );
          }
          return (
            <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-100">
              {aiMsg}
            </div>
          );
        })()}

        {/* 매도 전용 추가 정보 (접기) */}
        {f.complexName && (
          <details className="mt-4">
            <summary className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50">
              세후 실수령·매도 판단용 추가 정보 ▾
            </summary>
            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ["취득가 (만원, 양도세용)", "acqPrice", "number", ""],
                  ["보유기간 (년)", "holdingYears", "number", "5"],
                  ["대출잔액 (만원)", "loanBalance", "number", "0"],
                ].map(([l, k, t, ph]) => (
                  <label key={k} className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-500">{l}</span>
                    <input type={t} value={f[k] || ""} placeholder={ph}
                      onChange={(e) => set(k, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600" />
                  </label>
                ))}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">실거주 여부</span>
                  <select value={f.lived ? "예" : "아니오"} onChange={(e) => set("lived", e.target.value === "예")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600">
                    {["예", "아니오"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">1주택 여부</span>
                  <select value={f.oneHouse ? "1주택" : "다주택"} onChange={(e) => set("oneHouse", e.target.value === "1주택")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600">
                    {["1주택", "다주택"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">매도 목적</span>
                  <select value={f.sellPurpose} onChange={(e) => set("sellPurpose", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600">
                    {["갈아타기", "현금화", "손실 축소", "세금 절감", "투자금 회수", "전세 전환 고민"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </details>
        )}

        {/* 샘플 */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">샘플:</span>
          <button onClick={() => {
            const s = { ...SAMPLE, acqPrice: 35000, holdingYears: 8, loanBalance: 10000, sellPurpose: "갈아타기" };
            setF(s);
            const r2 = buildAnalysisInput({ region: s.region, dong: s.dong, complexName: s.complexName, areaSqm: s.areaExclusive, pyeong: s.pyeong, priceArea: s.areaExclusive, buildYear: s.buildYear, topFloor: 15, currentPrice: s.currentPrice, kbSalePrice: s.kbSalePrice, kbJeonse: s.kbJeonse, jeonse: s.deals, sale: s.saleDeals, areaOptions: [] }, s, s.areaExclusive);
            const ff2 = r2.ff || { ...s, currentPrice: Number(s.currentPrice), baseJeonse: Number(s.kbJeonse) || 0, kbSalePrice: Number(s.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0, jeonseCalc: null, saleCalc: null, dataSource: "manual" };
            setListingPriceInput(String(s.currentPrice));
            setPending({ ff: ff2, jeonseCalc: r2.jeonseCalc, saleCalc: r2.saleCalc });
          }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">동부</button>
          <button onClick={() => {
            const s = { ...PRESET_EUNMA, acqPrice: 120000, holdingYears: 15, sellPurpose: "투자금 회수" };
            setF(s);
            const r2 = buildAnalysisInput({ region: s.region, dong: s.dong, complexName: s.complexName, areaSqm: s.areaExclusive, pyeong: s.pyeong, priceArea: s.areaExclusive, buildYear: s.buildYear, topFloor: 14, currentPrice: s.currentPrice, kbSalePrice: s.kbSalePrice, kbJeonse: s.kbJeonse, jeonse: s.deals, sale: s.saleDeals, areaOptions: [] }, s, s.areaExclusive);
            const ff2 = r2.ff || { ...s, currentPrice: Number(s.currentPrice), baseJeonse: Number(s.kbJeonse) || 0, kbSalePrice: Number(s.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0, jeonseCalc: null, saleCalc: null, dataSource: "manual" };
            setListingPriceInput(String(s.currentPrice));
            setPending({ ff: ff2, jeonseCalc: r2.jeonseCalc, saleCalc: r2.saleCalc });
          }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">은마</button>
          <button onClick={() => {
            const s = { ...PRESET_SG7 };
            setF(s);
            const r2 = buildAnalysisInput({ region: s.region, dong: s.dong, complexName: s.complexName, areaSqm: s.areaExclusive, pyeong: s.pyeong, priceArea: s.areaExclusive, buildYear: s.buildYear, topFloor: 15, currentPrice: s.currentPrice, kbSalePrice: s.kbSalePrice, kbJeonse: s.kbJeonse, jeonse: s.deals, sale: s.saleDeals, areaOptions: [] }, s, s.areaExclusive);
            const ff2 = r2.ff || { ...s, currentPrice: Number(s.currentPrice), baseJeonse: Number(s.kbJeonse) || 0, kbSalePrice: Number(s.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0, jeonseCalc: null, saleCalc: null, dataSource: "manual" };
            setListingPriceInput(String(s.currentPrice));
            setPending({ ff: ff2, jeonseCalc: r2.jeonseCalc, saleCalc: r2.saleCalc });
          }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">상계주공7</button>
        </div>
      </div>
    </>
  );
}

export { SellView };
