// ValueLens — AdvancedView
// Phase 1-E: main.jsx에서 분리
// props / 함수명 / className / 표시 구조 변경 금지

import React from 'react';
import { won } from '../constants/grades.js';
import { card } from '../constants/styles.js';
import { getSavedAnalyses, deleteSavedAnalysis, SI_MAX } from '../services/storage/analysis.js';
import { WatchView } from './WatchView.jsx';

// ── Empty (AdvancedView 전용) ──
function Empty({ title, desc }) {
  return <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100"><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-400">{desc}</p></div>;
}

function AdvancedView({ watch, setWatch, history, finProfile, onReanalyze, uid }) {
  const recent = (history || []).slice(0, 5);
  const fp = finProfile;
  const won2 = (a) => (a ? won(Number(a) * 10000) : "—");
  const [savedList, setSavedList] = React.useState(() => getSavedAnalyses(uid));
  const typeLabel = { fairValue: "적정가", buy: "매수", sell: "매도" };
  const typeColor = { fairValue: "bg-blue-100 text-blue-700", buy: "bg-emerald-100 text-emerald-700", sell: "bg-amber-100 text-amber-700" };

  const handleDelete = (id) => {
    deleteSavedAnalysis(id, uid);
    setSavedList(getSavedAnalyses(uid));
  };

  return (
    <>
      <header className="mb-5 text-center"><h1 className="text-2xl font-bold text-slate-900">내 자산</h1><p className="mt-2 text-sm text-slate-500">관심단지·내 저장함·재무 프로필을 한 곳에서 봅니다.</p></header>

      {/* 1. 관심단지 */}
      <section className="mb-6"><WatchView watch={watch} setWatch={setWatch} /></section>

      {/* 2. 내 저장함 */}
      <section className="mb-6">
        <h2 className="mb-2 text-xl font-bold text-slate-900">내 저장함</h2>
        <p className="mb-3 text-xs text-slate-400">결과 화면에서 [저장] 버튼을 누르면 여기에 저장됩니다. (최대 {SI_MAX}개)</p>
        {savedList.length === 0 ? (
          <Empty title="저장된 분석이 없습니다" desc="적정가·매수·매도 결과 화면에서 [저장] 버튼을 누르세요." />
        ) : (
          <div className="space-y-3">
            {savedList.map((item) => (
              <div key={item.id} className={`${card}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${typeColor[item.type] || "bg-slate-100 text-slate-600"}`}>
                        {typeLabel[item.type] || item.type}
                      </span>
                      <p className="font-semibold text-slate-900 truncate">{item.complexName}</p>
                      <span className="text-xs text-slate-400">{item.area}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.summary}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      저장일 {new Date(item.savedAt).toLocaleDateString("ko-KR")} · AI 적정가 {won(item.aiFairPrice)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-shrink-0 rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:bg-red-50 hover:text-red-400"
                  >삭제</button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  ※ 저장된 요약 정보입니다. 재조회 없이 이전 결과를 확인할 수 있습니다.
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. 재무 프로필 */}
      <section className="mb-6">
        <h2 className="mb-2 text-xl font-bold text-slate-900">재무 프로필</h2>
        {fp ? (
          <div className={card}>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-slate-400">보유 현금</p><p className="font-bold text-slate-800">{won2(fp.equity)}</p></div>
              <div><p className="text-xs text-slate-400">연소득</p><p className="font-bold text-slate-800">{won2(fp.income)}</p></div>
              <div><p className="text-xs text-slate-400">기존 연간 원리금</p><p className="font-bold text-slate-800">{won2(fp.existingPay)}</p></div>
              <div><p className="text-xs text-slate-400">대출기간 / 금리</p><p className="font-bold text-slate-800">{fp.loanYears}년 · {{ fixed: "고정", variable: "변동", mixed: "혼합" }[fp.rateType] || fp.rateType}</p></div>
              <div><p className="text-xs text-slate-400">주택 상태</p><p className="font-bold text-slate-800">{fp.noHouse ? "무주택" : "유주택"}{fp.firstHome ? "·생애최초" : ""}{fp.newlywed ? "·신혼" : ""}</p></div>
              <div><p className="text-xs text-slate-400">총 예산</p><p className="font-bold text-slate-800">{won2(fp.budget)}</p></div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">AI 후보 찾기 탭 「내 조건」에서 입력한 값입니다. 대출 가능액·월상환은 개략 추정이며 실제 승인금리·한도는 신용점수·소득증빙·DSR·담보평가·금융사 심사에 따라 달라질 수 있습니다.</p>
          </div>
        ) : (
          <Empty title="재무 프로필이 없습니다" desc="AI 후보 찾기 탭의 「내 조건」을 입력하고 후보를 찾으면 여기에 저장됩니다." />
        )}
      </section>

      {/* 4. 최근 본 단지 */}
      <section className="mb-2">
        <h2 className="mb-2 text-xl font-bold text-slate-900">최근 본 단지</h2>
        {recent.length === 0 ? (
          <Empty title="최근 본 단지가 없습니다" desc="단지를 분석하면 최근 본 단지로 표시됩니다." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {recent.map((h, i) => <span key={i} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{h.complex} <span className="font-normal text-slate-400">{h.dong}</span></span>)}
          </div>
        )}
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-400">TODO(API): 웹앱 전환 시 관심단지 변화 감지 · 적정가 변화 · 매수 판단 변화 · 시장 위험 변화 알림으로 확장.</p>
      </section>
    </>
  );
}

export { AdvancedView };
