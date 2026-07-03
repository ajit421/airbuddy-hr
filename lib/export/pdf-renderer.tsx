// lib/export/pdf-renderer.tsx
// React-PDF document component + markdown-to-elements converter.
// This file MUST be .tsx because it uses JSX with @react-pdf/renderer.
//
// Letterhead design:
//   Header (fixed, every page):
//     Left  — AirBuddy Aerospace logo mark + "AIRBUDDY AEROSPACE" wordmark
//     Right — light-gray address bar: "B-43, Phi 3, Greater Noida, UP – 201310"
//   Footer (fixed, every page):
//     Dark charcoal/olive band: Phone | Email | Website
//     Light sage band below it
//
// No signature or seal is auto-placed; HR signs/stamps manually after export.

import React from 'react'
import path from 'path'
import fs from 'fs'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Circle,
  Path,
  Rect,
  Line,
} from '@react-pdf/renderer'

// Type alias for a single react-pdf style object
type PDFStyle = ReturnType<typeof StyleSheet.create>[string]

// ─── Logo Image Loader (Server-side base64 fallback) ─────────────────────────
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png')
let logoBase64 = ''
try {
  if (fs.existsSync(LOGO_PATH)) {
    const logoBuffer = fs.readFileSync(LOGO_PATH)
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
  }
} catch (err) {
  console.error('Failed to load logo image to base64:', err)
}

// ─── Brand constants ──────────────────────────────────────────────────────────
const BRAND = {
  sageLight:   '#b5bbb2',   // Light Sage Gray/Green for header and footer accent
  sageDark:    '#50574d',   // Olive-Slate Charcoal for footer contact bar
  bodyText:    '#1a1a1a',   // near-black body text
  headingText: '#000000',   // absolute black headings
  white:       '#ffffff',
  divider:     '#cccccc',
} as const

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 160, // Clear the logo wordmark zone on every page
    paddingBottom: 80, // Clear the footer on every page
    paddingLeft: 62,
    paddingRight: 62,
    color: BRAND.bodyText,
    fontFamily: 'Helvetica',
  },

  // ── Header (Exactly matching the template PDF) ──────────────────────
  headerContainer: {
    position: 'absolute',
    top: 25, // Pushed down slightly from the top edge
    left: 0,
    right: 0,
    height: 120,
  },
  headerTopRow: {
    flexDirection: 'row',
    height: 35,               // Matches the taller grey band in template
    alignItems: 'center',
  },
  headerLeftBand: {
    width: 62,                // Extends exactly to the left margin
    height: '100%',
    backgroundColor: BRAND.sageLight,
  },
  headerLogoCutout: {
    width: 75,                // Narrow white cutout that tightly wraps the logo
    height: '100%',
    backgroundColor: BRAND.white,
  },
  headerRightBand: {
    flex: 1,                  // Extends to right edge of page
    height: '100%',
    backgroundColor: BRAND.sageLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAddressText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,            // Bold and legible
    color: BRAND.headingText,
    letterSpacing: 0.3,     // Slightly more narrow than the template
  },
  logoWrapper: {
    position: 'absolute',
    top: -20,                   // Pushes logo up to overlap the grey band cutout
    left: 29.5,               // Perfectly centers the 140pt wrapper over the 75pt cutout (62 + 37.5 - 70)
    width: 140,
    alignItems: 'center',
  },
  logoImage: {
    width: 60,                // Large, prominent logo exactly like the template
    height: 60,
    objectFit: 'contain',
  },
  logoWordmark: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    lineHeight: 1.15,
    color: BRAND.headingText,
    textAlign: 'center',
    letterSpacing: 1.2,
  },

  // ── Body typography — legal document style ───────────────────────────────────
  h1: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.headingText,
    marginTop: 0,
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  h2: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.headingText,
    marginTop: 18,
    marginBottom: 6,
  },
  h3: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.headingText,
    marginTop: 12,
    marginBottom: 5,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
    lineHeight: 1.8,
    textAlign: 'justify',
    color: BRAND.bodyText,
    fontSize: 11,
  },
  divider: {
    borderBottomWidth: 0.75,
    borderBottomColor: BRAND.divider,
    marginVertical: 12,
  },
  listRow: {
    flexDirection: 'row',
    marginBottom: 5,
    marginLeft: 18,
    lineHeight: 1.7,
  },
  bullet: {
    width: 20,
    fontSize: 11,
    color: BRAND.bodyText,
    flexShrink: 0,
  },
  listText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.7,
    textAlign: 'justify',
    color: BRAND.bodyText,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  italic: {
    fontFamily: 'Helvetica-Oblique',
  },
  boldItalic: {
    fontFamily: 'Helvetica-BoldOblique',
  },
  space: {
    height: 10,
  },
  signatureLine: {
    fontSize: 11,
    color: BRAND.bodyText,
    marginTop: 2,
    marginBottom: 2,
  },

  // ── Footer (Exactly matching the template PDF) ──────────────────────────────
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  footerDarkBand: {
    height: 40,
    backgroundColor: BRAND.sageDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  footerLightBand: {
    height: 20,
    backgroundColor: BRAND.sageLight,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 9.5,
    color: BRAND.white,
    fontFamily: 'Helvetica',
  },
})

// ─── Footer SVG Icons ────────────────────────────────────────────────────────
const PhoneIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 14 14" style={{ alignSelf: 'center' }}>
    <Circle cx="7" cy="7" r="6" fill="none" stroke="#ffffff" strokeWidth="1.2" />
    <Path
      d="M5.2 4.2 C4.8 4.2 4.6 4.4 4.5 4.8 C4.3 5.2 4.3 5.8 4.8 6.4 C5.2 7.0 5.8 7.6 6.5 8.0 C7.1 8.4 7.7 8.4 8.1 8.2 C8.4 8.1 8.6 7.9 8.6 7.6 L8.3 6.9 C8.2 6.7 8.0 6.6 7.8 6.7 L7.3 6.9 C7.1 6.8 6.8 6.6 6.6 6.4 C6.4 6.2 6.2 5.9 6.1 5.7 L6.3 5.2 C6.4 5.0 6.3 4.8 6.1 4.7 L5.2 4.2 Z"
      fill="#ffffff"
    />
  </Svg>
)

const MailIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 14 14" style={{ alignSelf: 'center' }}>
    <Rect x="1" y="3.5" width="12" height="7" rx="1" fill="none" stroke="#ffffff" strokeWidth="1.2" />
    <Path d="M1 4.5 L7 8 L13 4.5" fill="none" stroke="#ffffff" strokeWidth="1.2" />
  </Svg>
)

const GlobeIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 14 14" style={{ alignSelf: 'center' }}>
    <Circle cx="7" cy="7" r="6" fill="none" stroke="#ffffff" strokeWidth="1.2" />
    <Line x1="1" y1="7" x2="13" y2="7" stroke="#ffffff" strokeWidth="1.2" />
    <Path d="M7 1 C9 3 9.5 5 9.5 7 C9.5 9 9 11 7 13 C5 11 4.5 9 4.5 7 C4.5 5 5 3 7 1 Z" fill="none" stroke="#ffffff" strokeWidth="1.2" />
  </Svg>
)

// ─── Inline text parser ──────────────────────────────────────────────────────
interface Segment { text: string; bold: boolean; italic: boolean }

function parseInline(line: string): Segment[] {
  const segs: Segment[] = []
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index), bold: false, italic: false })
    if (m[2])      segs.push({ text: m[2], bold: true,  italic: true  })
    else if (m[3]) segs.push({ text: m[3], bold: true,  italic: false })
    else if (m[4]) segs.push({ text: m[4], bold: false, italic: true  })
    else if (m[5]) segs.push({ text: m[5], bold: false, italic: false })
    last = m.index + m[0].length
  }
  if (last < line.length) segs.push({ text: line.slice(last), bold: false, italic: false })
  return segs
}

function segmentStyle(s: Segment): PDFStyle {
  if (s.bold && s.italic) return styles.boldItalic
  if (s.bold)             return styles.bold
  if (s.italic)           return styles.italic
  return {}
}

function InlineText({ segs, baseStyle }: { segs: Segment[]; baseStyle?: PDFStyle }) {
  return (
    <Text style={baseStyle}>
      {segs.map((s, i) => (
        <Text key={i} style={segmentStyle(s)}>
          {s.text}
        </Text>
      ))}
    </Text>
  )
}

// ─── Markdown → React-PDF elements ──────────────────────────────────────────
function markdownToElements(markdown: string): React.ReactElement[] {
  const lines = markdown.split('\n')
  const els: React.ReactElement[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // ── Blank / spacing lines ───────────────────────────────────────────────
    if (trimmed === '' || trimmed === '&nbsp;') {
      els.push(<View key={i} style={styles.space} />)
      continue
    }

    // ── Headings (checked first — before list patterns!) ────────────────────
    if (line.startsWith('### ')) {
      const text = line.slice(4).trim()
      const segs = parseInline(text)
      els.push(<InlineText key={i} segs={segs} baseStyle={styles.h3} />)
      continue
    }
    if (line.startsWith('## ')) {
      const text = line.slice(3).trim()
      const segs = parseInline(text)
      els.push(<InlineText key={i} segs={segs} baseStyle={styles.h2} />)
      continue
    }
    if (line.startsWith('# ')) {
      const text = line.slice(2).trim()
      els.push(<Text key={i} style={styles.h1}>{text}</Text>)
      continue
    }

    // ── Horizontal rule ─────────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      els.push(<View key={i} style={styles.divider} />)
      continue
    }

    // ── Signature / underline lines (e.g. _________________________) ─────────
    if (/^_{3,}$/.test(trimmed)) {
      els.push(
        <Text key={i} style={styles.signatureLine}>{trimmed}</Text>
      )
      continue
    }

    // ── Bullet list (- or *) ────────────────────────────────────────────────
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const segs = parseInline(line.slice(2))
      els.push(
        <View key={i} style={styles.listRow}>
          <Text style={styles.bullet}>{'•'}</Text>
          <InlineText segs={segs} baseStyle={styles.listText} />
        </View>
      )
      continue
    }

    // ── Numbered list (1. 2. 3. …) ──────────────────────────────────────────
    const numMatch = line.match(/^(\d+)\.\s(.*)$/)
    if (numMatch) {
      const segs = parseInline(numMatch[2])
      els.push(
        <View key={i} style={styles.listRow}>
          <Text style={styles.bullet}>{numMatch[1]}.</Text>
          <InlineText segs={segs} baseStyle={styles.listText} />
        </View>
      )
      continue
    }

    // ── Plain paragraph (default) ────────────────────────────────────────────
    const segs = parseInline(line)
    els.push(
      <InlineText key={i} segs={segs} baseStyle={styles.paragraph} />
    )
  }

  return els
}

// ─── Shared Header component ─────────────────────────────────────────────────
function LetterheadHeader() {
  return (
    <View style={styles.headerContainer} fixed>
      {/* Top row containing left sage band, white cutout, right sage address band */}
      <View style={styles.headerTopRow}>
        <View style={styles.headerLeftBand} />
        <View style={styles.headerLogoCutout} />
        <View style={styles.headerRightBand}>
          <Text style={styles.headerAddressText}>
            B-43, Phi 3, Greater Noida, Uttar Pradesh – 201310
          </Text>
        </View>
      </View>

      {/* Floating Logo + Centered Wordmark */}
      <View style={styles.logoWrapper}>
        {logoBase64 ? (
          <Image src={logoBase64} style={styles.logoImage} />
        ) : (
          <View style={{ width: 60, height: 60 }} />
        )}
        <Text style={[styles.logoWordmark, { marginTop: 6 }]}>AIRBUDDY</Text>
        <Text style={styles.logoWordmark}>AEROSPACE</Text>
      </View>
    </View>
  )
}

// ─── Shared Footer component ─────────────────────────────────────────────────
function LetterheadFooter() {
  return (
    <View style={styles.footerContainer} fixed>
      {/* Dark charcoal contact details band */}
      <View style={styles.footerDarkBand}>
        <View style={styles.footerItem}>
          <PhoneIcon />
          <Text style={styles.footerText}>+91 7079142368</Text>
        </View>
        <View style={styles.footerItem}>
          <MailIcon />
          <Text style={styles.footerText}>tech@airbuddy.in</Text>
        </View>
        <View style={styles.footerItem}>
          <GlobeIcon />
          <Text style={styles.footerText}>Website: www.airbuddy.in</Text>
        </View>
      </View>

      {/* Bottom sage accent band */}
      <View style={styles.footerLightBand} />
    </View>
  )
}

// ─── Exported PDF Document component ────────────────────────────────────────
export interface HRDocumentProps {
  companyName: string
  documentTitle: string
  markdownContent: string
  dateStr: string
}

export function HRPdfDocument({ companyName, documentTitle, markdownContent }: HRDocumentProps) {
  return (
    <Document title={documentTitle} author={companyName} creator="AirBuddy HR Platform">
      <Page size="A4" style={styles.page}>
        {/* Letterhead header — fixed on every page */}
        <LetterheadHeader />

        {/* Document body — templates begin with their own # heading */}
        {markdownToElements(markdownContent)}

        {/* Letterhead footer — fixed on every page */}
        <LetterheadFooter />
      </Page>
    </Document>
  )
}
