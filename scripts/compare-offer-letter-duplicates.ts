// scripts/compare-offer-letter-duplicates.ts  (temporary — delete after use)
import * as path from 'path'
import * as fs from 'fs'

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    value = value.replace(/\\n/g, '\n')
    process.env[key] = value
  }
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

async function main() {
  const docA = await db.collection('templates').doc('6bsbNIRdGubLlPUmNdKp').get()
  const docB = await db.collection('templates').doc('default-offer-letter').get()
  const a = docA.data()!
  const b = docB.data()!

  console.log('\n=== Document A: [6bsbNIRdGubLlPUmNdKp] (auto-ID from migrate script) ===')
  console.log('  name:             ', a.name)
  console.log('  type:             ', a.type)
  console.log('  isDefault:        ', a.isDefault)
  console.log('  isActive:         ', a.isActive)
  console.log('  createdBy:        ', a.createdBy)
  console.log('  updatedBy:        ', a.updatedBy)
  console.log('  createdAt:        ', a.createdAt)
  console.log('  updatedAt:        ', a.updatedAt)
  console.log('  variables.count:  ', a.variables?.length ?? 0)
  console.log('  applicableStatus: ', a.applicableStatus?.join(', '))
  console.log('  description len:  ', a.description?.length ?? 0)
  console.log('  markdownContent.len:', (a.markdownContent as string)?.length ?? 0)

  console.log('\n=== Document B: [default-offer-letter] (deterministic ID from seed script) ===')
  console.log('  name:             ', b.name)
  console.log('  type:             ', b.type)
  console.log('  isDefault:        ', b.isDefault)
  console.log('  isActive:         ', b.isActive)
  console.log('  createdBy:        ', b.createdBy)
  console.log('  updatedBy:        ', b.updatedBy)
  console.log('  createdAt:        ', b.createdAt)
  console.log('  updatedAt:        ', b.updatedAt)
  console.log('  variables.count:  ', b.variables?.length ?? 0)
  console.log('  applicableStatus: ', b.applicableStatus?.join(', '))
  console.log('  description len:  ', b.description?.length ?? 0)
  console.log('  markdownContent.len:', (b.markdownContent as string)?.length ?? 0)

  // Check generated documents referencing either ID
  console.log('\n=== Downstream: generated documents referencing each template ID ===')
  const docsSnap = await db.collectionGroup('documents').get()

  const refA = docsSnap.docs.filter(d => d.data().templateId === '6bsbNIRdGubLlPUmNdKp')
  const refB = docsSnap.docs.filter(d => d.data().templateId === 'default-offer-letter')

  console.log(`\n  References to 6bsbNIRdGubLlPUmNdKp (Doc A): ${refA.length}`)
  refA.forEach(d => console.log(`    - [${d.id}] "${d.data().title}" (empId: ${d.ref.path.split('/')[1]})`))

  console.log(`\n  References to default-offer-letter (Doc B):   ${refB.length}`)
  refB.forEach(d => console.log(`    - [${d.id}] "${d.data().title}" (empId: ${d.ref.path.split('/')[1]})`))
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
