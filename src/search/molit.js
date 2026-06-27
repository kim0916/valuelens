// ValueLens Search — 국토부(MOLIT) API 조회
// ★ API 로직 수정 금지

import { fetchWithTimeout } from './location.js';
import { matchAptName, resolveAlias, getBrandWarning } from './alias.js';
import { parsePrice } from './utils.js';

async function fetchMolitData(lawdCd, complexName, areaExclusive, months = 24, exactAptNm = "", dong = "", exclusiveAreas = null) {
  const now = new Date();
  // 면적 확장: ±3㎡ 우선, 거래 3건 미만일 때만 ±5·±8㎡ 확장 (보조 데이터)
  const AREA_STEPS_PRIMARY = [3];
  const AREA_STEPS_EXPAND  = [5, 8];

  // alias 해석: 입력 단지명이 alias 사전에 있으면 실명으로 교체
  const aliasInfo = resolveAlias(complexName);
  if (aliasInfo && aliasInfo.real.length > 0 && !exactAptNm) {
    exactAptNm = aliasInfo.real[0]; // 첫 번째 실명으로 exactAptNm 설정
  }
  // 면적 필터 기준: exclusiveAreas 배열 우선, 없으면 단일값
  const areaTarget = exclusiveAreas && exclusiveAreas.length > 0 ? exclusiveAreas : (Number(areaExclusive) > 0 ? Number(areaExclusive) : null);

  const monthList = Array.from({ length: months }, (_, mi) => {
    const d = new Date(now.getFullYear(), now.getMonth() - mi, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // ── 파이프라인 진단 객체 (매매/전세 각각) ──
  const mkPipe = () => ({
    step1_raw: 0,        // 국토부 원본 수집
    step2_aptNm: 0,      // 단지명 필터 후
    step3_area: 0,       // 면적 필터 후
    step4_period: 0,     // 기간 필터 후 (computeTrimmedMean 내부)
    step5_refined: 0,    // 정제 후 (1층/이상치 제외)
    step6_final: 0,      // 최종 화면 표시
    aptNmSamples: [],    // 원본 단지명 샘플
    areaSamples: [],     // 원본 면적 샘플
    failReason: null,    // 0건 원인
    usedTolerance: null,
  });
  const salePipe = mkPipe(), jeonseP = mkPipe();
  let apiFailed = 0;
  const allAreas = new Set();

  // ── Step1: 국토부 원본 수집 — 서버는 lawdCd+dealYmd만, 필터 없음 ──
  const fetchMonth = async (ym) => {
    try {
      const [sR, rR] = await Promise.all([
        fetchWithTimeout("/api/molit", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "sale", lawdCd, dealYmd: ym }) }, 10000),
        fetchWithTimeout("/api/molit", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "rent", lawdCd, dealYmd: ym }) }, 10000),
      ]);
      const sd = await sR.json(), rd = await rR.json();
      return { saleItems: sd.items || [], rentItems: rd.items || [] };
    } catch(e) {
      console.warn(`[pipe] ${ym} 조회실패:`, e.message);
      return { saleItems: [], rentItems: [], failed: true };
    }
  };

  const settled = await Promise.allSettled(monthList.map(fetchMonth));
  const allSaleRaw = [], allRentRaw = [];

  for (const s of settled) {
    if (s.status !== "fulfilled") { apiFailed++; continue; }
    const { saleItems, rentItems, failed } = s.value;
    if (failed) { apiFailed++; continue; }
    salePipe.step1_raw += saleItems.length;
    jeonseP.step1_raw += rentItems.length;
    // 단지명 샘플 수집
    for (const i of saleItems) { if (i.aptNm && salePipe.aptNmSamples.length < 10) salePipe.aptNmSamples.push(i.aptNm); }
    for (const i of rentItems) { if (i.aptNm && jeonseP.aptNmSamples.length < 10) jeonseP.aptNmSamples.push(i.aptNm); }
    allSaleRaw.push(...saleItems);
    allRentRaw.push(...rentItems);
  }

  // ── Step2: 단지명 + 법정동 필터 (모두 클라이언트 처리) ──
  // 법정동 필터: dong 있으면 umdNm 일치 확인 — 같은 이름 다른 단지 구분
  const matchDong = (item) => {
    if (!dong) return true;
    const iDong = String(item.umdNm || "").replace(/\s/g, "");
    const tDong = String(dong).replace(/\s/g, "");
    if (!iDong) return true; // umdNm 없으면 통과
    // 완전일치 또는 포함 관계
    return iDong === tDong || iDong.includes(tDong) || tDong.includes(iDong);
  };

  // 브랜드 단독 검색 경고 (매칭 후 건수 체크)
  const checkBrandMix = (matched, name) => {
    const uniqueNames = [...new Set(matched.map(i => i.aptNm).filter(Boolean))];
    return getBrandWarning(name, uniqueNames.length);
  };

  const saleAptFiltered = allSaleRaw.filter(i =>
    matchAptName(i.aptNm, complexName, exactAptNm) && matchDong(i)
  );
  const rentRaw = allRentRaw.filter(i => {
    if (!matchAptName(i.aptNm, complexName, exactAptNm)) return false;
    if (!matchDong(i)) return false;
    if (i.monthlyRent && Number(i.monthlyRent) > 0) return false; // 월세 제외
    return true;
  });
  salePipe.step2_aptNm = saleAptFiltered.length;
  jeonseP.step2_aptNm = rentRaw.length;

  // 브랜드 혼재 경고 생성
  const brandWarning = checkBrandMix(saleAptFiltered, complexName);
  if (brandWarning) console.warn("[brand]", brandWarning);

  // 면적 샘플 수집
  salePipe.areaSamples = [...new Set(saleAptFiltered.map(i => Number(i.excluUseAr)).filter(Boolean))].sort((a,b)=>a-b);
  jeonseP.areaSamples = [...new Set(rentRaw.map(i => Number(i.excluUseAr)).filter(Boolean))].sort((a,b)=>a-b);
  for (const i of [...saleAptFiltered, ...rentRaw]) { const a = Math.round((Number(i.excluUseAr)||0)*100)/100; if (a>0) allAreas.add(a); }

  // ── Step3: 면적 필터 — ±3㎡ 우선, 거래 부족(3건 미만)일 때만 확장 ──
  // isExpanded=true 이면 보조 데이터로 표시해야 함
  const filterByAreaGroup = (items, target) => {
    if (!target) return { filtered: items, tol: -1, isExpanded: false };
    if (Array.isArray(target)) {
      const filtered = items.filter(i => target.some(a => Math.abs(Number(i.excluUseAr) - a) <= 10));
      return { filtered, tol: 3, isExpanded: false };
    }
    // 1차: ±3㎡
    const primary = items.filter(i => Math.abs(Number(i.excluUseAr) - Number(target)) <= 10);
    if (primary.length >= 3) return { filtered: primary, tol: 3, isExpanded: false };
    // 2차: 거래 3건 미만일 때만 확장 (보조 데이터 플래그)
    for (const t of AREA_STEPS_EXPAND) {
      const expanded = items.filter(i => Math.abs(Number(i.excluUseAr) - Number(target)) <= t);
      if (expanded.length > 0) return { filtered: expanded, tol: t, isExpanded: true };
    }
    return { filtered: primary, tol: 3, isExpanded: false };
  };

  let saleArea, rentArea, usedTol, saleExpanded = false, rentExpanded = false;
  if (areaTarget) {
    const { filtered: sf, tol: st, isExpanded: se } = filterByAreaGroup(saleAptFiltered, areaTarget);
    const { filtered: jf, tol: jt, isExpanded: je } = filterByAreaGroup(rentRaw,         areaTarget);
    saleArea = sf; rentArea = jf;
    saleExpanded = se; rentExpanded = je;
    usedTol = Math.max(st, jt);
  } else {
    saleArea = saleAptFiltered; rentArea = rentRaw; usedTol = -1;
  }
  salePipe.step3_area = saleArea.length;
  jeonseP.step3_area = rentArea.length;
  salePipe.usedTolerance = usedTol;
  jeonseP.usedTolerance = usedTol;

  // ── Step4~6: 변환 + price>0 필터 (기간 필터는 computeTrimmedMean 내부) ──
  const toSale = (item) => ({
    ym: `${item.dealYear}-${String(item.dealMonth || "").padStart(2, "0")}`,
    price: Math.round(parsePrice(item.dealAmount)),
    floor: Number(item.floor) || 5,
    areaSqm: Math.round((Number(item.excluUseAr)||0)*100)/100,
    complexName: item.aptNm || complexName,
    buildYear: Number(item.buildYear) || 0,
    region: item.siGunGu || item.sggNm || "",
  });
  const toJeonse = (item) => ({
    ym: `${item.dealYear}-${String(item.dealMonth || "").padStart(2, "0")}`,
    price: Math.round(parsePrice(item.deposit)),
    floor: Number(item.floor) || 5,
    areaSqm: Math.round((Number(item.excluUseAr)||0)*100)/100,
    complexName: item.aptNm || complexName,
    buildYear: Number(item.buildYear) || 0,
  });

  // [P0 Fix] slice(0,50): 24개월치 데이터를 computeTrimmedMean에 충분히 전달
  // 이전 slice(0,10)은 거래 많은 단지에서 최신 0.5~1개월치만 전달되어
  // 기간필터/이상치제거/KB가중 로직이 모두 무력화되는 문제 해결
  const saleOut = saleArea.map(toSale).filter(d => d.price > 0).sort((a,b)=>b.ym.localeCompare(a.ym)).slice(0, 50);
  const jeonseOut = rentArea.map(toJeonse).filter(d => d.price > 0).sort((a,b)=>b.ym.localeCompare(a.ym)).slice(0, 50);
  salePipe.step6_final = saleOut.length;
  jeonseP.step6_final = jeonseOut.length;

  // ── 0건 원인 판단 ──
  const whyZero = (pipe, label) => {
    if (apiFailed >= monthList.length) return "API 조회 실패";
    if (pipe.step1_raw === 0) return "국토부 응답 0건 (법정동 코드 확인 필요)";
    if (pipe.step2_aptNm === 0) return `단지명 매칭 실패 (원본: ${[...new Set(pipe.aptNmSamples)].slice(0,5).join(", ")})`;
    if (pipe.step3_area === 0) {
      const targetLabel = Array.isArray(areaTarget) ? areaTarget.slice(0,3).join("/")+"㎡" : `${areaExclusive}㎡`;
      return `선택 면적(${targetLabel}) 거래 없음 (단지 면적: ${pipe.areaSamples.slice(0,5).join(", ")}㎡)`;
    }
    if (pipe.step6_final === 0) return "가격 파싱 실패 또는 전체 이상치";
    return null;
  };
  salePipe.failReason = saleOut.length === 0 ? whyZero(salePipe, "매매") : null;
  jeonseP.failReason = jeonseOut.length === 0 ? whyZero(jeonseP, "전세") : null;

  // ── 콘솔 파이프라인 요약 ──
  const fmt = (p, label) => `${label}: 원본${p.step1_raw}→단지명${p.step2_aptNm}→면적${p.step3_area}(±${p.usedTolerance}㎡)→최종${p.step6_final}건${p.failReason ? ` ❌${p.failReason}` : ""}`;
  if (salePipe.step2_aptNm === 0 || jeonseP.step2_aptNm === 0) {
  }

  // ── diagnosis 객체 (UI 표시용) ──
  const saleConf  = getDataConfidence(saleOut.length);
  const rentConf  = getDataConfidence(jeonseOut.length);
  const diagnosis = {
    apiFailed: apiFailed >= monthList.length,
    // 원인별 구분 (4가지)
    noComplex:    salePipe.step2_aptNm === 0 && jeonseP.step2_aptNm === 0 && salePipe.step1_raw > 0,
    complexNoTrade: salePipe.step2_aptNm === 0 && jeonseP.step2_aptNm === 0,
    areaNoMatch:  salePipe.step2_aptNm > 0 && salePipe.step3_area === 0,
    periodNoTrade: salePipe.step2_aptNm > 0 && salePipe.step3_area > 0 && saleOut.length === 0,
    // 거래 건수 신뢰도
    saleConf,  rentConf,
    saleAreaShort:  saleOut.length < 4,
    jeonseAreaShort: jeonseOut.length < 4,
    jeonseExistsOtherArea: jeonseP.step2_aptNm > 0 && jeonseOut.length < 4,
    // 확장 면적 사용 여부
    saleExpanded, rentExpanded,
    usedTolerance: usedTol,
    complexSaleTotal: salePipe.step2_aptNm,
    complexRentTotal: jeonseP.step2_aptNm,
    pipeline: { sale: salePipe, jeonse: jeonseP },
  };

  return { sale: saleOut, jeonse: jeonseOut, allAreas, diagnosis, brandWarning };
}


export { fetchMolitData };
