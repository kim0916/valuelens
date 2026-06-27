/**
 * ValueLens NLU — classifyUserIntent.js
 *
 * 기존 15개 Intent + 신규 14개 = 29개 Intent 분류.
 * 엔티티 추출 결과와 Context를 함께 활용한다.
 * ★ 계산 로직 없음. 분류만.
 */

// ─────────────────────────────────────────────
// 전체 Intent 정의 (기존 + 신규)
// ─────────────────────────────────────────────
export const NLU_INTENTS = {
  // ── 기존 15개 ──
  PRICE_ANALYSIS:    "price_analysis",
  JEONSE_INFO:       "jeonse_info",
  BUY_OPINION:       "buy_opinion",
  PRICE_OPINION:     "price_opinion",
  RECENT_DEALS:      "recent_deals",
  SCHOOL_INFO:       "school_info",
  AREA_SELECT:       "area_select",
  CANDIDATE_SELECT:  "candidate_select",
  CHANGE_AREA:       "change_area",
  CHANGE_CANDIDATE:  "change_candidate",
  CHANGE_REGION:     "change_region",
  CONFIRM:           "confirm",
  DENY:              "deny",
  RESET:             "reset",
  SEARCH_COMPLEX:    "search_complex",
  GREETING:          "greeting",
  UNKNOWN:           "unknown",

  // ── 신규 14개 ──
  SHOW_ALL_AREAS:      "show_all_areas",      // "다 보여줘" → 모든 평형 표시
  RECOMMEND_COMPLEX:   "recommend_complex",   // "송도 7억 추천" → 단지 추천
  CHANGE_BUDGET:       "change_budget",       // 예산 변경
  CHANGE_PURPOSE:      "change_purpose",      // 목적 변경
  CHANGE_PREFERENCE:   "change_preference",   // 선호사항 변경
  CHEAPER_OPTION:      "cheaper_option",      // "더 싼 거" → 저렴한 대안
  LARGER_AREA:         "larger_area",         // "더 큰 평수"
  SMALLER_AREA:        "smaller_area",        // "더 작은 평수"
  SIMILAR_COMPLEX:     "similar_complex",     // "비슷한 단지"
  COMPARE_COMPLEX:     "compare_complex",     // "A랑 B 비교"
  EXPLAIN_REASON:      "explain_reason",      // "왜 분석이 안 돼?"
  CONTRACT_CHECK:      "contract_check",      // "계약 전 확인사항"
  DATA_MISSING:        "data_missing",        // "네이버엔 있는데 왜 없어?"
  UNKNOWN_FOLLOWUP:    "unknown_followup",    // 맥락 없는 후속어
};

// ─────────────────────────────────────────────
// 패턴 정의 (순서: 구체적 → 일반)
// ─────────────────────────────────────────────
const PATTERNS = [
  // ── 후속 질문 먼저 처리 ──
  [NLU_INTENTS.JEONSE_INFO, [
    /^전세(는|가|로|이)?\s*(얼마|시세|금액|조회|보여|알려|는)?\??$/,  // "전세는?" 우선
    /전세\s*(시세|금액|얼마|조회|가격|가율)/,
    /임차\s*(보증금|조건|시세)/,
    /^보증금$/,
  ]],

  // ── 신규: 먼저 처리 (오인식 방지) ──

  // show_all_areas — "다 보여줘"는 검색이 아님
  [NLU_INTENTS.SHOW_ALL_AREAS, [
    /^(다\s*보여줘|전부\s*보여줘|모두\s*보여줘|다\s*알려줘|평형\s*다\s*보여줘)$/,
    /평형\s*(전부|다|모두)\s*(보여|알려)/,
    /모든\s*(평형|타입|면적)\s*(보여|알려)/,
  ]],

  // explain_reason — "왜" 질문
  [NLU_INTENTS.EXPLAIN_REASON, [
    /왜\s*(분석이|결과가|안\s*나|안\s*돼|이런\s*가격|높|낮|그렇)/,
    /이유가\s*(뭐|뭔|무엇)/,
    /어떻게\s*(계산|나온|산출)/,
  ]],

  // data_missing — 데이터 관련 질문
  [NLU_INTENTS.DATA_MISSING, [
    /네이버\s*(에는|엔|에서)\s*(있는데|있는데도|찾을\s*수\s*있는데)/,
    /왜\s*(없|데이터|정보)/,
    /(국토부|실거래|공공)\s*(에는|엔)\s*(있는데|있어도)/,
    /데이터가\s*(없|부족|안\s*나)/,
  ]],

  // compare_complex — A와 B 비교
  [NLU_INTENTS.COMPARE_COMPLEX, [
    /([가-힣a-z]+)\s*(와|랑|하고|과|vs\.?|VS\.?|대비)\s*([가-힣a-z]+)\s*(비교|차이|뭐가\s*나)?/i,
    /비교\s*(해줘|해주세요|해봐|해)/,
    /(어디가|뭐가)\s*(더\s*)?(나은|좋은|좋아|나아)/,
  ]],

  // recommend_complex — 추천 요청
  [NLU_INTENTS.RECOMMEND_COMPLEX, [
    /추천\s*(해줘|해주세요|해봐|좀|아파트|단지)/,
    /(어디가|어떤\s*곳|어떤\s*아파트|좋은\s*곳|살\s*만한\s*곳)/,
    /\d+억\s*(대에서|이하에서|안에서|짜리|정도)\s*(추천|검색|보여)/,
    /(아이|가족|학군)\s*(좋은|좋은\s*곳|키우기)/,
    /실거주\s*(로\s*)?(좋은|괜찮은|추천)/,
    /(강남|여의도|판교|광화문)\s*출퇴근\s*(좋은|편한|가능)/,
  ]],

  // cheaper_option
  [NLU_INTENTS.CHEAPER_OPTION, [
    /더\s*(싼|저렴한|낮은\s*가격|가성비\s*좋은)/,
    /가성비\s*(좋은|있는)\s*(곳|아파트|단지)?/,
    /(싸게|저렴하게|싸)\s*(없|살\s*수|구할\s*수|나오는)?/,
    /좀\s*(더\s*)?(싸|저렴)/,
    /비슷한\s*(가격|수준)\s*(에서|으로)/,
  ]],

  // larger_area / smaller_area
  [NLU_INTENTS.LARGER_AREA, [
    /더\s*(큰|넓은)\s*(평수|평형|면적|집|거)/,
    /큰\s*평수|넓은\s*(곳|거|것)|한\s*평수\s*위/,
    /^(넓은|큰)\s*(거|것|평형|평수)?$/,
  ]],
  [NLU_INTENTS.SMALLER_AREA, [
    /더\s*(작은|좁은)\s*(평수|평형|면적|집)/,
    /작은\s*(평수|거|것|아파트)?\s*(없어|있어|보여)?/,
    /좁은\s*(거|것|평수)/,
    /한\s*평수\s*아래|작아도\s*돼/,
  ]],

  // similar_complex
  [NLU_INTENTS.SIMILAR_COMPLEX, [
    /비슷한\s*(단지|아파트|곳|거|것)?/,
    /(같은|동등한)\s*(수준|가격대|입지)/,
    /대안\s*(단지|아파트)/,
    /^비슷한\s*(거|것)?$/,
  ]],

  // contract_check
  [NLU_INTENTS.CONTRACT_CHECK, [
    /계약\s*(전|할\s*때|시|하기\s*전에?)\s*(확인|체크|주의|뭐)?/,
    /(등기|건축물대장|실거래\s*확인)/,
    /계약서\s*(쓸\s*때|작성|체결)/,
    /특약\s*(사항|넣어야|확인)/,
  ]],

  // recommend_complex with budget only (단지명+면적 형태와 구분)
  [NLU_INTENTS.RECOMMEND_COMPLEX, [
    /^\d+(?:\.\d+)?억(대|\s*이하|\s*이상|\s*정도|\s*까지|\s*안에서|~)?\s*(추천|아파트|단지|보여)?$/,
    /\d+~\d+억\s*(아파트|단지|추천|보여)?/,  // "6~7억 아파트 추천"
    /\d+억(대)?\s*(아파트|단지|추천|이하|이상|정도|보여|알려)/,  // "7억대 아파트"
    /\d+억\s*(이하|미만|까지)\s*(추천|보여|알려)?/,
  ]],

  // change_budget
  [NLU_INTENTS.CHANGE_BUDGET, [
    /예산\s*(을\s*|이\s*)?(바꿔|올려|내려|줄여|늘려|변경)/,
    /\d+억\s*(으로|로)\s*(바꿔|변경|낮춰|높여)/,
    /예산\s*\d+억/,
  ]],

  // change_purpose
  [NLU_INTENTS.CHANGE_PURPOSE, [
    /(실거주|투자|전세|매수)\s*(로\s*)?(바꿔|변경|알아봐)/,
    /목적\s*(바꿔|변경)/,
  ]],

  // change_preference
  [NLU_INTENTS.CHANGE_PREFERENCE, [
    /학군\s*(위주|중심|좋은\s*곳)/,
    /조용한\s*(곳|동네|단지)/,
    /역세권\s*(위주|중심|으로)/,
  ]],

  // unknown_followup — 맥락 없는 짧은 후속
  [NLU_INTENTS.UNKNOWN_FOLLOWUP, [
    /^(음|흠|아|오|어|글쎄|모르겠|잘\s*모르|생각\s*중|그냥|뭐든|상관\s*없|잘\s*모르겠|음+|흠+)$/,
    /^(ㅋ+|ㅎ+|ㅇ+)$/, // 감탄사
  ]],

  // ── 기존 패턴 (Phase 1 → 그대로 유지) ──

  [NLU_INTENTS.CHANGE_AREA, [
    /아니\s*[,\s]+(\d+)\s*(평|㎡)?/,          // "아니 25평", "아니 59로"
    /(\d+)\s*(평|㎡)(으로|로)\s*(바꿔|변경|해줘)/,
    /(\d+)(으로|로)\s*(바꿔|변경)/,
    /아니고?\s*(\d+)/,
  ]],

  [NLU_INTENTS.CHANGE_REGION, [
    /^(?!\d)(.+?)(으로|로|에서)\s*(바꿔|변경|보여줘|검색|알려줘)/,
    /(.+?)(지역|동네|곳)\s*(으로|로)\s*(바꿔|변경)/,
  ]],

  [NLU_INTENTS.RESET, [
    /^(다시|처음|초기화|리셋|처음부터|새로\s*시작)/,
  ]],

  [NLU_INTENTS.CONFIRM, [
    /^(응|맞아|그래|그거|ㅇ|ㅇㅇ|넵|예|yes|ok|맞음|그걸로)$/i,
  ]],

  [NLU_INTENTS.DENY, [
    /^(아니|아니야|아니요|아닌데|틀려|틀렸어|아님|노|no)$/i,
  ]],

  [NLU_INTENTS.CHANGE_CANDIDATE, [
    /^(그거\s*말고|다른\s*거|다른\s*단지|말고\s*다른|그\s*다음|다음\s*거|그다음)$/,
    /그거\s*말고/,
    /다른\s*(거|단지|걸로)/,
    /그\s*(다음|거|것)/,
  ]],

  [NLU_INTENTS.CANDIDATE_SELECT, [
    /^([1-9])\s*(번|번째|번\s*거)?(으로|로)?\s*(해줘|선택|가)?$/,
    /^(첫\s*번째|두\s*번째|세\s*번째)/,
  ]],


  [NLU_INTENTS.SCHOOL_INFO, [
    /^(학군|학교|초등학교|중학교|학원가)(은|는|이|가)?$/,  // 단독 학군 질문만
    /학군\s*(은|는|어때|좋은\s*지|확인|알려)/,
  ]],

  [NLU_INTENTS.RECENT_DEALS, [
    /최근\s*(거래|실거래|가격|실가)/,
    /실거래\s*(가|가격|내역|조회|보여|알려)?/,
    /거래\s*(내역|조회|현황|보여)/,
    /얼마에\s*(팔렸|거래)/,
  ]],

  [NLU_INTENTS.BUY_OPINION, [
    /지금\s*(사도|살)\s*(돼|될까|되나|좋아|괜찮)/,
    /살\s*만\s*(해|한가|할까)/,
    /매수\s*(적기|타이밍)/,
  ]],

  [NLU_INTENTS.PRICE_OPINION, [
    /얼마면\s*(괜찮|적당|좋아)/,
    /적정\s*(가격|금액)/,
  ]],

  [NLU_INTENTS.AREA_SELECT, [
    /^(\d+)\s*평\s*$/,
    /^(\d+)\s*(㎡|m2)\s*$/,
    /^(국평|국민\s*평형|국민평형)\s*$/,
    /^(3[0-9]|[4-9][0-9]|1[0-9]{2})$/,  // 30~199 단독 숫자
  ]],

  [NLU_INTENTS.PRICE_ANALYSIS, [
    /적정\s*(가|가격)/,
    /얼마야|얼마임|얼마에요/,
    /시세\s*(얼마|확인)/,
    /분석\s*(해줘|해주세요)/,
    /비싸|싸게|적당한지/,
  ]],

  [NLU_INTENTS.GREETING, [
    /^(안녕|안녕하세요|반가워|시작)/,
    /^(hi|hello)(\s|$)/i,
  ]],
];

// ─────────────────────────────────────────────
// 메인 분류 함수
// ─────────────────────────────────────────────
/**
 * @param {string}  text      — 정규화된 사용자 입력
 * @param {object}  entities  — extractEntities 결과
 * @param {object}  state     — 현재 conversationState
 * @returns {{ intent, confidence }}
 */
export function classifyUserIntent(text, entities = {}, state = {}) {
  const t     = (text || "").trim();
  const lower = t.toLowerCase().replace(/\s+/g, " ");

  // 1. 패턴 매칭
  for (const [intent, patterns] of PATTERNS) {
    for (const p of patterns) {
      if (p.test(lower)) {
        return { intent, confidence: 0.92 };
      }
    }
  }

  // 2. 엔티티 기반 Context-aware 분류
  const hasComplex  = !!state.currentComplex;
  const hasArea     = !!state.currentArea;
  const hasBudget   = !!entities.budget;
  const hasRegion   = !!(entities.sigungu || entities.regionArea);
  const hasFamily   = !!entities.family;
  const hasPurpose  = !!entities.purpose;
  const hasArea2    = entities.areaSqm != null || entities.areaRange != null;
  const hasComplex2 = !!entities.complexQuery;

  // 예산 + 지역 → 추천
  if (hasBudget && (hasRegion || hasComplex)) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.8 };
  }

  // 가족/목적 → 추천
  if (hasFamily || (hasPurpose && !hasComplex2)) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.75 };
  }

  // 단지 있고 면적 없는 상태에서 면적 입력
  if (state.pendingSlot === "area" && hasArea2) {
    return { intent: NLU_INTENTS.AREA_SELECT, confidence: 0.9 };
  }

  // 후보 대기 중 숫자 단독
  if (state.pendingSlot === "candidate" && /^\d+$/.test(t)) {
    return { intent: NLU_INTENTS.CANDIDATE_SELECT, confidence: 0.88 };
  }

  // 단지+면적 동시 → 검색
  if (hasComplex2 && hasArea2) {
    return { intent: NLU_INTENTS.SEARCH_COMPLEX, confidence: 0.85 };
  }

  // 단지만 → 검색
  if (hasComplex2 && !hasArea2) {
    return { intent: NLU_INTENTS.SEARCH_COMPLEX, confidence: 0.72 };
  }

  // 지역만 → 추천
  if (hasRegion && !hasComplex2) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.68 };
  }

  return { intent: NLU_INTENTS.UNKNOWN, confidence: 0 };
}
