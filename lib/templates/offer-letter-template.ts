// lib/templates/offer-letter-template.ts
// Canonical Employment Offer Letter template for AirBuddy Aerospace Pvt. Ltd.
//
// Variables used:
//   Auto-resolved from Employee record:
//     {{full_name}}              — employee: fullName
//     {{designation}}            — employee: designation
//     {{department}}             — employee: department
//     {{joining_date}}           — employee: joiningDate
//     {{salary}}                 — employee: salary (monthly gross)
//
//   Auto-resolved from CompanySettings:
//     {{company_name}}           — settings: companyName
//     {{company_address}}        — settings: companyAddress
//     {{company_email}}          — settings: companyEmail
//     {{company_phone}}          — settings: companyPhone
//     {{company_cin}}            — settings: companyCIN
//
//   Auto-computed at render time:
//     {{current_date}}           — today's date (dd MMMM yyyy)
//
//   MANUAL — entered by HR at generation time (Step 2 of wizard):
//     {{employee_address_full}}  — candidate's full postal address
//     {{commencement_date}}      — employment start date (e.g. "1st August 2026")
//     {{reporting_manager}}      — e.g. "Mr. Bibhuti Rajput"
//     {{employment_type}}        — e.g. "Full-Time, On-Roll / Permanent"
//     {{work_mode}}              — e.g. "Work From Office (WFO)"
//     {{work_location}}          — e.g. "Greater Noida, Uttar Pradesh"
//     {{place_of_posting}}       — e.g. "B-43, Phi 3, Greater Noida, UP – 201310"
//     {{probation_period}}       — e.g. "6 months" (default)
//     {{confirmation_duration}}  — e.g. "3 years"
//     {{work_days}}              — e.g. "Monday – Saturday"
//     {{work_timings}}           — e.g. "9:00 AM – 6:00 PM"
//     {{weekly_off}}             — e.g. "Sunday"
//     {{basic_salary}}           — e.g. "18,000"  (monthly)
//     {{hra}}                    — e.g. "2,000"   (monthly)
//     {{special_allowance}}      — e.g. "3,000"   (monthly)
//     {{conveyance}}             — e.g. "1,200"   (monthly)
//     {{medical_allowance}}      — e.g. "800"     (monthly)
//
//   AUTO-COMPUTED by generate API (from monthly values above):
//     {{total_ctc}}              — sum of all monthly components
//     {{annual_ctc}}             — total_ctc × 12
//     {{basic_salary_annual}}    — basic_salary × 12
//     {{hra_annual}}             — hra × 12
//     {{special_allowance_annual}} — special_allowance × 12
//     {{conveyance_annual}}      — conveyance × 12
//     {{medical_allowance_annual}} — medical_allowance × 12
//
//   MORE MANUAL fields:
//     {{notice_during_probation}}   — e.g. "30 days"
//     {{notice_post_confirmation}}  — e.g. "60 days"
//     {{ceo_name}}               — e.g. "Alisha Raj"
//     {{ceo_designation}}        — e.g. "Chief Executive Officer (CEO)"
//     {{ceo_email}}              — e.g. "alisha@airbuddy.in"
//     {{jd_responsibilities}}    — newline-separated bullet lines ("- Responsibility text")
//
// Renderer notes:
//   • ">> text" prefix = right-aligned line (date goes to right margin)
//   • "&thinsp;" = 2pt vertical gap (used for compact address block)
//   • "&nbsp;"   = 5pt vertical gap (used between major sections)
//   • Rs. is used instead of ₹ because Helvetica cannot render U+20B9

export const OFFER_LETTER_TEMPLATE = `# EMPLOYMENT OFFER LETTER


>> **Date:** {{current_date}}

**To,**
**{{full_name}}**

{{employee_address_full}}

**Subject: Offer of Employment - {{company_name}}**


Dear **{{full_name}}**,

We are pleased to offer you the position of **{{designation}}** with **{{company_name}}**, effective from **{{commencement_date}}**. This letter sets out the terms and conditions of your employment.

## 1. Position & Reporting
| **Parameter** | **Details** |
|---|---|
| Designation | {{designation}} |
| Department | {{department}} |
| Reporting Manager | Bibhuti Rajput / CTO |
| Employment Type | {{employment_type}} |
| Work Location / Mode | {{work_mode}} |
| Place of Posting | {{place_of_posting}} |
| Monthly Gross Salary (CTC) | Rs. {{total_ctc}} |
| Probation Period | {{probation_period}} |

Your place of posting may be changed by the Company at its sole discretion with reasonable notice, as per business and operational requirements.

## 2. Job Description
Your primary responsibilities as **{{designation}}** will include, but are not limited to:

{{jd_responsibilities}}

The above responsibilities may be modified as per business needs and at the Company's discretion.

## 3. Working Hours & Work Schedule
| **Parameter** | **Details** |
|---|---|
| Working Days | Monday — Saturday |
| Work Timings | 10:00 AM - 7:00 PM |
| Weekly Off | Sunday |

The Company follows a 6-day workweek. You may be required to work extended hours, including weekends or public holidays, as necessitated by project deadlines and business requirements, without additional compensation.

Note \u2014 Employees engaged in a Work-From-Home (WFH) arrangement are required to visit the office at least once a week or as required by their reporting manager.

## 4. Compensation Structure
Your monthly and annual compensation package is structured as follows:

| **Component** | **Monthly (Rs.)** | **Annual (Rs.)** |
|---|---|---|
| Basic Salary | {{basic_salary}} | {{basic_salary_annual}} |
| House Rent Allowance (HRA) | {{hra}} | {{hra_annual}} |
| Special Allowance | {{special_allowance}} | {{special_allowance_annual}} |
| Conveyance Allowance | {{conveyance}} | {{conveyance_annual}} |
| Medical Allowance | {{medical_allowance}} | {{medical_allowance_annual}} |
| **Total CTC** | **{{total_ctc}}** | **{{annual_ctc}}** |

Statutory deductions (PF, ESI, Professional Tax, TDS) shall be applicable as per the prevailing laws of India and will be deducted from the gross salary. Compensation is reviewed annually based on performance and Company policy; revision is not guaranteed.

## 5. Leave & Holidays
| **Leave Type** | **Entitlement** |
|---|---|
| Sick Leave | 1 day per month (12 days/year) |
| Casual Leave | 1 day per month (12 days/year) |
| Public Holidays | As per the Company's holiday calendar |

Leave must be applied for and sanctioned in advance by your reporting manager. Unapproved or uninformed absence will be treated as loss of pay.

## 6. Employment Term
Your employment shall be on a continuous basis, subject to satisfactory performance during the probation period of {{probation_period}}. Unless specified otherwise, this is not a fixed-term contract and may be terminated by either party as described in Clause 9.

## 7. Probation & Confirmation
Your appointment is on probation for a period of **{{probation_period}}** from the date of joining. Upon satisfactory completion of the probation period, you will be confirmed as a regular employee of **{{company_name}}** for the next **3 years**. During the probation period, the Company reserves the right to terminate your employment by giving notice as specified in Clause 9.

## 8. Confidentiality, Data Privacy & Intellectual Property
During the course of your employment and thereafter, you agree to:

1. Hold all Confidential Information (business data, technical data, customer data, IP, source code, and any non-public information) in strict confidence and not disclose it to any third party without prior written consent of the Company.
2. Use Confidential Information solely for the purpose of performing your duties and not for personal benefit or the benefit of any competing organization.
3. Promptly report to management any actual or suspected breach of confidentiality, unauthorized access, or misuse of Company data or systems.
4. Assign to the Company all inventions, innovations, works of authorship, code, and improvements conceived or reduced to practice during your employment and directly related to the Company's business, whether or not created during office hours.
5. Comply with all applicable data privacy laws (including the Digital Personal Data Protection Act, 2023) and the Company's data security policies at all times.

These obligations survive the termination or expiry of your employment.

## 9. Notice Period & Separation Terms
| **Stage** | **Notice Period** |
|---|---|
| During Probation | 30 days |
| Post-Confirmation | 45 days |

Either party may terminate this employment by giving the applicable notice in writing. The Company reserves the right to pay salary in lieu of notice. In the event of gross misconduct, fraud, breach of confidentiality, or willful neglect of duties, the Company may terminate employment without notice and without payment in lieu of notice.

## 10. Minimum Commitment / Early Exit Clause
In consideration of the training, onboarding investment, and resources extended to you, you commit to a minimum period of **six (6) months** of employment from the date of joining. If you resign or are dismissed for cause within this period, you agree to reimburse the Company for documented training and onboarding costs, up to one month's gross salary, unless waived in writing by the Company.

## 11. Statutory Benefits
You shall be eligible for statutory benefits including Provident Fund (PF), Employee State Insurance (ESI \u2014 where applicable), and Gratuity (as per the Payment of Gratuity Act, 1972 after 5 years of continuous service), in accordance with applicable Indian labour laws.

## 12. Conflict of Interest & Ethical Conduct
You agree not to engage, directly or indirectly, in any activity (employment, consulting, advisory, investment or otherwise) that conflicts with the interests of **{{company_name}}** during your period of employment without prior written approval from the management. You are expected to uphold the highest standards of ethical conduct, professional integrity, and compliance with all Company policies at all times.

## 13. Background & Document Verification
This offer is contingent upon successful completion of the following:
1. Verification of all submitted educational certificates, degrees, and transcripts.
2. Verification of employment history and references from previous employers.
3. Verification of government-issued identity documents (Aadhaar, PAN).

Any misrepresentation or concealment of material facts will render this offer void and may result in immediate termination.

## 14. Documents Required at Joining
Please bring the following original documents and self-attested copies on your date of joining:

- Government-issued Photo ID (Aadhaar Card / Passport / Voter ID)
- PAN Card
- Bank Account details (cancelled cheque or passbook copy)
- Educational Certificates (10th, 12th, Graduation, Post-Graduation \u2014 where applicable)
- Previous Employment Documents (Appointment Letter, Payslips, Experience/Relieving Letter)
- Recent passport-size photographs (2 copies)

## 15. Company Policies
You will be required to read, acknowledge, and comply with all Company policies as communicated from time to time, including but not limited to the Employee Handbook, IT & Data Security Policy, Code of Conduct, POSH Policy, and Leave Policy. These policies may be updated at the Company's discretion.

## 16. Acceptance of Offer
Please indicate your acceptance of this offer by signing and returning a copy of this letter within **7 (seven) calendar days** of receipt. Failure to respond within this period may be treated as non-acceptance and the offer will stand withdrawn.


**DISCLOSING PARTY**

**{{company_name}}**

Name: **Alisha Raj**
Designation: Chief Executive Officer (CEO)

Signature: ___________________________

Date: ___________________________

&nbsp;

**RECEIVING PARTY**

Name: **{{full_name}}**

Signature: ___________________________

Date: ___________________________
`
