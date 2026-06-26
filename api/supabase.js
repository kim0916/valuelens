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
      // ── 자연어 전처리: 평형 표현 → 면적 힌트 변환 ──
      // 한국 아파트 "N평" = 공급면적 기준 → 전용면적 변환 (전용률 약 77% 적용)
      // 사용자가 말하는 "34평" = 국민평형 = 전용 84㎡
      // 사용자가 말하는 "25평" = 전용 약 59㎡
      const PYEONG_MAP = {
        '국평': 84, '국민평형': 84,    // "국민평형" = 34평 기준 전용84㎡
        '12평': 33, '13평': 36, '14평': 39, '15평': 43, '16평': 46,
        '17평': 49, '18평': 52, '19평': 56, '20평': 59, '21평': 62,
        '22평': 66, '23평': 69, '24평': 72, '25평': 75, '26평': 79,
        '27평': 84, '28평': 84, '29평': 84, '30평': 84, '31평': 84,
        '34평': 84,  // 분양 34평 = 전용 84㎡ (국민평형)
        '32평': 99, '33평': 99,
        '35평': 101,'36평': 101,'37평': 110,'38평': 114,'39평': 114,
        '40평': 114,'41평': 119,'42평': 119,'43평': 135,'45평': 135,
        '50평': 165,'55평': 180,'60평': 198,
      };
      // 입력에서 평형 표현 추출 및 제거
      let nameForSearch = name;
      let pyeongExtractedArea = null;
      // 긴 표현 먼저 (국민평형 > 국평 > N평)
      for (const expr of ['국민평형','국평',...Object.keys(PYEONG_MAP).filter(k=>k!=='국평'&&k!=='국민평형').sort((a,b)=>b.length-a.length)]) {
        if (nameForSearch.includes(expr)) {
          pyeongExtractedArea = PYEONG_MAP[expr];
          nameForSearch = nameForSearch.replace(expr, '').trim();
          console.log(`[search] 평형표현 추출: "${expr}"→${pyeongExtractedArea}㎡, 나머지:"${nameForSearch}"`);
          break;
        }
      }
      // 추출된 면적이 있으면 areaHint로 활용
      if (pyeongExtractedArea && !naturalArea) {
        areaTokens.push(pyeongExtractedArea);
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
      };

      // ── 자연어 파싱 ──
      // "송도 더샵 퍼스트월드 84" → complexCore="더샵퍼스트월드" area=84 regionHint="송도"
      // 숫자만 있는 토큰이 면적(30~200㎡)이면 name에서 제거 + areaSqm 힌트로 활용
      const AREA_RE = /\b(1[0-9]{2}|[3-9][0-9])\b/g;
      const REGION_HINTS = ["송도","판교","동탄","위례","마곡","광교","검단","다산","미사","고덕",
        "상암","마포","강남","잠실","분당","일산","평촌","중동","산본","하남","파주","의정부",
        "수지","동백","행신","일산","평택","청주","천안","아산","광주","목포","창원","부산","대구"];
      const areaTokens = [...name.matchAll(AREA_RE)].map(m=>Number(m[0]));
      const naturalArea = areaTokens.length === 1 ? areaTokens[0] : null;
      // 자연어에서 면적 숫자 제거한 단지명 핵심
      let naturalCore = name.replace(AREA_RE,'').trim();
      // 지역 힌트 앞에서 추출
      let naturalRegion = null;
      for (const rh of REGION_HINTS.sort((a,b)=>b.length-a.length)) {
        if (naturalCore.includes(rh) && !sigungu) {
          naturalRegion = rh;
          // 지역어는 sigungu 힌트로만 쓰고 단지명에서 제거하지 않음 (단지명에 포함될 수 있음)
          break;
        }
      }
      // naturalCore 공백제거
      const naturalCoreNoSpace = naturalCore.replace(/\s/g,'');
      const naturalAreaHint = naturalArea; // 면적 힌트 (검색 결과 필터용)

      // 단순 변환 (DB에 원본 표기 없는 경우)
      let normalizedName = nameForSearch || name;
      for (const [from, to] of Object.entries(BRAND_ALIAS)) {
        if (normalizedName.includes(from)) {
          normalizedName = normalizedName.split(from).join(to);
          console.log(`[search] 브랜드 변환: "${name}" → "${normalizedName}" (${from}→${to})`);
        }
      }

      // 단지 전체명 alias 변환 (BRAND_ALIAS보다 우선)
      const nameNoSpaceForAlias = normalizedName.replace(/\s/g, '');
      let complexAliasMatched = false;
      for (const [from, to] of Object.entries(COMPLEX_ALIAS)) {
        if (nameNoSpaceForAlias === from.replace(/\s/g, '') ||
            normalizedName === from ||
            normalizedName.includes(from)) {
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

        const buildQ = (keyword) => {
          let q = supabase
            .from('realestate_complexes')
            .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
            .order('sale_cnt', { ascending: false })
            .limit(half);
          q = q.ilike('complex_name', `%${keyword}%`);
          if (sigungu) q = q.ilike('sigungu', `%${sigungu}%`);
          if (safeDong) q = q.ilike('legal_dong', `%${safeDong}%`);
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

        res.setHeader('Cache-Control', 's-maxage=3600');
        res.status(200).json({ complexes: merged, aliasMatch, total: merged.length });
        return;
      }

      if (hasSpecial) {
        // 특수문자 포함: .ilike() 직접 사용
        query = query.ilike('complex_name', `%${nameOrig}%`);
      } else if (hasSpace) {
        // 공백 포함: 토큰 분리 → 마지막 토큰=단지명, 앞 토큰=지역 힌트
        // "공릉동 동신" → complex_name ILIKE '%동신%' AND sigungu ILIKE '%공릉동%'
        // "잠실 리센츠" → complex_name ILIKE '%리센츠%' AND sigungu ILIKE '%잠실%'
        // 주의: "동래 래미안아이파크 84" → 마지막 토큰 84는 숫자 → 건너뛰고 공백제거 전체 검색
        const spaceTokens = nameOrig.split(/\s+/).filter(t => t.length >= 1);
        const lastToken = spaceTokens[spaceTokens.length - 1];
        const lastIsNum = /^\d+$/.test(lastToken);
        if (lastIsNum) {
          // 숫자 토큰 제외하고 나머지 공백제거로 검색
          // "동래 래미안아이파크 84" → "동래래미안아이파크" 전체 검색 (지역어도 단지명 일부)
          // "강남 은마 76" → "은마" 검색 + sigungu="강남" 필터 (sigungu는 광역시 전체명 필요)
          const nonNumTokens = spaceTokens.filter(t => !/^\d+$/.test(t));
          const KNOWN_REGIONS = ["강남","서초","송파","강동","마포","용산","성동","광진","노원","강북","성북","은평","서대문","구로","금천","관악","동작","영등포","양천","강서","도봉","중랑","동대문","중구","종로","광명","부천","안양","수원","성남","의정부","고양","남양주","하남","화성","동탄","평택","안산","시흥","파주","양주","김포","광주","이천","오산","군포","의왕","안성","포천","여주","가평","양평","연천","부산","대구","인천","광주","대전","울산","세종","창원","진주","김해","양산","포항","경주","안동","구미","동래","해운대","수영","연제","사상","사하","금정","북구","동구","중구","서구","남구","압구정","반포","대치","도곡","개포","잠실","가락","신천","삼성","역삼","논현","청담","방배","서초동","반포동","이촌","한남","이태원","서빙고","응봉","행당","왕십리","공릉","상계","하계","월계","중계","창동","도봉동","방학","우이","미아","수유","번동","아현","합정","망원","상수","성산","연남","신수","신촌","홍은","홍제","은평","갈현","구산","대조","역촌","불광","증산","수색","오송","세종","효자","온천"];
          const firstNonNum = nonNumTokens[0] || '';
          const isRegion = KNOWN_REGIONS.some(r => firstNonNum === r || firstNonNum.includes(r));
          if (isRegion && nonNumTokens.length >= 2) {
            // 첫 토큰=지역, 나머지=단지명
            const complexPart = nonNumTokens.slice(1).join('');
            query = query.ilike('complex_name', `%${complexPart}%`);
            if (!sigungu) query = query.ilike('sigungu', `%${firstNonNum}%`);
          } else {
            // 전체 공백제거로 단지명 검색 (지역어가 단지명에 포함된 경우)
            const withoutNum = nonNumTokens.join('');
            query = query.ilike('complex_name', `%${withoutNum}%`);
          }
        } else {
          const complexToken = lastToken; // 마지막=단지명
          const regionToken  = spaceTokens.length >= 2 ? spaceTokens[0] : ''; // 첫번째=지역
          query = query.ilike('complex_name', `%${complexToken}%`);
          if (regionToken && !sigungu) query = query.ilike('sigungu', `%${regionToken}%`);
        }
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

      // ── fallback 3: 자연어 core 검색 (면적·지역어 제거 후 단지명 핵심만) ──
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
