// ValueLens Recommendation — 단지 풀 및 지역 DB

const POOL = [
  { name: "동부", region: "노원구", dong: "공릉동", pyeong: 25, buildYear: 1999, fair: 50200, cur: 50000, jr: 0.70, conf: "높음", regulated: false },
  { name: "상계주공7", region: "노원구", dong: "상계동", pyeong: 19, buildYear: 1988, fair: 62100, cur: 59500, jr: 0.46, conf: "높음", regulated: false, redev: true },
  { name: "은마", region: "강남구", dong: "대치동", pyeong: 25, buildYear: 1979, fair: 412300, cur: 381000, jr: 0.20, conf: "보통", regulated: true, redev: true },
  { name: "송도더샵파크애비뉴", region: "연수구", dong: "송도동", pyeong: 35, buildYear: 2017, fair: 94000, cur: 96000, jr: 0.40, conf: "보통" },
  { name: "마포래미안푸르지오", region: "마포구", dong: "아현동", pyeong: 34, buildYear: 2014, fair: 170000, cur: 165000, jr: 0.55, conf: "보통", regulated: true },
  { name: "분당정자동느티마을", region: "성남시 분당구", dong: "정자동", pyeong: 32, buildYear: 1995, fair: 130000, cur: 125000, jr: 0.58, conf: "보통" },
  { name: "일산후곡", region: "고양시 일산서구", dong: "일산동", pyeong: 28, buildYear: 1994, fair: 65000, cur: 63000, jr: 0.62, conf: "보통" },
  { name: "광교중흥S클래스", region: "수원시 영통구", dong: "이의동", pyeong: 34, buildYear: 2019, fair: 140000, cur: 138000, jr: 0.45, conf: "보통" },
];

// 펀더멘털 기반 신호 (가격 예측 아님) — 가격 여력 / 하락위험 / 후보점수
function scorePool(c) {
  const age = new Date().getFullYear() - c.buildYear;
  const undervalue = (c.fair - c.cur) / c.fair; // 적정가 대비 저렴할수록 +
  // 가격 여력: 전세가율(실수요 견조) + 저평가
  let up = 50 + (c.jr - 0.5) * 80 + undervalue * 300;
  // 하락위험: 재건축 기대 프리미엄 과다(전세가율 낮음+노후), 고평가
  let down = 30 + Math.max(0, 0.5 - c.jr) * 90 + Math.max(0, -undervalue) * 300 + (c.redev ? 20 : 0);
  up = Math.max(5, Math.min(95, Math.round(up))); down = Math.max(5, Math.min(95, Math.round(down)));
  const lab = (v) => (v >= 65 ? "높음" : v >= 40 ? "보통" : "낮음");
  const score = Math.round(undervalue * 200 + up * 0.4 - down * 0.3 + (c.conf === "높음" ? 10 : 0));
  return { age, undervalue, up, upLabel: lab(up), down, downLabel: lab(down), score };
}

// ── 지역 호재/악재·생활 인프라 mock DB ──
// TODO(상용화): 학교알리미·국가교통DB·소상공인상권정보·공공데이터포털(공원/의료) API로 단지 좌표 기반 산출
const AREA_DB = {
  "강남구": { school: 95, transit: 92, retail: 90, medical: 88, park: 70, pos: ["GTX-A 수서·삼성 정차", "대치·개포 재건축 추진", "최상위 학군(대치 학원가)"], neg: ["재건축 분담금·규제 리스크", "초고가로 진입장벽 높음"] },
  "노원구": { school: 82, transit: 76, retail: 72, medical: 70, park: 80, pos: ["재건축 안전진단 완화", "GTX-C 창동 인근", "동북선 경전철 개통"], neg: ["일부 단지 입주물량 증가", "단지 노후화 진행"] },
  "연수구": { school: 85, transit: 70, retail: 80, medical: 82, park: 88, pos: ["송도 바이오 클러스터 확장", "GTX-B 송도 정차 예정", "국제업무지구 인프라"], neg: ["송도 입주물량 누적", "일부 단지 미분양 잔존"] },
  "마포구": { school: 78, transit: 90, retail: 88, medical: 75, park: 72, pos: ["공덕·홍대 광역 상권", "역세권 도심 접근성", "신규 정비사업"], neg: ["출퇴근 교통 혼잡", "신축 공급 제한적"] },
  "성남시 분당구": { school: 90, transit: 82, retail: 85, medical: 84, park: 85, pos: ["1기 신도시 재정비 선도지구", "판교 테크노밸리 배후", "GTX 인근"], neg: ["재정비 장기 사업 불확실성", "단지 노후화"] },
  "고양시 일산서구": { school: 80, transit: 68, retail: 75, medical: 78, park: 90, pos: ["1기 신도시 정비 기대", "GTX-A 킨텍스 정차", "호수공원 환경"], neg: ["서울 대비 교통 열위", "공급 변동성"] },
  "수원시 영통구": { school: 84, transit: 74, retail: 82, medical: 80, park: 86, pos: ["삼성전자 배후 수요", "광교 신도시 인프라", "신분당선 연장"], neg: ["광교 입주물량 누적", "신축 공급 지속"] },
  default: { school: 70, transit: 70, retail: 70, medical: 70, park: 70, pos: ["역세권 접근성", "기본 생활 인프라"], neg: ["공급 변동성", "노후화 진행"] },
};
const areaInfo = (region) => AREA_DB[region] || AREA_DB.default;

// 1. 실거주 점수 (학군/교통/상권/병원/공원/주차/연식)
// TODO(상용화): 학교알리미·교통·상권·공원·의료 공공데이터 연동
function calculateLivingScore(f) {

export { POOL, AREA_DB };
