// 서버리스 함수: 실시간 주가를 가져온다.
//  - 미국 주식(market=US): Finnhub  (환경변수 FINNHUB_API_KEY 필요)
//  - 한국 주식(market=KR): 야후 파이낸스 (키 불필요, .KS=코스피 / .KQ=코스닥 둘 다 시도)
//
// 브라우저에서 직접 부르면 CORS 로 막히거나 키가 노출되므로, 우리 서버가 대신 부른다.
// 호출 예: /api/quote?ticker=NVDA&market=US   또는   /api/quote?ticker=005930&market=KR
// 응답:    { price: 214.75, currency: "$", source: "Finnhub" }

async function fetchUS(ticker) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("서버에 FINNHUB_API_KEY 가 없습니다.");
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${key}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Finnhub HTTP " + r.status);
  const d = await r.json();
  const price = Number(d && d.c);
  if (!price || !isFinite(price)) return null; // c=0 이면 못 찾은 것
  return { price, currency: "$", source: "Finnhub" };
}

async function yahooChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ValueLens/1.0)" },
  });
  if (!r.ok) return null;
  const d = await r.json();
  const meta = d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
  const price = meta && Number(meta.regularMarketPrice);
  if (!price || !isFinite(price)) return null;
  return { price, currency: "₩", source: "Yahoo Finance" };
}

async function fetchKR(ticker) {
  // 6자리 숫자 코드면 코스피(.KS)부터, 안 되면 코스닥(.KQ) 시도.
  const clean = String(ticker).replace(/\.(KS|KQ)$/i, "");
  for (const suffix of [".KS", ".KQ"]) {
    const out = await yahooChart(clean + suffix);
    if (out) return out;
  }
  return null;
}

export default async function handler(req, res) {
  const ticker = (req.query && req.query.ticker) || "";
  let market = (req.query && req.query.market) || "";

  if (!ticker) {
    res.status(400).json({ error: "ticker 파라미터가 필요합니다." });
    return;
  }
  // market 이 없으면 추정: 6자리 숫자 = 한국, 그 외 = 미국
  if (!market) market = /^\d{4,6}$/.test(String(ticker)) ? "KR" : "US";

  try {
    const out = market === "KR" ? await fetchKR(ticker) : await fetchUS(ticker);
    if (!out) {
      res.status(404).json({ error: "시세를 찾지 못했습니다: " + ticker });
      return;
    }
    // 너무 자주 안 부르도록 1분 캐시(선택)
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json(out);
  } catch (e) {
    res.status(502).json({ error: "시세 호출 실패: " + (e && e.message ? e.message : String(e)) });
  }
}
