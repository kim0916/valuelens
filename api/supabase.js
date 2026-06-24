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
      // ── 브랜드 표기 정규화 (DB 저장명 기준) ──
      // 국토부 실거래 원본 표기와 일반 사용자 입력 표기 차이 흡수
      const BRAND_ALIAS = {
        '헤링턴': '해링턴',   // Harrington: 국토부는 "해링턴" 표기
        '더샾':   '더샵',     // The Sharp: 국토부는 "더샵" 표기
        '레미안': '래미안',   // Raemian: 일부 지역 "래미안" 표기
      };
      let normalizedName = name;
      for (const [from, to] of Object.entries(BRAND_ALIAS)) {
        if (normalizedName.includes(from)) {
          normalizedName = normalizedName.split(from).join(to);
          console.log(`[search] 브랜드 정규화: "${name}" → "${normalizedName}" (${from}→${to})`);
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
      }

      // 검색명 처리:
      // 1) 특수문자(괄호,하이픈 등) 포함 시 → .ilike() 직접 사용 (Supabase .or() 파서가 괄호를 그룹 연산자로 오인)
      // 2) 공백 포함 시 → 공백제거+원본 두 버전 OR 검색 (DB에 공백 포함 단지명 존재)
      // 3) 일반 단지명 → 공백제거 단일 ilike
      const nameNoSpace = searchName.replace(/\s/g, '');
      const nameOrig    = searchName.trim();
      const hasSpecial  = /[()\[\]\-·,]/.test(nameOrig);
      const hasSpace    = nameNoSpace !== nameOrig;

      let query = supabase
        .from('realestate_complexes')
        .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
        .order('sale_cnt', { ascending: false })
        .limit(limit);

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

      const { data, error } = await query;
      if (error) throw error;

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
