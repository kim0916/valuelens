/**
 * ValueLens Conversation Engine — intentClassifier.js v2
 * 사용자 입력을 Intent로 분류한다.
 */

// ─────────────────────────────────────────────
// Intent 정의
// ─────────────────────────────────────────────
export const INTENTS = {
  PRICE_ANALYSIS:   "price_analysis",
  JEONSE_INFO:      "jeonse_info",
  BUY_OPINION:      "buy_opinion",
  PRICE_OPINION:    "price_opinion",
  RECENT_DEALS:     "recent_deals",
  SCHOOL_INFO:      "school_info",
  AREA_SELECT:      "area_select",
  CANDIDATE_SELECT: "candidate_select",
  CHANGE_AREA:      "change_area",
  CHANGE_CANDIDATE: "change_candidate",
  CHANGE_REGION:    "change_region",
  CONFIRM:          "confirm",
  DENY:             "deny",
  RESET:            "reset",
  SEARCH_COMPLEX:   "search_complex",
  GREETING:         "greeting",
  UNKNOWN:          "unknown",
};

// ─────────────────────────────────────────────
// 패턴 정의 (순서 중요: 구체적 → 일반)
// ─────────────────────────────────────────────
const INTENT_PATTERNS = [

  // ── 1. 면적 변경 (숫자+바꿔 패턴, 지역 변경보다 먼저) ──
  [INTENTS.CHANGE_AREA, [
    /아니\s*[,\s]+(\d+)\s*(평|㎡)/,
    /아니\s+(그\s*말고|이건|저건|다른)\s*(\d+)\s*(평|㎡)/,
    /(\d+)\s*(평|㎡)(으로|로)\s*(바꿔|변경|해줘)/,
    /(\d+)(으로|로)\s*(바꿔|변경)/,         // "59로 바꿔" — 숫자+로+바꿔
  ]],

  // ── 2. 지역 변경 (숫자 시작 제외) ──
  [INTENTS.CHANGE_REGION, [
    /^(?!\d)(.+?)(으로|로|에서)\s*(바꿔|변경|보여줘|검색|알려줘)/,
    /(.+?)(지역|동네|곳)\s*(으로|로)\s*(바꿔|변경)/,
    /(.+?)\s+(쪽|지역|동)\s*(으로|로|바꿔)/,
  ]],

  // ── 3. 초기화 ──
  [INTENTS.RESET, [
    /^(다시|처음|초기화|리셋|처음부터|다시\s*해줘|다시\s*시작|새로\s*시작)/,
  ]],

  // ── 4. 확인 ──
  [INTENTS.CONFIRM, [
    /^(응|맞아|맞아요|그래|그거|그거야|그렇지|ㅇ|ㅇㅇ|넵|예|yes|ok|맞음|맞다|그래그래|그걸로|그걸로\s*해줘|그게\s*맞아|그거\s*맞아)$/i,
  ]],

  // ── 5. 부정 (단독어만) ──
  [INTENTS.DENY, [
    /^(아니|아니야|아니요|아닌데|틀려|틀렸어|잘못|아님|노|no)$/i,
  ]],

  // ── 6. 다른 후보 ──
  [INTENTS.CHANGE_CANDIDATE, [
    /^(그거\s*말고|다른\s*거|다른\s*단지|말고\s*다른|저거\s*말고|아니고\s*다른)$/,
    /그거\s*말고/,
    /다른\s*(거|단지|걸로)\s*(보여줘|알려줘|없어|있어)?$/,
    /저거\s*(말고|아니고)/,
  ]],

  // ── 7. 후보 번호 선택 (1~9번만) ──
  [INTENTS.CANDIDATE_SELECT, [
    /^([1-9])\s*(번|번째|번\s*거|번\s*단지)?\s*(로\s*해줘|선택|로|거)?$/,
    /^(첫\s*번째|두\s*번째|세\s*번째|넷\s*번째)/,
  ]],

  // ── 8. 전세 ──
  [INTENTS.JEONSE_INFO, [
    /전세|임차|보증금/,
  ]],

  // ── 9. 학군 ──
  [INTENTS.SCHOOL_INFO, [
    /학군|학교|초등|중학|학원가/,
  ]],

  // ── 10. 최근 거래 ──
  [INTENTS.RECENT_DEALS, [
    /최근\s*(거래|실거래|가격|실가)/,
    /실거래\s*(가|가격|내역|조회)/,
    /거래\s*(내역|조회|현황)/,
    /언제\s*(팔렸|거래)/,
    /얼마에\s*(팔렸|거래)/,
  ]],

  // ── 11. 매수 의견 ──
  [INTENTS.BUY_OPINION, [
    /지금\s*(사도|살)\s*(돼|될까|되나|좋아|괜찮)/,
    /사도\s*(될까|돼|좋아)/,
    /살\s*만\s*(해|한가|할까)/,
    /매수\s*(적기|타이밍|해도)/,
  ]],

  // ── 12. 가격 의견 ──
  [INTENTS.PRICE_OPINION, [
    /얼마면\s*(괜찮|적당|좋아|싸)/,
    /어느\s*정도면\s*(적당|괜찮)/,
    /적정\s*(가격|금액)/,
  ]],

  // ── 13. 면적 선택 (30~200 숫자 단독 포함) ──
  [INTENTS.AREA_SELECT, [
    /^(\d+)\s*평\s*$/,
    /^(\d+)\s*(㎡|m2|타입)\s*$/,
    /^(국평|국민\s*평형|국민평형)\s*$/,
    /^(3[0-9]|[4-9][0-9]|1[0-9]{2})\s*(A|B|C|D|a|b|c|d)?$/,  // 30~199 단독
  ]],

  // ── 14. 적정가 분석 ──
  [INTENTS.PRICE_ANALYSIS, [
    /적정\s*(가|가격)/,
    /얼마야|얼마임|얼마\?|얼마에요/,
    /시세\s*(얼마|확인|알려)/,
    /분석\s*(해줘|해주세요)/,
    /비싸|싸게|적당한지/,
    /전세가율/,
  ]],

  // ── 15. 인사 ──
  [INTENTS.GREETING, [
    /^(안녕|안녕하세요|반가워|시작|처음\s*뵙겠)/,
    /^(hi|hello|헬로|하이)(\s|$)/i,
  ]],

];

// ─────────────────────────────────────────────
// 브랜드/단지명 감지
// ─────────────────────────────────────────────
const BRAND_RE = /래미안|레미안|자이|푸르지오|힐스테이트|더샵|e편한|이편한|아이파크|롯데캐슬|한화포레나|우미린|주공|헬리오|그라시움|아르테온|파크리오|리센츠|엘스|마래푸/i;

// ─────────────────────────────────────────────
// 메인 분류 함수
// ─────────────────────────────────────────────
export function classifyIntent(input, state = {}) {
  const t     = (input || "").trim();
  if (!t) return { intent: INTENTS.UNKNOWN, confidence: 0, extracted: {} };
  const lower = t.toLowerCase().replace(/\s+/g, " ");

  // ── 1. 패턴 매칭 ──
  for (const [intent, patterns] of INTENT_PATTERNS) {
    for (const p of patterns) {
      if (p.test(lower)) {
        return { intent, confidence: 0.9, extracted: extractFromInput(t, intent, state) };
      }
    }
  }

  // ── 2. Context-aware ──
  if (state.pendingSlot === "area") {
    // 숫자 단독 (면적 범위)
    const numMatch = t.match(/^(\d+)([A-Da-d])?$/);
    if (numMatch) {
      const n = Number(numMatch[1]);
      if (n >= 30 && n <= 200) {
        return { intent: INTENTS.AREA_SELECT, confidence: 0.9, extracted: { areaSqm: n } };
      }
    }
  }

  if (state.pendingSlot === "candidate") {
    if (/^\d+$/.test(t.trim())) {
      return { intent: INTENTS.CANDIDATE_SELECT, confidence: 0.85, extracted: { index: parseInt(t) - 1 } };
    }
    if (/^(응|그래|그거|맞아|ㅇ|ㅇㅇ|그걸로)$/.test(lower)) {
      return { intent: INTENTS.CONFIRM, confidence: 0.8, extracted: { index: 0 } };
    }
  }

  // ── 3. 단지 검색 추정 ──
  if (BRAND_RE.test(lower) || /[가-힣]{2,}/.test(t)) {
    const hasArea = /\d+\s*(평|㎡)|국평|국민/.test(t);
    return {
      intent: INTENTS.SEARCH_COMPLEX,
      confidence: hasArea ? 0.8 : 0.65,
      extracted: extractFromInput(t, INTENTS.SEARCH_COMPLEX, state),
    };
  }

  return { intent: INTENTS.UNKNOWN, confidence: 0, extracted: {} };
}

// ─────────────────────────────────────────────
// 파라미터 추출
// ─────────────────────────────────────────────
function extractFromInput(text, intent, state) {
  const extracted = {};

  // 순수 숫자 면적 (30~200)
  const pureNum = text.match(/^(3[0-9]|[4-9][0-9]|1[0-9]{2})([A-Da-d])?$/);
  if (pureNum && (intent === INTENTS.AREA_SELECT || intent === INTENTS.CHANGE_AREA)) {
    extracted.areaSqm = Number(pureNum[1]);
    return extracted;
  }

  // 면적 표현 (N평, N㎡)
  const areaM = text.match(/(\d+)\s*(평|㎡|m2)/i);
  if (areaM) {
    const n    = Number(areaM[1]);
    const unit = areaM[2];
    if (unit === "평") {
      extracted.pyeong  = n;
      extracted.areaSqm = pyeongToSqm(n);
    } else {
      extracted.areaSqm = n;
    }
  }

  // 국평
  if (/국평|국민\s*평형/.test(text)) {
    extracted.areaSqm = 84;
    extracted.pyeong  = 34;
  }

  // 번호 추출
  if (intent === INTENTS.CANDIDATE_SELECT) {
    const numM = text.match(/^(\d+)/);
    if (numM) extracted.index = parseInt(numM[1]) - 1;
  }

  // 지역 추출 (change_region)
  if (intent === INTENTS.CHANGE_REGION) {
    const regionM = text.match(/^(.+?)\s*(으로|로|에서)/);
    if (regionM) extracted.region = regionM[1].trim();
  }

  // 단지 검색 쿼리 (면적 힌트도 추출)
  if (intent === INTENTS.SEARCH_COMPLEX) {
    extracted.query = text;
    // 면적 표현 추출 (단지명+면적 동시 입력 케이스)
    if (!extracted.areaSqm) {
      const sqmInQuery = text.match(/(\d+)\s*(평|㎡)/i);
      if (sqmInQuery) {
        const n = Number(sqmInQuery[1]);
        extracted.areaSqm = sqmInQuery[2] === "평" ? pyeongToSqm(n) : n;
      }
      // 붙여쓰기 or 공백+숫자: "잠실엘스84", "래미안 59" → 84/59 추출
      const numAtEnd = text.match(/[가-힣A-Za-z]+\s*(\d{2,3})$/);
      if (!extracted.areaSqm && numAtEnd) {
        const n = Number(numAtEnd[1]);
        if (n >= 30 && n <= 200) extracted.areaSqm = n;
      }
    }
    extracted.complexQuery = text
      .replace(/\d+\s*(평|㎡|m2)/gi, "")
      .replace(/국평|국민\s*평형/g, "")
      .trim();
  }

  return extracted;
}

// ─────────────────────────────────────────────
// 평형 변환
// ─────────────────────────────────────────────
const PYEONG_MAP = {
  20:59, 21:62, 22:66, 23:69, 24:72, 25:75, 26:79,
  27:84, 28:84, 29:84, 30:84, 31:84, 32:99, 33:99,
  34:84,  // 34평 = 국민평형 = 전용 84㎡
  35:101, 36:101, 37:110, 38:114, 39:114, 40:114,
  41:119, 42:119, 43:135, 45:135, 50:165, 55:180, 60:198,
};

export function pyeongToSqm(pyeong) {
  return PYEONG_MAP[pyeong] || Math.round(pyeong * 3.305785 * 0.75);
}

export function sqmToPyeong(sqm) {
  return Math.round(Number(sqm) / 3.305785);
}

export function classifyPureNumber(n, state = {}) {
  if (n >= 30 && n <= 200) return "area";
  if (n >= 1  && n <= 9)  return "candidate";
  return "unknown";
}
