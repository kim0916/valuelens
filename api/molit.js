const SALE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
const RENT_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : "";
}

function parseXmlItems(xml) {
  const items = [];
  const matches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const item of matches) {
    items.push({
      // 매매 API: 영문 태그
      // 전세 API: 한글 태그 — 둘 다 파싱해서 빈 값이면 한글 태그로 fallback
      aptNm:       getTag(item, "aptNm")       || getTag(item, "아파트"),
      dealAmount:  getTag(item, "dealAmount"),
      dealYear:    getTag(item, "dealYear")    || getTag(item, "년"),
      dealMonth:   getTag(item, "dealMonth")   || getTag(item, "월"),
      excluUseAr:  getTag(item, "excluUseAr")  || getTag(item, "전용면적"),
      floor:       getTag(item, "floor")       || getTag(item, "층"),
      buildYear:   getTag(item, "buildYear")   || getTag(item, "건축년도"),
      umdNm:       getTag(item, "umdNm")       || getTag(item, "법정동"),
      sggCd:       getTag(item, "sggCd")       || getTag(item, "지역코드"),
      deposit:     getTag(item, "deposit")     || getTag(item, "보증금액"),
      monthlyRent: getTag(item, "monthlyRent") || getTag(item, "월세금액"),
    });
  }
  return items;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST만 허용" }); return; }

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "MOLIT_API_KEY 없음" }); return; }

  const { type, lawdCd, dealYmd } = req.body || {};

  // ── 단지명 자동완성 ──
  if (type === "complexList") {
    if (!lawdCd) { res.status(400).json({ error: "lawdCd 필수" }); return; }
    const { complexName } = req.body || {};
    const now = new Date();
    const months = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}`;
    });
    try {
      const texts = await Promise.all(
        months.map(ym =>
          fetch(`${SALE_URL}?serviceKey=${apiKey}&pageNo=1&numOfRows=1000&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}`, {
            headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.data.go.kr/", "Accept": "application/xml,*/*" }
          }).then(r => r.text())
        )
      );
      const allItems = texts.flatMap(t => parseXmlItems(t));
      const keyword = String(complexName || "").replace(/\s/g, "").toLowerCase();
      const nameSet = new Set();
      allItems.forEach(i => { if (i.aptNm) nameSet.add(i.aptNm.trim()); });
      let list = Array.from(nameSet).sort();
      if (keyword) list = list.filter(n => n.replace(/\s/g,"").toLowerCase().includes(keyword));
      res.setHeader("Cache-Control", "s-maxage=3600");
      res.status(200).json({ list });
    } catch(e) {
      res.status(502).json({ error: "단지 목록 조회 실패: " + (e?.message || String(e)) });
    }
    return;
  }

  // ── 매매/전세 실거래 조회 ──
  // 서버는 lawdCd + dealYmd 기준으로만 데이터 반환
  // 단지명/면적/법정동 필터는 클라이언트 전담
  if (!lawdCd || !dealYmd) { res.status(400).json({ error: "lawdCd, dealYmd 필수" }); return; }
  if (type !== "sale" && type !== "rent") { res.status(400).json({ error: "type은 sale 또는 rent" }); return; }

  const baseUrl = type === "rent" ? RENT_URL : SALE_URL;
  const url = `${baseUrl}?serviceKey=${apiKey}&pageNo=1&numOfRows=1000&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}`;

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
    res.status(200).json({ items, totalCount: items.length });
  } catch (e) {
    res.status(502).json({ error: "API 호출 실패: " + (e?.message || String(e)) });
  }
}
