/**
 * ValueLens — aiService
 *
 * AI Property Agent 서비스 계층.
 * 현재는 규칙 기반 parseIntent만 사용.
 * Phase 3에서 Claude API 연결 예정.
 *
 * 역할:
 * - 자연어 입력 → Intent 추출
 * - 사진/문서 → 텍스트 추출 (OCR, Phase 3)
 * - 분석 결과 → 자연어 요약 (Phase 3)
 */

// Phase 1-D에서 import 활성화
// import { parseIntent } from '../../ai/intent.js';

/**
 * 자연어 입력 → Intent 파싱
 * @param {string} rawText
 * @returns {{ intent, complexName, region, dong, pyeong, areaSqm, price, budget, purpose, raw }}
 */
export function parseUserIntent(rawText) {
  // Phase 1-D: return parseIntent(rawText);
  // 현재는 main.jsx의 parseIntent를 직접 사용
  throw new Error('[aiService] Phase 1-D 이전에는 직접 호출 불가. main.jsx의 parseIntent를 사용하세요.');
}

/**
 * 사진 → 텍스트 추출 (OCR)
 * Phase 3 예정. 현재는 stub.
 * @param {File} imageFile
 * @returns {Promise<string>}
 */
export async function extractTextFromImage(imageFile) {
  // Phase 3: Claude Vision API 연결
  throw new Error('[aiService] OCR 기능은 Phase 3에서 구현 예정입니다.');
}

/**
 * 문서(PDF) → 텍스트 추출
 * Phase 3 예정.
 * @param {File} pdfFile
 * @returns {Promise<string>}
 */
export async function extractTextFromDocument(pdfFile) {
  // Phase 3: Claude Document AI 연결
  throw new Error('[aiService] PDF 분석 기능은 Phase 3에서 구현 예정입니다.');
}

/**
 * 분석 결과 → 자연어 요약
 * Phase 3 예정.
 * @param {Object} analysisResult
 * @param {string} intent
 * @returns {Promise<string>}
 */
export async function summarizeAnalysis(analysisResult, intent) {
  // Phase 3: Claude API 연결
  throw new Error('[aiService] AI 요약 기능은 Phase 3에서 구현 예정입니다.');
}
