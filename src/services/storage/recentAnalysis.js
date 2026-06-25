// ValueLens — 최근 분석 이력 서비스
// Phase 1 Cleanup: main.jsx에서 분리

const LS_KEY = (uid) => uid ? `valuelens_recent_analysis_${uid}` : "valuelens_recent_analysis_guest";
const LS_MAX = 20;

function loadRecentAnalysis(uid) {
  try {
    const raw = localStorage.getItem(LS_KEY(uid));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentAnalysis(item, uid) {
  try {
    const prev = loadRecentAnalysis(uid);
    const deduped = prev.filter(p =>
      !(p.complexName === item.complexName && p.area === item.area && p.analysisType === item.analysisType)
    );
    const next = [item, ...deduped].slice(0, LS_MAX);
    localStorage.setItem(LS_KEY(uid), JSON.stringify(next));
  } catch {}
}

export { LS_KEY, LS_MAX, loadRecentAnalysis, saveRecentAnalysis };
