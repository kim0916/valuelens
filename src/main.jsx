import "./index.css";
import React, { useState, useRef, useEffect } from "react";

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
const NAVY = "#0f1f3d";
const CONFIG = {
  targetRatio: { 공릉동: 0.61, 노원구: 0.61, 강남구: 0.35, 서초구: 0.35, 송파구: 0.40, 용산구: 0.38, 양천구: 0.45, 목동: 0.45, 분당: 0.45, "성남시 분당구": 0.45, 판교: 0.42, 해운대구: 0.40, default: 0.55 },
  safetyMargin: 0.05,
  grade: { A: -0.15, B: -0.05, C: 0.05, D: 0.15 },
  bubble: { under: -0.1, over: 1.0 },
  shock: { 낮음: { lag: 1, pen: 0, step: 0 }, 보통: { lag: 1, pen: 0.07, step: 0 }, 높음: { lag: 2, pen: 0.15, step: 1 }, 매우높음: { lag: 3, pen: 0.25, step: 2 } },
  ratioBand: { jeonseMin: 0.5, blendMin: 0.45 }, // ≥0.50 전세엔진 / 0.45~0.50 혼합 / <0.45 매매엔진
  dynClamp: { lo: 0.3, hi: 0.85 },               // 동적 전세가율 허용 범위 (고급·대형 저전세가율 수용)
};
const GRADES = ["A", "B", "C", "D", "E"];
const LABEL = { A: "매우 저평가", B: "저평가", C: "적정 가격", D: "다소 고평가", E: "고평가", 보류: "판단 보류" };
const GS = {
  A: { solid: "bg-emerald-600", text: "text-emerald-700" },
  B: { solid: "bg-emerald-500", text: "text-emerald-600" },
  C: { solid: "bg-amber-400", text: "text-amber-700" },
  D: { solid: "bg-orange-500", text: "text-orange-700" },
  E: { solid: "bg-red-600", text: "text-red-700" },
  보류: { solid: "bg-slate-400", text: "text-slate-600" },
};
const won = (m) => (m >= 10000 ? (Math.round((m / 10000) * 100) / 100).toLocaleString() + "억" : Number(m).toLocaleString() + "만원");
const pct = (r) => (r > 0 ? "+" : "") + (r * 100).toFixed(1) + "%";
// 전용면적(㎡) → 통상 분양평형 추정 (한국 분양 관행 매핑). 못 구하면 0.
const typicalPyeong = (sqm) => { sqm = Number(sqm) || 0; if (sqm <= 0) return 0; return Math.round(sqm / 3.3058); };
const exclusivePyeong = (sqm) => { sqm = Number(sqm) || 0; return sqm > 0 ? Math.round((sqm / 3.3058) * 10) / 10 : 0; };
const areaLabel = (sqm) => { sqm = Number(sqm) || 0; return sqm > 0 ? `전용 ${sqm}㎡ · 통상 약 ${typicalPyeong(sqm)}평형` : "면적 미확인"; };
const shift = (g, s) => GRADES[Math.max(0, Math.min(4, GRADES.indexOf(g) - s))];
const ratioOf = (f) => CONFIG.targetRatio[f.dong] ?? CONFIG.targetRatio[f.region] ?? CONFIG.targetRatio.default;

function analyze(f) {
  const regionRatio = ratioOf(f);                 // 지역 기본(0.61) = 보수/폴백
  const jeonseUsed = f.jeonseUsed || 0, saleUsed = f.saleUsed || 0;
  const saleRef = f.saleRef || 0, baseJeonse = f.baseJeonse || 0;
  const actualRatio = saleRef > 0 && baseJeonse > 0 ? Math.round((baseJeonse / saleRef) * 1000) / 1000 : null;

  // 표본 신뢰 등급 (전세 표본 5↑ 정상 / 3~4 보통 / 1~2 낮음 / 0 매우낮음)
  const lvl = (n) => (n >= 5 ? "정상" : n >= 3 ? "보통" : n >= 1 ? "낮음" : "매우낮음");
  const jLevel = lvl(jeonseUsed), sLevel = lvl(saleUsed);
  const jeonseReliable = jeonseUsed >= 3; // 전세 기반 적정가 사용 최소선 (1~2건은 미사용)
  const saleReliable = saleUsed >= 3;

  // 동적 전세가율 (양쪽 표본 충분 + 클램프 범위 내)
  const CL = CONFIG.dynClamp;
  let dynamicRatio = null;
  if (jeonseReliable && saleReliable && actualRatio != null && actualRatio >= CL.lo && actualRatio <= CL.hi) dynamicRatio = actualRatio;

  const jeonseFair = Math.round(baseJeonse / (dynamicRatio ?? regionRatio)); // 전세 기반(동적 우선)
  const conservativePrice = Math.round(baseJeonse / regionRatio);            // 보수(0.61)
  const saleFair = saleRef;                                                   // 매매 정제평균

  // ── 엔진 분기 (실제 전세가율 기준) ──
  const B = CONFIG.ratioBand;
  let engineMode, mainPrice = null, holdReason = null;
  if (!jeonseReliable && !saleReliable) {
    engineMode = "hold"; holdReason = "전세·매매 실거래 표본이 모두 부족합니다";
  } else if (actualRatio == null) {
    if (jeonseReliable) { engineMode = "jeonse"; mainPrice = jeonseFair; }
    else { engineMode = "hold"; holdReason = "전세 표본 부족 · 매매 시세 없음"; }
  } else if (actualRatio >= B.jeonseMin) {              // ≥0.50 → 전세 엔진
    if (jeonseReliable) { engineMode = "jeonse"; mainPrice = jeonseFair; }
    else if (saleReliable) { engineMode = "sale"; mainPrice = saleFair; }
    else { engineMode = "hold"; holdReason = "전세 표본 부족"; }
  } else if (actualRatio >= B.blendMin) {              // 0.45~0.50 → 혼합
    if (jeonseReliable && saleReliable) { engineMode = "blend"; mainPrice = Math.round((jeonseFair + saleFair) / 2); }
    else if (saleReliable) { engineMode = "sale"; mainPrice = saleFair; }
    else if (jeonseReliable) { engineMode = "jeonse"; mainPrice = jeonseFair; }
    else { engineMode = "hold"; holdReason = "표본 부족"; }
  } else {                                              // <0.45 → 매매 엔진 (전세 부적합)
    if (saleReliable) { engineMode = "sale"; mainPrice = saleFair; }
    else { engineMode = "hold"; holdReason = "전세가율이 낮아 전세 기반 적정가가 부적합하고, 매매 표본도 부족합니다"; }
  }

  const fairPrice = mainPrice ?? (saleReliable ? saleFair : jeonseFair); // 표시 대표값
  const safetyPrice = Math.round(fairPrice * (1 - CONFIG.safetyMargin));
  const gapRatio = engineMode === "hold" || !mainPrice ? 0 : Math.round(((f.currentPrice - mainPrice) / mainPrice) * 10000) / 10000;

  // 매매 엔진일 때 '왜 전세가율이 낮은가' 분류 (재건축 노후 vs 신축 고급). 연식 필요.
  const age = f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : null;
  let saleType = null, saleNote = null;
  if (engineMode === "sale" || engineMode === "blend") {
    if (age != null && age >= 28) { saleType = "redev"; saleNote = `재건축 기대가 반영된 시세입니다. 전세 기반 실사용 가치(약 ${won(jeonseFair)})와 괴리가 크고, 재건축 진행·무산·분담금 리스크가 가격에 내재돼 있습니다. 아래 등급은 '시장 시세 대비' 판단이며 내재가치 기준이 아닙니다.`; }
    else if (age != null && age <= 12) { saleType = "premium"; saleNote = `전세가율이 낮은 신축·고급 단지입니다. 매매 시세가 실사용 가치를 앞서며, 등급은 시장 시세 추종 판단입니다.`; }
    else { saleType = "generic"; saleNote = `전세가율이 낮은 편이라 매매 비중을 높여 판단했습니다.${age == null ? " (연식 미입력 — 재건축 여부 판별 불가)" : ""}`; }
  }
  let bubbleIndex = null;
  if (f.m) {
    const sr = f.m.regionSaleGrowth ? f.m.saleGrowth / f.m.regionSaleGrowth : 0;
    const jr = f.m.regionJeonseGrowth ? f.m.jeonseGrowth / f.m.regionJeonseGrowth : 0;
    bubbleIndex = Math.round((sr - jr) * 1000) / 1000;
  }
  const sh = CONFIG.shock[f.shockLevel] ?? CONFIG.shock.보통;

  // ── 데이터 신뢰도(입력 표본 품질) vs 모델 신뢰도(엔진 적합도) 분리 ──
  const ord = { 정상: 0, 보통: 1, 낮음: 2, 매우낮음: 3 };
  const worse = (a, b) => (ord[a] >= ord[b] ? a : b);
  const mainLevel = engineMode === "sale" ? sLevel : engineMode === "blend" ? worse(jLevel, sLevel) : jLevel;
  const jc = f.jeonseCalc, sc = f.saleCalc;
  const mainCalc = engineMode === "sale" ? sc : engineMode === "blend" ? (ord[jLevel] >= ord[sLevel] ? jc : sc) : jc;
  const exclRatio = mainCalc && mainCalc.total ? mainCalc.excluded / mainCalc.total : 0;
  const kbW = mainCalc ? mainCalc.kbWeight || 0 : 0;
  let dataConf = ({ 정상: 88, 보통: 62, 낮음: 38, 매우낮음: 15 }[mainLevel] ?? 30);
  const samplePen = Math.max(Math.min(exclRatio, 0.5) * 0.4, kbW * 0.5); // 표본부족 페널티 1회만 (제외비율·KB가중 중 큰 쪽)
  dataConf = Math.round(dataConf * (1 - samplePen));
  if (f.dataSource === "ai") dataConf = Math.round(dataConf * 0.85); // AI 수집은 미검증이라 할인
  dataConf = Math.max(8, Math.min(95, dataConf));

  // ── 판단 보류 강화 ──
  if (engineMode !== "hold") {
    if (Math.abs(gapRatio) > 0.5) { engineMode = "hold"; holdReason = "입력 매물가가 정제 시세와 ±50% 이상 차이나 입력 오류가 의심됩니다"; }
    else if (dataConf < 28) { engineMode = "hold"; holdReason = "유효 표본·데이터 신뢰도가 낮아 판단을 보류합니다"; }
    else if (exclRatio > 0.6) { engineMode = "hold"; holdReason = "실거래 편차가 커 이상치 제외 비율이 과도합니다"; }
  }
  const isHold = engineMode === "hold";

  // 모델 신뢰도 (엔진이 이 케이스를 얼마나 잘 설명하는가)
  let modelConf = 82;
  if ((engineMode === "jeonse" || engineMode === "blend") && dynamicRatio == null) modelConf = Math.round(modelConf * 0.8);
  if (engineMode === "blend") modelConf = Math.round(modelConf * 0.85);
  if (saleType === "redev") modelConf = Math.round(modelConf * 0.85);   // 재건축 위험은 적합도가 아니라 MarketRisk로 처리
  else if (saleType === "premium") modelConf = Math.round(modelConf * 0.90);
  if (sh.step > 0) modelConf = Math.round(modelConf * (1 - sh.pen));
  if (!isHold) modelConf = Math.max(modelConf, 50); // 곱셈 누적 과도 방지: 비보류 분석 적합도 하한
  if (isHold) modelConf = Math.min(modelConf, 22);
  modelConf = Math.max(8, Math.min(95, modelConf));

  // 종합 신뢰도 (약한 쪽에 가중)
  let conf = isHold ? Math.min(dataConf, modelConf, 25) : Math.round(Math.min(dataConf, modelConf) * 0.65 + Math.max(dataConf, modelConf) * 0.35);
  conf = Math.max(8, conf);
  const lblOf = (v) => (v >= 70 ? "높음" : v >= 50 ? "보통" : v >= 32 ? "낮음" : "매우낮음");
  const confLabel = lblOf(conf), dataConfLabel = lblOf(dataConf), modelConfLabel = lblOf(modelConf);

  // ── 등급 ──
  const gradeOf = (gap) => gap <= CONFIG.grade.A ? "A" : gap <= CONFIG.grade.B ? "B" : gap <= CONFIG.grade.C ? "C" : gap <= CONFIG.grade.D ? "D" : "E";
  let buyGrade, gradeLabel;
  if (isHold) { buyGrade = "보류"; gradeLabel = "판단 보류"; }
  else {
    let g = gradeOf(gapRatio);
    if (bubbleIndex != null && engineMode !== "sale") { if (bubbleIndex <= CONFIG.bubble.under) g = shift(g, 1); else if (bubbleIndex >= CONFIG.bubble.over) g = shift(g, -1); }
    if (sh.step > 0) g = shift(g, -sh.step);
    buyGrade = g; gradeLabel = LABEL[g];
  }

  const ceiling = Math.min(f.currentPrice, fairPrice);
  const negotiation = { start: Math.round(ceiling * 0.96), max: Math.round(ceiling) };
  const discount = Math.max(0, Math.min(100, Math.round(50 - gapRatio * 200)));
  const shockScore = { 낮음: 100, 보통: 70, 높음: 45, 매우높음: 25 }[f.shockLevel] ?? 70;
  const priceHealthScore = isHold ? null : Math.round(discount * 0.5 + conf * 0.3 + shockScore * 0.2);

  const modeName = { jeonse: "전세 기반 엔진", blend: "혼합 엔진", sale: "매매 정제평균 엔진", hold: "판단 보류" }[engineMode];
  const ratioNote = actualRatio != null ? `실제 전세가율 ${actualRatio} → ${modeName}${dynamicRatio ? ` (동적 전세가율 ${dynamicRatio} 적용)` : engineMode === "jeonse" || engineMode === "blend" ? ` (지역 기본 ${regionRatio} 적용)` : ""}` : `매매 시세 없음 · ${modeName}`;

  // ── 추천 이유 3줄 ──
  const reasons = [];
  if (isHold) {
    reasons.push(`판단 보류 — ${holdReason}`);
    reasons.push(`전세 실거래 ${jeonseUsed}건 · 매매 실거래 ${saleUsed}건 (유효 표본 5건 이상 권장)`);
    reasons.push(`현재가 ${won(f.currentPrice)}는 등급 없이 참고 시세로만 비교하세요`);
  } else {
    const gp = Math.abs(gapRatio * 100).toFixed(1);
    reasons.push(`${modeName} 적정가 ${won(fairPrice)} 대비 현재가 ${won(f.currentPrice)} — ${gapRatio < 0 ? gp + "% 저렴" : gp + "% 비쌈"}`);
    if (saleType === "redev") reasons.push(`재건축 기대가 가격에 반영됨 — 전세 실사용가치 ${won(jeonseFair)}와 큰 괴리, 사업 무산·분담금 리스크 내재`);
    else if (saleType === "premium") reasons.push(`신축·고급 단지로 전세가율이 낮아 매매 시세를 기준으로 판단`);
    else if (engineMode === "jeonse") reasons.push(`전세가율 ${actualRatio} 정상권 — 전세 기반 적정가 신뢰 가능`);
    else reasons.push(`전세가율 ${actualRatio} 경계 — 전세·매매 혼합 기준`);
    reasons.push(`데이터 신뢰도 ${dataConfLabel} · 시장충격 ${f.shockLevel}`);
  }

  // ── 적정가 산출 근거 ──
  const basis = { jeonse: jc ? { value: jc.value, used: jc.used, excluded: jc.excluded, total: jc.total } : null, sale: sc ? { value: sc.value, used: sc.used, excluded: sc.excluded, total: sc.total } : null, ratioUsed: dynamicRatio ?? (engineMode === "jeonse" || engineMode === "blend" ? regionRatio : null), ratioKind: dynamicRatio ? "실측 동적" : (engineMode === "jeonse" || engineMode === "blend" ? "지역 기본" : null), steps: [] };
  if (!isHold) {
    if (engineMode === "jeonse") basis.steps = [`전세 정제평균 ${won(baseJeonse)} (사용 ${jeonseUsed}건)`, `÷ 전세가율 ${dynamicRatio ?? regionRatio} (${dynamicRatio ? "실측 동적" : "지역 기본"})`, `= 전세 기반 적정가 ${won(fairPrice)}`];
    else if (engineMode === "sale") basis.steps = [`매매 정제평균 ${won(saleFair)} (사용 ${saleUsed}건)`, `전세 기반 참고가 ${won(jeonseFair)} — 전세가율 낮아 메인 미사용`, `= 매매 기준 적정가 ${won(fairPrice)}`];
    else basis.steps = [`전세 기반 ${won(jeonseFair)} · 매매 정제 ${won(saleFair)}`, `경계 전세가율 ${actualRatio} → 두 값 평균`, `= 혼합 적정가 ${won(fairPrice)}`];
  }

  let headline;
  if (engineMode === "hold") headline = "현재 데이터로는 판단을 보류합니다";
  else if (engineMode === "sale") headline = gapRatio > CONFIG.grade.C ? "매매 시세 대비 다소 높습니다" : gapRatio < CONFIG.grade.B ? "매매 시세 대비 저렴한 편입니다" : "매매 시세 수준입니다";
  else headline = gapRatio > CONFIG.grade.D ? "현재 가격은 적정가 대비 높습니다" : gapRatio > CONFIG.grade.C ? "협상 후 접근이 적절합니다" : "현재 가격은 적정가 수준입니다";
  if (saleType === "redev") headline = "재건축 기대가 반영된 시세입니다";

  const explain = engineMode === "hold"
    ? { valuation: `${holdReason}. 이번 분석은 등급을 산출하지 않으며 참고용으로만 사용하세요.`, review: `전세 표본 ${jeonseUsed}건 · 매매 표본 ${saleUsed}건. 표본이 5건 이상 쌓이면 정상 판정이 가능합니다.`, negotiation: `${saleReliable ? `매매 정제평균(${won(saleFair)})` : jeonseReliable ? `전세 기반 참고가(${won(jeonseFair)})` : "참고 시세"}는 협상의 출발선 정도로만 보세요.` }
    : { valuation: `${ratioNote}. 현재 매물가(${won(f.currentPrice)})는 엔진 산출 적정가(${won(mainPrice)})보다 약 ${Math.abs(gapRatio * 100).toFixed(1)}% ${gapRatio < 0 ? "낮은" : "높은"} 수준입니다.`, review: engineMode === "sale" ? `이 단지는 전세가율이 낮아 전세 기반 적정가(참고 ${won(conservativePrice)})를 메인으로 쓰지 않고 매매 정제평균을 기준으로 판단했습니다.` : `보수 기준가(${won(conservativePrice)}) 대비로는 ${f.currentPrice > conservativePrice ? "다소 높은" : "낮은"} 편입니다. 안전마진 고려 시 ${won(safetyPrice)} 이하에서 부담이 낮아집니다.`, negotiation: `협상은 ${won(negotiation.start)} 선에서 시작해 ${won(negotiation.max)} 이내에서 마무리하는 접근을 참고하세요.` };

  return {
    engineMode, modeName, holdReason, fairPrice, jeonseFair, saleFair, conservativePrice, actualRatio, dynamicRatio, regionRatio,
    jLevel, sLevel, mainLevel, jeonseUsed, saleUsed, age, saleType, saleNote, safetyPrice, gapRatio, buyGrade, gradeLabel, headline, bubbleIndex,
    confidenceScore: conf, confLabel, dataConf, dataConfLabel, modelConf, modelConfLabel, reasons, basis, ratioNote, negotiation, priceHealthScore, shock: { level: f.shockLevel, lag: sh.lag }, explain,
  };
}
// 매도 모드: 추천 매도가를 '생성'하지 않고, 사용자의 희망 매도가가 적정가 대비 타당한지 '평가'만 한다.
function sellVerdict(r) {
  if (r.engineMode === "hold") return { key: "HOLD", label: "판단 보류", tone: "amber", advice: `${r.holdReason}. 호가 적정성을 평가하기엔 데이터가 부족합니다.` };
  const g = r.gapRatio; // (희망 매도가 - 적정가) / 적정가
  if (g > 0.10) return { key: "HIGH", label: "호가가 높음", tone: "red", advice: "적정가보다 10% 이상 높습니다. 매도까지 오래 걸리거나 거래가 안 될 수 있어요. 문의가 없으면 호가를 단계적으로 낮추는 전략이 필요합니다." };
  if (g > 0.03) return { key: "ABIT", label: "약간 높음", tone: "amber", advice: "적정가보다 다소 높습니다. 시장이 강하면 시도해볼 만하지만, 문의가 적으면 조정 여지를 두세요." };
  if (g >= -0.03) return { key: "FAIR", label: "적정 호가", tone: "emerald", advice: "적정가 수준의 호가입니다. 무난하게 거래될 가능성이 높습니다." };
  if (g >= -0.10) return { key: "LOW", label: "시세보다 낮음", tone: "blue", advice: "적정가보다 낮게 내놓는 호가입니다. 빨리 팔리지만 시세 대비 손해일 수 있어요. 급하지 않다면 호가를 올릴 여지가 있습니다." };
  return { key: "TOOLOW", label: "지나치게 낮음", tone: "blue", advice: "적정가 대비 10% 이상 낮습니다. 급매가 아니라면 호가를 재검토하세요." };
}


// ════════ SELL DECISION ENGINE ════════ (적정가 결과 r을 참고만 함 — 적정가 계산식 불변)
// sellVerdict는 '호가 적정성'만 판단하는 보조 함수로 격하. 최종 매도 판단은 analyzeSellerDecision이 담당.
function analyzeSellerDecision(f, r) {
  const mc = classifyApartmentMarket(f, r);
  const hold = r.engineMode === "hold";
  const isLowData = mc.specialMarketType === "lowData", isAbnormal = mc.specialMarketType === "abnormalInput";
  const isSpecial = ["redevelopment", "primePremium", "investmentPremium", "policyDriven"].includes(mc.specialMarketType);
  const provisional = hold || isLowData || isAbnormal;
  const v = sellVerdict(r); // 호가 적정성(보조)

  const desired = Number(f.currentPrice) || 0; // 희망 매도가
  const refPrice = isSpecial ? (mc.marketReferencePrice || r.fairPrice || 0) : (r.fairPrice || 0);
  const gapVsRef = refPrice ? (desired - refPrice) / refPrice : 0;
  const gapVsIntrinsic = mc.intrinsicFairPrice ? (desired - mc.intrinsicFairPrice) / mc.intrinsicFairPrice : null;
  const askingLevel = gapVsRef > 0.10 ? "호가 높음" : gapVsRef > 0.03 ? "약간 높음" : gapVsRef >= -0.03 ? "적정 호가" : gapVsRef >= -0.10 ? "낮은 호가" : "급매 수준";


  // ── 분석 적합도 (매수엔진과 동일 정의) ──
  const fitFloor = { redevelopment: 65, primePremium: 70, investmentPremium: 65, policyDriven: 65, semiPremium: 70 }[mc.specialMarketType];
  const fitScore = fitFloor != null ? Math.max(r.modelConf, fitFloor) : r.modelConf;
  const fitLabel = fitScore >= 80 ? "높음" : fitScore >= 60 ? "보통" : fitScore >= 40 ? "낮음" : "매우낮음";

  // ── 리스크 레이어 (매도 관점) ──
  const supplyRisk = calculateSupplyShock(f);       // TODO(API): 한국부동산원 입주물량
  const policyRisk = calculatePolicyRisk(f);        // TODO(API): 정비사업·토허제
  const opp = analyzeOpportunitySignals(f);         // TODO(API): 호재/악재 (적정가 미반영, 매도판단 보조)

  // ── MarketRisk 등급 (재사용) ──
  const mrLevel = provisional ? "평가 불가" : mc.specialMarketType === "investmentPremium" ? "매우높음" : isSpecial ? "높음" : mc.specialMarketType === "semiPremium" ? "보통" : (supplyRisk.level === "높음" ? "보통" : "낮음");

  // ── 매도 타이밍 (시점 요인만: 호재/악재 + 재건축 단계) — 공급·정책·프리미엄·가격은 다른 항목에서 1회만 반영 ──
  let t = 50;
  if (opp.opportunityLevel === "호재 우세") t -= 12; else if (opp.opportunityLevel === "악재 우세") t += 8;
  if (mc.specialMarketType === "redevelopment") { if (mc.stageScore < 40) t += 8; else if (mc.stageScore >= 85) t -= 14; }
  const sellTimingScore = clamp(Math.round(t), 5, 95);
  const sellTimingLabel = sellTimingScore >= 65 ? "매도 유리" : sellTimingScore >= 55 ? "매도 검토" : sellTimingScore >= 45 ? "중립" : sellTimingScore >= 35 ? "보유 유리" : "보유 검토";

  // ── 세후 실수령액 ── TODO(API): 보유·거주기간·세대수 정밀 반영
  const acq = Number(f.acqPrice) || (r.fairPrice ? Math.round(r.fairPrice * 0.8) : 0);
  const acqEstimated = !Number(f.acqPrice);
  const holdYears = Number(f.holdingYears) || 5;
  const oneHouse = f.oneHouse !== false, lived = f.lived !== false;
  const loanBalance = Number(f.loanBalance) || 0;
  const tax = (!provisional && desired) ? cgTax({ buy: acq, sell: desired, years: holdYears, oneHouse, lived }) : null;
  const brokerage = desired ? Math.round(desired * 0.004) : 0, otherCost = 200; // 기타비용 매수/매도 200만으로 통일(등기·중개부대·이사 등 개략)
  const capitalGain = Math.max(0, desired - acq);
  const afterTaxCash = desired ? desired - (tax ? tax.tax : 0) - brokerage - otherCost : 0;
  const netProceeds = afterTaxCash - loanBalance;
  const taxBurden = desired ? (tax ? tax.tax : 0) / desired : 0;
  const afterTaxScore = clamp(Math.round(82 - taxBurden * 280), 20, 95);

  // ── 보유 리스크 (공급·정책·프리미엄·재건축초기를 여기 1곳에서만 반영) ──
  let holdingRisk = 28; const riskBits = [];
  if (supplyRisk.level === "높음") { holdingRisk += 20; riskBits.push("공급 부담"); }
  if (policyRisk.level === "높음") { holdingRisk += 12; riskBits.push("정책 리스크"); }
  if (isSpecial && mc.premiumRatio > 0.6) { holdingRisk += 18; riskBits.push("프리미엄 과다"); }
  if (mc.specialMarketType === "redevelopment" && mc.stageScore < 40) { holdingRisk += 12; riskBits.push("재건축 초기 불확실성"); }
  holdingRisk = clamp(holdingRisk, 5, 95);

  // ── 거래 가능성 (유동성) — "가격이 적절한가"와 별개로 "실제로 팔릴 가능성". mock/AI 추정값 ──
  // TODO(API): 웹앱 전환 시 아래 실데이터로 대체
  //   - 국토부 실거래가 API 최근 거래량(3·6개월) / 동일 평형 최근 거래 횟수
  //   - 네이버부동산·호갱노노·직방 매물 호가 / 매물 수
  //   - KB시세 / 한국부동산원 거래량 통계
  const challengeAsk = isSpecial ? (refPrice + (mc.premiumAmount || 0) * 0.2) : refPrice * 1.05; // 참고 매도가 범위 상단(도전 호가)
  let liq = 72; const liqReasons = [];
  // 1) 최근 거래량 추정 (mock: 공급위험 높은 지역은 거래 회전 둔화)
  liq += supplyRisk.level === "높음" ? -10 : supplyRisk.level === "보통" ? -4 : 4;
  if (supplyRisk.level === "높음") liqReasons.push("공급 부담 지역 — 거래량 둔화 추정");
  // 2) 동일 평형 매물 경쟁 추정 (mock: 특수·투자수요 단지는 매수자 풀 제한)
  if (mc.specialMarketType === "investmentPremium") { liq -= 10; liqReasons.push("투자수요 의존 — 매수자 풀 제한"); }
  else if (isSpecial) { liq -= 6; liqReasons.push("특수시장 — 매수자 풀 상대적으로 좁음"); }
  // 3) 희망가 vs 최근 실거래(시세) 기준 차이
  if (gapVsRef > 0.10) { liq -= 22; liqReasons.push("희망가가 시세 기준 +10% 초과 — 매수 외면 가능"); }
  else if (gapVsRef > 0.05) { liq -= 12; liqReasons.push("희망가가 시세보다 다소 높음"); }
  else if (gapVsRef < -0.05) { liq += 8; liqReasons.push("시세 대비 낮은 호가 — 거래 유리"); }
  // 4) 희망가 vs 참고 매도가 범위 상단(도전 호가) 차이
  if (desired > challengeAsk * 1.02) { liq -= 15; liqReasons.push("참고 상단 호가를 넘는 가격 — 거래 어려움"); }
  // 5) 가격대
  if (desired > 250000) { liq -= 12; liqReasons.push("초고가 구간 — 수요층 한정"); }
  else if (desired > 150000) liq -= 5;
  // 6) 시장 위험도
  if (mrLevel === "매우높음") liq -= 8; else if (mrLevel === "높음") liq -= 4;
  const liquidityScore = clamp(Math.round(liq), 5, 98);
  const liquidityLevel = liquidityScore >= 80 ? "빠른 거래 가능" : liquidityScore >= 60 ? "보통" : liquidityScore >= 40 ? "거래 지연 가능" : "거래 어려움";
  const liquidityDelayCause = liqReasons.length ? liqReasons.slice(0, 2).join(" · ") : "특이 지연 요인 없음 — 통상 수준 추정";
  const liquidityNeedAdjust = gapVsRef > 0.05 || desired > challengeAsk * 1.02; // 호가 조정 필요 여부

  // ── 대체 전략 / 갈아타기 ──
  const purpose = f.sellPurpose || "현금화";
  let altScore = 55;
  if (netProceeds > 0) altScore += 10;
  if (purpose === "갈아타기") altScore += (netProceeds > desired * 0.3 ? 8 : -6);
  if (purpose === "투자금 회수" && capitalGain > 0) altScore += 6;
  const altStrategyScore = clamp(altScore, 10, 90);
  const opportunityCost = gapVsRef < -0.07 ? "지금 매도 시 시세 대비 낮은 가격 — 보유 시 회복 여력 참고" : (opp.opportunityLevel === "호재 우세" ? "보유 시 호재 반영 여력 존재 — 조기 매도 기회비용 있음" : "보유 추가 상승 여력은 제한적 — 현금화·재투자 검토 가능");

  // ── 가격 점수(매도 관점: 고평가일수록 매도 가점 — 가격은 여기서만 반영) ──
  const priceSellScore = clamp(Math.round(50 + gapVsRef * 250), 5, 95);
  const confScore = Math.round((r.dataConf + fitScore) / 2);

  // ── sellScore (가격25·보유리스크20·세후15·타이밍15·거래10·대체10·신뢰5 = 100) — 각 요인 1회만 반영 ──
  const sellScore = Math.round(priceSellScore * 0.25 + holdingRisk * 0.20 + afterTaxScore * 0.15 + sellTimingScore * 0.15 + liquidityScore * 0.10 + altStrategyScore * 0.10 + confScore * 0.05);

  // ── 보유 vs 매도 (sellScore 복사 아님 — 보유측/매도측 요인 집계) ──
  const sellSide = (gapVsRef > 0.05 ? 1 : 0) + (holdingRisk >= 55 ? 1 : 0) + (sellTimingScore >= 60 ? 1 : 0) + (taxBurden < 0.03 ? 1 : 0);
  const holdSide = (gapVsRef < -0.05 ? 1 : 0) + (opp.opportunityLevel === "호재 우세" ? 1 : 0) + (mc.specialMarketType === "redevelopment" && mc.stageScore >= 85 ? 1 : 0) + (lived ? 1 : 0);
  const holdingVsSellingResult = provisional ? "판단 보류" : sellSide > holdSide ? "매도 쪽 우세" : holdSide > sellSide ? "보유 쪽 우세" : "중립";
  const holdingVsSellingNote = provisional ? "데이터·입력값 보강 후 비교 가능" : `매도측 요인 ${sellSide}개 vs 보유측 요인 ${holdSide}개 — ` + (sellSide > holdSide ? "세후 실수령·거래 가능성을 확인하고 매도를 검토하세요." : holdSide > sellSide ? "급하지 않다면 보유 관점이 우세합니다." : "어느 한쪽이 뚜렷하지 않아 목적·자금 상황으로 결정하세요.");

  // ── 최종 판단 ──
  let finalSellDecision, sellerAction;
  if (provisional) { finalSellDecision = "판단 보류"; sellerAction = isAbnormal ? "희망 매도가 입력 오류 가능성 — 값 확인 후 재평가하세요" : "실거래·시세 데이터 부족 — 보강 후 재평가하세요"; }
  else {
    finalSellDecision = sellScore >= 80 ? "매도 여건 양호" : sellScore >= 65 ? "매도 검토" : sellScore >= 50 ? (gapVsRef > 0.05 ? "가격 조정 후 매도" : "보유 검토") : sellScore >= 35 ? "보유 유지" : "보유 검토";
    if (mc.specialMarketType === "redevelopment" && mc.stageScore >= 85) finalSellDecision = "보유 유지"; // 후기 단계 = 고위험 보유
    const purposeNote = { "갈아타기": "갈아타기 자금·상급지 추가자금을 함께 점검하세요", "현금화": "현금화 시 세후 실수령액 기준으로 판단하세요", "손실 축소": "손실 축소가 목적이면 거래 가능성·호가 조정 폭을 우선 보세요", "세금 절감": "비과세·장기보유공제 요건(보유·거주기간)을 확인하세요", "투자금 회수": "양도차익과 세후 실수령액을 함께 보세요", "전세 전환 고민": "매도 대신 전세 전환 시 보증금·역전세 위험을 비교하세요" }[purpose] || "";
    sellerAction = ({ "매도 여건 양호": "여건상 매도에 우호적입니다. 참고 호가 범위에서 시작해 거래 가능성을 보세요", "매도 검토": "매도를 검토할 만합니다. 세후 실수령액과 거래 가능성을 확인하세요", "가격 조정 후 매도": "호가가 높습니다. 참고 범위로 조정하면 거래 가능성이 올라갑니다", "보유 유지": "지금은 보유가 더 유리해 보입니다. 리스크 변화 시 재평가하세요", "보유 검토": "급하지 않다면 시장 흐름을 보며 시기를 살피는 것도 방법입니다" }[finalSellDecision] || "") + (purposeNote ? ` · ${purposeNote}` : "");
  }

  // ── 참고 매도가 범위 ──
  const base = isSpecial ? (mc.marketReferencePrice || r.fairPrice || 0) : (r.fairPrice || 0);
  const recommendedAskingRange = isSpecial
    ? { fast: Math.round(base * 0.97), real: Math.round(base), challenge: Math.round(base + (mc.premiumAmount || 0) * 0.2) }
    : { fast: Math.round(base * 0.97), real: Math.round(base), challenge: Math.round(base * 1.05) };

  // ── 매도 이유 5개 ──
  const sellerReasons = [];
  if (isSpecial) sellerReasons.push(`[가격] 희망 매도가 ${won(desired)} — 시장 기준가 ${won(refPrice)} 대비 ${gapVsRef >= 0 ? "+" : ""}${(gapVsRef * 100).toFixed(1)}%${gapVsIntrinsic != null ? ` · 실사용 적정가 ${won(mc.intrinsicFairPrice)} 대비 +${(gapVsIntrinsic * 100).toFixed(0)}%` : ""}`);
  else sellerReasons.push(`[가격] 희망 매도가 ${won(desired)} — 적정가 ${won(refPrice)} 대비 ${gapVsRef >= 0 ? "+" : ""}${(gapVsRef * 100).toFixed(1)}% (${askingLevel})`);
  sellerReasons.push(provisional || !tax ? "[세후] 세후 실수령액은 데이터 보강 후 계산됩니다 (취득가·보유기간 입력 시 정밀)" : `[세후] 세금·중개·대출상환 차감 후 약 ${won(netProceeds)} 남습니다 (양도세 ${won(tax.tax)} 추정${acqEstimated ? " · 취득가 추정" : ""})`);
  sellerReasons.push(`[보유] 보유 리스크 ${holdingRisk >= 60 ? "높음" : holdingRisk >= 40 ? "보통" : "낮음"}${riskBits.length ? ` (${riskBits.join("·")})` : ""} · 금리 상승 시 부담 증가 가능`);
  sellerReasons.push(`[시장] 매도 타이밍 ${sellTimingLabel} · 거래 가능성 ${liquidityLevel} · 시장 위험도 ${mrLevel}`);
  if (isSpecial) sellerReasons.push(`[전략] 이 단지는 일반 적정가보다 프리미엄과 시장 위험을 분리해 해석해야 합니다 · ${opportunityCost}`);
  else sellerReasons.push(`[전략] 매도 목적 ‘${purpose}’ · ${opportunityCost}`);

  return {
    mc, isSpecial, provisional, sellVerdict: v,
    desired, refPrice, gapVsRef, gapVsIntrinsic, askingLevel,
    sellScore, finalSellDecision, sellerAction,
    sellTimingScore, sellTimingLabel,
    afterTaxCash, netProceeds, capitalGain, tax, brokerage, otherCost, loanBalance, acq, acqEstimated, afterTaxScore,
    holdingRisk, riskBits, holdingVsSellingResult, holdingVsSellingNote,
    liquidityScore, liquidityLevel, liquidityDelayCause, liquidityNeedAdjust, opportunityCost,
    altStrategyScore, purpose, recommendedAskingRange,
    dataConfidence: r.dataConf, dataConfLabel: r.dataConfLabel, fitScore, fitLabel, marketRiskLevel: mrLevel,
    supplyRisk, policyRisk, opportunity: opp, sellerReasons,
  };
}

// ── 취득세 (1주택 기준 누진, 만원) — 교육세·농특세 개략 포함 ──
// ── 취득세 (개략 추정, 만원) — 주택수·조정지역·85㎡·생애최초·교육세·농특세 반영 ──
function acqStdRate(price) { // 1주택 표준 누진 (6억 이하 1% / 6~9억 1~3% / 9억 초과 3%)
  if (price <= 60000) return 0.01;
  if (price <= 90000) return clamp(Math.round(((price / 10000) * (2 / 3) - 3) / 100 * 1000) / 1000, 0.01, 0.03);
  return 0.03;
}
function acqTax(price, area85over = false, houses = 1, regulated = false, firstTime = false) {
  price = Math.max(0, Number(price) || 0); // 음수·비정상 입력 가드
  let rate;
  if (houses >= 4) rate = 0.12;
  else if (houses >= 3) rate = regulated ? 0.12 : 0.08;
  else if (houses >= 2) rate = regulated ? 0.08 : acqStdRate(price);
  else rate = acqStdRate(price);
  let main = Math.round(price * rate);
  let firstHomeDiscount = 0;
  if (houses <= 1 && firstTime && price <= 120000) { firstHomeDiscount = Math.min(main, 200); main -= firstHomeDiscount; } // 생애최초 200만 한도 감면(개략)
  const edu = rate <= 0.03 ? Math.round(main * 0.1) : Math.round(price * 0.004);            // 지방교육세 개략
  const farm = area85over ? (rate >= 0.08 ? Math.round(price * 0.006) : Math.round(price * 0.002)) : 0; // 농특세(85㎡ 초과)
  return { rate, main, edu, farm, firstHomeDiscount, total: main + edu + farm };
}

// ── 양도세 (1세대 1주택 중심 개략 추정, 만원) — 12억 비과세·거주요건·장특공(보유+거주)·기본공제·지방세·단기중과 ──
function cgTax({ buy, sell, years = 3, oneHouse = true, lived = true, livedYears = null, expenses = 0, acquiredRegulated = false, houses = null }) {
  const hc = houses != null ? houses : (oneHouse ? 1 : 2);
  const is1 = oneHouse && hc <= 1;
  const gain = Math.max(0, sell - buy - (expenses || 0));
  if (gain === 0) return { gain: 0, over: 0, ltd: 0, taxable: 0, baseTax: 0, localTax: 0, tax: 0, exempt: false, statusMsg: "양도차익이 없어 납부할 양도세가 없는 것으로 추정됩니다.", note: "양도차익 없음(필요경비 차감 후)" };
  // 단기 보유 중과 (2년 미만)
  if (years < 2) {
    const rate = years < 1 ? 0.70 : 0.60;
    const taxable = Math.max(0, gain - 250);
    const baseTax = Math.round(taxable * rate), localTax = Math.round(baseTax * 0.1);
    const statusMsg = `보유 ${years}년 — 2년 미만 단기보유 중과세율(${Math.round(rate * 100)}%) 적용 추정`;
    return { gain, over: gain, ltd: 0, taxable, baseTax, localTax, tax: baseTax + localTax, shortTerm: true, exempt: false, statusMsg, note: `${statusMsg} · 지방소득세 10% 포함` };
  }
  const lY = livedYears != null ? livedYears : (lived ? years : 0);
  const meetsLive = !acquiredRegulated || lY >= 2; // 조정대상지역 취득은 2년 거주요건 필요
  const exempt = is1 && years >= 2 && meetsLive && sell <= 120000;
  // 판정 문구
  let statusMsg;
  if (is1 && years >= 2 && sell <= 120000 && !meetsLive) statusMsg = "조정대상지역 취득 주택은 거주요건(2년) 미충족 시 비과세가 제한될 수 있습니다.";
  else if (exempt) statusMsg = "1세대 1주택 12억 이하 비과세 추정";
  else if (is1 && sell > 120000) statusMsg = "12억 초과 고가주택으로 초과분 과세 추정";
  else if (hc >= 2) statusMsg = "다주택자는 중과·일시적 2주택·분양권·입주권 등 예외가 있어 실제 세액 확인이 필요합니다.";
  else statusMsg = "양도차익 과세 추정";
  if (exempt) return { gain, over: 0, ltd: 0, taxable: 0, baseTax: 0, localTax: 0, tax: 0, exempt: true, statusMsg, note: statusMsg };
  // 과세 대상 양도차익 (거주요건 충족 1주택 고가주택은 12억 초과분만, 그 외는 전체)
  const highEnd = is1 && years >= 2 && meetsLive;
  const over = highEnd ? Math.round(gain * Math.max(0, sell - 120000) / sell) : gain;
  // 장기보유특별공제 (거주요건 충족 1주택만 거주공제 포함)
  let ltd;
  if (is1 && meetsLive && years >= 3) ltd = Math.min(0.8, Math.min(years, 10) * 0.04 + Math.min(lY, 10) * 0.04); // 보유4%/년(최대40%) + 거주4%/년(최대40%)
  else if (years >= 3) ltd = Math.min(0.3, (years - 2) * 0.02); // 일반 장특공 (최대 30%)
  else ltd = 0;
  const taxable = Math.max(0, Math.round(over * (1 - ltd) - 250)); // 기본공제 250만
  const br = [[0, 0.06, 0], [1400, 0.15, 126], [5000, 0.24, 576], [8800, 0.35, 1544], [15000, 0.38, 1994], [30000, 0.40, 2594], [50000, 0.42, 3594], [100000, 0.45, 6594]];
  let row = br[0]; for (const b of br) if (taxable >= b[0]) row = b;
  const baseTax = Math.max(0, Math.round(taxable * row[1] - row[2]));
  const localTax = Math.round(baseTax * 0.1); // 지방소득세 10%
  return { gain, over: Math.round(over), ltd, taxable, baseTax, localTax, tax: baseTax + localTax, exempt: false, statusMsg, note: `${statusMsg} · 장특공 ${Math.round(ltd * 100)}% · 지방소득세 10% 포함 추정` };
}

// ── 예산추천 후보 단지 풀 (데모 데이터 · 검증 단지 + 가공) ──
const POOL = [
  { name: "동부", region: "노원구", dong: "공릉동", pyeong: 25, buildYear: 1999, fair: 50200, cur: 50000, jr: 0.70, conf: "높음", regulated: false },
  { name: "상계주공7", region: "노원구", dong: "상계동", pyeong: 19, buildYear: 1988, fair: 62100, cur: 59500, jr: 0.46, conf: "높음", regulated: false, redev: true },
  { name: "은마", region: "강남구", dong: "대치동", pyeong: 25, buildYear: 1979, fair: 412300, cur: 381000, jr: 0.20, conf: "보통", regulated: true, redev: true },
  { name: "송도더샵파크애비뉴", region: "연수구", dong: "송도동", pyeong: 35, buildYear: 2017, fair: 94000, cur: 96000, jr: 0.40, conf: "보통" },
  { name: "마포래미안푸르지오", region: "마포구", dong: "아현동", pyeong: 34, buildYear: 2014, fair: 170000, cur: 165000, jr: 0.55, conf: "보통", regulated: true },
  { name: "분당정자동느티마을", region: "성남시 분당구", dong: "정자동", pyeong: 32, buildYear: 1995, fair: 130000, cur: 125000, jr: 0.58, conf: "보통" },
  { name: "일산후곡", region: "고양시 일산서구", dong: "일산동", pyeong: 28, buildYear: 1994, fair: 65000, cur: 63000, jr: 0.62, conf: "보통" },
  { name: "광교중흥S클래스", region: "수원시 영통구", dong: "이의동", pyeong: 34, buildYear: 2019, fair: 140000, cur: 138000, jr: 0.45, conf: "보통" },
];

// 펀더멘털 기반 신호 (가격 예측 아님) — 가격 여력 / 하락위험 / 후보점수
function scorePool(c) {
  const age = new Date().getFullYear() - c.buildYear;
  const undervalue = (c.fair - c.cur) / c.fair; // 적정가 대비 저렴할수록 +
  // 가격 여력: 전세가율(실수요 견조) + 저평가
  let up = 50 + (c.jr - 0.5) * 80 + undervalue * 300;
  // 하락위험: 재건축 기대 프리미엄 과다(전세가율 낮음+노후), 고평가
  let down = 30 + Math.max(0, 0.5 - c.jr) * 90 + Math.max(0, -undervalue) * 300 + (c.redev ? 20 : 0);
  up = Math.max(5, Math.min(95, Math.round(up))); down = Math.max(5, Math.min(95, Math.round(down)));
  const lab = (v) => (v >= 65 ? "높음" : v >= 40 ? "보통" : "낮음");
  const score = Math.round(undervalue * 200 + up * 0.4 - down * 0.3 + (c.conf === "높음" ? 10 : 0));
  return { age, undervalue, up, upLabel: lab(up), down, downLabel: lab(down), score };
}

// ── 지역 호재/악재·생활 인프라 mock DB ──
// TODO(상용화): 학교알리미·국가교통DB·소상공인상권정보·공공데이터포털(공원/의료) API로 단지 좌표 기반 산출
const AREA_DB = {
  "강남구": { school: 95, transit: 92, retail: 90, medical: 88, park: 70, pos: ["GTX-A 수서·삼성 정차", "대치·개포 재건축 추진", "최상위 학군(대치 학원가)"], neg: ["재건축 분담금·규제 리스크", "초고가로 진입장벽 높음"] },
  "노원구": { school: 82, transit: 76, retail: 72, medical: 70, park: 80, pos: ["재건축 안전진단 완화", "GTX-C 창동 인근", "동북선 경전철 개통"], neg: ["일부 단지 입주물량 증가", "단지 노후화 진행"] },
  "연수구": { school: 85, transit: 70, retail: 80, medical: 82, park: 88, pos: ["송도 바이오 클러스터 확장", "GTX-B 송도 정차 예정", "국제업무지구 인프라"], neg: ["송도 입주물량 누적", "일부 단지 미분양 잔존"] },
  "마포구": { school: 78, transit: 90, retail: 88, medical: 75, park: 72, pos: ["공덕·홍대 광역 상권", "역세권 도심 접근성", "신규 정비사업"], neg: ["출퇴근 교통 혼잡", "신축 공급 제한적"] },
  "성남시 분당구": { school: 90, transit: 82, retail: 85, medical: 84, park: 85, pos: ["1기 신도시 재정비 선도지구", "판교 테크노밸리 배후", "GTX 인근"], neg: ["재정비 장기 사업 불확실성", "단지 노후화"] },
  "고양시 일산서구": { school: 80, transit: 68, retail: 75, medical: 78, park: 90, pos: ["1기 신도시 정비 기대", "GTX-A 킨텍스 정차", "호수공원 환경"], neg: ["서울 대비 교통 열위", "공급 변동성"] },
  "수원시 영통구": { school: 84, transit: 74, retail: 82, medical: 80, park: 86, pos: ["삼성전자 배후 수요", "광교 신도시 인프라", "신분당선 연장"], neg: ["광교 입주물량 누적", "신축 공급 지속"] },
  default: { school: 70, transit: 70, retail: 70, medical: 70, park: 70, pos: ["역세권 접근성", "기본 생활 인프라"], neg: ["공급 변동성", "노후화 진행"] },
};
const areaInfo = (region) => AREA_DB[region] || AREA_DB.default;

// 1. 실거주 점수 (학군/교통/상권/병원/공원/주차/연식)
// TODO(상용화): 학교알리미·교통·상권·공원·의료 공공데이터 연동
function calculateLivingScore(f) {
  const a = areaInfo(f.region);
  const age = f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : 25;
  const ageScore = Math.round(Math.max(40, Math.min(95, 95 - Math.max(0, age - 5) * 1.7)));
  const parking = age <= 10 ? 88 : age <= 20 ? 70 : 55;
  const items = { 학군: a.school, 교통: a.transit, 상권: a.retail, 의료: a.medical, 환경: a.park, 주차: parking, 연식: ageScore };
  const w = { 학군: 0.2, 교통: 0.2, 상권: 0.15, 의료: 0.12, 환경: 0.11, 주차: 0.1, 연식: 0.12 };
  const total = Math.round(Object.keys(items).reduce((s, k) => s + items[k] * w[k], 0));
  return { total, items };
}

// 2. 공급 위험도 (입주물량/분양/미분양)
// TODO(상용화): 입주물량(부동산114)·분양·미분양(국토부 통계) API 연동
function calculateSupplyRisk(f) {
  const heavy = /연수|송도|영통|광교|이의|검단|일산|운정|동탄/.test((f.region || "") + (f.dong || ""));
  const seed = ((f.complexName || "").length + (f.dong || "").length) % 25;
  const score = Math.max(10, Math.min(90, heavy ? 68 + (seed % 15) : 28 + seed));
  const level = score >= 65 ? "높음" : score >= 40 ? "보통" : "낮음";
  const factors = heavy ? ["향후 3년 입주물량 누적", "인근 신규 분양/택지 영향"] : ["입주물량 제한적", "대규모 택지 영향 적음"];
  return { score, level, factors };
}

// 3. 호재
function calculatePositiveFactors(f) {
  const a = areaInfo(f.region);
  const list = a.pos.slice(0, 3);
  const score = Math.min(95, 52 + list.length * 9 + (a.transit >= 85 ? 8 : 0));
  return { score, list };
}
// 4. 악재
function calculateNegativeFactors(f) {
  const a = areaInfo(f.region);
  const age = f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : 25;
  const list = [...a.neg];
  if (age >= 30) list.push("재건축 전 노후화·분담금 리스크");
  const score = Math.min(95, 30 + list.length * 8 + (age >= 30 ? 10 : 0));
  return { score, list: list.slice(0, 3) };
}

// 5. 적정가 히스토리 (mock)
// TODO(상용화): 분석이력 DB + 국토부 실거래 히스토리로 연도별 적정가 재구성

// 7. 재무 가능성 (LTV/DSR + mock 금리 비교 후보 TOP3) — 대출 가능성·월상환 개략 추정
// TODO(API): 웹앱 전환 시 mock 금리 후보를 아래로 교체
//   - 금융감독원 금융상품 비교공시 / 은행연합회 금리 공시 / 제휴 대출비교 API / 금융기관 실제 심사 API
function calculateLoanOptions({ price, equity = 0, income = 0, existingPay = 0, noHouse = true, firstHome = false, newlywed = false, years = 30, rateType = "fixed" }) {
  let ltvRate = noHouse ? 0.7 : 0.6;
  if (firstHome) ltvRate = 0.8;
  const ltvCap = Math.round(price * ltvRate);
  const dsrRate = firstHome || newlywed ? 0.45 : 0.4;
  const need = Math.max(0, price - equity);
  const rateAdj = rateType === "variable" ? -0.10 : rateType === "mixed" ? -0.05 : 0; // 변동/혼합 mock 금리 가감
  const banks = [{ name: "A은행", rate: +(3.70 + (newlywed ? -0.15 : 0) + rateAdj).toFixed(2) }, { name: "B은행", rate: +(3.80 + rateAdj).toFixed(2) }, { name: "C은행", rate: +(3.95 + rateAdj).toFixed(2) }].map((b) => {
    const r = b.rate / 100 / 12, n = years * 12;
    const monthlyBudget = Math.max(0, (income * dsrRate) / 12 - existingPay / 12);
    const dsrCap = income > 0 ? Math.round(monthlyBudget * (1 - Math.pow(1 + r, -n)) / r) : ltvCap;
    const loanable = Math.max(0, Math.min(ltvCap, dsrCap));
    const used = Math.min(loanable, need);
    const monthly = used > 0 ? Math.round(used * r / (1 - Math.pow(1 + r, -n))) : 0;
    return { ...b, dsrCap, loanable, used, monthly, totalInterest: Math.max(0, monthly * n - used), ok: loanable >= need };
  });
  const best = banks.filter((b) => b.monthly > 0).sort((a, b) => a.monthly - b.monthly)[0] || banks[0];
  const shortfall = Math.max(0, need - best.loanable);
  // 대출 안정성 점수 (개략): 부족자금·한도 소진율·월상환 부담률 기반
  const util = best.loanable > 0 ? need / best.loanable : 1;
  const monthlyBurden = income > 0 ? (best.monthly * 12) / income : 0.6;
  let stability = 100;
  if (shortfall > 0) stability -= 40;
  stability -= clamp(util, 0, 1.2) * 22;
  stability -= clamp(monthlyBurden, 0, 0.7) * 70;
  stability = clamp(Math.round(stability), 5, 95);
  const stabilityLabel = stability >= 70 ? "안정" : stability >= 45 ? "보통" : "주의";
  return { ltvRate, ltvCap, dsrRate, dsrCap: best.dsrCap, need, banks, best, ok: best.ok, shortfall, stability, stabilityLabel, monthlyBurden: Math.round(monthlyBurden * 100) };
}

// 6. 예산 기반 후보 랭킹 — 핵심 엔진(analyze/매수/매도/세금)은 호출만, 변경 없음
// TODO(API): 웹앱 전환 시 데모 POOL → 실제 단지 DB / 국토부 실거래 / KB시세 / 매물 API 기반 후보군으로 교체
function recommendByBudget({ budget, region = "전체", pyeong = 0, prefs = [] }) {
  const B = budget;
  return POOL
    .filter((c) => !region || region === "전체" || c.region.includes(region) || c.dong.includes(region) || region.includes(c.region) || region.includes(c.dong))
    .filter((c) => !pyeong || Math.abs(c.pyeong - pyeong) <= 7)
    .filter((c) => c.cur <= B * 1.05)
    .map((c) => {
      const s = scorePool(c);
      const fs = { region: c.region, dong: c.dong, complexName: c.name, buildYear: c.buildYear, pyeong: c.pyeong };
      const living = calculateLivingScore(fs), supply = calculateSupplyRisk(fs), pos = calculatePositiveFactors(fs), neg = calculateNegativeFactors(fs);
      const dataConf = c.conf === "높음" ? 85 : 60;
      const isPremium = c.redev || c.jr < 0.35 || PRIME_REGIONS.includes(c.region);
      const marketType = c.redev ? "재건축형" : c.jr < 0.35 ? "투자수요형" : PRIME_REGIONS.includes(c.region) ? "프리미엄형" : "일반";
      // 시장 위험도 (후보용 등급) — 핵심 엔진 marketRisk와 별개, 후보 표시용
      const mrScore = c.jr < 0.30 ? 78 : c.redev ? 68 : PRIME_REGIONS.includes(c.region) ? 58 : c.jr < 0.45 ? 48 : 28;
      const mrLevel = mrScore >= 70 ? "매우높음" : mrScore >= 55 ? "높음" : mrScore >= 38 ? "보통" : "낮음";
      // 예산 적합도: 예산 이하면 충분히 살 수 있음(고점), 예산 초과만 감점. (이전엔 싼 단지도 감점 → 수정)
      const budgetFit = c.cur > B
        ? Math.round(clamp(100 - ((c.cur - B) / B) * 220, 0, 100))
        : Math.round(clamp(100 - Math.max(0, (B - c.cur) / B - 0.2) * 70, 55, 100));
      const priceAttract = clamp(Math.round(s.undervalue * 100 + 50), 0, 100); // 가격 매력도(=가격 여력)
      const gapPos = s.undervalue > 0.03 ? "저평가" : s.undervalue < -0.03 ? "고평가" : "적정";
      // 매수 판단 (기존 엔진 grade·LABEL 재사용 — 가격 기준 라벨, 엔진 변경 없음)
      const gapR = -s.undervalue; // (현재가 − 적정가)/적정가
      const buyGrade = gapR <= CONFIG.grade.A ? "A" : gapR <= CONFIG.grade.B ? "B" : gapR <= CONFIG.grade.C ? "C" : gapR <= CONFIG.grade.D ? "D" : "E";
      const buyLabel = LABEL[buyGrade];
      let prefBonus = 0;
      if (prefs.includes("역세권") && living.items.교통 >= 80) prefBonus += 7;
      if (prefs.includes("학군") && living.items.학군 >= 85) prefBonus += 7;
      if (prefs.includes("저평가") && s.undervalue > 0.02) prefBonus += 7;
      if (prefs.includes("재건축") && c.redev) prefBonus += 7;
      if (prefs.includes("신축") && c.age <= 10) prefBonus += 7;
      if (prefs.includes("전세가율") && c.jr >= 0.55) prefBonus += 7;
      if (prefs.includes("호재") && pos.score >= 70) prefBonus += 7;
      // 랭킹: 예산적합25 · 가격매력20 · 실거주20 · 시장위험낮음15 · 공급위험낮음10 · 데이터신뢰10
      const ranking = Math.round(budgetFit * 0.25 + priceAttract * 0.20 + living.total * 0.20 + (100 - mrScore) * 0.15 + (100 - supply.score) * 0.10 + dataConf * 0.10 + prefBonus);
      // 후보 이유 3개 (조건 적합 근거)
      const reasons = [
        `예산 적합도 ${budgetFit}점 · 현재가 ${won(c.cur)} (예산 ${won(B)} 대비)`,
        `엔진 산출 적정가 ${won(c.fair)} 대비 ${gapPos} · 가격 여력 ${priceAttract}점 · 실거주 ${living.total}점`,
        `호재 「${pos.list[0] || "-"}」${pos.list[1] ? ` · 「${pos.list[1]}」` : ""}`,
      ];
      // 주의 이유 2개
      const cautions = [];
      if (mrLevel === "높음" || mrLevel === "매우높음") cautions.push(`시장 위험도 ${mrLevel} — ${marketType === "재건축형" ? "재건축 사업·분담금 변동성" : marketType === "투자수요형" ? "실수요 대비 투자수요 의존" : "가격 변동성"} 유의`);
      if (supply.level === "높음") cautions.push(`공급 위험 높음 — ${supply.factors[0]}`);
      if (s.undervalue < -0.02) cautions.push("엔진 산출 적정가 대비 다소 높은 가격");
      if (neg.list[0]) cautions.push(`악재 「${neg.list[0]}」`);
      while (cautions.length < 2) cautions.push("일반적인 시장·금리 변동 가능성");
      const risky = mrLevel === "매우높음" || mrLevel === "높음" || supply.level === "높음";
      return { ...c, ...s, living, supply, pos, neg, dataConf, budgetFit, priceAttract, gapPos, buyGrade, buyLabel, mrScore, mrLevel, ranking, reasons, cautions: cautions.slice(0, 2), isPremium, marketType, risky };
    })
    .sort((a, b) => b.ranking - a.ranking);
}


// 기준 전세가 = 중개사 실무식 정제평균(Trimmed Mean)
// 최근 12개월 실거래 → 구조적/이상 거래 제외 → 평균 → 표본 적으면 KB 가중
// 전세·매매 공용 정제평균(Trimmed Mean) 산정
// 최근 12개월 실거래 → 구조적/이상 거래 제외 → 평균 → 표본 적으면 KB시세 가중
function computeTrimmedMean(rawDeals, kbPrice, kind = "jeonse") {
  const urgentLabel = kind === "sale" ? "급매" : "급전세";
  const norm = (rawDeals || [])
    .map((d) => ({ ym: d.ym, price: Number(d.price) || 0, floor: Number(d.floor) || 0, topFloor: Number(d.topFloor) || 0, banjiha: !!d.banjiha, urgent: !!d.urgent, related: !!d.related }))
    .filter((d) => d.price > 0 && d.ym);
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1); // 최근 12개월
  const within = norm.filter((d) => {
    const [y, m] = String(d.ym).split("-").map(Number);
    return new Date(y, (m || 1) - 1, 1) >= cutoff;
  });
  const total = within.length;
  if (!total) return kbPrice ? { value: Math.round(kbPrice), used: 0, excluded: 0, total: 0, confidence: 30, confLabel: "낮음", kbWeight: 1, reasonText: "12개월 내 실거래 없음 · KB시세 100% 반영" } : null;

  const med = (arr) => { const s = [...arr].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
  const reasons = { floor1: 0, banjiha: 0, top: 0, urgent: 0, related: 0, dev20: 0 };

  // 1차: 구조적·특수 거래 제외
  const pass1 = within.filter((d) => {
    if (d.banjiha || d.floor < 0) { reasons.banjiha++; return false; }
    if (d.floor === 1) { reasons.floor1++; return false; }
    if (d.topFloor && d.floor >= d.topFloor) { reasons.top++; return false; }
    if (d.urgent) { reasons.urgent++; return false; }
    if (d.related) { reasons.related++; return false; }
    return true;
  });
  // 2차: 단지 중앙값 대비 ±20% 초과 제외
  const ref = pass1.length ? med(pass1.map((d) => d.price)) : 0;
  const pass2 = pass1.filter((d) => {
    if (ref && Math.abs(d.price - ref) / ref > 0.2) { reasons.dev20++; return false; }
    return true;
  });

  const kept = pass2.map((d) => d.price);
  const used = kept.length;
  const dealAvg = used ? Math.round(kept.reduce((s, x) => s + x, 0) / used) : null;

  // 표본 적으면 KB시세 가중
  let kbWeight = used >= 5 ? 0 : used >= 3 ? 0.3 : used >= 1 ? 0.6 : 1;
  if (!kbPrice) kbWeight = 0;
  let value;
  if (dealAvg == null) value = Math.round(kbPrice || ref);
  else if (kbWeight > 0 && kbPrice) value = Math.round(dealAvg * (1 - kbWeight) + kbPrice * kbWeight);
  else value = dealAvg;

  // 신뢰도: 표본수 ↑ · KB의존 ↓ · 분산 ↓
  const cv = dealAvg ? Math.sqrt(kept.reduce((s, x) => s + (x - dealAvg) ** 2, 0) / used) / dealAvg : 1;
  let conf = 50 + Math.min(used, 8) * 5 - kbWeight * 25 - Math.min(cv, 0.15) * 100;
  conf = Math.max(20, Math.min(95, Math.round(conf)));
  const confLabel = conf >= 75 ? "높음" : conf >= 55 ? "보통" : "낮음";

  const rs = [];
  if (reasons.floor1) rs.push(`1층 ${reasons.floor1}`);
  if (reasons.banjiha) rs.push(`반지하 ${reasons.banjiha}`);
  if (reasons.top) rs.push(`최고층 ${reasons.top}`);
  if (reasons.urgent) rs.push(`${urgentLabel} ${reasons.urgent}`);
  if (reasons.related) rs.push(`특수관계 ${reasons.related}`);
  if (reasons.dev20) rs.push(`±20%초과 ${reasons.dev20}`);
  const reasonBody = rs.length ? rs.join(", ") + " 제외" : "제외 거래 없음";
  const kbNote = kbWeight > 0 ? ` · 표본 부족으로 KB시세 ${Math.round(kbWeight * 100)}% 가중` : " · KB 보정 없음";
  const reasonText = `최근 12개월 ${total}건 중 ${reasonBody}${kbNote}`;

  return { value, used, excluded: total - used, total, confidence: conf, confLabel, kbWeight, reasonText };
}

const SAMPLE_DEALS = [
  { ym: "2025-08", price: 35000, floor: 5, topFloor: 15 },
  { ym: "2025-09", price: 34500, floor: 8, topFloor: 15 },
  { ym: "2025-10", price: 36000, floor: 11, topFloor: 15 },
  { ym: "2025-11", price: 35500, floor: 3, topFloor: 15 },
  { ym: "2025-09", price: 43500, floor: 10, topFloor: 15 }, // +24% → ±20% 초과
  { ym: "2025-12", price: 31000, floor: 1, topFloor: 15 },  // 1층
  { ym: "2026-01", price: 34000, floor: 7, topFloor: 15 },
  { ym: "2026-01", price: 30000, floor: 0, topFloor: 15, banjiha: true }, // 반지하
  { ym: "2026-02", price: 35800, floor: 9, topFloor: 15 },
  { ym: "2026-02", price: 41000, floor: 15, topFloor: 15 }, // 최고층
  { ym: "2026-03", price: 36200, floor: 6, topFloor: 15 },
  { ym: "2026-03", price: 28000, floor: 6, topFloor: 15, urgent: true },  // 급전세
  { ym: "2026-04", price: 35200, floor: 12, topFloor: 15 },
  { ym: "2026-04", price: 30500, floor: 8, topFloor: 15, related: true }, // 특수관계
];

const SAMPLE_SALE_DEALS = [
  { ym: "2025-08", price: 50000, floor: 5, topFloor: 15 },
  { ym: "2025-10", price: 49500, floor: 8, topFloor: 15 },
  { ym: "2025-11", price: 51000, floor: 11, topFloor: 15 },
  { ym: "2025-12", price: 50500, floor: 3, topFloor: 15 },
  { ym: "2025-09", price: 62000, floor: 10, topFloor: 15 }, // +23% → ±20% 초과
  { ym: "2025-09", price: 44000, floor: 1, topFloor: 15 },  // 1층
  { ym: "2026-01", price: 49000, floor: 7, topFloor: 15 },
  { ym: "2026-01", price: 42000, floor: 0, topFloor: 15, banjiha: true }, // 반지하
  { ym: "2026-02", price: 50800, floor: 9, topFloor: 15 },
  { ym: "2026-02", price: 58000, floor: 15, topFloor: 15 }, // 최고층
  { ym: "2026-03", price: 51200, floor: 6, topFloor: 15 },
  { ym: "2026-03", price: 40000, floor: 6, topFloor: 15, urgent: true },  // 급매
  { ym: "2026-04", price: 50200, floor: 12, topFloor: 15 },
  { ym: "2026-04", price: 43500, floor: 8, topFloor: 15, related: true }, // 특수관계
];

const SAMPLE = { region: "노원구", dong: "공릉동", complexName: "동부", areaExclusive: 59, pyeong: 25, currentPrice: 50000, kbSalePrice: 50250, kbJeonse: 35500, baseJeonse: 35000, buildYear: 1999, deals: SAMPLE_DEALS, saleDeals: SAMPLE_SALE_DEALS, purpose: "live", holdingYears: 5, shockLevel: "보통", m: { saleGrowth: -23.45, regionSaleGrowth: -23.7, jeonseGrowth: 11.26, regionJeonseGrowth: 49.2, transactionCount: 10, similarComplexCount: 8 } };
const EMPTY = { region: "", dong: "", complexName: "", areaExclusive: "", pyeong: "", priceArea: "", currentPrice: "", kbSalePrice: "", kbJeonse: "", baseJeonse: "", buildYear: "", deals: [], saleDeals: [], purpose: "live", holdingYears: 5, shockLevel: "보통", m: null, availableCash: "", emergencyCash: "", annualIncome: "", plannedLoanAmount: "", interestRate: "", loanYears: "", existingDebtPayment: "", reconstructionStage: "", acqPrice: "", lived: true, oneHouse: true, loanBalance: "", sellPurpose: "현금화" };

// 실거래 프리셋 (국토부 실거래, 취소거래 제외) — 엔진 모드 데모용
const PRESET_EUNMA = { region: "강남구", dong: "대치동", complexName: "은마 25평", areaExclusive: 84.43, pyeong: 25, currentPrice: 381000, kbSalePrice: 531816, kbJeonse: 77000, baseJeonse: 80000, buildYear: 1979, purpose: "live", holdingYears: 5, shockLevel: "보통", m: null,
  saleDeals: [{ ym: "2026-04", price: 381000, floor: 13, topFloor: 14 }, { ym: "2026-01", price: 420000, floor: 4, topFloor: 14 }, { ym: "2025-11", price: 415000, floor: 4, topFloor: 14 }, { ym: "2025-10", price: 431000, floor: 13, topFloor: 14 }, { ym: "2025-10", price: 428000, floor: 12, topFloor: 14 }, { ym: "2025-09", price: 417000, floor: 2, topFloor: 14 }, { ym: "2025-09", price: 398000, floor: 2, topFloor: 14 }, { ym: "2025-07", price: 406000, floor: 3, topFloor: 14 }, { ym: "2025-07", price: 415000, floor: 3, topFloor: 14 }],
  deals: [{ ym: "2026-05", price: 74000, floor: 13, topFloor: 14 }, { ym: "2026-04", price: 75000, floor: 1, topFloor: 14 }, { ym: "2026-04", price: 78500, floor: 7, topFloor: 14 }, { ym: "2026-04", price: 75000, floor: 9, topFloor: 14 }, { ym: "2026-04", price: 86000, floor: 4, topFloor: 14 }, { ym: "2026-04", price: 88000, floor: 5, topFloor: 14 }, { ym: "2026-04", price: 80000, floor: 9, topFloor: 14 }, { ym: "2026-04", price: 75000, floor: 9, topFloor: 14 }, { ym: "2026-04", price: 84000, floor: 9, topFloor: 14 }, { ym: "2026-04", price: 95000, floor: 8, topFloor: 14 }, { ym: "2026-04", price: 73000, floor: 1, topFloor: 14 }] };
const PRESET_SG7 = { region: "노원구", dong: "상계동", complexName: "상계주공7 19평", areaExclusive: 45.77, pyeong: 19, currentPrice: 59500, kbSalePrice: 63306, kbJeonse: 25000, baseJeonse: 27000, buildYear: 1988, purpose: "live", holdingYears: 5, shockLevel: "보통", m: null,
  saleDeals: [{ ym: "2026-04", price: 59500, floor: 15, topFloor: 15 }, { ym: "2026-04", price: 60000, floor: 11, topFloor: 15 }, { ym: "2026-04", price: 58000, floor: 10, topFloor: 15 }, { ym: "2026-04", price: 59000, floor: 9, topFloor: 15 }, { ym: "2026-04", price: 69700, floor: 10, topFloor: 15 }, { ym: "2026-03", price: 70800, floor: 9, topFloor: 15 }, { ym: "2026-03", price: 57500, floor: 10, topFloor: 15 }, { ym: "2026-03", price: 57000, floor: 8, topFloor: 15 }, { ym: "2026-03", price: 59800, floor: 7, topFloor: 15 }, { ym: "2026-03", price: 67000, floor: 12, topFloor: 15 }],
  deals: [{ ym: "2026-04", price: 25000, floor: 13, topFloor: 15 }, { ym: "2026-04", price: 31000, floor: 6, topFloor: 15 }, { ym: "2026-04", price: 21987, floor: 5, topFloor: 15 }, { ym: "2026-04", price: 28350, floor: 3, topFloor: 15 }, { ym: "2026-04", price: 23000, floor: 15, topFloor: 15 }, { ym: "2026-04", price: 30000, floor: 2, topFloor: 15 }, { ym: "2026-04", price: 24500, floor: 8, topFloor: 15 }, { ym: "2026-04", price: 19950, floor: 15, topFloor: 15 }, { ym: "2026-04", price: 29000, floor: 3, topFloor: 15 }, { ym: "2026-04", price: 20000, floor: 1, topFloor: 15 }, { ym: "2026-04", price: 30000, floor: 13, topFloor: 15 }] };
const LEGAL = "본 서비스는 사용자가 입력한 정보와 공개 데이터를 바탕으로 산출한 참고용 분석 도구입니다. 실제 감정평가, 투자자문, 매수·매도 권유가 아니며 최종 의사결정은 사용자 본인의 책임입니다.";
// 특수지역 전체 샘플 — 강남 재건축(은마) + 자금 정보까지 모두 채운 원클릭 데모
const PRESET_PRIME_FULL = { ...PRESET_EUNMA, complexName: "은마 (강남 재건축·전체샘플)", redevelopmentExpected: true, availableCash: 500000, emergencyCash: 50000, annualIncome: 18000, plannedLoanAmount: 200000, interestRate: 4.0, loanYears: 30, existingDebtPayment: 0 };
const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:bg-white";
const card = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100";

// ── 입력값 검증 경고 (UI 전용 · 엔진 계산 무관) ──
function inputWarnings(r, f) {
  const w = [];
  const cur = Number(f.currentPrice) || 0;
  const jeonse = Number(f.kbJeonse) || (r && r.baseJeonse) || 0;
  const sale = Number(f.kbSalePrice) || cur || 0;
  if (cur <= 0) w.push({ tone: "red", msg: "현재 매매가격이 입력되지 않았거나 유효하지 않습니다. (판단 보류로 처리됩니다)" });
  if (jeonse > 0 && sale > 0 && jeonse >= sale) w.push({ tone: "red", msg: "입력한 전세가격이 매매가격 이상입니다. 실제 시장에서는 드문 사례이며 적정가 결과가 왜곡될 수 있습니다. 입력값을 다시 확인하세요." });
  const ratio = r && r.actualRatio != null ? r.actualRatio : (sale > 0 ? jeonse / sale : 0);
  if (ratio > 0.9) w.push({ tone: "amber", msg: "전세가율이 매우 높습니다. 입력값 또는 시장 특수 상황 여부를 확인하세요." });
  if (r && r.engineMode === "hold") w.push({ tone: "amber", msg: "거래 표본이 부족하거나 입력값이 불안정하여 결과 신뢰도가 낮습니다. 참고용으로만 활용하세요." });
  return w;
}
function InputWarnings({ r, f }) {
  const w = inputWarnings(r, f);
  if (!w.length) return null;
  return (
    <div className="mb-4 space-y-2">
      {w.map((x, i) => (
        <div key={i} className={`rounded-2xl border px-4 py-2.5 text-[12px] leading-relaxed ${x.tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>⚠️ {x.msg}</div>
      ))}
    </div>
  );
}

// ───────────────────────── 확장형 구조: 함수 분리 ─────────────────────────
// 아파트 적정가 엔진 (기존 analyze 로직을 그대로 위임 — 절대 변경/삭제 금지)
function calculateApartmentFairValue(f) { return analyze(f); }
// 세금: 매수=취득세 / 매도=양도세. 공식 미완성분은 placeholder, 추후 교체 가능하게 분리.
function calculateAcquisitionTax({ price, area85over = false, houses = 1, regulated = false, firstTime = false }) { return acqTax(price, area85over, houses, regulated, firstTime); }
function calculateCapitalGainsTax(args) { return cgTax(args); }
// TODO(확장): 부동산 유형별 엔진을 아래에 추가하면 됨 (UI는 propertyTypes에 ready:true로 전환)
//   - calculateMultiFamilyValue(f) : 다가구 — 호별 임대수익 환원법(NOI ÷ 환원율) + 토지·건물 평가
//   - calculateCommercialValue(f)  : 상가  — 임대료·공실률·환원율 기반 수익가치 + 입지 점수
//   - calculateOneRoomSearch(f)    : 원룸 찾기 — 보증금/월세 시세 대비 매물 적정성(세입자용)
//   - calculateOneRoomYield(f)     : 원룸 수익률 — (월세×12 − 비용) ÷ 투자금 = 연수익률(투자자용)

const propertyTypes = [
  { key: "apartment", label: "아파트", ready: true },
  { key: "multiFamily", label: "다가구", ready: false },
  { key: "commercial", label: "상가", ready: false },
  { key: "oneRoom", label: "원룸", ready: true },
];
const apartmentTabsDef = [["fair", "적정가"], ["buy", "매수"], ["sell", "매도"], ["tax", "세금"], ["reco", "추천 후보"], ["adv", "내 자산"]];
const oneRoomTabsDef = [["search", "원룸 찾기"], ["manage", "원룸 관리"], ["yield", "원룸 수익률"]];

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

// 세금 계산 — 매수 세금(취득세) / 매도 세금(양도세). 매수·매도 화면 입력값을 불러올 수 있는 구조.
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
                <p className="mt-1 text-xs leading-relaxed text-red-600">본 계산은 일반 1주택·다주택 기준의 <b>단순 개략 추정</b>이며, 체크하신 항목(일시적 2주택·상속/증여·분양권/입주권·임대사업자·법인 등)은 별도 세법이 적용되어 <b>이 추정에 반영되지 않았습니다</b>. 실제 세액은 반드시 <b>세무사 확인이 필요합니다.</b></p>
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
Powered by ValueLens`;
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

// 원룸 하위 화면 (구조만 — 계산식은 추후)
function OneRoomView({ tab }) {
  if (tab === "search") return <ComingSoon title="원룸 찾기 (학생·세입자용)" desc="보증금·월세 시세 대비 매물이 적정한지, 사기·과대 보증금 위험은 없는지 판단합니다." />;
  if (tab === "manage") return <ComingSoon title="원룸 관리 (집주인·임대인용)" desc="보증금·월세 책정, 공실·계약 관리, 적정 임대료 산정을 돕습니다." />;
  return <ComingSoon title="원룸 수익률 (투자자용)" desc="매입가·보증금·월세·비용으로 연 수익률(표면/실질)과 회수기간을 계산합니다." />;
}

// 최종 판단 — 사용자가 "그래서 사도 되는가"를 먼저 보게 하는 요약 로직
// 표현은 상용화 기준 라벨만 사용 (무조건 매수/100% 수익 등 금지)
// ════════════════ BUYER DECISION ENGINE (Decision Layer) ════════════════
// 적정가 엔진(analyze) 결과 r 위에 얹는 의사결정 레이어. analyze는 절대 수정하지 않는다.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const monthlyPay = (principal, ratePct, years) => { const r = ratePct / 100 / 12, n = years * 12; return principal > 0 && r > 0 ? Math.round(principal * r / (1 - Math.pow(1 + r, -n))) : 0; };

// ════════ RISK LAYER ════════ 적정가 계산에 영향 없음. 최종판단·신뢰도·경고에만 반영.
// TODO(상용화): 부동산114/부동산원(입주물량)·국토부(거래량)·통계청(인구)·고용정보원(고용)·정비사업 고시 API 연결
function calculateSupplyShock(f) { // 입주물량 위험
  const heavy = /연수|송도|영통|광교|이의|검단|일산|운정|동탄|청라/.test((f.region || "") + (f.dong || ""));
  const score = Math.max(10, Math.min(90, heavy ? 70 + (((f.complexName || "").length) % 12) : 30 + (((f.dong || "").length) % 18)));
  const level = score >= 65 ? "높음" : score >= 40 ? "보통" : "낮음";
  return { score, level, warning: level === "높음" ? "향후 3년 입주물량이 많아 가격 약세 압력이 있을 수 있습니다" : "" };
}
function calculateVolumeRisk(f) { // 거래량 위험 (추세 데이터 미연동)
  return { volumeScore: 60, level: "보통", cliff: false, trendAvailable: false, warning: "", note: "거래량 추세 데이터 미연동 (TODO: 국토부 거래량 API)" };
}
function calculatePopulationRisk(f) { // 인구 위험
  const growing = /강남|서초|송파|용산|마포|성남|수원|송도|연수|영통/.test((f.region || ""));
  const populationScore = growing ? 72 : 52;
  return { populationScore, level: growing ? "낮음" : "보통", warning: growing ? "" : "장기 인구 추세 확인이 필요합니다" };
}
function calculateEmploymentRisk(f) { // 고용 위험
  const strong = /강남|서초|송파|영통|연수|송도|판교|성남|마포/.test((f.region || "") + (f.dong || ""));
  const employmentScore = strong ? 75 : 55;
  return { employmentScore, level: strong ? "낮음" : "보통", warning: "" };
}
function calculatePolicyRisk(f) { // 정책 위험 (재건축·토허제·정비·용적률)
  const age = f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : 0;
  const toho = /강남|서초|송파|용산|여의|목동|압구정|대치|반포|잠실/.test((f.region || "") + (f.dong || ""));
  let score = 38; const factors = [];
  if (age >= 30) { score += 25; factors.push("재건축 사업 단계 불확실성"); }
  if (toho) { score += 22; factors.push("토지거래허가·정비사업 규제 영향"); }
  score = Math.min(92, score);
  const level = score >= 65 ? "높음" : score >= 45 ? "보통" : "낮음";
  return { policyScore: score, level, factors, warning: level === "높음" ? "재건축·정책 규제 변수에 가격이 민감합니다" : "" };
}

// ════════ MARKET CLASSIFIER + PREMIUM ENGINE ════════
// 적정가 엔진(analyze)을 바꾸지 않고, 그 결과 위에서 시장 유형을 먼저 분류한다.
// TODO(상용화): 학군(학교알리미)·정비사업 단계·토허제·희소지역·정책 데이터 API 연결
const SCHOOL_ZONES = ["강남구", "서초구", "송파구", "양천구", "분당", "대치", "목동", "평촌", "중계", "방이"];
const SCARCITY_ZONES = ["강남", "서초", "송파", "용산", "목동", "분당", "판교", "여의도", "한강", "반포", "압구정", "잠실", "해운대", "수성"];
const PRIME_REGIONS = ["강남구", "서초구", "송파구", "용산구", "양천구", "성남시 분당구"];
const PREMIUM_LEVEL = (s) => (s >= 81 ? "초프리미엄" : s >= 61 ? "프리미엄" : s >= 31 ? "준프리미엄" : "일반");
const CONF_CAP = { normal: 95, semiPremium: 75, redevelopment: 45, primePremium: 55, investmentPremium: 50, policyDriven: 45, lowData: 30, abnormalInput: 20 };

// ── 재건축 단계 엔진 ── TODO(API): 현재 연식·키워드 기반 AI/mock 추정. 웹앱 전환 시 정비사업 고시/조합 정보 API로 교체할 것.
const RECON = {
  none: { label: "해당 없음", score: 0 }, possible: { label: "재건축 가능 연한", score: 15 },
  safetyDiagnosis: { label: "안전진단", score: 25 }, zoneDesignation: { label: "정비구역 지정", score: 40 },
  associationEstablished: { label: "조합 설립", score: 55 }, projectApproval: { label: "사업시행인가", score: 70 },
  managementDisposal: { label: "관리처분인가", score: 85 }, relocation: { label: "이주·철거", score: 90 },
  construction: { label: "착공", score: 95 }, completed: { label: "준공", score: 100 },
};
function estimateReconstructionStage(f, age) {
  if (f.reconstructionStage && RECON[f.reconstructionStage]) return f.reconstructionStage; // 사용자 선택 우선
  if (age == null) return "none";
  if (age >= 45 || f.redevelopmentExpected) return "associationEstablished";
  if (age >= 38) return "zoneDesignation";
  if (age >= 32) return "safetyDiagnosis";
  if (age >= 26) return "possible";
  return "none";
}
// ── 적정가 3단계 범위 (보수/기준/공격) — 표시용, 엔진 적정가 자체는 불변 ──
function computeFairBands(r, mc) {
  const t = mc && mc.specialMarketType;
  const special = t && !["normal", "semiPremium", "lowData", "abnormalInput"].includes(t);
  if (special && mc.marketReferencePrice) {
    const base = mc.marketReferencePrice;
    return { conservative: Math.round(mc.intrinsicFairPrice || base), base: Math.round(base), aggressive: Math.round(base + (mc.premiumAmount || 0) * 0.3), special: true };
  }
  const fp = r.fairPrice || 0;
  return { conservative: Math.round(fp * 0.95), base: Math.round(fp), aggressive: Math.round(fp * 1.05), special: false };
}

function classifyApartmentMarket(f, r) {
  const region = f.region || "", blob = (f.region || "") + (f.dong || "") + (f.complexName || "");
  const age = r.age != null ? r.age : (f.buildYear ? new Date().getFullYear() - Number(f.buildYear) : null);
  const jr = r.actualRatio || 0;
  const intrinsicFairPrice = Math.round(r.jeonseFair || 0);
  const marketReferencePrice = Math.round(r.saleFair || r.fairPrice || 0);
  const premiumAmount = Math.max(0, marketReferencePrice - intrinsicFairPrice);
  const premiumRatio = intrinsicFairPrice ? premiumAmount / intrinsicFairPrice : 0;

  // ── PremiumScore 5개 서브점수 (mock/placeholder) ──
  let redevelopmentScore = 0;
  if (age != null && age >= 28) redevelopmentScore += 45;
  if (jr > 0 && jr < 0.5) redevelopmentScore += 30;
  if (f.redevelopmentExpected) redevelopmentScore += 15;
  if (/주공|시영|재건축|구축|한양|진주|미성/.test(f.complexName || "")) redevelopmentScore += 10;
  redevelopmentScore = Math.min(100, redevelopmentScore);
  const schoolPremiumScore = SCHOOL_ZONES.some((z) => blob.includes(z)) ? 75 : 30;       // TODO: 학교알리미
  const landScarcityScore = SCARCITY_ZONES.some((z) => blob.includes(z)) ? 80 : 30;       // TODO: 희소지역 데이터
  let investorDemandScore = 0;
  if (jr > 0 && jr < 0.35) investorDemandScore += 50;
  if (premiumRatio > 0.5) investorDemandScore += 35; else if (premiumRatio > 0.25) investorDemandScore += 18;
  investorDemandScore = Math.min(100, investorDemandScore);
  let policyDrivenScore = 0;                                                              // TODO: 정비사업·토허제 데이터
  if (age != null && age >= 30) policyDrivenScore += 35;
  if (/강남|서초|송파|용산|여의|목동|압구정|대치|반포|잠실/.test(blob)) policyDrivenScore += 30;
  policyDrivenScore = Math.min(100, policyDrivenScore);
  const subScores = { redevelopmentScore, schoolPremiumScore, landScarcityScore, investorDemandScore, policyDrivenScore };

  const premiumScore = clamp(Math.round(Math.max(redevelopmentScore, investorDemandScore, landScarcityScore) * 0.55 + schoolPremiumScore * 0.2 + landScarcityScore * 0.15 + policyDrivenScore * 0.1), 0, 100);
  const premiumLevel = PREMIUM_LEVEL(premiumScore);

  // ── 표본/입력 검증 ──
  const jUsed = r.jeonseUsed || (r.jeonseCalc && r.jeonseCalc.used) || 0;
  const sUsed = r.saleUsed || (r.saleCalc && r.saleCalc.used) || 0;
  const reasons = [], warnings = [];

  // ── specialMarketType 결정 (우선순위) ──
  // 이상치 제외 비율 60% 초과 시 데이터부족 처리 (computeTrimmedMean 미수정 — 레이어에서 판정)
  const jExcl = r.jeonseCalc && r.jeonseCalc.total ? (r.jeonseCalc.total - r.jeonseCalc.used) / r.jeonseCalc.total : 0;
  const sExcl = r.saleCalc && r.saleCalc.total ? (r.saleCalc.total - r.saleCalc.used) / r.saleCalc.total : 0;
  const highExclusion = jExcl > 0.6 || sExcl > 0.6;
  let specialMarketType = "normal";
  if (r.engineMode === "hold" && ((r.holdReason || "").includes("입력") || Math.abs(r.gapRatio || 0) > 0.5)) { specialMarketType = "abnormalInput"; reasons.push("현재가가 정제 시세와 ±50% 이상 차이 — 입력 오류 가능성"); }
  else if (r.engineMode === "hold" || (jUsed < 3 && sUsed < 3) || highExclusion) { specialMarketType = "lowData"; reasons.push(highExclusion ? "이상치 제외 비율 60% 초과 — 표본 신뢰 낮음" : "전세·매매 실거래 표본이 모두 부족"); }
  else if ((age != null && age >= 28 && jr > 0 && jr < 0.5) || f.redevelopmentExpected) { specialMarketType = "redevelopment"; reasons.push(`연식 ${age}년 · 전세가율 ${(jr * 100).toFixed(0)}% — 재건축 기대 반영`); }
  else if (jr > 0 && jr < 0.35 && sUsed >= 3 && premiumRatio > 0.4) { specialMarketType = "investmentPremium"; reasons.push(`전세가율 ${(jr * 100).toFixed(0)}% · 시장가-실사용가치 괴리 ${(premiumRatio * 100).toFixed(0)}% — 투자수요 우세`); }
  else if (PRIME_REGIONS.includes(region) && premiumScore >= 60) { specialMarketType = "primePremium"; reasons.push(`${region} · 프리미엄 점수 ${premiumScore} — 입지·희소성 프리미엄`); }
  else if (policyDrivenScore >= 60) { specialMarketType = "policyDriven"; reasons.push("재건축·정비·규제 등 정책 변수가 가격에 강하게 반영"); }
  else if (premiumScore >= 60) { specialMarketType = landScarcityScore >= 60 || schoolPremiumScore >= 60 ? "primePremium" : "investmentPremium"; reasons.push(`프리미엄 점수 ${premiumScore} — 일반 실거주형으로 보기 어려움`); }
  else if (premiumScore >= 31) { specialMarketType = "semiPremium"; reasons.push(`프리미엄 점수 ${premiumScore} — 준프리미엄, 보수적 판단 적용`); }
  else { reasons.push("일반 실거주형 아파트"); }

  if (["redevelopment", "primePremium", "investmentPremium", "policyDriven"].includes(specialMarketType)) {
    warnings.push("실사용 가치보다 재건축·학군·희소성·투자수요 프리미엄이 크게 반영된 단지입니다. 일반 전세 기반 적정가만으로 저평가/고평가를 단정하기 어렵습니다.");
    if (premiumRatio > 0.3) reasons.push(`실사용 적정가 ${won(intrinsicFairPrice)} vs 시장 기준가 ${won(marketReferencePrice)} (프리미엄 ${(premiumRatio * 100).toFixed(0)}%)`);
  }

  // ── 재건축 단계 (적정가는 안 바꾸고 프리미엄·위험·매수판단에만 반영) ──
  const reconstructionStage = estimateReconstructionStage(f, age);
  const stageScore = RECON[reconstructionStage].score;
  // ── 프리미엄 구성 분해 (premiumAmount를 구성요소별로 안분) ── TODO(API): 학군/희소성/정비사업/투자수요/정책 실데이터로 교체
  const wSchool = Math.max(0, schoolPremiumScore - 30);
  const wRedev = Math.round(redevelopmentScore * (0.5 + stageScore / 200));
  const wScarcity = Math.max(0, landScarcityScore - 30);
  const wLocation = PRIME_REGIONS.includes(region) ? 50 : 20;
  const wInvestor = investorDemandScore;
  const wPolicy = Math.max(0, policyDrivenScore - 20);
  const wSum = wSchool + wRedev + wScarcity + wLocation + wInvestor + wPolicy || 1;
  const alloc = (w) => Math.round(premiumAmount * (w / wSum));
  const premiumBreakdown = { schoolPremium: alloc(wSchool), redevelopmentPremium: alloc(wRedev), scarcityPremium: alloc(wScarcity), locationPremium: alloc(wLocation), investorDemandPremium: alloc(wInvestor), policyPremium: alloc(wPolicy) };

  return { specialMarketType, premiumScore, premiumLevel, classificationReasons: reasons.slice(0, 3), confidenceCap: CONF_CAP[specialMarketType], warnings, subScores, intrinsicFairPrice, marketReferencePrice, premiumAmount, premiumRatio, reconstructionStage, stageScore, premiumBreakdown };
}

function MarketTypeBadge({ mc }) {
  const MAP = { normal: ["일반", "bg-slate-100 text-slate-600"], semiPremium: ["준프리미엄", "bg-amber-100 text-amber-700"], redevelopment: ["재건축형", "bg-orange-100 text-orange-700"], primePremium: ["프리미엄형", "bg-red-100 text-red-700"], investmentPremium: ["투자수요형", "bg-red-100 text-red-700"], policyDriven: ["정책변수형", "bg-orange-100 text-orange-700"], lowData: ["데이터 부족", "bg-slate-200 text-slate-600"], abnormalInput: ["입력오류 의심", "bg-slate-200 text-slate-600"] };
  const [label, cls] = MAP[mc.specialMarketType] || MAP.normal;
  const strong = ["redevelopment", "primePremium", "investmentPremium", "policyDriven"].includes(mc.specialMarketType);
  return (
    <div className={`rounded-2xl p-4 ring-1 ${strong ? "bg-orange-50 ring-orange-200" : mc.specialMarketType === "semiPremium" ? "bg-amber-50 ring-amber-100" : "bg-white ring-slate-100"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-lg px-2.5 py-1 text-sm font-bold ${cls}`}>{label}</span>
        {mc.specialMarketType !== "lowData" && mc.specialMarketType !== "abnormalInput" && <span className="text-xs text-slate-500">프리미엄 {mc.premiumScore}점 · {mc.premiumLevel}</span>}
      </div>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-600">{mc.classificationReasons.map((t, i) => <li key={i}>· {t}</li>)}</ul>
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
  else if (x.monthlyRatio != null) s.push(x.monthlyRatio > 45 ? `자금상 매수는 가능하지만 월상환 부담(소득 대비 ${x.monthlyRatio}%)이 높아 가격 협상 후 검토가 적절합니다.` : x.monthlyRatio > 30 ? `자금 여건은 가능하나 월상환 부담이 다소 있어 여유 자금을 확인하세요.` : `자금·월상환 여건은 비교적 안정적입니다.`);
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
  else if (shortfallCash > 0) { finalLabel = "자금 보강 필요"; action = `현금 ${won(shortfallCash)} 부족 — 자금 보강 후 검토하세요`; }
  else if (mr != null && mr > 45) { finalLabel = "자금 부담 큼"; action = `월상환 부담 ${mr}% (45% 초과) — 자금 여건 보강이 필요합니다`; }
  else if (mr != null && mr >= 30) { finalLabel = "가격 협상 후 검토"; action = `월상환 부담 ${mr}% — 가격 협상으로 부담을 낮춘 뒤 검토하세요`; }
  else if (buyerScore >= 75) { finalLabel = "가격 조건 양호"; action = "적정가·자금·보유 여건 양호 — 가격 적정성 기준 매수를 검토해볼 수 있습니다"; }
  else if (buyerScore >= 55) { finalLabel = "협상 후 검토"; action = "가격 여건 보통 — 협상을 통한 가격 조정 후 검토를 권합니다"; }
  else if (buyerScore >= 40) { finalLabel = "신중 접근"; action = "가격·자금 여건 미흡 — 신중한 접근이 필요합니다"; }
  else { finalLabel = "가격 부담 큼"; action = "가격·자금·리스크 부담이 있습니다 — 신중한 접근이 필요합니다"; }
  // ── 정확도/신뢰도 위험 시 보수화 (일반 단지) ──
  if (!isSpecial && specialMarketType !== "abnormalInput" && specialMarketType !== "lowData") {
    const lowConf = decisionConfidence < 50 || mockPenalty >= 30;
    if (lowConf && finalLabel === "가격 조건 양호") { finalLabel = "협상 후 검토"; action = "데이터 신뢰도가 낮아 보수적으로 — 가격 협상 후 검토를 권합니다"; }
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
  if (income || cash) reasons.push(shortfallCash > 0 ? `[자금] 현금 ${won(shortfallCash)} 부족 (총 매입비용 ${won(totalBuyCost)})` : `[자금] 월상환 ${won(monthlyPayment)} · 소득대비 ${mr != null ? mr : "—"}% (${fundRisk})`);
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
    finalLabel, action, reasons, sentences,
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
    (priceOK && fundProblem) ? "가격은 적정 수준이나 자금 조건 보강이 필요합니다." :
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
        데이터 신뢰도 {r.dataConfLabel} · 분석 적합도 {bd.fitLabel}
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
                  {[["필요 현금", won(a.neededCash)], ["부족 현금", a.shortfallCash > 0 ? won(a.shortfallCash) : "없음"], ["월 상환액", a.monthlyPayment ? won(a.monthlyPayment) : "—"], ["월상환 부담", a.monthlyRatio != null ? `${a.monthlyRatio}%` : "—"]].map(([l, v]) => (
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
// 내 자산 — 관심단지 · 최근 분석 단지(다시 분석) · 재무 프로필 · 최근 본 단지
// 과거 분석 전체 이력·점수 히스토리·백테스트·저장 목록은 상용화 단순화로 제외
// TODO(API): 웹앱 전환 시 알림 트래킹 추가 — 관심단지 변화 감지 / 적정가 변화 / 매수판단 변화 / 시장위험 변화
function AdvancedView({ watch, setWatch, history, finProfile, onReanalyze }) {
  const recent = (history || []).slice(0, 5);
  const fp = finProfile;
  const won2 = (a) => (a ? won(Number(a) * 10000) : "—");
  return (
    <>
      <header className="mb-5 text-center"><h1 className="text-2xl font-bold text-slate-900">내 자산</h1><p className="mt-2 text-sm text-slate-500">관심단지·최근 분석·재무 프로필을 한 곳에서 봅니다.</p></header>

      {/* 1. 관심단지 */}
      <section className="mb-6"><WatchView watch={watch} setWatch={setWatch} /></section>

      {/* 2. 최근 분석 단지 + 다시 분석 */}
      <section className="mb-6">
        <h2 className="mb-2 text-xl font-bold text-slate-900">최근 분석 단지</h2>
        {recent.length === 0 ? (
          <Empty title="최근 분석한 단지가 없습니다" desc="적정가/매수 분석을 한 번 실행하면 여기에 표시됩니다." />
        ) : (
          <div className="space-y-3">
            {recent.map((h, i) => (
              <div key={i} className={`${card} flex items-center justify-between`}>
                <div><p className="font-semibold text-slate-900">{h.complex} <span className="text-xs font-normal text-slate-400">{h.dong} {h.area}</span></p><p className="mt-1 text-xs text-slate-400">{h.date} · 매물가 {won(h.currentPrice)} · 엔진 산출 적정가 {won(h.fairPrice)}</p></div>
                <div className="flex items-center gap-2">{h.grade && GS[h.grade] && <span className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold text-white ${GS[h.grade].solid}`}>{h.grade}</span>}<button onClick={() => onReanalyze && onReanalyze()} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: NAVY }}>다시 분석</button></div>
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
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">추천 후보 탭 「내 조건」에서 입력한 값입니다. 대출 가능액·월상환은 개략 추정이며 실제 승인금리·한도는 신용점수·소득증빙·DSR·담보평가·금융사 심사에 따라 달라질 수 있습니다.</p>
          </div>
        ) : (
          <Empty title="재무 프로필이 없습니다" desc="추천 후보 탭의 「내 조건」을 입력하고 후보를 찾으면 여기에 저장됩니다." />
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

export default function App() {
  const [ptype, setPtype] = useState("apartment");   // 상위 카테고리
  const [aptTab, setAptTab] = useState("fair");       // 아파트 내부 메뉴 (기본: 적정가)
  const [roomTab, setRoomTab] = useState("search");   // 원룸 내부 메뉴
  const [history, setHistory] = useState([]);
  const [watch, setWatch] = useState([]);
  const [finProfile, setFinProfile] = useState(null);  // 추천후보 탭 「내 조건」 → 내 자산 재무 프로필 공유
  const [buyCtx, setBuyCtx] = useState(null);         // 매수 입력값 → 매수세금 자동 반영용
  const [sellCtx, setSellCtx] = useState(null);       // 매도 입력값 → 매도세금 자동 반영용

  const subTabs = ptype === "apartment" ? apartmentTabsDef : ptype === "oneRoom" ? oneRoomTabsDef : null;
  const curSub = ptype === "apartment" ? aptTab : roomTab;
  const setSub = ptype === "apartment" ? setAptTab : setRoomTab;

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-3 py-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="whitespace-nowrap text-sm font-bold" style={{ color: NAVY }}>이 집 사도 될까?</span>
            <div className="flex flex-1 gap-1">
              {propertyTypes.map((pt) => (
                <button key={pt.key} onClick={() => setPtype(pt.key)} className={`flex-1 whitespace-nowrap rounded-lg py-1.5 text-sm font-bold ${ptype === pt.key ? "text-white" : "bg-slate-100 text-slate-500"}`} style={ptype === pt.key ? { backgroundColor: NAVY } : {}}>{pt.label}</button>
              ))}
            </div>
          </div>
          {subTabs && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {subTabs.map(([k, l]) => (
                <button key={k} onClick={() => setSub(k)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${curSub === k ? "text-white" : "text-slate-500 hover:bg-slate-100"}`} style={curSub === k ? { backgroundColor: "#334155" } : {}}>{l}</button>
              ))}
            </div>
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-8">
        {ptype === "apartment" && (<>
          <div style={{display: (aptTab === "fair" || aptTab === "buy") ? "block" : "none"}}><BuyView mode={aptTab === "fair" ? "fair" : "buy"} onSaveHistory={(h) => setHistory((p) => [h, ...p])} onAddWatch={(w) => setWatch((p) => [w, ...p.filter((x) => x.key !== w.key)])} onContext={(c) => setBuyCtx(c)} /></div>
          <div style={{display: aptTab === "sell" ? "block" : "none"}}><SellView onContext={(c) => setSellCtx(c)} /></div>
          {aptTab === "tax" && <TaxView buyCtx={buyCtx} sellCtx={sellCtx} />}
          {aptTab === "reco" && <BudgetView onProfile={(p) => setFinProfile(p)} />}
          {aptTab === "adv" && <AdvancedView watch={watch} setWatch={setWatch} history={history} finProfile={finProfile} onReanalyze={() => setAptTab("fair")} />}
        </>)}
        {ptype === "oneRoom" && <OneRoomView tab={roomTab} />}
        {ptype === "multiFamily" && <ComingSoon title="다가구 주택 분석" desc="호별 임대수익 환원법으로 다가구의 적정 매입가·수익가치를 평가합니다." />}
        {ptype === "commercial" && <ComingSoon title="상가 분석" desc="임대료·공실률·환원율 기반으로 상가의 수익가치와 입지를 평가합니다." />}
        <p className="mt-6 px-2 text-xs leading-relaxed text-slate-400">{LEGAL}</p>
        <p className="mt-2 px-2 text-xs text-slate-300">※ 미리보기 버전 — 계산식은 실제 서비스에서 서버에 보관됩니다.</p>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 법정동 코드 매핑 (국토부 API용) ──────────────────────────
// 법정동 앞 5자리 코드 (시군구 단위)
// ───────────────────────────────────────────────────────────────
const LAWD_CD_MAP = {
  // 서울 (11)
  "종로구":11110,"중구":11140,"용산구":11170,"성동구":11200,"광진구":11215,
  "동대문구":11230,"중랑구":11260,"성북구":11290,"강북구":11305,"도봉구":11320,
  "노원구":11350,"은평구":11380,"서대문구":11410,"마포구":11440,"양천구":11470,
  "강서구":11500,"구로구":11530,"금천구":11545,"영등포구":11560,"동작구":11590,
  "관악구":11620,"서초구":11650,"강남구":11680,"송파구":11710,"강동구":11740,
  // 부산 (26)
  "부산중구":26110,"부산서구":26140,"부산동구":26170,"영도구":26200,"부산진구":26230,
  "동래구":26260,"부산남구":26290,"부산북구":26320,"해운대구":26350,"사하구":26380,
  "금정구":26410,"부산강서구":26440,"연제구":26470,"수영구":26500,"사상구":26530,"기장군":26710,
  // 대구 (27)
  "대구중구":27110,"대구동구":27140,"대구서구":27170,"대구남구":27200,"대구북구":27230,
  "수성구":27260,"달서구":27290,"달성군":27710,
  // 인천 (28)
  "인천중구":28110,"인천동구":28140,"미추홀구":28177,"연수구":28185,"남동구":28200,
  "부평구":28237,"계양구":28245,"인천서구":28260,"강화군":28710,"옹진군":28720,
  // 광주 (29)
  "광주동구":29110,"광주서구":29140,"광주남구":29155,"광주북구":29170,"광산구":29200,
  // 대전 (30)
  "대전동구":30110,"대전중구":30140,"대전서구":30170,"유성구":30200,"대덕구":30230,
  // 울산 (31)
  "울산중구":31110,"울산남구":31140,"울산동구":31170,"울산북구":31200,"울주군":31710,
  // 세종 (36)
  "세종시":36110,"세종특별자치시":36110,
  // 경기 (41)
  "수원시":41110,"수원시장안구":41111,"수원시권선구":41113,"수원시팔달구":41115,"수원시영통구":41117,
  "성남시":41130,"성남시수정구":41131,"성남시중원구":41133,"성남시분당구":41135,
  "의정부시":41150,"안양시":41170,"안양시만안구":41171,"안양시동안구":41173,
  "부천시":41190,"광명시":41210,"평택시":41220,"동두천시":41250,
  "안산시":41270,"안산시상록구":41271,"안산시단원구":41273,
  "고양시":41280,"고양시덕양구":41281,"고양시일산동구":41285,"고양시일산서구":41287,
  "과천시":41290,"구리시":41310,"남양주시":41360,"오산시":41370,"시흥시":41390,
  "군포시":41410,"의왕시":41430,"하남시":41450,
  "용인시":41460,"용인시처인구":41461,"용인시기흥구":41463,"용인시수지구":41465,
  "파주시":41480,"이천시":41500,"안성시":41550,"김포시":41570,
  "화성시":41590,"광주시":41610,"양주시":41630,"포천시":41650,"여주시":41670,
  "연천군":41800,"가평군":41820,"양평군":41830,
  // 강원 (42)
  "춘천시":42110,"원주시":42130,"강릉시":42150,"동해시":42170,"태백시":42190,
  "속초시":42210,"삼척시":42230,"홍천군":42720,"횡성군":42730,"영월군":42750,
  "평창군":42760,"정선군":42770,"철원군":42780,"화천군":42790,"양구군":42800,
  "인제군":42810,"고성군":42820,"양양군":42830,
  // 충북 (43)
  "청주시":43110,"청주시상당구":43111,"청주시서원구":43112,"청주시흥덕구":43113,"청주시청원구":43114,
  "충주시":43130,"제천시":43150,"보은군":43720,"옥천군":43730,"영동군":43740,
  "증평군":43745,"진천군":43750,"괴산군":43760,"음성군":43770,"단양군":43800,
  // 충남 (44)
  "천안시":44130,"천안시동남구":44131,"천안시서북구":44133,
  "공주시":44150,"보령시":44180,"아산시":44200,"서산시":44210,"논산시":44230,
  "계룡시":44250,"당진시":44270,"금산군":44710,"부여군":44760,"서천군":44770,
  "청양군":44790,"홍성군":44800,"예산군":44810,"태안군":44825,
  // 전북 (45)
  "전주시":45110,"전주시완산구":45111,"전주시덕진구":45113,
  "군산시":45130,"익산시":45140,"정읍시":45180,"남원시":45190,"김제시":45210,
  "완주군":45710,"진안군":45720,"무주군":45730,"장수군":45740,"임실군":45750,
  "순창군":45770,"고창군":45790,"부안군":45800,
  // 전남 (46)
  "목포시":46110,"여수시":46130,"순천시":46150,"나주시":46170,"광양시":46230,
  "담양군":46710,"곡성군":46720,"구례군":46730,"고흥군":46770,"보성군":46780,
  "화순군":46790,"장흥군":46800,"강진군":46810,"해남군":46820,"영암군":46830,
  "무안군":46840,"함평군":46860,"영광군":46870,"장성군":46880,"완도군":46890,
  "진도군":46900,"신안군":46910,
  // 경북 (47)
  "포항시":47110,"포항시남구":47111,"포항시북구":47113,
  "경주시":47130,"김천시":47150,"안동시":47170,"구미시":47190,"영주시":47210,
  "영천시":47230,"상주시":47250,"문경시":47280,"경산시":47290,
  "군위군":47720,"의성군":47730,"청송군":47740,"영양군":47750,"영덕군":47760,
  "청도군":47820,"고령군":47830,"성주군":47840,"칠곡군":47850,"예천군":47900,
  "봉화군":47920,"울진군":47930,"울릉군":47940,
  // 경남 (48)
  "창원시":48120,"창원시의창구":48121,"창원시성산구":48123,"창원시마산합포구":48125,
  "창원시마산회원구":48127,"창원시진해구":48129,
  "진주시":48170,"통영시":48220,"사천시":48240,"김해시":48250,"밀양시":48270,
  "거제시":48310,"양산시":48330,"의령군":48720,"함안군":48730,"창녕군":48740,
  "고성군":48820,"남해군":48840,"하동군":48850,"산청군":48860,"함양군":48870,
  "거창군":48880,"합천군":48890,
  // 제주 (50)
  "제주시":50110,"서귀포시":50130,
};

// 동 → 법정동 코드 매핑 (주요 동)
const DONG_TO_LAWD = {
  // 노원구
  "공릉동":11350,"월계동":11350,"하계동":11350,"중계동":11350,"상계동":11350,
  // 강남구
  "대치동":11680,"압구정동":11680,"청담동":11680,"역삼동":11680,"삼성동":11680,"개포동":11680,"도곡동":11680,
  // 서초구
  "반포동":11650,"잠원동":11650,"방배동":11650,"서초동":11650,"양재동":11650,
  // 송파구
  "잠실동":11710,"신천동":11710,"문정동":11710,"가락동":11710,"송파동":11710,
  // 강동구
  "둔촌동":11740,"암사동":11740,"명일동":11740,"고덕동":11740,
  // 용산구
  "한남동":11170,"이촌동":11170,"이태원동":11170,
  // 양천구
  "목동":11470,"신정동":11470,
  // 마포구
  "상암동":11440,"공덕동":11440,"합정동":11440,
  // 성동구
  "성수동":11200,"옥수동":11200,"금호동":11200,
  // 광진구
  "자양동":11215,"구의동":11215,
  // 동작구
  "흑석동":11590,"사당동":11590,
  // 관악구
  "봉천동":11620,"신림동":11620,
  // 영등포구
  "여의도동":11560,"당산동":11560,
  // 강서구
  "마곡동":11500,"화곡동":11500,
  // 은평구
  "불광동":11380,"응암동":11380,
  // 동대문구
  "전농동":11230,"답십리동":11230,
  // 성북구
  "길음동":11290,"종암동":11290,
  // 도봉구
  "창동":11320,"방학동":11320,
  // 강북구
  "미아동":11305,"번동":11305,
  // 중랑구
  "면목동":11260,"망우동":11260,
  // 경기 분당
  "서현동":41135,"이매동":41135,"야탑동":41135,"정자동":41135,"수내동":41135,
  // 경기 판교
  "백현동":41135,"삼평동":41135,"운중동":41135,
  // 경기 수원
  "영통동":41111,"권선동":41111,"장안동":41111,
  // 경기 용인
  "수지구":41465,"기흥구":41463,
  // 경기 고양
  "일산동구":41285,"일산서구":41287,"덕양구":41281,
  // 경기 안양
  "동안구":41173,"만안구":41171,
  // 경기 성남
  "수정구":41131,"중원구":41133,"분당구":41135,
  // 인천
  "송도동":28185,"청라동":28260,"구월동":28200,
  // 부산
  "해운대동":26350,"센텀동":26350,"마린시티":26350,
  // 대구
  "범어동":27260,"수성동":27260,"만촌동":27260,
  "이곡동":27290,"본리동":27290,"상인동":27290,"월성동":27290,"대천동":27290,"도원동":27290,"유천동":27290,"진천동":27290,"감삼동":27290,"죽전동":27290,"장기동":27290,"용산동":27290,
  // 대전
  "둔산동":30170,"유성동":30200,
};

// 동 이름으로 법정동 코드 추론
function getLawdCd(dong, region) {
  if (!dong && !region) return null;
  const searchStr = (region || "") + " " + (dong || "");

  // 1. 시/도 + 구 조합으로 정확히 매핑 (중구/서구 등 중복 구명 해결)
  // 예: "대구" + "중구" → 대구중구(27110)
  const CITY_PREFIX = [
    ["서울",11],["부산",26],["대구",27],["인천",28],["광주",29],
    ["대전",30],["울산",31],["세종",36],["경기",41],["강원",42],
    ["충북",43],["충남",44],["전북",45],["전남",46],["경북",47],["경남",48],["제주",50],
  ];
  for (const [city, prefix] of CITY_PREFIX) {
    if (searchStr.includes(city)) {
      // 이 시/도에 속하는 코드만 필터
      for (const [key, code] of Object.entries(LAWD_CD_MAP)) {
        if (Math.floor(code/1000) === prefix && searchStr.includes(key)) {
          return String(code);
        }
      }
    }
  }

  // 2. 동 이름 직접 매핑
  if (dong && DONG_TO_LAWD[dong]) return String(DONG_TO_LAWD[dong]);

  // 3. region/dong에서 구 이름 단순 매핑 (fallback)
  for (const [key, code] of Object.entries(LAWD_CD_MAP)) {
    if (searchStr.includes(key)) return String(code);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// ── 조회 모듈 (Data Fetch Layer) ──────────────────────────────
// 국토부 실거래가 공공 API 사용 (무료)
// KB시세는 수기 입력 (API 없음)
// ───────────────────────────────────────────────────────────────
async function fetchMolitData(lawdCd, complexName, areaExclusive, months = 12) {
  const now = new Date();
  const results = { sale: [], jeonse: [] };

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;

    const [saleRes, rentRes] = await Promise.all([
      fetch("/api/molit", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sale", lawdCd, dealYmd: ym }) }),
      fetch("/api/molit", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rent", lawdCd, dealYmd: ym }) }),
    ]);

    const saleData = await saleRes.json();
    const rentData = await rentRes.json();

    // 단지명 필터링 (부분 일치)
    const nameFilter = (name) => {
      if (!complexName) return true;
      const n = String(name || "").replace(/\s/g, "");
      const c = complexName.replace(/\s/g, "");
      if (n.includes(c) || c.includes(n)) return true;
      // 유사 매칭: 앞 글자부터 4글자 이상 공통이면 같은 단지로 간주
      const minLen = Math.min(n.length, c.length);
      let common = 0;
      for (let i = 0; i < minLen; i++) { if (n[i] === c[i]) common++; else break; }
      if (common >= 3) return true;
      // 단지명에서 숫자/특수문자 제거 후 비교 (푸르지오 vs 푸로지오 등)
      const normalize = (s) => s.replace(/[0-9]/g, "").replace(/[가-힣]/g, (ch) => ch);
      const n2 = normalize(n), c2 = normalize(c);
      return n2.includes(c2.slice(0,4)) || c2.includes(n2.slice(0,4));
    };

    // 면적 필터 (±3㎡ 허용)
    const areaFilter = (area) => {
      if (!areaExclusive || Number(areaExclusive) <= 0) return true;
      return Math.abs(Number(area) - Number(areaExclusive)) <= 3;
    };

    (saleData.items || []).forEach(item => {
      if (!nameFilter(item.aptNm)) return;
      if (!areaFilter(item.excluUseAr)) return;
      const price = Number(String(item.dealAmount || "").replace(/,/g, ""));
      if (!price) return;
      results.sale.push({
        ym: `${item.dealYear}-${String(item.dealMonth).padStart(2, "0")}`,
        price: Math.round(price),
        floor: Number(item.floor) || 5,
        areaSqm: Math.round((Number(item.excluUseAr) || 0) * 100) / 100,
        complexName: item.aptNm,
        buildYear: Number(item.buildYear) || 0,
        region: item.siGunGu || item.sggNm || "",
      });
    });

    (rentData.items || []).forEach(item => {
      if (!nameFilter(item.aptNm)) return;
      if (!areaFilter(item.excluUseAr)) return;
      if (item.monthlyRent && Number(item.monthlyRent) > 0) return; // 월세 제외
      const price = Number(String(item.deposit || "").replace(/,/g, ""));
      if (!price) return;
      results.jeonse.push({
        ym: `${item.dealYear}-${String(item.dealMonth).padStart(2, "0")}`,
        price: Math.round(price),
        floor: Number(item.floor) || 5,
        areaSqm: Math.round((Number(item.excluUseAr) || 0) * 100) / 100,
        complexName: item.aptNm,
      });
    });

    if (results.sale.length >= 10 && results.jeonse.length >= 10) break;
  }

  // 최신순 정렬 후 각 최대 10건
  results.sale.sort((a, b) => b.ym.localeCompare(a.ym));
  results.jeonse.sort((a, b) => b.ym.localeCompare(a.ym));
  results.sale = results.sale.slice(0, 10);
  results.jeonse = results.jeonse.slice(0, 10);

  return results;
}

async function fetchApartmentData(query) {
  // query: { complexName, dong, region, areaExclusive }
  // 반환: ApartmentRawData (JSON 객체) — 실패 시 throw

  const lawdCd = getLawdCd(query.dong, query.region);
  if (!lawdCd) {
    throw new Error(`법정동 코드를 찾지 못했습니다 (동: ${query.dong}, 지역: ${query.region}). 지역(구)명을 함께 입력해주세요.`);
  }

  // ── 단계적 조회: 12개월 → 36개월 → 단지정보 API ──
  let sale = [], jeonse = [], dataMonths = 12, noTradeWarning = null;

  // [1단계] 12개월
  ({ sale, jeonse } = await fetchMolitData(lawdCd, query.complexName, query.areaExclusive, 12));

  // [2단계] 0건이면 36개월 확장
  if (sale.length === 0 && jeonse.length === 0) {
    ({ sale, jeonse } = await fetchMolitData(lawdCd, query.complexName, query.areaExclusive, 36));
    if (sale.length > 0 || jeonse.length > 0) {
      dataMonths = 36;
      const oldest = [...sale, ...jeonse].map(d => d.ym).sort()[0];
      noTradeWarning = `최근 12개월 거래 없음 — ${oldest} 거래 기준 (최대 36개월 확장)`;
    }
  }

  // 면적 옵션 추출 (실거래 기준)
  const allAreas = [...sale, ...jeonse].map(d => d.areaSqm).filter(a => a > 0);
  const uniqueAreas = [...new Set(allAreas)].sort((a, b) => a - b);
  let areaOptions = uniqueAreas.map(a => ({ areaSqm: a, pyeong: typicalPyeong(a) }));

  // [3단계] 36개월도 0건 → 단지정보 API로 면적만
  if (sale.length === 0 && jeonse.length === 0) {
    try {
      const complexRes = await fetch("/api/molit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "complex", lawdCd, complexName: query.complexName }),
      });
      const complexData = await complexRes.json();
      const complexAreas = (complexData.items || [])
        .map(i => Number(i.excluUseAr)).filter(a => a > 0);
      const uniqueComplexAreas = [...new Set(complexAreas)].sort((a, b) => a - b);
      if (uniqueComplexAreas.length > 0) {
        areaOptions = uniqueComplexAreas.map(a => ({ areaSqm: a, pyeong: typicalPyeong(a) }));
        noTradeWarning = "최근 3년간 거래 없음 — KB시세를 직접 입력하세요";
      } else {
        noTradeWarning = "최근 3년간 거래 없음 — 면적·KB시세를 직접 입력하세요";
      }
    } catch(e) {
      noTradeWarning = "최근 3년간 거래 없음 — 면적·KB시세를 직접 입력하세요";
    }
  }

  // 대표 면적 결정
  const askedArea = Number(query.areaExclusive) || 0;
  let areaSqm = 0;
  if (askedArea > 0) {
    const found = uniqueAreas.find(a => Math.abs(a - askedArea) <= 3);
    areaSqm = found || 0;
  } else if (uniqueAreas.length > 0) {
    areaSqm = 0; // 면적 미지정이면 0으로 두고 areaOptions 제공
  }

  // 최근 매매 실거래 기준 buildYear만 (currentPrice는 사용자 입력)
  const recentSale = sale[0];
  const currentPrice = 0; // 사용자가 직접 입력
  const buildYear = recentSale ? (Number(recentSale.buildYear) || 0) : 0;

  // 법정동 코드 → 지역명 역변환
  const LAWD_CD_REVERSE = Object.fromEntries(Object.entries(LAWD_CD_MAP).map(([k, v]) => [String(v), k]));
  const lawdCdFromQuery = getLawdCd(query.dong, query.region);
  const regionFromCode = lawdCdFromQuery ? (LAWD_CD_REVERSE[lawdCdFromQuery] || "") : "";

  // 지역(시군구) 추출 — 쿼리에 없으면 코드 역변환
  const region = query.region || regionFromCode || (recentSale ? recentSale.region || "" : "");

  // 전세 실거래 기준 baseJeonse 추정
  const recentJeonse = jeonse[0];
  const baseJeonseEstimate = recentJeonse ? recentJeonse.price : 0;

  return {
    region,
    dong: query.dong || "",
    complexName: query.complexName || "",
    areaSqm,
    pyeong: areaSqm > 0 ? typicalPyeong(areaSqm) : 0,
    priceArea: areaSqm,
    buildYear,
    topFloor: 0,
    currentPrice,
    kbSalePrice: 0,
    kbJeonse: 0,
    baseJeonseEstimate,
    jeonse,
    sale,
    areaOptions,
    noTradeWarning,
  };
}

// ── 분석 입력 조립 모듈 (Transform Layer) ──────────────────────
// fetchApartmentData 결과(rawData)를 받아 analyze() 입력 형태로 변환.
// 조회 모듈과 계산 엔진 사이의 변환만 담당 — 두 모듈 모두 수정하지 않음.
//
// TODO(API 전환 시):
//   - rawData 구조가 달라지면 이 함수의 파싱 부분만 수정
//   - 반환 형태(ff, jeonseCalc, saleCalc, blockReason)는 유지
// ───────────────────────────────────────────────────────────────
function buildAnalysisInput(rawData, baseForm, askedArea) {
  // rawData   : fetchApartmentData 반환값 (ApartmentRawData JSON)
  // baseForm  : 사용자가 입력한 현재 폼 상태 (dong, complexName 등 보정용)
  // askedArea : 사용자가 입력한 전용면적 (면적 불일치 검증용)
  // 반환      : { filled, ff, jeonseCalc, saleCalc, blockReason, warns, areaOptions }
  const p = rawData;
  const tf = Number(p.topFloor) || 15;
  const norm = (arr) => (Array.isArray(arr) ? arr.filter((d) => d && d.price && d.ym).map((d) => ({ ym: d.ym, price: Number(d.price), floor: Number(d.floor) || 5, topFloor: tf })) : []);
  const jd = norm(p.jeonse), sd = norm(p.sale);
  const areaSqm = Number(p.areaSqm) || 0;
  const priceArea = Number(p.priceArea) || 0;
  const pyeong = areaSqm > 0 ? typicalPyeong(areaSqm) : 0;
  const areaOptions = Array.isArray(p.areaOptions) ? p.areaOptions.filter((o) => Number(o.areaSqm) > 0).map((o) => ({ areaSqm: Number(o.areaSqm), pyeong: typicalPyeong(Number(o.areaSqm)) })) : [];

  // 정합성 검증
  const warns = [];
  if (p.noTradeWarning) warns.push(`⚠️ ${p.noTradeWarning}`);
  if (areaSqm <= 0 && !askedArea) warns.push("전용면적 미확인 — 면적을 직접 확인/입력하세요.");
  const mismatch = areaSqm > 0 && priceArea > 0 && Math.abs(priceArea - areaSqm) > Math.max(3, areaSqm * 0.06);
  if (mismatch) warns.push(`가격은 전용 ${priceArea}㎡ 기준인데 단지 기준면적은 ${areaSqm}㎡로 다릅니다.`);
  if (askedArea > 0 && areaSqm > 0 && Math.abs(askedArea - areaSqm) > Math.max(3, askedArea * 0.06)) warns.push(`입력한 전용 ${askedArea}㎡와 조회된 가격 기준 ${areaSqm}㎡가 다릅니다.`);
  const kbRatio = Number(p.kbSalePrice) > 0 && Number(p.kbJeonse) > 0 ? Number(p.kbJeonse) / Number(p.kbSalePrice) : 0;
  if (kbRatio > 0.9) warns.push("전세가율이 비정상적으로 높습니다. 면적/가격 기준을 확인하세요.");
  if (Number(p.kbJeonse) > 0 && Number(p.kbSalePrice) > 0 && Number(p.kbJeonse) >= Number(p.kbSalePrice)) warns.push("전세가가 매매가 이상입니다. 입력값을 확인하세요.");

  const filled = {
    ...EMPTY,
    region: p.region || baseForm.region || "",
    dong: p.dong || baseForm.dong || "",
    complexName: p.complexName || baseForm.complexName,
    pyeong, areaExclusive: areaSqm || "", priceArea,
    buildYear: p.buildYear || "",
    currentPrice: Number(p.currentPrice) || "",
    kbSalePrice: Number(p.kbSalePrice) || "",
    kbJeonse: Number(p.kbJeonse) || "",
    deals: jd, saleDeals: sd, shockLevel: "보통",
    _aiFilled: true, _aiSource: "국토부 실거래·KB·호갱노노 웹검색(AI)",
    _aiWarns: warns, _aiAreaOptions: areaOptions,
  };

  // computeTrimmedMean 호출 — 계산 엔진은 수정하지 않음
  const jeonseCalc = jd.length ? computeTrimmedMean(jd, Number(filled.kbJeonse) || 0, "jeonse") : null;
  const baseJeonse = jeonseCalc && jeonseCalc.value ? jeonseCalc.value : Number(filled.kbJeonse) || 0;
  const saleCalc = sd.length ? computeTrimmedMean(sd, Number(filled.kbSalePrice) || 0, "sale") : null;

  // 자동 분석 차단 여부 — 차단 사유가 있으면 ff=null, UI는 직접수정 버튼 표시
  const blockReason = (areaSqm <= 0 && !askedArea)
    ? `전용면적을 확인하지 못했습니다.${areaOptions.length ? ` (조회된 면적: ${areaOptions.map((o) => o.areaSqm + "㎡").join(", ")})` : " 직접 입력해 주세요."}`
    : mismatch ? "가격과 면적 기준이 달라 보입니다. 직접 확인 후 수정하세요."
    : (!filled.currentPrice || !baseJeonse) ? "일부 필수 값(현재가·전세 시세)을 채우지 못했습니다. 직접 수정하세요."
    : null;

  const ff = blockReason ? null : {
    ...filled,
    currentPrice: Number(filled.currentPrice),
    baseJeonse,
    kbSalePrice: Number(filled.kbSalePrice),
    saleRef: saleCalc && saleCalc.value ? saleCalc.value : null,
    jeonseUsed: jeonseCalc ? jeonseCalc.used : 0,
    saleUsed: saleCalc ? saleCalc.used : 0,
    jeonseCalc, saleCalc, dataSource: "ai",
  };

  return { filled, ff, jeonseCalc, saleCalc, blockReason, warns, areaOptions };
}
// ═══════════════════════════════════════════════════════════════

function BuyView({ onSaveHistory, onAddWatch, onContext, mode = "buy" }) {
  const [f, setF] = useState(EMPTY);
  const [r, setR] = useState(null);
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState(null);
  const [pending, setPending] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const abortRef = useRef(null);
  const [areaOptions, setAreaOptions] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]); // 캡처 썸네일
  const [captureMsg, setCaptureMsg] = useState(null); // 캡처 성공 메시지 (별도)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  // 화면은 버튼 하나지만 내부는 3단 파이프라인으로 분리:
  //   [1] fetchApartmentData  → 조회 모듈 (API 전환 시 이 함수만 교체)
  //   [2] buildAnalysisInput  → 변환 모듈 (rawData → analyze() 입력 형태)
  //   [3] analyze()           → 계산 엔진 (ConfirmStep → doAnalyze에서 실행, 절대 수정 금지)
  // ─────────────────────────────────────────────────────────────
  async function quickSearch(overrideArea, overrideForm) {
    const ff = overrideForm ? { ...f, ...overrideForm } : f;
    if (!ff.complexName && !(ff.currentPrice && ff.kbJeonse)) { setAiMsg("최소한 단지명을 입력하세요. (예: 동부)"); return; }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiLoading(true); setAiMsg(null); setPending(null);
    try {
      // ── [1] 조회 모듈 ── API 전환 시 fetchApartmentData 함수만 교체하면 됨
      const rawData = await fetchApartmentData({
        complexName: ff.complexName,
        dong: ff.dong,
        region: ff.region,
        areaExclusive: overrideArea ? String(overrideArea) : ff.areaExclusive,
      });
      // ── [2] 변환 모듈 ── rawData → analyze() 입력 형태 조립
      const { filled, ff: builtFf, jeonseCalc, saleCalc, blockReason } = buildAnalysisInput(
        rawData, ff, Number(ff.areaExclusive) || 0
      );
      // KB시세/매물가/면적/준공연도를 캡처에서 가져온 값으로 보정
      if (ff.kbSalePrice) filled.kbSalePrice = ff.kbSalePrice;
      if (ff.kbJeonse) filled.kbJeonse = ff.kbJeonse;
      if (ff.currentPrice) filled.currentPrice = ff.currentPrice;
      if (ff.areaExclusive) filled.areaExclusive = ff.areaExclusive;
      if (ff.buildYear && !filled.buildYear) filled.buildYear = ff.buildYear;
      setF(filled);
      // 면적 옵션 저장
      const opts = (filled._aiAreaOptions && filled._aiAreaOptions.length > 0)
        ? filled._aiAreaOptions
        : (rawData.areaOptions && rawData.areaOptions.length > 0 ? rawData.areaOptions : []);
      setAreaOptions(opts);

      // 면적 미지정 + 옵션 있으면 → 면적 선택 먼저, ConfirmStep 안 감
      const askedArea = Number(overrideArea || ff.areaExclusive) || 0;
      if (askedArea <= 0 && opts.length > 0) {
        setAiMsg(null);
        return;
      }

      const pendingFf = builtFf || {
        ...filled,
        currentPrice: Number(filled.currentPrice) || 0,
        baseJeonse: Number(filled.kbJeonse) || 0,
        kbSalePrice: Number(filled.kbSalePrice) || 0,
        jeonseUsed: 0, saleUsed: 0,
        jeonseCalc: null, saleCalc: null, dataSource: "ai",
      };
      setPending({ ff: pendingFf, jeonseCalc, saleCalc, blockReason });
      // ── [3] 계산 엔진(analyze) ── ConfirmStep → doAnalyze 에서 실행 (절대 수정 금지)
    } catch (e) {
      setAiMsg("조회 실패 — 직접 수정하기를 눌러 값을 입력하세요.");
    } finally { setAiLoading(false); }
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: prompt }] }] }),
      });
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
  function doAnalyze(updated) {
    const src = updated || pending;
    if (!src) return;
    const { ff, jeonseCalc, saleCalc } = src;
    const res = analyze(ff);
    res.jeonseCalc = jeonseCalc; res.saleCalc = saleCalc;
    setR(res); setSaved(false); setPending(null);
    if (onContext) onContext({ price: ff.currentPrice, area: Number(ff.areaExclusive) || 0 });
    onSaveHistory({ date: new Date().toISOString().slice(0, 10), complex: ff.complexName, dong: ff.dong, area: ff.areaExclusive ? `전용 ${ff.areaExclusive}㎡` : "", currentPrice: ff.currentPrice, fairPrice: res.fairPrice, safetyPrice: res.safetyPrice, grade: res.buyGrade, headline: res.headline });
  }
  if (r) return mode === "fair"
    ? <FairValueResult r={r} f={f} onBack={() => setR(null)} />
    : <BuyResult r={r} f={f} onBack={() => setR(null)} saved={saved} onSave={() => { onAddWatch({ key: `${f.complexName}-${f.dong}`, complex: f.complexName, dong: f.dong, fairPrice: r.fairPrice, currentPrice: Number(f.currentPrice), target: "" }); setSaved(true); }} />;
  if (pending) return <ConfirmStep p={pending} f={f} onBack={() => setPending(null)} onConfirm={doAnalyze} mode={mode} onRefetch={(area) => { setF(prev => ({...prev, areaExclusive: String(area)})); quickSearch(area); }} onBackToTop={() => { setPending(null); setR(null); setF({...EMPTY}); setUploadedImages([]); setCaptureMsg(null); setAiMsg(null); }} />;
  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <p className="mb-3 text-sm font-bold text-slate-800">단지 검색</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input type="text" value={f.region} placeholder="시/구 (예: 노원구)" onChange={(e) => set("region", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
          <input type="text" value={f.dong} placeholder="동 (예: 공릉동)" onChange={(e) => set("dong", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
          <input type="text" value={f.complexName} placeholder="단지명 (예: 동부)" onChange={(e) => set("complexName", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
        </div>

        {/* 수기 입력 4개 */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">전용면적 (㎡)</p>
            <input type="number" value={f.areaExclusive} placeholder="예: 59.99" onChange={(e) => set("areaExclusive", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">현재 매물가 (만원)</p>
            <input type="number" value={f.currentPrice} placeholder="예: 50000" onChange={(e) => set("currentPrice", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">KB매매시세 (만원)</p>
            <input type="number" value={f.kbSalePrice} placeholder="예: 50250" onChange={(e) => set("kbSalePrice", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">KB전세시세 (만원)</p>
            <input type="number" value={f.kbJeonse} placeholder="예: 35000" onChange={(e) => set("kbJeonse", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
          </div>
        </div>

        {/* 캡처 업로드 */}
        <div className="mt-3 rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-800">📷 네이버 부동산 캡처로 자동 입력</p>
            {uploadedImages.length > 0 && <button onClick={() => setUploadedImages([])} className="text-[10px] text-indigo-400 underline">초기화</button>}
          </div>
          <p className="mt-0.5 text-[10px] text-indigo-500">매물·시세 화면 캡처 올리면 면적·매물가·KB시세 자동 인식</p>
          {uploadedImages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {uploadedImages.map((url, i) => (
                <img key={i} src={url} alt={`캡처${i+1}`} className="h-16 w-16 rounded-lg object-cover ring-1 ring-indigo-200" />
              ))}
            </div>
          )}
          <label className={`mt-2 block w-full cursor-pointer rounded-xl py-2 text-center text-xs font-bold text-white ${aiLoading ? "opacity-50" : ""}`} style={{ backgroundColor: NAVY }}>
            {aiLoading ? "분석 중…" : uploadedImages.length > 0 ? "📷 추가 캡처 업로드" : "📷 캡처 업로드"}
            <input type="file" accept="image/*" multiple disabled={aiLoading} className="hidden" onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (!files.length) return;
              setAiLoading(true); setAiMsg(null);
              try {
                const toBase64 = (file) => new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res({data: String(rd.result).split(",")[1], type: file.type||"image/png", url: rd.result}); rd.onerror = rej; rd.readAsDataURL(file); });
                const imgs = await Promise.all(files.map(toBase64));
                setUploadedImages(prev => [...prev, ...imgs.map(i => i.url)]);
                const content = [
                  ...imgs.map(img => ({ type: "image", source: { type: "base64", media_type: img.type, data: img.data } })),
                  { type: "text", text: `이 이미지들은 네이버 부동산 화면 캡처야. 보이는 정보만 추출해 아래 JSON만 출력 (설명·백틱 금지):\n{"region":"시군구","dong":"법정동","complexName":"단지명","areaExclusive":전용면적㎡숫자,"currentPrice":매물호가또는최근실거래만원정수,"kbSalePrice":KB매매시세만원정수,"kbJeonse":KB전세시세만원정수,"buildYear":준공연도숫자}\n규칙:\n- 가격은 만원 정수(4억5100만→45100, 5억→50000)\n- 단지명은 화면 상단 굵은 글씨에서 추출\n- 면적은 현재 선택된/강조된 면적(㎡) 사용\n- currentPrice: 매물 호가 없으면 최근 실거래가 사용\n- KB시세 없으면 0\n- buildYear: 준공일(예: 2008.08.05)에서 연도만 추출
- 안 보이는 값은 0. 절대 추정 금지.` }
                ];
                const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content }] }) });
                const data = await res.json();
                const text = (data.content||[]).map(i=>i.type==="text"?i.text:"").join("").replace(/```json|```/g,"").trim();
                const m = text.match(/\{[\s\S]*\}/);
                const p = JSON.parse(m ? m[0] : "{}");
                const merged = {
                  region: p.region || f.region,
                  dong: p.dong || f.dong,
                  complexName: p.complexName || f.complexName,
                  areaExclusive: p.areaExclusive || f.areaExclusive,
                  currentPrice: Number(p.currentPrice) || f.currentPrice,
                  kbSalePrice: Number(p.kbSalePrice) || f.kbSalePrice,
                  kbJeonse: Number(p.kbJeonse) || f.kbJeonse,
                  buildYear: p.buildYear || f.buildYear,
                };
                setF(prev => ({ ...prev, ...merged }));
                setCaptureMsg(`✅ 캡처 인식 완료 — ${merged.complexName||"단지"} ${merged.areaExclusive?merged.areaExclusive+"㎡":""} ${merged.currentPrice?"매물가 "+(merged.currentPrice/10000).toFixed(1)+"억":""}. 추가 캡처 올리거나 버튼을 눌러 분석하세요.`);
              } catch(e) {
                setAiMsg("캡처 인식 실패 — 직접 입력해주세요.");
              } finally { setAiLoading(false); e.target.value=""; }
            }} />
          </label>
          {captureMsg && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">{captureMsg}</p>
          )}
        </div>

        {areaOptions.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-slate-400 mb-1.5">면적 선택:</p>
            <div className="flex flex-wrap gap-1.5">
              {areaOptions.map((o, i) => (
                <button key={i} type="button"
                  onClick={() => { set("areaExclusive", String(o.areaSqm)); quickSearch(o.areaSqm); }}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold border ${Number(f.areaExclusive) === o.areaSqm ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
                  {o.areaSqm}㎡ · {o.pyeong}평
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메인 버튼 */}
        <button onClick={quickSearch} disabled={aiLoading} className="mt-4 w-full rounded-2xl py-4 text-lg font-extrabold text-white disabled:opacity-50" style={{ backgroundColor: NAVY }}>
          {aiLoading ? "AI 조회 중… (실거래 데이터 수집 중)" : "이 집 사도 될까? — AI 매수판단"}
        </button>
        {aiLoading && <button onClick={() => { if (abortRef.current) abortRef.current.abort(); setAiLoading(false); setAiMsg("조회가 취소되었습니다."); }} className="mt-2 w-full rounded-2xl border border-red-200 py-2.5 text-sm font-medium text-red-500">⬛ 조회 취소</button>}

        {/* 조회 실패 메시지 */}
        {aiMsg && (
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
        )}

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
  const setE = (k, v) => setEdit((prev) => ({ ...prev, [k]: v }));

  const age = edit.buildYear ? new Date().getFullYear() - Number(edit.buildYear) : null;
  const isSell = mode === "sell";

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
      dataSource: edit._aiFilled ? "ai" : "manual",
    };
    onConfirm({ ff, jeonseCalc, saleCalc });
  }

  const inp2 = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-600";

  return (
    <>
      {/* 헤더 */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← 수정</button>
        <h1 className="text-lg font-bold text-slate-900">AI 조회값 확인</h1>
        {onBackToTop && <button onClick={onBackToTop} className="ml-auto text-xs text-slate-400 hover:text-slate-600">🏠 처음으로</button>}
      </div>

      {/* 안내문 */}
      <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
        <p className="text-sm font-semibold text-blue-800">AI가 자동으로 조회한 데이터입니다.</p>
        <p className="mt-0.5 text-xs text-blue-600">실제 정보와 다를 경우 아래에서 수정 후 분석하세요. 부동산은 고가 의사결정이므로 주요 수치를 꼭 확인하세요.</p>
      </div>

      {/* 경고 메시지 */}
      {p.blockReason && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-100">
          <p className="text-sm font-semibold text-red-700">⚠️ 조회 불완전</p>
          <p className="mt-0.5 text-xs text-red-600">{p.blockReason}</p>
          {Array.isArray(edit._aiAreaOptions) && edit._aiAreaOptions.length > 0 ? (
            <div className="mt-2">
              <p className="mb-1.5 text-xs font-medium text-red-700">면적을 선택하면 재조회합니다:</p>
              <div className="flex flex-wrap gap-2">
                {edit._aiAreaOptions.map((o, i) => (
                  <button key={i}
                    onClick={() => { onRefetch && onRefetch(o.areaSqm); }}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-300 active:bg-red-100">
                    전용 {o.areaSqm}㎡ (약 {o.pyeong}평)
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs text-red-500">아래에서 값을 직접 수정한 뒤 분석을 실행하세요.</p>
          )}
        </div>
      )}
      {Array.isArray(edit._aiWarns) && edit._aiWarns.length > 0 && (
        <div className="mb-4 space-y-1">
          {edit._aiWarns.map((w, i) => (
            <div key={i} className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-700 ring-1 ring-amber-100">⚠️ {w}</div>
          ))}
        </div>
      )}

      {/* 단지 정보 (읽기전용 요약) */}
      <div className="mb-4 rounded-2xl bg-slate-800 px-5 py-4 text-white">
        <p className="text-xs text-slate-400">조회 단지</p>
        <p className="mt-1 text-lg font-bold">
          {edit.complexName || "단지명 미확인"}
          {edit.dong ? ` · ${edit.dong}` : ""}
          {Number(edit.areaExclusive) > 0 ? ` 전용 ${edit.areaExclusive}㎡` : ""}
        </p>
        {Number(edit.areaExclusive) > 0 && (
          <p className="mt-0.5 text-xs text-slate-400">통상 약 {typicalPyeong(edit.areaExclusive)}평형 · 전용 {exclusivePyeong(edit.areaExclusive)}평</p>
        )}
        {/* 면적 옵션 버튼 */}
        {Array.isArray(edit._aiAreaOptions) && edit._aiAreaOptions.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] text-slate-400">다른 면적 선택:</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {edit._aiAreaOptions.map((o, i) => (
                <button key={i} onClick={() => { setE("areaExclusive", String(o.areaSqm)); if (onRefetch) onRefetch(o.areaSqm); }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${Number(edit.areaExclusive) === o.areaSqm ? "bg-white text-slate-900" : "bg-slate-700 text-slate-300"}`}>
                  {o.areaSqm}㎡ / {o.pyeong}평형
                </button>
              ))}
            </div>
          </div>
        )}
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
            </span>
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

          {/* KB 매매시세 */}
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">KB 매매시세 (만원)</span>
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => { const q = ((edit.dong||"")+" "+(edit.complexName||"")).trim(); navigator.clipboard.writeText(q); window.open("https://land.naver.com/search/complexSearch.nhn?keyword="+encodeURIComponent(q), "_blank", "noopener,noreferrer"); }}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200">
                  📋 네이버 KB시세 확인
                </button>
              </div>
            </div>
            <input type="number" className={inp2} value={edit.kbSalePrice} placeholder="네이버 시세탭 → KB시세 중간값 입력"
              onChange={(e) => setE("kbSalePrice", e.target.value)} />
            <p className="mt-1 text-[10px] text-slate-400">버튼 클릭 → 새 창에서 단지 검색 → 시세 탭 → KB 중간값 확인 후 입력</p>
          </label>

          {/* KB 전세시세 */}
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">KB 전세시세 (만원)</span>
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => { const q = ((edit.dong||"")+" "+(edit.complexName||"")).trim(); navigator.clipboard.writeText(q); window.open("https://land.naver.com/search/complexSearch.nhn?keyword="+encodeURIComponent(q), "_blank", "noopener,noreferrer"); }}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200">
                  📋 네이버 KB시세 확인
                </button>
              </div>
            </div>
            <input type="number" className={inp2} value={edit.kbJeonse} placeholder="네이버 시세탭 → KB시세 중간값 입력"
              onChange={(e) => setE("kbJeonse", e.target.value)} />
            <p className="mt-1 text-[10px] text-slate-400">버튼 클릭 → 새 창에서 단지 검색 → 시세 탭 → KB 중간값 확인 후 입력</p>
          </label>

          {/* 기준 전세가 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              기준 전세가 (만원)
              <span className="ml-1 font-normal text-red-500">*필수</span>
            </span>
            <input type="number" className={inp2}
              value={jeonseCalc && jeonseCalc.value ? jeonseCalc.value : (edit.baseJeonse || edit.kbJeonse || "")}
              placeholder="예: 34000"
              onChange={(e) => setE("baseJeonse", e.target.value)} />
            {jeonseCalc && jeonseCalc.used > 0 && (
              <p className="mt-1 text-[11px] text-emerald-600">실거래 {jeonseCalc.used}건 정제평균 자동 반영</p>
            )}
          </label>

          {/* 준공연도 */}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">준공연도</span>
            <input type="number" className={inp2} value={edit.buildYear} placeholder="예: 1999"
              onChange={(e) => setE("buildYear", e.target.value)} />
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
            <p className="font-semibold text-slate-600 mb-1">AI 조회 정제평균 (참고)</p>
            {p.jeonseCalc && <p>전세 정제평균 {won(p.jeonseCalc.value)} (사용 {p.jeonseCalc.used}건 · 제외 {p.jeonseCalc.excluded}건)</p>}
            {p.saleCalc && <p className="mt-0.5">매매 정제평균 {won(p.saleCalc.value)} (사용 {p.saleCalc.used}건 · 제외 {p.saleCalc.excluded}건)</p>}
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
      <div className="mt-5 flex gap-3">
        <button onClick={onBack} className="flex-1 rounded-2xl border border-slate-200 py-4 text-base font-bold text-slate-600">← 다시 검색</button>
        <button onClick={handleConfirm} className="flex-[2] rounded-2xl py-4 text-lg font-extrabold text-white" style={{ backgroundColor: NAVY }}>
          이 집 사도 될까? — AI 분석
        </button>
      </div>
    </>
  );
}

// 적정가 화면 — 집 자체의 가치평가 전용 (매수판단·자금·대출·월상환 표시 안 함)
function FairValueResult({ r, f, onBack }) {
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
  return (
    <>
      <div className="mb-4"><button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← 다시 분석</button></div>
      <InputWarnings r={r} f={f} />
      <div className="mb-4"><MarketTypeBadge mc={mc} /></div>

      {provisional ? (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="px-6 py-6 text-white" style={{ backgroundColor: NAVY }}>
            <p className="text-sm text-slate-300">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡ · 약 ${typicalPyeong(f.areaExclusive)}평형` : (f.pyeong ? `${f.pyeong}평형` : "")}</p>
            <h1 className="mt-2 text-xl font-bold">{isAbnormal ? "입력값 확인 필요 — 판단 보류" : "데이터 부족 — 참고가"}</h1>
            <p className="mt-2 text-sm text-slate-200">{isAbnormal ? "현재가가 정제 시세와 크게 차이납니다. 값 확인 후 다시 분석하세요." : "표본이 부족해 적정가를 확정하지 않습니다. 아래 값은 참고용입니다."}</p>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-xs text-slate-400">참고가 (확정 아님)</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-700">{won(r.fairPrice)}</p>
          </div>
        </section>
      ) : isSpecial ? (
        <>
          <section className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-orange-200">
            <div className="px-6 py-5 text-white" style={{ backgroundColor: NAVY }}>
              <p className="text-sm text-slate-300">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡ · 약 ${typicalPyeong(f.areaExclusive)}평형` : (f.pyeong ? `${f.pyeong}평형` : "")}</p>
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
            <p className="text-sm text-slate-300">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡ · 약 ${typicalPyeong(f.areaExclusive)}평형` : (f.pyeong ? `${f.pyeong}평형` : "")}</p>
            <p className="mt-2 text-xs text-slate-300">엔진 산출 적정가</p>
            <p className="text-3xl font-extrabold">{won(r.fairPrice)}</p>
            <span className="mt-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-200">{r.modeName}</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="px-4 py-4 text-center"><p className="text-xs text-slate-400">현재 매물가</p><p className="mt-1 text-base font-bold text-slate-800">{won(Number(f.currentPrice) || 0)}</p></div>
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
        <div className="px-4 py-3" style={{ backgroundColor: "#f1f5f9" }}><p className="text-sm font-bold text-slate-700">적정가 산출 근거</p></div>
        <Row l="사용 엔진" v={r.modeName} />
        <Row l="전세 정제평균" v={r.jeonseFair ? won(r.jeonseFair) : "—"} />
        <Row l="매매 정제평균" v={r.saleFair ? won(r.saleFair) : "—"} />
        <Row l="적용 전세가율" v={r.basis && r.basis.ratioUsed ? `${r.basis.ratioUsed} (${r.basis.ratioKind})` : "—"} />
        <Row l="지역 기본 전세가율" v={r.regionRatio} />
        <Row l="동적 전세가율(실측)" v={r.dynamicRatio != null ? r.dynamicRatio : "미적용"} />
        <Row l="사용 거래 수 (전세/매매)" v={`${jb.used ?? 0} / ${sb.used ?? 0} 건`} />
        <Row l="제외 거래 수 (전세/매매)" v={`${jb.excluded ?? 0} / ${sb.excluded ?? 0} 건`} />
        <Row l="KB시세 가중치 (전세/매매)" v={`${jkb != null ? Math.round(jkb * 100) + "%" : "—"} / ${skb != null ? Math.round(skb * 100) + "%" : "—"}`} />
        <Row l="데이터 신뢰도" v={r.dataConfLabel} />
        <Row l="분석 적합도" v={(() => { const fl = { redevelopment: 65, primePremium: 70, investmentPremium: 65, policyDriven: 65, semiPremium: 70 }[mc.specialMarketType]; const fs = fl != null ? Math.max(r.modelConf, fl) : r.modelConf; return `${fs} · ${fs >= 80 ? "높음" : fs >= 60 ? "보통" : fs >= 40 ? "낮음" : "매우낮음"}`; })()} />
        <Row l="시장 위험도" v={(isLowData || isAbnormal) ? "평가 불가" : mc.specialMarketType === "investmentPremium" ? "매우높음" : isSpecial ? "높음" : mc.specialMarketType === "semiPremium" ? "보통" : "낮음"} />
        {kbHeavy && <div className="bg-amber-50 px-4 py-2 text-xs text-amber-700">⚠ 실거래 표본이 적어 KB시세 의존도가 높습니다 — 신뢰도를 보수적으로 해석하세요.</div>}
      </div>

      <p className="mt-5 px-2 text-[11px] leading-relaxed text-slate-400">시장 위험도는 계산 오류를 의미하지 않습니다. 재건축, 정책, 공급, 프리미엄 등에 따른 가격 변동성 위험을 의미합니다. 본 적정가는 공개 데이터와 입력값 기반 참고용 계산이며, 집 자체의 가치 평가에 한정됩니다. 매수 판단·자금·대출·세금은 매수 탭에서 확인하세요.</p>

      {/* ── PDF 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const gp = r.gapRatio != null ? `${Math.abs(r.gapRatio * 100).toFixed(1)}%` : "—";
            const gradeLabel = { A:"매우 저평가", B:"저평가", C:"적정 가격", D:"다소 고평가", E:"고평가", 보류:"판단 보류" }[r.buyGrade] || r.buyGrade;
            const text = `ValueLens 적정가 평가 리포트
${"=".repeat(40)}
발행일: ${date}
단지: ${f.complexName || "—"} ${f.dong ? `· ${f.dong}` : ""} ${Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}

[적정가 평가 결과]
  가격 평가 등급: ${r.buyGrade}등급 · ${gradeLabel}
  현재 매물가: ${won(Number(f.currentPrice) || 0)}
  AI 적정가: ${r.engineMode === "hold" ? "판단 보류" : won(r.fairPrice)}
  ${r.gapRatio < 0 ? "저평가율" : "고평가율"}: ${r.engineMode === "hold" ? "보류" : gp}
  안전 매수가: ${r.safetyPrice ? won(r.safetyPrice) : "—"}
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

📋 이 리포트를 활용하기 전 확인하세요
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
Powered by ValueLens`;
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
            <p className="text-sm font-bold text-slate-800">📄 적정가 평가 리포트 저장</p>
            <p className="mt-0.5 text-xs text-slate-400">등급·AI 적정가·산출 근거·데이터 현황 포함 · 계산식 제외</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>
    </>
  );
}

function BuyResult({ r, f, onBack, onSave, saved }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const s = GS[r.buyGrade], cheap = r.gapRatio < 0;
  const tone = (sc) => (sc >= 80 ? "text-emerald-600" : sc >= 60 ? "text-amber-600" : "text-orange-600");
  const mrTone2 = (lv) => lv === "매우높음" ? "text-red-600" : lv === "높음" ? "text-orange-600" : lv === "보통" ? "text-amber-600" : lv === "평가 불가" ? "text-slate-500" : "text-emerald-600";
  const shockTone = { 낮음: "text-emerald-600", 보통: "text-amber-600", 높음: "text-orange-600", 매우높음: "text-red-600" }[r.shock.level];
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
    D: { label: "D · 다소 고평가",sub: "적정가 대비 높은 편",          bg: "bg-orange-500" },
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
    else if (r.buyGrade === "A" || r.buyGrade === "B") line2 = `${won(r.negotiation.start)} 이하에서 협상 시 가격 메리트가 있습니다.`;
    else if (r.buyGrade === "C") line2 = `협상을 통해 ${won(r.negotiation.start)} 수준을 목표로 하는 것이 적절합니다.`;
    else if (r.buyGrade === "D") line2 = `${won(r.negotiation.start)} 이하로 가격 조정이 된다면 재검토 여지가 있습니다.`;
    else line2 = `적정가 대비 가격 부담이 크며, 시세 조정을 기다리는 것도 방법입니다.`;
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
    const labelOf = (g) => ({ A:"매우 저평가", B:"저평가", C:"적정 가격", D:"다소 고평가", E:"고평가" }[g] || g);
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
      scenarios.push({ price: r.safetyPrice, label: "안전 매수가", grade: g3, gradeLabel: labelOf(g3), color: "text-emerald-600", highlight: false });
    }
    return scenarios;
  }
  const scenarios = buildScenarios();

  // ── 위험요인 ──
  function buildRiskItems() {
    const risks = [];
    if (r.jeonseUsed < 3) risks.push("거래 표본 부족 — 적정가 신뢰도 낮음");
    if (supply.level === "높음") risks.push("입주물량 부담 — 공급 과잉 구간");
    if (r.saleType === "redev") risks.push("재건축 기대가 반영 — 사업 지연·분담금 리스크");
    if (r.actualRatio != null && r.actualRatio < 0.4) risks.push("전세가율 낮음 — 실수요 대비 투자수요 의존");
    if (r.shock?.level === "높음" || r.shock?.level === "매우높음") risks.push(`시장충격 ${r.shock.level} — 가격 반영 지연 가능`);
    if (bd.marketRisk?.level === "높음" || bd.marketRisk?.level === "매우높음") risks.push(`시장 위험도 ${bd.marketRisk.level}`);
    if (r.dataConf < 50) risks.push("데이터 신뢰도 낮음 — 표본 보강 권장");
    if (neg.list?.[0]) risks.push(neg.list[0]);
    return risks.slice(0, 5);
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

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← 다시 분석</button>
        <button onClick={onSave} disabled={saved} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${saved ? "bg-slate-100 text-slate-400" : "text-white"}`} style={saved ? {} : { backgroundColor: NAVY }}>{saved ? "★ 관심단지 추가됨" : "☆ 관심단지 추가"}</button>
      </div>

      <InputWarnings r={r} f={f} />

      {/* ── Hero: 가격 평가 등급 + 핵심 4개 ── */}
      <div className="mb-4 overflow-hidden rounded-3xl shadow-lg">
        <div className={`px-6 py-6 text-white ${gradeHero.bg}`}>
          <p className="text-xs font-medium text-white/70">{f.complexName} · {f.dong} {Number(f.areaExclusive) > 0 ? `전용 ${f.areaExclusive}㎡` : ""}</p>
          <p className="mt-2 text-4xl font-extrabold">{gradeHero.label}</p>
          <p className="mt-1 text-sm text-white/80">{gradeHero.sub}</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 bg-white">
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">AI 적정가</p>
            <p className="mt-1 text-xl font-extrabold" style={{ color: NAVY }}>{hold0 ? "—" : won(r.fairPrice)}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">현재 매물가</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{won(Number(f.currentPrice) || 0)}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">{cheap ? "저평가율" : "고평가율"}</p>
            <p className={`mt-1 text-xl font-extrabold ${cheap ? "text-emerald-600" : "text-red-500"}`}>{hold0 ? "보류" : pct(r.gapRatio)}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-slate-400">추천 협상가</p>
            <p className="mt-1 text-base font-extrabold text-slate-900">{hold0 ? "—" : won(r.negotiation.start)}</p>
          </div>
        </div>
      </div>

      {/* ── [1] AI 판단 근거 ── */}
      <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="mb-3 text-sm font-bold text-slate-700">AI 판단 근거</p>
        <div className="space-y-2">
          {reasonChecks.map((c, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <span className={`flex-shrink-0 text-base ${c.ok === true ? "text-emerald-500" : c.ok === false ? "text-red-400" : "text-amber-400"}`}>
                {c.ok === true ? "✓" : c.ok === false ? "✗" : "△"}
              </span>
              <span className={c.ok === false ? "text-slate-500" : "text-slate-700"}>{c.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── [2] AI 한줄 의견 ── */}
      <div className="mb-4 rounded-2xl bg-indigo-50 px-5 py-4 ring-1 ring-indigo-100">
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>AI</span>
          <span className="text-sm font-bold text-slate-800">AI 의견</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">{aiLine1}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">{aiLine2}</p>
        {premiumDesc() && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">{premiumDesc()}</p>}
      </div>

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
          <p className="mb-3 text-sm font-bold text-slate-700">확인이 필요한 위험요인</p>
          <div className="space-y-2">
            {riskItems.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 flex-shrink-0 text-amber-400">⚠</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── [6] 실거주 · 투자 점수 ── */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-center">
          <p className="text-xs text-slate-400">실거주 적합도</p>
          <p className={`mt-2 text-2xl font-extrabold ${living.total >= 75 ? "text-emerald-600" : living.total >= 60 ? "text-amber-600" : "text-red-500"}`}>{living.total}<span className="text-sm font-normal text-slate-400"> / 100</span></p>
          <p className="mt-1 text-xs text-slate-500">교통·학군·상권·연식 종합</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-center">
          <p className="text-xs text-slate-400">가격 매력도</p>
          <p className={`mt-2 text-2xl font-extrabold ${sp.up >= 65 ? "text-emerald-600" : sp.up >= 40 ? "text-amber-600" : "text-red-500"}`}>{sp.up}<span className="text-sm font-normal text-slate-400"> / 100</span></p>
          <p className="mt-1 text-xs text-slate-500">전세가율·저평가 기반</p>
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
              <span className={`font-bold ${shockTone}`}>{r.shock.level} <span className="text-xs font-normal text-slate-400">(지연 약 {r.shock.lag}개월)</span></span>
            </div>

          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>AI</span><h3 className="text-base font-semibold text-slate-800">AI 분석 설명</h3></div>
        <p className="text-base font-medium text-slate-900">{r.engineMode === "hold" ? `${r.headline} (등급 보류)` : isSpec ? `이 단지는 특수시장(${bd.premiumLevel})으로 분류되어 가격 등급(${r.buyGrade})은 참고용이며, 최종 판단은 상단 매수판단 카드를 따릅니다.` : `${r.headline} 매수등급은 ${r.buyGrade}(${r.gradeLabel})입니다.`}</p>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600"><p>{r.explain.valuation}</p><p>{r.explain.review}</p></div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="mb-2 text-xs font-semibold text-slate-500">매수 시 주의할 점</p><ul className="space-y-1.5 text-sm text-slate-600"><li>· 입력한 KB시세·전세가의 정확도가 결과에 직접 영향을 줍니다.</li><li>· 동일 단지라도 층·향·동·수리 상태에 따라 실제 가격은 달라질 수 있습니다.</li><li>· 본 결과는 참고용이며 최종 판단은 현장 확인 후 본인이 내려야 합니다.</li></ul></div>
      </div>

      {/* ── PDF 리포트 저장 ── */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => {
            const date = new Date().toLocaleDateString("ko-KR");
            const gp = Math.abs(r.gapRatio * 100).toFixed(1);
            const gradeLabel = { A:"매우 저평가", B:"저평가", C:"적정 가격", D:"다소 고평가", E:"고평가", 보류:"판단 보류" }[r.buyGrade] || r.buyGrade;
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
              const gradeOf = (gap) => gap <= -0.15 ? "A(매우 저평가)" : gap <= -0.05 ? "B(저평가)" : gap <= 0.05 ? "C(적정 가격)" : gap <= 0.15 ? "D(다소 고평가)" : "E(고평가)";
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
  현재 매물가: ${won(Number(f.currentPrice) || 0)}
  AI 적정가: ${r.engineMode === "hold" ? "판단 보류" : won(r.fairPrice)}
  ${cheap ? "저평가율" : "고평가율"}: ${r.engineMode === "hold" ? "보류" : `${gp}%`}
  추천 협상가: ${r.engineMode === "hold" ? "—" : won(r.negotiation.start)}

[AI 의견]
  ${cheap ? `현재 가격은 적정가 대비 ${gp}% 낮은 수준입니다.` : `현재 가격은 적정가 대비 ${gp}% 높은 수준입니다.`}
  ${r.buyGrade === "A" || r.buyGrade === "B" ? `${won(r.negotiation.start)} 이하에서 협상 시 가격 메리트가 있습니다.` : r.buyGrade === "C" ? `협상을 통해 ${won(r.negotiation.start)} 수준을 목표로 하는 것이 적절합니다.` : `가격 조정 후 재검토를 권합니다.`}

[가격별 평가 시나리오]
${scenarioLines}

[확인이 필요한 위험요인]
${riskLines}

${"=".repeat(40)}
📋 이 리포트를 활용하기 전 확인하세요
□ 공인중개사에게 현장 시세·매물 상태를 확인했나요?
□ 세무사에게 취득세·양도세 상담을 받았나요?
□ 은행·금융기관에서 실제 대출 가능액을 확인했나요?
□ 등기부등본·권리관계·압류 여부를 확인했나요?
□ 실제 현장 방문 및 주변 시세를 직접 확인했나요?

위 항목을 확인한 후 최종 결정을 내리세요.
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
Powered by ValueLens`;
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
            <p className="text-sm font-bold text-slate-800">📄 가격평가 리포트 저장</p>
            <p className="mt-0.5 text-xs text-slate-400">단지명·등급·AI 적정가·시나리오·위험요인 포함 · 계산식 제외</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>
    </>
  );
}

function SellView({ onContext }) {
  const [f, setF] = useState(EMPTY);
  const [r, setR] = useState(null);
  const [pending, setPending] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const abortRef = useRef(null);
  const [areaOptions, setAreaOptions] = useState([]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // 단일 검색 → AI가 시세·실거래·연식 채움 (희망 매도가는 사용자 입력) · 데모용
  // TODO(상용화): 실거래·연식 = 국토부 API / 시세 = KB API
  async function quickSearch(overrideArea) {
    if (!f.complexName) { setAiMsg("최소한 단지명을 입력하세요."); return; }
    if (!f.currentPrice && !overrideArea) { setAiMsg("희망 매도가를 입력하세요. (AI는 시세·실거래만 채웁니다)"); return; }
    setPending(null);
    const q = [f.dong, f.complexName, Number(overrideArea || f.areaExclusive) > 0 ? `전용 ${overrideArea || f.areaExclusive}㎡` : ""].filter(Boolean).join(" ");
    setAiLoading(true); setAiMsg(null);
    try {
      const prompt = `너는 한국 부동산 실거래가 조사원이야. 국토교통부 실거래가 공개시스템·집품·아실·KB부동산을 웹 검색해 아래 단지의 실제 데이터를 찾아.
입력: "${q}" (지방·구축 단지도 지역명과 함께 끝까지 검색)
[면적·가격 정합성 — 매우 중요]
- 전용면적(areaSqm)은 실제 존재하는 면적만. 국민평형 84㎡ 기본값 금지. 못 찾으면 areaSqm=0.
- kbSalePrice(매매)·kbJeonse(전세)·jeonse·sale은 모두 같은 전용면적 기준. 59㎡ 가격을 84㎡처럼 쓰지 마라.
- 면적별 가격이 확인 안 되면 그 가격은 0. 추측으로 면적 채우지 마라.
- 입력 전용면적이 단지에 없으면 areaSqm=0 + areaOptions에 실제 면적들.
- 전용면적 입력이 없으면 반드시 areaOptions에 단지의 모든 전용면적 목록을 넣어라. areaSqm=0 필수.
아래 JSON만 출력 (설명·백틱 금지):
{"region":"시군구","dong":"법정동","complexName":"단지명","areaSqm":전용㎡숫자,"pyeong":통상평형숫자,"buildYear":준공연도숫자,"topFloor":최고층숫자,"kbSalePrice":KB매매시세만원,"kbJeonse":KB전세시세만원,"jeonse":[{"ym":"YYYY-MM","price":만원정수,"floor":층}],"sale":[{"ym":"YYYY-MM","price":만원정수,"floor":층}],"areaOptions":[{"areaSqm":전용㎡,"pyeong":통상평형}]}
규칙: 가격은 만원 정수(7억4000만→74000). 취소거래 제외. 각 최대 10건. 못 찾은 값만 0/빈배열 (지어내지 말 것).`;
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }], tools: [{ type: "web_search_20250305", name: "web_search" }] }) });
      const data = await response.json();
      const text = (data.content || []).map((i) => (i.type === "text" ? i.text : "")).filter(Boolean).join("\n");
      const mt = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
      const p = JSON.parse(mt ? mt[0] : "{}");
      const tf = Number(p.topFloor) || 15;
      const norm = (arr) => (Array.isArray(arr) ? arr.filter((d) => d && d.price && d.ym).map((d) => ({ ym: d.ym, price: Number(d.price), floor: Number(d.floor) || 5, topFloor: tf })) : []);
      const jd = norm(p.jeonse), sd = norm(p.sale);
      const areaSqm = Number(p.areaSqm) || 0;
      const pyeong = areaSqm > 0 ? typicalPyeong(areaSqm) : 0; // 평형은 전용면적에서만 계산 (AI 평형값 무시)
      const areaOptions = Array.isArray(p.areaOptions) ? p.areaOptions.filter((o) => Number(o.areaSqm) > 0).map((o) => ({ areaSqm: Number(o.areaSqm), pyeong: typicalPyeong(Number(o.areaSqm)) })) : [];
      const warns = [];
      if (areaSqm <= 0) warns.push("전용면적 미확인 — 면적을 직접 확인/입력하세요.");
      const askedArea = Number(f.areaExclusive) || 0;
      if (askedArea > 0 && areaSqm > 0 && Math.abs(askedArea - areaSqm) > Math.max(3, askedArea * 0.06)) warns.push(`입력한 전용 ${askedArea}㎡와 조회된 시세 기준 ${areaSqm}㎡가 다릅니다.`);
      if (Number(p.kbJeonse) > 0 && Number(p.kbSalePrice) > 0 && Number(p.kbJeonse) >= Number(p.kbSalePrice)) warns.push("전세가가 매매가 이상입니다. 입력값을 확인하세요.");
      const filled = { ...EMPTY, region: p.region || f.region || "", dong: p.dong || f.dong || "", complexName: p.complexName || f.complexName, pyeong, areaExclusive: areaSqm || "", buildYear: p.buildYear || "", currentPrice: f.currentPrice, kbSalePrice: Number(p.kbSalePrice) || "", kbJeonse: Number(p.kbJeonse) || "", acqPrice: f.acqPrice || "", deals: jd, saleDeals: sd, shockLevel: "보통", _aiFilled: true, _aiSource: "국토부 실거래·KB·호갱노노 웹검색(AI)", _aiWarns: warns, _aiAreaOptions: areaOptions };
      setF(filled);
      const jeonseCalc = jd.length ? computeTrimmedMean(jd, Number(filled.kbJeonse) || 0, "jeonse") : null;
      const baseJeonse = jeonseCalc && jeonseCalc.value ? jeonseCalc.value : Number(filled.kbJeonse) || 0;
      const saleCalc = sd.length ? computeTrimmedMean(sd, Number(filled.kbSalePrice) || 0, "sale") : null;
      if (areaSqm <= 0 || !baseJeonse) {
        if (areaSqm <= 0 && areaOptions.length > 0) {
          setAreaOptions(areaOptions);
          setAiMsg("전용면적을 확인하지 못했습니다. 아래에서 면적을 선택하면 재조회합니다.");
        } else {
          setAiMsg(areaSqm <= 0 ? "전용면적을 확인하지 못했습니다. 직접 입력하세요." : "전세 시세를 못 찾았어요. 아래에서 직접 입력하세요.");
          setShowManual(true);
        }
        return;
      }
      const ff = { ...filled, currentPrice: Number(filled.currentPrice), baseJeonse, kbSalePrice: Number(filled.kbSalePrice), saleRef: saleCalc && saleCalc.value ? saleCalc.value : null, jeonseUsed: jeonseCalc ? jeonseCalc.used : 0, saleUsed: saleCalc ? saleCalc.used : 0, jeonseCalc, saleCalc, dataSource: "ai" };
      setPending({ ff, jeonseCalc, saleCalc });
    } catch (e) { setAiMsg("불러오기 실패 — 아래 ‘직접 입력·수정’에서 입력하세요."); setShowManual(true); } finally { setAiLoading(false); }
  }

  async function extractFromImage(file) {
    if (!file) return;
    setAiLoading(true); setAiMsg(null);
    try {
      const base64 = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(String(rd.result).split(",")[1]); rd.onerror = () => rej(new Error("read")); rd.readAsDataURL(file); });
      const mediaType = file.type || "image/png";
      const prompt = `이 이미지는 한국 부동산 매물 화면의 캡처야. 화면에 보이는 정보만 추출해 아래 JSON만 출력 (설명·백틱 금지):
{"region":"시군구","dong":"법정동","complexName":"단지명","pyeong":평형숫자,"areaExclusive":전용㎡숫자,"buildYear":준공연도숫자}
규칙: 화면에 안 보이는 값은 0/빈문자. 추정하지 말고 보이는 값만.`;
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: prompt }] }] }) });
      const data = await response.json();
      const text = (data.content || []).map((i) => (i.type === "text" ? i.text : "")).filter(Boolean).join("\n");
      const m = text.replace(/```json|```/g, "").trim().match(/\{[\s\S]*\}/);
      const p = JSON.parse(m ? m[0] : "{}");
      setF((prev) => ({ ...prev, region: p.region || prev.region, dong: p.dong || prev.dong, complexName: p.complexName || prev.complexName, pyeong: p.pyeong || prev.pyeong, areaExclusive: p.areaExclusive || prev.areaExclusive, buildYear: p.buildYear || prev.buildYear, _aiFilled: true }));
      setAiMsg(`캡처 분석 완료 — ${p.complexName || "단지"} ${p.pyeong ? p.pyeong + "평" : ""}. 희망 매도가·실거래는 직접 입력하세요. (상용화 시 국토부 API 자동 연동)`);
    } catch (e) { setAiMsg("이미지 분석 실패 — 직접 입력하세요."); } finally { setAiLoading(false); }
  }

  function run() {
    if (!f.currentPrice || !f.complexName) { alert("단지명 · 희망 매도가는 필수입니다."); return; }
    const hasD = (f.deals || []).some((d) => d.price && d.ym);
    const jeonseCalc = hasD ? computeTrimmedMean(f.deals, Number(f.kbJeonse) || 0, "jeonse") : null;
    const baseJeonse = jeonseCalc && jeonseCalc.value ? jeonseCalc.value : Number(f.baseJeonse);
    if (!baseJeonse) { alert("전세 실거래를 입력하거나 기준 전세가를 직접 입력하세요."); return; }
    const hasS = (f.saleDeals || []).some((d) => d.price && d.ym);
    const saleCalc = hasS ? computeTrimmedMean(f.saleDeals, Number(f.kbSalePrice) || 0, "sale") : null;
    const ff = { ...f, currentPrice: Number(f.currentPrice), baseJeonse, kbSalePrice: Number(f.kbSalePrice), saleRef: saleCalc && saleCalc.value ? saleCalc.value : null, jeonseUsed: jeonseCalc ? jeonseCalc.used : 0, saleUsed: saleCalc ? saleCalc.used : 0, jeonseCalc, saleCalc, dataSource: f._aiFilled ? "ai" : "manual" };
    setPending({ ff, jeonseCalc, saleCalc });
  }
  function doAnalyze() {
    if (!pending) return;
    const res = analyze(pending.ff);
    res.jeonseCalc = pending.jeonseCalc; res.saleCalc = pending.saleCalc;
    setR(res); setPending(null);
    if (onContext) onContext({ acqPrice: Number(f.acqPrice) || 0, sellPrice: Number(f.currentPrice), years: Number(f.holdingYears) || 5, loanBalance: Number(f.loanBalance) || 0 });
  }
  if (r) return <SellResult r={r} f={f} onBack={() => setR(null)} />;
  if (pending) return <ConfirmStep p={pending} f={f} mode="sell" onBack={() => setPending(null)} onConfirm={doAnalyze} onRefetch={(area) => { set("areaExclusive", String(area)); quickSearch(area); }} />;
  const fields = [["지역 (시/구)", "region", "text", "노원구"], ["법정동", "dong", "text", "공릉동"], ["단지명", "complexName", "text", "동부"], ["전용면적 (㎡)", "areaExclusive", "number", "59"], ["희망 매도가 (만원)", "currentPrice", "number", "50000"], ["KB 매매시세 (만원)", "kbSalePrice", "number", "50250"], ["KB 전세시세 (만원)", "kbJeonse", "number", "35500"], ["기준 전세가 (만원, 수동)", "baseJeonse", "number", "35000"], ["준공연도", "buildYear", "number", "1999"], ["취득가 (만원, 양도세용·선택)", "acqPrice", "number", ""]];
  return (
    <>
      <header className="mb-6 text-center"><h1 className="text-2xl font-bold text-slate-900">이 가격에 팔아도 될까요?</h1><p className="mt-2 text-sm text-slate-500">동·단지·전용면적 + 희망가만 넣으면 AI가 시세를 채워 적정성을 평가합니다.</p></header>
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <label className="block text-sm font-bold text-slate-800">단지 검색 + 희망 매도가</label>
        <p className="mt-1 text-xs text-slate-400">동·단지명·전용면적을 입력하면 그 면적 기준 시세를 채웁니다.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <DongAutocomplete value={f.dong} onChange={(v) => set("dong", v)} onSelect={(v) => { set("dong", v); set("complexName", ""); }} placeholder="동 (예: 공릉동)" className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
          <ComplexAutocomplete dong={f.dong} value={f.complexName} onChange={(v) => set("complexName", v)} onSelect={(v) => set("complexName", v)} placeholder="단지명 (예: 동신)" className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
          <input type="number" value={f.areaExclusive} placeholder="전용면적 ㎡ (예: 59.99)" onChange={(e) => set("areaExclusive", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-slate-400" />
        </div>
        {Number(f.areaExclusive) > 0 && <p className="mt-1.5 text-xs text-slate-500">전용면적: {f.areaExclusive}㎡ · 통상 평형: 약 {typicalPyeong(f.areaExclusive)}평형</p>}
        <input type="number" value={f.currentPrice} placeholder="희망 매도가 (만원) — 예: 50000" onChange={(e) => set("currentPrice", e.target.value)} className="mt-2 w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-base font-semibold outline-none focus:border-slate-500" />
        <button onClick={quickSearch} disabled={aiLoading} className="mt-3 w-full rounded-2xl py-3.5 text-base font-bold text-white disabled:opacity-50" style={{ backgroundColor: NAVY }}>{aiLoading ? "AI 분석 중… (실거래·시세 데이터 수집 중, 1~2분 소요)" : "AI 분석 — 시세 채우고 평가하기"}</button>
        {aiLoading && <button onClick={() => { if (abortRef.current) abortRef.current.abort(); setAiLoading(false); setAiMsg("조회가 취소되었습니다."); }} className="mt-2 w-full rounded-2xl border border-red-200 py-2.5 text-sm font-medium text-red-500">⬛ 조회 취소</button>}
        {aiMsg && <p className="mt-2 text-xs leading-relaxed text-indigo-700">{aiMsg}</p>}
        {areaOptions.length > 0 && !aiLoading && (
          <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
            <p className="mb-1.5 text-xs font-medium text-amber-800">면적 선택 후 재조회:</p>
            <div className="flex flex-wrap gap-2">
              {areaOptions.map((o, i) => (
                <button key={i}
                  onClick={() => { setAreaOptions([]); set("areaExclusive", String(o.areaSqm)); quickSearch(o.areaSqm); }}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-300 active:bg-amber-100">
                  전용 {o.areaSqm}㎡ (약 {o.pyeong}평)
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="text-xs text-slate-400">샘플:</span><button onClick={() => { setF({ ...SAMPLE, acqPrice: 35000, holdingYears: 8, loanBalance: 10000, sellPurpose: "갈아타기" }); setShowManual(true); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">동부</button><button onClick={() => { setF({ ...PRESET_EUNMA, acqPrice: 120000, holdingYears: 15, sellPurpose: "투자금 회수" }); setShowManual(true); }} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">은마</button></div>
        <button onClick={() => setShowManual((v) => !v)} className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-500">{showManual ? "직접 입력·수정 닫기 ▴" : "시세 직접 입력 · 캡처 업로드 · 취득가 입력 ▾"}</button>

        {showManual && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-5 rounded-2xl bg-indigo-50 p-4 ring-1 ring-indigo-100">
              <p className="text-sm font-bold text-indigo-900">매물 캡처로 가져오기</p>
              <p className="mt-0.5 text-xs text-indigo-500">네이버 부동산 매물 화면을 캡처해서 올리면 단지·평형·연식을 자동 인식합니다.</p>
              <label className={`mt-3 block w-full cursor-pointer rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white ${aiLoading ? "opacity-50" : ""}`} style={{ backgroundColor: "#4f46e5" }}>{aiLoading ? "이미지 분석 중…" : "📷 매물 캡처 업로드 → 자동 인식"}<input type="file" accept="image/*" disabled={aiLoading} className="hidden" onChange={(e) => { const file = e.target.files && e.target.files[0]; if (file) extractFromImage(file); e.target.value = ""; }} /></label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map(([l, k, t, ph]) => {
                if (k === "kbSalePrice" || k === "kbJeonse") {
                  return (
                    <label key={k} className="block">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">{l}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => { const q=((f.dong||"")+" "+(f.complexName||"")).trim(); navigator.clipboard.writeText(q); window.open("https://land.naver.com/search/complexSearch.nhn?keyword="+encodeURIComponent(q),"_blank","noopener,noreferrer"); }} className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200">📋 네이버 KB시세 확인</button>
                        </div>
                      </div>
                      <input type={t} className={inp} value={f[k]} placeholder="중간값 직접 확인 후 입력" onChange={(e) => set(k, e.target.value)} />
                      <p className="mt-1 text-[10px] text-slate-400">⚠ AI가 정확히 못 가져올 수 있어요</p>
                    </label>
                  );
                }
                return (<label key={k} className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">{l}</span><input type={t} className={inp} value={f[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)} /></label>);
              })}
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">시장충격 위험도</span><select className={inp} value={f.shockLevel} onChange={(e) => set("shockLevel", e.target.value)}>{["낮음", "보통", "높음", "매우높음"].map((x) => <option key={x}>{x}</option>)}</select></label>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-600">세후 실수령·매도 판단용 (선택)</p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">보유기간 (년)</span><input type="number" className={inp} value={f.holdingYears} placeholder="5" onChange={(e) => set("holdingYears", e.target.value)} /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">대출잔액 (만원)</span><input type="number" className={inp} value={f.loanBalance} placeholder="0" onChange={(e) => set("loanBalance", e.target.value)} /></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">실거주 여부</span><select className={inp} value={f.lived ? "예" : "아니오"} onChange={(e) => set("lived", e.target.value === "예")}>{["예", "아니오"].map((x) => <option key={x}>{x}</option>)}</select></label>
                <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">1주택 여부</span><select className={inp} value={f.oneHouse ? "1주택" : "다주택"} onChange={(e) => set("oneHouse", e.target.value === "1주택")}>{["1주택", "다주택"].map((x) => <option key={x}>{x}</option>)}</select></label>
                <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-slate-500">매도 목적</span><select className={inp} value={f.sellPurpose} onChange={(e) => set("sellPurpose", e.target.value)}>{["갈아타기", "현금화", "손실 축소", "세금 절감", "투자금 회수", "전세 전환 고민"].map((x) => <option key={x}>{x}</option>)}</select></label>
              </div>
            </div>
            <DealsEditor title="전세 실거래" deals={f.deals} setDeals={(d) => set("deals", d)} kind="jeonse" />
            <DealsEditor title="매매 실거래" deals={f.saleDeals} setDeals={(d) => set("saleDeals", d)} kind="sale" />
            <button onClick={run} className="mt-6 w-full rounded-2xl py-4 text-base font-bold text-white" style={{ backgroundColor: NAVY }}>이 값으로 평가하기</button>
          </div>
        )}
      </div>
    </>
  );
}

function SellResult({ r, f, onBack }) {
  const sd = analyzeSellerDecision(f, r);
  const mc = sd.mc;
  const TONE = sd.finalSellDecision.includes("여지 큼") ? "bg-emerald-500" : sd.finalSellDecision.includes("매도 검토") ? "bg-blue-500" : sd.finalSellDecision.includes("조정") ? "bg-amber-500" : sd.finalSellDecision.includes("보류") ? "bg-slate-500" : sd.finalSellDecision.includes("보유") ? "bg-emerald-600" : "bg-slate-400";
  const mrTone = (lv) => lv === "매우높음" ? "text-red-600" : lv === "높음" ? "text-orange-600" : lv === "보통" ? "text-amber-600" : lv === "평가 불가" ? "text-slate-500" : "text-emerald-600";
  const Cell = ({ l, v, tone }) => <div className="px-3 py-2.5 text-center"><p className="text-[11px] text-slate-400">{l}</p><p className={`mt-0.5 text-sm font-bold ${tone || "text-slate-800"}`}>{v}</p></div>;
  return (
    <>
      <div className="mb-4"><button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600">← 다시 평가</button></div>
      <InputWarnings r={r} f={f} />
      <div className="mb-4"><MarketTypeBadge mc={mc} /></div>

      <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
        <div className="px-6 py-5 text-white" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center justify-between"><p className="text-xs text-slate-300">최종 매도 판단{sd.isSpecial ? ` · ${mc.premiumLevel || "특수시장"}` : ""}</p>{!sd.provisional && <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">매도점수 {sd.sellScore}</span>}</div>
          <div className="mt-1.5 flex items-center gap-3"><span className={`rounded-xl px-3 py-1 text-xl font-extrabold text-white ${TONE}`}>{sd.finalSellDecision}</span></div>
          <p className="mt-3 text-sm leading-relaxed text-slate-200"><b className="text-white">추천 행동</b> · {sd.sellerAction}</p>
        </div>
        <div className="grid grid-cols-3 gap-px border-b border-slate-100 bg-slate-100">
          <Cell l="가격 위치" v={sd.askingLevel} tone={sd.gapVsRef > 0.05 ? "text-red-500" : sd.gapVsRef < -0.05 ? "text-blue-500" : "text-slate-800"} />
          <Cell l="세후 실수령" v={!sd.provisional && sd.tax ? won(sd.netProceeds) : "—"} />
          <Cell l="시장 위험도" v={sd.marketRiskLevel} tone={mrTone(sd.marketRiskLevel)} />
        </div>
        <div className="bg-white px-5 py-1.5 text-center text-[11px] text-slate-400">데이터 신뢰도 {sd.dataConfLabel} · 분석 적합도 {sd.fitLabel}</div>
        {(sd.marketRiskLevel === "높음" || sd.marketRiskLevel === "매우높음") && <p className="bg-orange-50 px-5 py-2 text-[11px] leading-relaxed text-orange-700">시장 위험도는 계산 오류가 아니라 재건축·정책·프리미엄·공급 등에 따른 가격 변동성 위험을 의미합니다.</p>}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h3 className="text-sm font-bold text-slate-700">희망 매도가 적정성</h3>
        <div className="mt-2 flex items-baseline gap-2"><span className="text-lg font-extrabold" style={{ color: NAVY }}>{won(sd.desired)}</span><span className={`text-sm font-semibold ${sd.gapVsRef > 0.03 ? "text-red-500" : sd.gapVsRef < -0.03 ? "text-blue-500" : "text-emerald-600"}`}>{sd.askingLevel}</span></div>
        <p className="mt-1 text-xs text-slate-500">{sd.isSpecial ? "시장 기준가" : "적정가"} {won(sd.refPrice)} 대비 {sd.gapVsRef >= 0 ? "+" : ""}{(sd.gapVsRef * 100).toFixed(1)}%{sd.isSpecial && sd.gapVsIntrinsic != null ? ` · 실사용 적정가 ${won(mc.intrinsicFairPrice)} 대비 +${(sd.gapVsIntrinsic * 100).toFixed(0)}%` : ""}</p>
        {sd.isSpecial && <p className="mt-1 text-[11px] text-amber-600">특수시장: 프리미엄 {(mc.premiumRatio * 100).toFixed(0)}% — 시장 분위기 변화 시 프리미엄 축소 위험을 함께 보세요.</p>}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="px-4 py-2.5" style={{ backgroundColor: "#f1f5f9" }}><p className="text-sm font-bold text-slate-700">참고 매도가 범위</p></div>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">빠른 매도</p><p className="mt-0.5 text-base font-bold text-blue-600">{won(sd.recommendedAskingRange.fast)}</p></div>
          <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">현실 매도</p><p className="mt-0.5 text-base font-bold" style={{ color: NAVY }}>{won(sd.recommendedAskingRange.real)}</p></div>
          <div className="px-3 py-3 text-center"><p className="text-[11px] text-slate-400">상단 호가</p><p className="mt-0.5 text-base font-bold text-amber-600">{won(sd.recommendedAskingRange.challenge)}</p></div>
        </div>
        <p className="px-4 pb-3 text-[11px] text-slate-400">상단 호가 가격은 거래기간이 길어질 수 있는 상단 호가입니다.</p>
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
          <p className="mt-2 text-[11px] text-slate-400">{sd.tax.statusMsg || sd.tax.note} · 지방소득세 포함 · {sd.acqEstimated ? "취득가 미입력→추정" : "취득가 입력값 사용"} · 필요경비 미반영(0). 세금 숫자는 개략 추정이며 확정값이 아닙니다. 실제 세액은 보유기간, 거주요건, 세대 주택 수, 조정대상지역, 필요경비, 세법 변경, 일시적 2주택, 상속·증여·분양권·입주권 여부에 따라 달라질 수 있습니다. 세무사 확인이 필요합니다.</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={card}><h3 className="text-sm font-semibold text-slate-500">보유 vs 매도 <span className="font-normal text-slate-400">(종합 판단 보조)</span></h3><p className={`mt-2 text-base font-bold ${sd.holdingVsSellingResult === "매도 쪽 우세" ? "text-blue-600" : sd.holdingVsSellingResult === "보유 쪽 우세" ? "text-emerald-600" : "text-amber-600"}`}>{sd.holdingVsSellingResult}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{sd.holdingVsSellingNote}</p></div>
        <div className={card}><h3 className="text-sm font-semibold text-slate-500">거래 가능성</h3><p className={`mt-2 text-2xl font-bold ${sd.liquidityScore >= 80 ? "text-emerald-600" : sd.liquidityScore >= 60 ? "text-emerald-500" : sd.liquidityScore >= 40 ? "text-amber-600" : "text-orange-600"}`}>{sd.liquidityLevel}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">지연 원인: {sd.liquidityDelayCause}</p><p className="mt-0.5 text-[11px] text-slate-500">{sd.liquidityNeedAdjust ? "호가 조정 시 거래 가능성이 올라갈 수 있습니다." : "호가 수준은 거래에 큰 부담이 아닙니다."}</p><p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">거래 가능성은 실제 매수자 수요, 매물 경쟁, 호가 수준에 따라 달라질 수 있습니다. (mock 추정 · TODO(API): 거래량·매물수 연동)</p></div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-700">매도 타이밍</h3><span className="text-sm font-bold" style={{ color: NAVY }}>{sd.sellTimingLabel}</span></div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${sd.sellTimingScore}%`, backgroundColor: NAVY }} /></div>
        <p className="mt-2 text-[11px] text-slate-400">고평가·프리미엄·공급·정책 가점 / 호재·재건축 진전·저평가 감점으로 산출된 참고 지표입니다.</p>
      </div>

      {sd.isSpecial && (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-200">
          <div className="px-4 py-2.5" style={{ backgroundColor: "#fff7ed" }}><p className="text-sm font-bold text-orange-700">특수시장 · 프리미엄 / 재건축</p></div>
          <div className="grid grid-cols-2 gap-px bg-orange-100">
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">실사용 적정가</p><p className="mt-0.5 font-bold text-slate-800">{won(mc.intrinsicFairPrice)}</p></div>
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">시장 기준가</p><p className="mt-0.5 font-bold text-slate-800">{won(mc.marketReferencePrice)}</p></div>
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">프리미엄 금액</p><p className="mt-0.5 font-bold text-amber-600">{won(mc.premiumAmount)}</p></div>
            <div className="bg-orange-50 px-4 py-3 text-center"><p className="text-[11px] text-orange-500">프리미엄 비율</p><p className="mt-0.5 font-bold text-amber-600">{(mc.premiumRatio * 100).toFixed(0)}%</p></div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="text-slate-500">재건축 단계</span><span className="font-semibold text-slate-700">{RECON[mc.reconstructionStage].label} · {mc.stageScore}점</span></div>
          <p className="px-4 pb-3 text-[11px] leading-relaxed text-slate-400">{mc.specialMarketType === "redevelopment" && mc.stageScore >= 85 ? "관리처분·이주·착공에 가까워 보유(고위험 보유) 관점이 우세합니다." : mc.specialMarketType === "redevelopment" ? "재건축 초기·프리미엄 과다 구간에서는 일부 차익실현(매도 검토)도 선택지입니다." : "프리미엄이 큰 단지는 시장 분위기 변화 시 프리미엄 축소 위험을 함께 고려하세요."} 사업 지연·분담금·정책 변경 가능성 존재.</p>
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
  희망 매도가: ${won(Number(f.currentPrice) || 0)}
  AI 적정가: ${won(sd.refPrice)}
  가격 위치: ${sd.askingLevel} (적정가 대비 ${sd.gapVsRef >= 0 ? "+" : ""}${gapPct}%)
  세후 실수령 개략: ${!sd.provisional && sd.tax ? won(sd.netProceeds) : "—"}

[참고 매도가 범위]
  빠른 매도: ${won(sd.recommendedAskingRange.fast)}
  현실 매도: ${won(sd.recommendedAskingRange.real)}
  상단 호가: ${won(sd.recommendedAskingRange.challenge)}

[거래 가능성]
  ${sd.liquidityLevel} · ${sd.liquidityDelayCause}

[매도 타이밍]
  ${sd.sellTimingLabel}

[추천 행동]
  ${sd.sellerAction}

${"=".repeat(40)}
📋 이 리포트를 활용하기 전 확인하세요
□ 공인중개사에게 현장 시세·매물 경쟁력을 확인했나요?
□ 세무사에게 양도세를 상담받았나요?
   (보유기간·거주요건에 따라 세액이 크게 달라집니다)
□ 세후 실수령액을 세무사와 함께 계산했나요?
□ 대출 상환 일정·중도상환 수수료를 확인했나요?

위 항목을 확인한 후 최종 결정을 내리세요.
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
Powered by ValueLens`;
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
            <p className="text-sm font-bold text-slate-800">📄 매도 가격평가 리포트 저장</p>
            <p className="mt-0.5 text-xs text-slate-400">희망가·적정가·거래 가능성·추천 행동 포함 · 계산식 제외</p>
          </div>
          <span className="text-xs text-slate-400">다운로드 ↓</span>
        </button>
      </div>
    </>
  );
}
function BudgetView({ onProfile }) {
  const [budget, setBudget] = useState("");
  const [equity, setEquity] = useState("");
  const [income, setIncome] = useState("");
  const [plannedLoan, setPlannedLoan] = useState("");
  const [existingPay, setExistingPay] = useState("");
  const [noHouse, setNoHouse] = useState(true);
  const [loanYears, setLoanYears] = useState("30");
  const [rateType, setRateType] = useState("fixed");
  const [region, setRegion] = useState("");
  const [pyeong, setPyeong] = useState("");
  const [purpose, setPurpose] = useState("live");
  const [prefs, setPrefs] = useState([]);
  const [firstHome, setFirstHome] = useState(false);
  const [newlywed, setNewlywed] = useState(false);
  const [res, setRes] = useState(null);
  const PREFS = ["역세권", "학군", "저평가", "재건축", "신축", "전세가율", "호재"];
  const togglePref = (p) => setPrefs((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  function run() {
    const B = Number(budget) * 10000, E = Number(equity) * 10000, I = Number(income) * 10000, EP = Number(existingPay) * 10000;
    if (!B) { alert("예산을 입력하세요 (억 단위)."); return; }
    const ranked = recommendByBudget({ budget: B, region, pyeong: Number(pyeong) || 0, prefs });
    const list = ranked.map((c) => {
      const loan = calculateLoanOptions({ price: c.cur, equity: E, income: I, existingPay: EP, noHouse, firstHome, newlywed, years: Number(loanYears) || 30, rateType });
      const tax = acqTax(c.cur, c.pyeong > 25, purpose === "invest" ? 2 : 1, c.regulated, firstHome);
      const finRisky = loan.shortfall > c.cur * 0.05; // 부족자금이 큰 후보 → 주의 분리
      return { ...c, loan, tax, risky: c.risky || finRisky, finRisky };
    });
    setRes({ B, fit: list.filter((c) => !c.risky), caution: list.filter((c) => c.risky) });
    if (onProfile) onProfile({ equity, income, existingPay, noHouse, firstHome, newlywed, loanYears, rateType, budget });
  }

  const riskTone = { 낮음: "text-emerald-600", 보통: "text-amber-600", 높음: "text-red-500", 매우높음: "text-red-600" };
  const Metric = ({ l, v, tone }) => <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-center"><p className="text-[10px] text-slate-400">{l}</p><p className={`text-xs font-bold ${tone || "text-slate-700"}`}>{v}</p></div>;

  const Card = ({ c, caution }) => (
    <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${caution ? "ring-orange-200" : "ring-slate-200"}`}>
      <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: caution ? "#fff7ed" : "#f8fafc" }}>
        <div><p className="text-base font-bold text-slate-800">{c.name} <span className="text-xs font-normal text-slate-400">{c.pyeong}평 · {c.age}년차{c.redev ? " · 재건축권" : ""}</span></p><p className="text-xs text-slate-400">{c.region} {c.dong}{c.isPremium ? ` · ${c.marketType} 검토 후보` : ""}</p></div>
        <div className="text-right"><p className="text-lg font-bold text-slate-900">{won(c.cur)}</p><p className={`text-xs ${c.undervalue > 0 ? "text-emerald-600" : c.undervalue < 0 ? "text-red-500" : "text-slate-400"}`}>적정가 {won(c.fair)} 대비 {c.gapPos} {pct(-c.undervalue)}</p></div>
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          <Metric l="후보 점수" v={`${c.ranking}`} tone="text-slate-900" />
          <Metric l="예산 적합도" v={`${c.budgetFit}`} />
          <Metric l="가격 위치" v={c.gapPos} tone={c.gapPos === "저평가" ? "text-emerald-600" : c.gapPos === "고평가" ? "text-red-500" : "text-slate-700"} />
          <Metric l="매수 판단" v={c.buyLabel} tone={c.buyGrade === "A" || c.buyGrade === "B" ? "text-emerald-600" : c.buyGrade === "C" ? "text-slate-700" : c.buyGrade === "D" ? "text-amber-600" : "text-red-500"} />
          <Metric l="시장 위험" v={c.mrLevel} tone={riskTone[c.mrLevel]} />
          <Metric l="공급 위험" v={c.supply.level} tone={riskTone[c.supply.level]} />
        </div>
        <div className="mt-3">
          <p className="text-xs font-bold text-emerald-700">조건 적합 이유</p>
          <ol className="mt-1 space-y-1">{c.reasons.map((t, k) => <li key={k} className="flex gap-2 text-sm leading-relaxed text-slate-600"><span className="text-slate-400">{k + 1}.</span><span>{t}</span></li>)}</ol>
        </div>
        <div className="mt-3">
          <p className="text-xs font-bold text-orange-600">주의 이유</p>
          <ul className="mt-1 space-y-1">{c.cautions.map((t, k) => <li key={k} className="flex gap-2 text-sm leading-relaxed text-slate-500"><span className="text-orange-400">·</span><span>{t}</span></li>)}</ul>
        </div>
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600">내 조건 재무 가능성 <span className="font-normal text-slate-400">(보조 지표 · 개략 추정)</span></p>
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${c.loan.ok ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{c.loan.ok ? "자금 가능 추정" : "자금 부족 추정"}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span className={`rounded-md px-2 py-0.5 font-semibold ${c.gapPos === "고평가" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>가격: {c.gapPos}</span>
            <span className={`rounded-md px-2 py-0.5 font-semibold ${c.loan.shortfall > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>자금: {c.loan.shortfall > 0 ? `부족 ${won(c.loan.shortfall)}` : "가능"}</span>
            <span className={`rounded-md px-2 py-0.5 font-semibold ${caution ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>분류: {caution ? "주의 후보" : "적합 후보"}</span>
          </div>
          {c.finRisky && <p className="mt-1.5 text-[11px] font-semibold text-orange-600">가격은 적합하나 자금 조건상 주의 후보입니다 (보유 현금·대출 가능액 보강 필요).</p>}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div><p className="text-slate-400">필요 대출액</p><p className="font-bold text-slate-700">{won(c.loan.need)}</p></div>
            <div><p className="text-slate-400">월상환 개략 추정</p><p className="font-bold text-slate-700">{won(c.loan.best.monthly)}</p></div>
            <div><p className="text-slate-400">부족자금</p><p className={`font-bold ${c.loan.shortfall > 0 ? "text-red-500" : "text-emerald-600"}`}>{c.loan.shortfall > 0 ? won(c.loan.shortfall) : "없음"}</p></div>
            <div><p className="text-slate-400">대출 안정성</p><p className={`font-bold ${c.loan.stabilityLabel === "안정" ? "text-emerald-600" : c.loan.stabilityLabel === "보통" ? "text-amber-600" : "text-red-500"}`}>{c.loan.stabilityLabel} ({c.loan.stability})</p></div>
            <div><p className="text-slate-400">금리 비교 후보 최저</p><p className="font-bold text-slate-700">{c.loan.best.name} {c.loan.best.rate}%</p></div>
            <div><p className="text-slate-400">최저 월상환</p><p className="font-bold text-slate-700">월 {won(c.loan.best.monthly)}</p></div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">‘적합 후보’는 가격·실거주·위험 기준 분류일 뿐 매수 가능을 뜻하지 않습니다. 가격 조건과 자금 조건을 분리해 보세요. 대출 가능액·월상환은 개략 추정이며 실제 승인금리·한도는 신용점수, 소득증빙, DSR, 담보평가, 금융사 심사에 따라 달라질 수 있습니다. · 취득세 개략 {won(c.tax.total)} (세금탭의 매수 총비용과 함께 보세요)</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="mb-6 text-center"><h1 className="text-2xl font-bold text-slate-900">추천 후보 찾기</h1><p className="mt-2 text-sm text-slate-500">예산·목적·선호 조건에 맞는 <b>검토 후보</b>를 보여줍니다. (투자 권유가 아닙니다)</p></header>
      <div className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
        <p className="text-sm font-semibold text-amber-800">⚠ 현재 데모 데이터 기반 예시입니다.</p>
        <p className="mt-0.5 text-xs text-amber-600">실제 단지 DB·국토부 실거래·KB시세 연동 전까지는 참고용 샘플 데이터로 동작합니다. 실제 매수 판단에는 매수 탭의 AI 분석을 이용하세요.</p>
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">보유 현금 (억)</span><input type="number" className={inp} value={equity} placeholder="6" onChange={(e) => setEquity(e.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">연소득 (억)</span><input type="number" step="0.1" className={inp} value={income} placeholder="0.8" onChange={(e) => setIncome(e.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">희망 대출 (억)</span><input type="number" step="0.1" className={inp} value={plannedLoan} placeholder="8" onChange={(e) => { setPlannedLoan(e.target.value); const tot = (Number(equity) || 0) + (Number(e.target.value) || 0); if (tot) setBudget(String(tot)); }} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">총 예산 (억)</span><input type="number" className={inp} value={budget} placeholder="14" onChange={(e) => setBudget(e.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">선호 지역 (구·동, 비우면 전체)</span><input type="text" className={inp} value={region} placeholder="공릉동 / 강남구" onChange={(e) => setRegion(e.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">선호 평형 (선택)</span><input type="number" className={inp} value={pyeong} placeholder="34" onChange={(e) => setPyeong(e.target.value)} /></label>
          <label className="block sm:col-span-3"><span className="mb-1.5 block text-xs font-medium text-slate-500">목적</span><select className={inp} value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="live">실거주</option><option value="invest">투자</option><option value="move">갈아타기</option></select></label>
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-slate-500">선호 조건 (복수 선택) — 학군·역세권·신축·재건축·저평가·전세가율·호재</p>
          <div className="flex flex-wrap gap-1.5">{PREFS.map((p) => <button key={p} onClick={() => togglePref(p)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${prefs.includes(p) ? "text-white" : "bg-slate-100 text-slate-500"}`} style={prefs.includes(p) ? { backgroundColor: NAVY } : {}}>{p}</button>)}</div>
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-600">내 조건 (재무 프로필) — 대출 가능성·월상환 개략 추정에 사용</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">기존 연간 원리금 (억)</span><input type="number" step="0.01" className={inp} value={existingPay} placeholder="0" onChange={(e) => setExistingPay(e.target.value)} /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">희망 대출기간</span><select className={inp} value={loanYears} onChange={(e) => setLoanYears(e.target.value)}><option value="20">20년</option><option value="30">30년</option><option value="40">40년</option></select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-500">금리 방식</span><select className={inp} value={rateType} onChange={(e) => setRateType(e.target.value)}><option value="fixed">고정</option><option value="variable">변동</option><option value="mixed">혼합</option></select></label>
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={noHouse} onChange={(e) => setNoHouse(e.target.checked)} />무주택</label>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={firstHome} onChange={(e) => setFirstHome(e.target.checked)} />생애최초</label>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={newlywed} onChange={(e) => setNewlywed(e.target.checked)} />신혼부부</label>
          </div>
        </div>
        {(!budget || Number(budget) <= 0) && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">예산을 입력하면 더 정확한 후보를 확인할 수 있습니다.</p>}
        <button onClick={run} className="mt-6 w-full rounded-2xl py-4 text-base font-bold text-white" style={{ backgroundColor: NAVY }}>조건에 맞는 후보 찾기</button>
        <p className="mt-3 text-xs text-slate-400">※ 후보 단지·금리는 데모 샘플(POOL) 기준입니다. TODO(API): 웹앱 전환 시 실제 단지 DB·국토부 실거래·KB시세·금융상품비교공시 연동으로 실시간 구성.</p>
      </div>
      {res && (
        <div className="mt-5 space-y-4">
          {res.fit.length === 0 && res.caution.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100">예산 {won(res.B)} {region ? `· ${region} ` : ""}조건에 맞는 후보가 없습니다. 예산을 높이거나 조건을 완화해보세요.</div>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-700">조건에 맞는 후보 ({res.fit.length})</p>
              {res.fit.length ? res.fit.map((c) => <Card key={c.name} c={c} />) : <p className="rounded-2xl bg-white p-4 text-center text-xs text-slate-400 ring-1 ring-slate-100">조건을 충족하는 일반 후보가 없습니다. 아래 주의 후보를 참고하세요.</p>}
              {res.caution.length > 0 && (
                <>
                  <p className="mt-6 text-sm font-bold text-orange-600">주의 후보 ({res.caution.length}) — 시장·공급 위험이 높아 별도 표시</p>
                  {res.caution.map((c) => <Card key={c.name} c={c} caution />)}
                </>
              )}
              <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500"><b className="text-slate-600">본 결과는 조건에 맞는 후보를 정리한 참고 자료이며 투자 권유가 아닙니다.</b> 가격 여력·실거주·위험 등급은 펀더멘털 신호를 등급화한 개략 추정입니다. 대출(LTV/DSR)·취득세·금리는 개략 추정이며 정확한 값은 금융기관·세무사 상담이 필요합니다.</div>
            </>
          )}
        </div>
      )}
    </>
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
        <span className="text-sm font-semibold text-slate-700">{title} 입력 <span className="font-normal text-slate-400">(정제평균 자동산정 · 최근 12개월)</span></span>
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
              <input type="number" value={d.topFloor} onChange={(e) => upd(i, "topFloor", e.target.value)} placeholder="최고층" className={`w-16 ${ip}`} />
              {flags.map(([k, l]) => (
                <button key={k} onClick={() => upd(i, k, !d[k])} className={`rounded-md px-2 py-1 text-xs font-medium ${d[k] ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}>{l}</button>
              ))}
              <button onClick={() => del(i)} className="ml-auto px-1 text-xs text-slate-300 hover:text-red-500">✕</button>
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
