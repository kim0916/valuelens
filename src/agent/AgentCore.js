// ValueLens — AgentCore.js v3
// status: "missing" | "ready" | "guide" | "unknown" | "error"

function createSessionMemory() {
  return {
    budget: null, budgetNum: null, region: null, purpose: null,
    complexName: null, area: null, buyPrice: null, sellPrice: null,
    houseCount: null, income: null, holdingYears: null, history: [],
  };
}

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
                /gtx.*?(오를|전망|개통)/i, /전망.*?어때/, /오를까/, /떨어질까/,
                /입주.*?물량/, /어때$/, /어때\?/]],
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
  const bm = t.match(/(\d+(?:\.\d+)?)\s*억\s*(\d+천|\d+000)?/);
  if (bm) {
    const main = parseFloat(bm[1]);
    const subStr = bm[2] || "";
    const sub = subStr.includes("천") ? parseInt(subStr)*1000 : subStr ? parseInt(subStr) : 0;
    params.budget = `${main}억${subStr}`;
    params.budgetNum = Math.round(main*10000+sub);
  }
  const am = t.match(/(\d+)\s*(평|㎡|m2)/);
  if (am) params.area = `${am[1]}${am[2]}`;
  const regions = ["강남","서초","송파","강동","마포","용산","성동","노원","도봉","강북",
    "성북","종로","중구","강서","양천","구로","영등포","동작","관악","은평","서대문",
    "송도","분당","일산","판교","수원","인천","의정부","안양","부천","광명","성남",
    "하남","과천","청라","검단","위례","동탄","평택","고양","용인","화성","시흥"];
  for (const r of regions) { if (t.includes(r)) { params.region = r; break; } }
  const cp = /([가-힣]+\s?(?:래미안|자이|힐스테이트|아이파크|롯데캐슬|푸르지오|더샵|리센츠|엘스|트리지움|헬리오시티|올림픽파크|주공|동부|은마|도곡|현대|파크원|아이원|센트럴|이편한|e편한))/i;
  const cm = t.match(cp);
  if (cm) params.complexName = cm[1].trim();
  const hm = t.match(/(\d)\s*주택/);
  if (hm) params.houseCount = parseInt(hm[1]);
  const prices = [...t.matchAll(/(\d+(?:\.\d+)?)\s*억/g)].map(m=>parseFloat(m[1])*10000);
  if (prices.length>=2) { params.buyPrice=Math.min(...prices); params.sellPrice=Math.max(...prices); }
  else if (prices.length===1 && !params.budgetNum) params.buyPrice=prices[0];
  const ho = t.match(/(\d+)\s*년/);
  if (ho) params.holdingYears = parseInt(ho[1]);
  return params;
}

// ── Missing 체크 ──
function checkMissing(goal, params, memory) {
  const m = { ...memory, ...params };
  // buy/fair: 단지명 + 평형 필요
  if (goal === "buy" || goal === "fair") {
    if (!m.complexName) return "분석할 아파트 단지명을 알려주세요.\n예: 잠실 리센츠 34평, 은마아파트";
    if (!m.area) return `좋아요. ${m.complexName}를 분석해드릴게요.\n몇 평 기준으로 볼까요? 예: 25평, 34평, 59㎡`;
  }
  // reco: 예산 필요, 예산 있어도 지역 없으면 질문
  if (goal === "reco") {
    if (!m.budget) return "예산이 얼마인가요?\n예: 7억, 10억, 5억5천";
    if (!m.region) return "어떤 지역이 궁금하신가요?\n예: 송도, 노원구, 분당, 마포";
  }
  return null;
}

// ── Guide 메시지 (contract/region/photo) ──
function getGuideMessage(goal, params, memory) {
  const m = { ...memory, ...params };
  if (goal === "contract")
    return "계약서나 등기부등본을 올려주시면\n위험 조항과 권리관계를 정리해드릴게요.\n\n아래 📄 PDF 또는 📷 사진으로 올려주세요.";
  if (goal === "photo")
    return "사진을 올려주시면 단지명·호가·면적을 자동으로 읽어 분석해드릴게요.\n아래 📷 버튼을 눌러주세요.";
  if (goal === "region")
    return m.region
      ? `${m.region} 최근 거래 흐름과 시장 현황을 살펴볼게요.\n현재 실시간 시장 데이터 연동 준비 중입니다.`
      : "어떤 지역이 궁금하신가요?\n예: 노원구, 송도, 분당, 마포";
  return null;
}

// ── 메모리 업데이트 ──
function updateMemory(memory, params, goal) {
  const u = { ...memory };
  if (params.budget)      u.budget      = params.budget;
  if (params.budgetNum)   u.budgetNum   = params.budgetNum;
  if (params.region)      u.region      = params.region;
  if (params.complexName) u.complexName = params.complexName;
  if (params.area)        u.area        = params.area;
  if (params.buyPrice)    u.buyPrice    = params.buyPrice;
  if (params.sellPrice)   u.sellPrice   = params.sellPrice;
  if (params.houseCount != null) u.houseCount = params.houseCount;
  if (params.holdingYears) u.holdingYears = params.holdingYears;
  if (goal && goal !== "unknown") u.purpose = goal;
  return u;
}

// ── 메인 함수 — status 명확히 반환 ──
function processUserInput(text, memory) {
  const rawGoal = goalInference(text);
  const params  = extractBasicParams(text);
  params._rawText = text;

  // unknown이면 이전 goal 유지
  const goal = rawGoal !== "unknown"
    ? rawGoal
    : (memory.purpose || "unknown");

  const updatedMemory = updateMemory(memory, params, goal);

  // guide 목적 (contract/photo/region)
  if (goal === "contract" || goal === "photo" || goal === "region") {
    const guide = getGuideMessage(goal, params, updatedMemory);
    return {
      status: "guide", goal, params,
      memory: updatedMemory,
      message: guide || "안내 메시지를 준비 중입니다.",
      readyToAnalyze: false,
    };
  }

  // unknown
  if (goal === "unknown") {
    return {
      status: "unknown", goal, params,
      memory: updatedMemory,
      message: "말씀하신 내용을 이해하지 못했어요.\n단지명, 예산, 지역 중 하나를 포함해서 다시 말씀해주세요.",
      readyToAnalyze: false,
    };
  }

  // missing 체크
  const missingMsg = checkMissing(goal, params, updatedMemory);
  if (missingMsg) {
    return {
      status: "missing", goal, params,
      memory: updatedMemory,
      message: missingMsg,
      readyToAnalyze: false,
    };
  }

  // loan 세부 안내
  if (goal === "loan") {
    const raw = text.toLowerCase();
    let loanMsg = "대출 가능 금액을 계산해드릴게요.\n연소득과 현재 보유 자산을 알려주세요.";
    if (/취득세/.test(raw)) loanMsg = "취득세를 계산할게요. 매수 가격과 보유 주택 수를 알려주세요.";
    else if (/양도세/.test(raw)) loanMsg = "양도세를 계산할게요. 매수가, 매도가, 보유 기간을 알려주세요.";
    else if (/종부세|종합부동산/.test(raw)) loanMsg = "종합부동산세를 계산할게요. 공시가격을 알려주세요.";
    else if (/보금자리/.test(raw)) loanMsg = "보금자리론 자격 요건을 확인해드릴게요. 연소득과 매수 금액을 알려주세요.";
    return {
      status: "ready", goal, params,
      memory: updatedMemory,
      message: loanMsg,
      readyToAnalyze: true,
    };
  }

  // ready
  return {
    status: "ready", goal, params,
    memory: updatedMemory,
    message: null,
    readyToAnalyze: true,
  };
}

export {
  createSessionMemory, goalInference, extractBasicParams,
  checkMissing, updateMemory, processUserInput,
};
