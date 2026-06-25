/**
 * ValueLens — summaryService
 *
 * Supabase 실거래 요약 및 deals 조회 서비스 계층.
 * /api/supabase 엔드포인트 호출을 추상화한다.
 *
 * ★ 계산 로직 수정 금지.
 */

/**
 * 단지 실거래 데이터 조회
 * @param {string} complexId
 * @param {string} complexName
 * @param {string} sigungu
 * @returns {Promise<{ saleDeals: Array, rentDeals: Array }>}
 */
export async function fetchDeals(complexId, complexName, sigungu) {
  const res = await fetch('/api/supabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'deals', complex_id: complexId, complex_name: complexName, sigungu }),
  });
  if (!res.ok) throw new Error(`[summaryService] deals 조회 실패: ${res.status}`);
  return res.json();
}

/**
 * maintenance_mode 조회
 * @returns {Promise<{ value: string }>}
 */
export async function fetchMaintenanceMode() {
  const res = await fetch('/api/supabase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'maintenance' }),
  });
  if (!res.ok) return { value: 'false' };
  return res.json();
}
