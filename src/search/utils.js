// ValueLens Search — 검색 유틸 (면적 그룹핑, 가격 파싱 등)

function groupAreasByPyeong(areaList) {
  if (!areaList || !Array.isArray(areaList) || areaList.length === 0) return [];
  const sorted = [...new Set(areaList.map(a => Math.round(Number(a)*100)/100).filter(a => a > 0))].sort((a,b)=>a-b);
  if (sorted.length === 0) return [];
  const groups = [];
  for (const a of sorted) {
    const last = groups[groups.length - 1];
    if (last && a - last.rep <= 3) {
      last.areas.push(a);
      // 대표값은 최빈값으로 업데이트
      last.rep = last.areas.reduce((p,c,_,arr) => arr.filter(x=>x===c).length >= arr.filter(x=>x===p).length ? c : p, last.areas[0]);
    } else {
      groups.push({ rep: a, areas: [a], pyeong: typicalPyeong(a) });
    }
  }
  return groups;
}

// 면적 매칭 — targetArea는 숫자 또는 숫자 배열(exclusiveAreas)
// tolerance: ±㎡ 허용 범위
function matchArea(itemArea, targetArea, tolerance = 3) {
  const item = Number(itemArea);
  if (!targetArea) return true;
  if (Array.isArray(targetArea)) {
    // 배열이면 하나라도 tolerance 이내면 통과
    return targetArea.some(t => Math.abs(item - Number(t)) <= tolerance);
  }
  if (Number(targetArea) <= 0) return true;
  return Math.abs(item - Number(targetArea)) <= tolerance;
}

// 거래금액 파싱 (콤마 제거)
function parsePrice(val) {
  return Number(String(val || "").replace(/,/g, "")) || 0;
}

// ── 공통 실거래 조회 함수 ──
// MIN_DEALS 고정값 제거 — 거래 건수에 따라 신뢰도 등급으로 처리
// 거래 1건: 참고값 / 2~3건: 낮은 신뢰도 / 4건+: 일반 분석
function getDataConfidence(count) {
  if (count === 0) return { level: "없음",  label: "거래 없음",              canAnalyze: false };
  if (count <= 1)  return { level: "참고",  label: "참고값 (거래 1건)",       canAnalyze: false };
  if (count <= 3)  return { level: "낮음",  label: `거래 부족 (${count}건·참고용)`, canAnalyze: true };
  if (count <= 6)  return { level: "보통",  label: `거래 ${count}건`,         canAnalyze: true };
  return             { level: "높음",  label: `거래 ${count}건`,         canAnalyze: true };
}


export { groupAreasByPyeong, matchArea, parsePrice, getDataConfidence };
