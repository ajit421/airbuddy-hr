// pages/settings.tsx
// Company settings page — view and edit HR/company configuration
// Phase 11.3: Company Information + HR Signatory + HR Signature upload

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { CompanySettings } from '@/types/settings'
import {
  Settings,
  Save,
  Loader2,
  Building2,
  User,
  Hash,
  PenLine,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ImageOff,
} from 'lucide-react'
import Image from 'next/image'

const inputCls =
  'bg-[#0e1017] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50'

function SettingsField({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
}: {
  label: string
  id: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  readOnly?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-slate-400 text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`${inputCls} ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
    </div>
  )
}

// ─── Signature Section ────────────────────────────────────────────────────────

function SignatureSection({
  currentUrl,
  onUploaded,
}: {
  currentUrl: string
  onUploaded: (url: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null)
  const [imgError, setImgError] = useState(false)

  // Sync preview when parent loads
  useEffect(() => {
    if (currentUrl) {
      setPreviewUrl(currentUrl)
      setImgError(false)
    }
  }, [currentUrl])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    const allowed = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowed.includes(file.type)) {
      toast.error('Only PNG or JPG images are allowed.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum signature size is 2 MB.')
      return
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setImgError(false)

    setUploading(true)
    try {
      // Read as base64
      const base64 = await fileToBase64(file)

      const res = await fetch('/api/settings/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed.')
      }

      const data = await res.json()
      onUploaded(data.signatureUrl)
      toast.success('Signature uploaded successfully!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to upload signature.')
      // Revert preview
      setPreviewUrl(currentUrl || null)
    } finally {
      setUploading(false)
      // Reset file input so same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-6">
      <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
        <PenLine className="w-4 h-4 text-indigo-400" />
        HR Signature
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        This signature will be overlaid on all future PDF exports when the &ldquo;Add HR
        signature&rdquo; option is enabled.
      </p>

      {/* Warning banner */}
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 mb-5">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300">
          Uploading a new signature will immediately replace the existing one for all
          subsequent document exports.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Preview box */}
        <div className="flex-shrink-0">
          <p className="text-xs text-slate-400 mb-2">Current Signature</p>
          <div
            className="
              w-56 h-28 rounded-lg border border-white/[0.08]
              bg-white/[0.03] flex items-center justify-center overflow-hidden
            "
          >
            {previewUrl && !imgError ? (
              <div className="relative w-full h-full">
                <Image
                  src={previewUrl}
                  alt="HR Signature"
                  fill
                  style={{ objectFit: 'contain' }}
                  unoptimized
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-600">
                <ImageOff className="w-6 h-6" />
                <span className="text-xs">No signature uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload controls */}
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-400">
            Accepted formats: <span className="text-slate-300">PNG, JPG</span>
            <br />
            Maximum size: <span className="text-slate-300">2 MB</span>
          </p>

          <input
            ref={fileInputRef}
            id="signature-file-input"
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            id="btn-upload-signature"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="
              border-white/[0.08] bg-white/[0.02] text-slate-200
              hover:bg-white/[0.06] hover:text-white gap-2 w-fit
            "
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload New Signature
              </>
            )}
          </Button>

          {previewUrl && !imgError && !uploading && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Signature is set
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix: "data:image/png;base64,<actual_base64>"
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<CompanySettings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings)
      })
      .catch(() => toast.error('Failed to load settings.'))
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof CompanySettings) => (value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Settings saved successfully!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignatureUploaded = (url: string) => {
    setSettings((prev) => ({ ...prev, signatureStoragePath: url }))
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-400" />
              Company Settings
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure company details used in HR documents.
            </p>
          </div>
          <Button
            id="btn-save-settings"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
            ) : (
              <><Save className="w-4 h-4" />Save Settings</>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-[#13161e] p-6">
                <Skeleton className="h-5 w-40 bg-white/[0.05] mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <Skeleton key={j} className="h-10 bg-white/[0.05]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* ── Company Information ─────────────────────────────────────────── */}
            <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Company Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingsField
                  label="Company Name"
                  id="company-name"
                  value={settings.companyName ?? ''}
                  onChange={set('companyName')}
                  placeholder="AirBuddy Aerospace Pvt. Ltd."
                />
                <SettingsField
                  label="CIN Number"
                  id="company-cin"
                  value={settings.companyCIN ?? ''}
                  onChange={set('companyCIN')}
                  placeholder="U12345MH2024PTC123456"
                />
                <div className="sm:col-span-2">
                  <SettingsField
                    label="Company Address"
                    id="company-address"
                    value={settings.companyAddress ?? ''}
                    onChange={set('companyAddress')}
                    placeholder="Phi 4, Greater Noida, Uttar Pradesh 201310"
                  />
                </div>
                <SettingsField
                  label="Company Email"
                  id="company-email"
                  value={settings.companyEmail ?? ''}
                  onChange={set('companyEmail')}
                  placeholder="hr@airbuddy.in"
                  type="email"
                />
                <SettingsField
                  label="Company Phone"
                  id="company-phone"
                  value={settings.companyPhone ?? ''}
                  onChange={set('companyPhone')}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* ── HR Signatory ────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                HR Signatory
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SettingsField
                  label="HR Name"
                  id="hr-name"
                  value={settings.hrName ?? ''}
                  onChange={set('hrName')}
                  placeholder="hr name"
                />
                <SettingsField
                  label="HR Designation"
                  id="hr-designation"
                  value={settings.hrDesignation ?? ''}
                  onChange={set('hrDesignation')}
                  placeholder="Head of Human Resources"
                />
              </div>
            </div>

            {/* ── Employee ID Configuration ───────────────────────────────────── */}
            <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Hash className="w-4 h-4 text-indigo-400" />
                Employee ID Configuration
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SettingsField
                  label="Prefix"
                  id="emp-prefix"
                  value={settings.employeeIdPrefix ?? 'AB'}
                  onChange={set('employeeIdPrefix')}
                  placeholder="AB"
                />
                <SettingsField
                  label="Year"
                  id="emp-year"
                  value={String(settings.employeeIdYear ?? new Date().getFullYear())}
                  onChange={(v) => setSettings((prev) => ({ ...prev, employeeIdYear: Number(v) }))}
                  placeholder="2024"
                  type="number"
                />
                <SettingsField
                  label="Current Counter"
                  id="emp-counter"
                  value={String(settings.employeeIdCounter ?? 0)}
                  readOnly
                />
              </div>
              <p className="text-slate-500 text-xs mt-3">
                Employee IDs are generated as:{' '}
                <code className="text-indigo-400">
                  {settings.employeeIdPrefix ?? 'AB'}-
                  {settings.employeeIdYear ?? new Date().getFullYear()}-001
                </code>
              </p>
            </div>

            {/* ── HR Signature ────────────────────────────────────────────────── */}
            <SignatureSection
              currentUrl={settings.signatureStoragePath ?? ''}
              onUploaded={handleSignatureUploaded}
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
