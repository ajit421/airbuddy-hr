// scripts/seed-internship-offer-letter-template.ts
// One-time script: seed the default "Internship Offer Letter" template in Firestore.
//
// Usage:
//   npx tsx scripts/seed-internship-offer-letter-template.ts
//
// After running:
//   1. Go to Templates → find "Internship Offer Letter" → click Edit
//   2. Upload the background PNG (A4 portrait letterhead)
//   3. Save — the backgroundImageUrl will be stored
//
// NOTE: imageWidth / imageHeight are placeholders (1414 × 2000 px for A4 portrait).
// Update these two values to match the actual exported PNG dimensions once you
// have the real file, because renderCertificatePdf's scaling math depends on
// imageWidth / imageHeight matching the file exactly.

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

// ── Offer letter layout config ────────────────────────────────────────────
//
// imageWidth / imageHeight: placeholder for A4 portrait at ~170 DPI.
// Replace with the real PNG pixel dimensions before running in production.

const TEMPLATE_ID = 'default-internship-offer-letter'  // deterministic ID

const BODY_TEMPLATE =
  '**Date:** {{letter_date}}\n' +
  'Dear {{full_name}},\n\n\n\n' +
  'We are pleased to offer you the position of **{{designation}}** at **{{company_name}}**. ' +
  'You are currently pursuing **{{degree}}** at the **{{institute_name}}**. ' +
  'Based on your academic background, skills and profile, we are pleased to offer you a ' +
  '**{{internship_duration}} internship**.\n\n' +
  'If you accept this offer, your start date will be the **{{start_date_text}}** or another ' +
  'mutually agreed-upon date, and you will report to the **Chief Executive Officer (CEO),** ' +
  'Mr. Bibhuti Rajput.\n\n\n' +
  'This is a **{{work_type}}, {{work_mode}} internship**. During the internship, you will ' +
  'contribute to projects related to **{{project_areas}}**.\n\n' +
  'Kindly confirm your acceptance of this offer by **{{confirm_by_date}}**. If you have any ' +
  'questions, please feel free to contact **Mr. Bibhuti Rajput** via email at ' +
  'bibhuti@airbuddy.in or by phone at +91 7079142368.\n\n' +
  'We are all looking forward to having you on our team.\n\n\n' +
  '**Regards.**\n' +
  'Alisha Raj\n' +
  'Chief Executive Officer (CEO)\n' +
  'AirBuddy Aerospace Pvt. Ltd.\n' +
  'Email: alisha@airbuddy.in'

const offerLetterTemplate = {
  name: 'Internship Offer Letter',
  type: 'certificate',
  description: 'Internship Offer Letter — image overlay on branded background PNG.',
  markdownContent: BODY_TEMPLATE,
  variables: [
    // Auto-resolved from Employee / CompanySettings via VARIABLE_REGISTRY:
    'full_name', 'designation', 'company_name',
    // Custom variables — typed by HR at document-generation time:
    'letter_date', 'degree', 'institute_name',
    'internship_duration', 'start_date_text',
    'work_type', 'work_mode', 'project_areas',
    'confirm_by_date',
  ],
  applicableStatus: ['intern'],
  isActive: true,
  isDefault: true,

  // Background image — set via the template form after uploading
  backgroundImageUrl: '',
  // Placeholder for A4 portrait letterhead PNG.
  // ⚠️  Update to the real exported PNG pixel dimensions once the file is ready.
  imageWidth: 1414,   // ← update once you have the real background PNG pixel dimensions
  imageHeight: 2000,  // ← update once you have the real background PNG pixel dimensions

  // No discrete text fields — everything is body text, including the
  // "Date:" header and "Dear {{full_name}}," salutation.
  textFields: [],

  // Word-wrapped body paragraph.
  // Starting-point coordinates for a 1414 × 2000 px A4 portrait canvas.
  // Expect to tune x, y, fontSize, lineHeight, maxCharsPerLine after the
  // first real render — send a screenshot and we'll adjust.
  bodyBox: {
    x: 707,               // true horizontal center of 1414px-wide page
    y: 620,               // first line baseline — "Date:" line
    maxCharsPerLine: 90,  // controls box width: xLeft = x - (avgCharWidth*60)/2 ≈ 257px from left edge
    fontSize: 24,
    color: '#1a1a1a',
    lineHeight: 38,
  },

  bodyTemplate: BODY_TEMPLATE,

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'seed-script',
  updatedBy: 'seed-script',
}

async function main() {
  console.log('[Seed] Checking for existing offer letter template...')

  const existing = await db.collection('templates').doc(TEMPLATE_ID).get()
  if (existing.exists) {
    console.log('[Seed] Template already exists. Updating non-layout fields...')
    // Preserve backgroundImageUrl if already set
    const existingData = existing.data() ?? {}
    await db.collection('templates').doc(TEMPLATE_ID).set(
      {
        ...offerLetterTemplate,
        // Don't overwrite backgroundImageUrl if it was already configured
        backgroundImageUrl: existingData.backgroundImageUrl || '',
      },
      { merge: false }
    )
    console.log('[Seed] ✅ Template updated:', TEMPLATE_ID)
  } else {
    await db.collection('templates').doc(TEMPLATE_ID).set(offerLetterTemplate)
    console.log('[Seed] ✅ Offer letter template seeded with ID:', TEMPLATE_ID)
  }

  console.log('')
  console.log('[Seed] Next steps:')
  console.log('  1. Go to /templates in the app')
  console.log('  2. Find "Internship Offer Letter" and click Edit')
  console.log('  3. Upload the background PNG (A4 portrait letterhead)')
  console.log('  4. Update imageWidth / imageHeight in this script to match the real PNG pixel dimensions')
  console.log('  5. Re-run this script to persist the correct dimensions')
  console.log('  6. Click Save Changes in the UI')
  console.log('')
  console.log('[Seed] Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[Seed] ERROR:', err)
  process.exit(1)
})
