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
    /^전세(는|가|로|이)?\s*(얼마|시세|금액|조회|보여|알려|는)?\??$/,
    /전세\s*(시세|금액|얼마|조회|가격|가율|는|도|로)/,
    /임차\s*(보증금|조건|시세)/,
    /^보증금$/,
    /전세가\s*(얼마|어떻게|어떠)/,
    /전세\s*(놓으면|받으면|수익)/,
    /전세\s*(살\s*수\s*있어|가능해|얼마나)/,
    /보증금\s*(얼마|수준|시세)/,
    /전세\s*(구하면|있어|있나|있을까)/,
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
    /실거래.+이유|이유.+실거래/,  // "실거래 없는 이유"
    /왜\s*안\s*나/,
  ]],

  // data_missing — 데이터 관련 질문
  [NLU_INTENTS.DATA_MISSING, [
    /네이버\s*(에는|엔|에서)\s*(있는데|있는데도|찾을\s*수\s*있는데)/,
    /왜\s*(없|데이터|정보)/,
    /(국토부|실거래|공공)\s*(에는|엔)\s*(있는데|있어도)/,
    /데이터가\s*(없|부족|안\s*나)/,
    /DB.+없|없.+DB|없는\s*이유/,  // "DB에 없는 이유"
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
    /다른\s*(평형|평수)(은|는|도|으로)?/,
    /^다른평형/,
    /평형\s*(바꿔|변경|다른|다르게)/,
    /다른\s*크기|다른\s*사이즈/,
    /위\s*(평형|평수)|상위\s*평형/,
    /(34|41|43|51)\s*평(은|으로|이)?/,
    /큰\s*(거|것|평형)\s*(없어|있어|보여)/,
  ]],
  [NLU_INTENTS.SMALLER_AREA, [
    /더\s*(작은|좁은)\s*(평수|평형|면적|집)/,
    /작은\s*(평수|거|것|아파트)?\s*(없어|있어|보여)?/,
    /좁은\s*(거|것|평수)/,
    /한\s*평수\s*아래|작아도\s*돼/,
    /아래\s*(평형|평수)|하위\s*평형/,
    /작은\s*(거|것|평형)\s*(없어|있어|보여)/,
    /(25|19|18)\s*평(은|으로|이)?/,
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

  // ★ Rule B: [지역] + [조건] + [아파트/단지/집] → recommend_complex (최우선)
  // 어떤 지역이 와도 "아파트/단지/집/매물" 포함 시 조건 검색으로
  [NLU_INTENTS.RECOMMEND_COMPLEX, [
    // 지역 + 조건 + 아파트/단지/집 패턴 (순서 무관)
    /[가-힣]+\s+(?:\d+평대|\d+평|\d+억|국평|소형|대형|중형).+(?:아파트|단지|집|매물)/,
    /(?:아파트|단지|집|매물).+(?:추천|보여)/,  // 적정가/시세는 price_analysis에서 처리
    // 예산 패턴 (지역 없어도)
    /^\d+(?:\.\d+)?억(대|\s*이하|\s*이상|\s*정도|\s*까지|\s*안에서|~)?\s*(추천|아파트|단지|보여)?$/,
    /\d+~\d+억\s*(아파트|단지|추천|보여)?/,
    /\d+억(대)?\s*(아파트|단지|추천|이하|이상|정도|보여|알려)/,
    /\d+억\s*(이하|미만|까지)\s*(추천|보여|알려)?/,
    // 예산 역순 (예산+지역)
    /^\d+억\s*[가-힣]/,
    /^\d+억(대)?\s*[가-힣]/,
    // 장소 형태 선호
    /(?:공원|자연|녹지)\s*(?:가까운|근처|옆)\s*(?:아파트|단지|집)?/,
    /(?:부모님|어르신|노인)\s*(?:모실|위한|좋은)\s*(?:곳|아파트|단지)?/,
    // 전세로 살 곳 찾기 (전세+살다/구하다)
    /전세\s*(로|로\s*살|로\s*구할|살\s*곳)/,
    // 형용사 + 아파트/단지 = 추천 요청
    /(?:조용한?|한적한?|쾌적한?|깨끗한?)\s*(동네|곳|아파트|단지|아파?)/,
    /(?:교통|역세권)\s*(좋은|편한)\s*(아파트|단지|곳)/,
    // 지역+투자/실거주 목적 + 단독 목적어
    /[가-힣]+\s+(투자용|실거주용|투자|실거주)$/,
    /^(투자용으로|투자용|실거주용으로|실거주용)$/,
    // 지역+역세권+면적 (단지명 없음)
    /[가-힣]+\s+역세권\s+\d+/,
    // 소형 예산+면적 조합
    /\d+억\s+소형|소형\s+\d+억/,
    // 살기 좋은 곳
    /살기\s*(좋은|좋아|괜찮은)\s*(곳|동네|아파트)/,
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
    /학군\s*(으로|위주|중심)\s*(바꿔|변경)/,  // 명확한 변경 의도만
    /역세권\s*(으로|위주|중심)\s*(바꿔|변경)/,
  ]],

  // unknown_followup — 맥락 없는 짧은 후속
  [NLU_INTENTS.UNKNOWN_FOLLOWUP, [
    /^(음|흠|아|오|어|글쎄|모르겠|잘\s*모르|생각\s*중|그냥|뭐든|상관\s*없|잘\s*모르겠|음+|흠+)$/,
    /^(ㅋ+|ㅎ+|ㅇ+)$/,
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
    /최근\s*(거래|실거래|가격|실가|거래가)/,
    /실거래\s*(가|가격|내역|조회|보여|알려|확인|는|이)?/,
    /거래\s*(내역|조회|현황|보여|흐름|추이|얼마)/,
    /얼마에\s*(팔렸|거래|거래됐|팔았)/,
    /최근\s*(거래\s*흐름|거래\s*추이|얼마에)/,
    /언제\s*(거래|팔렸|팔았)/,
    /몇\s*(억에|천에)\s*(팔렸|거래)/,
    /실제\s*(거래|매매)\s*(가격|가|얼마)/,
    /거래\s*(가격|내역)\s*(보여|알려|확인)/,
    /최근\s*(매매|거래가)\s*(얼마|어떻게|어떠)/,
  ]],

  [NLU_INTENTS.BUY_OPINION, [
    /지금\s*(사도|살)\s*(돼|될까|되나|좋아|괜찮)/,
    /살\s*만\s*(해|한가|할까|한지)/,
    /매수\s*(적기|타이밍|의견|판단|해도)/,
    /지금\s*(매수|살|사기)\s*(괜찮|좋아|어때|적당)/,
    /사는\s*(게|것이|거이)\s*(좋을까|나을까|어떨까)/,
    /매수\s*(의견|하면|할까|해도\s*될까)/,
    /지금\s*살\s*(때야|때인가|때가)/,
    /(매수|구입)\s*(추천|할만|권고)/,
    /살\s*(까|까요|래|래요)\s*\??$/,
    /사\s*(도\s*돼|도\s*될까|도\s*되나)/,
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
    /적정\s*(가|가격|가는|가가)/,
    /얼마야|얼마임|얼마에요|얼마예요|얼마죠/,
    /시세\s*(얼마|확인|가|는|알려)/,
    /분석\s*(해줘|해주세요|해봐|부탁)/,
    /비싸|싸게|적당한지|적당해|적당하게/,
    /[가-힣].+(?:아파트|단지).+(?:적정가|시세|얼마)/,
    /가격\s*(분석|확인|어떠|어때|알려)/,
    /지금\s*(가격|시세)\s*(얼마|어떻게|어떠|알려)/,
    /가격이\s*(적당|맞|맞나|맞아|합리)/,
    /얼마\s*(짜리|정도|쯤)/,
    /시세\s*(파악|알고|보여|알려)/,
    /가격\s*(어때요|어떤가|알아봐)/,
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

  // 2. 엔티티 기반 Context-aware 분류 (일반화 규칙 A~F)
  const hasComplex  = !!state.currentComplex;
  const hasArea     = !!state.currentArea;
  const hasBudget   = !!entities.budget;
  const hasRegion   = !!(entities.sigungu || entities.regionArea || entities.dong);
  const hasFamily   = !!entities.family;
  const hasPurpose  = !!entities.purpose;
  const hasCommute  = !!entities.commute;
  const hasArea2    = entities.areaSqm != null || entities.areaRange != null;
  const hasComplex2 = !!entities.complexQuery;   // 실제 단지명 힌트
  const hasBrand    = !!entities.brand;

  // ── Context 슬롯 우선 ──
  if (state.pendingSlot === "area" && hasArea2) {
    return { intent: NLU_INTENTS.AREA_SELECT, confidence: 0.92 };
  }
  if (state.pendingSlot === "candidate" && /^\d+$/.test(t)) {
    return { intent: NLU_INTENTS.CANDIDATE_SELECT, confidence: 0.9 };
  }

  // ── Rule C: 단지명이 명확할 때만 search_complex ──
  const hasGenericObjectWord = /아파트|단지|집|매물/.test(lower);
  const hasConditionWithObject = hasArea2 && hasGenericObjectWord;

  if (hasConditionWithObject && hasRegion) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.87 };
  }

  if (hasComplex2 && !hasBrand && !hasRegion && !hasGenericObjectWord) {
    // 단지명만 있음 → search
    return { intent: NLU_INTENTS.SEARCH_COMPLEX, confidence: hasArea2 ? 0.88 : 0.75 };
  }
  if (hasComplex2 && !hasBrand && hasRegion && !hasGenericObjectWord) {
    // 단지명 + 지역 → search
    return { intent: NLU_INTENTS.SEARCH_COMPLEX, confidence: 0.82 };
  }

  // ── 추가: complexQuery만 있고 지역/브랜드 없으면 → search ──
  if (hasComplex2 && !hasRegion && !hasBrand && !hasGenericObjectWord) {
    return { intent: NLU_INTENTS.SEARCH_COMPLEX, confidence: 0.75 };
  }

  // ── Rule D: 브랜드명 + 지역 → 후보 추천 ──
  if (hasBrand && hasRegion) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.82 };
  }

  // ── Rule B: 지역 + 조건 → 추천 ──
  // 지역만 있어도 추천, 예산/가족/목적/면적 있으면 추천 우선
  if (hasRegion && (hasBudget || hasFamily || hasPurpose || hasCommute || hasArea2 || entities.preference)) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.85 };
  }

  // 지역만 → 추천 (후보 조회)
  if (hasRegion && !hasComplex2 && !hasBrand) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.70 };
  }

  // 예산 + 가족/목적 → 추천
  if (hasBudget || hasFamily || (hasPurpose && !hasComplex2) || hasCommute) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.78 };
  }

  return { intent: NLU_INTENTS.UNKNOWN, confidence: 0 };
}
