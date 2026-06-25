// ValueLens Engine — 세금 계산 (취득세, 양도세)
// ★ 계산 로직 수정 금지

function acqStdRate(price) { // 1주택 표준 누진 (6억 이하 1% / 6~9억 1~3% / 9억 초과 3%)
  if (price <= 60000) return 0.01;
  if (price <= 90000) return clamp(Math.round(((price / 10000) * (2 / 3) - 3) / 100 * 1000) / 1000, 0.01, 0.03);
  return 0.03;
}
function acqTax(price, area85over = false, houses = 1, regulated = false, firstTime = false) {
  price = Math.max(0, Number(price) || 0); // 음수·비정상 입력 가드
  let rate;
  if (houses >= 4) rate = 0.12;
  else if (houses >= 3) rate = regulated ? 0.12 : 0.08;
  else if (houses >= 2) rate = regulated ? 0.08 : acqStdRate(price);
  else rate = acqStdRate(price);
  let main = Math.round(price * rate);
  let firstHomeDiscount = 0;
  if (houses <= 1 && firstTime && price <= 120000) { firstHomeDiscount = Math.min(main, 200); main -= firstHomeDiscount; } // 생애최초 200만 한도 감면(개략)
  const edu = rate <= 0.03 ? Math.round(main * 0.1) : Math.round(price * 0.004);            // 지방교육세 개략
  const farm = area85over ? (rate >= 0.08 ? Math.round(price * 0.006) : Math.round(price * 0.002)) : 0; // 농특세(85㎡ 초과)
  return { rate, main, edu, farm, firstHomeDiscount, total: main + edu + farm };
}

// ── 양도세 (1세대 1주택 중심 개략 추정, 만원) — 12억 비과세·거주요건·장특공(보유+거주)·기본공제·지방세·단기중과 ──
function cgTax({ buy, sell, years = 3, oneHouse = true, lived = true, livedYears = null, expenses = 0, acquiredRegulated = false, houses = null }) {
  const hc = houses != null ? houses : (oneHouse ? 1 : 2);
  const is1 = oneHouse && hc <= 1;
  const gain = Math.max(0, sell - buy - (expenses || 0));
  if (gain === 0) return { gain: 0, over: 0, ltd: 0, taxable: 0, baseTax: 0, localTax: 0, tax: 0, exempt: false, statusMsg: "양도차익이 없어 납부할 양도세가 없는 것으로 추정됩니다.", note: "양도차익 없음(필요경비 차감 후)" };
  // 단기 보유 중과 (2년 미만)
  if (years < 2) {
    const rate = years < 1 ? 0.70 : 0.60;
    const taxable = Math.max(0, gain - 250);
    const baseTax = Math.round(taxable * rate), localTax = Math.round(baseTax * 0.1);
    const statusMsg = `보유 ${years}년 — 2년 미만 단기보유 중과세율(${Math.round(rate * 100)}%) 적용 추정`;
    return { gain, over: gain, ltd: 0, taxable, baseTax, localTax, tax: baseTax + localTax, shortTerm: true, exempt: false, statusMsg, note: `${statusMsg} · 지방소득세 10% 포함` };
  }
  const lY = livedYears != null ? livedYears : (lived ? years : 0);
  const meetsLive = !acquiredRegulated || lY >= 2; // 조정대상지역 취득은 2년 거주요건 필요
  const exempt = is1 && years >= 2 && meetsLive && sell <= 120000;
  // 판정 문구
  let statusMsg;
  if (is1 && years >= 2 && sell <= 120000 && !meetsLive) statusMsg = "조정대상지역 취득 주택은 거주요건(2년) 미충족 시 비과세가 제한될 수 있습니다.";
  else if (exempt) statusMsg = "1세대 1주택 12억 이하 비과세 추정";
  else if (is1 && sell > 120000) statusMsg = "12억 초과 고가주택으로 초과분 과세 추정";
  else if (hc >= 2) statusMsg = "다주택자는 중과·일시적 2주택·분양권·입주권 등 예외가 있어 실제 세액 확인이 필요합니다.";
  else statusMsg = "양도차익 과세 추정";
  if (exempt) return { gain, over: 0, ltd: 0, taxable: 0, baseTax: 0, localTax: 0, tax: 0, exempt: true, statusMsg, note: statusMsg };
  // 과세 대상 양도차익 (거주요건 충족 1주택 고가주택은 12억 초과분만, 그 외는 전체)
  const highEnd = is1 && years >= 2 && meetsLive;
  const over = highEnd ? Math.round(gain * Math.max(0, sell - 120000) / sell) : gain;
  // 장기보유특별공제 (거주요건 충족 1주택만 거주공제 포함)
  let ltd;
  if (is1 && meetsLive && years >= 3) ltd = Math.min(0.8, Math.min(years, 10) * 0.04 + Math.min(lY, 10) * 0.04); // 보유4%/년(최대40%) + 거주4%/년(최대40%)
  else if (years >= 3) ltd = Math.min(0.3, (years - 2) * 0.02); // 일반 장특공 (최대 30%)
  else ltd = 0;
  const taxable = Math.max(0, Math.round(over * (1 - ltd) - 250)); // 기본공제 250만
  const br = [[0, 0.06, 0], [1400, 0.15, 126], [5000, 0.24, 576], [8800, 0.35, 1544], [15000, 0.38, 1994], [30000, 0.40, 2594], [50000, 0.42, 3594], [100000, 0.45, 6594]];
  let row = br[0]; for (const b of br) if (taxable >= b[0]) row = b;
  const baseTax = Math.max(0, Math.round(taxable * row[1] - row[2]));
  const localTax = Math.round(baseTax * 0.1); // 지방소득세 10%
  return { gain, over: Math.round(over), ltd, taxable, baseTax, localTax, tax: baseTax + localTax, exempt: false, statusMsg, note: `${statusMsg} · 장특공 ${Math.round(ltd * 100)}% · 지방소득세 10% 포함 추정` };
}

// ── 예산추천 후보 단지 풀 (데모 데이터 · 검증 단지 + 가공) ──

export { acqStdRate, acqTax, cgTax };
