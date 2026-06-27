// scripts/seed-certificate-template.ts
// One-time script: seed the default "Internship Certificate" template in Firestore.
//
// Usage:
//   npx tsx scripts/seed-certificate-template.ts
//
// After running:
//   1. Go to Templates → find "Internship Certificate" → click Edit
//   2. Upload the background PNG (2000×1414 px)
//   3. Save — the backgroundImageUrl will be stored

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

// ── Certificate layout config (tuned for 2000×1414 px background) ─────────

const TEMPLATE_ID = 'default-internship-certificate'  // deterministic ID

const BODY_TEMPLATE =
  'This is to certify that {{full_name}} {{relation_type}} {{parent_name}} of ' +
  '{{degree}} from {{institute_name}} has undergone training with our company ' +
  '{{company_name}} from {{joining_date}} to {{end_date}} under {{department}}. ' +
  'During the above-mentioned period {{pronoun}} demonstrated good professional ' +
  'conduct and behaviour, we wish {{pronoun_object}} all the best for future.'

const certificateTemplate = {
  name: 'Internship Certificate',
  type: 'certificate',
  description: 'Certificate of Internship — image overlay on branded background PNG.',
  markdownContent: '',
  variables: [
    'full_name', 'designation', 'relation_type', 'parent_name', 'degree',
    'institute_name', 'company_name', 'joining_date', 'end_date', 'department',
    'pronoun', 'pronoun_object', 'current_date',
  ],
  applicableStatus: ['intern', 'full-time', 'contract'],
  isActive: true,
  isDefault: true,

  // Background image — set via the template form after uploading
  backgroundImageUrl: '',
  imageWidth: 2000,
  imageHeight: 1414,

  // Text fields drawn at fixed pixel coordinates
  // Coordinates tuned for the 2000×1414 px AirBuddy Internship Certificate design
  textFields: [
    {
      key: 'full_name',
      x: 1000,
      y: 690,
      fontSize: 38,
      color: '#1a2456',
      fontWeight: 'bold',
      align: 'center',
    },
    {
      key: 'designation',
      x: 1000,
      y: 735,
      fontSize: 18,
      color: '#9a9fa8',
      fontWeight: 'normal',
      align: 'center',
    },
    {
      key: 'current_date',
      x: 718,
      y: 1235,
      fontSize: 20,
      color: '#1a2456',
      fontWeight: 'normal',
      align: 'center',
    },
  ],

  // Word-wrapped body paragraph
  bodyBox: {
    x: 1000,
    y: 850,
    maxCharsPerLine: 95,
    fontSize: 19,
    color: '#3a3f4a',
    lineHeight: 38,
  },

  bodyTemplate: BODY_TEMPLATE,

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'seed-script',
  updatedBy: 'seed-script',
}

async function main() {
  console.log('[Seed] Checking for existing certificate template...')

  const existing = await db.collection('templates').doc(TEMPLATE_ID).get()
  if (existing.exists) {
    console.log('[Seed] Template already exists. Updating non-layout fields...')
    // Preserve backgroundImageUrl if already set
    const existingData = existing.data() ?? {}
    await db.collection('templates').doc(TEMPLATE_ID).set(
      {
        ...certificateTemplate,
        // Don't overwrite backgroundImageUrl if it was already configured
        backgroundImageUrl: existingData.backgroundImageUrl || '',
      },
      { merge: false }
    )
    console.log('[Seed] ✅ Template updated:', TEMPLATE_ID)
  } else {
    await db.collection('templates').doc(TEMPLATE_ID).set(certificateTemplate)
    console.log('[Seed] ✅ Certificate template seeded with ID:', TEMPLATE_ID)
  }

  console.log('')
  console.log('[Seed] Next steps:')
  console.log('  1. Go to /templates in the app')
  console.log('  2. Find "Internship Certificate" and click Edit')
  console.log('  3. Upload the background PNG (2000×1414 px)')
  console.log('  4. Click Save Changes')
  console.log('')
  console.log('[Seed] Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[Seed] ERROR:', err)
  process.exit(1)
})
