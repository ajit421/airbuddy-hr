// pages/employees/[id]/index.tsx
// Employee detail page — read/edit toggle, tabs: Overview | Files | Documents

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { DEPARTMENTS } from '@/constants/departments'
import type { Employee, EmployeeStatus } from '@/types/employee'
import {
  ArrowLeft, Pencil, X, Save, Trash2, FilePlus, Loader2
} from 'lucide-react'

// ── Status badge ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<EmployeeStatus, { label: string; className: string }> = {
  'full-time': { label: 'Full-Time', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  intern:      { label: 'Intern',    className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  contract:    { label: 'Contract',  className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  resigned:    { label: 'Resigned',  className: 'bg-red-500/15 text-red-400 border-red-500/25' },
  terminated:  { label: 'Terminated',className: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: '' }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── Edit schema ─────────────────────────────────────────────────────────────
const editSchema = z.object({
  fullName:    z.string().min(2),
  email:       z.string().email(),
  mobile:      z.string().min(10),
  department:  z.string().min(1),
  designation: z.string().min(2),
  joiningDate: z.string().min(1),
  status:      z.enum(['intern', 'full-time', 'contract', 'resigned', 'terminated']),
  fatherName:     z.string().optional(),
  dateOfBirth:    z.string().optional(),
  gender:         z.enum(['male', 'female', 'other']).optional(),
  aadhaarNumber:  z.string().optional(),
  panNumber:      z.string().optional(),
  salary:         z.coerce.number().optional(),
  addressStreet:  z.string().optional(),
  addressCity:    z.string().optional(),
  addressState:   z.string().optional(),
  addressPincode: z.string().optional(),
  bankName:       z.string().optional(),
  accountNumber:  z.string().optional(),
  ifscCode:       z.string().optional(),
  accountType:    z.enum(['savings', 'current']).optional(),
})
type EditFormData = z.infer<typeof editSchema>

// ── Display helpers ─────────────────────────────────────────────────────────
function ReadRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-[14px] text-slate-100">{value || <span className="text-slate-600 italic">—</span>}</span>
    </div>
  )
}

function EditInput({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-slate-400 text-[12px] mb-1 block">{label}</Label>
      {children}
      {error && <p className="text-red-400 text-[11px] mt-0.5">{error}</p>}
    </div>
  )
}

const inputCls = 'bg-[#0a0c10] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/50 h-9 text-sm'

function ESelect({ value, onValueChange, options, placeholder }: {
  value: string; onValueChange: (v: string) => void
  options: Array<{ value: string; label: string }>; placeholder?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`${inputCls} w-full`}>
        <SelectValue placeholder={placeholder ?? 'Select…'} />
      </SelectTrigger>
      <SelectContent className="bg-[#13161e] border-white/[0.08] text-slate-200">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="focus:bg-indigo-600/20 text-sm">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const router = useRouter()
  const { id } = router.query as { id: string }
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<EditFormData>({ resolver: zodResolver(editSchema) as any })

  useEffect(() => {
    if (!id) return
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEmployee(data.employee)
        populateForm(data.employee)
      })
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => setLoading(false))
  }, [id])

  function populateForm(emp: Employee) {
    reset({
      fullName:       emp.fullName,
      email:          emp.email,
      mobile:         emp.mobile,
      department:     emp.department,
      designation:    emp.designation,
      joiningDate:    emp.joiningDate,
      status:         emp.status,
      fatherName:     emp.fatherName,
      dateOfBirth:    emp.dateOfBirth,
      gender:         emp.gender,
      aadhaarNumber:  emp.aadhaarNumber,
      panNumber:      emp.panNumber,
      salary:         emp.salary,
      addressStreet:  emp.address?.street,
      addressCity:    emp.address?.city,
      addressState:   emp.address?.state,
      addressPincode: emp.address?.pincode,
      bankName:        emp.bankDetails?.bankName,
      accountNumber:   emp.bankDetails?.accountNumber,
      ifscCode:        emp.bankDetails?.ifscCode,
      accountType:     emp.bankDetails?.accountType,
    })
  }

  const onSave = async (data: EditFormData) => {
    setSaving(true)
    try {
      const payload = {
        fullName: data.fullName, email: data.email, mobile: data.mobile,
        department: data.department, designation: data.designation,
        joiningDate: data.joiningDate, status: data.status,
        fatherName: data.fatherName ?? '', dateOfBirth: data.dateOfBirth ?? '',
        gender: data.gender ?? '', aadhaarNumber: data.aadhaarNumber ?? '',
        panNumber: data.panNumber ?? '', salary: data.salary ?? 0,
        address: {
          street: data.addressStreet ?? '', city: data.addressCity ?? '',
          state: data.addressState ?? '', pincode: data.addressPincode ?? '',
        },
        bankDetails: {
          bankName: data.bankName ?? '', accountNumber: data.accountNumber ?? '',
          ifscCode: data.ifscCode ?? '', accountType: data.accountType ?? 'savings',
        },
      }

      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)

      // Refresh employee data
      const fresh = await fetch(`/api/employees/${id}`).then((r) => r.json())
      setEmployee(fresh.employee)
      setEditMode(false)
      toast.success('Employee updated successfully')
    } catch (err: any) {
      toast.error(err.message ?? 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!confirm(`Soft-delete ${employee?.fullName}? They will be hidden from the employee list but their data is preserved.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Employee deleted')
      router.push('/employees')
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
      setDeleting(false)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl flex flex-col gap-6">
          <Skeleton className="h-8 w-64 bg-white/[0.05]" />
          <Skeleton className="h-40 w-full bg-white/[0.05]" />
          <Skeleton className="h-60 w-full bg-white/[0.05]" />
        </div>
      </AppLayout>
    )
  }

  if (!employee) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-slate-400">Employee not found.</div>
      </AppLayout>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-5xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/employees">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5 bg-white/10" />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-semibold text-white">{employee.fullName}</h1>
                <StatusBadge status={employee.status} />
              </div>
              <p className="text-sm text-slate-400 mt-0.5 font-mono">{employee.employeeId}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Link href={`/documents/generate?employeeId=${id}`}>
              <Button id="btn-generate-doc" size="sm" className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 gap-1.5">
                <FilePlus className="w-3.5 h-3.5" /> Generate Doc
              </Button>
            </Link>

            {!editMode ? (
              <Button
                id="btn-edit-employee"
                size="sm"
                onClick={() => setEditMode(true)}
                className="bg-white/[0.06] hover:bg-white/[0.10] text-slate-200 gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setEditMode(false); populateForm(employee) }}
                className="text-slate-400 hover:text-white gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            )}

            <Button
              id="btn-delete-employee"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 gap-1.5"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex flex-col gap-4">
          <TabsList className="bg-[#13161e] border border-white/[0.06] w-fit">
            <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Overview</TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Files</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Documents</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ─────────────────────────────────────────── */}
          <TabsContent value="overview">
            {editMode ? (
              <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-4">
                {/* Basic */}
                <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-5">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Basic Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <EditInput label="Full Name *" error={errors.fullName?.message}>
                      <Input {...register('fullName')} className={inputCls} />
                    </EditInput>
                    <EditInput label="Email *" error={errors.email?.message}>
                      <Input {...register('email')} type="email" className={inputCls} />
                    </EditInput>
                    <EditInput label="Mobile *" error={errors.mobile?.message}>
                      <Input {...register('mobile')} className={inputCls} />
                    </EditInput>
                    <EditInput label="Father's Name">
                      <Input {...register('fatherName')} className={inputCls} />
                    </EditInput>
                    <EditInput label="Date of Birth">
                      <Input {...register('dateOfBirth')} type="date" className={`${inputCls} [color-scheme:dark]`} />
                    </EditInput>
                    <EditInput label="Gender">
                      <ESelect value={watch('gender') ?? ''} onValueChange={(v) => setValue('gender', v as any)}
                        options={[{value:'male',label:'Male'},{value:'female',label:'Female'},{value:'other',label:'Other'}]} />
                    </EditInput>
                  </div>
                </div>
                {/* Employment */}
                <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-5">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Employment</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <EditInput label="Department *" error={errors.department?.message}>
                      <ESelect value={watch('department') ?? ''} onValueChange={(v) => setValue('department', v)}
                        options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} />
                    </EditInput>
                    <EditInput label="Designation *" error={errors.designation?.message}>
                      <Input {...register('designation')} className={inputCls} />
                    </EditInput>
                    <EditInput label="Joining Date *" error={errors.joiningDate?.message}>
                      <Input {...register('joiningDate')} type="date" className={`${inputCls} [color-scheme:dark]`} />
                    </EditInput>
                    <EditInput label="Status *" error={errors.status?.message}>
                      <ESelect value={watch('status') ?? 'full-time'} onValueChange={(v) => setValue('status', v as any)}
                        options={[
                          {value:'full-time',label:'Full-Time'},{value:'intern',label:'Intern'},
                          {value:'contract',label:'Contract'},{value:'resigned',label:'Resigned'},
                          {value:'terminated',label:'Terminated'},
                        ]} />
                    </EditInput>
                    <EditInput label="Salary (₹)">
                      <Input {...register('salary')} type="number" className={inputCls} />
                    </EditInput>
                  </div>
                </div>
                {/* IDs */}
                <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-5">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Government IDs</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditInput label="Aadhaar"><Input {...register('aadhaarNumber')} className={inputCls} /></EditInput>
                    <EditInput label="PAN"><Input {...register('panNumber')} className={`${inputCls} uppercase`} /></EditInput>
                  </div>
                </div>
                {/* Address */}
                <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-5">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Address</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 lg:col-span-3">
                      <EditInput label="Street"><Input {...register('addressStreet')} className={inputCls} /></EditInput>
                    </div>
                    <EditInput label="City"><Input {...register('addressCity')} className={inputCls} /></EditInput>
                    <EditInput label="State"><Input {...register('addressState')} className={inputCls} /></EditInput>
                    <EditInput label="Pincode"><Input {...register('addressPincode')} className={inputCls} /></EditInput>
                  </div>
                </div>
                {/* Bank */}
                <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-5">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Bank Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <EditInput label="Bank Name"><Input {...register('bankName')} className={inputCls} /></EditInput>
                    <EditInput label="Account Number"><Input {...register('accountNumber')} className={inputCls} /></EditInput>
                    <EditInput label="IFSC Code"><Input {...register('ifscCode')} className={`${inputCls} uppercase`} /></EditInput>
                    <EditInput label="Account Type">
                      <ESelect value={watch('accountType') ?? ''} onValueChange={(v) => setValue('accountType', v as any)}
                        options={[{value:'savings',label:'Savings'},{value:'current',label:'Current'}]} />
                    </EditInput>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" className="text-slate-400 hover:text-white"
                    onClick={() => { setEditMode(false); populateForm(employee) }}>
                    Cancel
                  </Button>
                  <Button id="btn-save-edits" type="submit" disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[140px]">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                  </Button>
                </div>
              </form>
            ) : (
              /* Read mode */
              <div className="flex flex-col gap-4">
                {[
                  {
                    title: 'Basic Information',
                    fields: [
                      { label: 'Full Name',    value: employee.fullName },
                      { label: 'Email',        value: employee.email },
                      { label: 'Mobile',       value: employee.mobile },
                      { label: "Father's Name",value: employee.fatherName },
                      { label: 'Date of Birth',value: employee.dateOfBirth },
                      { label: 'Gender',       value: employee.gender },
                    ],
                  },
                  {
                    title: 'Employment',
                    fields: [
                      { label: 'Department',   value: employee.department },
                      { label: 'Designation',  value: employee.designation },
                      { label: 'Joining Date', value: employee.joiningDate },
                      { label: 'Status',       value: employee.status },
                      { label: 'Salary',       value: employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : undefined },
                    ],
                  },
                  {
                    title: 'Government IDs',
                    fields: [
                      { label: 'Aadhaar', value: employee.aadhaarNumber },
                      { label: 'PAN',     value: employee.panNumber },
                    ],
                  },
                  {
                    title: 'Address',
                    fields: [
                      { label: 'Street',  value: employee.address?.street },
                      { label: 'City',    value: employee.address?.city },
                      { label: 'State',   value: employee.address?.state },
                      { label: 'Pincode', value: employee.address?.pincode },
                    ],
                  },
                  {
                    title: 'Bank Details',
                    fields: [
                      { label: 'Bank Name',       value: employee.bankDetails?.bankName },
                      { label: 'Account Number',  value: employee.bankDetails?.accountNumber },
                      { label: 'IFSC Code',       value: employee.bankDetails?.ifscCode },
                      { label: 'Account Type',    value: employee.bankDetails?.accountType },
                    ],
                  },
                ].map((section) => (
                  <div key={section.title} className="rounded-xl border border-white/[0.06] bg-[#13161e] p-5">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{section.title}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {section.fields.map((f) => (
                        <ReadRow key={f.label} label={f.label} value={f.value} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Files Tab (built in Phase 6) ─────────────────────────── */}
          <TabsContent value="files">
            <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-8 text-center">
              <p className="text-slate-400 text-sm">
                📎 File upload and OCR will be built in Phase 6.
              </p>
            </div>
          </TabsContent>

          {/* ── Documents Tab (built in Phase 14) ───────────────────── */}
          <TabsContent value="documents">
            <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-8 text-center">
              <p className="text-slate-400 text-sm">
                📄 Document history will be built in Phase 14.
              </p>
              <Link href={`/documents/generate?employeeId=${id}`}>
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                  <FilePlus className="w-4 h-4" /> Generate Document Now
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
