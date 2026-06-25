// ValueLens — 분석 저장 서비스
// Phase 1-E: main.jsx에서 분리
// 함수명, 저장 key, localStorage 구조, 반환값 변경 금지

const SI_KEY = (uid) => uid ? `valuelens_saved_items_${uid}` : "valuelens_saved_items_guest";
const SI_MAX = 50; // TODO: 유료 등급별 제한 시 { free:3, basic:20, pro:50 }[userTier] 로 교체

function _loadSavedStore(uid) {
  try {
    const raw = localStorage.getItem(SI_KEY(uid));
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      analyses:   parsed.analyses   || [],
      favorites:  parsed.favorites  || [],
      candidates: parsed.candidates || [],
      assets:     parsed.assets     || [],
    };
  } catch { return { analyses: [], favorites: [], candidates: [], assets: [] }; }
}

function _writeSavedStore(store, uid) {
  try { localStorage.setItem(SI_KEY(uid), JSON.stringify(store)); } catch {}
}

/** 분석 결과 저장 */
function saveAnalysis(item, uid) {
  const effectiveUid = uid || item._uid || null;
  const store = _loadSavedStore(effectiveUid);
  // 같은 id 중복 방지
  const { _uid: _, ...cleanItem } = item; // _uid 제거 후 저장
  const deduped = store.analyses.filter(a => a.id !== cleanItem.id);
  store.analyses = [cleanItem, ...deduped].slice(0, SI_MAX);
  _writeSavedStore(store, effectiveUid);
}

/** 저장된 분석 목록 (최신순) */
function getSavedAnalyses(uid) {
  return _loadSavedStore(uid).analyses;
}

/** 분석 삭제 */
function deleteSavedAnalysis(id, uid) {
  const store = _loadSavedStore(uid);
  store.analyses = store.analyses.filter(a => a.id !== id);
  _writeSavedStore(store, uid);
}

export { SI_KEY, SI_MAX, saveAnalysis, getSavedAnalyses, deleteSavedAnalysis };
