import "./index.css";
import { NAVY, BRAND, BRAND_GREEN, BRAND_MID, BRAND_MUTED, BRAND_LIGHT, BRAND_BG, BRAND_BORDER, GRADE_COLOR, GRADE_BG, GRADE_BR } from './constants/brand.js';
import { GRADES, LABEL, GS, won, pct, typicalPyeong } from './constants/grades.js';
import { SAMPLE_DEALS, SAMPLE_SALE_DEALS, SAMPLE, EMPTY, PRESET_EUNMA, PRESET_SG7, PRESET_PRIME_FULL, LEGAL } from './constants/presets.js';
import { FALLBACK_RATIO, MARKET_TRENDS, getRegionTrend, isRisingMarket, isPremiumComplex, isExcludedType, CONFIG, analyze, sellVerdict } from './engine/analyze.js';
import { analyzeSellerDecision, analyzeBuyerDecision, calculateSupplyShock, calculateVolumeRisk, calculatePopulationRisk, calculateEmploymentRisk, calculatePolicyRisk, SCHOOL_ZONES, SCARCITY_ZONES, PRIME_REGIONS, PREMIUM_LEVEL, CONF_CAP, RECON, estimateReconstructionStage, computeFairBands, classifyApartmentMarket } from './engine/market.js';
import { computeTrimmedMean, computeDataTrust } from './engine/stats.js';
import { acqStdRate, acqTax, cgTax } from './engine/tax.js';
import { LAWD_CD_MAP, DONG_TO_LAWD, getLawdCd, fetchWithTimeout } from './search/location.js';
import { BRAND_ONLY_KEYWORDS, isBrandOnlySearch, getBrandWarning, APT_ALIAS, resolveAlias, normalizeAptName, matchAptName } from './search/alias.js';
import { groupAreasByPyeong, matchArea, parsePrice, getDataConfidence } from './search/utils.js';
import { fetchMolitData } from './search/molit.js';
import { fetchApartmentData } from './search/apartment.js';
import { buildAnalysisInput } from './search/input.js';
import { _extractRegionToken, makeRelatedSuggestions, searchComplexFromSupabase, getPriceSummaryFromSupabase } from './search/supabase.js';
import { scorePool, calculateLivingScore, calculateSupplyRisk, calculatePositiveFactors, calculateNegativeFactors } from './recommendation/score.js';
import { POOL, AREA_DB } from './recommendation/pool.js';
import { recommendByBudget } from './recommendation/recommend.js';
import { card } from './constants/styles.js';
import { WatchView } from './views/WatchView.jsx';
import { AiNotice, GradeInfoPopup, DataTrustBadge, InputWarnings, MarketTypeBadge, SellSaveBtn, BuySaveBtn } from './views/shared.jsx';
import { SI_MAX, saveAnalysis, getSavedAnalyses, deleteSavedAnalysis } from './services/storage/analysis.js';
import { writeSearchLog } from './services/storage/searchLog.js';
import { LogsView } from './views/LogsView.jsx';
import { BudgetView } from './views/BudgetView.jsx';
import { SellResult } from './views/SellResult.jsx';
import { FairValueResult } from './views/FairValueResult.jsx';
import { BuyResult } from './views/BuyResult.jsx';
import { ConfirmStep } from './views/ConfirmStep.jsx';
import { AdvancedView } from './views/AdvancedView.jsx';
import { SellView } from './views/SellView.jsx';
import { BuyView } from './views/BuyView.jsx';
import { AIChatView } from './views/AIChatView.jsx';
import { TaxView } from './views/TaxView.jsx';
import { getOrCreateDeviceId } from './utils/device.js';
import { LS_MAX, loadRecentAnalysis, saveRecentAnalysis } from './services/storage/recentAnalysis.js';
import { supabase as supabaseClient } from './services/supabaseClient.js';
import { LocationPicker } from './views/LocationPicker.jsx';



import React, { useState, useRef, useEffect } from "react";
import ReactDOM from 'react-dom/client';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
console.log("[Auth] VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL ? "✅ 설정됨" : "❌ 없음");
console.log("[Auth] VITE_SUPABASE_ANON_KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "✅ 설정됨" : "❌ 없음");

function AuthGate({ children }) {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [mode, setMode] = React.useState("login"); // login | signup
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [authLoading, setAuthLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin() {
    if (!email || !password) { setError("이메일과 비밀번호를 입력해주세요."); return; }
    setAuthLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login error:", error.message, error);
      setError(`로그인 실패: ${error.message}`);
    }
    setAuthLoading(false);
  }

  async function handleSignup() {
    if (!email || !password || !name) { setError("모든 항목을 입력해주세요."); return; }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
    setAuthLoading(true); setError("");
    const { error } = await supabase.auth.signUp({ 
      email, password, 
      options: { data: { name } }
    });
    if (error) setError("오류: " + error.message);
    else setSuccessMsg("가입 완료! 이메일을 확인해주세요.");
    setAuthLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
      로딩 중...
    </div>
  );

  if (!user) return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ background:"#111", border:"1px solid #222", borderRadius:"16px", padding:"40px 36px", width:"100%", maxWidth:"380px" }}>
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"#111", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:16, fontWeight:700, color:"#fff", letterSpacing:"-0.02em" }}>VL</span>
        </div>
          <h1 style={{ color:"#fff", fontSize:"22px", fontWeight:"700", margin:"8px 0 4px" }}>ValueLens 부동산</h1>
          <p style={{ color:"#666", fontSize:"13px", margin:0 }}>KiwiLab 계정으로 {mode === "login" ? "로그인" : "회원가입"}하세요</p>
        </div>

        {mode === "signup" && (
          <div style={{ marginBottom:"12px" }}>
            <label style={{ color:"#aaa", fontSize:"12px", display:"block", marginBottom:"5px" }}>이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름 입력"
              style={{ width:"100%", padding:"11px 13px", background:"#1a1a1a", border:"1px solid #333", borderRadius:"8px", color:"#fff", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
          </div>
        )}

        <div style={{ marginBottom:"12px" }}>
          <label style={{ color:"#aaa", fontSize:"12px", display:"block", marginBottom:"5px" }}>이메일</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일 입력"
            style={{ width:"100%", padding:"11px 13px", background:"#1a1a1a", border:"1px solid #333", borderRadius:"8px", color:"#fff", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
        </div>

        <div style={{ marginBottom:"16px" }}>
          <label style={{ color:"#aaa", fontSize:"12px", display:"block", marginBottom:"5px" }}>비밀번호</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6자 이상"
            style={{ width:"100%", padding:"11px 13px", background:"#1a1a1a", border:"1px solid #333", borderRadius:"8px", color:"#fff", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
        </div>

        {error && <p style={{ color:"#ff4444", fontSize:"12px", marginBottom:"12px" }}>{error}</p>}
        {successMsg && <p style={{ color:"#00FF87", fontSize:"12px", marginBottom:"12px" }}>{successMsg}</p>}

        <button onClick={mode === "login" ? handleLogin : handleSignup}
          style={{ width:"100%", padding:"12px", background:authLoading ? "#555" : "#00FF87", border:"none", borderRadius:"8px", color:"#000", fontSize:"15px", fontWeight:"700", cursor:"pointer", marginBottom:"12px" }}>
          {authLoading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>

        <p style={{ textAlign:"center", color:"#666", fontSize:"13px", margin:0 }}>
          {mode === "login" ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ color:"#00FF87", cursor:"pointer" }}>
            {mode === "login" ? "회원가입" : "로그인"}
          </span>
        </p>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ position:"fixed", top:"8px", right:"12px", zIndex:9999 }}>
        <button onClick={handleLogout} style={{ fontSize:"12px", color:"#ff4444", background:"#ff444420", border:"none", padding:"4px 12px", borderRadius:"20px", cursor:"pointer" }}>
          로그아웃
        </button>
      </div>
      {children}
    </div>
  );
}



// ── 자동완성 데이터 (하드코딩 · API 연동 전까지 사용) ──
const DONG_DATA = {
  "공릉동": ["동부", "태릉우성", "건영장미", "신도브래뉴", "동신", "한신"],
  "노원구": ["상계주공1", "상계주공2", "상계주공7", "중계그린", "월계시영"],
  "강남구": ["은마", "대치현대", "개포주공", "압구정현대", "도곡렉슬"],
  "서초구": ["반포자이", "래미안퍼스티지", "아크로리버파크", "반포한양"],
  "송파구": ["잠실엘스", "잠실리센츠", "파크리오", "헬리오시티", "가락시영"],
  "용산구": ["한남더힐", "이촌현대", "산호아파트", "용산파크타워"],
  "양천구": ["목동신시가지7", "목동신시가지1", "목동신시가지4", "신목동파라곤"],
  "분당": ["시범우성", "시범현대", "파크뷰", "정자아이파크", "분당두산"],
  "판교": ["봇들마을", "판교원마을", "백현마을", "운중동현대"],
  "해운대구": ["아이파크", "엘시티", "센텀시티", "우동현대"],
  "대치동": ["은마", "대치현대", "쌍용", "대치선경", "선경"],
  "잠실동": ["잠실엘스", "리센츠", "파크리오", "잠실주공5"],
  "목동": ["목동신시가지1", "목동신시가지7", "목동신시가지11", "신목동"],
  "반포동": ["반포자이", "아크로리버파크", "래미안퍼스티지", "반포한양"],
  "상계동": ["상계주공1", "상계주공2", "상계주공7", "상계벽산"],
  "중계동": ["중계그린", "중계청구", "중계라이프", "중계주공4"],
  "송도동": ["더샵송도아크베이", "송도더샵퍼스트파크", "송도아이파크", "송도힐스테이트"],
  "범어동": ["힐스테이트범어", "범어현대", "수성아이파크"],
  "이곡동": ["이곡성서", "달서힐스테이트"],
};

const DONG_LIST = Object.keys(DONG_DATA);

function matchDong(input) {
  if (!input) return [];
  const q = input.trim().toLowerCase();
  // 초성 검색 지원
  const CHO = ["ㄱ","ㄴ","ㄷ","ㄹ","ㅁ","ㅂ","ㅅ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ","ㄲ","ㄸ","ㅃ","ㅆ","ㅉ"];
  const CHO_MAP = {"ㄱ":"가".charCodeAt(0),"ㄴ":"나".charCodeAt(0),"ㄷ":"다".charCodeAt(0),"ㄹ":"라".charCodeAt(0),"ㅁ":"마".charCodeAt(0),"ㅂ":"바".charCodeAt(0),"ㅅ":"사".charCodeAt(0),"ㅇ":"아".charCodeAt(0),"ㅈ":"자".charCodeAt(0),"ㅊ":"차".charCodeAt(0),"ㅋ":"카".charCodeAt(0),"ㅌ":"타".charCodeAt(0),"ㅍ":"파".charCodeAt(0),"ㅎ":"하".charCodeAt(0),"ㄲ":"까".charCodeAt(0),"ㄸ":"따".charCodeAt(0),"ㅃ":"빠".charCodeAt(0),"ㅆ":"싸".charCodeAt(0),"ㅉ":"짜".charCodeAt(0)};
  const isCho = CHO.includes(q);
  return DONG_LIST.filter(d => {
    const dl = d.toLowerCase();
    if (isCho) {
      const first = d.charCodeAt(0);
      const choStart = CHO_MAP[q];
      if (!choStart) return dl.includes(q);
      const next = choStart + 588;
      return first >= choStart && first < next;
    }
    return dl.includes(q);
  }).slice(0, 8);
}

function DongAutocomplete({ value, onChange, onSelect, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(e) {
    const v = e.target.value;
    onChange(v);
    const matches = matchDong(v);
    setSuggestions(matches);
    setOpen(matches.length > 0 && v.length > 0);
  }

  function handleSelect(dong) {
    onChange(dong);
    setOpen(false);
    onSelect && onSelect(dong);
  }

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={() => { if (value && suggestions.length) setOpen(true); }}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
          {suggestions.map((d) => (
            <button
              key={d}
              onClick={() => handleSelect(d)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="font-medium">{d}</span>
              {DONG_DATA[d] && <span className="text-xs text-slate-400">{DONG_DATA[d].slice(0, 2).join(", ")} 외</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComplexAutocomplete({ dong, value, onChange, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const complexes = (dong && DONG_DATA[dong]) || [];

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = complexes.filter(c => !value || c.toLowerCase().includes(value.toLowerCase())).slice(0, 6);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (filtered.length) setOpen(true); }}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
          {filtered.map((c) => (
            <button key={c} onClick={() => { onChange(c); setOpen(false); }} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">{c}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 현재 Claude Artifact는 데모용 프론트엔드 MVP입니다.
// 실제 상용화 시 valuationEngine, loanEngine, taxEngine, recommendationEngine은
// 서버 API로 분리하고, 국토부 실거래가 API, 공공데이터, OCR, DB, 로그인,
// 결제 시스템을 연결해야 합니다. 프론트에는 계산식이 노출되지 않게 해야 합니다.
// ============================================================================
// [Phase 1-D] brand constants → imported from ./constants/brand.js

// ── 최근 분석 localStorage 유틸 ──
// device_id: 비로그인 사용자 식별용 (localStorage)


// localStorage 키 — userId 기반 분리 (다른 계정 데이터 격리)


// ── 내 저장함 (valuelens_saved_items) ──
// 구조: { analyses: [], favorites: [], candidates: [], assets: [] }
// 이번 1차 구현: analyses만 사용

// ══════════════════════════════════════════════════════════
// 백테스트 v3 기반 엔진 상수 및 헬퍼 함수
// ══════════════════════════════════════════════════════════
// [Phase 1-D] analyze engine (FALLBACK_RATIO ~ sellVerdict) → imported from ./engine/analyze.js


// ════════ SELL DECISION ENGINE ════════ (적정가 결과 r을 참고만 함 — 적정가 계산식 불변)
// sellVerdict는 '호가 적정성'만 판단하는 보조 함수로 격하. 최종 매도 판단은 analyzeSellerDecision이 담당.
// [Phase 1-D] market engine → imported from ./engine/market.js










function buildBuyerSentences(x) {
  const s = [];
  const gp = Math.abs(x.gap * 100).toFixed(1);
  if (x.specialMarketType === "redevelopment") s.push(`현재 가격은 재건축 기대감이 반영된 단지입니다. 실사용 가치(${won(x.intrinsicFairPrice)}) 대비 시장가(${won(x.marketReferencePrice)})에 약 ${(x.premiumRatio * 100).toFixed(0)}% 프리미엄이 있어 단순 저평가로 단정하기 어렵고 투자 리스크 검토가 필요합니다.`);
  else if (x.specialMarketType === "investmentPremium" || x.specialMarketType === "primePremium") s.push(`전세가율이 낮아 시장가가 실사용 가치를 크게 앞서는 단지입니다. 실거주보다 투자 관점의 접근과 리스크 점검이 필요합니다.`);
  else if (x.specialMarketType === "lowData" || x.specialMarketType === "abnormalInput") s.push(`데이터·입력값이 충분하지 않아 가격 적정성 판단을 보류합니다. 실거래·시세를 보강해 다시 분석하세요.`);
  else s.push(x.gap < 0 ? `현재 가격은 적정가보다 ${gp}% 낮습니다.` : `현재 가격은 적정가보다 ${gp}% 높습니다.`);
  if (x.shortfallCash > 0) s.push(`다만 필요 현금 대비 ${won(x.shortfallCash)}이 부족해 자금 보강이 선행되어야 합니다.`);
  else if (x.monthlyRatio != null) s.push(x.monthlyRatio > 45 ? `자금상 매수는 가능하지만 월상환 부담(소득 대비 ${x.monthlyRatio}%)이 높아 가격 협상 후 검토를 고려해볼 수 있습니다.` : x.monthlyRatio > 30 ? `자금 여건은 가능하나 월상환 부담이 다소 있어 여유 자금을 확인하세요.` : `자금·월상환 여건은 비교적 안정적입니다.`);
  const rw = [];
  if (x.supplyLevel === "높음") rw.push("입주물량 증가");
  if (x.policyLevel === "높음") rw.push("정책·재건축 규제");
  if (x.populationLevel !== "낮음") rw.push("인구 추세");
  if (rw.length) s.push(`다만 ${rw.join(" · ")} 위험이 확인되므로, 이 점을 감안해 접근하는 것이 바람직합니다.`);
  return s;
}


function BuyerDecisionCard({ bd, r, f }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const a = bd.affordability, h = bd.holding;
  const mrTone = (lv) => lv === "매우높음" ? "text-red-600" : lv === "높음" ? "text-orange-600" : lv === "보통" ? "text-amber-600" : lv === "평가 불가" ? "text-slate-500" : "text-emerald-600";
  const SP = { redevelopment: "재건축 기대", primePremium: "프라임 입지", investmentPremium: "투자 프리미엄", lowData: "데이터 부족", abnormalInput: "입력값 이상" }[bd.specialMarketType];

  // 가격·자금 종합 문장
  const priceOK = r.gapRatio <= 0.05;
  const fundProblem = a.fundRisk === "자금부족" || a.fundRisk === "위험";
  const verdict = bd.provisional ? "데이터·입력값이 부족해 판단을 보류합니다." :
    (priceOK && !fundProblem) ? "가격과 자금 조건 모두 양호합니다." :
    (priceOK && fundProblem) ? "가격은 적정 수준이나 자금 조건 보강을 검토해보세요." :
    (!priceOK && !fundProblem) ? "자금 조건은 양호하나 가격이 적정가 대비 높습니다." :
    "가격과 자금 조건 모두 부담이 있어 신중한 접근이 필요합니다.";

  return (
    <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
      {/* 헤더 */}
      <div className="px-6 py-5 text-white" style={{ backgroundColor: NAVY }}>
        <p className="text-xs text-slate-300">가격·자금 종합 판단{SP ? ` · ${SP}` : ""}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">{verdict}</p>
      </div>

      {/* 핵심 3개 */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
        <div className="px-3 py-3 text-center">
          <p className="text-[11px] text-slate-400">가격 위치</p>
          <p className={`mt-0.5 text-sm font-bold ${r.gapRatio < -0.03 ? "text-emerald-600" : r.gapRatio > 0.05 ? "text-red-500" : "text-slate-700"}`}>
            {r.gapRatio < -0.03 ? "저평가" : r.gapRatio > 0.05 ? "고평가" : "적정"}
          </p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-[11px] text-slate-400">자금 여건</p>
          <p className={`mt-0.5 text-sm font-bold ${fundProblem ? "text-red-500" : a.fundRisk === "안정" ? "text-emerald-600" : "text-amber-600"}`}>
            {a.fundRisk === "미입력" || a.fundRisk === "소득미입력" ? "정보 부족" : a.fundRisk}
          </p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-[11px] text-slate-400">시장 위험</p>
          <p className={`mt-0.5 text-sm font-bold ${mrTone(bd.marketRisk.level)}`}>{bd.marketRisk.level}</p>
        </div>
      </div>

      {/* 데이터 신뢰도 레이블 (숫자 없음) */}
      <div className="bg-slate-50 px-5 py-2 text-center text-[11px] text-slate-400">
        데이터 신뢰도 {r.dataConfLabel} · 거래 데이터 충분도 {bd.fitLabel}
      </div>

      {/* AI 문장 요약 */}
      {bd.sentences && bd.sentences.length > 0 && (
        <div className="border-t border-slate-100 bg-white px-5 py-4">
          <div className="space-y-1 text-sm leading-relaxed text-slate-700">
            {bd.sentences.slice(0, 2).map((t, i) => <p key={i}>{t}</p>)}
          </div>
        </div>
      )}

      {/* 특수시장 가격 분리 */}
      {bd.isSpecial && (
        <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-orange-100">
          <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">실사용 적정가</p><p className="mt-0.5 text-base font-bold text-slate-800">{won(bd.intrinsicFairPrice)}</p></div>
          <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">프리미엄 반영가</p><p className="mt-0.5 text-base font-bold text-amber-600">{won(bd.premiumAmount ? bd.intrinsicFairPrice + bd.premiumAmount : r.fairPrice)}</p></div>
        </div>
      )}

      {/* 상세 분석 접기 */}
      <div className="border-t border-slate-100">
        <button onClick={() => setDetailOpen(v => !v)} className="flex w-full items-center justify-between px-5 py-3 text-left">
          <span className="text-xs font-semibold text-slate-500">상세 분석</span>
          <span className="text-xs text-slate-400">{detailOpen ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
        {detailOpen && (
          <div className="border-t border-slate-100 px-5 pb-4 pt-3 space-y-4">
            {/* 자금 상세 */}
            {a.neededCash > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">자금 상세</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[["필요 현금", won(a.neededCash)], ["추가 필요 자금", a.shortfallCash > 0 ? won(a.shortfallCash) : "없음"], ["월 상환액", a.monthlyPayment ? won(a.monthlyPayment) : "—"], ["월상환 부담", a.monthlyRatio != null ? `${a.monthlyRatio}%` : "—"]].map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-slate-50 px-3 py-2 flex justify-between">
                      <span className="text-slate-400">{l}</span><span className="font-semibold text-slate-700">{v}</span>
                    </div>
                  ))}
                </div>
                {h.rateShock && h.rateShock[0]?.monthly > 0 && (
                  <p className="mt-2 text-[11px] text-slate-400">금리 시뮬레이션 · 현재 {h.rateShock[0].rate}% {won(h.rateShock[0].monthly)} → +1% {won(h.rateShock[1].monthly)} → +2% {won(h.rateShock[2].monthly)}</p>
                )}
              </div>
            )}
            {/* 위험 레이어 */}
            <div>
              <p className="mb-2 text-xs font-bold text-slate-600">위험 레이어</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(() => { const rl = bd.riskLayer; const t = (lv) => lv === "높음" ? "text-red-600" : lv === "보통" ? "text-amber-600" : "text-emerald-600"; return [["공급 위험", rl.supplyRisk.level], ["거래량", rl.volumeRisk.level], ["역전세 위험", h.reverseJeonseRisk], ["정책 위험", rl.policyRisk.level]].map(([l, lv]) => (
                  <div key={l} className="rounded-lg bg-slate-50 px-3 py-2 flex justify-between">
                    <span className="text-slate-400">{l}</span><span className={`font-semibold ${t(lv)}`}>{lv}</span>
                  </div>
                )); })()}
              </div>
            </div>
            {/* 핵심 이유 */}
            {bd.reasons && bd.reasons.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">판단 근거</p>
                <ol className="space-y-1.5">{bd.reasons.slice(0, 3).map((t, i) => <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-600"><span className="font-bold text-slate-300">{i + 1}</span><span>{t}</span></li>)}</ol>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="bg-slate-50 px-5 py-2.5 text-[11px] leading-relaxed text-slate-400">본 분석은 공개 데이터와 사용자 입력값 기반 참고용이며, 실제 감정평가·투자자문·매수 권유가 아닙니다. 최종 의사결정은 사용자 본인의 책임입니다.</div>
    </div>
  );
}

// ════════ OPPORTUNITY ENGINE (호재·악재) — 적정가 미반영, 매수판단 보조 레이어 ════════
// TODO(상용화): 프론트 → /api/opportunity-signals → 국토부 개발행위허가·도시계획·부동산원 입주물량·지자체 고시 + AI 요약 → 정리된 JSON 수신. API 키는 서버 환경변수(프론트 비노출).
function analyzeOpportunitySignals(f) {
  const blob = (f.region || "") + (f.dong || "") + (f.complexName || "");
  const pos = [], neg = [], neu = [];
  const S = (o) => ({ sourceType: "mock", confidence: 40, date: "2025", source: "자체 추정", impact: "보통", distanceNote: "", description: "", ...o });
  if (/대치|수서|강남|성남|분당|판교|동탄|운정|일산|송도|위례|마곡/.test(blob)) pos.push(S({ title: "GTX·광역철도 접근성", type: "positive", category: "교통", impact: "높음", confidence: 55, sourceType: "ai", source: "AI 요약(교통계획)", description: "GTX·광역철도 인접 지역으로 광역 접근성 개선 기대 (추진/검토 단계 혼재)", distanceNote: "역 도보권 추정" }));
  if (/대치|개포|상계|중계|목동|여의|압구정|반포|잠실|둔촌/.test(blob)) pos.push(S({ title: "정비사업·재건축 기대", type: "positive", category: "정비사업", impact: "높음", confidence: 50, sourceType: "ai", source: "AI 요약(정비사업)", description: "재건축·리모델링 추진 단지 인접 (사업 단계별 지연·분담금 불확실성 존재)" }));
  if (/대치|목동|중계|분당|반포|평촌/.test(blob)) pos.push(S({ title: "학군 우수 지역", type: "positive", category: "학군", impact: "보통", confidence: 45, sourceType: "mock", source: "자체 추정(학군 데이터)", description: "학원가·선호 학군 인접 — 실수요 견조 요인" }));
  if (/강남|판교|성남|여의|마곡|영등포/.test(blob)) pos.push(S({ title: "업무지구 접근성", type: "positive", category: "고용", impact: "보통", confidence: 50, sourceType: "ai", source: "AI 요약(고용)", description: "대규모 업무지구 접근성 양호 — 임차·실수요 뒷받침" }));
  if (/송도|연수|검단|운정|동탄|평택|일산|김포/.test(blob)) neg.push(S({ title: "향후 입주물량 부담", type: "negative", category: "공급", impact: "높음", confidence: 55, sourceType: "ai", source: "AI 요약(입주물량)", description: "향후 2년 인근 입주물량이 많아 단기 공급 부담 가능" }));
  if (/대구|부산|광주|대전|울산|경북|전북|전남|강원|충북/.test(blob) && !/세종/.test(blob)) neg.push(S({ title: "지역 인구 정체·감소 추세", type: "negative", category: "인구", impact: "보통", confidence: 45, sourceType: "mock", source: "자체 추정(인구 통계)", description: "중장기 인구 추세 약세 가능 — 수요 둔화 요인" }));
  if (!pos.length && !neg.length) neu.push(S({ title: "두드러진 호재·악재 신호 없음", type: "neutral", category: "개발", description: "현재 기준 특이 신호 없음" }));

  const impactPts = { 낮음: 6, 보통: 12, 높음: 18 };
  const positiveScore = pos.reduce((s, x) => s + (impactPts[x.impact] || 0), 0);
  const negativeScore = neg.reduce((s, x) => s + (impactPts[x.impact] || 0), 0);
  const opportunityScore = clamp(positiveScore - negativeScore, -100, 100);
  const opportunityLevel = opportunityScore >= 30 ? "호재 우세" : opportunityScore >= 10 ? "약한 호재" : opportunityScore <= -30 ? "악재 우세" : opportunityScore <= -10 ? "약한 악재" : "중립";
  const all = [...pos, ...neg, ...neu], tot = all.length || 1;
  const cov = { api: 0, ai: 0, mock: 0 }; all.forEach((x) => cov[x.sourceType]++);
  const sourceCoverage = { apiCoverage: Math.round(cov.api / tot * 100), aiCoverage: Math.round(cov.ai / tot * 100), mockCoverage: Math.round(cov.mock / tot * 100) };
  const opportunityConfidence = Math.round(all.reduce((s, x) => s + x.confidence, 0) / tot);
  return { positiveSignals: pos, negativeSignals: neg, neutralSignals: neu, opportunityScore, opportunityLevel, opportunityConfidence, sourceCoverage, summary: `${opportunityLevel} (호재 ${pos.length} · 악재 ${neg.length})` };
}


// ════════ ACCURACY REPORT (샘플 기준 적정가 일치도 — 시세 대비 적정가 차이율) ════════
const mkDeals = (center, n) => Array.from({ length: Math.max(0, n) }, (_, i) => ({ ym: `2025-${String(12 - (i % 12)).padStart(2, "0")}`, price: Math.round(center * (0.96 + (i % 5) * 0.02)), floor: 5 + (i % 8), topFloor: 15 }));
// 실거래/시세 기반 케이스 (2026.06 공개 시세 검색 기준 · 참고용 · 단위 만원)
const TEST_CASES = [
  { name: "동부 (노원 공릉)", type: "일반 구축", region: "노원구", dong: "공릉동", complexName: "동부", buildYear: 1999, areaExclusive: 59, pyeong: 25, currentPrice: 50000, kbSalePrice: 50250, kbJeonse: 35500, deals: mkDeals(35000, 7), saleDeals: mkDeals(50000, 7), actualPrice: 50250 },
  { name: "송도 더샵아크베이 (송도 신축)", type: "신축·공급악재", region: "연수구", dong: "송도동", complexName: "더샵송도아크베이", buildYear: 2023, areaExclusive: 84, pyeong: 34, currentPrice: 47000, kbSalePrice: 47000, kbJeonse: 35000, deals: mkDeals(35000, 7), saleDeals: mkDeals(47000, 7), actualPrice: 47000 },
  { name: "은마 (강남 재건축)", type: "재건축", region: "강남구", dong: "대치동", complexName: "은마", buildYear: 1979, areaExclusive: 84, pyeong: 31, currentPrice: 280000, kbSalePrice: 285000, kbJeonse: 60000, deals: mkDeals(60000, 6), saleDeals: mkDeals(285000, 6), actualPrice: 285000 },
  { name: "목동7단지 (양천 재건축)", type: "재건축·학군", region: "양천구", dong: "목동", complexName: "목동신시가지7", buildYear: 1986, areaExclusive: 66.6, pyeong: 27, currentPrice: 268000, kbSalePrice: 267500, kbJeonse: 72000, deals: mkDeals(72000, 6), saleDeals: mkDeals(267500, 6), actualPrice: 267500 },
  { name: "분당 시범우성 (선도지구)", type: "재건축·정책", region: "성남시 분당구", dong: "서현동", complexName: "시범우성", buildYear: 1991, areaExclusive: 84, pyeong: 32, currentPrice: 176000, kbSalePrice: 175000, kbJeonse: 70000, redevelopmentExpected: true, deals: mkDeals(70000, 6), saleDeals: mkDeals(175000, 6), actualPrice: 175000 },
  { name: "잠실엘스 (송파)", type: "전세가율 낮음", region: "송파구", dong: "잠실동", complexName: "잠실엘스", buildYear: 2008, areaExclusive: 84, pyeong: 34, currentPrice: 335000, kbSalePrice: 332000, kbJeonse: 115000, deals: mkDeals(115000, 7), saleDeals: mkDeals(332000, 7), actualPrice: 332000 },
  { name: "대구 수성 범어 (지방 학군특수)", type: "지방 특수", region: "수성구", dong: "범어동", complexName: "힐스테이트범어", buildYear: 2020, areaExclusive: 84.9, pyeong: 34, currentPrice: 164000, kbSalePrice: 164500, kbJeonse: 80000, deals: mkDeals(80000, 6), saleDeals: mkDeals(164500, 6), actualPrice: 164500 },
  { name: "대구 달서 구축 (지방 일반)", type: "지방 구축", region: "달서구", dong: "이곡동", complexName: "이곡성서", buildYear: 2004, areaExclusive: 84, pyeong: 33, currentPrice: 38000, kbSalePrice: 38000, kbJeonse: 30000, deals: mkDeals(30000, 6), saleDeals: mkDeals(38000, 6), actualPrice: 38000 },
];
function runCase(c) {
  const jeonseCalc = computeTrimmedMean(c.deals, Number(c.kbJeonse) || 0, "jeonse");
  const baseJeonse = jeonseCalc && jeonseCalc.value ? jeonseCalc.value : 0;
  const saleCalc = computeTrimmedMean(c.saleDeals, Number(c.kbSalePrice) || 0, "sale");
  const ff = { ...c, currentPrice: Number(c.currentPrice), baseJeonse, kbSalePrice: Number(c.kbSalePrice), saleRef: saleCalc && saleCalc.value ? saleCalc.value : null, jeonseUsed: jeonseCalc ? jeonseCalc.used : 0, saleUsed: saleCalc ? saleCalc.used : 0, jeonseCalc, saleCalc, dataSource: "manual" };
  const r = analyze(ff); r.jeonseCalc = jeonseCalc; r.saleCalc = saleCalc;
  const bd = analyzeBuyerDecision(r, { ...c, currentPrice: String(c.currentPrice) });
  const predicted = r.fairPrice || 0;
  const actual = c.actualPrice || c.kbSalePrice || predicted;
  const errorRate = actual ? Math.abs(actual - predicted) / actual : 0;
  return { c, r, bd, predicted, actual, errorRate };
}
// 고급 기능 — 관심단지·분석이력·백테스트 (메인에서 분리)
// 내 자산 — 관심단지 · 내 저장함 · 재무 프로필

// ── Smart Intent Parser ─────────────────────────────────────────────
// 자연어 → { intent, complexName, region, dong, pyeong, areaSqm, price, budget, purpose }
// 순수 JS 규칙 기반 — API 호출 없음, 비용 0
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// AIChatView — ValueLens AI 채팅 인터페이스
// ─────────────────────────────────────────────────────────────────────




// ValueLens — New HomeView (Phase 2)
// UI only — 기존 기능 연결 변경 금지

function HomeView({ onNavigate, history, onSaveHistory, currentUserId, currentUserEmail }) {
  const [query, setQuery] = React.useState("");
  const recentList = (history || []).slice(0, 3);

  const quickQuestions = [
    "4억으로 어디가 좋아?",
    "이 집 사도 될까?",
    "사진으로 분석해줘",
    "계약서 위험한 부분 봐줘",
  ];

  function handleSubmit() {
    if (!query.trim()) return;
    if (onNavigate) onNavigate("ai", { searchQuery: query.trim() });
  }

  function handleQuick(q) {
    setQuery(q);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const typeLabel = { fairValue: "적정가", buy: "매수", sell: "매도" };
  const typeColor = {
    fairValue: { bg: "#eff6ff", text: "#2563eb" },
    buy:       { bg: "#f0fdf4", text: "#16a34a" },
    sell:      { bg: "#fff7ed", text: "#ea580c" },
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: BRAND_BG,
      display: "flex",
      flexDirection: "column",
      maxWidth: 480,
      margin: "0 auto",
      padding: "0 16px 40px",
    }}>

      {/* ── 헤더 ── */}
      <div style={{ paddingTop: 52, paddingBottom: 32, textAlign: "center" }}>
        <div style={{
          width: 44, height: 44,
          borderRadius: 14,
          background: "#111",
          margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <h1 style={{
          fontSize: 22, fontWeight: 600, color: BRAND,
          margin: "0 0 6px", letterSpacing: "-0.02em",
        }}>
          AI Property Agent
        </h1>
        <p style={{ fontSize: 14, color: BRAND_MID, margin: 0, lineHeight: 1.6 }}>
          질문 하나로 부동산 판단을 시작하세요.
        </p>
      </div>

      {/* ── 입력창 ── */}
      <div style={{
        background: "#fff",
        border: "1px solid #e2e0da",
        borderRadius: 16,
        padding: "14px 14px 10px",
        marginBottom: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={"예: 4억으로 어디가 좋아? / 이 집 사도 될까?"}
          rows={3}
          style={{
            width: "100%", border: "none", outline: "none",
            resize: "none", fontSize: 15, lineHeight: 1.6,
            color: BRAND, background: "transparent",
            fontFamily: "inherit",
          }}
        />
        {/* 아이콘 버튼 행 */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
          {/* 사진 */}
          <button onClick={() => alert("사진 분석 — 준비 중")} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: BRAND_LIGHT, border: "none", borderRadius: 8,
            padding: "6px 10px", fontSize: 12, color: BRAND_MID,
            cursor: "pointer",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            사진
          </button>
          {/* PDF */}
          <button onClick={() => alert("PDF 분석 — 준비 중")} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: BRAND_LIGHT, border: "none", borderRadius: 8,
            padding: "6px 10px", fontSize: 12, color: BRAND_MID,
            cursor: "pointer",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            PDF
          </button>
          {/* 음성 */}
          <button onClick={() => alert("음성 입력 — 준비 중")} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: BRAND_LIGHT, border: "none", borderRadius: 8,
            padding: "6px 10px", fontSize: 12, color: BRAND_MID,
            cursor: "pointer",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            음성
          </button>
          {/* 전송 */}
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            style={{
              marginLeft: "auto",
              width: 32, height: 32, borderRadius: 10,
              background: query.trim() ? BRAND : BRAND_LIGHT,
              border: "none", cursor: query.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={query.trim() ? "#fff" : BRAND_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </button>
        </div>
      </div>

      {/* ── 빠른 질문 카드 ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, color: BRAND_MUTED, margin: "0 0 8px 2px", letterSpacing: "0.04em" }}>
          빠른 시작
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleQuick(q)}
              style={{
                background: "#fff",
                border: `1px solid ${query === q ? "#111" : "#e2e0da"}`,
                borderRadius: 10,
                padding: "10px 12px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 12,
                color: query === q ? BRAND : BRAND_MID,
                lineHeight: 1.5,
                fontWeight: query === q ? 500 : 400,
                transition: "all 0.12s",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── 최근 분석 ── */}
      {recentList.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: BRAND_MUTED, margin: "0 0 8px 2px", letterSpacing: "0.04em" }}>
            최근 분석
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentList.map((h, i) => {
              const tc = typeColor[h.analysisType] || { bg: "#f5f5f3", text: "#57534e" };
              const tl = typeLabel[h.analysisType] || h.analysisType;
              return (
                <button
                  key={i}
                  onClick={() => onNavigate && onNavigate(h.analysisType === "sell" ? "sell" : "fair")}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e0da",
                    borderRadius: 10,
                    padding: "10px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 500,
                    background: tc.bg, color: tc.text,
                    borderRadius: 5, padding: "2px 6px",
                    flexShrink: 0,
                  }}>{tl}</span>
                  <span style={{ fontSize: 12, color: BRAND, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {h.complexName} {h.area}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BRAND_MUTED} strokeWidth="1.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 하단 보조 메뉴 ── */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 8,
        marginTop: "auto",
        paddingTop: 8,
      }}>
        {[
          { label: "매수 분석", tab: "buy" },
          { label: "매도 분석", tab: "sell" },
          { label: "적정가",   tab: "fair" },
          { label: "추천 후보", tab: "reco" },
        ].map(({ label, tab }) => (
          <button
            key={tab}
            onClick={() => onNavigate && onNavigate(tab)}
            style={{
              background: "none",
              border: "1px solid #e2e0da",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              color: BRAND_MID,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

    </div>
  );
}




// ── 관리자 이메일 (Maintenance Mode 바이패스) ──
const ADMIN_EMAILS = [
  "asher20160916@gmail.com",  // 성현 (개발자)
  "gold9999@naver.com",        // 테스트 계정
];

function MaintenanceScreen() {
  return (
    <div style={{
      minHeight: "100dvh", background: BRAND_BG,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 32px", textAlign: "center",
    }}>
      {/* 로고 */}
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: BRAND_GREEN, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
          ValueLens
        </span>
        <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.10em", color: BRAND_MUTED, textTransform: "uppercase" }}>
          Property Intelligence
        </span>
      </div>

      {/* 아이콘 */}
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: BRAND_LIGHT, border: `0.5px solid ${BRAND_BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 28,
      }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none"
          stroke={BRAND_MUTED} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>

      {/* 제목 */}
      <h1 style={{
        fontSize: 22, fontWeight: 700, color: BRAND,
        letterSpacing: "-0.025em", lineHeight: 1.3,
        margin: "0 0 16px",
      }}>
        서비스 점검 중
      </h1>

      {/* 본문 */}
      <p style={{
        fontSize: 15, color: BRAND_MID, lineHeight: 1.75,
        letterSpacing: "-0.01em", margin: "0 0 32px",
        maxWidth: 320,
      }}>
        현재 ValueLens는 대규모 업데이트 중입니다.<br />
        더 완성도 높은 서비스를 위해<br />
        잠시 점검 중입니다.
      </p>

      {/* 서브 */}
      <p style={{ fontSize: 12, color: BRAND_MUTED, letterSpacing: "-0.005em" }}>
        곧 다시 만나요.
      </p>
    </div>
  );
}

function supplyAreaInfo(exclusiveSqm, supplySqm) {
  const excl = Number(exclusiveSqm) || 0;
  if (supplySqm && Number(supplySqm) > 0) {
    const supply = Math.round(Number(supplySqm));
    return { supply, pyeong: Math.round(supply / 3.3058), estimated: false };
  }
  // 공급면적 모르면 전용 ÷ 0.77 추정 (전용률 77% 가정 → 33평 정확)
  const supply = excl > 0 ? Math.round(excl / 0.77) : 0;
  return { supply, pyeong: supply > 0 ? Math.round(supply / 3.3058) : 0, estimated: true };
}

// 면적 버튼 라벨: 네이버 방식 — 공급면적(109㎡) 기준 + 하단 "전용 84.97㎡"
function areaButtonLabel(exclusiveSqm, supplySqm) {
  const excl = Number(exclusiveSqm) || 0;
  const supply = supplySqm && Number(supplySqm) > 0 ? Math.round(Number(supplySqm)) : null;
  if (supply) {
    const supplyPyeong = Math.round(supply / 3.3058);
    return {
      mainLabel: `${supply}㎡ (${supplyPyeong}평)`,
      subLabel: `전용 ${excl}㎡ 기준 분석`,
    };
  }
  // 공급면적 없으면 전용 × 1.35 추정
  const estSupply = excl > 0 ? Math.round(excl / 0.77) : 0;
  const estPyeong = estSupply > 0 ? Math.round(estSupply / 3.3058) : 0;
  return {
    mainLabel: estSupply > 0 ? `${estSupply}㎡ (${estPyeong}평, 추정)` : `전용 ${excl}㎡`,
    subLabel: excl > 0 ? `전용 ${excl}㎡ 기준 분석` : "",
  };
}
const exclusivePyeong = (sqm) => { sqm = Number(sqm) || 0; return sqm > 0 ? Math.round((sqm / 3.3058) * 10) / 10 : 0; };
const areaLabel = (sqm) => { sqm = Number(sqm) || 0; return sqm > 0 ? `전용 ${sqm}㎡ · 통상 약 ${typicalPyeong(sqm)}평형` : "면적 미확인"; };
const shift = (g, s) => GRADES[Math.max(0, Math.min(4, GRADES.indexOf(g) - s))];

const propertyTypes = [
  { key: "apartment", label: "아파트", ready: true },
  { key: "multiFamily", label: "다가구", ready: false },
  { key: "commercial", label: "상가", ready: false },
  { key: "oneRoom", label: "원룸", ready: true },
];
const apartmentTabsDef = [["fair", "적정가"], ["buy", "매수"], ["sell", "매도"], ["tax", "세금"], ["reco", "추천 후보"], ["adv", "내 자산"], ["logs", "🔍 로그"]];
const oneRoomTabsDef = [["search", "원룸 찾기"], ["manage", "원룸 관리"], ["yield", "원룸 수익률"]];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function ComingSoon({ title, desc }) {
  return (
    <div className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-2xl" style={{ backgroundColor: "#eef2ff" }}>🏗️</div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
      <p className="mt-4 text-xs text-slate-400">준비중입니다. 추후 해당 부동산 유형에 맞는 계산식이 추가됩니다.</p>
    </div>
  );
}

function AppInner() {
  const [ptype, setPtype] = useState("apartment");
  const [aptTab, setAptTab] = useState("home");
  const [screenerInitial, setScreenerInitial] = useState(null);
  const photoTriggerRef = React.useRef(null);
  const [roomTab, setRoomTab] = useState("search");
  const [history, setHistory] = useState(() => loadRecentAnalysis(null));
  const [watch, setWatch] = useState([]);
  const [finProfile, setFinProfile] = useState(null);
  const [buyCtx, setBuyCtx] = useState(null);
  const [sellCtx, setSellCtx] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  // ── Maintenance Mode 상태 ──
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);

  // ── User + Maintenance 동시 체크 ──
  React.useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email ?? null;
      setCurrentUserId(user?.id ?? null);
      setCurrentUserEmail(email);
      await checkMaintenance(email);
    }

    async function checkMaintenance(email) {
      try {
        const res = await fetch('/api/supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'maintenance' }),
        });
        const data = await res.json();
        const isOn = data?.value === "true";
        const admin = ADMIN_EMAILS.includes(email);
        console.log("[Maintenance]", isOn ? "점검중" : "정상", "/ admin:", admin, "/ email:", email);
        setMaintenanceMode(isOn && !admin);
      } catch (_) {
        setMaintenanceMode(false);
      } finally {
        setMaintenanceChecked(true);
      }
    }

    init();

    // auth 상태 변화 감지 (로그인/로그아웃 시 재체크)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const email = session?.user?.email ?? null;
      setCurrentUserId(session?.user?.id ?? null);
      setCurrentUserEmail(email);
      await checkMaintenance(email);
    });

    // 60초마다 갱신
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      await checkMaintenance(user?.email ?? null);
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // 점검 중이면 → 점검 화면 (관리자는 checkMaintenance에서 이미 false 처리)
  if (maintenanceChecked && maintenanceMode) {
    return <MaintenanceScreen />;
  }

  // 홈에서 탭으로 이동
  const goTo = (tab) => {
    setAptTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isHome = ptype === "apartment" && aptTab === "home";

  // 네비게이션 탭 (홈 제외)
  const navTabs = apartmentTabsDef;
  const oneRoomNavTabs = oneRoomTabsDef;
  const subTabs = ptype === "apartment" ? navTabs : ptype === "oneRoom" ? oneRoomNavTabs : null;
  const curSub = ptype === "apartment" ? aptTab : roomTab;
  const setSub = (k) => {
    if (ptype === "apartment") setAptTab(k);
    else setRoomTab(k);
  };

  return (
    <div className="min-h-screen" style={{ background: isHome ? BRAND_BG : "#f1f0ec" }}>

      {/* ── Nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 10,
        background: `rgba(250,250,248,0.93)`, backdropFilter: "blur(12px)",
        borderBottom: `0.5px solid ${BRAND_BORDER}`,
        WebkitBackdropFilter: "blur(12px)",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>

          {/* Top bar */}
          <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={() => { setPtype("apartment"); setAptTab("home"); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: BRAND }}>
                ValueLens
              </span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* 상위 타입 탭 */}
              {propertyTypes.filter(p => p.ready).map((pt) => (
                <button key={pt.key}
                  onClick={() => { setPtype(pt.key); if (pt.key === "apartment") setAptTab("home"); }}
                  style={{
                    fontSize: 12, fontWeight: 500, padding: "5px 11px",
                    borderRadius: 8, border: "none", cursor: "pointer",
                    background: ptype === pt.key ? BRAND : "transparent",
                    color: ptype === pt.key ? "#fff" : BRAND_MID,
                    transition: "all 0.15s",
                  }}
                >{pt.label}</button>
              ))}
            </div>
          </div>

          {/* Sub tabs — 홈이 아닐 때만 */}
          {!isHome && subTabs && (
            <div style={{
              display: "flex", gap: 4, overflowX: "auto", paddingBottom: 10,
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}>
              {/* 홈 버튼 */}
              {ptype === "apartment" && (
                <button
                  onClick={() => setAptTab("home")}
                  style={{
                    flexShrink: 0, fontSize: 12, fontWeight: 500,
                    padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: "transparent", color: BRAND_MID,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </button>
              )}
              {subTabs.map(([k, l]) => (
                <button key={k} onClick={() => setSub(k)}
                  style={{
                    flexShrink: 0, fontSize: 12, fontWeight: 500,
                    padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: curSub === k ? BRAND : "transparent",
                    color: curSub === k ? "#fff" : BRAND_MID,
                    transition: "all 0.15s",
                  }}
                >{l}</button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* ── Main ── */}
      <main style={{ maxWidth: 640, margin: "0 auto", padding: isHome ? "0" : "24px 16px" }}>
        {ptype === "apartment" && (<>
          {aptTab === "home" && (
            <HomeView
              history={history}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              onSaveHistory={(h) => {
                saveRecentAnalysis(h, currentUserId);
                setHistory(p => {
                  const deduped = p.filter(x => !(x.complexName===h.complexName && x.area===h.area && x.analysisType===h.analysisType));
                  return [h, ...deduped].slice(0, LS_MAX);
                });
              }}
              onNavigate={(tab, intentData) => {
                window.scrollTo({ top: 0, behavior: "smooth" });

                // intentData가 있으면 BuyView에 초기값 주입
                if (intentData && intentData.complexName) {
                  setScreenerInitial({
                    complexName:   intentData.complexName,
                    region:        intentData.region  || "",
                    dong:          intentData.dong    || "",
                    areaExclusive: intentData.areaSqm ? String(Math.round(intentData.areaSqm)) : "",
                    complexId:     null,
                    _intentPrice:  intentData.price   || null,
                    _intentBudget: intentData.budget  || null,
                    _intentPyeong: intentData.pyeong  || null,
                    _searchQuery:  intentData.searchQuery || null,
                  });
                } else if (intentData && intentData.searchQuery) {
                  // 단지명 불명확 — 검색창에 쿼리 전달
                  setScreenerInitial({ _searchQuery: intentData.searchQuery });
                }

                if (tab === "photo") {
                  setAptTab("fair");
                  setTimeout(() => photoTriggerRef.current?.click(), 120);
                } else {
                  setAptTab(tab === "fair" || tab === "buy" || tab === "sell" || tab === "reco" || tab === "tax" || tab === "adv" ? tab : "fair");
                }
              }}
            />
          )}
          <div style={{display: (aptTab === "fair" || aptTab === "buy") ? "block" : "none"}}>
            <BuyView mode={aptTab === "fair" ? "fair" : "buy"} screenerInitial={screenerInitial} onClearScreenerInitial={() => setScreenerInitial(null)} photoTriggerRef={photoTriggerRef} currentUserId={currentUserId} currentUserEmail={currentUserEmail} onSaveHistory={(h) => { saveRecentAnalysis(h, currentUserId); setHistory((p) => { const deduped = p.filter(x => !(x.complexName === h.complexName && x.area === h.area && x.analysisType === h.analysisType)); return [h, ...deduped].slice(0, LS_MAX); }); }} onAddWatch={(w) => setWatch((p) => [w, ...p.filter((x) => x.key !== w.key)])} onContext={(c) => setBuyCtx(c)} />
          </div>
          <div style={{display: aptTab === "sell" ? "block" : "none"}}>
            <SellView onContext={(c) => setSellCtx(c)} currentUserId={currentUserId} currentUserEmail={currentUserEmail} />
          </div>
          {aptTab === "tax" && <TaxView buyCtx={buyCtx} sellCtx={sellCtx} />}
          {aptTab === "logs" && <LogsView />}
          {aptTab === "reco" && <BudgetView onProfile={(p) => setFinProfile(p)} onGoToBuy={(init) => { setScreenerInitial(init); setAptTab("buy"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
          {aptTab === "adv" && <AdvancedView watch={watch} setWatch={setWatch} history={history} finProfile={finProfile} onReanalyze={() => setAptTab("fair")} uid={currentUserId} />}
        </>)}
        {ptype === "oneRoom" && <OneRoomView tab={roomTab} />}
        {ptype === "multiFamily" && <ComingSoon title="다가구 주택 분석" desc="호별 임대수익 환원법으로 다가구의 적정 매입가·수익가치를 평가합니다." />}
        {ptype === "commercial" && <ComingSoon title="상가 분석" desc="임대료·공실률·환원율 기반으로 상가의 수익가치와 입지를 평가합니다." />}
        {!isHome && (
          <p style={{ marginTop: 32, padding: "0 8px", fontSize: 11, lineHeight: 1.8, color: "#a8a29e" }}>{LEGAL}</p>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 법정동 코드 매핑 (국토부 API용) ──────────────────────────
// 법정동 앞 5자리 코드 (시군구 단위)
// ───────────────────────────────────────────────────────────────
// [Phase 1-D] location → imported from ./search/location.js


// ── Supabase 단지 검색 (국토부 API fallback 포함) ──
// ── 관련 검색어 생성 ──────────────────────────────────────────────────
// DB 응답(complexes 배열)에서 "지역 키워드" 조합으로 관련 검색어 생성
// 별도 API 호출 없이 이미 받은 결과에서 파생
// [Phase 1-D] supabase → imported from ./search/supabase.js

// ── 브랜드 단독 매칭 금지 키워드 (복합키 필수) ──
// [Phase 1-D] alias → imported from ./search/alias.js

// 전용면적 배열을 평형 그룹으로 묶기 (±2㎡ 이내 = 같은 그룹)
// 반환: [{ rep: 대표면적, areas: [59.97, 59.99, 60.0], pyeong: 25 }, ...]
// [Phase 1-D] utils → imported from ./search/utils.js

// [Phase 1-D] molit → imported from ./search/molit.js

// [Phase 1-D] apartment → imported from ./search/apartment.js

// ── 분석 입력 조립 모듈 (Transform Layer) ──────────────────────
// fetchApartmentData 결과(rawData)를 받아 analyze() 입력 형태로 변환.
// 조회 모듈과 계산 엔진 사이의 변환만 담당 — 두 모듈 모두 수정하지 않음.
//
// TODO(API 전환 시):
//   - rawData 구조가 달라지면 이 함수의 파싱 부분만 수정
//   - 반환 형태(ff, jeonseCalc, saleCalc, blockReason)는 유지
// ───────────────────────────────────────────────────────────────
// [Phase 1-D] input → imported from ./search/input.js
// ═══════════════════════════════════════════════════════════════

// ── 초성 매핑 ──
const CHO_RANGES = [
  ["ㄱ",0xAC00,0xB097],["ㄴ",0xB098,0xB2E3],["ㄷ",0xB2E4,0xB527],
  ["ㄹ",0xB528,0xB77B],["ㅁ",0xB77C,0xB9C7],["ㅂ",0xB9C8,0xBC13],
  ["ㅅ",0xBC14,0xBE5F],["ㅇ",0xBE60,0xC0AB],["ㅈ",0xC0AC,0xC2F7],
  ["ㅊ",0xC2F8,0xC543],["ㅋ",0xC544,0xC78F],["ㅌ",0xC790,0xC9DB],
  ["ㅍ",0xC9DC,0xCC27],["ㅎ",0xCC28,0xCE73],
];
function matchCho(str, cho) {
  const range = CHO_RANGES.find(([c]) => c === cho);
  if (!range || !str) return false;
  const code = str.charCodeAt(0);
  return code >= range[1] && code < range[2] + 588;
}
function fuzzyMatch(text, query) {
  if (!query) return true;
  const q = query.trim();
  const t = (text||"").replace(/\s/g,"");
  if (q.length === 1 && /[ㄱ-ㅎ]/.test(q)) return matchCho(t, q);
  return t.toLowerCase().includes(q.replace(/\s/g,"").toLowerCase());
}

// ── 주소 단계별 선택 컴포넌트 ──


// ConfirmStep — AI 조회값 확인 및 수정 카드
// - 읽기전용 테이블 → 수정 가능 입력 카드로 전환
// - 고급설정/직접입력 기능 흡수 (별도 메뉴 최소화)
// - 사용자가 값을 검증하고 수정한 뒤 분석 실행

// 적정가 화면 — 집 자체의 가치평가 전용 (매수판단·자금·대출·월상환 표시 안 함)



// ═══════════════════════════════════════════════════════════
// 로그 뷰어 — 조회 이력 확인 (관리자용)
// ═══════════════════════════════════════════════════════════







function Empty({ title, desc }) {
  return <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100"><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-400">{desc}</p></div>;
}





ReactDOM.createRoot(document.getElementById('root')).render(<App />);

export default function App() { return <AuthGate><AppInner /></AuthGate>; }
