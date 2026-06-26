// ValueLens — AgentCore.js
// Step 1: Goal Inference + Missing Info Detector + Session Memory
// 기존 엔진 연결 금지 — 의도 파악 + 질문 생성만

// ── 1. Session Memory ──
function createSessionMemory() {
  return {
    budget: null,       // "7억", "5억"
    region: null,       // "노원구", "송도"
    purpose: null,      // "buy"|"sell"|"fair"|"reco"|"contract"|"photo"
    complexName: null,  // "은마", "잠실 리센츠"
    area: null,         // "34평", "84㎡"
    buyPrice: null,     // 매도 분석용 매수가
    history: [],        // 대화 히스토리
  };
}

// ── 2. Goal Inference ──
const GOAL_PATTERNS = {
  buy: [
    /사도\s?(될까|될까요|돼|돼\?|좋아|괜찮)/,
    /매수/,/살\s?만해/,/살까/,/살거야/,/매입/,
    /추천\s?(해줘|해|단지|아파트).*?(살|매수)/,
  ],
  sell: [
    /팔아야/,/팔까/,/매도/,/팔\s?만해/,/팔거야/,/언제\s?팔/,
    /지금\s?팔/,/팔\s?때/,
  ],
  fair: [
    /적정가/,/적정\s?가격/,/얼마야/,/얼마임/,/얼마\?/,
    /가격.*?(괜찮|적당|비싼|싼)/,/비싼가/,/싼가/,
    /시세/,/가격\s?알려/,
  ],
  reco: [
    /추천/,/어디가\s?좋/,/어디\s?살/,/어디로/,
    /뭐가\s?좋/,/뭐\s?추천/,/찾아/,/알려줘/,
    /억.*?(어디|추천|살)/,/예산.*?(추천|어디|살)/,
  ],
  contract: [
    /계약서/,/등기부/,/특약/,/위험/,/권리관계/,
    /전세\s?사기/,/확인\s?해줘.*?계약/,
  ],
  photo: [
    /사진/,/이미지/,/찍어/,/올릴게/,/업로드/,
    /ocr/i,/분석.*?사진/,
  ],
  region: [
    /지역.*?(어때|어떠|추이|시장|전망)/,
    /요즘.*?지역/,/지역\s?분석/,/시장.*?(어때|분석)/,
  ],
};

function goalInference(text) {
  const t = text.toLowerCase().replace(/\s+/g, ' ');
  for (const [goal, patterns] of Object.entries(GOAL_PATTERNS)) {
    if (patterns.some(p => p.test(t))) return goal;
  }
  // 숫자+억 패턴 → 예산 추천
  if (/\d+\s*억/.test(t)) return 'reco';
  return 'unknown';
}

// ── 3. Extract Basic Params ──
function extractBasicParams(text) {
  const params = {};

  // 예산 추출: "7억", "5억5천", "15억"
  const budgetMatch = text.match(/(\d+(?:\.\d+)?)\s*억\s*(\d+천)?/);
  if (budgetMatch) {
    const main = parseFloat(budgetMatch[1]);
    const sub = budgetMatch[2] ? parseInt(budgetMatch[2]) * 1000 : 0;
    params.budget = `${main}억${sub ? budgetMatch[2] : ''}`;
    params.budgetNum = main * 10000 + sub;
  }

  // 평형 추출: "34평", "84㎡", "전용 59"
  const areaMatch = text.match(/(\d+)\s*(평|㎡|m2)/);
  if (areaMatch) params.area = `${areaMatch[1]}${areaMatch[2]}`;

  // 지역 추출 (주요 지역명)
  const regions = [
    '강남','서초','송파','강동','마포','용산','성동','광진','노원','도봉',
    '강북','성북','종로','중구','동대문','중랑','강서','양천','구로','금천',
    '영등포','동작','관악','은평','서대문','강동','송도','분당','일산','판교',
    '수원','인천','의정부','안양','부천','광명','성남','하남','과천','청라','검단',
  ];
  for (const r of regions) {
    if (text.includes(r)) { params.region = r; break; }
  }

  // 단지명 추출 (알려진 패턴)
  const complexPatterns = [
    /([가-힣]+\s?(?:래미안|자이|힐스테이트|아이파크|롯데캐슬|푸르지오|e편한세상|더샵|sk뷰|한화포레나|호반베르디움|파크원|리센츠|엘스|트리지움|헬리오시티|올림픽파크|주공|동부|은마|도곡|미래|현대))/i,
    /([가-힣]{2,6}\s?[가-힣]{1,4}(?:아파트|단지|마을))/,
  ];
  for (const p of complexPatterns) {
    const m = text.match(p);
    if (m) { params.complexName = m[1].trim(); break; }
  }

  return params;
}

// ── 4. Missing Info Detector ──
const REQUIRED = {
  buy:      ['complexName'],
  sell:     ['complexName'],
  fair:     ['complexName'],
  reco:     ['budget'],
  contract: [],
  photo:    [],
  region:   ['region'],
  unknown:  [],
};

const MISSING_QUESTIONS = {
  complexName: "분석할 아파트 단지명을 알려주세요.\n예: 잠실 리센츠, 은마, 마포래미안",
  budget:      "예산이 얼마인가요?\n예: 7억, 10억, 5억5천",
  region:      "어떤 지역이 궁금하신가요?\n예: 송도, 노원구, 분당",
  area:        "평형도 알려주시면 더 정확하게 분석해드릴 수 있어요.\n예: 34평, 84㎡",
};

function checkMissingInfo(goal, params, memory) {
  const merged = { ...memory, ...params };
  const required = REQUIRED[goal] || [];
  for (const field of required) {
    if (!merged[field]) return MISSING_QUESTIONS[field];
  }
  return null;
}

// ── 5. Update Memory ──
function updateMemory(memory, params) {
  const updated = { ...memory };
  if (params.budget)      updated.budget      = params.budget;
  if (params.region)      updated.region      = params.region;
  if (params.complexName) updated.complexName = params.complexName;
  if (params.area)        updated.area        = params.area;
  if (params.budgetNum)   updated.budgetNum   = params.budgetNum;
  return updated;
}

// ── 6. Generate AI Response ──
const GOAL_INTROS = {
  buy:      (p, m) => `좋아요. ${p.complexName||m.complexName ? `${p.complexName||m.complexName} 분석을 시작할게요.` : "분석할 아파트를 알려주세요."}\n단지명과 평형을 알려주시면 바로 분석해드릴게요.\n예: 잠실 리센츠 34평`,
  sell:     (p, m) => `매도 타이밍을 같이 살펴볼게요.${p.complexName||m.complexName ? `\n${p.complexName||m.complexName} 기준으로 분석해드릴게요.` : "\n단지명을 알려주세요. 예: 은마아파트"}`,
  fair:     (p, m) => `적정가를 분석해드릴게요.${p.complexName||m.complexName ? `\n${p.complexName||m.complexName} 기준으로 볼게요.` : "\n어떤 단지가 궁금하신가요?"}`,
  reco:     (p, m) => `${p.budget||m.budget ? `${p.budget||m.budget} 예산` : "예산"}으로 추천해드릴게요.\n${m.region||p.region ? `${m.region||p.region} 기준으로 찾아볼게요.` : "원하시는 지역이 있나요?\n예: 송도, 노원, 분당"}`,
  contract: ()     => `계약서를 올려주시면 위험 조항과 확인할 부분을 정리해드릴게요.\nPDF 또는 사진으로 업로드해주세요.`,
  photo:    ()     => `사진을 올려주시면 단지명·호가·면적을 자동으로 읽어 분석해드릴게요.\n아래 📷 버튼을 눌러주세요.`,
  region:   (p, m) => `${p.region||m.region ? `${p.region||m.region}` : "해당 지역"}의 최근 거래 흐름을 살펴볼게요.${!p.region&&!m.region ? "\n어떤 지역이 궁금하신가요?" : ""}`,
  unknown:  ()     => `말씀하신 내용을 분석하고 있어요.\n단지명, 예산, 지역 중 하나를 알려주시면 더 정확하게 도와드릴게요.`,
};

function generateResponse(goal, params, memory, missingQuestion) {
  if (missingQuestion) {
    const intro = {
      buy:      "좋아요, 매수 분석을 도와드릴게요.",
      sell:     "매도 타이밍 같이 살펴볼게요.",
      fair:     "적정가를 분석해드릴게요.",
      reco:     "맞춤 추천을 도와드릴게요.",
      contract: "계약 체크를 도와드릴게요.",
      photo:    "사진 분석을 시작할게요.",
      region:   "지역 분석을 도와드릴게요.",
      unknown:  "말씀하신 내용을 분석하고 있어요.",
    };
    return `${intro[goal]||""}\n\n${missingQuestion}`;
  }
  const fn = GOAL_INTROS[goal] || GOAL_INTROS.unknown;
  return fn(params, memory);
}

// ── 7. Main Process ──
function processUserInput(text, memory) {
  const goal   = goalInference(text);
  const params = extractBasicParams(text);
  const updatedMemory = updateMemory(memory, params);
  updatedMemory.purpose = goal;
  const missing  = checkMissingInfo(goal, params, updatedMemory);
  const response = generateResponse(goal, params, updatedMemory, missing);
  return {
    goal,
    params,
    memory: updatedMemory,
    response,
    needsMoreInfo: !!missing,
    readyToAnalyze: !missing && goal !== 'unknown',
  };
}

export { createSessionMemory, goalInference, extractBasicParams, checkMissingInfo, updateMemory, generateResponse, processUserInput };
