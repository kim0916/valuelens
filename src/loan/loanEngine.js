// ValueLens Loan — 대출 계산 엔진
// ★ 계산 로직 수정 금지

function calculateLoanOptions({ price, equity = 0, income = 0, existingPay = 0, noHouse = true, firstHome = false, newlywed = false, years = 30, rateType = "fixed" }) {
  let ltvRate = noHouse ? 0.7 : 0.6;
  if (firstHome) ltvRate = 0.8;
  const ltvCap = Math.round(price * ltvRate);
  const dsrRate = firstHome || newlywed ? 0.45 : 0.4;
  const need = Math.max(0, price - equity);
  const rateAdj = rateType === "variable" ? -0.10 : rateType === "mixed" ? -0.05 : 0; // 변동/혼합 mock 금리 가감
  const banks = [{ name: "A은행", rate: +(3.70 + (newlywed ? -0.15 : 0) + rateAdj).toFixed(2) }, { name: "B은행", rate: +(3.80 + rateAdj).toFixed(2) }, { name: "C은행", rate: +(3.95 + rateAdj).toFixed(2) }].map((b) => {
    const r = b.rate / 100 / 12, n = years * 12;
    const monthlyBudget = Math.max(0, (income * dsrRate) / 12 - existingPay / 12);
    const dsrCap = income > 0 ? Math.round(monthlyBudget * (1 - Math.pow(1 + r, -n)) / r) : ltvCap;
    const loanable = Math.max(0, Math.min(ltvCap, dsrCap));
    const used = Math.min(loanable, need);
    const monthly = used > 0 ? Math.round(used * r / (1 - Math.pow(1 + r, -n))) : 0;
    return { ...b, dsrCap, loanable, used, monthly, totalInterest: Math.max(0, monthly * n - used), ok: loanable >= need };
  });
  const best = banks.filter((b) => b.monthly > 0).sort((a, b) => a.monthly - b.monthly)[0] || banks[0];
  const shortfall = Math.max(0, need - best.loanable);
  // 대출 안정성 점수 (개략): 부족자금·한도 소진율·월상환 부담률 기반
  const util = best.loanable > 0 ? need / best.loanable : 1;
  const monthlyBurden = income > 0 ? (best.monthly * 12) / income : 0.6;
  let stability = 100;
  if (shortfall > 0) stability -= 40;
  stability -= clamp(util, 0, 1.2) * 22;
  stability -= clamp(monthlyBurden, 0, 0.7) * 70;
  stability = clamp(Math.round(stability), 5, 95);
  const stabilityLabel = stability >= 70 ? "안정" : stability >= 45 ? "보통" : "주의";
  return { ltvRate, ltvCap, dsrRate, dsrCap: best.dsrCap, need, banks, best, ok: best.ok, shortfall, stability, stabilityLabel, monthlyBurden: Math.round(monthlyBurden * 100) };
}

// 6. 예산 기반 후보 랭킹 — 핵심 엔진(analyze/매수/매도/세금)은 호출만, 변경 없음
// TODO(API): 웹앱 전환 시 데모 POOL → 실제 단지 DB / 국토부 실거래 / KB시세 / 매물 API 기반 후보군으로 교체

export { calculateLoanOptions };
