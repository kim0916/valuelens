// ValueLens — 샘플 데이터 및 프리셋

const SAMPLE_DEALS = [
  { ym: "2025-08", price: 35000, floor: 5, topFloor: 15 },
  { ym: "2025-09", price: 34500, floor: 8, topFloor: 15 },
  { ym: "2025-10", price: 36000, floor: 11, topFloor: 15 },
  { ym: "2025-11", price: 35500, floor: 3, topFloor: 15 },
  { ym: "2025-09", price: 43500, floor: 10, topFloor: 15 }, // +24% → ±20% 초과
  { ym: "2025-12", price: 31000, floor: 1, topFloor: 15 },  // 1층
  { ym: "2026-01", price: 34000, floor: 7, topFloor: 15 },
  { ym: "2026-01", price: 30000, floor: 0, topFloor: 15, banjiha: true }, // 반지하
  { ym: "2026-02", price: 35800, floor: 9, topFloor: 15 },
  { ym: "2026-02", price: 41000, floor: 15, topFloor: 15 }, // 최고층
  { ym: "2026-03", price: 36200, floor: 6, topFloor: 15 },
  { ym: "2026-03", price: 28000, floor: 6, topFloor: 15, urgent: true },  // 급전세
  { ym: "2026-04", price: 35200, floor: 12, topFloor: 15 },
  { ym: "2026-04", price: 30500, floor: 8, topFloor: 15, related: true }, // 특수관계
];

const SAMPLE_SALE_DEALS = [
  { ym: "2025-08", price: 50000, floor: 5, topFloor: 15 },
  { ym: "2025-10", price: 49500, floor: 8, topFloor: 15 },
  { ym: "2025-11", price: 51000, floor: 11, topFloor: 15 },
  { ym: "2025-12", price: 50500, floor: 3, topFloor: 15 },
  { ym: "2025-09", price: 62000, floor: 10, topFloor: 15 }, // +23% → ±20% 초과
  { ym: "2025-09", price: 44000, floor: 1, topFloor: 15 },  // 1층
  { ym: "2026-01", price: 49000, floor: 7, topFloor: 15 },
  { ym: "2026-01", price: 42000, floor: 0, topFloor: 15, banjiha: true }, // 반지하
  { ym: "2026-02", price: 50800, floor: 9, topFloor: 15 },
  { ym: "2026-02", price: 58000, floor: 15, topFloor: 15 }, // 최고층
  { ym: "2026-03", price: 51200, floor: 6, topFloor: 15 },
  { ym: "2026-03", price: 40000, floor: 6, topFloor: 15, urgent: true },  // 급매
  { ym: "2026-04", price: 50200, floor: 12, topFloor: 15 },
  { ym: "2026-04", price: 43500, floor: 8, topFloor: 15, related: true }, // 특수관계
];

const SAMPLE = { region: "노원구", dong: "공릉동", complexName: "동부", areaExclusive: 59, pyeong: 25, currentPrice: 50000, kbSalePrice: 50250, kbJeonse: 35500, baseJeonse: 35000, buildYear: 1999, deals: SAMPLE_DEALS, saleDeals: SAMPLE_SALE_DEALS, purpose: "live", holdingYears: 5, shockLevel: "보통", m: { saleGrowth: -23.45, regionSaleGrowth: -23.7, jeonseGrowth: 11.26, regionJeonseGrowth: 49.2, transactionCount: 10, similarComplexCount: 8 } };
const EMPTY = { region: "", dong: "", complexName: "", areaExclusive: "", pyeong: "", priceArea: "", currentPrice: "", kbSalePrice: "", kbJeonse: "", baseJeonse: "", buildYear: "", deals: [], saleDeals: [], purpose: "live", holdingYears: 5, shockLevel: "보통", m: null, availableCash: "", emergencyCash: "", annualIncome: "", plannedLoanAmount: "", interestRate: "", loanYears: "", existingDebtPayment: "", reconstructionStage: "", acqPrice: "", lived: true, oneHouse: true, loanBalance: "", sellPurpose: "현금화" };

// 실거래 프리셋 (국토부 실거래, 취소거래 제외) — 엔진 모드 데모용
const PRESET_EUNMA = { region: "강남구", dong: "대치동", complexName: "은마 25평", areaExclusive: 84.43, pyeong: 25, currentPrice: 381000, kbSalePrice: 531816, kbJeonse: 77000, baseJeonse: 80000, buildYear: 1979, purpose: "live", holdingYears: 5, shockLevel: "보통", m: null,
  saleDeals: [{ ym: "2026-04", price: 381000, floor: 13, topFloor: 14 }, { ym: "2026-01", price: 420000, floor: 4, topFloor: 14 }, { ym: "2025-11", price: 415000, floor: 4, topFloor: 14 }, { ym: "2025-10", price: 431000, floor: 13, topFloor: 14 }, { ym: "2025-10", price: 428000, floor: 12, topFloor: 14 }, { ym: "2025-09", price: 417000, floor: 2, topFloor: 14 }, { ym: "2025-09", price: 398000, floor: 2, topFloor: 14 }, { ym: "2025-07", price: 406000, floor: 3, topFloor: 14 }, { ym: "2025-07", price: 415000, floor: 3, topFloor: 14 }],
  deals: [{ ym: "2026-05", price: 74000, floor: 13, topFloor: 14 }, { ym: "2026-04", price: 75000, floor: 1, topFloor: 14 }, { ym: "2026-04", price: 78500, floor: 7, topFloor: 14 }, { ym: "2026-04", price: 75000, floor: 9, topFloor: 14 }, { ym: "2026-04", price: 86000, floor: 4, topFloor: 14 }, { ym: "2026-04", price: 88000, floor: 5, topFloor: 14 }, { ym: "2026-04", price: 80000, floor: 9, topFloor: 14 }, { ym: "2026-04", price: 75000, floor: 9, topFloor: 14 }, { ym: "2026-04", price: 84000, floor: 9, topFloor: 14 }, { ym: "2026-04", price: 95000, floor: 8, topFloor: 14 }, { ym: "2026-04", price: 73000, floor: 1, topFloor: 14 }] };
const PRESET_SG7 = { region: "노원구", dong: "상계동", complexName: "상계주공7 19평", areaExclusive: 45.77, pyeong: 19, currentPrice: 59500, kbSalePrice: 63306, kbJeonse: 25000, baseJeonse: 27000, buildYear: 1988, purpose: "live", holdingYears: 5, shockLevel: "보통", m: null,
  saleDeals: [{ ym: "2026-04", price: 59500, floor: 15, topFloor: 15 }, { ym: "2026-04", price: 60000, floor: 11, topFloor: 15 }, { ym: "2026-04", price: 58000, floor: 10, topFloor: 15 }, { ym: "2026-04", price: 59000, floor: 9, topFloor: 15 }, { ym: "2026-04", price: 69700, floor: 10, topFloor: 15 }, { ym: "2026-03", price: 70800, floor: 9, topFloor: 15 }, { ym: "2026-03", price: 57500, floor: 10, topFloor: 15 }, { ym: "2026-03", price: 57000, floor: 8, topFloor: 15 }, { ym: "2026-03", price: 59800, floor: 7, topFloor: 15 }, { ym: "2026-03", price: 67000, floor: 12, topFloor: 15 }],
  deals: [{ ym: "2026-04", price: 25000, floor: 13, topFloor: 15 }, { ym: "2026-04", price: 31000, floor: 6, topFloor: 15 }, { ym: "2026-04", price: 21987, floor: 5, topFloor: 15 }, { ym: "2026-04", price: 28350, floor: 3, topFloor: 15 }, { ym: "2026-04", price: 23000, floor: 15, topFloor: 15 }, { ym: "2026-04", price: 30000, floor: 2, topFloor: 15 }, { ym: "2026-04", price: 24500, floor: 8, topFloor: 15 }, { ym: "2026-04", price: 19950, floor: 15, topFloor: 15 }, { ym: "2026-04", price: 29000, floor: 3, topFloor: 15 }, { ym: "2026-04", price: 20000, floor: 1, topFloor: 15 }, { ym: "2026-04", price: 30000, floor: 13, topFloor: 15 }] };
const LEGAL = "본 서비스는 사용자가 입력한 정보와 공개 데이터를 바탕으로 산출한 참고용 분석 도구입니다. 실제 감정평가, 투자자문, 매수·매도 권유가 아니며 최종 의사결정은 사용자 본인의 책임입니다.";
// 특수지역 전체 샘플 — 강남 재건축(은마) + 자금 정보까지 모두 채운 원클릭 데모
const PRESET_PRIME_FULL = { ...PRESET_EUNMA, complexName: "은마 (강남 재건축·전체샘플)", redevelopmentExpected: true, availableCash: 500000, emergencyCash: 50000, annualIncome: 18000, plannedLoanAmount: 200000, interestRate: 4.0, loanYears: 30, existingDebtPayment: 0 };
const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:bg-white";
const card = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100";

// ── 입력값 검증 경고 (UI 전용 · 엔진 계산 무관) ──

export {
  SAMPLE_DEALS, SAMPLE_SALE_DEALS, SAMPLE,
  EMPTY, PRESET_EUNMA, PRESET_SG7,
  PRESET_PRIME_FULL, LEGAL,
};
