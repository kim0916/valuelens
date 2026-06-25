// ValueLens Recommendation — 점수 계산

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
  const a = areaInfo(f.region);
  const age = f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : 25;
  const ageScore = Math.round(Math.max(40, Math.min(95, 95 - Math.max(0, age - 5) * 1.7)));
  const parking = age <= 10 ? 88 : age <= 20 ? 70 : 55;
  const items = { 학군: a.school, 교통: a.transit, 상권: a.retail, 의료: a.medical, 환경: a.park, 주차: parking, 연식: ageScore };
  const w = { 학군: 0.2, 교통: 0.2, 상권: 0.15, 의료: 0.12, 환경: 0.11, 주차: 0.1, 연식: 0.12 };
  const total = Math.round(Object.keys(items).reduce((s, k) => s + items[k] * w[k], 0));
  return { total, items };
}

// 2. 공급 위험도 (입주물량/분양/미분양)
// TODO(상용화): 입주물량(부동산114)·분양·미분양(국토부 통계) API 연동
function calculateSupplyRisk(f) {
  const heavy = /연수|송도|영통|광교|이의|검단|일산|운정|동탄/.test((f.region || "") + (f.dong || ""));
  const seed = ((f.complexName || "").length + (f.dong || "").length) % 25;
  const score = Math.max(10, Math.min(90, heavy ? 68 + (seed % 15) : 28 + seed));
  const level = score >= 65 ? "높음" : score >= 40 ? "보통" : "낮음";
  const factors = heavy ? ["향후 3년 입주물량 누적", "인근 신규 분양/택지 영향"] : ["입주물량 제한적", "대규모 택지 영향 적음"];
  return { score, level, factors };
}

// 3. 호재
function calculatePositiveFactors(f) {
  const a = areaInfo(f.region);
  const list = a.pos.slice(0, 3);
  const score = Math.min(95, 52 + list.length * 9 + (a.transit >= 85 ? 8 : 0));
  return { score, list };
}
// 4. 악재
function calculateNegativeFactors(f) {
  const a = areaInfo(f.region);
  const age = f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : 25;
  const list = [...a.neg];
  if (age >= 30) list.push("재건축 전 노후화·분담금 리스크");
  const score = Math.min(95, 30 + list.length * 8 + (age >= 30 ? 10 : 0));
  return { score, list: list.slice(0, 3) };
}

// 5. 적정가 히스토리 (mock)
// TODO(상용화): 분석이력 DB + 국토부 실거래 히스토리로 연도별 적정가 재구성

// 7. 재무 가능성 (LTV/DSR + mock 금리 비교 후보 TOP3) — 대출 가능성·월상환 개략 추정
// TODO(API): 웹앱 전환 시 mock 금리 후보를 아래로 교체
//   - 금융감독원 금융상품 비교공시 / 은행연합회 금리 공시 / 제휴 대출비교 API / 금융기관 실제 심사 API

export { scorePool, calculateLivingScore, calculateSupplyRisk, calculatePositiveFactors, calculateNegativeFactors };
