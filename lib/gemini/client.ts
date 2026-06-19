// lib/gemini/client.ts
// Initializes the Google Generative AI client (server-side only).
// Uses the Gemini 2.5 Flash model for both OCR and document improvement.

import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  console.warn('[Gemini] GEMINI_API_KEY is not set — AI features will fail.')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

/**
 * Pre-configured Gemini 2.5 Flash model.
 * Use for both OCR extraction and document improvement.
 */
export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
})

export default genAI
