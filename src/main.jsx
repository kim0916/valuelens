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
const typicalPyeong = (sqm) => { sqm = Number(sqm) || 0; if (sqm <= 0) return 0; const t = [[36, 15], [43, 18], [50, 20], [55, 23], [62, 25], [70, 27], [78, 30], [88, 34], [100, 38], [110, 43], [120, 45], [140, 51]]; for (const [th, p] of t) if (sqm <= th) return p; return Math.round(sqm / 3.3058 / 0.74); };
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
  if (income || cash) reasons.push(shortfallCash > 0 ? `[자금] 현금 ${won(shortfallCash)} 부족 (총 매입비용 ${won(totalBuyCost)})` : `[자금] 월상환 ${
