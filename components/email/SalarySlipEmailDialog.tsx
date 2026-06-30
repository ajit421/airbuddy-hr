// components/email/SalarySlipEmailDialog.tsx
// Dialog component specifically for sending salary slip emails

import { useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send, Mail, Calendar, IndianRupee } from 'lucide-react';
import { useEmail } from '@/hooks/useEmail';
import type { Employee } from '@/types/employee';
import type { DocumentRecord } from '@/types/document';

interface SalarySlipEmailDialogProps {
  employee: Partial<Employee>;
  salarySlipDocument?: DocumentRecord;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

// Form schema
const salarySlipFormSchema = z.object({
  to: z.string().email('Invalid email address'),
  month: z.string().min(1, 'Month is required'),
  customSubject: z.string().optional(),
  customMessage: z.string().optional(),
  addSignature: z.boolean().default(false),
});

type SalarySlipFormData = z.infer<typeof salarySlipFormSchema>;

// Get current month in "Month YYYY" format
function getCurrentMonth(): string {
  const date = new Date();
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function SalarySlipEmailDialog({
  employee,
  salarySlipDocument,
  trigger,
  onSuccess,
}: SalarySlipEmailDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const { sendSalarySlipEmail, state } = useEmail();

  const form = useForm<SalarySlipFormData>({
    resolver: zodResolver(salarySlipFormSchema),
    defaultValues: {
      to: employee.email || '',
      month: getCurrentMonth(),
      customSubject: '',
      customMessage: '',
      addSignature: false,
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue } = form;

  const onSubmit = handleSubmit(async (data: SalarySlipFormData) => {
    if (!employee.id) {
      toast({ title: 'Error', description: 'Employee ID is required', variant: 'error' });
      return;
    }

    if (!salarySlipDocument) {
      toast({ 
        title: 'Error', 
        description: 'No salary slip document found for this employee', 
        variant: 'error' 
      });
      return;
    }

    setIsSending(true);

    try {
      // Find the latest version
      const latestVersion = salarySlipDocument.versions?.[0];
      
      if (!latestVersion) {
        throw new Error('No version found for salary slip document');
      }

      await sendSalarySlipEmail(
        employee.id,
        salarySlipDocument.id,
        latestVersion.id,
        data.month,
        {
          customEmail: data.to,
          customSubject: data.customSubject,
          customMessage: data.customMessage,
          addSignature: data.addSignature,
        }
      );

      onSuccess?.();
      setOpen(false);
      form.reset();
    } catch (error) {
      // Error is already handled by useEmail hook
    } finally {
      setIsSending(false);
    }
  });

  // Format salary for display
  const displaySalary = employee.salary 
    ? `₹${employee.salary.toLocaleString('en-IN')}` 
    : 'Not set';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Email Salary Slip
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Email Salary Slip</DialogTitle>
          <DialogDescription>
            Send salary slip to {employee.fullName || 'this employee'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info Card */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-3">Employee Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{employee.fullName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee ID:</span>
                <span>{employee.employeeId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Designation:</span>
                <span>{employee.designation || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Salary:</span>
                <span>{displaySalary}</span>
              </div>
            </div>
          </div>

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
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                {...register('month')}
                placeholder="January 2024"
              />
              {errors.month && (
                <p className="text-sm text-red-500">{errors.month.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customSubject">Custom Subject (Optional)</Label>
              <Input
                id="customSubject"
                {...register('customSubject')}
                placeholder="e.g., Your January 2024 Salary Slip"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Message (Optional)</Label>
              <Textarea
                id="customMessage"
                {...register('customMessage')}
                placeholder="Add a personal message to include in the email"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="addSignature"
                {...register('addSignature')}
              />
              <Label htmlFor="addSignature" className="text-sm font-normal">
                Add HR Signature to Salary Slip PDF
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
                    Send Salary Slip
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SalarySlipEmailDialog;
