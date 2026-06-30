// pages/test-email.tsx
// Test page for email functionality
// Access: /test-email (development only)

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send, Mail, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useEmail } from '@/hooks/useEmail';

// Only allow in development
if (process.env.NODE_ENV !== 'development') {
  // In production, redirect to home
  export default function TestEmailPage() {
    const router = useRouter();
    // This will only run in production
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return null;
  }
}

// Form schemas
const testEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  html: z.string().min(1, 'HTML content is required'),
  text: z.string().optional(),
});

const testTemplateSchema = z.object({
  to: z.string().email('Invalid email address'),
  templateType: z.enum(['salary_slip', 'document', 'welcome', 'notification']),
  month: z.string().optional(),
  documentTitle: z.string().optional(),
  message: z.string().optional(),
});

export default function TestEmailPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [testResults, setTestResults] = useState<{
    success: boolean;
    message: string;
    timestamp: string;
  }[]>([]);

  const { sendEmail, sendEmailWithPDF, state } = useEmail();

  // Basic email form
  const basicForm = useForm<z.infer<typeof testEmailSchema>>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      to: 'test@airbuddy.in',
      subject: 'Test Email from AirBuddy HR',
      html: '<p>This is a test email from AirBuddy HR Platform.</p><p>Email functionality is working correctly!</p>',
      text: 'This is a test email from AirBuddy HR Platform. Email functionality is working correctly!',
    },
  });

  // Template email form
  const templateForm = useForm<z.infer<typeof testTemplateSchema>>({
    resolver: zodResolver(testTemplateSchema),
    defaultValues: {
      to: 'test@airbuddy.in',
      templateType: 'notification',
      message: 'This is a test notification from AirBuddy HR Platform.',
    },
  });

  const handleBasicSubmit = basicForm.handleSubmit(async (data) => {
    try {
      const result = await sendEmail({
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      });

      setTestResults(prev => [
        ...prev,
        {
          success: true,
          message: `Email sent to ${data.to} - Message ID: ${result.messageId}`,
          timestamp: new Date().toISOString(),
        }
      ]);

      toast({
        title: 'Success',
        description: 'Test email sent successfully!',
        variant: 'success',
      });
    } catch (error) {
      setTestResults(prev => [
        ...prev,
        {
          success: false,
          message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        }
      ]);
    }
  });

  const handleTemplateSubmit = templateForm.handleSubmit(async (data) => {
    try {
      // For template testing, we'll use the notification template
      const result = await sendEmail({
        to: data.to,
        subject: `Test ${data.templateType} Email`,
        html: `<p>${data.message || 'Test message'}</p>`,
        text: data.message || 'Test message',
        templateType: data.templateType,
      });

      setTestResults(prev => [
        ...prev,
        {
          success: true,
          message: `Template email (${data.templateType}) sent to ${data.to} - Message ID: ${result.messageId}`,
          timestamp: new Date().toISOString(),
        }
      ]);

      toast({
        title: 'Success',
        description: `Test ${data.templateType} email sent successfully!`,
        variant: 'success',
      });
    } catch (error) {
      setTestResults(prev => [
        ...prev,
        {
          success: false,
          message: `Failed to send template email: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        }
      ]);
    }
  });

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">📧 Email Test Page</h1>
          <p className="text-muted-foreground">
            Test email functionality in development environment
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Basic Email</TabsTrigger>
            <TabsTrigger value="templates">Template Emails</TabsTrigger>
            <TabsTrigger value="results">Test Results</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Test Basic Email</CardTitle>
                <CardDescription>
                  Send a basic email with custom content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBasicSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="to">To</Label>
                    <Input
                      id="to"
                      {...basicForm.register('to')}
                      placeholder="recipient@email.com"
                    />
                    {basicForm.formState.errors.to && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.to.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      {...basicForm.register('subject')}
                      placeholder="Test Email Subject"
                    />
                    {basicForm.formState.errors.subject && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.subject.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="html">HTML Content</Label>
                    <Textarea
                      id="html"
                      {...basicForm.register('html')}
                      placeholder="<p>Your HTML content here</p>"
                      rows={5}
                    />
                    {basicForm.formState.errors.html && (
                      <p className="text-sm text-red-500">
                        {basicForm.formState.errors.html.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="text">Text Content (Optional)</Label>
                    <Textarea
                      id="text"
                      {...basicForm.register('text')}
                      placeholder="Plain text version"
                      rows={3}
                    />
                  </div>

                  <Button type="submit" disabled={state.isSending}>
                    {state.isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Test Email
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Test Template Emails</CardTitle>
                <CardDescription>
                  Test different email templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTemplateSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-to">To</Label>
                    <Input
                      id="template-to"
                      {...templateForm.register('to')}
                      placeholder="recipient@email.com"
                    />
                    {templateForm.formState.errors.to && (
                      <p className="text-sm text-red-500">
                        {templateForm.formState.errors.to.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="templateType">Template Type</Label>
                    <select
                      id="templateType"
                      {...templateForm.register('templateType')}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="notification">Notification</option>
                      <option value="salary_slip">Salary Slip</option>
                      <option value="document">Document</option>
                      <option value="welcome">Welcome</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      {...templateForm.register('message')}
                      placeholder="Custom message for the template"
                      rows={3}
                    />
                  </div>

                  <Button type="submit" disabled={state.isSending}>
                    {state.isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Template Email
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  View the results of your email tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No test results yet. Send a test email to see results here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={clearResults}>
                        Clear Results
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {testResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${
                            result.success
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {result.success ? (
                              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{result.message}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {new Date(result.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="font-semibold mb-2">⚠️ Important Notes</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
            <li>This page is only available in development mode</li>
            <li>Make sure your Resend API key is configured in .env.local</li>
            <li>Verify your sender email in Resend dashboard</li>
            <li>Test emails will be sent to the specified recipients</li>
            <li>All test emails are logged in the audit trail</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
