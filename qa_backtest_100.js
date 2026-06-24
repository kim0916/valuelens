/**
 * ValueLens 부동산 QA 백테스트 리스트
 * 총 100개 단지 - 강남/마포/노원/분당/송도/수원/지방 포함
 * 사용법: 각 단지별 검색 → 분석 → 결과 기록
 */

export const QA_LIST = [
  // ── 강남구 (15개) ──
  { id:1,  region:"강남구",  dong:"대치동",  name:"은마",           pyeong:25, note:"재건축 대장주" },
  { id:2,  region:"강남구",  dong:"대치동",  name:"래미안대치팰리스", pyeong:34, note:"래미안 표준단지" },
  { id:3,  region:"강남구",  dong:"개포동",  name:"래미안블레스티지", pyeong:34, note:"개포 재건축" },
  { id:4,  region:"강남구",  dong:"역삼동",  name:"역삼자이",        pyeong:25, note:"자이 브랜드" },
  { id:5,  region:"강남구",  dong:"도곡동",  name:"도곡렉슬",        pyeong:34, note:"대형 단지" },
  { id:6,  region:"강남구",  dong:"압구정동", name:"현대7차",         pyeong:50, note:"압구정 재건축" },
  { id:7,  region:"강남구",  dong:"일원동",  name:"개포주공1단지",   pyeong:18, note:"소형 재건축" },
  { id:8,  region:"강남구",  dong:"삼성동",  name:"아이파크삼성",    pyeong:60, note:"초고가" },
  { id:9,  region:"강남구",  dong:"논현동",  name:"e편한세상논현",   pyeong:25, note:"e편한 브랜드 검색 QA" },
  { id:10, region:"강남구",  dong:"청담동",  name:"청담자이",        pyeong:45, note:"XI 검색 QA" },
  { id:11, region:"강남구",  dong:"수서동",  name:"수서삼익",        pyeong:21, note:"구축 소형" },
  { id:12, region:"강남구",  dong:"율현동",  name:"자곡지구힐스테이트", pyeong:34, note:"신축" },
  { id:13, region:"강남구",  dong:"세곡동",  name:"LH강남세곡2",     pyeong:25, note:"공공분양" },
  { id:14, region:"강남구",  dong:"개포동",  name:"디에이치아너힐즈", pyeong:34, note:"DH 브랜드" },
  { id:15, region:"강남구",  dong:"역삼동",  name:"역삼래미안",      pyeong:24, note:"래미안/레미안 검색 QA" },

  // ── 서초구 (8개) ──
  { id:16, region:"서초구",  dong:"반포동",  name:"래미안퍼스티지",  pyeong:59, note:"최고가 단지" },
  { id:17, region:"서초구",  dong:"반포동",  name:"반포자이",        pyeong:59, note:"자이 대표" },
  { id:18, region:"서초구",  dong:"반포동",  name:"아크로리버파크",  pyeong:59, note:"하이엔드" },
  { id:19, region:"서초구",  dong:"잠원동",  name:"신반포자이",      pyeong:34, note:"신반포" },
  { id:20, region:"서초구",  dong:"방배동",  name:"방배e편한세상",   pyeong:34, note:"이편한↔e편한 QA" },
  { id:21, region:"서초구",  dong:"서초동",  name:"서초푸르지오써밋", pyeong:34, note:"서초 신축" },
  { id:22, region:"서초구",  dong:"양재동",  name:"롯데캐슬메디치",  pyeong:34, note:"양재" },
  { id:23, region:"서초구",  dong:"내곡동",  name:"헌인마을LH3단지", pyeong:18, note:"소형/공공" },

  // ── 마포구 (8개) ──
  { id:24, region:"마포구",  dong:"아현동",  name:"마포래미안푸르지오", pyeong:34, note:"마래푸 대표" },
  { id:25, region:"마포구",  dong:"도화동",  name:"마포트라팰리스",  pyeong:34, note:"주상복합" },
  { id:26, region:"마포구",  dong:"신수동",  name:"신촌숲아이파크",  pyeong:34, note:"아이파크" },
  { id:27, region:"마포구",  dong:"성산동",  name:"성산시영",        pyeong:14, note:"소형 구축" },
  { id:28, region:"마포구",  dong:"합정동",  name:"합정현대1차",     pyeong:25, note:"구축" },
  { id:29, region:"마포구",  dong:"상암동",  name:"상암센트럴푸르지오", pyeong:34, note:"상암" },
  { id:30, region:"마포구",  dong:"공덕동",  name:"공덕SK뷰",        pyeong:34, note:"SK뷰" },
  { id:31, region:"마포구",  dong:"대흥동",  name:"마포한강자이",    pyeong:34, note:"자이" },

  // ── 노원구 (8개) ──
  { id:32, region:"노원구",  dong:"공릉동",  name:"동부",            pyeong:25, note:"기준 단지(백테 v1)" },
  { id:33, region:"노원구",  dong:"상계동",  name:"상계주공7",       pyeong:19, note:"재건축 기대" },
  { id:34, region:"노원구",  dong:"월계동",  name:"월계롯데",        pyeong:25, note:"구축 대단지" },
  { id:35, region:"노원구",  dong:"중계동",  name:"중계e편한세상",   pyeong:34, note:"e편한 검색 QA" },
  { id:36, region:"노원구",  dong:"하계동",  name:"하계현대",        pyeong:19, note:"소형" },
  { id:37, region:"노원구",  dong:"공릉동",  name:"태릉해링턴플레이스", pyeong:34, note:"해링턴↔헤링턴 QA" },
  { id:38, region:"노원구",  dong:"상계동",  name:"상계주공14",      pyeong:13, note:"초소형" },
  { id:39, region:"노원구",  dong:"월계동",  name:"광운대역세권해링턴스퀘어", pyeong:34, note:"해링턴 신축" },

  // ── 송파구 (8개) ──
  { id:40, region:"송파구",  dong:"잠실동",  name:"잠실엘스",        pyeong:34, note:"잠실 대장" },
  { id:41, region:"송파구",  dong:"잠실동",  name:"리센츠",          pyeong:34, note:"잠실4개단지" },
  { id:42, region:"송파구",  dong:"잠실동",  name:"트리지움",        pyeong:34, note:"잠실4개단지" },
  { id:43, region:"송파구",  dong:"잠실동",  name:"잠실주공5단지",   pyeong:36, note:"재건축" },
  { id:44, region:"송파구",  dong:"문정동",  name:"훼미리",          pyeong:25, note:"구축" },
  { id:45, region:"송파구",  dong:"방이동",  name:"올림픽선수기자촌", pyeong:36, note:"1988 구축" },
  { id:46, region:"송파구",  dong:"거여동",  name:"e편한세상거여",   pyeong:34, note:"e편한" },
  { id:47, region:"송파구",  dong:"위례",    name:"위례자이",        pyeong:34, note:"위례신도시" },

  // ── 성동구/광진구 (5개) ──
  { id:48, region:"성동구",  dong:"행당동",  name:"서울숲푸르지오",  pyeong:34, note:"서울숲" },
  { id:49, region:"성동구",  dong:"옥수동",  name:"e편한세상옥수파크힐스", pyeong:34, note:"e편한" },
  { id:50, region:"성동구",  dong:"금호동",  name:"금호자이1차",     pyeong:25, note:"자이" },
  { id:51, region:"광진구",  dong:"자양동",  name:"자양한양수자인",  pyeong:34, note:"강변 재건축" },
  { id:52, region:"광진구",  dong:"군자동",  name:"군자e편한세상",   pyeong:25, note:"이편한 검색 QA" },

  // ── 분당 (10개) ──
  { id:53, region:"성남시 분당구", dong:"정자동",  name:"정자동느티마을",  pyeong:32, note:"분당 구축" },
  { id:54, region:"성남시 분당구", dong:"수내동",  name:"파크타운",        pyeong:36, note:"분당 대단지" },
  { id:55, region:"성남시 분당구", dong:"이매동",  name:"아름마을금호",    pyeong:32, note:"구축" },
  { id:56, region:"성남시 분당구", dong:"야탑동",  name:"탑마을현대",      pyeong:25, note:"소형" },
  { id:57, region:"성남시 분당구", dong:"판교동",  name:"봇들마을9단지",   pyeong:25, note:"판교" },
  { id:58, region:"성남시 분당구", dong:"백현동",  name:"판교푸르지오그랑블", pyeong:34, note:"판교 신축" },
  { id:59, region:"성남시 분당구", dong:"삼평동",  name:"판교원마을6단지",  pyeong:34, note:"판교원" },
  { id:60, region:"성남시 분당구", dong:"구미동",  name:"무지개마을4단지",  pyeong:32, note:"분당 대표 구축" },
  { id:61, region:"성남시 분당구", dong:"정자동",  name:"상록마을금호",     pyeong:32, note:"전세 부족 QA" },
  { id:62, region:"성남시 분당구", dong:"수내동",  name:"양지마을효성",     pyeong:25, note:"소형 거래 QA" },

  // ── 수원 (7개) ──
  { id:63, region:"수원시 영통구", dong:"이의동",  name:"광교중흥S클래스",  pyeong:34, note:"광교 신도시" },
  { id:64, region:"수원시 영통구", dong:"이의동",  name:"광교e편한세상",    pyeong:34, note:"e편한 지방" },
  { id:65, region:"수원시 장안구", dong:"정자동",  name:"수원정자지구e편한세상", pyeong:25, note:"이편한 검색" },
  { id:66, region:"수원시 팔달구", dong:"우만동",  name:"우만주공3단지",    pyeong:18, note:"소형 구축" },
  { id:67, region:"수원시 권선구", dong:"호매실동", name:"수원호매실자이",   pyeong:34, note:"자이" },
  { id:68, region:"수원시 영통구", dong:"망포동",  name:"영통역한라비발디", pyeong:34, note:"역세권" },
  { id:69, region:"수원시 장안구", dong:"천천동",  name:"삼성래미안",       pyeong:34, note:"래미안 검색" },

  // ── 인천 송도 (7개) ──
  { id:70, region:"연수구",  dong:"송도동",  name:"더샵송도아크베이",  pyeong:34, note:"더샵/더샾 QA" },
  { id:71, region:"연수구",  dong:"송도동",  name:"송도더샵퍼스트파크", pyeong:34, note:"더샵" },
  { id:72, region:"연수구",  dong:"송도동",  name:"송도아이파크",      pyeong:25, note:"아이파크" },
  { id:73, region:"연수구",  dong:"송도동",  name:"송도힐스테이트",    pyeong:34, note:"힐스테이트" },
  { id:74, region:"연수구",  dong:"송도동",  name:"송도SK뷰",          pyeong:25, note:"SK뷰" },
  { id:75, region:"연수구",  dong:"송도동",  name:"e편한세상송도",     pyeong:25, note:"e편한 송도" },
  { id:76, region:"연수구",  dong:"송도동",  name:"힐스테이트레이크송도", pyeong:34, note:"신축" },

  // ── 용인/화성 (5개) ──
  { id:77, region:"용인시 수지구", dong:"풍덕천동", name:"수지구청역푸르지오수자인", pyeong:34, note:"신축" },
  { id:78, region:"용인시 기흥구", dong:"동백동",   name:"동백지구한라비발디", pyeong:34, note:"동백" },
  { id:79, region:"화성시",        dong:"반월동",   name:"동탄역반도유보라아이비파크", pyeong:34, note:"동탄2" },
  { id:80, region:"화성시",        dong:"영천동",   name:"동탄2힐스테이트",   pyeong:34, note:"힐스테이트" },
  { id:81, region:"화성시",        dong:"청계동",   name:"동탄자이",          pyeong:34, note:"자이" },

  // ── 대구 (5개) ──
  { id:82, region:"대구시 수성구", dong:"만촌동",  name:"만촌화성파크드림",  pyeong:34, note:"수성구 대장" },
  { id:83, region:"대구시 수성구", dong:"범어동",  name:"범어e편한세상",     pyeong:25, note:"e편한 지방" },
  { id:84, region:"대구시 달서구", dong:"감삼동",  name:"감삼자이",          pyeong:34, note:"자이 지방" },
  { id:85, region:"대구시 북구",   dong:"칠성동",  name:"대구역해링턴플레이스", pyeong:34, note:"해링턴 지방" },
  { id:86, region:"대구시 중구",   dong:"삼덕동",  name:"e편한세상삼덕",     pyeong:25, note:"거래 부족 QA" },

  // ── 부산 (5개) ──
  { id:87, region:"부산시 해운대구", dong:"우동",   name:"해운대자이2차",    pyeong:34, note:"해운대 대장" },
  { id:88, region:"부산시 해운대구", dong:"중동",   name:"센텀시티자이",     pyeong:59, note:"고가 단지" },
  { id:89, region:"부산시 수영구",   dong:"남천동", name:"삼익비치",         pyeong:25, note:"구축" },
  { id:90, region:"부산시 동래구",   dong:"온천동", name:"래미안온천2단지",  pyeong:34, note:"래미안 부산" },
  { id:91, region:"부산시 남구",     dong:"대연동", name:"e편한세상대연",    pyeong:34, note:"e편한 부산" },

  // ── 광주 (3개) ──
  { id:92, region:"광주광역시 광산구", dong:"수완동", name:"수완GS자이",     pyeong:34, note:"alias: 수완자이" },
  { id:93, region:"광주광역시 서구",   dong:"화정동", name:"화정아이파크",   pyeong:25, note:"아이파크" },
  { id:94, region:"광주광역시 북구",   dong:"운암동", name:"운암자이",       pyeong:25, note:"거래 부족 QA" },

  // ── 대전 (3개) ──
  { id:95, region:"대전시 유성구", dong:"봉명동",  name:"유성e편한세상",   pyeong:34, note:"e편한 대전" },
  { id:96, region:"대전시 서구",   dong:"둔산동",  name:"크로바",          pyeong:25, note:"구축" },
  { id:97, region:"대전시 유성구", dong:"노은동",  name:"노은2지구자이",   pyeong:34, note:"자이" },

  // ── 판단 보류 집중 QA (3개 - 거래 희박 예상) ──
  { id:98,  region:"강원도 춘천시", dong:"퇴계동",  name:"퇴계e편한세상",  pyeong:25, note:"지방 소형 - 전세 없음 예상" },
  { id:99,  region:"전라북도 전주시 완산구", dong:"효자동", name:"효자힐스테이트", pyeong:34, note:"지방 중형 - 거래 부족 예상" },
  { id:100, region:"경상북도 구미시", dong:"인의동", name:"구미자이",       pyeong:25, note:"지방 소형 - 판단보류 예상" },
];

/**
 * 기록 템플릿 (테스트 시 채워넣기)
 * {
 *   id: 1,
 *   searchOk: true,           // 검색 성공 여부
 *   saleDeals: 12,            // 매매 거래 수
 *   jeonseDeals: 8,           // 전세 거래 수
 *   result: "B",              // 판정 결과 (A~E / 보류)
 *   fairPrice: 50200,         // 적정가 (만원)
 *   gapRatio: -0.02,          // 오차율
 *   nanFound: false,          // NaN 표시 여부
 *   undefinedFound: false,    // undefined 표시 여부
 *   trustGrade: "신뢰도 높음", // 신뢰도 등급 표시 확인
 *   holdReason: null,         // 판단보류 이유 (있으면)
 *   note: "",                 // 기타 메모
 * }
 */
