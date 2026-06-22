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

  // ── 4. 실거래 원본 ──
  if (type === 'deals') {
    const { complex_id, complex_name, sigungu, area_excl, months = 24 } = req.body;
    try {
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
      const cutoffYm = `${cutoff.getFullYear()}${String(cutoff.getMonth()+1).padStart(2,'0')}`;

      const baseFilter = (table) => {
        let q = supabase.from(table).select('*')
          .gte('contract_ym', cutoffYm)
          .order('contract_ym', { ascending: false });
        if (complex_id) q = q.eq('complex_id', complex_id);
        else q = q.eq('complex_name', complex_name).eq('sigungu', sigungu);
        if (area_excl) {
          q = q.gte('area_excl', Number(area_excl) - 1).lte('area_excl', Number(area_excl) + 1);
        }
        return q.limit(200);
      };

      const [saleRes, rentRes] = await Promise.all([
        baseFilter('realestate_sales_raw'),
        baseFilter('realestate_rent_raw').eq('monthly_man', 0),
      ]);

      if (saleRes.error) throw saleRes.error;
      if (rentRes.error) throw rentRes.error;

      console.log('[deals] 매매:', saleRes.data?.length, '전세:', rentRes.data?.length);
      res.setHeader('Cache-Control', 's-maxage=600');
      res.status(200).json({ saleDeals: saleRes.data || [], rentDeals: rentRes.data || [] });
    } catch (e) {
      errRes(res, e, 'deals');
    }
    return;
  }

  res.status(400).json({ error: 'type은 search | summary | areas | deals 중 하나' });
}
