// ValueLens — LocationPicker
// Phase 1 Cleanup: main.jsx에서 분리

import React, { useState, useEffect, useRef } from 'react';
import { searchComplexFromSupabase, makeRelatedSuggestions } from '../search/supabase.js';

function LocationPicker({ onComplete, initialQuery = "" }) {
  // ── 통합 검색 상태 ──
  const [query, setQuery]           = React.useState(initialQuery); // ← initialQuery 반영
  const [candidates, setCandidates] = React.useState([]);
  const [suggestions, setSuggestions] = React.useState([]);
  const [loading, setLoading]       = React.useState(false);
  const [searched, setSearched]     = React.useState(false);

  // initialQuery가 있으면 마운트 즉시 검색 실행
  React.useEffect(() => {
    if (initialQuery && initialQuery.length >= 2) {
      _doUnifiedSearch(initialQuery);
    }
  }, []);

  // ── 지역으로 찾기(고급) 상태 ──
  const [advOpen, setAdvOpen]       = React.useState(false);
  const SIDO_LIST = ["서울","경기","인천","부산","대구","광주","대전","울산","세종","충북","충남","전북","전남","경북","경남","제주"];
  const [sido, setSido]             = React.useState("");
  const [sidoQ, setSidoQ]           = React.useState("");
  const [sigunguList, setSigunguList] = React.useState([]);
  const [sigungu, setSigungu]       = React.useState("");
  const [sigunguQ, setSigunguQ]     = React.useState("");
  const [dongList, setDongList]     = React.useState([]);
  const [dong, setDong]             = React.useState("");
  const [dongQ, setDongQ]           = React.useState("");
  const [advComplexQ, setAdvComplexQ] = React.useState("");
  const [advComplexList, setAdvComplexList] = React.useState([]);
  const [advCandidateMode, setAdvCandidateMode] = React.useState(false);
  const [advCandidates, setAdvCandidates] = React.useState([]);

  const filteredSido    = SIDO_LIST.filter(s => fuzzyMatch(s, sidoQ));
  const filteredSigungu = sigunguList.filter(s => fuzzyMatch(s, sigunguQ));
  const filteredDong    = dongList.filter(d => fuzzyMatch(d, dongQ));

  // ── race condition 방지 ──
  const genRef      = React.useRef(0);
  const debounceRef = React.useRef(null);
  const advGenRef   = React.useRef(0);
  const advDebRef   = React.useRef(null);

  // ──────────────────────────────────────────
  // 1. 통합 검색창 핸들러
  // ──────────────────────────────────────────
  function handleQueryChange(kw) {
    setQuery(kw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (kw.length < 2) {
      setCandidates([]); setSuggestions([]); setSearched(false); return;
    }
    debounceRef.current = setTimeout(() => _doUnifiedSearch(kw), 250);
  }

  async function _doUnifiedSearch(kw) {
    const gen = ++genRef.current;
    setLoading(true); setSearched(false); setCandidates([]); setSuggestions([]);
    try {
      const tokens = kw.trim().split(/\s+/);
      let richCandidates = [];
      let bulkPool = [];  // 관련 검색어 생성용 원본 배열

      if (tokens.length >= 2) {
        const [t1, ...rest] = tokens;
        const combined1 = tokens.join("");
        const combined2 = [...rest, t1].join("");
        const [r1, r2, r3] = await Promise.all([
          searchComplexFromSupabase(combined1, "", ""),
          searchComplexFromSupabase(combined2, "", ""),
          searchComplexFromSupabase(rest.join(""), "", ""),
        ]);
        if (gen !== genRef.current) return;

        const seen = new Set();
        for (const sbResult of [r1, r2, r3]) {
          if (sbResult.fromSupabase) {
            for (const c of sbResult.complexes) {
              if (!seen.has(c.id)) { seen.add(c.id); richCandidates.push(c); }
            }
          }
        }
        bulkPool = richCandidates;
      }

      if (richCandidates.length === 0) {
        // 단독 키워드 — 관련 검색어 생성을 위해 limit 30으로 더 많이 조회
        const sbResult = await searchComplexFromSupabase(kw, "", "");
        if (gen !== genRef.current) return;
        if (sbResult.fromSupabase) {
          richCandidates = sbResult.complexes;
          bulkPool = sbResult.complexes;
        }
      }

      if (gen !== genRef.current) return;

      // 자동완성 후보 (상위 10개)
      const mapped = richCandidates.slice(0, 10).map(c => ({
        name:       c.complex_name,
        complexId:  c.id,
        sigungu:    c.sigungu,
        dong:       c.legal_dong,
        sido:       c.sido,
        buildYear:  c.build_year,
        roadAddr:   c.road_addr,
        saleCnt:    c.sale_cnt,
        rentCnt:    c.rent_cnt,
        areaList:   c.area_list ? JSON.parse(c.area_list) : [],
        lastSaleYm: c.last_sale_ym,
        fromSB:     true,
      }));
      setCandidates(mapped);

      // 관련 검색어 — bulkPool 기반 생성 (공백 없는 단독 키워드일 때만 의미 있음)
      if (tokens.length === 1 && bulkPool.length > 0) {
        const sugg = makeRelatedSuggestions(bulkPool, kw, 6);
        setSuggestions(sugg);
      } else {
        setSuggestions([]);
      }

    } catch(e) {
      if (gen !== genRef.current) return;
      console.error('[unifiedSearch]', e);
      setCandidates([]); setSuggestions([]);
    } finally {
      if (gen === genRef.current) { setLoading(false); setSearched(true); }
    }
  }

  function selectCandidate(c) {
    setCandidates([]); setQuery("");
    onComplete({
      sido:       c.sido       || "",
      sigungu:    c.sigungu    || "",
      dong:       c.dong       || "",
      complexName: c.name,
      exactAptNm:  c.name,
      complexId:   c.complexId || null,
      buildYear:   c.buildYear || null,
      areaList:    c.areaList  || [],
    });
  }

  // ──────────────────────────────────────────
  // 2. 고급(지역) 검색 핸들러 — 기존 로직 그대로 유지
  // ──────────────────────────────────────────
  async function advSelectSido(s) {
    setSido(s); setSidoQ(""); setSigungu(""); setSigunguQ(""); setDong(""); setDongQ(""); setAdvComplexQ(""); setAdvComplexList([]);
    const res = await fetch("/api/lawdCd", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"sigungu", sido: s }) });
    const d = await res.json();
    setSigunguList(d.list || []);
  }
  async function advSelectSigungu(sg) {
    setSigungu(sg); setSigunguQ(""); setDong(""); setDongQ(""); setAdvComplexQ(""); setAdvComplexList([]);
    const res = await fetch("/api/lawdCd", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"dong", sido, sigungu: sg }) });
    const d = await res.json();
    setDongList(d.list || []);
  }
  function advSelectDong(dg) {
    setDong(dg); setDongQ(""); setAdvComplexQ(""); setAdvComplexList([]);
  }

  function advSearchComplex(kw) {
    setAdvComplexQ(kw);
    if (advDebRef.current) clearTimeout(advDebRef.current);
    if (kw.length < 2) { setAdvCandidateMode(false); setAdvCandidates([]); setAdvComplexList([]); return; }
    advDebRef.current = setTimeout(() => _advDoSearch(kw), 250);
  }

  async function _advDoSearch(kw) {
    const gen = ++advGenRef.current;
    setAdvCandidateMode(false); setAdvCandidates([]);
    setLoading(true);
    try {
      const sbResult = await searchComplexFromSupabase(kw, sigungu, dong);
      if (gen !== advGenRef.current) return;

      let list = [];
      let richCandidates = [];

      if (sbResult.fromSupabase && sbResult.complexes.length > 0) {
        richCandidates = sbResult.complexes.map(c => ({
          name: c.complex_name, complexId: c.id,
          sigungu: c.sigungu, dong: c.legal_dong, sido: c.sido,
          buildYear: c.build_year, roadAddr: c.road_addr,
          saleCnt: c.sale_cnt, rentCnt: c.rent_cnt,
          areaList: c.area_list ? JSON.parse(c.area_list) : [],
          lastSaleYm: c.last_sale_ym, fromSB: true,
        }));
        list = richCandidates.map(c => c.name);
      } else {
        if (sigungu) {
          const lawdRes = await fetch("/api/lawdCd", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"lawdCd", sido, sigungu }) });
          const { lawdCd } = await lawdRes.json();
          if (gen !== advGenRef.current) return;
          if (lawdCd) {
            const cRes = await fetch("/api/molit", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"complexList", lawdCd, complexName: kw }) });
            const cd = await cRes.json();
            if (gen !== advGenRef.current) return;
            list = cd.list || [];
            richCandidates = list.map(name => ({ name, sigungu, dong, sido, fromSB: false }));
          }
        }
      }

      setAdvComplexList(list);
      if (richCandidates.length >= 1) {
        setAdvCandidates(richCandidates.slice(0, 20));
        setAdvCandidateMode(true);
      }
    } catch(e) {
      if (gen !== advGenRef.current) return;
      setAdvComplexList([]);
    } finally {
      if (gen === advGenRef.current) setLoading(false);
    }
  }

  function advSelectComplex(name, candidateDong, complexId, meta) {
    const useDong    = candidateDong || dong;
    const useSigungu = (meta && meta.sigungu) || sigungu;
    const useSido    = (meta && meta.sido) || sido;
    setAdvCandidateMode(false); setAdvCandidates([]); setAdvComplexList([]);
    onComplete({
      sido: useSido, sigungu: useSigungu, dong: useDong,
      complexName: name, exactAptNm: name,
      complexId: complexId || null,
      buildYear: meta && meta.buildYear || null,
      areaList: meta && meta.areaList || [],
    });
  }

  // ── 스타일 상수 ──
  const tagCls  = (active) => `rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${active ? "text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;
  const inp     = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 mb-2";
  const stepCls = "mb-4";

  return (
    <div>
      {/* ══════════════════════════════════
          통합 검색창 (기본 UX)
      ══════════════════════════════════ */}
      <div style={{ marginBottom: 16 }}>
        {/* 검색 입력창 */}
        <div style={{ position: "relative" }}>
          {/* 돋보기 아이콘 */}
          <svg
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#a8a29e", pointerEvents: "none" }}
            width={16} height={16} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="아파트명 또는 지역을 입력하세요"
            style={{
              width: "100%", boxSizing: "border-box",
              paddingLeft: 40, paddingRight: query ? 36 : 14,
              paddingTop: 13, paddingBottom: 13,
              borderRadius: 13, border: "1px solid rgba(0,0,0,0.13)",
              fontSize: 15, outline: "none", background: "#fff",
              letterSpacing: "-0.01em", color: "#111",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
            autoFocus
          />
          {/* X 클리어 버튼 */}
          {query && (
            <button
              onClick={() => { setQuery(""); setCandidates([]); setSuggestions([]); setSearched(false); }}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#a8a29e", display: "flex", padding: 2,
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* 예시 힌트 */}
        {!query && (
          <p style={{ fontSize: 11, color: "#a8a29e", marginTop: 8, letterSpacing: "-0.005em" }}>
            예: 래미안, 리센츠, 은마, 노원 상계주공
          </p>
        )}

        {/* 로딩 */}
        {loading && (
          <p style={{ fontSize: 12, color: "#a8a29e", marginTop: 10 }}>조회 중…</p>
        )}

        {/* 후보 목록 */}
        {!loading && candidates.length > 0 && (
          <div style={{
            marginTop: 8,
            border: "0.5px solid rgba(0,0,0,0.09)",
            borderRadius: 13,
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}>
            {candidates.map((c, i) => (
              <button
                key={i}
                onClick={() => selectCandidate(c)}
                style={{
                  width: "100%", display: "flex", alignItems: "flex-start",
                  justifyContent: "space-between", gap: 12,
                  padding: "13px 16px",
                  background: "none", border: "none",
                  borderBottom: i < candidates.length - 1 ? "0.5px solid rgba(0,0,0,0.06)" : "none",
                  cursor: "pointer", textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafaf8"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14, fontWeight: 500, color: "#111",
                    margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    letterSpacing: "-0.01em",
                  }}>{c.name}</p>
                  <p style={{ fontSize: 11, color: "#a8a29e", margin: "3px 0 0", fontWeight: 400 }}>
                    {c.sigungu}{c.dong ? ` · ${c.dong}` : ""}
                    {c.buildYear ? ` · ${c.buildYear}년` : ""}
                  </p>
                  {c.areaList && c.areaList.length > 0 && (
                    <p style={{ fontSize: 11, color: "#78716c", margin: "2px 0 0", fontWeight: 400 }}>
                      전용 {c.areaList.slice(0,3).map(a => `${a}㎡`).join(" / ")}
                      {c.areaList.length > 3 ? ` 외 ${c.areaList.length-3}개` : ""}
                    </p>
                  )}
                </div>
                {/* 우측 정보 */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {c.saleCnt > 0 && (
                    <p style={{ fontSize: 10, color: "#a8a29e", margin: 0 }}>매매 {c.saleCnt}건</p>
                  )}
                  {c.lastSaleYm && (
                    <p style={{ fontSize: 10, color: "#c8c4be", margin: "2px 0 0" }}>
                      {c.lastSaleYm.slice(0,4)}.{c.lastSaleYm.slice(4)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 관련 검색어 */}
        {!loading && suggestions.length > 0 && (
          <div style={{ marginTop: candidates.length > 0 ? 12 : 8 }}>
            <p style={{
              fontSize: 10, fontWeight: 500, letterSpacing: "0.07em",
              color: "#a8a29e", textTransform: "uppercase",
              marginBottom: 8,
            }}>관련 검색어</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(s.query);
                    setSuggestions([]);
                    _doUnifiedSearch(s.query);
                  }}
                  style={{
                    padding: "6px 13px",
                    borderRadius: 20,
                    border: "0.5px solid rgba(0,0,0,0.13)",
                    background: "#fff",
                    fontSize: 13, fontWeight: 400,
                    color: "#111",
                    cursor: "pointer",
                    letterSpacing: "-0.01em",
                    transition: "background 0.12s, border-color 0.12s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "#f5f5f3";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.22)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.13)";
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && searched && query.length >= 2 && candidates.length === 0 && (
          <div style={{
            marginTop: 8, padding: "14px 16px",
            borderRadius: 12, background: "#fafaf8",
            border: "0.5px solid rgba(0,0,0,0.09)",
          }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#111", margin: 0 }}>
              단지를 찾지 못했습니다.
            </p>
            <p style={{ fontSize: 12, color: "#a8a29e", margin: "6px 0 0" }}>
              단지명 전체를 입력하거나 아래 지역으로 찾기를 이용해보세요.
            </p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════
          지역으로 찾기 (고급 검색 접기)
      ══════════════════════════════════ */}
      <div>
        <button
          onClick={() => setAdvOpen(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            padding: "6px 0", color: "#78716c",
            fontSize: 12, fontWeight: 400,
          }}
        >
          <svg
            width={12} height={12} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: "transform 0.2s", transform: advOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          지역으로 찾기
        </button>

        {/* 고급 검색 패널 */}
        {advOpen && (
          <div style={{
            marginTop: 10, padding: "16px", borderRadius: 13,
            border: "0.5px solid rgba(0,0,0,0.09)", background: "#fafaf8",
          }}>
            <div className="space-y-4">

              {/* ① 시/도 */}
              <div className={stepCls}>
                <p className="mb-1.5 text-xs font-bold text-slate-500">① 시/도</p>
                <input value={sidoQ} onChange={e => setSidoQ(e.target.value)} placeholder="예: 서울, 경기..." className={inp} />
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {filteredSido.map(s => (
                    <button key={s} onClick={() => advSelectSido(s)}
                      className={tagCls(sido===s)} style={sido===s ? {backgroundColor: NAVY} : {}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* ② 구/군 */}
              {sido && (
                <div className={stepCls}>
                  <p className="mb-1.5 text-xs font-bold text-slate-500">② 구/군 <span className="font-normal text-slate-400">({sido})</span></p>
                  <input value={sigunguQ} onChange={e => setSigunguQ(e.target.value)} placeholder="예: 노원구, 강남구..." className={inp} />
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {filteredSigungu.map(sg => (
                      <button key={sg} onClick={() => advSelectSigungu(sg)}
                        className={tagCls(sigungu===sg)} style={sigungu===sg ? {backgroundColor: NAVY} : {}}>
                        {sg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ③ 동 */}
              {sigungu && (
                <div className={stepCls}>
                  <p className="mb-1.5 text-xs font-bold text-slate-500">③ 동 <span className="font-normal text-slate-400">({sigungu})</span></p>
                  <input value={dongQ} onChange={e => setDongQ(e.target.value)} placeholder="예: 공릉동, 대치동..." className={inp} />
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {filteredDong.map(dg => (
                      <button key={dg} onClick={() => advSelectDong(dg)}
                        className={tagCls(dong===dg)} style={dong===dg ? {backgroundColor: NAVY} : {}}>
                        {dg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ④ 단지명 */}
              {dong && (
                <div className={stepCls}>
                  <p className="mb-1.5 text-xs font-bold text-slate-500">④ 단지명 <span className="font-normal text-slate-400">({dong})</span></p>
                  <input value={advComplexQ} onChange={e => advSearchComplex(e.target.value)}
                    placeholder="단지명 입력 (예: 래미안, 자이...)" className={inp} />
                  {loading && <p className="text-xs text-slate-400">조회 중…</p>}

                  {advCandidateMode && advCandidates.length > 0 && (
                    <div className="mt-1">
                      <p className="mb-2 text-xs font-bold text-slate-500">
                        후보 {advCandidates.length}개 — 분석할 단지를 선택하세요
                      </p>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {advCandidates.map((c, i) => (
                          <button key={i} onClick={() => advSelectComplex(c.name, c.dong, c.complexId, c)}
                            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-slate-400 hover:bg-slate-50 transition-all text-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  {c.sigungu}{c.dong ? ` · ${c.dong}` : ""}{c.buildYear ? ` · ${c.buildYear}년` : ""}
                                </p>
                                {c.areaList && c.areaList.length > 0 && (
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    {c.areaList.slice(0,4).map(a => `${a}㎡`).join(" / ")}
                                    {c.areaList.length > 4 ? ` 외 ${c.areaList.length-4}개` : ""}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {c.saleCnt > 0 && <p className="text-[11px] text-slate-400">매매 {c.saleCnt}건</p>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!advCandidateMode && advComplexList.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-md">
                      {advComplexList.map((name, i) => (
                        <button key={i} onClick={() => advSelectComplex(name)}
                          className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                          {name}
                        </button>
                      ))}
                    </div>
                  )}

                  {!loading && advComplexQ.length >= 2 && advComplexList.length === 0 && !advCandidateMode && (
                    <div className="rounded-xl bg-white px-3 py-2.5 text-xs text-slate-500 border border-slate-100">
                      <p className="font-semibold text-slate-600">단지를 찾지 못했습니다.</p>
                      <p className="mt-1">단지명 전체(예: 더샵파크애비뉴)를 다시 입력하거나 KB시세를 직접 입력해보세요.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { LocationPicker };
