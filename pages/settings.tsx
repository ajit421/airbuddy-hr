// pages/settings.tsx
// Company settings page — view and edit HR/company configuration

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { CompanySettings } from '@/types/settings'
import { Settings, Save, Loader2, Building2, User, Hash } from 'lucide-react'

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
        method: 'PATCH',
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
            {Array.from({ length: 3 }).map((_, i) => (
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
            {/* Company Info */}
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
                    placeholder="123, Tech Park, Pune, Maharashtra 411001"
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

            {/* HR Signatory */}
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
                  placeholder="Priya Sharma"
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

            {/* Employee ID Config */}
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
                Employee IDs are generated as: <code className="text-indigo-400">{settings.employeeIdPrefix ?? 'AB'}-{settings.employeeIdYear ?? new Date().getFullYear()}-001</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
