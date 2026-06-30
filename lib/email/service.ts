// lib/email/service.ts
// Email sending service using Resend for AirBuddy HR Platform

import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration from environment
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@airbuddy.in';
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'AirBuddy Aerospace Pvt. Ltd.';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    // Validate required fields
    if (!options.to || !options.subject || !options.html) {
      return {
        success: false,
        error: 'Missing required fields: to, subject, html',
      };
    }

    // Convert single email to array
    const to = Array.isArray(options.to) ? options.to : [options.to];
    
    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of to) {
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: `Invalid email address: ${email}`,
        };
      }
    }

    // Prepare attachments for Resend
    const resendAttachments = options.attachments?.map(attachment => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType || 'application/octet-stream',
    })) || [];

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: resendAttachments,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'No data returned from email service',
      };
    }

    console.log('[Email] Email sent successfully:', {
      to: to,
      subject: options.subject,
      messageId: data.id,
    });

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get email domain from address
 */
export function getEmailDomain(email: string): string {
  return email.split('@')[1] || '';
}

/**
 * Check if email is from allowed domain
 */
export function isAllowedDomain(email: string, allowedDomain?: string): boolean {
  if (!allowedDomain) {
    return true; // No domain restriction
  }
  const domain = getEmailDomain(email);
  return domain === allowedDomain || domain.endsWith(`.${allowedDomain}`);
}

export { resend };
