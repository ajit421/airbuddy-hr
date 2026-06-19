// components/employees/OCRReviewForm.tsx
// Displays extracted OCR data in editable inputs for HR review.
// Allows confirming and saving the data to the employee profile.

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, PenLine, X } from 'lucide-react'
import type { FileType } from '@/types/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface OCRReviewFormProps {
  employeeId: string
  fileId: string
  fileType: FileType
  ocrData: Record<string, any>
  onSaved: () => void
  onDismiss: () => void
}

// ── Component ──────────────────────────────────────────────────────────────

const inputCls =
  'bg-[#0a0c10] border-white/[0.08] text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/50 h-9 text-sm'

export default function OCRReviewForm({
  employeeId,
  fileId,
  fileType,
  ocrData,
  onSaved,
  onDismiss,
}: OCRReviewFormProps) {
  const [saving, setSaving] = useState(false)

  // ── Aadhaar fields ─────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(ocrData.fullName ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(ocrData.dateOfBirth ?? '')
  const [gender, setGender] = useState(ocrData.gender ?? '')
  const [aadhaarNumber, setAadhaarNumber] = useState(ocrData.aadhaarNumber ?? '')
  const [street, setStreet] = useState(ocrData.address?.street ?? '')
  const [city, setCity] = useState(ocrData.address?.city ?? '')
  const [state, setState] = useState(ocrData.address?.state ?? '')
  const [pincode, setPincode] = useState(ocrData.address?.pincode ?? '')

  // ── PAN fields ─────────────────────────────────────────────────────────
  const [fatherName, setFatherName] = useState(ocrData.fatherName ?? '')
  const [panNumber, setPanNumber] = useState(ocrData.panNumber ?? '')

  // ── Determine which fields to show ─────────────────────────────────────
  const isAadhaar = fileType === 'aadhaar'
  const isPan = fileType === 'pan'

  // ── Save handler ───────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true)
    try {
      // Build the update payload based on file type
      const payload: Record<string, any> = {}

      if (isAadhaar) {
        if (fullName) payload.fullName = fullName
        if (dateOfBirth) payload.dateOfBirth = dateOfBirth
        if (gender) payload.gender = gender.toLowerCase()
        if (aadhaarNumber) payload.aadhaarNumber = aadhaarNumber
        if (street || city || state || pincode) {
          payload.address = { street, city, state, pincode }
        }
      }

      if (isPan) {
        if (fullName) payload.fullName = fullName
        if (fatherName) payload.fatherName = fatherName
        if (dateOfBirth) payload.dateOfBirth = dateOfBirth
        if (panNumber) payload.panNumber = panNumber.toUpperCase()
      }

      // PATCH employee with confirmed OCR data
      const empRes = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!empRes.ok) {
        throw new Error((await empRes.json()).error ?? 'Failed to update employee')
      }

      // Mark the file as OCR reviewed
      // We call the files API to update the file doc — but since we don't have
      // a dedicated PATCH endpoint, we track this via audit log metadata
      // The file doc already has ocrStatus: 'completed' from the OCR extraction step

      toast.success('OCR data saved to employee profile!')
      onSaved()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save OCR data')
    } finally {
      setSaving(false)
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────

  function Field({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
  }) {
    const isEmpty = !value || value.trim() === ''
    return (
      <div>
        <Label className="text-slate-400 text-[12px] mb-1 block">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} ${isEmpty ? 'border-amber-500/40 bg-amber-500/5' : ''}`}
        />
        {isEmpty && (
          <p className="text-amber-400 text-[10px] mt-0.5">Not detected — please enter manually</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-[#13161e] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/15">
            <PenLine className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Review {isAadhaar ? 'Aadhaar' : 'PAN'} OCR Data
            </h3>
            <p className="text-[11px] text-slate-500">
              Verify and correct the extracted fields, then save to profile.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 h-8 w-8 p-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Amber banner for empty fields */}
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
        <span className="text-amber-400 text-[11px] leading-relaxed">
          ⚠️ Fields highlighted in amber were not detected by OCR. Please fill them manually or leave blank if not applicable.
        </span>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Full name" />
        <Field label="Date of Birth" value={dateOfBirth} onChange={setDateOfBirth} placeholder="DD/MM/YYYY or YYYY-MM-DD" />

        {isAadhaar && (
          <>
            <Field label="Gender" value={gender} onChange={setGender} placeholder="Male / Female / Other" />
            <Field label="Aadhaar Number" value={aadhaarNumber} onChange={setAadhaarNumber} placeholder="XXXX XXXX XXXX" />
            <Field label="Street / Address Line" value={street} onChange={setStreet} placeholder="House no, street" />
            <Field label="City" value={city} onChange={setCity} placeholder="City" />
            <Field label="State" value={state} onChange={setState} placeholder="State" />
            <Field label="Pincode" value={pincode} onChange={setPincode} placeholder="560001" />
          </>
        )}

        {isPan && (
          <>
            <Field label="Father's Name" value={fatherName} onChange={setFatherName} placeholder="Father's name" />
            <Field label="PAN Number" value={panNumber} onChange={setPanNumber} placeholder="ABCDE1234F" />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white text-[13px]"
        >
          Enter Manually Later
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 min-w-[180px] text-[13px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirm & Save to Profile
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
