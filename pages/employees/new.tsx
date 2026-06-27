/* eslint-disable react-hooks/incompatible-library */
// pages/employees/new.tsx
// Create employee form — react-hook-form + zod validation

import { useState } from 'react'
import { useRouter } from 'next/router'
import { useForm, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { DEPARTMENTS } from '@/constants/departments'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ── Zod schema ─────────────────────────────────────────────────────────────

const employeeSchema = z.object({
  // Required
  fullName:    z.string().min(2, 'Full name is required'),
  email:       z.string().email('Valid email required'),
  mobile:      z.string().min(10, 'Mobile number required').max(15),
  department:  z.string().min(1, 'Department is required'),
  designation: z.string().min(2, 'Designation is required'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  status:      z.enum(['intern', 'full-time', 'contract', 'resigned', 'terminated']),
  // Optional
  fatherName:     z.string().optional(),
  dateOfBirth:    z.string().optional(),
  gender:         z.enum(['male', 'female', 'other']).optional(),
  aadhaarNumber:  z.string().optional(),
  panNumber:      z.string().optional(),
  salary:         z.coerce.number().optional(),
  // Address
  addressStreet:  z.string().optional(),
  addressCity:    z.string().optional(),
  addressState:   z.string().optional(),
  addressPincode: z.string().optional(),
  // Bank
  bankName:        z.string().optional(),
  accountNumber:   z.string().optional(),
  ifscCode:        z.string().optional(),
  accountType:     z.enum(['savings', 'current']).optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

// ── Section component ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-6">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  error,
  children,
  full,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <Label className="text-slate-300 text-[13px] mb-1.5 block">
        {label} {required && <span className="text-red-400">*</span>}
      </Label>
      {children}
      {error && <p className="text-red-400 text-[11px] mt-1">{error}</p>}
    </div>
  )
}

function FormInput({ className = '', ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={`bg-[#0f1117] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/50 ${className}`}
    />
  )
}

function FormSelect({
  value,
  onValueChange,
  options,
  placeholder,
}: {
  value: string
  onValueChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}) {
  return (
    <Select value={value} onValueChange={(v: string | null) => onValueChange(v ?? '')}>
      <SelectTrigger className="bg-[#0f1117] border-white/[0.08] text-slate-100 focus:ring-indigo-500/50">
        <SelectValue placeholder={placeholder ?? 'Select…'} />
      </SelectTrigger>
      <SelectContent className="bg-[#13161e] border-white/[0.08] text-slate-200">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="focus:bg-indigo-600/20">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function NewEmployeePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema) as unknown as Resolver<EmployeeFormData>,
    defaultValues: { status: 'full-time' },
  })

  const onSubmit = async (data: EmployeeFormData) => {
    setSubmitting(true)
    try {
      const payload = {
        fullName:    data.fullName,
        email:       data.email,
        mobile:      data.mobile,
        department:  data.department,
        designation: data.designation,
        joiningDate: data.joiningDate,
        status:      data.status,
        fatherName:     data.fatherName ?? '',
        dateOfBirth:    data.dateOfBirth ?? '',
        gender:         data.gender ?? '',
        aadhaarNumber:  data.aadhaarNumber ?? '',
        panNumber:      data.panNumber ?? '',
        salary:         data.salary ?? 0,
        profilePhotoPath: '',
        address: {
          street:  data.addressStreet ?? '',
          city:    data.addressCity ?? '',
          state:   data.addressState ?? '',
          pincode: data.addressPincode ?? '',
        },
        bankDetails: {
          bankName:      data.bankName ?? '',
          accountNumber: data.accountNumber ?? '',
          ifscCode:      data.ifscCode ?? '',
          accountType:   data.accountType ?? 'savings',
        },
      }

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create employee')

      toast.success(`Employee ${json.employeeId} created successfully!`)
      router.push(`/employees/${json.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(msg)
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-5xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/employees">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-5 bg-white/10" />
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Add Employee</h1>
            <p className="text-sm text-slate-400 mt-0.5">Fill in the details below. Required fields are marked with *</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Basic Info */}
          <Section title="Basic Information">
            <Field label="Full Name" required error={errors.fullName?.message}>
              <FormInput id="fullName" placeholder="Enter Full Name" {...register('fullName')} />
            </Field>
            <Field label="Email" required error={errors.email?.message}>
              <FormInput id="email" type="email" placeholder="Enter Email Address" {...register('email')} />
            </Field>
            <Field label="Mobile" required error={errors.mobile?.message}>
              <FormInput id="mobile" placeholder="Enter Mobile Number" {...register('mobile')} />
            </Field>
            <Field label="Father's Name" error={errors.fatherName?.message}>
              <FormInput id="fatherName" placeholder="Enter Father's Name" {...register('fatherName')} />
            </Field>
            <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
              <FormInput id="dateOfBirth" type="date" {...register('dateOfBirth')}
                className="bg-[#0f1117] border-white/[0.08] text-slate-100 focus-visible:ring-indigo-500/50 [color-scheme:dark]"
              />
            </Field>
            <Field label="Gender" error={errors.gender?.message}>
              <FormSelect
                value={watch('gender') ?? ''}
                onValueChange={(v) => setValue('gender', v as EmployeeFormData['gender'])}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                placeholder="Select gender"
              />
            </Field>
          </Section>

          {/* Employment */}
          <Section title="Employment Details">
            <Field label="Department" required error={errors.department?.message}>
              <FormSelect
                value={watch('department') ?? ''}
                onValueChange={(v) => setValue('department', v)}
                options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                placeholder="Select department"
              />
            </Field>
            <Field label="Designation" required error={errors.designation?.message}>
              <FormInput id="designation" placeholder="e.g. Software Engineer" {...register('designation')} />
            </Field>
            <Field label="Joining Date" required error={errors.joiningDate?.message}>
              <FormInput id="joiningDate" type="date" {...register('joiningDate')}
                className="bg-[#0f1117] border-white/[0.08] text-slate-100 focus-visible:ring-indigo-500/50 [color-scheme:dark]"
              />
            </Field>
            <Field label="Status" required error={errors.status?.message}>
              <FormSelect
                value={watch('status') ?? 'full-time'}
                onValueChange={(v) => setValue('status', v as EmployeeFormData['status'])}
                options={[
                  { value: 'full-time',  label: 'Full-Time' },
                  { value: 'intern',     label: 'Intern' },
                  { value: 'contract',   label: 'Contract' },
                  { value: 'resigned',   label: 'Resigned' },
                  { value: 'terminated', label: 'Terminated' },
                ]}
              />
            </Field>
            <Field label="Monthly Salary (₹)" error={errors.salary?.message}>
              <FormInput id="salary" type="number" placeholder="Enter Monthly Salary" {...register('salary')} />
            </Field>
          </Section>

          {/* Government IDs */}
          <Section title="Government IDs">
            <Field label="Aadhaar Number" error={errors.aadhaarNumber?.message}>
              <FormInput id="aadhaarNumber" placeholder="e.g. 1234 5678 9012" {...register('aadhaarNumber')} />
            </Field>
            <Field label="PAN Number" error={errors.panNumber?.message}>
              <FormInput id="panNumber" placeholder="e.g. ABCDE1234F" {...register('panNumber')} className="uppercase" />
            </Field>
          </Section>

          {/* Address */}
          <Section title="Address">
            <Field label="Street" full error={errors.addressStreet?.message}>
              <FormInput id="addressStreet" placeholder="House no., Street name" {...register('addressStreet')} />
            </Field>
            <Field label="City" error={errors.addressCity?.message}>
              <FormInput id="addressCity" placeholder="City" {...register('addressCity')} />
            </Field>
            <Field label="State" error={errors.addressState?.message}>
              <FormInput id="addressState" placeholder="Enter State" {...register('addressState')} />
            </Field>
            <Field label="Pincode" error={errors.addressPincode?.message}>
              <FormInput id="addressPincode" placeholder="Enter Pincode" {...register('addressPincode')} />
            </Field>
          </Section>

          {/* Bank Details */}
          <Section title="Bank Details">
            <Field label="Bank Name" error={errors.bankName?.message}>
              <FormInput id="bankName" placeholder="e.g. HDFC Bank" {...register('bankName')} />
            </Field>
            <Field label="Account Number" error={errors.accountNumber?.message}>
              <FormInput id="accountNumber" placeholder="Account number" {...register('accountNumber')} />
            </Field>
            <Field label="IFSC Code" error={errors.ifscCode?.message}>
              <FormInput id="ifscCode" placeholder="e.g. HDFC0001234" className="uppercase" {...register('ifscCode')} />
            </Field>
            <Field label="Account Type" error={errors.accountType?.message}>
              <FormSelect
                value={watch('accountType') ?? ''}
                onValueChange={(v) => setValue('accountType', v as EmployeeFormData['accountType'])}
                options={[
                  { value: 'savings', label: 'Savings' },
                  { value: 'current', label: 'Current' },
                ]}
                placeholder="Select type"
              />
            </Field>
          </Section>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/employees">
              <Button type="button" variant="ghost" className="text-slate-400 hover:text-white">
                Cancel
              </Button>
            </Link>
            <Button
              id="btn-save-employee"
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[140px]"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
              ) : (
                'Save Employee'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
