// lib/gemini/improve.ts
// AI document improvement using Gemini 2.5 Flash.
// Takes a Markdown HR document and returns an improved version.
// Called from Phase 10's ai-improve API route.

import { geminiModel } from './client'
import { getDocumentImprovePrompt } from './prompts'

interface ImproveResult {
  success: boolean
  improvedMarkdown?: string
  error?: string
}

/**
 * Send a Markdown HR document to Gemini for professional improvement.
 * Preserves all {{variable_name}} placeholders and factual data.
 *
 * @param markdownContent - The raw markdown to improve
 * @param documentType    - e.g. "offer_letter", "nda", "salary_slip"
 * @returns The improved markdown or the original content on failure
 */
export async function improveDocument(
  markdownContent: string,
  documentType: string
): Promise<ImproveResult> {
  try {
    const systemPrompt = getDocumentImprovePrompt(documentType)

    const result = await geminiModel.generateContent([
      { text: systemPrompt },
      { text: markdownContent },
    ])

    const improved = result.response.text().trim()

    if (!improved) {
      return { success: false, error: 'Gemini returned an empty response' }
    }

    return { success: true, improvedMarkdown: improved }
  } catch (err: any) {
    console.error('[AI Improve] Gemini call failed:', err?.message ?? err)
    return {
      success: false,
      improvedMarkdown: markdownContent, // Return original on failure
      error: err?.message ?? 'AI improvement failed',
    }
  }
}
