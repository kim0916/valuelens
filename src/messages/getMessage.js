/**
 * src/messages/getMessage.js
 *
 * Message Dictionary 조회 함수. UI 코드는 문자열을 직접 만들지 않고
 * 반드시 getMessage(key, params)만 호출한다.
 */

import { MESSAGES } from './messageDictionary.js';

/**
 * @param {string} key - MESSAGES에 정의된 situation key
 * @param {object} [params] - description 템플릿에 들어갈 변수
 * @returns {{ category: string, title: string|null, description: string, action: any }}
 */
export function getMessage(key, params = {}) {
  const entry = MESSAGES[key];
  if (!entry) {
    // 개발 중 오타/누락 Key를 바로 발견하기 위한 명시적 에러.
    // 폴백 문자열을 만들어 조용히 넘기지 않는다 — 그게 또 다른 하드코딩이 되기 때문.
    throw new Error(`[getMessage] 정의되지 않은 Message Key: "${key}"`);
  }
  return {
    category: entry.category,
    title: entry.title,
    description: entry.description(params),
    action: entry.action,
  };
}

/**
 * 채팅 말풍선처럼 description 문자열만 바로 필요한 곳을 위한 단축 함수.
 * 내부적으로 getMessage와 완전히 동일한 Dictionary를 거친다.
 */
export function getMessageText(key, params = {}) {
  return getMessage(key, params).description;
}
