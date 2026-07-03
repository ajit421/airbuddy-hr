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
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.headingText,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  h2: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.headingText,
    marginTop: 22,
    marginBottom: 8,
  },
  h3: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.headingText,
    marginTop: 14,
    marginBottom: 5,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
    lineHeight: 1.9,
    textAlign: 'justify',
    color: BRAND.bodyText,
    fontSize: 10.5,
    // NOTE: No fontFamily here — set per-segment so bold/italic overrides work in react-pdf v4
  },
  divider: {
    borderBottomWidth: 0.75,
    borderBottomColor: BRAND.divider,
    marginVertical: 14,
  },
  listRow: {
    flexDirection: 'row',
    marginBottom: 6,
    marginLeft: 14,
    lineHeight: 1.7,
  },
  bullet: {
    width: 18,
    fontSize: 10.5,
    fontFamily: 'Helvetica',
    color: BRAND.bodyText,
    flexShrink: 0,
  },
  listText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 1.8,
    textAlign: 'justify',
    color: BRAND.bodyText,
    // NOTE: No fontFamily here — set per-segment so bold/italic overrides work in react-pdf v4
  },
  // Per-segment font styles — always applied to every segment, never inherited
  segNormal: {
    fontFamily: 'Helvetica',
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
    height: 8,
  },
  signatureLine: {
    fontSize: 10.5,
    color: '#444444',
    marginTop: 4,
    marginBottom: 4,
    letterSpacing: 0.3,
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



const PhoneIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 24 24" style={{ alignSelf: 'center' }}>
    {/* <Circle cx="12" cy="12" r="11" fill="none" stroke="#ffffff" strokeWidth="1.8" /> */}
    <Path
      d="M14.05 6C15.0268 6.19057 15.9244 6.66826 16.6281 7.37194C17.3318 8.07561 17.8095 8.97326 18 9.95M14.05 2C16.0793 2.22544 17.9716 3.13417 19.4163 4.57701C20.8609 6.01984 21.7721 7.91101 22 9.94M18.5 21C9.93959 21 3 14.0604 3 5.5C3 5.11378 3.01413 4.73086 3.04189 4.35173C3.07375 3.91662 3.08968 3.69907 3.2037 3.50103C3.29814 3.33701 3.4655 3.18146 3.63598 3.09925C3.84181 3 4.08188 3 4.56201 3H7.37932C7.78308 3 7.98496 3 8.15802 3.06645C8.31089 3.12515 8.44701 3.22049 8.55442 3.3441C8.67601 3.48403 8.745 3.67376 8.88299 4.05321L10.0491 7.26005C10.2096 7.70153 10.2899 7.92227 10.2763 8.1317C10.2643 8.31637 10.2012 8.49408 10.0942 8.64506C9.97286 8.81628 9.77145 8.93713 9.36863 9.17882L8 10C9.2019 12.6489 11.3501 14.7999 14 16L14.8212 14.6314C15.0629 14.2285 15.1837 14.0271 15.3549 13.9058C15.5059 13.7988 15.6836 13.7357 15.8683 13.7237C16.0777 13.7101 16.2985 13.7904 16.74 13.9509L19.9468 15.117C20.3262 15.255 20.516 15.324 20.6559 15.4456C20.7795 15.553 20.8749 15.6891 20.9335 15.842C21 16.015 21 16.2169 21 16.6207V19.438C21 19.9181 21 20.1582 20.9007 20.364C20.8185 20.5345 20.663 20.7019 20.499 20.7963C20.3009 20.9103 20.0834 20.9262 19.6483 20.9581C19.2691 20.9859 18.8862 21 18.5 21Z"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
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
  // Matches ***bold+italic***, **bold**, *italic*, `code`
  // \s* around markers allows bold adjacent to punctuation: (**text**) or "**text**"
  const re = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*]+?)\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index), bold: false, italic: false })
    if (m[1])      segs.push({ text: m[1], bold: true,  italic: true  })
    else if (m[2]) segs.push({ text: m[2], bold: true,  italic: false })
    else if (m[3]) segs.push({ text: m[3], bold: false, italic: true  })
    last = m.index + m[0].length
  }
  if (last < line.length) segs.push({ text: line.slice(last), bold: false, italic: false })
  return segs
}

// Always returns an explicit fontFamily so react-pdf v4 can never fall back to an
// inherited fontFamily from the parent <Text> — that parent override is the root
// cause of bold/italic not rendering.
function segmentStyle(s: Segment): PDFStyle {
  if (s.bold && s.italic) return styles.boldItalic
  if (s.bold)             return styles.bold
  if (s.italic)           return styles.italic
  return styles.segNormal  // explicit 'Helvetica' — never empty
}

// Renders a line of parsed inline segments.
// IMPORTANT: baseStyle must NOT contain a fontFamily because react-pdf v4
// prevents child <Text> fontFamily from overriding an ancestor fontFamily.
// Each segment receives segmentStyle which always provides an explicit fontFamily.
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

    // ── Headings — always bold by their own style; do NOT pass through InlineText
    // because segNormal would override the heading fontFamily with 'Helvetica'.
    if (line.startsWith('### ')) {
      const text = line.slice(4).trim()
      els.push(<Text key={i} style={styles.h3}>{text}</Text>)
      continue
    }
    if (line.startsWith('## ')) {
      const text = line.slice(3).trim()
      els.push(<Text key={i} style={styles.h2}>{text}</Text>)
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
