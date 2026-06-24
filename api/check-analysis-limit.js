// api/check-analysis-limit.js
// 분석 실행 전 횟수 확인 + 성공 시 기록
// TODO: 유료화 시 분석 로직 자체를 서버로 이전하여 완전한 서버사이드 제한으로 전환

const SERVICE = 'valuelens-analysis';

function isLimitEnabled() {
  return process.env.ANALYSIS_LIMIT_ENABLED === 'true';
}

function getDailyLimit() {
  return parseInt(process.env.ANALYSIS_LIMIT_DAILY_FREE || '1', 10);
}

function isBypassEmail(email) {
  if (!email) return false;
  const bypasses = (process.env.ANALYSIS_LIMIT_BYPASS_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return bypasses.includes(email.toLowerCase());
}

async function getTodayCount(url, key, identifier) {
  const today = new Date().toISOString().slice(0, 10);
  const from = `${today}T00:00:00.000Z`;
  const to   = `${today}T23:59:59.999Z`;
  const qs = `?identifier=eq.${encodeURIComponent(identifier)}&service=eq.${SERVICE}&created_at=gte.${from}&created_at=lte.${to}&select=id`;
  const res = await fetch(`${url}/rest/v1/analysis_calls${qs}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
  });
  const cr = res.headers.get('content-range');
  if (cr) {
    const total = parseInt(cr.split('/')[1] || '0', 10);
    return isNaN(total) ? 0 : total;
  }
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

async function recordCall(url, key, identifier, userId) {
  await fetch(`${url}/rest/v1/analysis_calls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      identifier,          // user_id 또는 device_id
      user_id: userId || null,
      service: SERVICE,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 허용' });
  }

  // 제한 비활성화 시 바로 통과
  if (!isLimitEnabled()) {
    return res.status(200).json({ ok: true, reason: 'limit_disabled' });
  }

  const { action, userId, userEmail, deviceId } = req.body || {};
  // identifier: 로그인 시 userId, 비로그인 시 deviceId
  const identifier = userId || deviceId;

  // 우회 이메일이면 무제한
  if (isBypassEmail(userEmail)) {
    return res.status(200).json({ ok: true, reason: 'bypass' });
  }

  if (!identifier) {
    // identifier 없으면 통과 (최소한의 UX 보장)
    return res.status(200).json({ ok: true, reason: 'no_identifier' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(200).json({ ok: true, reason: 'no_supabase' });
  }

  try {
    // check: 오늘 횟수 조회
    if (action === 'check' || action === 'check_and_record') {
      const count = await getTodayCount(url, key, identifier);
      const limit = getDailyLimit();

      if (count >= limit) {
        return res.status(429).json({
          ok: false,
          error: 'limit_exceeded',
          count,
          limit,
          message: '오늘 무료 분석 1회를 모두 사용했습니다.\n내일 다시 이용하거나 저장된 분석 결과를 확인해주세요.',
        });
      }

      // record: 통과 시 바로 기록 (check_and_record)
      if (action === 'check_and_record') {
        await recordCall(url, key, identifier, userId);
      }

      return res.status(200).json({ ok: true, count, limit, remaining: limit - count - (action === 'check_and_record' ? 1 : 0) });
    }

    // record only
    if (action === 'record') {
      await recordCall(url, key, identifier, userId);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'action 필수 (check | check_and_record | record)' });

  } catch (e) {
    console.warn('[check-analysis-limit] 오류 (통과):', e?.message);
    // 오류 시 통과 (서비스 중단 방지)
    return res.status(200).json({ ok: true, reason: 'error_passthrough' });
  }
}
