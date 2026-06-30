// pages/api/email/send.ts
// POST - Send an email with optional PDF attachment
//
// Body: {
//   to: string | string[],
//   subject: string,
//   html: string,
//   text?: string,
//   attachments?: Array<{
//     filename: string,
//     content: string (base64), // Base64 encoded content
//     contentType?: string
//   }>,
//   employeeId?: string,
//   documentId?: string,
//   documentType?: string,
//   templateType?: 'salary_slip' | 'document' | 'welcome' | 'notification'
// }

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/api-middleware';
import { adminDb } from '@/lib/firebase/admin';
import { createAuditLog } from '@/lib/audit/logger';
import { sendEmail, isValidEmail } from '@/lib/email/service';
import {
  generateSalarySlipEmail,
  generateDocumentEmail,
  generateWelcomeEmail,
  generateNotificationEmail,
} from '@/lib/email/templates';
import type { CompanySettings } from '@/types/settings';
import type { Employee } from '@/types/employee';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return await withAuth(req, res, async (uid, email): Promise<void> => {
    try {
      const {
        to,
        subject,
        html,
        text,
        attachments = [],
        employeeId,
        documentId,
        documentType,
        documentTitle,
        templateType,
        month, // For salary slip
        passwordInfo, // For welcome email
        message, // For notification
        actionUrl, // For notification
        actionText, // For notification
      } = req.body;

      // Validate required fields based on template type
      if (templateType) {
        switch (templateType) {
          case 'salary_slip':
            if (!employeeId || !month) {
              return res.status(400).json({
                error: 'For salary_slip template: employeeId and month are required',
              });
            }
            break;
          case 'document':
            if (!employeeId || !documentType || !documentTitle) {
              return res.status(400).json({
                error: 'For document template: employeeId, documentType, and documentTitle are required',
              });
            }
            break;
          case 'welcome':
            if (!employeeId) {
              return res.status(400).json({
                error: 'For welcome template: employeeId is required',
              });
            }
            break;
          case 'notification':
            if (!subject || !message) {
              return res.status(400).json({
                error: 'For notification template: subject and message are required',
              });
            }
            break;
          default:
            // Custom email - validate basic fields
            if (!to || !subject || !html) {
              return res.status(400).json({
                error: 'Missing required fields: to, subject, html',
              });
            }
        }
      } else {
        // No template type - validate basic fields
        if (!to || !subject || !html) {
          return res.status(400).json({
            error: 'Missing required fields: to, subject, html',
          });
        }
      }

      // Fetch company settings
      const settingsDoc = await adminDb.collection('settings').doc('company').get();
      const settings = settingsDoc.exists
        ? (settingsDoc.data() as CompanySettings)
        : ({} as CompanySettings);

      // Fetch employee data if employeeId is provided
      let employee: Partial<Employee> | null = null;
      if (employeeId) {
        const empDoc = await adminDb.collection('employees').doc(employeeId).get();
        if (empDoc.exists) {
          employee = empDoc.data() as Employee;
        }
      }

      // Generate email content based on template type
      let emailSubject = subject;
      let emailHtml = html;
      let emailText = text;

      if (templateType && employee) {
        switch (templateType) {
          case 'salary_slip':
            {
              const template = generateSalarySlipEmail(
                employee,
                settings,
                month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                undefined // PDF URL will be handled by attachments
              );
              emailSubject = template.subject;
              emailHtml = template.html;
              emailText = template.text;
            }
            break;
          case 'document':
            {
              const template = generateDocumentEmail(
                employee,
                settings,
                documentType || '',
                documentTitle || '',
                undefined
              );
              emailSubject = template.subject;
              emailHtml = template.html;
              emailText = template.text;
            }
            break;
          case 'welcome':
            {
              const template = generateWelcomeEmail(employee, settings, passwordInfo);
              emailSubject = template.subject;
              emailHtml = template.html;
              emailText = template.text;
            }
            break;
          case 'notification':
            {
              const template = generateNotificationEmail(
                Array.isArray(to) ? to[0] : to!,
                subject!,
                message!,
                actionUrl,
                actionText
              );
              emailSubject = template.subject;
              emailHtml = template.html;
              emailText = template.text;
            }
            break;
        }
      }

      // Determine recipient
      let recipient = to;
      if (!recipient && employee) {
        recipient = employee.email;
      }

      if (!recipient) {
        return res.status(400).json({ error: 'No recipient email specified' });
      }

      // Validate recipient email
      const recipientArray = Array.isArray(recipient) ? recipient : [recipient];
      for (const email of recipientArray) {
        if (!isValidEmail(email)) {
          return res.status(400).json({ error: `Invalid email address: ${email}` });
        }
      }

      // Convert base64 attachments to Buffer
      const emailAttachments = attachments.map((attachment: any) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, 'base64'),
        contentType: attachment.contentType || 'application/octet-stream',
      }));

      // Send the email
      const result = await sendEmail({
        to: recipientArray,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
        attachments: emailAttachments,
      });

      if (!result.success) {
        console.error('[Email API] Failed to send email:', result.error);
        return res.status(500).json({
          error: 'Failed to send email',
          details: result.error,
        });
      }

      // Create audit log
      await createAuditLog({
        action: 'email_sent',
        entityType: templateType || 'email',
        entityId: employeeId || documentId || 'custom',
        metadata: {
          to: recipientArray,
          subject: emailSubject,
          messageId: result.messageId,
          templateType,
          hasAttachments: emailAttachments.length > 0,
        },
        performedBy: uid,
        performedByEmail: email,
      });

      console.log('[Email API] Email sent successfully:', {
        to: recipientArray,
        subject: emailSubject,
        messageId: result.messageId,
        templateType,
      });

      res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully',
      });
    } catch (error) {
      console.error('[Email API] Error:', error);
      
      // Create audit log for failure
      await createAuditLog({
        action: 'email_send_failed',
        entityType: 'email',
        entityId: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
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
