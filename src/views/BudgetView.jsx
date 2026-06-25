// ValueLens — BudgetView
// Phase 1-E: main.jsx에서 분리

import React, { useState } from 'react';

function BudgetView({ onProfile, onGoToBuy }) {
  // ── 입력 상태 ──
  const [equity, setEquity]       = useState("");   // 보유현금 (만원)
  const [income, setIncome]       = useState("");   // 연소득 (만원)
  const [maxLoan, setMaxLoan]     = useState("");   // 대출가능금액 (만원)
  const [region, setRegion]       = useState("");
  const [pyeong, setPyeong]       = useState("");
  const [purpose, setPurpose]     = useState("live");

  // ── 결과 상태 ──
  const [loading, setLoading]     = useState(false);
  const [candidates, setCandidates] = useState(null);  // null = 미조회
  const [meta, setMeta]           = useState(null);
  const [errMsg, setErrMsg]       = useState("");

  // 총예산 자동계산
  const totalBudget = (Number(equity) || 0) + (Number(maxLoan) || 0);

  // 억원 표시
  const toUk = (man) => man > 0 ? `= ${(man / 10000).toFixed(2)}억원` : null;

  const inp = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-500";

  // ── 조회 실행 ──
  async function run() {
    if (!totalBudget) { setErrMsg("보유현금 또는 대출가능금액을 입력하세요."); return; }
    setErrMsg("");
    setLoading(true);
    setCandidates(null);

    // 재무 프로필 저장
    if (onProfile) onProfile({ equity, income, maxLoan, totalBudget });

    try {
      const res = await fetch("/api/screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget:  totalBudget,
          equity:  Number(equity)  || 0,
          maxLoan: Number(maxLoan) || 0,
          income:  Number(income)  || 0,
          region:  region.trim(),
          pyeong:  Number(pyeong)  || 0,
          purpose,
          limit: 10,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "조회 실패");
      setCandidates(json.candidates || []);
      setMeta(json.meta || null);

      // 컬럼명 확인용 디버그 (개발 중)
      if (json.meta?.debug) console.warn("[Screener debug]", json.meta.debug);
    } catch (e) {
      setErrMsg(e.message || "조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ── 별점 렌더링 ──
  const Stars = ({ count }) => (
    <span>
      {[0,1,2,3,4].map(i => (
        <span key={i} className={i < count ? "text-amber-400" : "text-slate-200"}>★</span>
      ))}
    </span>
  );

  // ── 후보 카드 ──
  const Card = ({ c, idx }) => {
    const isCaution = c.review_label?.includes("신중");
    return (
      <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${isCaution ? "ring-orange-200" : "ring-slate-200"}`}>
        {/* 헤더 */}
        <div className="px-5 py-4" style={{ backgroundColor: isCaution ? "#fff7ed" : "#f8fafc" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-0.5 text-[10px] font-semibold text-slate-400">후보 {idx + 1}</p>
              <p className="text-base font-bold text-slate-800">
                {c.complex_name}
                <span className="ml-1.5 text-xs font-normal text-slate-400">
                  {c.pyeong}평 · {c.age != null ? `${c.age}년차` : "—"}
                </span>
              </p>
              <p className="text-xs text-slate-400">{c.sigungu} {c.legal_dong}</p>
            </div>
            <div className="text-right">
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                isCaution ? "bg-orange-100 text-orange-700"
                : c.ai_score >= 75 ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
              }`}>{c.review_label}</span>
              {c.sale_avg_man && (
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {c.sale_avg_man >= 10000
                    ? `${Math.floor(c.sale_avg_man / 10000)}억${c.sale_avg_man % 10000 > 0 ? ` ${(c.sale_avg_man % 10000).toLocaleString()}만` : ""}`
                    : `${c.sale_avg_man.toLocaleString()}만`}
                </p>
              )}
              {c.jeonse_ratio > 0 && (
                <p className="text-xs text-slate-400">전세가율 {(c.jeonse_ratio * 100).toFixed(0)}%</p>
              )}
            </div>
          </div>
        </div>

        {/* AI 적합도 + 별점 */}
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">AI 적합도</p>
            <p className="text-xl font-extrabold text-slate-900">{c.ai_score}점</p>
          </div>
          <div className="grid grid-cols-1 gap-1.5 text-[11px]">
            {[
              ["예산 적합",    c.stars?.budget,    c.score_breakdown?.budget,    30],
              ["가격 매력도",  c.stars?.value,     c.score_breakdown?.value,     25],
              ["거래 안정성",  c.stars?.liquidity, c.score_breakdown?.liquidity, 15],
              ["데이터 신뢰도",c.stars?.trust,     c.score_breakdown?.trust,     20],
              ["목적 적합성",  c.stars?.purpose,   c.score_breakdown?.purpose,   10],
            ].map(([label, stars, raw, max]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-500">{label}</span>
                <div className="flex items-center gap-2">
                  <Stars count={stars ?? 0} />
                  <span className="w-12 text-right text-slate-400">{raw ?? 0}/{max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI 선정 이유 */}
        {c.reasons?.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <p className="mb-1.5 text-xs font-bold text-emerald-700">AI 선정 이유</p>
            <ul className="space-y-1">
              {c.reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                  <span className="font-bold text-emerald-500">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI 검토 포인트 */}
        {c.cautions?.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <p className="mb-1.5 text-xs font-bold text-orange-600">AI 검토 포인트</p>
            <ul className="space-y-1">
              {c.cautions.map((ct, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-500">
                  <span className="font-bold text-orange-400">•</span>
                  <span>{ct}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI 한줄 요약 */}
        {c.summary && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
            <p className="mb-0.5 text-[10px] font-semibold text-slate-400">AI 한줄 요약</p>
            <p className="text-xs text-slate-600">{c.summary}</p>
          </div>
        )}

        {/* 데이터 메타 */}
        <div className="border-t border-slate-100 px-5 py-2 text-[10px] text-slate-400">
          매매 {c.sale_cnt}건 · 전세 {c.rent_cnt}건
          {c.period_ym_end && ` · 기준 ${String(c.period_ym_end).slice(0,4)}.${String(c.period_ym_end).slice(4,6)}`}
          {c.area_excl > 0 && ` · 전용 ${c.area_excl}㎡`}
        </div>

        {/* 매수탭 이동 버튼 */}
        <div className="border-t border-slate-100 px-5 py-3">
          <button
            onClick={() => {
              if (onGoToBuy) {
                onGoToBuy({
                  complexName:   c.complex_name,
                  region:        c.sigungu,
                  dong:          c.legal_dong,
                  areaExclusive: String(c.area_excl || ""),
                  complexId:     c.complex_id || null,
                });
              }
            }}
            className="w-full rounded-xl py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: "#334155" }}
          >
            AI 적정가 분석하기 →
          </button>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            클릭 시 매수탭으로 이동 · 정밀 분석은 매수탭에서 진행합니다
          </p>
        </div>
      </div>
    );
  };

  // ── 렌더링 ──
  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">AI 후보 찾기</h1>
        <p className="mt-2 text-sm text-slate-500">
          예산·목적·선호 조건에 맞는 <b>AI 검토 후보</b>를 확인하세요.
          <br />이 결과는 투자 권유가 아닙니다.
        </p>
      </header>

      {/* 입력 폼 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <p className="mb-4 text-sm font-bold text-slate-700">내 자금 정보</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">보유 가능한 현금 (만원)</span>
            <input type="number" className={inp} value={equity} placeholder="60000" onChange={(e) => setEquity(e.target.value)} />
            {equity && Number(equity) > 0 && <p className="mt-1 text-[11px] text-slate-400">{toUk(Number(equity))}</p>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">연소득 (만원)</span>
            <input type="number" className={inp} value={income} placeholder="8000" onChange={(e) => setIncome(e.target.value)} />
            {income && Number(income) > 0 && <p className="mt-1 text-[11px] text-slate-400">{toUk(Number(income))}</p>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">대출 가능 금액 (만원)</span>
            <input type="number" className={inp} value={maxLoan} placeholder="80000" onChange={(e) => setMaxLoan(e.target.value)} />
            {maxLoan && Number(maxLoan) > 0 && <p className="mt-1 text-[11px] text-slate-400">{toUk(Number(maxLoan))}</p>}
          </label>
          <div className="flex items-end pb-1">
            <div className="w-full rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] text-slate-400">총 예산 (자동계산)</p>
              <p className="mt-0.5 text-base font-bold text-slate-800">
                {totalBudget > 0
                  ? `${totalBudget.toLocaleString()}만원 (${(totalBudget / 10000).toFixed(2)}억)`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">
              희망 지역 (구·동)
              <span className="ml-1 font-normal text-slate-400">— 비우면 전국 검색</span>
            </span>
            <input type="text" className={inp} value={region} placeholder="예: 노원구, 공릉동, 송도 (비우면 전국)" onChange={(e) => setRegion(e.target.value)} />
            {!region && <p className="mt-1 text-[11px] text-slate-400">지역을 비우면 전국에서 AI 검토 후보를 찾습니다.</p>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">희망 평형 (선택)</span>
            <input type="number" className={inp} value={pyeong} placeholder="25" onChange={(e) => setPyeong(e.target.value)} />
          </label>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-slate-500">매수 목적</p>
          <div className="flex flex-wrap gap-2">
            {[["live","실거주"],["invest","투자"],["move","갈아타기"],["jeonse","전세끼고 매수"]].map(([v, l]) => (
              <button key={v} onClick={() => setPurpose(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${purpose === v ? "text-white" : "bg-slate-100 text-slate-600"}`}
                style={purpose === v ? { backgroundColor: "#334155" } : {}}
              >{l}</button>
            ))}
          </div>
        </div>

        {errMsg && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{errMsg}</p>}

        <button
          onClick={run}
          disabled={loading}
          className={`mt-6 w-full rounded-2xl py-4 text-base font-bold text-white ${loading ? "opacity-60" : ""}`}
          style={{ backgroundColor: "#334155" }}
        >
          {loading ? "AI 후보 분석 중…" : "AI 후보 찾기"}
        </button>
      </div>

      {/* 결과 */}
      {candidates !== null && (
        <div className="mt-6 space-y-4">
          {candidates.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
              <p className="font-semibold text-slate-700">조건에 맞는 AI 검토 후보가 없습니다.</p>
              <p className="mt-1 text-sm text-slate-400">
                예산을 높이거나 지역 조건을 완화해보세요.
              </p>
              {meta?.debug && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {meta.debug.note}<br/>
                  확인된 컬럼: {meta.debug.availableColumns?.join(", ") || "없음"}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">
                  AI 검토 후보 ({candidates.length})
                </p>
                {meta && (
                  <p className="text-[11px] text-slate-400">
                    {meta.total_pool}개 → {meta.filtered}개 → 상위 {candidates.length}개
                  </p>
                )}
              </div>
              {candidates.map((c, i) => <Card key={`${c.complex_name || "c"}-${c.area_excl || 0}-${i}`} c={c} idx={i} />)}
              <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
                <b className="text-slate-600">
                  본 결과는 사용자가 입력한 조건과 공개 데이터를 기반으로 산출된 AI 분석 결과입니다.
                </b>{" "}
                투자 또는 매매를 권유하는 것이 아니며, 최종 의사결정은 이용자의 판단과 책임입니다.
                AI 적합도·검토 단계는 공개 데이터를 분석한 참고 의견이며, 정밀 분석은 매수탭에서 확인하시기 바랍니다.
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export { BudgetView };
