// scripts/seed-offer-letter-template.ts
// One-time idempotent script: seed the default "Employment Offer Letter"
// markdown template to Firestore.
//
// Usage:
//   npx tsx scripts/seed-offer-letter-template.ts
//
// Prerequisites: .env.local must be present with FIREBASE_ADMIN_* credentials.
// The template is written as a standard markdown type (not certificate), so it
// flows through the standard HRPdfDocument renderer with the letterhead system.

import * as path from 'path'
import * as fs from 'fs'
import { OFFER_LETTER_TEMPLATE } from '../lib/templates/offer-letter-template'

// ── Load .env.local before importing Firebase Admin ────────────────────────────
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

// ── extractVariables (inlined to avoid Next.js module resolution issues) ───────
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

const TEMPLATE_ID = 'default-offer-letter'  // deterministic ID

async function main() {
  console.log('\n🚀 Seeding Employment Offer Letter template...')
  console.log(`   Firestore project: ${process.env.FIREBASE_ADMIN_PROJECT_ID}`)
  console.log('────────────────────────────────────────────────────────')

  const existing = await db.collection('templates').doc(TEMPLATE_ID).get()
  const now = new Date().toISOString()

  const variables = extractVariables(OFFER_LETTER_TEMPLATE)
  console.log(`\n📋 Variables detected in template (${variables.length}):`)
  variables.forEach((v) => console.log(`   {{${v}}}`))

  const payload = {
    name:             'Employment Offer Letter',
    type:             'offer_letter',
    description:      'Formal employment offer letter for Full-Time and Contract employees. Covers all 16 standard clauses including position details, JD, compensation, leave, notice period, and acceptance block.',
    markdownContent:  OFFER_LETTER_TEMPLATE,
    variables,
    applicableStatus: ['full-time', 'contract'],
    isDefault:        true,
    isActive:         true,
    createdAt:        now,
    updatedAt:        now,
    createdBy:        'seed-script',
    updatedBy:        'seed-script',
  }

  if (existing.exists) {
    console.log('\n⏭️   Template already exists — updating content...')
    await db.collection('templates').doc(TEMPLATE_ID).update({
      ...payload,
      // Preserve original createdAt
      createdAt: existing.data()?.createdAt ?? now,
      createdBy: existing.data()?.createdBy ?? 'seed-script',
    })
    console.log(`✅  Updated template: ${TEMPLATE_ID}`)
  } else {
    await db.collection('templates').doc(TEMPLATE_ID).set(payload)
    console.log(`✨  Created template: ${TEMPLATE_ID}`)
  }

  console.log('\n────────────────────────────────────────────────────────')
  console.log('\n📌 Next steps:')
  console.log('   1. Go to /templates in the app')
  console.log('   2. Find "Employment Offer Letter" — it should appear')
  console.log('   3. Go to any Full-Time or Contract employee')
  console.log('   4. Click "Generate Document" → select "Employment Offer Letter"')
  console.log('   5. Fill in the missing variables in Step 2')
  console.log('   6. Export as PDF and verify all 16 sections render correctly')
  console.log('\n[Seed] Done.\n')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err)
  process.exit(1)
})
