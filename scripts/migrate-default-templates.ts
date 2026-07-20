// scripts/migrate-default-templates.ts
//
// One-time migration: writes the 2 default HR document templates to Firestore.
// Idempotent — any template whose name already exists with isDefault: true is skipped.
//
// Run:
//   npx tsx scripts/migrate-default-templates.ts
//
// Prerequisites: .env.local must be present with FIREBASE_ADMIN_* credentials.

import * as path from 'path'
import * as fs from 'fs'
import { NDA_AGREEMENT_TEMPLATE } from '../lib/templates/nda-template'
import { OFFER_LETTER_TEMPLATE } from '../lib/templates/offer-letter-template'

// ── Load .env.local before importing Firebase Admin ───────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    value = value.replace(/\\n/g, '\n')
    process.env[key] = value
  }
  console.log('✅  Loaded .env.local')
} else {
  console.error('❌  .env.local not found — cannot initialise Firebase Admin.')
  process.exit(1)
}

import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    }),
  })
}

const db = getFirestore()

// ── extractVariables (inlined to avoid Next.js module resolution issues) ──────

function extractVariables(markdown: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const found = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = regex.exec(markdown)) !== null) {
    const varName = match[1].trim()
    if (varName) found.add(varName)
  }
  return Array.from(found)
}

// ── Template definitions (migrated verbatim from seed-defaults.ts) ────────────

interface DefaultTemplate {
  name: string
  type: string
  description: string
  markdownContent: string
  applicableStatus: string[]
  isDefault: true
  isActive: true
}

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // ── NDA Agreement ────────────────────────────────────────────────────────
  {
    name: 'NDA Agreement',
    type: 'nda',
    description: 'Non-Disclosure Agreement for employees and contractors.',
    applicableStatus: ['full-time', 'contract', 'intern'],
    isDefault: true,
    isActive: true,
    markdownContent: NDA_AGREEMENT_TEMPLATE,
  },

  // ── Employment Offer Letter ──────────────────────────────────────────────
  {
    name: 'Employment Offer Letter',
    type: 'offer_letter',
    description: 'Formal employment offer letter for Full-Time and Contract employees. Covers all 16 standard clauses: position, JD, working hours, compensation, leave, employment term, probation, confidentiality, notice period, early-exit clause, statutory benefits, conflict of interest, background verification, documents required at joining, company policies, and acceptance block.',
    applicableStatus: ['full-time', 'contract'],
    isDefault: true,
    isActive: true,
    markdownContent: OFFER_LETTER_TEMPLATE,
  },
]

// ── Migration logic ───────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 Starting migration → Firestore project: ${process.env.FIREBASE_ADMIN_PROJECT_ID}`)
  console.log('────────────────────────────────────────────────────────')

  // Fetch all existing default templates (isDefault: true) to check for duplicates
  const existingSnap = await db
    .collection('templates')
    .where('isDefault', '==', true)
    .get()

  const existingNames = new Set(existingSnap.docs.map(d => d.data().name as string))
  console.log(`\n📦 Existing default templates in Firestore (${existingNames.size}):`)
  existingNames.forEach(n => console.log(`   ✅  "${n}"`))
  console.log()

  const now = new Date().toISOString()
  let created = 0
  let skipped = 0
  const createdIds: Array<{ name: string; id: string }> = []

  for (const tmpl of DEFAULT_TEMPLATES) {
    if (existingNames.has(tmpl.name)) {
      console.log(`⏭️   SKIP  "${tmpl.name}" — already exists in Firestore`)
      skipped++
      continue
    }

    const docRef = db.collection('templates').doc()
    await docRef.set({
      name:             tmpl.name,
      type:             tmpl.type,
      description:      tmpl.description,
      markdownContent:  tmpl.markdownContent,
      variables:        extractVariables(tmpl.markdownContent),
      applicableStatus: tmpl.applicableStatus,
      isDefault:        true,
      isActive:         true,
      createdAt:        now,
      updatedAt:        now,
      createdBy:        'system',
      updatedBy:        'system',
    })

    console.log(`✨  CREATED "${tmpl.name}" → doc ID: ${docRef.id}`)
    createdIds.push({ name: tmpl.name, id: docRef.id })
    created++
  }

  console.log('\n────────────────────────────────────────────────────────')
  console.log(`\n📊 Migration complete!`)
  console.log(`   Created : ${created}`)
  console.log(`   Skipped : ${skipped}`)
  if (createdIds.length > 0) {
    console.log(`\n   New Firestore doc IDs:`)
    createdIds.forEach(({ name, id }) => console.log(`     "${name}" → ${id}`))
  }
  console.log()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Migration failed:', err)
    process.exit(1)
  })
