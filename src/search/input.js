// ValueLens Search — 분석 입력 빌더 (buildAnalysisInput)
// ★ 계산 로직 수정 금지

import { computeTrimmedMean } from '../engine/stats.js';
import { typicalPyeong } from '../constants/grades.js';

function buildAnalysisInput(rawData, baseForm, askedArea) {
  // rawData   : fetchApartmentData 반환값 (ApartmentRawData JSON)
  // baseForm  : 사용자가 입력한 현재 폼 상태 (dong, complexName 등 보정용)
  // askedArea : 사용자가 입력한 전용면적 (면적 불일치 검증용)
  // 반환      : { filled, ff, jeonseCalc, saleCalc, blockReason, warns, areaOptions }
  const p = rawData;
  const tf = Number(p.topFloor) || 0;
  const norm = (arr) => {
    if (!Array.isArray(arr)) return [];
    const result = [];
    for (const d of arr) {
      if (!d) { continue; }
      if (!d.price) { continue; }
      if (!d.ym) { continue; }
      result.push({ ym: d.ym, price: Number(d.price), floor: Number(d.floor) || 5, topFloor: tf });
    }
    return result;
  };
  const jd = norm(p.jeonse), sd = norm(p.sale);
  const areaSqm = Number(p.areaSqm) || 0;
  const priceArea = Number(p.priceArea) || 0;
  const pyeong = areaSqm > 0 ? typicalPyeong(areaSqm) : 0;
  const areaOptions = Array.isArray(p.areaOptions) ? p.areaOptions.filter((o) => Number(o.areaSqm) > 0).map((o) => ({ areaSqm: Number(o.areaSqm), pyeong: typicalPyeong(Number(o.areaSqm)) })) : [];

  // 정합성 검증
  const warns = [];
  const ts = p.tradeStatus || {};
  // tradeStatus 기반 경고
  if (ts.code && ts.code !== "OK" && ts.msg) warns.push(`${ts.msg}`);
  // KB 입력 필요 조건: API 실패, 단지 거래 없음, 또는 매매+전세 둘 다 부족
  const needKbInput = ["API_FAIL", "COMPLEX_NO_TRADE", "NAME_NO_MATCH", "PERIOD_NO_TRADE", "TOO_FEW", "AREA_NO_MATCH"].includes(ts.code) ||
    (ts.jeonseShort && !ts.canExpand);
  if (p.buildYearWarning) warns.push(`${p.buildYearWarning} — 준공연도를 직접 확인 후 입력하세요.`);
  if (areaSqm <= 0 && !askedArea) warns.push("전용면적 미확인 — 면적을 직접 확인/입력하세요.");
  const mismatch = areaSqm > 0 && priceArea > 0 && Math.abs(priceArea - areaSqm) > Math.max(3, areaSqm * 0.06);
  if (mismatch) warns.push(`가격은 전용 ${priceArea}㎡ 기준인데 단지 기준면적은 ${areaSqm}㎡로 다릅니다.`);
  if (askedArea > 0 && areaSqm > 0 && Math.abs(askedArea - areaSqm) > Math.max(3, askedArea * 0.06)) warns.push(`입력한 전용 ${askedArea}㎡와 조회된 가격 기준 ${areaSqm}㎡가 다릅니다.`);
  const kbRatio = Number(p.kbSalePrice) > 0 && Number(p.kbJeonse) > 0 ? Number(p.kbJeonse) / Number(p.kbSalePrice) : 0;
  if (kbRatio > 0.9) warns.push("전세가율이 비정상적으로 높습니다. 면적/가격 기준을 확인하세요.");
  if (Number(p.kbJeonse) > 0 && Number(p.kbSalePrice) > 0 && Number(p.kbJeonse) >= Number(p.kbSalePrice)) warns.push("전세가가 매매가 이상입니다. 입력값을 확인하세요.");

  const filled = {
    ...EMPTY,
    region: p.region || baseForm.region || "",
    dong: p.dong || baseForm.dong || "",
    complexName: p.complexName || baseForm.complexName,
    pyeong, areaExclusive: areaSqm || "", priceArea,
    buildYear: p.buildYear || "",
    buildYearWarning: p.buildYearWarning || null,
    currentPrice: Number(p.currentPrice) || "",
    kbSalePrice: Number(p.kbSalePrice) || "",
    kbJeonse: Number(p.kbJeonse) || "",
    deals: jd, saleDeals: sd, shockLevel: "보통",
    _aiFilled: true, _aiSource: "국토부 실거래·KB·호갱노노 웹검색(AI)", _needKbInput: needKbInput,
    _tradeStatus: ts,
    _otherAreaJeonse: p.otherAreaJeonse || [],
    _otherAreaSale:   p.otherAreaSale   || [],
    _aiWarns: warns, _aiAreaOptions: areaOptions,
  };

  // computeTrimmedMean 호출 — 24개월 기간, 표본 부족 시 자동 완화
  const jeonseCalc = jd.length ? computeTrimmedMean(jd, Number(filled.kbJeonse) || 0, "jeonse", 24) : null;
  const baseJeonse = jeonseCalc && jeonseCalc.value ? jeonseCalc.value : Number(filled.kbJeonse) || 0;
  const saleCalc = sd.length ? computeTrimmedMean(sd, Number(filled.kbSalePrice) || 0, "sale", 24) : null;

  // 자동 분석 차단 여부 — 차단 사유가 있으면 ff=null, UI는 직접수정 버튼 표시
  // blockReason: 현재가만 있으면 통과 (전세시세 없어도 매매기반 분석 가능)
  const blockReason = (areaSqm <= 0 && !askedArea)
    ? `전용면적을 확인하지 못했습니다.${areaOptions.length ? ` (조회된 면적: ${areaOptions.map((o) => o.areaSqm + "㎡").join(", ")})` : " 직접 입력해 주세요."}`
    : mismatch ? "가격과 면적 기준이 달라 보입니다. 직접 확인 후 수정하세요."
    : !filled.currentPrice ? "현재 매물가를 입력하세요."
    : null;

  // 전세시세 없으면 경고만 (분석은 진행)
  if (!baseJeonse && filled.currentPrice) {
    warns.push("전세 실거래가 없습니다. KB전세시세를 입력하거나 전세 실거래를 직접 입력하세요.");
  }

  const ff = blockReason ? null : {
    ...filled,
    currentPrice: Number(filled.currentPrice),
    baseJeonse,
    kbSalePrice: Number(filled.kbSalePrice),
    saleRef: saleCalc && saleCalc.value ? saleCalc.value : null,
    jeonseUsed: jeonseCalc ? jeonseCalc.used : 0,
    saleUsed: saleCalc ? saleCalc.used : 0,
    jeonseCalc, saleCalc, dataSource: "ai",
  };

  return { filled, ff, jeonseCalc, saleCalc, blockReason, warns, areaOptions };
}
// ═══════════════════════════════════════════════════════════════

// ── 초성 매핑 ──

export { buildAnalysisInput };
