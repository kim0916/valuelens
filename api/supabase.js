// api/supabase.js — debug version
import { createClient } from '@supabase/supabase-js';

const ENV = {
  url:  process.env.SUPABASE_URL,
  anon: process.env.SUPABASE_ANON_KEY,
};

console.log('[supabase.js] init — hasUrl:', !!ENV.url, 'hasAnon:', !!ENV.anon);

let supabase;
try {
  supabase = createClient(ENV.url, ENV.anon);
  console.log('[supabase.js] createClient 성공');
} catch(initErr) {
  console.error('[supabase.js] createClient 실패:', initErr);
}

function errRes(res, e, label) {
  console.error(`[supabase.js][${label}]`, e);
  res.status(500).json({
    ok: false,
    label,
    message: e?.message || String(e),
    stack: e?.stack || null,
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
  console.log('[supabase.js] type:', type, 'body:', JSON.stringify(req.body).slice(0, 200));

  // ── 1. 단지 검색 ──
  if (type === 'search') {
    const { name, sigungu, dong, limit = 20 } = req.body;
    if (!name) { res.status(400).json({ error: 'name 필수' }); return; }

    try {
      // alias 조회
      const aliasKey = name.replace(/\s/g, '');
      const { data: aliasData, error: aliasErr } = await supabase
        .from('realestate_complex_aliases')
        .select('real_name, sigungu_hint, complex_id')
        .ilike('search_key', aliasKey)
        .limit(3);
      if (aliasErr) console.warn('[search] alias 조회 경고:', aliasErr.message);

      let searchName = name;
      let aliasMatch = null;
      if (aliasData && aliasData.length > 0) {
        aliasMatch = aliasData[0];
        searchName = aliasMatch.real_name;
      }

      // complexes 조회
      let query = supabase
        .from('realestate_complexes')
        .select('id, complex_name, sigungu, sido, sigungu_short, legal_dong, road_addr, build_year, sale_cnt, rent_cnt, last_sale_ym, last_rent_ym, area_list')
        .ilike('complex_name', `%${searchName.replace(/\s/g,'')}%`)
        .order('sale_cnt', { ascending: false })
        .limit(limit);

      if (sigungu) query = query.ilike('sigungu', `%${sigungu}%`);
      if (dong)    query = query.ilike('legal_dong', `%${dong}%`);

      const { data, error } = await query;
      if (error) throw error;

      console.log('[search] 결과:', data?.length, '건, searchName:', searchName);
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
      else query = query.eq('complex_name', complex_name).eq('sigungu', sigungu);

      if (area_excl) {
        query = query.gte('area_excl', Number(area_excl) - 1).lte('area_excl', Number(area_excl) + 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      console.log('[summary] 결과:', data?.length, '건');
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
      else query = query.eq('complex_name', complex_name).eq('sigungu', sigungu);

      const { data, error } = await query.single();
      if (error) throw error;

      const areas = data?.area_list ? JSON.parse(data.area_list) : [];
      console.log('[areas] 결과:', areas.length, '개 면적');
      res.setHeader('Cache-Control', 's-maxage=3600');
      res.status(200).json({ areas, complex_name: data?.complex_name });
    } catch (e) {
      errRes(res, e, 'areas');
    }
    return;
  }

  // ── 4. 실거래 원본 조회 (면적 자동 선택 포함) ──
  if (type === 'deals') {
    const { complex_id, complex_name, sigungu, area_excl, months = 24 } = req.body;
    const requestedArea = area_excl ? Number(area_excl) : null;

    try {
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
      const cutoffYm = `${cutoff.getFullYear()}${String(cutoff.getMonth()+1).padStart(2,'0')}`;

      // 기본 쿼리 빌더 (면적 필터 없음)
      const baseQ = (table) => {
        let q = supabase.from(table).select('*')
          .gte('contract_ym', cutoffYm)
          .order('contract_ym', { ascending: false });
        if (complex_id) q = q.eq('complex_id', complex_id);
        else q = q.eq('complex_name', complex_name).eq('sigungu', sigungu);
        return q;
      };

      let saleData = [], rentData = [];

      // STEP 1: ±3㎡ 필터로 먼저 조회
      if (requestedArea) {
        const [s1, r1] = await Promise.all([
          baseQ('realestate_sales_raw').gte('area_excl', requestedArea - 3).lte('area_excl', requestedArea + 3).limit(200),
          baseQ('realestate_rent_raw').eq('monthly_man', 0).gte('area_excl', requestedArea - 3).lte('area_excl', requestedArea + 3).limit(200),
        ]);
        if (s1.error) throw s1.error;
        if (r1.error) throw r1.error;
        saleData = s1.data || [];
        rentData = r1.data || [];
        console.log(`[deals] STEP1 ±3 — 매매:${saleData.length} 전세:${rentData.length} requestedArea:${requestedArea}`);
      }

      // STEP 2: 0건이면 전체 조회 후 가장 가까운 면적 자동 선택
      if (saleData.length === 0 && rentData.length === 0) {
        console.log('[deals] STEP2 전체 조회 시작');
        const [sAll, rAll] = await Promise.all([
          baseQ('realestate_sales_raw').limit(500),
          baseQ('realestate_rent_raw').eq('monthly_man', 0).limit(500),
        ]);
        if (sAll.error) throw sAll.error;
        if (rAll.error) throw rAll.error;

        const allRows = [...(sAll.data || []), ...(rAll.data || [])];
        const availableAreas = [...new Set(
          allRows.map(r => Number(r.area_excl)).filter(a => a > 0)
        )].sort((a, b) => a - b);

        console.log(`[deals] requestedArea:${requestedArea} availableAreas:${JSON.stringify(availableAreas)}`);

        if (availableAreas.length === 0) {
          res.status(200).json({ saleDeals: [], rentDeals: [], availableAreas: [] });
          return;
        }

        if (requestedArea) {
          // 가장 가까운 면적 선택
          const closest = availableAreas.reduce((prev, cur) =>
            Math.abs(cur - requestedArea) < Math.abs(prev - requestedArea) ? cur : prev
          );
          const areaDiff = Math.abs(closest - requestedArea);
          console.log(`[deals] selectedArea:${closest} areaDiff:${areaDiff}`);

          if (areaDiff > 5) {
            // 5㎡ 초과 → 판단보류 신호
            console.log('[deals] areaDiff > 5 → noMatch');
            res.status(200).json({ saleDeals: [], rentDeals: [], availableAreas, areaDiff, noMatch: true });
            return;
          }

          saleData = (sAll.data || []).filter(r => Math.abs(Number(r.area_excl) - closest) <= 3);
          rentData = (rAll.data || []).filter(r => Math.abs(Number(r.area_excl) - closest) <= 3);
          console.log(`[deals] selectedArea:${closest} 필터 후 — 매매:${saleData.length} 전세:${rentData.length}`);
        } else {
          saleData = sAll.data || [];
          rentData = rAll.data || [];
        }
      }

      const finalArea = saleData[0]?.area_excl || rentData[0]?.area_excl || null;
      console.log(`[deals] final — requestedArea:${requestedArea} selectedArea:${finalArea} salesCount:${saleData.length} rentCount:${rentData.length}`);

      res.setHeader('Cache-Control', 's-maxage=600');
      res.status(200).json({ saleDeals: saleData, rentDeals: rentData });
    } catch (e) {
      errRes(res, e, 'deals');
    }
    return;
  }

  res.status(400).json({ error: 'type은 search | summary | areas | deals 중 하나' });
}
