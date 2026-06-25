// ValueLens — 검색 로그 서비스
// Phase 1-E: main.jsx에서 분리
// localStorage key, 저장 구조, 반환값, 예외 처리 방식 변경 금지

async function writeSearchLog(payload) {
  try {
    await fetch('/api/search_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'write', ...payload }),
    });
  } catch(e) {
    // 로그 실패는 무시
  }
}

export { writeSearchLog };
