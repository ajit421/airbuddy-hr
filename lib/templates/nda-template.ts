// lib/templates/nda-template.ts
// Canonical NDA template for AirBuddy Aerospace Pvt. Ltd.
// Matches the exact clause structure and wording of the signed reference NDAs.
// Used by migrate-default-templates.ts and any future migration scripts.
//
// Variables used:
//   {{current_date}}                 — computed: today's date
//   {{company_name}}                 — settings: companyName
//   {{company_registered_address}}   — settings: companyRegisteredAddress  (e.g. "Motihari, Bihar")
//   {{company_cin}}                  — settings: companyCIN
//   {{company_pan}}                  — settings: companyPAN
//   {{full_name}}                    — employee: fullName
//   {{father_name}}                  — employee: fatherName
//   {{address}}                      — employee: address.street
//   {{aadhaar_number}}               — employee: aadhaarNumber
//   {{pan_number}}                   — employee: panNumber
//   {{project_description}}          — ad-hoc: entered by HR at generation time (textarea)
//   {{hr_name}}                      — settings: hrName
//   {{hr_designation}}               — settings: hrDesignation

export const NDA_AGREEMENT_TEMPLATE = `# NON-DISCLOSURE AGREEMENT

THIS NON-DISCLOSURE AGREEMENT ("AGREEMENT") IS MADE AND ENTERED INTO AS OF {{current_date}}

BY AND BETWEEN

{{company_name}}, a company incorporated under the Companies Act, 2013 with its registered office at {{company_registered_address}}, having Company Identification Number (CIN) {{company_cin}} and PAN {{company_pan}} (hereinafter referred to as "Disclosing Party"),

AND

{{full_name}}, Son of Mr {{father_name}}, residing at {{address}}, having Aadhaar Number {{aadhaar_number}} and PAN Number {{pan_number}} (hereinafter referred to as "Receiving Party").

WHEREAS, the Disclosing Party intends to disclose certain confidential and proprietary information to the Receiving Party in connection with {{project_description}} (hereinafter referred to as the "Project"); and

WHEREAS, the Receiving Party desires to receive such confidential and proprietary information solely for the purpose of evaluating and/or participating in the Project;

NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:

## 1. Confidential Information

**(a)** "Confidential Information" means any and all information or data that has or could have commercial value or other utility in the business in which the Disclosing Party is engaged. If Confidential Information is in written form, the Disclosing Party shall label or stamp the materials with the word "Confidential" or some similar warning. If Confidential Information is transmitted orally, the Disclosing Party shall promptly provide writing indicating that such oral communication constituted Confidential Information. Confidential Information includes, but is not limited to:

- Technical data, specifications, designs, schematics, and drawings relating to the Project and the Disclosing Party's technology;
- Performance data, test results, and analysis reports;
- Know-how, trade secrets, inventions, and proprietary processes developed or used by the Disclosing Party;
- Any other information that the Disclosing Party designates as confidential or that, given the nature of the information and the circumstances of disclosure, should reasonably be understood to be confidential.

**(b)** The Project itself, and the fact that the Receiving Party is working on or evaluating the Project, shall be maintained anonymous and shall not be disclosed to any third party without the prior written consent of the Disclosing Party.

## 2. Non-Disclosure

The Receiving Party agrees that at all times and notwithstanding any termination or expiration of this Agreement it will hold in strict confidence and not disclose to any third party the Confidential Information, except as approved in writing by the Disclosing Party, and will use the Confidential Information for no purpose other than evaluating and/or participating in the Project as authorised by the Disclosing Party. The Receiving Party shall access the Confidential Information only on a need-to-know basis and shall not copy, reproduce, sell, assign, license, market, transfer or otherwise dispose of, give or disclose such Confidential Information to third parties or use such Confidential Information for any purposes whatsoever other than as provided for in this Agreement.

## 3. Exceptions to Non-Disclosure

The obligations of the Receiving Party under Clause 2 above shall not apply to information that:

1. Is or becomes publicly known through no breach of this Agreement by the Receiving Party;
2. Was rightfully in the possession of the Receiving Party prior to disclosure under this Agreement as evidenced by written records;
3. Is independently developed by the Receiving Party without use of or reference to the Disclosing Party's Confidential Information;
4. Is required to be disclosed by the Receiving Party by applicable law, regulation, or valid court order, provided that the Receiving Party shall give the Disclosing Party prompt prior written notice of such requirement and shall cooperate with the Disclosing Party in seeking a protective order or other appropriate relief.

## 4. Ownership of Confidential Information

The Receiving Party agrees and acknowledges that the Disclosing Party (or its licensors) shall retain all intellectual property rights in and to all Confidential Information disclosed pursuant to this Agreement. Nothing in this Agreement shall be construed as granting any rights to the Receiving Party, by license or otherwise, to any of the Disclosing Party's Confidential Information, except as specified herein. The Receiving Party further agrees that all inventions, improvements, modifications, and other works conceived, created, or reduced to practice by the Receiving Party using or derived from the Confidential Information shall be and remain the exclusive property of the Disclosing Party.

## 5. Term and Termination

This Agreement shall remain in full force and effect for a period of five (5) years from the date of completion or regeneration of the Project, or until the return or destruction of all Confidential Information as provided in Clause 6, whichever is longer. Either party may terminate this Agreement upon thirty (30) days' prior written notice to the other party; provided, however, that the obligations of the Receiving Party set forth in Clause 2 shall survive such termination with respect to Confidential Information disclosed prior to the effective date of termination.

## 6. Return or Destruction of Confidential Information

Upon the written request of the Disclosing Party or upon termination or expiration of this Agreement, the Receiving Party shall promptly return or, at the Disclosing Party's option, destroy all materials (whether written, electronic, or otherwise) containing or reflecting any Confidential Information, and shall certify in writing that it has done so. The Receiving Party shall not retain any copies, extracts, or other reproductions, in whole or in part, of such material.

## 7. Miscellaneous

1. **Governing Law:** This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute, controversy, or claim arising out of or in connection with this Agreement, or the breach, termination, or invalidity thereof, shall be subject to the exclusive jurisdiction of the competent courts of India.
2. **Entire Agreement:** This Agreement constitutes the entire agreement between the parties concerning the subject matter hereof, and supersedes all prior agreements, understandings, negotiations, and discussions, whether oral or written, of the parties.
3. **Amendment:** No modification, amendment, or waiver of any provision of this Agreement shall be effective unless in writing and signed by both parties.
4. **Severability:** If any provision of this Agreement is held by a court of competent jurisdiction to be invalid, illegal, or unenforceable, the validity, legality, and enforceability of the remaining provisions shall not in any way be affected or impaired thereby, and such provision shall be modified to the minimum extent necessary to make such provision consistent with applicable law.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

&nbsp;

**{{company_name}}**

By: {{hr_name}}

Signature: ___________________________

Title: {{hr_designation}}

&nbsp;

**{{full_name}}**

Signature: ___________________________
`
