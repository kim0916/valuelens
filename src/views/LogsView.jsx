// ValueLens — LogsView
// Phase 1-E: main.jsx에서 분리

import React from 'react';
import { NAVY } from '../constants/brand.js';

function LogsView() {
  const [logs, setLogs] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState('all'); // all | fail | success
  const [page, setPage] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const PAGE_SIZE = 30;

  async function fetchLogs(filterVal = filter, pageVal = page) {
    setLoading(true);
    try {
      const body = {
        type: 'read',
        limit: PAGE_SIZE,
        offset: pageVal * PAGE_SIZE,
        fail_only: filterVal === 'fail',
        success_only: filterVal === 'success',
      };
      const [logsRes, statsRes] = await Promise.all([
        fetch('/api/search_logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        fetch('/api/search_logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'stats' }) }),
      ]);
      const logsData  = await logsRes.json();
      const statsData = await statsRes.json();
      setLogs(logsData.logs || []);
      setTotal(logsData.total || 0);
      if (statsData.stats) setStats(statsData.stats);
    } catch(e) {
      console.warn('[LogsView] 로드 실패:', e.message);
    }
    setLoading(false);
  }

  React.useEffect(() => { fetchLogs(); }, []);

  function handleFilter(v) { setFilter(v); setPage(0); fetchLogs(v, 0); }

  const gradeColor = (g) => ({ A:'text-emerald-600', B:'text-emerald-500', C:'text-amber-600', D:'text-orange-500', E:'text-red-500', '보류':'text-slate-400' }[g] || 'text-slate-400');

  return (
    <>
      <header className="mb-5 text-center">
        <h1 className="text-2xl font-bold text-slate-900">조회 로그</h1>
        <p className="mt-1 text-sm text-slate-500">실제 사용자 조회 이력 및 실패 케이스 모니터링</p>
      </header>

      {/* 통계 카드 */}
      {stats && (
        <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-bold text-slate-700">최근 7일 요약</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-[11px] text-slate-400">전체 조회</p>
              <p className="mt-0.5 text-xl font-extrabold text-slate-800">{stats.total}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-3">
              <p className="text-[11px] text-emerald-600">성공률</p>
              <p className="mt-0.5 text-xl font-extrabold text-emerald-700">{stats.successRate}%</p>
            </div>
            <div className="rounded-xl bg-red-50 px-3 py-3">
              <p className="text-[11px] text-red-500">실패</p>
              <p className="mt-0.5 text-xl font-extrabold text-red-600">{stats.fail}</p>
            </div>
          </div>
          {stats.topFailReasons?.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">주요 실패 사유</p>
              {stats.topFailReasons.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 mb-1 text-xs">
                  <span className="text-red-700">{item.reason || '(사유 없음)'}</span>
                  <span className="font-bold text-red-600">{item.count}건</span>
                </div>
              ))}
            </div>
          )}
          {stats.bySource && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {Object.entries(stats.bySource).map(([src, cnt]) => (
                <span key={src} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                  {src}: {cnt}건
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 필터 */}
      <div className="mb-3 flex gap-2">
        {[['all','전체'],['fail','실패만'],['success','성공만']].map(([v, l]) => (
          <button key={v} onClick={() => handleFilter(v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === v ? 'text-white' : 'bg-slate-100 text-slate-500'}`}
            style={filter === v ? { backgroundColor: NAVY } : {}}>
            {l}
          </button>
        ))}
        <button onClick={() => fetchLogs()} className="ml-auto rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
          새로고침
        </button>
      </div>

      {/* 로그 목록 */}
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">로딩 중…</div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl bg-white py-10 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-100">
          조회 이력이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => (
            <div key={i} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${log.success ? 'ring-slate-100' : 'ring-red-200 bg-red-50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${log.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {log.success ? '성공' : '실패'}
                    </span>
                    <span className="text-sm font-bold text-slate-800 truncate">{log.complex_name || '—'}</span>
                    <span className="text-xs text-slate-400">{log.region} {log.dong}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    {log.area_excl && <span>전용 {log.area_excl}㎡</span>}
                    {log.engine_mode && <span>엔진:{log.engine_mode}</span>}
                    {log.buy_grade && <span className={gradeColor(log.buy_grade)}>등급:{log.buy_grade}</span>}
                    {log.sale_count > 0 && <span>매매:{log.sale_count}건</span>}
                    {log.rent_count > 0 && <span>전세:{log.rent_count}건</span>}
                    {log.jeonse_ratio && <span>전세율:{(log.jeonse_ratio*100).toFixed(0)}%</span>}
                    <span className={`rounded px-1 ${log.data_source === 'supabase' ? 'text-blue-500' : log.data_source === 'molit' ? 'text-green-600' : 'text-slate-400'}`}>
                      {log.data_source || 'none'}
                    </span>
                  </div>
                  {!log.success && log.fail_reason && (
                    <p className="mt-1 text-[11px] text-red-600">⚠ {log.fail_reason}</p>
                  )}
                </div>
                <p className="shrink-0 text-[10px] text-slate-300">
                  {log.searched_at ? new Date(log.searched_at).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <button disabled={page === 0} onClick={() => { const p = page - 1; setPage(p); fetchLogs(filter, p); }}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 disabled:opacity-30 bg-slate-100">← 이전</button>
          <span className="text-xs text-slate-400">{page + 1} / {Math.ceil(total / PAGE_SIZE)}페이지 (총 {total}건)</span>
          <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => { const p = page + 1; setPage(p); fetchLogs(filter, p); }}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 disabled:opacity-30 bg-slate-100">다음 →</button>
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-300 text-center">로그는 실시간 write · 민감 개인정보 미포함</p>
    </>
  );
}

export { LogsView };
