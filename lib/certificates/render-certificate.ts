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
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
import type { CertificateTemplate } from '@/types/template'
import { downloadBuffer } from '@/lib/cloudinary/storage-helpers'

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
 * Wrap text into lines of at most maxCharsPerLine characters.
 * Breaks only at word boundaries.
 */
function wordWrap(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (current === '') {
      current = word
    } else if (current.length + 1 + word.length <= maxCharsPerLine) {
      current += ' ' + word
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

// ── PNG compositing ───────────────────────────────────────────────────────

async function compositeToPNG(
  template: CertificateTemplate,
  data: Record<string, string>
): Promise<Buffer> {
  ensureFonts()

  const { imageWidth: W, imageHeight: H } = template
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // 1. Draw background
  if (template.backgroundImageUrl) {
    const bgBuffer = await downloadBuffer(template.backgroundImageUrl)
    const bgImage = await loadImage(bgBuffer)
    ctx.drawImage(bgImage, 0, 0, W, H)
  } else {
    // Blank white canvas if no background uploaded yet
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
  }

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
  if (template.bodyTemplate && template.bodyBox) {
    const box = template.bodyBox
    const filledBody = fillTemplate(template.bodyTemplate, data)
    const lines = wordWrap(filledBody, box.maxCharsPerLine)

    ctx.font = `normal ${box.fontSize}px Montserrat`
    ctx.fillStyle = box.color
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'center'

    for (let i = 0; i < lines.length; i++) {
      const lineY = box.y + i * box.lineHeight
      ctx.fillText(lines[i], box.x, lineY)
    }
  }

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
  data: Record<string, string>
): Promise<Buffer> {
  // Step 1-3: Composite PNG
  const pngBuffer = await compositeToPNG(template, data)

  // Step 4: Convert PNG → single-page PDF
  const pdfBuffer = await pngToPdf(pngBuffer, template.imageWidth, template.imageHeight)

  return pdfBuffer
}
