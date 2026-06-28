# ValueLens 사용자 여정 정의서

> 작성일: 2026-06-29  
> 목적: 사용자가 실제로 어떻게 입력하는지를 먼저 정의하고, 이를 기반으로 NLU/대화 흐름을 설계한다.  
> 원칙: 코드보다 사용자 시나리오가 먼저다.

---

## 1. 사용자 첫 입력 분류

### A. 지역만
```
공릉동
우동
송도
해운대
강남
잠실
```
- **intent**: `region_only`
- **entity**: `{ dong: "공릉동" }`
- **다음 질문**: "공릉동에서 무엇을 찾으시나요? 특정 단지 / 예산으로 추천 / 시세 확인"
- **최종 목적**: 단지 특정 후 적정가/매수 분석

---

### B. 지역 + 평형
```
공릉동 25평
송도 34평
우동 84
해운대 32평
```
- **intent**: `region_with_area`
- **entity**: `{ dong: "공릉동", pyeong: 25, areaSqm: 59 }`
- **다음 질문**: "공릉동의 어떤 단지를 찾으시나요?"
- **최종 목적**: 특정 단지 + 평형 → 적정가 분석

---

### C. 지역 + 예산
```
공릉동 7억
송도 5억 이하
해운대 10억대
강남 20억
```
- **intent**: `region_with_budget`
- **entity**: `{ dong: "공릉동", budget: 70000 }`
- **다음 질문**: "공릉동에서 7억 이하 단지를 추천해드릴까요?"
- **최종 목적**: 예산 기반 단지 추천

---

### D. 지역 + 추천
```
공릉동 추천
송도 7억 추천
해운대 좋은 단지
강남 어디가 좋아
```
- **intent**: `recommend`
- **entity**: `{ dong: "공릉동", budget: null }`
- **다음 질문**: "어떤 조건으로 추천해드릴까요? 예산 / 평형 / 학군"
- **최종 목적**: 조건 기반 단지 추천

---

### E. 단지명만
```
동부아파트
래미안
자이
한보
올림픽타운
```
- **intent**: `complex_search`
- **entity**: `{ complexName: "동부아파트" }`
- **다음 질문**: 여러 지역 있으면 → "어느 지역의 동부아파트인가요?"
- **최종 목적**: 단지 특정 → 적정가/매수 분석

---

### F. 단지 + 목적
```
동부아파트 적정가
동부아파트 매수해도 돼?
동부아파트 전세
래미안 시세
자이 지금 살만해?
```
- **intent**: `complex_with_purpose`
- **entity**: `{ complexName: "동부아파트", purpose: "fair" }`
- **다음 질문**: 단지 특정 → 평형 질문
- **최종 목적**: 바로 분석 흐름

---

### G. 자유 질문
```
애 둘인데 어디가 좋을까
7억으로 어디 살까
계약 전에 뭘 봐야 해
전세 사기 위험할까
지금 집 사도 돼?
갭투자 해도 될까
```
- **intent**: `general_question`
- **entity**: 다양
- **다음 질문**: 의도 파악 후 분기
- **최종 목적**: 정보 제공 또는 분석 흐름으로 연결

---

## 2. 실제 사용자 질문 100개

### A. 지역만 (10개)

| # | 입력 | intent | entity | 다음 질문 | 최종 목적 |
|---|------|--------|--------|-----------|-----------|
| 1 | 공릉동 | region_only | dong=공릉동 | 어떤 단지를 찾으시나요? | 단지→분석 |
| 2 | 우동 | region_only | dong=우동 | 어떤 단지를 찾으시나요? | 단지→분석 |
| 3 | 송도 | region_only | region=송도 | 어떤 단지를 찾으시나요? | 단지→분석 |
| 4 | 해운대 | region_only | region=해운대 | 어떤 단지를 찾으시나요? | 단지→분석 |
| 5 | 잠실 | region_only | dong=잠실 | 어떤 단지를 찾으시나요? | 단지→분석 |
| 6 | 강남 | region_only | region=강남 | 어떤 단지를 찾으시나요? | 단지→분석 |
| 7 | 반포동 | region_only | dong=반포동 | 어떤 단지를 찾으시나요? | 단지→분석 |
| 8 | 대치동 | region_only | dong=대치동 | 어떤 단지를 찾으시나요? | 단지→분석 |
| 9 | 노원구 | region_only | sigungu=노원구 | 어떤 동/단지를 찾으시나요? | 단지→분석 |
| 10 | 마포구 | region_only | sigungu=마포구 | 어떤 동/단지를 찾으시나요? | 단지→분석 |

---

### B. 지역 + 평형 (10개)

| # | 입력 | intent | entity | 다음 질문 | 최종 목적 |
|---|------|--------|--------|-----------|-----------|
| 11 | 공릉동 25평 | region_with_area | dong=공릉동, pyeong=25, sqm=59 | 어떤 단지를 찾으시나요? | 분석 |
| 12 | 우동 34평 | region_with_area | dong=우동, pyeong=34, sqm=84 | 어떤 단지를 찾으시나요? | 분석 |
| 13 | 송도 84 | region_with_area | region=송도, sqm=84 | 어떤 단지를 찾으시나요? | 분석 |
| 14 | 해운대 32평 | region_with_area | region=해운대, pyeong=32, sqm=84 | 어떤 단지를 찾으시나요? | 분석 |
| 15 | 잠실 25평대 | region_with_area | dong=잠실, pyeong=25, sqm=59 | 어떤 단지를 찾으시나요? | 분석 |
| 16 | 강남 59㎡ | region_with_area | region=강남, sqm=59 | 어떤 단지를 찾으시나요? | 분석 |
| 17 | 반포 84㎡ | region_with_area | region=반포, sqm=84 | 어떤 단지를 찾으시나요? | 분석 |
| 18 | 대치동 30평 | region_with_area | dong=대치동, pyeong=30, sqm=84 | 어떤 단지를 찾으시나요? | 분석 |
| 19 | 노원 전용84 | region_with_area | region=노원, sqm=84 | 어떤 단지를 찾으시나요? | 분석 |
| 20 | 마포 국민평형 | region_with_area | region=마포, sqm=59 | 어떤 단지를 찾으시나요? | 분석 |

---

### C. 지역 + 예산 (10개)

| # | 입력 | intent | entity | 다음 질문 | 최종 목적 |
|---|------|--------|--------|-----------|-----------|
| 21 | 공릉동 7억 | region_with_budget | dong=공릉동, budget=7억 | 7억 이하 단지 추천할까요? | 추천 |
| 22 | 송도 5억 이하 | region_with_budget | region=송도, budget=5억 | 5억 이하 단지 추천할까요? | 추천 |
| 23 | 해운대 10억 | region_with_budget | region=해운대, budget=10억 | 10억대 단지 추천할까요? | 추천 |
| 24 | 잠실 15억 | region_with_budget | dong=잠실, budget=15억 | 15억 이하 단지 추천할까요? | 추천 |
| 25 | 강남 20억대 | region_with_budget | region=강남, budget=20억 | 20억대 단지 추천할까요? | 추천 |
| 26 | 마포 8억 | region_with_budget | region=마포, budget=8억 | 8억 이하 단지 추천할까요? | 추천 |
| 27 | 노원 4억 이하 | region_with_budget | region=노원, budget=4억 | 4억 이하 단지 추천할까요? | 추천 |
| 28 | 반포 30억 | region_with_budget | region=반포, budget=30억 | 30억대 단지 추천할까요? | 추천 |
| 29 | 대치동 25억 | region_with_budget | dong=대치동, budget=25억 | 25억 이하 단지 추천할까요? | 추천 |
| 30 | 성수동 12억 | region_with_budget | dong=성수동, budget=12억 | 12억 이하 단지 추천할까요? | 추천 |

---

### D. 지역 + 추천 (10개)

| # | 입력 | intent | entity | 다음 질문 | 최종 목적 |
|---|------|--------|--------|-----------|-----------|
| 31 | 공릉동 추천 | recommend | dong=공릉동 | 조건을 알려주세요 (예산/평형) | 단지 추천 |
| 32 | 송도 7억 추천 | recommend | region=송도, budget=7억 | 평형 선택 | 단지 추천 |
| 33 | 해운대 좋은 데 | recommend | region=해운대 | 조건을 알려주세요 | 단지 추천 |
| 34 | 강남 어디가 좋아 | recommend | region=강남 | 조건을 알려주세요 | 단지 추천 |
| 35 | 잠실 살만한 데 | recommend | dong=잠실 | 조건을 알려주세요 | 단지 추천 |
| 36 | 마포 신혼집 추천 | recommend | region=마포, tag=신혼 | 예산을 알려주세요 | 단지 추천 |
| 37 | 노원 학교 좋은 데 | recommend | region=노원, tag=학군 | 예산을 알려주세요 | 단지 추천 |
| 38 | 반포 랜드마크 | recommend | region=반포 | 조건을 알려주세요 | 단지 추천 |
| 39 | 성수동 핫한 데 | recommend | dong=성수동 | 조건을 알려주세요 | 단지 추천 |
| 40 | 송파 10억 이하 추천 | recommend | region=송파, budget=10억 | 평형 선택 | 단지 추천 |

---

### E. 단지명만 (10개)

| # | 입력 | intent | entity | 다음 질문 | 최종 목적 |
|---|------|--------|--------|-----------|-----------|
| 41 | 동부아파트 | complex_search | complexName=동부아파트 | 어느 지역? (복수 결과) | 분석 |
| 42 | 래미안 | complex_search | complexName=래미안 | 어느 지역? | 분석 |
| 43 | 자이 | complex_search | complexName=자이 | 어느 지역? | 분석 |
| 44 | 한보 | complex_search | complexName=한보 | 어느 지역? | 분석 |
| 45 | 올림픽타운 | complex_search | complexName=올림픽타운 | 어느 지역? | 분석 |
| 46 | 리센츠 | complex_search | complexName=리센츠 | 지역 확인 (잠실) | 분석 |
| 47 | 헬리오시티 | complex_search | complexName=헬리오시티 | 지역 확인 (송파) | 분석 |
| 48 | 은마아파트 | complex_search | complexName=은마 | 지역 확인 (대치) | 분석 |
| 49 | 타워팰리스 | complex_search | complexName=타워팰리스 | 지역 확인 (도곡) | 분석 |
| 50 | 마포래미안 | complex_search | complexName=마포래미안 | 지역 확인 | 분석 |

---

### F. 단지 + 목적 (10개)

| # | 입력 | intent | entity | 다음 질문 | 최종 목적 |
|---|------|--------|--------|-----------|-----------|
| 51 | 동부아파트 적정가 | complex_with_purpose | complexName=동부아파트, purpose=fair | 지역→평형 | 적정가 |
| 52 | 동부아파트 매수해도 돼? | complex_with_purpose | complexName=동부아파트, purpose=buy | 지역→평형 | 매수 의견 |
| 53 | 동부아파트 전세 | complex_with_purpose | complexName=동부아파트, purpose=jeonse | 지역→평형 | 전세 분석 |
| 54 | 래미안 시세 | complex_with_purpose | complexName=래미안, purpose=fair | 지역→평형 | 적정가 |
| 55 | 자이 지금 살만해? | complex_with_purpose | complexName=자이, purpose=buy | 지역→평형 | 매수 의견 |
| 56 | 헬리오시티 25평 적정가 | complex_with_purpose | complexName=헬리오시티, pyeong=25, purpose=fair | 가격 질문 | 적정가 |
| 57 | 리센츠 34평 얼마야 | complex_with_purpose | complexName=리센츠, pyeong=34, purpose=fair | 가격 질문 | 적정가 |
| 58 | 은마 84 시세 | complex_with_purpose | complexName=은마, sqm=84, purpose=fair | 가격 질문 | 적정가 |
| 59 | 공릉동 동부 25평 적정가 | complex_with_purpose | dong=공릉동, complexName=동부, pyeong=25, purpose=fair | 가격 질문 | 적정가 |
| 60 | 우동 동부 34평 사도 돼? | complex_with_purpose | dong=우동, complexName=동부, pyeong=34, purpose=buy | 가격 질문 | 매수 의견 |

---

### G. 자유 질문 (15개)

| # | 입력 | intent | entity | 다음 질문 | 최종 목적 |
|---|------|--------|--------|-----------|-----------|
| 61 | 애 둘인데 어디가 좋을까 | recommend | tag=family, children=2 | 예산/지역 | 단지 추천 |
| 62 | 7억으로 어디 살까 | recommend | budget=7억 | 지역/평형 | 단지 추천 |
| 63 | 계약 전에 뭘 봐야 해 | general_info | topic=contract | - | 정보 제공 |
| 64 | 전세 사기 위험할까 | general_info | topic=jeonse_fraud | - | 정보 제공 |
| 65 | 지금 집 사도 돼? | market_inquiry | - | 지역/예산 | 시장 현황 |
| 66 | 갭투자 해도 될까 | general_info | topic=gap_invest | - | 정보 제공 |
| 67 | 신혼집 어디가 좋을까 | recommend | tag=newlywed | 예산/지역 | 단지 추천 |
| 68 | 학군 좋은 데 추천 | recommend | tag=school | 예산/지역 | 단지 추천 |
| 69 | 역세권 아파트 추천 | recommend | tag=subway | 지역/예산 | 단지 추천 |
| 70 | 전세 끼고 사도 돼? | general_info | topic=gap_invest | - | 정보 제공 |
| 71 | 지금 부동산 시장 어때 | market_inquiry | - | - | 시장 현황 |
| 72 | 강남 vs 마포 어디가 나아 | compare | regions=[강남,마포] | 예산/목적 | 지역 비교 |
| 73 | 10년 후 오를 곳 | recommend | tag=investment | 예산/지역 | 투자 추천 |
| 74 | 월세 대신 매매 | general_info | topic=buy_vs_rent | - | 정보 제공 |
| 75 | 공시지가 어디서 봐 | general_info | topic=official_price | - | 정보 제공 |

---

### H. 지저분한 자연어 (Messy Input) (25개)
> MessyInputResolver가 처리해야 하는 케이스

| # | 입력 | intent | entity | 비고 |
|---|------|--------|--------|------|
| 76 | 동부 우동 25평 몰라 적정가 | complex_with_purpose | complexName=동부, dong=우동, pyeong=25, noPrice=true, purpose=fair | 한 문장에 모두 포함 |
| 77 | 해운대 우동 동부 84 니가 알아서 | complex_with_purpose | region=해운대, dong=우동, complexName=동부, sqm=84, noPrice=true | noPrice 구어체 |
| 78 | 공릉동 동부 25평 매수해도 돼? | complex_with_purpose | dong=공릉동, complexName=동부, pyeong=25, purpose=buy | |
| 79 | 그냥 동부 우동 거기 적정가 봐줘 | complex_with_purpose | complexName=동부, dong=우동, purpose=fair | "거기" 지시어 |
| 80 | 동부 있잖아 우동에 그거 24평 | complex_with_purpose | complexName=동부, dong=우동, pyeong=24 | 구어체 |
| 81 | 7억으로 공릉동 25평 살 수 있어? | complex_with_purpose | dong=공릉동, budget=7억, pyeong=25, purpose=buy | 예산+평형+목적 |
| 82 | 래미안 대치 34평 시세 좀 | complex_with_purpose | complexName=래미안, dong=대치, pyeong=34, purpose=fair | |
| 83 | 반포자이 25평 적정가 알려줘 | complex_with_purpose | complexName=반포자이, pyeong=25, purpose=fair | 단지명+평형 |
| 84 | 잠실 리센츠 84 사도 돼 몰라 | complex_with_purpose | dong=잠실, complexName=리센츠, sqm=84, purpose=buy, noPrice=true | |
| 85 | 헬리오 25 얼마야 | complex_with_purpose | complexName=헬리오시티, pyeong=25, purpose=fair | 줄임말 |
| 86 | 은마 84 지금 얼마임 | complex_with_purpose | complexName=은마, sqm=84, purpose=fair | 구어체 |
| 87 | 마포래미안 34평 매수 의견 | complex_with_purpose | complexName=마포래미안, pyeong=34, purpose=buy | |
| 88 | 성수 아크로 32평 시세 | complex_with_purpose | dong=성수, complexName=아크로, pyeong=32, purpose=fair | |
| 89 | 우리 동네 노원 아파트 시세 | region_only | region=노원 | "우리 동네" 처리 |
| 90 | 애들 초등학교 보내기 좋은 노원 | recommend | region=노원, tag=school | |
| 91 | 5억으로 살 수 있는 데 추천 | recommend | budget=5억 | 지역 미정 |
| 92 | 전세 4억 공릉동 | region_with_budget | dong=공릉동, budget=4억, purpose=jeonse | 전세 예산 |
| 93 | 공릉동 동부 몇 층이 좋아 | general_info | complexName=동부, dong=공릉동, topic=floor | 층수 선호도 |
| 94 | 동부 우동 탑층 vs 저층 | general_info | complexName=동부, dong=우동, topic=floor | |
| 95 | 리모델링 예정 단지 어때 | general_info | topic=remodel | |
| 96 | 재건축 연한 됐어? | general_info | topic=rebuild | 단지 미특정 |
| 97 | 공릉동 학원가 근처 | recommend | dong=공릉동, tag=academy | |
| 98 | 동부 그거 3억에 전세 가능해? | complex_with_purpose | complexName=동부, budget=3억, purpose=jeonse | |
| 99 | 매매 7억 전세 4억 이면 갭이 얼마야 | general_info | topic=gap_calc, sale=7억, jeonse=4억 | 계산 요청 |
| 100 | 공릉동 동부아파트 25평 적정가 얼마야 실거래로 분석해줘 | complex_with_purpose | dong=공릉동, complexName=동부아파트, pyeong=25, purpose=fair, noPrice=true | 완전한 문장 |

---

## 3. 흐름 분기 정의

### 단계별 필수 정보

```
단지 확정  →  목적 선택  →  평형 선택  →  가격 확인  →  결과
```

각 단계에서 **이미 알고 있는 정보는 다시 묻지 않는다.**

| 단계 | 필요 정보 | 없을 때 질문 | 있을 때 |
|------|-----------|-------------|---------|
| 단지 | complexName + 지역 | "어떤 단지를 찾으시나요?" | 바로 다음 단계 |
| 목적 | purpose | purpose_chips 표시 | 바로 다음 단계 |
| 평형 | areaSqm | area_chips 또는 텍스트 | 바로 다음 단계 |
| 가격 | currentPrice or noPrice | 가격 질문 + [분석 시작] | runAnalysis |

### 질문 정책
- **같은 질문 최대 2회**: 3회 이상 같은 질문 금지
- **1차**: 질문
- **2차**: 이유 설명 포함 질문
- **3차**: 다른 선택지 제시 또는 종료

---

## 4. noPrice 표현 목록

사용자가 가격을 모른다는 표현 (모두 `currentPrice=null`로 처리):

```
몰라 / 몰라요 / 모름 / 모르겠어 / 모르겠어요
시세로 / 시세대로 / 시세 기준 / 시세 기준으로
실거래로 / 실거래 기준 / 실거래 기준으로 / 최근 거래로
그냥 해줘 / 그냥 분석해줘 / 알아서 해줘 / 니가 알아서
대충 봐줘 / 그냥 봐줘
없어 / 없음 / 패스 / skip
```

---

## 5. 평형 입력 정책

| 입력 | 해석 | areaSqm | 표시 |
|------|------|---------|------|
| 25 | 25평 (10~50 → 평형) | 59㎡ | 25평 (전용 59㎡) |
| 84 | 전용 84㎡ (51~ → ㎡) | 84㎡ | 33평 (전용 84㎡) |
| 25평 | 25평 | 59㎡ | 25평 (전용 59㎡) |
| 84㎡ | 전용 84㎡ | 84㎡ | 33평 (전용 84㎡) |
| 국민평형 | 25평 | 59㎡ | 25평 (전용 59㎡) |

**절대 금지**: 25평 입력 → 84㎡ 자동 변경

---

## 6. 미구현 / 향후 과제

| 기능 | 우선순위 | 비고 |
|------|----------|------|
| MessyInputResolver | P0 | 76~100번 케이스 처리 |
| 전세 분석 | P1 | 현재 "준비 중" |
| 지역 비교 | P2 | 강남 vs 마포 |
| 계약 전 체크리스트 | P2 | 체크리스트 제공 |
| 시장 현황 | P2 | 거시 데이터 |
| 층수/동 선호도 | P3 | 일반 정보 |
| 재건축/리모델링 정보 | P3 | 일반 정보 |
