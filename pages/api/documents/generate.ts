// pages/api/documents/generate.ts
// POST — Generate a document for an employee from a template.
//
// Body: { employeeId: string, templateId: string, customVariables?: Record<string, string> }
// Returns: { documentId, versionId, markdownContent, missingVariables }

import type { NextApiRequest, NextApiResponse } from 'next'
import { withAuth } from '@/lib/api-middleware'
import { adminDb } from '@/lib/firebase/admin'
import { createAuditLog } from '@/lib/audit/logger'
import { fillVariables, resolveVariableMap } from '@/lib/templates/fill-variables'
import type { Employee } from '@/types/employee'
import type { Template, CertificateTemplate } from '@/types/template'
import type { CompanySettings } from '@/types/settings'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  return await withAuth(req, res, async (uid, email) => {
    try {
      const { employeeId, templateId, customVariables = {} } = req.body as {
        employeeId: string
        templateId: string
        customVariables?: Record<string, string>
      }

      if (!employeeId || !templateId) {
        return res.status(400).json({ error: 'employeeId and templateId are required.' })
      }

      // ── 1. Fetch employee ──────────────────────────────────────────────────
      const empDoc = await adminDb.collection('employees').doc(employeeId).get()
      if (!empDoc.exists) {
        return res.status(404).json({ error: 'Employee not found.' })
      }
      const employee: Employee = { id: empDoc.id, ...(empDoc.data() as Omit<Employee, 'id'>) }

      // ── 2. Fetch template ──────────────────────────────────────────────────
      const tplDoc = await adminDb.collection('templates').doc(templateId).get()
      if (!tplDoc.exists) {
        return res.status(404).json({ error: 'Template not found.' })
      }
      const template: Template = { id: tplDoc.id, ...(tplDoc.data() as Omit<Template, 'id'>) }

      // ── 3. Fetch company settings ──────────────────────────────────────────
      const settingsDoc = await adminDb.collection('settings').doc('company').get()
      const settings: CompanySettings = settingsDoc.exists
        ? (settingsDoc.data() as CompanySettings)
        : ({} as CompanySettings)

      // ── 4 & 5. Fill variables & determine missing variables ────────────────
      let markdownContent = ''
      let missingVariables: string[] = []

      if (template.type === 'certificate') {
        const certTemplate = template as unknown as CertificateTemplate
        const allVarKeys = certTemplate.variables ?? []
        const certData = resolveVariableMap(allVarKeys, employee, settings, customVariables)

        // Identify which required certificate variables are missing
        for (const key of allVarKeys) {
          if (!certData[key] || certData[key].trim() === '') {
            missingVariables.push(key)
          }
        }
        missingVariables = [...new Set(missingVariables)]

        // Populate and substitute variables inside the certificate's body template
        const filled = fillVariables(certTemplate.bodyTemplate ?? '', employee, settings)
        let resultBody = filled.result
        if (Object.keys(customVariables).length > 0) {
          for (const [key, value] of Object.entries(customVariables)) {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
            resultBody = resultBody.replace(regex, value)
          }
        }
        markdownContent = resultBody
      } else {
        // Standard markdown document flow
        let mergedContent = template.markdownContent ?? ''
        if (Object.keys(customVariables).length > 0) {
          for (const [key, value] of Object.entries(customVariables)) {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
            mergedContent = mergedContent.replace(regex, value)
          }
        }

        // ── Offer-letter salary auto-computation ──────────────────────────
        // If this is an offer letter, compute annual values from monthly inputs
        // so HR only has to fill in monthly figures.
        if (template.type === 'offer_letter') {
          /** Parse a string like "18,000" or "18000" to a number */
          const parseMoney = (s: string | undefined): number => {
            if (!s) return 0
            return parseFloat(s.replace(/[^0-9.]/g, '')) || 0
          }
          /** Format a number as Indian locale string e.g. 18000 → "18,000" */
          const fmt = (n: number): string =>
            n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

          const basic   = parseMoney(customVariables['basic_salary'])
          const hra     = parseMoney(customVariables['hra'])
          const special = parseMoney(customVariables['special_allowance'])
          const conv    = parseMoney(customVariables['conveyance'])
          const medical = parseMoney(customVariables['medical_allowance'])

          const monthlyTotal = basic + hra + special + conv + medical
          const annualTotal  = monthlyTotal * 12

          // Inject computed values if HR hasn't already supplied them
          const computedVars: Record<string, string> = {
            basic_salary_annual:     fmt(basic   * 12),
            hra_annual:              fmt(hra     * 12),
            special_allowance_annual: fmt(special * 12),
            conveyance_annual:       fmt(conv    * 12),
            medical_allowance_annual: fmt(medical * 12),
          }
          // total_ctc = sum of monthly components (override if auto-computed)
          if (monthlyTotal > 0) {
            computedVars['total_ctc'] = fmt(monthlyTotal)
          }
          // annual_ctc = total_ctc * 12
          if (annualTotal > 0) {
            computedVars['annual_ctc'] = fmt(annualTotal)
          }

          for (const [key, value] of Object.entries(computedVars)) {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
            mergedContent = mergedContent.replace(regex, value)
          }
        }
        // ── End offer-letter computation ────────────────────────────────────

        const fillRes = fillVariables(mergedContent, employee, settings)
        markdownContent = fillRes.result
        missingVariables = fillRes.missing
      }

      // ── 6. Create document record ─────────────────────────────────────────
      const now = new Date().toISOString()
      const docTitle = `${template.name} — ${employee.employeeId}`

      const documentRef = await adminDb
        .collection('employees')
        .doc(employeeId)
        .collection('documents')
        .add({
          templateId,
          documentType: template.type,
          title: docTitle,
          status: 'draft',
          currentVersion: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: uid,
        })

      // ── 7. Create version v1 ──────────────────────────────────────────────
      // For certificate templates: build and persist the full variable map so
      // the PDF export route can retrieve it later for image-overlay rendering.
      const versionDoc: Record<string, unknown> = {
        versionNumber: 1,
        markdownContent,
        exportedAs: null,
        exportStoragePath: null,
        hasSigned: false,
        signedAt: null,
        aiImproved: false,
        changeNote: 'Initial generation from template',
        createdAt: now,
        createdBy: uid,
      }

      if (template.type === 'certificate') {
        const certTemplate = template as unknown as CertificateTemplate
        const allVarKeys = certTemplate.variables ?? []
        const certData = resolveVariableMap(allVarKeys, employee, settings, customVariables)
        versionDoc.certificateData = certData
      }

      await adminDb
        .collection('employees')
        .doc(employeeId)
        .collection('documents')
        .doc(documentRef.id)
        .collection('versions')
        .doc('v1')
        .set(versionDoc)

      // ── 8. Audit log ──────────────────────────────────────────────────────
      await createAuditLog({
        action: 'DOCUMENT_GENERATE',
        entityType: 'document',
        entityId: documentRef.id,
        performedBy: uid,
        performedByEmail: email,
        metadata: {
          employeeId,
          templateId,
          templateName: template.name,
          documentTitle: docTitle,
          missingVariables,
        },
      })

      return res.status(201).json({
        documentId: documentRef.id,
        versionId: 'v1',
        markdownContent,
        missingVariables,
      })
    } catch (err) {
      console.error('[POST /api/documents/generate]', err)
      return res.status(500).json({ error: 'Failed to generate document.' })
    }
  })
}
