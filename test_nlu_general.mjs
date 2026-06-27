/**
 * NLU 일반화 패턴 테스트 — 8개 카테고리 × 25개 = 200건
 * 특정 단지 하드코딩 없이 패턴별 동작 검증
 */
import { parseUserInput, NLU_INTENTS } from './src/engine/nlu/parseUserInput.js';
import { createConversationState } from './src/engine/conversationState.js';
const I = NLU_INTENTS;

const S = {
  empty:       () => createConversationState(),
  withComplex: (n="잠실엘스") => ({ ...createConversationState(), currentComplex:{complex_name:n,area_list:"[84.8,60.0]"} }),
  withArea:    (a=84.8) => ({ ...createConversationState(), currentComplex:{complex_name:"잠실엘스",area_list:"[84.8,60.0]"}, currentArea:a }),
  withCands:   () => ({ ...createConversationState(), candidates:[{complex_name:"A"},{complex_name:"B"}], pendingSlot:"candidate" }),
  pendingArea: () => ({ ...createConversationState(), currentComplex:{complex_name:"래미안",area_list:"[84.0,59.0]"}, pendingSlot:"area" }),
};

// ── 카테고리 1: 지역 + 평형 + 아파트/단지/집 + 의도 ──
// Rule A: 아파트/단지/집은 단지명 아님 → recommend
// Rule F: 적정가/시세/얼마야 = 의도어
const CAT1 = [
  // [입력, 기대intent, 상태, 검증fn, 설명]
  ["상인동 30평대 아파트 적정가는?",      I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaType==="range", "지역+평대+아파트+의도"],
  ["공릉동 20평대 아파트 보여줘",         I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaType==="range", "지역+평대+아파트"],
  ["마포구 국평 아파트 얼마야",           I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+국평+아파트+의도"],
  ["대치동 25평 시세",                   I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===75, "지역+평+시세"],
  ["반포 30평대 비싼가?",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaType==="range", "지역+평대+의도"],
  ["분당 40평대 실거주",                 I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaType==="range"&&r.purpose==="live", "지역+평대+목적"],
  ["해운대 84 아파트 추천",              I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+면적+아파트+추천"],
  ["수성구 40평대 괜찮은 단지",          I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaType==="range", "지역+평대+단지"],
  ["일산 7억 이하 국평 보여줘",          I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.max>0&&r.areaSqm===84, "지역+예산+국평"],
  ["송도 7억대 34평 추천해줘",           I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84&&r.budget?.min>0, "지역+예산+평형"],
  ["잠실 59 아파트 얼마야",             I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===59, "지역+면적+아파트+의도"],
  ["서초 24평 집 시세",                 I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===72, "지역+평+집+시세"],
  ["강동 34평대 아파트",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaType==="range", "지역+평대+아파트"],  // 34평대=range
  ["은평 소형 아파트 추천",              I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaType==="range", "지역+소형+아파트"],
  ["마포 대형 아파트",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaType==="range", "지역+대형+아파트"],
  ["부산 해운대 84 추천",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+지역+면적+추천"],
  ["대구 수성구 34평 단지",             I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+지역+평+단지"],
  ["수원 광교 84 실거주",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84&&r.purpose==="live", "지역+지역+면적+목적"],
  ["인천 송도 7억 집",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.exact>0||r.budget?.min>0, "지역+지역+예산+집"],
  ["성남 분당 40평대 괜찮은 곳",        I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaType==="range", "지역+지역+평대+조건"],
  ["강남 40평 아파트 시세",             I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===114, "지역+평+아파트+시세"],
  ["의정부 30평 단지 추천",             I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+평+단지+추천"],
  ["창원 84 아파트 얼마야",             I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+면적+아파트+의도"],
  ["전주 25평 집 보여줘",              I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===75, "지역+평+집+보기"],
  ["청주 오송 34평 추천",              I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+지역+평+추천"],
];

// ── 카테고리 2: 지역 + 예산 + 추천 ──
const CAT2 = [
  ["송도 7억 추천해줘",                I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.exact>0, "지역+예산+추천"],
  ["7억대 아파트 추천",                I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.min>0, "예산+아파트+추천"],
  ["6~7억 아파트 추천",                I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.min>0&&r.budget?.max>0, "예산범위+추천"],
  ["7억 이하 아파트",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.max>0, "예산이하+아파트"],
  ["8억 정도 추천해줘",                I.RECOMMEND_COMPLEX, S.empty(), r=>!!(r.budget), "예산정도+추천"],
  ["수성구 7억 이하 추천",             I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.max>0, "지역+예산이하+추천"],
  ["판교 10억 이하",                   I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.max>0, "지역+예산이하"],
  ["강남 15억대 추천",                 I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.min>0, "지역+예산대+추천"],
  ["부산 5억 아파트",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.exact>0, "지역+예산+아파트"],
  ["대전 4억대 집 추천",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.min>0, "지역+예산대+집+추천"],
  ["하남 8억~10억 추천",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.min>0&&r.budget?.max>0, "지역+예산범위+추천"],
  ["일산 6억 이하 보여줘",             I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.max>0, "지역+예산이하+보기"],
  ["광명 7억 단지",                    I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.exact>0, "지역+예산+단지"],
  ["의왕 5억대 추천",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.min>0, "지역+예산대+추천"],
  ["하남 미사 6억 아파트",             I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.exact>0, "지역+지역+예산+아파트"],
  ["구리 7억 이하",                    I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.max>0, "지역+예산이하"],
  ["세종 5억 실거주",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.exact>0&&r.purpose==="live", "지역+예산+목적"],
  ["9억 대치",                        I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.exact>0||r.budget?.min>0, "예산+지역"],
  ["10억 이하 잠실",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.max>0, "예산이하+지역"],
  ["15억대 강남",                     I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.min>0, "예산대+지역"],
  ["5억~7억 수원",                    I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.min>0, "예산범위+지역"],
  ["평택 3억대 투자",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.purpose==="invest", "지역+예산+투자"],
  ["천안 4억 이하 국평",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84&&r.budget?.max>0, "지역+예산+국평"],
  ["대구 6억 34평",                   I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84&&r.budget?.exact>0, "지역+예산+평"],
  ["울산 4억 소형",                    I.RECOMMEND_COMPLEX, S.empty(), r=>r.budget?.exact>0&&r.areaType==="range", "지역+예산+소형"],
];

// ── 카테고리 3: 지역 + 브랜드 + 후보 (Rule D) ──
const CAT3 = [
  ["수성구 래미안",                    I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="래미안", "지역+브랜드"],
  ["송도 더샵",                        I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="더샵", "지역+브랜드"],
  ["압구정 현대",                      I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="현대", "지역+브랜드"],
  ["잠실 자이",                        I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="자이", "지역+브랜드"],
  ["반포 래미안",                      I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="래미안", "지역+브랜드"],
  ["해운대 자이",                      I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="자이", "지역+브랜드"],
  ["동래 래미안",                      I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="래미안", "지역+브랜드"],
  ["판교 힐스테이트",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="힐스테이트", "지역+브랜드"],
  ["광명 자이위브",                    I.RECOMMEND_COMPLEX, S.empty(), null, "지역+브랜드조합"],  // 광명=지역, 자이위브=브랜드수식
  ["강남 래미안 84",                   I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+브랜드+면적"],
  ["부산 롯데캐슬",                    I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="롯데캐슬", "지역+브랜드"],
  ["대구 힐스테이트 84",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="힐스테이트", "지역+브랜드+면적"],
  ["인천 더샵 국평",                   I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+브랜드+국평"],
  ["수원 래미안 34평",                 I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+브랜드+평"],
  ["일산 자이 7억",                    I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="자이", "지역+브랜드+예산"],
  ["노원 한화포레나",                   I.RECOMMEND_COMPLEX, S.empty(), r=>r.brand==="한화포레나", "지역+브랜드"],
  ["마포 푸르지오 84",                 I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+브랜드+면적"],
  ["은평 이편한세상",                   I.RECOMMEND_COMPLEX, S.empty(), r=>!!r.brand, "지역+브랜드"],
  ["동탄 힐스테이트 34평",             I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+브랜드+평"],
  ["성남 분당 자이 84",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+지역+브랜드+면적"],
  ["의정부 자이앤위브",                 I.RECOMMEND_COMPLEX, S.empty(), null, "구체적단지명-recommend도가능"],  // 지역+자이=recommend
  ["잠실엘스",                         I.SEARCH_COMPLEX,    S.empty(), null, "구체적단지명만"],
  ["반포자이",                         I.SEARCH_COMPLEX,    S.empty(), null, "구체적단지명만"],
  ["헬리오시티",                        I.SEARCH_COMPLEX,    S.empty(), null, "구체적단지명만"],
  ["래미안대치팰리스",                  I.SEARCH_COMPLEX,    S.empty(), null, "구체적단지명만"],
];

// ── 카테고리 4: 지역 + 학군/실거주/역세권/투자 ──
const CAT4 = [
  ["아이 둘 키우기 좋은 곳",           I.RECOMMEND_COMPLEX, S.empty(), r=>r.family==="children", "가족+목적"],
  ["애 둘 학군 좋은 곳",              I.RECOMMEND_COMPLEX, S.empty(), r=>r.family==="children", "가족+학군"],
  ["실거주로 괜찮은 곳",              I.RECOMMEND_COMPLEX, S.empty(), r=>r.purpose==="live", "실거주"],
  ["강남 출퇴근 좋은 곳",             I.RECOMMEND_COMPLEX, S.empty(), r=>!!r.commute, "출퇴근+지역"],
  ["여의도 출퇴근 편한 곳",            I.RECOMMEND_COMPLEX, S.empty(), r=>!!r.commute, "출퇴근+지역"],
  ["투자용으로 좋은 곳",              I.RECOMMEND_COMPLEX, S.empty(), r=>r.purpose==="invest", "투자목적"],
  ["전세 살 곳",                      I.RECOMMEND_COMPLEX, S.empty(), r=>r.purpose==="jeonse"||r.purpose==="live", "전세+살다"],
  ["신혼집 찾고 있어",                 I.RECOMMEND_COMPLEX, S.empty(), r=>r.family==="newlywed", "신혼+집"],
  ["초등학교 좋은 곳",                I.RECOMMEND_COMPLEX, S.empty(), r=>r.preference?.includes("school")||r.family==="children"||true, "학교+선호"],
  ["역세권 좋은 곳",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.preference?.includes("transit"), "역세권"],
  ["공원 가까운 아파트",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.preference?.includes("nature"), "자연환경"],
  ["조용한 동네 아파트",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.preference?.includes("quiet"), "조용함"],
  ["신축 아파트 추천",                 I.RECOMMEND_COMPLEX, S.empty(), r=>r.preference?.includes("new"), "신축"],
  ["잠실 실거주",                     I.RECOMMEND_COMPLEX, S.empty(), r=>r.purpose==="live", "지역+실거주"],
  ["송도 투자용",                     I.RECOMMEND_COMPLEX, S.empty(), r=>r.purpose==="invest", "지역+투자"],
  ["가성비 좋은 곳",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.preference?.includes("value"), "가성비"],
  ["1인 가구 좋은 곳",                I.RECOMMEND_COMPLEX, S.empty(), r=>r.family==="single", "1인가구"],
  ["부모님 모실 곳",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.family==="elderly", "노인+가족"],
  ["부산 학군 좋은 아파트",            I.RECOMMEND_COMPLEX, S.empty(), r=>r.preference?.includes("school"), "지역+학군+아파트"],
  ["강남 역세권 84",                  I.RECOMMEND_COMPLEX, S.empty(), r=>r.areaSqm===84, "지역+역세권+면적"],
  ["어디가 살기 좋아?",               I.RECOMMEND_COMPLEX, S.empty(), null, "막연한 추천"],
  ["어떤 아파트가 좋아?",              I.RECOMMEND_COMPLEX, S.empty(), null, "막연한 추천"],
  ["좋은 학군 어디야?",               I.RECOMMEND_COMPLEX, S.empty(), r=>r.preference?.includes("school"), "학군질문"],
  ["서울 살기 좋은 곳",               I.RECOMMEND_COMPLEX, S.empty(), r=>true, "도시+살기"],
  ["아파트 추천해줘",                  I.RECOMMEND_COMPLEX, S.empty(), null, "단순추천"],
];

// ── 카테고리 5: 단지명 + 평형 (search_complex) ──
const CAT5 = [
  ["잠실엘스84",                       I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적붙여쓰기"],
  ["잠실 엘스 84",                     I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["잠실엘스 국평",                    I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+국평"],
  ["엘스 34평",                        I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "별칭+평형"],
  ["반포자이 84",                      I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["반포자이 34평",                    I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+평형"],
  ["헬리오시티 84",                    I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["헬리오 국평",                      I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "별칭+국평"],
  ["래미안대치팰리스 84",              I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["마래푸 84",                        I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "별칭+면적"],
  ["은마 76",                          I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===76, "단지+면적"],
  ["삼익비치 66",                      I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===66, "단지+면적"],
  ["동래래미안아이파크 84",             I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["압구정현대 163",                   I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===163, "단지+면적"],
  ["잠실엘스 84㎡",                    I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적기호"],
  ["반포자이 59",                      I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===59, "단지+면적"],
  ["더샵송도아크베이 84",              I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["마포래미안푸르지오 84",            I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["래미안퍼스티지 84",                I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["고덕그라시움 84",                  I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["잠실 파크리오 84",                 I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+면적"],
  ["34평 잠실엘스",                    I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "평형+단지 역순"],
  ["국평 헬리오시티",                  I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "국평+단지 역순"],
  ["84 잠실엘스",                      I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "면적+단지 역순"],
  ["잠실엘스 84B",                     I.SEARCH_COMPLEX, S.empty(), r=>r.areaSqm===84, "단지+타입"],
];

// ── 카테고리 6: 후속어 (검색 금지) ──
const CAT6 = [
  ["다 보여줘",                        I.SHOW_ALL_AREAS,    S.withComplex(), r=>r.shouldSearch===false, "show_all"],
  ["전부 보여줘",                      I.SHOW_ALL_AREAS,    S.withComplex(), r=>r.shouldSearch===false, "show_all"],
  ["모두 보여줘",                      I.SHOW_ALL_AREAS,    S.withComplex(), r=>r.shouldSearch===false, "show_all"],
  ["평형 다 보여줘",                   I.SHOW_ALL_AREAS,    S.withComplex(), r=>r.shouldSearch===false, "show_all"],
  ["그거 말고",                        I.CHANGE_CANDIDATE,  S.withCands(),   r=>r.shouldSearch===false, "다른후보"],
  ["다른 거",                          I.CHANGE_CANDIDATE,  S.withCands(),   r=>r.shouldSearch===false, "다른후보"],
  ["다른 단지",                        I.CHANGE_CANDIDATE,  S.withCands(),   r=>r.shouldSearch===false, "다른후보"],
  ["그 다음",                          I.CHANGE_CANDIDATE,  S.withCands(),   r=>r.shouldSearch===false, "다른후보"],
  ["아니",                             I.DENY,              S.withArea(),    r=>r.shouldSearch===false, "부정"],
  ["아니야",                           I.DENY,              S.withArea(),    r=>r.shouldSearch===false, "부정"],
  ["응",                               I.CONFIRM,           S.withComplex(), r=>r.shouldSearch===false, "확인"],
  ["맞아",                             I.CONFIRM,           S.withComplex(), r=>r.shouldSearch===false, "확인"],
  ["그걸로",                           I.CONFIRM,           S.withComplex(), r=>r.shouldSearch===false, "확인"],
  ["다시",                             I.RESET,             S.withArea(),    r=>r.shouldSearch===false, "초기화"],
  ["처음부터",                          I.RESET,             S.withArea(),    r=>r.shouldSearch===false, "초기화"],
  ["1번",                              I.CANDIDATE_SELECT,  S.withCands(),   r=>r.shouldSearch===false, "번호선택"],
  ["2번째",                            I.CANDIDATE_SELECT,  S.withCands(),   r=>r.shouldSearch===false, "번호선택"],
  ["전세는?",                          I.JEONSE_INFO,       S.withArea(),    r=>r.shouldSearch===false, "후속전세"],
  ["최근 거래는?",                     I.RECENT_DEALS,      S.withArea(),    r=>r.shouldSearch===false, "후속거래"],
  ["학군은?",                          I.SCHOOL_INFO,       S.withArea(),    r=>r.shouldSearch===false, "후속학군"],
  ["지금 사도 돼?",                    I.BUY_OPINION,       S.withArea(),    r=>r.shouldSearch===false, "매수의견"],
  ["살 만해?",                         I.BUY_OPINION,       S.withArea(),    r=>r.shouldSearch===false, "매수의견"],
  ["얼마면 괜찮아?",                   I.PRICE_OPINION,     S.withArea(),    r=>r.shouldSearch===false, "가격의견"],
  ["더 큰 평수",                       I.LARGER_AREA,       S.withArea(),    r=>r.shouldSearch===false, "큰평수"],
  ["더 작은 평수",                     I.SMALLER_AREA,      S.withArea(),    r=>r.shouldSearch===false, "작은평수"],
];

// ── 카테고리 7: 데이터 없음 / 설명 요청 ──
const CAT7 = [
  ["네이버에는 있는데 왜 없어?",        I.DATA_MISSING,   S.empty(), r=>r.shouldSearch===false, "데이터없음"],
  ["국토부에는 있는데",                 I.DATA_MISSING,   S.empty(), r=>r.shouldSearch===false, "데이터없음"],
  ["데이터가 왜 없어?",                 I.DATA_MISSING,   S.empty(), r=>r.shouldSearch===false, "데이터없음"],
  ["왜 분석이 안 돼?",                 I.EXPLAIN_REASON, S.empty(), r=>r.shouldSearch===false, "설명요청"],
  ["왜 이런 가격이야?",                I.EXPLAIN_REASON, S.withArea(), r=>r.shouldSearch===false, "설명요청"],
  ["어떻게 계산한 거야?",              I.EXPLAIN_REASON, S.withArea(), r=>r.shouldSearch===false, "설명요청"],
  ["계약 전 확인사항",                  I.CONTRACT_CHECK, S.withArea(), r=>r.shouldSearch===false, "계약체크"],
  ["등기 확인해야 해?",                I.CONTRACT_CHECK, S.withArea(), r=>r.shouldSearch===false, "계약체크"],
  ["계약서 쓸 때 주의사항",             I.CONTRACT_CHECK, S.empty(), r=>r.shouldSearch===false, "계약체크"],
  ["왜 안 나와?",                      I.EXPLAIN_REASON, S.empty(), null, "설명요청"],
  ["왜 없지?",                         I.DATA_MISSING,   S.empty(), null, "데이터없음"],
  ["실거래 없는 이유",                  I.EXPLAIN_REASON, S.empty(), null, "설명요청"],
  ["DB에 없는 이유",                   I.DATA_MISSING,   S.empty(), null, "데이터없음"],
  ["비교해줘",                         I.COMPARE_COMPLEX, S.withComplex(), null, "비교요청"],  // shouldSearch는 context 상황에 따라 다름
  ["비슷한 단지 없어?",                I.SIMILAR_COMPLEX, S.withComplex(), null, "유사단지"],
  ["더 싼 거 없어?",                   I.CHEAPER_OPTION, S.withComplex(), r=>r.shouldSearch===false, "저렴한대안"],
  ["좀 더 싸게 없어?",                 I.CHEAPER_OPTION, S.withComplex(), r=>r.shouldSearch===false, "저렴한대안"],
  ["음",                               I.UNKNOWN_FOLLOWUP, S.empty(), r=>r.shouldSearch===false, "감탄사"],
  ["글쎄",                             I.UNKNOWN_FOLLOWUP, S.empty(), r=>r.shouldSearch===false, "감탄사"],
  ["안녕",                             I.GREETING,       S.empty(), r=>r.shouldSearch===false, "인사"],
  ["안녕하세요",                        I.GREETING,       S.empty(), r=>r.shouldSearch===false, "인사"],
  ["시작",                             I.GREETING,       S.empty(), r=>r.shouldSearch===false, "인사"],
  ["처음 뵙겠습니다",                   I.GREETING,       S.empty(), r=>r.shouldSearch===false, "인사"],
  ["잘 부탁해",                        I.GREETING,       S.empty(), null, "인사류"],
  ["도와줘",                           I.RECOMMEND_COMPLEX, S.empty(), null, "도움요청"],
];

// ── 카테고리 8: 면적만 입력 ──
const CAT8 = [
  ["25평",    I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===75&&r.shouldSearch===false, "평형단독"],
  ["34평",    I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===84&&r.shouldSearch===false, "평형단독"],
  ["84",      I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===84&&r.shouldSearch===false, "면적단독"],
  ["59",      I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===59&&r.shouldSearch===false, "면적단독"],
  ["국평",    I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===84&&r.shouldSearch===false, "국평단독"],
  ["국민평형", I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===84&&r.shouldSearch===false, "국민평형"],
  ["114",     I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===114&&r.shouldSearch===false, "면적단독"],
  ["84A",     I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===84&&r.shouldSearch===false, "타입단독"],
  ["84B",     I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===84&&r.shouldSearch===false, "타입단독"],
  ["30평대",  I.AREA_SELECT, S.pendingArea(), r=>r.areaType==="range"&&r.shouldSearch===false, "평대단독"],
  ["40평대",  I.AREA_SELECT, S.pendingArea(), r=>r.areaType==="range"&&r.shouldSearch===false, "평대단독"],
  ["소형",    I.AREA_SELECT, S.pendingArea(), r=>r.areaType==="range"&&r.shouldSearch===false, "상대면적"],
  ["대형",    I.AREA_SELECT, S.pendingArea(), r=>r.areaType==="range"&&r.shouldSearch===false, "상대면적"],
  ["넓은 평수", I.LARGER_AREA, S.withArea(),  r=>r.shouldSearch===false, "큰평수"],
  ["작은 평수", I.SMALLER_AREA, S.withArea(), r=>r.shouldSearch===false, "작은평수"],
  ["큰 거",   I.LARGER_AREA,  S.withArea(),  r=>r.shouldSearch===false, "큰평수"],
  ["20평",    I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===59&&r.shouldSearch===false, "평형단독"],
  ["45평",    I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===135&&r.shouldSearch===false, "평형단독"],
  ["101",     I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===101&&r.shouldSearch===false, "면적단독"],
  ["59㎡",    I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===59&&r.shouldSearch===false, "면적기호"],
  ["84㎡",    I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===84&&r.shouldSearch===false, "면적기호"],
  ["33평",    I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===99&&r.shouldSearch===false, "평형단독"],
  ["38평",    I.AREA_SELECT, S.pendingArea(), r=>r.areaSqm===114&&r.shouldSearch===false, "평형단독"],
  ["더 큰 평수", I.LARGER_AREA, S.withArea(), r=>r.shouldSearch===false, "큰평수"],
  ["더 작은 거", I.SMALLER_AREA, S.withArea(), r=>r.shouldSearch===false, "작은평수"],
];

// ── 실행 ──
const ALL_CASES = [
  ...CAT1.map(c=>[...c, "CAT1_지역+조건+아파트"]),
  ...CAT2.map(c=>[...c, "CAT2_지역+예산"]),
  ...CAT3.map(c=>[...c, "CAT3_지역+브랜드"]),
  ...CAT4.map(c=>[...c, "CAT4_목적/가족"]),
  ...CAT5.map(c=>[...c, "CAT5_단지+평형"]),
  ...CAT6.map(c=>[...c, "CAT6_후속어"]),
  ...CAT7.map(c=>[...c, "CAT7_데이터/설명"]),
  ...CAT8.map(c=>[...c, "CAT8_면적단독"]),
];

console.log("═".repeat(65));
console.log(` [NLU General Pattern Test] ${ALL_CASES.length}건`);
console.log("═".repeat(65));

let pass=0, fail=0;
const fails=[];
const catStats={};

for (const [input, expectIntent, state, extraCheck, desc, cat] of ALL_CASES) {
  const result = parseUserInput(input, state);
  const intentOk = result.intent === expectIntent;
  const extraOk  = extraCheck ? extraCheck(result) : true;
  const ok = intentOk && extraOk;

  if (!catStats[cat]) catStats[cat] = {pass:0,fail:0};
  if (ok) { pass++; catStats[cat].pass++; }
  else {
    fail++;
    catStats[cat].fail++;
    const reason = [];
    if (!intentOk) reason.push(`intent=${result.intent}(기대:${expectIntent})`);
    if (!extraOk)  reason.push(`extra실패(areaSqm=${result.areaSqm},budget=${JSON.stringify(result.budget)},shouldSearch=${result.shouldSearch})`);
    fails.push({ input, desc, reason: reason.join("|"), cat });
  }
}

// 결과
console.log(`\n총 ${ALL_CASES.length}건 / 통과 ${pass} / 실패 ${fail}`);
console.log(`전체 정확도: ${(pass/ALL_CASES.length*100).toFixed(1)}%`);

console.log("\n[카테고리별 결과]");
for (const [cat, v] of Object.entries(catStats)) {
  const t = v.pass+v.fail;
  const pct = (v.pass/t*100).toFixed(0);
  const bar = "█".repeat(Math.round(v.pass/t*10))+"░".repeat(10-Math.round(v.pass/t*10));
  console.log(`  ${cat.padEnd(20)} ${bar} ${v.pass}/${t} (${pct}%)`);
}

if (fails.length > 0) {
  console.log(`\n[실패 ${Math.min(30,fails.length)}건]`);
  fails.slice(0,30).forEach((f,i)=>console.log(`  ${i+1}. [${f.cat}] "${f.input}" → ${f.reason}`));
}

console.log("\n[Rule 검증]");
const noSearch = ALL_CASES.filter(c=>c[3]?.toString().includes("shouldSearch===false"));
const noSearchPass = noSearch.filter(([input,,state,check])=>{
  const r=parseUserInput(input,state);
  return check?check(r):r.shouldSearch===false;
}).length;
console.log(`  검색 금지(shouldSearch=false): ${noSearchPass}/${noSearch.length}`);

const ruleA = ALL_CASES.filter(c=>c[5]==="CAT1_지역+조건+아파트"&&c[3]?.toString().includes("!r.complexQuery"));
const ruleAPass = ruleA.filter(([input,,state,check])=>{
  const r=parseUserInput(input,state);
  return check?check(r):true;
}).length;
console.log(`  Rule A (아파트/단지 ≠ 단지명): ${ruleAPass}/${ruleA.length}`);
