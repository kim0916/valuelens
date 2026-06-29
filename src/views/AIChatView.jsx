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
import { FairValueResult } from './FairValueResult.jsx';
import { createSessionMemory, processUserInput } from '../agent/AgentCore.js';
import { routeTool } from '../agent/ToolRouter.js';
// ── Phase 2: Conversation Engine ──
import { createConversationEngine } from '../engine/ConversationEngine.js';
import { createConversationState } from '../engine/conversationState.js';
import { RESPONSE_TYPES } from '../engine/responseGenerator.js';
import { ACTIONS } from '../engine/conversationPolicy.js';
import { parseAreaInput, pyeongLabel, filterDealsByArea, sqmToPyeong } from '../constants/areaMapping.js';
import { resolveMessyInput } from '../engine/MessyInputResolver.js';
import { bridgeToState, logBridge } from '../engine/MessyInputBridge.js';
import { adaptFairValue } from '../parser/FairValueAdapter.js';

// ── 매물가 입력 파싱 (다양한 형식/오타 처리) ──
function parsePriceInput(text) {
  if (!text) return null;
  let t = text.trim();

  // 한글 숫자 변환
  t = t
    .replace(/일억/g,'1억').replace(/이억/g,'2억').replace(/삼억/g,'3억')
    .replace(/사억/g,'4억').replace(/오억/g,'5억').replace(/육억/g,'6억')
    .replace(/칠억/g,'7억').replace(/팔억/g,'8억').replace(/구억/g,'9억')
    .replace(/십억/g,'10억').replace(/이십억/g,'20억').replace(/삼십억/g,'30억');

  // 오타 정규화 (악→억, 엌→억, 옥→억)
  t = t.replace(/([0-9]+)\s*[악엌옥](\s|만|천|$)/g, '$1억$2');

  // 접두사 제거
  t = t.replace(/^(약|대략|약간)\s*/g, '');

  // "7억5" / "7억5천" 형식
  const m1 = t.match(/^([0-9]+)억\s*([0-9])천?만?$/);
  if (m1) return Math.round((Number(m1[1]) + Number(m1[2]) * 0.1) * 10000);

  const m2 = t.match(/^([0-9]+)억\s*([0-9]+)천$/);
  if (m2) return Math.round(Number(m2[1]) * 10000 + Number(m2[2]) * 1000);

  // "N억" 형식
  const m3 = t.match(/([0-9]+(?:[.][0-9]+)?)\s*억/);
  if (m3) return Math.round(Number(m3[1]) * 10000);

  // "N만" 형식 (4자리 이상)
  const m4 = t.match(/^([0-9]{4,})\s*만?원?$/);
  if (m4) return Number(m4[1]);

  // 단독 숫자
  const m5 = t.match(/^([0-9]+(?:[.][0-9]+)?)$/);
  if (m5) {
    const n = Number(m5[1]);
    if (n >= 1000) return n;
    if (n >= 1) return Math.round(n * 10000);
  }

  return null;
}

// ── parseIntent (AIChatView 전용) ──
function parseIntent(raw) {
  const t = (raw || "").trim();
  const n = t.replace(/\s/g, "").toLowerCase();

  // ── intent 판별 ──
  let intent = "fair";
  if (/팔까|매도|팔려고|팔아야|호가|내집|내가산|내꺼|팔면|팔것|팔지/.test(n)) intent = "sell";
  // recommend: 반드시 명시적 추천어 OR 예산+지역 조합이어야 함
  // 단지명이나 지역어만 있으면 recommend가 아님
  else if (/추천해줘|추천해주세요|추천좀|골라줘|골라주세요|찾아줘|찾아주세요/.test(n)) intent = "recommend";
  else if (/예산.{0,10}(추천|아파트|단지)|\d+억.{0,5}(추천|이하|이상|안에서|정도)/.test(n)) intent = "recommend";
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
      // P0 fix: 동이름(/^[가-힣]{1,4}동$/) 토큰은 complexName 후보에서 제외
      const tokens = cleaned.split(/\s+/).filter(tok =>
        tok.length >= 2 &&
        !tok.match(/^(서울|경기|인천|부산|대구|광주|대전|울산|은|는|이|가|을|를|에|의|로|도)$/) &&
        !tok.match(/[구시군]$/) &&
        !tok.match(/^[가-힣]{1,4}동$/) &&   // ← P0: 동이름 오인식 방지 (우동, 공릉동 등)
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

  const [msgs, setMsgs]           = React.useState([]);  // 첫 메시지 없음 (카드 배너로 대체)
  const [agentSessionMemory, setAgentSessionMemory] = React.useState(() => createSessionMemory());
  const agentMemoryRef = React.useRef(createSessionMemory()); // state 비동기 문제 방지

  // ── Phase 2: Conversation State (Context 유지) ──
  const convEngineRef  = React.useRef(createConversationEngine());
  const convStateRef   = React.useRef(createConversationState());
  const [convState, setConvState] = React.useState(() => createConversationState());

  // agentInitial: AgentHome에서 질문 텍스트를 받아 AIChatView 안에서 처리
  React.useEffect(() => {
    if (agentInitial) {
      // searchQuery가 있으면 handleSend로 처리 (AgentCore → ToolRouter → 카드)
      if (agentInitial.searchQuery) {
        setTimeout(() => handleSend(agentInitial.searchQuery), 100);
      }
      // 이미 계산된 결과가 있으면 바로 카드로 표시
      else if (agentInitial.summary) {
        setMsgs(prev => [...prev, {
          id: "agent_" + Date.now(), role: "ai", type: "agent_result",
          summary: agentInitial.summary,
          rawData: agentInitial.rawData,
        }]);
      }
    }
  }, [agentInitial]);
  const [input, setInput]         = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [advOpen, setAdvOpen]     = React.useState(false);  // 고급 검색 접기
  const [showAllMap, setShowAllMap] = React.useState({});  // 후보 더보기 상태
  const [pendingIntent, setPendingIntent] = React.useState(null); // 후보 선택 대기

  const bottomRef  = React.useRef(null);
  const inputRef   = React.useRef(null);
  const fileRef    = React.useRef(null);

  // placeholder 없음
  const PHS = [""];
  const phIdx = 0;

  // 스크롤 하단 유지
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // 결과지에서 질문 이벤트 수신
  React.useEffect(() => {
    const handler = async (e) => {
      const { text, complex, areaSqm } = e.detail || {};
      if (!text) return;

      // 단지 컨텍스트 복원
      if (complex) {
        const { updateComplex, updateArea } = await import('../engine/conversationState.js');
        const complexObj = {
          id: null,
          complex_name: complex.name,
          sigungu: complex.sigungu,
          legal_dong: complex.dong,
          build_year: complex.buildYear,
          area_list: areaSqm ? [areaSqm] : [],
        };
        let s = updateComplex(convStateRef.current, complexObj, areaSqm);
        if (areaSqm) s = updateArea(s, areaSqm);
        convStateRef.current = s;
        setConvState(s);
      }

      handleSend(text);
    };
    window.addEventListener("valuelens:ask", handler);
    return () => window.removeEventListener("valuelens:ask", handler);
  }, []);

  // 결과지에서 매수 분석 이벤트 수신
  React.useEffect(() => {
    const handler = async (e) => {
      const { complex, areaSqm, currentPrice } = e.detail || {};
      if (!complex) return;
      addMsg({ role: "user", type: "text", content: `${complex.name} 매수 의견은?` });
      addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
      // complex 객체를 Supabase 형식으로 변환
      const complexObj = {
        id: null,
        complex_name: complex.name,
        sigungu: complex.sigungu,
        legal_dong: complex.dong,
        build_year: complex.buildYear,
        area_list: areaSqm ? [areaSqm] : [],
      };
      await runAnalysis(complexObj, { intent: "buy", areaSqm, currentPrice: currentPrice || null });
    };
    window.addEventListener("valuelens:buy", handler);
    return () => window.removeEventListener("valuelens:buy", handler);
  }, []);

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

    // ── pending 상태 체크 (매물가/데이터없음 입력 대기 중) ──
    const ps = convStateRef.current;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // expectedAnswerType: 직전 질문 기반 입력 해석 최우선
    // 이 블록이 ConversationEngine보다 먼저 실행됨
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (ps?._expectedAnswerType) {
      const eat = ps._expectedAnswerType;

      // ── 원칙: addMsg(user)는 각 블록 안에서 한 번만 ──

      // ── dong: 어느 지역? 입력 대기 ──
      if (eat === 'dong') {
        addMsg({ role: "user", type: "text", content: text });
        addMsg({ role: "ai",  type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
        const pendingComplex = ps._pendingComplex;
        convStateRef.current = { ...ps, _expectedAnswerType: null };
        try {
          let pool = [];
          if (pendingComplex) {
            const r = await searchComplexFromSupabase(pendingComplex, '', text);
            if (r.fromSupabase) pool = r.complexes;
          } else {
            const res = await fetch('/api/supabase', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'search', name: '', sigungu: '', dong: text, limit: 20 }),
            });
            const data = await res.json();
            pool = data.complexes || [];
          }
          if (pool.length === 0) {
            replaceLastAI({ role: "ai", type: "text",
              content: `"${text}" 동을 찾지 못했습니다. 정확한 동 이름을 다시 입력해 주세요.\n예: 우동, 공릉동, 잠실동` });
            convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'dong', _pendingComplex: pendingComplex };
            return;
          }
          const sigunguGroups = {};
          for (const c of pool) {
            const key = c.sigungu || '기타';
            if (!sigunguGroups[key]) sigunguGroups[key] = [];
            sigunguGroups[key].push(c);
          }
          const sigunguKeys = Object.keys(sigunguGroups);
          if (sigunguKeys.length > 1 && !pendingComplex) {
            replaceLastAI({
              role: "ai", type: "purpose_chips",
              content: `어느 ${text}을(를) 말씀하시나요?`,
              choices: sigunguKeys.slice(0, 4),
              onSelect: async (chosen) => {
                addMsg({ role: "user", type: "text", content: chosen });
                addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
                convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'complex', _pendingDong: text, _pendingRegion: chosen };
                replaceLastAI({ role: "ai", type: "text",
                  content: `${chosen} ${text}에서 찾으시는 아파트 단지명을 알려주세요.` });
              },
            });
          } else {
            const region = sigunguKeys[0];
            convStateRef.current = { ...convStateRef.current, _pendingDong: text, _pendingRegion: region };
            if (pool.length === 1) {
              const cx = pool[0];
              convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'purpose', _pendingComplex: cx, _pendingPurpose: 'fair' };
              replaceLastAI({ role: "ai", type: "purpose_chips",
                content: `${cx.complex_name}에서 무엇을 확인할까요?`,
                choices: ['적정가', '매수 의견', '전세', '계약 전 체크'],
                onSelect: async (choice) => {
                  addMsg({ role: "user", type: "text", content: choice });
                  if (choice === '전세' || choice === '계약 전 체크') {
                    addMsg({ role: "ai", type: "text", content: "해당 기능은 준비 중입니다." });
                    convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                    return;
                  }
                  const purpose = choice === '매수 의견' ? 'buy' : 'fair';
                  convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                  addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
                  await askAreaThenPrice(cx, purpose);
                },
              });
            } else {
              replaceLastAI({ role: "ai", type: "candidates",
                content: `${text}의 아파트 목록입니다. 찾으시는 단지를 선택해주세요.`,
                data: pool.slice(0, 8),
                onSelect: async (cx) => {
                  addMsg({ role: "user", type: "text", content: cx.complex_name });
                  convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'purpose', _pendingComplex: cx, _pendingPurpose: 'fair' };
                  addMsg({ role: "ai", type: "purpose_chips",
                    content: `${cx.complex_name}에서 무엇을 확인할까요?`,
                    choices: ['적정가', '매수 의견', '전세', '계약 전 체크'],
                    onSelect: async (choice) => {
                      addMsg({ role: "user", type: "text", content: choice });
                      if (choice === '전세' || choice === '계약 전 체크') {
                        addMsg({ role: "ai", type: "text", content: "해당 기능은 준비 중입니다." });
                        convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                        return;
                      }
                      const purpose = choice === '매수 의견' ? 'buy' : 'fair';
                      convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                      addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
                      await askAreaThenPrice(cx, purpose);
                    },
                  });
                },
              });
            }
          }
        } catch(e) {
          console.error('[EAT:dong]', e);
          replaceLastAI({ role: "ai", type: "text", content: "검색 중 오류가 발생했습니다. 다시 시도해 주세요." });
        }
        return;
      }

      // ── complex: 단지명 입력 대기 ──
      if (eat === 'complex') {
        addMsg({ role: "user", type: "text", content: text });
        addMsg({ role: "ai",  type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
        const dong   = ps._pendingDong   || '';
        const region = ps._pendingRegion || '';
        convStateRef.current = { ...ps, _expectedAnswerType: null };
        const r = await searchComplexFromSupabase(text, region, dong);
        const pool = r.fromSupabase ? r.complexes.slice(0, 8) : [];
        if (pool.length === 0) {
          replaceLastAI({ role: "ai", type: "text",
            content: `"${text}" 단지를 찾지 못했습니다. 단지명을 다시 확인해 주세요.` });
          convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'complex', _pendingDong: dong };
          return;
        }
        if (pool.length === 1) {
          const cx = pool[0];
          convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'purpose', _pendingComplex: cx, _pendingPurpose: 'fair' };
          replaceLastAI({ role: "ai", type: "purpose_chips",
            content: `${cx.complex_name}에서 무엇을 확인할까요?`,
            choices: ['적정가', '매수 의견', '전세', '계약 전 체크'],
            onSelect: async (choice) => {
              addMsg({ role: "user", type: "text", content: choice });
              if (choice === '전세' || choice === '계약 전 체크') {
                addMsg({ role: "ai", type: "text", content: "해당 기능은 준비 중입니다." });
                convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                return;
              }
              const purpose = choice === '매수 의견' ? 'buy' : 'fair';
              convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
              addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
              await askAreaThenPrice(cx, purpose);
            },
          });
        } else {
          replaceLastAI({ role: "ai", type: "candidates",
            content: `"${text}" 검색 결과입니다. 찾으시는 단지를 선택해주세요.`,
            data: pool,
            onSelect: async (cx) => {
              addMsg({ role: "user", type: "text", content: cx.complex_name });
              convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'purpose', _pendingComplex: cx, _pendingPurpose: 'fair' };
              addMsg({ role: "ai", type: "purpose_chips",
                content: `${cx.complex_name}에서 무엇을 확인할까요?`,
                choices: ['적정가', '매수 의견', '전세', '계약 전 체크'],
                onSelect: async (choice) => {
                  addMsg({ role: "user", type: "text", content: choice });
                  if (choice === '전세' || choice === '계약 전 체크') {
                    addMsg({ role: "ai", type: "text", content: "해당 기능은 준비 중입니다." });
                    convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                    return;
                  }
                  const purpose = choice === '매수 의견' ? 'buy' : 'fair';
                  convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                  addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
                  await askAreaThenPrice(cx, purpose);
                },
              });
            },
          });
        }
        return;
      }

      // ── area: 평형 입력 대기 ──
      // 규칙: addMsg(user) 한 번 → 상태 세팅 → 가격 질문
      // 절대 금지: runAnalysis 직행
      if (eat === 'area') {
        const areaText = text.trim();

        // ── 평형 파싱: areaMapping 정책 사용 ──
        // 25 → 25평/59㎡, 84 → 84㎡/33평, 25평 → 59㎡ 등
        const parsed = parseAreaInput(areaText);

        if (!parsed) {
          addMsg({ role: "user", type: "text", content: text });
          addMsg({ role: "ai", type: "text",
            content: `평형을 인식하지 못했어요.\n예: 25 (25평), 84 (전용 84㎡), 25평, 84㎡` });
          return;  // _expectedAnswerType 유지 (재시도)
        }

        const { inputPyeong, areaSqm } = parsed;

        const cx        = ps._pendingComplex || convStateRef.current.currentComplex;
        const intentStr = ps._pendingPurpose || 'fair';
        const cxName    = (cx && (cx.complex_name || cx.name)) || '단지';
        const guName    = (cx && cx.sigungu)    ? cx.sigungu.split(' ').slice(-1)[0] : '';
        const dongName  = (cx && cx.legal_dong) ? cx.legal_dong : '';
        const locStr    = [guName, dongName].filter(Boolean).join(' ');
        const purposeKr = intentStr === 'buy' ? '매수 분석' : '적정가';

        // addMsg(user) 단 한 번
        addMsg({ role: "user", type: "text", content: areaText });

        // 상태 세팅 → price 대기
        convStateRef.current = {
          ...ps,
          _expectedAnswerType: null,
          _pendingPrice:       true,
          _pendingComplex:     cx,
          _pendingArea:        areaSqm,
          _pendingPurpose:     intentStr,
          _pendingInputPyeong: inputPyeong,
        };

        // 요약 + 가격 질문 (한 메시지)
        const summary = locStr
          ? `${locStr} ${cxName} ${inputPyeong}평 ${purposeKr}을 분석해드릴게요.`
          : `${cxName} ${inputPyeong}평 ${purposeKr}을 분석해드릴게요.`;
        addMsg({ role: "ai", type: "text",
          content: summary + '\n\n현재 매물 가격을 알고 계시나요?\n모르셔도 괜찮습니다. "몰라요"라고 입력하시면 최근 실거래 데이터를 기준으로 분석해드립니다.' });
        return;
      }

      // ── confirm_analysis: 요약 확인 대기 ──
      // [분석 시작] 버튼 또는 텍스트로 확인/취소
      if (eat === 'confirm_analysis') {
        const confirmText = text.trim();
        // 확인 표현
        const isConfirm = /^(네+|응+|예|ㄴ+|ㄱ+|고|굿|ok+|yes|시작|진행|해줘|해주세요|바로|분석|좋아|좋아요|계속|ㅇ+|맞아|맞아요)$/i.test(confirmText)
          || /분석\s*(시작|해줘|해주세요|진행)/.test(confirmText)
          || /시작|진행|바로\s*해/.test(confirmText);
        // 취소 표현
        const isCancel = /^(아니|아니오|취소|cancel|no|다시|다른|처음|그만|stop)/.test(confirmText)
          || /다른\s*(평형|단지|아파트)/.test(confirmText);

        if (isCancel) {
          addMsg({ role: "user", type: "text", content: text });
          convStateRef.current = { ...ps, _expectedAnswerType: null,
            _confirmComplex: null, _confirmArea: null, _confirmPurpose: null,
            _confirmPrice: null };
          addMsg({ role: "ai", type: "text",
            content: "알겠습니다. 처음부터 다시 시작할까요?\n분석할 아파트 단지명을 입력해 주세요." });
          return;
        }

        if (isConfirm) {
          addMsg({ role: "user", type: "text", content: text });
          const st = ps;
          convStateRef.current = { ...st, _expectedAnswerType: null,
            _confirmComplex: null, _confirmArea: null, _confirmPurpose: null,
            _confirmPrice: null, _confirmInputPyeong: null };
          addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
          await runAnalysis(st._confirmComplex, {
            intent: st._confirmPurpose === "buy" ? "buy" : "fair",
            areaSqm: st._confirmArea,
            currentPrice: st._confirmPrice,
            skipAreaCheck: true,
            _pendingInputPyeong: st._confirmInputPyeong,
          });
          return;
        }

        // 모호한 입력 → 다시 안내
        addMsg({ role: "user", type: "text", content: text });
        addMsg({ role: "ai", type: "text",
          content: '"분석 시작" 또는 [분석 시작] 버튼을 눌러주세요.\n취소하려면 "취소" 또는 "다른 단지"라고 입력해 주세요.' });
        return;
      }

      // ── region_or_dong: 후보 목록 상태에서 지역/동 필터 ──
      // 원본 검색어(_pendingCandidateQuery) 유지, 새 검색 금지
      if (eat === 'region_or_dong') {
        addMsg({ role: "user", type: "text", content: text });
        addMsg({ role: "ai",  type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
        const originalQuery = ps._pendingCandidateQuery || '';
        convStateRef.current = { ...ps, _expectedAnswerType: null, _pendingCandidateQuery: null };
        if (!originalQuery) {
          replaceLastAI({ role: "ai", type: "text", content: "죄송해요, 검색 맥락을 잃었어요. 단지명을 다시 입력해 주세요." });
          return;
        }
        try {
          const r    = await searchComplexFromSupabase(originalQuery, '', text);
          const pool = r.fromSupabase ? r.complexes : [];
          if (pool.length === 0) {
            replaceLastAI({ role: "ai", type: "text",
              content: `${text} 지역에서 ${originalQuery}를 찾지 못했습니다.\n다른 동 이름을 입력해 주세요.` });
            convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'region_or_dong', _pendingCandidateQuery: originalQuery };
            return;
          }
          if (pool.length === 1) {
            const cx = pool[0];
            // 이미 purpose를 알고 있으면 (첫 입력에서 "적정가", "매수" 등 언급) → 칩 스킵
            const knownPurpose = convStateRef.current._resolvedPurpose || convStateRef.current._pendingPurpose || null;
            if (knownPurpose && knownPurpose !== 'jeonse') {
              convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
              addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
              await askAreaThenPrice(cx, knownPurpose);
            } else {
            convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'purpose', _pendingComplex: cx, _pendingPurpose: 'fair' };
            replaceLastAI({ role: "ai", type: "purpose_chips",
              content: `${cx.complex_name}에서 무엇을 확인할까요?`,
              choices: ['적정가', '매수 의견', '전세', '계약 전 체크'],
              onSelect: async (choice) => {
                addMsg({ role: "user", type: "text", content: choice });
                if (choice === '전세' || choice === '계약 전 체크') {
                  addMsg({ role: "ai", type: "text", content: "해당 기능은 준비 중입니다." });
                  convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                  return;
                }
                const purpose = choice === '매수 의견' ? 'buy' : 'fair';
                convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
                await askAreaThenPrice(cx, purpose);
              },
            });
            }
          } else {
            replaceLastAI({ role: "ai", type: "candidates",
              content: `${text}의 ${originalQuery} 목록입니다. 찾으시는 단지를 선택해주세요.`,
              data: pool.slice(0, 8),
              onSelect: async (cx) => {
                addMsg({ role: "user", type: "text", content: cx.complex_name });
                convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'purpose', _pendingComplex: cx, _pendingPurpose: 'fair' };
                addMsg({ role: "ai", type: "purpose_chips",
                  content: `${cx.complex_name}에서 무엇을 확인할까요?`,
                  choices: ['적정가', '매수 의견', '전세', '계약 전 체크'],
                  onSelect: async (choice) => {
                    addMsg({ role: "user", type: "text", content: choice });
                    if (choice === '전세' || choice === '계약 전 체크') {
                      addMsg({ role: "ai", type: "text", content: "해당 기능은 준비 중입니다." });
                      convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                      return;
                    }
                    const purpose = choice === '매수 의견' ? 'buy' : 'fair';
                    convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null, _pendingComplex: null };
                    addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
                    await askAreaThenPrice(cx, purpose);
                  },
                });
              },
            });
          }
        } catch(e) {
          console.error('[EAT:region_or_dong]', e);
          replaceLastAI({ role: "ai", type: "text", content: "검색 중 오류가 발생했습니다. 다시 시도해 주세요." });
        }
        return;
      }

      // ── purpose: 목적 텍스트 입력 (칩 외) ──
      if (eat === 'purpose') {
        const purposeComplex = ps._pendingComplex || ps.currentComplex || null;
        if (purposeComplex && typeof purposeComplex === 'object') {
          const isBuy  = /매수|살까|살지|사도|buy/i.test(text);
          const isFair = /적정가|시세|가격|fair|분석/i.test(text);
          const isJeonse   = /전세/i.test(text);
          const isContract = /계약|등기|체크/i.test(text);
          if (isBuy || isFair || isJeonse || isContract) {
            addMsg({ role: "user", type: "text", content: text });
            convStateRef.current = { ...ps, _expectedAnswerType: null, _pendingComplex: null };
            if (isJeonse || isContract) {
              addMsg({ role: "ai", type: "text", content: "해당 기능은 준비 중입니다." });
              return;
            }
            const purpose = isBuy ? 'buy' : 'fair';
            addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
            await askAreaThenPrice(purposeComplex, purpose);
            return;
          }
        }
        // 목적 키워드 없거나 complex 없으면 CE로
        convStateRef.current = { ...ps, _expectedAnswerType: null };
        // fall through
      }
    }
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // ── _pendingPrice: 가격 입력 대기 ──
    if (ps?._pendingPrice) {
      const noPrice = /몰라|모름|모르겠|없어|없음|패스|그냥|skip|상관없|시세로|실거래로|최근\s*거래로|니가\s*알아서|알아서\s*해줘|시세\s*몰라|가격\s*몰라|잘\s*모르/i.test(text);
      const currentPrice = parsePriceInput(text);

      if (!currentPrice && !noPrice) {
        // 가격도 noPrice도 아님 → 재질문 없이 일반 흐름 (새 검색 의도)
        convStateRef.current = { ...ps, _pendingPrice: false, _pendingComplex: null, _pendingArea: null, _pendingPurpose: null };
        // fall through to CE
      } else {
        addMsg({ role: "user", type: "text", content: text });
        const { _pendingComplex: complex, _pendingArea: areaSqm, _pendingPurpose: purpose, _pendingInputPyeong: inputPyeong } = ps;
        convStateRef.current = { ...ps, _pendingPrice: false, _pendingComplex: null, _pendingArea: null, _pendingPurpose: null, _pendingInputPyeong: null };
        const effectiveComplex = complex || convStateRef.current.currentComplex || null;
        if (!effectiveComplex) {
          addMsg({ role: "ai", type: "text", content: "어떤 아파트를 분석할까요? 단지명을 알려주세요." });
          return;
        }
        // 요약 메시지
        const ecName   = effectiveComplex.complex_name || '';
        const ecGu     = effectiveComplex.sigungu    ? effectiveComplex.sigungu.split(' ').slice(-1)[0] : '';
        const ecDong   = effectiveComplex.legal_dong || '';
        const ecLoc    = [ecGu, ecDong].filter(Boolean).join(' ');
        const ecPyeong = inputPyeong || (areaSqm ? Math.round(areaSqm / 3.305785) : null);
        const ecPurposeKr = (purpose === 'buy') ? '매수 분석' : '적정가';
        const summaryMsg = noPrice
          ? `알겠습니다.\n${[ecLoc, ecName].filter(Boolean).join(' ')}${ecPyeong ? ' ' + ecPyeong + '평' : ''} 최근 실거래 데이터를 기준으로 ${ecPurposeKr}를 분석해드리겠습니다.`
          : `알겠습니다.\n${[ecLoc, ecName].filter(Boolean).join(' ')}${ecPyeong ? ' ' + ecPyeong + '평' : ''} 매물가 ${currentPrice ? (currentPrice/10000).toFixed(1) + '억' : ''}을 기준으로 ${ecPurposeKr}를 분석해드리겠습니다.`;
        // ── confirm_analysis: 요약 확인 후 [분석 시작] 버튼 표시 ──
        // runAnalysis 직행 금지 — 사용자 확인 후 실행
        if (noPrice) convStateRef.current = { ...convStateRef.current, _forcedNoPrice: true };
        convStateRef.current = {
          ...convStateRef.current,
          _expectedAnswerType: 'confirm_analysis',
          _confirmComplex:  effectiveComplex,
          _confirmArea:     areaSqm,
          _confirmPurpose:  purpose,
          _confirmPrice:    noPrice ? null : currentPrice,
          _confirmInputPyeong: ecPyeong,
        };
        addMsg({
          role: "ai", type: "confirm_analysis",
          content: summaryMsg,
          onConfirm: async () => {
            // [분석 시작] 버튼 클릭 핸들러
            const st = convStateRef.current;
            convStateRef.current = { ...st, _expectedAnswerType: null,
              _confirmComplex: null, _confirmArea: null, _confirmPurpose: null,
              _confirmPrice: null, _confirmInputPyeong: null };
            addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
            await runAnalysis(st._confirmComplex, {
              intent: st._confirmPurpose === "buy" ? "buy" : "fair",
              areaSqm: st._confirmArea,
              currentPrice: st._confirmPrice,
              skipAreaCheck: true,
              _pendingInputPyeong: st._confirmInputPyeong,
            });
          },
        });
        return;
      }
    }

    // ── Phase 1.5: MessyInputResolver + Bridge ──
    // EAT/pendingPrice 이후, CE 이전에 실행
    // MIR → Bridge → CE 흐름: CE가 유일한 대화 엔진
    {
      const existingCtx = {
        dong:         convStateRef.current._pendingDong              || null,
        sigungu:      convStateRef.current._pendingRegion            || null,
        regionHint:   convStateRef.current.region                    || null,
        complexQuery: convStateRef.current._pendingCandidateQuery    || null,
        areaSqm:      convStateRef.current._pendingArea              || null,
        inputPyeong:  convStateRef.current._pendingInputPyeong       || null,
        purpose:      convStateRef.current._pendingPurpose           || null,
      };
      const { merged, nextAction } = resolveMessyInput(text, existingCtx);

      // DEV 로그 1: MIR 추출 결과
      if (import.meta.env.DEV) {
        console.log('[MIR] 추출:', {
          complexQuery: merged.complexQuery, dong: merged.dong,
          areaSqm: merged.areaSqm, inputPyeong: merged.inputPyeong,
          purpose: merged.purpose, noPrice: merged.noPrice, budget: merged.budget,
          nextAction: nextAction.type + (nextAction.field ? '.' + nextAction.field : ''),
        });
      }

      if (nextAction.type === 'not_supported') {
        addMsg({ role: 'user', type: 'text', content: text });
        addMsg({ role: 'ai', type: 'text', content: '해당 기능은 준비 중입니다.' });
        return;
      }

      if (nextAction.type === 'ask') {
        // 누락 정보 질문: pendingContext 업데이트 후 질문 표시
        const mappedState = bridgeToState(merged, convStateRef.current);
        convStateRef.current = mappedState;
        addMsg({ role: 'user', type: 'text', content: text });

        if (nextAction.field === 'complex') {
          convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'complex' };
          addMsg({ role: 'ai', type: 'text', content: nextAction.message });
        } else if (nextAction.field === 'purpose') {
          convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'purpose',
            _pendingComplex: { complex_name: merged.complexQuery, legal_dong: merged.dong, sigungu: merged.sigungu } };
          addMsg({ role: 'ai', type: 'purpose_chips',
            content: nextAction.message,
            choices: ['적정가', '매수 의견', '전세', '계약 전 체크'],
            onSelect: async (choice) => {
              addMsg({ role: 'user', type: 'text', content: choice });
              if (choice === '전세' || choice === '계약 전 체크') {
                addMsg({ role: 'ai', type: 'text', content: '해당 기능은 준비 중입니다.' });
                convStateRef.current = { ...convStateRef.current, _expectedAnswerType: null };
                return;
              }
              const purpose = choice === '매수 의견' ? 'buy' : 'fair';
              convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'area', _pendingPurpose: purpose };
              addMsg({ role: 'ai', type: 'text', content: `몇 평형을 확인할까요?\n예: 25평, 84㎡` });
            },
          });
        } else if (nextAction.field === 'area') {
          convStateRef.current = { ...convStateRef.current, _expectedAnswerType: 'area' };
          addMsg({ role: 'ai', type: 'text', content: nextAction.message });
        } else if (nextAction.field === 'price') {
          convStateRef.current = { ...convStateRef.current,
            _pendingPrice: true,
            _pendingComplex: { complex_name: merged.complexQuery, legal_dong: merged.dong,
              sigungu: merged.sigungu, area_list: [] },
            _pendingArea: merged.areaSqm,
            _pendingPurpose: merged.purpose || 'fair',
            _pendingInputPyeong: merged.inputPyeong,
            _expectedAnswerType: null,
          };
          addMsg({ role: 'ai', type: 'text', content: nextAction.message });
        }
        return;
      }

      // confirm_analysis / recommend / general_question / pass_to_ce
      // → Bridge로 CE state 매핑 후 CE에 위임
      // CE가 mappedState(lastComplexQuery, lastDong, lastAreaHint 등)를 받아서 처리
      if (nextAction.type !== 'pass_to_ce') {
        const mappedState = bridgeToState(merged, convStateRef.current);
        logBridge(merged, mappedState, text);
        convStateRef.current = mappedState;

        // DEV 로그 2: Bridge 결과
        if (import.meta.env.DEV) {
          console.log('[Bridge] CE state:', {
            lastComplexQuery: mappedState.lastComplexQuery,
            lastDong:         mappedState.lastDong,
            region:           mappedState.region,
            lastAreaHint:     mappedState.lastAreaHint,
            _resolvedPurpose: mappedState._resolvedPurpose,
            _resolvedNoPrice: mappedState._resolvedNoPrice,
          });
        }
      }
    }

    addMsg({ role: "user", type: "text", content: text });

    // ── Phase 2: ConversationEngine 기반 처리 ──
    // 매 입력을 새 검색으로 처리하는 방식 폐기
    // ConversationState를 유지하며 Intent → Policy → UX Policy → Action 순으로 처리
    addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });

    // CE 호출 전: 현재 입력을 lastComplexQuery에 저장해둠
    // CANDIDATES_LIST 반환 시 원본 검색어로 활용
    // (단, 이미 region_or_dong 상태이거나 추천/가격 입력이면 저장 안 함)
    const _rawForCE = text;

    try {
      // DEV 로그 3: CE 호출 직전 state
      if (import.meta.env.DEV) {
        console.log('[CE] process() 호출:', {
          text,
          lastComplexQuery: convStateRef.current.lastComplexQuery,
          lastDong:         convStateRef.current.lastDong,
          region:           convStateRef.current.region,
          lastAreaHint:     convStateRef.current.lastAreaHint,
          _resolvedPurpose: convStateRef.current._resolvedPurpose,
          _resolvedNoPrice: convStateRef.current._resolvedNoPrice,
        });
      }
      const { state: newState, response } = await convEngineRef.current.process(
        text,
        { ...convStateRef.current, lastComplexQuery: convStateRef.current.lastComplexQuery || text },
      );

      // State 동기 업데이트 (ref = 동기, setState = 렌더링용)
      convStateRef.current = newState;
      setConvState(newState);

      // 개발 모드 디버그 출력 (로그 4+5: parseUserInput 결과 + applyPolicy 결과)
      if (import.meta.env.DEV && response._debug) {
        console.log('[CE] parseUserInput + applyPolicy 결과:', {
          intent: response._debug.intent,
          rule:   response._debug.rule,
          action: response._debug.action,
        });
        console.log(
          `[CE] intent=${response._debug.intent} | rule=${response._debug.rule} | action=${response._debug.action}`,
          '\n     reason:', response._debug.reason,
          '\n     state:', response._debug.state,
        );
      }

      // ── Action별 화면 처리 ──
      await handleEngineResponse(response, newState);

    } catch (e) {
      console.error('[AIChatView] ConversationEngine 오류:', e);
      replaceLastAI({ role: "ai", type: "text", content: "잠깐 문제가 생겼어요. 다시 말씀해 주세요." });
    }
  }

  // ── ConversationEngine 응답 → 메시지 렌더링 ──
  async function handleEngineResponse(response, state) {
    const action = response._debug?.action;
    const type   = response.type;

    // 분석 준비 완료
    if (type === RESPONSE_TYPES.READY_TO_ANALYZE || action === ACTIONS.ANALYZE_NOW) {
      const complex  = state.currentComplex;
      const areaSqm  = state.currentArea;
      const purpose  = state.purpose || "fair";

      if (!complex || !areaSqm) {
        replaceLastAI({ role: "ai", type: "text", content: response.text || "잠깐만요, 확인해볼게요~ 🔍" });
        return;
      }

      // AI 파서가 가격까지 추출했으면 바로 분석
      const aiPrice = state._aiParsedPrice || null;
      const aiIntent = state._aiParsedIntent || purpose;
      if (aiPrice) {
        convStateRef.current = { ...convStateRef.current, _aiParsedPrice: null, _aiParsedIntent: null };
        replaceLastAI({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
        await runAnalysis(complex, { intent: aiIntent === "buy" ? "buy" : "fair", areaSqm, currentPrice: aiPrice, skipAreaCheck: true });
        return;
      }

      // ask_price: 매물가 질문 → 사용자 답변 대기
      // 단, 이미 "몰라요"로 넘어온 경우(currentPrice=null 명시)는 바로 분석
      const forcedNoPrice = state._forcedNoPrice || false;
      if (response.ui === "ask_price" && !forcedNoPrice) {
        convStateRef.current = { ...convStateRef.current, _pendingPrice: true, _pendingComplex: complex, _pendingArea: areaSqm, _pendingPurpose: purpose };
        replaceLastAI({ role: "ai", type: "text", content: response.text });
        return;
      }
      // forcedNoPrice면 state 초기화 후 바로 분석으로
      if (forcedNoPrice) {
        convStateRef.current = { ...convStateRef.current, _forcedNoPrice: false };
      }

      // analyzing: 바로 분석
      replaceLastAI({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
      await runAnalysis(complex, {
        intent:   purpose === "buy" ? "buy" : "fair",
        areaSqm,
        pyeong:   null,
      });
      return;
    }

    // 전세/최근거래 분석
    if (action === ACTIONS.ANALYZE_JEONSE || action === ACTIONS.ANALYZE_RECENT || action === ACTIONS.ANALYZE_BUY) {
      const complex = state.currentComplex;
      const areaSqm = state.currentArea;
      if (!complex || !areaSqm) {
        replaceLastAI({ role: "ai", type: "text", content: response.text });
        return;
      }
      replaceLastAI({ role: "ai", type: "thinking", content: response.text || "잠깐만요, 확인해볼게요~ 🔍" });
      const purpose = action === ACTIONS.ANALYZE_JEONSE ? "jeonse"
                    : action === ACTIONS.ANALYZE_BUY    ? "buy"
                    : "fair";
      await runAnalysis(complex, { intent: purpose, areaSqm });
      return;
    }

    // 후보 목록 → candidates 타입 메시지
    if (type === RESPONSE_TYPES.CANDIDATES_LIST) {
      const candidates = response.candidates || [];

      const originalQuery =
        state.lastComplexQuery ||
        state.complexQuery ||
        convStateRef.current._pendingCandidateQuery ||
        '';

      // ── Bridge dong 자동선택 로직 ──
      // lastDong이 있으면 candidates를 dong 기준으로 필터링
      // 필터 후 1개면 후보목록 없이 confirm_analysis로 자동 전환
      const bridgeDong = state.lastDong || convStateRef.current.lastDong || convStateRef.current._pendingDong || '';

      const autoSelectCandidate = async (cx) => {
        // 선택된 단지로 confirm_analysis 상태 세팅
        const areaSqm    = state.lastAreaHint || convStateRef.current._pendingArea || null;
        const inputPyeong = convStateRef.current._pendingInputPyeong ||
          (areaSqm ? Math.round(areaSqm / 3.3) : null);
        const purpose    = convStateRef.current._resolvedPurpose || convStateRef.current._pendingPurpose || 'fair';
        const noPrice    = convStateRef.current._resolvedNoPrice || convStateRef.current._forcedNoPrice || false;
        const purposeKr  = purpose === 'buy' ? '매수 분석' : '적정가';
        const cxGu       = cx.sigungu ? cx.sigungu.split(' ').slice(-1)[0] : '';
        const cxDong     = cx.legal_dong || cx.dong || '';
        const cxLoc      = [cxGu, cxDong].filter(Boolean).join(' ');
        const summaryMsg = `${cxLoc ? cxLoc + ' ' : ''}${cx.complex_name}${inputPyeong ? ' ' + inputPyeong + '평' : ''} ${purposeKr}을 분석해드리겠습니다.`;

        if (import.meta.env.DEV) {
          console.log('[AutoSelect] 단지 자동선택:', cx.complex_name, '| dong 필터:', bridgeDong);
          console.log('[AutoSelect] confirm_analysis 세팅:', { areaSqm, inputPyeong, purpose, noPrice });
        }

        convStateRef.current = {
          ...convStateRef.current,
          _expectedAnswerType: 'confirm_analysis',
          _confirmComplex:     cx,
          _confirmArea:        areaSqm,
          _confirmPurpose:     purpose,
          _confirmPrice:       noPrice ? null : undefined,
          _confirmInputPyeong: inputPyeong,
          lastDong:            cxDong || bridgeDong,
          currentComplex:      cx,
        };

        // replaceLastAI 대신 addMsg: thinking 자리가 없을 수 있으므로 새 메시지로 추가
        addMsg({
          role: 'ai', type: 'confirm_analysis',
          content: summaryMsg,
          onConfirm: async () => {
            const st = convStateRef.current;
            convStateRef.current = {
              ...st,
              _expectedAnswerType: null,
              _confirmComplex: null, _confirmArea: null,
              _confirmPurpose: null, _confirmPrice: null, _confirmInputPyeong: null,
            };
            addMsg({ role: 'ai', type: 'thinking', content: '잠깐만요, 확인해볼게요~ 🔍' });
            await runAnalysis(st._confirmComplex, {
              intent: st._confirmPurpose === 'buy' ? 'buy' : 'fair',
              areaSqm: st._confirmArea,
              currentPrice: st._confirmPrice,
              skipAreaCheck: true,
              _pendingInputPyeong: st._confirmInputPyeong,
            });
          },
        });
      };

      if (bridgeDong && candidates.length > 0) {
        // dong 필터 적용
        const dongNorm = bridgeDong.replace(/[동구시군]$/, '');
        const filtered = candidates.filter(c => {
          const fields = [
            c.dong, c.legal_dong, c.address, c.roadAddress,
            c.sigungu, c.region, c.fullAddress,
          ].filter(Boolean).join(' ');
          return fields.includes(dongNorm) || fields.includes(bridgeDong);
        });

        if (import.meta.env.DEV) {
          console.log('[AutoSelect] dong 필터:', bridgeDong, '→ 필터 전:', candidates.length, '필터 후:', filtered.length);
        }

        if (filtered.length === 1) {
          // 1개: 자동선택 → confirm_analysis
          await autoSelectCandidate(filtered[0]);
          return;
        }
        // 0개 or 2개+: 기존 후보목록 표시 (아래로 fall through)
      } else if (candidates.length === 1) {
        // dong 없어도 후보 1개면 자동선택
        await autoSelectCandidate(candidates[0]);
        return;
      }

      // ── 기존 후보목록 표시 (dong 필터 해당 없거나 여러 개 남은 경우) ──
      if (candidates.length > 1) {
        const sigunguSet = [...new Set(candidates.map(c => c.sigungu).filter(Boolean))];
        if (sigunguSet.length > 1) {
          convStateRef.current = {
            ...convStateRef.current,
            _expectedAnswerType: 'region_or_dong',
            _pendingCandidateQuery: originalQuery,
          };
          replaceLastAI({
            role: "ai", type: "text",
            content: `어느 지역의 ${originalQuery}를 찾으시나요?\n동 이름을 알려주세요. 예: 우동, 공릉동, 잠실동`,
          });
          return;
        }
      }

      replaceLastAI({
        role: "ai",
        type: "candidates",
        content: response.text.split("\n")[0].replace(/\*\*/g, ""),
        data: candidates,
        onSelect: async (c) => {
          const idx = candidates.indexOf(c);
          addMsg({ role: "user", type: "text", content: c.complex_name || String(idx + 1) });
          addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
          try {
            const { state: newState, response: res } = await convEngineRef.current.process(
              `__SELECT_CANDIDATE__${idx}`,
              convStateRef.current,
            );
            convStateRef.current = newState;
            setConvState(newState);
            await handleEngineResponse(res, newState);
          } catch(e) {
            console.error("[AIChatView] 후보 선택 오류:", e);
          }
        },
        intent: { intent: "fair" },
      });
      return;
    }

    // 목적 선택 (ask_purpose)
    if (response.ui === "ask_purpose") {
      const { complex: cx, areaSqm: aSqm, choices } = response;
      replaceLastAI({
        role: "ai", type: "purpose_chips",
        content: response.text?.replace(/\*\*/g, ""),
        choices: choices || ["적정가", "매수 의견", "전세"],
        onSelect: async (choice) => {
          addMsg({ role: "user", type: "text", content: choice });
          addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
          if (choice === "전세") {
            replaceLastAI({ role: "ai", type: "text",
              content: "전세 분석은 준비 중입니다. 곧 제공될 예정입니다." });
            return;
          }
          const purpose = choice === "매수 의견" ? "buy" : "fair";
          convStateRef.current = { ...convStateRef.current, purpose };
          const targetCx = cx || convStateRef.current.currentComplex;
          if (!targetCx) {
            replaceLastAI({ role: "ai", type: "text", content: "단지를 먼저 선택해 주세요." });
            return;
          }
          await askAreaThenPrice(targetCx, purpose);
        },
      });
      return;
    }

    // 매도 우회 (sell_redirect)
    if (response.ui === "sell_redirect") {
      const { choices } = response;
      replaceLastAI({
        role: "ai", type: "purpose_chips",
        content: response.text,
        choices: choices || ["적정가 보기", "최근 거래 보기"],
        onSelect: async (choice) => {
          addMsg({ role: "user", type: "text", content: choice });
          addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
          const cx = convStateRef.current.currentComplex;
          const aSqm = convStateRef.current.currentArea;
          if (!cx || !aSqm) {
            replaceLastAI({ role: "ai", type: "text", content: "단지와 평형을 먼저 선택해 주세요." });
            return;
          }
          convStateRef.current = {
            ...convStateRef.current,
            purpose: "fair",
            _pendingPrice: true,
            _pendingComplex: cx,
            _pendingArea: aSqm,
            _pendingPurpose: "fair",
          };
          const sellPyeong = typicalPyeong(aSqm);
          replaceLastAI({ role: "ai", type: "text",
            content: `${cx.complex_name} ${sellPyeong}평 현재 매물 가격을 알고 계시나요?\n모르셔도 괜찮습니다. "몰라요"라고 입력하시면 최근 실거래 데이터를 기준으로 분석해드립니다.` });
        },
      });
      return;
    }


    // 지역만 입력 → 목적 질문 (ask_region_purpose)
    if (response.ui === "ask_region_purpose" || action === "ask_region_purpose") {
      const regionLabel = response.region || response._debug?.state?.lastRegion || "해당 지역";
      replaceLastAI({
        role: "ai", type: "purpose_chips",
        content: `${regionLabel}에서 무엇을 도와드릴까요?`,
        choices: ["특정 아파트 검색", "예산으로 추천", "전세 확인"],
        onSelect: async (choice) => {
          addMsg({ role: "user", type: "text", content: choice });
          addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
          if (choice === "특정 아파트 검색") {
            replaceLastAI({ role: "ai", type: "text",
              content: `${regionLabel}에서 찾으시는 아파트 단지명을 알려주세요.` });
          } else if (choice === "예산으로 추천") {
            replaceLastAI({ role: "ai", type: "text",
              content: `예산과 희망 평형을 알려주시면 ${regionLabel} 내 후보를 찾아드릴게요.\n예: 7억, 30평대` });
          } else if (choice === "전세 확인") {
            replaceLastAI({ role: "ai", type: "text",
              content: "전세 분석은 준비 중입니다. 곧 제공될 예정입니다." });
          }
        },
      });
      return;
    }

    // 면적 목록 → area_chips 타입 메시지
    if (type === RESPONSE_TYPES.AREA_LIST) {
      // ── Bridge 자동 면적 선택: lastAreaHint가 있으면 가장 가까운 평형 자동 확정 ──
      // MIR → Bridge → CE 흐름에서 사용자가 평형을 이미 말한 경우 (24평, 84㎡ 등)
      const areaHintForAutoSelect = state.lastAreaHint || convStateRef.current.lastAreaHint || null;
      const noPriceForAutoSelect  = convStateRef.current._resolvedNoPrice || convStateRef.current._forcedNoPrice || false;
      const areaGroupsForSelect   = response.areaGroups || [];

      if (areaHintForAutoSelect && areaGroupsForSelect.length > 0) {
        // 가장 가까운 평형 찾기
        const nearest = areaGroupsForSelect.reduce((best, g) =>
          Math.abs(g.areaSqm - areaHintForAutoSelect) < Math.abs(best.areaSqm - areaHintForAutoSelect) ? g : best
        );
        const complex  = state.currentComplex || convStateRef.current.currentComplex;
        const areaSqm  = nearest.areaSqm;
        const pyeong   = nearest.pyeong;
        const purpose  = convStateRef.current._resolvedPurpose || convStateRef.current._pendingPurpose || 'fair';

        if (import.meta.env.DEV) {
          console.log('[AREA_LIST AutoSelect] hint:', areaHintForAutoSelect,
            '→ nearest:', areaSqm, '(', pyeong, '평) | noPrice:', noPriceForAutoSelect);
        }

        // ConversationEngine state 업데이트
        const { updateArea } = await import('../engine/conversationState.js');
        const newState = updateArea(convStateRef.current, areaSqm);
        convStateRef.current = newState;

        if (noPriceForAutoSelect) {
          // noPrice: 바로 분석 (가격 질문 스킵)
          const cxName  = complex?.complex_name || '';
          const purposeKr = purpose === 'buy' ? '매수 분석' : '적정가';
          replaceLastAI({
            role: 'ai', type: 'confirm_analysis',
            content: `${cxName} ${pyeong}평 ${purposeKr}을 분석해드리겠습니다.`,
            onConfirm: async () => {
              convStateRef.current = { ...convStateRef.current,
                _resolvedNoPrice: false, _forcedNoPrice: false, lastAreaHint: null };
              addMsg({ role: 'ai', type: 'thinking', content: '잠깐만요, 확인해볼게요~ 🔍' });
              await runAnalysis(complex, {
                intent: purpose === 'buy' ? 'buy' : 'fair',
                areaSqm,
                currentPrice: null,   // noPrice → 실거래 중앙값 사용
                skipAreaCheck: true,
                _pendingInputPyeong: pyeong,
              });
            },
          });
        } else {
          // 가격 질문
          const { responseReadyToAnalyze } = await import('../engine/responseGenerator.js');
          const resp = responseReadyToAnalyze(complex, areaSqm);
          convStateRef.current = { ...newState,
            _pendingPrice: true, _pendingComplex: complex,
            _pendingArea: areaSqm, _pendingPurpose: purpose };
          replaceLastAI({ role: 'ai', type: 'text', content: resp.text.replace(/\*\*/g, '') });
        }
        return;
      }

      replaceLastAI({
        role: "ai",
        type: "area_chips",
        content: response.text.split("\n")[0].replace(/\*\*/g, ""),
        areaGroups: areaGroupsForSelect,
        complex:    response.complex,
        onSelect: async (areaSqm) => {
          // 버튼 클릭 → 텍스트 파싱 없이 직접 면적 확정
          const complex = convStateRef.current.currentComplex;
          const pyeong = Math.floor((areaSqm * 1.35) / 3.305785);
          addMsg({ role: "user", type: "text", content: `${pyeong}평 (${areaSqm}㎡)` });
          // ConversationEngine state 직접 업데이트
          const { updateArea } = await import('../engine/conversationState.js');
          const newState = updateArea(convStateRef.current, areaSqm);
          convStateRef.current = newState;
          // 매물가 질문으로 바로 이동
          const { responseReadyToAnalyze } = await import('../engine/responseGenerator.js');
          const resp = responseReadyToAnalyze(complex, areaSqm);
          convStateRef.current = { ...newState, _pendingPrice: true, _pendingComplex: complex, _pendingArea: areaSqm, _pendingPurpose: "fair" };
          addMsg({ role: "ai", type: "text", content: resp.text.replace(/\*\*/g, "") });
        },
      });
      return;
    }

    // 일반 텍스트 응답
    replaceLastAI({
      role: "ai",
      type: "text",
      content: response.text?.replace(/\*\*/g, "") || "...",
    });
  }

  async function routeIntent(intent, rawText) {
    try {
      // ── 지역만 입력 → 목적 질문 (추천 리스트 바로 안 보여줌) ──
      if (!intent.complexName && (intent.region || intent.dong) && intent.intent !== "recommend") {
        const regionLabel = intent.dong || intent.region;
        replaceLastAI({
          role: "ai", type: "purpose_chips",
          content: `${regionLabel}에서 무엇을 도와드릴까요?`,
          choices: ["특정 아파트 검색", "예산으로 추천", "전세 확인"],
          onSelect: async (choice) => {
            addMsg({ role: "user", type: "text", content: choice });
            addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
            if (choice === "특정 아파트 검색") {
              // complex 입력 대기 상태로 전환
              convStateRef.current = {
                ...convStateRef.current,
                _expectedAnswerType: 'complex',
                _pendingDong: intent.dong || '',
                _pendingRegion: intent.region || regionLabel,
              };
              replaceLastAI({ role: "ai", type: "text",
                content: `${regionLabel}에서 찾으시는 아파트 단지명을 알려주세요.` });
            } else if (choice === "예산으로 추천") {
              replaceLastAI({ role: "ai", type: "text",
                content: `예산과 희망 평형을 알려주시면 ${regionLabel} 내 후보를 찾아드릴게요.\n예: 7억, 30평대` });
            } else if (choice === "전세 확인") {
              replaceLastAI({ role: "ai", type: "text",
                content: "전세 분석은 준비 중입니다. 곧 제공될 예정입니다." });
            }
          },
        });
        return;
      }

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

      // ── 단지 1개 → 목적 질문 후 분석 (공인중개사 방식) ──
      if (complexes.length === 1) {
        const cx = complexes[0];
        const cxName = cx.complex_name || cx.name || "";
        const areaListRaw = cx.area_list
          ? (typeof cx.area_list === "string" ? JSON.parse(cx.area_list) : cx.area_list) : [];
        const { groupAreasByPyeong } = await import("../search/utils.js");
        const { typicalPyeong } = await import("../constants/grades.js");
        const areaGroups = groupAreasByPyeong(areaListRaw)
          .map(g => ({ areaSqm: g.rep, pyeong: typicalPyeong(g.rep) }));
        // 이미 평형이 특정됐으면 목적 질문, 아니면 평형 먼저
        const hasArea = intent.areaSqm || intent.pyeong;
        if (hasArea) {
          // 평형 있음 → 목적 질문
          replaceLastAI({
            role: "ai", type: "purpose_chips",
            content: `${cxName}에서 무엇을 확인할까요?`,
            choices: ["적정가", "매수 의견", "전세", "계약 전 체크"],
            onSelect: async (choice) => {
              addMsg({ role: "user", type: "text", content: choice });
              addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
              if (choice === "전세" || choice === "계약 전 체크") {
                replaceLastAI({ role: "ai", type: "text",
                  content: "해당 기능은 준비 중입니다. 곧 제공될 예정입니다." });
                return;
              }
              const purpose = choice === "매수 의견" ? "buy" : "fair";
              await askAreaThenPrice(cx, purpose);
            },
          });
        } else if (areaGroups.length === 1) {
          // 평형 1개짜리 단지 → 목적 질문
          convStateRef.current = { ...convStateRef.current, currentComplex: cx, currentArea: areaGroups[0].areaSqm };
          replaceLastAI({
            role: "ai", type: "purpose_chips",
            content: `${cxName} ${areaGroups[0].pyeong}평에서 무엇을 확인할까요?`,
            choices: ["적정가", "매수 의견", "전세", "계약 전 체크"],
            onSelect: async (choice) => {
              addMsg({ role: "user", type: "text", content: choice });
              addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });
              if (choice === "전세" || choice === "계약 전 체크") {
                replaceLastAI({ role: "ai", type: "text",
                  content: "해당 기능은 준비 중입니다. 곧 제공될 예정입니다." });
                return;
              }
              const purpose = choice === "매수 의견" ? "buy" : "fair";
              await askAreaThenPrice(cx, purpose);
            },
          });
        } else {
          // P1 fix: 평형 여러 개 → runAnalysis 직행 금지
          // 평형 선택 칩 표시 후 목적 질문으로 전환
          convStateRef.current = {
            ...convStateRef.current,
            currentComplex: cx,
            _pendingPurpose: intent.intent === 'buy' ? 'buy' : 'fair',
          };
          const pyeongList = areaGroups.map(g => `${g.pyeong}평`).join(', ');
          replaceLastAI({
            role: 'ai', type: 'area_chips',
            content: `${cxName}는 ${pyeongList} 분석 가능합니다.\n어떤 평형을 확인할까요?`,
            areaGroups,
            complex: cx,
            onSelect: async (areaSqm) => {
              const pyeong = Math.floor((areaSqm * 1.35) / 3.305785);
              addMsg({ role: 'user', type: 'text', content: `${pyeong}평` });
              addMsg({ role: 'ai', type: 'thinking', content: '잠깐만요, 확인해볼게요~ 🔍' });
              convStateRef.current = { ...convStateRef.current, currentArea: areaSqm };
              // 평형 확정 → 목적 질문
              replaceLastAI({
                role: 'ai', type: 'purpose_chips',
                content: `${cxName} ${pyeong}평에서 무엇을 확인할까요?`,
                choices: ['적정가', '매수 의견', '전세', '계약 전 체크'],
                onSelect: async (choice) => {
                  addMsg({ role: 'user', type: 'text', content: choice });
                  if (choice === '전세' || choice === '계약 전 체크') {
                    replaceLastAI({ role: 'ai', type: 'text',
                      content: '해당 기능은 준비 중입니다. 곧 제공될 예정입니다.' });
                    return;
                  }
                  addMsg({ role: 'ai', type: 'thinking', content: '잠깐만요, 확인해볼게요~ 🔍' });
                  const purpose = choice === '매수 의견' ? 'buy' : 'fair';
                  // askAreaThenPrice가 이미 처리하지만, 여기선 area가 이미 선택됐으므로 직접 가격 질문
                  convStateRef.current = {
                    ...convStateRef.current,
                    _pendingPrice: true,
                    _pendingComplex: cx,
                    _pendingArea: areaSqm,
                    _pendingPurpose: purpose,
                    _expectedAnswerType: null,
                  };
                  replaceLastAI({ role: 'ai', type: 'text',
                    content: `${cxName} ${pyeong}평 현재 매물 가격을 알고 계시나요?\n모르셔도 괜찮습니다. "몰라요"라고 입력하시면 최근 실거래 데이터를 기준으로 분석해드립니다.` });
                },
              });
            },
          });
        }
        return;
      }

      // ── 단지 복수 → 지역 선택 질문 ──
      // dong이 없으면 사용자에게 dong 입력 요청 (expectedAnswerType: dong)
      if (!intent.dong && !intent.region) {
        convStateRef.current = {
          ...convStateRef.current,
          _expectedAnswerType: 'dong',
          _pendingComplex: intent.complexName || rawText,
        };
        replaceLastAI({
          type: "text",
          content: `어느 지역의 ${intent.complexName || rawText}를 찾으시나요?\n동 이름을 알려주세요. 예: 우동, 공릉동, 잠실동`,
        });
        return;
      }
      const regionHint = intent.dong || intent.region ? ` (${intent.dong || intent.region})` : "";
      replaceLastAI({
        type: "candidates",
        content: `어느 지역의 ${intent.complexName || rawText}를 찾으시나요?${regionHint}`,
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

  // ────────────────────────────────────────────────────────────────
  // askAreaThenPrice: 단지·목적 확정 후 올바른 질문 흐름 진입
  // 흐름: 평형질문 → 가격질문 → runAnalysis
  // 모든 purpose 선택 경로(region_or_dong, CE ask_purpose 등)가 여기로 수렴
  // ────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────
  // askAreaThenPrice: 단지+목적 확정 후 평형→가격 질문
  // 호출 시점: purpose 칩 클릭 이후
  // 전제: 직전에 addMsg(thinking)이 이미 추가됨
  // ────────────────────────────────────────────────
  async function askAreaThenPrice(cx, intentStr) {
    if (!cx || typeof cx !== 'object') {
      replaceLastAI({ role: 'ai', type: 'text',
        content: '분석할 단지를 먼저 선택해 주세요.' });
      return;
    }

    const cxName = cx.complex_name || cx.name || '';
    const guName  = cx.sigungu    ? cx.sigungu.split(' ').slice(-1)[0] : '';
    const dongName = cx.legal_dong || '';
    const locStr  = [guName, dongName].filter(Boolean).join(' ');
    const purposeKr = intentStr === 'buy' ? '매수 분석' : '적정가';

    const areaListRaw = cx.area_list
      ? (typeof cx.area_list === 'string' ? JSON.parse(cx.area_list) : cx.area_list)
      : [];
    const areaGroups = groupAreasByPyeong(areaListRaw)
      .map(g => ({ areaSqm: g.rep, pyeong: typicalPyeong(g.rep) }));

    // 평형 0개: 텍스트 입력 요청
    if (areaGroups.length === 0) {
      convStateRef.current = {
        ...convStateRef.current,
        _expectedAnswerType: 'area',
        _pendingComplex:     cx,
        _pendingPurpose:     intentStr,
      };
      replaceLastAI({ role: 'ai', type: 'text',
        content: `${cxName}의 몇 평형을 확인할까요?\n예: 25, 25평, 84, 84㎡` });
      return;
    }

    // 평형 1개: 바로 가격 질문
    if (areaGroups.length === 1) {
      const { areaSqm, pyeong } = areaGroups[0];
      const summary = locStr
        ? `${locStr} ${cxName} ${pyeong}평 ${purposeKr}을 분석해드릴게요.`
        : `${cxName} ${pyeong}평 ${purposeKr}을 분석해드릴게요.`;
      convStateRef.current = {
        ...convStateRef.current,
        _expectedAnswerType: 'confirm_analysis',
        _confirmComplex:     cx,
        _confirmArea:        areaSqm,
        _confirmPurpose:     intentStr,
        _confirmPrice:       null,
        _confirmInputPyeong: pyeong,
      };
      replaceLastAI({
        role: 'ai', type: 'confirm_analysis',
        content: summary,
        onConfirm: async () => {
          const st = convStateRef.current;
          convStateRef.current = { ...st, _expectedAnswerType: null,
            _confirmComplex: null, _confirmArea: null, _confirmPurpose: null,
            _confirmPrice: null, _confirmInputPyeong: null };
          addMsg({ role: 'ai', type: 'thinking', content: '잠깐만요, 확인해볼게요~ 🔍' });
          await runAnalysis(st._confirmComplex, {
            intent: st._confirmPurpose === 'buy' ? 'buy' : 'fair',
            areaSqm: st._confirmArea,
            currentPrice: null,
            skipAreaCheck: true,
            _pendingInputPyeong: st._confirmInputPyeong,
          });
        },
      });
      return;
    }

    // 평형 여러 개: area_chips 표시
    // ★ 핵심: _expectedAnswerType:'area' 세팅 (텍스트 입력도 EAT area로 처리)
    //         칩 클릭은 onSelect에서 즉시 null → addMsg 중복 방지
    convStateRef.current = {
      ...convStateRef.current,
      _expectedAnswerType: 'area',
      _pendingComplex:     cx,
      _pendingPurpose:     intentStr,
    };
    const pyeongList = areaGroups.map(g => `${g.pyeong}평`).join(', ');
    replaceLastAI({
      role: 'ai', type: 'area_chips',
      content: `${cxName}는 ${pyeongList} 분석 가능합니다.\n어떤 평형을 확인할까요?`,
      areaGroups,
      complex: cx,
      onSelect: async (areaSqm) => {
        // ★ state 먼저 null → EAT area 재진입 완전 차단
        const chipGroup  = areaGroups.find(g => g.areaSqm === areaSqm);
        const chipPyeong = chipGroup?.pyeong ?? Math.round(areaSqm / 3.305785);
        convStateRef.current = {
          ...convStateRef.current,
          _expectedAnswerType: null,   // 반드시 먼저
          _pendingPrice:       true,
          _pendingComplex:     cx,
          _pendingArea:        areaSqm,
          _pendingPurpose:     intentStr,
          _pendingInputPyeong: chipPyeong,
        };
        // addMsg(user) 단 한 번
        addMsg({ role: 'user', type: 'text', content: `${chipPyeong}평` });
        // 요약 카드 → [확인] → 결과
        const summary = locStr
          ? `${locStr} ${cxName} ${chipPyeong}평 ${purposeKr}을 분석해드리겠습니다.`
          : `${cxName} ${chipPyeong}평 ${purposeKr}을 분석해드리겠습니다.`;
        convStateRef.current = {
          ...convStateRef.current,
          _expectedAnswerType: 'confirm_analysis',
          _confirmComplex:     cx,
          _confirmArea:        areaSqm,
          _confirmPurpose:     intentStr,
          _confirmPrice:       null,
          _confirmInputPyeong: chipPyeong,
        };
        addMsg({
          role: 'ai', type: 'confirm_analysis',
          content: summary,
          onConfirm: async () => {
            const st = convStateRef.current;
            convStateRef.current = { ...st, _expectedAnswerType: null,
              _confirmComplex: null, _confirmArea: null, _confirmPurpose: null,
              _confirmPrice: null, _confirmInputPyeong: null };
            addMsg({ role: 'ai', type: 'thinking', content: '잠깐만요, 확인해볼게요~ 🔍' });
            await runAnalysis(st._confirmComplex, {
              intent: st._confirmPurpose === 'buy' ? 'buy' : 'fair',
              areaSqm: st._confirmArea,
              currentPrice: null,
              skipAreaCheck: true,
              _pendingInputPyeong: st._confirmInputPyeong,
            });
          },
        });
      },
    });
  }


  async function runAnalysis(complex, intent) {
    // ★ 흐름 보호: areaSqm 없으면 평형 질문부터
    // intent.skipAreaCheck 플래그가 있을 때만 스킵 (내부 재귀 방지)
    if (!intent.skipAreaCheck && !intent.areaSqm) {
      await askAreaThenPrice(complex, intent.intent || 'fair');
      return;
    }
    // 가격 질문 제거 — 실거래 중앙값으로 자동 분석 (새 UX)
    // currentPrice=null이면 runAnalysis 내부에서 실거래 중앙값 사용

    // 문제3: thinking은 addMsg로 추가 (replaceLastAI 오남용 방지)
    addMsg({ role: "ai", type: "thinking", content: "잠깐만요, 확인해볼게요~ 🔍" });

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

      // ── 면적 필터: areaMapping.filterDealsByArea 사용 ──
      // 규칙: 25평(59㎡) 요청 시 84㎡ 자동 전환 금지
      // fallback 있으면 사용자에게 확인 후 진행
      const { matched: saleFiltered, fallbackSqm } = filterDealsByArea(saleDealsRaw, targetArea);
      const { matched: rentFilteredRaw } = filterDealsByArea(rentDealsRaw, targetArea);
      const rentFiltered = rentFilteredRaw.filter(d => !d.monthly_man || Number(d.monthly_man) === 0);

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

      // ── fallback 처리: 다른 면적이 더 가까운 경우 사용자에게 물어봄 ──
      if (sale.length < 3 && fallbackSqm && Math.abs(fallbackSqm - targetArea) > 3) {
        const reqPyeong  = intent._pendingInputPyeong || (targetArea ? Math.round(targetArea/3.3) : null);
        const reqLabel   = reqPyeong ? `${reqPyeong}평` : `전용 ${targetArea}㎡`;
        const { pyeong: fbPyeong } = sqmToPyeong(fallbackSqm);
        const fbLabel    = `${fbPyeong}평 (전용 ${fallbackSqm}㎡)`;
        replaceLastAI({ type: "text",
          content: `**${name}** ${reqLabel} 계열의 최근 실거래가 부족합니다.\n\n가장 가까운 **${fbLabel}** 데이터로 분석해드릴까요?\n\n"네" 또는 "${fbLabel}"라고 입력하시면 계속 진행합니다.` });
        convStateRef.current = {
          ...convStateRef.current,
          _pendingNoData: false,
          _pendingFallbackSqm: fallbackSqm,
          _pendingFallbackPyeong: fbPyeong,
          _pendingComplex: complex,
          _pendingArea: targetArea,
          _pendingPurpose: intent.intent || 'fair',
        };
        return;
      }

      // 거래 부족 → 매물가 + 전세가 입력 요청
      if (sale.length < 3) {
        // 전세 데이터도 없으면
        const hasJeonse = jeonse.length > 0;
        replaceLastAI({
          type: "text",
          content: `**${name}** ${targetArea ? `${Math.round(targetArea / 3.3058)}평` : ""}은 최근 1년 내 실거래가 없네요.\n\n현재 매물가랑 ${hasJeonse ? "" : "전세가 "}알려주시면 대략 적정가 분석해드릴게요.\n\n예: "매물가 7.5억, 전세 4억"`,
        });
        // 입력 대기 상태 세팅
        convStateRef.current = {
          ...convStateRef.current,
          _pendingNoData: true,
          _pendingComplex: complex,
          _pendingArea: targetArea,
          _pendingJeonse: hasJeonse ? jeonse : null,
        };
        return;
      }

      // buildAnalysisInput 호출 — 기존 엔진 전처리 그대로 사용
      // sale 중앙값을 currentPrice로 자동 세팅 (blockReason 방지)
      const sortedPrices = [...sale].map(d => d.price).filter(p => p > 0).sort((a,b) => a-b);
      const medianPrice = sortedPrices.length > 0
        ? sortedPrices[Math.floor(sortedPrices.length / 2)]
        : 0;

      // currentPrice: 사용자 입력 우선, 없으면 실거래 중앙값
      const userPrice = intent.currentPrice || null;
      const finalPrice = userPrice || medianPrice;

      const rawData = {
        sale, jeonse,
        areaSqm:       targetArea || 0,
        region:        sigungu,
        dong,
        complexName:   name,
        buildYear:     complex.build_year || null,
        currentPrice:  finalPrice,
        _userInputPrice: !!userPrice,   // 사용자가 직접 입력한 매물가인지 여부
        kbSalePrice:   0,
        kbJeonse:      0,
        tradeStatus:   { code: "OK" },
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

      // 결과 화면으로 이동 (채팅창 대신 별도 화면)
      if (onNavigate) {
        onNavigate("result", {
          complex: {
            name,
            sigungu,
            dong,
            areaExclusive: Math.round(targetArea || builtFf.areaExclusive || 0),
            buildYear: complex.build_year,
          },
          intent,
          engine: res,
          ff: { ...builtFf, saleDeals: sale, jeonseDeals: jeonse,
            // ★ Quick Action "다른 평형은?" 용 — ResultChatBar까지 전달
            areaOptions: rawData.areaOptions || [] },
        });
      }

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
  // Phase 3 ResultCard — 3초 안에 결론 이해 UX
  function ResultCard({ data, intent }) {
    const { complex, engine } = data;
    if (!engine) return null;

    const grade = engine.buyGrade || engine.fairGrade || "C";
    const gapRatio = engine.gapRatio;
    const hold = engine.engineMode === "hold";

    // 결론
    const verdict = hold
      ? { label:"판단 보류", color:"#94a3b8", bg:"#f1f5f9" }
      : gapRatio < -0.08 ? { label:"저평가",      color:"#2F6F4F", bg:"#f0fdf4" }
      : gapRatio < 0.05  ? { label:"적정 범위",   color:"#334155", bg:"#f8fafc" }
      : gapRatio < 0.12  ? { label:"고평가 주의", color:"#C97B22", bg:"#fffbeb" }
      :                    { label:"고평가",       color:"#DC2626", bg:"#fef2f2" };

    const won = m => !m || isNaN(Number(m)) || Number(m)===0 ? "—"
      : m >= 10000 ? (Math.round((m/10000)*100)/100).toLocaleString()+"억" : Number(m).toLocaleString()+"만원";

    const INTENT_TAB = { fair:"fair", buy:"buy", sell:"sell", recommend:"reco" };

    return (
      <div style={{ background:"#fff", borderRadius:16, border:`1px solid #e8e4df`,
        boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden", marginTop:4 }}>

        {/* ① 결론 — 가장 크게 */}
        <div style={{ padding:"16px", background:verdict.bg,
          borderLeft:`3px solid ${verdict.color}`, borderBottom:`1px solid #e8e4df` }}>
          <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 8px" }}>
            {complex.name} · {complex.areaExclusive ? `전용 ${complex.areaExclusive}㎡` : ""}
          </p>
          <p style={{ fontSize:22, fontWeight:800, color:verdict.color, margin:"0 0 4px",
            letterSpacing:"-0.02em" }}>
            {verdict.label}
          </p>
          {!hold && gapRatio != null && Number.isFinite(gapRatio) && (
            <p style={{ fontSize:12, color:"#64748b", margin:0 }}>
              적정가 대비 {gapRatio < 0 ? "▼" : "▲"} {Math.abs(gapRatio*100).toFixed(1)}% {gapRatio < 0 ? "낮음" : "높음"}
            </p>
          )}
        </div>

        {/* ② 적정가 범위 */}
        {!hold && engine.fairPrice && (
          <div style={{ padding:"12px 16px", borderBottom:`1px solid #e8e4df` }}>
            <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 4px" }}>AI 추정 적정 범위</p>
            <p style={{ fontSize:16, fontWeight:700, color:"#2F6F4F", margin:0 }}>
              약 {won(Math.round(engine.fairPrice*0.93))} ~ {won(Math.round(engine.fairPrice*1.07))}
            </p>
          </div>
        )}

        {/* ③ 현재 시세 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          borderBottom:`1px solid #e8e4df` }}>
          {engine.saleMedian && (
            <div style={{ padding:"10px 14px", borderRight:`1px solid #e8e4df` }}>
              <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 3px" }}>최근 시세</p>
              <p style={{ fontSize:15, fontWeight:700, color:"#334155", margin:0 }}>
                {won(engine.saleMedian)}
              </p>
            </div>
          )}
          {engine.jeonseRatio && (
            <div style={{ padding:"10px 14px" }}>
              <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 3px" }}>전세가율</p>
              <p style={{ fontSize:15, fontWeight:700, color:"#334155", margin:0 }}>
                {Math.round(engine.jeonseRatio*100)}%
              </p>
            </div>
          )}
        </div>

        {/* ④ 데이터 안정성 */}
        <div style={{ padding:"10px 14px", borderBottom:`1px solid #e8e4df`,
          display:"flex", alignItems:"center", gap:8 }}>
          <p style={{ fontSize:11, color:"#94a3b8", margin:0 }}>데이터 안정성</p>
          <span style={{ fontSize:12, fontWeight:600,
            color: engine.saleUsed >= 5 ? "#2F6F4F" : engine.saleUsed >= 2 ? "#C97B22" : "#DC2626" }}>
            {engine.saleUsed >= 5 ? "높음" : engine.saleUsed >= 2 ? "보통" : "낮음"}
          </span>
          <p style={{ fontSize:11, color:"#94a3b8", margin:0, marginLeft:"auto" }}>
            거래 {engine.saleUsed||0}건 기준
          </p>
        </div>

        {/* 상세 보기 버튼 */}
        <div style={{ padding:"12px 14px" }}>
          <button
            onClick={() => onNavigate(INTENT_TAB[intent?.intent] || "fair", {
              complexName: complex.name, region: complex.sigungu, dong: complex.dong,
              areaSqm: complex.areaExclusive,
              agentResult: engine ? { analysisResult: engine, form: {
                complexName: complex.name, region: complex.sigungu,
                dong: complex.dong || "", areaExclusive: complex.areaExclusive ? String(complex.areaExclusive) : "",
              }} : undefined,
            })}
            style={{ width:"100%", height:40, borderRadius:10, background:BRAND, color:"#fff",
              border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
              display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            상세 분석 · 체크리스트 보기 →
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
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#5b52e0,#7b6fff)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
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

    if (msg.type === "area_chips") {
      // Rule 3: DB 실제 평형 버튼으로 제시
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:BRAND_GREEN,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:14, color:BRAND, margin:"0 0 10px", lineHeight:1.55, letterSpacing:"-0.01em" }}>
              {msg.content}
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {(msg.areaGroups || []).map((g, i) => {
                // 가드: g.anchor null/undefined 방지
                if (!g || g.anchor == null || !Number.isFinite(g.anchor)) return null;
                const { pyeong } = sqmToPyeong(g.anchor);
                const sqm    = g.anchor.toFixed(1);
                return (
                  <button key={i}
                    onClick={() => msg.onSelect && msg.onSelect(g.anchor)}
                    style={{
                      padding:"8px 14px", borderRadius:20,
                      border:`1px solid ${BRAND_BORDER}`,
                      background:"#fff", cursor:"pointer",
                      fontSize:13, fontWeight:500, color:BRAND,
                      transition:"all 0.1s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background=BRAND; e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor=BRAND; }}
                    onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color=BRAND; e.currentTarget.style.borderColor=BRAND_BORDER; }}
                  >
                    {pyeong}평 (전용 {sqm}㎡)
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === "thinking") {
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#5b52e0,#7b6fff)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
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

    if (msg.type === "confirm_analysis") {
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:BRAND_GREEN,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:14, color:BRAND, margin:"0 0 12px", whiteSpace:"pre-line", lineHeight:1.6 }}>
              {msg.content}
            </p>
            <button
              onClick={async () => {
                if (msg.onConfirm) await msg.onConfirm();
              }}
              style={{
                padding:"10px 24px", borderRadius:20,
                background:BRAND_GREEN, color:"#fff",
                border:"none", cursor:"pointer",
                fontSize:14, fontWeight:700,
                letterSpacing:"-0.01em",
              }}
            >
              분석 시작
            </button>
          </div>
        </div>
      );
    }

    if (msg.type === "purpose_chips") {
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#5b52e0,#7b6fff)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:14, color:"#1e293b", margin:"0 0 10px", whiteSpace:"pre-line", lineHeight:1.6 }}>{msg.content}</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {(msg.choices || []).map((c, i) => (
                <button key={i} onClick={() => msg.onSelect?.(c)}
                  style={{ fontSize:13, fontWeight:600, padding:"8px 18px",
                    borderRadius:20, border:"1px solid #5b52e0",
                    background:"#ede9fe", color:"#5b52e0", cursor:"pointer" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === "candidates") {
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#5b52e0,#7b6fff)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:14, color:BRAND, margin:"0 0 10px", lineHeight:1.55, letterSpacing:"-0.01em" }}>
              {msg.content}
            </p>
            {(() => {
              const items = msg.data || [];
              const showAll = showAllMap[msg.id] || false;
              const visible = showAll ? items : items.slice(0, 5);
              return (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {visible.map((c, i) => (
                    <button key={i}
                      onClick={async () => {
                        // 후보 선택 → ConversationEngine으로 보내서 평형 질문
                        if (msg.onSelect) msg.onSelect(c);
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
                  {!showAll && items.length > 5 && (
                    <button onClick={() => setShowAllMap(p => ({...p, [msg.id]: true}))}
                      style={{ background:"none", border:`0.5px solid ${BRAND_BORDER}`, borderRadius:12, padding:"9px 14px", cursor:"pointer", fontSize:12, color:"#5b52e0", fontWeight:500 }}>
                      더 보기 ({items.length - 5}개 더)
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      );
    }

    if (msg.type === "result") {
      const { engine, ff, complex, areaSqm, intentStr } = msg.data || {};
      if (engine && ff) {
        return (
          <div key={msg.id} style={{ marginBottom:8 }}>
            <FairValueResult r={engine} f={ff} onBack={null} onNewSearch={null}
              onHome={null} areaOptions={[]} currentUserId={currentUserId} />
            {/* [매물과 비교하기] 버튼 */}
            <div style={{ marginTop:10, paddingLeft:2 }}>
              <button
                onClick={() => {
                  const cxName = complex?.complex_name || '';
                  const pyeong = areaSqm ? typicalPyeong(areaSqm) : '';
                  const prompt = `${cxName} ${pyeong}평 매물가를 입력해서 비교해볼게요.\n현재 보고 계신 매물 가격이 얼마인가요?`;
                  addMsg({ role: 'ai', type: 'text', content: prompt });
                  convStateRef.current = {
                    ...convStateRef.current,
                    _pendingPrice:   true,
                    _pendingComplex: complex,
                    _pendingArea:    areaSqm,
                    _pendingPurpose: intentStr || 'fair',
                  };
                }}
                style={{ height:36, paddingLeft:16, paddingRight:16, borderRadius:10,
                  border:`0.5px solid ${BRAND_BORDER}`, background:'#fff', cursor:'pointer',
                  fontSize:13, color:BRAND_MID, display:'inline-flex', alignItems:'center',
                  gap:6, transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background='#fafaf8'}
                onMouseLeave={e => e.currentTarget.style.background='#fff'}
              >
                <CI d="currency-won" s={13} color={BRAND_MUTED} />
                매물과 비교하기
              </button>
            </div>
          </div>
        );
      }
      return (
        <div key={msg.id} style={{ display:"flex", gap:10, padding:"4px 0" }}>
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#5b52e0,#7b6fff)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
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
          <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#5b52e0,#7b6fff)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        )}
        <div style={{
          maxWidth:"80%",
          padding:"10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
          background: isUser ? "#5b52e0" : "#fff",
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



      {/* ── 상단바 ── */}
      <div style={{ height:48, display:"flex", alignItems:"center", padding:"0 16px", borderBottom:`0.5px solid #e8e4f0`, background:"#fff", flexShrink:0 }}>
        <button onClick={() => onNavigate && onNavigate("home")}
          style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:6, padding:"4px 8px 4px 0", color:"#5b52e0" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b52e0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{ fontSize:13, fontWeight:500 }}>홈</span>
        </button>
        <div style={{ flex:1, textAlign:"center" }}>
          <p style={{ fontSize:14, fontWeight:700, color:"#1a1650", margin:0, letterSpacing:"-0.01em" }}>찾아!AI</p>
          <p style={{ fontSize:10, color:"#9994d8", margin:0 }}>실제거래가격 기반</p>
        </div>
        <div style={{ width:60 }}/>{/* 균형용 */}
      </div>

      {/* ── 카드형 인사 배너 ── */}
      <div style={{ padding:"12px 16px 8px", background:"#f5f3ff", flexShrink:0 }}>
        <div style={{
          background:"linear-gradient(135deg,#0d0a28 0%,#1a1650 100%)",
          borderRadius:18, padding:"14px 18px",
          position:"relative", overflow:"hidden",
          boxShadow:"0 4px 16px rgba(13,10,40,0.18)",
        }}>
          <div style={{ position:"absolute", right:-20, top:-20, width:90, height:90, borderRadius:"50%", background:"#2d2870", opacity:0.3 }}/>
          <div style={{ display:"flex", alignItems:"center", gap:8, position:"relative" }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#5b52e0,#7b6fff)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 6px rgba(91,82,224,0.4)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0, letterSpacing:"-0.01em" }}>안녕하세요! 어떤 아파트가 궁금하세요?</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 메시지 영역 ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 8px", background:"linear-gradient(to right, #ffffff, #f0effe)" }}>

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
