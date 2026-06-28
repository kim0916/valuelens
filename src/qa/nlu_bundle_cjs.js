// ValueLens NLU Bundle
/**
 * ValueLens NLU — normalizeRealEstateTerms.js
 *
 * 사용자 입력의 부동산 표현을 표준 형태로 정규화한다.
 * - 오타/약자 → 정확한 단지명/브랜드
 * - 평형 표현 → 전용㎡
 * - 지역 약칭 → 표준 행정구역
 * ★ 계산 로직 없음. 텍스트 변환만.
 */

// ─────────────────────────────────────────────
// 브랜드 표기 통일
// ─────────────────────────────────────────────
const BRAND_NORMALIZE = {
  // 래미안 계열
  '레미안': '래미안', '레미앙': '래미안', '레이미안': '래미안',
  // 더샵 계열
  '더샾': '더샵', '더쌥': '더샵', '더샵': '더샵',
  // 이편한세상 계열
  'e편한세상': 'e편한세상', '이편한': 'e편한세상', '이편한세상': 'e편한세상',
  'E편한세상': 'e편한세상',
  // 해링턴/헤링턴
  '헤링턴': '해링턴', '헤링톤': '해링턴', '해링톤': '해링턴',
  // 힐스테이트
  '힐스테이': '힐스테이트', '힐테이트': '힐스테이트', '이편한': 'e편한세상',  // '힐스'는 제거 (힐스테이트 안에 포함되어 오작동)
  // 자이
  'xi': '자이', 'XI': '자이',
  // 아이파크
  '아이팍': '아이파크', '아이팍크': '아이파크',
};

// ─────────────────────────────────────────────
// 단지 별칭 → 표준명
// ─────────────────────────────────────────────
const COMPLEX_ALIAS_NLU = {
  '마래푸':  '마포래미안푸르지오',
  '래미안마래푸': '마포래미안푸르지오',
  '헬리오':  '헬리오시티',
  '엘스':    '잠실엘스',
  '잠실엘스': '잠실엘스',
  // 생활권+브랜드 조합 (지역어 제거 후 오류 방지)
  '반포자이': '반포자이',
  '잠실자이': '잠실자이',
  '압구정현대': '압구정현대아파트',
  '대치래미안': '래미안대치팰리스',
  '도곡렉슬': '도곡렉슬',
  // 전체 단지명 별칭 (지역+브랜드+수식어 포함)
  '래미안대치팰리스': '래미안대치팰리스',
  '더샵송도아크베이': '더샵송도아크베이',
  '동래래미안아이파크': '동래래미안아이파크',
  '광명자이위브': '광명자이위브',
  '의정부자이앤위브': '의정부자이앤위브',
  '압구정현대7차': '현대7차(73~77,82,85동)',
  '세이지움개봉': '세이지움개봉',
  '리센츠':  '잠실리센츠',
  '파리오':  '파크리오',
  '파크리오': '파크리오',
  '트리지움': '잠실트리지움',
  '퍼스티지': '래미안퍼스티지',
  '은마':    '은마아파트',
  '타파크':  '타워팰리스',
  '도마포레나': '도마e편한세상포레나',
  '이편한포레나': 'e편한세상포레나',
};

// ─────────────────────────────────────────────
// 평형 표현 → 전용㎡ 변환
// ─────────────────────────────────────────────
const AREA_NORMALIZE = {
  // 국민평형
  '국평': 84, '국민평형': 84, '국민': 84,
  // 평 표현
  '12평': 33, '13평': 36, '14평': 39, '15평': 43,
  '16평': 46, '17평': 49, '18평': 52, '19평': 56,
  '20평': 59, '21평': 62, '22평': 66, '23평': 69,
  '24평': 72, '25평': 75, '26평': 79,
  '27평': 84, '28평': 84, '29평': 84, '30평': 84,
  '31평': 84, '32평': 99, '33평': 99, '34평': 84,
  '35평': 101, '36평': 101, '37평': 110, '38평': 114,
  '39평': 114, '40평': 114, '41평': 119, '42평': 119,
  '43평': 135, '45평': 135, '50평': 165,
  // 타입 표현 (실제 전용㎡)
  '59': 59, '74': 74, '84': 84, '99': 99,
  '101': 101, '114': 114, '119': 119, '132': 132,
  '135': 135, '163': 163,
};

// 평대 표현 → ㎡ 범위
const AREA_RANGE_NORMALIZE = {
  '20평대': { min: 59, max: 72 },
  '30평대': { min: 84, max: 99 },
  '40평대': { min: 114, max: 132 },
  '50평대': { min: 135, max: 165 },
  '소형': { min: 30, max: 60 },
  '중형': { min: 60, max: 100 },
  '대형': { min: 100, max: 999 },
  '큰 평수': { min: 101, max: 999 },
  '작은 평수': { min: 30, max: 66 },
};

// ─────────────────────────────────────────────
// 지역 약칭 → 표준 지역명
// ─────────────────────────────────────────────
const REGION_NORMALIZE = {
  // 신도시/생활권
  '판교': '성남시 분당구 판교',
  '송도': '인천광역시 연수구 송도동',
  '연수동': '인천광역시 연수구',
  '동탄': '화성시 동탄',
  '마곡': '서울특별시 강서구 마곡동',
  '위례': '성남시 위례',
  '검단': '인천광역시 서구 검단',
  '다산': '남양주시 다산동',
  '미사': '하남시 미사동',
  '광교': '수원시 영통구 광교동',
  '분당': '성남시 분당구',
  '일산': '고양시 일산',
  '목동': '서울특별시 양천구 목동',
  '마포': '서울특별시 마포구',
  '서초': '서울특별시 서초구',
  '강동': '서울특별시 강동구',
  '강서': '서울특별시 강서구',
  '강북': '서울특별시 강북구',
  '노원': '서울특별시 노원구',
  '은평': '서울특별시 은평구',
  '중랑': '서울특별시 중랑구',
  '구리': '경기도 구리시',
  '하남': '경기도 하남시',
  '의정부': '경기도 의정부시',
  '평택': '경기도 평택시',
  '세종': '세종특별자치시',
  '창원': '경상남도 창원시',
  '전주': '전라북도 전주시',
  '청주': '충청북도 청주시',
  '광명': '경기도 광명시',
  '의왕': '경기도 의왕시',
  '강남': '서울특별시 강남구',
  // 광역시 도시명
  '부산': '부산광역시',
  '대구': '대구광역시',
  '인천': '인천광역시',
  '광주': '광주광역시',
  '대전': '대전광역시',
  '울산': '울산광역시',
  '수원': '경기도 수원시',
  '성남': '경기도 성남시',
  '의정부': '경기도 의정부시',
  '여의도': '서울특별시 영등포구 여의도동',
  '잠실': '서울특별시 송파구 잠실동',
  '판교': '경기도 성남시 분당구 판교동',
  '광교': '경기도 수원시 영통구 광교동',
  '오송': '충청북도 청주시 흥덕구 오송읍',
  // 강남권
  '잠실': '서울특별시 송파구 잠실동',
  '압구정': '서울특별시 강남구 압구정동',
  '반포': '서울특별시 서초구 반포동',
  '대치': '서울특별시 강남구 대치동',
  '도곡': '서울특별시 강남구 도곡동',
  '개포': '서울특별시 강남구 개포동',
  // 기타
  '상인동': '대구광역시 달서구 상인동',
  '수성구': '대구광역시 수성구',
  '온천동': '부산광역시 동래구 온천동',
  '해운대': '부산광역시 해운대구',
  '동래': '부산광역시 동래구',
  '남천': '부산광역시 수영구 남천동',
};

// ─────────────────────────────────────────────
// 목적 표현 → 표준 purpose
// ─────────────────────────────────────────────
const PURPOSE_NORMALIZE = {
  '실거주': 'live', '실주거': 'live', '살려고': 'live',
  '살 집': 'live', '거주': 'live', '집': 'live',
  '투자': 'invest', '투자용': 'invest', '시세차익': 'invest',
  '갭투자': 'invest', '전세끼고': 'invest',
  '전세': 'jeonse', '임차': 'jeonse', '보증금': 'jeonse',
  '월세': 'jeonse',
  '매수': 'buy', '사려고': 'buy', '살 것': 'buy',
  '팔려고': 'sell', '매도': 'sell',
};

// ─────────────────────────────────────────────
// 가족 유형 표현 → family 태그
// ─────────────────────────────────────────────
const FAMILY_NORMALIZE = {
  '아이': 'children', '자녀': 'children', '아들': 'children',
  '딸': 'children', '애': 'children', '아이둘': 'children',
  '애둘': 'children', '아이 둘': 'children', '두 아이': 'children',
  '초등': 'school_age', '중학': 'school_age', '학군': 'school_age',
  '부모': 'elderly', '어르신': 'elderly', '노인': 'elderly',
  '1인': 'single', '혼자': 'single', '싱글': 'single',
  '신혼': 'newlywed', '신혼부부': 'newlywed',
  '4인': 'family4', '네 식구': 'family4',
};

// ─────────────────────────────────────────────
// 예산 표현 파싱
// ─────────────────────────────────────────────
/**
 * "7억", "7억대", "6~7억", "7억 이하" → { min, max, exact } 만 단위
 */
function parseBudget(text) {
  if (!text) return null;

  // 범위: "6~7억", "6억~7억"
  const rangeM = text.match(/(\d+(?:\.\d+)?)\s*억?\s*[~\-]\s*(\d+(?:\.\d+)?)\s*억/);
  if (rangeM) {
    return {
      min:   Math.round(Number(rangeM[1]) * 10000),
      max:   Math.round(Number(rangeM[2]) * 10000),
      exact: null,
      raw:   text,
    };
  }

  // 이하/미만: "7억 이하"
  const belowM = text.match(/(\d+(?:\.\d+)?)\s*억\s*(이하|미만|까지)/);
  if (belowM) {
    return {
      min:   0,
      max:   Math.round(Number(belowM[1]) * 10000),
      exact: null,
      raw:   text,
    };
  }

  // 이상/초과: "7억 이상"
  const aboveM = text.match(/(\d+(?:\.\d+)?)\s*억\s*(이상|초과|넘는)/);
  if (aboveM) {
    return {
      min:   Math.round(Number(aboveM[1]) * 10000),
      max:   null,
      exact: null,
      raw:   text,
    };
  }

  // 대: "7억대"
  const approxM = text.match(/(\d+(?:\.\d+)?)\s*억대/);
  if (approxM) {
    const base = Math.round(Number(approxM[1]) * 10000);
    return { min: base, max: base + 9999, exact: null, raw: text };
  }

  // 단순: "7억", "7.5억"
  const exactM = text.match(/(\d+(?:\.\d+)?)\s*억/);
  if (exactM) {
    const val = Math.round(Number(exactM[1]) * 10000);
    return { min: val * 0.95, max: val * 1.05, exact: val, raw: text };
  }

  return null;
}

// ─────────────────────────────────────────────
// 텍스트 정규화 메인 함수
// ─────────────────────────────────────────────
/**
 * 입력 텍스트 전처리: 브랜드 통일 + 특수문자 정규화
 */
function normalizeText(text) {
  if (!text) return "";
  let t = text.trim();

  // ㎡ 기호 → 숫자만
  t = t.replace(/(\d+)\s*㎡/g, '$1');
  // 평 기호 정리
  t = t.replace(/(\d+)\s*평형/g, '$1평');
  // 전각 문자 → 반각
  t = t.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

  // 브랜드 정규화 (이미 정확한 이름 포함된 경우 스킵)
  for (const [from, to] of Object.entries(BRAND_NORMALIZE)) {
    // "to"가 이미 텍스트에 있으면 치환 불필요 (힐스→힐스테이트 중복 방지)
    if (t.includes(to)) continue;
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    t = t.replace(re, to);
  }

  return t;
}

/**
 * ValueLens NLU — extractEntities.js
 *
 * 사용자 입력에서 지역/단지/면적/예산/목적/가족 정보를 추출한다.
 * ★ 계산 로직 없음. 정보 추출만.
 */



// ─────────────────────────────────────────────
// 지역 추출
// ─────────────────────────────────────────────
const SIDO_LIST = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const SIGUNGU_PATTERNS = [
  /([가-힣]{2,5}(?:시|군|구))/g,
  /([가-힣]{2,4}동)/g,
];

function extractRegion(text) {
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
  // ★ non-greedy 동명 추출 — 붙여쓰기 "공릉동동신아파트" → "공릉동" 정확히 추출
  const dongRe = /([가-힣]{1,4}?)동/g;
  let dongMatch;
  while ((dongMatch = dongRe.exec(t)) !== null) {
    const core = dongMatch[1];
    if (core.length >= 1) { // 최소 1글자 접두어
      result.dong = core + '동';
      break; // 첫번째 동명만
    }
  }

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

function extractComplexName(text, state = {}) {
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
  // ★ 붙여쓰기 동명 처리: "공릉동동신아파트" → 동명(공릉동) 이후 텍스트만 사용
  // non-greedy로 최단 동명 추출 후 해당 위치 이후를 단지명 후보로
  const dongBoundaryM = textForComplex.match(/[가-힣]{1,4}?동/);
  if (dongBoundaryM) {
    const afterDong = textForComplex.slice(dongBoundaryM.index + dongBoundaryM[0].length).trim();
    // 동 이후에 의미있는 텍스트가 있으면 그것을 단지명 후보로
    const afterClean = afterDong.replace(/[가-힣]{1,5}(?:특별시|광역시|특별자치시|도|시|군|구|읍|면)\s*/g, ' ').trim();
    if (afterClean.length >= 2) {
      textForComplex = afterClean;
    } else {
      // 동 이후에 텍스트가 없으면 기존 방식대로
      textForComplex = textForComplex.replace(/[가-힣]{1,5}(?:특별시|광역시|특별자치시|도|시|군|구|읍|면|동)\s*/g, ' ').trim();
    }
  } else {
    // 행정구역 패턴 제거 (시/구/군/동)
    textForComplex = textForComplex.replace(/[가-힣]{1,5}(?:특별시|광역시|특별자치시|도|시|군|구|읍|면|동)\s*/g, ' ').trim();
  }

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
      // 전체 입력(지역어 제거)이 브랜드보다 길면 → 단지명 전체를 complexQuery로
      const stripped = textForComplex.trim();
      if (stripped.length > bw.length) {
        // 지역어 제거 후 남은 텍스트가 브랜드보다 길면 단지명
        complexQuery = stripped;
        complexName  = stripped;
      } else if (stripped === bw || !stripped) {
        // 브랜드명만 남음 → recommend (지역+브랜드 조합)
        complexQuery = null;
        complexName  = null;
      } else {
        complexQuery = stripped;
        complexName  = stripped;
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
      .replace(/추천|적정가는|적정가|시세는|시세|얼마야|얼마인가|얼마|보여줘|알려줘|비싼가|괜찮아|비교|국평|국민평형|확인해줘|알아봐줘/g, '')
      // ★ 아파트/단지 앞 의도어 제거 (은마아파트시세는 → 은마아파트 → 은마)
      .replace(/아파트(적정가는?|시세는?|얼마야?|얼마인가?|확인|분석|가격)/g, '')
      .replace(/\s+/g, ' ').trim();

    if (cleaned.length >= 2) {
      const m = cleaned.match(/^([가-힣]{2,10}(?:[A-Za-z0-9가-힣]{0,8})?)/);
      if (m && m[1]) {
        let candidate = m[1].trim();
        // 의도어 suffix 먼저 제거 (은마아파트시세는 → 은마아파트)
        candidate = candidate
          .replace(/(적정가는?|시세는?|얼마야?|얼마인가?|확인|분석|가격은?|알려줘|보여줘)$/, '').trim();
        // "아파트/단지" suffix 제거 (홍제아파트→홍제, 동부아파트→동부)
        for (const suffix of ['아파트', '단지', '빌라', '오피스텔']) {
          if (candidate.endsWith(suffix) && candidate.length > suffix.length) {
            candidate = candidate.slice(0, -suffix.length).trim();
            break;
          }
        }
        const isGeneric = GENERIC_WORDS.some(w => candidate === w || candidate.endsWith(w));
        if (!isGeneric && candidate.length >= 2) {
          complexQuery = candidate;
        }
      }
    }
  }

  // ★ Rule A-0: 조건어가 complexQuery의 전부라면 제거
  const CONDITION_WORDS = ['역세권', '학군', '신축', '구축', '대단지', '브랜드', '조용', '편리', '투자', '저렴'];
  if (complexQuery && CONDITION_WORDS.some(w => complexQuery === w)) {
    complexQuery = null;
    complexName = null;
  }

  // ★ Rule A: "아파트/단지/집/매물"이 complexQuery의 전부라면 제거
  // 단, "홍제아파트" 같이 앞에 수식어가 있으면 수식어를 complexQuery로 사용
  const GENERIC_ONLY = ['아파트', '단지', '집', '매물', '부동산', '빌라', '오피스텔'];
  if (complexQuery) {
    // 의도어 suffix 먼저 제거 (은마아파트시세는 → 은마아파트)
    complexQuery = complexQuery
      .replace(/(적정가는?|시세는?|얼마야?|얼마인가?|확인|분석|가격은?|알려줘|보여줘)$/, '').trim();
    complexName = complexQuery;

    const cleaned = complexQuery.replace(/\s/g, '');
    if (GENERIC_ONLY.includes(cleaned)) {
      complexQuery = null;
      complexName  = null;
    } else {
      // "홍제아파트" → "홍제", "은마아파트" → "은마" 추출
      for (const g of GENERIC_ONLY) {
        if (complexQuery.endsWith(g) && complexQuery.length > g.length) {
          complexQuery = complexQuery.slice(0, -g.length).trim();
          complexName  = complexQuery;
          break;
        }
      }
    }
  }

  return { complexName, complexQuery, brand, hasComplexHint: !!(complexName || complexQuery) };
}

// ─────────────────────────────────────────────
// 면적 추출
// ─────────────────────────────────────────────
function extractArea(text) {
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
function extractBudget(text) {
  if (!text) return null;
  return parseBudget(text);
}

// ─────────────────────────────────────────────
// 목적 추출
// ─────────────────────────────────────────────
function extractPurpose(text) {
  const t = text.toLowerCase();
  for (const [expr, purpose] of Object.entries(PURPOSE_NORMALIZE)) {
    if (t.includes(expr)) return purpose;
  }
  return null;
}

// ─────────────────────────────────────────────
// 가족 유형 추출
// ─────────────────────────────────────────────
function extractFamily(text) {
  const t = text;
  for (const [expr, type] of Object.entries(FAMILY_NORMALIZE)) {
    if (t.includes(expr)) return type;
  }
  return null;
}

// ─────────────────────────────────────────────
// 출퇴근 선호 추출
// ─────────────────────────────────────────────
function extractCommute(text) {
  const m = text.match(/([가-힣]+(?:역|센터|구|동)?)\s*(?:출퇴근|통근|출근)/);
  if (m) return m[1];
  if (/강남\s*(?:출퇴근|통근)/.test(text)) return '강남';
  if (/여의도\s*(?:출퇴근|통근)/.test(text)) return '여의도';
  return null;
}

// ─────────────────────────────────────────────
// 선호사항 추출
// ─────────────────────────────────────────────
function extractPreference(text) {
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
function extractEntities(text, state = {}) {
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
const NLU_INTENTS = {
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
  SELL_OPINION:        "sell_opinion",        // 매도 의견 (SellResult 라우팅 금지)
  ASK_PURPOSE:         "ask_purpose",         // 목적 확인 중간 단계
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
    /왜\s*(이런|저런|이렇게|그렇게)\s*(결과|나와|나오)/,  // NLU-0099 수정
    /이유가\s*(뭐|뭔|무엇)/,
    /어떻게\s*(계산|나온|산출)/,
    /실거래.+이유|이유.+실거래/,
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
    // "(어디가|뭐가) 좋아?" 단독은 recommend로 처리 → 여기서는 제거
    // 명시적 비교(A vs B, A랑 B)만 COMPARE
  ]],

  // recommend_complex — 추천 요청
  [NLU_INTENTS.RECOMMEND_COMPLEX, [
    /전세가율.*(추천|아파트|단지)/,   // NLU-0060: 전세가율+추천은 recommend 우선
    // QA 위험패턴 2번: 신축/구축 + 추천 조합 (좁게 — 추천 의도 명시된 경우만)
    /(신축|구축).*(추천|찾아줘|골라줘|보여줘)/,
    /(추천|찾아줘|골라줘).*(신축|구축)/,
    /추천\s*(해줘|해주세요|해봐|좀|아파트|단지)/,
    /(어디가|어떤\s*곳|어떤\s*아파트|좋은\s*곳|살\s*만한\s*곳)\s*(좋|나은|나아|좋아|괜찮)/,
    /(어디가|뭐가)\s*(더\s*)?(나은|좋은|좋아|나아)/,
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

  // change_budget — 반드시 "변경" 의미가 명시된 경우만
  [NLU_INTENTS.CHANGE_BUDGET, [
    /예산\s*(을\s*|이\s*)?(바꿔|올려|내려|줄여|늘려|변경)/,
    /\d+억\s*(으로|로)\s*(바꿔|변경|낮춰|높여)/,
    // "예산 N억" 단독은 recommend로 처리 → CHANGE_BUDGET에서 제거
    // /예산\s*\d+억/,  ← 삭제: "예산 9억 판교 추천" 오인식 방지
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

  // ── 매도 의견 (SellResult 라우팅 금지, 적정가로 우회) ──
  [NLU_INTENTS.SELL_OPINION, [
    /매도\s*(해야|할까|하면|의견|분석|괜찮|타이밍|적기|시점)/,
    /팔\s*(까|면|아야|아도\s*돼|아도\s*될까|아야\s*하나)/,
    /지금\s*(팔면|팔까|파는\s*게)/,
    /언제\s*(팔|매도)/,
    /(처분|매각)\s*(할까|해야|하면)/,
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
    /투자\s*(가치|할만|괜찮|해도|하면)/,
    /투자\s*(가치|성|수익)/,
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
    // QA 위험패턴 3번: "비싸게/싸게 사는 거야?" → price_analysis (cheaper_option 오분류 방지)
    // "사는 거야", "사는 건가", "구입" 컨텍스트가 있으면 price_analysis
    /(비싸게|싸게)\s*사는\s*(거야|건가|거예요|건가요)/,
    /이\s*가격\s*(비싼|싼)\s*(거야|건가|거예요|건가요|편이야|편인가)?/,
    /비싸|싸게|적당한지|적당해|적당하게/,
    /[가-힣].+(?:아파트|단지).+(?:적정가|시세|얼마)/,
    /가격\s*(분석|확인|어떠|어때|알려)/,
    /지금\s*(가격|시세)\s*(얼마|어떻게|어떠|알려)/,
    /가격이\s*(적당|맞|맞나|맞아|합리)/,
    /얼마\s*(짜리|정도|쯤)/,
    /시세\s*(파악|알고|보여|알려)/,
    /가격\s*(어때요|어떤가|알아봐)/,
    /지금\s*(시세|가격)\s*(어때|어때요|어떤가|봐줘|봐)/,  // NLU-0062 수정
    /가격\s*(어떻게|어때|좋아|괜찮)/,                    // NLU-0063 수정
    /시세\s*(어때|어때요|어떻게\s*봐)/,
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
function classifyUserIntent(text, entities = {}, state = {}) {
  const t     = (text || "").trim();
  const lower = t.toLowerCase().replace(/\s+/g, " ");

  // 0. pendingSlot 우선 처리 — 직전 질문 컨텍스트가 패턴 매칭보다 우선
  // P0 fix: "25평" 입력이 SMALLER_AREA 패턴에 걸리는 버그 방지
  if (state.pendingSlot === "area") {
    const pyeongM = t.match(/(\d+)\s*평/);
    const sqmM    = t.match(/(\d+(?:\.\d+)?)\s*(?:㎡|m²|m2)/);
    if (pyeongM || sqmM) {
      return { intent: NLU_INTENTS.AREA_SELECT, confidence: 0.95 };
    }
  }
  if (state.pendingSlot === "candidate" && /^\d+$/.test(t)) {
    return { intent: NLU_INTENTS.CANDIDATE_SELECT, confidence: 0.95 };
  }

  // 1. 패턴 매칭
  // NLU-0060 fix: "전세가율/전세...추천" → jeonse_info 오분류 방지
  if (/추천/.test(lower) && /(전세가율|전세가|전세\s*수익)/.test(lower)) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.88 };
  }

  // QA 위험패턴 3번 fix: "비싸게/싸게 사는 거야?" → cheaper_option 오분류 방지
  // "사는 거야/구입" 컨텍스트 → price_analysis 우선
  if (/(비싸게|싸게)\s*사는\s*(거야|건가|거예요|건가요)/.test(lower) ||
      /이\s*가격\s*(비싼|싼)\s*(거야|건가|거예요|건가요|편이야|편인가)?/.test(lower)) {
    return { intent: NLU_INTENTS.PRICE_ANALYSIS, confidence: 0.90 };
  }

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

  // ── 단지명 vs 추천 판별 핵심 로직 ──
  const hasGenericObjectWord = /아파트|단지|집|매물/.test(lower);

  // 단지명 특성 판별 함수
  // 단지명은: 길거나, 숫자/영문 포함, 브랜드+고유명 결합
  const isLikelyComplexName = (str) => {
    const s = (str || "").trim();
    if (s.length >= 6) return true;          // 6글자 이상
    if (/[0-9A-Za-z]/.test(s)) return true;  // 숫자/영문 포함
    if (/[차기동호]$/.test(s)) return true;  // 차수/동/호 끝
    return false;
  };

  // complexQuery가 있으면 단지명 검색 우선
  if (hasComplex2) {
    // "은마아파트"처럼 아파트 단어 포함해도 단지명이면 search
    // 단, 브랜드명만 + 지역 조합이고 짧으면 추천 (예: "강남 래미안" = 브랜드만)
    const isBrandOnlyWithRegion = hasBrand && hasRegion &&
      entities.complexQuery === entities.brand && // complexQuery가 브랜드명과 동일
      t.includes(" "); // 공백 있어야 추천 (공백 없으면 단지명 붙여쓰기)
    if (isBrandOnlyWithRegion) {
      return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.82 };
    }
    return { intent: NLU_INTENTS.SEARCH_COMPLEX, confidence: 0.82 };
  }

  // complexQuery 없고 브랜드만 있을 때 판별
  if (hasBrand && !hasComplex2 && !hasGenericObjectWord) {
    if (isLikelyComplexName(t)) {
      return { intent: NLU_INTENTS.SEARCH_COMPLEX, confidence: 0.78 };
    }
    if (hasRegion) {
      return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.82 };
    }
    return { intent: NLU_INTENTS.SEARCH_COMPLEX, confidence: 0.72 };
  }

  // 면적+아파트 단어+지역 → 추천
  if (hasArea2 && hasGenericObjectWord && hasRegion) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.87 };
  }

  // 조건어+아파트+지역 → 추천 (역세권, 학군, 신축 등)
  const hasConditionWord = /역세권|학군|신축|구축|조용|편리|대단지|브랜드/.test(lower);
  if (hasConditionWord && hasGenericObjectWord) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.85 };
  }

  // ── Rule B: 지역 + 조건 → 추천 ──
  // 지역만 있어도 추천, 예산/가족/목적/면적 있으면 추천 우선
  if (hasRegion && (hasBudget || hasFamily || hasPurpose || hasCommute || hasArea2 || entities.preference)) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.85 };
  }

  // 지역만 → 추천이 아니라 목적 질문 (공인중개사 방식)
  // 사용자가 지역만 말했을 때 바로 추천 리스트 보여주지 않음
  if (hasRegion && !hasComplex2 && !hasBrand && !hasBudget && !hasArea2 && !hasFamily && !hasPurpose) {
    return { intent: NLU_INTENTS.ASK_PURPOSE, confidence: 0.72 };
  }

  // 예산 + 가족/목적 → 추천
  if (hasBudget || hasFamily || (hasPurpose && !hasComplex2) || hasCommute) {
    return { intent: NLU_INTENTS.RECOMMEND_COMPLEX, confidence: 0.78 };
  }

  return { intent: NLU_INTENTS.UNKNOWN, confidence: 0 };
}

if(typeof module!=='undefined'){module.exports={classifyUserIntent,NLU_INTENTS,extractRegion,extractComplexName,parseBudget,normalizeText};}
