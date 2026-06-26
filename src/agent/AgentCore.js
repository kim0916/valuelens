// ValueLens — AgentCore.js v2
// MVP 30 대표 질문 기반 | goal: buy|fair|reco|contract|loan|region|photo|unknown

function createSessionMemory() {
  return {
    budget: null, budgetNum: null, region: null, purpose: null,
    complexName: null, area: null, buyPrice: null, sellPrice: null,
    houseCount: null, income: null, holdingYears: null, jeonsePrice: null,
    history: [],
  };
}

// 우선순위 순서: contract > loan > buy > fair > reco > region > photo
const GOAL_PATTERNS_ORDERED = [
  ["contract", [/계약서/, /등기부/, /특약/, /전세\s?사기/, /근저당/,
                /위험한\s?부분/, /안전.*?전세/, /전세.*?안전/, /권리관계/]],
  ["loan",     [/취득세/, /양도세/, /종부세/, /보금자리론/, /dsr/i,
                /종합부동산/, /대출/, /얼마.*?받/, /받을\s?수\s?있어/,
                /현금.*?얼마/, /자금/, /세금.*?얼마/]],
  ["buy",      [/사도\s?(될까|될까요|돼|좋아|괜찮)/, /매수/, /살\s?만해/, /살까/, /매입/]],
  ["fair",     [/적정가/, /얼마야/, /얼마임/, /얼마\?/,
                /가격.*?(비싼|싼|적당|괜찮)/, /비싼.*?(거야|거\?)/, /시세/, /전세가율/]],
  ["reco",     [/추천/, /어디가\s?좋/, /찾아줘/, /학군/, /역세권/,
                /살\s?수\s?있어/, /신축.*?없어/, /근처.*?아파트/]],
  ["region",   [/요즘.*?어때/, /집값.*?(떨어|오를)/, /거래량/, /공급.*?과잉/,
                /gtx.*?(오를|전망|개통)/i, /전망.*?어때/, /오를까/, /떨어질까/, /입주.*?물량/]],
  ["photo",    [/사진/, /이미지/, /업로드/, /ocr/i]],
];

function goalInference(text) {
  const t = (text || "").toLowerCase().replace(/\s+/g, " ");
  for (const [goal, patterns] of GOAL_PATTERNS_ORDERED) {
    if (patterns.some(p => p.test(t))) return goal;
  }
  if (/\d+\s*억/.test(t)) return "reco";
  return "unknown";
}

function extractBasicParams(text) {
  const params = {};
  const t = text || "";
  const budgetMatch = t.match(/(\d+(?:\.\d+)?)\s*억\s*(\d+천|\d+000)?/);
  if (budgetMatch) {
    const main = parseFloat(budgetMatch[1]);
    const subStr = budgetMatch[2] || "";
    const sub = subStr.includes("천") ? parseInt(subStr) * 1000 : subStr ? parseInt(subStr) : 0;
    params.budget = `${main}억${subStr}`;
    params.budgetNum = Math.round(main * 10000 + sub);
  }
  const areaMatch = t.match(/(\d+)\s*(평|㎡|m2)/);
  if (areaMatch) params.area = `${areaMatch[1]}${areaMatch[2]}`;
  const regions = ["강남","서초","송파","강동","마포","용산","성동","광진","노원","도봉",
    "강북","성북","종로","중구","동대문","중랑","강서","양천","구로","금천","영등포",
    "동작","관악","은평","서대문","송도","분당","일산","판교","수원","인천",
    "의정부","안양","부천","광명","성남","하남","과천","청라","검단","위례","동탄",
    "평택","고양","용인","화성","시흥"];
  for (const r of regions) {
    if (t.includes(r)) { params.region = r; break; }
  }
  const complexPat = /([가-힣]+\s?(?:래미안|자이|힐스테이트|아이파크|롯데캐슬|푸르지오|더샵|리센츠|엘스|트리지움|헬리오시티|올림픽파크|주공|동부|은마|도곡|현대|파크원))/i;
  const cm = t.match(complexPat);
  if (cm) params.complexName = cm[1].trim();
  const hm = t.match(/(\d)\s*주택/);
  if (hm) params.houseCount = parseInt(hm[1]);
  const prices = [...t.matchAll(/(\d+(?:\.\d+)?)\s*억/g)].map(m => parseFloat(m[1]) * 10000);
  if (prices.length >= 2) { params.buyPrice = Math.min(...prices); params.sellPrice = Math.max(...prices); }
  else if (prices.length === 1 && !params.budgetNum) params.buyPrice = prices[0];
  const holdMatch = t.match(/(\d+)\s*년/);
  if (holdMatch) params.holdingYears = parseInt(holdMatch[1]);
  return params;
}

const REQUIRED = {
  buy: ["complexName"], fair: ["complexName"], reco: ["budget"],
  contract: [], loan: [], region: [], photo: [], unknown: [],
};

const MISSING_QUESTIONS = {
  complexName: "분석할 아파트 단지명을 알려주세요.\n예: 잠실 리센츠, 은마, 마포래미안",
  budget: "예산이 얼마인가요?\n예: 7억, 10억, 5억5천",
  region: "어떤 지역이 궁금하신가요?\n예: 송도, 노원구, 분당",
};

function checkMissingInfo(goal, params, memory) {
  const merged = { ...memory, ...params };
  for (const field of (REQUIRED[goal] || [])) {
    if (!merged[field]) return MISSING_QUESTIONS[field];
  }
  return null;
}

function updateMemory(memory, params) {
  const u = { ...memory };
  if (params.budget)       u.budget       = params.budget;
  if (params.budgetNum)    u.budgetNum    = params.budgetNum;
  if (params.region)       u.region       = params.region;
  if (params.complexName)  u.complexName  = params.complexName;
  if (params.area)         u.area         = params.area;
  if (params.buyPrice)     u.buyPrice     = params.buyPrice;
  if (params.sellPrice)    u.sellPrice    = params.sellPrice;
  if (params.houseCount != null) u.houseCount = params.houseCount;
  if (params.holdingYears) u.holdingYears = params.holdingYears;
  if (params.income)       u.income       = params.income;
  return u;
}

function generateResponse(goal, params, memory, missingQuestion) {
  const m = { ...memory, ...params };
  const raw = (params._rawText || "").toLowerCase();
  const INTROS = {
    buy:      () => m.complexName
      ? `${m.complexName} 매수 판단을 분석할게요.${m.area ? ` ${m.area} 기준입니다.` : "\n평형도 알려주시면 더 정확해요."}`
      : "좋아요, 매수 판단을 도와드릴게요.\n\n분석할 아파트를 알려주세요.\n예: 잠실 리센츠 34평",
    fair:     () => m.complexName
      ? `${m.complexName} 적정가를 분석할게요.${m.area ? ` ${m.area} 기준입니다.` : "\n몇 평형이 궁금하신가요?"}`
      : "적정가를 분석해드릴게요.\n\n어떤 단지가 궁금하신가요?\n예: 은마 34평, 잠실 리센츠 59㎡",
    reco:     () => {
      if (m.budget && m.region) return `${m.budget} 예산, ${m.region} 기준으로 바로 추천해드릴게요.`;
      if (m.budget) return `${m.budget} 예산으로 추천해드릴게요.\n선호 지역이 있으신가요?\n예: 송도, 노원, 분당`;
      return "맞춤 추천을 도와드릴게요.\n\n예산이 얼마인가요? 예: 7억, 10억";
    },
    contract: () => "계약서나 등기부등본을 올려주시면\n위험 조항과 권리관계를 정리해드릴게요.\n\n아래 PDF 또는 사진으로 올려주세요.",
    loan:     () => {
      if (/취득세/.test(raw)) return "취득세를 계산해드릴게요.\n매수 가격과 현재 보유 주택 수를 알려주세요.";
      if (/양도세/.test(raw)) return "양도세를 계산해드릴게요.\n매수가, 매도가, 보유 기간을 알려주세요.";
      if (/종부세|종합부동산/.test(raw)) return "종합부동산세를 계산해드릴게요.\n아파트 공시가격을 알려주세요.";
      if (/보금자리/.test(raw)) return "보금자리론 자격 요건을 확인해드릴게요.\n연소득과 매수 예정 금액을 알려주세요.";
      return "대출 가능 금액을 계산해드릴게요.\n연소득과 현재 보유 자산을 알려주세요.";
    },
    region:   () => m.region
      ? `${m.region} 최근 거래 흐름과 시장 현황을 살펴볼게요.`
      : "시장 흐름을 분석해드릴게요.\n특정 지역이 궁금하신가요? 예: 노원구, 송도, 분당",
    photo:    () => "사진을 올려주시면 단지명·호가·면적을 자동으로 읽어 분석해드릴게요.\n아래 버튼을 눌러주세요.",
    unknown:  () => "말씀하신 내용을 분석하고 있어요.\n단지명, 예산, 지역 중 하나를 알려주시면 바로 도와드릴게요.",
  };
  if (missingQuestion) {
    const prefix = { buy:"좋아요, 매수 판단을 도와드릴게요.", fair:"적정가를 분석해드릴게요.",
      reco:"맞춤 추천을 도와드릴게요.", contract:"계약 안전성을 확인해드릴게요.",
      loan:"자금 계획을 도와드릴게요.", region:"지역 분석을 도와드릴게요.",
      photo:"사진 분석을 시작할게요.", unknown:"도움이 필요하신 내용을 분석하고 있어요." };
    return `${prefix[goal] || ""}\n\n${missingQuestion}`;
  }
  return (INTROS[goal] || INTROS.unknown)();
}

function processUserInput(text, memory) {
  const goal = goalInference(text);
  const params = extractBasicParams(text);
  params._rawText = text;
  const updatedMemory = updateMemory(memory, params);
  updatedMemory.purpose = goal;
  const missing = checkMissingInfo(goal, params, updatedMemory);
  const response = generateResponse(goal, params, updatedMemory, missing);
  return { goal, params, memory: updatedMemory, response, needsMoreInfo: !!missing, readyToAnalyze: !missing && goal !== "unknown" };
}

export { createSessionMemory, goalInference, extractBasicParams, checkMissingInfo, updateMemory, generateResponse, processUserInput };
