/**
 * src/parser/intentDictionary.js
 *
 * Intent 판별용 키워드 사전 (Intent Vocabulary).
 *
 * 배경: fairValueParser.js의 FAIR_VALUE_RE를 regex로 계속 길게
 * 확장하는 방식은 "땜질"이다. 실제 문제는 regex 구조가 아니라
 * 사전(vocabulary)이 부족한 것이었다 (예: "매매가", "사도 돼").
 *
 * 원칙:
 *   - 새로운 사용자 표현이 발견되면 이 파일의 배열에 문자열만 추가한다.
 *   - Parser(fairValueParser.js)의 로직/구조는 절대 수정하지 않는다.
 *   - 정규식 빌드는 buildIntentRegex()가 자동으로 처리한다.
 */

// ─────────────────────────────────────────────
// FAIR_VALUE: 적정가/시세 조회 의도
// ─────────────────────────────────────────────
export const FAIR_VALUE_KEYWORDS = [
  '얼마', '시세', '가격', '매매가', '적정', '적당', '분석', '평가', '판단',
  '비싼', '싼가', '싸', '괜찮', '저평가', '고평가', '거품',
  '봐줘', '알려줘', '확인', '조회', '어때', '어떤가', '어떠', '적정가',
];

// ─────────────────────────────────────────────
// BUY: 매수 의도 (활용형 포함 — "사도 돼/되나/될까요", "살까/살만")
// ─────────────────────────────────────────────
export const BUY_KEYWORDS = [
  '살\\s*만한?', '살까', '사도\\s*돼', '사도\\s*되나', '사도\\s*될까',
  '살지', '매수', '투자',
];

/**
 * 키워드 배열 → 하나의 정규식으로 결합.
 * 키워드 안의 \s* 같은 정규식 패턴은 그대로 보존하고,
 * 순수 텍스트 키워드는 특수문자 이스케이프 처리한다.
 */
function buildIntentRegex(keywords) {
  const parts = keywords.map(kw =>
    /[\\^$.*+?()[\]{}|]/.test(kw) ? kw : kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  return new RegExp(parts.join('|'));
}

export const FAIR_VALUE_RE = buildIntentRegex(FAIR_VALUE_KEYWORDS);
export const BUY_RE        = buildIntentRegex(BUY_KEYWORDS);
