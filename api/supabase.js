// api/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용' });
    return;
  }

  const { type } = req.body || {};

  // ── 1. 단지 검색 ──
  if (type === 'search') {
    const { name, sigungu, dong, limit = 20 } = req.body;
    if (!name) { res.status(400).json({ error: 'name 필수' }); return; }

    try {
      const aliasKey = name.replace(/\s/g, '');
      const { data: aliasData } = await supabase
        .from('realestate_complex_aliases')
        .select('real_name, sigungu_hint, complex_id')
        .ilike('search_key', aliasKey)
        .limit(3);

      let searchName = name;
      let aliasMatch = null;
      if (aliasData && aliasData.length > 0) {
        aliasMatch = aliasData[0];
        searchName = aliasMatch.real_name;
      }

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

      res.setHeader('Cache-Control', 's-maxage=3600');
      res.status(200).json({ complexes: data || [], aliasMatch, total: (data || []).length });
    } catch (e) {
      res.status(500).json({ error: '단지 검색 실패: ' + e.message });
    }
    return;
  }

  // ── 2. 가격 요약 조회 ──
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

      if (complex_id) {
        query = query.eq('complex_id', complex_id);
      } else {
        query = query.eq('complex_name', complex_name).eq('sigungu', sigungu);
      }

      if (area_excl) {
        query = query.gte('area_excl', Number(area_excl) - 1).lte('area_excl', Number(area_excl) + 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.setHeader('Cache-Control', 's-maxage=600');
      res.status(200).json({ summary: (data || [])[0] || null });
    } catch (e) {
      res.status(500).json({ error: '가격 요약 조회 실패: ' + e.message });
    }
    return;
  }

  // ── 3. 면적 목록 조회 ──
  if (type === 'areas') {
    const { complex_id, complex_name, sigungu } = req.body;

    try {
      let query = supabase
        .from('realestate_complexes')
        .select('area_list, complex_name, build_year');

      if (complex_id) {
        query = query.eq('id', complex_id);
      } else {
        query = query.eq('complex_name', complex_name).eq('sigungu', sigungu);
      }

      const { data, error } = await query.single();
      if (error) throw error;

      const areas = data?.area_list ? JSON.parse(data.area_list) : [];
      res.setHeader('Cache-Control', 's-maxage=3600');
      res.status(200).json({ areas, complex_name: data?.complex_name });
    } catch (e) {
      res.status(500).json({ error: '면적 조회 실패: ' + e.message });
    }
    return;
  }

  // ── 4. 실거래 원본 조회 ──
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

      res.setHeader('Cache-Control', 's-maxage=600');
      res.status(200).json({
        saleDeals: saleRes.data || [],
        rentDeals: rentRes.data || [],
      });
    } catch (e) {
      res.status(500).json({ error: '실거래 조회 실패: ' + e.message });
    }
    return;
  }

  res.status(400).json({ error: 'type은 search | summary | areas | deals 중 하나' });
}
