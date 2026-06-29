import { sqmToPyeong } from '../utils/pyeong.js';
/**
 * ValueLens Conversation Engine — conversationState.js
 *
 * 대화 상태(Context)를 관리한다.
 * 공인중개사와 고객의 상담 맥락을 유지하는 것이 목표.
 *
 * ★ 이 파일은 상태 관리만 담당한다. 계산 로직 없음.
 */

// ─────────────────────────────────────────────
// 슬롯(Slot) 정의
// 공인중개사가 "물어봐야 할 것"들
// ─────────────────────────────────────────────
export const SLOTS = {
  REGION:     "region",      // 지역 (구/동/신도시)
  COMPLEX:    "complex",     // 단지명
  AREA:       "area",        // 평형 (전용㎡)
  PURPOSE:    "purpose",     // 목적 (매수/매도/전세/분석)
};

// ─────────────────────────────────────────────
// 초기 상태 생성
// ─────────────────────────────────────────────
export function createConversationState() {
  return {
    // ── 핵심 슬롯 ──
    region:            null,   // 현재 지역 (예: "강남구", "송도")
    currentComplex:    null,   // 확정된 단지 객체 { complex_name, sigungu, area_list, ... }
    currentArea:       null,   // 확정된 전용면적(㎡) 숫자
    purpose:           null,   // "buy" | "sell" | "jeonse" | "fair"

    // ── 후보 관리 ──
    candidates:        [],     // 검색된 후보 단지 배열
    selectedCandidate: null,   // 사용자가 선택한 단지

    // ── 대화 흐름 ──
    lastIntent:        null,   // 직전 Intent
    lastQuestion:      null,   // AI가 마지막으로 물어본 것 ("area?" | "candidate?" | null)
    pendingSlot:       null,   // 다음에 채워야 할 슬롯 ("area" | "candidate" | null)

    // ── 히스토리 ──
    history:           [],     // [{ role: "user"|"ai", text, intent, ts }]

    // ── 검색 파라미터 캐시 ──
    lastSearchQuery:   null,   // 마지막으로 검색한 쿼리 문자열
    lastAreaHint:      null,   // 자연어에서 추출된 면적 힌트
  };
}

// ─────────────────────────────────────────────
// 상태 업데이트 헬퍼
// ─────────────────────────────────────────────

/**
 * 지역 변경
 * 지역이 바뀌면 단지/면적 초기화
 */
export function updateRegion(state, region) {
  return {
    ...state,
    region,
    currentComplex:    null,
    currentArea:       null,
    candidates:        [],
    selectedCandidate: null,
    pendingSlot:       "complex",
    lastQuestion:      "complex?",
  };
}

/**
 * 단지 후보 업데이트
 * 1건이면 자동 확정, 복수면 선택 대기
 */
export function updateCandidates(state, candidates, areaHint = null) {
  if (!candidates || candidates.length === 0) {
    return {
      ...state,
      candidates:        [],
      currentComplex:    null,
      selectedCandidate: null,
      pendingSlot:       "complex",
      lastQuestion:      "complex?",
      lastAreaHint:      areaHint,
    };
  }

  if (candidates.length === 1) {
    // 단 1건 → 자동 확정
    return updateComplex(state, candidates[0], areaHint);
  }

  // 복수 → 선택 대기
  return {
    ...state,
    candidates,
    currentComplex:    null,
    selectedCandidate: null,
    pendingSlot:       "candidate",
    lastQuestion:      "candidate?",
    lastAreaHint:      areaHint,
  };
}

/**
 * 단지 확정
 * 단지가 확정되면 면적 슬롯으로 이동
 */
export function updateComplex(state, complex, areaHint = null) {
  const areaList = complex.area_list
    ? (typeof complex.area_list === "string"
        ? JSON.parse(complex.area_list)
        : complex.area_list)
    : [];

  // 면적 힌트로 자동 선택 시도 (±8㎡)
  let autoArea = null;
  if (areaHint && areaList.length > 0) {
    const closest = areaList
      .map(a => Number(a))
      .filter(a => a > 0)
      .reduce((prev, cur) =>
        Math.abs(cur - areaHint) < Math.abs(prev - areaHint) ? cur : prev
      );
    if (Math.abs(closest - areaHint) <= 8) autoArea = closest;
  }

  return {
    ...state,
    currentComplex:    { ...complex, _areaList: areaList },
    selectedCandidate: complex,
    candidates:        [],
    region:            state.region || extractSigunguShort(complex.sigungu),
    currentArea:       autoArea,
    pendingSlot:       autoArea ? null : "area",
    lastQuestion:      autoArea ? null : "area?",
    lastAreaHint:      areaHint,
  };
}

/**
 * 면적 확정
 */
export function updateArea(state, areaSqm) {
  return {
    ...state,
    currentArea:  Number(areaSqm),
    pendingSlot:  null,
    lastQuestion: null,
  };
}

/**
 * 목적 변경
 */
export function updatePurpose(state, purpose) {
  return { ...state, purpose };
}

/**
 * 컨텍스트 초기화 (다시)
 */
export function resetContext(state) {
  return {
    ...createConversationState(),
    history: state.history, // 히스토리는 유지
  };
}

/**
 * 히스토리 추가
 */
export function addHistory(state, role, text, intent = null) {
  const entry = { role, text, intent, ts: Date.now() };
  return {
    ...state,
    history: [...state.history.slice(-30), entry], // 최근 30개
    lastIntent: intent || state.lastIntent,
  };
}

// ─────────────────────────────────────────────
// 상태 쿼리 헬퍼
// ─────────────────────────────────────────────

/** 분석 준비 완료 여부 */
export function isReadyToAnalyze(state) {
  return !!(state.currentComplex && state.currentArea);
}

/** 현재 단지에서 사용 가능한 면적 그룹 목록 */
export function getAreaGroups(state) {
  const areaList = state.currentComplex?._areaList || [];
  if (!areaList.length) return [];

  const sorted = [...new Set(areaList.map(a => Math.round(Number(a) * 100) / 100).filter(a => a > 0))].sort((a, b) => a - b);
  const groups = [];
  for (const a of sorted) {
    const last = groups[groups.length - 1];
    if (last && a - last.anchor <= 4) {
      last.areas.push(a);
    } else {
      groups.push({ anchor: a, areas: [a], pyeong: sqmToPyeong(a).pyeong });
    }
  }
  return groups;
}

/** 현재 상태 요약 (디버그/로그용) */
export function summarizeState(state) {
  return {
    region:    state.region,
    complex:   state.currentComplex?.complex_name || null,
    area:      state.currentArea,
    purpose:   state.purpose,
    pending:   state.pendingSlot,
    candidates:state.candidates.length,
    lastIntent:state.lastIntent,
  };
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────
function extractSigunguShort(sigungu) {
  if (!sigungu) return null;
  // "서울특별시 강남구 대치동" → "강남구"
  const parts = sigungu.split(" ");
  return parts[1] || parts[0] || null;
}
