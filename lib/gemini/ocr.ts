// lib/gemini/ocr.ts
// OCR extraction functions using Gemini 2.5 Flash Vision.
// Converts uploaded Aadhaar/PAN card images into structured JSON.

import { geminiModel } from './client'
import { AADHAAR_OCR_PROMPT, PAN_OCR_PROMPT } from './prompts'

interface OcrResult {
  success: boolean
  data?: Record<string, unknown>
  rawText?: string
  error?: string
}

/**
 * Send an image buffer to Gemini for OCR and return structured data.
 */
async function extractWithPrompt(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string
): Promise<OcrResult> {
  try {
    const base64 = imageBuffer.toString('base64')

    const result = await geminiModel.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
      { text: prompt },
    ])

    const responseText = result.response.text().trim()

    // Try to parse JSON from the response
    // Gemini sometimes wraps JSON in markdown code blocks
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    try {
      const data = JSON.parse(jsonStr)
      return { success: true, data }
    } catch {
      // JSON parse failed — return raw text so HR can enter manually
      return { success: false, rawText: responseText, error: 'Could not parse OCR response as JSON' }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[OCR] Gemini extraction failed:', msg)
    return {
      success: false,
      error: msg,
    }
  }
}

/**
 * Extract data from an Aadhaar card image.
 * Returns: { fullName, dateOfBirth, gender, aadhaarNumber, address }
 */
export async function extractFromAadhaar(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OcrResult> {
  return extractWithPrompt(imageBuffer, mimeType, AADHAAR_OCR_PROMPT)
}

/**
 * Extract data from a PAN card image.
 * Returns: { fullName, fatherName, dateOfBirth, panNumber }
 */
export async function extractFromPAN(
  imageBuffer: Buffer,
  mimeType: string
): Promise<OcrResult> {
  return extractWithPrompt(imageBuffer, mimeType, PAN_OCR_PROMPT)
}
