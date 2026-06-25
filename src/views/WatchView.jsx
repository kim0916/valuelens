// ValueLens — WatchView
// Phase 1-E: main.jsx에서 분리

import React from 'react';
import { won } from '../constants/grades.js';

const card = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100";

function Empty({ title, desc }) {
  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{desc}</p>
    </div>
  );
}

function WatchView({ watch, setWatch }) {
  if (!watch.length) return <Empty title="관심단지가 없습니다" desc="매수판단 결과에서 ☆ 버튼으로 추가하세요." />;
  const setTarget = (i, v) => setWatch((p) => p.map((x, j) => (j === i ? { ...x, target: v } : x)));
  return (
    <div className="space-y-3">
      <h1 className="mb-2 text-xl font-bold text-slate-900">관심단지</h1>
      {watch.map((w, i) => {
        const t = Number(w.target);
        const reached = t > 0 && w.currentPrice <= t;
        return (
          <div key={i} className={card}>
            <div className="flex items-start justify-between"><div><p className="font-bold text-slate-900">{w.complex}</p><p className="text-xs text-slate-400">{w.dong}</p></div><button onClick={() => setWatch((p) => p.filter((_, j) => j !== i))} className="text-xs text-slate-300 hover:text-red-500">삭제</button></div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span className="text-slate-500">적정가 <b className="text-slate-800">{won(w.fairPrice)}</b></span><span className="text-slate-500">현재가 <b className="text-slate-800">{won(w.currentPrice)}</b></span></div>
            <div className="mt-3 flex items-center gap-2"><span className="text-xs text-slate-500">목표가(만원)</span><input type="number" className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm" value={w.target} placeholder="48000" onChange={(e) => setTarget(i, e.target.value)} />{t > 0 && <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${reached ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{reached ? "목표가 도달" : "대기 중"}</span>}</div>
          </div>
        );
      })}
    </div>
  );
}

export { WatchView };
