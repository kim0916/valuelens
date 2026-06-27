/**
 * ValueLens Conversation Engine — candidateSelector.js
 *
 * 검색 결과를 분석하여 자동 선택 / 후보 제시 / 오매칭 방지를 담당한다.
 *
 * 핵심 원칙:
 *   애매하면 절대 자동 선택하지 않는다.
 *   확실한 경우만 자동 선택한다.
 *
 * ★ 이 파일은 선택 로직만 담당한다. 계산 로직 없음.
 */

import { updateCandidates, updateComplex, getAreaGroups } from './conversationState.js';

// ─────────────────────────────────────────────
// 자동 선택 가능 여부 판단 기준
// ─────────────────────────────────────────────

/**
 * 검색 결과에서 후보 선택 전략 결정
 *
 * @returns {
 *   strategy: "auto" | "ask_candidate" | "ask_area" | "not_found" | "ready",
 *   selected: 단지 객체 | null,
 *   candidates: 단지 배열,
 *   areaGroups: 면적 그룹 배열,
 *   reason: string,
 * }
 */
export function evaluateCandidates(complexes, areaHint = null, state = {}) {
  // ── 0건: 검색 실패 ──
  if (!complexes || complexes.length === 0) {
    return {
      strategy:   "not_found",
      selected:   null,
      candidates: [],
      areaGroups: [],
      reason:     "not_found",
    };
  }

  // ── 복수 후보: 자동 선택 금지 ──
  if (complexes.length > 1) {
    // 단, 압도적으로 높은 거래량이 있으면 자동 선택 허용
    const sorted = [...complexes].sort((a, b) => (b.sale_cnt || 0) - (a.sale_cnt || 0));
    const top = sorted[0];
    const second = sorted[1];

    // 압도적 1위 판별
    // 1. sale_cnt 기준 3배 이상
    // 2. 같은 단지 prefix (마포래미안푸르지오1~4단지 등 분리단지) — 최다 거래 자동 선택
    const topName = (top.complex_name || "").replace(/\d+단지|\d+차$/, "").trim();
    const secondName = (second.complex_name || "").replace(/\d+단지|\d+차$/, "").trim();
    const isSameBase = topName === secondName && topName.length >= 4;

    const isOverwhelming =
      isSameBase ||  // 같은 단지 분리세대 → 최다 거래 자동 선택
      ((top.sale_cnt || 0) > 50 && (top.sale_cnt || 0) > (second.sale_cnt || 0) * 3);

    if (!isOverwhelming) {
      return {
        strategy:   "ask_candidate",
        selected:   null,
        candidates: sorted,           // 전체 목록 (UI에서 5개씩 표시)
        areaGroups: [],
        reason:     "multiple_candidates",
      };
    }

    // 압도적 top → 자동 선택
    return resolveWithComplex(top, areaHint, "auto_top");
  }

  // ── 1건: 자동 확정 ──
  return resolveWithComplex(complexes[0], areaHint, "auto_single");
}

/**
 * 특정 단지로 확정 후 면적 전략 결정
 */
function resolveWithComplex(complex, areaHint, reason) {
  const areaList = parseAreaList(complex.area_list);
  const areaGroups = groupByPyeong(areaList);

  // 면적이 없는 단지 (데이터 문제)
  if (areaGroups.length === 0) {
    return {
      strategy:   "ask_candidate",
      selected:   complex,
      candidates: [complex],
      areaGroups: [],
      reason:     "no_area_data",
    };
  }

  // 면적 힌트로 자동 선택 시도
  if (areaHint) {
    const best = findBestAreaGroup(areaGroups, areaHint);
    if (best && best.diff <= 8) {
      return {
        strategy:   "ready",
        selected:   complex,
        candidates: [complex],
        areaGroups,
        selectedArea: best.group.anchor,
        reason:     reason + "_area_auto",
      };
    }
  }

  // 면적 1개만 있으면 자동 확정
  if (areaGroups.length === 1) {
    return {
      strategy:   "ready",
      selected:   complex,
      candidates: [complex],
      areaGroups,
      selectedArea: areaGroups[0].anchor,
      reason:     reason + "_single_area",
    };
  }

  // 면적 복수 → 선택 요청
  return {
    strategy:   "ask_area",
    selected:   complex,
    candidates: [complex],
    areaGroups,
    reason:     reason + "_ask_area",
  };
}

// ─────────────────────────────────────────────
// 번호로 후보 선택
// ─────────────────────────────────────────────
export function selectByIndex(state, index) {
  const candidates = state.candidates;
  if (!candidates || candidates.length === 0) {
    return { ok: false, reason: "no_candidates" };
  }
  if (index < 0 || index >= candidates.length) {
    return { ok: false, reason: "out_of_range", max: candidates.length };
  }
  return { ok: true, complex: candidates[index] };
}

// ─────────────────────────────────────────────
// 면적 그룹에서 입력과 가장 가까운 그룹 찾기
// ─────────────────────────────────────────────
export function findBestAreaGroup(areaGroups, targetSqm) {
  if (!areaGroups || !areaGroups.length || !targetSqm) return null;
  let best = null, bestDiff = Infinity;
  for (const g of areaGroups) {
    const diff = Math.abs(g.anchor - targetSqm);
    if (diff < bestDiff) { best = g; bestDiff = diff; }
  }
  return best ? { group: best, diff: bestDiff } : null;
}

// ─────────────────────────────────────────────
// 면적 그룹 표시용 레이블
// ─────────────────────────────────────────────
export function areaGroupLabel(group) {
  const pyeong = Math.round(group.anchor / 3.305785);
  const sqm = group.anchor.toFixed(1);
  // 여러 면적이 하나로 묶인 경우
  if (group.areas.length > 1) {
    const range = `${group.areas[0].toFixed(1)}~${group.areas[group.areas.length - 1].toFixed(1)}`;
    return `${pyeong}평 (${range}㎡)`;
  }
  return `${pyeong}평 (${sqm}㎡)`;
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────
function parseAreaList(areaList) {
  if (!areaList) return [];
  try {
    const arr = typeof areaList === "string" ? JSON.parse(areaList) : areaList;
    return arr.map(Number).filter(a => a > 0);
  } catch {
    return [];
  }
}

function groupByPyeong(areaList, tol = 4) {
  if (!areaList.length) return [];
  const sorted = [...new Set(areaList.map(a => Math.round(a * 100) / 100))].sort((a, b) => a - b);
  const groups = [];
  for (const a of sorted) {
    const last = groups[groups.length - 1];
    if (last && a - last.anchor <= tol) {
      last.areas.push(a);
    } else {
      groups.push({ anchor: a, areas: [a], pyeong: Math.round(a / 3.305785) });
    }
  }
  return groups;
}
