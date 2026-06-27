// lib/templates/seed-defaults.ts
// Seeds 6 default HR document templates into Firestore if the collection is empty.
// Called from the settings API on first load.

import { adminDb } from '@/lib/firebase/admin'
import type { DocumentType } from '@/types/template'
import type { EmployeeStatus } from '@/types/employee'
import { extractVariables } from './extract-variables'

// ── Template definitions ──────────────────────────────────────────────────

interface DefaultTemplate {
  name: string
  type: DocumentType
  description: string
  markdownContent: string
  applicableStatus: EmployeeStatus[]
  isDefault: true
  isActive: true
}

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // ── 1. Offer Letter ─────────────────────────────────────────────────────
  {
    name: 'Offer Letter',
    type: 'offer_letter',
    description: 'Standard employment offer letter for new hires.',
    applicableStatus: ['intern', 'full-time', 'contract'],
    isDefault: true,
    isActive: true,
    markdownContent: `# OFFER LETTER

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

We are delighted to extend this offer of employment to you at **{{company_name}}**, and we look forward to welcoming you to our team.

## Position Details

| Field | Details |
|-------|---------|
| **Designation** | {{designation}} |
| **Department** | {{department}} |
| **Date of Joining** | {{joining_date}} |
| **Employment Type** | {{employee_status}} |
| **Gross Monthly Salary** | ₹{{salary}} |

## Terms & Conditions

1. This offer is contingent upon successful completion of background verification.
2. You will be on a **90-day probation period** from the date of joining.
3. The notice period during probation is **15 days** and **30 days** post-confirmation.
4. Kindly report to the HR department on your joining date with the following originals:
   - Aadhaar Card
   - PAN Card
   - Educational certificates
   - Last employment relieving letter (if applicable)
   - 2 passport-size photographs

## Acceptance

Please confirm your acceptance of this offer by signing below and returning a copy to us by **{{current_date}}**.

We look forward to your positive response and to having you as part of the AirBuddy family.

Warm regards,

**{{hr_name}}**
{{hr_designation}}
{{company_name}}

---

*I, {{full_name}}, hereby accept this offer of employment on the terms and conditions set forth above.*

**Employee Signature:** ________________________  
**Date:** ________________________
`,
  },

  // ── 2. Internship Letter ─────────────────────────────────────────────────
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
    markdownContent: `# NON-DISCLOSURE AGREEMENT (NDA)

This Non-Disclosure Agreement ("Agreement") is entered into as of **{{current_date}}**, between:

**{{company_name}}**, a company incorporated under the Companies Act, 2013, with CIN **{{company_cin}}**, having its registered office at {{company_address}} (hereinafter referred to as the "**Company**"),

AND

**{{full_name}}**, residing at {{address}}, Aadhaar No. {{aadhaar_number}}, PAN: {{pan_number}} (hereinafter referred to as the "**Receiving Party**").

---

## 1. Definition of Confidential Information

"Confidential Information" means any data, information, or material provided or made available by the Company to the Receiving Party in any form, including but not limited to:

- Technical data, trade secrets, and know-how
- Research and development data
- Business plans, financial data, and marketing strategies
- Engineering drawings, specifications, and software
- Customer and supplier lists

## 2. Obligations of the Receiving Party

The Receiving Party agrees to:

1. Hold all Confidential Information in strict confidence
2. Not disclose Confidential Information to any third party without prior written consent of the Company
3. Use Confidential Information solely for the purpose of fulfilling their obligations to the Company
4. Promptly notify the Company of any actual or suspected breach of this Agreement

## 3. Term

This Agreement shall remain in effect for a period of **3 (three) years** from the date of execution, and shall survive termination of employment.

## 4. Return of Information

Upon termination of employment or upon request by the Company, the Receiving Party shall immediately return or destroy all Confidential Information.

## 5. Governing Law

This Agreement shall be governed by the laws of India. Any dispute arising out of this Agreement shall be subject to the exclusive jurisdiction of courts in the city where the Company's registered office is located.

---

**IN WITNESS WHEREOF**, the parties have executed this Agreement as of the date first written above.

| | |
|---|---|
| **For {{company_name}}** | **Receiving Party** |
| | |
| **{{hr_name}}** | **{{full_name}}** |
| {{hr_designation}} | Employee ID: {{employee_id}} |
| Date: {{current_date}} | Date: |
`,
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

// ── Seeder function ───────────────────────────────────────────────────────

/**
 * Seed 6 default templates into Firestore if the templates collection is empty.
 * This is idempotent — it checks first before writing.
 */
export async function seedDefaultTemplates(): Promise<{ seeded: boolean; count: number }> {
  try {
    const existing = await adminDb.collection('templates').limit(1).get()
    if (!existing.empty) {
      return { seeded: false, count: 0 }
    }

    const batch = adminDb.batch()
    const now = new Date().toISOString()

    for (const tmpl of DEFAULT_TEMPLATES) {
      const ref = adminDb.collection('templates').doc()
      batch.set(ref, {
        ...tmpl,
        variables: extractVariables(tmpl.markdownContent),
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
      })
    }

    await batch.commit()
    return { seeded: true, count: DEFAULT_TEMPLATES.length }
  } catch (err) {
    console.error('[SeedTemplates] Failed to seed default templates:', err)
    return { seeded: false, count: 0 }
  }
}
