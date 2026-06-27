// scripts/check-firestore-templates.ts
// Read-only: checks the current state of the templates collection in Firestore.
// Run: npx tsx scripts/check-firestore-templates.ts

import * as path from 'path'
import * as fs from 'fs'

// Load .env.local manually before anything else
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
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    // Handle escaped newlines in private key
    value = value.replace(/\\n/g, '\n')
    process.env[key] = value
  }
  console.log('✅ Loaded .env.local')
}

import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    }),
  })
}

const db = getFirestore()

async function main() {
  console.log(`\n🔍 Checking Firestore project: ${process.env.FIREBASE_ADMIN_PROJECT_ID}`)
  console.log('📦 Collection: templates\n')

  const snapshot = await db.collection('templates').orderBy('createdAt', 'asc').get()

  if (snapshot.empty) {
    console.log('❌ Templates collection is EMPTY — no documents found.')
    console.log('   → Migration script will create all 6 default templates.')
  } else {
    console.log(`✅ Templates collection has ${snapshot.size} document(s):\n`)
    snapshot.docs.forEach((doc, i) => {
      const data = doc.data()
      console.log(`  ${i + 1}. [${doc.id}]`)
      console.log(`     name:      ${data.name ?? '—'}`)
      console.log(`     type:      ${data.type ?? '—'}`)
      console.log(`     isDefault: ${data.isDefault ?? false}`)
      console.log(`     isActive:  ${data.isActive ?? false}`)
      console.log(`     createdBy: ${data.createdBy ?? '—'}`)
      console.log(`     createdAt: ${data.createdAt ?? '—'}`)
      console.log()
    })

    const defaultDocs = snapshot.docs.filter(d => d.data().isDefault === true)
    const customDocs  = snapshot.docs.filter(d => !d.data().isDefault)
    console.log(`📊 Summary: ${defaultDocs.length} default template(s), ${customDocs.length} custom template(s)`)
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
