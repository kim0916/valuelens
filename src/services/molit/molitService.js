/**
 * ValueLens — molitService
 *
 * 국토부(MOLIT) API 및 법정동 코드 서비스 계층.
 * search/molit.js, search/location.js 함수를 위임한다.
 *
 * ★ API 로직 수정 금지.
 * ★ Supabase-first 구조에서 이 서비스는 fallback으로만 사용된다.
 */

// Phase 1-D에서 import 활성화
// import { fetchMolitData } from '../../search/molit.js';
// import { getLawdCd, fetchWithTimeout } from '../../search/location.js';

/**
 * 국토부 실거래 데이터 조회
 * @param {string} lawdCd - 법정동 코드
 * @param {string} complexName - 단지명
 * @param {number} areaExclusive - 전용면적
 * @param {number} months - 조회 기간 (기본 24개월)
 * @param {string} exactAptNm - 정확한 단지명 (optional)
 * @param {string} dong - 법정동 (optional)
 * @param {Array} exclusiveAreas - 면적 목록 (optional)
 * @returns {Promise<Object>}
 */
export async function getMolitData(lawdCd, complexName, areaExclusive, months = 24, exactAptNm = '', dong = '', exclusiveAreas = null) {
  // return fetchMolitData(lawdCd, complexName, areaExclusive, months, exactAptNm, dong, exclusiveAreas);
  throw new Error('[molitService] Phase 1-D 이전에는 직접 호출 불가. main.jsx의 fetchMolitData를 사용하세요.');
}

/**
 * 법정동 코드 조회
 * @param {string} dong
 * @param {string} region
 * @returns {string|null}
 */
export function getLawdCode(dong, region) {
  // return getLawdCd(dong, region);
  throw new Error('[molitService] Phase 1-D 이전에는 직접 호출 불가.');
}

/**
 * 시/도 → 구/군 목록 조회 (/api/lawdCd)
 * @param {string} sido
 * @returns {Promise<string[]>}
 */
export async function getSigunguList(sido) {
  const res = await fetch('/api/lawdCd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'sigungu', sido }),
  });
  const d = await res.json();
  return d.list || [];
}

/**
 * 구/군 → 법정동 목록 조회
 * @param {string} sido
 * @param {string} sigungu
 * @returns {Promise<string[]>}
 */
export async function getDongList(sido, sigungu) {
  const res = await fetch('/api/lawdCd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'dong', sido, sigungu }),
  });
  const d = await res.json();
  return d.list || [];
}
