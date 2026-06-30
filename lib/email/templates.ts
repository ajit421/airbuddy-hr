// lib/email/templates.ts
// Email templates for AirBuddy HR Platform

import { CompanySettings } from '@/types/settings';
import { Employee } from '@/types/employee';

/**
 * Generate salary slip email template
 */
export function generateSalarySlipEmail(
  employee: Partial<Employee>,
  settings: Partial<CompanySettings>,
  month: string,
  pdfUrl?: string
): { subject: string; html: string; text: string } {
  const companyName = settings.companyName || 'AirBuddy Aerospace Pvt. Ltd.';
  const employeeName = employee.fullName || 'Employee';
  const employeeId = employee.employeeId || 'N/A';
  const designation = employee.designation || 'Employee';
  const salary = employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : 'N/A';

  const subject = `Salary Slip for ${month} - ${companyName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #fff;
      padding: 30px;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      background: #2563eb;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #666;
      font-size: 14px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .info-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-table td:first-child {
      font-weight: 600;
      color: #4b5563;
    }
    .highlight {
      color: #3b82f6;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📄 Salary Slip</h1>
  </div>
  
  <div class="content">
    <p>Dear <strong>${employeeName}</strong>,</p>
    
    <p>Please find your salary slip for <strong>${month}</strong> attached to this email.</p>
    
    <h3>Employee Details</h3>
    <table class="info-table">
      <tr>
        <td>Employee Name</td>
        <td>${employeeName}</td>
      </tr>
      <tr>
        <td>Employee ID</td>
        <td>${employeeId}</td>
      </tr>
      <tr>
        <td>Designation</td>
        <td>${designation}</td>
      </tr>
      <tr>
        <td>Month</td>
        <td><span class="highlight">${month}</span></td>
      </tr>
      <tr>
        <td>Monthly Salary</td>
        <td><span class="highlight">${salary}</span></td>
      </tr>
    </table>

    ${pdfUrl ? `
    <p style="text-align: center;">
      <a href="${pdfUrl}" class="button">Download Salary Slip PDF</a>
    </p>
    ` : ''}

    <p>This is a computer-generated salary slip. For any discrepancies, please contact the HR department.</p>
    
    <p>Best regards,<br>
    <strong>${settings.hrName || 'HR Department'}</strong><br>
    ${settings.hrDesignation || 'HR Manager'}<br>
    ${companyName}</p>
  </div>
  
  <div class="footer">
    <p>This email was sent automatically by AirBuddy HR Platform.</p>
    <p>Please do not reply to this email.</p>
    <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  const text = `
Salary Slip for ${month} - ${companyName}

Dear ${employeeName},

Please find your salary slip for ${month} attached to this email.

Employee Details:
- Employee Name: ${employeeName}
- Employee ID: ${employeeId}
- Designation: ${designation}
- Month: ${month}
- Monthly Salary: ${salary}

This is a computer-generated salary slip. For any discrepancies, please contact the HR department.

Best regards,
${settings.hrName || 'HR Department'}
${settings.hrDesignation || 'HR Manager'}
${companyName}

---
This email was sent automatically by AirBuddy HR Platform.
Please do not reply to this email.
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Generate document email template (for offer letters, NDA, etc.)
 */
export function generateDocumentEmail(
  employee: Partial<Employee>,
  settings: Partial<CompanySettings>,
  documentType: string,
  documentTitle: string,
  pdfUrl?: string
): { subject: string; html: string; text: string } {
  const companyName = settings.companyName || 'AirBuddy Aerospace Pvt. Ltd.';
  const employeeName = employee.fullName || 'Employee';
  const employeeId = employee.employeeId || 'N/A';

  const documentTypeLabels: Record<string, string> = {
    offer_letter: 'Offer Letter',
    appointment_letter: 'Appointment Letter',
    internship_letter: 'Internship Letter',
    nda: 'Non-Disclosure Agreement',
    experience_letter: 'Experience Letter',
    salary_slip: 'Salary Slip',
    certificate: 'Certificate',
  };

  const label = documentTypeLabels[documentType] || documentType;
  const subject = `${label}: ${documentTitle} - ${companyName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #fff;
      padding: 30px;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      background: #059669;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #666;
      font-size: 14px;
    }
    .info-box {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 6px 6px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 ${label}</h1>
  </div>
  
  <div class="content">
    <p>Dear <strong>${employeeName}</strong>,</p>
    
    <div class="info-box">
      <p><strong>Document:</strong> ${documentTitle}</p>
      <p><strong>Type:</strong> ${label}</p>
      <p><strong>Employee ID:</strong> ${employeeId}</p>
    </div>

    <p>Please find your <strong>${label.toLowerCase()}</strong> attached to this email.</p>

    ${pdfUrl ? `
    <p style="text-align: center;">
      <a href="${pdfUrl}" class="button">Download ${label} PDF</a>
    </p>
    ` : ''}

    <p>This document has been generated automatically by AirBuddy HR Platform.</p>
    
    <p>Best regards,<br>
    <strong>${settings.hrName || 'HR Department'}</strong><br>
    ${settings.hrDesignation || 'HR Manager'}<br>
    ${companyName}</p>
  </div>
  
  <div class="footer">
    <p>This email was sent automatically by AirBuddy HR Platform.</p>
    <p>Please do not reply to this email.</p>
    <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  const text = `
${label}: ${documentTitle} - ${companyName}

Dear ${employeeName},

Please find your ${label.toLowerCase()} attached to this email.

Document Details:
- Type: ${label}
- Title: ${documentTitle}
- Employee ID: ${employeeId}

This document has been generated automatically by AirBuddy HR Platform.

Best regards,
${settings.hrName || 'HR Department'}
${settings.hrDesignation || 'HR Manager'}
${companyName}

---
This email was sent automatically by AirBuddy HR Platform.
Please do not reply to this email.
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Generate welcome email for new employees
 */
export function generateWelcomeEmail(
  employee: Partial<Employee>,
  settings: Partial<CompanySettings>,
  passwordInfo?: string
): { subject: string; html: string; text: string } {
  const companyName = settings.companyName || 'AirBuddy Aerospace Pvt. Ltd.';
  const employeeName = employee.fullName || 'Employee';
  const employeeId = employee.employeeId || 'N/A';
  const designation = employee.designation || 'Employee';
  const department = employee.department || 'N/A';
  const joiningDate = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : 'N/A';

  const subject = `Welcome to ${companyName}! - Your Employee Account`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      margin-bottom: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #fff;
      padding: 30px;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .button {
      display: inline-block;
      background: #8b5cf6;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 5px;
      font-weight: 600;
    }
    .button-secondary {
      background: #64748b;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #666;
      font-size: 14px;
      text-align: center;
    }
    .welcome-message {
      font-size: 18px;
      color: #4b5563;
      margin-bottom: 20px;
    }
    .employee-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Welcome to ${companyName}!</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">We're excited to have you on board!</p>
  </div>
  
  <div class="content">
    <p class="welcome-message">Dear <strong>${employeeName}</strong>,</p>
    
    <p>On behalf of the entire team at ${companyName}, I would like to extend a warm welcome to you! We are thrilled to have you join us as a <strong>${designation}</strong> in the <strong>${department}</strong> department.</p>

    <div class="employee-card">
      <h3>Your Employee Information</h3>
      <p><strong>Employee ID:</strong> ${employeeId}</p>
      <p><strong>Designation:</strong> ${designation}</p>
      <p><strong>Department:</strong> ${department}</p>
      <p><strong>Joining Date:</strong> ${joiningDate}</p>
    </div>

    ${passwordInfo ? `
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h4 style="margin-top: 0; color: #92400e;">🔐 Account Access</h4>
      <p style="margin-bottom: 0;">${passwordInfo}</p>
    </div>
    ` : ''}

    <p>Your first day marks the beginning of an exciting journey with us. We believe your skills and experience will be a valuable addition to our team.</p>

    <p>If you have any questions or need assistance during your onboarding process, please don't hesitate to reach out to our HR team.</p>

    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://hr.airbuddy.in'}" class="button">Access HR Portal</a>
    </p>
    
    <p>Once again, welcome aboard! We look forward to working with you and achieving great success together.</p>
    
    <p>Best regards,<br>
    <strong>${settings.hrName || 'HR Department'}</strong><br>
    ${settings.hrDesignation || 'HR Manager'}<br>
    ${companyName}</p>
  </div>
  
  <div class="footer">
    <p><strong>Confidentiality Notice:</strong> This email and any attachments are confidential and may be privileged. If you are not the intended recipient, please notify the sender immediately and delete this email.</p>
    <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  const text = `
Welcome to ${companyName}! - Your Employee Account

Dear ${employeeName},

On behalf of the entire team at ${companyName}, I would like to extend a warm welcome to you! We are thrilled to have you join us as a ${designation} in the ${department} department.

Your Employee Information:
- Employee ID: ${employeeId}
- Designation: ${designation}
- Department: ${department}
- Joining Date: ${joiningDate}

${passwordInfo ? `
Account Access:
${passwordInfo}
` : ''}

Your first day marks the beginning of an exciting journey with us. We believe your skills and experience will be a valuable addition to our team.

If you have any questions or need assistance during your onboarding process, please don't hesitate to reach out to our HR team.

Access HR Portal: ${process.env.NEXT_PUBLIC_APP_URL || 'https://hr.airbuddy.in'}

Once again, welcome aboard! We look forward to working with you and achieving great success together.

Best regards,
${settings.hrName || 'HR Department'}
${settings.hrDesignation || 'HR Manager'}
${companyName}

---
Confidentiality Notice: This email and any attachments are confidential and may be privileged. If you are not the intended recipient, please notify the sender immediately and delete this email.

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Generate notification email for document generation
 */
export function generateNotificationEmail(
  toEmail: string,
  subject: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): { subject: string; html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #3b82f6;
      color: white;
      padding: 20px;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #fff;
      padding: 25px;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      margin: 15px 0;
    }
    .footer {
      margin-top: 20px;
      color: #888;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0;">${subject}</h2>
  </div>
  <div class="content">
    <p>${message}</p>
    ${actionUrl && actionText ? `
    <p style="text-align: center;">
      <a href="${actionUrl}" class="button">${actionText}</a>
    </p>
    ` : ''}
    <p>This is an automated notification from AirBuddy HR Platform.</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} AirBuddy Aerospace Pvt. Ltd.</p>
  </div>
</body>
</html>
  `;

  const text = `${subject}\n\n${message}\n\n${actionUrl ? `Action: ${actionText} - ${actionUrl}\n` : ''}\nThis is an automated notification from AirBuddy HR Platform.\n\n© ${new Date().getFullYear()} AirBuddy Aerospace Pvt. Ltd.`;

  return { subject, html, text };
}
