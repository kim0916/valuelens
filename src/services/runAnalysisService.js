/**
 * runAnalysisService.js
 * runAnalysis 로직을 AIChatView 밖에서도 쓸 수 있도록 분리
 * main.jsx의 결과지 채팅에서 직접 호출 가능
 */
import { analyze } from '../engine/analyze.js';
import { buildAnalysisInput } from '../search/input.js';
import { groupAreasByPyeong } from '../search/utils.js';
import { typicalPyeong } from '../constants/grades.js';

/**
 * 단지 + 면적 + 매물가로 분석 실행
 * @returns { engine, ff, complex } | null
 */
export async function runAnalysisService(complex, areaSqm, currentPrice = null, userInputPrice = false) {
  try {
    const sigungu   = complex.sigungu    || complex.sigungu_nm || "";
    const dong      = complex.legal_dong || complex.dong || "";
    const name      = complex.complex_name || complex.name;
    const complexId = complex.id || null;
    const areaListRaw = complex.area_list
      ? (typeof complex.area_list === "string" ? JSON.parse(complex.area_list) : complex.area_list)
      : areaSqm ? [areaSqm] : [];

    let targetArea = areaSqm || null;
    if (!targetArea && areaListRaw.length > 0) {
      const sorted = [...areaListRaw].map(Number).filter(Boolean).sort((a,b) => a-b);
      targetArea = sorted[Math.floor(sorted.length / 2)];
    }

    // Supabase deals 조회
    const sbRes = await fetch('/api/supabase', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'deals', complex_id: complexId, complex_name: name, sigungu }),
    });
    const sbData = await sbRes.json();

    let saleDealsRaw = sbData.saleDeals || sbData.deals?.filter(d => d.deal_type==='sale') || [];
    let rentDealsRaw = sbData.rentDeals || sbData.deals?.filter(d => d.deal_type==='rent') || [];

    const filterArea = (arr) => targetArea
      ? arr.filter(d => Math.abs(Number(d.area_excl) - targetArea) <= 3)
      : arr;

    const toSale = d => ({ ym: d.contract_ym || "", price: Number(d.deal_amount_man) || 0, floor: Number(d.floor) || 5, areaSqm: Number(d.area_excl) || 0 });
    const toRent = d => ({ ym: d.contract_ym || "", price: Number(d.deposit_man) || 0, floor: Number(d.floor) || 5, areaSqm: Number(d.area_excl) || 0 });

    const sale   = filterArea(saleDealsRaw).map(toSale).filter(d => d.price > 0 && d.ym);
    const jeonse = filterArea(rentDealsRaw).filter(d => !d.monthly_man || Number(d.monthly_man) === 0).map(toRent).filter(d => d.price > 0 && d.ym);

    if (sale.length < 3) return null; // 거래 부족

    const sortedPrices = [...sale].map(d => d.price).filter(p => p > 0).sort((a,b) => a-b);
    const medianPrice  = sortedPrices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length / 2)] : 0;
    const finalPrice   = currentPrice || medianPrice;

    const rawData = {
      sale, jeonse,
      areaSqm:       targetArea || 0,
      region:        sigungu,
      dong,
      complexName:   name,
      buildYear:     complex.build_year || null,
      currentPrice:  finalPrice,
      _userInputPrice: userInputPrice,
      kbSalePrice:   0,
      kbJeonse:      0,
      tradeStatus:   { code: "OK" },
      areaOptions:   groupAreasByPyeong(areaListRaw).map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) })),
    };

    const baseForm = { region: sigungu, dong, complexName: name };
    const built = buildAnalysisInput(rawData, baseForm, targetArea ? Math.round(targetArea) : 0);
    if (!built?.ff) return null;

    const res = analyze(built.ff);
    res.jeonseCalc = built.jeonseCalc;
    res.saleCalc   = built.saleCalc;
    res.saleCount  = sale.length;
    res.saleMedian = built.saleCalc?.value || null;

    return {
      engine: { ...res, saleDeals: sale, jeonseDeals: jeonse },
      ff:     { ...built.ff, saleDeals: sale, jeonseDeals: jeonse, _userInputPrice: userInputPrice },
      complex: { name, sigungu, dong, areaExclusive: Math.round(targetArea || built.ff.areaExclusive || 0), buildYear: complex.build_year },
    };
  } catch(e) {
    console.error('[runAnalysisService]', e);
    return null;
  }
}
