/**
 * ValueLens — apartmentService
 *
 * Supabase 기반 단지 검색 서비스 계층.
 * 현재는 search/supabase.js 함수를 위임(wrapper)하는 구조.
 * 향후 AI Property Agent에서 이 서비스만 호출하면 됨.
 *
 * ★ 이 파일에서 계산 로직을 수정하지 않는다.
 * ★ 외부 인터페이스 변경 시 이 파일만 수정한다.
 */

// Phase 1-C: 현재 main.jsx 내 함수를 직접 참조하지 않음.
// Phase 1-D(import 연결) 시점에 아래 import를 활성화한다.
// import { searchComplexFromSupabase, getPriceSummaryFromSupabase } from '../../search/supabase.js';

/**
 * 단지명으로 DB 검색
 * @param {string} name - 검색어
 * @param {string} sigungu - 시군구 (optional)
 * @param {string} dong - 법정동 (optional)
 * @returns {Promise<{ fromSupabase: boolean, complexes: Array, aliasMatch: boolean }>}
 */
export async function searchApartment(name, sigungu = '', dong = '') {
  // Phase 1-D에서 실제 구현으로 교체
  // return searchComplexFromSupabase(name, sigungu, dong);
  throw new Error('[apartmentService] Phase 1-D 이전에는 직접 호출 불가. main.jsx의 searchComplexFromSupabase를 사용하세요.');
}

/**
 * 단지 ID로 가격 요약 조회
 * @param {string} complexId
 * @param {string} complexName
 * @param {string} sigungu
 * @param {number} areaExcl
 * @returns {Promise<Object>}
 */
export async function getPriceSummary(complexId, complexName, sigungu, areaExcl) {
  // return getPriceSummaryFromSupabase(complexId, complexName, sigungu, areaExcl);
  throw new Error('[apartmentService] Phase 1-D 이전에는 직접 호출 불가.');
}
