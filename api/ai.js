// 서버리스 함수: 브라우저 대신 Anthropic API 를 호출한다.
// 핵심 이유 ─ Anthropic API 키를 브라우저에 노출하면 안 되고(누구나 훔쳐 씀),
// 브라우저에서 api.anthropic.com 을 직접 부르면 CORS 로 막힌다.
// 그래서 키를 서버(이 함수)에만 두고, 브라우저는 우리 서버한테만 요청한다.
//
// 필요한 환경변수: ANTHROPIC_API_KEY  (Vercel 대시보드 > Settings > Environment Variables)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "서버에 ANTHROPIC_API_KEY 가 설정되지 않았어요. Vercel 환경변수를 확인하세요.",
    });
    return;
  }
  try {
    // 브라우저가 보낸 본문(model, max_tokens, messages, tools 등)을 그대로 전달한다.
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: "AI 호출 실패: " + (e && e.message ? e.message : String(e)) });
  }
}
