// lib/gemini/improve.ts
// AI document improvement using Gemini 2.5 Flash (with 1.5 Flash fallback).
//
// Retry strategy:
//   Attempt 1: gemini-2.5-flash (immediate)
//   Attempt 2: gemini-2.5-flash (after 1.5s delay)
//   Attempt 3: gemini-1.5-flash (after 3s delay — fallback model)
//
// 503 "Service Unavailable" (high demand) triggers the retry/fallback logic.

import { geminiModel, geminiFallbackModel } from './client'
import { getDocumentImprovePrompt } from './prompts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImproveResult {
  success: boolean
  improvedMarkdown?: string
  modelUsed?: string
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sleep for the given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Returns true if the error is a 503 / overload / quota error from Gemini. */
function isOverloadError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('503') ||
    msg.includes('service unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('quota')
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Send a Markdown HR document to Gemini for professional improvement.
 * Automatically retries with exponential backoff and falls back to
 * gemini-1.5-flash if gemini-2.5-flash is overloaded (503).
 *
 * @param markdownContent - The raw markdown to improve
 * @param documentType    - e.g. "offer_letter", "nda", "certificate"
 */
export async function improveDocument(
  markdownContent: string,
  documentType: string
): Promise<ImproveResult> {
  const systemPrompt = getDocumentImprovePrompt(documentType)

  // Retry schedule: [primary, primary-delayed, fallback]
  const attempts = [
    { model: geminiModel,         modelName: 'gemini-2.5-flash', delayMs: 0    },
    { model: geminiModel,         modelName: 'gemini-2.5-flash', delayMs: 1500 },
    { model: geminiFallbackModel, modelName: 'gemini-1.5-flash', delayMs: 3000 },
  ]

  let lastError: unknown = null

  for (const { model, modelName, delayMs } of attempts) {
    if (delayMs > 0) {
      console.log(`[AI Improve] Waiting ${delayMs}ms before retry with ${modelName}…`)
      await sleep(delayMs)
    }

    try {
      console.log(`[AI Improve] Calling ${modelName}…`)

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: markdownContent },
      ])

      const improved = result.response.text().trim()

      if (!improved) {
        throw new Error('Gemini returned an empty response')
      }

      console.log(`[AI Improve] Success with ${modelName}`)
      return { success: true, improvedMarkdown: improved, modelUsed: modelName }

    } catch (err: unknown) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[AI Improve] ${modelName} failed: ${msg}`)

      // Only retry on overload errors — propagate other errors immediately
      if (!isOverloadError(err)) {
        console.error('[AI Improve] Non-retriable error, stopping retries.')
        break
      }
    }
  }

  // All attempts failed
  const finalMsg = lastError instanceof Error ? lastError.message : String(lastError)
  console.error('[AI Improve] All attempts failed:', finalMsg)
  return {
    success: false,
    improvedMarkdown: markdownContent, // Return original on failure
    error: finalMsg,
  }
}

