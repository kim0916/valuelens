/**
 * ValueLens NLU — recommendSearch.js
 *
 * 단지명 없이 지역/예산/평형/목적으로 후보를 검색한다.
 * recommend_complex intent 처리 전담.
 *
 * 우선순위:
 *   1. 해당 지역 → 2. 예산 범위 → 3. 면적 조건 → 4. 거래량 → 5. 데이터 있는 단지
 *
 * ★ 계산 로직 없음. 후보 목록 반환만.
 * ★ 자동 분석 금지 — 후보 목록을 보여주고 사용자가 선택.
 */

const BASE_URL = typeof window !== 'undefined'
  ? ''                          // 브라우저
  : 'https://valuelens-rouge.vercel.app';  // Node.js 테스트

// ─────────────────────────────────────────────
// 추천 검색 메인
// ─────────────────────────────────────────────
/**
 * @param {object} nlu — parseUserInput 결과
 * @param {number} limit — 최대 후보 수
 * @returns {{ candidates, meta }}
 */
export async function searchRecommendCandidates(nlu, limit = 8) {
  // 검색 쿼리 구성
  const query    = buildSearchQuery(nlu);
  const sigungu  = nlu.sigungu || nlu.regionArea || nlu.dong || nlu.region || "";
  const areaHint = nlu.areaSqm;

  if (!query && !sigungu) {
    return { candidates: [], meta: { reason: "no_condition", query, sigungu } };
  }

  try {
    const res = await fetch(`${BASE_URL}/api/supabase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type:    "search",
        name:    query || sigungu || "",
        sigungu: sigungu,
        limit:   limit * 2,  // 필터링 여유분
      }),
    });
    const data = await res.json();
    let complexes = data.complexes || [];

    // ── 후처리 필터 ──

    // 1. 예산 필터
    if (nlu.budget && complexes.length > 0) {
      // sale_price 없으면 건너뜀 (추후 price 데이터 연동 시 활용)
      // 현재는 거래량 있는 단지 우선 정렬로 대체
    }

    // 2. 면적 필터 (areaHint 또는 areaRange)
    if (areaHint || nlu.areaRange) {
      complexes = complexes.filter(c => {
        if (!c.area_list) return true; // 데이터 없으면 포함
        try {
          const areas = JSON.parse(c.area_list).map(Number);
          if (nlu.areaRange) {
            return areas.some(a => a >= nlu.areaRange.min && a <= nlu.areaRange.max);
          }
          if (areaHint) {
            return areas.some(a => Math.abs(a - areaHint) <= 10);
          }
        } catch { return true; }
        return true;
      });
    }

    // 3. 거래량 기준 정렬 (데이터 있는 단지 우선)
    complexes.sort((a, b) => (b.sale_cnt || 0) - (a.sale_cnt || 0));

    // 4. 상위 N개
    const candidates = complexes.slice(0, limit);

    return {
      candidates,
      meta: {
        query,
        sigungu,
        areaHint,
        areaRange: nlu.areaRange,
        budget:    nlu.budget,
        purpose:   nlu.purpose,
        family:    nlu.family,
        totalFound: complexes.length,
      },
    };

  } catch (e) {
    console.error('[recommendSearch] 오류:', e);
    return { candidates: [], meta: { reason: "error", error: e.message } };
  }
}

// ─────────────────────────────────────────────
// 추천 검색 쿼리 구성
// ─────────────────────────────────────────────
function buildSearchQuery(nlu) {
  const parts = [];

  // 지역어 (가장 먼저)
  const region = nlu.regionArea || nlu.dong || nlu.sigungu;
  if (region) parts.push(region);

  // 브랜드명 (지역 뒤에)
  if (nlu.brand) parts.push(nlu.brand);

  // 단지명 힌트 (있을 때만)
  if (nlu.complexQuery && nlu.complexQuery !== nlu.brand) {
    parts.push(nlu.complexQuery);
  }

  return parts.join(" ").trim();
}

// ─────────────────────────────────────────────
// 추천 결과 → 응답 텍스트 생성
// ─────────────────────────────────────────────
/**
 * 추천 검색 결과를 사용자 친화적 텍스트로 변환
 */
export function buildRecommendResponse(candidates, nlu, meta) {
  if (!candidates || candidates.length === 0) {
    const region = nlu.regionArea || nlu.sigungu || nlu.dong;
    return {
      text: buildNotFoundText(nlu, region),
      type: "not_found",
    };
  }

  // 조건 요약
  const conditionText = buildConditionSummary(nlu);

  // 후보 목록 (자동 분석 금지 — 목록만 보여줌)
  const list = candidates.map((c, i) => {
    const sigungu = c.sigungu_short || extractGuDong(c.sigungu);
    const built   = c.build_year ? `${c.build_year}년` : "";
    const cnt     = (c.sale_cnt || 0) > 0 ? `거래 ${c.sale_cnt}건` : "거래 확인 필요";
    return `${i + 1}. **${c.complex_name}** — ${sigungu} ${built} (${cnt})`.trim();
  }).join("\n");

  const intro = conditionText
    ? `${conditionText} 조건으로 ${candidates.length}개 단지가 있어요.`
    : `${candidates.length}개 단지를 찾았어요.`;

  return {
    text: `${intro}\n\n${list}\n\n번호를 입력하거나, 단지명을 말씀해 주세요.`,
    type: "recommend_list",
    candidates,
  };
}

// ─────────────────────────────────────────────
// 조건 요약 텍스트
// ─────────────────────────────────────────────
function buildConditionSummary(nlu) {
  const parts = [];
  const region = nlu.regionArea || nlu.sigungu || nlu.dong;
  if (region) parts.push(region);
  if (nlu.brand) parts.push(nlu.brand);
  if (nlu.areaRange) parts.push(`${nlu.areaRange.min}~${nlu.areaRange.max}㎡`);
  else if (nlu.areaSqm) parts.push(`${nlu.areaSqm}㎡`);
  if (nlu.budget?.raw) parts.push(nlu.budget.raw);
  const purposeText = { live:"실거주", invest:"투자", jeonse:"전세", buy:"매수" }[nlu.purpose];
  if (purposeText) parts.push(purposeText);
  if (nlu.family === 'children') parts.push("학군/가족");
  return parts.join(" · ");
}

function buildNotFoundText(nlu, region) {
  const cond = buildConditionSummary(nlu);
  if (cond) return `**${cond}** 조건에 맞는 단지를 찾지 못했어요.\n\n조건을 조금 넓혀보시거나, 단지명을 직접 입력해 주세요.`;
  return `조건에 맞는 단지를 찾지 못했어요. 단지명이나 지역을 알려주세요.`;
}

function extractGuDong(sigungu) {
  if (!sigungu) return "";
  return sigungu.split(" ").slice(1, 3).join(" ") || sigungu.split(" ")[0];
}
