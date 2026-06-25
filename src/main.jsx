import "./index.css";
import { NAVY, BRAND, BRAND_GREEN, BRAND_MID, BRAND_MUTED, BRAND_LIGHT, BRAND_BG, BRAND_BORDER, GRADE_COLOR, GRADE_BG, GRADE_BR } from './constants/brand.js';
import { GRADES, LABEL, GS, won, pct, typicalPyeong } from './constants/grades.js';
import { SAMPLE_DEALS, SAMPLE_SALE_DEALS, SAMPLE, EMPTY, PRESET_EUNMA, PRESET_SG7, PRESET_PRIME_FULL, LEGAL } from './constants/presets.js';
import { FALLBACK_RATIO, MARKET_TRENDS, getRegionTrend, isRisingMarket, isPremiumComplex, isExcludedType, CONFIG, analyze, sellVerdict } from './engine/analyze.js';
import { analyzeSellerDecision, calculateSupplyShock, calculateVolumeRisk, calculatePopulationRisk, calculateEmploymentRisk, calculatePolicyRisk, SCHOOL_ZONES, SCARCITY_ZONES, PRIME_REGIONS, PREMIUM_LEVEL, CONF_CAP, RECON, estimateReconstructionStage, computeFairBands, classifyApartmentMarket } from './engine/market.js';
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
import { WatchView } from './views/WatchView.jsx';



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
function getOrCreateDeviceId() {
  try {
    const key = 'valuelens_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem(key, id);
    }
    return id;
  } catch { return 'dev_unknown'; }
}

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
const SI_KEY = (uid) => uid ? `valuelens_saved_items_${uid}` : "valuelens_saved_items_guest";
const SI_MAX = 50; // TODO: 유료 등급별 제한 시 { free:3, basic:20, pro:50 }[userTier] 로 교체

function _loadSavedStore(uid) {
  try {
    const raw = localStorage.getItem(SI_KEY(uid));
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      analyses:   parsed.analyses   || [],
      favorites:  parsed.favorites  || [],
      candidates: parsed.candidates || [],
      assets:     parsed.assets     || [],
    };
  } catch { return { analyses: [], favorites: [], candidates: [], assets: [] }; }
}

function _writeSavedStore(store, uid) {
  try { localStorage.setItem(SI_KEY(uid), JSON.stringify(store)); } catch {}
}

/** 분석 결과 저장 */
function saveAnalysis(item, uid) {
  const effectiveUid = uid || item._uid || null;
  const store = _loadSavedStore(effectiveUid);
  // 같은 id 중복 방지
  const { _uid: _, ...cleanItem } = item; // _uid 제거 후 저장
  const deduped = store.analyses.filter(a => a.id !== cleanItem.id);
  store.analyses = [cleanItem, ...deduped].slice(0, SI_MAX);
  _writeSavedStore(store, effectiveUid);
}

/** 저장된 분석 목록 (최신순) */
function getSavedAnalyses(uid) {
  return _loadSavedStore(uid).analyses;
}

/** 분석 삭제 */
function deleteSavedAnalysis(id, uid) {
  const store = _loadSavedStore(uid);
  store.analyses = store.analyses.filter(a => a.id !== id);
  _writeSavedStore(store, uid);
}
// ══════════════════════════════════════════════════════════
// 백테스트 v3 기반 엔진 상수 및 헬퍼 함수
// ══════════════════════════════════════════════════════════
// [Phase 1-D] analyze engine (FALLBACK_RATIO ~ sellVerdict) → imported from ./engine/analyze.js


// ════════ SELL DECISION ENGINE ════════ (적정가 결과 r을 참고만 함 — 적정가 계산식 불변)
// sellVerdict는 '호가 적정성'만 판단하는 보조 함수로 격하. 최종 매도 판단은 analyzeSellerDecision이 담당.
// [Phase 1-D] market engine → imported from ./engine/market.js

function MarketTypeBadge({ mc }) {
  const MAP = {
    normal:          ["일반 단지",                    "bg-white ring-slate-100",        "bg-slate-100 text-slate-600"],
    semiPremium:     ["재건축·학군·희소성 영향 단지", "bg-amber-50 ring-amber-100",     "bg-amber-100 text-amber-700"],
    redevelopment:   ["재건축 기대 단지",             "bg-orange-50 ring-orange-200",   "bg-orange-100 text-orange-700"],
    primePremium:    ["프라임 입지 단지",             "bg-orange-50 ring-orange-200",   "bg-red-100 text-red-700"],
    investmentPremium:["투자수요 중심 단지",          "bg-orange-50 ring-orange-200",   "bg-red-100 text-red-700"],
    policyDriven:    ["정책 변수 영향 단지",          "bg-orange-50 ring-orange-200",   "bg-orange-100 text-orange-700"],
    lowData:         ["거래 데이터 부족",             "bg-slate-50 ring-slate-200",     "bg-slate-200 text-slate-600"],
    abnormalInput:   ["입력값 확인 필요",             "bg-slate-50 ring-slate-200",     "bg-slate-200 text-slate-600"],
  };
  const DESC = {
    normal:           "일반적인 전세·매매 기반으로 분석했습니다.",
    semiPremium:      "재건축 기대나 학군·희소성 요인이 일부 반영된 단지입니다. 실사용 가치와 시장 가격을 함께 보세요.",
    redevelopment:    "재건축 기대가 반영된 단지입니다. 사업 진행 여부와 분담금 리스크를 함께 고려하세요.",
    primePremium:     "입지·희소성 프리미엄이 있는 단지입니다. 전세 기반 적정가만으로 판단하기 어렵습니다.",
    investmentPremium:"전세가율이 낮아 투자 수요 비중이 높은 단지입니다. 실거주 목적이라면 신중하게 검토하세요.",
    policyDriven:     "정책 변수(재개발·용도변경 등)가 가격에 영향을 주는 단지입니다.",
    lowData:          "거래 데이터가 부족해 분석 신뢰도가 낮습니다. KB시세를 입력하면 정확도가 높아집니다.",
    abnormalInput:    "입력값이 시세와 크게 차이납니다. 현재가를 다시 확인해 주세요.",
  };
  const [label, wrapCls, tagCls] = MAP[mc.specialMarketType] || MAP.normal;
  const desc = DESC[mc.specialMarketType] || DESC.normal;
  return (
    <div className={`rounded-2xl p-4 ring-1 ${wrapCls}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${tagCls}`}>{label}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{desc}</p>
      {mc.warnings.length > 0 && <p className="mt-2 rounded-lg bg-orange-100/60 px-2.5 py-1.5 text-xs font-medium leading-relaxed text-orange-800">⚠ {mc.warnings[0]}</p>}
    </div>
  );
}

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

function analyzeBuyerDecision(r, f) {
  const cur = Number(f.currentPrice) || 0;
  const age = r.age != null ? r.age : (f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : null);
  const jr = r.actualRatio || 0;
  // ── RISK LAYER (적정가 무관 — 판단/신뢰도/경고에만) ──
  const living = calculateLivingScore(f);
  const supplyRisk = calculateSupplyShock(f);
  const volumeRisk = calculateVolumeRisk(f);
  const populationRisk = calculatePopulationRisk(f);
  const employmentRisk = calculateEmploymentRisk(f);
  const policyRisk = calculatePolicyRisk(f);
  const locationRisk = { score: living.total, level: living.total >= 75 ? "낮음" : living.total >= 60 ? "보통" : "높음" };
  const riskLayer = { supplyRisk, volumeRisk, populationRisk, employmentRisk, locationRisk, policyRisk };
  const riskLayerScore = Math.round(((100 - supplyRisk.score) + volumeRisk.volumeScore + populationRisk.populationScore + employmentRisk.employmentScore + locationRisk.score + (100 - policyRisk.policyScore)) / 6);

  // ── MARKET CLASSIFIER (최상위 분류 — 모든 판단의 기준) ──
  const mc = classifyApartmentMarket(f, r);
  const specialMarketType = mc.specialMarketType;
  const isSpecial = ["redevelopment", "primePremium", "investmentPremium", "policyDriven"].includes(specialMarketType);
  const isSemi = specialMarketType === "semiPremium";
  const premiumScore = mc.premiumScore;
  const intrinsicFairPrice = mc.intrinsicFairPrice;
  const marketReferencePrice = mc.marketReferencePrice;
  const premiumAmount = mc.premiumAmount;
  const premiumRatio = mc.premiumRatio;
  const finalFairPrice = Math.round(r.fairPrice || 0);
  const gap = r.gapRatio || 0;
  // ── 분석 적합도 (분석 방식이 이 단지에 맞는 정도) — buyerScore/상단표시/scoreBreakdown 공통값 ──
  const fitFloor = { redevelopment: 65, primePremium: 70, investmentPremium: 65, policyDriven: 65, semiPremium: 70 }[specialMarketType];
  const fitScore = fitFloor != null ? Math.max(r.modelConf, fitFloor) : r.modelConf;
  const fitLabel = fitScore >= 80 ? "높음" : fitScore >= 60 ? "보통" : fitScore >= 40 ? "낮음" : "매우낮음";

  // 1) priceScore (가격 적정성) — 적정가 엔진 기반, 쌀수록 높음
  const priceScore = clamp(Math.round(55 - gap * 250), 5, 98);

  // ── 자금 가능성 ──
  const acqObj = acqTax(cur, (Number(f.areaExclusive) || 0) > 85, 1, PRIME_REGIONS.includes(f.region));
  const brokerage = Math.round(cur * 0.004), otherCost = 200; // 기타비용 매수/매도 200만 통일
  const totalBuyCost = cur + acqObj.total + brokerage + otherCost;
  const loan = Number(f.plannedLoanAmount) || 0;
  const cash = Number(f.availableCash) || 0;
  const income = Number(f.annualIncome) || 0;
  const existPay = Number(f.existingDebtPayment) || 0;
  const rate = Number(f.interestRate) || 3.8, years = Number(f.loanYears) || 30;
  const neededCash = Math.max(0, totalBuyCost - loan);
  const shortfallCash = Math.max(0, neededCash - cash);
  const monthlyPayment = monthlyPay(loan, rate, years);
  const monthlyRatio = income ? Math.round(((monthlyPayment * 12 + existPay) / income) * 100) : null;
  // 자금 정보 입력 여부 — 미입력 시 자금 판단 표시 안 함
  const hasFundInput = cash > 0 || loan > 0 || income > 0;
  const fundRisk = !income && !cash ? "미입력" : shortfallCash > 0 ? "자금부족" : monthlyRatio == null ? "소득미입력" : monthlyRatio > 45 ? "위험" : monthlyRatio > 30 ? "주의" : "안정";
  let affordabilityScore;
  if (!income && !cash) affordabilityScore = 50; // 미입력 중립
  else { affordabilityScore = 100; if (shortfallCash > 0) affordabilityScore -= 40; if (monthlyRatio != null && monthlyRatio > 45) affordabilityScore -= 30; else if (monthlyRatio != null && monthlyRatio > 30) affordabilityScore -= 12; affordabilityScore = clamp(affordabilityScore, 5, 98); }

  // ── 보유 가능성 ──
  const baseJeonse = (r.basis && r.basis.jeonse && r.basis.jeonse.value) || Math.round(cur * jr) || 0;
  const interestBurdenRatio = monthlyRatio; // 기존부채 포함 기준으로 통일 (자금·보유·최종판단 일관)
  const jeonseSafetyMargin = baseJeonse ? Math.round(((baseJeonse - loan) / baseJeonse) * 100) : null;
  const reverseJeonseRisk = baseJeonse && loan && baseJeonse < loan ? "높음" : (jeonseSafetyMargin != null && jeonseSafetyMargin < 20) ? "보통" : "낮음";
  const monthlyHoldingCost = monthlyPayment + 30; // +관리비 placeholder
  const rateShock = [0, 1, 2].map((d) => ({ delta: d, rate: (rate + d).toFixed(1), monthly: monthlyPay(loan, rate + d, years) }));
  const rateShockRisk = income ? ((rateShock[2].monthly * 12 + existPay) / income > 0.45 ? "높음" : "보통이하") : "소득미입력";
  let holdingScore;
  if (!income) holdingScore = 50;
  else { holdingScore = 90; if (reverseJeonseRisk === "높음") holdingScore -= 25; else if (reverseJeonseRisk === "보통") holdingScore -= 10; if (rateShockRisk === "높음") holdingScore -= 25; holdingScore = clamp(holdingScore, 5, 95); }

  // ── 시장 환경(시장 조건) 점수 — 추세 데이터 미연동, 가격은 priceScore로 별도 ──
  const shockScore = { 낮음: 90, 보통: 65, 높음: 40, 매우높음: 20 }[r.shock ? r.shock.level : "보통"] || 65;
  const supplyScore = { 낮음: 85, 보통: 60, 높음: 35 }[supplyRisk.level] || 60; // 공급은 supplyRisk(calculateSupplyShock)로 통일
  const ratePenalty = monthlyRatio != null && monthlyRatio > 45 ? 20 : monthlyRatio != null && monthlyRatio > 30 ? 10 : 0;
  const timingScore = clamp(Math.round(shockScore * 0.5 + supplyScore * 0.5 - ratePenalty), 5, 95); // 가격 이중반영 제거

  // ── 리스크 (안전도, 높을수록 안전) — 특수시장 위험은 marketRisk/최종판단에서만 반영(중복 제거) ──
  let riskScore = 72;
  riskScore -= supplyRisk.level === "높음" ? 15 : supplyRisk.level === "보통" ? 7 : 0;
  riskScore = clamp(riskScore, 5, 95);

  // ── 대체 후보 대비 (POOL 활용) ──
  const peers = POOL.length ? POOL : [];
  const avgDiscount = peers.length ? peers.reduce((s, c) => s + (c.fair - c.cur) / c.fair, 0) / peers.length : 0;
  const myDiscount = -gap;
  const comparisonResult = myDiscount > avgDiscount + 0.02 ? "우위" : myDiscount < avgDiscount - 0.02 ? "열위" : "평균";
  const comparisonScore = comparisonResult === "우위" ? 78 : comparisonResult === "평균" ? 55 : 35;

  // ── Opportunity Engine (호재·악재) — 적정가 미반영, 매수판단 보조 ──
  const opp = analyzeOpportunitySignals(f);
  const oppNorm = (opp.opportunityScore + 100) / 2; // -100~100 → 0~100
  // ── buyerScore (가격25·자금20·보유15·시장환경10·리스크10·호재악재10·입지5·분석적합도5) ──
  const livingScore = living.total;
  const locationScore = Math.round((living.items.교통 + living.items.학군) / 2);
  const buyerScore = Math.round(priceScore * 0.25 + affordabilityScore * 0.20 + holdingScore * 0.15 + timingScore * 0.10 + riskScore * 0.10 + oppNorm * 0.10 + locationScore * 0.05 + fitScore * 0.05);
  // ── 점수 분해 (가점/감점, 중립 50 기준 가중 기여분 — 합 ≈ buyerScore−50) ──
  const sgn = (s, w) => Math.round((s - 50) * w);
  const scoreBreakdown = [
    { label: "가격", score: priceScore, points: sgn(priceScore, 0.25) },
    { label: "자금", score: affordabilityScore, points: sgn(affordabilityScore, 0.20) },
    { label: "보유 가능성", score: holdingScore, points: sgn(holdingScore, 0.15) },
    { label: "시장 환경", score: timingScore, points: sgn(timingScore, 0.10) },
    { label: "공급·거래량", score: riskScore, points: sgn(riskScore, 0.10) },
    { label: "호재·악재", score: Math.round(oppNorm), points: sgn(oppNorm, 0.10) },
    { label: "입지", score: locationScore, points: sgn(locationScore, 0.05) },
    { label: "분석 적합도", score: fitScore, points: sgn(fitScore, 0.05) },
  ];

  // ── 신뢰도: 데이터40 + 모델30 + 리스크레이어30 → mock 차감 → 특수시장 상한 → 최저 20 ──
  const dataConfidence = r.dataConf, modelConfidence = r.modelConf;
  let decisionConfidence = Math.round(dataConfidence * 0.4 + modelConfidence * 0.3 + riskLayerScore * 0.3);
  // placeholder/mock 데이터 차감 (TODO(상용화): 실데이터 연결 시 해당 플래그 false → 차감 해제)
  const mockFlags = { school: true, supply: true, volume: true, popEmp: true, policy: true };
  let mockPenalty = 0;
  if (mockFlags.school) mockPenalty += 5;
  if (mockFlags.supply) mockPenalty += 5;
  if (mockFlags.volume) mockPenalty += 8;
  if (mockFlags.popEmp) mockPenalty += 8;
  if (mockFlags.policy) mockPenalty += 8;
  mockPenalty = Math.min(mockPenalty, 15); // 동일 원인(데모 데이터)에 대한 중복 차감 방지 — 총 -15 제한
  decisionConfidence -= mockPenalty;
  decisionConfidence = Math.max(20, decisionConfidence); // 특수시장이라고 신뢰도를 낮추지 않음 — 위험도는 MarketRisk로 분리
  // 일반 아파트 + 데이터·모델 충분 → 보조 신뢰도가 과도하게 낮아지지 않게 최소 70 보정
  if (specialMarketType === "normal" && r.dataConf >= 75 && r.modelConf >= 70) decisionConfidence = Math.max(decisionConfidence, 70);
  // ── MarketRisk (시장 위험도) — 재건축/강남/투자수요는 신뢰도가 아니라 위험도를 높인다 ──
  let mrs = 15;
  if (isSemi) mrs = 40;
  if (specialMarketType === "redevelopment") mrs = 70;
  else if (specialMarketType === "primePremium") mrs = 62;
  else if (specialMarketType === "investmentPremium") mrs = 75;
  else if (specialMarketType === "policyDriven") mrs = 68;
  if (premiumRatio > 1) mrs += 12;
  if (supplyRisk.level === "높음") mrs += 8;
  if (policyRisk.level === "높음") mrs += 6;
  if (specialMarketType === "redevelopment") mrs += mc.stageScore < 40 ? 8 : mc.stageScore >= 85 ? -6 : 0; // 초기 단계일수록 불확실성↑
  mrs = clamp(mrs, 5, 100);
  const marketRiskLevel = (specialMarketType === "lowData" || specialMarketType === "abnormalInput") ? "평가 불가" : mrs >= 75 ? "매우높음" : mrs >= 55 ? "높음" : mrs >= 35 ? "보통" : "낮음";
  const marketRisk = { score: mrs, level: marketRiskLevel };
  // 분석 적합도(fitScore/fitLabel)는 상단에서 계산 — buyerScore·scoreBreakdown과 동일 값 사용

  // ── 최종 판단 (고정 우선순위) ──
  // abnormal→보류 / lowData→보류 / 특수→투자검토·관망·고위험 / 자금부족→관망 / 부담>45→비추천 / 30~45→협상 / 점수
  let finalLabel, action;
  const mr = monthlyRatio; // 부담률(기존부채 포함)로 통일
  if (specialMarketType === "abnormalInput") { finalLabel = "판단 보류"; action = "현재가 입력 오류 가능성 — 값 확인 후 재분석하세요"; }
  else if (specialMarketType === "lowData") { finalLabel = "판단 보류"; action = "실거래·시세 데이터 부족 — 보강 후 재분석하세요"; }
  else if (isSpecial) {
    finalLabel = buyerScore >= 68 ? "가격 검토 가능" : buyerScore >= 52 ? "신중 접근" : "가격 부담 큼";
    action = finalLabel === "가격 부담 큼" ? "실사용가치 대비 프리미엄·리스크가 큽니다. 신중한 접근이 필요합니다" : "실사용가치와 시장가치를 분리해 가격 적정성을 판단하세요";
  }
  else if (shortfallCash > 0 && hasFundInput) { finalLabel = "자금 보강 필요"; action = `입력한 자금 기준으로 약 ${won(shortfallCash)}의 추가 자금이 필요합니다 (취득세·부대비용 포함)`; }
  else if (mr != null && mr > 45) { finalLabel = "자금 부담 큼"; action = `월상환 부담 ${mr}% (45% 초과) — 자금 여건 보강을 검토해보세요`; }
  else if (mr != null && mr >= 30) { finalLabel = "가격 협상 후 검토"; action = `월상환 부담 ${mr}% — 가격 협상으로 부담을 낮춘 뒤 검토하세요`; }
  else if (buyerScore >= 75) { finalLabel = "가격 조건 양호"; action = "적정가·자금·보유 여건 양호 — 가격 적정성 기준 매수를 검토해볼 수 있습니다"; }
  else if (buyerScore >= 55) { finalLabel = "협상 후 검토"; action = "가격 여건 보통 — 협상을 통한 가격 조정 후 검토를 고려해볼 수 있습니다"; }
  else if (buyerScore >= 40) { finalLabel = "신중 접근"; action = "가격·자금 여건 미흡 — 신중한 접근이 필요합니다"; }
  else { finalLabel = "가격 부담 큼"; action = "가격·자금·리스크 부담이 있습니다 — 신중한 접근이 필요합니다"; }
  // ── 정확도/신뢰도 위험 시 보수화 (일반 단지) ──
  if (!isSpecial && specialMarketType !== "abnormalInput" && specialMarketType !== "lowData") {
    const lowConf = decisionConfidence < 50 || mockPenalty >= 30;
    if (lowConf && finalLabel === "가격 조건 양호") { finalLabel = "협상 후 검토"; action = "데이터 신뢰도가 낮아 보수적으로 — 가격 협상 후 검토를 고려해볼 수 있습니다"; }
    else if (lowConf && finalLabel === "신중 접근" && buyerScore < 45) { finalLabel = "가격 부담 큼"; }
  }
  // ── 호재·악재 한 단계 조정 (일반 단지만, 자금 하드스톱 시 상향 금지, 특수시장 제외) ──
  if (!isSpecial && specialMarketType !== "lowData" && specialMarketType !== "abnormalInput") {
    const ladder = ["가격 부담 큼", "신중 접근", "협상 후 검토", "가격 조건 양호"];
    const finanHardStop = shortfallCash > 0 || (mr != null && mr > 45);
    let idx = ladder.indexOf(finalLabel);
    if (idx >= 0) {
      if (opp.opportunityLevel === "호재 우세" && !finanHardStop) idx = Math.min(3, idx + 1);
      else if (opp.opportunityLevel === "악재 우세") idx = Math.max(0, idx - 1);
      if (ladder[idx] !== finalLabel) { finalLabel = ladder[idx]; action += ` · 주변 ${opp.opportunityLevel} 반영`; }
    }
  }

  // ── 핵심 이유 5개 (가격·자금·보유/금리·시장위험·호재악재/특수) ──
  const reasons = [];
  if (isSpecial && premiumRatio > 0) reasons.push(`[가격] 실사용 ${won(intrinsicFairPrice)} vs 시장 ${won(marketReferencePrice)} — 프리미엄 ${(premiumRatio * 100).toFixed(0)}% 반영`);
  else reasons.push(gap < 0 ? `[가격] 적정가 대비 ${(Math.abs(gap) * 100).toFixed(1)}% 저평가 (현재 ${won(cur)} / 적정 ${won(finalFairPrice)})` : `[가격] 적정가 대비 ${(gap * 100).toFixed(1)}% ${gap > 0 ? "고평가" : "수준"} (현재 ${won(cur)} / 적정 ${won(finalFairPrice)})`);
  if ((income || cash) && shortfallCash > 0) reasons.push(`[자금] 추가 자금 약 ${won(shortfallCash)} 필요 (총 매입비용 ${won(totalBuyCost)}, 취득세·부대비용 포함)`);
  else if (income || cash) reasons.push(`[자금] 월상환 ${won(monthlyPayment)} · 소득대비 ${mr != null ? mr : "—"}% (${fundRisk})`);
  else reasons.push("[자금] 자금 정보 미입력 — 가격 위주 판단 (자금 입력 시 정밀화)");
  reasons.push(`[보유·금리] 월 보유비용 ${won(monthlyHoldingCost)}${income ? ` · 금리 +2%p 시 부담 ${rateShockRisk}` : " · 자금 입력 시 금리 시뮬 제공"}`);
  reasons.push(`[시장 위험] 시장 위험도 ${marketRisk.level} · 공급 ${supplyRisk.level}·정책 ${policyRisk.level} (데이터 신뢰도 ${r.dataConfLabel}·분석 적합도 ${fitLabel})${isSpecial && mc.reconstructionStage !== "none" ? ` · 재건축 ${RECON[mc.reconstructionStage].label}` : ""}`);
  if (isSpecial) reasons.push(`[특수시장] 이 단지는 일반 적정가보다 프리미엄과 시장 위험을 분리해서 해석해야 합니다 · 호재·악재 ${opp.summary}`);
  else reasons.push(`[호재·악재] ${opp.summary} — 적정가 미반영, 매수 판단 보조`);

  const sentences = buildBuyerSentences({ gap, specialMarketType, intrinsicFairPrice, marketReferencePrice, premiumRatio, shortfallCash, monthlyRatio, supplyLevel: supplyRisk.level, policyLevel: policyRisk.level, populationLevel: populationRisk.level });

  return {
    specialMarketType, isSpecial, isSemi, premiumScore, premiumLevel: mc.premiumLevel, classificationReasons: mc.classificationReasons, marketWarnings: mc.warnings, mc,
    intrinsicFairPrice, marketReferencePrice, finalFairPrice, premiumAmount, premiumRatio,
    priceScore, affordabilityScore, holdingScore, timingScore, riskScore, comparisonScore, livingScore, locationScore, buyerScore,
    dataConfidence, modelConfidence, decisionConfidence, marketRisk, fitScore, fitLabel, riskLayer, riskLayerScore,
    scoreBreakdown, premiumBreakdown: mc.premiumBreakdown, reconstructionStage: mc.reconstructionStage, stageScore: mc.stageScore, fairBands: computeFairBands(r, mc),
    affordability: { acqTax: acqObj.total, brokerage, otherCost, totalBuyCost, neededCash, shortfallCash, monthlyPayment, monthlyRatio, fundRisk },
    holding: { monthlyHoldingCost, interestBurdenRatio, reverseJeonseRisk, jeonseSafetyMargin, rateShock, rateShockRisk },
    timing: { score: timingScore, trendAvailable: false },
    comparison: { result: comparisonResult, score: comparisonScore }, opportunity: opp,
    finalLabel, action, reasons, sentences, hasFundInput,
  };
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

function OpportunityCard({ opp }) {
  const t = opp.opportunityScore;
  const tone = t >= 30 ? "text-emerald-600" : t >= 10 ? "text-emerald-500" : t <= -30 ? "text-red-600" : t <= -10 ? "text-red-500" : "text-slate-500";
  const Sig = ({ x }) => (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-800">{x.title}</span><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${x.sourceType === "api" ? "bg-emerald-100 text-emerald-700" : x.sourceType === "ai" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>{x.sourceType === "api" ? "공공데이터" : x.sourceType === "ai" ? "AI요약" : "자체추정"}</span></div>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{x.description}</p>
      <p className="mt-1 text-[11px] text-slate-400">{x.category} · 영향 {x.impact} · 신뢰도 {x.confidence}{x.distanceNote ? ` · ${x.distanceNote}` : ""}</p>
    </div>
  );
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">주변 호재·악재 (매수 판단 보조)</h3>
        <span className={`text-lg font-extrabold ${tone}`}>{t > 0 ? "+" : ""}{t} · {opp.opportunityLevel}</span>
      </div>
      {opp.positiveSignals.length > 0 && <><p className="mt-3 text-xs font-semibold text-emerald-600">호재 {Math.min(3, opp.positiveSignals.length)}건</p><div className="mt-1.5 space-y-1.5">{opp.positiveSignals.slice(0, 3).map((x, i) => <Sig key={i} x={x} />)}</div></>}
      {opp.negativeSignals.length > 0 && <><p className="mt-3 text-xs font-semibold text-red-500">악재 {Math.min(3, opp.negativeSignals.length)}건</p><div className="mt-1.5 space-y-1.5">{opp.negativeSignals.slice(0, 3).map((x, i) => <Sig key={i} x={x} />)}</div></>}
      {opp.positiveSignals.length === 0 && opp.negativeSignals.length === 0 && <p className="mt-3 text-sm text-slate-500">현재 기준 두드러진 호재·악재 신호가 없습니다.</p>}
      <p className="mt-3 text-[11px] text-slate-400">수집 방식 · 공공데이터 {opp.sourceCoverage.apiCoverage}% / AI요약 {opp.sourceCoverage.aiCoverage}% / 자체추정 {opp.sourceCoverage.mockCoverage}% · 적정가에는 반영하지 않고 매수 판단 보조 요소로만 사용합니다.</p>
      {opp.sourceCoverage.mockCoverage >= 50 && <p className="mt-1 text-[11px] font-medium text-amber-600">현재 호재·악재는 자체 추정 비중이 높아 참고용이며, 실데이터 연동 시 정밀해집니다.</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">호재·악재 분석은 공개자료·공공데이터·AI 요약을 바탕으로 한 참고 정보입니다. 개발·교통·정비사업 계획은 변경·지연·무산될 수 있으며 가격 상승 또는 하락을 보장하지 않습니다.</p>
    </div>
  );
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
const card = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100";

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

function BuyView({ onSaveHistory, onAddWatch, onContext, mode = "buy", currentUserId, currentUserEmail, screenerInitial, onClearScreenerInitial, photoTriggerRef }) {
  const [f, setF] = useState(EMPTY);
  const [r, setR] = useState(null);
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState(null);
  const [pending, setPending] = useState(null);
  const [showManual, setShowManual] = useState(false);
  // listingPriceInput: 현재 매물가 독립 state — 어디서도 초기화 금지
  const [listingPriceInput, setListingPriceInput] = useState("");
  const abortRef = useRef(null);
  const [areaOptions, setAreaOptions] = useState([]);

  // ── 분석 횟수 제한 체크 ──
  async function checkAnalysisLimit() {
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/check-analysis-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_and_record',
          userId: currentUserId || null,
          userEmail: currentUserEmail || null,
          deviceId,
        }),
      });
      if (res.status === 429) {
        const d = await res.json();
        setAiMsg(d.message || '오늘 무료 분석 1회를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요.');
        return false; // 차단
      }
      return true; // 통과
    } catch (e) {
      console.warn('[checkAnalysisLimit] 오류 (통과):', e?.message);
      return true; // 오류 시 통과
    }
  }

  // ── AI 검토 후보에서 넘어온 경우 자동 단지 입력 ──
  useEffect(() => {
    if (!screenerInitial) return;
    const { complexName, region, dong, areaExclusive, complexId } = screenerInitial;
    setF((prev) => ({
      ...EMPTY,
      complexName:   complexName || prev.complexName,
      region:        region      || prev.region,
      dong:          dong        || prev.dong,
      areaExclusive: areaExclusive ? String(areaExclusive) : prev.areaExclusive,
      complexId:     complexId   || null,
    }));
    setR(null);
    setPending(null);
    setAreaOptions([]);
    rawMolitRef.current = null;
    if (onClearScreenerInitial) onClearScreenerInitial();
  }, [screenerInitial]);

  const [fetchingAreas, setFetchingAreas] = useState(false);
  // 국토부 원본 데이터 보관 — 면적 변경 시 API 재호출 없이 재필터
  const rawMolitRef = useRef(null); // { complexName, dong, sale:[], jeonse:[], areaOptions:[], allAreas:Set, lawdCd }

  // 면적 선택 그룹 기반 로컬 재필터 (API 재호출 없음)
  function refilterByArea(overrideArea, exclusiveAreas) {
    const raw = rawMolitRef.current;
    if (!raw) return null; // 원본 없으면 null → quickSearch가 API 호출
    const areaTarget = exclusiveAreas && exclusiveAreas.length > 0 ? exclusiveAreas : Number(overrideArea) || null;
    if (!areaTarget) return null;

    const filterDeals = (deals) => {
      if (!areaTarget) return deals;
      if (Array.isArray(areaTarget)) return deals.filter(d => areaTarget.some(a => Math.abs(d.areaSqm - a) <= 1));
      return deals.filter(d => Math.abs(d.areaSqm - Number(areaTarget)) <= 3);
    };

    const sale   = filterDeals(raw.sale);
    const jeonse = filterDeals(raw.jeonse);
    return { ...raw, sale, jeonse, areaSqm: Number(overrideArea) || 0 };
  }

  // 면적만 먼저 조회하는 함수
  // 외부에서 파라미터 받는 버전 (단지 선택 즉시 호출용)
  async function fetchAreasFor(region, dong, complexName, exactAptNm, sido) {
    if (!complexName || !region) return;
    setFetchingAreas(true); setAiMsg(null); setAreaOptions([]);

    // Supabase에서 면적 목록 우선 조회
    try {
      const sbRes = await fetch('/api/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'areas', complex_name: exactAptNm || complexName, sigungu: region }),
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (sbData.areas && sbData.areas.length > 0) {
          const opts = groupAreasByPyeong(sbData.areas)
            .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) }));
          setAreaOptions(opts);
          setFetchingAreas(false);
          return; // Supabase 성공 → 국토부 API 스킵
        }
      }
    } catch (e) {
      console.warn('[fetchAreasFor] Supabase 실패, molit fallback:', e.message);
    }
    try {
      let lawdCd = null;
      try {
        const lawdRes = await fetch("/api/lawdCd", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lawdCd", sigungu: region, sido: sido || "" }),
        });
        const ld = await lawdRes.json();
        lawdCd = ld.lawdCd || null;
      } catch(e) {}
      if (!lawdCd) lawdCd = getLawdCd(dong, region);
      if (!lawdCd) { setAiMsg(`"${region}" 지역 코드를 찾지 못했습니다.`); setFetchingAreas(false); return; }
      // /api/molit type:"areas" 직접 호출 (가장 정확)
      const areasRes = await fetch("/api/molit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "areas", lawdCd, complexName: exactAptNm || complexName }),
      });
      const areasData = await areasRes.json();
      const opts = groupAreasByPyeong((areasData.areaOptions || []).map(o => Number(o.areaSqm)).filter(a => a > 0))
        .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) }));
      if (opts.length === 0) {
        setAiMsg("최근 실거래가 없습니다. 네이버 부동산 또는 KB부동산원에서 KB시세를 확인 후 입력해 주세요.");
        setF(prev => ({ ...prev, _needKbInput: true }));
      } else {
        setAreaOptions(opts);
      }
    } catch(e) { setAiMsg("면적 조회 실패."); }
    finally { setFetchingAreas(false); }
  }

  async function fetchAreas() {
    if (!f.complexName || !f.region) { setAiMsg("지역(구)과 단지명을 입력하세요."); return; }
    setFetchingAreas(true); setAiMsg(null); setAreaOptions([]);
    try {
      let lawdCd2 = null;
      try {
        const lr = await fetch("/api/lawdCd", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lawdCd", sigungu: f.region }),
        });
        lawdCd2 = (await lr.json()).lawdCd || null;
      } catch(e) {}
      if (!lawdCd2) lawdCd2 = getLawdCd(f.dong, f.region);
      if (!lawdCd2) { setAiMsg("지역 코드를 찾지 못했습니다."); setFetchingAreas(false); return; }
      const result = await fetchMolitData(lawdCd2, f.exactAptNm || f.complexName, "", 12);
      // 단지명 필터 적용된 실거래에서만 면적 추출
      const allAreas = [...(result.sale || []), ...(result.jeonse || [])].map(d => d.areaSqm).filter(a => a > 0);
      const unique = [...new Set(allAreas)].sort((a, b) => a - b);
      const opts = groupAreasByPyeong(unique)
        .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) }));
      if (opts.length === 0) {
        setAiMsg("해당 단지 최근 6개월 실거래가 없습니다. 면적을 직접 입력하거나 KB시세를 입력하세요.");
        setF(prev => ({ ...prev, _needKbInput: true }));
      } else {
        setAreaOptions(opts);
      }
    } catch(e) {
      setAiMsg("면적 조회 실패 — 지역(구)명을 확인하세요.");
    } finally { setFetchingAreas(false); }
  }
  const [uploadedImages, setUploadedImages] = useState([]); // 캡처 썸네일
  const [captureMsg, setCaptureMsg] = useState(null); // 캡처 성공 메시지 (별도)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  // 화면은 버튼 하나지만 내부는 3단 파이프라인으로 분리:
  //   [1] fetchApartmentData  → 조회 모듈 (API 전환 시 이 함수만 교체)
  //   [2] buildAnalysisInput  → 변환 모듈 (rawData → analyze() 입력 형태)
  //   [3] analyze()           → 계산 엔진 (ConfirmStep → doAnalyze에서 실행, 절대 수정 금지)
  // ─────────────────────────────────────────────────────────────
  async function quickSearch(overrideArea, overrideForm, exclusiveAreas = null, fromConfirm = false) {
    const ff = overrideForm ? { ...f, ...overrideForm } : f;
    // listingPriceInput: 독립 state에서 직접 읽음
    const listingPrice = Number(String(listingPriceInput).replace(/,/g, "")) || 0;
    if (!ff.complexName && !listingPrice) { setAiMsg("최소한 단지명을 입력하세요. (예: 동부)"); return; }

    // 면적 변경인지 판단 — Supabase 데이터로 저장된 경우만 로컬 재필터 허용
    // MOLIT 데이터(rawMolitRef.dataSource !== 'supabase')는 항상 Supabase 재조회
    const isSameComplex = rawMolitRef.current &&
      rawMolitRef.current.dataSource === 'supabase' &&
      rawMolitRef.current.complexName === (ff.exactAptNm || ff.complexName) &&
      rawMolitRef.current.dong === ff.dong;
    const isAreaChange = overrideArea && isSameComplex;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiLoading(true); setAiMsg(null); setPending(null);

    // 면적 변경 시 이전 분석값 초기화 안내
    if (isAreaChange) {
      setAiMsg("⏳ 면적 변경 중 — 거래 데이터 재필터 중...");
    }

    try {
      let rawData;
      if (isAreaChange) {
        // ── 로컬 재필터 (API 재호출 없음) ──
        rawData = refilterByArea(overrideArea, exclusiveAreas);
        if (!rawData) {
          // 재필터 실패 → API 재호출로 fallback
          rawData = await _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas);
        }
      } else {
        // ── 신규 단지 또는 원본 없음 → Supabase 우선 / MOLIT fallback ──
        rawData = await _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas);
      }

      // ── 공통 처리 ──
      _processRawData(rawData, ff, overrideArea, exclusiveAreas);

    } catch (e) {
      console.error("fetchApartmentData 오류:", e);
      const userMsg = e.message && !e.message.includes("undefined") && !e.message.includes("serviceKey") && !e.message.includes("API 호출")
        ? e.message
        : "실거래 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.";
      setAiMsg(`${userMsg}`);
      const fallbackFf = {
        ...ff, currentPrice: Number(ff.currentPrice) || 0,
        baseJeonse: Number(ff.kbJeonse) || 0, kbSalePrice: Number(ff.kbSalePrice) || 0,
        jeonseUsed: 0, saleUsed: 0, jeonseCalc: null, saleCalc: null, dataSource: "manual",
      };
      setPending({ ff: fallbackFf, jeonseCalc: null, saleCalc: null,
        blockReason: userMsg });
    } finally { setAiLoading(false); }
  }

  // ── Supabase 우선 데이터 조회 ──
  async function _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas) {
    const complexId = ff.complexId || null;
    const complexName = ff.exactAptNm || ff.complexName || "";
    const sigungu = ff.region || "";
    const targetArea = overrideArea ? Number(overrideArea) : Number(ff.areaExclusive) || 0;


    // ── STEP 1: complexId 또는 단지명으로 complexes 조회 ──
    let complexInfo = null;
    try {
      const r1 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "search", name: complexName, sigungu, limit: 5 })
      });
      const d1 = await r1.json();
      if (d1.complexes && d1.complexes.length > 0) {
        // complexId 일치 우선, 없으면 첫 번째
        complexInfo = d1.complexes.find(c => complexId && c.id === complexId) || d1.complexes[0];
      }
      if (d1.aliasMatch) {
      }
    } catch(e) {
      console.warn("  [STEP1] complexes 조회 실패:", e.message);
    }

    // Supabase 단지 정보 없으면 MOLIT fallback
    if (!complexInfo) {
      return await _fetchRawData(ff, overrideArea, exclusiveAreas);
    }

    const useComplexId = complexInfo.id;
    const useComplexName = complexInfo.complex_name;

    // ── STEP 2: aliases 확인 (이미 STEP1에서 반환됨, 별도 로그용) ──

    // ── STEP 3: price_summary 조회 ──
    let summary = null;
    try {
      const r3 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "summary", complex_id: useComplexId, area_excl: targetArea || undefined })
      });
      const d3 = await r3.json();
      summary = d3.summary || null;
    } catch(e) {
      console.warn("  [STEP3] price_summary 조회 실패:", e.message);
    }

    // ── STEP 4+5: sales_raw + rent_raw 조회 ──
    // 면적 필터 없이 전체 단지 deals 조회 → rawMolitRef에 전체 저장
    // → 뒤로가기 후 다른 면적 선택 시 refilterByArea가 정상 동작
    let saleDealsAll = [], rentDealsAll = [];
    try {
      const r4 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deals", complex_id: useComplexId, complex_name: useComplexName, sigungu })
        // area_excl 제거 — 전체 면적 데이터 받아서 클라이언트 필터
      });
      const d4 = await r4.json();
      saleDealsAll = d4.saleDeals || [];
      rentDealsAll = d4.rentDeals || [];
    } catch(e) {
      console.warn("  [STEP4+5] deals 조회 실패:", e.message);
    }

    // 현재 선택 면적으로 클라이언트 필터 (±3㎡)
    const filterByArea = (deals, area) => {
      if (!area) return deals;
      return deals.filter(d => Math.abs(Number(d.area_excl) - area) <= 3);
    };
    const saleDeals = targetArea ? filterByArea(saleDealsAll, targetArea) : saleDealsAll;
    const rentDeals = targetArea ? filterByArea(rentDealsAll, targetArea) : rentDealsAll;

    // ── Supabase: 단지는 있지만 적재기간 내 거래 없음 → MOLIT fallback ──
    // (단지 미매칭과 거래 없음을 구분해서 tradeStatus에 반영)
    if (saleDeals.length === 0 && rentDeals.length === 0) {
      // MOLIT fallback 시도
      const molitData = await _fetchRawData(ff, overrideArea, exclusiveAreas);
      if (molitData && (molitData.sale?.length > 0 || molitData.jeonse?.length > 0)) {
        return molitData;
      }
      // MOLIT도 없으면 "DB 적재기간 내 거래 없음" 명확히 표시
      return {
        sale: [], jeonse: [], areaOptions: complexInfo.area_list
          ? groupAreasByPyeong(JSON.parse(complexInfo.area_list))
              .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: Math.round(g.rep / 3.3058) })) : [],
        buildYear: complexInfo.build_year || null, lawdCd: null,
        tradeStatus: { code: "PERIOD_NO_TRADE", msg: `최근 1년 실거래 데이터가 부족합니다. 직접 확인한 가격을 입력해 주세요.`, pipeline: { source: "supabase" } },
        dataSource: "supabase",
      };
    }

    // ── STEP 7: 기존 형식으로 변환 (계산식 건드리지 않음) ──
    const toSale = (d) => ({
      areaSqm:      Number(d.area_excl) || 0,
      price:        Number(d.deal_amount_man) || 0,
      ym:           d.contract_ym || "",
      aptNm:        d.complex_name || useComplexName,
      floor:        d.floor || 0,
      cancelDate:   d.cancel_date || null,
    });
    const toRent = (d) => ({
      areaSqm:      Number(d.area_excl) || 0,
      price:        Number(d.deposit_man) || 0,
      ym:           d.contract_ym || "",
      aptNm:        d.complex_name || useComplexName,
      floor:        d.floor || 0,
      monthly:      Number(d.monthly_man) || 0,
    });

    const sale   = saleDeals.map(toSale).filter(d => d.price > 0 && d.areaSqm > 0);
    const jeonse = rentDeals.map(toRent).filter(d => d.price > 0 && d.areaSqm > 0);


    // 신뢰도 계산
    const sbSaleConf = getDataConfidence(sale.length);
    const sbRentConf = getDataConfidence(jeonse.length);
    const sbStatus = (!sbSaleConf.canAnalyze && !sbRentConf.canAnalyze)
      ? { code: "TOO_FEW",  msg: `거래 건수 부족 (매매 ${sale.length}건·전세 ${jeonse.length}건) — 참고용으로만 표시됩니다`, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } }
      : (sbSaleConf.level === "낮음" || sbRentConf.level === "낮음")
        ? { code: "LOW_DATA", msg: `거래 부족 — 참고용 분석 (매매 ${sale.length}건·전세 ${jeonse.length}건)`, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } }
        : { code: "OK", msg: null, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } };
    const data = {
      sale, jeonse,
      areaOptions: complexInfo.area_list
        ? groupAreasByPyeong(JSON.parse(complexInfo.area_list))
            .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: Math.round(g.rep / 3.3058) }))
        : [],
      buildYear:    complexInfo.build_year || null,
      lawdCd:       null,
      tradeStatus:  sbStatus,
      dataSource:   "supabase",
    };

    rawMolitRef.current = {
      ...data,
      // 전체 deals 보관 (면적 필터 전) → refilterByArea 정상 동작
      sale:   saleDealsAll.map(d => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deal_amount_man)||0, ym: d.contract_ym||"", aptNm: d.complex_name||useComplexName, floor: d.floor||0, cancelDate: d.cancel_date||null })).filter(d => d.price>0 && d.areaSqm>0),
      jeonse: rentDealsAll.map(d => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deposit_man)||0,    ym: d.contract_ym||"", aptNm: d.complex_name||useComplexName, floor: d.floor||0, monthly: Number(d.monthly_man)||0 })).filter(d => d.price>0 && d.areaSqm>0),
      complexName: ff.exactAptNm || ff.complexName,
      dong: ff.dong,
      dataSource: 'supabase',
    };
    return data;
  }

  async function _fetchRawData(ff, overrideArea, exclusiveAreas) {
    const data = await fetchApartmentData({
      complexName: ff.complexName, exactAptNm: ff.exactAptNm,
      dong: ff.dong, region: ff.region, sido: ff.sido || "",
      areaExclusive: overrideArea ? String(overrideArea) : ff.areaExclusive,
      exclusiveAreas: exclusiveAreas || null,
    });
    // 원본 보관 (단지명+동 기준)
    rawMolitRef.current = {
      ...data,
      complexName: ff.exactAptNm || ff.complexName,
      dong: ff.dong,
      dataSource: 'molit',
    };
    return data;
  }

  async function _processRawData(rawData, ff, overrideArea, exclusiveAreas) {
    const rawDataWithUserInput = {
      ...rawData,
      // 면적 변경 시 KB시세/현재가는 이전 값 유지 — 사용자가 입력한 값이 우선
      currentPrice: Number(ff.currentPrice) || rawData.currentPrice || 0,
      kbSalePrice:  Number(ff.kbSalePrice)  || rawData.kbSalePrice  || 0,
      kbJeonse:     Number(ff.kbJeonse)     || rawData.kbJeonse     || 0,
      buildYear:    ff.buildYear || rawData.buildYear || 0,
      buildYearWarning: rawData.buildYearWarning || null,
    };
    const effectiveArea = Number(overrideArea) || Number(ff.areaExclusive) || Number(f.areaExclusive) || 0;
    const { filled, ff: builtFf, jeonseCalc, saleCalc, blockReason } = buildAnalysisInput(
      rawDataWithUserInput, ff, effectiveArea
    );
    // 면적: overrideArea 우선
    if (overrideArea) filled.areaExclusive = String(overrideArea);
    else if (ff.areaExclusive) filled.areaExclusive = ff.areaExclusive;
    if (ff.buildYear && !filled.buildYear) filled.buildYear = ff.buildYear;

    // 면적 변경 알림 메시지 (이전 분석 무효)
    if (overrideArea && rawMolitRef.current) {
      filled._areaChangedMsg = `면적이 ${overrideArea}㎡로 변경되어 기존 분석값을 초기화했습니다. 다시 AI 분석을 실행하세요.`;
    }

    // listingPriceInput(독립 state)에서 직접 읽음 — 절대 초기화 안 됨
    const preservedPrice = Number(String(listingPriceInput).replace(/,/g, "")) || Number(ff.currentPrice) || Number(f.currentPrice) || 0;
    // tradeStatus를 f에 저장 → UI에서 원인별 메시지 표시
    setF({ ...filled, currentPrice: preservedPrice, _tradeStatus: rawData.tradeStatus || null });
    const opts = filled._aiAreaOptions?.length > 0 ? filled._aiAreaOptions : (rawData.areaOptions || []);
    setAreaOptions(opts);

    const askedArea = effectiveArea;
    if (askedArea <= 0 && opts.length > 0) { setAiMsg(null); return; }

    const finalCurrentPrice = preservedPrice || Number(String(listingPriceInput).replace(/,/g, "")) || 0;
    const finalBlockReason = !finalCurrentPrice ? "현재 매물가를 입력하세요." : blockReason;
    const pendingFf = builtFf
      ? { ...builtFf, currentPrice: finalCurrentPrice }
      : { ...filled, currentPrice: finalCurrentPrice, baseJeonse: Number(filled.kbJeonse) || 0,
          kbSalePrice: Number(filled.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0,
          jeonseCalc: null, saleCalc: null, dataSource: "ai" };

    // ── B안: ConfirmStep 조건부 자동 스킵 ──
    // Case 1: FairValue → 현재가 불필요 → 항상 바로 분석
    // Case 2: Buy/Sell + 현재가 있음 + blockReason 없음 + 데이터 정상(OK/LOW_DATA/TOO_FEW) → 바로 분석
    // Case 3: 현재가 없음 / 데이터 부족(API_FAIL, NAME_NO_MATCH 등) → ConfirmStep 표시
    const tradeCode = rawData.tradeStatus?.code || "OK";
    const dataOk = ["OK","LOW_DATA","TOO_FEW","JEONSE_SHORT","JEONSE_AREA_SHORT"].includes(tradeCode);
    const canAutoSkip =
      mode === "fair"
        ? (builtFf != null)  // FairValue: blockReason 없으면 바로
        : (finalCurrentPrice > 0 && !finalBlockReason && (dataOk || fromConfirm) && builtFf != null);

    if (canAutoSkip) {
      // ConfirmStep 건너뛰고 바로 분석 실행
      // 분석 횟수 제한 체크 (TODO: 유료화 시 서버사이드 계산으로 이전)
      const allowed = await checkAnalysisLimit();
      if (!allowed) return;
      const autoFf = { ...pendingFf, currentPrice: mode === "fair" ? (finalCurrentPrice || 0) : finalCurrentPrice };
      const res = analyze(autoFf);
      res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
      setR(res); setSaved(false); setPending(null);
      if (onContext) onContext({ price: autoFf.currentPrice, area: Number(autoFf.areaExclusive) || 0 });
      if (mode !== "fair") {
        onSaveHistory({ date: new Date().toISOString().slice(0,10), complex: autoFf.complexName, dong: autoFf.dong,
          complexName: autoFf.complexName, area: autoFf.areaExclusive ? `전용 ${autoFf.areaExclusive}㎡` : "",
          currentPrice: autoFf.currentPrice, fairPrice: res.fairPrice, safetyPrice: res.safetyPrice,
          grade: res.buyGrade, headline: res.headline, analysisType: mode === "buy" ? "매수" : "적정가",
          gradeLabel: res.gradeLabel || "" });
      } else {
        onSaveHistory({ date: new Date().toISOString().slice(0,10), complex: autoFf.complexName, dong: autoFf.dong,
          complexName: autoFf.complexName, area: autoFf.areaExclusive ? `전용 ${autoFf.areaExclusive}㎡` : "",
          currentPrice: autoFf.currentPrice, fairPrice: res.fairPrice, safetyPrice: res.safetyPrice,
          grade: res.buyGrade, headline: res.headline, analysisType: "적정가",
          gradeLabel: res.gradeLabel || "" });
      }
    } else {
      // 데이터 부족 or 현재가 없음 → ConfirmStep 표시
      setPending({ ff: pendingFf, jeonseCalc, saleCalc, blockReason: finalBlockReason });
    }
  }

  // 매물 캡처(이미지)에서 정보 추출 — 사용자가 올린 화면만 분석
  async function extractFromImage(file) {
    if (!file) return;
    setAiLoading(true); setAiMsg(null);
    try {
      const base64 = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(String(rd.result).split(",")[1]); rd.onerror = () => rej(new Error("read")); rd.readAsDataURL(file); });
      const mediaType = file.type || "image/png";
      const prompt = `이 이미지는 한국 부동산 매물 화면(네이버 부동산·중개사 매물 등)의 캡처야. 화면에 보이는 정보만 추출해 아래 JSON만 출력 (설명·마크다운·백틱 금지):
{"region":"시군구","dong":"법정동","complexName":"단지명","pyeong":평형숫자,"areaExclusive":전용면적㎡숫자,"buildYear":준공연도숫자,"currentPrice":매물호가만원,"floor":해당층숫자,"tradeType":"매매|전세|월세"}
규칙: 가격은 만원 단위 정수(12억4000만→124000). 화면에 안 보이는 값은 0/빈문자. 추정하지 말고 보이는 값만.`;
      const response = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json", ...(currentUserId ? { "x-user-id": currentUserId, "x-user-email": currentUserEmail || "" } : {}) },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1000, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: prompt }] }] }),
      });
      if (response.status === 429) { const d = await response.json(); setAiMsg(d.message || "오늘 무료 AI 분석 횟수를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요."); setAiLoading(false); return; }
      const data = await response.json();
      const text = (data.content || []).map((i) => (i.type === "text" ? i.text : "")).filter(Boolean).join("\n");
      const m = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
      const p = JSON.parse(m ? m[0] : "{}");
      setF((prev) => ({ ...prev, region: p.region || prev.region, dong: p.dong || prev.dong, complexName: p.complexName || prev.complexName, pyeong: p.pyeong || prev.pyeong, areaExclusive: p.areaExclusive || prev.areaExclusive, buildYear: p.buildYear || prev.buildYear, currentPrice: Number(p.currentPrice) || prev.currentPrice, _aiFilled: true }));
      setAiMsg(`캡처 분석 완료 — ${p.complexName || "단지"} ${p.pyeong ? p.pyeong + "평" : ""} ${p.currentPrice ? "호가 " + won(Number(p.currentPrice)) : ""}. 시세 판단용 실거래(전세·매매)는 아래 거래내역에 입력하세요. (상용화 시 국토부 API 자동 연동)`);
    } catch (e) {
      setAiMsg("이미지 분석 실패 — 다른 캡처로 시도하거나 직접 입력하세요.");
    } finally { setAiLoading(false); }
  }

  function run() {
    if (!f.currentPrice || !f.complexName) { alert("단지명 · 현재 매물가는 필수입니다."); return; }
    const hasDeals = (f.deals || []).some((d) => d.price && d.ym);
    const jeonseCalc = hasDeals ? computeTrimmedMean(f.deals, Number(f.kbJeonse) || 0, "jeonse") : null;
    const baseJeonse = jeonseCalc && jeonseCalc.value ? jeonseCalc.value : Number(f.baseJeonse);
    if (!baseJeonse) { alert("전세 실거래를 입력하거나 기준 전세가를 직접 입력하세요."); return; }
    const hasSaleDeals = (f.saleDeals || []).some((d) => d.price && d.ym);
    const saleCalc = hasSaleDeals ? computeTrimmedMean(f.saleDeals, Number(f.kbSalePrice) || 0, "sale") : null;
    const ff = { ...f, currentPrice: Number(f.currentPrice), baseJeonse, kbSalePrice: Number(f.kbSalePrice), saleRef: saleCalc && saleCalc.value ? saleCalc.value : null, jeonseUsed: jeonseCalc ? jeonseCalc.used : 0, saleUsed: saleCalc ? saleCalc.used : 0, jeonseCalc, saleCalc, dataSource: f._aiFilled ? "ai" : "manual" };
    setPending({ ff, jeonseCalc, saleCalc }); // 입력값 확인 단계로
  }
  // doAnalyze: ConfirmStep에서 수정된 { ff, jeonseCalc, saleCalc } 객체를 직접 받음
  async function doAnalyze(updated) {
    const src = updated || pending;
    if (!src) return;
    // 분석 횟수 제한 체크 (TODO: 유료화 시 서버사이드 계산으로 이전)
    const allowed = await checkAnalysisLimit();
    if (!allowed) { setPending(null); return; }
    const { ff, jeonseCalc, saleCalc } = src;
    const res = analyze(ff);
    res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
    setR(res); setSaved(false); setPending(null);
    if (onContext) onContext({ price: ff.currentPrice, area: Number(ff.areaExclusive) || 0 });
    onSaveHistory({ date: new Date().toISOString().slice(0, 10), complex: ff.complexName, dong: ff.dong,
      complexName: ff.complexName, area: ff.areaExclusive ? `전용 ${ff.areaExclusive}㎡` : "",
      currentPrice: ff.currentPrice, fairPrice: res.fairPrice, safetyPrice: res.safetyPrice,
      grade: res.buyGrade, headline: res.headline, analysisType: mode === "buy" ? "매수" : "적정가",
      gradeLabel: res.gradeLabel || "" });
  }
  if (r) return mode === "fair"
    ? <FairValueResult r={r} f={f} onBack={() => setR(null)}
        onNewSearch={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
        onHome={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
        areaOptions={areaOptions} currentUserId={currentUserId}
      />
    : <BuyResult r={r} f={f} onBack={() => setR(null)} saved={saved}
        onSave={() => { onAddWatch({ key: `${f.complexName}-${f.dong}`, complex: f.complexName, dong: f.dong, fairPrice: r.fairPrice, currentPrice: Number(f.currentPrice), target: "" }); setSaved(true); }}
        onNewSearch={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
        onChangeArea={() => { setR(null); }}
        onHome={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
        areaOptions={areaOptions} currentArea={f.areaExclusive} currentUserId={currentUserId}
        onSelectArea={async (area) => {
          // 면적 변경 → 데이터 재조회 → 자동 분석까지 실행
          setR(null);
          setPending(null);
          setF(prev => ({ ...prev, areaExclusive: String(area) }));
          window.scrollTo({ top: 0, behavior: 'smooth' });
          // quickSearch 후 pending 세팅 → 자동으로 doAnalyze 실행
          setAiLoading(true);
          try {
            const rawData = await _fetchRawDataSupabase(
              { ...f, areaExclusive: String(area) }, area, null
            );
            const effectiveArea = Number(area);
            const rawWithInput = {
              ...rawData,
              currentPrice: Number(f.currentPrice) || 0,
              kbSalePrice: Number(f.kbSalePrice) || 0,
              kbJeonse: Number(f.kbJeonse) || 0,
              buildYear: f.buildYear || rawData.buildYear || 0,
            };
            const { ff: builtFf, jeonseCalc, saleCalc } = buildAnalysisInput(rawWithInput, { ...f, areaExclusive: String(area) }, effectiveArea);
            if (builtFf && Number(f.currentPrice) > 0) {
              const res = analyze({ ...builtFf, currentPrice: Number(f.currentPrice) });
              res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
              setF(prev => ({ ...prev, areaExclusive: String(area), _tradeStatus: rawData.tradeStatus || null }));
              setAreaOptions(rawData.areaOptions || []);
              setR(res); setSaved(false);
            } else {
              // 현재가 없거나 분석 불가 → 폼으로 복귀
              setF(prev => ({ ...prev, areaExclusive: String(area), _tradeStatus: rawData.tradeStatus || null }));
              setAreaOptions(rawData.areaOptions || []);
              setAiMsg('면적을 변경했습니다. 현재 매물가 확인 후 조회하세요.');
            }
          } catch(e) {
            setAiMsg(`면적 변경 실패: ${e.message}`);
          } finally {
            setAiLoading(false);
          }
        }}
      />;
  if (pending) return <ConfirmStep p={pending} f={f} onBack={() => setPending(null)} onConfirm={doAnalyze} mode={mode} onRefetch={(area) => { setF(prev => ({...prev, areaExclusive: String(area)})); quickSearch(area, null, null, true); }} onBackToTop={() => { setPending(null); setR(null); setF({...EMPTY}); setUploadedImages([]); setCaptureMsg(null); setAiMsg(null); }} />;
  return (
    <>
      {/* ── 최근 분석한 단지 ── */}
      {(() => {
        const recents = loadRecentAnalysis(currentUserId).filter(h => {
          const t = h.analysisType;
          return mode === "fair" ? t === "적정가" : t === "매수";
        }).slice(0, 5);
        if (recents.length === 0) return null;
        return (
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="mb-2 text-xs font-bold text-slate-500">최근 분석한 단지</p>
            <div className="space-y-1.5">
              {recents.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    // 저장된 결과 바로 재오픈 (재조회 없이)
                    const restored = {
                      fairPrice: h.fairPrice || 0,
                      safetyPrice: h.safetyPrice || 0,
                      buyGrade: h.grade || "C",
                      gradeLabel: h.gradeLabel || "",
                      gapRatio: h.currentPrice && h.fairPrice ? (h.currentPrice - h.fairPrice) / h.fairPrice : 0,
                      engineMode: "jeonse", modeName: "전세 시세 중심",
                      jeonseUsed: 0, saleUsed: 0, dataConf: 50, dataConfLabel: "보통",
                      shock: { level: "보통", lag: 3 },
                      explain: { valuation: "", review: "", negotiation: "" },
                      headline: h.headline || "", _restored: true,
                    };
                    setF(prev => ({
                      ...prev,
                      complexName: h.complexName || h.complex || "",
                      dong: h.dong || "",
                      areaExclusive: h.area ? h.area.replace("전용 ", "").replace("㎡", "") : "",
                      currentPrice: h.currentPrice || 0,
                    }));
                    setR(restored);
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left hover:bg-slate-100 active:bg-slate-200"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{h.complexName || h.complex}</span>
                    <span className="ml-1.5 text-[11px] text-slate-400">{h.area}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">AI 적정가 {won(h.fairPrice)}</span>
                    {h.grade && GS[h.grade] && (
                      <span className={`rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-white ${GS[h.grade].solid}`}>{h.grade}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        {/* 진입 안내 — 단지 미선택 시만 표시 */}
        {!f.complexName && (
          <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
            <p className="text-sm font-bold text-blue-800">분석 순서</p>
            <div className="mt-2 space-y-1 text-xs text-blue-600">
              <p>시/도 → 구/군 → 동 → 단지명 순으로 선택</p>
              <p>면적 선택</p>
              <p>현재 매물가 입력</p>
              <p>AI 분석 버튼 클릭</p>
            </div>
          </div>
        )}

        <p className="mb-3 text-sm font-bold text-slate-800">① 단지 검색</p>

        {/* 선택된 단지 표시 */}
        {f.complexName && f.region ? (
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-800 px-4 py-3">
            <div>
              <p className="text-xs text-slate-400">{f.region} · {f.dong}</p>
              <p className="text-base font-bold text-white">{f.complexName}</p>
            </div>
            <button onClick={() => { setF(p => ({...p, region:"", dong:"", complexName:"", areaExclusive:""})); setAreaOptions([]); setAiMsg(null); }}
              className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600">
              변경
            </button>
          </div>
        ) : (
          <LocationPicker initialQuery={screenerInitial?._searchQuery || ""} onComplete={({ sido, sigungu, dong, complexName, exactAptNm, complexId, buildYear, areaList }) => {
            setF(p => ({ ...p, region: sigungu, sido, dong, complexName, exactAptNm,
              complexId: complexId || null,
              buildYear: buildYear || p.buildYear,
              areaExclusive: "" }));
            rawMolitRef.current = null;
            setAreaOptions([]);
            setListingPriceInput(""); // 단지 변경 시 매물가 초기화
            // areaList가 있으면 바로 면적 버튼 생성 (Supabase 경로)
            if (areaList && areaList.length > 0) {
              const opts = groupAreasByPyeong(areaList)
                .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) }));
              setAreaOptions(opts);
            } else {
              setTimeout(() => fetchAreasFor(sigungu, dong, complexName, exactAptNm, sido), 100);
            }
          }} />
        )}

        {/* ── STEP 1: 면적 선택 ── */}
        {areaOptions.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${f.areaExclusive ? "bg-emerald-500" : "bg-amber-500"}`}>
                {f.areaExclusive ? "✓" : "1"}
              </span>
              <p className="text-sm font-bold text-slate-700">면적 선택</p>
              {!f.areaExclusive && <p className="text-xs text-amber-600">← 분석할 면적을 선택하세요</p>}
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <div className="flex flex-wrap gap-2">
                {areaOptions.map((o, i) => {
                  const { mainLabel, subLabel } = areaButtonLabel(o.areaSqm, o.supplySqm);
                  const selected = String(f.areaExclusive) === String(o.areaSqm);
                  return (
                    <button key={i} onClick={() => { set("areaExclusive", String(o.areaSqm)); setAiMsg(null); }}
                      className={`rounded-xl px-3 py-2 text-left border transition-all ${selected ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:border-amber-400"}`}>
                      <p className="text-sm font-semibold leading-tight">{mainLabel}</p>
                      {subLabel && <p className={`text-[10px] mt-0.5 ${selected ? "text-amber-100" : "text-slate-400"}`}>{subLabel}</p>}
                    </button>
                  );
                })}
              </div>
              {f.areaExclusive && (() => {
                const sel = areaOptions.find(o => String(o.areaSqm) === String(f.areaExclusive));
                const { mainLabel } = sel ? areaButtonLabel(sel.areaSqm, sel.supplySqm) : { mainLabel: `전용 ${f.areaExclusive}㎡` };
                return <p className="mt-1.5 text-xs text-amber-700">분석 기준: 전용 {sel ? sel.areaSqm : f.areaExclusive}㎡ ({Math.round(Number(sel ? sel.areaSqm : f.areaExclusive) / 3.3058)}평)</p>;
              })()}
            </div>
          </div>
        )}
        {fetchingAreas && <p className="mt-2 text-xs text-slate-400 text-center">면적 조회 중…</p>}

        {/* ── STEP 2: 현재 매물가 입력 ── */}
        {f.complexName && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${listingPriceInput ? "bg-emerald-500" : "bg-slate-400"}`}>
                {listingPriceInput ? "✓" : "2"}
              </span>
              <p className="text-sm font-bold text-slate-700">현재 매물가 입력</p>
              {!listingPriceInput && <p className="text-xs text-slate-400">호가 또는 실거래가 (만원)</p>}
            </div>
            <div className="relative">
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={listingPriceInput} placeholder="예: 50000"
                onChange={(e) => setListingPriceInput(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-slate-500" />
              {listingPriceInput && (() => {
                const v = Number(listingPriceInput);
                if (!v) return null;
                const eok = Math.floor(v / 10000);
                const man = v % 10000;
                const txt = eok > 0 ? (man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`) : `${man.toLocaleString()}만원`;
                return <p className="mt-1.5 text-center text-sm font-bold text-emerald-600">= {txt}</p>;
              })()}
            </div>
          </div>
        )}

        {/* 실거래 상태 안내 카드 — 원인별 구분 */}
        {f._tradeStatus && f._tradeStatus.code !== "OK" && (() => {
          const ts = f._tradeStatus;
          const isApiFail  = ts.code === "API_FAIL";
          const isNoTrade  = ["COMPLEX_NO_TRADE","NAME_NO_MATCH","PERIOD_NO_TRADE"].includes(ts.code);
          const isLowData  = ["LOW_DATA","TOO_FEW"].includes(ts.code);
          const isAreaFail = ts.code === "AREA_NO_MATCH";
          const needKb = isApiFail || isNoTrade || ts.code === "JEONSE_SHORT";
          const boxColor = isNoTrade ? "bg-red-50 ring-red-200" : isLowData ? "bg-amber-50 ring-amber-200" : isAreaFail ? "bg-orange-50 ring-orange-200" : "bg-amber-50 ring-amber-200";
          return (
            <div className={`mt-3 rounded-2xl p-4 ring-1 ${boxColor}`}>
              <p className="text-sm font-bold text-amber-800">
                {isApiFail ? "API 조회 실패" :
                 isNoTrade ? "단지 거래 없음" :
                 ts.code === "JEONSE_AREA_SHORT" || ts.code === "AREA_SHORT_JEONSE_ELSEWHERE" ? "선택 면적 전세 실거래 부족" :
                 ts.code === "SALE_SHORT" ? "매매 실거래 부족" :
                 "선택 면적 실거래 부족"}
              </p>
              <p className="mt-0.5 text-xs text-amber-600">{ts.msg}</p>
              {needKb && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-amber-700">KB매매시세 (만원)</p>
                    <input type="number" value={f.kbSalePrice} placeholder="예: 50250" onChange={(e) => set("kbSalePrice", e.target.value)} className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-amber-700">KB전세시세 (만원)</p>
                    <input type="number" value={f.kbJeonse} placeholder="예: 35000" onChange={(e) => set("kbJeonse", e.target.value)} className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
                  </div>
                </div>
              )}
              <p className="mt-2 text-[10px] text-amber-500">네이버 부동산 → 시세/실거래가 탭 → KB시세 중간값 확인 후 입력</p>
            </div>
          );
        })()}

        {/* 캡처 업로드 */}
        <div className="mt-3 rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-800">네이버 부동산 캡처 → AI 자동 입력</p>
            {uploadedImages.length > 0 && <button onClick={() => { setUploadedImages([]); setCaptureMsg(null); }} className="text-[10px] text-indigo-400 underline">초기화</button>}
          </div>
          <p className="mt-0.5 text-[10px] text-indigo-500">매물·시세 화면 캡처 올리면 위 항목 자동 인식</p>
          {uploadedImages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {uploadedImages.map((url, i) => (
                <img key={i} src={url} alt={`캡처${i+1}`} className="h-16 w-16 rounded-lg object-cover ring-1 ring-indigo-200" />
              ))}
            </div>
          )}
          <label className={`mt-2 block w-full cursor-pointer rounded-xl py-2 text-center text-xs font-bold text-white ${aiLoading ? "opacity-50" : ""}`} style={{ backgroundColor: NAVY }}>
            {aiLoading ? "인식 중…" : uploadedImages.length > 0 ? "추가 캡처" : "캡처 업로드"}
            <input ref={photoTriggerRef} type="file" accept="image/*" multiple disabled={aiLoading} className="hidden" onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (!files.length) return;
              setAiLoading(true); setAiMsg(null);
              try {
                const toBase64 = (file) => new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res({data: String(rd.result).split(",")[1], type: file.type||"image/png", url: rd.result}); rd.onerror = rej; rd.readAsDataURL(file); });
                const imgs = await Promise.all(files.map(toBase64));
                setUploadedImages(prev => [...prev, ...imgs.map(i => i.url)]);
                const content = [
                  ...imgs.map(img => ({ type: "image", source: { type: "base64", media_type: img.type, data: img.data } })),
                  { type: "text", text: `이 이미지들은 네이버 부동산 화면 캡처야. 보이는 정보만 추출해 아래 JSON만 출력 (설명·백틱 금지):\n{"region":"시군구","dong":"법정동","complexName":"단지명","currentPrice":매물호가또는최근실거래만원정수,"kbSalePrice":KB매매시세만원정수,"kbJeonse":KB전세시세만원정수}\n규칙:\n- 가격은 만원 정수(4억5100만→45100, 5억→50000)\n- 단지명은 화면 상단 굵은 글씨\n- currentPrice: 매물 호가 없으면 최근 실거래가\n- KB시세 없으면 0\n- 안 보이는 값은 0. 절대 추정 금지.` }
                ];
                const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", ...(currentUserId ? { "x-user-id": currentUserId, "x-user-email": currentUserEmail || "" } : {}) }, body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1000, messages: [{ role: "user", content }] }) });
                if (res.status === 429) { const d = await res.json(); setAiMsg(d.message || "오늘 무료 AI 분석 횟수를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요."); setAiLoading(false); return; }
                const data = await res.json();
                const text = (data.content||[]).map(i=>i.type==="text"?i.text:"").join("").replace(/```json|```/g,"").trim();
                const m = text.match(/\{[\s\S]*\}/);
                const p = JSON.parse(m ? m[0] : "{}");
                setF(prev => ({
                  ...prev,
                  region: p.region || prev.region,
                  dong: p.dong || prev.dong,
                  complexName: p.complexName || prev.complexName,
                  currentPrice: Number(p.currentPrice) || prev.currentPrice,
                  kbSalePrice: Number(p.kbSalePrice) || prev.kbSalePrice,
                  kbJeonse: Number(p.kbJeonse) || prev.kbJeonse,
                }));
                setCaptureMsg(`✅ 인식 완료 — ${p.complexName||"단지"} ${p.currentPrice?"매물가 "+(p.currentPrice/10000).toFixed(1)+"억":""}`);
              } catch(e) {
                setAiMsg("캡처 인식 실패 — 직접 입력해주세요.");
              } finally { setAiLoading(false); e.target.value=""; }
            }} />
          </label>
          {captureMsg && <p className="mt-2 text-xs font-medium text-emerald-700">{captureMsg}</p>}
        </div>


        {/* ── STEP 3: AI 분석 실행 ── */}
        {f.complexName && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">3</span>
              <p className="text-sm font-bold text-slate-700">AI 분석 실행</p>
            </div>
            {/* 필수값 미입력 안내 */}
            {!listingPriceInput && (
              <p className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                ↑ 현재 매물가를 입력하면 분석을 시작할 수 있습니다.
              </p>
            )}
            <button onClick={() => quickSearch(f.areaExclusive || undefined)} disabled={aiLoading}
              className={`w-full rounded-2xl py-4 text-lg font-extrabold text-white transition-opacity ${!listingPriceInput ? "opacity-40" : "opacity-100"}`}
              style={{ backgroundColor: NAVY }}>
              {aiLoading
                ? "AI 조회 중… (실거래 데이터 수집 중)"
                : rawMolitRef.current && rawMolitRef.current.complexName === (f.exactAptNm || f.complexName)
                  ? (mode === "fair" ? "다시 분석 (면적 변경됨)" : "다시 분석 (면적 변경됨)")
                  : (mode === "fair" ? "현재 아파트 적정가격은? — AI 적정가 판단" : "이 집 사도 될까? — AI 매수판단")}
            </button>
          </div>
        )}
        {aiLoading && <button onClick={() => { if (abortRef.current) abortRef.current.abort(); setAiLoading(false); setAiMsg("조회가 취소되었습니다."); }} className="mt-2 w-full rounded-2xl border border-red-200 py-2.5 text-sm font-medium text-red-500">⬛ 조회 취소</button>}

        {/* 조회 실패 메시지 */}
        {aiMsg && (() => {
          const isDataShort = aiMsg.includes("실거래가 없습니다") || aiMsg.includes("실거래 데이터가 부족") || aiMsg.includes("실거래를 불러오지 못") || aiMsg.includes("불러오지 못했습니다");
          if (isDataShort) {
            return (
              <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-4 ring-1 ring-blue-200">
                <p className="text-sm font-bold text-blue-800">아파트는 찾았습니다.</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                  하지만 최근 12개월간 분석에 필요한 실거래 데이터가 부족합니다.<br />
                  확인한 시세 또는 KB시세를 입력하면 분석을 계속 진행할 수 있습니다.
                </p>
                <button
                  onClick={() => {
                    const ff = { ...f, currentPrice: Number(f.currentPrice)||0, baseJeonse: Number(f.kbJeonse)||0, kbSalePrice: Number(f.kbSalePrice)||0, jeonseUsed:0, saleUsed:0, jeonseCalc:null, saleCalc:null, dataSource:"manual" };
                    setPending({ ff, jeonseCalc:null, saleCalc:null, blockReason: "최근 1년 실거래 데이터가 부족합니다. 직접 확인한 가격을 입력해 주세요." });
                  }}
                  className="mt-3 block w-full rounded-xl bg-blue-600 py-2.5 text-center text-xs font-bold text-white active:bg-blue-700">
                  시세 직접 입력 →
                </button>
              </div>
            );
          }
          return (
            <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-100">
              {aiMsg}
              <button
                onClick={() => {
                  const ff = { ...f, currentPrice: Number(f.currentPrice)||0, baseJeonse: Number(f.kbJeonse)||0, kbSalePrice: Number(f.kbSalePrice)||0, jeonseUsed:0, saleUsed:0, jeonseCalc:null, saleCalc:null, dataSource:"manual" };
                  setPending({ ff, jeonseCalc:null, saleCalc:null, blockReason: null });
                }}
                className="mt-2 block w-full rounded-lg bg-amber-700 py-2 text-center text-xs font-bold text-white">
                ✏️ 수기로 직접 입력하기
              </button>
            </div>
          );
        })()}

        {/* 샘플 */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">샘플:</span>
          <button onClick={() => { const s = SAMPLE; setF(s); const r = buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:15,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]}, s, s.areaExclusive); const ff2 = r.ff || {...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">동부(전세)</button>
          <button onClick={() => { const s={...PRESET_SG7}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:15,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">상계주공(재건축)</button>
          <button onClick={() => { const s={...PRESET_EUNMA}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:14,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">은마(재건축)</button>
          <button onClick={() => { const s={...PRESET_PRIME_FULL}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:14,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">강남 특수</button>
          <button onClick={() => { const s={...TEST_CASES[5]}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:15,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">잠실엘스</button>
          <button onClick={() => { const s={...TEST_CASES[3]}; setF(s); const r=buildAnalysisInput({region:s.region,dong:s.dong,complexName:s.complexName,areaSqm:s.areaExclusive,pyeong:s.pyeong,priceArea:s.areaExclusive,buildYear:s.buildYear,topFloor:15,currentPrice:s.currentPrice,kbSalePrice:s.kbSalePrice,kbJeonse:s.kbJeonse,jeonse:s.deals,sale:s.saleDeals,areaOptions:[]},s,s.areaExclusive); const ff2=r.ff||{...s,currentPrice:Number(s.currentPrice),baseJeonse:Number(s.kbJeonse)||0,kbSalePrice:Number(s.kbSalePrice)||0,jeonseUsed:0,saleUsed:0,jeonseCalc:null,saleCalc:null,dataSource:"manual"}; setPending({ff:ff2,jeonseCalc:r.jeonseCalc,saleCalc:r.saleCalc}); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">목동7</button>
        </div>
      </div>
    </>
  );
}

// ConfirmStep — AI 조회값 확인 및 수정 카드
// - 읽기전용 테이블 → 수정 가능 입력 카드로 전환
// - 고급설정/직접입력 기능 흡수 (별도 메뉴 최소화)
// - 사용자가 값을 검증하고 수정한 뒤 분석 실행
function ConfirmStep({ p, f, onBack, onConfirm, mode = "buy", onRefetch, onBackToTop }) {
  // ConfirmStep 내부에서 직접 수정 가능한 상태 관리
  const [edit, setEdit] = useState({ ...p.ff });
  const [dealsOpen, setDealsOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const setE = (k, v) => setEdit((prev) => ({ ...prev, [k]: v }));

  const age = edit.buildYear ? new Date().getFullYear() - Number(edit.buildYear) : null;
  const isSell = mode === "sell";

  // ── 진입 경로 판별 ──
  // fromAI: 이미지 캡처 → AI 인식 경로 (_aiFilled=true, blockReason 없음)
  // fromData: 검색 후 데이터 부족 경로 (blockReason 있거나 데이터 소스가 supabase/molit)
  const fromAI = !!(edit._aiFilled && !p.blockReason);
  const fromData = !fromAI;

  // 항목별 인식 상태 판별 (AI 경로에서만 사용)
  const fieldStatus = (val) => val ? "auto" : "missing"; // auto=자동인식, missing=확인필요

  // 수정된 값으로 jeonseCalc·saleCalc 재계산
  const hasDeals = (edit.deals || []).some((d) => d.price && d.ym);
  const jeonseCalc = hasDeals
    ? computeTrimmedMean(edit.deals, Number(edit.kbJeonse) || 0, "jeonse")
    : p.jeonseCalc;
  const baseJeonse = jeonseCalc && jeonseCalc.value ? jeonseCalc.value : Number(edit.kbJeonse) || 0;
  const hasSaleDeals = (edit.saleDeals || []).some((d) => d.price && d.ym);
  const saleCalc = hasSaleDeals
    ? computeTrimmedMean(edit.saleDeals, Number(edit.kbSalePrice) || 0, "sale")
    : p.saleCalc;

  // 분석 실행 — 수정된 edit 값 기반으로 ff 재조립
  function handleConfirm() {
    if (!edit.currentPrice) { alert(isSell ? "희망 매도가를 입력하세요." : "현재 매물가를 입력하세요."); return; }
    if (!baseJeonse) { alert("기준 전세가 또는 전세 실거래를 입력하세요."); return; }
    const ff = {
      ...edit,
      currentPrice: Number(edit.currentPrice),
      baseJeonse,
      kbSalePrice: Number(edit.kbSalePrice) || 0,
      saleRef: saleCalc && saleCalc.value ? saleCalc.value : null,
      jeonseUsed: jeonseCalc ? jeonseCalc.used : 0,
      saleUsed: saleCalc ? saleCalc.used : 0,
      jeonseCalc, saleCalc,
      shockLevel: edit.shockLevel || "보통",
      dataSource: edit._aiFilled ? "ai" : "manual",
    };
    onConfirm({ ff, jeonseCalc, saleCalc });
  }

  const inp2 = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600";

  // 항목 상태 뱃지
  const AutoBadge = () => <span className="ml-1.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">✓ 자동 인식됨</span>;
  const MissingBadge = () => <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">확인 필요</span>;
  const OkBadge = () => <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">확인됨</span>;
  const NeedBadge = () => <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">직접 입력 필요</span>;

  const StatusBadge = ({ val }) => {
    if (fromAI) return fieldStatus(val) === "auto" ? <AutoBadge /> : <MissingBadge />;
    return val ? <OkBadge /> : <NeedBadge />;
  };

  return (
    <>
      {/* 헤더 */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← 수정</button>
        <h1 className="text-lg font-bold text-slate-900">
          {fromAI ? "AI 인식 결과 확인" : "최근 실거래 데이터가 부족합니다"}
        </h1>
        {onBackToTop && <button onClick={onBackToTop} className="ml-auto text-xs text-slate-400 hover:text-slate-600">처음으로</button>}
      </div>

      {/* 안내문 — 경로별 분기 */}
      <div className={`mb-4 rounded-2xl px-4 py-3 ring-1 ${fromAI ? "bg-blue-50 ring-blue-100" : "bg-blue-50 ring-blue-100"}`}>
        {fromAI ? (
          <>
            <p className="text-sm font-semibold text-blue-800">사진에서 인식한 정보를 확인해 주세요.</p>
            <p className="mt-0.5 text-xs text-blue-600">틀린 항목만 수정하면 됩니다. 부동산은 고가 의사결정이므로 주요 수치를 꼭 확인하세요.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-blue-800">최근 실거래 데이터가 부족합니다</p>
            <p className="mt-0.5 text-xs text-blue-600">최근 12개월 동안 해당 면적의 실거래가 부족합니다.<br />주상복합 또는 거래량이 적은 단지는 분석에 필요한 표본 수가 확보되지 않을 수 있습니다.<br />KB시세 또는 직접 확인한 시세를 입력하면 더 정확한 분석이 가능합니다.</p>
          </>
        )}
      </div>

      {/* AI 인식 요약 카드 — fromAI 경로에서만 표시 */}
      {fromAI && (
        <div className="mb-4 rounded-2xl bg-slate-50 ring-1 ring-slate-200 overflow-hidden">
          <div className="bg-slate-800 px-4 py-2.5">
            <p className="text-xs font-semibold text-slate-300">AI 인식 항목 요약</p>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { label: "시/도", val: edit.sido || edit.region?.split(" ")[0] },
              { label: "구/군", val: edit.region },
              { label: "동", val: edit.dong },
              { label: "단지명", val: edit.complexName },
              { label: "면적", val: Number(edit.areaExclusive) > 0 ? `${edit.areaExclusive}㎡` : null },
              { label: "현재 매물가", val: edit.currentPrice ? won(Number(edit.currentPrice)) : null },
              { label: "KB시세 (전세)", val: edit.kbJeonse ? won(Number(edit.kbJeonse)) : null },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-slate-500">{label}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${val ? "text-slate-800" : "text-slate-400"}`}>
                    {val || "—"}
                  </span>
                  <StatusBadge val={val} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 경고 메시지 — 데이터 부족 경로 */}
      {p.blockReason && (() => {
        const isDataShort = p.blockReason.includes("실거래 데이터가 부족") || p.blockReason.includes("불러오지 못했습니다");
        return (
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-800">
            {isDataShort ? "최근 실거래 데이터가 부족합니다" : "추가 입력이 필요합니다"}
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            {isDataShort
              ? "최근 12개월 동안 해당 면적의 실거래가 확인되지 않았습니다.\n주상복합 또는 거래량이 적은 단지는 분석에 필요한 표본 수가 확보되지 않을 수 있습니다.\nKB시세 또는 직접 확인한 시세를 입력하면 더 정확한 분석이 가능합니다."
              : p.blockReason}
          </p>
          {Array.isArray(edit._aiAreaOptions) && edit._aiAreaOptions.length > 0 ? (
            <div className="mt-2">
              <p className="mb-1.5 text-xs font-medium text-amber-700">다른 면적으로 분석하려면 선택하세요:</p>
              <div className="flex flex-wrap gap-2">
                {edit._aiAreaOptions.map((o, i) => {
                  const { mainLabel, subLabel } = areaButtonLabel(o.areaSqm, o.supplySqm);
                  return (
                    <button key={i}
                      onClick={() => { onRefetch && onRefetch(o.areaSqm); }}
                      className="rounded-lg bg-white px-3 py-1.5 text-left ring-1 ring-red-300 active:bg-red-100">
                      <p className="text-xs font-bold text-red-700">{mainLabel}</p>
                      {subLabel && <p className="text-[10px] text-red-400 mt-0.5">{subLabel}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs text-red-500">아래에서 값을 직접 수정한 뒤 분석을 실행하세요.</p>
          )}
        </div>
        );
      })()}
      {/* 면적 변경 안내 */}
      {edit._areaChangedMsg && (
        <div className="mb-3 rounded-xl bg-blue-50 px-4 py-3 ring-1 ring-blue-200">
          <p className="text-xs font-semibold text-blue-700">{edit._areaChangedMsg}</p>
        </div>
      )}
      {Array.isArray(edit._aiWarns) && edit._aiWarns.length > 0 && (
        <div className="mb-4 space-y-1">
          {edit._aiWarns.map((w, i) => (
            <div key={i} className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700 ring-1 ring-amber-100">{w}</div>
          ))}
        </div>
      )}

      {/* 단지 정보 (읽기전용 요약) */}
      <div className="mb-4 rounded-2xl bg-slate-800 px-5 py-4 text-white">
        <p className="text-xs text-slate-400">조회 단지</p>
        <p className="mt-1 text-lg font-bold">
          {edit.complexName || "단지명 미확인"}
          {edit.dong ? ` · ${edit.dong}` : ""}
          {Number(edit.areaExclusive) > 0 ? ` ${areaButtonLabel(edit.areaExclusive).mainLabel}` : ""}
        </p>
        {Number(edit.areaExclusive) > 0 && (
          <p className="mt-0.5 text-xs text-slate-400">{areaButtonLabel(edit.areaExclusive).subLabel}</p>
        )}
        {/* 면적 옵션 — AI 인식 여부로 분기 */}
        {Array.isArray(edit._aiAreaOptions) && edit._aiAreaOptions.length > 0 && (() => {
          const hasAiArea = Number(edit.areaExclusive) > 0;
          return hasAiArea ? (
            // AI가 면적 인식 → 접힘 패턴
            <div className="mt-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-700 px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-slate-400">AI 추천 면적</p>
                  <p className="mt-0.5 text-sm font-bold text-white">{areaButtonLabel(edit.areaExclusive).mainLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">자동 인식됨</span>
                  <button
                    onClick={() => setAreaOpen(v => !v)}
                    className="rounded-lg bg-slate-600 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-500">
                    {areaOpen ? "접기 ▲" : "다른 면적 선택 ▼"}
                  </button>
                </div>
              </div>
              {areaOpen && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {edit._aiAreaOptions.map((o, i) => {
                    const { mainLabel, subLabel } = areaButtonLabel(o.areaSqm, o.supplySqm);
                    const selected = Number(edit.areaExclusive) === o.areaSqm;
                    return (
                      <button key={i} onClick={() => { setE("areaExclusive", String(o.areaSqm)); if (onRefetch) onRefetch(o.areaSqm); setAreaOpen(false); }}
                        className={`rounded-lg px-2.5 py-1.5 text-left ${selected ? "bg-white text-slate-900" : "bg-slate-700 text-slate-300"}`}>
                        <p className="text-xs font-semibold">{mainLabel}</p>
                        {subLabel && <p className="text-[10px] mt-0.5 text-slate-500">{subLabel}</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // AI 면적 미인식 → 기존처럼 기본 노출
            <div className="mt-2">
              <p className="text-[11px] text-slate-400">면적을 선택하세요:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {edit._aiAreaOptions.map((o, i) => {
                  const { mainLabel, subLabel } = areaButtonLabel(o.areaSqm, o.supplySqm);
                  const selected = Number(edit.areaExclusive) === o.areaSqm;
                  return (
                    <button key={i} onClick={() => { setE("areaExclusive", String(o.areaSqm)); if (onRefetch) onRefetch(o.areaSqm); }}
                      className={`rounded-lg px-2.5 py-1.5 text-left ${selected ? "bg-white text-slate-900" : "bg-slate-700 text-slate-300"}`}>
                      <p className="text-xs font-semibold">{mainLabel}</p>
                      {subLabel && <p className="text-[10px] mt-0.5 text-slate-500">{subLabel}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── 핵심 수치 수정 카드 ── */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="mb-4 text-sm font-bold text-slate-700">핵심 데이터 확인 및 수정</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* 현재 매물가 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              {isSell ? "희망 매도가 (만원)" : "현재 매물가 (만원)"}
              <span className="ml-1 font-normal text-red-500">*필수</span>
              <StatusBadge val={edit.currentPrice} />
            </span>
            {fromAI && <p className="mb-1 text-[10px] text-slate-400">틀린 경우 직접 수정해 주세요. 예: 370000 = 37억</p>}
            <input type="number" className={inp2} value={edit.currentPrice} placeholder="예: 58000"
              onChange={(e) => setE("currentPrice", e.target.value)} />
          </label>

          {/* 전용면적 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">전용면적 (㎡)</span>
            <div className="flex gap-2">
              <input type="number" className={inp2} value={edit.areaExclusive} placeholder="예: 59.99"
                onChange={(e) => setE("areaExclusive", e.target.value)} />
              {Number(edit.areaExclusive) > 0 && onRefetch && (
                <button type="button" onClick={() => onRefetch(Number(edit.areaExclusive))}
                  className="shrink-0 rounded-xl bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-700">
                  재조회
                </button>
              )}
            </div>
            {Number(edit.areaExclusive) > 0 && (
              <p className="mt-1 text-[11px] text-slate-400">통상 약 {typicalPyeong(edit.areaExclusive)}평형 · 면적 입력 후 재조회 버튼 클릭</p>
            )}
          </label>

          {/* 실거래 상태 안내 — 원인별 구분 */}
          {edit._tradeStatus && edit._tradeStatus.code !== "OK" && (() => {
            const ts = edit._tradeStatus;
            const isApiFail  = ts.code === "API_FAIL";
            const isNoTrade  = ["COMPLEX_NO_TRADE","NAME_NO_MATCH","PERIOD_NO_TRADE"].includes(ts.code);
            const isLowData  = ["LOW_DATA","TOO_FEW"].includes(ts.code);
            const isAreaFail = ts.code === "AREA_NO_MATCH";
            const needKb = isApiFail || isNoTrade || ts.code === "JEONSE_SHORT";
            const label =
              isApiFail ? "API 조회 실패" :
              isNoTrade ? "단지 거래 없음" :
              ts.code === "JEONSE_AREA_SHORT" || ts.code === "AREA_SHORT_JEONSE_ELSEWHERE" ? "선택 면적 전세 실거래 부족" :
              ts.code === "SALE_SHORT" ? "매매 실거래 부족" :
              "선택 면적 실거래 부족";
            return (
              <label className="block col-span-2">
                <div className="mb-2 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
                  <p className="text-xs font-bold text-amber-800">{label}</p>
                  <p className="mt-0.5 text-[10px] text-amber-600">{ts.msg}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button"
                      onClick={() => { const q = ((edit.dong||"")+" "+(edit.complexName||"")).trim(); window.open("https://new.land.naver.com/search?keyword="+encodeURIComponent(q), "_blank", "noopener,noreferrer"); }}
                      className="rounded px-2 py-1 text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200">
                      네이버 KB시세 확인 →
                    </button>
                    {ts.canExpand && onRefetch && Number(edit.areaExclusive) > 0 && (
                      <button type="button"
                        onClick={() => onRefetch(Number(edit.areaExclusive))}
                        className="rounded px-2 py-1 text-[10px] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200">
                        면적 범위 확장 재조회
                      </button>
                    )}
                  </div>
                </div>
                {needKb && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-600">KB 매매시세 (만원)</p>
                      <input type="number" className={inp2} value={edit.kbSalePrice} placeholder="예: 50250"
                        onChange={(e) => setE("kbSalePrice", e.target.value)} />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-600">KB 전세시세 (만원)</p>
                      <input type="number" className={inp2} value={edit.kbJeonse} placeholder="예: 35000"
                        onChange={(e) => setE("kbJeonse", e.target.value)} />
                    </div>
                  </div>
                )}
              </label>
            );
          })()}

          {/* 기준 전세가 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              기준 전세가 (만원)
              <span className="ml-1 font-normal text-red-500">*필수</span>
              <StatusBadge val={jeonseCalc?.value || edit.baseJeonse || edit.kbJeonse} />
            </span>
            {fromAI && <p className="mb-1 text-[10px] text-slate-400">KB시세 캡처 시 자동 입력됩니다. 인식 안 되면 직접 입력해 주세요.</p>}
            <input type="number" className={inp2}
              value={jeonseCalc && jeonseCalc.value ? jeonseCalc.value : (edit.baseJeonse || edit.kbJeonse || "")}
              placeholder="예: 34000"
              onChange={(e) => setE("baseJeonse", e.target.value)} />
            {jeonseCalc && jeonseCalc.used > 0 && (
              <div className="mt-1">
                <p className="text-[11px] text-emerald-600">실거래 {jeonseCalc.used}건 정제평균 자동 반영</p>
                {jeonseCalc.excluded > 0 && jeonseCalc.reasonText && (
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">↳ {jeonseCalc.reasonText}</p>
                )}
              </div>
            )}
          </label>

          {/* 준공연도 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">준공연도</span>
            <input type="number" className={inp2} value={edit.buildYear} placeholder="예: 1999"
              onChange={(e) => setE("buildYear", e.target.value)} />
            {edit.buildYearWarning && (
              <p className="mt-1 text-[11px] text-amber-600 font-semibold">{edit.buildYearWarning} — 직접 입력하세요</p>
            )}
            {age !== null && (
              <p className="mt-1 text-[11px] text-slate-400">{age}년차{age >= 28 ? " · 재건축권" : ""}</p>
            )}
          </label>

          {/* 시장충격 위험도 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">시장충격 위험도</span>
            <select className={inp2} value={edit.shockLevel} onChange={(e) => setE("shockLevel", e.target.value)}>
              {["낮음", "보통", "높음", "매우높음"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>

          {/* 지역 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">지역 (시/구)</span>
            <input type="text" className={inp2} value={edit.region} placeholder="예: 노원구"
              onChange={(e) => setE("region", e.target.value)} />
          </label>

        </div>

        {/* 정제평균 요약 */}
        {(p.jeonseCalc || p.saleCalc) && (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-600 mb-1.5">AI 조회 정제평균 (참고)</p>
            {[["전세", p.jeonseCalc], ["매매", p.saleCalc]].map(([label, calc]) => calc ? (
              <div key={label} className="mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-slate-600">
                    {label} 정제평균 <span className="font-semibold text-slate-800">{won(calc.value)}</span>
                    {" "}({calc.total}건 → <span className="text-emerald-700 font-medium">{calc.used}건 사용</span>
                    {calc.excluded > 0 && <span className="text-amber-600"> · {calc.excluded}건 제외</span>})
                  </p>
                  {calc.isFallback && <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700">참고값</span>}
                  {calc.floor1Included && !calc.isFallback && <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700">1층포함</span>}
                  {calc.usedPeriod > 6 && <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-slate-200 text-slate-600">{calc.usedPeriod}개월</span>}
                </div>
                {calc.reasonText && (
                  <p className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">↳ {calc.reasonText}</p>
                )}
              </div>
            ) : null)}
          </div>
        )}
      </div>

      {/* ── 실거래 직접입력 (접기) ── 고급설정 흡수 */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button onClick={() => setDealsOpen(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left">
          <div>
            <span className="text-sm font-bold text-slate-700">실거래 직접 입력</span>
            <span className="ml-2 text-xs text-slate-400">(선택 · 입력 시 정제평균 자동 재계산)</span>
          </div>
          <span className="text-xs text-slate-400">{dealsOpen ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>

        {/* 파이프라인 진단 요약 — 항상 표시 */}
        {(() => {
          const pipe = edit._tradeStatus?.pipeline;
          if (!pipe) return null;
          const mkRow = (p, label) => {
            if (!p) return null;
            const tol = p.usedTolerance >= 0 ? `±${p.usedTolerance}㎡` : "전체";
            const conf = getDataConfidence(p.step6_final);
            const steps = `원본 ${p.step1_raw}건 → 단지명 ${p.step2_aptNm}건 → 면적(${tol}) ${p.step3_area}건 → 최종 ${p.step6_final}건 [신뢰도: ${conf.label}]`;
            const ok = p.step6_final > 0;
            return (
              <div key={label} className={`flex items-start gap-2 ${ok ? "" : "text-amber-700"}`}>
                <span className={`mt-0.5 shrink-0 text-[10px] font-bold ${ok ? "text-emerald-600" : "text-amber-500"}`}>{ok ? "✓" : "!"}</span>
                <div>
                  <span className="font-semibold">{label}</span>
                  <span className="ml-1">{steps}</span>
                  {!ok && p.failReason && <p className="mt-0.5 text-[10px] text-amber-600">↳ {p.failReason}</p>}
                </div>
              </div>
            );
          };
          return (
            <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 mb-1">조회 파이프라인</p>
              {mkRow(pipe.sale, "매매")}
              {mkRow(pipe.jeonse, "전세")}
              {/* 다른 평형 거래 참고 표시 */}
              {(() => {
                const otherJ = edit._otherAreaJeonse || [];
                const otherS = edit._otherAreaSale   || [];
                const allOther = [...new Set([...otherJ, ...otherS].map(d => d.areaSqm))].sort((a,b)=>a-b).slice(0,5);
                if (!allOther.length) return null;
                return <p className="text-[10px] text-slate-400 mt-1">다른 평형 거래 있음 (전용 {allOther.join(", ")}㎡) — 선택 평형과 달라 분석 제외</p>;
              })()}
            </div>
          );
        })()}

        {dealsOpen && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            <DealsEditor title="전세 실거래" deals={edit.deals} setDeals={(d) => setE("deals", d)} kind="jeonse" />
            <DealsEditor title="매매 실거래" deals={edit.saleDeals} setDeals={(d) => setE("saleDeals", d)} kind="sale" />
            <p className="mt-3 text-[11px] text-slate-400">실거래를 입력하면 기준 전세가·매매시세가 자동으로 재계산됩니다.</p>
          </div>
        )}
      </div>

      {/* 안내 */}
      <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        표본이 적거나(각 5건 미만) 매물가가 시세에서 크게 벗어나면 판단이 <b>보류</b>될 수 있습니다. · 출처: {edit._aiSource || "AI 웹검색"}
      </div>

      {/* 버튼 */}
      <div className="mt-5 space-y-3">
        <button
          onClick={handleConfirm}
          className="w-full rounded-2xl py-4 text-lg font-extrabold text-white"
          style={{ backgroundColor: NAVY }}
        >
          {fromAI
            ? (isSell ? "확인 완료 · AI 매도 분석 시작" : mode === "fair" ? "확인 완료 · AI 적정가 분석 시작" : "확인 완료 · AI 매수판단 시작")
            : (isSell ? "추가 정보 입력 완료 · 분석 시작" : mode === "fair" ? "추가 정보 입력 완료 · 분석 시작" : "추가 정보 입력 완료 · 분석 시작")}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack} className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600">← 수정</button>
          {onBackToTop && (
            <button onClick={onBackToTop} className="rounded-2xl bg-slate-700 py-3 text-sm font-bold text-white">처음으로</button>
          )}
        </div>
      </div>
    </>
  );
}

// 적정가 화면 — 집 자체의 가치평가 전용 (매수판단·자금·대출·월상환 표시 안 함)
function FairValueResult({ r, f, onBack, onNewSearch, onHome, areaOptions = [], currentUserId }) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [fairDetailOpen, setFairDetailOpen] = React.useState(false);
  const mc = classifyApartmentMarket(f, r);
  const hold = r.engineMode === "hold";
  const isLowData = mc.specialMarketType === "lowData";
  const isAbnormal = mc.specialMarketType === "abnormalInput";
  const isSpecial = ["redevelopment", "primePremium", "investmentPremium", "policyDriven"].includes(mc.specialMarketType);
  const provisional = hold || isLowData || isAbnormal; // 적정가 확정 금지 → 참고가/판단보류
  const jb = (r.basis && r.basis.jeonse) || {}, sb = (r.basis && r.basis.sale) || {};
  const jkb = r.jeonseCalc ? r.jeonseCalc.kbWeight : null, skb = r.saleCalc ? r.saleCalc.kbWeight : null;
  const kbHeavy = (jkb != null && jkb >= 0.6) || (skb != null && skb >= 0.6);
  const Row = ({ l, v }) => <div className="flex justify-between border-t border-slate-100 px-4 py-2.5 text-sm"><span className="text-slate-500">{l}</span><span className="font-semibold text-slate-800">{v}</span></div>;
  const Big = ({ l, v, tone }) => <div className="bg-orange-50 px-4 py-4 text-center"><p className="text-xs text-orange-500">{l}</p><p className={`mt-1 text-xl font-extrabold ${tone || "text-slate-800"}`}>{v}</p></div>;
  const trust = computeDataTrust(r, f.deals, f.saleDeals);
  React.useEffect(() => {
    writeSearchLog({
      region: f.region, dong: f.dong, complex_name: f.complexName,
      area_excl: f.areaExclusive || null,
      success: r.engineMode !== 'hold',
      fail_reason: r.engineMode === 'hold' ? r.holdReason : null,
      data_source: f.dataSource || 'unknown',
      sale_count: r.saleUsed || 0, rent_count: r.jeonseUsed || 0,
      jeonse_ratio: r.actualRatio || null, engine_mode: r.engineMode, buy_grade: r.buyGrade,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── 결론 카드 ── */}
      <div className="mb-4 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
        <div className="px-5 py-4 text-white" style={{ backgroundColor: NAVY }}>
          <p className="text-xs text-slate-300">{f.complexName} · {f.dong}{Number(f.areaExclusive) > 0 ? ` 전용 ${f.areaExclusive}㎡` : ""}</p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">적정가 판단</p>
              <p className="text-xl font-extrabold">{provisional ? "데이터 부족 — 분석 어려움" : r.gradeLabel}</p>
              {provisional && <p className="mt-1 text-xs text-slate-300">{r.holdReason}</p>}
              {!provisional && <p className="text-[11px] text-slate-400">ValueLens {r.buyGrade}등급 · {{ A:"적정가 대비 크게 낮음", B:"적정가 대비 낮음", C:"적정가 수준", D:"적정가 대비 높은 편", E:"적정가 대비 크게 높음" }[r.buyGrade] || ""}</p>}
            </div>
            {!provisional && (
              <div className="flex flex-col items-end gap-1">
                <GradeInfoPopup />
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">AI 적정가</p>
                  <p className="text-xl font-extrabold text-emerald-400">{won(r.fairPrice)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">현재가</p>
            <p className="mt-0.5 text-sm font-extrabold text-slate-900">{won(Number(f.currentPrice))}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">AI 적정가</p>
            <p className="mt-0.5 text-sm font-extrabold" style={{ color: NAVY }}>{provisional ? "—" : won(r.fairPrice)}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">{r.gapRatio < 0 ? "저평가" : "고평가"}</p>
            <p className={`mt-0.5 text-sm font-extrabold ${r.gapRatio < -0.03 ? "text-emerald-600" : r.gapRatio > 0.03 ? "text-red-500" : "text-slate-700"}`}>
              {provisional ? "—" : pct(r.gapRatio)}
            </p>
          </div>
        </div>
        {/* 한줄 결론 배너 */}
        {!provisional && (
          <div className={`border-t border-slate-100 px-5 py-2.5 text-sm font-semibold ${r.gapRatio < -0.05 ? "bg-emerald-50 text-emerald-800" : r.gapRatio > 0.05 ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-700"}`}>
            {r.headline}
          </div>
        )}
        {provisional && (
          <div className="border-t border-amber-100 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800">
            데이터 부족으로 신뢰도 있는 분석이 어렵습니다
          </div>
        )}
      </div>

      {/* ── AI 참고 안내 ── */}
      <AiNotice />

      {/* ── 데이터 신뢰도 ── */}
      <div className="mb-4"><DataTrustBadge trust={trust} /></div>

      <FairSaveBtn r={r} f={f} onBack={onBack} uid={currentUserId} />
      <InputWarnings r={r} f={f} />
      <div className="mb-4"><MarketTypeBadge mc={mc} /></div>

      {/* ── 상세 분석 접기/펼치기 ── */}
      <>
            <button onClick={() => setDetailOpen(v => !v)}
              className="mb-3 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
              <span className="text-xs font-semibold text-slate-600">상세 분석 보기 (전세가율 · 산출방식 · 적정가 범위)</span>
              <span className="text-xs text-slate-400">{detailOpen ? "접기 ▲" : "펼치기 ▼"}</span>
            </button>
            {detailOpen && (
              <>
      {/* ── 백테스트 v3: 핵심 지표 4개 카드 ── */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-400">분석 기준 전세 시세</p>
          <p className="mt-1 text-base font-bold text-slate-800">
            {r.jeonseUsed > 0 && r.basis?.jeonse?.value ? won(r.basis.jeonse.value) : "—"}
          </p>
          <p className="text-[10px] text-slate-400">{r.jeonseUsed}건 기준</p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">최근 전세 거래의 평균 시세입니다.</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-400">분석 기준 매매 시세</p>
          <p className="mt-1 text-base font-bold text-slate-800">
            {r.saleFair ? won(r.saleFair) : "—"}
          </p>
          <p className="text-[10px] text-slate-400">{r.saleUsed}건 기준</p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">최근 매매 거래의 평균 시세입니다.</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-400">적용 전세가율</p>
          <p className={`mt-1 text-base font-bold ${
            r.actualRatio == null ? "text-slate-400" :
            r.ratioWarn ? "text-orange-500" :
            r.actualRatio >= 0.55 ? "text-emerald-600" :
            r.actualRatio >= 0.45 ? "text-amber-600" : "text-orange-600"
          }`}>
            {r.actualRatio != null
              ? `${(r.actualRatio*100).toFixed(1)}%${r.ratioWarn ? " ⚠️" : ""}`
              : "계산불가"}
          </p>
          <p className="text-[10px] text-slate-400">
            {r.actualRatio != null
              ? (r.actualRatio >= 0.55 ? "실수요 견고" : r.actualRatio >= 0.45 ? "보통 수준" : "낮음 — 투자수요")
              : "—"}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">매매가 대비 전세가 비율입니다.</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-[11px] text-slate-400">적정가 산출 방식</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {r.isPremium ? "프리미엄 반영" :
             r.engineMode === "jeonse" ? "전세 시세 중심" :
             r.engineMode === "blend"  ? "전세·매매 혼합" :
             r.engineMode === "sale"   ? "매매 시세 중심" : "보류"}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">
            {r.isPremium ? "단지 특성 추가 반영" :
             r.engineMode === "jeonse" ? "전세 거래 중심으로 계산했습니다." :
             r.engineMode === "blend"  ? "전세·매매 혼합으로 계산했습니다." :
             r.engineMode === "sale"   ? "매매 거래 중심으로 계산했습니다." : "—"}
          </p>
        </div>
      </div>
      {r.dataWarnings && r.dataWarnings.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">데이터 부족 — 분석 신뢰 낮음</p>
          {r.dataWarnings.map((w, i) => (
            <p key={i} className="mt-1 text-xs text-amber-700">· {w}</p>
          ))}
          <p className="mt-1.5 text-[11px] text-amber-600">실거래를 보강하거나 KB시세를 입력하면 정확도가 높아집니다.</p>
        </div>
      )}
      {provisional ? (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="px-6 py-6 text-white" style={{ backgroundColor: NAVY }}>
            <p className="text-sm text-slate-300">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? (() => { const opt=(areaOptions||[]).find(o=>String(o.areaSqm)===String(f.areaExclusive)); const {mainLabel}=areaButtonLabel(f.areaExclusive, opt?.supplySqm); return `${mainLabel} (전용 ${f.areaExclusive}㎡)`; })() : (f.pyeong ? `${f.pyeong}평형` : "")}</p>
            <h1 className="mt-2 text-xl font-bold">{isAbnormal ? "입력값 확인 필요" : "데이터 부족으로 신뢰도 있는 분석이 어렵습니다"}</h1>
            <p className="mt-1.5 text-sm text-amber-300">{isAbnormal ? "현재가가 정제 시세와 크게 차이납니다. 값 확인 후 다시 분석하세요." : r.holdReason}</p>
            {!isAbnormal && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white/15 px-2.5 py-1.5 text-xs text-slate-200">다른 면적 선택</span>
                <span className="rounded-lg bg-white/15 px-2.5 py-1.5 text-xs text-slate-200">KB시세 직접 입력</span>
              </div>
            )}
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-xs text-slate-400">참고가 (신뢰도 낮음 · 확정 아님)</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-700">{won(r.fairPrice)}</p>
          </div>
        </section>
      ) : isSpecial ? (
        <>
          <section className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-orange-200">
            <div className="px-6 py-5 text-white" style={{ backgroundColor: NAVY }}>
              <p className="text-sm text-slate-300">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? (() => { const opt=(areaOptions||[]).find(o=>String(o.areaSqm)===String(f.areaExclusive)); const {mainLabel}=areaButtonLabel(f.areaExclusive, opt?.supplySqm); return `${mainLabel} (전용 ${f.areaExclusive}㎡)`; })() : (f.pyeong ? `${f.pyeong}평형` : "")}</p>
              <h1 className="mt-1 text-lg font-bold">특수시장 — 가격 4분리 표시</h1>
            </div>
            <div className="grid grid-cols-2 gap-px bg-orange-100">
              <Big l="실사용 적정가" v={won(mc.intrinsicFairPrice)} />
              <Big l="시장 기준가" v={won(mc.marketReferencePrice)} />
              <Big l="프리미엄 금액" v={won(mc.premiumAmount)} tone="text-amber-600" />
              <Big l="프리미엄 비율" v={`${(mc.premiumRatio * 100).toFixed(0)}%`} tone="text-amber-600" />
            </div>
            <div className="bg-white px-5 py-3 text-center"><p className="text-xs text-slate-400">프리미엄 반영가 (엔진 산출)</p><p className="mt-0.5 text-lg font-bold" style={{ color: NAVY }}>{won(r.fairPrice)}</p></div>
          </section>
          <p className="mt-3 rounded-2xl bg-orange-50 p-4 text-xs leading-relaxed text-orange-800 ring-1 ring-orange-100">이 단지는 실사용 가치보다 재건축·학군·희소성·투자수요 프리미엄이 반영된 단지입니다. 일반 전세 기반 적정가만으로 저평가/고평가를 단정하기 어렵습니다.</p>
        </>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
          <div className="px-6 py-6 text-white" style={{ backgroundColor: NAVY }}>
            <p className="text-sm text-slate-300">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? (() => { const opt=(areaOptions||[]).find(o=>String(o.areaSqm)===String(f.areaExclusive)); const {mainLabel}=areaButtonLabel(f.areaExclusive, opt?.supplySqm); return `${mainLabel} (전용 ${f.areaExclusive}㎡)`; })() : (f.pyeong ? `${f.pyeong}평형` : "")}</p>
            <p className="mt-2 text-xs text-slate-300">엔진 산출 적정가</p>
            <p className="text-3xl font-extrabold">{won(r.fairPrice)}</p>
            <span className="mt-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-200">{r.modeName}</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="px-4 py-4 text-center"><p className="text-xs text-slate-400">현재 매물가</p><p className="mt-1 text-base font-bold text-slate-800">{won(Number(f.currentPrice))}</p></div>
            <div className="px-4 py-4 text-center"><p className="text-xs text-slate-400">안전마진가</p><p className="mt-1 text-base font-bold text-slate-800">{won(r.safetyPrice)}</p></div>
            <div className="px-4 py-4 text-center"><p className="text-xs text-slate-400">적정가 대비</p><p className={`mt-1 text-base font-bold ${r.gapRatio > 0 ? "text-red-600" : "text-emerald-600"}`}>{pct(r.gapRatio)}</p></div>
          </div>
        </section>
      )}

      {!provisional && (() => { const fb = computeFairBands(r, mc); return (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="px-4 py-2.5" style={{ backgroundColor: "#f1f5f9" }}><p className="text-sm font-bold text-slate-700">적정가 범위 <span className="font-normal text-slate-400">(보수 / 기준 / 공격)</span></p></div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">보수 적정가</p><p className="mt-0.5 text-base font-bold text-emerald-600">{won(fb.conservative)}</p></div>
            <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">기준 적정가</p><p className="mt-0.5 text-base font-bold" style={{ color: NAVY }}>{won(fb.base)}</p></div>
            <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">상단 참고가</p><p className="mt-0.5 text-base font-bold text-amber-600">{won(fb.aggressive)}</p></div>
          </div>
          <p className="px-4 pb-3 text-[11px] text-slate-400">상단 참고가는 매수 권장가가 아니라 {fb.special ? "시장 프리미엄이 유지될 때의 상단" : "단기 상단"} 참고값입니다.</p>
        </div>
      ); })()}

      {isSpecial && (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="px-4 py-2.5" style={{ backgroundColor: "#fff7ed" }}><p className="text-sm font-bold text-orange-700">프리미엄 구성 <span className="font-normal text-orange-400">(추정)</span></p></div>
          <div className="grid grid-cols-2 gap-px bg-slate-100">
            {[["학군", mc.premiumBreakdown.schoolPremium], ["재건축", mc.premiumBreakdown.redevelopmentPremium], ["희소성", mc.premiumBreakdown.scarcityPremium], ["입지", mc.premiumBreakdown.locationPremium], ["투자수요", mc.premiumBreakdown.investorDemandPremium], ["정책", mc.premiumBreakdown.policyPremium]].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between bg-white px-4 py-2.5 text-sm"><span className="text-slate-500">{l}</span><span className="font-semibold text-amber-600">{won(v)}</span></div>
            ))}
          </div>
          <p className="px-4 py-2 text-[11px] text-slate-400">프리미엄 총액 {won(mc.premiumAmount)}의 추정 구성입니다. TODO(API): 학군·정비사업·희소성 실데이터 연동 시 정밀화.</p>
        </div>
      )}

      {isSpecial && (
        <div className="mt-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-700">재건축 단계</p><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{RECON[mc.reconstructionStage].label} · {mc.stageScore}점</span></div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${mc.stageScore}%`, backgroundColor: NAVY }} /></div>
          <p className="mt-2 text-[11px] text-slate-400">재건축 단계는 적정가를 직접 바꾸지 않고 프리미엄·시장 위험도·매수 판단에만 반영됩니다. 현재 연식 기반 추정값 · TODO(API): 정비사업 고시·조합 정보 연동 예정.</p>
        </div>
      )}

      {/* 적정가 산출 근거 */}
      <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="px-4 py-3" style={{ backgroundColor: "#f1f5f9" }}>
          <p className="text-sm font-bold text-slate-700">적정가 산출 근거</p>
          <p className="text-[11px] text-slate-400 mt-0.5">AI가 실거래 데이터를 분석해 산출한 기준값입니다.</p>
        </div>

        {/* ── 핵심 4개 기본 노출 ── */}
        <Row l="분석 기준 전세 시세" v={r.jeonseFair ? `${won(r.jeonseFair)} (${r.jeonseUsed}건)` : "—"} />
        <Row l="분석 기준 매매 시세" v={r.saleFair ? `${won(r.saleFair)} (${r.saleUsed}건)` : "—"} />
        <Row l="적용 전세가율" v={r.usedRatio ? `${(r.usedRatio*100).toFixed(1)}% (${r.dynamicRatio ? "실측값" : "기준값"})` : "—"} />
        <Row l="데이터 신뢰도" v={r.dataConfLabel} />

        {/* ── 상세 분석 접힘 ── */}
        {(() => {
          const fs = (() => { const fl = { redevelopment: 65, primePremium: 70, investmentPremium: 65, policyDriven: 65, semiPremium: 70 }[mc.specialMarketType]; return fl != null ? Math.max(r.modelConf, fl) : r.modelConf; })();
          const mrLevel = (isLowData || isAbnormal) ? "평가 불가" : mc.specialMarketType === "investmentPremium" ? "매우높음" : isSpecial ? "높음" : mc.specialMarketType === "semiPremium" ? "보통" : "낮음";
          return (
            <>
              <button onClick={() => setFairDetailOpen(v => !v)}
                className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 text-left">
                <span className="text-xs font-semibold text-slate-500">상세 분석 보기</span>
                <span className="text-xs text-slate-400">{fairDetailOpen ? "접기 ▲" : "펼치기 ▼"}</span>
              </button>
              {fairDetailOpen && (
                <div className="border-t border-slate-100">
                  <Row l="적정가 산출 방식" v={r.isPremium ? "프리미엄 반영" : r.engineMode === "jeonse" ? "전세 시세 중심" : r.engineMode === "blend" ? "전세·매매 혼합" : r.engineMode === "sale" ? "매매 시세 중심" : "—"} />
                  <Row l="사용 거래 수 (전세/매매)" v={`${jb.used ?? 0} / ${sb.used ?? 0} 건`} />
                  <Row l="제외 거래 수 (전세/매매)" v={`${jb.excluded ?? 0} / ${sb.excluded ?? 0} 건`} />
                  <Row l="KB시세 가중치 (전세/매매)" v={`${jkb != null ? Math.round(jkb * 100) + "%" : "—"} / ${skb != null ? Math.round(skb * 100) + "%" : "—"}`} />
                  <Row l="거래 데이터 충분도" v={`${fs} · ${fs >= 80 ? "높음" : fs >= 60 ? "보통" : fs >= 40 ? "낮음" : "매우낮음"}`} />
                  <Row l="시장 환경 분석" v={mrLevel} />
                  <Row l="단지 특성" v={r.isPremium ? "재건축·학군·희소성 영향" : "일반"} />
                  {kbHeavy && <div className="bg-amber-50 px-4 py-2 text-xs text-amber-700">⚠ 실거래 표본이 적어 KB시세 의존도가 높습니다 — 신뢰도를 보수적으로 해석하세요.</div>}
                </div>
              )}
            </>
          );
        })()}
      </div>

      <p className="mt-5 px-2 text-[11px] leading-relaxed text-slate-400">시장 위험도는 계산 오류를 의미하지 않습니다. 재건축, 정책, 공급, 프리미엄 등에 따른 가격 변동성 위험을 의미합니다. 본 적정가는 공개 데이터와 입력값 기반 참고용 계산이며, 집 자체의 가치 평가에 한정됩니다. 매수 판단·자금·대출·세금은 매수 탭에서 확인하세요.</p>
              </>
            )}
      </>

      {/* ── PDF 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const gp = r.gapRatio != null ? `${Math.abs(r.gapRatio * 100).toFixed(1)}%` : "—";
            const gradeLabel = { A:"매우 저평가", B:"저평가", C:"적정 가격", D:"고평가 주의", E:"고평가", 보류:"판단 보류" }[r.buyGrade] || r.buyGrade;
            const text = `ValueLens 적정가 평가 리포트
${"=".repeat(40)}
발행일: ${date}
단지: ${f.complexName || "—"} ${f.dong ? `· ${f.dong}` : ""} ${Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}

[적정가 평가 결과]
  가격 평가 등급: ${r.buyGrade}등급 · ${gradeLabel}
  현재 매물가: ${won(Number(f.currentPrice))}
  AI 적정가: ${r.engineMode === "hold" ? "판단 보류" : won(r.fairPrice)}
  ${r.gapRatio < 0 ? "저평가율" : "고평가율"}: ${r.engineMode === "hold" ? "보류" : gp}
  보수적 참고가: ${r.safetyPrice ? won(r.safetyPrice) : "—"}
  분석 엔진: ${r.modeName || "—"}

[적정가 산출 근거]
${r.basis && r.basis.steps && r.basis.steps.length ? r.basis.steps.map(s => `  · ${s}`).join("\n") : "  · 데이터 부족으로 산출 보류"}

[데이터 현황]
  전세 표본: ${r.jeonseUsed || 0}건 · 신뢰도 ${r.dataConfLabel || "—"}
  매매 표본: ${r.saleUsed || 0}건
  시장충격: ${r.shock?.level || "—"}

${"=".repeat(40)}
본 보고서는 가격평가 참고자료이며,
감정평가서 · 투자자문 · 매수·매도 권유가 아닙니다.
공개 데이터와 사용자 입력값 기반의 참고용 분석이며,
실제 가격은 층·향·수리상태·시장상황에 따라 다를 수 있습니다.
최종 의사결정은 현장 확인 후 본인이 내려야 합니다.

이 리포트를 활용하기 전 확인하세요
================================
□ 공인중개사에게 현장 시세를 확인했나요?
□ 동일 단지 실거래가를 국토부 실거래가 공개시스템에서 직접 확인했나요?
□ 층·향·수리상태·동 위치에 따른 가격 차이를 고려했나요?

본 리포트는 AI 가격 적정성 참고자료이며
전문가 상담을 대체하지 않습니다.

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
            a.download = `ValueLens_적정가_${f.complexName || "평가"}_${date.replace(/\./g, "")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">적정가 평가 리포트 저장</p>
            <p className="mt-0.5 text-xs text-slate-400">등급·AI 적정가·산출 근거·데이터 현황 포함 · 계산식 제외</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>

      {/* ── 하단 네비게이션 CTA ── */}
      <div className="mt-6 space-y-3">
        <FairSaveBtn r={r} f={f} onBack={onBack} showFull uid={currentUserId} />
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-600 active:bg-slate-50">
            ← 다시 검색
          </button>
          <button onClick={onNewSearch}
            className="rounded-2xl border border-blue-100 bg-blue-50 py-4 text-sm font-bold text-blue-700 active:bg-blue-100">
            다른 단지 분석
          </button>
        </div>
        <button onClick={onHome}
          className="w-full rounded-2xl bg-slate-800 py-4 text-sm font-bold text-white active:bg-slate-700">
          처음으로
        </button>
      </div>
    </>
  );
}

function BuyResult({ r, f, onBack, onSave, saved, onNewSearch, onChangeArea, onHome, areaOptions, currentArea, onSelectArea, currentUserId }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const s = GS[r.buyGrade], cheap = r.gapRatio < 0;
  const tone = (sc) => (sc >= 80 ? "text-emerald-600" : sc >= 60 ? "text-amber-600" : "text-orange-600");
  const mrTone2 = (lv) => lv === "매우높음" ? "text-red-600" : lv === "높음" ? "text-orange-600" : lv === "보통" ? "text-amber-600" : lv === "평가 불가" ? "text-slate-500" : "text-emerald-600";
  const shockTone = { 낮음: "text-emerald-600", 보통: "text-amber-600", 높음: "text-orange-600", 매우높음: "text-red-600" }[r.shock?.level ?? "보통"];
  const hold0 = r.engineMode === "hold";
  const living = calculateLivingScore(f), supply = calculateSupplyRisk(f), pos = calculatePositiveFactors(f), neg = calculateNegativeFactors(f);
  const sp = scorePool({ fair: r.fairPrice, cur: Number(f.currentPrice) || r.fairPrice, jr: r.actualRatio || 0.5, redev: r.saleType === "redev", conf: r.confLabel });
  const lvTone = (v) => (v >= 80 ? "text-emerald-600" : v >= 65 ? "text-slate-700" : "text-orange-500");
  const riskTone = { 낮음: "text-emerald-600", 보통: "text-amber-600", 높음: "text-red-500" };
  const bd = analyzeBuyerDecision(r, f);
  const isSpec = bd.isSpecial;

  // ── 등급 라벨 — 가격 평가형 (투자 권유 표현 제거) ──
  const gradeHero = {
    A: { label: "A · 매우 저평가", sub: "적정가 대비 크게 낮은 가격", bg: "bg-emerald-600" },
    B: { label: "B · 저평가",     sub: "적정가 대비 낮은 가격",       bg: "bg-emerald-500" },
    C: { label: "C · 적정 가격",  sub: "적정가 수준",                  bg: "bg-amber-400"  },
    D: { label: "D · 고평가 주의",sub: "적정가 대비 높은 편 — 보유 리스크 점검", bg: "bg-orange-500" },
    E: { label: "E · 고평가",     sub: "적정가 대비 크게 높은 가격",   bg: "bg-red-600"    },
    보류: { label: "판단 보류",   sub: "데이터 부족",                  bg: "bg-slate-400"  },
  }[r.buyGrade] || { label: r.buyGrade, sub: "", bg: "bg-slate-400" };

  // ── AI 한줄 의견 ──
  function aiSummary() {
    if (hold0) return ["현재 데이터로는 정확한 판단이 어렵습니다.", "실거래 데이터를 보강 후 다시 분석하세요."];
    const gp = Math.abs(r.gapRatio * 100).toFixed(1);
    const line1 = cheap
      ? `현재 가격은 적정가 대비 ${gp}% 낮은 수준입니다.`
      : `현재 가격은 적정가 대비 ${gp}% 높은 수준입니다.`;
    let line2;
    if (isSpec && r.saleType === "redev") line2 = "재건축 기대가 반영된 단지로, 실사용 가치와의 괴리를 고려하세요.";
    else if (r.buyGrade === "A" || r.buyGrade === "B") line2 = `${won(r.negotiation?.start || 0)} 이하에서 협상 시 가격 메리트가 있습니다.`;
    else if (r.buyGrade === "C") line2 = `협상을 통해 ${won(r.negotiation?.start || 0)} 수준을 검토해볼 수 있습니다.`;
    else if (r.buyGrade === "D") {
      const _ris = isRisingMarket(f.region || "기타");
      const _tr  = getRegionTrend(f.region || "기타");
      line2 = _ris
        ? `지역 시장 상승 중(${_tr > 0 ? "+" : ""}${_tr.toFixed(1)}%)이지만 고평가 수준입니다. 보유 리스크를 점검하세요.`
        : `적정가 대비 다소 높아 보유 리스크가 있습니다. 가격 조정 후 재검토를 고려해볼 수 있습니다.`;
    } else {
      const _ris = isRisingMarket(f.region || "기타");
      const _tr  = getRegionTrend(f.region || "기타");
      line2 = _ris
        ? `상승장(${_tr > 0 ? "+" : ""}${_tr.toFixed(1)}%)이지만 가격 부담이 큽니다. 신중한 접근이 필요합니다.`
        : `적정가 대비 가격 부담이 크며, 시세 조정을 기다리는 것도 방법입니다.`;
    }
    return [line1, line2];
  }
  const [aiLine1, aiLine2] = aiSummary();

  // ── AI 판단 근거 체크리스트 생성 ──
  function buildReasonChecks() {
    const checks = [];
    if (!hold0) {
      const gp = Math.abs(r.gapRatio * 100).toFixed(1);
      if (cheap) checks.push({ ok: true,  text: `적정가 대비 ${gp}% 저평가` });
      else       checks.push({ ok: false, text: `적정가 대비 ${gp}% 고평가` });
    }
    const jr = r.actualRatio;
    if (jr != null) {
      if (jr >= 0.55)      checks.push({ ok: true,  text: `전세가율 양호 (${(jr*100).toFixed(0)}%)` });
      else if (jr >= 0.40) checks.push({ ok: null,  text: `전세가율 보통 (${(jr*100).toFixed(0)}%)` });
      else                 checks.push({ ok: false, text: `전세가율 낮음 (${(jr*100).toFixed(0)}%) — 투자수요 의존` });
    }
    if (r.jeonseUsed >= 5) checks.push({ ok: true,  text: `전세 실거래 ${r.jeonseUsed}건 — 표본 충분` });
    else if (r.jeonseUsed >= 3) checks.push({ ok: null, text: `전세 실거래 ${r.jeonseUsed}건 — 표본 보통` });
    else checks.push({ ok: false, text: `전세 실거래 ${r.jeonseUsed}건 — 표본 부족` });
    const shk = r.shock?.level;
    if (shk === "낮음")    checks.push({ ok: true,  text: "시장충격 위험 낮음" });
    else if (shk === "보통") checks.push({ ok: null, text: "시장충격 보통 수준" });
    else                   checks.push({ ok: false, text: `시장충격 ${shk} — 가격 반영 지연 가능` });
    if (supply.level === "낮음") checks.push({ ok: true,  text: "공급 부담 적음" });
    else if (supply.level === "보통") checks.push({ ok: null, text: "공급 보통 수준" });
    else checks.push({ ok: false, text: "공급 부담 높음 — 입주물량 주의" });
    if (isSpec && r.saleType === "redev") checks.push({ ok: null, text: "재건축 기대가 시세에 반영됨" });
    return checks;
  }
  const reasonChecks = buildReasonChecks();

  // ── 매수 시나리오 ──
  function buildScenarios() {
    if (hold0 || !r.fairPrice) return [];
    const cur = Number(f.currentPrice) || 0;
    const fair = r.fairPrice;
    const gradeOf = (gap) => gap <= -0.15 ? "A" : gap <= -0.05 ? "B" : gap <= 0.05 ? "C" : gap <= 0.15 ? "D" : "E";
    const labelOf = (g) => ({ A:"매우 저평가", B:"저평가", C:"적정 가격", D:"고평가 주의", E:"고평가" }[g] || g);
    const colorOf = (g) => ({ A:"text-emerald-600", B:"text-emerald-500", C:"text-amber-600", D:"text-orange-500", E:"text-red-500" }[g] || "text-slate-600");
    const scenarios = [];
    // 현재가
    const g0 = gradeOf((cur - fair) / fair);
    scenarios.push({ price: cur, label: "현재 매물가", grade: g0, gradeLabel: labelOf(g0), color: colorOf(g0), highlight: false });
    // 협상 -2%
    const p1 = Math.round(cur * 0.98 / 100) * 100;
    const g1 = gradeOf((p1 - fair) / fair);
    scenarios.push({ price: p1, label: "협상 -2%", grade: g1, gradeLabel: labelOf(g1), color: colorOf(g1), highlight: g1 !== g0 });
    // 적정가
    const g2 = gradeOf(0);
    scenarios.push({ price: Math.round(fair), label: "AI 적정가", grade: g2, gradeLabel: labelOf(g2), color: colorOf(g2), highlight: true });
    // 안전매수가
    if (r.safetyPrice && r.safetyPrice !== fair) {
      const g3 = gradeOf((r.safetyPrice - fair) / fair);
      scenarios.push({ price: r.safetyPrice, label: "보수적 참고가", grade: g3, gradeLabel: labelOf(g3), color: "text-emerald-600", highlight: false });
    }
    return scenarios;
  }
  const scenarios = buildScenarios();

  // ── 위험요인 ──
  function buildRiskItems() {
    const risks = [];
    if (r.jeonseUsed < 3) risks.push({ label: "거래 표본 부족", desc: "최근 거래가 적어 분석 오차가 커질 수 있습니다. 참고용으로 활용하세요." });
    if (supply.level === "높음") risks.push({ label: "입주 물량 영향", desc: "향후 입주 예정 물량에 따라 가격 변동 가능성이 있습니다." });
    if (r.saleType === "redev") risks.push({ label: "재건축 단지 특성", desc: "재건축 기대가 반영된 단지입니다. 사업 지연·분담금 리스크를 함께 고려하세요." });
    if (r.actualRatio != null && r.actualRatio < 0.4) risks.push({ label: "전세가율 낮음", desc: "실거주 수요보다 투자 수요 비중이 높은 단지입니다." });
    if (r.shock?.level === "높음" || r.shock?.level === "매우높음") risks.push({ label: "시장 변동성 주의", desc: "현재 시장 상황에 따라 가격 반영이 지연될 수 있습니다." });
    if (bd.marketRisk?.level === "높음" || bd.marketRisk?.level === "매우높음") risks.push({ label: "시장 변동 가능성 높음", desc: "프리미엄·공급·정책 등 복합 요인으로 가격 변동 가능성이 있습니다." });
    if (r.dataConf < 50) risks.push({ label: "거래 표본 부족", desc: "데이터가 적어 분석 신뢰도가 낮습니다. 표본 보강 후 재분석을 권장합니다." });
    if (neg.list?.[0]) risks.push({ label: "지역 특성 참고", desc: neg.list[0] });
    // 중복 label 제거
    const seen = new Set();
    return risks.filter(r => { if (seen.has(r.label)) return false; seen.add(r.label); return true; }).slice(0, 4);
  }
  const riskItems = buildRiskItems();

  // ── 프리미엄형 표현 ──
  function premiumDesc() {
    if (!isSpec) return null;
    const mc = bd.mc;
    const pct_ = Math.round(mc.premiumRatio * 100);
    const types = [];
    if (mc.premiumBreakdown.redevelopmentPremium > 0) types.push("재건축");
    if (mc.premiumBreakdown.schoolPremium > 0) types.push("학군");
    if (mc.premiumBreakdown.scarcityPremium > 0) types.push("희소성");
    if (mc.premiumBreakdown.locationPremium > 0) types.push("입지");
    const typeStr = types.length ? types.join("·") : "시장";
    return `현재 시세에는 ${typeStr} 프리미엄이 크게 반영되어 있습니다. 전세가 기준 적정가보다 ${pct_}% 높은 수준에 거래되고 있습니다.`;
  }

  // ── 데이터 신뢰도 + 로그 write ──
  const trust = computeDataTrust(r, f.deals, f.saleDeals);
  React.useEffect(() => {
    writeSearchLog({
      region:       f.region,
      dong:         f.dong,
      complex_name: f.complexName,
      area_excl:    f.areaExclusive || null,
      success:      r.engineMode !== 'hold',
      fail_reason:  r.engineMode === 'hold' ? r.holdReason : null,
      data_source:  f.dataSource || 'unknown',
      sale_count:   r.saleUsed  || 0,
      rent_count:   r.jeonseUsed || 0,
      jeonse_ratio: r.actualRatio || null,
      engine_mode:  r.engineMode,
      buy_grade:    r.buyGrade,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── 결론 카드 (최상단 고정) ── */}
      <div className="mb-4 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
        <div className="px-5 py-4 text-white" style={{ backgroundColor: NAVY }}>
          <div className="flex items-start justify-between">
            <p className="text-xs text-slate-300">{f.complexName} · {f.dong}{Number(f.areaExclusive) > 0 ? ` 전용 ${f.areaExclusive}㎡` : ""}</p>
            {!hold0 && <GradeInfoPopup />}
          </div>
          {hold0 ? (
            <div className="mt-3">
              <p className="text-lg font-extrabold text-amber-300">데이터 부족 — 분석 어려움</p>
              <p className="mt-1 text-xs text-slate-300">{r.holdReason}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] text-slate-200">다른 면적 선택</span>
                <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] text-slate-200">KB시세 직접 입력</span>
              </div>
            </div>
          ) : (
            <>
              {/* 가격 판단 최우선 표시 */}
              <div className="mt-2">
                <p className="text-[11px] text-slate-400">가격 평가</p>
                <p className={`text-2xl font-extrabold ${r.buyGrade === 'A' || r.buyGrade === 'B' ? 'text-emerald-400' : r.buyGrade === 'D' || r.buyGrade === 'E' ? 'text-red-400' : 'text-amber-300'}`}>
                  {r.gradeLabel}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  ValueLens {r.buyGrade}등급 · {r.buyGrade === 'A' || r.buyGrade === 'B' ? `AI 적정가보다 ${Math.abs(r.gapRatio*100).toFixed(1)}% 낮음` : r.buyGrade === 'D' || r.buyGrade === 'E' ? `AI 적정가보다 ${Math.abs(r.gapRatio*100).toFixed(1)}% 높음` : `AI 적정가 수준`}
                </p>
              </div>
              {/* 자금 판단 — 입력 시에만 표시 */}
              {bd.hasFundInput && (
                <div className="mt-2 rounded-xl bg-white/10 px-3 py-2">
                  <p className="text-[10px] text-slate-300">매수 판단</p>
                  <p className="text-sm font-bold text-white">{bd.finalLabel}</p>
                </div>
              )}
            </>
          )}
        </div>
        {/* 핵심 수치 3개 */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">현재가</p>
            <p className="mt-0.5 text-sm font-extrabold text-slate-900">{won(Number(f.currentPrice))}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">AI 적정가</p>
            <p className="mt-0.5 text-sm font-extrabold" style={{ color: NAVY }}>{hold0 ? "—" : won(r.fairPrice)}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">{r.gapRatio < 0 ? "저평가" : "고평가"}</p>
            <p className={`mt-0.5 text-sm font-extrabold ${r.gapRatio < -0.03 ? "text-emerald-600" : r.gapRatio > 0.03 ? "text-red-500" : "text-slate-700"}`}>
              {hold0 ? "—" : pct(r.gapRatio)}
            </p>
          </div>
        </div>
        {/* 액션 문구 */}
        {!hold0 && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-600">
            {bd.action}
          </div>
        )}
        {/* 자금 미입력 안내 */}
        {!hold0 && !bd.hasFundInput && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-[11px] text-slate-400">
            자금 정보를 입력하면 구매 가능 여부를 확인할 수 있습니다.
          </div>
        )}
      </div>

      {/* ── 자연어 한줄 결론 ── */}
      {!hold0 && (
        <div className={`mb-4 rounded-2xl px-5 py-4 ring-1 ${cheap ? "bg-emerald-50 ring-emerald-200" : r.buyGrade === "C" ? "bg-slate-50 ring-slate-200" : "bg-red-50 ring-red-200"}`}>
          <p className={`text-sm font-bold ${cheap ? "text-emerald-800" : r.buyGrade === "C" ? "text-slate-700" : "text-red-800"}`}>
            {aiLine1}
          </p>
          <p className={`mt-1 text-xs leading-relaxed ${cheap ? "text-emerald-700" : r.buyGrade === "C" ? "text-slate-500" : "text-red-700"}`}>
            {aiLine2}
          </p>
        </div>
      )}
      {hold0 && (
        <div className="mb-4 rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-200">
          <p className="text-sm font-bold text-slate-700">데이터 부족으로 신뢰도 있는 분석이 어렵습니다</p>
          <p className="mt-1 text-xs text-slate-500">{r.holdReason}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] text-slate-600">다른 면적 선택</span>
            <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] text-slate-600">KB시세 직접 입력</span>
          </div>
        </div>
      )}

      {/* ── 왜 이런 결과가 나왔나요? ── */}
      {!hold0 && (
        <div className="mb-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-bold text-slate-700">왜 이런 결과가 나왔나요?</p>
          <div className="space-y-2">
            {reasonChecks.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className={`mt-0.5 flex-shrink-0 text-base font-bold ${c.ok === true ? "text-emerald-500" : c.ok === false ? "text-red-400" : "text-amber-400"}`}>
                  {c.ok === true ? "✓" : c.ok === false ? "✗" : "△"}
                </span>
                <div>
                  <span className={`text-sm ${c.ok === false ? "text-slate-400" : "text-slate-700"}`}>{c.text}</span>
                  {c.ok === true && <span className="ml-1.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">좋음</span>}
                  {c.ok === null && <span className="ml-1.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">보통</span>}
                  {c.ok === false && <span className="ml-1.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">주의</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI 참고 안내 ── */}
      <AiNotice />

      {/* ── 데이터 신뢰도 ── */}
      <div className="mb-4"><DataTrustBadge trust={trust} /></div>

      <BuySaveBtn r={r} f={f} bd={bd} onBack={onBack} onSave={onSave} saved={saved} uid={currentUserId} />

      <InputWarnings r={r} f={f} />

      {r.dataWarnings && r.dataWarnings.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">데이터 부족 — 분석 신뢰 낮음</p>
          {r.dataWarnings.map((w, i) => (
            <p key={i} className="mt-1 text-xs text-amber-700">· {w}</p>
          ))}
          <p className="mt-1.5 text-[11px] text-amber-600">실거래를 보강하거나 KB시세를 입력하면 정확도가 높아집니다.</p>
        </div>
      )}

      {/* ── Hero: 가격 평가 등급 + 핵심 4개 ── */}
      <div className="mb-4 overflow-hidden rounded-3xl shadow-lg">
        <div className={`px-6 py-6 text-white ${gradeHero.bg}`}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-white/70">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}</p>
            <GradeInfoPopup />
          </div>
          <p className="mt-2 text-4xl font-extrabold">{r.gradeLabel}</p>
          <p className="mt-0.5 text-sm text-white/60">ValueLens {r.buyGrade}등급 · {gradeHero.sub}</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 bg-white">
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">AI 적정가</p>
            <p className="mt-1 text-xl font-extrabold" style={{ color: NAVY }}>{hold0 ? "—" : won(r.fairPrice)}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">현재 매물가</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{won(Number(f.currentPrice))}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">{cheap ? "저평가율" : "고평가율"}</p>
            <p className={`mt-1 text-xl font-extrabold ${cheap ? "text-emerald-600" : "text-red-500"}`}>{hold0 ? "보류" : pct(r.gapRatio)}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">추천 협상가</p>
            <p className="mt-1 text-base font-extrabold text-slate-900">{hold0 ? "—" : won(r.negotiation?.start || 0)}</p>
          </div>
        </div>
      </div>

      {/* ── [1] 프리미엄 설명 (특수시장만) ── */}
      {isSpec && premiumDesc() && (
        <div className="mb-4 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
          <p className="text-xs font-bold text-amber-800 mb-1">재건축·학군·희소성 영향 단지 안내</p>
          <p className="text-xs leading-relaxed text-amber-700">
            재건축 기대감 또는 희소성으로 인해 매매가가 전세가보다 높게 형성된 단지입니다.<br />
            현재 분석은 프리미엄 요인을 반영하여 계산되었습니다.
          </p>
          <p className="mt-2 text-xs text-amber-600">{premiumDesc()}</p>
        </div>
      )}

      {/* ── [3] 가격 시나리오 ── */}
      {scenarios.length > 0 && (
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-bold text-slate-700">가격별 평가</p>
          <p className="mb-3 text-xs text-slate-400">같은 단지를 얼마에 사느냐에 따라 가격 평가가 달라집니다.</p>
          <div className="space-y-2">
            {scenarios.map((s, i) => (
              <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 ${s.highlight ? "bg-slate-50 ring-1 ring-slate-200" : "bg-white"}`}>
                <div>
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">{won(s.price)}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${s.color}`}>{s.grade}등급</span>
                  <p className={`text-xs ${s.color}`}>{s.gradeLabel}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">※ 가격 평가는 AI 적정가 기준이며, 실제 매수 결정은 자금·시장 상황 등을 종합적으로 고려하세요.</p>
        </div>
      )}

      {/* ── [4] 최근 실거래 ── */}
      {(r.jeonseCalc || r.saleCalc) && (() => {
        const jDeals = (f.deals || []).filter(d => d.price && d.ym).slice(0, 4);
        const sDeals = (f.saleDeals || []).filter(d => d.price && d.ym).slice(0, 4);
        if (!jDeals.length && !sDeals.length) return null;
        return (
          <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <p className="mb-3 text-sm font-bold text-slate-700">최근 실거래</p>
            {sDeals.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">매매 실거래</p>
                <div className="space-y-1.5">
                  {sDeals.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-400">{d.ym}</span>
                      <span className="font-bold text-slate-800">{won(d.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {jDeals.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">전세 실거래</p>
                <div className="space-y-1.5">
                  {jDeals.map((d, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-400">{d.ym}</span>
                      <span className="font-bold text-slate-800">{won(d.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-2 text-[11px] text-slate-400">AI 조회 기준 · 동일 단지 실거래가 (정제 전 원본)</p>
          </div>
        );
      })()}

      {/* ── [5] 위험요인 ── */}
      {riskItems.length > 0 && (
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-bold text-slate-700">확인이 필요한 사항</p>
          <div className="space-y-3">
            {riskItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 text-amber-400">⚠</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── [6] 실거주 · 투자 점수 ── */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 실거주 적합도 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-400">실거주 적합도</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={`text-lg font-extrabold ${living.total >= 75 ? "text-emerald-600" : living.total >= 60 ? "text-amber-600" : "text-red-500"}`}>
              {living.total >= 75 ? "좋음" : living.total >= 60 ? "보통" : "주의"}
            </p>
            <p className="text-xs text-slate-400">{living.total} / 100</p>
          </div>
          {/* 항목별 설명형 */}
          <div className="mt-2 space-y-1">
            {[
              { label: "교통 접근성", score: living.items.교통,
                good: "교통 접근성 양호", mid: "교통 접근성 보통", bad: "교통 접근성 다소 불편" },
              { label: "학군",       score: living.items.학군,
                good: "학군 경쟁력 양호", mid: "학군 경쟁력 보통", bad: "학군 경쟁력 낮음" },
              { label: "생활 편의",  score: living.items.상권,
                good: "생활 편의시설 풍부", mid: "생활 편의시설 보통", bad: "생활 편의시설 다소 부족" },
              { label: "건물 연식",  score: living.items.연식,
                good: "건물 연식 양호", mid: "건물 연식 보통", bad: "건물 연식 다소 오래됨" },
            ].map(({ label, score, good, mid, bad }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className={score >= 80 ? "text-emerald-600" : score >= 65 ? "text-amber-600" : "text-red-400"}>
                  {score >= 80 ? good : score >= 65 ? mid : bad}
                </span>
                <span className={`ml-2 flex-shrink-0 font-semibold ${score >= 80 ? "text-emerald-600" : score >= 65 ? "text-amber-600" : "text-red-400"}`}>
                  {score >= 80 ? "양호" : score >= 65 ? "보통" : "낮음"}
                </span>
              </div>
            ))}
          </div>
          <p className={`mt-2 text-[11px] leading-relaxed border-t border-slate-100 pt-2 ${living.total >= 75 ? "text-emerald-600" : living.total >= 60 ? "text-amber-600" : "text-slate-400"}`}>
            → {living.total >= 75 ? "실거주 환경이 전반적으로 양호합니다." : living.total >= 60 ? "실거주에는 무난한 수준입니다." : "실거주 환경이 다소 아쉬운 편입니다."}
          </p>
        </div>

        {/* 가격 매력도 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-xs text-slate-400">가격 매력도</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={`text-lg font-extrabold ${sp.up >= 65 ? "text-emerald-600" : sp.up >= 40 ? "text-amber-600" : "text-red-500"}`}>
              {sp.up >= 65 ? "좋음" : sp.up >= 40 ? "보통" : "주의"}
            </p>
            <p className="text-xs text-slate-400">{sp.up} / 100</p>
          </div>
          {/* 항목별 설명형 */}
          <div className="mt-2 space-y-1 text-xs">
            {/* 가격 위치 */}
            <div className="flex items-center justify-between">
              <span className={sp.undervalue > 0.03 ? "text-emerald-600" : sp.undervalue < -0.03 ? "text-red-400" : "text-amber-600"}>
                {sp.undervalue > 0.03
                  ? `AI 적정가보다 ${(sp.undervalue * 100).toFixed(1)}% 저렴`
                  : sp.undervalue < -0.03
                    ? `AI 적정가보다 ${(Math.abs(sp.undervalue) * 100).toFixed(1)}% 높음`
                    : "AI 적정가 수준"}
              </span>
              <span className={`ml-2 flex-shrink-0 font-semibold ${sp.undervalue > 0.03 ? "text-emerald-600" : sp.undervalue < -0.03 ? "text-red-400" : "text-amber-600"}`}>
                {sp.undervalue > 0.03 ? "저평가" : sp.undervalue < -0.03 ? "고평가" : "적정"}
              </span>
            </div>
            {/* 협상 여지 */}
            <div className="flex items-center justify-between">
              <span className={sp.undervalue < -0.03 ? "text-red-400" : "text-amber-600"}>
                {sp.undervalue > 0.05 ? "가격 협상 여지 있음" : sp.undervalue < -0.03 ? "협상 여지는 제한적일 수 있습니다" : "협상 시 가격 조정 가능"}
              </span>
              <span className={`ml-2 flex-shrink-0 font-semibold ${sp.undervalue > 0.05 ? "text-emerald-600" : sp.undervalue < -0.03 ? "text-red-400" : "text-amber-600"}`}>
                {sp.undervalue > 0.05 ? "유리" : sp.undervalue < -0.03 ? "제한" : "보통"}
              </span>
            </div>
            {/* 안전 매수가 대비 */}
            {r.safetyPrice > 0 && Number(r.fairPrice) > 0 && (() => {
              const cur = Number(r.fairPrice || 0);
              const safe = Number(r.safetyPrice || 0);
              const aboveSafe = cur > safe;
              return (
                <div className="flex items-center justify-between">
                  <span className={aboveSafe ? "text-red-400" : "text-emerald-600"}>
                    {aboveSafe ? "보수적 참고가 대비 부담 있음" : "보수적 참고가 이하 — 여유 있음"}
                  </span>
                  <span className={`ml-2 flex-shrink-0 font-semibold ${aboveSafe ? "text-red-400" : "text-emerald-600"}`}>
                    {aboveSafe ? "주의" : "양호"}
                  </span>
                </div>
              );
            })()}
            {/* 가격 변동 가능성 */}
            <div className="flex items-center justify-between">
              <span className={sp.down < 40 ? "text-emerald-600" : sp.down < 65 ? "text-amber-600" : "text-red-400"}>
                {sp.down < 40 ? "가격 변동 가능성 낮음" : sp.down < 65 ? "가격 변동 가능성 보통" : "가격 변동 가능성 있음"}
              </span>
              <span className={`ml-2 flex-shrink-0 font-semibold ${sp.down < 40 ? "text-emerald-600" : sp.down < 65 ? "text-amber-600" : "text-red-400"}`}>
                {sp.down < 40 ? "낮음" : sp.down < 65 ? "보통" : "높음"}
              </span>
            </div>
          </div>
          <p className={`mt-2 text-[11px] leading-relaxed border-t border-slate-100 pt-2 ${sp.up >= 65 ? "text-emerald-600" : sp.up >= 40 ? "text-amber-600" : "text-red-400"}`}>
            → {sp.up >= 65 ? "가격 경쟁력이 높은 편입니다." : sp.up >= 40 ? "가격 메리트는 보통 수준입니다." : "가격 부담이 있어 신중한 접근이 필요합니다."}
          </p>
        </div>
      </div>

      {/* ── 매수 판단 카드 (상세) ── */}
      <div className="mb-4"><BuyerDecisionCard bd={bd} r={r} f={f} /></div>

      {/* ── 호재·악재 ── */}
      <div className="mb-4"><OpportunityCard opp={bd.opportunity} /></div>

      {/* ── 상세분석 접기/펼치기 ── */}
      <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => setDetailOpen(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-sm font-bold text-slate-700">상세 분석 보기</span>
          <span className="text-xs text-slate-400">{detailOpen ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
        {detailOpen && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-5">

            {/* 프리미엄 구성 */}
            {isSpec && (
              <div>
                <p className="mb-2 text-xs font-bold text-orange-700">프리미엄 구성 (추정)</p>
                <div className="grid grid-cols-2 gap-px bg-orange-100 overflow-hidden rounded-xl">
                  {[["학군", bd.mc.premiumBreakdown.schoolPremium], ["재건축", bd.mc.premiumBreakdown.redevelopmentPremium], ["희소성", bd.mc.premiumBreakdown.scarcityPremium], ["입지", bd.mc.premiumBreakdown.locationPremium]].map(([l, v]) => (
                    <div key={l} className="bg-orange-50 px-4 py-3 flex justify-between text-sm"><span className="text-slate-500">{l}</span><span className="font-bold text-amber-700">{won(v)}</span></div>
                  ))}
                </div>
              </div>
            )}

            {/* 재건축 단계 */}
            {isSpec && bd.reconstructionStage && bd.reconstructionStage !== "none" && (
              <div>
                <p className="mb-1 text-xs font-bold text-slate-600">재건축 단계</p>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-700">{RECON[bd.reconstructionStage].label}</span>
                  <span className="text-sm font-bold" style={{ color: NAVY }}>{bd.stageScore}점</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${bd.stageScore}%`, backgroundColor: NAVY }} /></div>
              </div>
            )}

            {/* 적정가 산출 근거 */}
            {!hold0 && r.basis && r.basis.steps.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">적정가 산출 근거</p>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <ol className="space-y-1 text-xs text-slate-600">{r.basis.steps.map((t, i) => <li key={i} className="flex gap-1.5"><span className="text-slate-400">{i < r.basis.steps.length - 1 ? "↓" : "="}</span><span>{t}</span></li>)}</ol>
                </div>
              </div>
            )}

            {/* 사용 거래 수 / 제외 거래 수 */}
            {(r.jeonseCalc || r.saleCalc) && (
              <div>
                <p className="mb-2 text-xs font-bold text-slate-600">데이터 표본</p>
                <div className="grid grid-cols-2 gap-2">
                  {r.jeonseCalc && <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs"><p className="text-slate-500">전세 표본</p><p className="mt-1 font-bold text-slate-800">사용 {r.jeonseCalc.used}건 · 제외 {r.jeonseCalc.excluded}건</p></div>}
                  {r.saleCalc && <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs"><p className="text-slate-500">매매 표본</p><p className="mt-1 font-bold text-slate-800">사용 {r.saleCalc.used}건 · 제외 {r.saleCalc.excluded}건</p></div>}
                </div>
              </div>
            )}

            {/* KB 가중치 */}
            {(r.jeonseCalc || r.saleCalc) && (
              <div className="text-xs text-slate-400">
                KB시세 가중치 · 전세 {r.jeonseCalc ? Math.round((r.jeonseCalc.kbWeight||0)*100)+"%" : "—"} / 매매 {r.saleCalc ? Math.round((r.saleCalc.kbWeight||0)*100)+"%" : "—"}
              </div>
            )}

            {/* 시장 위험도 */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">시장 위험도</span>
              <span className={`font-bold ${mrTone2(bd.marketRisk.level)}`}>{bd.marketRisk.level}</span>
            </div>

            {/* 시장충격 */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">시장충격 위험도</span>
              <span className={`font-bold ${shockTone}`}>{r.shock?.level ?? "보통"} <span className="text-xs font-normal text-slate-400">(지연 약 {r.shock?.lag ?? 3}개월)</span></span>
            </div>

          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>AI</span><h3 className="text-base font-semibold text-slate-800">AI 분석 설명</h3></div>
        <p className="text-base font-medium text-slate-900">{r.engineMode === "hold" ? `${r.headline} (등급 보류)` : isSpec ? `이 단지는 특수시장(${bd.premiumLevel})으로 분류되어 가격 등급(${r.buyGrade})은 참고용이며, 최종 판단은 상단 매수판단 카드를 따릅니다.` : `${r.headline} 매수등급은 ${r.buyGrade}(${r.gradeLabel})입니다.`}</p>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600"><p>{r.explain?.valuation}</p><p>{r.explain?.review}</p></div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="mb-2 text-xs font-semibold text-slate-500">매수 시 주의할 점</p><ul className="space-y-1.5 text-sm text-slate-600"><li>· 입력한 KB시세·전세가의 정확도가 결과에 직접 영향을 줍니다.</li><li>· 동일 단지라도 층·향·동·수리 상태에 따라 실제 가격은 달라질 수 있습니다.</li><li>· 본 결과는 참고용이며 최종 판단은 현장 확인 후 본인이 내려야 합니다.</li></ul></div>
      </div>

      {/* ── PDF 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const gp = Math.abs(r.gapRatio * 100).toFixed(1);
            const gradeLabel = { A:"매우 저평가", B:"저평가", C:"적정 가격", D:"고평가 주의", E:"고평가", 보류:"판단 보류" }[r.buyGrade] || r.buyGrade;
            const riskLines = (() => {
              const risks = [];
              if (r.jeonseUsed < 3) risks.push("거래 표본 부족");
              if (r.saleType === "redev") risks.push("재건축 기대가 반영");
              if (r.actualRatio != null && r.actualRatio < 0.4) risks.push("전세가율 낮음");
              if (r.shock?.level === "높음" || r.shock?.level === "매우높음") risks.push(`시장충격 ${r.shock.level}`);
              return risks.length ? risks.map(t => `    · ${t}`).join("\n") : "    · 특이 위험요인 없음";
            })();
            const scenarioLines = (() => {
              const cur = Number(f.currentPrice) || 0;
              const fair = r.fairPrice;
              if (!fair) return "";
              const gradeOf = (gap) => gap <= -0.15 ? "A(매우 저평가)" : gap <= -0.05 ? "B(저평가)" : gap <= 0.05 ? "C(적정 가격)" : gap <= 0.15 ? "D(고평가 주의)" : "E(고평가)";
              return [
                `    현재가 ${won(cur)} → ${gradeOf((cur-fair)/fair)}`,
                `    협상 -2% ${won(Math.round(cur*0.98/100)*100)} → ${gradeOf((Math.round(cur*0.98/100)*100-fair)/fair)}`,
                `    AI 적정가 ${won(Math.round(fair))} → C(적정 가격)`,
              ].join("\n");
            })();
            const text = `ValueLens 가격평가 리포트
${"=".repeat(40)}
발행일: ${date}
단지: ${f.complexName || "—"} ${f.dong ? `· ${f.dong}` : ""} ${Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}

[가격 평가 결과]
  가격 평가 등급: ${r.buyGrade}등급 · ${gradeLabel}
  현재 매물가: ${won(Number(f.currentPrice))}
  AI 적정가: ${r.engineMode === "hold" ? "판단 보류" : won(r.fairPrice)}
  ${cheap ? "저평가율" : "고평가율"}: ${r.engineMode === "hold" ? "보류" : `${gp}%`}
  추천 협상가: ${r.engineMode === "hold" ? "—" : won(r.negotiation?.start || 0)}

[AI 의견]
  ${cheap ? `현재 가격은 적정가 대비 ${gp}% 낮은 수준입니다.` : `현재 가격은 적정가 대비 ${gp}% 높은 수준입니다.`}
  ${r.buyGrade === "A" || r.buyGrade === "B" ? `${won(r.negotiation?.start || 0)} 이하에서 협상 시 가격 메리트가 있습니다.` : r.buyGrade === "C" ? `협상을 통해 ${won(r.negotiation?.start || 0)} 수준을 검토해볼 수 있습니다.` : `가격 조정 후 재검토를 고려해볼 수 있습니다.`}

[가격별 평가 시나리오]
${scenarioLines}

[확인이 필요한 위험요인]
${riskLines}

${"=".repeat(40)}
이 리포트를 활용하기 전 확인하세요
□ 공인중개사에게 현장 시세·매물 상태를 확인했나요?
□ 세무사에게 취득세·양도세 상담을 받았나요?
□ 은행·금융기관에서 실제 대출 가능액을 확인했나요?
□ 등기부등본·권리관계·압류 여부를 확인했나요?
□ 실제 현장 방문 및 주변 시세를 직접 확인했나요?

위 항목 확인 후 최종 결정하시기 바랍니다.
본 리포트는 AI 가격 적정성 참고자료이며
매수 권유·투자자문·감정평가서가 아닙니다.
전문가 상담을 대체하지 않습니다.

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
            a.download = `ValueLens_${f.complexName || "가격평가"}_${date.replace(/\./g, "")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">가격평가 리포트 저장</p>
            <p className="mt-0.5 text-xs text-slate-400">단지명·등급·AI 적정가·시나리오·위험요인 포함 · 계산식 제외</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>

      {/* ── 하단 네비게이션 CTA ── */}
      <div className="mt-6 space-y-3">
        {/* 같은 단지 다른 면적 */}
        {areaOptions && areaOptions.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-400">같은 단지 다른 면적</p>
            <div className="flex flex-wrap gap-2">
              {(areaOptions || []).filter(o => o && Number(o.areaSqm) > 0 && String(o.areaSqm) !== String(currentArea)).map((o, i) => (
                <button key={i}
                  onClick={() => onSelectArea && onSelectArea(Number(o.areaSqm))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 active:bg-slate-100">
                  전용 {o.areaSqm}㎡ ({Math.round(Number(o.areaSqm) / 3.3058)}평)
                </button>
              ))}
            </div>
          </div>
        )}\n        {/* 저장 버튼 */}
        {/* 2×2 네비 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-600 active:bg-slate-50">
            ← 다시 분석
          </button>
          <button onClick={onNewSearch}
            className="rounded-2xl border border-blue-100 bg-blue-50 py-4 text-sm font-bold text-blue-700 active:bg-blue-100">
            다른 단지 분석
          </button>
        </div>
        <BuySaveBtn r={r} f={f} bd={bd} onBack={onBack} onSave={onSave} saved={saved} showFull uid={currentUserId} />
        <button onClick={onHome}
          className="w-full rounded-2xl bg-slate-800 py-4 text-sm font-bold text-white active:bg-slate-700">
          처음으로
        </button>
      </div>

    </>
  );
}

function SellView({ onContext, currentUserId, currentUserEmail }) {
  // ── BuyView와 동일한 아키텍처 ──
  // · LocationPicker → Supabase 검색 → MOLIT fallback
  // · AI 웹검색 제거: fetchApartmentData() 재사용
  // · region은 LocationPicker 선택 시 즉시 저장 (AI 의존 없음)
  // · rawMolitRef: 24개월 데이터 1회 캐싱, 면적 변경 시 로컬 재필터
  const [f, setF] = useState(EMPTY);
  const [r, setR] = useState(null);
  const [pending, setPending] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState(null);
  const [areaOptions, setAreaOptions] = useState([]);
  const [fetchingAreas, setFetchingAreas] = useState(false);
  const [listingPriceInput, setListingPriceInput] = useState("");
  const abortRef = useRef(null);
  // 국토부 원본 24개월 캐시 — 면적 변경 시 재호출 없이 로컬 재필터
  const rawMolitRef = useRef(null);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // ── 로컬 재필터 (rawMolitRef 있을 때, API 재호출 없음) ──
  function refilterByArea(overrideArea, exclusiveAreas) {
    const raw = rawMolitRef.current;
    if (!raw) return null;
    const areaTarget = exclusiveAreas && exclusiveAreas.length > 0
      ? exclusiveAreas : Number(overrideArea) || null;
    if (!areaTarget) return null;
    const filterDeals = (deals) => {
      if (!areaTarget) return deals;
      if (Array.isArray(areaTarget)) return deals.filter(d => areaTarget.some(a => Math.abs(d.areaSqm - a) <= 3));
      return deals.filter(d => Math.abs(d.areaSqm - Number(areaTarget)) <= 3);
    };
    return { ...raw, sale: filterDeals(raw.sale), jeonse: filterDeals(raw.jeonse), areaSqm: Number(overrideArea) || 0 };
  }


  // ── 분석 횟수 제한 체크 ──
  async function checkAnalysisLimit() {
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/check-analysis-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_and_record',
          userId: currentUserId || null,
          userEmail: currentUserEmail || null,
          deviceId,
        }),
      });
      if (res.status === 429) {
        const d = await res.json();
        setAiMsg(d.message || '오늘 무료 분석 1회를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요.');
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[checkAnalysisLimit] 오류 (통과):', e?.message);
      return true;
    }
  }

  // ── LocationPicker 완료 시 면적 목록 로드 (BuyView와 동일) ──
  async function fetchAreasFor(region, dong, complexName, exactAptNm, sido) {
    if (!complexName || !region) return;
    setFetchingAreas(true); setAiMsg(null); setAreaOptions([]);
    // 1) Supabase 면적 목록 우선
    try {
      const sbRes = await fetch('/api/supabase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'areas', complex_name: exactAptNm || complexName, sigungu: region }),
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (sbData.areas && sbData.areas.length > 0) {
          setAreaOptions(groupAreasByPyeong(sbData.areas)
            .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) })));
          setFetchingAreas(false);
          return;
        }
      }
    } catch (e) { console.warn('[SellView] Supabase areas 실패:', e.message); }
    // 2) MOLIT fallback
    try {
      let lawdCd = null;
      try {
        const lr = await fetch("/api/lawdCd", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lawdCd", sigungu: region, sido: sido || "" }),
        });
        lawdCd = (await lr.json()).lawdCd || null;
      } catch(e) {}
      if (!lawdCd) lawdCd = getLawdCd(dong, region);
      if (!lawdCd) { setAiMsg(`지역 코드를 찾지 못했습니다 (${region})`); setFetchingAreas(false); return; }
      const result = await fetchMolitData(lawdCd, exactAptNm || complexName, "", 12);
      const allAreas = [...(result.sale || []), ...(result.jeonse || [])].map(d => d.areaSqm).filter(a => a > 0);
      const opts = groupAreasByPyeong(allAreas).map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: g.pyeong }));
      if (opts.length > 0) setAreaOptions(opts);
      else { setAiMsg("최근 실거래가 없습니다. KB시세를 직접 입력하세요."); set("_needKbInput", true); }
    } catch(e) { setAiMsg("면적 조회 실패 — 지역명을 확인하세요."); }
    finally { setFetchingAreas(false); }
  }

  // ── quickSearch: BuyView와 동일 경로 (Supabase → MOLIT, AI 없음) ──
  async function quickSearch(overrideArea, overrideForm, exclusiveAreas = null) {
    const ff = overrideForm ? { ...f, ...overrideForm } : f;
    const listingPrice = Number(String(listingPriceInput).replace(/,/g, "")) || 0;
    if (!ff.complexName) { setAiMsg("단지를 선택하세요."); return; }

    // 면적 변경 + 캐시 있으면 로컬 재필터
    // MOLIT 데이터(dataSource !== 'supabase')는 항상 Supabase 재조회 (BuyView와 동일)
    const isSameComplex = rawMolitRef.current &&
      rawMolitRef.current.dataSource === 'supabase' &&
      rawMolitRef.current.complexName === (ff.exactAptNm || ff.complexName) &&
      rawMolitRef.current.dong === ff.dong;
    const isAreaChange = overrideArea && isSameComplex;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setAiLoading(true); setAiMsg(null); setPending(null);

    try {
      let rawData;
      if (isAreaChange) {
        rawData = refilterByArea(overrideArea, exclusiveAreas);
        if (!rawData) rawData = await _fetchRawData(ff, overrideArea, exclusiveAreas);
      } else {
        rawData = await _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas);
      }
      _processRawData(rawData, ff, overrideArea, exclusiveAreas);
    } catch (e) {
      console.error('[SellView] quickSearch 오류:', e);
      const userMsg = e.message && !e.message.includes("undefined") && !e.message.includes("serviceKey") && !e.message.includes("API 호출")
        ? e.message
        : "실거래 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.";
      setAiMsg(userMsg);
    } finally { setAiLoading(false); }
  }

  // ── Supabase 우선 조회 (BuyView _fetchRawDataSupabase와 동일 로직) ──
  async function _fetchRawDataSupabase(ff, overrideArea, exclusiveAreas) {
    const complexId  = ff.complexId || null;
    const complexName = ff.exactAptNm || ff.complexName || "";
    const sigungu    = ff.region || "";
    const targetArea = overrideArea ? Number(overrideArea) : Number(ff.areaExclusive) || 0;

    // STEP 1: 단지 검색
    let complexInfo = null;
    try {
      const r1 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "search", name: complexName, sigungu, limit: 5 }),
      });
      const d1 = await r1.json();
      if (d1.complexes && d1.complexes.length > 0) {
        complexInfo = d1.complexes.find(c => complexId && c.id === complexId) || d1.complexes[0];
      }
    } catch(e) { console.warn('[SellView] Supabase search 실패:', e.message); }

    // 단지 미매칭 → MOLIT fallback
    if (!complexInfo) return await _fetchRawData(ff, overrideArea, exclusiveAreas);

    const useComplexId   = complexInfo.id;
    const useComplexName = complexInfo.complex_name;

    // STEP 2: deals 조회 — 면적 필터 없이 전체 조회 후 클라이언트 필터
    // (rawMolitRef에 전체 데이터 저장 → 면적 변경 시 refilterByArea 정상 동작)
    let saleDealsAll = [], rentDealsAll = [];
    try {
      const r4 = await fetch("/api/supabase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deals", complex_id: useComplexId, complex_name: useComplexName, sigungu }),
      });
      const d4 = await r4.json();
      saleDealsAll = d4.saleDeals || [];
      rentDealsAll = d4.rentDeals || [];
    } catch(e) { console.warn('[SellView] Supabase deals 실패:', e.message); }

    // 선택 면적으로 클라이언트 필터 (±3㎡)
    const filterByArea = (deals, area) => area ? deals.filter(d => Math.abs(Number(d.area_excl) - area) <= 3) : deals;
    const saleDeals = filterByArea(saleDealsAll, targetArea);
    const rentDeals = filterByArea(rentDealsAll, targetArea);

    // STEP 3: 거래 없음 → MOLIT fallback 후 없으면 명확한 상태 반환
    if (saleDeals.length === 0 && rentDeals.length === 0) {
      const molitData = await _fetchRawData(ff, overrideArea, exclusiveAreas);
      if (molitData && (molitData.sale?.length > 0 || molitData.jeonse?.length > 0)) return molitData;
      return {
        sale: [], jeonse: [],
        areaOptions: complexInfo.area_list
          ? groupAreasByPyeong(JSON.parse(complexInfo.area_list))
              .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: Math.round(g.rep / 3.3058) })) : [],
        buildYear: complexInfo.build_year || null, lawdCd: null,
        tradeStatus: { code: "PERIOD_NO_TRADE", msg: `최근 1년 실거래 데이터가 부족합니다. 직접 확인한 가격을 입력해 주세요.`, pipeline: { source: "supabase" } },
        dataSource: "supabase",
      };
    }

    // STEP 4: 변환
    const toSale = (d) => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deal_amount_man)||0, ym: d.contract_ym||"", aptNm: d.complex_name || useComplexName, floor: d.floor||0, cancelDate: d.cancel_date||null });
    const toRent = (d) => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deposit_man)||0,    ym: d.contract_ym||"", aptNm: d.complex_name || useComplexName, floor: d.floor||0, monthly: Number(d.monthly_man)||0 });
    const sale   = saleDeals.map(toSale).filter(d => d.price > 0 && d.areaSqm > 0);
    const jeonse = rentDeals.map(toRent).filter(d => d.price > 0 && d.areaSqm > 0);

    // STEP 5: 신뢰도 계산 (BuyView와 동일)
    const sbSaleConf = getDataConfidence(sale.length);
    const sbRentConf = getDataConfidence(jeonse.length);
    const sbStatus = (!sbSaleConf.canAnalyze && !sbRentConf.canAnalyze)
      ? { code: "TOO_FEW",  msg: `거래 건수 부족 (매매 ${sale.length}건·전세 ${jeonse.length}건) — 참고용으로만 표시됩니다`, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } }
      : (sbSaleConf.level === "낮음" || sbRentConf.level === "낮음")
        ? { code: "LOW_DATA", msg: `거래 부족 — 참고용 분석 (매매 ${sale.length}건·전세 ${jeonse.length}건)`, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } }
        : { code: "OK", msg: null, saleConf: sbSaleConf, rentConf: sbRentConf, pipeline: { source: "supabase" } };

    const data = {
      sale, jeonse, dataSource: "supabase",
      areaOptions: complexInfo.area_list
        ? groupAreasByPyeong(JSON.parse(complexInfo.area_list))
            .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: Math.round(g.rep / 3.3058) })) : [],
      buildYear: complexInfo.build_year || null, lawdCd: null,
      tradeStatus: sbStatus,
    };
    rawMolitRef.current = {
      ...data,
      // 전체 deals 보관 (면적 필터 전) → 면적 변경 시 refilterByArea 정상 동작
      sale:   saleDealsAll.map(d => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deal_amount_man)||0, ym: d.contract_ym||"", aptNm: d.complex_name||useComplexName, floor: d.floor||0, cancelDate: d.cancel_date||null })).filter(d => d.price>0 && d.areaSqm>0),
      jeonse: rentDealsAll.map(d => ({ areaSqm: Number(d.area_excl)||0, price: Number(d.deposit_man)||0,    ym: d.contract_ym||"", aptNm: d.complex_name||useComplexName, floor: d.floor||0, monthly: Number(d.monthly_man)||0 })).filter(d => d.price>0 && d.areaSqm>0),
      complexName: ff.exactAptNm || ff.complexName, dong: ff.dong, dataSource: "supabase"
    };
    return data;
  }

  async function _fetchRawData(ff, overrideArea, exclusiveAreas) {
    const data = await fetchApartmentData({
      complexName:    ff.complexName,
      exactAptNm:     ff.exactAptNm,
      dong:           ff.dong,
      region:         ff.region,
      sido:           ff.sido || "",
      areaExclusive:  overrideArea ? String(overrideArea) : ff.areaExclusive,
      exclusiveAreas: exclusiveAreas || null,
    });
    rawMolitRef.current = { ...data, complexName: ff.exactAptNm || ff.complexName, dong: ff.dong, dataSource: 'molit' };
    return data;
  }

  async function _processRawData(rawData, ff, overrideArea, exclusiveAreas) {
    const rawWithInput = {
      ...rawData,
      currentPrice: Number(ff.currentPrice) || rawData.currentPrice || 0,
      kbSalePrice:  Number(ff.kbSalePrice)  || rawData.kbSalePrice  || 0,
      kbJeonse:     Number(ff.kbJeonse)     || rawData.kbJeonse     || 0,
      buildYear:    ff.buildYear || rawData.buildYear || 0,
    };
    const effectiveArea = Number(overrideArea) || Number(ff.areaExclusive) || Number(f.areaExclusive) || 0;
    const { filled, ff: builtFf, jeonseCalc, saleCalc, blockReason } = buildAnalysisInput(rawWithInput, ff, effectiveArea);
    if (overrideArea) filled.areaExclusive = String(overrideArea);
    if (ff.buildYear && !filled.buildYear) filled.buildYear = ff.buildYear;

    const preservedPrice = Number(String(listingPriceInput).replace(/,/g, "")) || Number(ff.currentPrice) || Number(f.currentPrice) || 0;
    // tradeStatus를 f에 저장 → UI에서 원인별 메시지 표시
    setF({ ...filled, currentPrice: preservedPrice, _tradeStatus: rawData.tradeStatus || null });
    const opts = filled._aiAreaOptions?.length > 0 ? filled._aiAreaOptions : (rawData.areaOptions || []);
    setAreaOptions(opts);

    const finalCurrentPrice = preservedPrice;
    const finalBlockReason  = !finalCurrentPrice ? "희망 매도가를 입력하세요." : blockReason;
    const pendingFf = builtFf
      ? { ...builtFf, currentPrice: finalCurrentPrice }
      : { ...filled,  currentPrice: finalCurrentPrice, baseJeonse: Number(filled.kbJeonse) || 0,
          kbSalePrice: Number(filled.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0,
          jeonseCalc: null, saleCalc: null, dataSource: "ai" };

    // ── B안: ConfirmStep 조건부 자동 스킵 (SellView) ──
    const tradeCode = rawData.tradeStatus?.code || "OK";
    const dataOk = ["OK","LOW_DATA","TOO_FEW","JEONSE_SHORT","JEONSE_AREA_SHORT"].includes(tradeCode);
    const canAutoSkip = finalCurrentPrice > 0 && !finalBlockReason && dataOk && builtFf != null;

    if (canAutoSkip) {
      // 분석 횟수 제한 체크 (TODO: 유료화 시 서버사이드 계산으로 이전)
      const allowed = await checkAnalysisLimit();
      if (!allowed) return;
      const autoFf = { ...pendingFf, currentPrice: finalCurrentPrice };
      const res = analyze(autoFf);
      res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
      setR(res); setPending(null);
      if (onContext) onContext({ acqPrice: Number(f.acqPrice) || 0, sellPrice: Number(autoFf.currentPrice), years: Number(f.holdingYears) || 5, loanBalance: Number(f.loanBalance) || 0 });
    } else {
      setPending({ ff: pendingFf, jeonseCalc, saleCalc, blockReason: finalBlockReason });
    }
  }

  // ── doAnalyze: ConfirmStep에서 수정된 값으로 분석 실행 ──
  async function doAnalyze(updated) {
    const src = updated || pending;
    if (!src) return;
    // 분석 횟수 제한 체크 (TODO: 유료화 시 서버사이드 계산으로 이전)
    const allowed = await checkAnalysisLimit();
    if (!allowed) { setPending(null); return; }
    const { ff, jeonseCalc, saleCalc } = src;
    const res = analyze(ff);
    res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
    setR(res); setPending(null);
    if (onContext) onContext({ acqPrice: Number(f.acqPrice) || 0, sellPrice: Number(ff.currentPrice), years: Number(f.holdingYears) || 5, loanBalance: Number(f.loanBalance) || 0 });
  }

  if (r) return <SellResult r={r} f={f} onBack={() => setR(null)}
    onNewSearch={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
    onChangeArea={() => { setR(null); }}
    onHome={() => { setR(null); setF({...EMPTY}); setAreaOptions([]); rawMolitRef.current = null; setAiMsg(null); setListingPriceInput(""); }}
    areaOptions={areaOptions} currentArea={f.areaExclusive} currentUserId={currentUserId}
    onSelectArea={async (area) => {
      setR(null);
      setPending(null);
      set("areaExclusive", String(area));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setAiLoading(true);
      try {
        const rawData = await _fetchRawDataSupabase(
          { ...f, areaExclusive: String(area) }, area, null
        );
        const rawWithInput = {
          ...rawData,
          currentPrice: Number(f.currentPrice) || 0,
          kbSalePrice: Number(f.kbSalePrice) || 0,
          kbJeonse: Number(f.kbJeonse) || 0,
          buildYear: f.buildYear || rawData.buildYear || 0,
        };
        const { ff: builtFf, jeonseCalc, saleCalc } = buildAnalysisInput(rawWithInput, { ...f, areaExclusive: String(area) }, Number(area));
        if (builtFf && Number(f.currentPrice) > 0) {
          const res = analyze({ ...builtFf, currentPrice: Number(f.currentPrice) });
          res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
          set("areaExclusive", String(area));
          setAreaOptions(rawData.areaOptions || []);
          setR(res);
        } else {
          set("areaExclusive", String(area));
          setAreaOptions(rawData.areaOptions || []);
          setAiMsg('면적을 변경했습니다. 현재 매물가 확인 후 조회하세요.');
        }
      } catch(e) {
        setAiMsg(`면적 변경 실패: ${e.message}`);
      } finally {
        setAiLoading(false);
      }
    }}
  />;
  if (pending) return (
    <ConfirmStep
      p={pending} f={f} mode="sell"
      onBack={() => setPending(null)}
      onConfirm={doAnalyze}
      onRefetch={(area) => { set("areaExclusive", String(area)); quickSearch(area); }}
      onBackToTop={() => { setPending(null); setR(null); setF({ ...EMPTY }); setAiMsg(null); rawMolitRef.current = null; }}
    />
  );

  return (
    <>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">이 가격에 팔아도 될까요?</h1>
        <p className="mt-2 text-sm text-slate-500">단지를 선택하고 희망 매도가를 입력하면 실거래·시세 기반으로 평가합니다.</p>
      </header>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        {/* 진입 안내 */}
        {!f.complexName && (
          <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
            <p className="text-sm font-bold text-blue-800">분석 순서</p>
            <div className="mt-2 space-y-1 text-xs text-blue-600">
              <p>시/도 → 구/군 → 동 → 단지명 순으로 선택</p>
              <p>면적 선택</p>
              <p>③ 희망 매도가 입력</p>
              <p>AI 분석 버튼 클릭</p>
            </div>
          </div>
        )}

        <p className="mb-3 text-sm font-bold text-slate-800">① 단지 검색</p>

        {/* 선택된 단지 표시 */}
        {f.complexName && f.region ? (
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-800 px-4 py-3">
            <div>
              <p className="text-xs text-slate-400">{f.region} · {f.dong}</p>
              <p className="text-base font-bold text-white">{f.complexName}</p>
            </div>
            <button
              onClick={() => { setF(p => ({ ...p, region: "", dong: "", complexName: "", areaExclusive: "" })); setAreaOptions([]); setAiMsg(null); rawMolitRef.current = null; setListingPriceInput(""); }}
              className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600">
              변경
            </button>
          </div>
        ) : (
          <LocationPicker onComplete={({ sido, sigungu, dong, complexName, exactAptNm, complexId, buildYear, areaList }) => {
            setF(p => ({ ...p, region: sigungu, sido, dong, complexName, exactAptNm,
              complexId: complexId || null,
              buildYear: buildYear || p.buildYear,
              areaExclusive: "" }));
            rawMolitRef.current = null;
            setAreaOptions([]);
            setListingPriceInput("");
            if (areaList && areaList.length > 0) {
              setAreaOptions(groupAreasByPyeong(areaList)
                .map(g => ({ areaSqm: g.rep, exclusiveAreas: g.areas, pyeong: typicalPyeong(g.rep) })));
            } else {
              setTimeout(() => fetchAreasFor(sigungu, dong, complexName, exactAptNm, sido), 100);
            }
          }} />
        )}

        {/* ── STEP 1: 면적 선택 ── */}
        {areaOptions.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${f.areaExclusive ? "bg-emerald-500" : "bg-amber-500"}`}>
                {f.areaExclusive ? "✓" : "1"}
              </span>
              <p className="text-sm font-bold text-slate-700">면적 선택</p>
              {!f.areaExclusive && <p className="text-xs text-amber-600">← 분석할 면적을 선택하세요</p>}
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <div className="flex flex-wrap gap-2">
                {areaOptions.map((o, i) => {
                  const { mainLabel, subLabel } = areaButtonLabel(o.areaSqm, o.supplySqm);
                  const selected = String(f.areaExclusive) === String(o.areaSqm);
                  return (
                    <button key={i}
                      onClick={() => { set("areaExclusive", String(o.areaSqm)); setAiMsg(null); }}
                      className={`rounded-xl px-3 py-2 text-left border transition-all ${selected ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:border-amber-400"}`}>
                      <p className="text-sm font-semibold leading-tight">{mainLabel}</p>
                      {subLabel && <p className={`text-[10px] mt-0.5 ${selected ? "text-amber-100" : "text-slate-400"}`}>{subLabel}</p>}
                    </button>
                  );
                })}
              </div>
              {f.areaExclusive && (() => {
                const sel = areaOptions.find(o => String(o.areaSqm) === String(f.areaExclusive));
                const { mainLabel } = sel ? areaButtonLabel(sel.areaSqm, sel.supplySqm) : { mainLabel: `전용 ${f.areaExclusive}㎡` };
                return <p className="mt-1.5 text-xs text-amber-700">분석 기준: 전용 {sel ? sel.areaSqm : f.areaExclusive}㎡ ({Math.round(Number(sel ? sel.areaSqm : f.areaExclusive) / 3.3058)}평)</p>;
              })()}
            </div>
          </div>
        )}
        {fetchingAreas && <p className="mt-2 text-xs text-slate-400 text-center">면적 조회 중…</p>}

        {/* ── STEP 2: 희망 매도가 입력 ── */}
        {f.complexName && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${listingPriceInput ? "bg-emerald-500" : "bg-slate-400"}`}>
                {listingPriceInput ? "✓" : "2"}
              </span>
              <p className="text-sm font-bold text-slate-700">희망 매도가 입력</p>
              {!listingPriceInput && <p className="text-xs text-slate-400">내가 팔고 싶은 금액 (만원)</p>}
            </div>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" value={listingPriceInput} placeholder="예: 50000  (= 5억원)"
              onChange={(e) => setListingPriceInput(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-slate-500"
            />
          </div>
        )}

        {/* 실거래 상태 안내 */}
        {f._tradeStatus && f._tradeStatus.code !== "OK" && (() => {
          const ts = f._tradeStatus;
          const isNoTrade  = ["COMPLEX_NO_TRADE","NAME_NO_MATCH","PERIOD_NO_TRADE"].includes(ts.code);
          const isLowData  = ["LOW_DATA","TOO_FEW"].includes(ts.code);
          const isAreaFail = ts.code === "AREA_NO_MATCH";
          const needKb = ["API_FAIL", "COMPLEX_NO_TRADE", "NAME_NO_MATCH", "PERIOD_NO_TRADE", "AREA_NO_MATCH"].includes(ts.code) || (ts.jeonseShort && !ts.canExpand);
          const boxColor = isNoTrade ? "bg-red-50 ring-red-200" : isLowData ? "bg-amber-50 ring-amber-200" : isAreaFail ? "bg-orange-50 ring-orange-200" : "bg-amber-50 ring-amber-200";
          return (
            <div className={`mt-3 rounded-2xl p-4 ring-1 ${boxColor}`}>
              <p className="text-sm font-bold text-amber-800">{ts.msg}</p>
              {needKb && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-amber-700">KB매매시세 (만원)</p>
                    <input type="number" value={f.kbSalePrice} placeholder="예: 50250"
                      onChange={(e) => set("kbSalePrice", e.target.value)}
                      className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-amber-700">KB전세시세 (만원)</p>
                    <input type="number" value={f.kbJeonse} placeholder="예: 35500"
                      onChange={(e) => set("kbJeonse", e.target.value)}
                      className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
                  </div>
                </div>
              )}
              <p className="mt-2 text-[10px] text-amber-500">네이버 부동산 → 시세/실거래가 탭 → KB시세 중간값 확인 후 입력</p>
            </div>
          );
        })()}

        {/* ── STEP 3: AI 분석 실행 ── */}
        {f.complexName && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">3</span>
              <p className="text-sm font-bold text-slate-700">AI 분석 실행</p>
            </div>
            {!listingPriceInput && (
              <p className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                ↑ 희망 매도가를 입력하면 분석을 시작할 수 있습니다.
              </p>
            )}
            <button
              onClick={() => quickSearch(f.areaExclusive || undefined)}
              disabled={aiLoading}
              className={`w-full rounded-2xl py-4 text-lg font-extrabold text-white transition-opacity ${!listingPriceInput ? "opacity-40" : "opacity-100"}`}
              style={{ backgroundColor: NAVY }}>
              {aiLoading
                ? "조회 중… (실거래 데이터 수집 중)"
                : rawMolitRef.current && rawMolitRef.current.complexName === (f.exactAptNm || f.complexName)
                  ? "다시 분석 (면적 변경됨)"
                  : "이 가격에 팔아도 될까? — 매도 분석"}
            </button>
          </div>
        )}
        {aiLoading && (
          <button onClick={() => { if (abortRef.current) abortRef.current.abort(); setAiLoading(false); setAiMsg("조회가 취소되었습니다."); }}
            className="mt-2 w-full rounded-2xl border border-red-200 py-2.5 text-sm font-medium text-red-500">
            ⬛ 조회 취소
          </button>
        )}
        {aiMsg && (() => {
          const isDataShort = aiMsg.includes("실거래가 없습니다") || aiMsg.includes("실거래 데이터가 부족") || aiMsg.includes("실거래를 불러오지 못") || aiMsg.includes("불러오지 못했습니다");
          if (isDataShort) {
            return (
              <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-4 ring-1 ring-blue-200">
                <p className="text-sm font-bold text-blue-800">아파트는 찾았습니다.</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                  하지만 최근 12개월간 분석에 필요한 실거래 데이터가 부족합니다.<br />
                  확인한 시세 또는 KB시세를 입력하면 분석을 계속 진행할 수 있습니다.
                </p>
                <button
                  onClick={() => {
                    const ff = { ...f, currentPrice: Number(f.currentPrice)||0, baseJeonse: Number(f.kbJeonse)||0, kbSalePrice: Number(f.kbSalePrice)||0, jeonseUsed:0, saleUsed:0, jeonseCalc:null, saleCalc:null, dataSource:"manual" };
                    setPending({ ff, jeonseCalc:null, saleCalc:null, blockReason: "최근 1년 실거래 데이터가 부족합니다. 직접 확인한 가격을 입력해 주세요." });
                  }}
                  className="mt-3 block w-full rounded-xl bg-blue-600 py-2.5 text-center text-xs font-bold text-white active:bg-blue-700">
                  시세 직접 입력 →
                </button>
              </div>
            );
          }
          return (
            <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-100">
              {aiMsg}
            </div>
          );
        })()}

        {/* 매도 전용 추가 정보 (접기) */}
        {f.complexName && (
          <details className="mt-4">
            <summary className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50">
              세후 실수령·매도 판단용 추가 정보 ▾
            </summary>
            <div className="mt-3 rounded-2xl bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ["취득가 (만원, 양도세용)", "acqPrice", "number", ""],
                  ["보유기간 (년)", "holdingYears", "number", "5"],
                  ["대출잔액 (만원)", "loanBalance", "number", "0"],
                ].map(([l, k, t, ph]) => (
                  <label key={k} className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-500">{l}</span>
                    <input type={t} value={f[k] || ""} placeholder={ph}
                      onChange={(e) => set(k, e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600" />
                  </label>
                ))}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">실거주 여부</span>
                  <select value={f.lived ? "예" : "아니오"} onChange={(e) => set("lived", e.target.value === "예")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600">
                    {["예", "아니오"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">1주택 여부</span>
                  <select value={f.oneHouse ? "1주택" : "다주택"} onChange={(e) => set("oneHouse", e.target.value === "1주택")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600">
                    {["1주택", "다주택"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">매도 목적</span>
                  <select value={f.sellPurpose} onChange={(e) => set("sellPurpose", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600">
                    {["갈아타기", "현금화", "손실 축소", "세금 절감", "투자금 회수", "전세 전환 고민"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </details>
        )}

        {/* 샘플 */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400">샘플:</span>
          <button onClick={() => {
            const s = { ...SAMPLE, acqPrice: 35000, holdingYears: 8, loanBalance: 10000, sellPurpose: "갈아타기" };
            setF(s);
            const r2 = buildAnalysisInput({ region: s.region, dong: s.dong, complexName: s.complexName, areaSqm: s.areaExclusive, pyeong: s.pyeong, priceArea: s.areaExclusive, buildYear: s.buildYear, topFloor: 15, currentPrice: s.currentPrice, kbSalePrice: s.kbSalePrice, kbJeonse: s.kbJeonse, jeonse: s.deals, sale: s.saleDeals, areaOptions: [] }, s, s.areaExclusive);
            const ff2 = r2.ff || { ...s, currentPrice: Number(s.currentPrice), baseJeonse: Number(s.kbJeonse) || 0, kbSalePrice: Number(s.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0, jeonseCalc: null, saleCalc: null, dataSource: "manual" };
            setListingPriceInput(String(s.currentPrice));
            setPending({ ff: ff2, jeonseCalc: r2.jeonseCalc, saleCalc: r2.saleCalc });
          }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">동부</button>
          <button onClick={() => {
            const s = { ...PRESET_EUNMA, acqPrice: 120000, holdingYears: 15, sellPurpose: "투자금 회수" };
            setF(s);
            const r2 = buildAnalysisInput({ region: s.region, dong: s.dong, complexName: s.complexName, areaSqm: s.areaExclusive, pyeong: s.pyeong, priceArea: s.areaExclusive, buildYear: s.buildYear, topFloor: 14, currentPrice: s.currentPrice, kbSalePrice: s.kbSalePrice, kbJeonse: s.kbJeonse, jeonse: s.deals, sale: s.saleDeals, areaOptions: [] }, s, s.areaExclusive);
            const ff2 = r2.ff || { ...s, currentPrice: Number(s.currentPrice), baseJeonse: Number(s.kbJeonse) || 0, kbSalePrice: Number(s.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0, jeonseCalc: null, saleCalc: null, dataSource: "manual" };
            setListingPriceInput(String(s.currentPrice));
            setPending({ ff: ff2, jeonseCalc: r2.jeonseCalc, saleCalc: r2.saleCalc });
          }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">은마</button>
          <button onClick={() => {
            const s = { ...PRESET_SG7 };
            setF(s);
            const r2 = buildAnalysisInput({ region: s.region, dong: s.dong, complexName: s.complexName, areaSqm: s.areaExclusive, pyeong: s.pyeong, priceArea: s.areaExclusive, buildYear: s.buildYear, topFloor: 15, currentPrice: s.currentPrice, kbSalePrice: s.kbSalePrice, kbJeonse: s.kbJeonse, jeonse: s.deals, sale: s.saleDeals, areaOptions: [] }, s, s.areaExclusive);
            const ff2 = r2.ff || { ...s, currentPrice: Number(s.currentPrice), baseJeonse: Number(s.kbJeonse) || 0, kbSalePrice: Number(s.kbSalePrice) || 0, jeonseUsed: 0, saleUsed: 0, jeonseCalc: null, saleCalc: null, dataSource: "manual" };
            setListingPriceInput(String(s.currentPrice));
            setPending({ ff: ff2, jeonseCalc: r2.jeonseCalc, saleCalc: r2.saleCalc });
          }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">상계주공7</button>
        </div>
      </div>
    </>
  );
}

function SellResult({ r, f, onBack, onNewSearch, onChangeArea, onHome, areaOptions, currentArea, onSelectArea, currentUserId }) {
  const sd = analyzeSellerDecision(f, r);
  const mc = sd.mc;
  const TONE =
    sd.finalSellDecision.includes("매도 검토 가능") ? "bg-blue-500" :
    sd.finalSellDecision.includes("보유 리스크") ? "bg-amber-500" :
    sd.finalSellDecision.includes("고평가 주의") ? "bg-orange-500" :
    sd.finalSellDecision.includes("보유 유지 검토") ? "bg-slate-500" :
    sd.finalSellDecision.includes("매도 검토") ? "bg-blue-400" :
    sd.finalSellDecision.includes("보유") ? "bg-emerald-600" :
    sd.finalSellDecision.includes("보류") ? "bg-slate-400" :
    "bg-slate-400";
  const mrTone = (lv) => lv === "매우높음" ? "text-red-600" : lv === "높음" ? "text-orange-600" : lv === "보통" ? "text-amber-600" : lv === "평가 불가" ? "text-slate-500" : "text-emerald-600";
  const Cell = ({ l, v, tone }) => <div className="px-3 py-2.5 text-center"><p className="text-[11px] text-slate-400">{l}</p><p className={`mt-0.5 text-sm font-bold ${tone || "text-slate-800"}`}>{v}</p></div>;
  const trust = computeDataTrust(r, f.deals, f.saleDeals);
  React.useEffect(() => {
    writeSearchLog({
      region: f.region, dong: f.dong, complex_name: f.complexName,
      area_excl: f.areaExclusive || null,
      success: r.engineMode !== 'hold',
      fail_reason: r.engineMode === 'hold' ? r.holdReason : null,
      data_source: f.dataSource || 'unknown',
      sale_count: r.saleUsed || 0, rent_count: r.jeonseUsed || 0,
      jeonse_ratio: r.actualRatio || null, engine_mode: r.engineMode, buy_grade: r.buyGrade,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* ── 결론 카드 (매도) ── */}
      <div className="mb-4 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
        <div className={`px-5 py-4 text-white ${TONE}`}>
          <p className="text-xs text-white/70">{f.complexName} · {f.dong}{Number(f.areaExclusive) > 0 ? ` 전용 ${f.areaExclusive}㎡` : ""}</p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-white/70">매도 판단</p>
              <p className="text-xl font-extrabold">{sd.finalSellDecision}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-right">
                <p className="text-[11px] text-white/70">희망 매도가</p>
                <p className="text-xl font-extrabold">{won(sd.desired)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white">
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">희망가</p>
            <p className="mt-0.5 text-sm font-extrabold text-slate-900">{won(sd.desired)}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">AI 적정가</p>
            <p className="mt-0.5 text-sm font-extrabold" style={{ color: NAVY }}>{won(r.fairPrice)}</p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[11px] text-slate-400">가격 위치</p>
            <p className={`mt-0.5 text-sm font-extrabold ${sd.gapVsRef > 0.03 ? "text-red-500" : sd.gapVsRef < -0.03 ? "text-blue-500" : "text-slate-700"}`}>{sd.askingLevel}</p>
          </div>
        </div>
        {sd.sellerAction && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-600">{sd.sellerAction}</div>
        )}
      </div>

      {/* ── 자연어 한줄 결론 (매도) ── */}
      {!sd.provisional && (() => {
        const isSellFav = sd.finalSellDecision.includes("매도 검토");
        const isHold    = sd.finalSellDecision.includes("보유");
        const bgCls  = isSellFav ? "bg-blue-50 ring-blue-200"    : isHold ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200";
        const txtCls = isSellFav ? "text-blue-800"               : isHold ? "text-emerald-800"               : "text-amber-800";
        const subCls = isSellFav ? "text-blue-700"               : isHold ? "text-emerald-700"               : "text-amber-700";
        const gapPct = Math.abs(sd.gapVsRef * 100).toFixed(1);
        const line1  = sd.gapVsRef > 0.03
          ? `희망 매도가가 AI 적정가보다 ${gapPct}% 높게 설정되어 있습니다.`
          : sd.gapVsRef < -0.03
            ? `희망 매도가가 AI 적정가보다 ${gapPct}% 낮은 수준입니다.`
            : "희망 매도가가 AI 적정가 수준에 있습니다.";
        const line2 = sd.sellerAction;
        return (
          <div className={`mb-4 rounded-2xl px-5 py-4 ring-1 ${bgCls}`}>
            <p className={`text-sm font-bold ${txtCls}`}>{line1}</p>
            <p className={`mt-1 text-xs leading-relaxed ${subCls}`}>{line2}</p>
          </div>
        );
      })()}
      {sd.provisional && (
        <div className="mb-4 rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-200">
          <p className="text-sm font-bold text-slate-700">현재 데이터로는 정확한 판단이 어렵습니다.</p>
          <p className="mt-1 text-xs text-slate-500">실거래 데이터를 보강 후 다시 분석하세요.</p>
        </div>
      )}

      {/* ── 판단 이유 박스 (매도) ── */}
      {!sd.provisional && (() => {
        const checks = [];
        const gapPct = Math.abs(sd.gapVsRef * 100).toFixed(1);
        if (sd.gapVsRef > 0.05)       checks.push({ ok: null,  text: `호가가 AI 적정가 대비 ${gapPct}% 높음 — 거래 가능성 확인 필요` });
        else if (sd.gapVsRef < -0.05) checks.push({ ok: true,  text: `호가가 AI 적정가 대비 ${gapPct}% 낮음 — 거래 유리` });
        else                           checks.push({ ok: true,  text: `호가가 AI 적정가 수준 — 적정 호가` });
        checks.push(
          sd.holdingVsSellingResult === "매도 쪽 우세"
            ? { ok: null,  text: `매도 요인이 다소 우세 — ${sd.holdingVsSellingNote || "현재 여건상 매도 검토 가능"}` }
            : sd.holdingVsSellingResult === "보유 쪽 우세"
              ? { ok: true,  text: `보유 우세 — ${sd.holdingVsSellingNote || "보유 관점이 우세한 것으로 분석됩니다"}` }
              : { ok: null,  text: "보유·매도 중립 — 목적에 따라 판단" }
        );
        const liqOk = sd.liquidityScore >= 60;
        checks.push({ ok: liqOk ? true : null, text: `거래 가능성 ${sd.liquidityLevel}${liqOk ? "" : " — 호가 조정 고려"}` });
        const riskOk = !["높음","매우높음"].includes(sd.marketRiskLevel);
        checks.push({ ok: riskOk ? true : false, text: `시장 환경 ${sd.marketRiskLevel}` });
        if (!sd.provisional && sd.tax)
          checks.push({ ok: true, text: `예상 세후 실수령액 약 ${won(sd.netProceeds)}` });
        return (
          <div className="mb-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100">
            <p className="mb-3 text-sm font-bold text-slate-700">왜 이런 결과가 나왔나요?</p>
            <div className="space-y-2">
              {checks.map((c, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 flex-shrink-0 text-base font-bold ${c.ok === true ? "text-emerald-500" : c.ok === false ? "text-red-400" : "text-amber-400"}`}>
                    {c.ok === true ? "✓" : c.ok === false ? "✗" : "△"}
                  </span>
                  <div>
                    <span className={`text-sm ${c.ok === false ? "text-slate-400" : "text-slate-700"}`}>{c.text}</span>
                    {c.ok === true && <span className="ml-1.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">좋음</span>}
                    {c.ok === null && <span className="ml-1.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">보통</span>}
                    {c.ok === false && <span className="ml-1.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">주의</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── AI 참고 안내 ── */}
      <AiNotice />

      {/* ── 데이터 신뢰도 ── */}
      <div className="mb-4"><DataTrustBadge trust={trust} /></div>

      <SellSaveBtn r={r} f={f} sd={sd} onBack={onBack} uid={currentUserId} />
      <InputWarnings r={r} f={f} />
      <div className="mb-4"><MarketTypeBadge mc={mc} /></div>

      {r.dataWarnings && r.dataWarnings.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">데이터 부족 — 분석 신뢰 낮음</p>
          {r.dataWarnings.map((w, i) => (
            <p key={i} className="mt-1 text-xs text-amber-700">· {w}</p>
          ))}
          <p className="mt-1.5 text-[11px] text-amber-600">실거래를 보강하거나 KB시세를 입력하면 정확도가 높아집니다.</p>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
        <div className="px-6 py-5 text-white" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center justify-between"><p className="text-xs text-slate-300">최종 매도 판단{sd.isSpecial ? ` · ${mc.premiumLevel || "특수시장"}` : ""}</p></div>
          <div className="mt-1.5 flex items-center gap-3"><span className={`rounded-xl px-3 py-1 text-xl font-extrabold text-white ${TONE}`}>{sd.finalSellDecision}</span></div>
          <p className="mt-3 text-sm leading-relaxed text-slate-200"><b className="text-white">AI 판단 요약</b> · {sd.sellerAction}</p>
        </div>
        <div className="grid grid-cols-3 gap-px border-b border-slate-100 bg-slate-100">
          <Cell l="가격 위치" v={sd.askingLevel} tone={sd.gapVsRef > 0.05 ? "text-red-500" : sd.gapVsRef < -0.05 ? "text-blue-500" : "text-slate-800"} />
          <Cell l="세후 실수령" v={!sd.provisional && sd.tax ? won(sd.netProceeds) : "—"} />
          <Cell l="시장 환경 분석" v={sd.marketRiskLevel} tone={mrTone(sd.marketRiskLevel)} />
        </div>
        <div className="bg-white px-5 py-1.5 text-center text-[11px] text-slate-400">데이터 신뢰도 {sd.dataConfLabel} · 거래 데이터 충분도 {sd.fitLabel}</div>
        {(sd.marketRiskLevel === "높음" || sd.marketRiskLevel === "매우높음") && <p className="bg-orange-50 px-5 py-2 text-[11px] leading-relaxed text-orange-700">시장 환경 분석은 재건축·정책·프리미엄·공급 등에 따른 가격 변동 가능성을 나타냅니다.</p>}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">희망 매도가 적정성</h3>
          <GradeInfoPopup />
        </div>
        <div className="mt-2 flex items-baseline gap-2"><span className="text-lg font-extrabold" style={{ color: NAVY }}>{won(sd.desired)}</span><span className={`text-sm font-semibold ${sd.gapVsRef > 0.03 ? "text-red-500" : sd.gapVsRef < -0.03 ? "text-blue-500" : "text-emerald-600"}`}>{sd.askingLevel}</span></div>
        <p className="mt-1 text-xs text-slate-500">{sd.isSpecial ? "시장 기준가" : "적정가"} {won(sd.refPrice)} 대비 {sd.gapVsRef >= 0 ? "+" : ""}{(sd.gapVsRef * 100).toFixed(1)}%{sd.isSpecial && sd.gapVsIntrinsic != null ? ` · 실사용 적정가 ${won(mc.intrinsicFairPrice)} 대비 +${(sd.gapVsIntrinsic * 100).toFixed(0)}%` : ""}</p>
        {sd.isSpecial && <p className="mt-1 text-[11px] text-amber-600">특수시장: 프리미엄 {(mc.premiumRatio * 100).toFixed(0)}% — 시장 분위기 변화 시 프리미엄 축소 위험을 함께 보세요.</p>}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="px-4 py-2.5" style={{ backgroundColor: "#f1f5f9" }}><p className="text-sm font-bold text-slate-700">참고 매도가 범위</p></div>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">빠른 거래</p><p className="mt-0.5 text-base font-bold text-blue-600">{won(sd.recommendedAskingRange.fast)}</p></div>
          <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">적정 거래</p><p className="mt-0.5 text-base font-bold" style={{ color: NAVY }}>{won(sd.recommendedAskingRange.real)}</p></div>
          <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">상단 참고 호가</p><p className="mt-0.5 text-base font-bold text-amber-600">{won(sd.recommendedAskingRange.challenge)}</p></div>
        </div>
        <p className="px-4 pb-3 text-[11px] text-slate-400">상단 참고 호가는 거래기간이 길어질 수 있는 높은 호가입니다.</p>
      </div>

      {!sd.provisional && sd.tax && (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h3 className="text-sm font-bold text-slate-700">세후 실수령액 개략 추정</h3>
          <div className="mt-2 flex items-baseline gap-2"><span className="text-2xl font-extrabold" style={{ color: NAVY }}>{won(sd.netProceeds)}</span><span className="text-xs text-slate-400">대출상환 후 손에 남는 돈 (개략 추정)</span></div>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <div className="flex justify-between"><span>양도차익 개략</span><span>{won(sd.capitalGain)}</span></div>
            <div className="flex justify-between"><span>양도세 개략 추정 (지방소득세 10% 포함)</span><span className="text-red-500">− {won(sd.tax.tax)}</span></div>
            <div className="flex justify-between"><span>중개수수료(개략 0.4%)</span><span className="text-red-500">− {won(sd.brokerage)}</span></div>
            <div className="flex justify-between"><span>대출잔액 상환</span><span className="text-red-500">− {won(sd.loanBalance)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-700"><span>최종 실수령 개략 추정</span><span>{won(sd.netProceeds)}</span></div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{sd.tax.statusMsg || sd.tax.note} · 지방소득세 포함 · {sd.acqEstimated ? "취득가 미입력→추정" : "취득가 입력값 사용"} · 필요경비 미반영(0). 세금 숫자는 개략 추정이며 확정값이 아닙니다. 실제 세액은 보유기간, 거주요건, 세대 주택 수, 조정대상지역, 필요경비, 세법 변경, 일시적 2주택, 상속·증여·분양권·입주권 여부에 따라 달라질 수 있습니다. 세무사 확인을 권장합니다.</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={card}><h3 className="text-sm font-semibold text-slate-500">보유 vs 매도 <span className="font-normal text-slate-400">(종합 판단 보조)</span></h3><p className={`mt-2 text-base font-bold ${sd.holdingVsSellingResult === "매도 쪽 우세" ? "text-blue-600" : sd.holdingVsSellingResult === "보유 쪽 우세" ? "text-emerald-600" : "text-amber-600"}`}>{sd.holdingVsSellingResult}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{sd.holdingVsSellingNote}</p></div>
        <div className={card}><h3 className="text-sm font-semibold text-slate-500">거래 가능성</h3><p className={`mt-2 text-2xl font-bold ${sd.liquidityScore >= 80 ? "text-emerald-600" : sd.liquidityScore >= 60 ? "text-emerald-500" : sd.liquidityScore >= 40 ? "text-amber-600" : "text-orange-600"}`}>{sd.liquidityLevel}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">지연 원인: {sd.liquidityDelayCause}</p><p className="mt-0.5 text-[11px] text-slate-500">{sd.liquidityNeedAdjust ? "호가 조정 시 거래 가능성이 올라갈 수 있습니다." : "호가 수준은 거래에 큰 부담이 아닙니다."}</p><p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">거래 가능성은 실제 매수자 수요, 매물 경쟁, 호가 수준에 따라 달라질 수 있습니다.</p></div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-700">AI 매도 시점 참고</h3><span className="text-sm font-bold" style={{ color: NAVY }}>{sd.sellTimingLabel}</span></div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${sd.sellTimingScore}%`, backgroundColor: NAVY }} /></div>
        <p className="mt-2 text-[11px] text-slate-400">가격·시장·공급 등 복합 요인을 반영한 AI 참고 지표입니다.</p>
      </div>

      {sd.isSpecial && (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-200">
          <div className="px-4 py-2.5" style={{ backgroundColor: "#fff7ed" }}>
            <p className="text-sm font-bold text-orange-700">재건축·학군·희소성 영향 단지 안내</p>
            <p className="mt-0.5 text-xs text-orange-600">재건축 기대감 또는 희소성으로 인해 매매가가 전세가보다 높게 형성된 단지입니다. 현재 분석은 프리미엄 요인을 반영하여 계산되었습니다.</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-orange-100">
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">실사용 적정가</p><p className="mt-0.5 font-bold text-slate-800">{won(mc.intrinsicFairPrice)}</p></div>
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">시장 기준가</p><p className="mt-0.5 font-bold text-slate-800">{won(mc.marketReferencePrice)}</p></div>
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">프리미엄 금액</p><p className="mt-0.5 font-bold text-amber-600">{won(mc.premiumAmount)}</p></div>
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">프리미엄 비율</p><p className="mt-0.5 font-bold text-amber-600">{(mc.premiumRatio * 100).toFixed(0)}%</p></div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="text-slate-500">재건축 단계</span><span className="font-semibold text-slate-700">{RECON[mc.reconstructionStage].label} · {mc.stageScore}점</span></div>
          <p className="px-4 pb-3 text-[11px] leading-relaxed text-slate-400">{mc.specialMarketType === "redevelopment" && mc.stageScore >= 85 ? "관리처분·이주·착공에 가까워 보유 관점이 우세한 것으로 분석됩니다." : mc.specialMarketType === "redevelopment" ? "재건축 초기·프리미엄 과다 구간에서는 일부 차익실현(매도 검토)도 선택지입니다." : "프리미엄이 큰 단지는 시장 분위기 변화 시 프리미엄 축소 위험을 함께 고려하세요."} 사업 지연·분담금·정책 변경 가능성 존재.</p>
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h3 className="text-sm font-semibold text-slate-500">매도 판단 핵심 이유 5가지</h3>
        <ol className="mt-3 space-y-2.5">{sd.sellerReasons.map((t, i) => (<li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>{i + 1}</span><span>{t}</span></li>))}</ol>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-[11px] leading-relaxed text-slate-500">본 매도 분석은 공개 데이터와 사용자 입력값을 기반으로 한 참고용 계산입니다. 실제 세금·대출상환액·거래비용·매수자 수요·정책 변화·시장 상황에 따라 결과가 달라질 수 있습니다. 본 결과는 매도 권유나 투자자문이 아닙니다.</div>

      {/* ── PDF 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const gapPct = (Math.abs(sd.gapVsRef) * 100).toFixed(1);
            const text = `ValueLens 매도 가격평가 리포트
${"=".repeat(40)}
발행일: ${date}
단지: ${f.complexName || "—"} ${f.dong ? `· ${f.dong}` : ""} ${Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}

[매도 평가 결과]
  매도 판단: ${sd.finalSellDecision}
  희망 매도가: ${won(Number(f.currentPrice))}
  AI 적정가: ${won(sd.refPrice)}
  가격 위치: ${sd.askingLevel} (적정가 대비 ${sd.gapVsRef >= 0 ? "+" : ""}${gapPct}%)
  세후 실수령 개략: ${!sd.provisional && sd.tax ? won(sd.netProceeds) : "—"}

[참고 매도가 범위]
  빠른 거래: ${won(sd.recommendedAskingRange.fast)}
  적정 거래: ${won(sd.recommendedAskingRange.real)}
  상단 참고 호가: ${won(sd.recommendedAskingRange.challenge)}

[거래 가능성]
  ${sd.liquidityLevel} · ${sd.liquidityDelayCause}

[AI 매도 시점 참고]
  ${sd.sellTimingLabel}

[AI 판단 요약]
  ${sd.sellerAction}

${"=".repeat(40)}
이 리포트를 활용하기 전 확인하세요
□ 공인중개사에게 현장 시세·매물 경쟁력을 확인했나요?
□ 세무사에게 양도세를 상담받았나요?
   (보유기간·거주요건에 따라 세액이 크게 달라집니다)
□ 세후 실수령액을 세무사와 함께 계산했나요?
□ 대출 상환 일정·중도상환 수수료를 확인했나요?

위 항목 확인 후 최종 결정하시기 바랍니다.
본 리포트는 AI 가격 적정성 참고자료이며
매도 권유·투자자문·감정평가서가 아닙니다.
전문가 상담을 대체하지 않습니다.

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
            a.download = `ValueLens_매도_${f.complexName || "가격평가"}_${date.replace(/\./g, "")}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <p className="text-sm font-bold text-slate-800">매도 가격평가 리포트 저장</p>
            <p className="mt-0.5 text-xs text-slate-400">희망가·적정가·거래 가능성·AI 판단 요약 포함 · 계산식 제외</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>

      {/* ── 하단 네비게이션 CTA ── */}
      <div className="mt-6 space-y-3">
        {areaOptions && areaOptions.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-400">같은 단지 다른 면적</p>
            <div className="flex flex-wrap gap-2">
              {(areaOptions || []).filter(o => o && Number(o.areaSqm) > 0 && String(o.areaSqm) !== String(currentArea)).map((o, i) => (
                <button key={i}
                  onClick={() => onSelectArea && onSelectArea(Number(o.areaSqm))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 active:bg-slate-100">
                  전용 {o.areaSqm}㎡ ({Math.round(Number(o.areaSqm) / 3.3058)}평)
                </button>
              ))}
            </div>
          </div>
        )}
        <SellSaveBtn r={r} f={f} sd={sd} onBack={onBack} showFull uid={currentUserId} />
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-600 active:bg-slate-50">
            ← 다시 평가
          </button>
          <button onClick={onNewSearch}
            className="rounded-2xl border border-blue-100 bg-blue-50 py-4 text-sm font-bold text-blue-700 active:bg-blue-100">
            다른 단지 분석
          </button>
        </div>
        <button onClick={onHome}
          className="w-full rounded-2xl bg-slate-800 py-4 text-sm font-bold text-white active:bg-slate-700">
          처음으로
        </button>
      </div>
    </>
  );
}
// ═══════════════════════════════════════════════════════════
// 로그 뷰어 — 조회 이력 확인 (관리자용)
// ═══════════════════════════════════════════════════════════
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




function DealsEditor({ title = "전세 실거래", deals, setDeals, kind = "jeonse" }) {
  const [open, setOpen] = useState(false);
  const list = deals || [];
  const add = () => setDeals([...list, { ym: "", price: "", floor: "", topFloor: "", banjiha: false, urgent: false, related: false }]);
  const upd = (i, k, v) => setDeals(list.map((d, j) => (j === i ? { ...d, [k]: v } : d)));
  const del = (i) => setDeals(list.filter((_, j) => j !== i));
  const flags = [["banjiha", "반지하"], ["urgent", kind === "sale" ? "급매" : "급전세"], ["related", "특수관계"]];
  const ip = "rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-600";
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold text-slate-700">{title} 입력 <span className="font-normal text-slate-400">(정제평균 자동산정 · 최근 6개월)</span></span>
        <span className="text-xs text-slate-400">{open ? "접기 ▲" : `${list.length}건 ▼`}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {list.length === 0 && <p className="text-xs text-slate-400">거래를 추가하면 기준 전세가를 자동 산정합니다. 비우면 위 수동 입력값을 사용합니다.</p>}
          {list.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white p-2 ring-1 ring-slate-100">
              <input value={d.ym} onChange={(e) => upd(i, "ym", e.target.value)} placeholder="2026-03" className={`w-20 ${ip}`} />
              <input type="number" value={d.price} onChange={(e) => upd(i, "price", e.target.value)} placeholder="가격" className={`w-20 ${ip}`} />
              <input type="number" value={d.floor} onChange={(e) => upd(i, "floor", e.target.value)} placeholder="층" className={`w-14 ${ip}`} />
              {flags.map(([k, l]) => (
                <button key={k} onClick={() => upd(i, k, !d[k])} className={`rounded-md px-2 py-1 text-xs font-medium ${d[k] ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}>{l}</button>
              ))}
              <button onClick={() => del(i)} className="ml-auto px-1 text-xs text-slate-300 hover:text-red-500">×</button>
            </div>
          ))}
          <button onClick={add} className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:bg-white">+ 거래 추가</button>
        </div>
      )}
    </div>
  );
}

function Empty({ title, desc }) {
  return <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100"><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-400">{desc}</p></div>;
}
import ReactDOM from 'react-dom/client';
ReactDOM.createRoot(document.getElementById('root')).render(<App />);





export default function App() { return <AuthGate><AppInner /></AuthGate>; }
