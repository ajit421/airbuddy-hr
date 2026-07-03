// scripts/migrate-default-templates.ts
//
// One-time migration: writes the 6 default HR document templates to Firestore.
// Idempotent — any template whose name already exists with isDefault: true is skipped.
//
// Run:
//   npx tsx scripts/migrate-default-templates.ts
//
// Prerequisites: .env.local must be present with FIREBASE_ADMIN_* credentials.

import * as path from 'path'
import * as fs from 'fs'
import { NDA_AGREEMENT_TEMPLATE } from '../lib/templates/nda-template'

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
  // ── 1. Internship Letter ─────────────────────────────────────────────────
  {
    name: 'Internship Letter',
    type: 'internship_letter',
    description: 'Internship appointment letter for students and interns.',
    applicableStatus: ['intern'],
    isDefault: true,
    isActive: true,
    markdownContent: `# INTERNSHIP APPOINTMENT LETTER

**{{company_name}}**
{{company_address}}
Email: {{company_email}} | Phone: {{company_phone}}
CIN: {{company_cin}}

---

**Date:** {{current_date}}

**To,**
{{full_name}}

---

Dear **{{full_name}}**,

We are pleased to offer you an **Internship** position at **{{company_name}}**.

## Internship Details

| Field | Details |
|-------|---------|
| **Role / Project** | {{designation}} |
| **Department** | {{department}} |
| **Start Date** | {{joining_date}} |
| **Internship Stipend** | ₹{{salary}} per month |

## Scope of Work

During the internship, you will work on real-world aerospace and technology projects under the guidance of our engineering team. You are expected to:

- Complete assigned tasks and milestones on time
- Maintain confidentiality of all proprietary information
- Adhere to the company's code of conduct and policies

## Confidentiality

You agree not to disclose any confidential or proprietary information of {{company_name}} to any third party during or after the internship.

## Certificate

Upon successful completion of your internship, you will be issued an **Internship Completion Certificate**.

Wishing you a productive and enriching experience at {{company_name}}.

Regards,

**{{hr_name}}**
{{hr_designation}}
{{company_name}}
`,
  },

  // ── 3. NDA Agreement ─────────────────────────────────────────────────────
  {
    name: 'NDA Agreement',
    type: 'nda',
    description: 'Non-Disclosure Agreement for employees and contractors.',
    applicableStatus: ['full-time', 'contract', 'intern'],
    isDefault: true,
    isActive: true,
    markdownContent: NDA_AGREEMENT_TEMPLATE,
  },

  // ── 4. Salary Slip ────────────────────────────────────────────────────────
  {
    name: 'Salary Slip',
    type: 'salary_slip',
    description: 'Monthly salary slip for full-time and contract employees.',
    applicableStatus: ['full-time', 'contract'],
    isDefault: true,
    isActive: true,
    markdownContent: `# SALARY SLIP — {{current_month}}

**{{company_name}}**
{{company_address}}
CIN: {{company_cin}}

---

## Employee Details

| Field | Value |
|-------|-------|
| **Employee Name** | {{full_name}} |
| **Employee ID** | {{employee_id}} |
| **Department** | {{department}} |
| **Designation** | {{designation}} |
| **Date of Joining** | {{joining_date}} |
| **PAN Number** | {{pan_number}} |
| **Bank Account** | {{account_number}} |
| **IFSC Code** | {{ifsc_code}} |
| **Bank Name** | {{bank_name}} |

---

## Earnings

| Earnings Component | Amount (₹) |
|-------------------|------------|
| Basic Salary | ₹{{salary}} |
| HRA (40% of Basic) | — |
| Special Allowance | — |
| **Gross Earnings** | **₹{{salary}}** |

## Deductions

| Deduction Component | Amount (₹) |
|--------------------|------------|
| PF (12% of Basic) | — |
| Professional Tax | — |
| Income Tax (TDS) | — |
| **Total Deductions** | **₹0** |

---

## **Net Pay: ₹{{salary}}**

*This is a computer-generated salary slip and does not require a signature.*

---

Issued by:

**{{hr_name}}**
{{hr_designation}}
{{company_name}}
Date: {{current_date}}
`,
  },

  // ── 5. Experience Letter ──────────────────────────────────────────────────
  {
    name: 'Experience Letter',
    type: 'experience_letter',
    description: 'Experience/relieving letter for resigned or terminated employees.',
    applicableStatus: ['resigned', 'terminated', 'full-time', 'contract'],
    isDefault: true,
    isActive: true,
    markdownContent: `# EXPERIENCE LETTER

**{{company_name}}**
{{company_address}}
Email: {{company_email}} | Phone: {{company_phone}}
CIN: {{company_cin}}

---

**Date:** {{current_date}}

**To Whom It May Concern**

---

This is to certify that **{{full_name}}** (Employee ID: **{{employee_id}}**) was employed with **{{company_name}}** from **{{joining_date}}** until their last working day.

During their tenure, {{full_name}} held the position of **{{designation}}** in the **{{department}}** department.

{{full_name}} has been a dedicated professional and has contributed significantly to the projects and goals of the organization. They have demonstrated strong technical skills, a collaborative spirit, and a commitment to quality throughout their time with us.

We wish {{full_name}} all the best in their future endeavors.

This letter is issued upon request and without prejudice.

Yours sincerely,

**{{hr_name}}**
{{hr_designation}}
{{company_name}}

---

*Authorized Signatory*
`,
  },

  // ── 6. Appointment Letter ─────────────────────────────────────────────────
  {
    name: 'Appointment Letter',
    type: 'appointment_letter',
    description: 'Formal appointment letter for confirmed full-time employees.',
    applicableStatus: ['full-time'],
    isDefault: true,
    isActive: true,
    markdownContent: `# APPOINTMENT LETTER

**{{company_name}}**
{{company_address}}
Email: {{company_email}} | Phone: {{company_phone}}
CIN: {{company_cin}}

---

**Ref No.:** {{employee_id}}/APPT/{{current_year}}  
**Date:** {{current_date}}

**To,**
{{full_name}}
{{address}}

---

Dear **{{full_name}}**,

We are pleased to confirm your appointment as a regular employee of **{{company_name}}** with effect from **{{joining_date}}**.

## Appointment Details

| Field | Details |
|-------|---------|
| **Employee ID** | {{employee_id}} |
| **Designation** | {{designation}} |
| **Department** | {{department}} |
| **Date of Appointment** | {{joining_date}} |
| **Gross Monthly CTC** | ₹{{salary}} |

## Terms of Employment

1. **Probation Period:** You have successfully completed your probation period. This letter confirms your permanent employment with the Company.

2. **Working Hours:** You are required to work as per the Company's standard working hours, which are Monday to Friday, 9:00 AM to 6:00 PM.

3. **Leave Policy:** You will be entitled to **24 days** of paid leave per calendar year as per the Company's leave policy.

4. **Notice Period:** In the event of resignation, a notice period of **30 days** is required on either side.

5. **Confidentiality:** You are required to maintain the confidentiality of all proprietary and sensitive information of the Company, both during and after your employment.

6. **Code of Conduct:** You are expected to abide by the Company's code of conduct, policies, and procedures at all times.

## Bank Details on Record

| Field | Details |
|-------|---------|
| **Bank Name** | {{bank_name}} |
| **Account Number** | {{account_number}} |
| **IFSC Code** | {{ifsc_code}} |

## Documents Submitted

- Aadhaar Card (Number: {{aadhaar_number}})
- PAN Card (Number: {{pan_number}})

Please sign and return one copy of this letter as your acceptance of the terms of appointment.

We look forward to your continued contribution to **{{company_name}}**.

Warm regards,

**{{hr_name}}**
{{hr_designation}}
{{company_name}}

---

*I, {{full_name}}, hereby accept this appointment on the terms and conditions set forth above.*

**Employee Signature:** ________________________  
**Date:** ________________________
`,
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
