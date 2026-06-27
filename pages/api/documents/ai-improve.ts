// pages/api/documents/ai-improve.ts
// Phase 10 — AI Document Improvement
//
// POST — Send markdown content to Gemini for professional improvement.
// Includes retry logic (3 attempts) with fallback to gemini-1.5-flash.
//
// Body:    { markdownContent: string, documentType: string }
// Returns: { improvedMarkdown: string, modelUsed?: string, warning?: string }

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { createAuditLog } from '@/lib/audit/logger'
import { improveDocument } from '@/lib/gemini/improve'
import { checkRateLimit } from '@/lib/rate-limit'

// Extend response timeout — retries can take up to ~8s total
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  return await withAuth(req, res, async (uid, email) => {
    // M9 — Rate limit: 20 AI calls per 10 minutes per user
    const { allowed, remaining, resetAt } = checkRateLimit(uid, 20, 10 * 60 * 1000)
    if (!allowed) {
      res.setHeader('X-RateLimit-Remaining', '0')
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))
      return res.status(429).json({
        error: 'Rate limit exceeded. You can make 20 AI improvement requests per 10 minutes.',
      })
    }
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    try {
      const { markdownContent, documentType } = req.body as {
        markdownContent: string
        documentType: string
      }

      if (!markdownContent || typeof markdownContent !== 'string') {
        return res.status(400).json({ error: 'markdownContent is required.' })
      }

      if (!documentType || typeof documentType !== 'string') {
        return res.status(400).json({ error: 'documentType is required.' })
      }

      const { success, improvedMarkdown, modelUsed } = await improveDocument(
        markdownContent,
        documentType
      )

      // ── Audit log (non-fatal) ───────────────────────────────────────────────
      await createAuditLog({
        action: 'DOCUMENT_AI_IMPROVE',
        entityType: 'document',
        entityId: 'ai-improve',
        performedBy: uid,
        performedByEmail: email,
        metadata: {
          documentType,
          success,
          modelUsed: modelUsed ?? 'unknown',
          contentLength: markdownContent.length,
        },
      })

      if (!success) {
        return res.status(200).json({
          improvedMarkdown: markdownContent,
          warning:
            'Gemini AI is currently experiencing high demand. Please try again in a moment.',
        })
      }

      // Build response — include a notice if the fallback model was used
      const response: Record<string, string> = { improvedMarkdown: improvedMarkdown! }
      if (modelUsed === 'gemini-1.5-flash') {
        response.warning =
          'Used Gemini 1.5 Flash (fallback) due to high demand on 2.5 Flash. Quality may differ slightly.'
      }

      return res.status(200).json(response)
    } catch (err) {
      console.error('[POST /api/documents/ai-improve]', err)
      return res.status(200).json({
        improvedMarkdown: req.body?.markdownContent ?? '',
        warning: 'An unexpected error occurred. Original content returned.',
      })
    }
  })
}

