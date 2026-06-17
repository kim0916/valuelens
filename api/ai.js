// Vercel 서버리스 함수: 브라우저 대신 Gemini API 를 호출한다.
// 핵심 이유 ─ API 키를 브라우저에 노출하면 안 되고(누구나 훔쳐 씀),
// 브라우저에서 Google API 를 직접 부르면 CORS 로 막힌다.
// 그래서 키를 서버(이 함수)에만 두고, 브라우저는 우리 서버한테만 요청한다.
//
// 이 함수는 프론트엔드가 보내는 "Anthropic 형식" 요청을 받아서
// Gemini 형식으로 번역 → Gemini 호출 → 응답을 다시 Anthropic 형식으로 돌려준다.
// 덕분에 프론트엔드(ValueLens 본체) 코드는 하나도 안 바꿔도 그대로 작동한다.
//
// 필요한 환경변수: GEMINI_API_KEY  (Vercel 대시보드 > Settings > Environment Variables)
 
const MODEL = "gemini-2.5-flash"; // 무료 티어 안정 모델
 
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }
 
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "서버에 GEMINI_API_KEY 가 설정되지 않았어요. Vercel 환경변수를 확인하세요.",
    });
    return;
  }
 
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { system, messages = [], max_tokens, tools } = body;
 
    // 1) Anthropic messages  ->  Gemini contents 로 변환
    const contents = messages.map((m) => {
      const role = m.role === "assistant" ? "model" : "user";
      let text = "";
      if (typeof m.content === "string") {
        text = m.content;
      } else if (Array.isArray(m.content)) {
        text = m.content
          .map((c) => (c && c.type === "text" ? c.text : ""))
          .filter(Boolean)
          .join("\n");
      }
      return { role, parts: [{ text }] };
    });
 
    // 2) Gemini 요청 본문 구성
    const geminiBody = {
      contents,
      generationConfig: {
        maxOutputTokens: max_tokens || 2048,
      },
    };
 
    // system 프롬프트 (Anthropic 의 system -> Gemini 의 system_instruction)
    if (system) {
      const sysText =
        typeof system === "string"
          ? system
          : Array.isArray(system)
          ? system.map((s) => s.text || "").join("\n")
          : "";
      if (sysText) geminiBody.system_instruction = { parts: [{ text: sysText }] };
    }
 
    // Anthropic web_search 툴이 들어오면 -> Gemini 구글 검색 그라운딩으로 변환
    if (
      Array.isArray(tools) &&
      tools.some((t) => t && ((t.type && String(t.type).includes("web_search")) || t.name === "web_search"))
    ) {
      geminiBody.tools = [{ google_search: {} }];
    }
 
    // 3) Gemini 호출
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(geminiBody),
      }
    );
 
    const data = await upstream.json();
 
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: "Gemini 호출 실패: " + (data && data.error && data.error.message ? data.error.message : JSON.stringify(data)),
      });
      return;
    }
 
    // 4) Gemini 응답  ->  Anthropic 형식으로 변환해서 돌려준다
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const outText = parts.map((p) => p.text || "").filter(Boolean).join("\n");
 
    res.status(200).json({
      content: [{ type: "text", text: outText }],
      stop_reason: (data.candidates && data.candidates[0] && data.candidates[0].finishReason) || "end_turn",
    });
  } catch (e) {
    res.status(502).json({ error: "AI 호출 실패: " + (e && e.message ? e.message : String(e)) });
  }
}
