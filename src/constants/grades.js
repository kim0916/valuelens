// ValueLens — 등급 시스템 및 공통 포맷 유틸

const GRADES = ["A", "B", "C", "D", "E"];
const LABEL = { A: "매우 저평가", B: "저평가", C: "적정 가격", D: "고평가 주의", E: "고평가", 보류: "판단 보류" };
const GS = {
  A: { solid: "bg-emerald-600", text: "text-emerald-700" },
  B: { solid: "bg-emerald-500", text: "text-emerald-600" },
  C: { solid: "bg-amber-400", text: "text-amber-700" },
  D: { solid: "bg-orange-500", text: "text-orange-700" },
  E: { solid: "bg-red-600", text: "text-red-700" },
  보류: { solid: "bg-slate-400", text: "text-slate-600" },
};
const won = (m) => { if (!m || isNaN(Number(m)) || Number(m) === 0) return "—"; return m >= 10000 ? (Math.round((m / 10000) * 100) / 100).toLocaleString() + "억" : Number(m).toLocaleString() + "만원"; };
const pct = (r) => (r > 0 ? "+" : "") + (r * 100).toFixed(1) + "%";
// 전용면적(㎡) → 통상 분양평형 추정 (한국 분양 관행 매핑). 못 구하면 0.
// 전용㎡ → 네이버 기준 공급면적 평형
const AREA_PYEONG_MAP = [
  [33,10],[40,12],[46,14],[49,15],[59,18],[60,18],[66,20],
  [74,22],[76,23],[82,25],[84,25],[85,25],[99,30],[101,30],
  [109,33],[112,34],[114,34],[115,34],[132,40],[148,45],
  [149,45],[151,46],[165,50],
];
const typicalPyeong = (sqm) => {
  sqm = Number(sqm) || 0;
  if (sqm <= 0) return 0;
  const best = AREA_PYEONG_MAP.reduce((a,b) => Math.abs(b[0]-sqm) < Math.abs(a[0]-sqm) ? b : a);
  if (Math.abs(best[0] - sqm) <= 8) return best[1];
  return Math.round((sqm / 0.77) / 3.305785); // 매핑 없으면 공급면적 기준
};


export { GRADES, LABEL, GS, won, pct, typicalPyeong };
