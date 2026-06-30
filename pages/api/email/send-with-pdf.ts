// pages/api/email/send-with-pdf.ts
// POST - Generate PDF and send email with attachment
//
// Body: {
//   employeeId: string,
//   documentId: string,
//   versionId: string,
//   documentTitle: string,
//   documentType: string,
//   templateType?: 'salary_slip' | 'document',
//   month?: string, // For salary slip
//   addSignature?: boolean,
//   customEmail?: string, // Optional: override employee email
//   customSubject?: string, // Optional: override subject
//   customMessage?: string, // Optional: custom message to include
// }

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/api-middleware';
import { adminDb } from '@/lib/firebase/admin';
import { createAuditLog } from '@/lib/audit/logger';
import { sendEmail } from '@/lib/email/service';
import { generateSalarySlipEmail, generateDocumentEmail } from '@/lib/email/templates';
import { renderToBuffer } from '@react-pdf/renderer';
import { HRPdfDocument } from '@/lib/export/pdf-renderer';
import { renderCertificatePdf } from '@/lib/certificates/render-certificate';
import { generateFileName } from '@/lib/export/file-naming';
import { fillTemplateVariables } from '@/lib/templates/fill-variables';
import type { CompanySettings } from '@/types/settings';
import type { Employee } from '@/types/employee';
import type { Document } from '@/types/document';
import { format } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return await withAuth(req, res, async (uid, email): Promise<void> => {
    try {
      const {
        employeeId,
        documentId,
        versionId,
        documentTitle,
        documentType,
        templateType,
        month,
        addSignature = false,
        customEmail,
        customSubject,
        customMessage,
      } = req.body;

      // Validate required fields
      if (!employeeId || !documentId || !versionId || !documentTitle) {
        return res.status(400).json({
          error: 'Missing required fields: employeeId, documentId, versionId, documentTitle',
        });
      }

      // Fetch employee data
      const empDoc = await adminDb.collection('employees').doc(employeeId).get();
      if (!empDoc.exists) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      const employee = empDoc.data() as Employee;

      // Fetch document data
      const docRef = adminDb
        .collection('employees')
        .doc(employeeId)
        .collection('documents')
        .doc(documentId);

      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Document not found' });
      }
      const document = docSnap.data() as Document;

      // Fetch version data
      const versionRef = docRef.collection('versions').doc(versionId);
      const versionSnap = await versionRef.get();
      if (!versionSnap.exists) {
        return res.status(404).json({ error: 'Version not found' });
      }
      const version = versionSnap.data();

      // Fetch company settings
      const settingsDoc = await adminDb.collection('settings').doc('company').get();
      const settings = settingsDoc.exists
        ? (settingsDoc.data() as CompanySettings)
        : ({} as CompanySettings);

      // Fetch signature if needed
      let signatureBuffer: Buffer | null = null;
      if (addSignature && settings.signatureStoragePath) {
        // In a real implementation, you would download the signature from Cloudinary
        // For now, we'll skip this as it requires Cloudinary integration
        console.log('[Email] Signature would be downloaded from:', settings.signatureStoragePath);
      }

      // Generate PDF
      let pdfBuffer: Buffer;
      const resolvedDocumentType = document.documentType || documentType;

      if (resolvedDocumentType === 'certificate') {
        // Handle certificate PDF generation
        const templateDoc = await adminDb
          .collection('templates')
          .doc(document.templateId)
          .get();
        
        if (!templateDoc.exists) {
          return res.status(404).json({ error: 'Certificate template not found' });
        }
        
        const template = templateDoc.data();
        pdfBuffer = await renderCertificatePdf(
          employee,
          template,
          settings,
          signatureBuffer || undefined
        );
      } else {
        // Handle regular document PDF generation
        const markdownContent = version.content || version.markdownContent || '';
        
        // Fill template variables
        const filledContent = fillTemplateVariables(markdownContent, employee, settings);

        // Generate PDF
        const pdfDoc = (
          <HRPdfDocument
            markdownContent={filledContent}
            employee={employee}
            settings={settings}
            documentTitle={documentTitle}
            addSignature={addSignature}
            signatureBuffer={signatureBuffer || undefined}
          />
        );

        pdfBuffer = await renderToBuffer(pdfDoc);
      }

      // Generate filename
      const fileName = generateFileName({
        employeeId: employee.employeeId,
        documentTitle,
        documentType: resolvedDocumentType,
        versionNumber: version.versionNumber || 1,
        extension: 'pdf',
      });

      // Generate email content
      let emailSubject: string;
      let emailHtml: string;
      let emailText: string;

      const currentMonth = month || format(new Date(), 'MMMM yyyy');

      if (templateType === 'salary_slip' || resolvedDocumentType === 'salary_slip') {
        const template = generateSalarySlipEmail(
          employee,
          settings,
          currentMonth
          // We'll add the PDF as attachment, not as URL
        );
        emailSubject = customSubject || template.subject;
        emailHtml = template.html;
        emailText = template.text;
      } else {
        const template = generateDocumentEmail(
          employee,
          settings,
          resolvedDocumentType || '',
          documentTitle
        );
        emailSubject = customSubject || template.subject;
        emailHtml = template.html;
        emailText = template.text;
      }

      // Add custom message if provided
      if (customMessage) {
        emailHtml = emailHtml.replace(
          '</div>',
          `<p style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-left: 4px solid #3b82f6;">${customMessage}</p></div>`
        );
      }

      // Determine recipient
      const recipient = customEmail || employee.email;

      // Send email with PDF attachment
      const result = await sendEmail({
        to: recipient,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      if (!result.success) {
        console.error('[Email] Failed to send email:', result.error);
        return res.status(500).json({
          error: 'Failed to send email',
          details: result.error,
        });
      }

      // Create audit log
      await createAuditLog({
        action: 'email_with_pdf_sent',
        entityType: resolvedDocumentType || 'document',
        entityId: documentId,
        metadata: {
          employeeId: employee.id,
          employeeName: employee.fullName,
          documentTitle,
          documentType: resolvedDocumentType,
          messageId: result.messageId,
          fileName,
          fileSize: pdfBuffer.length,
          hasSignature: addSignature,
        },
        performedBy: uid,
        performedByEmail: email,
      });

      console.log('[Email] PDF email sent successfully:', {
        to: recipient,
        subject: emailSubject,
        messageId: result.messageId,
        fileName,
        fileSize: pdfBuffer.length,
      });

      res.status(200).json({
        success: true,
        messageId: result.messageId,
        fileName,
        fileSize: pdfBuffer.length,
        message: 'Email with PDF sent successfully',
      });
    } catch (error) {
      console.error('[Email] Error sending PDF email:', error);

      // Create audit log for failure
      await createAuditLog({
        action: 'email_with_pdf_send_failed',
        entityType: 'email',
        entityId: documentId || 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          employeeId,
          documentId,
        },
        performedBy: uid,
        performedByEmail: email,
      });

      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
