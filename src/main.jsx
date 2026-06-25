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
import { getOrCreateDeviceId } from './utils/device.js';



import React, { useState, useRef, useEffect } from "react";
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
const LS_KEY = (uid) => uid ? `valuelens_recent_analysis_${uid}` : "valuelens_recent_analysis_guest";
const LS_MAX = 20;

function loadRecentAnalysis(uid) {
  try {
    const raw = localStorage.getItem(LS_KEY(uid));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentAnalysis(item, uid) {
  try {
    const prev = loadRecentAnalysis(uid);
    // 같은 단지+면적+타입 중복 제거
    const deduped = prev.filter(p =>
      !(p.complexName === item.complexName && p.area === item.area && p.analysisType === item.analysisType)
    );
    const next = [item, ...deduped].slice(0, LS_MAX);
    localStorage.setItem(LS_KEY(uid), JSON.stringify(next));
  } catch {}
}

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
function parseIntent(raw) {
  const t = (raw || "").trim();
  const n = t.replace(/\s/g, "").toLowerCase();

  // ── intent 판별 ──
  let intent = "fair";
  if (/팔까|매도|팔려고|팔아야|호가|내집|내가산|내꺼|팔면|팔것|팔지/.test(n)) intent = "sell";
  else if (/추천|예산|살곳|어디살|뭐살|뭐사|어디사|골라|골라줘|찾아줘|찾아|예산으로|안에서|이하로|이내로/.test(n)) intent = "recommend";
  else if (/사도돼|사도될까|살만해|살만한가|살까|매수|지금사|살지|살래|살수있나|사볼까/.test(n)) intent = "buy";

  // ── 평형 추출 ──
  let pyeong = null;
  const pyeongMatch = t.match(/(\d+)\s*평/);
  if (pyeongMatch) pyeong = parseInt(pyeongMatch[1]);

  // 전용면적 추출
  let areaSqm = null;
  const sqmMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:㎡|m²|제곱미터)/);
  if (sqmMatch) areaSqm = parseFloat(sqmMatch[1]);
  if (pyeong && !areaSqm) areaSqm = Math.round(pyeong * 3.305785);

  // ── 가격 추출 ──
  let price = null, budget = null;
  const priceMatch = t.match(/(\d+(?:\.\d+)?)\s*억\s*(?:(\d+)\s*(?:천만?)?)?/);
  if (priceMatch) {
    let val = parseFloat(priceMatch[1]) * 10000;
    if (priceMatch[2]) { const sub = parseInt(priceMatch[2]); val += sub >= 1000 ? sub : sub * 1000; }
    price = val;
    if (intent === "recommend") budget = val;
  }

  // ── 지역·단지명 추출 ──
  let complexName = null, region = null, dong = null;

  // 제거할 패턴들 (지역어, 의도어, 수식어)
  const NOISE = [
    // 의도어
    /얼마야|얼마에요|얼마임|어때|어때요|사도돼|사도될까|살만해|팔까|팔려고|알려줘|알려주세요|분석해줘|봐줘|적정가|시세|가격은|가격이|지금|현재|요즘|이번에|한번|좀/g,
    // 수량/면적
    /\d+평|\d+㎡|\d+억[^\s]*/g,
    // 지역 광역시도
    /서울|경기|인천|부산|대구|광주|대전|울산|세종|충북|충남|전북|전남|경북|경남|제주/g,
    // 조사/어미
    /은|는|이|가|을|를|에서|에|의|로|으로|랑|이랑|과|와|도/g,
  ];

  // 구/시/군 추출 — 2글자 이상 지역명만 ("헬리오시" 같은 오인 방지)
  const guMatch = t.match(/([가-힣]{2,5}(?:특별시|광역시|특별자치시|도|시|구|군))(?!\w)/);
  if (guMatch) region = guMatch[1];

  // 동 추출
  const dongMatch = t.match(/([가-힣]{2,5}동)/);
  if (dongMatch) dong = dongMatch[1];

  // recommend가 아닐 때만 complexName 추출
  if (intent !== "recommend") {
    // 노이즈 제거 후 남은 한글+영문 덩어리가 complexName 후보
    let cleaned = t
      .replace(/\d+억\d*(?:천만?)?/g, " ")   // 가격
      .replace(/\d+평/g, " ")                 // 평형
      .replace(/\d+㎡/g, " ")                 // 면적
      .replace(/[서울|경기|인천|부산|대구|광주|대전|울산|세종|충북|충남|전북|전남|경북|경남|제주]/g, " ")
      .replace(/얼마야|얼마에요|어때요?|사도돼|사도될까|팔까|알려줘|분석해줘|봐줘|지금|현재|적정가|시세/g, " ")
      .replace(/\s+/g, " ").trim();

    // "구/시/군" 다음에 오는 단어 = 단지명 후보
    // "동" 다음에 오는 단어 = 단지명 후보
    // 또는 가장 긴 명사 덩어리 선택
    const dongAfter = t.match(/[가-힣]{2,5}동\s+([가-힣a-zA-Z0-9]+(?:\s+[가-힣a-zA-Z0-9]+)?)/);
    const guAfter   = t.match(/[가-힣]{2,5}[구시군]\s+([가-힣a-zA-Z0-9]+(?:\s+[가-힣a-zA-Z0-9]+)?)/);

    if (dongAfter && !dongAfter[1].match(/얼마|어때|사도|팔까|추천/)) {
      complexName = dongAfter[1].trim().replace(/\s*\d+평.*$/, "").replace(/\s*\d+㎡.*$/, "").trim();
      dong = t.match(/([가-힣]{2,5}동)/)?.[1] || dong;
    } else if (guAfter && !guAfter[1].match(/얼마|어때|사도|팔까|추천/)) {
      complexName = guAfter[1].trim().replace(/\s*\d+평.*$/, "").replace(/\s*\d+㎡.*$/, "").trim();
    } else {
      // fallback: cleaned 텍스트에서 가장 긴 한글+영문 토큰
      const tokens = cleaned.split(/\s+/).filter(tok =>
        tok.length >= 2 &&
        !tok.match(/^(서울|경기|인천|부산|대구|광주|대전|울산|은|는|이|가|을|를|에|의|로|도)$/) &&
        !tok.match(/[구시군]$/) &&
        tok !== dong
      );
      if (tokens.length > 0) {
        // 가장 긴 것 선택 (보통 단지명이 가장 길다)
        complexName = tokens.sort((a,b) => b.length - a.length)[0];
      }
    }

    // complexName이 지역어/의도어만인 경우 무효화
    if (complexName && complexName.match(/^(얼마|어때|사도|팔까|지금|현재|적정|시세|얼마야|추천)$/)) {
      complexName = null;
    }
  }

  // 목적 추출
  let purpose = "live";
  if (/투자|임대|전세끼|갭투자|갭/.test(n)) purpose = "invest";
  else if (/학군|학교|교육/.test(n))         purpose = "school";
  else if (/재건축|재개발/.test(n))           purpose = "rebuild";
  else if (/교통|역세권|지하철/.test(n))       purpose = "transport";

  return { intent, complexName, region, dong, pyeong, areaSqm, price, budget, purpose, raw: t };
}
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// AIChatView — ValueLens AI 채팅 인터페이스
// ─────────────────────────────────────────────────────────────────────
const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:bg-white";

function TaxView({ buyCtx, sellCtx }) {
  const [mode, setMode] = useState("acq");
  const [price, setPrice] = useState(""), [area, setArea] = useState(""), [houses, setHouses] = useState("1"), [regulated, setRegulated] = useState(false), [firstTime, setFirstTime] = useState(false);
  const [buyP, setBuyP] = useState(""), [sellP, setSellP] = useState(""), [years, setYears] = useState("5"), [livedY, setLivedY] = useState(""), [oneHouse, setOneHouse] = useState(true), [expenses, setExpenses] = useState(""), [loanBal, setLoanBal] = useState(""), [acqRegulated, setAcqRegulated] = useState(false), [sellHouses, setSellHouses] = useState("1");
  const [cx, setCx] = useState({ temp2: false, inherit: false, right: false, rental: false, corp: false, expenseManual: false }); // 고난도 세무 케이스 플래그 (정밀계산 X, 주의표시용)
  const COMPLEX = [["temp2", "일시적 2주택 가능성 있음"], ["inherit", "상속/증여 주택 포함"], ["right", "분양권/입주권 보유"], ["rental", "임대사업자"], ["corp", "법인 보유"], ["expenseManual", "필요경비 직접 입력"]];
  const anyComplex = Object.values(cx).some(Boolean);
  const acq = price ? calculateAcquisitionTax({ price: Number(price), area85over: Number(area) > 85, houses: Number(houses), regulated, firstTime }) : null;
  const cgt = buyP && sellP ? calculateCapitalGainsTax({ buy: Number(buyP), sell: Number(sellP), years: Number(years), oneHouse, lived: Number(livedY) > 0, livedYears: livedY === "" ? null : Number(livedY), expenses: Number(expenses) || 0, acquiredRegulated: acqRegulated, houses: Number(sellHouses) || (oneHouse ? 1 : 2) }) : null;
  const ETC = 200, BROK = (p) => Math.round(p * 0.004);
  const buyBrok = price ? BROK(Number(price)) : 0, buyTotalCash = price ? Number(price) + (acq ? acq.total : 0) + buyBrok + ETC : 0;
  const sellBrok = sellP ? BROK(Number(sellP)) : 0, netCash = sellP && cgt ? Number(sellP) - cgt.tax - sellBrok - (Number(loanBal) || 0) - ETC : 0;
  const Row = ({ l, v, strong }) => <div className={`flex justify-between border-t border-slate-100 px-4 py-2.5 text-sm ${strong ? "bg-slate-50 font-bold text-slate-800" : ""}`}><span className={strong ? "text-slate-700" : "text-slate-500"}>{l}</span><span className="font-semibold text-slate-800">{v}</span></div>;
  return (
    <>
      <header className="mb-6 text-center"><h1 className="text-2xl font-bold text-slate-900">부동산 세금 계산</h1><p className="mt-2 text-sm text-slate-500">매수 시 취득세 / 매도 시 양도세를 개략 추정합니다.</p></header>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setMode("acq")} className={`flex-1 rounded-2xl py-3 text-sm font-bold ${mode === "acq" ? "text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`} style={mode === "acq" ? { backgroundColor: NAVY } : {}}>매수 세금 (취득세)</button>
        <button onClick={() => setMode("cgt")} className={`flex-1 rounded-2xl py-3 text-sm font-bold ${mode === "cgt" ? "text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`} style={mode === "cgt" ? { backgroundColor: NAVY } : {}}>매도 세금 (양도세)</button>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        {((Number(price) < 0) || (Number(buyP) < 0) || (Number(sellP) < 0)) && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700">⚠️ 음수 금액은 계산에 사용할 수 없습니다. (0으로 처리됩니다)</div>}
        {mode === "acq" ? (
          <>
            {buyCtx && buyCtx.price ? <button onClick={() => { setPrice(String(buyCtx.price)); setArea(String(buyCtx.area || "")); }} className="mb-4 w-full rounded-xl bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700">↓ 매수 화면에서 분석한 값 불러오기 ({won(buyCtx.price)})</button> : null}
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">매수가 (만원)</span><input type="number" className={inp} value={price} placeholder="50000" onChange={(e) => setPrice(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">전용면적 (㎡)</span><input type="number" className={inp} value={area} placeholder="59" onChange={(e) => setArea(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">보유 주택 수</span><input type="number" className={inp} value={houses} onChange={(e) => setHouses(e.target.value)} /></label>
              <div className="flex flex-col justify-end gap-1.5 pb-2.5">
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={regulated} onChange={(e) => setRegulated(e.target.checked)} />조정대상지역</label>
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={firstTime} onChange={(e) => setFirstTime(e.target.checked)} />생애최초 (12억 이하)</label>
              </div>
            </div>
            {acq && (
              <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <div className="px-4 py-3 text-white" style={{ backgroundColor: NAVY }}><p className="text-xs text-slate-300">총 필요 현금 개략 추정 (매수가 + 부대비용)</p><p className="text-2xl font-bold">{won(buyTotalCash)}</p></div>
                <Row l="매수가" v={won(Number(price))} />
                <Row l={`취득세 본세 (세율 ${(acq.rate * 100).toFixed(1)}%)`} v={won(acq.main)} />
                {acq.firstHomeDiscount > 0 && <Row l="└ 생애최초 감면" v={`− ${won(acq.firstHomeDiscount)}`} />}
                <Row l="지방교육세" v={won(acq.edu)} /><Row l="농어촌특별세 (85㎡ 초과)" v={won(acq.farm)} />
                <Row l="중개수수료 (개략 0.4%)" v={won(buyBrok)} /><Row l="기타 비용 개략 (법무·등기 등)" v={won(ETC)} />
                <Row l="총 필요 현금 개략 추정" v={won(buyTotalCash)} strong />
                <p className="bg-slate-50 px-4 py-2 text-[11px] text-slate-400">중개수수료는 0.4% 개략입니다. TODO(API/정책): 실제 중개보수 상한요율표로 교체 예정. · 총 필요 현금은 추천후보 탭 「내 조건」의 보유 현금·대출 가능액 개략 추정과 함께 해석하세요(보유 현금 + 대출 가능액 ≥ 총 필요 현금 여부).</p>
              </div>
            )}
          </>
        ) : (
          <>
            {sellCtx && sellCtx.sellPrice ? <button onClick={() => { setBuyP(String(sellCtx.acqPrice || "")); setSellP(String(sellCtx.sellPrice)); setYears(String(sellCtx.years || 5)); setLoanBal(String(sellCtx.loanBalance || "")); }} className="mb-4 w-full rounded-xl bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-700">↓ 매도 화면에서 평가한 값 불러오기 ({won(sellCtx.sellPrice)})</button> : null}
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">취득가 (만원)</span><input type="number" className={inp} value={buyP} placeholder="40000" onChange={(e) => setBuyP(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">매도가 (만원)</span><input type="number" className={inp} value={sellP} placeholder="60000" onChange={(e) => setSellP(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">보유기간 (년)</span><input type="number" className={inp} value={years} onChange={(e) => setYears(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">실거주기간 (년)</span><input type="number" className={inp} value={livedY} placeholder="0" onChange={(e) => setLivedY(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">필요경비 (만원, 선택)</span><input type="number" className={inp} value={expenses} placeholder="0" onChange={(e) => setExpenses(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">대출잔액 (만원)</span><input type="number" className={inp} value={loanBal} placeholder="0" onChange={(e) => setLoanBal(e.target.value)} /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">현재 주택 수</span><input type="number" className={inp} value={sellHouses} onChange={(e) => setSellHouses(e.target.value)} /></label>
              <div className="flex flex-col justify-end gap-1.5 pb-2.5">
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={oneHouse} onChange={(e) => setOneHouse(e.target.checked)} />1세대 1주택</label>
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={acqRegulated} onChange={(e) => setAcqRegulated(e.target.checked)} />취득 당시 조정대상지역</label>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-600">복잡 세무 케이스 체크 (정밀 계산 아님 · 해당 시 세무사 확인 필요)</p>
              <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {COMPLEX.map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={cx[k]} onChange={(e) => setCx((p) => ({ ...p, [k]: e.target.checked }))} />{label}</label>
                ))}
              </div>
            </div>
            {anyComplex && (
              <div className="mt-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700">⚠️ 복잡 세무 케이스입니다.</p>
                <p className="mt-1 text-xs leading-relaxed text-red-600">본 계산은 일반 1주택·다주택 기준의 <b>단순 개략 추정</b>이며, 체크하신 항목(일시적 2주택·상속/증여·분양권/입주권·임대사업자·법인 등)은 별도 세법이 적용되어 <b>이 추정에 반영되지 않았습니다</b>. 실제 세액은 반드시 <b>세무사 확인을 권장합니다.</b></p>
              </div>
            )}
            {cgt && (
              <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                <div className="px-4 py-3 text-white" style={{ backgroundColor: NAVY }}><p className="text-xs text-slate-300">최종 실수령액 개략 추정 (대출상환 후)</p><p className="text-2xl font-bold">{won(netCash)}</p></div>
                <div className={`px-4 py-2 text-xs font-semibold ${cgt.exempt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{cgt.statusMsg}</div>
                <Row l="매도가" v={won(Number(sellP))} />
                <Row l={`양도차익 (필요경비 ${Number(expenses) > 0 ? won(Number(expenses)) + " 반영" : "0"} 차감)`} v={won(cgt.gain)} />
                {cgt.over > 0 && cgt.over !== cgt.gain && <Row l="└ 과세 대상 (12억 초과분)" v={won(cgt.over)} />}
                {cgt.ltd > 0 && <Row l={`└ 장기보유특별공제 ${Math.round(cgt.ltd * 100)}%`} v={`− ${won(Math.round(cgt.over * cgt.ltd))}`} />}
                <Row l="과세표준 (기본공제 250만 차감)" v={won(cgt.taxable || 0)} />
                <Row l="양도소득세 본세 개략 추정" v={won(cgt.baseTax || 0)} /><Row l="지방소득세 (10%)" v={won(cgt.localTax || 0)} />
                <Row l="양도세 합계 개략 추정" v={won(cgt.tax)} />
                <Row l="중개수수료 (개략 0.4%)" v={won(sellBrok)} /><Row l="대출잔액 상환" v={won(Number(loanBal) || 0)} /><Row l="기타 비용 개략" v={won(ETC)} />
                <Row l="최종 실수령액 개략 추정" v={won(netCash)} strong />
              </div>
            )}
          </>
        )}
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">세금 숫자는 <b>개략 추정</b>이며 최종 확정값이 아닙니다. 실제 세액은 보유기간, 거주요건, 세대 주택 수, 조정대상지역, 필요경비, 세법 변경, 일시적 2주택, 상속·증여·분양권·입주권 여부에 따라 달라질 수 있습니다. <b>세무사 확인이 필요합니다.</b></p>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h3 className="text-sm font-bold text-slate-700">세금 주의사항</h3>
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-500">
          <li>· 본 계산은 일반적인 1세대 1주택·다주택 케이스의 <b>개략 추정</b>이며 실제 세액과 다를 수 있습니다.</li>
          <li>· 세율·공제·비과세 기준은 <b>세법 변경</b>으로 달라질 수 있습니다.</li>
          <li>· 아래 경우는 별도 계산식이 필요해 <b>이번 추정에 반영되지 않았습니다</b> — 세무사 확인이 필요합니다:</li>
          <li className="pl-3 text-slate-400">일시적 2주택 비과세 / 상속·증여주택 / 분양권·입주권 / 재건축 입주권 전환 / 법인 보유 / 임대사업자 / 조정대상지역 지정·해제 이력 / 필요경비 상세 분류 / 실제 중개보수 상한요율표 / 종합부동산세</li>
          <li>· 최종 의사결정 전 반드시 세무 전문가의 확인을 받으세요.</li>
        </ul>
      </div>

      {/* ── 세금 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const buyP = Number(buyCtx?.price) || 0;
            const sellP = Number(sellCtx?.price) || 0;
            const acq = buyP > 0 ? acqTax(buyP) : null;
            const text = `ValueLens 세금 개략 추정 리포트
${"=".repeat(40)}
발행일: ${date}
⚠ 본 리포트의 세금 수치는 개략 추정이며 확정값이 아닙니다.
   반드시 세무사 확인 후 의사결정 하세요.

${buyP > 0 ? `[매수 세금 개략]
  매수가: ${won(buyP)}
  취득세 개략: ${acq ? won(acq.total) : "—"}
  (세율·공제는 주택 수·조정지역·면적에 따라 달라짐)
` : ""}${sellP > 0 ? `[매도 세금 개략]
  매도가: ${won(sellP)}
  (양도세는 취득가·보유기간·거주요건·주택 수에 따라 크게 달라짐)
  세무사를 통해 정확한 세액을 확인하세요.
` : ""}
[반영되지 않은 항목]
  · 일시적 2주택 비과세
  · 상속·증여주택 / 분양권·입주권
  · 임대사업자 / 법인 보유
  · 조정대상지역 지정·해제 이력
  · 필요경비 상세 분류
  · 종합부동산세

${"=".repeat(40)}
📋 세금은 반드시 세무사와 상담하세요
□ 세무사에게 취득세 정확한 세액을 확인했나요?
□ 양도세는 보유기간·거주요건·주택 수에 따라 크게 달라집니다.
   세무사 상담을 받았나요?
□ 일시적 2주택·분양권·입주권 등 특수 상황을
   세무사에게 알렸나요?
□ 종합부동산세·재산세 부담도 함께 확인했나요?

본 리포트의 세금 수치는 개략 추정이며
실제 세액과 다를 수 있습니다.
반드시 세무사 확인 후 의사결정 하세요.

[엔진 주의사항]
본 리포트는 국토부 실거래 및 입력 데이터를 바탕으로 한 참고용 분석입니다.
ValueLens의 적정가는 보장 가격이나 감정평가액이 아니며,
특히 데이터 부족, 전세가율 이상치, 재건축·학군·희소성 영향 단지는
분석 신뢰도가 낮을 수 있습니다.

━━━━━━━━━━━━━━━━━━
ValueLens 이용 전 확인사항

본 결과는 공공데이터, 사용자 입력,
AI 분석을 기반으로 생성된
가격평가 참고자료입니다.

감정평가서가 아닙니다.
투자자문이 아닙니다.
매수·매도 권유가 아닙니다.

실제 거래 전에는
공인중개사, 세무사, 금융기관 등
전문가와 확인하시기 바랍니다.
━━━━━━━━━━━━━━━━━━
Powered by ValueLens

[분석 주의사항 — ValueLens 엔진 v3]
본 리포트는 국토부 실거래 및 입력 데이터를 바탕으로 한 참고용 분석입니다.
ValueLens의 적정가는 보장 가격이나 감정평가액이 아니며,
매수·매도 결정은 사용자의 최종 판단과 전문가 상담을 통해 진행해야 합니다.
특히 데이터 부족, 전세가율 이상치, 재건축·학군·희소성 영향 단지는
분석 신뢰도가 낮을 수 있습니다.`;
            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ValueLens_세금개략_${date.replace(/\./g, "")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">📄 세금 개략 추정 리포트 저장</p>
            <p className="mt-0.5 text-xs text-amber-600">⚠ 개략 추정값 · 반드시 세무사 확인 필요</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>
    </>
  );
}

function AIChatView({ onNavigate, history, onSaveHistory, currentUserId, currentUserEmail }) {

  // ── 아이콘 ──
  const CI = ({ d, s = 16, color = "currentColor", sw = 1.35 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d==="send"    && <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>}
      {d==="mic"     && <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>}
      {d==="clip"    && <><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></>}
      {d==="search"  && <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}
      {d==="chevron" && <polyline points="6 9 12 15 18 9"/>}
      {d==="right"   && <polyline points="9 18 15 12 9 6"/>}
      {d==="x"       && <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
      {d==="home"    && <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}
      {d==="star"    && <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>}
      {d==="alert"   && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
    </svg>
  );

  // ── 메시지 타입 ──
  // { id, role: 'user'|'ai', type: 'text'|'thinking'|'result'|'candidates'|'clarify'|'error', content, data }

  const WELCOME = {
    id: "welcome", role: "ai", type: "text",
    content: "안녕하세요. 부동산에 대해 무엇이든 물어보세요.\n단지명·지역·평형·가격을 자유롭게 말씀하시면 분석해드립니다.",
  };

  const [msgs, setMsgs]           = React.useState([WELCOME]);
  const [input, setInput]         = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [advOpen, setAdvOpen]     = React.useState(false);  // 고급 검색 접기
  const [pendingIntent, setPendingIntent] = React.useState(null); // 후보 선택 대기

  const bottomRef  = React.useRef(null);
  const inputRef   = React.useRef(null);
  const fileRef    = React.useRef(null);

  // placeholder 순환
  const PHS = [
    "공릉동 동부 25평 얼마야?",
    "잠실 리센츠 지금 사도 돼?",
    "내 집 9억에 팔까?",
    "7억으로 노원구 추천해줘",
    "대치 래미안 84㎡ 적정가",
  ];
  const [phIdx, setPhIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setPhIdx(i => (i+1) % PHS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // 스크롤 하단 유지
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // ── 메시지 추가 헬퍼 ──
  function addMsg(msg) {
    setMsgs(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }
  function replaceLastAI(msg) {
    setMsgs(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === "ai") { copy[i] = { ...copy[i], ...msg }; break; }
      }
      return copy;
    });
  }

  // ── 메인 핸들러 ──
  async function handleSend(txt) {
    const text = (txt || input).trim();
    if (!text) return;
    setInput("");
    setPendingIntent(null);

    // 1. 사용자 메시지 추가
    addMsg({ role: "user", type: "text", content: text });

    // 2. 파싱
    const intent = parseIntent(text);

    // 3. thinking 표시
    addMsg({ role: "ai", type: "thinking", content: "분석 중..." });

    // 4. 단지 검색
    await routeIntent(intent, text);
  }

  async function routeIntent(intent, rawText) {
    try {
      // ── recommend → 예산 추천 탭으로 바로 이동 ──
      if (intent.intent === "recommend") {
        const region = intent.region || intent.dong || "";
        const budgetWon = intent.budget || intent.price || 0;
        const budgetStr = budgetWon ? `${Math.round(budgetWon / 10000)}억` : "";
        replaceLastAI({
          type: "clarify",
          content: [
            "예산 추천 검색으로 이동합니다.",
            region    ? `지역: ${region}` : null,
            budgetStr ? `예산: ${budgetStr}` : null,
            intent.pyeong ? `평형: ${intent.pyeong}평` : null,
          ].filter(Boolean).join(" · "),
          onSearch: () => onNavigate("reco", intent),
          searchLabel: "AI 검토 후보 열기",
        });
        return;
      }

      let complexes = [];
      if (intent.complexName) {
        const kw = intent.complexName;
        const tokens2 = kw.trim().split(/\s+/);
        let pool = [];
        if (tokens2.length >= 2) {
          const combined1 = tokens2.join("");
          const combined2 = [...tokens2.slice(1), tokens2[0]].join("");
          const [r1, r2] = await Promise.all([
            searchComplexFromSupabase(combined1, "", ""),
            searchComplexFromSupabase(combined2, "", ""),
          ]);
          const seen = new Set();
          for (const r of [r1, r2]) {
            if (r.fromSupabase) for (const c of r.complexes) {
              if (!seen.has(c.id)) { seen.add(c.id); pool.push(c); }
            }
          }
        }
        if (pool.length === 0) {
          const r = await searchComplexFromSupabase(kw, intent.region || "", intent.dong || "");
          if (r.fromSupabase) pool = r.complexes;
        }
        complexes = pool.slice(0, 8);
      }

      // ── 단지 0개 → clarify ──
      if (complexes.length === 0) {
        replaceLastAI({
          type: "clarify",
          content: intent.complexName
            ? `"${intent.complexName}" 단지를 DB에서 찾지 못했습니다.\n단지명을 더 구체적으로 입력하거나, 아래 검색을 이용해주세요.`
            : "단지명이나 지역을 함께 입력해주세요.\n예: \"공릉동 동부 25평\" 또는 \"잠실 리센츠\"",
          onSearch: () => {
            onNavigate("fair", { searchQuery: rawText });
          },
        });
        return;
      }

      // ── 단지 1개 → 바로 분석 ──
      if (complexes.length === 1) {
        await runAnalysis(complexes[0], intent);
        return;
      }

      // ── 단지 복수 → 후보 선택 ──
      replaceLastAI({
        type: "candidates",
        content: `"${intent.complexName || rawText}"에 해당하는 단지가 여러 개입니다. 분석할 단지를 선택해주세요.`,
        data: complexes,
        intent,
      });
      setPendingIntent(intent);

    } catch(e) {
      console.error('[routeIntent]', e);
      replaceLastAI({ type: "error", content: "분석 중 오류가 발생했습니다. 다시 시도해주세요." });
    }
  }

  // ── 단지 선택 후 분석 실행 ──
  async function runAnalysis(complex, intent) {
    replaceLastAI({ type: "thinking", content: "데이터 조회 중..." });

    try {
      const sigungu   = complex.sigungu    || "";
      const dong      = complex.legal_dong || "";
      const name      = complex.complex_name;
      const complexId = complex.id || null;
      const areaListRaw = complex.area_list
        ? (typeof complex.area_list === "string" ? JSON.parse(complex.area_list) : complex.area_list)
        : [];

      // 면적 결정
      let targetArea = intent.areaSqm || null;
      if (!targetArea && intent.pyeong) targetArea = Math.round(intent.pyeong * 3.305785);
      if (!targetArea && areaListRaw.length > 0) {
        const sorted = [...areaListRaw].map(Number).filter(Boolean).sort((a,b) => a-b);
        targetArea = sorted[Math.floor(sorted.length / 2)];
      }

      // Supabase deals 조회
      const sbRes = await fetch('/api/supabase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'deals', complex_id: complexId, complex_name: name, sigungu }),
      });
      const sbData = await sbRes.json();

      // saleDeals / rentDeals — Supabase 반환 형식
      let saleDealsRaw = sbData.saleDeals || sbData.deals?.filter(d => d.deal_type==='sale') || [];
      let rentDealsRaw = sbData.rentDeals || sbData.deals?.filter(d => d.deal_type==='rent') || [];

      // 면적 필터 (±3㎡)
      const filterArea = (arr) => targetArea
        ? arr.filter(d => Math.abs(Number(d.area_excl) - targetArea) <= 3)
        : arr;

      const saleFiltered = filterArea(saleDealsRaw);
      const rentFiltered = filterArea(rentDealsRaw).filter(d => !d.monthly_man || Number(d.monthly_man) === 0);

      // buildAnalysisInput이 요구하는 형식으로 변환
      // { ym, price, floor, areaSqm } — norm() 함수가 ym/price/floor 읽음
      const toSale = d => ({
        ym:      d.contract_ym || "",
        price:   Number(d.deal_amount_man) || 0,
        floor:   Number(d.floor) || 5,
        areaSqm: Number(d.area_excl) || 0,
      });
      const toRent = d => ({
        ym:      d.contract_ym || "",
        price:   Number(d.deposit_man) || 0,
        floor:   Number(d.floor) || 5,
        areaSqm: Number(d.area_excl) || 0,
      });

      const sale   = saleFiltered.map(toSale).filter(d => d.price > 0 && d.ym);
      const jeonse = rentFiltered.map(toRent).filter(d => d.price > 0 && d.ym);

      // 거래 부족
      if (sale.length < 3) {
        replaceLastAI({
          type: "clarify",
          content: `${name}${targetArea ? ` (${Math.round(targetArea)}㎡)` : ""}\n최근 실거래 ${sale.length}건으로 분석이 어렵습니다.\n다른 면적이나 단지를 시도하거나, 상세 검색을 이용해주세요.`,
          onSearch: () => onNavigate("fair", { searchQuery: name }),
        });
        return;
      }

      // buildAnalysisInput 호출 — 기존 엔진 전처리 그대로 사용
      const rawData = {
        sale, jeonse,
        areaSqm:     targetArea || 0,
        region:      sigungu,
        dong,
        complexName: name,
        buildYear:   complex.build_year || null,
        currentPrice: 0,
        kbSalePrice:  0,
        kbJeonse:     0,
        tradeStatus:  { code: "OK" },
        areaOptions:  groupAreasByPyeong(areaListRaw)
          .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) })),
      };

      const baseForm = { region: sigungu, dong, complexName: name };
      const built = buildAnalysisInput(rawData, baseForm, targetArea ? Math.round(targetArea) : 0);
      const builtFf    = built?.ff    || null;
      const jeonseCalc = built?.jeonseCalc || null;
      const saleCalc   = built?.saleCalc   || null;

      if (!builtFf) {
        replaceLastAI({
          type: "clarify",
          content: `${name} 분석에 필요한 데이터를 구성하지 못했습니다.\n상세 검색으로 이동해 직접 입력해보세요.`,
          onSearch: () => onNavigate("fair", { searchQuery: name }),
        });
        return;
      }

      // analyze() 호출 — 기존 엔진 그대로
      const res = analyze(builtFf);
      res.jeonseCalc = jeonseCalc;
      res.saleCalc   = saleCalc;
      // 채팅용 추가 필드
      res.saleCount  = sale.length;
      res.saleMedian = saleCalc?.value || null;

      // 결과 카드
      replaceLastAI({
        type: "result",
        data: {
          complex: {
            name,
            sigungu,
            dong,
            areaExclusive: Math.round(targetArea || builtFf.areaExclusive || 0),
            buildYear: complex.build_year,
          },
          intent,
          engine: res,
          ff: builtFf,
        },
      });

      // 히스토리 저장
      if (onSaveHistory) {
        try {
          onSaveHistory({
            date: new Date().toISOString().slice(0,10),
            complexName: name,
            area: targetArea ? `전용 ${Math.round(targetArea)}㎡` : "",
            analysisType: { fair:"적정가", buy:"매수", sell:"매도" }[intent.intent] || "적정가",
            grade: res.fairGrade || res.buyGrade || "",
            headline: res.headline || "",
          });
        } catch(_) {}
      }

    } catch(e) {
      console.error('[runAnalysis]', e);
      replaceLastAI({ type: "error", content: `분석 중 오류: ${e.message || "알 수 없는 오류"}. 잠시 후 다시 시도해주세요.` });
    }
  }

  // ── 음성 입력 ──
  function handleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { addMsg({ role:"ai", type:"text", content:"이 브라우저는 음성 입력을 지원하지 않습니다." }); return; }
    const rec = new SR();
    rec.lang = "ko-KR"; rec.interimResults = false;
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onerror  = () => { setListening(false); };
    rec.onresult = (e) => {
      const txt = e.results[0][0].transcript;
      setInput(txt);
      setTimeout(() => handleSend(txt), 80);
    };
    rec.start();
  }

  // ── 첨부 ──
  function handleAttach() {
    fileRef.current?.click();
  }
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','webp','heic'].includes(ext)) {
      addMsg({ role:"user", type:"text", content:`📷 사진 첨부: ${file.name}` });
      addMsg({ role:"ai",   type:"text", content:"사진 분석 기능은 준비 중입니다.\n단지명·주소를 텍스트로 입력해주시면 바로 분석해드립니다." });
    } else if (['pdf'].includes(ext)) {
      addMsg({ role:"user", type:"text", content:`📄 문서 첨부: ${file.name}` });
      addMsg({ role:"ai",   type:"text", content:"문서 분석 기능은 준비 중입니다.\n등기부등본·계약서 분석은 곧 지원될 예정입니다." });
    } else {
      addMsg({ role:"ai", type:"text", content:"지원하지 않는 파일 형식입니다.\n사진(JPG·PNG) 또는 PDF를 첨부해주세요." });
    }
    e.target.value = "";
  }

  // ── 결과 카드 컴포넌트 ──
  function ResultCard({ data, intent }) {
    const { complex, engine } = data;
    if (!engine) return null;

    const grade    = engine.fairGrade || engine.buyGrade || "C";
    const GC       = GRADE_COLOR[grade] || "#44403c";
    const GB       = GRADE_BG[grade]    || "#fafaf8";
    const GBR      = GRADE_BR[grade]    || BRAND_BORDER;

    const fairPrice  = engine.fairPrice  ? Math.round(engine.fairPrice  / 10000 * 10) / 10 : null;
    const saleMedian = engine.saleMedian ? Math.round(engine.saleMedian / 10000 * 10) / 10 : null;
    const jeonseRatio = engine.jeonseRatio ? Math.round(engine.jeonseRatio * 100) : null;

    const INTENT_TAB = { fair:"fair", buy:"buy", sell:"sell", recommend:"reco" };

    return (
      <div style={{
        background: "#fff", borderRadius: 16,
        border: `0.5px solid ${BRAND_BORDER}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        overflow: "hidden", marginTop: 4,
      }}>
        {/* 상단 헤더 */}
        <div style={{ padding: "14px 16px 10px", borderBottom: `0.5px solid ${BRAND_BORDER}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:15, fontWeight:600, color:BRAND, margin:0, letterSpacing:"-0.012em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {complex.name}
              </p>
              <p style={{ fontSize:11, color:BRAND_MUTED, margin:"3px 0 0" }}>
                {complex.sigungu?.split(" ").slice(-1)[0]} · {complex.areaExclusive ? `${complex.areaExclusive}㎡` : ""}{complex.buildYear ? ` · ${complex.buildYear}년` : ""}
              </p>
            </div>
            <span style={{ fontSize:18, fontWeight:700, color:GC, background:GB, border:`0.5px solid ${GBR}`, borderRadius:10, padding:"4px 12px", flexShrink:0 }}>
              {grade}
            </span>
          </div>
        </div>

        {/* 수치 */}
        <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px" }}>
          {saleMedian && (
            <div>
              <p style={{ fontSize:10, color:BRAND_MUTED, margin:0, letterSpacing:"0.04em", textTransform:"uppercase" }}>실거래 중간값</p>
              <p style={{ fontSize:16, fontWeight:600, color:BRAND, margin:"3px 0 0" }}>{saleMedian}억</p>
            </div>
          )}
          {fairPrice && (
            <div>
              <p style={{ fontSize:10, color:BRAND_MUTED, margin:0, letterSpacing:"0.04em", textTransform:"uppercase" }}>AI 적정가</p>
              <p style={{ fontSize:16, fontWeight:600, color:BRAND_GREEN, margin:"3px 0 0" }}>{fairPrice}억</p>
            </div>
          )}
          {jeonseRatio && (
            <div>
              <p style={{ fontSize:10, color:BRAND_MUTED, margin:0, letterSpacing:"0.04em", textTransform:"uppercase" }}>전세가율</p>
              <p style={{ fontSize:16, fontWeight:600, color:BRAND, margin:"3px 0 0" }}>{jeonseRatio}%</p>
            </div>
          )}
          {engine.saleCount && (
            <div>
              <p style={{ fontSize:10, color:BRAND_MUTED, margin:0, letterSpacing:"0.04em", textTransform:"uppercase" }}>12개월 거래</p>
              <p style={{ fontSize:16, fontWeight:600, color:BRAND, margin:"3px 0 0" }}>{engine.saleCount}건</p>
            </div>
          )}
        </div>

        {/* 한줄 요약 */}
        {engine.headline && (
          <div style={{ padding:"0 16px 12px" }}>
            <p style={{ fontSize:12, color:BRAND_MID, margin:0, lineHeight:1.6, letterSpacing:"-0.008em" }}>
              {engine.headline}
            </p>
          </div>
        )}

        {/* 상세 보기 버튼 */}
        <div style={{ padding:"0 16px 14px" }}>
          <button
            onClick={() => onNavigate(INTENT_TAB[intent?.intent] || "fair", {
              complexName: complex.name,
              region: complex.sigungu,
              dong: complex.dong,
              areaSqm: complex.areaExclusive,
            })}
            style={{
              width:"100%", height:38, borderRadius:10,
              background:BRAND, color:"#fff", border:"none", cursor:"pointer",
              fontSize:13, fontWeight:500, letterSpacing:"-0.01em",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              transition:"opacity 0.12s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity="1"}
          >
            상세 분석 보기
            <CI d="right" s={12} color="#fff" />
          </button>
        </div>
      </div>
    );
  }

  // ── 메시지 렌더 ──
  function renderMsg(msg) {
    const isUser = msg.role === "user";

    if (msg.type === "thinking") {
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:BRAND_GREEN, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <CI d="star" s={13} color="#fff" />
          </div>
          <div style={{ paddingTop:4 }}>
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:6, height:6, borderRadius:"50%", background:BRAND_MUTED,
                  animation:"vlDot 1.2s ease-in-out infinite",
                  animationDelay:`${i*0.2}s`,
                }}/>
              ))}
            </div>
            <p style={{ fontSize:11, color:BRAND_MUTED, margin:"4px 0 0" }}>{msg.content}</p>
          </div>
        </div>
      );
    }

    if (msg.type === "candidates") {
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:BRAND_GREEN, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
            <CI d="star" s={13} color="#fff" />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:14, color:BRAND, margin:"0 0 10px", lineHeight:1.55, letterSpacing:"-0.01em" }}>
              {msg.content}
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {(msg.data||[]).map((c, i) => (
                <button key={i}
                  onClick={() => {
                    addMsg({ role:"user", type:"text", content: c.complex_name });
                    addMsg({ role:"ai", type:"thinking", content:"분석 중..." });
                    runAnalysis(c, msg.intent || {intent:"fair"});
                  }}
                  style={{
                    background:"#fff", border:`0.5px solid ${BRAND_BORDER}`,
                    borderRadius:12, padding:"10px 14px",
                    display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10,
                    cursor:"pointer", textAlign:"left", transition:"background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background="#fafaf8"}
                  onMouseLeave={e => e.currentTarget.style.background="#fff"}
                >
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:500, color:BRAND, margin:0, letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {c.complex_name}
                    </p>
                    <p style={{ fontSize:11, color:BRAND_MUTED, margin:"3px 0 0" }}>
                      {c.sigungu?.split(" ").slice(-2).join(" ")}{c.legal_dong ? ` · ${c.legal_dong}` : ""}{c.build_year ? ` · ${c.build_year}년` : ""}
                    </p>
                  </div>
                  <CI d="right" s={13} color={BRAND_MUTED} />
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === "result") {
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:BRAND_GREEN, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
            <CI d="star" s={13} color="#fff" />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <ResultCard data={msg.data} intent={msg.data?.intent} />
          </div>
        </div>
      );
    }

    if (msg.type === "clarify" || msg.type === "error") {
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background: msg.type==="error" ? "#dc2626" : BRAND_GREEN, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
            <CI d={msg.type==="error" ? "alert" : "star"} s={13} color="#fff" />
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:14, color:BRAND, margin:0, lineHeight:1.6, letterSpacing:"-0.01em", whiteSpace:"pre-line" }}>
              {msg.content}
            </p>
            {msg.onSearch && (
              <button onClick={msg.onSearch}
                style={{ marginTop:10, height:34, paddingLeft:14, paddingRight:14, borderRadius:9, border:`0.5px solid ${BRAND_BORDER}`, background:"#fff", cursor:"pointer", fontSize:12, color:BRAND_MID, display:"flex", alignItems:"center", gap:6, transition:"background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background="#fafaf8"}
                onMouseLeave={e => e.currentTarget.style.background="#fff"}
              >
                <CI d="search" s={12} color={BRAND_MUTED} />
                {msg.searchLabel || "단지 직접 검색"}
              </button>
            )}
          </div>
        </div>
      );
    }

    // text (user / ai)
    return (
      <div key={msg.id} style={{
        display:"flex", gap:10, padding:"4px 0",
        flexDirection: isUser ? "row-reverse" : "row",
      }}>
        {!isUser && (
          <div style={{ width:28, height:28, borderRadius:"50%", background:BRAND_GREEN, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
            <CI d="star" s={13} color="#fff" />
          </div>
        )}
        <div style={{
          maxWidth:"80%",
          padding:"10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
          background: isUser ? BRAND : "#fff",
          border: isUser ? "none" : `0.5px solid ${BRAND_BORDER}`,
          boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <p style={{ fontSize:14, color: isUser ? "#fff" : BRAND, margin:0, lineHeight:1.6, letterSpacing:"-0.01em", whiteSpace:"pre-line" }}>
            {msg.content}
          </p>
        </div>
      </div>
    );
  }

  // ── 최근 분석 칩 ──
  const recent = (history||[]).slice(0,4);

  return (
    <div style={{ maxWidth:480, margin:"0 auto", background:BRAND_BG, minHeight:"100dvh", display:"flex", flexDirection:"column" }}>

      {/* ── dot 애니메이션 CSS ── */}
      <style>{`
        @keyframes vlDot {
          0%,80%,100%{ opacity:.25; transform:scale(.8) }
          40%{ opacity:1; transform:scale(1) }
        }
      `}</style>

      {/* ── 상단 헤더 ── */}
      <div style={{ padding:"20px 24px 12px", borderBottom:`0.5px solid ${BRAND_BORDER}`, background:BRAND_BG, flexShrink:0 }}>
        <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.13em", color:BRAND_GREEN, textTransform:"uppercase", margin:"0 0 1px" }}>
          ValueLens AI
        </p>
        <p style={{ fontSize:10, fontWeight:400, letterSpacing:"0.09em", color:BRAND_MUTED, textTransform:"uppercase", margin:0 }}>
          부동산 AI 에이전트
        </p>
      </div>

      {/* ── 메시지 영역 ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 8px" }}>

        {/* 메시지 목록 */}
        {msgs.map(m => renderMsg(m))}

        {/* 빈 상태 — 최근 분석 칩 */}
        {msgs.length <= 1 && recent.length > 0 && (
          <div style={{ marginTop:20 }}>
            <p style={{ fontSize:10, fontWeight:500, letterSpacing:"0.07em", color:BRAND_MUTED, textTransform:"uppercase", marginBottom:8 }}>
              최근 분석
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {recent.map((h,i) => (
                <button key={i}
                  onClick={() => handleSend(h.complexName || h.complex || "")}
                  style={{ padding:"6px 12px", borderRadius:20, border:`0.5px solid ${BRAND_BORDER}`, background:"#fff", fontSize:12, color:BRAND_MID, cursor:"pointer", letterSpacing:"-0.008em", transition:"background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background="#f5f5f3"}
                  onMouseLeave={e => e.currentTarget.style.background="#fff"}
                >
                  {h.complexName || h.complex}
                  {h.area ? ` · ${h.area}` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 — 예시 질문 */}
        {msgs.length <= 1 && (
          <div style={{ marginTop:20 }}>
            <p style={{ fontSize:10, fontWeight:500, letterSpacing:"0.07em", color:BRAND_MUTED, textTransform:"uppercase", marginBottom:8 }}>
              질문 예시
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[
                "공릉동 동부 25평 얼마야?",
                "잠실 리센츠 34평 지금 사도 돼?",
                "7억으로 노원구 추천해줘",
              ].map((ex,i) => (
                <button key={i} onClick={() => handleSend(ex)}
                  style={{ padding:"10px 14px", borderRadius:12, border:`0.5px solid ${BRAND_BORDER}`, background:"#fff", fontSize:13, color:BRAND_MID, cursor:"pointer", textAlign:"left", letterSpacing:"-0.008em", transition:"background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background="#f5f5f3"}
                  onMouseLeave={e => e.currentTarget.style.background="#fff"}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 고급 검색 접기 */}
        <div style={{ marginTop:24 }}>
          <button onClick={() => setAdvOpen(v=>!v)}
            style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", color:BRAND_MUTED, fontSize:11, padding:0, letterSpacing:"0.02em" }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition:"transform 0.2s", transform: advOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            지역으로 찾기
          </button>
          {advOpen && (
            <div style={{ marginTop:10, padding:16, borderRadius:13, border:`0.5px solid ${BRAND_BORDER}`, background:"#fff" }}>
              <LocationPicker initialQuery="" onComplete={({ sido, sigungu, dong, complexName, exactAptNm, complexId, buildYear, areaList }) => {
                setAdvOpen(false);
                onNavigate("fair", { complexName, region: sigungu, dong, searchQuery: complexName });
              }} />
            </div>
          )}
        </div>

        <div ref={bottomRef} style={{ height:8 }} />
      </div>

      {/* ── 입력창 ── */}
      <div style={{ padding:"10px 16px 20px", borderTop:`0.5px solid ${BRAND_BORDER}`, background:BRAND_BG, flexShrink:0 }}>
        {/* 숨겨진 파일 input */}
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={handleFileChange} />

        <div style={{
          display:"flex", alignItems:"flex-end", gap:8,
          background:"#fff", borderRadius:16,
          border:`1px solid ${BRAND_BORDER}`,
          boxShadow:"0 2px 12px rgba(0,0,0,0.06)",
          padding:"8px 8px 8px 14px",
        }}>
          {/* textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={PHS[phIdx]}
            rows={1}
            style={{
              flex:1, border:"none", outline:"none", resize:"none",
              fontSize:15, lineHeight:1.5, color:BRAND, background:"transparent",
              letterSpacing:"-0.01em", fontFamily:"inherit", paddingTop:4,
              maxHeight:120, overflowY:"auto",
            }}
            onInput={e => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />

          {/* 첨부 버튼 */}
          <button onClick={handleAttach}
            style={{ width:34, height:34, borderRadius:9, border:"none", background:BRAND_LIGHT, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.12s" }}
            onMouseEnter={e => e.currentTarget.style.background="#e8e8e6"}
            onMouseLeave={e => e.currentTarget.style.background=BRAND_LIGHT}
            title="사진·문서 첨부"
          >
            <CI d="clip" s={14} color={BRAND_MUTED} />
          </button>

          {/* 마이크 버튼 */}
          <button onClick={handleVoice}
            style={{ width:34, height:34, borderRadius:9, border:"none", background: listening ? BRAND_GREEN : BRAND_LIGHT, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}
            onMouseEnter={e => { if(!listening) e.currentTarget.style.background="#e8e8e6"; }}
            onMouseLeave={e => { if(!listening) e.currentTarget.style.background=BRAND_LIGHT; }}
            title="음성 입력"
          >
            <CI d="mic" s={14} color={listening ? "#fff" : BRAND_MUTED} />
          </button>

          {/* 전송 버튼 */}
          <button onClick={() => handleSend()}
            disabled={!input.trim()}
            style={{ width:34, height:34, borderRadius:9, border:"none", background: input.trim() ? BRAND : BRAND_LIGHT, cursor: input.trim() ? "pointer" : "default", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}
          >
            <CI d="send" s={13} color={input.trim() ? "#fff" : BRAND_MUTED} />
          </button>
        </div>

        <p style={{ fontSize:10, color:BRAND_MUTED, textAlign:"center", margin:"8px 0 0", letterSpacing:"-0.005em" }}>
          Enter로 전송 · Shift+Enter 줄바꿈 · 결과는 검증된 실거래 데이터 기반
        </p>
      </div>
    </div>
  );
}

// ── 기존 HomeView는 AIChatView로 대체됨 (하위 호환용 alias) ──
function HomeView({ onNavigate, history, onSaveHistory, currentUserId, currentUserEmail }) {
  return <AIChatView onNavigate={onNavigate} history={history} onSaveHistory={onSaveHistory} currentUserId={currentUserId} currentUserEmail={currentUserEmail} />;
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
import ReactDOM from 'react-dom/client';
ReactDOM.createRoot(document.getElementById('root')).render(<App />);





export default function App() { return <AuthGate><AppInner /></AuthGate>; }
