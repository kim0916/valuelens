// api/ai.js — Anthropic API 프록시 + 일일 사용 제한
// 일반 유저: 하루 1회 / 관리자(is_admin=true): 무제한

const DAILY_LIMIT = 1;
const SERVICE = 'valuelens-realestate';

async function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, key };
}

// 오늘 AI 호출 횟수 조회
async function getTodayCount(url, key, userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const from  = today + 'T00:00:00.000Z';
  const to    = today + 'T23:59:59.999Z';
  const qs = `?user_id=eq.${userId}&service=eq.${SERVICE}&created_at=gte.${from}&created_at=lte.${to}&select=id`;
  const res = await fetch(`${url}/rest/v1/ai_calls${qs}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
  });
  const countHeader = res.headers.get('content-range'); // "0-N/total"
  if (countHeader) {
    const total = parseInt(countHeader.split('/')[1] || '0', 10);
    return isNaN(total) ? 0 : total;
  }
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

// 관리자 여부 조회
async function isAdmin(url, key, userId) {
  const res = await fetch(
    `${url}/rest/v1/users?id=eq.${userId}&select=is_admin&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  const data = await res.json();
  return Array.isArray(data) && data[0]?.is_admin === true;
}

// AI 호출 기록
async function recordCall(url, key, userId) {
  await fetch(`${url}/rest/v1/ai_calls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
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
  const userId = req.headers['x-user-id'] || null;
  if (userId) {
    try {
      const { url, key } = await getSupabase();
      if (url && key) {
        const [admin, count] = await Promise.all([
          isAdmin(url, key, userId),
          getTodayCount(url, key, userId),
        ]);
        if (!admin && count >= DAILY_LIMIT) {
          res.status(429).json({
            error: 'limit_exceeded',
            message: '오늘 무료 AI 분석 횟수를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요.',
          });
          return;
        }
      }
    } catch (e) {
      // 제한 체크 실패 시 통과 (서비스 중단 방지)
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

    // ── 성공 시에만 호출 기록 ──
    if (upstream.status === 200 && userId) {
      try {
        const { url, key } = await getSupabase();
        if (url && key) await recordCall(url, key, userId);
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
