// scripts/cleanup-removed-templates.ts
//
// One-time cleanup: lists (and optionally deletes) Firestore documents that
// belong to the 4 removed HR document template types:
//   * internship_letter
//   * salary_slip
//   * experience_letter
//   * appointment_letter
//
// Run (DRY-RUN first -- lists what would be deleted, no changes):
//   npx tsx scripts/cleanup-removed-templates.ts
//
// Run (CONFIRMED DELETE -- actually deletes after listing):
//   npx tsx scripts/cleanup-removed-templates.ts --confirm
//
// Prerequisites: .env.local must be present with FIREBASE_ADMIN_* credentials.

import * as path from 'path'
import * as fs from 'fs'

// -- Load .env.local before importing Firebase Admin --------------------------
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
  console.log('OK  Loaded .env.local')
} else {
  console.error('ERR .env.local not found -- cannot initialise Firebase Admin.')
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

// -- Types to remove ----------------------------------------------------------
const REMOVED_TYPES = new Set([
  'internship_letter',
  'salary_slip',
  'experience_letter',
  'appointment_letter',
])

const CONFIRM = process.argv.includes('--confirm')

function hr() {
  console.log('------------------------------------------------------------')
}

async function main() {
  console.log('\n=== Cleanup: Removed HR Template Types ===')
  console.log('Types: ' + [...REMOVED_TYPES].join(', '))
  console.log('Mode : ' + (CONFIRM ? 'CONFIRMED DELETE' : 'DRY RUN (pass --confirm to delete)'))
  hr()

  // PART 1: templates collection
  console.log('\nPART 1 -- templates collection')

  const templateDocsToDelete: Array<{ id: string; name: string; type: string }> = []

  for (const type of REMOVED_TYPES) {
    const snap = await db.collection('templates').where('type', '==', type).get()
    for (const doc of snap.docs) {
      const data = doc.data()
      templateDocsToDelete.push({ id: doc.id, name: data.name ?? '(unnamed)', type })
    }
  }

  if (templateDocsToDelete.length === 0) {
    console.log('  OK  No template documents found for removed types.')
  } else {
    console.log('\n  Found ' + templateDocsToDelete.length + ' template document(s) to delete:\n')
    for (const t of templateDocsToDelete) {
      console.log('  * [' + t.id + '] "' + t.name + '" (type: ' + t.type + ')')
    }

    if (CONFIRM) {
      console.log('\n  Deleting template documents...')
      for (const t of templateDocsToDelete) {
        await db.collection('templates').doc(t.id).delete()
        console.log('  OK  Deleted template: "' + t.name + '" [' + t.id + ']')
      }
    } else {
      console.log('\n  DRY RUN -- run with --confirm to delete these.')
    }
  }

  // PART 2: employees/{empId}/documents subcollection (generated docs)
  hr()
  console.log('\nPART 2 -- employees/{empId}/documents subcollection (generated docs)')

  const generatedDocsToDelete: Array<{
    employeeId: string
    docId: string
    title: string
    documentType: string
    createdAt: string
  }> = []

  const collectionGroupSnap = await db.collectionGroup('documents').get()

  for (const doc of collectionGroupSnap.docs) {
    const data = doc.data()
    if (REMOVED_TYPES.has(data.documentType)) {
      const pathSegments = doc.ref.path.split('/')
      const employeeId = pathSegments[1] ?? 'unknown'
      generatedDocsToDelete.push({
        employeeId,
        docId: doc.id,
        title: data.title ?? '(untitled)',
        documentType: data.documentType,
        createdAt: data.createdAt ?? '(unknown)',
      })
    }
  }

  if (generatedDocsToDelete.length === 0) {
    console.log('  OK  No generated documents found for removed template types.')
  } else {
    console.log('\n  Found ' + generatedDocsToDelete.length + ' generated document(s) to delete:\n')
    for (const d of generatedDocsToDelete) {
      console.log('  * [emp:' + d.employeeId + '] [doc:' + d.docId + '] "' + d.title + '" (type: ' + d.documentType + ', created: ' + d.createdAt + ')')
    }

    if (CONFIRM) {
      console.log('\n  Deleting generated document records (and their versions subcollections)...')
      for (const d of generatedDocsToDelete) {
        const docRef = db
          .collection('employees')
          .doc(d.employeeId)
          .collection('documents')
          .doc(d.docId)

        const versionsSnap = await docRef.collection('versions').get()
        for (const vDoc of versionsSnap.docs) {
          await vDoc.ref.delete()
        }
        console.log('  OK  Deleted ' + versionsSnap.size + ' version(s) for doc [' + d.docId + ']')

        await docRef.delete()
        console.log('  OK  Deleted generated doc: "' + d.title + '" [' + d.docId + ']')
      }
    } else {
      console.log('\n  WARNING: These are user-generated records.')
      console.log('  DRY RUN -- Run with --confirm to permanently delete them (including all versions).')
    }
  }

  hr()
  console.log('\nSummary:')
  console.log('  Template config docs : ' + templateDocsToDelete.length)
  console.log('  Generated doc records: ' + generatedDocsToDelete.length)
  console.log('  Status: ' + (CONFIRM ? 'Deletion complete' : 'Dry run -- re-run with --confirm to delete'))
  console.log()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nERR Cleanup failed:', err)
    process.exit(1)
  })
