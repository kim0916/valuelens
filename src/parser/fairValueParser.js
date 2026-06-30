import { sqmToPyeong, pyeongToSqm } from '../utils/pyeong.js';
import { FAIR_VALUE_RE, BUY_RE } from './intentDictionary.js';
/**
 * src/parser/fairValueParser.js
 *
 * 역할: 원문에서 Slot 추출만. 추론/정규화/Search 없음.
 *
 * 출력:
 * {
 *   intent:     "FAIR_VALUE" | null
 *   complexRaw: string | null   (원문 그대로, 브랜드 보정 없음)
 *   dong:       string | null
 *   area:       { pyeong, sqm } | null
 *   userPrice:  number | null   (단위: 만원)
 *   noPrice:    boolean
 * }
 */

// ─────────────────────────────────────────────
// 1. Intent 키워드
// ─────────────────────────────────────────────
// FAIR_VALUE_RE는 intentDictionary.js에서 가져옴 (Intent Vocabulary 단일 소스)

// ─────────────────────────────────────────────
// 2. Dong 키워드 (법정동/행정동 패턴)
// ─────────────────────────────────────────────
// [가-힣]{1,4}동 — 단, 단지명 일부가 "동"으로 끝나는 경우 오인식 주의
// "우동"처럼 2글자도 포함
const DONG_RE = /([가-힣]{1,4}동)(?=\s|$)/g;

// 지역 키워드 (동 아닌 경우: 잠실, 반포, 개포 등 단독 지역어)
const REGION_WORDS = [
  '잠실','반포','개포','압구정','청담','도곡','대치','방배','서초','역삼','논현',
  '강남','마포','용산','성수','광진','송파','강동','강서','강북',
  '분당','판교','광교','동탄','위례','일산','평촌','산본','중동',
  '해운대','수영','남천','우동','좌동','송도','연수','부평',
  '수지','죽전','기흥','영통','팔달',
];
const REGION_RE = new RegExp(`(${REGION_WORDS.join('|')})(?=\\s|$)`);

// ─────────────────────────────────────────────
// 3. Area 추출
// ─────────────────────────────────────────────
// 평형 → sqm 매핑 (대표값)
const PYEONG_TO_SQM = [
  { min: 10, max: 16, sqm: 33 },
  { min: 17, max: 19, sqm: 44 },
  { min: 20, max: 22, sqm: 49 },
  { min: 23, max: 26, sqm: 59 },
  { min: 27, max: 29, sqm: 74 },
  { min: 30, max: 35, sqm: 84 },
  { min: 36, max: 39, sqm: 101 },
  { min: 40, max: 45, sqm: 114 },
  { min: 46, max: 55, sqm: 134 },
];

// pyeongToSqm, sqmToPyeong → pyeong.js에서 import

function extractArea(text) {
  // 전용면적 (㎡, m2)
  const sqmMatch = text.match(/전용\s*([0-9]+(?:\.[0-9]+)?)\s*(?:㎡|m2)?/i)
    || text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:㎡|m2)/i);
  if (sqmMatch) {
    const sqm = parseFloat(sqmMatch[1]);
    return { pyeong: sqmToPyeong(sqm).pyeong, sqm };
  }

  // 평형
  const pyeongMatch = text.match(/([0-9]+)\s*평형?대?/);
  if (pyeongMatch) {
    const pyeong = parseInt(pyeongMatch[1]);
    return { pyeong, sqm: pyeongToSqm(pyeong) };
  }

  return null;
}

// ─────────────────────────────────────────────
// 4. Price 추출 (단위: 만원)
// ─────────────────────────────────────────────
function extractUserPrice(text) {
  // "7.5억", "8억", "12억 5천", "9억 5000" 등
  const m = text.match(/([0-9]+(?:\.[0-9]+)?)\s*억\s*([0-9]+)?\s*(천|만)?/);
  if (!m) return null;

  const uk = parseFloat(m[1]);           // 억 단위
  let sub = 0;
  if (m[2]) {
    const n = parseInt(m[2]);
    if (m[3] === '천') sub = n * 1000;
    else if (m[3] === '만') sub = n;
    else sub = n >= 1000 ? n : n * 1000; // "5000" → 5000만, "5" → 5000만
  }
  return Math.round(uk * 10000 + sub);
}

// ─────────────────────────────────────────────
// 5. NoPrice 추출
// ─────────────────────────────────────────────
const NO_PRICE_RE = /몰라|모름|모르겠|모르는데|없어|없음|패스|그냥|skip|상관없|시세로|실거래로|실거래\s*기준|최근\s*거래로|알아서|시세\s*기준|가격\s*몰라|잘\s*모르/i;

function extractNoPrice(text) {
  return NO_PRICE_RE.test(text);
}

// ─────────────────────────────────────────────
// 6. Complex 추출 (원문 그대로, 정규화 없음)
// ─────────────────────────────────────────────
// STOP_WORDS: 단지명으로 오인할 수 있는 단어 제거
const STOP_WORDS = new Set([
  '아파트','적정가','매수','전세','시세','분석','봐줘','알려줘','어때','살까','살만해',
  '가격','얼마','몰라','모름','그냥','시세로','실거래로','추천','좋은','있잖아',
  '거기','그거','해줘','확인','조회','보여줘','전체','전부','이야','인데','이면',
  '이고','알아서','로','은','는','이','가','을','를','에','의','도','만',
  '부터','까지','에서','으로','아무거나','뭐든','뭐나','어디든','아무데나',
  '적당','비싼','싼가','싸','괜찮','저평가','고평가','거품','판단','평가',
  '얼마야','얼마예요','얼마임','얼마나','얼마에요',
  '지금','요즘','현재','요즘','잡아야','급매','호가',
  '기준','전용','평형','대',
  '몰라요','모르는데','모르겠어요',
  '봐줘요','알려줘요','해줘요','봐줄','있나요','할까요','인가요','건가요',
]);

function extractComplexRaw(text) {
  // 숫자 단위 제거 (평, 억, ㎡)
  let cleaned = text
    .replace(/[0-9]+(?:\.[0-9]+)?\s*억\s*[0-9]*\s*(?:천|만)?/g, ' ')
    .replace(/[0-9]+\s*평형?대?/g, ' ')
    .replace(/([0-9]+(?:\.[0-9]+)?)\s*(?:㎡|m2)/gi, ' ')
    .replace(/전용\s*[0-9]+/g, ' ');

  // 동/지역어 제거
  cleaned = cleaned
    .replace(DONG_RE, ' ')
    .replace(REGION_RE, ' ');

  // FAIR_VALUE 키워드 제거
  cleaned = cleaned
    .replace(/얼마야|얼마예요|얼마임|얼마나|얼마에요|얼마 해|얼마/g, ' ')
    .replace(/시세|가격|적정가?|적당|분석|평가|판단|봐줘|알려줘|확인|조회/g, ' ')
    .replace(/살만한|살까|비싼|싼가|괜찮|저평가|고평가|거품|어때|어떤가/g, ' ')
    .replace(/몰라|모름|모르겠|알아서|그냥|시세로|실거래|기준/g, ' ')
    .replace(/지금|요즘|현재|급매|호가|잡아야|인데|건가|인가|할까|나요|가요/g, ' ')
    .replace(/\s+/g, ' ').trim();

  // 토큰 필터
  const tokens = cleaned.split(/\s+/).filter(tok =>
    tok.length >= 2 &&
    !STOP_WORDS.has(tok) &&
    !/^[0-9]/.test(tok) &&
    !/^[가-힣]{1}$/.test(tok)
  );

  if (!tokens.length) return null;
  // 자연어 입력 패턴상 단지명은 거의 항상 질문/의도 표현보다 앞에 온다.
  // "긴 토큰 우선" 규칙은 뒤에 붙은 잡음 텍스트(오타/늘어진 표현 등)가
  // 우연히 더 길 경우 단지명을 잘못 고르는 문제가 있어 "첫 토큰 우선"으로 변경.
  return tokens[0];
}

// ─────────────────────────────────────────────
// 7. Dong 추출
// ─────────────────────────────────────────────
function extractDong(text) {
  // 지역 키워드 먼저 (잠실, 반포 등 "동" 없는 경우)
  const regionMatch = text.match(REGION_RE);
  if (regionMatch) return regionMatch[1];

  // [가-힣]{1,4}동 패턴
  const dongMatches = [...text.matchAll(DONG_RE)].map(m => m[1]);
  if (dongMatches.length > 0) return dongMatches[0];

  return null;
}

// ─────────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────────
export function parseFairValueInput(text) {
  const t = text.trim();

  const isBuy      = BUY_RE.test(t);
  const isFair     = FAIR_VALUE_RE.test(t);
  const intent      = (isBuy || isFair) ? 'FAIR_VALUE' : null; // 분석 의도 자체 (적정가/매수 공통)
  const purpose     = isBuy ? 'buy' : (isFair ? 'fair' : null);
  const area       = extractArea(t);
  const userPrice  = extractUserPrice(t);
  const noPrice    = extractNoPrice(t);
  const dong       = extractDong(t);
  const complexRaw = extractComplexRaw(t);

  return {
    intent:     intent,
    purpose:    purpose,
    complexRaw: complexRaw,
    dong:       dong,
    area:       area,
    userPrice:  userPrice,
    noPrice:    noPrice,
  };
}
