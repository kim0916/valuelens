// ValueLens Engine — 통계 계산 (trimmed mean, 신뢰도)
// ★ 계산 로직 수정 금지

function computeTrimmedMean(rawDeals, kbPrice, kind = "jeonse", periodMonths = 24) {
  const urgentLabel = kind === "sale" ? "급매" : "급전세";
  const med = (arr) => { const s = [...arr].sort((a,b)=>a-b); const n=s.length; return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):0; };

  const norm = (rawDeals || [])
    .map((d) => ({ ym: d.ym, price: Number(d.price)||0, floor: Number(d.floor)||0, topFloor: Number(d.topFloor)||0, banjiha: !!d.banjiha, urgent: !!d.urgent, related: !!d.related }))
    .filter((d) => d.price > 0 && d.ym);

  // ── 기간 필터: 6개월 우선, 부족하면 전체 사용 ──
  const now = new Date();
  const tryPeriods = [6, 12, 24].filter(p => p <= periodMonths);
  let within = [], usedPeriod = 6;
  for (const mo of tryPeriods) {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - (mo - 1), 1);
    const w = norm.filter((d) => { const s=String(d.ym).replace('-',''); const y=Number(s.slice(0,4)),m=Number(s.slice(4,6)); return !isNaN(y)&&!isNaN(m)&&new Date(y,(m||1)-1,1)>=cutoff; });
    within = w; usedPeriod = mo;
    if (w.length >= 5) break; // 5건 이상이면 이 기간으로 확정
  }
  const total = within.length;
  if (!total) return kbPrice
    ? { value: Math.round(kbPrice), used: 0, excluded: 0, total: 0, confidence: 30, confLabel: "낮음", kbWeight: 1, reasonText: `${periodMonths}개월 내 실거래 없음 · KB시세 100% 반영`, usedPeriod, isFallback: false }
    : null;

  const reasons = { floor1: 0, lowFloor: 0, banjiha: 0, top: 0, urgent: 0, related: 0, dev20: 0 };

  // ── 1차 필터: 표본 5건 이상일 때만 구조적 제외, 미만이면 완화 ──
  const strictMode = total >= 5;
  // 1층 제외 후 0건이 되는지 사전 체크
  const hasNonFloor1 = within.some(d => d.floor !== 1 && !d.banjiha && d.floor >= 0);
  const pass1 = within.filter((d) => {
    if (d.banjiha || d.floor < 0) { reasons.banjiha++; return false; }
    // 1층: 항상 제외 (표본 수 무관) — 단, 1층 제외 시 0건이 되면 포함
    if (d.floor === 1 && hasNonFloor1) { reasons.floor1++; return false; }
    // 최상층 제외: 단지 총 층수(topFloor) 데이터가 있을 때만 적용
    // 현재 DB에 건물 최고층 정보 없음 → 실질적으로 비활성 상태
    // TODO: 건축물대장 API 연동 후 complexes 테이블에 max_floor 추가 시 활성화
    if (d.topFloor && d.floor >= d.topFloor) { reasons.top++; return false; }
    if (strictMode && d.urgent) { reasons.urgent++; return false; }
    if (strictMode && d.related) { reasons.related++; return false; }
    return true;
  });

  // ── 2차 필터: 이상치 제외 (표본 5건 이상 시에만) ──
  const ref = pass1.length ? med(pass1.map((d) => d.price)) : 0;
  const pass2 = pass1.filter((d) => {
    if (ref && strictMode) {
      const gap = (d.price - ref) / ref;
      if (total >= 5 && d.floor <= 3 && gap < -0.15) { reasons.lowFloor++; return false; }
      if (Math.abs(gap) > 0.2) { reasons.dev20++; return false; }
    }
    return true;
  });

  // ── Fallback: 정제 후 0건이면 정제 전 값 사용 (참고값 표시) ──
  let isFallback = false;
  let finalDeals = pass2;
  if (finalDeals.length === 0 && within.length > 0) {
    finalDeals = within; // 원본 전체 fallback
    isFallback = true;
  }

  const kept = finalDeals.map((d) => d.price);
  const used = kept.length;
  const dealAvg = used ? Math.round(kept.reduce((s,x)=>s+x,0)/used) : null;

  // KB시세 가중
  let kbWeight = used >= 5 ? 0 : used >= 3 ? 0.3 : used >= 1 ? 0.6 : 1;
  if (!kbPrice) kbWeight = 0;
  let value;
  if (dealAvg == null) value = Math.round(kbPrice || ref);
  else if (kbWeight > 0 && kbPrice) value = Math.round(dealAvg*(1-kbWeight) + kbPrice*kbWeight);
  else value = dealAvg;

  const cv = dealAvg ? Math.sqrt(kept.reduce((s,x)=>s+(x-dealAvg)**2,0)/used)/dealAvg : 1;
  let conf = 50 + Math.min(used,8)*5 - kbWeight*25 - Math.min(cv,0.15)*100;
  if (!strictMode) conf -= 10; // 완화 모드면 신뢰도 차감
  if (isFallback) conf -= 15;
  conf = Math.max(20, Math.min(95, Math.round(conf)));
  const confLabel = conf >= 75 ? "높음" : conf >= 55 ? "보통" : "낮음";

  const rs = [];
  if (reasons.floor1) rs.push(`1층 ${reasons.floor1}건`);
  if (reasons.lowFloor) rs.push(`저층할인 의심(2~3층) ${reasons.lowFloor}건`);
  if (reasons.banjiha) rs.push(`반지하 ${reasons.banjiha}건`);
  if (reasons.top) rs.push(`최고층 ${reasons.top}건`);
  if (reasons.urgent) rs.push(`${urgentLabel} ${reasons.urgent}건`);
  if (reasons.related) rs.push(`특수관계거래 의심 ${reasons.related}건`);
  if (reasons.dev20) rs.push(`비정상가격(중앙값 ±20% 초과) ${reasons.dev20}건`);
  const excludeText = rs.length ? rs.join(", ") + " 제외" : "";
  const kbNote = kbWeight > 0 ? `KB시세 ${Math.round(kbWeight*100)}% 가중` : "";
  const fallbackNote = isFallback ? "정제 후 0건 → 원본 참고값 사용" : "";
  const strictNote = !strictMode && total > 0 && hasNonFloor1 ? `표본 부족(${total}건) — 급매 포함` : (!strictMode && !hasNonFloor1 && total > 0 ? `표본 부족(${total}건) — 1층만 존재, KB시세 입력 권장` : "");
  const periodNote = usedPeriod > 6 ? `${usedPeriod}개월 확장 사용` : "";
  const parts = [`${total}건(${usedPeriod}개월)`];
  if (excludeText) parts.push(excludeText);
  parts.push(`→ ${used}건 사용`);
  if (fallbackNote) parts.push(fallbackNote);
  if (strictNote) parts.push(strictNote);
  if (periodNote) parts.push(periodNote);
  if (kbNote) parts.push(kbNote);
  const reasonText = parts.join(" · ");

  // floor1Included: 1층이 제외되지 못하고 포함된 경우 (표본이 1층뿐인 경우)
  const floor1Included = !hasNonFloor1 && within.some(d => d.floor === 1);
  return { value, used, excluded: total-used, total, confidence: conf, confLabel, kbWeight, reasonText, usedPeriod, isFallback, strictMode, floor1Included };
}


// ═══════════════════════════════════════════════════════════
// 데이터 신뢰도 점수 (DataTrust) — analyze() 결과 + raw 거래 기반
// ═══════════════════════════════════════════════════════════
function computeDataTrust(r, deals = [], saleDeals = []) {
  const saleUsed   = r.saleUsed  || 0;
  const jeonseUsed = r.jeonseUsed || 0;
  const totalUsed  = saleUsed + jeonseUsed;

  // 최근 거래일 (deals: [{ym:'YYYY-MM'}])
  const allDeals = [...(deals || []), ...(saleDeals || [])];
  const sortedYm = allDeals.map(d => d.ym).filter(Boolean).sort().reverse();
  const latestYm = sortedYm[0] || null;

  // 최근 거래 경과 개월 수
  let monthsAgo = null;
  if (latestYm) {
    // YYYYMM(6자리) 또는 YYYY-MM 둘 다 처리
    const ymStr = String(latestYm).replace('-', '');
    const y = Number(ymStr.slice(0, 4)), m = Number(ymStr.slice(4, 6));
    const now = new Date();
    monthsAgo = (isNaN(y) || isNaN(m)) ? null : (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  }

  // 등급 산정 (A~D)
  let grade, gradeLabel, gradeColor, gradeDesc;
  const freshness = monthsAgo == null ? 0 : monthsAgo <= 3 ? 3 : monthsAgo <= 6 ? 2 : monthsAgo <= 12 ? 1 : 0;
  const sampleScore = totalUsed >= 10 ? 4 : totalUsed >= 6 ? 3 : totalUsed >= 3 ? 2 : totalUsed >= 1 ? 1 : 0;
  const rawScore = Math.round((freshness * 0.4 + sampleScore * 0.6) * 25); // 0~100

  if (rawScore >= 75) {
    grade = 'A'; gradeLabel = '높음';
    gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    gradeDesc = '최근 동일 평형 매매 거래가 충분하여 안정적으로 분석되었습니다.';
  } else if (rawScore >= 50) {
    grade = 'B'; gradeLabel = '보통';
    gradeColor = 'text-amber-700 bg-amber-50 border-amber-200';
    gradeDesc = '최근 거래량이 다소 적어 가격 변동성이 있을 수 있습니다.';
  } else if (rawScore >= 25) {
    grade = 'C'; gradeLabel = '낮음';
    gradeColor = 'text-orange-700 bg-orange-50 border-orange-200';
    gradeDesc = '최근 거래 데이터가 부족하여 분석 가능한 보완 데이터를 함께 활용했습니다. 결과는 참고용으로 활용하시고 실제 시세를 함께 확인하시기 바랍니다.';
  } else {
    grade = 'D'; gradeLabel = '낮음';
    gradeColor = 'text-orange-700 bg-orange-50 border-orange-200';
    gradeDesc = '최근 거래 데이터가 부족하여 분석 가능한 보완 데이터를 함께 활용했습니다. 결과는 참고용으로 활용하시고 실제 시세를 함께 확인하시기 바랍니다.';
  }

  const sufficient = totalUsed >= 5 && (monthsAgo == null || monthsAgo <= 6);

  return {
    grade, gradeLabel, gradeColor, gradeDesc,
    score: rawScore,
    saleUsed, jeonseUsed, totalUsed,
    latestYm, monthsAgo, sufficient,
  };
}

// ── 등급 기준 팝업 컴포넌트 ──
// ── 저장 버튼 컴포넌트 (적정가 / 매수 / 매도) ──

export { computeTrimmedMean, computeDataTrust };
