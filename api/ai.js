// 서버리스 함수: 브라우저 대신 Anthropic API 를 호출한다.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "서버에 ANTHROPIC_API_KEY 가 설정되지 않았어요." });
    return;
  }
  try {
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

    // AI 호출 카운트 기록 (Supabase)
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      const userId = req.headers['x-user-id'] || null;
      if (supabaseUrl && supabaseKey && upstream.status === 200) {
        await fetch(`${supabaseUrl}/rest/v1/ai_calls`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            user_id: userId,
            service: "valuelens-realestate",
            created_at: new Date().toISOString()
          })
        });
      }
    } catch (e) {
      // 카운트 실패해도 AI 응답은 정상 반환
    }

    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: "AI 호출 실패: " + (e && e.message ? e.message : String(e)) });
  }
}
