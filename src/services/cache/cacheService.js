/**
 * ValueLens — cacheService
 *
 * 캐시 서비스 계층.
 * 시장 데이터(환율, 금리, 지수 등) 캐싱 및 AI 호출 비용 절감 목적.
 *
 * 전략:
 * - 시장 데이터: TTL 10분 (메모리 캐시)
 * - 단지 검색 결과: TTL 5분 (메모리 캐시)
 * - 실거래 데이터: TTL 1시간 (메모리 캐시)
 *
 * Phase 2에서 Upstash Redis 연결 예정.
 */

const _cache = new Map(); // { key → { data, expiresAt } }

/**
 * 캐시에서 값 조회
 * @param {string} key
 * @returns {any|null}
 */
export function get(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * 캐시에 값 저장
 * @param {string} key
 * @param {any} data
 * @param {number} ttlMs - TTL (밀리초)
 */
export function set(key, data, ttlMs = 5 * 60 * 1000) {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * 캐시 삭제
 * @param {string} key
 */
export function del(key) {
  _cache.delete(key);
}

/**
 * 전체 캐시 초기화
 */
export function clear() {
  _cache.clear();
}

/**
 * 캐시 또는 fetch — 캐시에 없으면 fetchFn 실행 후 저장
 * @param {string} key
 * @param {Function} fetchFn
 * @param {number} ttlMs
 * @returns {Promise<any>}
 */
export async function getOrFetch(key, fetchFn, ttlMs = 5 * 60 * 1000) {
  const cached = get(key);
  if (cached !== null) return cached;
  const data = await fetchFn();
  set(key, data, ttlMs);
  return data;
}

// TTL 상수 (편의용)
export const TTL = {
  MARKET:    10 * 60 * 1000, // 10분 — 시장 데이터
  SEARCH:     5 * 60 * 1000, // 5분  — 단지 검색
  DEALS:     60 * 60 * 1000, // 1시간 — 실거래
  STATIC: 24 * 60 * 60 * 1000, // 24시간 — 정적 데이터
};
