// lib/certificates/render-certificate.ts
// Server-side certificate rendering: background PNG + text overlay → PDF Buffer.
//
// Pipeline:
//   1. Download background PNG from Cloudinary (backgroundImageUrl)
//   2. @napi-rs/canvas — composite text fields + wrapped body paragraph on top
//   3. Export canvas as PNG buffer
//   4. pdf-lib — embed the PNG into a correctly sized single-page PDF
//   5. Return PDF buffer (the PNG is never exposed to the client)
//
// Constraints:
//   - No browser / Puppeteer / HTML rendering
//   - Direct image compositing only
//   - Fonts must be registered before use (done via GlobalFonts.registerFromPath)

import path from 'path'
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
import type { CertificateTemplate } from '@/types/template'
import { downloadBuffer } from '@/lib/cloudinary/storage-helpers'
import { parse, parseISO, isValid, format as formatDate } from 'date-fns'

// ── Font registration (runs once per process) ─────────────────────────────
const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts')

let fontsRegistered = false
function ensureFonts() {
  if (fontsRegistered) return
  GlobalFonts.registerFromPath(
    path.join(FONTS_DIR, 'Montserrat-Regular.ttf'),
    'Montserrat'
  )
  GlobalFonts.registerFromPath(
    path.join(FONTS_DIR, 'Montserrat-Bold.ttf'),
    'Montserrat'
  )
  fontsRegistered = true
}

// ── Variable substitution ─────────────────────────────────────────────────

/**
 * Replace all {{variable}} placeholders in a template string with values
 * from the data map. Unmatched placeholders are left as-is.
 */
function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim()
    return data[trimmed] ?? `{{${trimmed}}}`
  })
}

// ── Word wrap ─────────────────────────────────────────────────────────────

/**
 * Wrap text into lines based on canvas text width measurement.
 * Breaks only at word boundaries.
 */
function wordWrapByWidth(text: string, maxWidth: number, ctx: SKRSContext2D): string[] {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word
    // Strip **bold** markers before measuring so wrapping is accurate
    const testWidth = ctx.measureText(testLine.replace(/\*\*/g, '')).width
    if (testWidth <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

/**
 * Format any input date string to standard DD/MM/YYYY format.
 */
function formatToDDMMYYYY(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined
  const trimmed = dateStr.trim()
  if (!trimmed) return trimmed

  // Try parsing as ISO first (e.g. 2026-06-11 or ISO timestamp)
  let date = parseISO(trimmed)
  if (isValid(date)) {
    return formatDate(date, 'dd/MM/yyyy')
  }

  // Try parsing as dd/MM/yyyy
  date = parse(trimmed, 'dd/MM/yyyy', new Date())
  if (isValid(date)) {
    return formatDate(date, 'dd/MM/yyyy')
  }

  // Try parsing as dd.MM.yyyy (e.g. 21.06.2026)
  date = parse(trimmed, 'dd.MM.yyyy', new Date())
  if (isValid(date)) {
    return formatDate(date, 'dd/MM/yyyy')
  }

  // Try parsing as dd MMMM yyyy (e.g. 28 June 2026)
  date = parse(trimmed, 'dd MMMM yyyy', new Date())
  if (isValid(date)) {
    return formatDate(date, 'dd/MM/yyyy')
  }

  // Fallback: try standard JavaScript Date parsing
  const fallbackDate = new Date(trimmed)
  if (isValid(fallbackDate)) {
    return formatDate(fallbackDate, 'dd/MM/yyyy')
  }

  return dateStr
}

// ── Inline bold helpers ───────────────────────────────────────────────────

/**
 * Split a string containing **bold** markers into typed segments.
 * Odd-indexed parts (between pairs of **) are bold; even-indexed are normal.
 * Backward-compatible: strings with no ** markers return a single normal segment.
 */
function parseInlineBold(text: string): Array<{ text: string; bold: boolean }> {
  const segments: Array<{ text: string; bold: boolean }> = []
  const parts = text.split(/\*\*/)
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      segments.push({ text: parts[i], bold: i % 2 === 1 })
    }
  }
  return segments
}

/**
 * Split a line (with possible **bold** markers) into word-level tokens.
 * Used for justified text so each word's bold state is known individually.
 */
function lineToWordTokens(line: string): Array<{ text: string; bold: boolean }> {
  const segments = parseInlineBold(line)
  const tokens: Array<{ text: string; bold: boolean }> = []
  for (const seg of segments) {
    const words = seg.text.match(/\S+/g)
    if (words) {
      for (const word of words) {
        tokens.push({ text: word, bold: seg.bold })
      }
    }
  }
  return tokens
}

/**
 * Draw a string with **bold** markers inline at (x, y).
 * Each bold segment is rendered in bold weight; the rest in normal weight.
 */
function drawBoldText(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  ctx: SKRSContext2D
): void {
  const segments = parseInlineBold(text)
  let currentX = x
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  for (const seg of segments) {
    ctx.font = `${seg.bold ? 'bold' : 'normal'} ${fontSize}px Montserrat`
    ctx.fillText(seg.text, currentX, y)
    currentX += ctx.measureText(seg.text).width
  }
}

// ── PNG compositing ───────────────────────────────────────────────────────

async function compositeToPNG(
  template: CertificateTemplate,
  data: Record<string, string>,
  bodyOverride?: string
): Promise<Buffer> {
  ensureFonts()

  // 1. Download background first to inspect natural dimensions
  let bgImage: any = null
  let W = template.imageWidth || 2000
  let H = template.imageHeight || 1414

  if (template.backgroundImageUrl) {
    try {
      const bgBuffer = await downloadBuffer(template.backgroundImageUrl)
      bgImage = await loadImage(bgBuffer)
      // Set base target canvas size to the natural high-resolution dimensions of the image
      W = bgImage.width
      H = bgImage.height
    } catch (e) {
      console.error('[compositeToPNG] Failed to load background image:', e)
    }
  }

  // Apply a 2x quality multiplier to double the output resolution/DPI
  // This renders both the background image and font vectors at high-density
  const qualityMultiplier = 2
  const targetW = W * qualityMultiplier
  const targetH = H * qualityMultiplier

  const canvas = createCanvas(targetW, targetH)
  const ctx = canvas.getContext('2d')

  // Enable high-quality image smoothing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, targetW, targetH)
  } else {
    // Blank white canvas if no background uploaded yet
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, targetW, targetH)
  }

  // Calculate scaling factor relative to template's configured reference coordinates
  const refW = template.imageWidth || 2000
  const refH = template.imageHeight || 1414
  const scaleX = targetW / refW
  const scaleY = targetH / refH

  // Scale the context so all text sizes and coordinates automatically adapt to the high resolution canvas
  ctx.save()
  ctx.scale(scaleX, scaleY)

  // 2. Draw individual text fields (name, designation, date, etc.)
  for (const field of template.textFields) {
    const rawValue = data[field.key] ?? ''
    const value = fillTemplate(rawValue, data)
    if (!value) continue

    const weight = field.fontWeight === 'bold' ? 'bold' : 'normal'
    ctx.font = `${weight} ${field.fontSize}px Montserrat`
    ctx.fillStyle = field.color
    ctx.textBaseline = 'alphabetic'

    if (field.align === 'center') {
      ctx.textAlign = 'center'
      ctx.fillText(value, field.x, field.y)
    } else if (field.align === 'right') {
      ctx.textAlign = 'right'
      ctx.fillText(value, field.x, field.y)
    } else {
      ctx.textAlign = 'left'
      ctx.fillText(value, field.x, field.y)
    }
  }

  // 3. Draw word-wrapped body paragraph
  if (template.bodyBox) {
    const box = template.bodyBox
    const filledBody = bodyOverride || (template.bodyTemplate ? fillTemplate(template.bodyTemplate, data) : '')

    // Use normal weight for avgCharWidth baseline (bold is ~10% wider — acceptable for wrapping)
    ctx.font = `normal ${box.fontSize}px Montserrat`
    ctx.fillStyle = box.color
    ctx.textBaseline = 'alphabetic'

    // Strip **bold** markers before measuring box width so they don't inflate avgCharWidth
    const cleanBody = filledBody.replace(/\r?\n/g, ' ').replace(/\*\*/g, '')
    const avgCharWidth = ctx.measureText(cleanBody).width / (cleanBody.length > 0 ? cleanBody.length : 10)
    const maxWidth = avgCharWidth * (box.maxCharsPerLine || 95)

    // Split the body into paragraphs by newline and wrap each one
    const paragraphs = filledBody.split(/\r?\n/).filter(p => p.trim() !== '')
    const paragraphLines = paragraphs.map(p => wordWrapByWidth(p, maxWidth, ctx))

    const xLeft = box.x - maxWidth / 2
    let currentY = box.y

    for (let pIdx = 0; pIdx < paragraphLines.length; pIdx++) {
      const lines = paragraphLines[pIdx]
      if (lines.length === 0) continue

      for (let i = 0; i < lines.length; i++) {
        const isLastLine = i === lines.length - 1

        if (isLastLine) {
          // Last line of paragraph: left-aligned, rendered with inline bold
          drawBoldText(lines[i], xLeft, currentY, box.fontSize, box.color, ctx)
        } else {
          // Non-last lines: justified, rendered word-by-word with per-word bold
          const wordTokens = lineToWordTokens(lines[i])
          if (wordTokens.length <= 1) {
            drawBoldText(lines[i], xLeft, currentY, box.fontSize, box.color, ctx)
          } else {
            const wordsWidths = wordTokens.map(t => {
              ctx.font = `${t.bold ? 'bold' : 'normal'} ${box.fontSize}px Montserrat`
              return ctx.measureText(t.text).width
            })
            const totalWordsWidth = wordsWidths.reduce((sum, w) => sum + w, 0)
            const extraSpace = maxWidth - totalWordsWidth
            const gapWidth = extraSpace / (wordTokens.length - 1)

            ctx.textBaseline = 'alphabetic'
            ctx.textAlign = 'left'
            let currentX = xLeft
            for (let j = 0; j < wordTokens.length; j++) {
              ctx.font = `${wordTokens[j].bold ? 'bold' : 'normal'} ${box.fontSize}px Montserrat`
              ctx.fillStyle = box.color
              ctx.fillText(wordTokens[j].text, currentX, currentY)
              currentX += wordsWidths[j] + (j < wordTokens.length - 1 ? gapWidth : 0)
            }
          }
        }

        // Advance Y for the next line in the paragraph
        if (i < lines.length - 1) {
          currentY += box.lineHeight
        }
      }

      // Add vertical gap between paragraphs
      if (pIdx < paragraphLines.length - 1) {
        currentY += box.lineHeight * 1.25
      }
    }
  }

  ctx.restore()

  return canvas.toBuffer('image/png') as unknown as Buffer
}

// ── PNG → PDF conversion ─────────────────────────────────────────────────

async function pngToPdf(pngBuffer: Buffer, widthPx: number, heightPx: number): Promise<Buffer> {
  // Convert pixel dimensions to PDF points (1 px ≈ 0.75 pt at 96 DPI)
  // pdf-lib uses points (1/72 inch). At 96 DPI: 1 px = 72/96 pt = 0.75 pt
  const widthPt = widthPx * 0.75
  const heightPt = heightPx * 0.75

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([widthPt, heightPt])

  const pngImage = await pdfDoc.embedPng(pngBuffer)

  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: widthPt,
    height: heightPt,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Render a certificate by overlaying text fields onto a background PNG,
 * then wrapping the result in a single-page PDF.
 *
 * @param template  CertificateTemplate config from Firestore
 * @param data      Map of variable names → filled values
 *                  (produced by resolveVariableMap() in generate.ts)
 * @returns PDF Buffer ready to stream to the client
 */
export async function renderCertificatePdf(
  template: CertificateTemplate,
  data: Record<string, string>,
  bodyOverride?: string
): Promise<Buffer> {
  // Format specific date fields for the certificate standard (dd/MM/yyyy)
  const formattedData = { ...data }
  const dateKeys = ['joining_date', 'end_date', 'current_date']
  for (const key of dateKeys) {
    if (formattedData[key]) {
      const formatted = formatToDDMMYYYY(formattedData[key])
      if (formatted) {
        formattedData[key] = formatted
      }
    }
  }

  // Step 1-3: Composite PNG
  const pngBuffer = await compositeToPNG(template, formattedData, bodyOverride)

  // Step 4: Convert PNG → single-page PDF
  const pdfBuffer = await pngToPdf(pngBuffer, template.imageWidth, template.imageHeight)

  return pdfBuffer
}
