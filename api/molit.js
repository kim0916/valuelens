// 서버리스 함수: 국토교통부 실거래가 공공 API 호출
const SALE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";
const RENT_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRentDev/getRTMSDataSvcAptRentDev";

function parseXmlItems(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  for (const item of itemMatches) {
    const obj = {};
    const fields = item.match(/<(\w+)>([^<]*)<\/\1>/g) || [];
    for (const field of fields) {
      const m = field.match(/<(\w+)>([^<]*)<\/\1>/);
      if (m) obj[m[1]] = m[2].trim();
    }
    items.push(obj);
  }
  return items;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST만 허용" }); return; }

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "MOLIT_API_KEY 없음" }); return; }

  const { type, lawdCd, dealYmd } = req.body || {};
  if (!lawdCd || !dealYmd) { res.status(400).json({ error: "lawdCd, dealYmd 필수" }); return; }

  const baseUrl = type === "rent" ? RENT_URL : SALE_URL;
  const url = `${baseUrl}?serviceKey=${apiKey}&pageNo=1&numOfRows=100&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}`;

  try {
    const r = await fetch(url, { headers: { "Accept": "application/xml" } });
    const text = await r.text();

    // 에러 체크
    if (text.includes("<errMsg>") || text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")) {
      res.status(502).json({ error: "국토부 API 키 오류: " + text.substring(0, 200) });
      return;
    }

    const items = parseXmlItems(text);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    res.status(200).json({ items, totalCount: items.length });
  } catch (e) {
    res.status(502).json({ error: "API 호출 실패: " + (e?.message || String(e)) });
  }
}
