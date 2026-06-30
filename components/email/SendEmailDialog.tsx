// components/email/SendEmailDialog.tsx
// Dialog component for sending emails with documents

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send, Mail, FileText } from 'lucide-react';
import { useEmail } from '@/hooks/useEmail';
import type { Employee } from '@/types/employee';
import type { DocumentRecord } from '@/types/document';

interface SendEmailDialogProps {
  employee: Partial<Employee>;
  documents?: DocumentRecord[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

// Form schema
const emailFormSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().optional(),
  documentId: z.string().optional(),
  versionId: z.string().optional(),
  documentType: z.string().optional(),
  addSignature: z.boolean().default(false),
  sendAsAttachment: z.boolean().default(true),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

export function SendEmailDialog({
  employee,
  documents = [],
  trigger,
  onSuccess,
}: SendEmailDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  
  const { sendEmail, sendEmailWithPDF, state } = useEmail();

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      to: employee.email || '',
      subject: `Document for ${employee.fullName || 'Employee'}`,
      message: '',
      addSignature: false,
      sendAsAttachment: true,
    },
  });

  const { watch, setValue, register, handleSubmit, formState: { errors } } = form;
  const watchDocumentId = watch('documentId');

  // Update subject when document changes
  useEffect(() => {
    if (selectedDocument) {
      setValue('subject', `Your ${selectedDocument.documentType || 'Document'} - ${selectedDocument.documentTitle || 'Untitled'}`);
    }
  }, [selectedDocument, setValue]);

  // Handle document selection
  const handleDocumentSelect = (doc: DocumentRecord) => {
    setSelectedDocument(doc);
    setValue('documentId', doc.id);
    setValue('documentType', doc.documentType);
    
    // Find the latest version
    if (doc.versions && doc.versions.length > 0) {
      const latestVersion = doc.versions[0];
      setValue('versionId', latestVersion.id);
    }
  };

  const onSubmit = handleSubmit(async (data: EmailFormData) => {
    if (!employee.id) {
      toast({ title: 'Error', description: 'Employee ID is required', variant: 'error' });
      return;
    }

    setIsSending(true);

    try {
      if (data.documentId && data.versionId && data.sendAsAttachment) {
        // Send with PDF attachment
        await sendEmailWithPDF({
          employeeId: employee.id,
          documentId: data.documentId,
          versionId: data.versionId,
          documentTitle: selectedDocument?.documentTitle || data.subject,
          documentType: data.documentType || selectedDocument?.documentType || '',
          templateType: 'document',
          addSignature: data.addSignature,
          customEmail: data.to,
          customSubject: data.subject,
          customMessage: data.message,
        });
      } else {
        // Send regular email
        await sendEmail({
          to: data.to,
          subject: data.subject,
          html: `<p>${data.message || 'Please see the attached document.'}</p>`,
          text: data.message || 'Please see the attached document.',
          templateType: 'notification',
        });
      }

      onSuccess?.();
      setOpen(false);
      form.reset();
      setSelectedDocument(null);
    } catch (error) {
      // Error is already handled by useEmail hook
    } finally {
      setIsSending(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Email to Employee</DialogTitle>
          <DialogDescription>
            Send documents or messages to {employee.fullName || 'this employee'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              {...register('to')}
              placeholder="employee@company.com"
            />
            {errors.to && (
              <p className="text-sm text-red-500">{errors.to.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              {...register('subject')}
              placeholder="Enter email subject"
            />
            {errors.subject && (
              <p className="text-sm text-red-500">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentId">Attach Document (Optional)</Label>
            <Select
              value={watchDocumentId}
              onValueChange={(value) => {
                const doc = documents.find(d => d.id === value);
                handleDocumentSelect(doc || documents[0]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a document to attach" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      {doc.documentTitle || doc.documentType || 'Untitled'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDocument && (
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                Selected: <strong>{selectedDocument.documentTitle || selectedDocument.documentType}</strong>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              {...register('message')}
              placeholder="Add a personal message (optional)"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="addSignature"
              {...register('addSignature')}
            />
            <Label htmlFor="addSignature" className="text-sm font-normal">
              Add HR Signature to PDF
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendAsAttachment"
              {...register('sendAsAttachment')}
              disabled={!watchDocumentId}
            />
            <Label htmlFor="sendAsAttachment" className="text-sm font-normal">
              Send Document as PDF Attachment
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSending || state.isSending}>
              {isSending || state.isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SendEmailDialog;
