/**
 * ValueLens — storageService
 *
 * localStorage 기반 분석 히스토리 및 저장 항목 관리.
 * main.jsx의 loadRecentAnalysis, saveRecentAnalysis 등을 위임.
 *
 * ★ 데이터 구조 변경 금지.
 */

// Phase 1-D에서 import 활성화
// import { loadRecentAnalysis, saveRecentAnalysis, saveAnalysis, getSavedAnalyses, deleteSavedAnalysis } from '../../utils/storage.js';

const LS_KEY = (uid) => uid ? `valuelens_recent_analysis_${uid}` : 'valuelens_recent_analysis_guest';
const LS_MAX = 20;

/**
 * 최근 분석 목록 로드
 * @param {string|null} uid
 * @returns {Array}
 */
export function loadRecent(uid) {
  try {
    const raw = localStorage.getItem(LS_KEY(uid));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * 최근 분석 저장
 * @param {Object} item
 * @param {string|null} uid
 */
export function saveRecent(item, uid) {
  try {
    const existing = loadRecent(uid);
    const deduped = existing.filter(x =>
      !(x.complexName === item.complexName && x.area === item.area && x.analysisType === item.analysisType)
    );
    const updated = [item, ...deduped].slice(0, LS_MAX);
    localStorage.setItem(LS_KEY(uid), JSON.stringify(updated));
  } catch { /* silent fail */ }
}

/**
 * 저장된 분석 목록 조회
 * @param {string|null} uid
 * @returns {Array}
 */
export function getSaved(uid) {
  try {
    const SI_KEY = uid ? `valuelens_saved_items_${uid}` : 'valuelens_saved_items_guest';
    const raw = localStorage.getItem(SI_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
