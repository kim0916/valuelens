/**
 * src/constants/areaMapping.js
 * 한국 아파트 평형 ↔ 전용면적 매핑
 *
 * 한국 아파트 관행:
 *   - 사용자가 말하는 "평"은 공급면적 기준
 *   - 실제 전용면적은 공급면적의 약 70~75%
 *   - 25평 → 전용 59㎡ (84㎡ 아님)
 *   - 33~34평 → 전용 84㎡
 *
 * 절대 금지:
 *   - 25평 → 84㎡ 자동 매칭
 *   - 사용자 허락 없이 다른 면적 결과 표시
 */

// ── 평형대 → 대표 전용면적 매핑 ──
const PYEONG_TO_SQM_MAP = [
  { min: 10, max: 16, sqm: 33 },   // 10~16평 → 33㎡ (투룸 소형)
  { min: 17, max: 19, sqm: 44 },   // 17~19평 → 44㎡
  { min: 20, max: 22, sqm: 49 },   // 20~22평 → 49㎡
  { min: 23, max: 26, sqm: 59 },   // 23~26평 → 59㎡  ← 25평 여기
  { min: 27, max: 29, sqm: 74 },   // 27~29평 → 74㎡
  { min: 30, max: 35, sqm: 84 },   // 30~35평 → 84㎡  ← 32~34평 여기
  { min: 36, max: 39, sqm: 101 },  // 36~39평 → 101㎡
  { min: 40, max: 45, sqm: 114 },  // 40~45평 → 114㎡
  { min: 46, max: 50, sqm: 134 },  // 46~50평 → 134㎡
];

// ── 대표 전용면적 → 표시 평형 매핑 ──
const SQM_TO_PYEONG_MAP = [
  { sqm: 33,  pyeong: 10, label: '10평대' },
  { sqm: 44,  pyeong: 18, label: '18평형' },
  { sqm: 49,  pyeong: 20, label: '20평형' },
  { sqm: 59,  pyeong: 25, label: '25평형' },
  { sqm: 74,  pyeong: 29, label: '29평형' },
  { sqm: 84,  pyeong: 33, label: '33평형' },
  { sqm: 101, pyeong: 38, label: '38평형' },
  { sqm: 114, pyeong: 43, label: '43평형' },
  { sqm: 134, pyeong: 48, label: '48평형' },
];

/**
 * 평형 → 전용면적㎡ 변환
 * 25평 → 59, 34평 → 84
 * @param {number} pyeong
 * @returns {number} 전용면적㎡
 */
export function pyeongToExclusiveSqm(pyeong) {
  const entry = PYEONG_TO_SQM_MAP.find(e => pyeong >= e.min && pyeong <= e.max);
  if (entry) return entry.sqm;
  // 46평 이상: closest fallback
  if (pyeong > 50) return Math.round(pyeong * 2.2); // 대략적 환산
  return null;
}

/**
 * 전용면적㎡ → 표시 평형 변환
 * 84 → 33, 59 → 25
 * @param {number} sqm
 * @returns {{ pyeong: number, label: string }}
 */
export function sqmToPyeong(sqm) {
  if (!sqm || sqm <= 0) return { pyeong: 0, label: '' };
  // 가장 가까운 대표 면적 찾기
  const closest = SQM_TO_PYEONG_MAP.reduce((a, b) =>
    Math.abs(a.sqm - sqm) <= Math.abs(b.sqm - sqm) ? a : b
  );
  return { pyeong: closest.pyeong, label: closest.label };
}

/**
 * 평형 레이블 생성
 * (25, 59) → "25평 (전용 59㎡)"
 * (null, 84) → "전용 84㎡"
 * @param {number|null} pyeong - 사용자 입력 평형 (null이면 ㎡만 표시)
 * @param {number} sqm - 전용면적
 * @returns {string}
 */
export function pyeongLabel(pyeong, sqm) {
  if (pyeong && sqm) return `${pyeong}평 (전용 ${sqm}㎡)`;
  if (pyeong) return `${pyeong}평`;
  if (sqm) {
    const { pyeong: p } = sqmToPyeong(sqm);
    return `${p}평 (전용 ${sqm}㎡)`;
  }
  return '';
}

/**
 * 사용자 입력 텍스트 → 면적 파싱
 * 핵심 규칙:
 *   10~50 숫자 → 평형으로 해석 → pyeongToExclusiveSqm으로 전용면적 변환
 *   51~200 숫자 → 전용면적㎡로 해석
 *   "25평" → 25평 → 59㎡
 *   "84㎡" → 84㎡ → 33평
 *   "84" → 84㎡ (51 이상)
 *   "25" → 25평 → 59㎡ (50 이하)
 *
 * @param {string} text
 * @returns {{ inputPyeong: number, areaSqm: number, isExact: boolean } | null}
 *   inputPyeong: 사용자가 말한 평형 (표시용)
 *   areaSqm: 내부 전용면적 (DB 검색용)
 *   isExact: ㎡ 직접 입력 여부
 */
export function parseAreaInput(text) {
  if (!text) return null;
  const t = text.trim();

  // 1. "25평", "25평형", "30평대" → 평형
  const pyeongM = t.match(/^(\d+)\s*평형?$/) || t.match(/^(\d+)\s*평대$/);
  if (pyeongM) {
    const p = parseInt(pyeongM[1]);
    const sqm = pyeongToExclusiveSqm(p);
    return { inputPyeong: p, areaSqm: sqm || Math.round(p * 3.3), isExact: false };
  }

  // 2. "84㎡", "84m2", "전용84", "전용 84" → 전용면적
  const sqmM = t.match(/전용\s*(\d+(?:\.\d+)?)/) ||
               t.match(/^(\d+(?:\.\d+)?)\s*(?:㎡|m2)/i);
  if (sqmM) {
    const sqm = parseFloat(sqmM[1]);
    const { pyeong } = sqmToPyeong(sqm);
    return { inputPyeong: pyeong, areaSqm: sqm, isExact: true };
  }

  // 3. 국민평형 / 국평
  if (/국민평형|국평/.test(t)) {
    return { inputPyeong: 25, areaSqm: 59, isExact: false };
  }

  // 4. 숫자만: 10~50 → 평형, 51~200 → ㎡
  const numOnly = t.match(/^(\d+)$/);
  if (numOnly) {
    const n = parseInt(numOnly[1]);
    if (n >= 10 && n <= 50) {
      // 평형으로 해석
      const sqm = pyeongToExclusiveSqm(n);
      return { inputPyeong: n, areaSqm: sqm || Math.round(n * 3.3), isExact: false };
    }
    if (n >= 51 && n <= 200) {
      // ㎡로 해석
      const { pyeong } = sqmToPyeong(n);
      return { inputPyeong: pyeong, areaSqm: n, isExact: true };
    }
  }

  return null;
}

/**
 * DB 거래 데이터에서 사용자 요청 면적에 맞는 거래 필터링
 * 1차: ±3㎡ 정확 매칭
 * 2차: ±7㎡ 확장 (같은 타입 내)
 * 3차: null 반환 → 호출부에서 "해당 면적 거래 없음" 처리
 *
 * 절대 금지: 25평(59㎡) 요청인데 84㎡ 결과 자동 반환
 *
 * @param {Array} deals - 거래 배열 (area_excl 필드 있음)
 * @param {number} targetSqm - 목표 전용면적
 * @returns {{ matched: Array, fallbackSqm: number|null }}
 */
export function filterDealsByArea(deals, targetSqm) {
  if (!targetSqm || !deals?.length) return { matched: [], fallbackSqm: null };

  // 1차: ±3㎡
  const exact = deals.filter(d => Math.abs(Number(d.area_excl) - targetSqm) <= 3);
  if (exact.length >= 3) return { matched: exact, fallbackSqm: null };

  // 2차: ±7㎡ (같은 타입 내 — 59㎡를 찾는데 63㎡도 같은 계열)
  const wide = deals.filter(d => Math.abs(Number(d.area_excl) - targetSqm) <= 7);
  if (wide.length >= 3) return { matched: wide, fallbackSqm: null };

  // 3차: 없음 — 다른 타입으로 자동 전환 금지
  // 대신 DB에 있는 가장 가까운 면적을 fallbackSqm으로 반환
  const areas = [...new Set(deals.map(d => Number(d.area_excl)).filter(Boolean))];
  if (!areas.length) return { matched: [], fallbackSqm: null };
  const closest = areas.reduce((a, b) =>
    Math.abs(a - targetSqm) <= Math.abs(b - targetSqm) ? a : b
  );
  // fallback이 너무 멀면 (±20㎡ 이상) null 반환
  if (Math.abs(closest - targetSqm) > 20) return { matched: [], fallbackSqm: null };
  return { matched: [], fallbackSqm: closest };
}
