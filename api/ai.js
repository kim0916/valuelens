// api/ai.js — Anthropic API 프록시 + 일일 사용 제한
// AI_LIMIT_ENABLED=true/false
// AI_LIMIT_BYPASS_EMAILS=email1,email2 (쉼표 구분)

const DAILY_LIMIT = 1;
const SERVICE = 'valuelens-realestate';

function isLimitEnabled() {
  return process.env.AI_LIMIT_ENABLED === 'true';
}

function isBypassEmail(email) {
  if (!email) return false;
  const bypasses = (process.env.AI_LIMIT_BYPASS_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return bypasses.includes(email.toLowerCase());
}

async function getTodayCount(supabaseUrl, supabaseKey, userId) {
  const today = new Date().toISOString().slice(0, 10);
  const from  = `${today}T00:00:00.000Z`;
  const to    = `${today}T23:59:59.999Z`;
  const qs = `?user_id=eq.${encodeURIComponent(userId)}&service=eq.${SERVICE}&created_at=gte.${from}&created_at=lte.${to}&select=id`;
  const res = await fetch(`${supabaseUrl}/rest/v1/ai_calls${qs}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'count=exact',
    },
  });
  // Content-Range: 0-0/3 형식
  const cr = res.headers.get('content-range');
  if (cr) {
    const total = parseInt(cr.split('/')[1] || '0', 10);
    return isNaN(total) ? 0 : total;
  }
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

async function recordCall(supabaseUrl, supabaseKey, userId) {
  await fetch(`${supabaseUrl}/rest/v1/ai_calls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId, service: SERVICE }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '서버에 ANTHROPIC_API_KEY 가 설정되지 않았어요.' });
    return;
  }

  // ── 사용 제한 체크 ──
  const userId    = req.headers['x-user-id']    || null;
  const userEmail = req.headers['x-user-email'] || null;

  if (isLimitEnabled() && userId) {
    try {
      // 1. 우회 이메일이면 제한 없음
      if (!isBypassEmail(userEmail)) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const count = await getTodayCount(supabaseUrl, supabaseKey, userId);
          if (count >= DAILY_LIMIT) {
            res.status(429).json({
              error: 'limit_exceeded',
              message: '오늘 무료 AI 분석 횟수를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요.',
            });
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[ai.js] 제한 체크 실패 (통과):', e?.message);
    }
  }

  // ── Anthropic API 호출 ──
  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    });
    const text = await upstream.text();

    // ── 성공 시 + 제한 활성화 + 우회 아닌 유저만 기록 ──
    if (upstream.status === 200 && isLimitEnabled() && userId && !isBypassEmail(userEmail)) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) await recordCall(supabaseUrl, supabaseKey, userId);
      } catch (e) {
        console.warn('[ai.js] 호출 기록 실패:', e?.message);
      }
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'AI 호출 실패: ' + (e?.message || String(e)) });
  }
}
