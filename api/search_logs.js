// api/search_logs.js — 조회 로그 기록 + 관리자 조회
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY  // write는 anon으로, RLS에서 insert 허용 필요
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용' });
    return;
  }

  const { type } = req.body || {};

  // ── 1. 로그 기록 ──────────────────────────────────────────
  if (type === 'write') {
    const {
      searched_at,   // ISO string, 없으면 서버 시각
      region,        // 시군구
      dong,          // 법정동
      complex_name,  // 단지명
      area_excl,     // 전용면적 (null 허용)
      success,       // boolean
      fail_reason,   // 실패 사유 (null 허용)
      data_source,   // 'supabase' | 'molit' | 'none'
      sale_count,    // 매매 건수
      rent_count,    // 전세 건수
      jeonse_ratio,  // 전세가율 (null 허용)
      engine_mode,   // jeonse | blend | sale | hold
      buy_grade,     // A~E | 보류
    } = req.body;

    try {
      const { error } = await supabase
        .from('search_logs')
        .insert({
          searched_at:  searched_at || new Date().toISOString(),
          region:       region       || null,
          dong:         dong         || null,
          complex_name: complex_name || null,
          area_excl:    area_excl    ? Number(area_excl) : null,
          success:      !!success,
          fail_reason:  fail_reason  || null,
          data_source:  data_source  || 'none',
          sale_count:   sale_count   ? Number(sale_count) : 0,
          rent_count:   rent_count   ? Number(rent_count) : 0,
          jeonse_ratio: jeonse_ratio ? Number(jeonse_ratio) : null,
          engine_mode:  engine_mode  || null,
          buy_grade:    buy_grade    || null,
        });

      if (error) {
        // 로그 실패는 사용자 경험에 영향 없게 조용히 처리
        console.warn('[search_logs] insert 실패:', error.message);
        res.status(200).json({ ok: false, warn: error.message });
        return;
      }

      res.status(200).json({ ok: true });
    } catch (e) {
      console.warn('[search_logs] 예외:', e.message);
      res.status(200).json({ ok: false, warn: e.message });
    }
    return;
  }

  // ── 2. 로그 조회 (관리자용) ───────────────────────────────
  if (type === 'read') {
    const {
      limit   = 100,
      offset  = 0,
      success_only = false,   // true면 성공만
      fail_only    = false,   // true면 실패만
      region,
      from_date,   // YYYY-MM-DD
      to_date,
    } = req.body;

    // 간단한 관리자 토큰 체크 (환경변수로 관리)
    const adminToken = req.headers['x-admin-token'];
    if (adminToken !== process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN) {
      res.status(403).json({ error: '권한 없음' });
      return;
    }

    try {
      let query = supabase
        .from('search_logs')
        .select('*', { count: 'exact' })
        .order('searched_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (success_only) query = query.eq('success', true);
      if (fail_only)    query = query.eq('success', false);
      if (region)       query = query.ilike('region', `%${region}%`);
      if (from_date)    query = query.gte('searched_at', from_date);
      if (to_date)      query = query.lte('searched_at', to_date + 'T23:59:59');

      const { data, error, count } = await query;
      if (error) throw error;

      // 집계 통계
      const totalFetch = await supabase
        .from('search_logs')
        .select('success', { count: 'exact', head: false })
        .eq('success', false);

      res.status(200).json({
        logs: data || [],
        total: count || 0,
        fail_count: totalFetch.count || 0,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  // ── 3. 집계 통계 ─────────────────────────────────────────
  if (type === 'stats') {
    try {
      // 최근 7일 성공률, 소스별 분포, 지역별 실패
      const since = new Date();
      since.setDate(since.getDate() - 7);

      const { data: recentLogs } = await supabase
        .from('search_logs')
        .select('success, data_source, region, fail_reason, buy_grade')
        .gte('searched_at', since.toISOString())
        .limit(1000);

      if (!recentLogs) { res.status(200).json({ stats: null }); return; }

      const total   = recentLogs.length;
      const success = recentLogs.filter(l => l.success).length;
      const bySource = {};
      const byGrade  = {};
      const failReasons = {};

      for (const l of recentLogs) {
        bySource[l.data_source] = (bySource[l.data_source] || 0) + 1;
        if (l.buy_grade) byGrade[l.buy_grade] = (byGrade[l.buy_grade] || 0) + 1;
        if (!l.success && l.fail_reason) {
          failReasons[l.fail_reason] = (failReasons[l.fail_reason] || 0) + 1;
        }
      }

      res.status(200).json({
        stats: {
          period: '최근 7일',
          total,
          success,
          fail: total - success,
          successRate: total ? Math.round(success / total * 100) : 0,
          bySource,
          byGrade,
          topFailReasons: Object.entries(failReasons)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([reason, count]) => ({ reason, count })),
        },
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  res.status(400).json({ error: 'type은 write | read | stats 중 하나' });
}
