// lib/export/pdf-renderer.tsx
// React-PDF document component + markdown-to-elements converter.
// This file MUST be .tsx because it uses JSX with @react-pdf/renderer.

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontSize: 11,
    paddingTop: 72,
    paddingBottom: 60,
    paddingHorizontal: 60,
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  headerBar: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 20,
    marginHorizontal: -60,
    marginTop: -72,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCompany: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerTagline: {
    color: '#94a3b8',
    fontSize: 8,
    marginTop: 2,
  },
  headerDate: {
    color: '#94a3b8',
    fontSize: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 14,
    marginBottom: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 10,
  },
  h1: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginTop: 14, marginBottom: 6 },
  h2: { fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginTop: 12, marginBottom: 5 },
  h3: { fontSize: 11, fontWeight: 'bold', color: '#334155', marginTop: 8, marginBottom: 4 },
  paragraph: { marginVertical: 3, lineHeight: 1.7, textAlign: 'justify' },
  listRow: { flexDirection: 'row', marginVertical: 2, marginLeft: 12 },
  bullet: { width: 12, marginRight: 4 },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 60,
    right: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 5,
    fontSize: 7,
    color: '#94a3b8',
  },
  footerBrand: { fontWeight: 'bold', color: '#64748b' },
  space: { height: 6 },
})

// ─── Inline text parser ──────────────────────────────────────────────────
interface Segment { text: string; bold: boolean; italic: boolean }

function parseInline(line: string): Segment[] {
  const segs: Segment[] = []
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index), bold: false, italic: false })
    if (m[2]) segs.push({ text: m[2], bold: true, italic: true })
    else if (m[3]) segs.push({ text: m[3], bold: true, italic: false })
    else if (m[4]) segs.push({ text: m[4], bold: false, italic: true })
    else if (m[5]) segs.push({ text: m[5], bold: false, italic: false })
    last = m.index + m[0].length
  }
  if (last < line.length) segs.push({ text: line.slice(last), bold: false, italic: false })
  return segs
}

function InlineText({ segs }: { segs: Segment[] }) {
  return (
    <Text>
      {segs.map((s, i) => (
        <Text key={i} style={[s.bold ? styles.bold : {}, s.italic ? styles.italic : {}]}>
          {s.text}
        </Text>
      ))}
    </Text>
  )
}

// ─── Markdown → React-PDF elements ──────────────────────────────────────
function markdownToElements(markdown: string): React.ReactElement[] {
  const lines = markdown.split('\n')
  const els: React.ReactElement[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      els.push(<Text key={i} style={styles.h3}>{line.slice(4).trim()}</Text>)
    } else if (line.startsWith('## ')) {
      els.push(<Text key={i} style={styles.h2}>{line.slice(3).trim()}</Text>)
    } else if (line.startsWith('# ')) {
      els.push(<Text key={i} style={styles.h1}>{line.slice(2).trim()}</Text>)
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      els.push(<View key={i} style={styles.divider} />)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const segs = parseInline(line.slice(2))
      els.push(
        <View key={i} style={styles.listRow}>
          <Text style={styles.bullet}>{'•'}</Text>
          <InlineText segs={segs} />
        </View>
      )
    } else if (/^\d+\.\s/.test(line)) {
      const m2 = line.match(/^(\d+)\.\s(.*)$/)
      if (m2) {
        const segs = parseInline(m2[2])
        els.push(
          <View key={i} style={styles.listRow}>
            <Text style={styles.bullet}>{m2[1]}.</Text>
            <InlineText segs={segs} />
          </View>
        )
      }
    } else if (line.trim() === '') {
      els.push(<View key={i} style={styles.space} />)
    } else {
      const segs = parseInline(line)
      els.push(
        <Text key={i} style={styles.paragraph}>
          {segs.map((s, j) => (
            <Text key={j} style={[s.bold ? styles.bold : {}, s.italic ? styles.italic : {}]}>
              {s.text}
            </Text>
          ))}
        </Text>
      )
    }
  }
  return els
}

// ─── Exported PDF Document component ────────────────────────────────────
export interface HRDocumentProps {
  companyName: string
  documentTitle: string
  markdownContent: string
  dateStr: string
}

export function HRPdfDocument({ companyName, documentTitle, markdownContent, dateStr }: HRDocumentProps) {
  return (
    <Document title={documentTitle} author={companyName} creator="AirBuddy HR Platform">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar} fixed>
          <View>
            <Text style={styles.headerCompany}>{companyName}</Text>
            <Text style={styles.headerTagline}>AirBuddy Aerospace Pvt. Ltd. — HR Document Platform</Text>
          </View>
          <Text style={styles.headerDate}>{dateStr}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{documentTitle}</Text>
        <View style={styles.divider} />

        {/* Content */}
        {markdownToElements(markdownContent)}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>AirBuddy Aerospace Pvt. Ltd.</Text>
          <Text render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
