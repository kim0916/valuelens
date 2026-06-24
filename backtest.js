/**
 * ══════════════════════════════════════════════════════════
 * ValueLens 부동산 백테스트 프레임워크 v1.0
 * ══════════════════════════════════════════════════════════
 *
 * 목적: 적정가 엔진 정확도 검증 (계산 로직 변경 없음)
 * 방법: 실거래가 기준으로 ValueLens 적정가와 오차율 측정
 * 기준: MAPE(평균절대백분율오차) ≤ 10% 목표
 *
 * 사용법:
 *   1. 브라우저에서 valuelens-rouge.vercel.app 접속
 *   2. 각 단지 검색 → 분석 실행
 *   3. 결과를 BT_RESULTS 배열에 기록
 *   4. 하단 exportCSV() / exportJSON() 호출로 저장
 *
 * 계산 로직 변경 금지 / 테스트 기록만 진행
 * ══════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────
// 1. 백테스트 단지 리스트 (100개)
//    분류: 수도권 / 지방 / 신축 / 구축 / 재건축
// ───────────────────────────────────────────────
export const BT_LIST = [

  // ══ [A] 수도권 – 서울 강남권 (15개) ══
  // 특성: 고가·프리미엄·재건축 혼재 → 엔진 프리미엄 보정 검증
  { id:1,  cat:"수도권_강남", region:"강남구",  dong:"대치동",  name:"래미안대치팰리스", areaSqm:84,  buildYear:2002, type:"고가_신축급",   note:"래미안 표준단지, 전세가율 낮음" },
  { id:2,  cat:"수도권_강남", region:"강남구",  dong:"대치동",  name:"은마",             areaSqm:76,  buildYear:1979, type:"재건축",        note:"재건축 대장주, 프리미엄 높음" },
  { id:3,  cat:"수도권_강남", region:"강남구",  dong:"개포동",  name:"래미안블레스티지", areaSqm:59,  buildYear:2019, type:"고가_신축",     note:"개포 재건축 완료 신축" },
  { id:4,  cat:"수도권_강남", region:"강남구",  dong:"도곡동",  name:"도곡렉슬",         areaSqm:84,  buildYear:2002, type:"고가_준신축",   note:"대형 단지" },
  { id:5,  cat:"수도권_강남", region:"강남구",  dong:"역삼동",  name:"역삼자이",         areaSqm:59,  buildYear:2004, type:"고가_준신축",   note:"역세권" },
  { id:6,  cat:"수도권_강남", region:"서초구",  dong:"반포동",  name:"래미안퍼스티지",   areaSqm:84,  buildYear:2009, type:"초고가",        note:"초고가 단지, 전세가율 매우 낮음" },
  { id:7,  cat:"수도권_강남", region:"서초구",  dong:"반포동",  name:"반포자이",         areaSqm:84,  buildYear:2009, type:"초고가",        note:"자이 대표" },
  { id:8,  cat:"수도권_강남", region:"송파구",  dong:"신천동",  name:"파크리오",         areaSqm:84,  buildYear:2008, type:"일반",          note:"거래량 매우 많음(428건)" },
  { id:9,  cat:"수도권_강남", region:"송파구",  dong:"가락동",  name:"헬리오시티",       areaSqm:84,  buildYear:2018, type:"신축_대단지",   note:"전세 3445건, 검증 최적 단지" },
  { id:10, cat:"수도권_강남", region:"송파구",  dong:"잠실동",  name:"잠실엘스",         areaSqm:84,  buildYear:2008, type:"일반",          note:"잠실 4개 단지 대표" },
  { id:11, cat:"수도권_강남", region:"강동구",  dong:"고덕동",  name:"고덕그라시움",     areaSqm:84,  buildYear:2019, type:"신축",          note:"고덕 재건축 완료" },
  { id:12, cat:"수도권_강남", region:"강동구",  dong:"천호동",  name:"래미안강동팰리스", areaSqm:84,  buildYear:2014, type:"일반",          note:"강동 중급" },
  { id:13, cat:"수도권_강남", region:"영등포구", dong:"여의도동", name:"시범",            areaSqm:79,  buildYear:1971, type:"재건축_초기",   note:"55년차 여의도 재건축" },
  { id:14, cat:"수도권_강남", region:"용산구",  dong:"이촌동",  name:"한강맨숀",         areaSqm:99,  buildYear:1971, type:"재건축",        note:"54년차 이촌동" },
  { id:15, cat:"수도권_강남", region:"성동구",  dong:"행당동",  name:"서울숲푸르지오",   areaSqm:84,  buildYear:2006, type:"일반",          note:"성동 중급" },

  // ══ [B] 수도권 – 서울 비강남권 (10개) ══
  // 특성: 전세가율 중간, 엔진 jeonse/blend 모드 검증
  { id:16, cat:"수도권_비강남", region:"마포구",  dong:"아현동",  name:"마포래미안푸르지오", areaSqm:84,  buildYear:2014, type:"일반",        note:"마래푸 대표" },
  { id:17, cat:"수도권_비강남", region:"노원구",  dong:"공릉동",  name:"동부",              areaSqm:66,  buildYear:1999, type:"구축",         note:"기준단지(백테v1)" },
  { id:18, cat:"수도권_비강남", region:"노원구",  dong:"상계동",  name:"상계주공7",         areaSqm:42,  buildYear:1988, type:"재건축",        note:"재건축 기대" },
  { id:19, cat:"수도권_비강남", region:"강북구",  dong:"미아동",  name:"에스케이북한산시티", areaSqm:84,  buildYear:2004, type:"일반",        note:"거래량 371건" },
  { id:20, cat:"수도권_비강남", region:"구로구",  dong:"개봉동",  name:"세이지움개봉",      areaSqm:59,  buildYear:2025, type:"신축",          note:"2025년 신축" },
  { id:21, cat:"수도권_비강남", region:"구로구",  dong:"고척동",  name:"산업인",            areaSqm:60,  buildYear:1976, type:"구축",          note:"49년차 구축" },
  { id:22, cat:"수도권_비강남", region:"성북구",  dong:"안암동3가", name:"대광",            areaSqm:66,  buildYear:1971, type:"재건축_초기",   note:"54년차" },
  { id:23, cat:"수도권_비강남", region:"서초구",  dong:"방배동",  name:"삼호1동~3동",      areaSqm:68,  buildYear:1975, type:"재건축",        note:"50년차 방배동" },
  { id:24, cat:"수도권_비강남", region:"은평구",  dong:"응암동",  name:"백련산힐스테이트",  areaSqm:84,  buildYear:2013, type:"일반",          note:"은평 중급" },
  { id:25, cat:"수도권_비강남", region:"광진구",  dong:"자양동",  name:"자양한양수자인",    areaSqm:84,  buildYear:2020, type:"신축",          note:"강변 신축" },

  // ══ [C] 수도권 – 경기 (15개) ══
  // 특성: 다양한 전세가율, 신도시/구도심 혼재
  { id:26, cat:"수도권_경기", region:"안양시 만안구", dong:"안양동",  name:"래미안안양메가트리아", areaSqm:84,  buildYear:2016, type:"일반",   note:"거래량 677건 최다" },
  { id:27, cat:"수도권_경기", region:"안양시 동안구", dong:"호계동",  name:"평촌어바인퍼스트",     areaSqm:84,  buildYear:2021, type:"신축",   note:"거래량 557건" },
  { id:28, cat:"수도권_경기", region:"성남시 수정구", dong:"신흥동",  name:"산성역포레스티아",     areaSqm:84,  buildYear:2020, type:"신축",   note:"거래량 453건" },
  { id:29, cat:"수도권_경기", region:"광명시",        dong:"광명동",  name:"광명아크포레자이위브",  areaSqm:84,  buildYear:2021, type:"신축",   note:"거래량 402건" },
  { id:30, cat:"수도권_경기", region:"수원시 팔달구", dong:"매교동",  name:"매교역푸르지오SKVIEW",  areaSqm:84,  buildYear:2023, type:"신축",   note:"거래량 398건" },
  { id:31, cat:"수도권_경기", region:"수원시 팔달구", dong:"매교동",  name:"힐스테이트푸르지오수원", areaSqm:84,  buildYear:2023, type:"신축",  note:"거래량 342건" },
  { id:32, cat:"수도권_경기", region:"의정부시",      dong:"의정부동", name:"의정부역센트럴자이앤위브캐슬", areaSqm:84, buildYear:2022, type:"신축", note:"거래량 297건" },
  { id:33, cat:"수도권_경기", region:"수원시 영통구", dong:"영통동",  name:"황골마을주공1",         areaSqm:50,  buildYear:1997, type:"구축_재건축후보", note:"28년차" },
  { id:34, cat:"수도권_경기", region:"성남시 분당구", dong:"정자동",  name:"정자동느티마을",        areaSqm:85,  buildYear:1993, type:"구축",   note:"분당 구축" },
  { id:35, cat:"수도권_경기", region:"성남시 분당구", dong:"삼평동",  name:"판교원마을6단지",       areaSqm:84,  buildYear:2011, type:"일반",   note:"판교 중급" },
  { id:36, cat:"수도권_경기", region:"화성시",        dong:"영천동",  name:"동탄2힐스테이트",       areaSqm:84,  buildYear:2018, type:"신축",   note:"동탄2" },
  { id:37, cat:"수도권_경기", region:"용인시 기흥구", dong:"동백동",  name:"동백지구한라비발디",    areaSqm:84,  buildYear:2005, type:"일반",   note:"동백" },
  { id:38, cat:"수도권_경기", region:"고양시 덕양구", dong:"행신동",  name:"무원마을7단지현대",     areaSqm:84,  buildYear:1995, type:"구축",   note:"1기신도시 구축" },
  { id:39, cat:"수도권_경기", region:"부천시",        dong:"중동",    name:"중동롯데1단지",         areaSqm:84,  buildYear:1994, type:"구축",   note:"1기신도시 구축" },
  { id:40, cat:"수도권_경기", region:"남양주시",      dong:"다산동",  name:"다산 이편한세상자이",   areaSqm:84,  buildYear:2019, type:"신축",   note:"다산신도시" },

  // ══ [D] 지방 – 부산 (10개) ══
  { id:41, cat:"지방_부산", region:"부산시 동래구",   dong:"온천동",  name:"동래래미안아이파크",     areaSqm:84,  buildYear:2022, type:"신축",   note:"거래량 475건 지방 최다" },
  { id:42, cat:"지방_부산", region:"부산시 남구",     dong:"대연동",  name:"대연롯데캐슬레전드1단지", areaSqm:84,  buildYear:2018, type:"일반",  note:"거래량 427건" },
  { id:43, cat:"지방_부산", region:"부산시 수영구",   dong:"남천동",  name:"삼익비치",               areaSqm:66,  buildYear:1979, type:"재건축", note:"46년차, 거래량 347건" },
  { id:44, cat:"지방_부산", region:"부산시 동래구",   dong:"사직동",  name:"사직쌍용예가",           areaSqm:84,  buildYear:2006, type:"일반",   note:"거래량 318건" },
  { id:45, cat:"지방_부산", region:"부산시 해운대구", dong:"우동",    name:"해운대자이2차",          areaSqm:84,  buildYear:2011, type:"고가",   note:"해운대 대장" },
  { id:46, cat:"지방_부산", region:"부산시 해운대구", dong:"중동",    name:"센텀시티자이",           areaSqm:150, buildYear:2008, type:"초고가", note:"부산 하이엔드" },
  { id:47, cat:"지방_부산", region:"부산시 부산진구", dong:"개금동",  name:"시영(12~17동)",          areaSqm:51,  buildYear:1975, type:"재건축", note:"50년차" },
  { id:48, cat:"지방_부산", region:"부산시 동래구",   dong:"온천동",  name:"래미안온천2단지",        areaSqm:84,  buildYear:2015, type:"일반",   note:"래미안 부산" },
  { id:49, cat:"지방_부산", region:"부산시 연제구",   dong:"연산동",  name:"연산롯데캐슬골든포레",  areaSqm:84,  buildYear:2019, type:"신축",   note:"연제구 신축" },
  { id:50, cat:"지방_부산", region:"부산시 남구",     dong:"대연동",  name:"e편한세상대연",          areaSqm:84,  buildYear:2008, type:"일반",   note:"e편한" },

  // ══ [E] 지방 – 경남·충청·전라 (12개) ══
  { id:51, cat:"지방_경남충청", region:"창원시 성산구",   dong:"상남동",  name:"성원",                   areaSqm:99,  buildYear:1994, type:"구축",   note:"거래량 634건 지방 최다" },
  { id:52, cat:"지방_경남충청", region:"창원시 마산합포구",dong:"월영동",  name:"마린애시앙부영",          areaSqm:84,  buildYear:2019, type:"신축",   note:"거래량 534건" },
  { id:53, cat:"지방_경남충청", region:"아산시",          dong:"배방읍 공수리", name:"아산배방우방아이유쉘2차", areaSqm:84, buildYear:2021, type:"신축",  note:"거래량 419건, 전세가율 낮음" },
  { id:54, cat:"지방_경남충청", region:"천안시 서북구",   dong:"두정동",  name:"두정역효성해링턴플레이스",  areaSqm:84,  buildYear:2020, type:"신축",   note:"거래량 397건" },
  { id:55, cat:"지방_경남충청", region:"천안시 동남구",   dong:"신방동",  name:"초원그린타운",             areaSqm:85,  buildYear:1998, type:"구축",   note:"거래량 391건" },
  { id:56, cat:"지방_경남충청", region:"청주시 흥덕구",   dong:"복대동",  name:"신영지웰시티1차",          areaSqm:84,  buildYear:2010, type:"일반",   note:"거래량 378건" },
  { id:57, cat:"지방_경남충청", region:"청주시 흥덕구",   dong:"오송읍 봉산리", name:"오송역파라곤센트럴시티", areaSqm:84, buildYear:2023, type:"신축",  note:"거래량 328건" },
  { id:58, cat:"지방_경남충청", region:"청주시 서원구",   dong:"모충동",  name:"청주모충LH트릴로채",       areaSqm:59,  buildYear:2021, type:"신축",   note:"거래량 315건" },
  { id:59, cat:"지방_경남충청", region:"대전시 서구",     dong:"도마동",  name:"도마e편한세상포레나",      areaSqm:84,  buildYear:2022, type:"신축",   note:"거래량 286건 대전" },
  { id:60, cat:"지방_경남충청", region:"김해시",          dong:"신문동",  name:"더스카이시티제니스앤프라우", areaSqm:84,  buildYear:2025, type:"신축",   note:"2025 신축" },
  { id:61, cat:"지방_경남충청", region:"전주시 완산구",   dong:"효자동1", name:"힐스테이트어울림효자",     areaSqm:84,  buildYear:2022, type:"신축",   note:"거래량 276건 전주" },
  { id:62, cat:"지방_경남충청", region:"춘천시",          dong:"후평동",  name:"봉의",                    areaSqm:60,  buildYear:1975, type:"구축",   note:"50년차 강원" },

  // ══ [F] 지방 – 대구 (5개) ══
  { id:63, cat:"지방_대구", region:"대구시 중구",   dong:"남산동",  name:"남산자이하늘채",    areaSqm:84,  buildYear:2022, type:"신축",   note:"거래량 253건 대구" },
  { id:64, cat:"지방_대구", region:"대구시 수성구", dong:"만촌동",  name:"만촌화성파크드림",  areaSqm:84,  buildYear:2007, type:"일반",   note:"수성구 대장" },
  { id:65, cat:"지방_대구", region:"대구시 수성구", dong:"범어동",  name:"범어e편한세상",     areaSqm:59,  buildYear:2005, type:"일반",   note:"수성구" },
  { id:66, cat:"지방_대구", region:"대구시 달서구", dong:"감삼동",  name:"감삼자이",          areaSqm:84,  buildYear:2010, type:"일반",   note:"달서구" },
  { id:67, cat:"지방_대구", region:"대구시 북구",   dong:"칠성동",  name:"대구역해링턴플레이스", areaSqm:84, buildYear:2021, type:"신축",   note:"해링턴 지방" },

  // ══ [G] 재건축·구축 집중 검증 (8개) ══
  // 목적: 엔진 재건축 프리미엄 보정 정확도 확인
  { id:68, cat:"재건축_구축", region:"강남구",  dong:"압구정동", name:"현대7차",    areaSqm:163, buildYear:1978, type:"재건축_고급", note:"압구정 재건축 기대, 초고가" },
  { id:69, cat:"재건축_구축", region:"강남구",  dong:"개포동",   name:"개포주공1단지", areaSqm:36,  buildYear:1982, type:"재건축",   note:"소형 재건축" },
  { id:70, cat:"재건축_구축", region:"영등포구", dong:"여의도동", name:"삼부",       areaSqm:79,  buildYear:1975, type:"재건축",   note:"여의도 재건축 거래량 38건" },
  { id:71, cat:"재건축_구축", region:"영등포구", dong:"여의도동", name:"대교",       areaSqm:66,  buildYear:1975, type:"재건축",   note:"여의도 50년차" },
  { id:72, cat:"재건축_구축", region:"영등포구", dong:"여의도동", name:"한양",       areaSqm:79,  buildYear:1975, type:"재건축",   note:"여의도 한양" },
  { id:73, cat:"재건축_구축", region:"용산구",   dong:"이촌동",   name:"현대맨숀",   areaSqm:84,  buildYear:1975, type:"재건축",   note:"이촌동 50년차" },
  { id:74, cat:"재건축_구축", region:"창원시 성산구", dong:"내동", name:"내동주공1단지", areaSqm:36, buildYear:1976, type:"구축_소형", note:"49년차 지방 구축" },
  { id:75, cat:"재건축_구축", region:"서초구",   dong:"방배동",   name:"삼호1동~3동", areaSqm:68, buildYear:1975, type:"재건축",   note:"50년차 방배동" },

  // ══ [H] 신축 집중 검증 (8개) ══
  // 목적: 전세가율 낮은 신축의 엔진 sale모드 정확도
  { id:76, cat:"신축검증", region:"송파구",       dong:"가락동",  name:"헬리오시티",         areaSqm:59,  buildYear:2018, type:"신축_대단지", note:"전세 3445건, 소형" },
  { id:77, cat:"신축검증", region:"강동구",       dong:"고덕동",  name:"고덕그라시움",       areaSqm:59,  buildYear:2019, type:"신축",        note:"소형 신축" },
  { id:78, cat:"신축검증", region:"광명시",       dong:"광명동",  name:"광명아크포레자이위브", areaSqm:59,  buildYear:2021, type:"신축",       note:"소형" },
  { id:79, cat:"신축검증", region:"수원시 팔달구", dong:"매교동", name:"매교역푸르지오SKVIEW", areaSqm:59,  buildYear:2023, type:"신축",       note:"소형 신축" },
  { id:80, cat:"신축검증", region:"부산시 동래구", dong:"온천동", name:"동래래미안아이파크",  areaSqm:59,  buildYear:2022, type:"신축_지방",   note:"지방 소형 신축" },
  { id:81, cat:"신축검증", region:"구로구",       dong:"개봉동",  name:"세이지움개봉",        areaSqm:84,  buildYear:2025, type:"신축_최신",   note:"2025 최신 신축" },
  { id:82, cat:"신축검증", region:"의정부시",     dong:"의정부동", name:"의정부역센트럴자이앤위브캐슬", areaSqm:59, buildYear:2022, type:"신축", note:"수도권 신축" },
  { id:83, cat:"신축검증", region:"전주시 완산구", dong:"효자동1", name:"힐스테이트어울림효자", areaSqm:59, buildYear:2022, type:"신축_지방",  note:"지방 소형 신축" },

  // ══ [I] 판단 보류 케이스 검증 (8개) ══
  // 목적: 데이터 부족 시 엔진이 억지 계산 안 하는지 확인
  { id:84, cat:"판단보류검증", region:"서초구",   dong:"반포동",  name:"아크로리버파크",       areaSqm:59,  buildYear:2016, type:"초고가_전세희귀", note:"전세가율 매우 낮음 예상" },
  { id:85, cat:"판단보류검증", region:"강남구",   dong:"압구정동", name:"현대7차",             areaSqm:82,  buildYear:1978, type:"재건축_프리미엄", note:"재건축 프리미엄 극단값" },
  { id:86, cat:"판단보류검증", region:"창원시 성산구", dong:"내동", name:"내동주공1단지",     areaSqm:36,  buildYear:1976, type:"전세없음",   note:"전세 3건, 매매 40건 — 전세없음 보류" },
  { id:87, cat:"판단보류검증", region:"용산구",   dong:"이촌동",  name:"현대맨숀",             areaSqm:84,  buildYear:1975, type:"전세희귀",   note:"전세 2건 — 판단보류 예상" },
  { id:88, cat:"판단보류검증", region:"아산시",   dong:"배방읍 공수리", name:"아산배방우방아이유쉘2차", areaSqm:84, buildYear:2021, type:"전세율극단", note:"전세가율 극단값(낮음)" },
  { id:89, cat:"판단보류검증", region:"광주광역시 북구", dong:"운암동", name:"운암자이",      areaSqm:59,  buildYear:2005, type:"거래부족",   note:"거래 부족 QA" },
  { id:90, cat:"판단보류검증", region:"대전시 서구", dong:"둔산동", name:"크로바",             areaSqm:59,  buildYear:1994, type:"구축_지방",  note:"지방 구축" },
  { id:91, cat:"판단보류검증", region:"대구시 중구", dong:"삼덕동", name:"e편한세상삼덕",     areaSqm:59,  buildYear:2004, type:"거래부족_지방", note:"지방 거래부족" },

  // ══ [J] 브랜드·검색 QA 겸용 (9개) ══
  // 목적: BRAND_ALIAS OR검색 정확도 + 적정가 동시 검증
  { id:92,  cat:"브랜드검색", region:"노원구",    dong:"공릉동",   name:"태릉해링턴플레이스",   areaSqm:84,  buildYear:2019, type:"신축",    note:"헤링턴↔해링턴 QA" },
  { id:93,  cat:"브랜드검색", region:"천안시 서북구", dong:"두정동", name:"두정역효성해링턴플레이스", areaSqm:59, buildYear:2020, type:"지방_신축", note:"해링턴 지방" },
  { id:94,  cat:"브랜드검색", region:"안양시 만안구", dong:"안양동", name:"래미안안양메가트리아", areaSqm:59,  buildYear:2016, type:"일반",    note:"래미안↔레미안 QA" },
  { id:95,  cat:"브랜드검색", region:"성남시 분당구", dong:"백현동", name:"판교푸르지오그랑블",  areaSqm:84,  buildYear:2013, type:"일반",    note:"판교" },
  { id:96,  cat:"브랜드검색", region:"인천시 연수구", dong:"송도동", name:"더샵송도아크베이",    areaSqm:84,  buildYear:2020, type:"신축",    note:"더샵↔더샾 QA" },
  { id:97,  cat:"브랜드검색", region:"대전시 서구",   dong:"도마동", name:"도마e편한세상포레나", areaSqm:59,  buildYear:2022, type:"신축_지방", note:"이편한↔e편한 QA" },
  { id:98,  cat:"브랜드검색", region:"광주광역시 광산구", dong:"수완동", name:"수완GS자이",    areaSqm:84,  buildYear:2010, type:"일반",    note:"alias:수완자이 QA" },
  { id:99,  cat:"브랜드검색", region:"부산시 동래구",   dong:"온천동", name:"래미안온천2단지", areaSqm:84,  buildYear:2015, type:"일반",    note:"래미안 부산" },
  { id:100, cat:"브랜드검색", region:"의정부시",        dong:"의정부동", name:"의정부역센트럴자이앤위브캐슬", areaSqm:84, buildYear:2022, type:"신축", note:"자이↔XI QA" },
];

// ───────────────────────────────────────────────
// 2. 카테고리 분류 요약
// ───────────────────────────────────────────────
export const BT_CATEGORIES = {
  "수도권_강남":    { label: "수도권 – 서울 강남권",     count: 15, ids: [1,15] },
  "수도권_비강남":  { label: "수도권 – 서울 비강남권",   count: 10, ids: [16,25] },
  "수도권_경기":    { label: "수도권 – 경기",            count: 15, ids: [26,40] },
  "지방_부산":      { label: "지방 – 부산",              count: 10, ids: [41,50] },
  "지방_경남충청":  { label: "지방 – 경남·충청·전라",   count: 12, ids: [51,62] },
  "지방_대구":      { label: "지방 – 대구",              count:  5, ids: [63,67] },
  "재건축_구축":    { label: "재건축·구축 집중 검증",    count:  8, ids: [68,75] },
  "신축검증":       { label: "신축 집중 검증",            count:  8, ids: [76,83] },
  "판단보류검증":   { label: "판단 보류 케이스 검증",    count:  8, ids: [84,91] },
  "브랜드검색":     { label: "브랜드·검색 QA 겸용",      count:  9, ids: [92,100] },
};

// ───────────────────────────────────────────────
// 3. 결과 기록 템플릿 & 결과 배열
// ───────────────────────────────────────────────

/**
 * 백테스트 단일 결과 스키마
 * @typedef {Object} BtResult
 * @property {number}  id               - BT_LIST id
 * @property {string}  testDate         - 분석 실행일 (YYYY-MM-DD)
 * @property {boolean} searchOk         - 검색 성공 여부
 * @property {boolean} analysisOk       - 분석 완료 여부 (보류 아닌 경우 true)
 * @property {string}  engineMode       - jeonse | blend | sale | hold
 * @property {number}  saleDeals        - 사용된 매매 거래 수
 * @property {number}  jeonseDeals      - 사용된 전세 거래 수
 * @property {number}  actualPrice      - 당시 실거래가 (만원, 분석일 기준 최근 1건)
 * @property {number}  fairPrice        - ValueLens 적정가 (만원)
 * @property {number}  safetyPrice      - 안전 매수가 (만원)
 * @property {number}  gapRatio         - 오차율 ((fairPrice-actualPrice)/actualPrice)
 * @property {string}  buyGrade         - A~E | 보류
 * @property {string}  trustGrade       - 신뢰도 높음 | 보통 | 낮음 | 매우낮음
 * @property {number|null} jeonseRatio  - 실측 전세가율 (없으면 null)
 * @property {boolean} holdTriggered    - 판단 보류 발동 여부
 * @property {string|null} holdReason   - 보류 이유 (있으면)
 * @property {boolean} nanFound         - NaN 표시 발견 여부
 * @property {boolean} undefinedFound   - undefined 표시 발견 여부
 * @property {string}  note             - 기타 메모
 */

// 결과를 여기에 채워넣기
export const BT_RESULTS = [
  // 예시 (실제 테스트 후 채워넣기):
  // {
  //   id: 9, testDate: "2026-06-24", searchOk: true, analysisOk: true,
  //   engineMode: "jeonse", saleDeals: 35, jeonseDeals: 180,
  //   actualPrice: 130000, fairPrice: 128500, safetyPrice: 109225,
  //   gapRatio: -0.012, buyGrade: "C", trustGrade: "신뢰도 높음",
  //   jeonseRatio: 0.58, holdTriggered: false, holdReason: null,
  //   nanFound: false, undefinedFound: false,
  //   note: "헬리오시티 84㎡, 정상 동작"
  // },
];

// ───────────────────────────────────────────────
// 4. 통계 계산 함수
// ───────────────────────────────────────────────

/**
 * 완료된 결과만 필터 (분석 성공 & 실거래가 입력된 것)
 */
function getValidResults(results = BT_RESULTS) {
  return results.filter(r => r.analysisOk && r.actualPrice > 0 && r.fairPrice > 0 && !r.holdTriggered);
}

/**
 * MAPE (평균절대백분율오차) 계산
 * 목표: ≤ 10%
 */
export function calcMAPE(results = BT_RESULTS) {
  const valid = getValidResults(results);
  if (!valid.length) return null;
  const sum = valid.reduce((acc, r) => acc + Math.abs(r.gapRatio), 0);
  return (sum / valid.length * 100).toFixed(2) + "%";
}

/**
 * 카테고리별 통계
 */
export function calcByCategory(results = BT_RESULTS) {
  const cats = {};
  for (const r of getValidResults(results)) {
    const item = BT_LIST.find(b => b.id === r.id);
    if (!item) continue;
    const cat = item.cat;
    if (!cats[cat]) cats[cat] = { count: 0, mapeSum: 0, holdCount: 0 };
    cats[cat].count++;
    cats[cat].mapeSum += Math.abs(r.gapRatio) * 100;
  }
  // 보류 카운트
  for (const r of results.filter(r => r.holdTriggered)) {
    const item = BT_LIST.find(b => b.id === r.id);
    if (!item) continue;
    if (!cats[item.cat]) cats[item.cat] = { count: 0, mapeSum: 0, holdCount: 0 };
    cats[item.cat].holdCount++;
  }
  const out = {};
  for (const [cat, s] of Object.entries(cats)) {
    out[cat] = {
      label: BT_CATEGORIES[cat]?.label || cat,
      analyzed: s.count,
      held: s.holdCount,
      mape: s.count ? (s.mapeSum / s.count).toFixed(2) + "%" : "—",
    };
  }
  return out;
}

/**
 * 전체 진행 현황
 */
export function calcProgress(results = BT_RESULTS) {
  const total = BT_LIST.length;
  const done  = results.length;
  const ok    = results.filter(r => r.analysisOk).length;
  const held  = results.filter(r => r.holdTriggered).length;
  const err   = results.filter(r => !r.searchOk).length;
  return { total, done, ok, held, err, remaining: total - done };
}

/**
 * 오차율 분포 (오차 구간별 단지 수)
 */
export function calcErrorDistribution(results = BT_RESULTS) {
  const valid = getValidResults(results);
  const bands = { "0~3%": 0, "3~5%": 0, "5~10%": 0, "10~15%": 0, "15%+": 0 };
  for (const r of valid) {
    const abs = Math.abs(r.gapRatio) * 100;
    if      (abs < 3)  bands["0~3%"]++;
    else if (abs < 5)  bands["3~5%"]++;
    else if (abs < 10) bands["5~10%"]++;
    else if (abs < 15) bands["10~15%"]++;
    else               bands["15%+"]++;
  }
  return bands;
}

// ───────────────────────────────────────────────
// 5. 내보내기 함수 (브라우저 환경)
// ───────────────────────────────────────────────

/**
 * CSV 내보내기
 * 브라우저 콘솔에서: exportCSV() 실행
 */
export function exportCSV(results = BT_RESULTS) {
  const headers = [
    "id","카테고리","지역","동","단지명","면적(㎡)","준공연도","유형",
    "분석일","검색성공","분석성공","엔진모드",
    "매매거래수","전세거래수",
    "실거래가(만원)","적정가(만원)","안전매수가(만원)",
    "오차율(%)","매수등급","신뢰도등급",
    "전세가율","판단보류여부","보류이유",
    "NaN발견","undefined발견","메모"
  ];

  const rows = results.map(r => {
    const item = BT_LIST.find(b => b.id === r.id) || {};
    return [
      r.id, item.cat||"", item.region||"", item.dong||"", item.name||"",
      item.areaSqm||"", item.buildYear||"", item.type||"",
      r.testDate||"", r.searchOk?"Y":"N", r.analysisOk?"Y":"N", r.engineMode||"",
      r.saleDeals??"", r.jeonseDeals??"",
      r.actualPrice||"", r.fairPrice||"", r.safetyPrice||"",
      r.gapRatio != null ? (r.gapRatio * 100).toFixed(2) : "",
      r.buyGrade||"", r.trustGrade||"",
      r.jeonseRatio != null ? (r.jeonseRatio * 100).toFixed(1) + "%" : "",
      r.holdTriggered?"Y":"N", r.holdReason||"",
      r.nanFound?"Y":"N", r.undefinedFound?"Y":"N",
      (r.note||"").replace(/,/g,"·")
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const bom = "\uFEFF"; // Excel 한글 깨짐 방지
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ValueLens_백테스트_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`✅ CSV 내보내기 완료 (${results.length}건)`);
}

/**
 * JSON 내보내기
 * 브라우저 콘솔에서: exportJSON() 실행
 */
export function exportJSON(results = BT_RESULTS) {
  const payload = {
    meta: {
      version: "1.0",
      exportDate: new Date().toISOString(),
      totalItems: BT_LIST.length,
      completedItems: results.length,
      mape: calcMAPE(results),
      progress: calcProgress(results),
      errorDistribution: calcErrorDistribution(results),
    },
    byCategory: calcByCategory(results),
    results: results.map(r => ({
      ...r,
      _item: BT_LIST.find(b => b.id === r.id) || {},
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ValueLens_백테스트_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`✅ JSON 내보내기 완료 (${results.length}건)`);
}

/**
 * 콘솔 요약 리포트
 * 브라우저 콘솔에서: printReport() 실행
 */
export function printReport(results = BT_RESULTS) {
  const p = calcProgress(results);
  const mape = calcMAPE(results);
  const dist = calcErrorDistribution(results);
  const byCat = calcByCategory(results);

  console.log("═".repeat(50));
  console.log("  ValueLens 백테스트 리포트");
  console.log("═".repeat(50));
  console.log(`  진행: ${p.done}/${p.total} (${Math.round(p.done/p.total*100)}%)`);
  console.log(`  분석성공: ${p.ok}건 | 판단보류: ${p.held}건 | 검색실패: ${p.err}건`);
  console.log(`  MAPE (목표 ≤10%): ${mape || "데이터 없음"}`);
  console.log("");
  console.log("  오차 분포:");
  for (const [band, cnt] of Object.entries(dist)) {
    const bar = "█".repeat(cnt);
    console.log(`    ${band.padEnd(8)} ${bar} (${cnt}건)`);
  }
  console.log("");
  console.log("  카테고리별 MAPE:");
  for (const [cat, s] of Object.entries(byCat)) {
    console.log(`    ${s.label.padEnd(20)} MAPE ${s.mape} (${s.analyzed}건 분석, 보류 ${s.held}건)`);
  }
  console.log("═".repeat(50));
}
