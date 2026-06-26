// ValueLens Search — Supabase 단지 검색
// ★ 검색 로직 수정 금지

function fetchWithTimeout(url, options, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}


// ── Supabase 단지 검색 (국토부 API fallback 포함) ──
// ── 관련 검색어 생성 ──────────────────────────────────────────────────
// DB 응답(complexes 배열)에서 "지역 키워드" 조합으로 관련 검색어 생성
// 별도 API 호출 없이 이미 받은 결과에서 파생
function _extractRegionToken(legalDong, sigungu) {
  const dong = (legalDong || "").trim();
  // 법정동 — "상계동" → "상계", "송도동" → "송도"
  if (dong.length >= 2 && dong.endsWith("동")) return dong.slice(0, -1);
  // 법정동이 구 단위면(ex "영통구") sigungu 마지막 구/동 토큰 시도
  const sg = (sigungu || "").split(" ");
  for (let i = sg.length - 1; i >= 0; i--) {
    const t = sg[i];
    if (t.endsWith("동") && t.length >= 3 && t.length <= 5) return t.slice(0,-1);
    if (t.endsWith("구") && t.length >= 3 && t.length <= 4) return t.slice(0,-1);
  }
  return null;
}

function makeRelatedSuggestions(complexes, kw, maxN = 6) {
  const kwNorm = kw.replace(/\s/g,"").toLowerCase();
  const scoreMap = {};   // label → total_sale_cnt
  const exampleMap = {}; // label → 대표 단지명

  for (const c of complexes) {
    const name = c.complex_name || "";
    if (!name.replace(/\s/g,"").toLowerCase().includes(kwNorm)) continue;

    const token = _extractRegionToken(c.legal_dong, c.sigungu);
    if (!token || token.length < 2 || kw.includes(token)) continue;

    const label = `${token} ${kw}`;
    const cnt   = Number(c.sale_cnt) || 1;
    scoreMap[label]   = (scoreMap[label]   || 0) + cnt;
    if (!exampleMap[label]) exampleMap[label] = name;
  }

  return Object.entries(scoreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxN)
    .map(([label]) => ({ label, query: label, example: exampleMap[label] }));
}
// ─────────────────────────────────────────────────────────────────────

async function searchComplexFromSupabase(name, sigungu, dong) {
  try {
    const res = await fetch('/api/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'search', name, sigungu, dong, limit: 20 }),
    });
    if (!res.ok) throw new Error('Supabase 응답 오류');
    const data = await res.json();
    return {
      complexes: data.complexes || [],
      aliasMatch: data.aliasMatch || null,
      areaHint: data.areaHint || null,
      regionHint: data.regionHint || null,
      fromSupabase: true,
    };
  } catch (e) {
    console.warn('[Supabase] 검색 실패, molit fallback 사용:', e.message);
    return { complexes: [], aliasMatch: null, fromSupabase: false };
  }
}

// Supabase에서 가격 요약 조회
async function getPriceSummaryFromSupabase(complexId, complexName, sigungu, areaExcl) {
  try {
    const res = await fetch('/api/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'summary',
        complex_id: complexId,
        complex_name: complexName,
        sigungu,
        area_excl: areaExcl,
      }),
    });
    const data = await res.json();
    return data.summary || null;
  } catch (e) {
    console.warn('[Supabase] 가격 조회 실패:', e.message);
    return null;
  }
}

// ── 브랜드 단독 매칭 금지 키워드 (복합키 필수) ──

export {
  _extractRegionToken, makeRelatedSuggestions,
  searchComplexFromSupabase, getPriceSummaryFromSupabase,
};
