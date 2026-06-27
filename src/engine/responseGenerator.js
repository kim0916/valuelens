/**
 * ValueLens Conversation Engine — responseGenerator.js
 *
 * 상태와 결과에 따라 자연스러운 응답 문구를 생성한다.
 * "검색 결과입니다" 가 아니라
 * 공인중개사가 실제로 말할 법한 문장을 목표로 한다.
 *
 * ★ 이 파일은 응답 생성만 담당한다. 계산 로직 없음.
 */

import { areaGroupLabel, findBestAreaGroup } from './candidateSelector.js';
import { sqmToPyeong } from './intentClassifier.js';

// ─────────────────────────────────────────────
// 응답 타입 정의
// ─────────────────────────────────────────────
export const RESPONSE_TYPES = {
  // 단지 관련
  CANDIDATES_LIST:     "candidates_list",    // 후보 단지 목록 제시
  COMPLEX_CONFIRMED:   "complex_confirmed",  // 단지 확정
  NOT_FOUND:           "not_found",          // 단지 못 찾음

  // 면적 관련
  AREA_LIST:           "area_list",          // 면적 목록 제시
  AREA_CONFIRMED:      "area_confirmed",     // 면적 확정
  AREA_NOT_FOUND:      "area_not_found",     // 해당 면적 없음
  READY_TO_ANALYZE:    "ready_to_analyze",   // 분석 준비 완료

  // 분석 결과
  ANALYSIS_RESULT:     "analysis_result",    // 적정가 분석 결과
  JEONSE_RESULT:       "jeonse_result",      // 전세 정보

  // 컨텍스트
  CONTEXT_RESET:       "context_reset",      // 초기화
  REGION_CHANGED:      "region_changed",     // 지역 변경
  NEED_MORE_INFO:      "need_more_info",     // 정보 부족

  // 에러
  ERROR:               "error",
};

// ─────────────────────────────────────────────
// 핵심 응답 생성 함수들
// ─────────────────────────────────────────────

/**
 * 후보 단지 목록 응답
 */
export function responseCandidateList(candidates, query, reason = "") {
  const count = candidates.length;

  let intro;
  if (reason === "no_area_data") {
    intro = `**${candidates[0]?.complex_name}** 단지를 찾았는데, 현재 면적 데이터가 없어요.`;
  } else {
    intro = count === 1
      ? `**${candidates[0]?.complex_name}** 단지를 찾았어요.`
      : `"${query}"로 ${count}개 단지가 검색됐어요. 어떤 단지를 보실 건가요?`;
  }

  const list = candidates.map((c, i) => {
    const sigungu = c.sigungu_short || extractGuDong(c.sigungu);
    const built   = c.build_year ? `${c.build_year}년` : "";
    const cnt     = c.sale_cnt > 0 ? `거래 ${c.sale_cnt}건` : "거래 적음";
    return `${i + 1}. **${c.complex_name}** — ${sigungu} ${built} (${cnt})`;
  }).join("\n");

  return {
    type:       RESPONSE_TYPES.CANDIDATES_LIST,
    text:       `${intro}\n\n${list}`,
    candidates,
    ui:         "candidate_list",
  };
}

/**
 * 면적 목록 응답
 * 실제 DB에 있는 면적만 보여준다.
 */
export function responseAreaList(complex, areaGroups, areaHint = null) {
  const name = complex.complex_name;

  let intro = `**${name}**에는 아래 평형이 있어요. 분석할 평형을 선택해 주세요.`;
  if (areaHint) {
    const best = findBestAreaGroup(areaGroups, areaHint);
    if (best && best.diff > 8) {
      intro = `**${name}**에 ${areaHint}㎡ 평형은 없어요. 아래 평형 중 선택해 주세요.`;
    }
  }

  const list = areaGroups.map((g, i) => `${i + 1}. ${areaGroupLabel(g)}`).join("\n");

  return {
    type:       RESPONSE_TYPES.AREA_LIST,
    text:       `${intro}\n\n${list}`,
    complex,
    areaGroups,
    ui:         "area_list",
  };
}

/**
 * 단지+면적 확정 응답 (분석 준비 완료)
 */
export function responseReadyToAnalyze(complex, areaSqm) {
  const name   = complex.complex_name;
  const pyeong = sqmToPyeong(areaSqm);
  const sigungu = complex.sigungu_short || extractGuDong(complex.sigungu);

  return {
    type:       RESPONSE_TYPES.READY_TO_ANALYZE,
    text:       `**${name}** ${pyeong}평 (${areaSqm}㎡) 분석할게요.\n잠깐만요...`,
    complex,
    areaSqm,
    ui:         "analyzing",
  };
}

/**
 * 단지를 못 찾았을 때
 */
export function responseNotFound(query, reason = "not_found") {
  const messages = {
    not_found: [
      `"${query}"와 일치하는 단지를 찾지 못했어요.`,
      `더 구체적으로 입력해 주세요.`,
      `예: 지역명 + 단지명 (잠실 엘스, 수성구 래미안 등)`,
    ].join("\n"),
    db_blank: [
      `"${query}" 단지는 확인됐는데, 현재 거래 데이터가 없어요.`,
      `데이터 준비 중인 단지일 수 있어요.`,
    ].join("\n"),
    new_construction: [
      `"${query}"는 신축 단지로 아직 실거래 데이터가 준비되지 않았어요.`,
      `입주 후 거래가 쌓이면 분석이 가능해져요.`,
    ].join("\n"),
  };

  return {
    type:   RESPONSE_TYPES.NOT_FOUND,
    text:   messages[reason] || messages.not_found,
    query,
    ui:     "message",
  };
}

/**
 * 해당 평형이 없을 때
 */
export function responseAreaNotFound(complex, requestedSqm, areaGroups) {
  const name   = complex.complex_name;
  const pyeong = sqmToPyeong(requestedSqm);

  let text = `**${name}**에는 ${pyeong}평(${requestedSqm}㎡) 거래 데이터가 없어요.`;
  if (areaGroups.length > 0) {
    const list = areaGroups.map(g => areaGroupLabel(g)).join(", ");
    text += `\n\n현재 데이터가 있는 평형: ${list}`;
    text += `\n\n다른 평형으로 보실 건가요?`;
  }

  return {
    type:       RESPONSE_TYPES.AREA_NOT_FOUND,
    text,
    complex,
    areaGroups,
    ui:         "area_list",
  };
}

/**
 * 지역 변경 응답
 */
export function responseRegionChanged(newRegion) {
  return {
    type: RESPONSE_TYPES.REGION_CHANGED,
    text: `**${newRegion}** 지역으로 변경할게요. 어떤 단지를 보실 건가요?`,
    ui:   "message",
  };
}

/**
 * 컨텍스트 초기화
 */
export function responseReset() {
  return {
    type: RESPONSE_TYPES.CONTEXT_RESET,
    text: `처음부터 다시 시작할게요. 어떤 아파트를 알아보시나요?`,
    ui:   "message",
  };
}

/**
 * 전세 정보 요청 (단지/면적 미확정 시)
 */
export function responseNeedComplex(purpose = "jeonse") {
  const purposeText = {
    jeonse:   "전세 정보",
    recent:   "최근 거래",
    school:   "학군 정보",
    buy:      "매수 의견",
    analysis: "분석",
  }[purpose] || "분석";

  return {
    type: RESPONSE_TYPES.NEED_MORE_INFO,
    text: `${purposeText}를 보려면 먼저 단지와 평형을 알려주세요.\n예: 잠실 엘스 84, 반포자이 34평`,
    ui:   "message",
  };
}

/**
 * 전세 정보 응답
 */
export function responseJeonseInfo(complex, areaSqm, jeonseData) {
  const name   = complex.complex_name;
  const pyeong = sqmToPyeong(areaSqm);

  if (!jeonseData || !jeonseData.price) {
    return {
      type: RESPONSE_TYPES.JEONSE_RESULT,
      text: `**${name}** ${pyeong}평 전세 데이터가 충분하지 않아요.`,
      ui:   "message",
    };
  }

  const price = formatWon(jeonseData.price);
  const ratio = jeonseData.ratio ? `전세가율 ${(jeonseData.ratio * 100).toFixed(0)}%` : "";

  return {
    type: RESPONSE_TYPES.JEONSE_RESULT,
    text: [
      `**${name}** ${pyeong}평 전세`,
      ``,
      `전세 시세: **${price}**`,
      ratio,
      `(최근 ${jeonseData.usedCount || ""}건 기준)`,
    ].filter(Boolean).join("\n"),
    ui: "jeonse_result",
  };
}

/**
 * 인사 응답
 */
export function responseGreeting() {
  return {
    type: RESPONSE_TYPES.NEED_MORE_INFO,
    text: `안녕하세요! 어떤 아파트를 알아보시나요?\n\n단지명과 평형을 말씀해 주세요.\n예: 잠실 엘스 84, 반포자이 34평, 헬리오시티 국평`,
    ui:   "message",
  };
}

/**
 * Unknown intent 응답
 */
export function responseUnknown(state) {
  const hasComplex = !!state.currentComplex;
  const hasArea    = !!state.currentArea;

  if (hasComplex && !hasArea) {
    return {
      type: RESPONSE_TYPES.NEED_MORE_INFO,
      text: `평형을 알려주세요. 숫자로 입력하시면 돼요.\n예: 84, 34평, 국평`,
      ui:   "message",
    };
  }

  if (hasComplex && hasArea) {
    return {
      type: RESPONSE_TYPES.NEED_MORE_INFO,
      text: `무엇이 궁금하신가요?\n• 적정가 분석\n• 전세 정보\n• 최근 거래\n• 매수 의견`,
      ui:   "menu",
    };
  }

  return {
    type: RESPONSE_TYPES.NEED_MORE_INFO,
    text: `어떤 아파트를 알아보시나요?\n단지명을 말씀해 주세요.`,
    ui:   "message",
  };
}

/**
 * 에러 응답
 */
export function responseError(detail = "") {
  return {
    type: RESPONSE_TYPES.ERROR,
    text: `잠깐 문제가 생겼어요. 다시 말씀해 주시겠어요?${detail ? `\n(${detail})` : ""}`,
    ui:   "message",
  };
}

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────
function extractGuDong(sigungu) {
  if (!sigungu) return "";
  const parts = sigungu.split(" ");
  return parts.slice(1).join(" ") || parts[0];
}

function formatWon(man) {
  if (!man) return "-";
  const n = Number(man);
  if (n >= 10000) return `${(n / 10000).toFixed(1)}억`;
  return `${n.toLocaleString()}만원`;
}
