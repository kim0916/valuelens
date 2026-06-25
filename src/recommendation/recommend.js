// ValueLens Recommendation — 예산 기반 추천 엔진
// ★ 계산 로직 수정 금지

function recommendByBudget({ budget, region = "전체", pyeong = 0, prefs = [] }) {
  const B = budget;
  return POOL
    .filter((c) => !region || region === "전체" || c.region.includes(region) || c.dong.includes(region) || region.includes(c.region) || region.includes(c.dong))
    .filter((c) => !pyeong || Math.abs(c.pyeong - pyeong) <= 7)
    .filter((c) => c.cur <= B * 1.05)
    .map((c) => {
      const s = scorePool(c);
      const fs = { region: c.region, dong: c.dong, complexName: c.name, buildYear: c.buildYear, pyeong: c.pyeong };
      const living = calculateLivingScore(fs), supply = calculateSupplyRisk(fs), pos = calculatePositiveFactors(fs), neg = calculateNegativeFactors(fs);
      const dataConf = c.conf === "높음" ? 85 : 60;
      const isPremium = c.redev || c.jr < 0.35 || PRIME_REGIONS.includes(c.region);
      const marketType = c.redev ? "재건축형" : c.jr < 0.35 ? "투자수요형" : PRIME_REGIONS.includes(c.region) ? "프리미엄형" : "일반";
      // 시장 위험도 (후보용 등급) — 핵심 엔진 marketRisk와 별개, 후보 표시용
      const mrScore = c.jr < 0.30 ? 78 : c.redev ? 68 : PRIME_REGIONS.includes(c.region) ? 58 : c.jr < 0.45 ? 48 : 28;
      const mrLevel = mrScore >= 70 ? "매우높음" : mrScore >= 55 ? "높음" : mrScore >= 38 ? "보통" : "낮음";
      // 예산 적합도: 예산 이하면 충분히 살 수 있음(고점), 예산 초과만 감점. (이전엔 싼 단지도 감점 → 수정)
      const budgetFit = c.cur > B
        ? Math.round(clamp(100 - ((c.cur - B) / B) * 220, 0, 100))
        : Math.round(clamp(100 - Math.max(0, (B - c.cur) / B - 0.2) * 70, 55, 100));
      const priceAttract = clamp(Math.round(s.undervalue * 100 + 50), 0, 100); // 가격 매력도(=가격 여력)
      const gapPos = s.undervalue > 0.03 ? "저평가" : s.undervalue < -0.03 ? "고평가" : "적정";
      // 매수 판단 (기존 엔진 grade·LABEL 재사용 — 가격 기준 라벨, 엔진 변경 없음)
      const gapR = -s.undervalue; // (현재가 − 적정가)/적정가
      const buyGrade = gapR <= CONFIG.grade.A ? "A" : gapR <= CONFIG.grade.B ? "B" : gapR <= CONFIG.grade.C ? "C" : gapR <= CONFIG.grade.D ? "D" : "E";
      const buyLabel = LABEL[buyGrade];
      let prefBonus = 0;
      if (prefs.includes("역세권") && living.items.교통 >= 80) prefBonus += 7;
      if (prefs.includes("학군") && living.items.학군 >= 85) prefBonus += 7;
      if (prefs.includes("저평가") && s.undervalue > 0.02) prefBonus += 7;
      if (prefs.includes("재건축") && c.redev) prefBonus += 7;
      if (prefs.includes("신축") && c.age <= 10) prefBonus += 7;
      if (prefs.includes("전세가율") && c.jr >= 0.55) prefBonus += 7;
      if (prefs.includes("호재") && pos.score >= 70) prefBonus += 7;
      // 랭킹: 예산적합25 · 가격매력20 · 실거주20 · 시장위험낮음15 · 공급위험낮음10 · 데이터신뢰10
      const ranking = Math.round(budgetFit * 0.25 + priceAttract * 0.20 + living.total * 0.20 + (100 - mrScore) * 0.15 + (100 - supply.score) * 0.10 + dataConf * 0.10 + prefBonus);
      // 후보 이유 3개 (조건 적합 근거)
      const reasons = [
        `예산 적합도 ${budgetFit}점 · 현재가 ${won(c.cur)} (예산 ${won(B)} 대비)`,
        `엔진 산출 적정가 ${won(c.fair)} 대비 ${gapPos} · 가격 여력 ${priceAttract}점 · 실거주 ${living.total}점`,
        `호재 「${pos.list[0] || "-"}」${pos.list[1] ? ` · 「${pos.list[1]}」` : ""}`,
      ];
      // 주의 이유 2개
      const cautions = [];
      if (mrLevel === "높음" || mrLevel === "매우높음") cautions.push(`시장 위험도 ${mrLevel} — ${marketType === "재건축형" ? "재건축 사업·분담금 변동성" : marketType === "투자수요형" ? "실수요 대비 투자수요 의존" : "가격 변동성"} 유의`);
      if (supply.level === "높음") cautions.push(`공급 위험 높음 — ${supply.factors[0]}`);
      if (s.undervalue < -0.02) cautions.push("엔진 산출 적정가 대비 다소 높은 가격");
      if (neg.list[0]) cautions.push(`악재 「${neg.list[0]}」`);
      while (cautions.length < 2) cautions.push("일반적인 시장·금리 변동 가능성");
      const risky = mrLevel === "매우높음" || mrLevel === "높음" || supply.level === "높음";
      return { ...c, ...s, living, supply, pos, neg, dataConf, budgetFit, priceAttract, gapPos, buyGrade, buyLabel, mrScore, mrLevel, ranking, reasons, cautions: cautions.slice(0, 2), isPremium, marketType, risky };
    })
    .sort((a, b) => b.ranking - a.ranking);
}


// 기준 전세가 = 중개사 실무식 정제평균(Trimmed Mean)
// 최근 12개월 실거래 → 구조적/이상 거래 제외 → 평균 → 표본 적으면 KB 가중
// 전세·매매 공용 정제평균(Trimmed Mean) 산정
// 최근 12개월 실거래 → 구조적/이상 거래 제외 → 평균 → 표본 적으면 KB시세 가중

export { recommendByBudget };
