// ValueLens — FairValueResult Phase 3
// ★ 계산 로직(r.*, 엔진 값) 수정 금지. 렌더링/UX만 변경.
// ★ props / 함수명 / import 변경 금지.

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

// ─── 색상 상수 ───
const GREEN  = "#2F6F4F";
const AMBER  = "#C97B22";
const RED    = "#DC2626";
const MUTED  = "#94a3b8";
const BG     = "#FAFAF8";
const BORDER = "#e8e4df";

function FairValueResult({ r, f, onBack, onNewSearch, onHome, areaOptions = [], currentUserId }) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [checkDone, setCheckDone]   = React.useState({});

  // ── 계산 (엔진 값 그대로 사용 — 수정 금지) ──
  const mc      = classifyApartmentMarket(f, r);
  const trust   = computeDataTrust(r, f.deals, f.saleDeals);
  const fb      = computeFairBands(r, mc);
  const hold    = r.engineMode === "hold";
  const isLowData   = mc.specialMarketType === "lowData";
  const isAbnormal  = mc.specialMarketType === "abnormalInput";
  const provisional = hold || isLowData || isAbnormal;
  const jb = (r.basis && r.basis.jeonse) || {};
  const sb = (r.basis && r.basis.sale)   || {};
  const jkb = r.jeonseCalc ? r.jeonseCalc.kbWeight : null;
  const skb = r.saleCalc   ? r.saleCalc.kbWeight   : null;

  // ── 결론 텍스트 ──
  const verdict = hold
    ? { label: "판단 보류",   color: MUTED,  bg: "#f1f5f9", desc: "데이터가 부족해 정확한 분석이 어렵습니다." }
    : r.gapRatio < -0.08
    ? { label: "저평가",      color: GREEN,  bg: "#f0fdf4", desc: "적정가보다 낮은 수준입니다." }
    : r.gapRatio < -0.02
    ? { label: "적정 범위",   color: GREEN,  bg: "#f0fdf4", desc: "적정 범위 안에 있습니다." }
    : r.gapRatio < 0.05
    ? { label: "적정 범위",   color: "#334155", bg: "#f8fafc", desc: "시장 평균에 가까운 수준입니다." }
    : r.gapRatio < 0.12
    ? { label: "고평가 주의", color: AMBER,  bg: "#fffbeb", desc: "적정가보다 다소 높은 수준입니다." }
    : { label: "고평가",      color: RED,    bg: "#fef2f2", desc: "적정가를 크게 상회하는 수준입니다." };

  // ── 데이터 안정성 텍스트 (신뢰도 → 데이터 안정성) ──
  const stability = (() => {
    const g = trust?.grade || "C";
    return {
      A: { label:"높음",     color: GREEN,      reason: `매매 ${r.saleUsed||0}건·전세 ${r.jeonseUsed||0}건 기준. 거래가 충분해 분석 안정성이 높습니다.` },
      B: { label:"보통",     color: "#16a34a",  reason: `매매 ${r.saleUsed||0}건·전세 ${r.jeonseUsed||0}건 기준. 분석에 충분하나 추가 확인을 권장합니다.` },
      C: { label:"낮음",     color: AMBER,      reason: `거래 표본이 적습니다. 결과를 참고용으로만 활용하세요.` },
      D: { label:"매우 낮음",color: RED,        reason: `데이터가 매우 부족합니다. 신중하게 해석하세요.` },
    }[g] || { label:"낮음", color: AMBER, reason: "데이터가 제한적입니다." };
  })();

  // ── 판단 이유 카드 데이터 ──
  const whyCards = (() => {
    const cards = [];
    if (r.saleUsed >= 5) cards.push({ icon:"✅", text:"최근 거래가 충분합니다." });
    else if (r.saleUsed > 0) cards.push({ icon:"⚠️", text:`매매 거래가 적습니다 (${r.saleUsed}건).` });
    if (r.jeonseUsed >= 3) cards.push({ icon:"✅", text:"동일 평형 전세 데이터가 확보됐습니다." });
    else if (r.jeonseUsed > 0) cards.push({ icon:"⚠️", text:`전세 거래가 적습니다 (${r.jeonseUsed}건).` });
    const mode = r.engineMode;
    if (mode === "blend")  cards.push({ icon:"📊", text:"매매·전세 데이터를 혼합해 분석했습니다." });
    if (mode === "sale")   cards.push({ icon:"📊", text:"매매 거래 기준으로 분석했습니다." });
    if (mode === "jeonse") cards.push({ icon:"📊", text:"전세 시세 기준으로 분석했습니다." });
    if (r.isPremium)       cards.push({ icon:"⭐", text:"재건축·학군·희소성 프리미엄이 반영됐습니다." });
    if (jkb != null && jkb >= 0.6) cards.push({ icon:"⚠️", text:"KB시세 의존도가 높습니다. 참고용으로 활용하세요." });
    if (r.dataWarnings?.length > 0) cards.push({ icon:"⚠️", text: r.dataWarnings[0] });
    return cards.slice(0, 4);
  })();

  // ── 체크리스트 항목 ──
  const CHECKLIST = [
    { id:"deals",    icon:"🔍", text:"국토부 실거래가 직접 확인",  sub:"최신 실거래가를 직접 확인하세요",             href:"https://rt.molit.go.kr" },
    { id:"registry", icon:"📋", text:"등기사항 확인",               sub:"대법원 인터넷등기소에서 권리관계 확인",       href:"https://www.iros.go.kr" },
    { id:"building", icon:"🏛️", text:"건축물대장 확인",             sub:"정부24에서 건축물 현황 확인",                href:"https://www.gov.kr" },
    { id:"loan",     icon:"💰", text:"대출 한도 확인",               sub:"실제 대출 가능 금액을 확인하세요",            href: null },
    { id:"contract", icon:"📝", text:"계약 전 체크리스트",          sub:"등기·세금·특약사항 등 최종 점검",            href: null },
  ];

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

  // ─── 섹션 컴포넌트 ───
  const Card = ({ children, style = {} }) => (
    <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${BORDER}`,
      boxShadow:"0 1px 8px rgba(0,0,0,0.05)", marginBottom:12, overflow:"hidden", ...style }}>
      {children}
    </div>
  );

  const SectionTitle = ({ children }) => (
    <p style={{ fontSize:11, fontWeight:600, color:"#94a3b8", letterSpacing:"0.06em",
      textTransform:"uppercase", margin:"0 0 10px", padding:"14px 16px 0" }}>
      {children}
    </p>
  );

  return (
    <div style={{ fontFamily:"-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif", padding:"0 0 32px" }}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ① 현재 가격 판단 — 가장 크게
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card style={{ borderTop:`3px solid ${verdict.color}` }}>
        <div style={{ padding:"20px 16px 16px", background: verdict.bg }}>
          {/* 단지명 */}
          <p style={{ fontSize:12, color:MUTED, margin:"0 0 10px" }}>
            {f.complexName} · {Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}
          </p>

          {/* 결론 레이블 — 최우선 */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%",
              background: verdict.color, flexShrink:0 }} />
            <span style={{ fontSize:26, fontWeight:800, color: verdict.color, letterSpacing:"-0.02em",
              lineHeight:1.1 }}>
              {verdict.label}
            </span>
          </div>
          <p style={{ fontSize:14, color:"#475569", margin:0, lineHeight:1.6 }}>
            {verdict.desc}
          </p>
        </div>

        {/* 등급 배지 */}
        {!hold && (
          <div style={{ padding:"8px 16px", borderTop:`1px solid ${BORDER}`,
            display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#334155" }}>
              {r.buyGrade}등급
            </span>
            <span style={{ fontSize:12, color:MUTED }}>·</span>
            <span style={{ fontSize:12, color:"#64748b" }}>
              {{ A:"매우 저평가", B:"저평가", C:"적정 가격", D:"고평가 주의", E:"고평가" }[r.buyGrade] || ""}
            </span>
            {r.gapRatio != null && (
              <span style={{ marginLeft:"auto", fontSize:12, fontWeight:600,
                color: r.gapRatio < 0 ? GREEN : RED }}>
                {r.gapRatio < 0 ? "▼" : "▲"} {Math.abs(r.gapRatio * 100).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ② 적정가 범위 — 단일 숫자 아닌 범위로
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!provisional && (
        <Card>
          <SectionTitle>적정 가격 범위</SectionTitle>
          <div style={{ padding:"0 16px 16px" }}>
            {/* 범위 강조 */}
            <div style={{ background:"#f0fdf4", borderRadius:12, padding:"14px 16px",
              border:`1px solid #bbf7d0`, marginBottom:12 }}>
              <p style={{ fontSize:12, color:"#166534", margin:"0 0 4px" }}>AI 추정 적정 범위</p>
              <p style={{ fontSize:22, fontWeight:800, color: GREEN, margin:0, letterSpacing:"-0.02em" }}>
                약 {won(fb.conservative)} ~ {won(fb.aggressive)}
              </p>
              <p style={{ fontSize:11, color:"#4ade80", margin:"4px 0 0" }}>
                기준가 {won(fb.base)}
              </p>
            </div>

            {/* 현재가 vs 적정가 비교 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ background: BG, borderRadius:10, padding:"10px 12px",
                border:`1px solid ${BORDER}` }}>
                <p style={{ fontSize:11, color:MUTED, margin:"0 0 4px" }}>현재 시세</p>
                <p style={{ fontSize:17, fontWeight:700, color:"#334155", margin:0 }}>
                  {r.saleMedian ? won(r.saleMedian) : r.saleFair ? won(r.saleFair) : "—"}
                </p>
                <p style={{ fontSize:10, color:MUTED, margin:"2px 0 0" }}>최근 거래 기준</p>
              </div>
              <div style={{ background: BG, borderRadius:10, padding:"10px 12px",
                border:`1px solid ${BORDER}` }}>
                <p style={{ fontSize:11, color:MUTED, margin:"0 0 4px" }}>현재 매물가</p>
                <p style={{ fontSize:17, fontWeight:700, color:"#334155", margin:0 }}>
                  {won(Number(f.currentPrice))}
                </p>
                <p style={{ fontSize:10, color: r.gapRatio < 0 ? GREEN : RED, margin:"2px 0 0", fontWeight:600 }}>
                  적정가 대비 {r.gapRatio < 0 ? "낮음" : "높음"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 판단 보류 카드 */}
      {provisional && (
        <Card>
          <div style={{ padding:"16px", background:"#fffbeb", borderBottom:`1px solid #fde68a` }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#92400e", margin:"0 0 4px" }}>
              ⚠️ {isAbnormal ? "입력값 확인 필요" : "데이터 부족"}
            </p>
            <p style={{ fontSize:12, color:"#b45309", margin:0, lineHeight:1.6 }}>
              {isAbnormal ? "현재가가 시세와 크게 차이납니다. 입력값을 다시 확인해주세요." : r.holdReason}
            </p>
          </div>
          {r.fairPrice && (
            <div style={{ padding:"14px 16px", textAlign:"center" }}>
              <p style={{ fontSize:11, color:MUTED, margin:"0 0 4px" }}>참고가 (신뢰도 낮음)</p>
              <p style={{ fontSize:22, fontWeight:800, color:MUTED, margin:0 }}>{won(r.fairPrice)}</p>
            </div>
          )}
        </Card>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ③ 왜 이렇게 판단했나요? 카드
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {whyCards.length > 0 && (
        <Card>
          <SectionTitle>왜 이렇게 판단했나요?</SectionTitle>
          <div style={{ padding:"0 16px 14px", display:"flex", flexDirection:"column", gap:8 }}>
            {whyCards.map((c, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8,
                background: BG, borderRadius:10, padding:"10px 12px", border:`1px solid ${BORDER}` }}>
                <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{c.icon}</span>
                <p style={{ fontSize:13, color:"#334155", margin:0, lineHeight:1.5 }}>{c.text}</p>
              </div>
            ))}
            {r.headline && (
              <p style={{ fontSize:12, color:"#64748b", margin:"4px 0 0", lineHeight:1.6, paddingLeft:2 }}>
                {r.headline}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ④ 데이터 안정성 (신뢰도 대체)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card>
        <SectionTitle>데이터 안정성</SectionTitle>
        <div style={{ padding:"0 16px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <span style={{ fontSize:17, fontWeight:800, color: stability.color }}>
              {stability.label}
            </span>
            <div style={{ flex:1, height:6, borderRadius:99, background:"#f1f5f9", overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:99, background: stability.color,
                width: { 높음:"100%", 보통:"70%", 낮음:"40%", "매우 낮음":"15%" }[stability.label] || "30%",
                transition:"width 0.5s" }} />
            </div>
          </div>
          <p style={{ fontSize:12, color:"#64748b", margin:0, lineHeight:1.6 }}>
            {stability.reason}
          </p>
        </div>
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ⑤ 주의사항
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card style={{ border:`1px solid #fed7aa` }}>
        <div style={{ padding:"14px 16px", background:"#fffbeb" }}>
          <p style={{ fontSize:12, fontWeight:700, color:"#92400e", margin:"0 0 8px" }}>
            ⚠️ 주의사항
          </p>
          {[
            "최근 실거래 기준 분석입니다. 층·향·수리상태에 따라 실제 거래가는 다를 수 있습니다.",
            "실제 계약 전에는 최신 매물·등기사항·건축물대장을 반드시 함께 확인하시기 바랍니다.",
            "본 결과는 참고용 분석이며 감정평가서·투자자문·매수 권유가 아닙니다.",
          ].map((t, i) => (
            <p key={i} style={{ fontSize:12, color:"#b45309", margin:"4px 0 0", lineHeight:1.6,
              paddingLeft:12, position:"relative" }}>
              <span style={{ position:"absolute", left:0 }}>·</span>
              {t}
            </p>
          ))}
        </div>
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ⑥ 계약 전 체크리스트 (핵심 추가)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Card style={{ border:`1px solid #bfdbfe` }}>
        <div style={{ padding:"14px 16px 6px", borderBottom:`1px solid ${BORDER}` }}>
          <p style={{ fontSize:13, fontWeight:700, color:"#1e40af", margin:0 }}>
            📋 계약 전 확인 체크리스트
          </p>
          <p style={{ fontSize:11, color:MUTED, margin:"3px 0 0" }}>
            계약 전 반드시 확인해야 할 항목들
          </p>
        </div>
        <div style={{ padding:"8px 0" }}>
          {CHECKLIST.map((item) => {
            const done = checkDone[item.id];
            const content = (
              <div
                key={item.id}
                onClick={() => {
                  setCheckDone(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                  if (item.href) window.open(item.href, "_blank", "noopener");
                }}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px",
                  cursor:"pointer", borderBottom:`1px solid ${BORDER}`,
                  background: done ? "#f0fdf4" : "transparent",
                  transition:"background 0.15s" }}>
                {/* 체크박스 */}
                <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                  border: done ? "none" : `2px solid ${BORDER}`,
                  background: done ? GREEN : "transparent",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.2s" }}>
                  {done && (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2 6.5l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                {/* 아이콘 + 텍스트 */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight: done ? 400 : 600,
                    color: done ? "#64748b" : "#1e293b",
                    margin:0, textDecoration: done ? "line-through" : "none",
                    display:"flex", alignItems:"center", gap:6 }}>
                    <span>{item.icon}</span>
                    {item.text}
                  </p>
                  <p style={{ fontSize:11, color:MUTED, margin:"2px 0 0" }}>{item.sub}</p>
                </div>
                {/* 링크 아이콘 */}
                {item.href && !done && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0 }}>
                    <path d="M5.5 2.5H2.5v9h9v-3M8 2.5h3.5v3.5M11.5 2.5L6 8" stroke={MUTED}
                      strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            );
            return content;
          })}
          {/* 완료 메시지 */}
          {Object.values(checkDone).filter(Boolean).length === CHECKLIST.length && (
            <div style={{ padding:"14px 16px", textAlign:"center", background:"#f0fdf4" }}>
              <p style={{ fontSize:13, fontWeight:700, color: GREEN, margin:0 }}>
                ✅ 모든 항목을 확인했습니다!
              </p>
              <p style={{ fontSize:11, color:"#4ade80", margin:"4px 0 0" }}>
                안전한 계약을 위한 준비가 됐어요.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          상세 분석 (접기/펼치기)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <button
        onClick={() => setDetailOpen(v => !v)}
        style={{ width:"100%", background:"#fff", border:`1px solid ${BORDER}`,
          borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"center",
          justifyContent:"space-between", cursor:"pointer", marginBottom:12,
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)", fontSize:13, fontWeight:600,
          color:"#475569" }}>
        상세 분석 보기 (산출 근거 · 분석 방식)
        <span style={{ fontSize:12, color:MUTED }}>{detailOpen ? "접기 ▲" : "펼치기 ▼"}</span>
      </button>

      {detailOpen && (
        <Card>
          {/* 4개 지표 그리드 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1,
            background: BORDER }}>
            {[
              { label:"분석 기준 전세 시세", value: r.jeonseFair ? `${won(r.jeonseFair)} (${r.jeonseUsed}건)` : "—" },
              { label:"분석 기준 매매 시세", value: r.saleFair  ? `${won(r.saleFair)} (${r.saleUsed}건)` : "—" },
              { label:"적정가 산출 방식",    value: r.isPremium ? "프리미엄 반영" : r.modeName || r.engineMode || "—" },
              { label:"전세가율",            value: r.actualRatio ? `${(r.actualRatio*100).toFixed(1)}%` : "—" },
            ].map((row, i) => (
              <div key={i} style={{ background:"#fff", padding:"12px 14px" }}>
                <p style={{ fontSize:11, color:MUTED, margin:"0 0 3px" }}>{row.label}</p>
                <p style={{ fontSize:13, fontWeight:600, color:"#334155", margin:0 }}>{row.value}</p>
              </div>
            ))}
          </div>

          {/* 데이터 경고 */}
          {r.dataWarnings?.length > 0 && (
            <div style={{ padding:"12px 14px", background:"#fffbeb", borderTop:`1px solid ${BORDER}` }}>
              {r.dataWarnings.map((w, i) => (
                <p key={i} style={{ fontSize:12, color:"#b45309", margin: i ? "4px 0 0" : 0 }}>
                  ⚠️ {w}
                </p>
              ))}
            </div>
          )}

          {/* 적정가 범위 3단 */}
          {!provisional && fb && (
            <div style={{ borderTop:`1px solid ${BORDER}` }}>
              <div style={{ padding:"10px 14px 6px", background: BG }}>
                <p style={{ fontSize:11, color:MUTED, margin:0 }}>적정가 범위 (보수 / 기준 / 상단)</p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                gap:1, background: BORDER }}>
                {[
                  { l:"보수 적정가", v: won(fb.conservative), c: GREEN },
                  { l:"기준 적정가", v: won(fb.base),         c: NAVY  },
                  { l:"상단 참고가", v: won(fb.aggressive),   c: AMBER },
                ].map((col, i) => (
                  <div key={i} style={{ background:"#fff", padding:"10px", textAlign:"center" }}>
                    <p style={{ fontSize:10, color:MUTED, margin:"0 0 3px" }}>{col.l}</p>
                    <p style={{ fontSize:14, fontWeight:700, color:col.c, margin:0 }}>{col.v}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:11, color:MUTED, padding:"8px 14px", margin:0 }}>
                상단 참고가는 매수 권장가가 아닙니다.
              </p>
            </div>
          )}

          {/* 기타 배지들 */}
          <div style={{ padding:"12px 14px", borderTop:`1px solid ${BORDER}` }}>
            <DataTrustBadge trust={trust} />
          </div>
          <div style={{ padding:"0 14px 12px" }}>
            <MarketTypeBadge mc={mc} />
          </div>
          <InputWarnings r={r} f={f} />
        </Card>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          하단 CTA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <FairSaveBtn r={r} f={f} onBack={onBack} uid={currentUserId} />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
        <button onClick={onBack}
          style={{ borderRadius:12, border:`1px solid ${BORDER}`, background:"#fff",
            padding:"14px", fontSize:13, fontWeight:600, color:"#475569", cursor:"pointer" }}>
          ← 다시 검색
        </button>
        <button onClick={onNewSearch}
          style={{ borderRadius:12, border:`1px solid #bfdbfe`, background:"#eff6ff",
            padding:"14px", fontSize:13, fontWeight:600, color:"#1d4ed8", cursor:"pointer" }}>
          다른 단지 분석
        </button>
      </div>
      <button onClick={onHome}
        style={{ width:"100%", borderRadius:12, background:"#1e293b", color:"#fff",
          padding:"14px", fontSize:13, fontWeight:600, cursor:"pointer", marginTop:10, border:"none" }}>
        처음으로
      </button>

      {/* AI 안내 */}
      <AiNotice />
    </div>
  );
}

export { FairValueResult };
