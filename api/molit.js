const SALE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
const RENT_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";
const COMPLEX_URL = "https://apis.data.go.kr/1613000/AptBasisInfoService1/getAptBasisInfo";

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : "";
}

function parseXmlItems(xml) {
  const items = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const item of itemMatches) {
    // 매매 API: 영문 태그 (dealAmount, dealYear, dealMonth, excluUseAr, floor, buildYear, aptNm, umdNm, sggCd)
    // 전세 API: 한글 태그 (보증금액, 년, 월, 전용면적, 층, 건축년도, 아파트, 법정동, 지역코드, 월세금액)
    items.push({
      aptNm:       getTag(item, "aptNm")      || getTag(item, "아파트"),
      dealAmount:  getTag(item, "dealAmount"),
      dealYear:    getTag(item, "dealYear")   || getTag(item, "년"),
      dealMonth:   getTag(item, "dealMonth")  || getTag(item, "월"),
      excluUseAr:  getTag(item, "excluUseAr") || getTag(item, "전용면적"),
      floor:       getTag(item, "floor")      || getTag(item, "층"),
      buildYear:   getTag(item, "buildYear")  || getTag(item, "건축년도"),
      umdNm:       getTag(item, "umdNm")      || getTag(item, "법정동"),
      sggCd:       getTag(item, "sggCd")      || getTag(item, "지역코드"),
      siGunGu:     getTag(item, "siGunGu")    || getTag(item, "sggNm"),
      deposit:     getTag(item, "deposit")    || getTag(item, "보증금액"),
      monthlyRent: getTag(item, "monthlyRent")|| getTag(item, "월세금액"),
    });
  }
  return items;
}

// 단지명 유사도 매칭 (공백 제거 후 포함 여부)
function matchComplex(aptNm, complexName) {
  if (!complexName) return true;
  const a = String(aptNm || "").replace(/\s/g, "");
  const c = String(complexName).replace(/\s/g, "");
  // 완전 일치만 허용 — 자동완성에서 선택한 exactAptNm과 동일해야 함
  return a === c;
}

// 면적 유사도 매칭 (±2㎡ 허용)
function matchArea(excluUseAr, targetArea) {
  if (!targetArea || Number(targetArea) <= 0) return true;
  const a = parseFloat(excluUseAr) || 0;
  const t = parseFloat(targetArea) || 0;
  return Math.abs(a - t) <= 2.0;
}

// 실거래 데이터에서 대표 면적 목록 추출 (±2㎡ 그룹핑)
function extractAreaOptions(items, complexName) {
  // 1. 단지명 필터 후 면적별 거래건수 집계
  const areaCount = new Map(); // 면적값 → 건수
  for (const item of items) {
    if (!matchComplex(item.aptNm, complexName)) continue;
    const ar = parseFloat(item.excluUseAr);
    if (!ar || ar <= 0) continue;
    const key = Math.round(ar * 100) / 100;
    areaCount.set(key, (areaCount.get(key) || 0) + 1);
  }
  if (areaCount.size === 0) return [];

  // 2. ±2㎡ 이내 그룹핑 — 거래 많은 면적이 대표
  const areas = Array.from(areaCount.keys()).sort((a, b) => a - b);
  const groups = []; // [{ rep, min, max, count }]

  for (const ar of areas) {
    const cnt = areaCount.get(ar);
    // 기존 그룹에 속하는지 확인 (대표값 기준 ±2㎡)
    const existingGroup = groups.find(g => Math.abs(ar - g.rep) <= 2);
    if (existingGroup) {
      existingGroup.min = Math.min(existingGroup.min, ar);
      existingGroup.max = Math.max(existingGroup.max, ar);
      existingGroup.total += cnt;
      // 더 많이 거래된 면적을 대표로
      if (cnt > existingGroup.repCount) {
        existingGroup.rep = ar;
        existingGroup.repCount = cnt;
      }
    } else {
      groups.push({ rep: ar, min: ar, max: ar, total: cnt, repCount: cnt });
    }
  }

  // 3. 오름차순 정렬 후 반환
  return groups
    .sort((a, b) => a.rep - b.rep)
    .map(g => ({
      areaSqm: Math.round(g.rep * 100) / 100,
      minSqm: g.min,
      maxSqm: g.max,
    }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST만 허용" }); return; }

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "MOLIT_API_KEY 없음" }); return; }

  const { type, lawdCd, dealYmd, complexName, targetArea, targetDong } = req.body || {};

  // ── 단지 정보 조회 (면적 목록) ──
  if (type === "complex") {
    if (!lawdCd) { res.status(400).json({ error: "lawdCd 필수" }); return; }
    const url = `${COMPLEX_URL}?serviceKey=${apiKey}&lawdCd=${lawdCd}&pageNo=1&numOfRows=100`;
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.data.go.kr/", "Accept": "application/xml, text/xml, */*" }
      });
      const text = await r.text();
      const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
      const complexItems = itemMatches.map(item => ({
        aptNm: getTag(item, "aptNm") || getTag(item, "kaptName"),
        buildYear: getTag(item, "kaptdaYear") || getTag(item, "buildYear"),
        totalHousehold: getTag(item, "kaptdaCnt"),
        excluUseAr: getTag(item, "excluUseAr"),
        kaptCode: getTag(item, "kaptCode"),
      }));
      const filtered = complexName
        ? complexItems.filter(i => matchComplex(i.aptNm, complexName))
        : complexItems;
      res.setHeader("Cache-Control", "s-maxage=86400");
      res.status(200).json({ items: filtered });
    } catch (e) {
      res.status(502).json({ error: "단지정보 API 실패: " + (e?.message || String(e)) });
    }
    return;
  }

  // ── 단지명 자동완성 (최근 3개월 실거래에서 단지 목록 추출) ──
  if (type === "complexList") {
    if (!lawdCd) { res.status(400).json({ error: "lawdCd 필수" }); return; }
    const now = new Date();
    const months = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}`;
    });
    try {
      const fetches = months.map(ym =>
        fetch(`${SALE_URL}?serviceKey=${apiKey}&pageNo=1&numOfRows=100&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}`, {
          headers: { "User-Agent":"Mozilla/5.0", "Referer":"https://www.data.go.kr/", "Accept":"application/xml,*/*" }
        })
      );
      const texts = await Promise.all((await Promise.all(fetches)).map(r => r.text()));
      const allItems = texts.flatMap(t => parseXmlItems(t));
      // 단지명 목록 (중복 제거, 키워드 필터)
      const keyword = String(complexName||"").replace(/\s/g,"").toLowerCase();
      const nameSet = new Set();
      allItems.forEach(i => { if (i.aptNm) nameSet.add(i.aptNm.trim()); });
      let list = Array.from(nameSet).sort();
      if (keyword) list = list.filter(n => n.replace(/\s/g,"").toLowerCase().includes(keyword));
      res.setHeader("Cache-Control","s-maxage=3600");
      res.status(200).json({ list });
    } catch(e) {
      res.status(502).json({ error:"단지 목록 조회 실패: "+(e?.message||String(e)) });
    }
    return;
  }

  // ── 면적 목록 조회 (실거래에서 추출) ──
  // type === "areas" : 최근 6개월 매매+전세 실거래에서 단지 면적 목록 추출
  if (type === "areas") {
    if (!lawdCd) { res.status(400).json({ error: "lawdCd 필수" }); return; }

    // 최근 12개월 YYYYMM 생성
    const now = new Date();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(ym);
    }

    try {
      // 매매 + 전세 병렬 조회 — 전체 12개월
      const recentMonths = months;
      const fetches = recentMonths.flatMap(ym => [
        fetch(`${SALE_URL}?serviceKey=${apiKey}&pageNo=1&numOfRows=100&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}`, {
          headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.data.go.kr/", "Accept": "application/xml, text/xml, */*" }
        }),
        fetch(`${RENT_URL}?serviceKey=${apiKey}&pageNo=1&numOfRows=100&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}`, {
          headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.data.go.kr/", "Accept": "application/xml, text/xml, */*" }
        }),
      ]);

      const responses = await Promise.all(fetches);
      const texts = await Promise.all(responses.map(r => r.text()));
      const allItems = texts.flatMap(t => parseXmlItems(t));

      const areaOptions = extractAreaOptions(allItems, complexName);

      // 면적 없으면 6개월치 전체 재시도
      if (areaOptions.length === 0) {
        const fetches2 = months.flatMap(ym => [
          fetch(`${SALE_URL}?serviceKey=${apiKey}&pageNo=1&numOfRows=100&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}`, {
            headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.data.go.kr/", "Accept": "application/xml, text/xml, */*" }
          }),
        ]);
        const r2 = await Promise.all(fetches2);
        const t2 = await Promise.all(r2.map(r => r.text()));
        const items2 = t2.flatMap(t => parseXmlItems(t));
        const areaOptions2 = extractAreaOptions(items2, complexName);
        res.setHeader("Cache-Control", "s-maxage=3600");
        res.status(200).json({ areaOptions: areaOptions2, totalDeals: items2.length });
        return;
      }

      res.setHeader("Cache-Control", "s-maxage=3600");
      res.status(200).json({ areaOptions, totalDeals: allItems.length });
    } catch (e) {
      res.status(502).json({ error: "면적 조회 실패: " + (e?.message || String(e)) });
    }
    return;
  }

  // ── 매매/전세 실거래 조회 ──
  if (!lawdCd || !dealYmd) { res.status(400).json({ error: "lawdCd, dealYmd 필수" }); return; }

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
    let items = parseXmlItems(text);

    // 단지명 필터
    if (complexName) items = items.filter(i => matchComplex(i.aptNm, complexName));

    // 법정동 필터 — 같은 이름 다른 단지 구분 (targetDong 있을 때만)
    if (targetDong) {
      const tDong = String(targetDong).replace(/\s/g, "");
      const filtered = items.filter(i => {
        const iDong = String(i.umdNm || "").replace(/\s/g, "");
        return iDong === tDong || iDong.includes(tDong) || tDong.includes(iDong);
      });
      // 필터 결과가 있을 때만 적용 (없으면 단지명 필터 결과 유지)
      if (filtered.length > 0) items = filtered;
    }

    // 면적 필터 (±2㎡ 허용) — targetArea 있을 때만
    if (targetArea && Number(targetArea) > 0) {
      items = items.filter(i => matchArea(i.excluUseAr, targetArea));
    }

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    res.status(200).json({ items, totalCount: items.length });
  } catch (e) {
    res.status(502).json({ error: "API 호출 실패: " + (e?.message || String(e)) });
  }
}


