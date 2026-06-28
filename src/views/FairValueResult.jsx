// ValueLens — FairValueResult
// Phase 3 Result UX Final
// ★ props / 함수명 / import 변경 금지 / 계산 로직 수정 금지

import React from 'react';
import { NAVY } from '../constants/brand.js';
import { won, pct } from '../constants/grades.js';
import { computeFairBands, classifyApartmentMarket, RECON } from '../engine/market.js';
import { computeDataTrust } from '../engine/stats.js';
import { writeSearchLog } from '../services/storage/searchLog.js';
import {
  AiNotice, DataTrustBadge, GradeInfoPopup,
  InputWarnings, MarketTypeBadge, FairSaveBtn,
} from './shared.jsx';

// ── 색상 정책 (요구사항 9번) ──
const CLR = {
  green:  "#2F6F4F",   // 저평가 / 긍정
  greenL: "#f0fdf4",   // 저평가 배경
  greenB: "#bbf7d0",   // 저평가 테두리
  blue:   "#1d4ed8",   // 적정 범위
  blueL:  "#eff6ff",   // 적정 범위 배경
  blueB:  "#bfdbfe",   // 적정 범위 테두리
  red:    "#dc2626",   // 고평가
  redL:   "#fef2f2",   // 고평가 배경
  redB:   "#fecaca",   // 고평가 테두리
  gray:   "#64748b",   // 데이터 부족
  grayL:  "#f8fafc",   // 데이터 부족 배경
  grayB:  "#e2e8f0",   // 데이터 부족 테두리
  amber:  "#C97B22",   // 주의/경고
  amberL: "#fffbeb",
  amberB: "#fde68a",
  muted:  "#94a3b8",
  border: "#e8e4df",
  bg:     "#FAFAF8",
};

// ── 판단 정의 (A/B/C/D/E 알파벳 메인 제거, 쉬운 표현만) ──
function getVerdict(r) {
  const hold = r.engineMode === "hold";
  const gap  = r.gapRatio;
  if (hold)         return { text:"데이터 부족",  clr:CLR.gray,  bgClr:CLR.grayL,  brClr:CLR.grayB };
  if (gap < -0.08)  return { text:"저평가",       clr:CLR.green, bgClr:CLR.greenL, brClr:CLR.greenB };
  if (gap < 0.05)   return { text:"적정 범위",    clr:CLR.blue,  bgClr:CLR.blueL,  brClr:CLR.blueB };
  if (gap < 0.12)   return { text:"고평가 주의",  clr:CLR.amber, bgClr:CLR.amberL, brClr:CLR.amberB };
  return              { text:"고평가",            clr:CLR.red,   bgClr:CLR.redL,   brClr:CLR.redB };
}

// ── AI 한 줄 결론 (요구사항 4번) ──
function getAISummary(r, trust) {
  const hold = r.engineMode === "hold";
  const gap  = r.gapRatio;
  const stable = trust?.grade === "A" || trust?.grade === "B";

  if (hold) return "최근 거래 데이터가 부족하여 참고용으로만 확인해 주세요.";

  if (gap < -0.08) return stable
    ? "현재 가격은 분석 기준보다 낮은 구간입니다. 최근 거래 데이터도 안정적으로 확보되었습니다."
    : "현재 가격은 분석 기준보다 낮은 구간입니다. 거래 데이터가 적어 추가 확인을 권장합니다.";

  if (gap < 0.05) return stable
    ? "현재 가격은 적정 범위 안에 있습니다. 최근 거래 데이터도 충분하여 비교적 안정적으로 분석되었습니다."
    : "현재 가격은 적정 범위 안에 있습니다. 거래 데이터가 다소 적어 참고용으로 확인해 주세요.";

  if (gap < 0.12) return "현재 가격은 분석 기준보다 높은 구간입니다. 가격 협상 또는 추가 확인이 필요합니다.";
  return "현재 가격은 분석 기준을 크게 상회합니다. 신중한 검토가 필요합니다.";
}

// ── 적정가 범위 (요구사항 3번: 데이터 안정성 따라 다른 오차율) ──
function getFairRange(r, trust, fb) {
  const fp = r.fairPrice;
  if (!fp) return null;

  // fb(computeFairBands)가 이미 계산된 범위 → 그대로 사용
  // 단, 데이터 안정성에 따라 범위를 조정
  const grade = trust?.grade || "C";
  const ratio = grade === "A" ? 0.05 : grade === "B" ? 0.07 : 0.10;

  // fb.conservative / fb.aggressive 가 있으면 활용, 없으면 자체 계산
  const low  = fb?.conservative || Math.round(fp * (1 - ratio));
  const high = fb?.aggressive   || Math.round(fp * (1 + ratio));

  return { low, high, base: fb?.base || fp };
}

// ── 판단 이유 카드 (요구사항 5번: 전문용어 없이 4개 이하) ──
function getWhyCards(r, trust, f = {}) {
  const cards = [];

  // 거래 충분도 (건수 포함)
  const saleUsed = r.saleUsed || 0;
  if (saleUsed >= 5) {
    cards.push(`최근 동일 평형 거래 ${saleUsed}건 기준입니다.`);
  } else if (saleUsed > 0) {
    cards.push(`최근 동일 평형 거래가 ${saleUsed}건으로 적은 편입니다.`);
  } else {
    cards.push("최근 거래 데이터가 매우 부족합니다.");
  }

  // 적정 범위 여부
  const gap = r.gapRatio;
  if (gap == null) {
    cards.push("가격 분석을 위한 데이터가 충분하지 않습니다.");
  } else if (Math.abs(gap) <= 0.05) {
    cards.push("현재 가격은 적정 범위 안에 있습니다.");
  } else if (gap < 0) {
    cards.push("현재 가격은 분석 기준보다 낮은 수준입니다.");
  } else {
    cards.push("현재 가격은 분석 기준보다 높은 수준입니다.");
  }

  // 분석 방식 (전문용어 제거)
  const mode = r.engineMode;
  if (mode === "blend")  cards.push("최근 매매·전세 거래를 함께 반영했습니다.");
  else if (mode === "sale")   cards.push("최근 매매 거래 흐름을 기반으로 분석했습니다.");
  else if (mode === "jeonse") cards.push("최근 전세 거래 흐름을 기반으로 분석했습니다.");

  // 이상 거래 제외 여부
  const jExcl = r.basis?.jeonse?.excluded || 0;
  const sExcl = r.basis?.sale?.excluded   || 0;
  if ((jExcl + sExcl) > 0) {
    cards.push("이상 거래를 제외하고 분석했습니다.");
  }

  // 프리미엄 반영 — 일반어로 설명
  if (r.isPremium) {
    const region = (f.region || "").toString();
    const buildYear = Number(f.buildYear) || 0;
    const ratio = r.actualRatio || 0;
    console.log("[WhyCards] isPremium 진입 - region:", region, "/ buildYear:", buildYear, "/ ratio:", ratio, "/ f.region:", f.region, "/ f.buildYear:", f.buildYear);
    if (["강남구","서초구","송파구"].some(g => region.includes(g))) {
      cards.push("강남권 입지 특성상 매매가가 높게 형성됩니다.");
    } else if (buildYear > 0 && buildYear <= 1995) {
      cards.push(`${buildYear}년 준공 구축으로 재건축 기대감이 반영된 가격대입니다.`);
    } else if (ratio < 0.35) {
      cards.push("전세가 대비 매매가가 높은 고가 단지입니다.");
    } else {
      cards.push("입지·단지 특성으로 시세가 높게 형성됩니다.");
    }
  }

  return cards.slice(0, 4);
}

// ── 데이터 안정성 텍스트 (요구사항 6번) ──
function getStability(trust) {
  const g = trust?.grade || "C";
  const desc = trust?.gradeDesc || "";
  const label = trust?.gradeLabel || "낮음";
  const clr =
    g === "A" ? CLR.green :
    g === "B" ? "#16a34a" :
    g === "C" ? CLR.amber :
    CLR.red;

  // 화면용 등급 (A/B/C/D → 높음/보통/낮음)
  const displayLabel =
    g === "A" ? "높음" :
    g === "B" ? "보통" :
    "낮음";  // C, D 모두 "낮음" (요구사항: 매우 낮음은 숨김)

  const barW =
    g === "A" ? "100%" :
    g === "B" ? "65%"  :
    g === "C" ? "35%"  :
    "15%";

  return { displayLabel, clr, desc, barW };
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 가격 문자열 → 만원 변환
function parsePriceStr(str) {
  const n = Number((str || "").replace(/[^0-9.]/g, ""));
  if (!n) return null;
  if (n >= 1000) return n;       // 5000 → 5000만
  return Math.round(n * 10000);  // 7.5 → 75000만
}

function FairValueResult({ r, f, onBack, onNewSearch, onHome, areaOptions = [], currentUserId, onAskMore, onBuyAnalysis, onPriceUpdate }) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [whyOpen, setWhyOpen] = React.useState(false);
  const [priceEdit, setPriceEdit] = React.useState(false);
  const [priceInput, setPriceInput] = React.useState(
    f.currentPrice > 0 ? (f.currentPrice / 10000).toString() : ""
  );
  // f.currentPrice 변경 시 입력값 동기화
  React.useEffect(() => {
    if (!priceEdit && f.currentPrice > 0) {
      setPriceInput((f.currentPrice / 10000).toString());
    }
  }, [f.currentPrice]);

  // 체크리스트 localStorage 저장 (단지명+면적 기반 key)
  const checkKey = `vl_check_${(f.complexName||"").replace(/\s/g,"")}_${f.areaExclusive||0}`;
  const [checkState, setCheckState] = React.useState(() => {
    try {
      const saved = localStorage.getItem(checkKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // checkState 변경 시 localStorage에 저장
  React.useEffect(() => {
    try { localStorage.setItem(checkKey, JSON.stringify(checkState)); } catch {}
  }, [checkState, checkKey]);

  // ── 계산 (엔진 값 수정 금지) ──
  const mc          = classifyApartmentMarket(f, r);
  const trust       = computeDataTrust(r, f.deals, f.saleDeals);
  const fb          = computeFairBands(r, mc);
  const hold        = r.engineMode === "hold";
  const isLowData   = mc.specialMarketType === "lowData";
  const isAbnormal  = mc.specialMarketType === "abnormalInput";
  const provisional = hold || isLowData || isAbnormal;

  const verdict    = getVerdict(r);
  const aiSummary  = getAISummary(r, trust);
  const fairRange  = getFairRange(r, trust, fb);
  const whyCards   = getWhyCards(r, trust, f);
  const stability  = getStability(trust);

  const jb = (r.basis && r.basis.jeonse) || {};
  const sb = (r.basis && r.basis.sale)   || {};
  const jkb = r.jeonseCalc?.kbWeight;
  const skb = r.saleCalc?.kbWeight;

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

  // ── 체크리스트 (요구사항 8번) ──
  const CHECKLIST = [
    {
      id: "deals",
      text: "최신 실거래 확인",
      sub: "국토부 실거래가 공개시스템",
      href: "https://rt.molit.go.kr",
      btnLabel: "국토부 실거래",
    },
    {
      id: "registry",
      text: "등기사항 확인",
      sub: "권리관계·근저당·가처분 등",
      href: "https://www.iros.go.kr",
      btnLabel: "대법원 등기소",
    },
    {
      id: "building",
      text: "건축물대장 확인",
      sub: "용도·위반건축물·변경이력",
      href: "https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A09010&CappBizCD=14000000003",
      btnLabel: "정부24 건축물대장",
    },
    {
      id: "loan",
      text: "대출 가능 금액 확인",
      sub: "DSR·LTV 기준 실제 가능 한도",
      href: null,
      btnLabel: null,
    },
    {
      id: "special",
      text: "계약 특약 확인",
      sub: "잔금일·하자·전입신고 등 특약사항",
      href: null,
      btnLabel: null,
    },
  ];

  const allChecked = CHECKLIST.every(c => checkState[c.id]);
  const checkedCount = CHECKLIST.filter(c => checkState[c.id]).length;

  // ── 레이아웃 헬퍼 ──
  const Card = ({ children, style = {} }) => (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: `1px solid ${CLR.border}`,
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      marginBottom: 10, overflow: "hidden", ...style,
    }}>
      {children}
    </div>
  );

  const SLabel = ({ children }) => (
    <p style={{ fontSize: 10, fontWeight: 600, color: CLR.muted,
      letterSpacing: "0.07em", textTransform: "uppercase", margin: "14px 16px 8px" }}>
      {children}
    </p>
  );

  const Divider = () => <div style={{ height: 1, background: CLR.border }} />;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif",
      padding: "0 0 40px" }}>



      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2) 현재 가격 판단 (메인, 가장 크게)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card style={{ borderTop: `3px solid ${verdict.clr}` }}>
        <div style={{ padding: "18px 16px 14px", background: verdict.bgClr }}>
          {/* 단지·면적 */}
          <p style={{ fontSize: 11, color: CLR.muted, margin: "0 0 10px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {f.complexName}
            {Number(f.areaExclusive) > 0 ? ` · 전용 ${f.areaExclusive}㎡` : ""}
            {f.buildYear ? ` · ${f.buildYear}년` : ""}
          </p>

          {/* 판단 텍스트 + 금액 + 근거 버튼 */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%",
                  background: verdict.clr, flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: 26, fontWeight: 800, color: verdict.clr,
                  letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                  {verdict.text}
                </span>
              </div>
              {f.currentPrice > 0 && (
                <div style={{ margin: "4px 0 0 21px" }}>
                  {priceEdit ? (
                    // 인라인 입력창
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        value={priceInput}
                        onChange={e => setPriceInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const p = parsePriceStr(priceInput);
                            if (p && onPriceUpdate) { onPriceUpdate(p); setPriceEdit(false); }
                          }
                          if (e.key === "Escape") setPriceEdit(false);
                        }}
                        autoFocus
                        style={{ width: 70, fontSize: 13, fontWeight: 700,
                          border: "1px solid #5b52e0", borderRadius: 8,
                          padding: "3px 8px", outline: "none", color: "#1e293b" }}
                      />
                      <span style={{ fontSize: 12, color: "#64748b" }}>억</span>
                      <button
                        onClick={() => {
                          const p = parsePriceStr(priceInput);
                          if (p && onPriceUpdate) { onPriceUpdate(p); setPriceEdit(false); }
                          else if (!p) setPriceEdit(false);
                        }}
                        style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px",
                          borderRadius: 8, border: "none", background: "#2F6F4F",
                          color: "#fff", cursor: "pointer" }}>
                        확인
                      </button>
                      <button onClick={() => setPriceEdit(false)}
                        style={{ fontSize: 12, color: "#94a3b8", background: "none",
                          border: "none", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    // 일반 표시
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                        {f._userInputPrice ? "입력가 " : "실거래 평균 "}
                        <span style={{ fontWeight: 700, color: "#334155" }}>
                          {won(Number(f.currentPrice))}
                        </span>
                      </p>
                      {onPriceUpdate && (
                        <button onClick={() => setPriceEdit(true)}
                          style={{ fontSize: 11, color: "#5b52e0", background: "#ede9fe",
                            border: "1px solid #c4b5fd", borderRadius: 8,
                            padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}>
                          수정
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setDetailOpen(v => !v)}
              style={{ fontSize: 11, fontWeight: 600, color: verdict.clr,
                background: "rgba(255,255,255,0.6)", border: `1px solid ${verdict.brClr}`,
                borderRadius: 20, padding: "4px 10px", cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
              {detailOpen ? "근거 접기 ▲" : "근거 보기 ▼"}
            </button>
          </div>

          {/* 적정가 대비 % */}
          {!hold && r.gapRatio != null && (
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              적정 기준 대비&nbsp;
              <span style={{ fontWeight: 700, color: verdict.clr }}>
                {r.gapRatio < 0 ? "▼" : "▲"} {Math.abs(r.gapRatio * 100).toFixed(1)}%
              </span>
              &nbsp;{r.gapRatio < 0 ? "낮은 수준" : "높은 수준"}
            </p>
          )}
          {hold && (
            <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              {r.holdReason || "거래 데이터 부족으로 정확한 분석이 어렵습니다."}
            </p>
          )}
        </div>

        {/* 근거 보기 펼쳐지는 내용 — 저평가 카드 바로 아래 */}
        {detailOpen && (
          <div style={{ borderTop: `1px solid ${verdict.brClr}`, background: "#fff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 1, background: CLR.border }}>
              {[
                { l: "전세 시세 기준", v: r.jeonseFair ? `${won(r.jeonseFair)} (${r.jeonseUsed}건)` : "—" },
                { l: "매매 시세 기준", v: r.saleFair   ? `${won(r.saleFair)} (${r.saleUsed}건)` : "—" },
                { l: "분석 방식",
                  v: r.isPremium
                    ? (["강남구","서초구","송파구"].some(g => (f.region||"").includes(g)) ? "강남권 입지 반영"
                      : Number(f.buildYear) <= 1995 ? "재건축 기대 반영"
                      : "단지 특성 반영")
                    : r.engineMode === "blend"  ? "매매·전세 혼합"
                    : r.engineMode === "sale"   ? "매매 거래 기준"
                    : r.engineMode === "jeonse" ? "전세 거래 기준"
                    : "—" },
                { l: "적정가 대비", v: r.gapRatio != null ? `${r.gapRatio < 0 ? "▼" : "▲"} ${Math.abs(r.gapRatio * 100).toFixed(1)}%` : "—" },
              ].map((row, i) => (
                <div key={i} style={{ background: "#fff", padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: CLR.muted, margin: "0 0 3px" }}>{row.l}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#334155", margin: 0 }}>{row.v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3) 적정 가격 범위 (단일 숫자 제거, 범위로)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!provisional && fairRange && (
        <Card>
          <SLabel>적정 가격 범위</SLabel>
          <div style={{ padding: "0 16px 16px" }}>
            {/* 범위 강조 박스 — 이유 버튼 포함 */}
            <div style={{ background: CLR.greenL, border: `1px solid ${CLR.greenB}`,
              borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
              {/* 타이틀 + 이유 버튼 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <p style={{ fontSize: 11, color: "#166534", margin: 0 }}>
                  AI 추정 적정 범위
                </p>
                <button
                  onClick={() => setWhyOpen(v => !v)}
                  style={{ fontSize: 11, fontWeight: 600, color: CLR.green,
                    background: "rgba(255,255,255,0.6)", border: `1px solid ${CLR.greenB}`,
                    borderRadius: 20, padding: "3px 9px", cursor: "pointer" }}>
                  {whyOpen ? "접기 ▲" : "이유 ▼"}
                </button>
              </div>
              <p style={{ fontSize: 22, fontWeight: 800, color: CLR.green, margin: 0,
                letterSpacing: "-0.02em" }}>
                약 {won(fairRange.low)} ~ {won(fairRange.high)}
              </p>
              <p style={{ fontSize: 11, color: "#4ade80", margin: "5px 0 0" }}>
                기준값 {won(fairRange.base)} ·&nbsp;
                데이터 안정성 {stability.displayLabel} 기준
              </p>

              {/* 이유 내용 — 펼치면 박스 안에 */}
              {whyOpen && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6,
                  borderTop: `1px solid ${CLR.greenB}`, paddingTop: 10 }}>
                  {whyCards.map((text, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontSize: 12, flexShrink: 0 }}>
                        {text.includes("부족") || text.includes("적은") || text.includes("높은") ? "⚠️" : "✅"}
                      </span>
                      <p style={{ fontSize: 12, color: "#166534", margin: 0, lineHeight: 1.55 }}>
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 범위 설명 */}
            <p style={{ fontSize: 11, color: CLR.muted, margin: 0, lineHeight: 1.6 }}>
              단일 숫자가 아닌 범위로 표시합니다.
              데이터 안정성에 따라 범위가 달라질 수 있습니다.
            </p>
          </div>
        </Card>
      )}





      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6) 데이터 안정성 (신뢰도 표현 제거)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card>
        <SLabel>데이터 안정성</SLabel>
        <div style={{ padding: "0 16px 14px" }}>
          {/* 등급 + 바 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: stability.clr,
              minWidth: 36 }}>
              {stability.displayLabel}
            </span>
            <div style={{ flex: 1, height: 6, borderRadius: 99,
              background: "#f1f5f9", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99,
                background: stability.clr, width: stability.barW,
                transition: "width 0.6s ease" }} />
            </div>
            <button
              onClick={() => setDetailOpen(v => !v)}
              style={{ fontSize: 11, color: CLR.blue, flexShrink: 0,
                background: CLR.blueL, border: `1px solid ${CLR.blueB}`,
                borderRadius: 12, padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}>
              거래 {(r.saleUsed||0) + (r.jeonseUsed||0)}건 보기
            </button>
          </div>
          {/* 이유 — 엔진의 gradeDesc 그대로 (전문용어 없는 문구) */}
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 0", lineHeight: 1.65 }}>
            {stability.desc}
          </p>

          {/* 거래 목록 펼치기 */}
          {detailOpen && f.saleDeals && f.saleDeals.length > 0 && (
            <div style={{ marginTop: 10, borderTop: `1px solid ${CLR.border}`, paddingTop: 10 }}>
              <p style={{ fontSize: 11, color: CLR.muted, margin: "0 0 6px", fontWeight: 600 }}>
                최근 매매 거래 내역
              </p>
              {[...f.saleDeals].sort((a,b) => (b.ym||"").localeCompare(a.ym||"")).slice(0, 15).map((d, i, arr) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "6px 0",
                  borderBottom: i < arr.length - 1 ? `1px solid ${CLR.border}` : "none" }}>
                  <span style={{ fontSize: 11, color: CLR.muted }}>
                    {d.ym ? `${d.ym.slice(0,4)}년 ${d.ym.slice(4,6)}월` : "—"} · {d.floor || "?"}층
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                    {won(Number(d.price) * 10000)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          7) 주의사항
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card style={{ border: `1px solid ${CLR.amberB}` }}>
        <div style={{ padding: "14px 16px", background: CLR.amberL }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e",
            margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚠️</span> 주의사항
          </p>
          {[
            "본 결과는 최근 거래 데이터를 기반으로 분석한 참고 자료입니다.",
            "실제 거래가격은 층, 향, 내부 상태, 협상 여부에 따라 달라질 수 있습니다.",
            "계약 전에는 최신 실거래, 매물 상태, 등기사항, 건축물대장을 반드시 확인하시기 바랍니다.",
          ].map((t, i) => (
            <p key={i} style={{ fontSize: 12, color: "#b45309",
              margin: i === 0 ? 0 : "5px 0 0", lineHeight: 1.65,
              paddingLeft: 12, position: "relative" }}>
              <span style={{ position: "absolute", left: 0 }}>·</span>
              {t}
            </p>
          ))}
        </div>
      </Card>






      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          하단 네비게이션
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}


      {/* AI 안내 */}
      <AiNotice />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          하단 채팅창 (결과 보고 바로 질문)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {onAskMore && <ResultChatBar complex={f.complexName} onSend={onAskMore} onBuyAnalysis={onBuyAnalysis} />}
    </div>
  );
}

// ── 결과지 하단 채팅바 ──
function ResultChatBar({ complex, onSend, onBuyAnalysis }) {
  const [text, setText] = React.useState("");
  const [aiReply, setAiReply] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const chips = ["전세는?", "다른 평형은?", "최근 거래 흐름은?"];

  const handleSend = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");

    // 분석 관련 질문은 채팅으로 넘김
    const isAnalysis = /전세|다른평형|다른 평형|평형|매수|살까|최근거래|최근 거래|거래흐름/.test(t);
    if (isAnalysis) { onSend(t); return; }

    // 자유 질문 → 결과지 안에서 AI 답변
    setLoading(true);
    setAiReply(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 300,
          system: `당신은 10년 경력 공인중개사입니다. ${complex ? `현재 ${complex} 아파트에 대해 이야기 중입니다.` : ""} 짧고 친근하게 3문장 이내로 답변하세요.`,
          messages: [{ role: "user", content: t }],
        }),
      });
      const data = await res.json();
      setAiReply(data?.content?.[0]?.text?.trim() || null);
    } catch(e) {
      setAiReply("잠깐 문제가 생겼어요. 다시 말씀해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "sticky", bottom: 60, margin: "16px 0 0",
      background: "#fff", borderRadius: 16,
      border: "1px solid #e2e8f0",
      boxShadow: "0 -2px 16px rgba(0,0,0,0.08)",
      padding: "12px 14px",
      zIndex: 20,
    }}>
      {/* 빠른 질문 칩 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {/* 매수 의견 — 바로 분석 */}
        {onBuyAnalysis && (
          <button onClick={onBuyAnalysis}
            style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px",
              borderRadius: 20, border: "1px solid #5b52e0",
              background: "#ede9fe", color: "#5b52e0", cursor: "pointer" }}>
            💡 매수 의견은?
          </button>
        )}
        {chips.map((c, i) => (
          <button key={i} onClick={() => onSend(c)}
            style={{ fontSize: 12, fontWeight: 500, padding: "5px 12px",
              borderRadius: 20, border: "1px solid #e2e8f0",
              background: "#f8fafc", color: "#334155", cursor: "pointer" }}>
            {c}
          </button>
        ))}
      </div>
      {/* AI 인라인 답변 */}
      {(loading || aiReply) && (
        <div style={{ marginBottom: 10, padding: "10px 12px",
          background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          {loading
            ? <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>잠깐만요... 🔍</p>
            : <p style={{ fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.6 }}>{aiReply}</p>
          }
        </div>
      )}

      {/* 입력창 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={`${complex || "이 아파트"}에 대해 더 궁금한 점은?`}
          style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 22,
            padding: "9px 14px", fontSize: 13, outline: "none",
            background: "#f8fafc", color: "#1e293b" }}
        />
        <button onClick={handleSend}
          style={{ width: 36, height: 36, borderRadius: "50%",
            background: text.trim() ? "#5b52e0" : "#e2e8f0",
            border: "none", cursor: text.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export { FairValueResult };
