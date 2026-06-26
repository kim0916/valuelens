// ValueLens — BuyView
// Phase 1-E: main.jsx에서 분리
// props / 함수명 / className / 화면 흐름 변경 금지

import React, { useState, useEffect, useRef } from 'react';
import { NAVY } from '../constants/brand.js';
import { GS, won, typicalPyeong } from '../constants/grades.js';
import { SAMPLE, EMPTY, PRESET_EUNMA, PRESET_SG7, PRESET_PRIME_FULL } from '../constants/presets.js';
import { analyze } from '../engine/analyze.js';
import { computeTrimmedMean } from '../engine/stats.js';
import { getLawdCd } from '../search/location.js';
import { fetchMolitData } from '../search/molit.js';
import { fetchApartmentData } from '../search/apartment.js';
import { buildAnalysisInput } from '../search/input.js';
import { groupAreasByPyeong, getDataConfidence } from '../search/utils.js';
import { getOrCreateDeviceId } from '../utils/device.js';
import { loadRecentAnalysis } from '../services/storage/recentAnalysis.js';
import { LocationPicker } from './LocationPicker.jsx';
import { ConfirmStep } from './ConfirmStep.jsx';
import { BuyResult } from './BuyResult.jsx';
import { FairValueResult } from './FairValueResult.jsx';

function BuyView({ onSaveHistory, onAddWatch, onContext, mode = "buy", currentUserId, currentUserEmail, screenerInitial, onClearScreenerInitial, photoTriggerRef }) {
  const [f, setF] = useState(EMPTY);
  const [r, setR] = useState(null);
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState(null);
  const [pending, setPending] = useState(null);
  const [showManual, setShowManual] = useState(false);
  // listingPriceInput: 현재 매물가 독립 state — 어디서도 초기화 금지
  const [listingPriceInput, setListingPriceInput] = useState("");
  const abortRef = useRef(null);
  const [areaOptions, setAreaOptions] = useState([]);

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
        return false; // 차단
      }
      return true; // 통과
    } catch (e) {
      console.warn('[checkAnalysisLimit] 오류 (통과):', e?.message);
      return true; // 오류 시 통과
    }
  }

  // ── AI 검토 후보에서 넘어온 경우 자동 단지 입력 ──
  useEffect(() => {
    if (!screenerInitial) return;

    // agentResult 있으면 결과 화면 직행 (setR(null) 차단)
    const agentRes = screenerInitial.agentResult;
    if (agentRes) {
      // ResultCard engine or ToolRouter rawData.analysisResult
      const resultObj = agentRes.analysisResult || agentRes;
      // fairPrice 또는 engineMode 또는 buyGrade 중 하나라도 있으면 결과로 판단
      const isResult = resultObj && (
        resultObj.fairPrice !== undefined ||
        resultObj.engineMode !== undefined ||
        resultObj.buyGrade !== undefined ||
        resultObj.gradeLabel !== undefined
      );
      if (isResult) {
        const form = agentRes.form || {};
        setF((prev) => ({
          ...EMPTY,
          complexName:   form.complexName   || prev.complexName,
          region:        form.region        || prev.region,
          dong:          form.dong          || prev.dong,
          areaExclusive: form.areaExclusive || prev.areaExclusive,
        }));
        setR(resultObj);
        setPending(null);
        if (onClearScreenerInitial) onClearScreenerInitial();
        return;
      }
    }

    // agentResult 없음 → 기존 입력폼 흐름
    const { complexName, region, dong, areaExclusive, complexId } = screenerInitial;
    const newForm = {
      ...EMPTY,
      complexName:   complexName || "",
      region:        region      || "",
      dong:          dong        || "",
      areaExclusive: areaExclusive ? String(areaExclusive) : "",
      complexId:     complexId   || null,
    };
    setF(newForm);
    setR(null);
    setPending(null);
    setAreaOptions([]);
    rawMolitRef.current = null;
    if (onClearScreenerInitial) onClearScreenerInitial();

    // 단지명 있으면 자동 quickSearch 실행
    if (complexName && region) {
      setTimeout(() => {
        quickSearch(
          areaExclusive ? Number(areaExclusive) : null,
          newForm,
          null,
          false
        );
      }, 50);
    }
  }, [screenerInitial]);

  const [fetchingAreas, setFetchingAreas] = useState(false);
  // 국토부 원본 데이터 보관 — 면적 변경 시 API 재호출 없이 재필터
  const rawMolitRef = useRef(null); // { complexName, dong, sale:[], jeonse:[], areaOptions:[], allAreas:Set, lawdCd }

  // 면적 선택 그룹 기반 로컬 재필터 (API 재호출 없음)
  function refilterByArea(overrideArea, exclusiveAreas) {
    const raw = rawMolitRef.current;
    if (!raw) return null; // 원본 없으면 null → quickSearch가 API 호출
    const areaTarget = exclusiveAreas && exclusiveAreas.length > 0 ? exclusiveAreas : Number(overrideArea) || null;
    if (!areaTarget) return null;

    const filterDeals = (deals) => {
      if (!areaTarget) return deals;
      if (Array.isArray(areaTarget)) return deals.filter(d => areaTarget.some(a => Math.abs(d.areaSqm - a) <= 1));
      return deals.filter(d => Math.abs(d.areaSqm - Number(areaTarget)) <= 3);
    };

    const sale   = filterDeals(raw.sale);
    const jeonse = filterDeals(raw.jeonse);
    return { ...raw, sale, jeonse, areaSqm: Number(overrideArea) || 0 };
  }

  // 면적만 먼저 조회하는 함수
  // 외부에서 파라미터 받는 버전 (단지 선택 즉시 호출용)
  async function fetchAreasFor(region, dong, complexName, exactAptNm, sido) {
    if (!complexName || !region) return;
    setFetchingAreas(true); setAiMsg(null); setAreaOptions([]);

    // Supabase에서 면적 목록 우선 조회
    try {
      const sbRes = await fetch('/api/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'areas', complex_name: exactAptNm || complexName, sigungu: region }),
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (sbData.areas && sbData.areas.length > 0) {
          const opts = groupAreasByPyeong(sbData.areas)
            .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) }));
          setAreaOptions(opts);
          setFetchingAreas(false);
          return; // Supabase 성공 → 국토부 API 스킵
        }
      }
    } catch (e) {
      console.warn('[fetchAreasFor] Supabase 실패, molit fallback:', e.message);
    }
    try {
      let lawdCd = null;
      try {
        const lawdRes = await fetch("/api/lawdCd", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lawdCd", sigungu: region, sido: sido || "" }),
        });
        const ld = await lawdRes.json();
        lawdCd = ld.lawdCd || null;
      } catch(e) {}
      if (!lawdCd) lawdCd = getLawdCd(dong, region);
      if (!lawdCd) { setAiMsg(`"${region}" 지역 코드를 찾지 못했습니다.`); setFetchingAreas(false); return; }
      // /api/molit type:"areas" 직접 호출 (가장 정확)
      const areasRes = await fetch("/api/molit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "areas", lawdCd, complexName: exactAptNm || complexName }),
      });
      const areasData = await areasRes.json();
      const opts = groupAreasByPyeong((areasData.areaOptions || []).map(o => Number(o.areaSqm)).filter(a => a > 0))
        .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) }));
      if (opts.length === 0) {
        setAiMsg("최근 실거래가 없습니다. 네이버 부동산 또는 KB부동산원에서 KB시세를 확인 후 입력해 주세요.");
        setF(prev => ({ ...prev, _needKbInput: true }));
      } else {
        setAreaOptions(opts);
      }
    } catch(e) { setAiMsg("면적 조회 실패."); }
    finally { setFetchingAreas(false); }
  }

  async function fetchAreas() {
    if (!f.complexName || !f.region) { setAiMsg("지역(구)과 단지명을 입력하세요."); return; }
    setFetchingAreas(true); setAiMsg(null); setAreaOptions([]);
    try {
      let lawdCd2 = null;
      try {
        const lr = await fetch("/api/lawdCd", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lawdCd", sigungu: f.region }),
        });
        lawdCd2 = (await lr.json()).lawdCd || null;
      } catch(e) {}
      if (!lawdCd2) lawdCd2 = getLawdCd(f.dong, f.region);
      if (!lawdCd2) { setAiMsg("지역 코드를 찾지 못했습니다."); setFetchingAreas(false); return; }
      const result = await fetchMolitData(lawdCd2, f.exactAptNm || f.complexName, "", 12);
      // 단지명 필터 적용된 실거래에서만 면적 추출
      const allAreas = [...(result.sale || []), ...(result.jeonse || [])].map(d => d.areaSqm).filter(a => a > 0);
      const unique = [...new Set(allAreas)].sort((a, b) => a - b);
      const opts = groupAreasByPyeong(unique)
        .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) }));
      if (opts.length === 0) {
        setAiMsg("해당 단지 최근 6개월 실거래가 없습니다. 면적을 직접 입력하거나 KB시세를 입력하세요.");
        setF(prev => ({ ...prev, _needKbInput: true }));
      } else {
        setAreaOptions(opts);
      }
    } catch(e) {
      setAiMsg("면적 조회 실패 — 지역(구)명을 확인하세요.");
    } finally { setFetchingAreas(false); }
  }
  const [uploadedImages, setUploadedImages] = useState([]); // 캡처 썸네일
  const [captureMsg, setCaptureMsg] = useState(null); // 캡처 성공 메시지 (별도)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  // 화면은 버튼 하나지만 내부는 3단 파이프라인으로 분리:
  //   [1] fetchApartmentData  → 조회 모듈 (API 전환 시 이 함수만 교체)
  //   [2] buildAnalysisInput  → 변환 모듈 (rawData → analyze() 입력 형태)
  //   [3] analyze()           → 계산 엔진 (ConfirmStep → doAnalyze에서 실행, 절대 수정 금지)
  // ─────────────────────────────────────────────────────────────
  async function quickSearch(overrideArea, overrideForm, exclusiveAreas = null, fromConfirm = false) {
    const ff = overrideForm ? { ...f, ...overrideForm } : f;
    // listingPriceInput: 독립 state에서 직접 읽음
    const listingPrice = Number(String(listingPriceInput).replace(/,/g, "")) || 0;
    if (!ff.complexName && !listingPrice) { setAiMsg("최소한 단지명을 입력하세요. (예: 동부)"); return; }

    // 면적 변경인지 판단 — Supabase 데이터로 저장된 경우만 로컬 재필터 허용
    // MOLIT 데이터(rawMolitRef.dataSource !== 'supabase')는 항상 Supabase 재조회
    const isSameComplex = rawMolitRef.current &&
      rawMolitRef.current.dataSource === 'supabase' &&
      rawMolitRef.current.complexName === (ff.exactAptNm || ff.complexName) &&
      rawMolitRef.current.dong === ff.dong;
    const isAreaChange = overrideArea && isSameComplex;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiLoading(true); setAiMsg(null); setPending(null);

    // 면적 변경 시 이전 분석값 초기화 안내
    if (isAreaChange) {
      setAiMsg("⏳ 면적 변경 중 — 거래 데이터 재필터 중...");
    }

    try {
      let rawData;
      if (isAreaChange) {
        // ── 로컬 재필터 (API 재호출 없음) ──
        rawData = refilterByArea(overrideArea, exclusiveAreas);
        if (!rawData) {
          // 재필터 실패 → API 재호출로 fallback
          rawData = await _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas);
        }
      } else {
        // ── 신규 단지 또는 원본 없음 → Supabase 우선 / MOLIT fallback ──
        rawData = await _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas);
      }

      // ── 공통 처리 ──
      _processRawData(rawData, ff, overrideArea, exclusiveAreas);

    } catch (e) {
      console.error("fetchApartmentData 오류:", e);
      const userMsg = e.message && !e.message.includes("undefined") && !e.message.includes("serviceKey") && !e.message.includes("API 호출")
        ? e.message
        : "실거래 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.";
      setAiMsg(`${userMsg}`);
      const fallbackFf = {
        ...ff, currentPrice: Number(ff.currentPrice) || 0,
        baseJeonse: Number(ff.kbJeonse) || 0, kbSalePrice: Number(ff.kbSalePrice) || 0,
        jeonseUsed: 0, saleUsed: 0, jeonseCalc: null, saleCalc: null, dataSource: "manual",
      };
      setPending({ ff: fallbackFf, jeonseCalc: null, saleCalc: null,
        blockReason: userMsg });
    } finally { setAiLoading(false); }
  }

  // ── Supabase 우선 데이터 조회 ──
  async function _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas) {
    const complexId = ff.complexId || null;
    const complexName = ff.exactAptNm || ff.complexName || "";
    const sigungu = ff.region || "";
    const targetArea = overrideArea ? Number(overrideArea) : Number(ff.areaExclusive) || 0;


    // ── STEP 1: complexId 또는 단지명으로 complexes 조회 ──
    let complexInfo = null;
    try {
      const r1 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "search", name: complexName, sigungu, limit: 5 })
      });
      const d1 = await r1.json();
      if (d1.complexes && d1.complexes.length > 0) {
        // complexId 일치 우선, 없으면 첫 번째
        complexInfo = d1.complexes.find(c => complexId && c.id === complexId) || d1.complexes[0];
      }
      if (d1.aliasMatch) {
      }
    } catch(e) {
      console.warn("  [STEP1] complexes 조회 실패:", e.message);
    }

    // Supabase 단지 정보 없으면 MOLIT fallback
    if (!complexInfo) {
      return await _fetchRawData(ff, overrideArea, exclusiveAreas);
    }

    const useComplexId = complexInfo.id;
    const useComplexName = complexInfo.complex_name;

    // ── STEP 2: aliases 확인 (이미 STEP1에서 반환됨, 별도 로그용) ──

    // ── STEP 3: price_summary 조회 ──
    let summary = null;
    try {
      const r3 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "summary", complex_id: useComplexId, area_excl: targetArea || undefined })
      });
      const d3 = await r3.json();
      summary = d3.summary || null;
    } catch(e) {
      console.warn("  [STEP3] price_summary 조회 실패:", e.message);
    }

    // ── STEP 4+5: sales_raw + rent_raw 조회 ──
    // 면적 필터 없이 전체 단지 deals 조회 → rawMolitRef에 전체 저장
    // → 뒤로가기 후 다른 면적 선택 시 refilterByArea가 정상 동작
    let saleDealsAll = [], rentDealsAll = [];
    try {
      const r4 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deals", complex_id: useComplexId, complex_name: useComplexName, sigungu })
        // area_excl 제거 — 전체 면적 데이터 받아서 클라이언트 필터
      });
      const d4 = await r4.json();
      saleDealsAll = d4.saleDeals || [];
      rentDealsAll = d4.rentDeals || [];
    } catch(e) {
      console.warn("  [STEP4+5] deals 조회 실패:", e.message);
    }

    // 현재 선택 면적으로 클라이언트 필터 (±3㎡)
    const filterByArea = (deals, area) => {
      if (!area) return deals;
      return deals.filter(d => Math.abs(Number(d.area_excl) - area) <= 3);
    };
    const saleDeals = targetArea ? filterByArea(saleDealsAll, targetArea) : saleDealsAll;
    const rentDeals = targetArea ? filterByArea(rentDealsAll, targetArea) : rentDealsAll;

    // ── Supabase: 단지는 있지만 적재기간 내 거래 없음 → MOLIT fallback ──
    // (단지 미매칭과 거래 없음을 구분해서 tradeStatus에 반영)
    if (saleDeals.length === 0 && rentDeals.length === 0) {
      // MOLIT fallback 시도
      const molitData = await _fetchRawData(ff, overrideArea, exclusiveAreas);
      if (molitData && (molitData.sale?.length > 0 || molitData.jeonse?.length > 0)) {
        return molitData;
      }
      // MOLIT도 없으면 "DB 적재기간 내 거래 없음" 명확히 표시
      return {
        sale: [], jeonse: [], areaOptions: complexInfo.area_list
          ? groupAreasByPyeong(JSON.parse(complexInfo.area_list))
              .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: Math.round(g.rep / 3.3058) })) : [],
        buildYear: complexInfo.build_year || null, lawdCd: null,
        tradeStatus: { code: "PERIOD_NO_TRADE", msg: `최근 1년 실거래 데이터가 부족합니다. 직접 확인한 가격을 입력해 주세요.`, pipeline: { source: "supabase" } },
        dataSource: "supabase",
      };
    }

    // ── STEP 7: 기존 형식으로 변환 (계산식 건드리지 않음) ──
    const toSale = (d) => ({
      areaSqm:      Number(d.area_excl) || 0,
      price:        Number(d.deal_amount_man) || 0,
      ym:           d.contract_ym || "",
      aptNm:        d.complex_name || useComplexName,
      floor:        d.floor || 0,
      cancelDate:   d.cancel_date || null,
    });
    const toRent = (d) => ({
      areaSqm:      Number(d.area_excl) || 0,
      price:        Number(d.deposit_man) || 0,
      ym:           d.contract_ym || "",
      aptNm:        d.complex_name || useComplexName,
      floor:        d.floor || 0,
      monthly:      Number(d.monthly_man) || 0,
    });

    const sale   = saleDeals.map(toSale).filter(d => d.price > 0 && d.areaSqm > 0);
    const jeonse = rentDeals.map(toRent).filter(d => d.price > 0 && d.areaSqm > 0);


    // 신뢰도 계산
    const sbSaleConf = getDataConfidence(sale.length);
    const sbRentConf = getDataConfidence(jeonse.length);
    const sbStatus = (!sbSaleConf.canAnalyze && !sbRentConf.canAnalyze)
      ? { code: "TOO_FEW",  msg: `거래 건수 부족 (매매 ${sale.length}건·전세 ${jeonse.length}건) — 참고용으로만 표시됩니다`, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } }
      : (sbSaleConf.level === "낮음" || sbRentConf.level === "낮음")
        ? { code: "LOW_DATA", msg: `거래 부족 — 참고용 분석 (매매 ${sale.length}건·전세 ${jeonse.length}건)`, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } }
        : { code: "OK", msg: null, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } };
    const data = {
      sale, jeonse,
      areaOptions: complexInfo.area_list
        ? groupAreasByPyeong(JSON.parse(complexInfo.area_list))
            .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: Math.round(g.rep / 3.3058) }))
        : [],
      buildYear:    complexInfo.build_year || null,
      lawdCd:       null,
      tradeStatus:  sbStatus,
      dataSource:   "supabase",
    };

    rawMolitRef.current = {
      ...data,
      // 전체 deals 보관 (면적 필터 전) → refilterByArea 정상 동작
      sale:   saleDealsAll.map(d => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deal_amount_man)||0, ym: d.contract_ym||"", aptNm: d.complex_name||useComplexName, floor: d.floor||0, cancelDate: d.cancel_date||null })).filter(d => d.price>0 && d.areaSqm>0),
      jeonse: rentDealsAll.map(d => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deposit_man)||0,    ym: d.contract_ym||"", aptNm: d.complex_name||useComplexName, floor: d.floor||0, monthly: Number(d.monthly_man)||0 })).filter(d => d.price>0 && d.areaSqm>0),
      complexName: ff.exactAptNm || ff.complexName,
      dong: ff.dong,
      dataSource: 'supabase',
    };
    return data;
  }

  async function _fetchRawData(ff, overrideArea, exclusiveAreas) {
    const data = await fetchApartmentData({
      complexName: ff.complexName, exactAptNm: ff.exactAptNm,
      dong: ff.dong, region: ff.region, sido: ff.sido || "",
      areaExclusive: overrideArea ? String(overrideArea) : ff.areaExclusive,
      exclusiveAreas: exclusiveAreas || null,
    });
    // 원본 보관 (단지명+동 기준)
    rawMolitRef.current = {
      ...data,
      complexName: ff.exactAptNm || ff.complexName,
      dong: ff.dong,
      dataSource: 'molit',
    };
    return data;
  }

  async function _processRawData(rawData, ff, overrideArea, exclusiveAreas) {
    const rawDataWithUserInput = {
      ...rawData,
      // 면적 변경 시 KB시세/현재가는 이전 값 유지 — 사용자가 입력한 값이 우선
      currentPrice: Number(ff.currentPrice) || rawData.currentPrice || 0,
      kbSalePrice:  Number(ff.kbSalePrice)  || rawData.kbSalePrice  || 0,
      kbJeonse:     Number(ff.kbJeonse)     || rawData.kbJeonse     || 0,
      buildYear:    ff.buildYear || rawData.buildYear || 0,
      buildYearWarning: rawData.buildYearWarning || null,
    };
    const effectiveArea = Number(overrideArea) || Number(ff.areaExclusive) || Number(f.areaExclusive) || 0;
    const { filled, ff: builtFf, jeonseCalc, saleCalc, blockReason } = buildAnalysisInput(
      rawDataWithUserInput, ff, effectiveArea
    );
    // 면적: overrideArea 우선
    if (overrideArea) filled.areaExclusive = String(overrideArea);
    else if (ff.areaExclusive) filled.areaExclusive = ff.areaExclusive;
    if (ff.buildYear && !filled.buildYear) filled.buildYear = ff.buildYear;

    // 면적 변경 알림 메시지 (이전 분석 무효)
    if (overrideArea && rawMolitRef.current) {
      filled._areaChangedMsg = `면적이 ${overrideArea}㎡로 변경되어 기존 분석값을 초기화했습니다. 다시 AI 분석을 실행하세요.`;
    }

    // listingPriceInput(독립 state)에서 직접 읽음 — 절대 초기화 안 됨
    const preservedPrice = Number(String(listingPriceInput).replace(/,/g, "")) || Number(ff.currentPrice) || Number(f.currentPrice) || 0;
    // tradeStatus를 f에 저장 → UI에서 원인별 메시지 표시
    setF({ ...filled, currentPrice: preservedPrice, _tradeStatus: rawData.tradeStatus || null });
    const opts = filled._aiAreaOptions?.length > 0 ? filled._aiAreaOptions : (rawData.areaOptions || []);
    setAreaOptions(opts);

    const askedArea = effectiveArea;
    if (askedArea <= 0 && opts.length > 0) { setAiMsg(null); return; }

    const finalCurrentPrice = preservedPrice || Number(String(listingPriceInput).replace(/,/g, "")) || 0;
    const finalBlockReason = !finalCurrentPrice ? "현재 매물가를 입력하세요." : blockReason;
    const pendingFf = builtFf
      ? { ...builtFf, currentPrice: finalCurrentPrice }
      : { ...filled, currentPrice: finalCurrentPrice, baseJeonse: Number(filled.kbJeonse) || 0,
          kbSalePrice: Number(filled.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0,
          jeonseCalc: null, saleCalc: null, dataSource: "ai" };

    // ── B안: ConfirmStep 조건부 자동 스킵 ──
    // Case 1: FairValue → 현재가 불필요 → 항상 바로 분석
    // Case 2: Buy/Sell + 현재가 있음 + blockReason 없음 + 데이터 정상(OK/LOW_DATA/TOO_FEW) → 바로 분석
    // Case 3: 현재가 없음 / 데이터 부족(API_FAIL, NAME_NO_MATCH 등) → ConfirmStep 표시
    const tradeCode = rawData.tradeStatus?.code || "OK";
    const dataOk = ["OK","LOW_DATA","TOO_FEW","JEONSE_SHORT","JEONSE_AREA_SHORT"].includes(tradeCode);
    const canAutoSkip =
      mode === "fair"
        ? (builtFf != null)  // FairValue: blockReason 없으면 바로
        : (finalCurrentPrice > 0 && !finalBlockReason && (dataOk || fromConfirm) && builtFf != null);

    if (canAutoSkip) {
      // ConfirmStep 건너뛰고 바로 분석 실행
      // 분석 횟수 제한 체크 (TODO: 유료화 시 서버사이드 계산으로 이전)
      const allowed = await checkAnalysisLimit();
      if (!allowed) return;
      const autoFf = { ...pendingFf, currentPrice: mode === "fair" ? (finalCurrentPrice || 0) : finalCurrentPrice };
      const res = analyze(autoFf);
      res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
      setR(res); setSaved(false); setPending(null);
      if (onContext) onContext({ price: autoFf.currentPrice, area: Number(autoFf.areaExclusive) || 0 });
      if (mode !== "fair") {
        onSaveHistory({ date: new Date().toISOString().slice(0,10), complex: autoFf.complexName, dong: autoFf.dong,
          complexName: autoFf.complexName, area: autoFf.areaExclusive ? `전용 ${autoFf.areaExclusive}㎡` : "",
          currentPrice: autoFf.currentPrice, fairPrice: res.fairPrice, safetyPrice: res.safetyPrice,
          grade: res.buyGrade, headline: res.headline, analysisType: mode === "buy" ? "매수" : "적정가",
          gradeLabel: res.gradeLabel || "" });
      } else {
        onSaveHistory({ date: new Date().toISOString().slice(0,10), complex: autoFf.complexName, dong: autoFf.dong,
          complexName: autoFf.complexName, area: autoFf.areaExclusive ? `전용 ${autoFf.areaExclusive}㎡` : "",
          currentPrice: autoFf.currentPrice, fairPrice: res.fairPrice, safetyPrice: res.safetyPrice,
          grade: res.buyGrade, headline: res.headline, analysisType: "적정가",
          gradeLabel: res.gradeLabel || "" });
      }
    } else {
      // 데이터 부족 or 현재가 없음 → ConfirmStep 표시
      setPending({ ff: pendingFf, jeonseCalc, saleCalc, blockReason: finalBlockReason });
    }
  }

  // 매물 캡처(이미지)에서 정보 추출 — 사용자가 올린 화면만 분석
  async function extractFromImage(file) {
    if (!file) return;
    setAiLoading(true); setAiMsg(null);
    try {
      const base64 = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(String(rd.result).split(",")[1]); rd.onerror = () => rej(new Error("read")); rd.readAsDataURL(file); });
      const mediaType = file.type || "image/png";
      const prompt = `이 이미지는 한국 부동산 매물 화면(네이버 부동산·중개사 매물 등)의 캡처야. 화면에 보이는 정보만 추출해 아래 JSON만 출력 (설명·마크다운·백틱 금지):
{"region":"시군구","dong":"법정동","complexName":"단지명","pyeong":평형숫자,"areaExclusive":전용면적㎡숫자,"buildYear":준공연도숫자,"currentPrice":매물호가만원,"floor":해당층숫자,"tradeType":"매매|전세|월세"}
규칙: 가격은 만원 단위 정수(12억4000만→124000). 화면에 안 보이는 값은 0/빈문자. 추정하지 말고 보이는 값만.`;
      const response = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json", ...(currentUserId ? { "x-user-id": currentUserId, "x-user-email": currentUserEmail || "" } : {}) },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1000, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: prompt }] }] }),
      });
      if (response.status === 429) { const d = await response.json(); setAiMsg(d.message || "오늘 무료 AI 분석 횟수를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요."); setAiLoading(false); return; }
      const data = await response.json();
      const text = (data.content || []).map((i) => (i.type === "text" ? i.text : "")).filter(Boolean).join("\n");
      const m = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
      const p = JSON.parse(m ? m[0] : "{}");
      setF((prev) => ({ ...prev, region: p.region || prev.region, dong: p.dong || prev.dong, complexName: p.complexName || prev.complexName, pyeong: p.pyeong || prev.pyeong, areaExclusive: p.areaExclusive || prev.areaExclusive, buildYear: p.buildYear || prev.buildYear, currentPrice: Number(p.currentPrice) || prev.currentPrice, _aiFilled: true }));
      setAiMsg(`캡처 분석 완료 — ${p.complexName || "단지"} ${p.pyeong ? p.pyeong + "평" : ""} ${p.currentPrice ? "호가 " + won(Number(p.currentPrice)) : ""}. 시세 판단용 실거래(전세·매매)는 아래 거래내역에 입력하세요. (상용화 시 국토부 API 자동 연동)`);
    } catch (e) {
      setAiMsg("이미지 분석 실패 — 다른 캡처로 시도하거나 직접 입력하세요.");
    } finally { setAiLoading(false); }
  }

  function run() {
    if (!f.currentPrice || !f.complexName) { alert("단지명 · 현재 매물가는 필수입니다."); return; }
    const hasDeals = (f.deals || []).some((d) => d.price && d.ym);
    const jeonseCalc = hasDeals ? computeTrimmedMean(f.deals, Number(f.kbJeonse) || 0, "jeonse") : null;
    const baseJeonse = jeonseCalc && jeonseCalc.value ? jeonseCalc.value : Number(f.baseJeonse);
    if (!baseJeonse) { alert("전세 실거래를 입력하거나 기준 전세가를 직접 입력하세요."); return; }
    const hasSaleDeals = (f.saleDeals || []).some((d) => d.price && d.ym);
    const saleCalc = hasSaleDeals ? computeTrimmedMean(f.saleDeals, Number(f.kbSalePrice) || 0, "sale") : null;
    const ff = { ...f, currentPrice: Number(f.currentPrice), baseJeonse, kbSalePrice: Number(f.kbSalePrice), saleRef: saleCalc && saleCalc.value ? saleCalc.value : null, jeonseUsed: jeonseCalc ? jeonseCalc.used : 0, saleUsed: saleCalc ? saleCalc.used : 0, jeonseCalc, saleCalc, dataSource: f._aiFilled ? "ai" : "manual" };
    setPending({ ff, jeonseCalc, saleCalc }); // 입력값 확인 단계로
  }
  // doAnalyze: ConfirmStep에서 수정된 { ff, jeonseCalc, saleCalc } 객체를 직접 받음
  async function doAnalyze(updated) {
    const src = updated || pending;
    if (!src) return;
    // 분석 횟수 제한 체크 (TODO: 유료화 시 서버사이드 계산으로 이전)
    const allowed = await checkAnalysisLimit();
    if (!allowed) { setPending(null); return; }
    const { ff, jeonseCalc, saleCalc } = src;
    const res = analyze(ff);
    res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
    setR(res); setSaved(false); setPending(null);
    if (onContext) onContext({ price: ff.currentPrice, area: Number(ff.areaExclusive) || 0 });
    onSaveHistory({ date: new Date().toISOString().slice(0, 10), complex: ff.complexName, dong: ff.dong,
      complexName: ff.complexName, area: ff.areaExclusive ? `전용 ${ff.areaExclusive}㎡` : "",
      currentPrice: ff.currentPrice, fairPrice: res.fairPrice, safetyPrice: res.safetyPrice,
      grade: res.buyGrade, headline: res.headline, analysisType: mode === "buy" ? "매수" : "적정가",
      gradeLabel: res.gradeLabel || "" });
  }
  if (r) return mode === "fair"
    ? <FairValueResult r={r} f={f} onBack={() => setR(null)}
        onNewSearch={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
        onHome={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
        areaOptions={areaOptions} currentUserId={currentUserId}
      />
    : <BuyResult r={r} f={f} onBack={() => setR(null)} saved={saved}
        onSave={() => { onAddWatch({ key: `${f.complexName}-${f.dong}`, complex: f.complexName, dong: f.dong, fairPrice: r.fairPrice, currentPrice: Number(f.currentPrice), target: "" }); setSaved(true); }}
        onNewSearch={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
        onChangeArea={() => { setR(null); }}
        onHome={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
        areaOptions={areaOptions} currentArea={f.areaExclusive} currentUserId={currentUserId}
        onSelectArea={async (area) => {
          // 면적 변경 → 데이터 재조회 → 자동 분석까지 실행
          setR(null);
          setPending(null);
          setF(prev => ({ ...prev, areaExclusive: String(area) }));
          window.scrollTo({ top: 0, behavior: 'smooth' });
          // quickSearch 후 pending 세팅 → 자동으로 doAnalyze 실행
          setAiLoading(true);
          try {
            const rawData = await _fetchRawDataSupabase(
              { ...f, areaExclusive: String(area) }, area, null
            );
            const effectiveArea = Number(area);
            const rawWithInput = {
              ...rawData,
              currentPrice: Number(f.currentPrice) || 0,
              kbSalePrice: Number(f.kbSalePrice) || 0,
              kbJeonse: Number(f.kbJeonse) || 0,
              buildYear: f.buildYear || rawData.buildYear || 0,
            };
            const { ff: builtFf, jeonseCalc, saleCalc } = buildAnalysisInput(rawWithInput, { ...f, areaExclusive: String(area) }, effectiveArea);
            if (builtFf && Number(f.currentPrice) > 0) {
              const res = analyze({ ...builtFf, currentPrice: Number(f.currentPrice) });
              res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
              setF(prev => ({ ...prev, areaExclusive: String(area), _tradeStatus: rawData.tradeStatus || null }));
              setAreaOptions(rawData.areaOptions || []);
              setR(res); setSaved(false);
            } else {
              // 현재가 없거나 분석 불가 → 폼으로 복귀
              setF(prev => ({ ...prev, areaExclusive: String(area), _tradeStatus: rawData.tradeStatus || null }));
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
  if (pending) return <ConfirmStep p={pending} f={f} onBack={() => setPending(null)} onConfirm={doAnalyze} mode={mode} onRefetch={(area) => { setF(prev => ({...prev, areaExclusive: String(area)})); quickSearch(area, null, null, true); }} onBackToTop={() => { setPending(null); setR(null); setF({...EMPTY}); setUploadedImages([]); setCaptureMsg(null); setAiMsg(null); }} />;
  return (
    <>
      {/* ── 최근 분석한 단지 ── */}
      {(() => {
        const recents = loadRecentAnalysis(currentUserId).filter(h => {
          const t = h.analysisType;
          return mode === "fair" ? t === "적정가" : t === "매수";
        }).slice(0, 5);
        if (recents.length === 0) return null;
        return (
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="mb-2 text-xs font-bold text-slate-500">최근 분석한 단지</p>
            <div className="space-y-1.5">
              {recents.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    // 저장된 결과 바로 재오픈 (재조회 없이)
                    const restored = {
                      fairPrice: h.fairPrice || 0,
                      safetyPrice: h.safetyPrice || 0,
                      buyGrade: h.grade || "C",
                      gradeLabel: h.gradeLabel || "",
                      gapRatio: h.currentPrice && h.fairPrice ? (h.currentPrice - h.fairPrice) / h.fairPrice : 0,
                      engineMode: "jeonse", modeName: "전세 시세 중심",
                      jeonseUsed: 0, saleUsed: 0, dataConf: 50, dataConfLabel: "보통",
                      shock: { level: "보통", lag: 3 },
                      explain: { valuation: "", review: "", negotiation: "" },
                      headline: h.headline || "", _restored: true,
                    };
                    setF(prev => ({
                      ...prev,
                      complexName: h.complexName || h.complex || "",
                      dong: h.dong || "",
                      areaExclusive: h.area ? h.area.replace("전용 ", "").replace("㎡", "") : "",
                      currentPrice: h.currentPrice || 0,
                    }));
                    setR(restored);
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left hover:bg-slate-100 active:bg-slate-200"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{h.complexName || h.complex}</span>
                    <span className="ml-1.5 text-[11px] text-slate-400">{h.area}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">AI 적정가 {won(h.fairPrice)}</span>
                    {h.grade && GS[h.grade] && (
                      <span className={`rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-white ${GS[h.grade].solid}`}>{h.grade}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        {/* 진입 안내 — 단지 미선택 시만 표시 */}
        {!f.complexName && (
          <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
            <p className="text-sm font-bold text-blue-800">분석 순서</p>
            <div className="mt-2 space-y-1 text-xs text-blue-600">
              <p>시/도 → 구/군 → 동 → 단지명 순으로 선택</p>
              <p>면적 선택</p>
              <p>현재 매물가 입력</p>
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
            <button onClick={() => { setF(p => ({...p, region:"", dong:"", complexName:"", areaExclusive:""})); setAreaOptions([]); setAiMsg(null); }}
              className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600">
              변경
            </button>
          </div>
        ) : (
          <LocationPicker initialQuery={screenerInitial?._searchQuery || ""} onComplete={({ sido, sigungu, dong, complexName, exactAptNm, complexId, buildYear, areaList, autoAreaSqm, areaHint }) => {
            setF(p => ({ ...p, region: sigungu, sido, dong, complexName, exactAptNm,
              complexId: complexId || null,
              buildYear: buildYear || p.buildYear,
              areaExclusive: "" }));
            rawMolitRef.current = null;
            setListingPriceInput(""); // 단지 변경 시 매물가 초기화

            // areaList가 있으면 바로 면적 버튼 생성 (Supabase 경로)
            if (areaList && areaList.length > 0) {
              const opts = groupAreasByPyeong(areaList)
                .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) }));
              setAreaOptions(opts);

              // ── 자동 면적 선택 (자연어 입력 힌트) ──
              if (autoAreaSqm && autoAreaSqm > 0) {
                // opts 중 autoAreaSqm과 가장 가까운 것 선택
                const best = opts.reduce((prev, cur) =>
                  Math.abs(cur.areaSqm - autoAreaSqm) < Math.abs(prev.areaSqm - autoAreaSqm) ? cur : prev
                );
                if (Math.abs(best.areaSqm - autoAreaSqm) <= 8) {
                  // 약간의 딜레이 후 자동 선택 (UI 렌더링 대기)
                  setTimeout(() => {
                    setF(p => ({ ...p, areaExclusive: String(best.areaSqm) }));
                    setAiMsg(null);
                  }, 50);
                }
              }
            } else {
              setAreaOptions([]);
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
                    <button key={i} onClick={() => { set("areaExclusive", String(o.areaSqm)); setAiMsg(null); }}
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

        {/* ── STEP 2: 현재 매물가 입력 ── */}
        {f.complexName && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${listingPriceInput ? "bg-emerald-500" : "bg-slate-400"}`}>
                {listingPriceInput ? "✓" : "2"}
              </span>
              <p className="text-sm font-bold text-slate-700">현재 매물가 입력</p>
              {!listingPriceInput && <p className="text-xs text-slate-400">호가 또는 실거래가 (만원)</p>}
            </div>
            <div className="relative">
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={listingPriceInput} placeholder="예: 50000"
                onChange={(e) => setListingPriceInput(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-slate-500" />
              {listingPriceInput && (() => {
                const v = Number(listingPriceInput);
                if (!v) return null;
                const eok = Math.floor(v / 10000);
                const man = v % 10000;
                const txt = eok > 0 ? (man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`) : `${man.toLocaleString()}만원`;
                return <p className="mt-1.5 text-center text-sm font-bold text-emerald-600">= {txt}</p>;
              })()}
            </div>
          </div>
        )}

        {/* 실거래 상태 안내 카드 — 원인별 구분 */}
        {f._tradeStatus && f._tradeStatus.code !== "OK" && (() => {
          const ts = f._tradeStatus;
          const isApiFail  = ts.code === "API_FAIL";
          const isNoTrade  = ["COMPLEX_NO_TRADE","NAME_NO_MATCH","PERIOD_NO_TRADE"].includes(ts.code);
          const isLowData  = ["LOW_DATA","TOO_FEW"].includes(ts.code);
          const isAreaFail = ts.code === "AREA_NO_MATCH";
          const needKb = isApiFail || isNoTrade || ts.code === "JEONSE_SHORT";
          const boxColor = isNoTrade ? "bg-red-50 ring-red-200" : isLowData ? "bg-amber-50 ring-amber-200" : isAreaFail ? "bg-orange-50 ring-orange-200" : "bg-amber-50 ring-amber-200";
          return (
            <div className={`mt-3 rounded-2xl p-4 ring-1 ${boxColor}`}>
              <p className="text-sm font-bold text-amber-800">
                {isApiFail ? "API 조회 실패" :
                 isNoTrade ? "단지 거래 없음" :
                 ts.code === "JEONSE_AREA_SHORT" || ts.code === "AREA_SHORT_JEONSE_ELSEWHERE" ? "선택 면적 전세 실거래 부족" :
                 ts.code === "SALE_SHORT" ? "매매 실거래 부족" :
                 "선택 면적 실거래 부족"}
              </p>
              <p className="mt-0.5 text-xs text-amber-600">{ts.msg}</p>
              {needKb && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-amber-700">KB매매시세 (만원)</p>
                    <input type="number" value={f.kbSalePrice} placeholder="예: 50250" onChange={(e) => set("kbSalePrice", e.target.value)} className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-amber-700">KB전세시세 (만원)</p>
                    <input type="number" value={f.kbJeonse} placeholder="예: 35000" onChange={(e) => set("kbJeonse", e.target.value)} className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
                  </div>
                </div>
              )}
              <p className="mt-2 text-[10px] text-amber-500">네이버 부동산 → 시세/실거래가 탭 → KB시세 중간값 확인 후 입력</p>
            </div>
          );
        })()}

        {/* 캡처 업로드 */}
        <div className="mt-3 rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-800">네이버 부동산 캡처 → AI 자동 입력</p>
            {uploadedImages.length > 0 && <button onClick={() => { setUploadedImages([]); setCaptureMsg(null); }} className="text-[10px] text-indigo-400 underline">초기화</button>}
          </div>
          <p className="mt-0.5 text-[10px] text-indigo-500">매물·시세 화면 캡처 올리면 위 항목 자동 인식</p>
          {uploadedImages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {uploadedImages.map((url, i) => (
                <img key={i} src={url} alt={`캡처${i+1}`} className="h-16 w-16 rounded-lg object-cover ring-1 ring-indigo-200" />
              ))}
            </div>
          )}
          <label className={`mt-2 block w-full cursor-pointer rounded-xl py-2 text-center text-xs font-bold text-white ${aiLoading ? "opacity-50" : ""}`} style={{ backgroundColor: NAVY }}>
            {aiLoading ? "인식 중…" : uploadedImages.length > 0 ? "추가 캡처" : "캡처 업로드"}
            <input ref={photoTriggerRef} type="file" accept="image/*" multiple disabled={aiLoading} className="hidden" onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (!files.length) return;
              setAiLoading(true); setAiMsg(null);
              try {
                const toBase64 = (file) => new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res({data: String(rd.result).split(",")[1], type: file.type||"image/png", url: rd.result}); rd.onerror = rej; rd.readAsDataURL(file); });
                const imgs = await Promise.all(files.map(toBase64));
                setUploadedImages(prev => [...prev, ...imgs.map(i => i.url)]);
                const content = [
                  ...imgs.map(img => ({ type: "image", source: { type: "base64", media_type: img.type, data: img.data } })),
                  { type: "text", text: `이 이미지들은 네이버 부동산 화면 캡처야. 보이는 정보만 추출해 아래 JSON만 출력 (설명·백틱 금지):\n{"region":"시군구","dong":"법정동","complexName":"단지명","currentPrice":매물호가또는최근실거래만원정수,"kbSalePrice":KB매매시세만원정수,"kbJeonse":KB전세시세만원정수}\n규칙:\n- 가격은 만원 정수(4억5100만→45100, 5억→50000)\n- 단지명은 화면 상단 굵은 글씨\n- currentPrice: 매물 호가 없으면 최근 실거래가\n- KB시세 없으면 0\n- 안 보이는 값은 0. 절대 추정 금지.` }
                ];
                const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", ...(currentUserId ? { "x-user-id": currentUserId, "x-user-email": currentUserEmail || "" } : {}) }, body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1000, messages: [{ role: "user", content }] }) });
                if (res.status === 429) { const d = await res.json(); setAiMsg(d.message || "오늘 무료 AI 분석 횟수를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요."); setAiLoading(false); return; }
                const data = await res.json();
                const text = (data.content||[]).map(i=>i.type==="text"?i.text:"").join("").replace(/```json|```/g,"").trim();
                const m = text.match(/\{[\s\S]*\}/);
                const p = JSON.parse(m ? m[0] : "{}");
                setF(prev => ({
                  ...prev,
                  region: p.region || prev.region,
                  dong: p.dong || prev.dong,
                  complexName: p.complexName || prev.complexName,
                  currentPrice: Number(p.currentPrice) || prev.currentPrice,
                  kbSalePrice: Number(p.kbSalePrice) || prev.kbSalePrice,
                  kbJeonse: Number(p.kbJeonse) || prev.kbJeonse,
                }));
                setCaptureMsg(`✅ 인식 완료 — ${p.complexName||"단지"} ${p.currentPrice?"매물가 "+(p.currentPrice/10000).toFixed(1)+"억":""}`);
              } catch(e) {
                setAiMsg("캡처 인식 실패 — 직접 입력해주세요.");
              } finally { setAiLoading(false); e.target.value=""; }
            }} />
          </label>
          {captureMsg && <p className="mt-2 text-xs font-medium text-emerald-700">{captureMsg}</p>}
        </div>


        {/* ── STEP 3: AI 분석 실행 ── */}
        {f.complexName && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">3</span>
              <p className="text-sm font-bold text-slate-700">AI 분석 실행</p>
            </div>
            {/* 필수값 미입력 안내 */}
            {!listingPriceInput && (
              <p className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                ↑ 현재 매물가를 입력하면 분석을 시작할 수 있습니다.
              </p>
            )}
            <button onClick={() => quickSearch(f.areaExclusive || undefined)} disabled={aiLoading}
              className={`w-full rounded-2xl py-4 text-lg font-extrabold text-white transition-opacity ${!listingPriceInput ? "opacity-40" : "opacity-100"}`}
              style={{ backgroundColor: NAVY }}>
              {aiLoading
                ? "AI 조회 중… (실거래 데이터 수집 중)"
                : rawMolitRef.current && rawMolitRef.current.complexName === (f.exactAptNm || f.complexName)
                  ? (mode === "fair" ? "다시 분석 (면적 변경됨)" : "다시 분석 (면적 변경됨)")
                  : (mode === "fair" ? "현재 아파트 적정가격은? — AI 적정가 판단" : "이 집 사도 될까? — AI 매수판단")}
            </button>
          </div>
        )}
        {aiLoading && <button onClick={() => { if (abortRef.current) abortRef.current.abort(); setAiLoading(false); setAiMsg("조회가 취소되었습니다."); }} className="mt-2 w-full rounded-2xl border border-red-200 py-2.5 text-sm font-medium text-red-500">⬛ 조회 취소</button>}

        {/* 조회 실패 메시지 */}
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
              <button
                onClick={() => {
                  const ff = { ...f, currentPrice: Number(f.currentPrice)||0, baseJeonse: Number(f.kbJeonse)||0, kbSalePrice: Number(f.kbSalePrice)||0, jeonseUsed:0, saleUsed:0, jeonseCalc:null, saleCalc:null, dataSource:"manual" };
                  setPending({ ff, jeonseCalc:null, saleCalc:null, blockReason: null });
                }}
                className="mt-2 block w-full rounded-lg bg-amber-700 py-2 text-center text-xs font-bold text-white">
                ✏️ 수기로 직접 입력하기
              </button>
            </div>
          );
        })()}

        {/* 샘플 */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">샘플:</span>
          <button onClick={() => { const s = SAMPLE; setF(s); const r = buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:15,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]}, s, s.areaExclusive); const ff2 = r.ff || {...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">동부(전세)</button>
          <button onClick={() => { const s={...PRESET_SG7}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:15,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">상계주공(재건축)</button>
          <button onClick={() => { const s={...PRESET_EUNMA}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:14,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">은마(재건축)</button>
          <button onClick={() => { const s={...PRESET_PRIME_FULL}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:14,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">강남 특수</button>
          <button onClick={() => { const s={...TEST_CASES[5]}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:15,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">잠실엘스</button>
          <button onClick={() => { const s={...TEST_CASES[3]}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:15,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">목동7</button>
        </div>
      </div>
    </>
  );
}

export { BuyView };
