/**
 * src/search/areaMatching.js
 *
 * 공통 유틸: 사용자 입력 평형 → 단지 실제 평형 매칭
 * 적정가/매수/추천 모두 재사용 가능
 */

import { groupAreasByPyeong } from './utils.js';
import { sqmToPyeong, areaOptionsFromList } from '../utils/pyeong.js';

/**
 * 단지 area_list → [{areaSqm, pyeong}] 변환
 */
export function getAreaOptions(areaListRaw) {
  return areaOptionsFromList(areaListRaw);
}

/**
 * 사용자 입력 평형 → 단지 실제 평형 중 가장 가까운 것 선택
 *
 * @param {number} inputPyeong - 사용자가 입력한 평형 (예: 30)
 * @param {Array}  areaOptions - [{areaSqm, pyeong}] 단지 실제 평형 목록
 * @returns {{
 *   areaSqm: number,
 *   matchedPyeong: number,
 *   inputPyeong: number,
 *   isSame: boolean,
 *   helperText: string,
 *   displayAreaText: string,
 * } | null}
 */
export function selectNearestArea(inputPyeong, areaOptions) {
  if (!areaOptions || areaOptions.length === 0) return null;
  if (!inputPyeong) return null;

  // 정확히 일치하는 경우
  const exact = areaOptions.find(a => a.pyeong === inputPyeong);
  if (exact) {
    return {
      areaSqm:       exact.areaSqm,
      matchedPyeong: exact.pyeong,
      inputPyeong,
      isSame:        true,
      helperText:    '',
      displayAreaText: `${exact.pyeong}평`,
    };
  }

  // 가장 가까운 평형 선택
  // Tie rule: 동일 거리면 더 큰 평형 우선
  const nearest = areaOptions.reduce((best, cur) => {
    const bestDiff = Math.abs(best.pyeong - inputPyeong);
    const curDiff  = Math.abs(cur.pyeong  - inputPyeong);
    if (curDiff < bestDiff) return cur;
    if (curDiff === bestDiff && cur.pyeong > best.pyeong) return cur; // tie → 더 큰 것
    return best;
  });

  // 입력값이 실제 평형 범위의 어디에 위치하는지 (UX 안내 문구 분기용)
  const minPyeong = Math.min(...areaOptions.map(a => a.pyeong));
  const maxPyeong = Math.max(...areaOptions.map(a => a.pyeong));
  const boundary  = inputPyeong < minPyeong ? 'below'
                   : inputPyeong > maxPyeong ? 'above'
                   : 'between';

  return {
    areaSqm:        nearest.areaSqm,
    matchedPyeong:  nearest.pyeong,
    inputPyeong,
    isSame:         false,
    boundary,       // 'below' | 'above' | 'between' — 기존 호출자(매수/추천)는 무시해도 안전
    helperText:     ` (입력하신 ${inputPyeong}평과 가장 가까운 평형입니다.)`,
    displayAreaText: `${nearest.pyeong}평`,
  };
}

/**
 * 단지 complex 객체 + inputPyeong → nearest 매칭 결과
 * (단지 area_list 자동 파싱 포함)
 */
export function matchAreaFromComplex(complex, inputPyeong) {
  const areaOptions = getAreaOptions(complex?.area_list);
  if (areaOptions.length === 0) return null;
  return selectNearestArea(inputPyeong, areaOptions);
}
