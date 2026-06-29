/**
 * src/parser/fairValueConversation.js
 *
 * 역할: 채워진 Slot을 보고 다음 행동 결정
 * 부족한 Slot만 질문. 순서: complex → dong → purpose → area → price → result
 *
 * Parser/Search와 독립적으로 동작.
 */

/**
 * @param {object} slots
 * @param {string|null} slots.complex
 * @param {string|null} slots.dong
 * @param {string|null} slots.purpose   'fair' | 'buy' | 'jeonse' | null
 * @param {number|null} slots.area      sqm
 * @param {number|null} slots.userPrice 만원
 * @param {boolean}     slots.noPrice
 * @returns {{ action: string, reason: string }}
 */
export function decideNextAction(slots) {
  const { complex, dong, purpose, area, userPrice, noPrice } = slots;

  if (!complex)
    return { action: 'ASK_COMPLEX', reason: '단지 없음' };

  if (!dong)
    return { action: 'ASK_DONG', reason: '지역/동 없음' };

  if (!purpose)
    return { action: 'ASK_PURPOSE', reason: '목적 없음' };

  if (purpose === 'jeonse')
    return { action: 'NOT_SUPPORTED', reason: '전세 미지원' };

  if (!area)
    return { action: 'ASK_AREA', reason: '평형 없음' };

  if (!userPrice && !noPrice)
    return { action: 'ASK_PRICE', reason: '가격 없음 + noPrice 미표시' };

  return { action: 'RESULT', reason: '모든 Slot 충족' };
}
