/**
 * scripts/qa_100.js — ValueLens 전국 아파트 100개 자동 QA
 *
 * 실행: node scripts/qa_100.js [--url http://localhost:3000] [--limit 100]
 *
 * 검증 항목:
 *   1. 단지명 매칭 (Supabase search API)
 *   2. 면적 매칭 (±3㎡ 이내)
 *   3. 최근 매매가 존재 여부
 *   4. 최근 전세가 존재 여부
 *   5. 전세가율 범위 (0.1 ~ 1.0)
 *   6. 엔진 결과 (hold 아닌지)
 *
 * 출력: qa_report_YYYYMMDD.json + 콘솔 요약
 */

const BASE_URL = process.env.QA_BASE_URL || 'https://valuelens-rouge.vercel.app';
const LIMIT    = parseInt(process.env.QA_LIMIT || '100');
const DELAY_MS = 800; // API rate limit 방지

// ── 전국 100개 테스트 단지 ────────────────────────────────
const QA_CASES = [
  // ── 서울 (25개) ──────────────────────────────────────────
  { region:'노원구',    dong:'공릉동',  complexName:'동부',              area:59,  label:'노원 구축 일반' },
  { region:'노원구',    dong:'상계동',  complexName:'상계주공7',          area:45.77,label:'재건축 대표단지' },
  { region:'강남구',    dong:'대치동',  complexName:'은마',               area:84,  label:'강남 재건축 대표' },
  { region:'서초구',    dong:'반포동',  complexName:'반포자이',           area:84,  label:'서초 프리미엄' },
  { region:'송파구',    dong:'잠실동',  complexName:'잠실엘스',           area:84,  label:'잠실 대단지' },
  { region:'강동구',    dong:'둔촌동',  complexName:'올림픽파크포레온',   area:84,  label:'강동 신축 대단지' },
  { region:'마포구',    dong:'아현동',  complexName:'마포래미안푸르지오', area:84,  label:'마포 역세권' },
  { region:'양천구',    dong:'목동',    complexName:'목동신시가지7단지',  area:66,  label:'목동 학군 재건축' },
  { region:'용산구',    dong:'한남동',  complexName:'한남더힐',           area:200, label:'용산 초고가' },
  { region:'성동구',    dong:'성수동1가',complexName:'트리마제',          area:84,  label:'성수 고급신축' },
  { region:'관악구',    dong:'봉천동',  complexName:'관악드림타운',       area:59,  label:'관악 서민단지' },
  { region:'광진구',    dong:'자양동',  complexName:'자양한양',           area:59,  label:'광진 구축' },
  { region:'은평구',    dong:'불광동',  complexName:'불광미성',           area:49,  label:'은평 구축' },
  { region:'동대문구',  dong:'전농동',  complexName:'래미안전농크레시티', area:59,  label:'동대문 중견단지' },
  { region:'영등포구',  dong:'여의도동',complexName:'시범',               area:115, label:'여의도 구축 대형' },
  { region:'강서구',    dong:'마곡동',  complexName:'마곡힐스테이트',     area:59,  label:'마곡 신축' },
  { region:'구로구',    dong:'구로동',  complexName:'구로주공',           area:39,  label:'구로 소형' },
  { region:'도봉구',    dong:'창동',    complexName:'상아2차',            area:59,  label:'도봉 구축' },
  { region:'노원구',    dong:'중계동',  complexName:'중계그린',           area:59,  label:'중계 일반' },
  { region:'강북구',    dong:'미아동',  complexName:'에스케이북한산시티', area:59,  label:'강북 일반' },
  { region:'성북구',    dong:'길음동',  complexName:'길음뉴타운e편한세상',area:59,  label:'성북 뉴타운' },
  { region:'중랑구',    dong:'면목동',  complexName:'사가정센트럴아이파크',area:59, label:'중랑 신축' },
  { region:'강남구',    dong:'개포동',  complexName:'디에이치퍼스티어아이파크',area:84,label:'강남 재개발 신축' },
  { region:'강남구',    dong:'압구정동',complexName:'현대1차',            area:115, label:'압구정 구축 재건축' },
  { region:'서초구',    dong:'잠원동',  complexName:'아크로리버뷰',       area:59,  label:'서초 한강변 신축' },

  // ── 경기 (25개) ──────────────────────────────────────────
  { region:'성남시 분당구',dong:'서현동',complexName:'시범우성',           area:84,  label:'분당 재건축 선도' },
  { region:'성남시 분당구',dong:'정자동',complexName:'정자주공4단지',      area:59,  label:'분당 정자 구축' },
  { region:'수원시 영통구',dong:'이의동',complexName:'광교중흥S클래스',    area:84,  label:'광교 신도시' },
  { region:'수원시 팔달구',dong:'우만동',complexName:'삼성래미안',         area:84,  label:'수원 일반' },
  { region:'용인시 기흥구',dong:'보정동',complexName:'용인 센트럴파크',    area:84,  label:'용인 신축' },
  { region:'용인시 수지구',dong:'풍덕천동',complexName:'신정마을4단지',    area:59,  label:'수지 구축' },
  { region:'고양시 일산서구',dong:'대화동',complexName:'후곡마을',         area:72,  label:'일산 구축' },
  { region:'고양시 덕양구',dong:'화정동',complexName:'별빛마을효성',       area:59,  label:'덕양 일반' },
  { region:'안양시 동안구',dong:'평촌동',complexName:'꿈마을현대',         area:59,  label:'평촌 구축' },
  { region:'부천시',    dong:'상동',    complexName:'보람마을',            area:59,  label:'부천 일반' },
  { region:'김포시',    dong:'장기동',  complexName:'한강메트로자이',      area:84,  label:'김포 신도시' },
  { region:'남양주시',  dong:'다산동',  complexName:'다산아이파크',        area:84,  label:'다산 신도시' },
  { region:'화성시',    dong:'반월동',  complexName:'동탄2신도시린스트라우스',area:84,label:'동탄2 신도시' },
  { region:'평택시',    dong:'고덕동',  complexName:'고덕파라곤',          area:84,  label:'평택 고덕' },
  { region:'의왕시',    dong:'내손동',  complexName:'포일센트럴에일린',    area:59,  label:'의왕 신도시' },
  { region:'하남시',    dong:'망월동',  complexName:'미사강변푸르지오',    area:84,  label:'미사강변도시' },
  { region:'광명시',    dong:'하안동',  complexName:'하안주공3단지',       area:49,  label:'광명 재건축' },
  { region:'구리시',    dong:'인창동',  complexName:'인창주공',            area:49,  label:'구리 재건축' },
  { region:'의정부시',  dong:'민락동',  complexName:'민락2지구모아미래도',  area:84,  label:'의정부 신축' },
  { region:'파주시',    dong:'목동동',  complexName:'운정신도시아이파크',  area:84,  label:'파주 운정' },
  { region:'시흥시',    dong:'정왕동',  complexName:'시흥배곧푸르지오',    area:84,  label:'시흥 배곧' },
  { region:'안산시 단원구',dong:'고잔동',complexName:'주공그린빌4단지',    area:59,  label:'안산 공공' },
  { region:'군포시',    dong:'산본동',  complexName:'산본주공11단지',      area:49,  label:'군포 산본' },
  { region:'이천시',    dong:'부발읍',  complexName:'이천SK하이닉스',      area:84,  label:'이천 직주근접' },
  { region:'오산시',    dong:'원동',    complexName:'오산세교파라곤',      area:84,  label:'오산 신축' },

  // ── 인천 (10개) ──────────────────────────────────────────
  { region:'연수구',    dong:'송도동',  complexName:'더샵송도아크베이',    area:84,  label:'송도 신축' },
  { region:'연수구',    dong:'송도동',  complexName:'송도더샵퍼스트파크', area:84,  label:'송도 일반' },
  { region:'서구',      dong:'검단동',  complexName:'검단신도시푸르지오더베뉴',area:84,label:'검단 신도시' },
  { region:'부평구',    dong:'삼산동',  complexName:'삼산타운',            area:59,  label:'부평 구축' },
  { region:'남동구',    dong:'구월동',  complexName:'인천구월롯데캐슬골드',area:84,  label:'구월 신축' },
  { region:'미추홀구',  dong:'주안동',  complexName:'주안현대아파트',      area:59,  label:'주안 구축' },
  { region:'계양구',    dong:'계산동',  complexName:'계산주공4단지',       area:39,  label:'계양 소형' },
  { region:'강화군',    dong:'갑곶리',  complexName:'강화벽산',            area:59,  label:'강화 외곽' },
  { region:'중구',      dong:'운서동',  complexName:'영종하늘도시우미린',  area:84,  label:'영종도 신축' },
  { region:'연수구',    dong:'동춘동',  complexName:'연수동아',            area:59,  label:'연수 구축' },

  // ── 부산 (10개) ──────────────────────────────────────────
  { region:'해운대구',  dong:'우동',    complexName:'해운대아이파크',      area:84,  label:'해운대 고급' },
  { region:'해운대구',  dong:'우동',    complexName:'엘시티더샵',          area:84,  label:'해운대 초고층' },
  { region:'수영구',    dong:'광안동',  complexName:'광안아이파크',        area:59,  label:'광안리 신축' },
  { region:'남구',      dong:'대연동',  complexName:'대연롯데캐슬',        area:84,  label:'부산남구' },
  { region:'동래구',    dong:'명륜동',  complexName:'명륜자이',            area:84,  label:'동래 신축' },
  { region:'부산진구',  dong:'부전동',  complexName:'서면더샵',            area:59,  label:'서면 역세권' },
  { region:'북구',      dong:'화명동',  complexName:'화명롯데캐슬카이저',  area:84,  label:'화명 대단지' },
  { region:'기장군',    dong:'정관읍',  complexName:'정관신도시힐스테이트',area:84,  label:'기장 신도시' },
  { region:'강서구',    dong:'명지동',  complexName:'명지국제신도시',      area:84,  label:'부산 명지' },
  { region:'사하구',    dong:'괴정동',  complexName:'괴정주공5단지',       area:49,  label:'사하 구축' },

  // ── 대구 (8개) ───────────────────────────────────────────
  { region:'수성구',    dong:'범어동',  complexName:'힐스테이트범어',      area:84,  label:'대구 학군 중심' },
  { region:'수성구',    dong:'만촌동',  complexName:'수성만촌자이',        area:84,  label:'수성 신축' },
  { region:'달서구',    dong:'이곡동',  complexName:'이곡성서',            area:84,  label:'달서 구축' },
  { region:'달서구',    dong:'죽전동',  complexName:'죽전주공',            area:49,  label:'달서 소형' },
  { region:'북구',      dong:'칠성동',  complexName:'침산화성파크드림',    area:84,  label:'대구북구' },
  { region:'동구',      dong:'율하동',  complexName:'율하힐스테이트',      area:84,  label:'대구혁신도시' },
  { region:'서구',      dong:'내당동',  complexName:'내당래미안',          area:59,  label:'대구서구' },
  { region:'달성군',    dong:'다사읍',  complexName:'다사대구자이',        area:84,  label:'달성 외곽' },

  // ── 대전/광주/울산/세종/기타 (22개) ──────────────────────
  { region:'유성구',    dong:'봉명동',  complexName:'트리풀시티',          area:84,  label:'대전 유성 신축' },
  { region:'서구',      dong:'둔산동',  complexName:'크로바아파트',        area:84,  label:'대전 둔산' },
  { region:'대덕구',    dong:'신탄진동',complexName:'신탄진두산위브',      area:84,  label:'대전 외곽' },
  { region:'광산구',    dong:'수완동',  complexName:'수완GS자이',          area:84,  label:'광주 수완' },
  { region:'남구',      dong:'봉선동',  complexName:'봉선롯데캐슬골든엘로이',area:84,label:'광주 봉선' },
  { region:'북구',      dong:'신안동',  complexName:'신안주공1단지',       area:49,  label:'광주 북구' },
  { region:'남동구',    dong:'신정동',  complexName:'울산옥동더샵',        area:84,  label:'울산 일반' },
  { region:'북구',      dong:'화봉동',  complexName:'울산화봉주공',        area:49,  label:'울산 구축' },
  { region:'세종시',    dong:'한솔동',  complexName:'첫마을9단지',         area:84,  label:'세종 원도심' },
  { region:'세종시',    dong:'도담동',  complexName:'도담힐스테이트',      area:84,  label:'세종 신축' },
  { region:'창원시 성산구',dong:'상남동',complexName:'상남센트럴자이',    area:84,  label:'창원 성산' },
  { region:'창원시 의창구',dong:'명서동',complexName:'창원의창금호어울림',area:59,  label:'창원 의창' },
  { region:'수성구',    dong:'범물동',  complexName:'범물현대',            area:59,  label:'대구 범물' },
  { region:'제주시',    dong:'노형동',  complexName:'노형이-편한세상',     area:84,  label:'제주 신축' },
  { region:'전주시 완산구',dong:'효자동',complexName:'전주에코시티데시앙',area:84,  label:'전주 신축' },
  { region:'청주시 흥덕구',dong:'복대동',complexName:'복대자이',          area:84,  label:'청주 신축' },
  { region:'천안시 서북구',dong:'불당동',complexName:'불당지웰더파크',    area:84,  label:'천안 불당' },
  { region:'춘천시',    dong:'퇴계동',  complexName:'춘천현대아파트',      area:59,  label:'춘천 구축' },
  { region:'강릉시',    dong:'포남동',  complexName:'포남현대',            area:59,  label:'강릉 구축' },
  { region:'포항시 남구',dong:'대잠동', complexName:'대잠동두산위브',      area:84,  label:'포항 일반' },
  { region:'안동시',    dong:'옥동',    complexName:'안동옥동한양',        area:59,  label:'경북 지방' },
  { region:'순천시',    dong:'조례동',  complexName:'순천조례아이파크',    area:84,  label:'전남 지방' },
];

// ── API 호출 함수 ─────────────────────────────────────────
async function fetchJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── 단일 케이스 검증 ─────────────────────────────────────
async function runCase(tc) {
  const result = {
    label:       tc.label,
    region:      tc.region,
    dong:        tc.dong,
    complexName: tc.complexName,
    area:        tc.area,
    checks: {
      name_match:    { pass: false, detail: '' },
      area_match:    { pass: false, detail: '' },
      sale_price:    { pass: false, detail: '' },
      jeonse_price:  { pass: false, detail: '' },
      jeonse_ratio:  { pass: false, detail: '' },
      engine_result: { pass: false, detail: '' },
    },
    pass: false,
    fail_reasons: [],
    data_source: 'none',
    sale_count: 0,
    rent_count: 0,
    jeonse_ratio: null,
    latest_sale_ym: null,
    latest_rent_ym: null,
    error: null,
  };

  try {
    // 1) 단지 검색
    const searchRes = await fetchJson(`${BASE_URL}/api/supabase`, {
      type: 'search', name: tc.complexName, sigungu: tc.region, dong: tc.dong, limit: 5,
    });

    const complexes = searchRes.complexes || [];
    if (complexes.length === 0) {
      result.checks.name_match = { pass: false, detail: '단지를 찾지 못함 (Supabase 미등록)' };
      result.fail_reasons.push('단지 미등록');
      result.data_source = 'none';
      return result;
    }

    // 가장 유사한 단지 선택
    const matched = complexes.find(c =>
      c.complex_name.replace(/\s/g,'').includes(tc.complexName.replace(/\s/g,'')) ||
      tc.complexName.replace(/\s/g,'').includes(c.complex_name.replace(/\s/g,'').slice(0,4))
    ) || complexes[0];

    result.checks.name_match = {
      pass: true,
      detail: `매칭: ${matched.complex_name} (${matched.sigungu})`,
    };
    result.data_source = 'supabase';

    // 2) 면적 확인
    const areaList = matched.area_list ? JSON.parse(matched.area_list) : [];
    const nearArea = areaList.find(a => Math.abs(a - tc.area) <= 3);
    if (nearArea != null) {
      result.checks.area_match = { pass: true, detail: `면적 ${nearArea}㎡ (요청 ${tc.area}㎡, ±${Math.abs(nearArea - tc.area).toFixed(1)}㎡)` };
    } else if (areaList.length > 0) {
      const closest = areaList.reduce((p, c) => Math.abs(c - tc.area) < Math.abs(p - tc.area) ? c : p);
      result.checks.area_match = { pass: false, detail: `면적 불일치 — 요청:${tc.area}㎡ 최근접:${closest}㎡ (차이 ${Math.abs(closest - tc.area).toFixed(1)}㎡). 단지 면적: ${areaList.join('/')}㎡` };
      result.fail_reasons.push(`면적 불일치 (${tc.area}→${closest}㎡)`);
    } else {
      result.checks.area_match = { pass: false, detail: 'area_list 없음' };
      result.fail_reasons.push('면적 목록 없음');
    }

    // 3) 실거래 조회
    await sleep(200);
    const dealsRes = await fetchJson(`${BASE_URL}/api/supabase`, {
      type: 'deals',
      complex_id: matched.id,
      area_excl: nearArea || tc.area,
      months: 24,
    });

    const saleDeals = dealsRes.saleDeals || [];
    const rentDeals = dealsRes.rentDeals || [];
    result.sale_count = saleDeals.length;
    result.rent_count = rentDeals.length;

    // 최근 거래일
    const saleYms = saleDeals.map(d => d.contract_ym).filter(Boolean).sort().reverse();
    const rentYms = rentDeals.map(d => d.contract_ym).filter(Boolean).sort().reverse();
    result.latest_sale_ym = saleYms[0] || null;
    result.latest_rent_ym = rentYms[0] || null;

    // 4) 매매가 검증
    if (saleDeals.length >= 3) {
      const prices = saleDeals.slice(0, 5).map(d => Number(d.deal_amount_man)).filter(p => p > 0);
      const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
      result.checks.sale_price = { pass: true, detail: `매매 ${saleDeals.length}건, 최근평균 ${avg}만원 (${result.latest_sale_ym})` };
    } else if (saleDeals.length > 0) {
      result.checks.sale_price = { pass: false, detail: `매매 ${saleDeals.length}건 (3건 미만 — 신뢰도 낮음)` };
      result.fail_reasons.push(`매매 표본 부족 (${saleDeals.length}건)`);
    } else {
      result.checks.sale_price = { pass: false, detail: '매매 실거래 없음' };
      result.fail_reasons.push('매매 실거래 없음');
    }

    // 5) 전세가 검증
    if (rentDeals.length >= 3) {
      const deposits = rentDeals.slice(0, 5).map(d => Number(d.deposit_man)).filter(p => p > 0);
      const avgDeposit = Math.round(deposits.reduce((s, p) => s + p, 0) / deposits.length);
      result.checks.jeonse_price = { pass: true, detail: `전세 ${rentDeals.length}건, 최근평균 ${avgDeposit}만원 (${result.latest_rent_ym})` };

      // 6) 전세가율 검증
      const saleAvg = saleDeals.slice(0, 5).map(d => Number(d.deal_amount_man)).filter(p => p > 0);
      if (saleAvg.length > 0) {
        const saleMean = saleAvg.reduce((s, p) => s + p, 0) / saleAvg.length;
        const ratio = avgDeposit / saleMean;
        result.jeonse_ratio = Math.round(ratio * 1000) / 1000;

        if (ratio >= 0.10 && ratio <= 1.0) {
          result.checks.jeonse_ratio = { pass: true, detail: `전세가율 ${(ratio*100).toFixed(1)}%` };
        } else {
          result.checks.jeonse_ratio = { pass: false, detail: `전세가율 이상 ${(ratio*100).toFixed(1)}% (정상범위 10~100%)` };
          result.fail_reasons.push(`전세가율 이상값 (${(ratio*100).toFixed(1)}%)`);
        }
      } else {
        result.checks.jeonse_ratio = { pass: false, detail: '매매 없어 전세가율 계산 불가' };
      }
    } else if (rentDeals.length > 0) {
      result.checks.jeonse_price = { pass: false, detail: `전세 ${rentDeals.length}건 (3건 미만)` };
      result.checks.jeonse_ratio = { pass: false, detail: '표본 부족으로 전세가율 미산출' };
      result.fail_reasons.push(`전세 표본 부족 (${rentDeals.length}건)`);
    } else {
      result.checks.jeonse_price = { pass: false, detail: '전세 실거래 없음' };
      result.checks.jeonse_ratio = { pass: false, detail: '전세 없음' };
      result.fail_reasons.push('전세 실거래 없음');
    }

    // 7) 엔진 결과 (판단 보류 여부)
    const hold = saleDeals.length < 3 && rentDeals.length < 3;
    result.checks.engine_result = {
      pass: !hold,
      detail: hold ? `표본 부족으로 판단 보류 예상 (매매${saleDeals.length}+전세${rentDeals.length}건)` : `정상 분석 가능 (매매${saleDeals.length}+전세${rentDeals.length}건)`,
    };
    if (hold) result.fail_reasons.push('판단 보류 예상');

  } catch (e) {
    result.error = e.message;
    result.fail_reasons.push(`오류: ${e.message}`);
  }

  // 종합 판정: 핵심 항목(name_match + 둘 중 하나 이상 가격) 통과
  result.pass = result.checks.name_match.pass &&
    (result.checks.sale_price.pass || result.checks.jeonse_price.pass);

  return result;
}

// ── 메인 실행 ─────────────────────────────────────────────
async function main() {
  const cases = QA_CASES.slice(0, LIMIT);
  console.log(`\n${'='.repeat(65)}`);
  console.log(`ValueLens 전국 자동 QA — ${cases.length}개 단지`);
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log('='.repeat(65));

  const results = [];
  let passed = 0, failed = 0;

  const REGION_GROUPS = {
    '서울': ['노원구','강남구','서초구','송파구','강동구','마포구','양천구','용산구','성동구','관악구','광진구','은평구','동대문구','영등포구','강서구','구로구','도봉구','강북구','성북구','중랑구'],
    '경기': ['성남시 분당구','수원시','용인시','고양시','안양시','부천시','김포시','남양주시','화성시','평택시','의왕시','하남시','광명시','구리시','의정부시','파주시','시흥시','안산시','군포시','이천시','오산시'],
    '인천': ['연수구','서구','부평구','남동구','미추홀구','계양구','중구','강화군'],
    '부산': ['해운대구','수영구','남구','동래구','부산진구','북구','기장군','강서구','사하구'],
    '대구': ['수성구','달서구','달성군','북구','동구','서구'],
    '기타': [],
  };

  const groupStats = {};
  for (const g of Object.keys(REGION_GROUPS)) groupStats[g] = { total: 0, pass: 0 };

  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    process.stdout.write(`[${String(i+1).padStart(3)}/${cases.length}] ${tc.label.padEnd(20)} `);

    const r = await runCase(tc);
    results.push(r);

    if (r.pass) { passed++; process.stdout.write('✅ PASS'); }
    else         { failed++; process.stdout.write('❌ FAIL'); }

    if (r.fail_reasons.length > 0)
      process.stdout.write(` — ${r.fail_reasons.slice(0,2).join(' / ')}`);
    process.stdout.write('\n');

    // 지역 그룹 통계
    let grp = '기타';
    for (const [g, list] of Object.entries(REGION_GROUPS)) {
      if (list.includes(tc.region)) { grp = g; break; }
    }
    groupStats[grp].total++;
    if (r.pass) groupStats[grp].pass++;

    if (i < cases.length - 1) await sleep(DELAY_MS);
  }

  // ── 체크 항목별 집계 ────────────────────────────────────
  const checkKeys = ['name_match','area_match','sale_price','jeonse_price','jeonse_ratio','engine_result'];
  const checkLabels = { name_match:'단지명 매칭', area_match:'면적 매칭', sale_price:'매매가 충분', jeonse_price:'전세가 충분', jeonse_ratio:'전세가율 정상', engine_result:'엔진 결과 OK' };
  const checkStats = {};
  for (const k of checkKeys) {
    checkStats[k] = results.filter(r => r.checks[k]?.pass).length;
  }

  // ── 실패 케이스 리스트 ──────────────────────────────────
  const failedCases = results.filter(r => !r.pass);

  // ── 보고서 출력 ──────────────────────────────────────────
  console.log(`\n${'='.repeat(65)}`);
  console.log('QA 결과 요약');
  console.log('='.repeat(65));
  console.log(`총계: ${passed} PASS / ${failed} FAIL / ${cases.length}개`);
  console.log(`전체 통과율: ${Math.round(passed/cases.length*100)}%`);
  console.log('');

  console.log('── 지역별 통과율 ──');
  for (const [g, s] of Object.entries(groupStats)) {
    if (s.total === 0) continue;
    const rate = Math.round(s.pass/s.total*100);
    const bar = '█'.repeat(Math.floor(rate/10)) + '░'.repeat(10-Math.floor(rate/10));
    console.log(`  ${g.padEnd(6)} ${bar} ${rate}% (${s.pass}/${s.total})`);
  }

  console.log('\n── 항목별 통과율 ──');
  for (const k of checkKeys) {
    const cnt = checkStats[k];
    const rate = Math.round(cnt/cases.length*100);
    console.log(`  ${checkLabels[k].padEnd(12)} ${rate}% (${cnt}/${cases.length})`);
  }

  if (failedCases.length > 0) {
    console.log(`\n── 실패 케이스 ${failedCases.length}개 ──`);
    for (const r of failedCases) {
      console.log(`  ❌ [${r.label}] ${r.region} ${r.complexName} ${r.area}㎡`);
      for (const reason of r.fail_reasons) {
        console.log(`      → ${reason}`);
      }
    }
  }

  // ── JSON 리포트 저장 ──────────────────────────────────────
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const reportPath = `qa_report_${dateStr}.json`;

  const report = {
    generated_at: now.toISOString(),
    base_url: BASE_URL,
    summary: {
      total: cases.length, passed, failed,
      pass_rate: Math.round(passed/cases.length*100),
      by_region: groupStats,
      by_check: checkStats,
    },
    failed_cases: failedCases.map(r => ({
      label: r.label, region: r.region, dong: r.dong,
      complexName: r.complexName, area: r.area,
      fail_reasons: r.fail_reasons,
      checks: r.checks,
      sale_count: r.sale_count, rent_count: r.rent_count,
      latest_sale_ym: r.latest_sale_ym, jeonse_ratio: r.jeonse_ratio,
      error: r.error,
    })),
    all_results: results,
  };

  const { writeFileSync } = await import('fs');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n📄 리포트 저장: ${reportPath}`);
  console.log('='.repeat(65));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('QA 오류:', e); process.exit(2); });
