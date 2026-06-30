// types/email.ts
// Email-related types for AirBuddy HR Platform

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: 'base64' | 'utf8' | 'binary';
}

export interface EmailOptions {
  to: string | string[] | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

export type EmailTemplateType = 
  | 'salary_slip'
  | 'document'
  | 'welcome'
  | 'notification'
  | 'custom';

export interface SendEmailWithPDFOptions {
  employeeId: string;
  documentId: string;
  versionId: string;
  documentTitle: string;
  documentType?: string;
  templateType?: EmailTemplateType;
  month?: string; // For salary slip
  addSignature?: boolean;
  customEmail?: string; // Override employee email
  customSubject?: string;
  customMessage?: string;
}

export interface EmailAuditLog {
  action: 'email_sent' | 'email_failed' | 'email_with_pdf_sent' | 'email_with_pdf_failed';
  entityType: string;
  entityId: string;
  metadata: {
    to?: string | string[];
    subject?: string;
    messageId?: string;
    templateType?: EmailTemplateType;
    hasAttachments?: boolean;
    fileName?: string;
    fileSize?: number;
    error?: string;
    [key: string]: any;
  };
  performedBy: string;
  performedByEmail: string;
  timestamp: string;
}
