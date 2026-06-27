// components/templates/TemplateForm.tsx
// Shared form component for creating and editing templates.
// Used by both pages/templates/new.tsx and pages/templates/[id].tsx
//
// For type === 'certificate': shows PNG upload + preview (no markdown editor).
// For all other types: shows markdown editor + variable picker (unchanged).

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import type { Template, DocumentType } from '@/types/template'
import type { EmployeeStatus } from '@/types/employee'
import {
  VARIABLE_REGISTRY,
  EMPLOYEE_VARIABLES,
  SETTINGS_VARIABLES,
  COMPUTED_VARIABLES,
} from '@/constants/variable-registry'
import { DOCUMENT_TYPE_LABELS, ALL_DOCUMENT_TYPES } from '@/constants/document-types'
import { extractVariables } from '@/lib/templates/extract-variables'
import {
  Save,
  Variable,
  User,
  Building2,
  CalendarDays,
  Info,
  Upload,
  ImageOff,
  Loader2,
  Award,
} from 'lucide-react'
import Image from 'next/image'

// Lazy-load the markdown editor to avoid SSR issues
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────

interface TemplateFormProps {
  initial?: Template
  mode: 'create' | 'edit'
}

// ── Constants ─────────────────────────────────────────────────────────────

const ALL_STATUSES: EmployeeStatus[] = ['intern', 'full-time', 'contract', 'resigned', 'terminated']
const STATUS_LABELS: Record<EmployeeStatus, string> = {
  intern: 'Intern',
  'full-time': 'Full-Time',
  contract: 'Contract',
  resigned: 'Resigned',
  terminated: 'Terminated',
}

// Group variables for display in the picker panel
const VARIABLE_GROUPS = [
  {
    label: 'Employee',
    icon: User,
    vars: EMPLOYEE_VARIABLES,
  },
  {
    label: 'Company Settings',
    icon: Building2,
    vars: SETTINGS_VARIABLES,
  },
  {
    label: 'Computed',
    icon: CalendarDays,
    vars: COMPUTED_VARIABLES,
  },
]

// ── Variable chip ─────────────────────────────────────────────────────────

function VariableChip({
  varName,
  onClick,
}: {
  varName: string
  onClick: (varName: string) => void
}) {
  return (
    <button
      type="button"
      id={`var-chip-${varName}`}
      onClick={() => onClick(varName)}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono
                 bg-indigo-600/10 text-indigo-300 border border-indigo-500/20
                 hover:bg-indigo-600/20 hover:border-indigo-500/40 transition-colors cursor-pointer"
      title={`Insert {{${varName}}} — source: ${VARIABLE_REGISTRY[varName]}`}
    >
      <Variable className="w-2.5 h-2.5" />
      {varName}
    </button>
  )
}

// ── Certificate background upload section ─────────────────────────────────

function CertificateBackgroundUpload({
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

  useEffect(() => {
    if (currentUrl) {
      setPreviewUrl(currentUrl)
      setImgError(false)
    }
  }, [currentUrl])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'image/png') {
      toast.error('Only PNG images are accepted for certificate backgrounds.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum certificate background size is 10 MB.')
      return
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setImgError(false)

    setUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Strip the data URL prefix
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/certificates/upload-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed.')
      }

      const data = await res.json()
      onUploaded(data.backgroundImageUrl)
      toast.success('Certificate background uploaded!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload background.'
      toast.error(msg)
      setPreviewUrl(currentUrl || null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Preview */}
        <div className="flex-shrink-0">
          <p className="text-xs text-slate-400 mb-2">Background Preview</p>
          <div className="w-64 h-[181px] rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center overflow-hidden relative">
            {previewUrl && !imgError ? (
              <Image
                src={previewUrl}
                alt="Certificate Background"
                fill
                style={{ objectFit: 'contain' }}
                unoptimized
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <ImageOff className="w-8 h-8" />
                <span className="text-xs">No background uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload controls */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-slate-400 mb-1">Accepted: <span className="text-slate-300">PNG only</span></p>
            <p className="text-xs text-slate-400">Maximum size: <span className="text-slate-300">10 MB</span></p>
            <p className="text-xs text-slate-400 mt-1">Recommended: <span className="text-slate-300">2000 × 1414 px</span></p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            className="hidden"
            id="cert-bg-file-input"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="border-white/[0.1] text-slate-300 hover:bg-white/[0.05] bg-transparent gap-2 w-fit"
            id="btn-upload-cert-bg"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {previewUrl && !imgError ? 'Replace Background' : 'Upload Background PNG'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info callout */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <Award className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-amber-300 mb-1">Certificate Layout Config</p>
          <p className="text-[11px] text-amber-400/80 leading-relaxed">
            Text field positions (name, designation, date, body paragraph) are seeded from the default config.
            You can adjust them directly in Firestore or ask your developer to update the seed script for custom layouts.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────

export default function TemplateForm({ initial, mode }: TemplateFormProps) {
  const router = useRouter()

  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<DocumentType>(initial?.type ?? 'offer_letter')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [markdownContent, setMarkdownContent] = useState(initial?.markdownContent ?? '')
  const [applicableStatus, setApplicableStatus] = useState<EmployeeStatus[]>(
    initial?.applicableStatus ?? []
  )
  const [saving, setSaving] = useState(false)

  // Certificate-specific: background image URL
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (initial as any)?.backgroundImageUrl ?? ''
  )

  const isCertificate = type === 'certificate'

  // Track detected variables from content (only relevant for markdown types)
  const detectedVars = isCertificate ? [] : extractVariables(markdownContent)

  // ── Status toggle ──────────────────────────────────────────────────────

  const toggleStatus = (status: EmployeeStatus) => {
    setApplicableStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  // ── Insert variable at cursor ──────────────────────────────────────────

  const editorRef = useRef<HTMLDivElement>(null)

  const insertVariable = useCallback((varName: string) => {
    const token = `{{${varName}}}`

    const textarea = editorRef.current?.querySelector<HTMLTextAreaElement>('textarea.w-md-editor-text-input')
    if (textarea) {
      const start = textarea.selectionStart ?? markdownContent.length
      const end = textarea.selectionEnd ?? markdownContent.length
      const newContent =
        markdownContent.substring(0, start) + token + markdownContent.substring(end)
      setMarkdownContent(newContent)
      requestAnimationFrame(() => {
        textarea.focus()
        const newPos = start + token.length
        textarea.setSelectionRange(newPos, newPos)
      })
    } else {
      setMarkdownContent((prev) => prev + token)
    }
  }, [markdownContent])

  // ── Save ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Template name is required.')
      return
    }

    if (isCertificate) {
      // Certificate: no markdown content required
      setSaving(true)
      try {
        const payload = {
          name: name.trim(),
          type,
          description: description.trim(),
          markdownContent: '',
          applicableStatus,
          backgroundImageUrl,
          // Note: textFields, bodyBox, bodyTemplate are set by seed script
          // and preserved on PATCH (not overwritten here)
        }

        let res: Response
        if (mode === 'create') {
          res = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        } else {
          res = await fetch(`/api/templates/${initial!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        }

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Unknown error')
        }

        toast.success(mode === 'create' ? 'Certificate template created!' : 'Certificate template updated!')
        router.push('/templates')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save template.'
        toast.error(msg)
      } finally {
        setSaving(false)
      }
      return
    }

    // Markdown-based template validation
    if (!markdownContent.trim()) {
      toast.error('Template content cannot be empty.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        type,
        description: description.trim(),
        markdownContent,
        applicableStatus,
      }

      let res: Response
      if (mode === 'create') {
        res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/templates/${initial!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Unknown error')
      }

      toast.success(mode === 'create' ? 'Template created!' : 'Template updated!')
      router.push('/templates')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save template.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section 1: Metadata ── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" />
          Template Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="tmpl-name" className="text-slate-300 text-xs">
              Template Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="tmpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Internship Certificate"
              className="bg-[#0e1017] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor="tmpl-desc" className="text-slate-300 text-xs">
              Description
            </Label>
            <Textarea
              id="tmpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this template is used for…"
              rows={2}
              className="bg-[#0e1017] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50 resize-none"
            />
          </div>

          {/* Applicable Status */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label className="text-slate-300 text-xs">Applicable Employee Statuses</Label>
            <div className="flex flex-wrap gap-3">
              {ALL_STATUSES.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${s}`}
                    checked={applicableStatus.includes(s)}
                    onCheckedChange={() => toggleStatus(s)}
                    className="border-white/[0.15] data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-500"
                  />
                  <Label
                    htmlFor={`status-${s}`}
                    className="text-slate-300 text-xs font-normal cursor-pointer"
                  >
                    {STATUS_LABELS[s]}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2a: Certificate background upload ── */}
      {isCertificate && (
        <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-6">
          <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Certificate Background
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Upload the background PNG image for this certificate design. Text will be stamped on top at the configured coordinates.
          </p>
          <CertificateBackgroundUpload
            currentUrl={backgroundImageUrl}
            onUploaded={setBackgroundImageUrl}
          />
        </div>
      )}

      {/* ── Section 2b: Markdown editor + Variable Picker (non-certificate only) ── */}
      {!isCertificate && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4">
          {/* Markdown editor */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300 text-xs">
                Template Content (Markdown) <span className="text-red-400">*</span>
              </Label>
              {detectedVars.length > 0 && (
                <span className="text-xs text-slate-500">
                  {detectedVars.length} variable{detectedVars.length !== 1 ? 's' : ''} detected
                </span>
              )}
            </div>
            <div
              ref={editorRef}
              data-color-mode="dark"
              className="rounded-xl overflow-hidden border border-white/[0.08]"
              style={{ minHeight: '520px' }}
            >
              <MDEditor
                value={markdownContent}
                onChange={(val) => setMarkdownContent(val ?? '')}
                height={520}
                preview="live"
                style={{
                  background: '#0e1017',
                  borderRadius: 0,
                }}
              />
            </div>
          </div>

          {/* Variable picker panel */}
          <div className="flex flex-col gap-3">
            <Label className="text-slate-300 text-xs">Variable Picker</Label>
            <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-4 flex flex-col gap-5 sticky top-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Click a variable to insert it at the cursor position in the editor.
              </p>

              {VARIABLE_GROUPS.map(({ label, icon: Icon, vars }) => (
                <div key={label} className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vars.map((v) => (
                      <VariableChip key={v} varName={v} onClick={insertVariable} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Detected variables */}
              {detectedVars.length > 0 && (
                <div className="border-t border-white/[0.06] pt-4 flex flex-col gap-2">
                  <div className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                    Used in Template
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedVars.map((v) => {
                      const isDirectSettings = v.startsWith('__settings.')
                      const isDirectComputed = v.startsWith('__computed.')
                      const isKnown = !!(VARIABLE_REGISTRY[v] || isDirectSettings || isDirectComputed)

                      let tooltip: string
                      if (VARIABLE_REGISTRY[v]) {
                        tooltip = `Source: ${VARIABLE_REGISTRY[v]}`
                      } else if (isDirectSettings) {
                        tooltip = `Direct settings field: ${v.replace('__settings.', '')}`
                      } else if (isDirectComputed) {
                        tooltip = `Computed at runtime: ${v.replace('__computed.', '')}`
                      } else {
                        tooltip = 'Unknown variable — not in registry'
                      }

                      return (
                        <span
                          key={v}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            isKnown
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                          title={tooltip}
                        >
                          {v}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Save button ── */}
      <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.06]">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/templates')}
          className="border-white/[0.1] text-slate-300 hover:bg-white/[0.05] bg-transparent"
        >
          Cancel
        </Button>
        <Button
          id="btn-save-template"
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {mode === 'create' ? 'Create Template' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
