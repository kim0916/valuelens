// ValueLens Search — 아파트 데이터 통합 조회 (Supabase + MOLIT fallback)
// ★ 조회 로직 수정 금지

import { getLawdCd } from './location.js';
import { groupAreasByPyeong } from './utils.js';
import { fetchMolitData } from './molit.js';

async function fetchApartmentData(query) {
  // query: { complexName, exactAptNm, dong, region, sido, areaExclusive, exclusiveAreas }

  const qComplexName  = String(query.complexName  || "");
  const qExactAptNm   = String(query.exactAptNm   || "");
  const qDong         = String(query.dong         || "");
  const qRegion       = String(query.region       || "");
  const qSido         = String(query.sido         || "");
  const qArea         = Number(query.areaExclusive) || 0;
  // 평형 그룹 전체 면적 배열 — 있으면 필터를 배열 기반으로
  const qExclusiveAreas = Array.isArray(query.exclusiveAreas) && query.exclusiveAreas.length > 0
    ? query.exclusiveAreas : null;

  // ── 2. 필수 검증 ──
  if (!qComplexName && !qExactAptNm) throw new Error("단지명을 다시 선택해주세요.");
  if (!qRegion) throw new Error("지역(구)명을 확인하세요.");

  // ── 3. lawdCd 변환 ──
  let lawdCd = null;
  try {
    const lr = await fetch("/api/lawdCd", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "lawdCd", sigungu: qRegion, sido: qSido }),
    });
    const ld = await lr.json();
    lawdCd = ld.lawdCd || null;
  } catch(e) { console.warn("lawdCd API 실패, 내장 테이블 사용:", e.message); }
  if (!lawdCd) lawdCd = getLawdCd(qDong, qRegion);
  if (!lawdCd) throw new Error(`지역코드를 찾을 수 없습니다 (${qRegion}). 지역(구)명을 확인하세요.`);

  // ── 4. 실거래 조회 (6개월, exactAptNm 완전일치) ──
  let sale = [], jeonse = [], tradeStatus = null;
  let molitResult;
  try {
    molitResult = await fetchMolitData(lawdCd, qExactAptNm || qComplexName, String(qArea), 24, qExactAptNm, qDong, qExclusiveAreas);
    sale   = molitResult.sale   || [];
    jeonse = molitResult.jeonse || [];
    const d = molitResult.diagnosis || {};
    const pipeline = d.pipeline || {};

    // ── 5. 원인별 tradeStatus 생성 (4가지 원인 구분) ──
    if (d.apiFailed) {
      tradeStatus = { code: "API_FAIL", msg: "국토부 API 조회 실패 — 잠시 후 다시 시도하거나 KB시세를 직접 입력하세요.", pipeline };
    } else if (d.complexNoTrade && d.noComplex) {
      // 원인 1: 단지명 매칭 실패 (API 응답은 왔는데 단지명이 안 맞음)
      const sampleNames = [...new Set([...(pipeline.sale?.aptNmSamples||[]), ...(pipeline.jeonse?.aptNmSamples||[])])].slice(0,5).join(", ");
      tradeStatus = { code: "NAME_NO_MATCH", msg: `단지명 매칭 실패 — "${qComplexName}"을(를) 찾을 수 없습니다${sampleNames ? ` (조회된 단지명: ${sampleNames})` : ""}. 전체 단지명을 정확히 입력하세요.`, pipeline };
    } else if (d.complexNoTrade) {
      // 원인 2: DB/기간 내 거래 없음 (단지 자체가 없거나 기간 내 거래 0)
      tradeStatus = { code: "PERIOD_NO_TRADE", msg: `최근 1년 실거래 데이터가 부족합니다. 직접 확인한 가격을 입력해 주세요.`, pipeline };
    } else if (d.areaNoMatch) {
      // 원인 3: 면적 매칭 실패
      const areaSamples = (pipeline.sale?.areaSamples || []).slice(0,5).join(", ");
      tradeStatus = { code: "AREA_NO_MATCH", msg: `면적 매칭 실패 — 선택 면적(${qArea}㎡)과 실거래 면적이 다릅니다${areaSamples ? ` (단지 실거래 면적: ${areaSamples}㎡)` : ""}`, canExpand: true, pipeline };
    } else {
      // 거래 있음 — 신뢰도 기반으로 상태 결정 (에러 아님)
      const sc = d.saleConf, jc = d.rentConf;
      const expandNote = (d.saleExpanded || d.rentExpanded) ? " · 인접 면적 보조 데이터 포함" : "";
      if (!sc.canAnalyze && !jc.canAnalyze) {
        // 원인 4: 기간 내 거래 있지만 너무 적음 (참고값만)
        tradeStatus = { code: "TOO_FEW", msg: `거래 건수 부족 (매매 ${sale.length}건·전세 ${jeonse.length}건) — 참고용으로만 표시됩니다${expandNote}`, saleConf: sc, rentConf: jc, pipeline };
      } else if (sc.level === "낮음" || jc.level === "낮음") {
        tradeStatus = { code: "LOW_DATA", msg: `거래 부족 — 참고용 분석 (매매 ${sale.length}건·전세 ${jeonse.length}건)${expandNote}`, saleConf: sc, rentConf: jc, pipeline };
      } else if (d.jeonseAreaShort && d.jeonseExistsOtherArea) {
        tradeStatus = { code: "JEONSE_AREA_SHORT", msg: `전세 실거래 부족 — 다른 평형에 전세 거래 있음${expandNote}`, saleConf: sc, rentConf: jc, canExpand: true, pipeline };
      } else if (d.jeonseAreaShort) {
        tradeStatus = { code: "JEONSE_SHORT", msg: `전세 실거래 부족 — KB전세시세를 직접 입력하세요${expandNote}`, saleConf: sc, rentConf: jc, pipeline };
      } else {
        tradeStatus = { code: "OK", msg: expandNote ? `데이터 정상${expandNote}` : null, saleConf: sc, rentConf: jc, pipeline };
      }
    }
  } catch(e) {
    console.error("국토부 API 조회 실패:", e);
    throw new Error("실거래 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.");
  }

  // ── 6. 면적 그룹핑 — 매매 우선, 없으면 전세 보완 ──
  const saleAreaList  = sale.map(d => d.areaSqm).filter(a => a > 0);
  const jeonseAreaList = jeonse.map(d => d.areaSqm).filter(a => a > 0);
  const areaSourceList = saleAreaList.length > 0
    ? saleAreaList
    : [...saleAreaList, ...jeonseAreaList];

  // 평형 그룹 (±3㎡ 이내 = 같은 그룹)
  const areaGroups = groupAreasByPyeong(areaSourceList);

  // areaOptions: 면적 선택 버튼용 — exclusiveAreas 배열 포함
  const areaOptions = areaGroups.map(g => ({
    areaSqm:        g.rep,
    exclusiveAreas: g.areas,
    pyeong:         g.pyeong,
    supplySqm:      null, // 국토부 미제공 → UI에서 ×1.35 추정
  }));

  // ── 7. 대표 면적 결정 — areaGroups 기반 ──
  let areaSqm = 0;
  if (qArea > 0) {
    // 선택 면적이 속한 그룹의 대표값 사용
    const matchedGroup = areaGroups.find(g => g.areas.some(a => Math.abs(a - qArea) <= 5));
    areaSqm = matchedGroup ? matchedGroup.rep : 0;
  } else if (areaGroups.length === 1) {
    // 면적 미지정이고 단일 평형만 있으면 자동 선택
    areaSqm = areaGroups[0].rep;
  }

  // 다른 평형 거래 분리 (참고 표시용)
  const selectedGroup = qArea > 0
    ? areaGroups.find(g => g.areas.some(a => Math.abs(a - qArea) <= 5))
    : null;
  const otherAreaJeonse = selectedGroup
    ? jeonse.filter(d => !selectedGroup.areas.some(a => Math.abs(d.areaSqm - a) <= 1))
    : [];
  const otherAreaSale = selectedGroup
    ? sale.filter(d => !selectedGroup.areas.some(a => Math.abs(d.areaSqm - a) <= 1))
    : [];
  if (otherAreaJeonse.length > 0 || otherAreaSale.length > 0) {
    const otherAreas = [...new Set([...otherAreaJeonse, ...otherAreaSale].map(d => d.areaSqm))].sort((a,b)=>a-b).slice(0,5);
  }

  // ── 8. buildYear 추출 — 단지명 필터된 아이템에서만, 최빈값 사용 ──
  // ── 8. buildYear 추출 — 매매 데이터에서만 (전세 API는 buildYear 미제공)
  // 서버에서 이미 단지명+법정동 필터 적용된 데이터에서 최빈값 사용
  const saleYears = sale
    .map(d => d.buildYear)
    .filter(y => y > 1900 && y <= new Date().getFullYear());

  let buildYear = 0;
  let buildYearWarning = null;

  if (saleYears.length === 0) {
    buildYearWarning = "준공연도 확인 필요";
  } else {
    // 최빈값 계산
    const freq = {};
    for (const y of saleYears) freq[y] = (freq[y] || 0) + 1;
    const modeYear = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);

    // 후보 연도가 2개 이상이고 최빈값이 전체 50% 미만이면 경고
    const uniqueYears = Object.keys(freq).length;
    const modeRatio = freq[modeYear] / saleYears.length;

    if (uniqueYears > 1 && modeRatio < 0.5) {
      buildYearWarning = "준공연도 확인 필요";
      buildYear = modeYear;
    } else {
      buildYear = modeYear;
    }
  }


  // ── 9. 지역명 역변환 ──
  const LAWD_CD_REVERSE = Object.fromEntries(Object.entries(LAWD_CD_MAP).map(([k, v]) => [String(v), k]));
  const regionFromCode = LAWD_CD_REVERSE[lawdCd] || "";
  const regionName = qRegion || regionFromCode || (sale[0]?.region || "");

  // ── 10. 기준 전세가 추정 ──
  const baseJeonseEstimate = jeonse[0] ? jeonse[0].price : 0;

  return {
    region: regionName,
    dong: qDong,
    complexName: qComplexName,
    areaSqm,
    pyeong: areaSqm > 0 ? typicalPyeong(areaSqm) : 0,
    priceArea: areaSqm,
    buildYear,
    buildYearWarning,
    topFloor: 0,
    currentPrice: 0,
    kbSalePrice: 0,
    kbJeonse: 0,
    baseJeonseEstimate,
    jeonse,
    sale,
    areaOptions,
    tradeStatus,
    otherAreaJeonse,
    otherAreaSale,
    selectedAreaGroup: selectedGroup,
  };
}

// ── 분석 입력 조립 모듈 (Transform Layer) ──────────────────────
// fetchApartmentData 결과(rawData)를 받아 analyze() 입력 형태로 변환.
// 조회 모듈과 계산 엔진 사이의 변환만 담당 — 두 모듈 모두 수정하지 않음.
//
// TODO(API 전환 시):
//   - rawData 구조가 달라지면 이 함수의 파싱 부분만 수정
//   - 반환 형태(ff, jeonseCalc, saleCalc, blockReason)는 유지
// ───────────────────────────────────────────────────────────────

export { fetchApartmentData };
