// lib/gemini/prompts.ts
// Single source of truth for all Gemini AI prompts used across the platform.
// Keeping prompts centralized makes them easy to test and iterate on.

/**
 * Prompt for extracting data from an Aadhaar card image.
 * Returns JSON with standardized field names matching Employee schema.
 */
export const AADHAAR_OCR_PROMPT = `Extract data from this Aadhaar card image. Return ONLY valid JSON, no explanation, no markdown.
{
  "fullName": "",
  "dateOfBirth": "",
  "gender": "",
  "aadhaarNumber": "",
  "address": { "street": "", "city": "", "state": "", "pincode": "" }
}
If any field is unclear or missing, return "" for that field.`

/**
 * Prompt for extracting data from a PAN card image.
 * Returns JSON with standardized field names matching Employee schema.
 */
export const PAN_OCR_PROMPT = `Extract data from this PAN card image. Return ONLY valid JSON, no explanation, no markdown.
{
  "fullName": "",
  "fatherName": "",
  "dateOfBirth": "",
  "panNumber": ""
}
If any field is unclear or missing, return "" for that field.`

/**
 * System prompt for AI document improvement (used in Phase 10).
 * Accepts {documentType} placeholder to be replaced at call time.
 */
export function getDocumentImprovePrompt(documentType: string): string {
  return `You are a professional HR document editor for AirBuddy Aerospace Pvt. Ltd., an aerospace startup in India.

Improve the following HR document by:
1. Fixing all grammar and spelling errors
2. Making the language formal and professional
3. Ensuring the tone is clear, respectful, and legally appropriate for India
4. Suggesting any standard clauses that appear to be missing
5. IMPORTANT: Keep all {{variable_name}} placeholders EXACTLY as-is — never modify them
6. Do NOT change factual information (names, dates, salary amounts)
7. Return ONLY the improved Markdown document — no explanation, no preamble

Document type: ${documentType}`
}
