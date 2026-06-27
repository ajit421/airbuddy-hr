// lib/certificates/render-certificate.ts
// Server-side certificate rendering: background PNG + text overlay → PNG Buffer.
//
// Uses:
//   @napi-rs/canvas  — Canvas 2D API for text measurement + drawing
//   sharp            — already installed, used indirectly via downloadBuffer
//
// Constraints:
//   - No browser / Puppeteer / HTML rendering
//   - Direct image compositing only
//   - Fonts must be registered before use (done via GlobalFonts.registerFromPath)

import path from 'path'
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
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
 * Breaks only at word boundaries. If a single word exceeds maxCharsPerLine
 * it is placed on its own line.
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

// ── Main render function ──────────────────────────────────────────────────

/**
 * Render a certificate by overlaying text fields onto a background PNG.
 *
 * @param template  CertificateTemplate config from Firestore
 * @param data      Map of variable names → values (e.g. { full_name: 'Aarush Bhagat', ... })
 * @returns PNG Buffer ready to stream to the client
 */
export async function renderCertificate(
  template: CertificateTemplate,
  data: Record<string, string>
): Promise<Buffer> {
  ensureFonts()

  // ── 1. Load background image ───────────────────────────────────────────
  let backgroundBuffer: Buffer

  if (template.backgroundImageUrl) {
    backgroundBuffer = await downloadBuffer(template.backgroundImageUrl)
  } else {
    // Fallback: create a blank white canvas if no background uploaded yet
    console.warn('[renderCertificate] No backgroundImageUrl set — using blank canvas')
    backgroundBuffer = Buffer.alloc(0)
  }

  const { imageWidth: W, imageHeight: H } = template

  // ── 2. Create canvas and draw background ──────────────────────────────
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  if (backgroundBuffer.length > 0) {
    const bgImage = await loadImage(backgroundBuffer)
    ctx.drawImage(bgImage, 0, 0, W, H)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
  }

  // ── 3. Draw individual text fields ────────────────────────────────────
  for (const field of template.textFields) {
    const value = fillTemplate(data[field.key] ?? '', data)
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

  // ── 4. Draw word-wrapped body paragraph ───────────────────────────────
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

  // ── 5. Export as PNG Buffer ────────────────────────────────────────────
  return canvas.toBuffer('image/png') as unknown as Buffer
}
