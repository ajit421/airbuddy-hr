// lib/gemini/client.ts
// Initializes the Google Generative AI client (server-side only).
// Exports both primary (gemini-2.5-flash) and fallback (gemini-1.5-flash) models.
// The fallback is used automatically when the primary returns 503 (overloaded).

import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  console.warn('[Gemini] GEMINI_API_KEY is not set — AI features will fail.')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

/**
 * Primary model: Gemini 2.5 Flash.
 * Best quality — use first.
 */
export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
})

/**
 * Fallback model: Gemini 1.5 Flash.
 * Used automatically when 2.5 Flash returns 503 (high demand / overloaded).
 */
export const geminiFallbackModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
})

export default genAI
