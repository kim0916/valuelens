const SALE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";
const RENT_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";
const COMPLEX_URL = "https://apis.data.go.kr/1613000/AptBasisInfoService1/getAptBasisInfo";

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : "";
}

function parseXmlItems(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  for (const item of itemMatches) {
    items.push({
      aptNm: getTag(item, "aptNm"),
      dealAmount: getTag(item, "dealAmount"),
      dealYear: getTag(item, "dealYear"),
      dealMonth: getTag(item, "dealMonth"),
      excluUseAr: getTag(item, "excluUseAr"),
      floor: getTag(item, "floor"),
      buildYear: getTag(item, "buildYear"),
      umdNm: getTag(item, "umdNm"),
      sggCd: getTag(item, "sggCd"),
      siGunGu: getTag(item, "siGunGu") || getTag(item, "sggNm"),
      deposit: getTag(item, "deposit"),
      monthlyRent: getTag(item, "monthlyRent"),
    });
  }
  return items;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST만 허용" }); return; }

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "MOLIT_API_KEY 없음" }); return; }

  const { type, lawdCd, dealYmd, complexName } = req.body || {};

  // ── 단지 정보 조회 (면적 목록) ──
  if (type === "complex") {
    if (!lawdCd) { res.status(400).json({ error: "lawdCd 필수" }); return; }
    const url = `${COMPLEX_URL}?serviceKey=${apiKey}&lawdCd=${lawdCd}&pageNo=1&numOfRows=100`;
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.data.go.kr/", "Accept": "application/xml, text/xml, */*" }
      });
      const text = await r.text();
      // 단지정보 API는 item 태그 안에 다른 필드명 사용
      const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const complexItems = itemMatches.map(item => ({
        aptNm: getTag(item, "aptNm") || getTag(item, "kaptName"),
        buildYear: getTag(item, "kaptdaYear") || getTag(item, "buildYear"),
        totalHousehold: getTag(item, "kaptdaCnt"),
        excluUseAr: getTag(item, "excluUseAr"),
        kaptCode: getTag(item, "kaptCode"),
      }));
      // 단지명 필터
      const filtered = complexName
        ? complexItems.filter(i => { const n = String(i.aptNm||"").replace(/\s/g,""); const c = String(complexName).replace(/\s/g,""); return n.includes(c)||c.includes(n); })
        : complexItems;
      res.setHeader("Cache-Control", "s-maxage=86400");
      res.status(200).json({ items: filtered, raw: text.substring(0, 800) });
    } catch (e) {
      res.status(502).json({ error: "단지정보 API 실패: " + (e?.message || String(e)) });
    }
    return;
  }

  const baseUrl = type === "rent" ? RENT_URL : SALE_URL;
  const url = `${baseUrl}?serviceKey=${apiKey}&pageNo=1&numOfRows=100&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}`;

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.data.go.kr/",
        "Accept": "application/xml, text/xml, */*",
      }
    });
    const text = await r.text();

    const items = parseXmlItems(text);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    res.status(200).json({ items, totalCount: items.length, raw: text.substring(0, 800) });
  } catch (e) {
    res.status(502).json({ error: "API 호출 실패: " + (e?.message || String(e)) });
  }
}
