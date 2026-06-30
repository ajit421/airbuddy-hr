# 📧 Email Setup Guide for AirBuddy HR Platform

This guide explains how to set up and use the email functionality in AirBuddy HR Platform.

## 🚀 Quick Start

### 1. Set Up Resend (Recommended)

1. **Sign up for Resend** at [https://resend.com](https://resend.com)
2. **Get your API key** from the Resend dashboard
3. **Verify your domain** in Resend (e.g., `airbuddy.in`)
4. **Add environment variables** to your `.env.local`:

```env
# Email Service (Resend)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@airbuddy.in
```

5. **Verify your sender email** in Resend dashboard

### 2. Alternative: Use Nodemailer (SMTP)

If you prefer SMTP instead of Resend, you can use Nodemailer:

1. Install Nodemailer:
```bash
npm install nodemailer
```

2. Update `lib/email/service.ts` to use Nodemailer instead of Resend

3. Add SMTP environment variables:
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
```

## 📁 Project Structure

```
airbuddy-hr/
├── lib/
│   └── email/
│       ├── service.ts          # Email sending service (Resend)
│       ├── templates.ts        # Email HTML templates
│       └── cloudinary-utils.ts # Cloudinary utilities for attachments
├── pages/
│   └── api/
│       └── email/
│           ├── send.ts          # Send regular email API
│           └── send-with-pdf.ts # Send email with PDF attachment
├── hooks/
│   └── useEmail.ts             # React hook for email functionality
├── components/
│   └── email/
│       ├── index.ts            # Component exports
│       ├── SendEmailDialog.tsx # General email dialog
│       └── SalarySlipEmailDialog.tsx # Salary slip specific dialog
└── types/
    └── email.ts                # Email-related types
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# Required for Resend
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@airbuddy.in

# Optional: Company info (can also be set via Settings page)
NEXT_PUBLIC_COMPANY_NAME=AirBuddy Aerospace Pvt. Ltd.
```

### Resend Dashboard Setup

1. **Verify Domain**: Go to Resend dashboard → Domains → Add Domain
2. **Verify Sender**: Go to Resend dashboard → Senders → Add Sender
3. **Check Quota**: Free tier allows 3,000 emails/month

## 📧 Usage Examples

### 1. Send a Simple Email

```typescript
import { sendEmail } from '@/lib/email/service';

const result = await sendEmail({
  to: 'employee@airbuddy.in',
  subject: 'Test Email',
  html: '<p>This is a test email</p>',
  text: 'This is a test email',
});

if (result.success) {
  console.log('Email sent:', result.messageId);
}
```

### 2. Send Email with PDF Attachment

```typescript
import { sendEmail } from '@/lib/email/service';

const pdfBuffer = Buffer.from('...'); // Your PDF buffer

const result = await sendEmail({
  to: 'employee@airbuddy.in',
  subject: 'Your Salary Slip',
  html: '<p>Please find your salary slip attached.</p>',
  attachments: [
    {
      filename: 'salary-slip-january-2024.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf',
    }
  ],
});
```

### 3. Use the React Hook

```typescript
import { useEmail } from '@/hooks/useEmail';

function MyComponent() {
  const { sendEmail, sendEmailWithPDF, state } = useEmail();

  const handleSend = async () => {
    await sendEmail({
      to: 'employee@airbuddy.in',
      subject: 'Welcome to AirBuddy',
      html: '<p>Welcome aboard!</p>',
      templateType: 'notification',
    });
  };

  return (
    <button onClick={handleSend} disabled={state.isSending}>
      Send Email
    </button>
  );
}
```

### 4. Send Salary Slip Email

```typescript
import { useEmail } from '@/hooks/useEmail';

function SalarySlipButton({ employee, document, version }) {
  const { sendSalarySlipEmail } = useEmail();

  const handleSendSalarySlip = async () => {
    await sendSalarySlipEmail(
      employee.id,
      document.id,
      version.id,
      'January 2024',
      {
        customEmail: employee.email,
        addSignature: true,
        customMessage: 'Please review your salary slip for January 2024.',
      }
    );
  };

  return (
    <button onClick={handleSendSalarySlip}>
      Email Salary Slip
    </button>
  );
}
```

### 5. Use Dialog Components

```typescript
import { SendEmailDialog } from '@/components/email';

function EmployeePage({ employee, documents }) {
  return (
    <div>
      <SendEmailDialog
        employee={employee}
        documents={documents}
        trigger={<Button>Send Email</Button>}
        onSuccess={() => console.log('Email sent!')}
      />
    </div>
  );
}
```

```typescript
import { SalarySlipEmailDialog } from '@/components/email';

function EmployeePage({ employee, salarySlipDocument }) {
  return (
    <div>
      <SalarySlipEmailDialog
        employee={employee}
        salarySlipDocument={salarySlipDocument}
        trigger={<Button>Email Salary Slip</Button>}
      />
    </div>
  );
}
```

## 🎨 Email Templates

The system includes several built-in email templates:

### 1. Salary Slip Template
- Professional design with company branding
- Employee details table
- Salary information
- PDF attachment link

### 2. Document Template
- Generic document email
- Document type and title
- Employee information
- PDF attachment

### 3. Welcome Template
- Warm welcome message
- Employee information
- Company details
- HR contact information

### 4. Notification Template
- Simple notification email
- Customizable message
- Optional action button

## 📊 API Endpoints

### POST `/api/email/send`

Send a regular email with optional attachments.

**Request Body:**
```json
{
  "to": "employee@airbuddy.in",
  "subject": "Test Email",
  "html": "<p>Email content</p>",
  "text": "Plain text content",
  "attachments": [
    {
      "filename": "document.pdf",
      "content": "base64_encoded_content",
      "contentType": "application/pdf"
    }
  ],
  "templateType": "notification",
  "employeeId": "emp_123",
  "documentId": "doc_123"
}
```

### POST `/api/email/send-with-pdf`

Generate PDF from document and send as email attachment.

**Request Body:**
```json
{
  "employeeId": "emp_123",
  "documentId": "doc_123",
  "versionId": "ver_123",
  "documentTitle": "Salary Slip - January 2024",
  "documentType": "salary_slip",
  "templateType": "salary_slip",
  "month": "January 2024",
  "addSignature": true,
  "customEmail": "custom@email.com",
  "customSubject": "Custom Subject",
  "customMessage": "Custom message to include"
}
```

## 🔒 Security Considerations

1. **API Key Protection**: Resend API key is server-side only
2. **Email Validation**: All emails are validated before sending
3. **Domain Restriction**: Only `@airbuddy.in` emails can log in (configurable)
4. **Audit Logging**: All email sends are logged in Firestore
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse

## 📈 Monitoring

### Audit Logs

All email sends are logged in the `audit_logs` collection with:
- Action type (`email_sent`, `email_with_pdf_sent`, etc.)
- Recipient information
- Subject and message ID
- Attachment details
- Timestamp and user who sent

### Resend Dashboard

Monitor email delivery in Resend dashboard:
- Sent emails
- Delivery status
- Bounce rates
- Open rates

## 🛠️ Customization

### Custom Email Templates

Add new templates in `lib/email/templates.ts`:

```typescript
export function generateCustomEmail(
  employee: Partial<Employee>,
  settings: Partial<CompanySettings>,
  customData: any
): { subject: string; html: string; text: string } {
  return {
    subject: 'Custom Subject',
    html: '<p>Custom HTML content</p>',
    text: 'Custom text content',
  };
}
```

### Custom Email Service

To use a different email provider, update `lib/email/service.ts`:

```typescript
// Example: Using Nodemailer instead of Resend
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // Implement Nodemailer logic
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Email not sending**
   - Check Resend API key
   - Verify sender email in Resend dashboard
   - Check domain verification

2. **Attachment not working**
   - Ensure content is base64 encoded
   - Check file size limits (Resend: 25MB max)

3. **Email going to spam**
   - Verify domain in Resend
   - Set up DKIM, SPF, DMARC records
   - Use a professional sender email

4. **API errors**
   - Check environment variables
   - Verify network connectivity
   - Check Resend API status

### Debug Mode

Enable debug logging in development:

```typescript
// In lib/email/service.ts
const resend = new Resend(process.env.RESEND_API_KEY, {
  debug: process.env.NODE_ENV === 'development',
});
```

## 📞 Support

- **Resend Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Resend Status**: [https://status.resend.com](https://status.resend.com)
- **Nodemailer Documentation**: [https://nodemailer.com](https://nodemailer.com)

## 🎯 Best Practices

1. **Use Templates**: Always use email templates for consistency
2. **Validate Emails**: Always validate recipient emails
3. **Handle Errors**: Always handle email sending errors gracefully
4. **Audit Logs**: Always log email sends for tracking
5. **Rate Limiting**: Consider adding rate limiting for production
6. **Unsubscribe Links**: Include unsubscribe links in marketing emails
7. **Test Emails**: Always test emails before sending to all employees

## 📝 Changelog

- **v1.0.0**: Initial email functionality with Resend integration
- **v1.0.1**: Added PDF attachment support
- **v1.0.2**: Added React hooks and dialog components
- **v1.0.3**: Added salary slip specific components

---

**AirBuddy HR Platform** - Internal Documentation
