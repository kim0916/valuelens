import React from "react";
import ReactDOM from "react-dom/client";

// =====================================================================
// 원본 컴포넌트(ValueLens_APEX_recs__3_.jsx)는 한 글자도 고치지 않는다.
// 대신 여기(앱 시작점)에서 "웹앱으로 돌아가게" 만드는 3가지 적응만 한다.
//   1) window.storage  → 브라우저 localStorage 로 대체
//   2) AI 호출(api.anthropic.com) → 우리 서버 /api/ai 로 우회 (키 숨김 + CORS 회피)
//   3) 종목 데이터에 실시간 가격 주입 (미국=Finnhub, 한국=야후) → /api/quote
// 이렇게 하면 원본 파일을 다시 건드리지 않아도 된다.
// =====================================================================

// --- 1) 저장소 폴리필 -------------------------------------------------
// 원본이 storage.get(key) -> { value } / storage.set(key, val) 모양을 기대한다.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: async (k) => {
      try { const v = window.localStorage.getItem(k); return v == null ? null : { value: v }; }
      catch (e) { return null; }
    },
    set: async (k, v) => {
      try { window.localStorage.setItem(k, v); } catch (e) {}
    },
  };
}

// 텍스트에서 첫 번째 '균형 잡힌' JSON 객체만 뽑아낸다. (원본의 같은 함수와 동일한 동작)
function extractFirstJSON(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

// 실시간 시세 조회: 우리 서버리스 함수(/api/quote)에 위임.
async function fetchLiveQuote(ticker, currency) {
  if (!ticker) return null;
  const market = currency === "$" ? "US" : "KR";
  try {
    const r = await fetch(`/api/quote?ticker=${encodeURIComponent(ticker)}&market=${market}`);
    if (!r.ok) return null;
    const d = await r.json();
    const p = parseFloat(d && d.price);
    return isFinite(p) && p > 0 ? p : null;
  } catch (e) { return null; }
}

// --- 2) + 3) fetch 가로채기 ------------------------------------------
if (typeof window !== "undefined" && window.fetch) {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input && input.url) || "";

    // (2) Anthropic 직접 호출을 우리 서버 /api/ai 로 우회한다.
    if (url.indexOf("api.anthropic.com") !== -1) {
      const res = await realFetch("/api/ai", init);

      // (3) 종목 1개를 불러온 응답이면 실시간 가격으로 덮어쓴다.
      //     (fetchStock 응답만 ticker+price+currency 를 동시에 가진다)
      try {
        const cloned = res.clone();
        const data = await cloned.json();
        const text = (data.content || [])
          .filter((b) => b.type === "text").map((b) => b.text).join("\n");
        const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const objStr = extractFirstJSON(clean);
        if (objStr) {
          const obj = JSON.parse(objStr);
          if (obj && obj.ticker && obj.currency && obj.price != null) {
            const live = await fetchLiveQuote(obj.ticker, obj.currency);
            if (live != null) {
              obj.price = live;
              obj.priceSource = obj.currency === "$" ? "Finnhub 실시간" : "Yahoo Finance 실시간";
              // 응답 본문을 새 JSON 으로 교체해 원본 앱이 그대로 읽게 한다.
              const newBlock = { type: "text", text: JSON.stringify(obj) };
              const newData = { ...data, content: [newBlock] };
              return new Response(JSON.stringify(newData), {
                status: res.status,
                headers: { "Content-Type": "application/json" },
              });
            }
          }
        }
      } catch (e) { /* 가격 주입 실패 시 원본 AI 응답 그대로 사용 */ }

      return res;
    }

    return realFetch(input, init);
  };
}

// 원본 컴포넌트를 그대로 가져와 화면에 그린다.
import("../ValueLens_APEX_recs__3_.jsx").then(({ default: App }) => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
