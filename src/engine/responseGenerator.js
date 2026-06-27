/**
 * ValueLens Conversation Engine — responseGenerator.js v2
 *
 * UX Policy 8개 규칙 준수 응답 생성기.
 *
 * 원칙:
 *   ① 이미 아는 정보 다시 묻지 않음
 *   ② 한 번에 하나만 질문
 *   ③ DB 실제 정보 사용
 *   ④ 실패 시 이유 설명
 *   ⑤ 복수 후보 자동선택 금지
 *   ⑥ 사람 언어 이해
 *   ⑦ 짧고 명확
 *   ⑧ 같은 질문 반복 금지
 *
 * ★ 계산 로직 없음.
 */

import { sqmToPyeong } from './intentClassifier.js';
import { areaGroupLabel, findBestAreaGroup } from './candidateSelector.js';

export const RESPONSE_TYPES = {
  CANDIDATES_LIST:   "candidates_list",
  AREA_LIST:         "area_list",
  AREA_CONFIRMED:    "area_confirmed",
  READY_TO_ANALYZE:  "ready_to_analyze",
  NOT_FOUND:         "not_found",
  AREA_NOT_FOUND:    "area_not_found",
  REGION_CHANGED:    "region_changed",
  CONTEXT_RESET:     "context_reset",
  NEED_MORE_INFO:    "need_more_info",
  JEONSE_RESULT:     "jeonse_result",
  ASK_PRICE:         "ask_price",
  ERROR:             "error",
};

// ─────────────────────────────────────────────
// Rule 3: DB 실제 평형 목록 제시
// "몇 평인가요?" 금지 → "이 단지에는 N평, M평이 있습니다" 사용
// ─────────────────────────────────────────────
export function responseAreaList(complex, areaGroups, areaHint = null, isRepeat = false) {
  if (!areaGroups || areaGroups.length === 0) {
    return responseError("평형 데이터를 가져오지 못했어요.");
  }

  const name  = complex.complex_name;
  const list  = areaGroups.map((g, i) => `${i + 1}. **${areaGroupLabel(g)}**`).join("\n");

  // Rule 8: 반복 질문 시 힌트 포함
  let intro;
  if (isRepeat && areaHint) {
    const best = findBestAreaGroup(areaGroups, areaHint);
    if (best && best.diff <= 15) {
      intro = `혹시 **${areaGroupLabel(best.group)}** 말씀이신가요?\n아니면 아래에서 선택해 주세요.`;
    } else {
      intro = `**${name}**의 평형을 선택해 주세요.`;
    }
  } else {
    intro = `**${name}** 몇 평 찾으세요?`;
  }

  return {
    type:       RESPONSE_TYPES.AREA_LIST,
    text:       `${intro}\n\n${list}`,
    complex,
    areaGroups,
    ui:         "area_list",
  };
}

// ─────────────────────────────────────────────
// Rule 4: 후보 목록 — 이유 포함
// ─────────────────────────────────────────────
export function responseCandidateList(candidates, query, reason = "") {
  const count = candidates.length;

  // 이유별 안내 문구 (Rule 4: 왜 여러 개인지 설명)
  const reasonText = {
    multiple_candidates: `"${query}"와 비슷한 단지가 ${count}개 있어요.`,
    auto_top:            null,  // 자동선택이므로 안내 불필요
    next:                `다른 단지를 보여드릴게요.`,
    deny_remaining:      `남은 후보예요.`,
    no_area_data:        null,
  }[reason] || `"${query}"로 ${count}개 단지가 검색됐어요.`;

  if (!reasonText) {
    // auto_top: 자동선택, 응답 불필요 (analyze로 직행)
    return null;
  }

  const list = candidates.map((c, i) => {
    const sigungu = c.sigungu_short || extractGuDong(c.sigungu);
    const built   = c.build_year ? `${c.build_year}년` : "";
    const cnt     = (c.sale_cnt || 0) > 0 ? `거래 ${c.sale_cnt}건` : "데이터 확인 중";
    return `${i + 1}. **${c.complex_name}** ${sigungu} ${built} (${cnt})`.trim();
  }).join("\n");

  // Rule 7: 짧게 — 선택 안내 1줄만
  return {
    type:       RESPONSE_TYPES.CANDIDATES_LIST,
    text:       `${reasonText}\n\n${list}\n\n번호를 입력해 주세요.`,
    candidates,
    ui:         "candidate_list",
  };
}

// ─────────────────────────────────────────────
// Rule 1: 단지+평형 확보 → 즉시 분석 (질문 없음)
// ─────────────────────────────────────────────
export function responseReadyToAnalyze(complex, areaSqm) {
  const name   = complex.complex_name;
  const pyeong = sqmToPyeong(areaSqm);

  return {
    type:      RESPONSE_TYPES.READY_TO_ANALYZE,
    text:      `**${name}** ${pyeong}평이요~\n지금 보시는 매물가가 얼마예요?\n(모르시면 "몰라요" 하시면 실거래 기준으로 알려드려요)`,
    complex,
    areaSqm,
    ui:        "ask_price",  // 매물가 입력 대기
  };
}

// 매물가 없을 때 — 실거래 기준으로 바로 분석
export function responseReadyToAnalyzeNoPrice(complex, areaSqm) {
  const name   = complex.complex_name;
  const pyeong = sqmToPyeong(areaSqm);

  return {
    type:      RESPONSE_TYPES.READY_TO_ANALYZE,
    text:      `**${name}** ${pyeong}평 실거래 기준으로 분석할게요.`,
    complex,
    areaSqm,
    ui:        "analyzing",
  };
}

// ─────────────────────────────────────────────
// Rule 4: 실패 시 반드시 이유 설명
// "찾을 수 없습니다" 단독 금지
// ─────────────────────────────────────────────
export function responseNotFound(query, reason = "not_found") {
  // Rule 4: 이유 코드별 명확한 설명
  const explanations = {
    not_found: [
      `**"${query}"** 단지를 찾지 못했어요.`,
      ``,
      `이런 이유일 수 있어요:`,
      `• 단지명이 DB 등록명과 다를 수 있어요 (예: 헤링턴→해링턴)`,
      `• 지역명을 함께 입력하면 정확도가 높아져요`,
      `  예: 잠실 엘스, 수성구 래미안, 송도 더샵`,
    ].join("\n"),

    db_blank: [
      `**"${query}"** 단지는 찾았는데, 거래 데이터가 없어요.`,
      ``,
      `최근 거래가 없거나 데이터 준비 중인 단지예요.`,
      `다른 단지를 검색해 볼까요?`,
    ].join("\n"),

    new_construction: [
      `**"${query}"**는 신축 단지예요.`,
      ``,
      `입주 후 실거래 데이터가 쌓이면 분석할 수 있어요.`,
    ].join("\n"),

    no_recent_deals: [
      `**"${query}"** 단지는 있는데, 최근 거래가 없어요.`,
      ``,
      `거래가 드문 단지거나 데이터가 준비 중이에요.`,
    ].join("\n"),
  };

  return {
    type:  RESPONSE_TYPES.NOT_FOUND,
    text:  explanations[reason] || explanations.not_found,
    query,
    ui:    "message",
  };
}

// ─────────────────────────────────────────────
// Rule 3+4: 해당 평형 없을 때 — DB 실제 평형 안내
// ─────────────────────────────────────────────
export function responseAreaNotFound(complex, requestedSqm, areaGroups) {
  const name   = complex.complex_name;
  const pyeong = sqmToPyeong(requestedSqm);

  // Rule 4: 이유 설명
  let text = `**${name}**에 ${pyeong}평(${requestedSqm}㎡) 데이터가 없어요.`;

  // Rule 3: DB 실제 있는 평형 제시
  if (areaGroups.length > 0) {
    const available = areaGroups.map(g => areaGroupLabel(g)).join(", ");
    text += `\n\n있는 평형: ${available}`;

    // Rule 7: 짧게 — 다음 행동 명확하게
    if (areaGroups.length === 1) {
      text += `\n\n${areaGroupLabel(areaGroups[0])}으로 분석할까요?`;
    } else {
      text += `\n\n어떤 평형을 볼까요?`;
    }
  }

  return {
    type:       RESPONSE_TYPES.AREA_NOT_FOUND,
    text,
    complex,
    areaGroups,
    ui:         areaGroups.length > 0 ? "area_list" : "message",
  };
}

// ─────────────────────────────────────────────
// Rule 6+7: 지역 변경 — 자연스럽고 짧게
// ─────────────────────────────────────────────
export function responseRegionChanged(newRegion) {
  return {
    type: RESPONSE_TYPES.REGION_CHANGED,
    // Rule 7: 짧게, 다음 행동 명확
    text: `**${newRegion}**으로 바꿨어요. 어떤 단지를 보실 건가요?`,
    ui:   "message",
  };
}

// ─────────────────────────────────────────────
// Rule 6: 초기화 — 자연스럽게
// ─────────────────────────────────────────────
export function responseReset() {
  return {
    type: RESPONSE_TYPES.CONTEXT_RESET,
    text: `다시 시작할게요. 어떤 아파트를 알아보시나요?`,
    ui:   "message",
  };
}

// ─────────────────────────────────────────────
// Rule 1: 단지 질문 — 이미 있으면 호출 안 됨
// ─────────────────────────────────────────────
export function responseNeedComplex(purpose = "analysis", isRepeat = false) {
  const purposeHint = {
    jeonse:   "전세 정보",
    recent:   "최근 거래",
    buy:      "매수 분석",
    analysis: "분석",
  }[purpose] || "분석";

  // Rule 8: 반복 시 예시 포함
  const example = isRepeat
    ? `\n예: 잠실 엘스, 반포자이 84, 헬리오시티 국평`
    : `\n단지명을 입력해 주세요.`;

  return {
    type: RESPONSE_TYPES.NEED_MORE_INFO,
    text: `${purposeHint}를 위해 단지를 알려주세요.${example}`,
    ui:   "message",
  };
}

// ─────────────────────────────────────────────
// 인사 — 짧고 안내 명확
// ─────────────────────────────────────────────
export function responseGreeting() {
  return {
    type: RESPONSE_TYPES.NEED_MORE_INFO,
    text: `어서오세요! 어떤 아파트 알아보세요?\n\n예: 잠실 엘스, 반포자이, 홍제현대`,
    ui:   "message",
  };
}

// ─────────────────────────────────────────────
// Unknown — Context 기반 맞춤 안내
// ─────────────────────────────────────────────
export function responseUnknown(state) {
  const hasComplex = !!state?.currentComplex;
  const hasArea    = !!state?.currentArea;

  // Rule 1: 이미 있는 정보 다시 묻지 않음
  if (hasComplex && !hasArea) {
    const name = state.currentComplex.complex_name;
    return {
      type: RESPONSE_TYPES.NEED_MORE_INFO,
      text: `**${name}** 몇 평 찾으세요?`,
      ui:   "message",
    };
  }

  if (hasComplex && hasArea) {
    // 둘 다 있음 → 목적만 물음
    return {
      type: RESPONSE_TYPES.NEED_MORE_INFO,
      // Rule 7: 메뉴 형식으로 짧게
      text: `무엇이 궁금하세요?\n• 적정가\n• 전세\n• 최근 거래\n• 매수 의견`,
      ui:   "menu",
    };
  }

  return {
    type: RESPONSE_TYPES.NEED_MORE_INFO,
    text: `어떤 아파트를 알아보시나요?`,
    ui:   "message",
  };
}

// ─────────────────────────────────────────────
// 에러 — 짧고 다음 행동 명확
// ─────────────────────────────────────────────
export function responseError(detail = "") {
  return {
    type: RESPONSE_TYPES.ERROR,
    text: detail || `잠깐 문제가 생겼어요. 다시 말씀해 주세요.`,
    ui:   "message",
  };
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────
function extractGuDong(sigungu) {
  if (!sigungu) return "";
  const parts = sigungu.split(" ");
  return parts.slice(1, 3).join(" ") || parts[0];
}
