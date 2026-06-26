// ValueLens Search — 단지명 alias 사전 및 정규화

const BRAND_ONLY_KEYWORDS = [
  '롯데캐슬','힐스테이트','더샵','래미안','자이','푸르지오',
  'e편한세상','아이파크','호반베르디움','SK뷰','한화포레나',
  '우미린','중흥S클래스','부영','주공','한신','현대','대우'
];

// 브랜드 단독 검색 여부 판별
function isBrandOnlySearch(complexName) {
  if (!complexName) return false;
  const nm = complexName.trim();
  return BRAND_ONLY_KEYWORDS.some(b => nm === b || nm === b.replace(/\s/g,''));
}

// 브랜드 단독 검색 시 혼재 위험 경고
function getBrandWarning(complexName, matchedCount) {
  if (!isBrandOnlySearch(complexName)) return null;
  if (matchedCount <= 1) return null;
  return `"${complexName}" 브랜드명이 같은 단지 ${matchedCount}개가 발견됐습니다. ` +
    `정확한 분석을 위해 단지 전체 이름(예: 롯데캐슬골드파크1차)을 입력하세요.`;
}

// ── alias 사전 (검색어 → 실제 국토부 등록명) ──
const APT_ALIAS = {
  // 수완동 자이 → 수완GS자이
  "수완자이":      { sigungu: "광주광역시 광산구 수완동", real: ["수완GS자이"] },
  "수완동자이":    { sigungu: "광주광역시 광산구 수완동", real: ["수완GS자이"] },
  // 검단 푸르지오
  "검단푸르지오":  { sigungu: "인천광역시 서구", real: ["검단신도시푸르지오더베뉴"] },
  // 검단신도시
  "검단신도시":    { sigungu: "인천광역시 서구", real: [
    "검단신도시한신더휴캐널파크(THEHUECANALPARK)",
    "검단신도시푸르지오더베뉴",
    "원당LG자이(원당지구69BL1L)",
    "파라곤센트럴파크",
  ]},
  // 미사강변도시
  "미사강변도시":  { sigungu: "경기도 하남시 망월동", real: [
    "미사레스티아","미사강변 센텀팰리스","미사강변푸르지오",
  ]},
  // 광교중흥
  "광교중흥":      { sigungu: "경기도 수원시 영통구 이의동", real: [
    "광교중흥S클래스센텀", // 존재 시
  ]},
  // 야탑 푸르지오
  "야탑푸르지오":  { sigungu: "경기도 성남시 분당구 야탑동", real: [] }, // 국토부 미등록
  // 이곡성서
  "이곡성서":      { sigungu: "대구광역시 달서구 이곡동", real: [
    "성서2동서화성","성서청남타운","성서우방타운"
  ]},
};

// alias 조회
function resolveAlias(complexName) {
  if (!complexName) return null;
  const key = complexName.replace(/\s/g, "");
  for (const [k, v] of Object.entries(APT_ALIAS)) {
    if (key === k.replace(/\s/g, "") || key.includes(k.replace(/\s/g,""))) {
      return v;
    }
  }
  return null;
}

// 단지명 normalize (공백·특수문자 제거, 소문자)
function normalizeAptName(name) {
  return String(name || "").replace(/\s/g, "").toLowerCase();
}

// [P1 Fix] 단지명 매칭 v3 — 숫자 단지 구분 + 브랜드 prefix 인식
// 변경 이유:
//   v2의 "앞 2자 일치"는 상계주공5↔상계주공7, 래미안퍼스티지↔래미안대치팰리스 등
//   완전히 다른 단지를 동일 단지로 오매칭하는 문제가 있었음.
//
// 새 규칙:
//   E. 숫자 포함 단지명 → 첫 숫자 위치까지 + 1글자 이상 연속 일치 필요
//      (상계주공7 검색 시 상계주공5·상계주공14 차단)
//   F. 브랜드 prefix 단지명 → 브랜드 전체 + 1글자 이상 연속 일치 필요
//      (e편한세상대치 검색 시 e편한세상논현 차단)
//   G. 일반 단지명 → 앞 min(4, len) 자 연속 일치 (기존 2자에서 강화)

// 브랜드 prefix 목록 (길이순 정렬 — 긴 것 우선 매칭)
const BRAND_PREFIXES = [
  'e편한세상', '힐스테이트', '롯데캐슬', '호반베르디움', '한화포레나',
  '중흥s클래스', '푸르지오', '아이파크', '래미안', 'sk뷰', '우미린',
  '더샵', '자이', '한신', '현대', '대우',
];

function _getBrandPrefixLen(base) {
  for (const b of BRAND_PREFIXES) {
    if (base.startsWith(b) && base.length > b.length) return b.length;
  }
  return 0;
}

function _prefixCommon(n, base) {
  let common = 0;
  const minLen = Math.min(n.length, base.length);
  for (let ci = 0; ci < minLen; ci++) {
    if (n[ci] === base[ci]) common++;
    else break;
  }
  return common;
}

function matchAptName(itemName, complexName, exactAptNm) {
  if (!complexName) return true;
  const n = normalizeAptName(itemName);
  const base = normalizeAptName(exactAptNm || complexName);
  if (!n) return false;

  // A: 완전일치
  if (n === base) return true;
  // B: 아파트/apt 접미사 차이
  if (n === base + "아파트" || base === n + "아파트") return true;
  if (n === base + "apt"    || base === n + "apt")    return true;
  // C: exactAptNm 있으면 완전일치만
  if (exactAptNm) return false;
  // D: 브랜드 단독 검색 → 완전일치만
  if (isBrandOnlySearch(complexName)) return n === base;

  const common = _prefixCommon(n, base);

  // E: 숫자 포함 단지명 → 첫 숫자 위치 + 2글자 이상 일치
  //    (상계주공[7] 검색 → 상계주공[5] 차단, 상계주공[14] 차단)
  if (/\d/.test(base)) {
    let digitPos = base.search(/\d/);
    const required = Math.min(digitPos + 2, Math.min(n.length, base.length));
    return common >= required;
  }

  // F: 브랜드 prefix 단지명 → 브랜드 전체 + 1글자 이상 일치
  //    (e편한세상[대치] 검색 → e편한세상[논현] 차단)
  const brandLen = _getBrandPrefixLen(base);
  if (brandLen > 0) {
    const required = Math.min(brandLen + 1, Math.min(n.length, base.length));
    return common >= required;
  }

  // G: 일반 단지명 → 앞 min(4, len) 자 연속 일치 (v2의 2자에서 강화)
  return common >= Math.min(4, Math.min(n.length, base.length));
}

// 전용면적 배열을 평형 그룹으로 묶기 (±2㎡ 이내 = 같은 그룹)
// 반환: [{ rep: 대표면적, areas: [59.97, 59.99, 60.0], pyeong: 25 }, ...]

export {
  BRAND_ONLY_KEYWORDS, isBrandOnlySearch, getBrandWarning,
  APT_ALIAS, resolveAlias, normalizeAptName, matchAptName,
};
