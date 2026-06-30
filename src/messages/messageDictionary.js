/**
 * src/messages/messageDictionary.js
 *
 * ValueLens 플랫폼 공통 Message Dictionary.
 *
 * 설계 원칙:
 * - Key는 기능(Fair/Buy/Sell)이 아니라 "상황(Situation)"을 기준으로 만든다.
 *   같은 상황이면 Fair/Buy/Sell 어디서든 같은 Key를 재사용한다. domain 필드는 두지 않는다.
 * - Message는 문자열 하나가 아니라 { category, title, description, action } 객체다.
 *   지금은 채팅 말풍선(description)만 쓰지만, 나중에 Toast/Dialog/Bottom Sheet에서도
 *   같은 Key를 재사용할 수 있도록 구조를 미리 맞춰둔다.
 * - description은 함수(params) => string 형태 — 변수 치환이 필요한 메시지를 표현하기 위함.
 * - 이번 1차 작업은 "이동"만 한다. 기존 문자열 내용은 한 글자도 바꾸지 않았다.
 *   같은 상황인데 콜사이트마다 문구가 달랐던 것들은 그대로 별도 Key로 옮기고
 *   파일 하단 DUPLICATE_SITUATIONS 목록에 전부 기록했다 — 문구 통일은 다음 단계(Style Guide 적용)에서 한다.
 */

import { MessageCategory } from './messageCategories.js';

export const MESSAGES = {
  // ── 단지(Complex) ──
  COMPLEX_NOT_FOUND: {
    category: MessageCategory.ERROR,
    title: null,
    description: ({ query }) => `"${query}"을(를) 찾지 못했습니다. 단지명을 다시 확인해 주세요.`,
    action: null,
  },
  COMPLEX_REQUIRED: {
    category: MessageCategory.GUIDE,
    title: null,
    description: () => '어떤 단지를 찾아드릴까요? 단지명을 입력해 주세요.',
    action: null,
  },
  COMPLEX_REQUIRED_DETAILED: {
    category: MessageCategory.GUIDE,
    title: null,
    description: () => '어떤 아파트인지 단지명을 알려주실 수 있을까요?\n예: 래미안, 동부아파트, 헬리오시티',
    action: null,
  },
  DONG_REQUIRED: {
    category: MessageCategory.GUIDE,
    title: null,
    description: ({ query }) => `${query}가 어느 지역에 있나요?\n동/구 이름을 입력해 주세요. 예: 우동, 잠실, 공릉동`,
    action: null,
  },
  EDIT_REQUEST: {
    category: MessageCategory.GUIDE,
    title: null,
    description: () => '수정할 내용을 입력해 주세요.',
    action: null,
  },

  // ── 평형(Area) ──
  AREA_LIST_UNAVAILABLE: {
    category: MessageCategory.ERROR,
    title: null,
    description: ({ complexName }) => `${complexName}의 평형 정보를 불러오지 못했습니다. 다시 시도해 주세요.`,
    action: null,
  },
  AREA_LIST_UNAVAILABLE_CURRENT: {
    category: MessageCategory.ERROR,
    title: null,
    description: () => '현재 단지의 평형 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
    action: null,
  },
  AREA_OPTIONS_EMPTY: {
    category: MessageCategory.ERROR,
    title: null,
    description: () => '평형 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
    action: null,
  },
  AREA_DATA_MISSING: {
    category: MessageCategory.ERROR,
    title: null,
    description: () => '평형 정보가 없습니다.',
    action: null,
  },
  AREA_MATCH_FAILED: {
    category: MessageCategory.ERROR,
    title: null,
    description: () => '평형 정보를 매칭하지 못했습니다. 다시 시도해 주세요.',
    action: null,
  },
  AREA_INVALID_INPUT: {
    category: MessageCategory.WARNING,
    title: null,
    description: ({ areaList }) => `${areaList} 중 하나를 입력해 주세요.`,
    action: null,
  },
  AREA_CHANGE_PROMPT: {
    category: MessageCategory.GUIDE,
    title: null,
    description: () => '어떤 평형으로 변경하시겠어요?',
    action: null,
  },
  NO_OTHER_AREA: {
    category: MessageCategory.EMPTY,
    title: null,
    description: () => '현재 확인 가능한 다른 평형이 없습니다.',
    action: null,
  },
  AREA_SINGLE_SUGGESTION: {
    category: MessageCategory.CONFIRM,
    title: null,
    description: ({ pyeong }) => `${pyeong}평 말씀하시는 거죠?\n맞으면 "응" 또는 "${pyeong}평"이라고 입력해 주세요.`,
    action: null,
  },
  MULTIPLE_AREA_FOUND: {
    category: MessageCategory.GUIDE,
    title: null,
    description: ({ complexName, names }) => `${complexName}는 ${names} 분석 가능합니다.\n어떤 평형이 궁금하세요?`,
    action: null,
  },
  MULTIPLE_AREA_FOUND_OTHER: {
    category: MessageCategory.GUIDE,
    title: null,
    description: ({ complexName, names }) => `${complexName}는 ${names}도 분석 가능합니다.\n어떤 평형이 궁금하세요?`,
    action: null,
  },
  AREA_OUT_OF_RANGE_BELOW: {
    category: MessageCategory.WARNING,
    title: null,
    description: ({ inputPyeong, matchedPyeong }) => `이 단지에는 ${inputPyeong}평형이 없어 가장 작은 ${matchedPyeong}평형으로 분석합니다`,
    action: null,
  },
  AREA_OUT_OF_RANGE_ABOVE: {
    category: MessageCategory.WARNING,
    title: null,
    description: ({ inputPyeong, matchedPyeong }) => `이 단지에는 ${inputPyeong}평형이 없어 가장 큰 ${matchedPyeong}평형으로 분석합니다`,
    action: null,
  },
  AREA_OUT_OF_RANGE_NEAREST: {
    category: MessageCategory.WARNING,
    title: null,
    description: ({ inputPyeong }) => `${inputPyeong}평과 가장 가까운 평형`,
    action: null,
  },
  AREA_MATCHED: {
    category: MessageCategory.CONFIRM,
    title: null,
    description: ({ matchedPyeong }) => `${matchedPyeong}평형으로 분석합니다.`,
    action: null,
  },
  AREA_BELOW_MIN: {
    category: MessageCategory.WARNING,
    title: null,
    description: ({ inputPyeong, matchedPyeong }) => `이 단지에는 ${inputPyeong}평형이 없습니다. 가장 작은 평형인 ${matchedPyeong}평형으로 분석합니다.`,
    action: null,
  },
  AREA_ABOVE_MAX: {
    category: MessageCategory.WARNING,
    title: null,
    description: ({ inputPyeong, matchedPyeong }) => `이 단지에는 ${inputPyeong}평형이 없습니다. 가장 큰 평형인 ${matchedPyeong}평형으로 분석합니다.`,
    action: null,
  },
  AREA_NEAREST: {
    category: MessageCategory.WARNING,
    title: null,
    description: ({ inputPyeong, matchedPyeong }) => `${inputPyeong}평형은 존재하지 않아 가장 가까운 ${matchedPyeong}평형으로 분석합니다.`,
    action: null,
  },

  // ── 가격(Price) ──
  PRICE_REQUIRED: {
    category: MessageCategory.GUIDE,
    title: null,
    description: ({ complexName, pyeong }) => `${complexName} ${pyeong}평이군요.\n현재 매물가를 알고 계시나요?\n모르시면 최근 실거래 평균 기준으로 분석해드립니다.`,
    action: null,
  },
  PRICE_INVALID: {
    category: MessageCategory.WARNING,
    title: null,
    description: () => '금액을 다시 입력해 주세요. 예: 8억, 8.5억, 85000',
    action: null,
  },
  PRICE_CONFIRMED: {
    category: MessageCategory.CONFIRM,
    title: null,
    description: ({ priceLabel }) => `입력하신 가격 ${priceLabel} 기준으로 분석합니다.`,
    action: null,
  },
  PRICE_COMPARE_REQUEST: {
    category: MessageCategory.GUIDE,
    title: null,
    description: ({ complexName, pyeongLabel }) => `${complexName} ${pyeongLabel} 매물 가격을 입력해 주세요.\n실거래 적정가와 비교해드립니다.\n(예: 8억, 7억 5천)`,
    action: null,
  },

  // ── 진행 상태 ──
  SEARCHING: {
    category: MessageCategory.GUIDE,
    title: null,
    description: ({ query }) => `${query} 검색합니다...`,
    action: null,
  },
  ANALYSIS_REDIRECT: {
    category: MessageCategory.SUCCESS,
    title: null,
    description: () => '잠시만 기다려주세요. 분석 결과로 이동합니다.',
    action: null,
  },
  SYSTEM_ERROR: {
    category: MessageCategory.ERROR,
    title: null,
    description: () => '단지 검색 중 오류가 발생했습니다. 다시 시도해 주세요.',
    action: null,
  },

  // ── 리셋 / 취소 ──
  RESET_SUCCESS: {
    category: MessageCategory.SUCCESS,
    title: null,
    description: () => '처음으로 돌아갑니다. 궁금한 아파트를 말씀해 주세요.',
    action: null,
  },
  RESET_SUCCESS_V2: {
    category: MessageCategory.SUCCESS,
    title: null,
    description: () => '처음부터 다시 시작합니다. 어떤 아파트가 궁금하세요?',
    action: null,
  },
  CANCELLED: {
    category: MessageCategory.SUCCESS,
    title: null,
    description: () => '취소되었습니다. 다른 질문이 있으시면 말씀해 주세요.',
    action: null,
  },
  CANCELLED_FRESH_START: {
    category: MessageCategory.SUCCESS,
    title: null,
    description: () => '취소했습니다. 다른 아파트를 검색해 보세요.',
    action: null,
  },

  // ── 매수 / 거래 흐름 / 매도 ──
  BUY_OPINION: {
    category: MessageCategory.GUIDE,
    title: null,
    description: ({ verdictText, gapText, complexName }) =>
      `매수 관점으로 봐도 위 분석이 기준이 됩니다.\n현재 판단: ${verdictText}${gapText}\n\n${complexName}의 적정가/거래 흐름을 참고해서 결정하시면 좋을 것 같아요.`,
    action: null,
  },
  FEATURE_UNAVAILABLE: {
    category: MessageCategory.UNSUPPORTED,
    title: null,
    description: () => '아직 준비 중인 기능입니다. 곧 제공될 예정입니다.',
    action: null,
  },
  SCROLL_TO_DEALS: {
    category: MessageCategory.SUCCESS,
    title: null,
    description: () => '거래 흐름으로 이동합니다.',
    action: null,
  },
  SELL_NOT_SUPPORTED_YET: {
    category: MessageCategory.GUIDE,
    title: null,
    description: () =>
      '매도 분석은 현재 정확도 개선 중입니다.\n\n지금은 적정가·최근 거래 흐름·가격 위치를 기준으로 참고 정보를 제공해 드립니다.\n\n먼저 적정가를 확인해 보시겠어요?\n"적정가 보기" 또는 "최근 거래 보기"를 입력해 주세요.',
    action: null,
  },

  // ── Fallback ──
  UNRECOGNIZED_INPUT: {
    category: MessageCategory.FOLLOWUP,
    title: null,
    description: () => '죄송해요, 이해하지 못했습니다.\n"다른 평형은?", "매수 의견은?", "최근 거래는?" 등으로 질문해 주세요.',
    action: null,
  },
};

/**
 * 같은 상황(Situation)인데 콜사이트마다 문구가 달랐던 것들.
 * 이번 1차 이전 작업에서는 내용을 통일하지 않고 그대로 별도 Key로 옮겼다.
 * Style Guide 적용 단계에서 이 목록을 기준으로 하나의 문구로 통일해야 한다.
 */
export const DUPLICATE_SITUATIONS = [
  {
    situation: '단지명 입력 요청',
    keys: ['COMPLEX_REQUIRED', 'COMPLEX_REQUIRED_DETAILED'],
    note: '"다른 단지" 흐름(ResultChatBar)과 단지 슬롯 누락(ActionHandlers) 시 문구가 다름',
  },
  {
    situation: '평형 정보 조회 실패',
    keys: ['AREA_LIST_UNAVAILABLE', 'AREA_LIST_UNAVAILABLE_CURRENT', 'AREA_OPTIONS_EMPTY'],
    note: '셋 다 "평형 정보를 못 불러왔다"는 같은 상황이지만 단지명 포함 여부 등 표현이 제각각',
  },
  {
    situation: '복수 평형 안내',
    keys: ['MULTIPLE_AREA_FOUND', 'MULTIPLE_AREA_FOUND_OTHER'],
    note: '조사("도") 유무만 다름 — 검색 결과 vs "다른 평형" 질문 결과',
  },
  {
    situation: '평형 범위 밖 안내(below/above/nearest)',
    keys: ['AREA_OUT_OF_RANGE_BELOW', 'AREA_OUT_OF_RANGE_ABOVE', 'AREA_OUT_OF_RANGE_NEAREST',
           'AREA_BELOW_MIN', 'AREA_ABOVE_MAX', 'AREA_NEAREST'],
    note: 'ResultChatBar의 Confirm Card용 짧은 구(절) 버전과 ActionHandlers(ASK_AREA)의 완결된 문장 버전이 따로 존재',
  },
  {
    situation: '리셋(처음으로 돌아가기)',
    keys: ['RESET_SUCCESS', 'RESET_SUCCESS_V2'],
    note: 'ResultChatBar("처음으로 돌아갑니다")와 ConversationEngine_v2("처음부터 다시 시작합니다") 문구가 다름',
  },
  {
    situation: '취소',
    keys: ['CANCELLED', 'CANCELLED_FRESH_START'],
    note: 'ResultChatBar의 일반 취소와 ActionHandlers의 단지 검색 취소 문구가 다름',
  },
];
