// hooks/useEmail.ts
// Custom hook for sending emails from React components

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { SendEmailWithPDFOptions } from '@/types/email';

interface EmailState {
  isSending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  data: any | null;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    contentType?: string;
  }>;
  employeeId?: string;
  documentId?: string;
  documentType?: string;
  templateType?: 'salary_slip' | 'document' | 'welcome' | 'notification';
  month?: string;
  customMessage?: string;
}

interface SendEmailWithPDFParams extends Omit<SendEmailWithPDFOptions, 'employeeId' | 'documentId' | 'versionId'> {
  employeeId: string;
  documentId: string;
  versionId: string;
}

export function useEmail() {
  const { toast } = useToast();
  const [state, setState] = useState<EmailState>({
    isSending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
  });

  /**
   * Send a regular email
   */
  const sendEmail = useCallback(async (params: SendEmailParams) => {
    setState({
      isSending: true,
      isSuccess: false,
      isError: false,
      error: null,
      data: null,
    });

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send email');
      }

      setState({
        isSending: false,
        isSuccess: true,
        isError: false,
        error: null,
        data,
      });

      toast({
        title: 'Email Sent',
        description: 'Email has been sent successfully.',
        variant: 'success',
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      
      setState({
        isSending: false,
        isSuccess: false,
        isError: true,
        error: errorMessage,
        data: null,
      });

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      });

      throw error;
    }
  }, [toast]);

  /**
   * Send email with PDF attachment (generates PDF and sends)
   */
  const sendEmailWithPDF = useCallback(async (params: SendEmailWithPDFParams) => {
    setState({
      isSending: true,
      isSuccess: false,
      isError: false,
      error: null,
      data: null,
    });

    try {
      const response = await fetch('/api/email/send-with-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send email with PDF');
      }

      setState({
        isSending: false,
        isSuccess: true,
        isError: false,
        error: null,
        data,
      });

      toast({
        title: 'Email with PDF Sent',
        description: `PDF generated and sent to ${params.customEmail || 'employee'} successfully.`,
        variant: 'success',
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email with PDF';
      
      setState({
        isSending: false,
        isSuccess: false,
        isError: true,
        error: errorMessage,
        data: null,
      });

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      });

      throw error;
    }
  }, [toast]);

  /**
   * Send salary slip email
   */
  const sendSalarySlipEmail = useCallback(async (
    employeeId: string,
    documentId: string,
    versionId: string,
    month: string,
    options?: {
      customEmail?: string;
      customSubject?: string;
      customMessage?: string;
      addSignature?: boolean;
    }
  ) => {
    return sendEmailWithPDF({
      employeeId,
      documentId,
      versionId,
      documentTitle: `Salary Slip - ${month}`,
      documentType: 'salary_slip',
      templateType: 'salary_slip',
      month,
      addSignature: options?.addSignature,
      customEmail: options?.customEmail,
      customSubject: options?.customSubject,
      customMessage: options?.customMessage,
    });
  }, [sendEmailWithPDF]);

  /**
   * Send document email (offer letter, NDA, etc.)
   */
  const sendDocumentEmail = useCallback(async (
    employeeId: string,
    documentId: string,
    versionId: string,
    documentTitle: string,
    documentType: string,
    options?: {
      customEmail?: string;
      customSubject?: string;
      customMessage?: string;
      addSignature?: boolean;
    }
  ) => {
    return sendEmailWithPDF({
      employeeId,
      documentId,
      versionId,
      documentTitle,
      documentType,
      templateType: 'document',
      addSignature: options?.addSignature,
      customEmail: options?.customEmail,
      customSubject: options?.customSubject,
      customMessage: options?.customMessage,
    });
  }, [sendEmailWithPDF]);

  /**
   * Send welcome email to new employee
   */
  const sendWelcomeEmail = useCallback(async (
    employeeId: string,
    passwordInfo?: string
  ) => {
    return sendEmail({
      employeeId,
      templateType: 'welcome',
      passwordInfo,
    });
  }, [sendEmail]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      isSending: false,
      isSuccess: false,
      isError: false,
      error: null,
      data: null,
    });
  }, []);

  return {
    state,
    sendEmail,
    sendEmailWithPDF,
    sendSalarySlipEmail,
    sendDocumentEmail,
    sendWelcomeEmail,
    reset,
  };
}
