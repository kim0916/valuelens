/**
 * src/utils/pyeong.js
 *
 * 평형 변환 단일 표준 유틸.
 * 프로젝트 전체에서 이 파일만 사용한다.
 * Math.round(sqm / 3.3) 직접 계산 금지.
 *
 * 함수 목록:
 *   sqmToPyeong(sqm)          → number  (전용㎡ → 표시 평형)
 *   pyeongToSqm(pyeong)       → number  (평형 → 전용㎡)
 *   nearestPyeong(input, opts) → object  (입력 평형 → 실제 단지 최근접 평형)
 *   exclusivePyeong(sqm)      → string  (소수점 표시용)
 */

// ─────────────────────────────────────────────
// 내부 매핑 테이블 (areaMapping.js 기준 동기화)
// sqm 범위 → 표시 평형 (업계 표준)
// ─────────────────────────────────────────────
const SQM_TO_PYEONG_MAP = [
  { min:  0, max: 36,  pyeong: 10 },
  { min: 36, max: 42,  pyeong: 13 },
  { min: 42, max: 47,  pyeong: 14 },
  { min: 47, max: 52,  pyeong: 17 },
  { min: 52, max: 57,  pyeong: 18 },
  { min: 57, max: 63,  pyeong: 25 },  // 59㎡ 계열 (25평형)
  { min: 63, max: 72,  pyeong: 24 },
  { min: 72, max: 79,  pyeong: 29 },
  { min: 79, max: 88,  pyeong: 33 },  // 84㎡ 계열 (33평형)
  { min: 88, max: 96,  pyeong: 34 },
  { min: 96, max: 108, pyeong: 38 },
  { min: 108,max: 120, pyeong: 43 },  // 114㎡ 계열 (43평형)
  { min: 120,max: 135, pyeong: 45 },
  { min: 135,max: 165, pyeong: 51 },
];

const PYEONG_TO_SQM_MAP = [
  { min: 10, max: 16, sqm: 33  },
  { min: 17, max: 19, sqm: 44  },
  { min: 20, max: 22, sqm: 49  },
  { min: 23, max: 26, sqm: 59  },
  { min: 27, max: 29, sqm: 74  },
  { min: 30, max: 35, sqm: 84  },
  { min: 36, max: 39, sqm: 101 },
  { min: 40, max: 45, sqm: 114 },
  { min: 46, max: 55, sqm: 134 },
];

// ─────────────────────────────────────────────
// 1. sqmToPyeong — 전용㎡ → 표시 평형
// ─────────────────────────────────────────────
/**
 * @param {number} sqm - 전용면적(㎡)
 * @returns {{ pyeong: number, label: string }}
 */
export function sqmToPyeong(sqm) {
  sqm = Number(sqm) || 0;
  if (sqm <= 0) return { pyeong: 0, label: '0평형' };

  const entry = SQM_TO_PYEONG_MAP.find(e => sqm >= e.min && sqm < e.max);
  const pyeong = entry ? entry.pyeong : Math.round(sqm / 3.3058);
  return { pyeong, label: `${pyeong}평형` };
}

// ─────────────────────────────────────────────
// 2. pyeongToSqm — 평형 → 전용㎡ (대표값)
// ─────────────────────────────────────────────
/**
 * @param {number} pyeong
 * @returns {number} sqm
 */
export function pyeongToSqm(pyeong) {
  pyeong = Number(pyeong) || 0;
  if (pyeong <= 0) return 0;

  const entry = PYEONG_TO_SQM_MAP.find(e => pyeong >= e.min && pyeong <= e.max);
  return entry ? entry.sqm : Math.round(pyeong * 3.3058);
}

// ─────────────────────────────────────────────
// 3. nearestPyeong — 입력 평형 → 단지 실제 평형 최근접
// ─────────────────────────────────────────────
/**
 * @param {number} inputPyeong - 사용자 입력 평형
 * @param {Array<{areaSqm: number, pyeong: number}>} areaOptions - 단지 실제 평형 목록
 * @returns {{
 *   areaSqm: number,
 *   matchedPyeong: number,
 *   inputPyeong: number,
 *   isSame: boolean,
 *   helperText: string,
 *   displayText: string,
 * } | null}
 */
export function nearestPyeong(inputPyeong, areaOptions) {
  if (!areaOptions || areaOptions.length === 0) return null;
  if (!inputPyeong) return null;

  // 정확 일치
  const exact = areaOptions.find(a => a.pyeong === inputPyeong);
  if (exact) {
    return {
      areaSqm:       exact.areaSqm,
      matchedPyeong: exact.pyeong,
      inputPyeong,
      isSame:        true,
      helperText:    '',
      displayText:   `${exact.pyeong}평`,
    };
  }

  // 최근접 (동일 거리면 더 큰 평형 우선)
  const nearest = areaOptions.reduce((best, cur) => {
    const bd = Math.abs(best.pyeong - inputPyeong);
    const cd = Math.abs(cur.pyeong  - inputPyeong);
    if (cd < bd) return cur;
    if (cd === bd && cur.pyeong > best.pyeong) return cur;
    return best;
  });

  return {
    areaSqm:       nearest.areaSqm,
    matchedPyeong: nearest.pyeong,
    inputPyeong,
    isSame:        false,
    helperText:    `입력하신 ${inputPyeong}평과 가장 가까운 평형입니다.`,
    displayText:   `${nearest.pyeong}평`,
  };
}

// ─────────────────────────────────────────────
// 4. exclusivePyeong — 소수점 표시용 (UI 전용)
// ─────────────────────────────────────────────
/**
 * @param {number} sqm
 * @returns {string} 예: "25.4평"
 */
export function exclusivePyeong(sqm) {
  sqm = Number(sqm) || 0;
  if (sqm <= 0) return '0평';
  return `${(sqm / 3.3058).toFixed(1)}평`;
}

// ─────────────────────────────────────────────
// 5. areaOptionsFromList — area_list → 평형 옵션 배열
// ─────────────────────────────────────────────
/**
 * @param {number[]|string} areaList - DB area_list
 * @returns {Array<{areaSqm: number, pyeong: number}>}
 */
export function areaOptionsFromList(areaList) {
  if (!areaList) return [];
  const raw = typeof areaList === 'string' ? JSON.parse(areaList) : areaList;
  return raw
    .filter(sqm => Number(sqm) > 0)
    .map(sqm => ({ areaSqm: Number(sqm), pyeong: sqmToPyeong(Number(sqm)).pyeong }))
    .sort((a, b) => a.areaSqm - b.areaSqm);
}
