/**
 * src/engine/v2/SlotRegistry.js
 *
 * 모든 대화 Slot의 단일 저장소.
 * get/set/merge/reset — 4개 메서드만.
 * 렌더러나 핸들러는 이 객체만 읽는다.
 */

export const SLOTS = {
  COMPLEX:    'complex',    // DB 단지 객체 (확정됨)
  COMPLEX_RAW:'complexRaw', // 사용자 입력 원문
  DONG:       'dong',       // 법정동/지역
  AREA:       'area',       // { sqm, pyeong, matchedPyeong, inputPyeong }
  PURPOSE:    'purpose',    // 'fair' | 'buy' | 'jeonse'
  PRICE:      'price',      // 만원 단위
  NO_PRICE:   'noPrice',    // boolean
};

export function createSlotRegistry(initial = {}) {
  let slots = {
    [SLOTS.COMPLEX]:     null,
    [SLOTS.COMPLEX_RAW]: null,
    [SLOTS.DONG]:        null,
    [SLOTS.AREA]:        null,
    [SLOTS.PURPOSE]:     null,
    [SLOTS.PRICE]:       null,
    [SLOTS.NO_PRICE]:    false,
    ...initial,
  };

  return {
    get: (key)        => slots[key],
    set: (key, value) => { slots = { ...slots, [key]: value }; },
    merge: (partial)  => { slots = { ...slots, ...partial }; },
    reset: ()         => {
      slots = {
        [SLOTS.COMPLEX]: null, [SLOTS.COMPLEX_RAW]: null,
        [SLOTS.DONG]: null,    [SLOTS.AREA]: null,
        [SLOTS.PURPOSE]: null, [SLOTS.PRICE]: null,
        [SLOTS.NO_PRICE]: false,
      };
    },
    snapshot: () => ({ ...slots }),

    // 편의 메서드
    isComplete: () => {
      const s = slots;
      if (!s[SLOTS.COMPLEX]) return false;
      if (!s[SLOTS.PURPOSE]) return false;
      if (!s[SLOTS.AREA])    return false;
      if (!s[SLOTS.PRICE] && !s[SLOTS.NO_PRICE]) return false;
      return true;
    },

    missingSlots: () => {
      const s = slots;
      const missing = [];
      if (!s[SLOTS.COMPLEX])  missing.push(SLOTS.COMPLEX);
      if (!s[SLOTS.DONG])     missing.push(SLOTS.DONG);
      if (!s[SLOTS.PURPOSE])  missing.push(SLOTS.PURPOSE);
      if (!s[SLOTS.AREA])     missing.push(SLOTS.AREA);
      if (!s[SLOTS.PRICE] && !s[SLOTS.NO_PRICE]) missing.push(SLOTS.PRICE);
      return missing;
    },
  };
}
