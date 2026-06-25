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
const typicalPyeong = (sqm) => { sqm = Number(sqm) || 0; if (sqm <= 0) return 0; return Math.round(sqm / 3.3058); };

// 공급면적(㎡)과 평수 계산 — supplySqm이 없으면 전용 × 1.35 추정
function supplyAreaInfo(exclusiveSqm, supplySqm) {

export { GRADES, LABEL, GS, won, pct, typicalPyeong };
