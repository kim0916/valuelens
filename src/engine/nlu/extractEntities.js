/**
 * ValueLens NLU — extractEntities.js
 *
 * 사용자 입력에서 지역/단지/면적/예산/목적/가족 정보를 추출한다.
 * ★ 계산 로직 없음. 정보 추출만.
 */

import {
  REGION_NORMALIZE, COMPLEX_ALIAS_NLU, BRAND_NORMALIZE,
  AREA_NORMALIZE, AREA_RANGE_NORMALIZE,
  PURPOSE_NORMALIZE, FAMILY_NORMALIZE,
  parseBudget, normalizeText,
} from './normalizeRealEstateTerms.js';

// ─────────────────────────────────────────────
// 지역 추출
// ─────────────────────────────────────────────
const SIDO_LIST = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const SIGUNGU_PATTERNS = [
  /([가-힣]{2,5}(?:시|군|구))/g,
  /([가-힣]{2,4}동)/g,
];

export function extractRegion(text) {
  const result = { sido: null, sigungu: null, dong: null, area: null };
  const t = normalizeText(text);

  // 생활권/약칭 먼저
  for (const [alias, full] of Object.entries(REGION_NORMALIZE)) {
    if (t.includes(alias)) {
      result.area = alias;
      const parts = full.split(' ');
      if (parts.length >= 3) result.dong = parts[2];
      if (parts.length >= 2) result.sigungu = parts[1];
      result.sido = parts[0];
      return result;
    }
  }

  // 시/도
  for (const sido of SIDO_LIST) {
    if (t.includes(sido)) { result.sido = sido; break; }
  }

  // 구/군/동
  const guM = t.match(/([가-힣]{2,5}(?:시|군|구))/g);
  if (guM) {
    const filtered = guM.filter(g => !SIDO_LIST.includes(g.replace(/시$/, '')));
    if (filtered[0]) result.sigungu = filtered[0];
  }
  const dongM = t.match(/([가-힣]{1,4}동(?!\s*아파트|\s*래미안|\s*자이|\s*한화|\s*힐스))/g);
  if (dongM && dongM[0]) result.dong = dongM[0];

  return result;
}

// ─────────────────────────────────────────────
// 단지명 추출
// ─────────────────────────────────────────────
const BRAND_WORDS = [
  '래미안', '자이', '푸르지오', '힐스테이트', '더샵', 'e편한세상', '이편한세상', '이편한',
  '아이파크', '롯데캐슬', '한화포레나', '우미린', '해링턴', '포레나',
  '파크리오', '리센츠', '엘스', '트리지움', '헬리오시티', '그라시움',
  '아르테온', '마포래미안', '레미안', '현대', '주공', 'sk뷰', '두산',
];

export function extractComplexName(text, state = {}) {
  const t = normalizeText(text);
  let complexName  = null;
  let complexQuery = null;
  let brand        = null;

  // ★ 지역어/행정구역명은 단지명이 아님 — 먼저 제거
  // REGION_NORMALIZE 키와 일반 행정구역 패턴 제거 후 추출
  let textForComplex = t;
  // 지역 약칭 제거 (잠실, 송도, 판교 등)
  for (const alias of Object.keys(REGION_NORMALIZE)) {
    textForComplex = textForComplex.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'), ' ');
  }
  // 행정구역 패턴 제거 (시/구/군/동)
  textForComplex = textForComplex.replace(/[가-힣]{1,5}(?:특별시|광역시|특별자치시|도|시|군|구|읍|면|동)\s*/g, ' ').trim();

  // 1. 직접 별칭 매칭 (지역어 제거 후)
  for (const [alias, full] of Object.entries(COMPLEX_ALIAS_NLU)) {
    const re = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(t)) {  // 원본에서 체크 (별칭은 단지명이므로 OK)
      complexName  = full;
      complexQuery = full;
      return { complexName, complexQuery, brand };
    }
  }

  // 2. 브랜드명 감지 (지역어 제거된 텍스트에서 추출)
  for (const bw of BRAND_WORDS) {
    if (t.includes(bw)) {
      brand = bw;
      // 브랜드 앞뒤에서 지역어 제외한 수식어만 포함
      const re = new RegExp(`([가-힣A-Za-z0-9]{1,6})?${bw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([가-힣A-Za-z0-9]{0,10})`, 'i');
      const m = textForComplex.match(re);  // 지역어 제거된 텍스트에서
      if (m && m[0].trim()) {
        complexQuery = m[0].trim();
        complexName  = complexQuery;
      } else {
        // 브랜드명만 있고 앞뒤 수식어 없음 → 지역+브랜드 조합 → recommend
        complexQuery = null;
        complexName  = null;
      }
      break;
    }
  }

  // 3. 한글 2글자 이상 패턴 — 지역어 제거된 텍스트에서만 추출 (Rule A)
  if (!complexName) {
    const GENERIC_WORDS = [
      '아파트', '단지', '집', '매물', '부동산', '빌라', '오피스텔',
      '이하', '이상', '이내', '정도', '대략', '근처', '주변',
      '학군', '출퇴근', '실거주', '투자', '투자용', '추천', '적정가', '시세',
      '괜찮은', '좋은', '저렴한', '싼', '비싼', '넓은', '좁은',
      '어떤', '어디', '무슨', '어디가', '뭐가', '보여줘', '알려줘',
      '보고싶어', '궁금해', '확인', '비교', '얼마야', '얼마',
      '아이', '자녀', '신혼', '부모님', '어르신', '가족', '학생',
      // 후속 의도어 — 단지명이 아님
      '전세는', '전세', '월세', '최근거래', '거래는', '최근', '학군은', '학교는',
      '지금', '사도돼', '살만해', '팔까', '팔려고', '팔아야',
      '왜', '어떻게', '계산', '이유', '분석', '결과',
    ];
    // 의도어/평형어 제거 후 남은 텍스트에서 단지명 추출
    const cleaned = textForComplex
      .replace(/\d+(?:평대|평형|평|㎡|억|만)/g, '')  // 평형/예산 제거
      .replace(/추천|적정가|시세|얼마야|보여줘|알려줘|비싼가|괜찮아|비교|얼마|국평|국민평형/g, '')
      .replace(/\s+/g, ' ').trim();

    if (cleaned.length >= 2) {
      const m = cleaned.match(/^([가-힣]{2,10}(?:[A-Za-z0-9가-힣]{0,8})?)/);
      if (m && m[1]) {
        const candidate = m[1].trim();
        const isGeneric = GENERIC_WORDS.some(w => candidate === w || candidate.endsWith(w));
        if (!isGeneric && candidate.length >= 2) {
          complexQuery = candidate;
        }
      }
    }
  }

  // ★ Rule A: "아파트/단지/집/매물"이 complexQuery의 전부라면 제거
  const GENERIC_ONLY = ['아파트', '단지', '집', '매물', '부동산', '빌라', '오피스텔'];
  if (complexQuery && GENERIC_ONLY.includes(complexQuery.replace(/\s/g, ''))) {
    complexQuery = null;
    complexName  = null;
  }

  return { complexName, complexQuery, brand, hasComplexHint: !!(complexName || complexQuery) };
}

// ─────────────────────────────────────────────
// 면적 추출
// ─────────────────────────────────────────────
export function extractArea(text) {
  const t = normalizeText(text);
  let areaSqm  = null;
  let areaType = null;   // "exact" | "range" | "type" | "relative"
  let areaRange = null;

  // 1. 국평/국민평형
  if (/국평|국민\s*평형/.test(t)) {
    return { areaSqm: 84, areaType: 'exact', areaRange: null };
  }

  // 2. N평대 (범위)
  for (const [expr, range] of Object.entries(AREA_RANGE_NORMALIZE)) {
    if (t.includes(expr)) {
      return { areaSqm: null, areaType: 'range', areaRange: range, areaExpr: expr };
    }
  }

  // 3. 상대적 표현
  if (/큰\s*평수|넓은\s*평형|큰\s*집/.test(t)) {
    return { areaSqm: null, areaType: 'relative', areaRange: null, areaDir: 'larger' };
  }
  if (/작은\s*평수|좁은\s*평형|작은\s*집/.test(t)) {
    return { areaSqm: null, areaType: 'relative', areaRange: null, areaDir: 'smaller' };
  }

  // 4. N평 / 국평 정확 변환 — "N평대"는 이미 range로 처리됨, 단독 "N평"만
  const pyeongM = t.match(/(\d+)\s*평(?!형|대|[대])/);
  if (pyeongM) {
    const key = pyeongM[1] + '평';
    if (AREA_NORMALIZE[key]) {
      areaSqm = AREA_NORMALIZE[key];
      areaType = 'exact';
    } else {
      // 변환 없으면 근사
      areaSqm = Math.round(Number(pyeongM[1]) * 3.305785 * 0.75);
      areaType = 'approx';
    }
    return { areaSqm, areaType, areaRange: null };
  }

  // 5. 순수 숫자 또는 텍스트 끝 숫자 (30~200 범위 = 면적)
  // "N평대" 포함 텍스트는 이미 range로 처리됨 → 숫자 오추출 방지
  const hasPyeongdae = /\d+\s*평대/.test(t);
  // "N평대"가 있으면 숫자 단독 추출 금지
  const numM = !hasPyeongdae && (
    t.match(/^(3[0-9]|[4-9][0-9]|1[0-9]{2})([A-Da-d])?$/) ||
    // 끝 숫자: 앞에 "평대" 없는 경우만
    (!hasPyeongdae && t.match(/(3[0-9]|[4-9][0-9]|1[0-9]{2})([A-Da-d])?\s*$/) && !t.match(/\d+\s*평대.+\d/))
  );
  if (numM) {
    const n = Number(numM[1]);
    if (n >= 30 && n <= 200) {
      areaSqm  = n;
      areaType = 'exact';
      return { areaSqm, areaType, areaRange: null, areaSubType: numM[2]?.toUpperCase() || null };
    }
  }

  // 6. 텍스트 중 면적 숫자 (일반 범위 30~200)
  const inlineM = t.match(/\b(3[0-9]|[4-9][0-9]|1[0-9]{2})([A-Da-d])?\b/);
  if (inlineM) {
    areaSqm  = Number(inlineM[1]);
    areaType = 'exact';
    return { areaSqm, areaType, areaRange: null, areaSubType: inlineM[2]?.toUpperCase()||null };
  }

  return { areaSqm, areaType, areaRange };
}

// ─────────────────────────────────────────────
// 예산 추출
// ─────────────────────────────────────────────
export function extractBudget(text) {
  if (!text) return null;
  return parseBudget(text);
}

// ─────────────────────────────────────────────
// 목적 추출
// ─────────────────────────────────────────────
export function extractPurpose(text) {
  const t = text.toLowerCase();
  for (const [expr, purpose] of Object.entries(PURPOSE_NORMALIZE)) {
    if (t.includes(expr)) return purpose;
  }
  return null;
}

// ─────────────────────────────────────────────
// 가족 유형 추출
// ─────────────────────────────────────────────
export function extractFamily(text) {
  const t = text;
  for (const [expr, type] of Object.entries(FAMILY_NORMALIZE)) {
    if (t.includes(expr)) return type;
  }
  return null;
}

// ─────────────────────────────────────────────
// 출퇴근 선호 추출
// ─────────────────────────────────────────────
export function extractCommute(text) {
  const m = text.match(/([가-힣]+(?:역|센터|구|동)?)\s*(?:출퇴근|통근|출근)/);
  if (m) return m[1];
  if (/강남\s*(?:출퇴근|통근)/.test(text)) return '강남';
  if (/여의도\s*(?:출퇴근|통근)/.test(text)) return '여의도';
  return null;
}

// ─────────────────────────────────────────────
// 선호사항 추출
// ─────────────────────────────────────────────
export function extractPreference(text) {
  const prefs = [];
  if (/학군/.test(text)) prefs.push('school');
  if (/조용|한적|주거/.test(text)) prefs.push('quiet');
  if (/교통|역세권|버스|지하철/.test(text)) prefs.push('transit');
  if (/자연|공원|녹지/.test(text)) prefs.push('nature');
  if (/신축|새 아파트|신규/.test(text)) prefs.push('new');
  if (/구축|저렴|가성비/.test(text)) prefs.push('value');
  return prefs.length ? prefs : null;
}

// ─────────────────────────────────────────────
// 전체 엔티티 추출 (메인)
// ─────────────────────────────────────────────
/**
 * @param {string} text — 사용자 입력 원문
 * @param {object} state — 현재 conversationState (context 활용)
 * @returns {object} 추출된 엔티티 전체
 */
export function extractEntities(text, state = {}) {
  const normalized = normalizeText(text);

  const region   = extractRegion(normalized);
  const complex  = extractComplexName(normalized, state);
  const area     = extractArea(normalized);
  const budget   = extractBudget(normalized);
  const purpose  = extractPurpose(normalized);
  const family   = extractFamily(normalized);
  const commute  = extractCommute(normalized);
  const pref     = extractPreference(normalized);

  return {
    // 지역
    sido:        region.sido,
    sigungu:     region.sigungu,
    dong:        region.dong,
    regionArea:  region.area,   // 생활권명 (잠실, 송도 등)

    // 단지
    complexName:  complex.complexName,
    complexQuery: complex.complexQuery,
    brand:        complex.brand,

    // 면적
    areaSqm:     area.areaSqm,
    areaType:    area.areaType,    // exact | range | relative | approx
    areaRange:   area.areaRange,
    areaDir:     area.areaDir,     // larger | smaller
    areaSubType: area.areaSubType, // A/B/C/D 타입

    // 예산
    budget:      budget,

    // 목적/라이프스타일
    purpose:     purpose,
    family:      family,
    commute:     commute,
    preference:  pref,
  };
}
