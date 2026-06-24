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
    const { name, sigungu, dong, limit = 20 } = req.body;
    if (!name) { res.status(400).json({ error: 'name 필수' }); return; }

    try {
      // ── 브랜드 표기 정규화 (DB 혼재 대응) ──
      // 국토부 DB에는 두 가지 표기가 혼재함:
      //   레미안(9건) + 래미안(218건), 이편한세상(64건) + e편한세상(240건)
      // 단순 변환 시 한쪽 누락 → OR 검색으로 양쪽 모두 잡음
      // 헤링턴·더샾은 DB에 해당 표기 없음 → 변환 후 단일 검색이 맞음
      const BRAND_OR_MAP = {
        '레미안':   '래미안',     // DB 양쪽 혼재 → OR 검색
        '이편한세상': 'e편한세상', // DB 양쪽 혼재 → OR 검색
        'XI':       '자이',       // 영문 XI 입력 → 자이 OR XI 양쪽 검색
      };
      const BRAND_ALIAS = {
        '헤링턴': '해링턴',  // DB에 헤링턴 없음 → 단순 변환
        '더샾':   '더샵',    // DB에 더샾 없음 → 단순 변환
      };
      // 단지 전체명 표기 불일치 매핑 (사용자 입력 → DB 실제명)
      // 추가 시: 왼쪽=사용자가 입력할 법한 표기, 오른쪽=DB 실제 complex_name
      const COMPLEX_ALIAS = {
        '범어e편한세상':           'e편한세상범어',
        '범어이편한세상':           'e편한세상범어',
        '다산자이아이비플렉스':     '다산자이아이비플레이스',
        '탄현마을10단지신도브래뉴': '탄현마을풍림',
        '탄현마을신도브래뉴':       '탄현마을풍림',
        '검단신도시우미린에듀':     '우미린에듀파크2단지',
        '두산위브더제니스':         '두산위브지웰시티2차',  // 대구 청주 등 구분 필요 시 sigungu로 처리
        '중동롯데1단지':           '중동롯데캐슬',          // 부천 중동
        '구월롯데':                '구월동롯데',
        '부평삼성래미안':          '삼성래미안부평',
        '래미안온천2단지':         '온천래미안2단지',
      };

      // 단순 변환 (DB에 원본 표기 없는 경우)
      let normalizedName = name;
      for (const [from, to] of Object.entries(BRAND_ALIAS)) {
        if (normalizedName.includes(from)) {
          normalizedName = normalizedName.split(from).join(to);
          console.log(`[search] 브랜드 변환: "${name}" → "${normalizedName}" (${from}→${to})`);
        }
      }

      // 단지 전체명 alias 변환 (BRAND_ALIAS보다 우선)
      const nameNoSpaceForAlias = normalizedName.replace(/\s/g, '');
      for (const [from, to] of Object.entries(COMPLEX_ALIAS)) {
        if (nameNoSpaceForAlias === from.replace(/\s/g, '') ||
            normalizedName === from ||
            normalizedName.includes(from)) {
          console.log(`[search] 단지명 alias 변환: "${normalizedName}" → "${to}"`);
          normalizedName = to;
          break;
        }
      }

      // OR 검색 추가어 (DB 양쪽 혼재 브랜드)
      let orVariant = null;
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
      // → sale_cnt 정렬 시 한쪽 표기가 limit 안에서 밀리는 문제 방지
      // 예: 레미안(9건) + 래미안(218건) → 각각 상위 N/2건씩 뽑아 합침
      if (orVariant && !hasSpecial) {
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
          if (dong)    q = q.ilike('legal_dong', `%${dong}%`);
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
        // 공백 포함: 공백제거+원본 OR
        query = query.or(`complex_name.ilike.%${nameNoSpace}%,complex_name.ilike.%${nameOrig}%`);
      } else {
        // 일반: 공백제거 단일 ilike
        query = query.ilike('complex_name', `%${nameNoSpace}%`);
      }

      if (sigungu) query = query.ilike('sigungu', `%${sigungu}%`);
      if (dong)    query = query.ilike('legal_dong', `%${dong}%`);

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

      // ── fallback 2: 여전히 없으면 앞 4글자 부분검색 ──
      if ((!data || data.length === 0) && normalizedName.length >= 4) {
        const short = normalizedName.replace(/\s/g, '').slice(0, 5);
        console.log(`[search] fallback2: 부분검색 "${short}"`);
        let fb2Query = supabase
          .from('realestate_complexes')
          .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
          .ilike('complex_name', `%${short}%`)
          .order('sale_cnt', { ascending: false })
          .limit(Math.min(limit, 5));
        if (sigungu) fb2Query = fb2Query.ilike('sigungu', `%${sigungu}%`);
        const { data: fb2Data, error: fb2Err } = await fb2Query;
        if (!fb2Err && fb2Data && fb2Data.length > 0) {
          data = fb2Data;
          console.log(`[search] fallback2 성공: ${fb2Data.length}건`);
        }
      }

      res.setHeader('Cache-Control', 's-maxage=3600');
      res.status(200).json({ complexes: data || [], aliasMatch, total: (data || []).length });
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
  if (type === 'deals') {
    const { complex_id, complex_name, sigungu, area_excl } = req.body;
    const requestedArea = area_excl ? Number(area_excl) : null;

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
          baseQ('realestate_sales_raw').gte('area_excl', requestedArea - 3).lte('area_excl', requestedArea + 3).limit(200),
          baseQ('realestate_rent_raw').eq('monthly_man', 0).gte('area_excl', requestedArea - 3).lte('area_excl', requestedArea + 3).limit(200),
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
