// api/supabase.js
import { createClient } from '@supabase/supabase-js';

const ENV = {
  url:  process.env.SUPABASE_URL,
  anon: process.env.SUPABASE_ANON_KEY,
};

let supabase;
try {
  supabase = createClient(ENV.url, ENV.anon);
} catch(initErr) {
  console.error('[supabase.js] createClient 실패:', initErr);
}

function errRes(res, e, label) {
  console.error(`[supabase.js][${label}]`, e?.message || String(e));
  res.status(500).json({
    ok: false,
    label,
    message: e?.message || String(e),
    env: { hasUrl: !!ENV.url, hasAnon: !!ENV.anon },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용' });
    return;
  }

  if (!supabase) {
    return errRes(res, new Error('supabase client 초기화 실패'), 'init');
  }

  const { type } = req.body || {};

  // ── 1. 단지 검색 ──
  if (type === 'search') {
    const { name, limit = 20 } = req.body;
    let { sigungu, dong } = req.body;
    if (!name) { res.status(400).json({ error: 'name 필수' }); return; }

    // ── sigungu 광역시 정규화 ──
    // 앱/BT_LIST: "부산시 동래구" → DB: "부산광역시 동래구"
    // ilike '%부산시 동래구%' 로는 매칭 실패 → 정규화 필수
    if (sigungu) {
      const METRO_NORM = {
        '부산시': '부산광역시', '대구시': '대구광역시', '인천시': '인천광역시',
        '광주시': '광주광역시', '대전시': '대전광역시', '울산시': '울산광역시',
        '세종시': '세종특별자치시',
      };
      for (const [short, full] of Object.entries(METRO_NORM)) {
        if (sigungu.startsWith(short)) {
          console.log(`[search] sigungu 광역시 정규화: "${sigungu}" → "${sigungu.replace(short, full)}"`);
          sigungu = sigungu.replace(short, full);
          break;
        }
      }
    }

    // ── dong 필터: legal_dong 컬럼 미정비 단지 대비 안전화 ──
    // DB의 legal_dong 컬럼이 null이거나 sigungu 풀주소에만 포함된 경우 dong 필터로 0건 발생
    // → dong은 sigungu 필터가 없을 때만 보조 힌트로 사용, sigungu 있으면 dong 생략
    const safeDong = sigungu ? '' : (dong || '');

    try {
      // ── 자연어 전처리 ──
      const AREA_RE = /\b(1[0-9]{2}|[3-9][0-9])\b/g;
      const REGION_HINTS = ["송도","판교","동탄","위례","마곡","광교","검단","다산","미사","고덕",
        "상암","마포","강남","잠실","분당","일산","평촌","중동","산본","하남","파주","의정부",
        "수지","동백","행신","평택","청주","천안","아산","광주","목포","창원","부산","대구",
        "압구정","반포","대치","도곡","개포","가락","신천","삼성","역삼","논현","청담","행당",
        "공릉","상계","온천","효자","오송","세종"];

      // ① ㎡ 및 독립 평 기호 제거 (PYEONG_MAP 처리 이전)
      // "84㎡" → "84", "84평" → "84 " (단, "34평"처럼 PYEONG_MAP에 있는 건 다음 단계에서 처리)
      let nameForSearch = name
        .replace(/(\d+)㎡/g, '$1 ')     // 84㎡ → 84
        .trim();

      // ② 숫자 면적 추출 (㎡ 제거 후 기준)
      const areaTokensRaw = [...nameForSearch.matchAll(AREA_RE)].map(m=>Number(m[0]));
      const naturalAreaRaw = areaTokensRaw.length === 1 ? areaTokensRaw[0] : null;

      const PYEONG_MAP = {
        '국평': 84, '국민평형': 84,
        '12평': 33, '13평': 36, '14평': 39, '15평': 43, '16평': 46,
        '17평': 49, '18평': 52, '19평': 56, '20평': 59, '21평': 62,
        '22평': 66, '23평': 69, '24평': 72, '25평': 75, '26평': 79,
        '27평': 84, '28평': 84, '29평': 84, '30평': 84, '31평': 84,
        '34평': 84,
        '32평': 99, '33평': 99,
        '35평': 101,'36평': 101,'37평': 110,'38평': 114,'39평': 114,
        '40평': 114,'41평': 119,'42평': 119,'43평': 135,'45평': 135,
        '50평': 165,'55평': 180,'60평': 198,
      };
      let pyeongExtractedArea = null;
      for (const expr of ['국민평형','국평',...Object.keys(PYEONG_MAP).filter(k=>k!=='국평'&&k!=='국민평형').sort((a,b)=>b.length-a.length)]) {
        if (nameForSearch.includes(expr)) {
          pyeongExtractedArea = PYEONG_MAP[expr];
          nameForSearch = nameForSearch.replace(expr, '').trim();
          console.log(`[search] 평형표현 추출: "${expr}"→${pyeongExtractedArea}㎡, 나머지:"${nameForSearch}"`);
          break;
        }
      }
      // areaHint 결정: 평형 표현 변환값 우선 (34평→84), 없으면 숫자 직접 입력
      const resolvedAreaHint = pyeongExtractedArea || naturalAreaRaw || null;

      // PYEONG_MAP에 없는 N평 표현 잔류 처리: "84평" → "84" (기호만 제거)
      // PYEONG_MAP이 이미 처리했으면 nameForSearch에 평이 없으므로 이 replace는 무해
      if (!pyeongExtractedArea) {
        nameForSearch = nameForSearch.replace(/(\d+)\s*평(?!형)/g, '$1 ').trim();
      }

      // ── 별명/줄임말 정규화 ──
      const NICKNAME_MAP = {
        '마래푸':   '마포래미안푸르지오',
        '마래푸4단지': '마포래미안푸르지오4단지',
        '래미안마래푸': '마포래미안푸르지오',
        '아파트':   '',   // 접미사 제거
        'ELCE':     '엘스',
        'elce':     '엘스',
      };
      for (const [nick, real] of Object.entries(NICKNAME_MAP)) {
        const nickLower = nick.toLowerCase();
        const nameLower = nameForSearch.toLowerCase();
        if (nameLower.includes(nickLower)) {
          const replaced = nameForSearch.replace(new RegExp(nick, 'gi'), real).trim();
          console.log(`[search] 별명정규화: "${nameForSearch}" → "${replaced}"`);
          nameForSearch = replaced;
          break;
        }
      }

      // ── 브랜드 표기 정규화 (DB 혼재 대응) ──
      const BRAND_OR_MAP = {
        '레미안':   '래미안',
        '이편한': 'e편한',
        'XI':       '자이',
      };
      const BRAND_ALIAS = {
        '헤링턴': '해링턴',
        '더샾':   '더샵',
        'SK뷰':   'SKVIEW',   // 매교역 SK뷰 → SKVIEW
        'SK VIEW':'SKVIEW',
      };
      // 단지 전체명 표기 불일치 매핑 (사용자 입력 → DB 실제명)
      const COMPLEX_ALIAS = {
        '범어e편한세상':           'e편한세상범어',
        '범어이편한세상':           'e편한세상범어',
        '다산자이아이비플렉스':     '다산자이아이비플레이스',
        '다산이편한세상자이':       '이편한세상자이',    // 공백 없이 → 검색 가능
        '다산이편한세상':           '다산e편한세상더퍼스트',
        '탄현마을10단지신도브래뉴': '탄현마을풍림',
        '탄현마을신도브래뉴':       '탄현마을풍림',
        '검단신도시우미린에듀':     '우미린에듀파크2단지',
        '두산위브더제니스':         '두산위브지웰시티2차',
        '해운대자이2차':           '해운대자이2차1단지',
        '중동롯데1단지':           '중동롯데캐슬',
        '구월롯데':                '구월동롯데',
        '부평삼성래미안':          '삼성래미안부평',
        '래미안온천2단지':         '온천래미안2단지',
        '온천래미안2단지':         '래미안온천2단지',
        '개포주공1단지':           '개포래미안블레스티지',
        '정자동느티마을':          '느티마을(4단지)(공무원)',
        'e편한세상삼덕':           'e편한세상삼덕',
        '잠실엘스84':             '잠실엘스',
        '자양한양':               '자양한양수자인',
        '한양수자인자양':          '자양한양수자인',
        // 새로 추가 (QA 실패 케이스)
        '도마이편한포레나':       '도마e편한세상포레나',
        '도마e편한포레나':        '도마e편한세상포레나',
        '도마포레나':             '도마e편한세상포레나',
        '이편한세상도마':         '도마e편한세상포레나',
        '마래푸':                 '마포래미안푸르지오',
        '압구정현대7차':          '현대7차(73~77,82,85동)',
        '현대7차압구정':          '현대7차(73~77,82,85동)',
        '잠실파크리오':           '파크리오',
        '상계7단지':              '상계주공7',
        '행당서울숲':             '서울숲푸르지오',
        '서울숲행당':             '서울숲푸르지오',
        '매교역SK뷰':             '매교역푸르지오SKVIEW',
        '매교역SKVIEW':           '매교역푸르지오SKVIEW',
        '송도더샵아크베이':       '더샵송도아크베이',
        '아크베이송도':           '더샵송도아크베이',
        '송도아크베이':           '더샵송도아크베이',
        '삼익비치재건축':         '삼익비치',
        '은마아파트':             '은마',
        '반포자이아파트':         '반포자이',
        '엘스아파트':             '잠실엘스',
        '잠실엘스아파트':         '잠실엘스',
        '퍼스트파크송도':         '송도더샵퍼스트파크',
        // 지역+브랜드 역순 alias (오매칭 방지)
        '대치래미안':             '래미안대치팰리스',
        '래미안대치':             '래미안대치팰리스',
        '온천래미안':             '래미안온천2단지',
        '온천동래미안':           '래미안온천2단지',
        '행당서울숲':             '서울숲푸르지오',
        '행당서울숲푸르지오':     '서울숲푸르지오',
        '해운대자이2차':          '해운대자이2차1단지',
        '자이2차해운대':          '해운대자이2차1단지',
        // 역순/지역+단지명 패턴
        '광명자이위브':           '광명아크포레자이위브',
        '자이위브광명':           '광명아크포레자이위브',
        '아크포레광명':           '광명아크포레자이위브',
        '의정부자이앤위브':       '의정부역센트럴자이앤위브캐슬',
        '자이앤위브의정부':       '의정부역센트럴자이앤위브캐슬',
        '센트럴자이의정부':       '의정부역센트럴자이앤위브캐슬',
        '압구정현대':             '현대',  // 압구정 현대 → 현대 + sigungu 압구정
        '현대압구정':             '현대',
        '도마포레나대전':         '도마e편한세상포레나',
        '대전포레나':             '도마e편한세상포레나',
        '온천동래미안아이파크':   '동래래미안아이파크',
        '온천래미안아이파크':     '동래래미안아이파크',
        '우동해운대자이':         '해운대자이2차1단지',
        '해운대자이우동':         '해운대자이2차1단지',
        '아현마포래미안':         '마포래미안푸르지오',
        '마포래미안아현':         '마포래미안푸르지오',
        // ── QA 500건 실패 케이스 보강 ──
        // 잠실
        '잠실파크리오':           '파크리오',
        '잠실리센츠':             '리센츠',
        '엘스잠실':               '잠실엘스',
        // 송도 더샵
        '더샵송도퍼스트파크':     '송도더샵퍼스트파크',  // 앞5글자 검색으로 처리
        '더샵퍼스트파크':         '퍼스트파크',   // fallback에서 연수구 필터로 처리
        '퍼스트파크송도':         '송도더샵퍼스트파크',
        '송도아크베이':           '더샵송도아크베이',
        '아크베이송도':           '더샵송도아크베이',
        // 이편한세상 도마 (대전)
        '이편한세상도마':         '도마e편한세상포레나',
        '이편한도마':             '도마e편한세상포레나',
        '이편한포레나':           '도마e편한세상포레나',
        '도마이편한포레나':       '도마e편한세상포레나',
        '포레나도마':             '도마e편한세상포레나',
        '도마포레나':             '도마e편한세상포레나',
        '이편한도마포레나':       '도마e편한세상포레나',
        // 다산 이편한
        '다산이편한자이':         '다산 이편한세상자이',
        '다산자이이편한':         '다산 이편한세상자이',
        '남양주다산자이':         '다산자이아이비플레이스',  // 실제 매핑
        // 두정역
        '두정역해링턴':           '두정역효성해링턴플레이스',
        '두정역헤링턴':           '두정역효성해링턴플레이스',
        '두정해링턴플레이스':     '두정역효성해링턴플레이스',
        '두정해링턴':             '두정역효성해링턴플레이스',
        // 상계주공
        '상계주공7단지':          '상계주공7',
        '상계7단지':              '상계주공7',
        // 서울숲
        '행당서울숲':             '서울숲푸르지오',
        '서울숲행당':             '서울숲푸르지오',
        '성동서울숲':             '서울숲푸르지오',
        // 수원
        '수원힐푸':               '힐스테이트푸르지오수원',
        '매교힐스테이트':         '힐스테이트푸르지오수원',
        '매교힐스':               '힐스테이트푸르지오수원',
        // 대구
        '만촌화성':               '만촌화성파크드림',
        '수성구만촌':             '만촌화성파크드림',
        '대구만촌':               '만촌화성파크드림',
        // 압구정 현대
        '압구정현대7차':          '현대7차(73~77,82,85동)',
        '현대7차압구정':          '현대7차(73~77,82,85동)',
        '압구정현대':             '현대',
        // 해운대
        '해운대자이2차':          '해운대자이2차1단지',
        '해운대자이2차1단지':     '해운대자이2차1단지',
        // 부산 래미안 온천
        '온천래미안2단지':        '래미안온천2단지',
        '래미안온천':             '래미안온천2단지',
        // 힐스테이트효자
        '힐스테이트효자':         '힐스테이트어울림효자',
        '전주힐스테이트효자':     '힐스테이트어울림효자',
        '효자힐스테이트':         '힐스테이트어울림효자',
        // 광명
        '광명자이위브':           '광명아크포레자이위브',
        '자이위브광명':           '광명아크포레자이위브',
        '아크포레광명':           '광명아크포레자이위브',
      };

      // ── 자연어 파싱 ──
      // "송도 더샵 퍼스트월드 84" → complexCore="더샵퍼스트월드" area=84 regionHint="송도"
      // AREA_RE, REGION_HINTS는 위에서 이미 선언됨
      const areaTokens = [...name.matchAll(AREA_RE)].map(m=>Number(m[0]));
      const naturalArea = areaTokensRaw.length === 1 ? areaTokensRaw[0] : null;
      // 자연어에서 면적 숫자 제거한 단지명 핵심 (nameForSearch 기반)
      let naturalCore = nameForSearch.replace(AREA_RE,'').trim();
      // 지역 힌트 앞에서 추출
      let naturalRegion = null;
      for (const rh of REGION_HINTS.sort((a,b)=>b.length-a.length)) {
        if (naturalCore.includes(rh) && !sigungu) {
          naturalRegion = rh;
          break;
        }
      }
      // naturalCore 공백제거
      const naturalCoreNoSpace = naturalCore.replace(/\s/g,'');
      // 면적 힌트: 숫자 직접 입력 > 평형 표현 변환
      const naturalAreaHint = resolvedAreaHint;

      // 단순 변환 (DB에 원본 표기 없는 경우)
      let normalizedName = nameForSearch || name;
      for (const [from, to] of Object.entries(BRAND_ALIAS)) {
        if (normalizedName.includes(from)) {
          normalizedName = normalizedName.split(from).join(to);
          console.log(`[search] 브랜드 변환: "${name}" → "${normalizedName}" (${from}→${to})`);
        }
      }

      // 단지 전체명 alias 변환 (BRAND_ALIAS보다 우선)
      // 숫자(면적) 제거 후 비교 — '이편한세상 도마 84' → '이편한세상도마'로 alias 매칭
      const nameNoSpaceForAlias = normalizedName.replace(/\s/g, '').replace(AREA_RE, '');
      const nameNoSpaceWithNum  = normalizedName.replace(/\s/g, '');
      let complexAliasMatched = false;
      for (const [from, to] of Object.entries(COMPLEX_ALIAS)) {
        const fromKey = from.replace(/\s/g, '');
        if (nameNoSpaceForAlias === fromKey ||
            nameNoSpaceWithNum  === fromKey ||
            normalizedName === from ||
            normalizedName.includes(from) ||
            nameNoSpaceForAlias.includes(fromKey) && fromKey.length >= 4) {
          console.log(`[search] 단지명 alias 변환: "${normalizedName}" → "${to}"`);
          normalizedName = to;
          complexAliasMatched = true;
          break;
        }
      }

      // OR 검색 추가어 (DB 양쪽 혼재 브랜드)
      // alias 변환된 경우 orVariant 생성 안 함 (래미안온천2단지 → 변환 후 래미안 포함으로 orVariant 오작동 방지)
      let orVariant = null;
      if (!complexAliasMatched) {
      for (const [from, to] of Object.entries(BRAND_OR_MAP)) {
        if (normalizedName.includes(from)) {
          orVariant = normalizedName.replace(from, to);
          console.log(`[search] 브랜드 OR: "${normalizedName}" + "${orVariant}"`);
          break;
        } else if (normalizedName.includes(to)) {
          orVariant = normalizedName.replace(to, from);
          console.log(`[search] 브랜드 OR: "${normalizedName}" + "${orVariant}"`);
          break;
        }
      }
      } // end if(!complexAliasMatched)

      // alias 조회
      const aliasKey = normalizedName.replace(/\s/g, '');
      const { data: aliasData, error: aliasErr } = await supabase
        .from('realestate_complex_aliases')
        .select('real_name, sigungu_hint, complex_id')
        .ilike('search_key', aliasKey)
        .limit(3);
      if (aliasErr) console.warn('[search] alias 조회 경고:', aliasErr.message);

      let searchName = normalizedName;
      let aliasMatch = null;
      if (aliasData && aliasData.length > 0) {
        aliasMatch = aliasData[0];
        searchName = aliasMatch.real_name;
        orVariant = null; // alias 매칭 시 OR 불필요
      }

      // 검색명 처리:
      // 1) 특수문자(괄호,하이픈 등) 포함 시 → .ilike() 직접 사용 (Supabase .or() 파서가 괄호를 그룹 연산자로 오인)
      // 2) OR variant 있음 → 원본 + variant 양쪽 OR 검색 (레미안↔래미안, 이편한↔e편한)
      // 3) 공백 포함 시 → 공백제거+원본 두 버전 OR 검색
      // 4) 일반 단지명 → 공백제거 단일 ilike
      const nameNoSpace = searchName.replace(/\s/g, '');
      const nameOrig    = searchName.trim();
      const hasSpecial  = /[()\[\]\-·,]/.test(nameOrig);
      const hasSpace    = nameNoSpace !== nameOrig;

      let query = supabase
        .from('realestate_complexes')
        .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
        .order('sale_cnt', { ascending: false })
        .limit(limit);

      // OR variant 있을 때: 두 표기 각각 별도 쿼리 후 병합
      // 단, 자연어 숫자 포함 입력 (hasSpace + lastIsNum)은 숫자제거 분기 우선
      const spaceTokensForNum = nameOrig.split(/\s+/).filter(t => t.length >= 1);
      const lastIsNumForOr = spaceTokensForNum.length > 0 && /^\d+$/.test(spaceTokensForNum[spaceTokensForNum.length - 1]);
      if (orVariant && !hasSpecial && (!hasSpace || (!lastIsNumForOr && nameNoSpace.length <= 15))) {
        const half = Math.ceil(limit / 2);
        const varNoSpace = orVariant.replace(/\s/g, '');

        // hasSpace일 때 첫 토큰이 지역어면 sigungu 힌트로 활용
        const KR2 = ["강남","서초","송파","강동","마포","용산","성동","광진","노원","강북","성북","구로","금천","관악","동작","영등포","양천","강서","도봉","중랑","동대문","종로","광명","부천","안양","수원","성남","의정부","고양","남양주","하남","화성","동탄","평택","안산","시흥","파주","부산","대구","인천","대전","울산","세종","창원","진주","김해","양산","포항","경주","안동","구미","동래","해운대","수영","연제","압구정","반포","대치","도곡","개포","잠실","가락","역삼","청담","행당","공릉","상계","아현","우동","온천","효자","오송","광주"];
        let extraSigungu = sigungu;
        if (hasSpace && !sigungu) {
          const spToks = nameOrig.split(/\s+/).filter(t=>t.length>=1);
          const firstSpTok = spToks[0] || '';
          if (KR2.some(r => firstSpTok === r || firstSpTok.includes(r))) {
            extraSigungu = firstSpTok;
          }
        }

        const buildQ = (keyword) => {
          let q = supabase
            .from('realestate_complexes')
            .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
            .order('sale_cnt', { ascending: false })
            .limit(half);
          q = q.ilike('complex_name', `%${keyword}%`);
          if (extraSigungu) q = q.ilike('sigungu', `%${extraSigungu}%`);
          else if (safeDong) q = q.ilike('legal_dong', `%${safeDong}%`);
          return q;
        };

        const [r1, r2] = await Promise.all([buildQ(nameNoSpace), buildQ(varNoSpace)]);
        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;

        // 중복 제거 후 sale_cnt 내림차순 병합
        const seen = new Set();
        const merged = [];
        for (const item of [...(r1.data||[]), ...(r2.data||[])]) {
          if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
        }
        merged.sort((a, b) => (b.sale_cnt||0) - (a.sale_cnt||0));

        if (merged.length > 0) {
          res.setHeader('Cache-Control', 's-maxage=3600');
          res.status(200).json({ complexes: merged, aliasMatch, total: merged.length, ...( (naturalAreaHint) ? {areaHint: naturalAreaHint, regionHint: naturalRegion} : {} ) });
          return;
        }
        // 0건이면 fallback으로 계속
        console.log('[search] orVariant 0건 → fallback 진행');
      }

      if (hasSpecial) {
        // 특수문자 포함: .ilike() 직접 사용
        query = query.ilike('complex_name', `%${nameOrig}%`);
      } else if (hasSpace) {
        // 공백 포함: 스마트 토큰 분리
        const spaceTokens = nameOrig.split(/\s+/).filter(t => t.length >= 1);
        const lastToken = spaceTokens[spaceTokens.length - 1];
        const lastIsNum = /^\d+$/.test(lastToken);
        // 단지 차수 숫자 판별: 1~2자리 단독 숫자는 차수일 수 있음
        // "상계 주공 7" → 7은 차수 → 주공7로 합쳐야 함
        // "잠실 엘스 84" → 84는 면적 → 제거
        // 기준: 숫자가 면적 범위(30~200)이면 면적, 아니면 차수
        const lastNumVal = lastIsNum ? Number(lastToken) : 0;
        const lastNumIsArea = lastIsNum && lastNumVal >= 30 && lastNumVal <= 200;
        const lastNumIsSeq = lastIsNum && (lastNumVal < 30 || lastNumVal > 200); // 차수 (1~29 또는 200+)

        // KNOWN_REGIONS 재사용
        const KR = ["강남","서초","송파","강동","마포","용산","성동","광진","노원","강북","성북","은평","서대문","구로","금천","관악","동작","영등포","양천","강서","도봉","중랑","동대문","중구","종로","광명","부천","안양","수원","성남","의정부","고양","남양주","하남","화성","동탄","평택","안산","시흥","파주","양주","김포","광주","이천","오산","군포","의왕","부산","대구","인천","대전","울산","세종","창원","진주","김해","양산","포항","경주","안동","구미","동래","해운대","수영","연제","압구정","반포","대치","도곡","개포","잠실","가락","역삼","청담","행당","공릉","상계","아현","우동","온천","효자","오송"];

        // 차수 숫자면 단지명에 붙여서 검색
        if (lastNumIsSeq) {
          const joined = spaceTokens.slice(0, -1).join('') + lastToken; // 차수 붙임
          query = query.ilike('complex_name', `%${joined}%`);
        } else {
          // 면적 숫자 제거
          const nonNumTokens = spaceTokens.filter(t => !/^\d+$/.test(t));
          const firstTok = nonNumTokens[0] || '';
          const lastNonNumTok = nonNumTokens[nonNumTokens.length - 1] || '';
          const firstIsRegion = KR.some(r => firstTok === r || firstTok.includes(r) || r.includes(firstTok) && firstTok.length >= 2);
          const lastIsRegion  = nonNumTokens.length >= 2 && KR.some(r => lastNonNumTok === r || lastNonNumTok.includes(r));

        if (lastNumIsArea || firstIsRegion) {
          // 케이스: "강남 은마 76", "대치 래미안", "부산 동래 래미안 84"
          // → 숫자·지역어 제외 나머지가 단지명 핵심
          let regionTok = firstIsRegion ? firstTok : '';
          let complexTokens = nonNumTokens.filter((t,i) => {
            if (i === 0 && firstIsRegion) return false; // 첫 토큰 지역 제외
            return true;
          });
          const complexPart = complexTokens.join('');

          if (complexPart.length >= 2) {
            query = query.ilike('complex_name', `%${complexPart}%`);
            if (regionTok && !sigungu) query = query.ilike('sigungu', `%${regionTok}%`);
          } else {
            query = query.ilike('complex_name', `%${nonNumTokens.join('')}%`);
          }
        } else if (lastIsRegion) {
          const complexPart = nonNumTokens.slice(0, -1).join('');
          query = query.ilike('complex_name', `%${complexPart}%`);
          if (!sigungu) query = query.ilike('sigungu', `%${lastNonNumTok}%`);
        } else {
          const complexToken = lastToken;
          const regionToken  = spaceTokens.length >= 2 ? spaceTokens[0] : '';
          query = query.ilike('complex_name', `%${complexToken}%`);
          if (regionToken && !sigungu) query = query.ilike('sigungu', `%${regionToken}%`);
        }
        } // end else (not lastNumIsSeq)
      } else {
        // 일반: 공백제거 단일 ilike
        query = query.ilike('complex_name', `%${nameNoSpace}%`);
      }

      if (sigungu) query = query.ilike('sigungu', `%${sigungu}%`);
      if (safeDong) query = query.ilike('legal_dong', `%${safeDong}%`);

      let { data, error } = await query;
      if (error) throw error;

      // ── fallback 1: 결과 없으면 sigungu 제거 후 재검색 ──
      if ((!data || data.length === 0) && sigungu) {
        console.log(`[search] fallback: sigungu 제거 후 재검색 "${normalizedName}"`);
        let fbQuery = supabase
          .from('realestate_complexes')
          .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
          .order('sale_cnt', { ascending: false })
          .limit(limit);
        const fbNoSpace = normalizedName.replace(/\s/g, '');
        fbQuery = fbQuery.ilike('complex_name', `%${fbNoSpace}%`);
        const { data: fbData, error: fbErr } = await fbQuery;
        if (!fbErr && fbData && fbData.length > 0) {
          data = fbData;
          console.log(`[search] fallback 성공: ${fbData.length}건`);
        }
      }

      // ── fallback 2: 토큰 역순 검색 (온천래미안2단지 → 래미안온천 커버) ──
      if ((!data || data.length === 0) && normalizedName.replace(/\s/g,'').length >= 4) {
        const tokens2 = normalizedName.trim().split(/\s+/).filter(t=>t.length>=2);
        if (tokens2.length >= 2) {
          const reversed = [...tokens2].reverse().join('');
          console.log(`[search] fallback2: 토큰역순 "${reversed}"`);
          const { data: fb2Data } = await supabase
            .from('realestate_complexes')
            .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
            .ilike('complex_name', `%${reversed}%`)
            .order('sale_cnt', { ascending: false })
            .limit(Math.min(limit, 5));
          if (fb2Data && fb2Data.length > 0) {
            data = fb2Data;
            console.log(`[search] fallback2 토큰역순 성공: ${fb2Data.length}건`);
          }
        }
      }

      // ── fallback 2.5: 지역어+단지명 분리 재검색 ──
      // 조건: 결과 없음 OR 결과가 있지만 지역어와 sigungu가 맞지 않는 오매칭
      const KR3 = ["강남","서초","송파","강동","마포","용산","성동","광진","노원","강북","성북","구로","금천","관악","동작","영등포","양천","강서","도봉","중랑","동대문","종로","광명","부천","안양","수원","성남","의정부","고양","남양주","하남","화성","동탄","평택","안산","시흥","파주","부산","대구","인천","대전","울산","세종","창원","진주","김해","포항","경주","안동","구미","동래","해운대","수영","연제","압구정","반포","대치","도곡","개포","잠실","가락","역삼","청담","행당","공릉","상계","아현","우동","온천","효자","오송"];
      if (hasSpace) {
        const spToks25 = nameOrig.split(/\s+/).filter(t=>t.length>=1&&!/^\d+$/.test(t));
        for (let i = 0; i < Math.min(spToks25.length - 1, 2); i++) {
          const regionCandidate = spToks25[i];
          if (KR3.some(r => regionCandidate === r || regionCandidate.includes(r))) {
            const complexPart = spToks25.slice(i+1).join('');
            if (complexPart.length >= 2) {
              // 결과가 없거나, 결과의 sigungu가 지역어와 맞지 않는 경우 재검색
              const curSigungu = (data&&data[0]?.sigungu)||'';
              const regionMatches = !regionCandidate || curSigungu.includes(regionCandidate);
              if (!data || data.length === 0 || (!sigungu && !regionMatches)) {
                console.log(`[search] fallback2.5: region="${regionCandidate}" complex="${complexPart}" (cur:${curSigungu.slice(0,10)})`);
                let fb25q = supabase
                  .from('realestate_complexes')
                  .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
                  .ilike('complex_name', `%${complexPart}%`)
                  .ilike('sigungu', `%${regionCandidate}%`)
                  .order('sale_cnt', { ascending: false })
                  .limit(Math.min(limit, 8));
                const { data: fb25Data } = await fb25q;
                if (fb25Data && fb25Data.length > 0) {
                  data = fb25Data;
                  console.log(`[search] fallback2.5 성공: ${fb25Data.length}건`);
                  break;
                }
              }
            }
          }
        }
      }

      // ── fallback 2.6: 공백없는 입력에서 지역어 분리 (잠실래미안 → 잠실+래미안) ──
      if ((!data || data.length === 0) && !hasSpace && nameNoSpace.length >= 4) {
        const KR4 = ["강남","서초","송파","강동","마포","용산","성동","광진","노원","강북","성북","구로","금천","관악","동작","영등포","양천","강서","도봉","중랑","동대문","종로","광명","부천","안양","수원","성남","의정부","고양","남양주","하남","화성","동탄","평택","안산","시흥","파주","부산","대구","인천","대전","울산","세종","창원","진주","김해","포항","경주","안동","구미","동래","해운대","수영","연제","압구정","반포","대치","도곡","개포","잠실","가락","역삼","청담","행당","공릉","상계","아현","우동","온천","오송","목동","당산","화곡","신도림","마곡","뚝섬","옥수","금호","행당","왕십리","망우","중계","하계","월계","창동","방학","쌍문","수유","미아","길음","정릉","석계","회기","이문","휘경","신내","묵동","봉화","중화","망원","합정","상수","동교","신수","창전","서교","연남","성산","망원","합정","홍제","홍은","남가좌","북가좌","증산","수색","신사","논현","압구정","청담","도산","삼성","대치","역삼","개포","수서","세곡","자곡","율현","일원","포이","양재","우면","원지","신원","염곡","내곡","신사","방배","서초","반포","잠원","흑석","동작","사당","이수","주성","남성","상도","노량진","본동","영등포","당산","도림","신도림","양평","목동","신정","오목교","가양","등촌","화곡","발산","우장산","방화","개화","공항","마곡","신방화","방화","개화","가양","증미","목동","신목동","당산","양평","문래","영등포","도림","신도림","구로","개봉","천왕","항동","오류","궁동","온수","은행","고척","남구로","가산","독산","시흥","신림","봉천","조원","서원","신사","중앙","미성","청룡","은천","난향","삼성","신림","대학","신대방","상도","흑석","동작","사당","반포","서초","방배","내방","이수","낙성대","봉천","신림","남현","청룡","행운","은천","미성"];
        for (const region of KR4) {
          if (nameNoSpace.startsWith(region)) {
            const brandPart = nameNoSpace.slice(region.length);
            if (brandPart.length >= 2) {
              console.log(\`[search] fallback2.6: region="\${region}" brand="\${brandPart}"\`);
              const { data: fb26Data } = await supabase
                .from('realestate_complexes')
                .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
                .ilike('complex_name', \`%\${brandPart}%\`)
                .ilike('sigungu', \`%\${region}%\`)
                .order('sale_cnt', { ascending: false })
                .limit(Math.min(limit, 10));
              if (fb26Data && fb26Data.length > 0) {
                data = fb26Data;
                console.log(\`[search] fallback2.6 성공: \${fb26Data.length}건\`);
                break;
              }
              // sigungu로 안 되면 legal_dong으로도 시도
              const { data: fb26bData } = await supabase
                .from('realestate_complexes')
                .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
                .ilike('complex_name', \`%\${brandPart}%\`)
                .ilike('legal_dong', \`%\${region}%\`)
                .order('sale_cnt', { ascending: false })
                .limit(Math.min(limit, 10));
              if (fb26bData && fb26bData.length > 0) {
                data = fb26bData;
                console.log(\`[search] fallback2.6b 성공: \${fb26bData.length}건\`);
                break;
              }
            }
          }
        }
      }

      if ((!data || data.length === 0) && naturalCoreNoSpace.length >= 3 && naturalCoreNoSpace !== normalizedName.replace(/\s/g,'')) {
        console.log(`[search] fallback3: 자연어core "${naturalCoreNoSpace}" region="${naturalRegion||''}"`);
        let fb3q = supabase
          .from('realestate_complexes')
          .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
          .ilike('complex_name', `%${naturalCoreNoSpace}%`)
          .order('sale_cnt', { ascending: false })
          .limit(limit);
        if (sigungu) fb3q = fb3q.ilike('sigungu', `%${sigungu}%`);
        else if (naturalRegion) fb3q = fb3q.ilike('sigungu', `%${naturalRegion}%`);
        const { data: fb3Data } = await fb3q;
        if (fb3Data && fb3Data.length > 0) {
          data = fb3Data;
          console.log(`[search] fallback3 자연어core 성공: ${fb3Data.length}건`);
        }
      }

      // ── fallback 4: 앞 5글자 부분검색 ──
      if ((!data || data.length === 0) && normalizedName.length >= 4) {
        const short = normalizedName.replace(/\s/g, '').slice(0, 5);
        console.log(`[search] fallback4: 앞5글자 "${short}"`);
        let fb4Query = supabase
          .from('realestate_complexes')
          .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
          .ilike('complex_name', `%${short}%`)
          .order('sale_cnt', { ascending: false })
          .limit(Math.min(limit, 5));
        if (sigungu) fb4Query = fb4Query.ilike('sigungu', `%${sigungu}%`);
        const { data: fb4Data, error: fb4Err } = await fb4Query;
        if (!fb4Err && fb4Data && fb4Data.length > 0) {
          data = fb4Data;
          console.log(`[search] fallback4 앞5글자 성공: ${fb4Data.length}건`);
        }
      }

      // 면적 힌트 메타 (자연어 입력 시 클라이언트에서 자동 선택용)
      const naturalMeta = naturalAreaHint ? { areaHint: naturalAreaHint, regionHint: naturalRegion } : {};

      res.setHeader('Cache-Control', 's-maxage=3600');
      res.status(200).json({ complexes: data || [], aliasMatch, total: (data || []).length, ...naturalMeta });
    } catch (e) {
      errRes(res, e, 'search');
    }
    return;
  }

  // ── 2. 가격 요약 ──
  if (type === 'summary') {
    const { complex_id, complex_name, sigungu, area_excl } = req.body;
    if (!complex_id && !complex_name) {
      res.status(400).json({ error: 'complex_id 또는 complex_name 필수' });
      return;
    }
    try {
      let query = supabase
        .from('realestate_price_summary')
        .select('*')
        .order('period_ym_end', { ascending: false })
        .limit(1);

      if (complex_id) query = query.eq('complex_id', complex_id);
      // DB sigungu는 "서울특별시 강남구 역삼동" 풀주소, 앱은 "강남구" 전송 → ilike 부분일치
      else {
        query = query.eq('complex_name', complex_name);
        if (sigungu) query = query.ilike('sigungu', `%${sigungu}%`);
      }

      if (area_excl) {
        query = query.gte('area_excl', Number(area_excl) - 1).lte('area_excl', Number(area_excl) + 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.setHeader('Cache-Control', 's-maxage=600');
      res.status(200).json({ summary: (data || [])[0] || null });
    } catch (e) {
      errRes(res, e, 'summary');
    }
    return;
  }

  // ── 3. 면적 목록 ──
  if (type === 'areas') {
    const { complex_id, complex_name, sigungu } = req.body;
    try {
      let query = supabase
        .from('realestate_complexes')
        .select('area_list, complex_name, build_year');

      if (complex_id) query = query.eq('id', complex_id);
      else {
        query = query.eq('complex_name', complex_name);
        // DB sigungu는 "서울특별시 강남구 역삼동" 풀주소, 앱은 "강남구" 전송 → ilike 부분일치
        // 같은 단지명이 여러 지역에 존재 가능 → .single() 대신 .limit(1) 후 첫 번째 사용
        if (sigungu) query = query.ilike('sigungu', `%${sigungu}%`);
      }

      const { data, error } = await query.limit(1);
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const areas = row?.area_list ? JSON.parse(row.area_list) : [];
      res.setHeader('Cache-Control', 's-maxage=3600');
      res.status(200).json({ areas, complex_name: row?.complex_name });
    } catch (e) {
      errRes(res, e, 'areas');
    }
    return;
  }

  // ── 4. 실거래 원본 조회 ──
  // months 파라미터 제거 — DB 적재 전체 범위 반환 (cutoff 없음)

  // ── maintenance 상태 조회 (v6 - 환경변수) ──
  if (type === 'maintenance') {
    const val = process.env.MAINTENANCE_MODE === 'true' ? 'true' : 'false';
    res.json({ value: val });
    return;
  }

  if (type === 'deals') {
    const { complex_id, complex_name, area_excl } = req.body;
    let { sigungu } = req.body;
    const requestedArea = area_excl ? Number(area_excl) : null;

    // 광역시 정규화 (search와 동일)
    if (sigungu) {
      const METRO_NORM = {
        '부산시': '부산광역시', '대구시': '대구광역시', '인천시': '인천광역시',
        '광주시': '광주광역시', '대전시': '대전광역시', '울산시': '울산광역시',
        '세종시': '세종특별자치시',
      };
      for (const [short, full] of Object.entries(METRO_NORM)) {
        if (sigungu.startsWith(short)) {
          sigungu = sigungu.replace(short, full);
          break;
        }
      }
    }

    try {
      // cutoff 없음 — DB에 있는 데이터 전부 반환
      // ⚠️ sales_raw/rent_raw의 complex_id가 NULL이므로 항상 complex_name + sigungu로 조회
      // 필요한 컬럼만 select → 전송량·속도 개선 (select('*') 제거)
      const SALE_COLS = 'complex_name,sigungu,area_excl,deal_amount_man,contract_ym,floor,cancel_date';
      const RENT_COLS = 'complex_name,sigungu,area_excl,deposit_man,monthly_man,contract_ym,floor';
      const baseQ = (table) => {
        const cols = table === 'realestate_sales_raw' ? SALE_COLS : RENT_COLS;
        let q = supabase.from(table).select(cols)
          .order('contract_ym', { ascending: false });
        // complex_name 정확일치 + sigungu 부분일치 (앱은 "강남구" 또는 풀주소 모두 처리)
        q = q.eq('complex_name', complex_name);
        if (sigungu) q = q.ilike('sigungu', `%${sigungu}%`);
        return q;
      };

      let saleData = [], rentData = [];

      if (requestedArea) {
        const [s1, r1] = await Promise.all([
          baseQ('realestate_sales_raw').gte('area_excl', requestedArea - 5).lte('area_excl', requestedArea + 5).limit(200),
          baseQ('realestate_rent_raw').eq('monthly_man', 0).gte('area_excl', requestedArea - 5).lte('area_excl', requestedArea + 5).limit(200),
        ]);
        if (s1.error) throw s1.error;
        if (r1.error) throw r1.error;
        saleData = s1.data || [];
        rentData = r1.data || [];
      }

      if (saleData.length === 0 && rentData.length === 0) {
        const [sAll, rAll] = await Promise.all([
          baseQ('realestate_sales_raw').limit(200),
          baseQ('realestate_rent_raw').eq('monthly_man', 0).limit(200),
        ]);
        if (sAll.error) throw sAll.error;
        if (rAll.error) throw rAll.error;

        const allRows = [...(sAll.data || []), ...(rAll.data || [])];
        const availableAreas = [...new Set(
          allRows.map(r => Number(r.area_excl)).filter(a => a > 0)
        )].sort((a, b) => a - b);

        if (availableAreas.length === 0) {
          res.status(200).json({ saleDeals: [], rentDeals: [], availableAreas: [] });
          return;
        }

        if (requestedArea) {
          const closest = availableAreas.reduce((prev, cur) =>
            Math.abs(cur - requestedArea) < Math.abs(prev - requestedArea) ? cur : prev
          );
          const areaDiff = Math.abs(closest - requestedArea);

          // areaDiff > 10㎡이면 면적 미매칭으로 처리
          if (areaDiff > 10) {
            res.status(200).json({ saleDeals: [], rentDeals: [], availableAreas, areaDiff, noMatch: true });
            return;
          }
          // areaDiff 5~10㎡: 보조 데이터로 반환 (isExpanded 플래그)
          const expandedTol = areaDiff > 5 ? 8 : 3;
          saleData = (sAll.data || []).filter(r => Math.abs(Number(r.area_excl) - closest) <= expandedTol);
          rentData = (rAll.data || []).filter(r => Math.abs(Number(r.area_excl) - closest) <= expandedTol);
        } else {
          saleData = sAll.data || [];
          rentData = rAll.data || [];
        }
      }

      res.setHeader('Cache-Control', 's-maxage=600');
      res.status(200).json({ saleDeals: saleData, rentDeals: rentData });
    } catch (e) {
      errRes(res, e, 'deals');
    }
    return;
  }

  res.status(400).json({ error: 'type은 search | summary | areas | deals 중 하나' });
}
