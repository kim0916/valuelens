/**
 * 임시 관리자 upsert 엔드포인트
 * 사용 후 삭제 예정
 * service_role key 필요 (Vercel 환경변수 SUPABASE_SERVICE_KEY)
 */
import { createClient } from '@supabase/supabase-js';

const COMPLEXES = [
  // 서울
  {complex_name:"중계주공1",          sigungu:"서울특별시 노원구 중계동",      sido:"서울특별시",legal_dong:"중계동",   build_year:1988,sale_cnt:0,rent_cnt:0},
  {complex_name:"광진구청자양자이",    sigungu:"서울특별시 광진구 자양동",      sido:"서울특별시",legal_dong:"자양동",   build_year:2020,sale_cnt:0,rent_cnt:0},
  // 경기
  {complex_name:"하안주공3단지",       sigungu:"경기도 광명시 하안동",          sido:"경기도",    legal_dong:"하안동",   build_year:1990,sale_cnt:0,rent_cnt:0},
  {complex_name:"매탄주공",            sigungu:"경기도 수원시 영통구 매탄동",   sido:"경기도",    legal_dong:"매탄동",   build_year:1992,sale_cnt:0,rent_cnt:0},
  {complex_name:"동탄2힐스테이트",     sigungu:"경기도 화성시 동탄구 반석동",   sido:"경기도",    legal_dong:"반석동",   build_year:2018,sale_cnt:0,rent_cnt:0},
  {complex_name:"동백지구한라비발디",   sigungu:"경기도 용인시 기흥구 동백동",   sido:"경기도",    legal_dong:"동백동",   build_year:2005,sale_cnt:0,rent_cnt:0},
  {complex_name:"중동롯데1단지",       sigungu:"경기도 부천시 원미구 중동",     sido:"경기도",    legal_dong:"중동",     build_year:1994,sale_cnt:0,rent_cnt:0},
  {complex_name:"본오주공1단지",       sigungu:"경기도 안산시 상록구 본오동",   sido:"경기도",    legal_dong:"본오동",   build_year:1991,sale_cnt:0,rent_cnt:0},
  {complex_name:"동탄자이",            sigungu:"경기도 화성시 동탄구 영천동",   sido:"경기도",    legal_dong:"영천동",   build_year:2019,sale_cnt:0,rent_cnt:0},
  // 인천
  {complex_name:"부평삼성래미안",      sigungu:"인천광역시 부평구 부평동",      sido:"인천광역시",legal_dong:"부평동",   build_year:2003,sale_cnt:0,rent_cnt:0},
  {complex_name:"구월롯데",            sigungu:"인천광역시 남동구 구월동",      sido:"인천광역시",legal_dong:"구월동",   build_year:1998,sale_cnt:0,rent_cnt:0},
  {complex_name:"계양자이",            sigungu:"인천광역시 계양구 계산동",      sido:"인천광역시",legal_dong:"계산동",   build_year:2021,sale_cnt:0,rent_cnt:0},
  {complex_name:"검단역롯데캐슬스카이엘",sigungu:"인천광역시 서구 마전동",      sido:"인천광역시",legal_dong:"마전동",   build_year:2023,sale_cnt:0,rent_cnt:0},
  {complex_name:"동춘현대",            sigungu:"인천광역시 연수구 동춘동",      sido:"인천광역시",legal_dong:"동춘동",   build_year:1998,sale_cnt:0,rent_cnt:0},
  // 부산
  {complex_name:"래미안온천2단지",     sigungu:"부산광역시 동래구 온천동",      sido:"부산광역시",legal_dong:"온천동",   build_year:2015,sale_cnt:0,rent_cnt:0},
  {complex_name:"해운대자이2차",       sigungu:"부산광역시 해운대구 우동",      sido:"부산광역시",legal_dong:"우동",     build_year:2011,sale_cnt:0,rent_cnt:0},
  {complex_name:"센텀시티자이",        sigungu:"부산광역시 해운대구 우동",      sido:"부산광역시",legal_dong:"우동",     build_year:2008,sale_cnt:0,rent_cnt:0},
  {complex_name:"부전자이",            sigungu:"부산광역시 부산진구 부전동",    sido:"부산광역시",legal_dong:"부전동",   build_year:2022,sale_cnt:0,rent_cnt:0},
  {complex_name:"동래래미안아이파크",   sigungu:"부산광역시 동래구 온천동",      sido:"부산광역시",legal_dong:"온천동",   build_year:2022,sale_cnt:0,rent_cnt:0},
  {complex_name:"e편한세상대연",       sigungu:"부산광역시 남구 대연동",        sido:"부산광역시",legal_dong:"대연동",   build_year:2008,sale_cnt:0,rent_cnt:0},
  // 대구
  {complex_name:"감삼자이",            sigungu:"대구광역시 달서구 감삼동",      sido:"대구광역시",legal_dong:"감삼동",   build_year:2010,sale_cnt:0,rent_cnt:0},
  {complex_name:"대구역해링턴플레이스", sigungu:"대구광역시 북구 침산동",        sido:"대구광역시",legal_dong:"침산동",   build_year:2021,sale_cnt:0,rent_cnt:0},
  {complex_name:"이곡성서",            sigungu:"대구광역시 달서구 이곡동",      sido:"대구광역시",legal_dong:"이곡동",   build_year:2004,sale_cnt:0,rent_cnt:0},
  {complex_name:"죽전동아",            sigungu:"대구광역시 달서구 죽전동",      sido:"대구광역시",legal_dong:"죽전동",   build_year:1999,sale_cnt:0,rent_cnt:0},
  {complex_name:"수성범어한신더휴",    sigungu:"대구광역시 수성구 범어동",      sido:"대구광역시",legal_dong:"범어동",   build_year:2022,sale_cnt:0,rent_cnt:0},
  // 대전
  {complex_name:"봉명동한라비발디",    sigungu:"대전광역시 유성구 봉명동",      sido:"대전광역시",legal_dong:"봉명동",   build_year:2020,sale_cnt:0,rent_cnt:0},
  {complex_name:"노은2지구자이",       sigungu:"대전광역시 유성구 노은동",      sido:"대전광역시",legal_dong:"노은동",   build_year:2009,sale_cnt:0,rent_cnt:0},
  {complex_name:"탄방동삼성래미안",    sigungu:"대전광역시 서구 탄방동",        sido:"대전광역시",legal_dong:"탄방동",   build_year:2003,sale_cnt:0,rent_cnt:0},
  {complex_name:"지족한신더휴",        sigungu:"대전광역시 유성구 지족동",      sido:"대전광역시",legal_dong:"지족동",   build_year:2022,sale_cnt:0,rent_cnt:0},
  // 광주
  {complex_name:"수완GS자이",          sigungu:"광주광역시 광산구 장덕동",      sido:"광주광역시",legal_dong:"장덕동",   build_year:2010,sale_cnt:0,rent_cnt:0},
  {complex_name:"화정아이파크",        sigungu:"광주광역시 서구 화정동",        sido:"광주광역시",legal_dong:"화정동",   build_year:2003,sale_cnt:0,rent_cnt:0},
  {complex_name:"운암자이",            sigungu:"광주광역시 북구 운암동",        sido:"광주광역시",legal_dong:"운암동",   build_year:2005,sale_cnt:0,rent_cnt:0},
  {complex_name:"봉선롯데캐슬",        sigungu:"광주광역시 남구 봉선동",        sido:"광주광역시",legal_dong:"봉선동",   build_year:2018,sale_cnt:0,rent_cnt:0},
  // 울산
  {complex_name:"우정혁신도시자이",    sigungu:"울산광역시 중구 우정동",        sido:"울산광역시",legal_dong:"우정동",   build_year:2021,sale_cnt:0,rent_cnt:0},
  {complex_name:"문수로아이파크",      sigungu:"울산광역시 남구 신정동",        sido:"울산광역시",legal_dong:"신정동",   build_year:2018,sale_cnt:0,rent_cnt:0},
  {complex_name:"염포자이",            sigungu:"울산광역시 북구 염포동",        sido:"울산광역시",legal_dong:"염포동",   build_year:2022,sale_cnt:0,rent_cnt:0},
  {complex_name:"방어진두산위브",      sigungu:"울산광역시 동구 방어동",        sido:"울산광역시",legal_dong:"방어동",   build_year:2020,sale_cnt:0,rent_cnt:0},
  // 기타
  {complex_name:"창원센트럴자이",      sigungu:"경상남도 창원시 성산구 중앙동", sido:"경상남도",  legal_dong:"중앙동",   build_year:2021,sale_cnt:0,rent_cnt:0},
  {complex_name:"내외동롯데캐슬",      sigungu:"경상남도 김해시 내외동",        sido:"경상남도",  legal_dong:"내외동",   build_year:2019,sale_cnt:0,rent_cnt:0},
];

export default async function handler(req, res) {
  // POST + secret 헤더로만 실행 가능
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  );

  const results = { ok: [], fail: [] };

  // 5개씩 배치 upsert
  for (let i = 0; i < COMPLEXES.length; i += 5) {
    const batch = COMPLEXES.slice(i, i + 5);
    const { data, error } = await supabase
      .from('realestate_complexes')
      .upsert(batch, {
        onConflict: 'complex_name,sigungu',
        ignoreDuplicates: false,
      });
    if (error) {
      results.fail.push(...batch.map(b => `${b.complex_name}: ${error.message}`));
    } else {
      results.ok.push(...batch.map(b => b.complex_name));
    }
  }

  res.status(200).json({
    total: COMPLEXES.length,
    success: results.ok.length,
    failed: results.fail.length,
    ok: results.ok,
    fail: results.fail,
  });
}
