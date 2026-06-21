// 서버리스 함수: 국토교통부 실거래가 공공 API 호출
// - 아파트 매매 실거래: getRTMSDataSvcAptTradeDev
// - 아파트 전월세 실거래: getRTMSDataSvcAptRentDev
// 환경변수: MOLIT_API_KEY (공공데이터포털 인증키)
//
// 호출 예:
//   POST /api/molit
//   body: { type: "sale"|"rent", lawdCd: "11350", dealYmd: "202506" }
// 응답: { items: [...] }

const SALE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";
const RENT_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRentDev/getRTMSDataSvcAptRentDev";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST만 허용" });
    return;
  }

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "MOLIT_API_KEY 환경변수 없음" });
    return;
  }

  const { type, lawdCd, dealYmd } = req.body || {};
  if (!lawdCd || !dealYmd) {
    res.status(400).json({ error: "lawdCd, dealYmd 필수" });
    return;
  }

  const baseUrl = type === "rent" ? RENT_URL : SALE_URL;
  const url = `${baseUrl}?serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=100&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&_type=json`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      res.status(502).json({ error: "국토부 API 오류: " + r.status });
      return;
    }
    const data = await r.json();
    const body = data?.response?.body;
    const items = body?.items?.item;
    const list = items ? (Array.isArray(items) ? items : [items]) : [];

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    res.status(200).json({ items: list, totalCount: body?.totalCount || 0 });
  } catch (e) {
    res.status(502).json({ error: "API 호출 실패: " + (e?.message || String(e)) });
  }
}
