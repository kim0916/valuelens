// ValueLens Recommendation — 단지 풀
// Phase 1 Cleanup: scorePool, AREA_DB, areaInfo, calculateLivingScore 중복 제거
// 원본 기준: src/recommendation/score.js

import { AREA_DB } from './score.js';

const POOL = [
  { name: "동부", region: "노원구", dong: "공릉동", pyeong: 25, buildYear: 1999, fair: 50200, cur: 50000, jr: 0.70, conf: "높음", regulated: false },
  { name: "상계주공7", region: "노원구", dong: "상계동", pyeong: 19, buildYear: 1988, fair: 62100, cur: 59500, jr: 0.46, conf: "높음", regulated: false, redev: true },
  { name: "은마", region: "강남구", dong: "대치동", pyeong: 25, buildYear: 1979, fair: 412300, cur: 381000, jr: 0.20, conf: "보통", regulated: true, redev: true },
  { name: "송도더샵파크애비뉴", region: "연수구", dong: "송도동", pyeong: 35, buildYear: 2017, fair: 94000, cur: 96000, jr: 0.40, conf: "보통" },
  { name: "마포래미안푸르지오", region: "마포구", dong: "아현동", pyeong: 34, buildYear: 2014, fair: 170000, cur: 165000, jr: 0.55, conf: "보통", regulated: true },
  { name: "분당정자동느티마을", region: "성남시 분당구", dong: "정자동", pyeong: 32, buildYear: 1995, fair: 130000, cur: 125000, jr: 0.58, conf: "보통" },
  { name: "일산후곡", region: "고양시 일산서구", dong: "일산동", pyeong: 28, buildYear: 1994, fair: 65000, cur: 63000, jr: 0.62, conf: "보통" },
  { name: "광교중흥S클래스", region: "수원시 영통구", dong: "이의동", pyeong: 34, buildYear: 2019, fair: 140000, cur: 138000, jr: 0.45, conf: "보통" },
];

export { POOL, AREA_DB };
