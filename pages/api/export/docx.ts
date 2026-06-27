// pages/api/export/docx.ts
// POST — Export a document as a DOCX (Word) file.
//
// Body: {
//   markdownContent: string,
//   employeeId: string,
//   documentId: string,
//   documentTitle: string
// }
// Returns: DOCX file as application/vnd.openxmlformats-officedocument.wordprocessingml.document

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { createAuditLog } from '@/lib/audit/logger'
import { generateFileName } from '@/lib/export/file-naming'
import { format } from 'date-fns'

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
} from 'docx'

// ─── Markdown → docx paragraph parser ────────────────────────────────────
// Handles: headings (h1/h2/h3), bold, italic, bold-italic, bullet lists,
// numbered lists, horizontal rules, and plain paragraphs.

interface ParsedRun {
  text: string
  bold?: boolean
  italics?: boolean
}

function parseInlineRuns(line: string): ParsedRun[] {
  const runs: ParsedRun[] = []
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: line.slice(lastIndex, match.index) })
    }
    if (match[2]) runs.push({ text: match[2], bold: true, italics: true })
    else if (match[3]) runs.push({ text: match[3], bold: true })
    else if (match[4]) runs.push({ text: match[4], italics: true })
    else if (match[5]) runs.push({ text: match[5] }) // inline code → plain
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < line.length) {
    runs.push({ text: line.slice(lastIndex) })
  }
  return runs
}

function buildTextRuns(runs: ParsedRun[], baseSize = 22): TextRun[] {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold,
        italics: r.italics,
        size: baseSize,
        font: 'Calibri',
      })
  )
}

function markdownToDocxParagraphs(markdown: string, companyName: string, documentTitle: string): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // ── Company header paragraph ─────────────────────────────────────────
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: companyName,
          bold: true,
          size: 28,
          font: 'Calibri',
          color: '0f172a',
        }),
      ],
      spacing: { after: 100 },
    })
  )

  // ── Tagline ──────────────────────────────────────────────────────────
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${companyName} — HR Document Platform`,
          size: 16,
          font: 'Calibri',
          color: '64748b',
          italics: true,
        }),
      ],
      spacing: { after: 200 },
      border: {
        bottom: { color: 'e2e8f0', style: BorderStyle.SINGLE, size: 6 },
      },
    })
  )

  // ── Document title ───────────────────────────────────────────────────
  paragraphs.push(
    new Paragraph({
      text: documentTitle,
      heading: HeadingLevel.TITLE,
      spacing: { before: 200, after: 300 },
    })
  )

  // ── Parse markdown lines ─────────────────────────────────────────────
  const lines = markdown.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(4).trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 80 },
        })
      )
    } else if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(3).trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 100 },
        })
      )
    } else if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(2).trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 280, after: 120 },
        })
      )
    } else if (line.startsWith('---') || line.startsWith('***') || line.startsWith('___')) {
      // Horizontal rule → paragraph with bottom border
      paragraphs.push(
        new Paragraph({
          children: [],
          border: {
            bottom: { color: 'cbd5e1', style: BorderStyle.SINGLE, size: 6 },
          },
          spacing: { before: 100, after: 100 },
        })
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const runs = parseInlineRuns(line.slice(2))
      paragraphs.push(
        new Paragraph({
          children: buildTextRuns(runs),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      )
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/)
      if (match) {
        const runs = parseInlineRuns(match[2])
        paragraphs.push(
          new Paragraph({
            children: buildTextRuns(runs),
            numbering: { reference: 'default-numbering', level: 0 },
            spacing: { after: 60 },
          })
        )
      }
    } else if (line.trim() === '') {
      paragraphs.push(new Paragraph({ children: [], spacing: { after: 80 } }))
    } else {
      const runs = parseInlineRuns(line)
      paragraphs.push(
        new Paragraph({
          children: buildTextRuns(runs),
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED,
        })
      )
    }
  }

  // ── Footer note ──────────────────────────────────────────────────────
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated by AirBuddy HR Platform • ${format(new Date(), 'dd/MM/yyyy')}`,
          size: 14,
          font: 'Calibri',
          color: '94a3b8',
          italics: true,
        }),
      ],
      spacing: { before: 400 },
      border: {
        top: { color: 'e2e8f0', style: BorderStyle.SINGLE, size: 6 },
      },
    })
  )

  return paragraphs
}

// ─── Main handler ─────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  return await withAuth(req, res, async (uid, email): Promise<void> => {
    try {
      const {
        markdownContent,
        employeeId,
        documentId,
        documentTitle,
      } = req.body as {
        markdownContent: string
        employeeId: string
        documentId: string
        documentTitle: string
      }

      if (!markdownContent || !employeeId || !documentId || !documentTitle) {
        return res.status(400).json({ error: 'Missing required fields.' })
      }

      // ── 1. Fetch company name from settings ──────────────────────────
      const settingsDoc = await adminDb.collection('settings').doc('company').get()
      const settings = settingsDoc.exists ? (settingsDoc.data() as Record<string, string>) : {}
      const companyName = settings.companyName || 'AirBuddy Aerospace Pvt. Ltd.'

      // ── 2. Build DOCX document ────────────────────────────────────────
      const doc = new Document({
        title: documentTitle,
        creator: companyName,
        description: `HR Document — ${documentTitle}`,
        numbering: {
          config: [
            {
              reference: 'default-numbering',
              levels: [
                {
                  level: 0,
                  format: 'decimal',
                  text: '%1.',
                  alignment: AlignmentType.LEFT,
                  style: {
                    paragraph: { indent: { left: 720, hanging: 360 } },
                  },
                },
              ],
            },
          ],
        },
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1000, bottom: 1000, left: 1200, right: 1000 },
              },
            },
            children: markdownToDocxParagraphs(markdownContent, companyName, documentTitle),
          },
        ],
      })

      const docxBuffer = await Packer.toBuffer(doc)

      // ── 3. Audit log ─────────────────────────────────────────────────
      await createAuditLog({
        action: 'DOCUMENT_EXPORT',
        entityType: 'document',
        entityId: documentId,
        performedBy: uid,
        performedByEmail: email,
        metadata: {
          employeeId,
          format: 'docx',
          documentTitle,
        },
      })

      // ── 4. Stream DOCX to client ───────────────────────────────────────────────
      const filename = generateFileName(employeeId, documentTitle, 'docx')

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
      res.setHeader('Content-Length', docxBuffer.length)
      res.status(200).end(docxBuffer)
    } catch (err) {
      console.error('[POST /api/export/docx]', err)
      res.status(500).json({ error: 'Failed to generate DOCX.' })
    }
  })
}
