// ValueLens — AIChatView
// Phase 1-E: main.jsx에서 분리
// props / 함수명 / className / 채팅 흐름 변경 금지

import React, { useState, useEffect, useRef } from 'react';
import { BRAND, BRAND_GREEN, BRAND_MID, BRAND_MUTED, BRAND_LIGHT, BRAND_BG, BRAND_BORDER,
         GRADE_COLOR, GRADE_BG, GRADE_BR } from '../constants/brand.js';
import { typicalPyeong } from '../constants/grades.js';
import { analyze } from '../engine/analyze.js';
import { groupAreasByPyeong } from '../search/utils.js';
import { buildAnalysisInput } from '../search/input.js';
import { searchComplexFromSupabase } from '../search/supabase.js';
import { LocationPicker } from './LocationPicker.jsx';

// ── parseIntent (AIChatView 전용) ──
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

function AIChatView({ onNavigate, history, onSaveHistory, currentUserId, currentUserEmail, agentInitial }) {

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

  // agentInitial: AgentHome에서 ToolRouter 결과를 받아 채팅에 주입
  React.useEffect(() => {
    if (agentInitial && agentInitial.summary) {
      setMsgs([WELCOME, {
        id: "agent_" + Date.now(), role: "ai", type: "agent_result",
        summary: agentInitial.summary,
        rawData: agentInitial.rawData,
      }]);
    }
  }, [agentInitial]);
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

    if (msg.type === "agent_result") {
      const s = msg.summary || {};
      const PURPLE = "#5b52e0";
      const trustColor = s.trust?.includes("주의") ? "#b45309" : "#15803d";
      const trustBg    = s.trust?.includes("주의") ? "#fef3c7" : "#dcfce7";
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:BRAND_GREEN,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <CI d="star" s={13} color="#fff" />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            {/* 결론 */}
            {s.conclusion && (
              <p style={{ fontSize:14, fontWeight:600, color:BRAND, margin:"0 0 10px", lineHeight:1.55 }}>
                {s.conclusion}
              </p>
            )}
            {/* 핵심 숫자 카드 */}
            {s.keyNumbers && s.keyNumbers.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
                {s.keyNumbers.map((kn, i) => (
                  <div key={i} style={{ background:BRAND_BG, borderRadius:10, padding:"8px 10px",
                    border:`0.5px solid ${BRAND_BORDER}` }}>
                    <p style={{ fontSize:10, color:BRAND_MID, margin:"0 0 2px" }}>{kn.label}</p>
                    <p style={{ fontSize:14, fontWeight:600, color:BRAND, margin:0 }}>{kn.value}</p>
                  </div>
                ))}
              </div>
            )}
            {/* 근거 */}
            {s.basis && (
              <p style={{ fontSize:11, color:BRAND_MID, margin:"0 0 6px", lineHeight:1.5 }}>
                📊 {s.basis}
              </p>
            )}
            {/* 신뢰도/주의 */}
            {s.trust && (
              <span style={{ display:"inline-block", fontSize:10, fontWeight:500,
                background:trustBg, color:trustColor, borderRadius:5, padding:"2px 8px", marginBottom:10 }}>
                {s.trust}
              </span>
            )}
            {/* 자세히 보기 버튼 */}
            {s.tab && (
              <div>
                <button onClick={() => onNavigate(s.tab, { agentResult: msg.rawData })}
                  style={{ background:PURPLE, color:"#fff", border:"none", borderRadius:9,
                    padding:"8px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  자세히 보기 →
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

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
    <div style={{ maxWidth:480, margin:"0 auto", background:BRAND_BG, display:"flex", flexDirection:"column" }}>

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
      <div style={{ padding:"10px 16px 20px", borderTop:`0.5px solid ${BRAND_BORDER}`, background:BRAND_BG, flexShrink:0, position:"sticky", bottom:"max(64px, calc(64px + env(safe-area-inset-bottom)))" }}>
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

export { AIChatView };
