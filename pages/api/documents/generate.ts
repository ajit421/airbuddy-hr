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

      // ── 4. Merge custom variables into markdown before filling ─────────────
      // Custom variables override the standard template content so HR can
      // patch any missing field without changing the template itself.
      let mergedContent = template.markdownContent
      if (Object.keys(customVariables).length > 0) {
        for (const [key, value] of Object.entries(customVariables)) {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
          mergedContent = mergedContent.replace(regex, value)
        }
      }

      // ── 5. Fill variables ─────────────────────────────────────────────────
      const { result: markdownContent, missing: missingVariables } = fillVariables(
        mergedContent,
        employee,
        settings
      )

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
