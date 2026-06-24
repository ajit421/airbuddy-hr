// components/templates/TemplateForm.tsx
// Shared form component for creating and editing templates.
// Used by both pages/templates/new.tsx and pages/templates/[id].tsx

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Template, DocumentType } from '@/types/template'
import type { EmployeeStatus } from '@/types/employee'
import { DOCUMENT_TYPE_LABELS, ALL_DOCUMENT_TYPES } from '@/constants/document-types'
import {
  VARIABLE_REGISTRY,
  EMPLOYEE_VARIABLES,
  SETTINGS_VARIABLES,
  COMPUTED_VARIABLES,
} from '@/constants/variable-registry'
import { extractVariables } from '@/lib/templates/extract-variables'
import { Save, ChevronRight, Variable, User, Building2, CalendarDays, Info } from 'lucide-react'

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

  // Track detected variables from content
  const detectedVars = extractVariables(markdownContent)

  // ── Status toggle ──────────────────────────────────────────────────────

  const toggleStatus = (status: EmployeeStatus) => {
    setApplicableStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  // ── Insert variable at cursor ──────────────────────────────────────────
  // @uiw/react-md-editor doesn't expose textarea ref directly, so we find
  // the textarea in the DOM and insert at cursor position.

  const editorRef = useRef<HTMLDivElement>(null)

  const insertVariable = useCallback((varName: string) => {
    const token = `{{${varName}}}`

    // Try to find the textarea inside the editor wrapper
    const textarea = editorRef.current?.querySelector<HTMLTextAreaElement>('textarea.w-md-editor-text-input')
    if (textarea) {
      const start = textarea.selectionStart ?? markdownContent.length
      const end = textarea.selectionEnd ?? markdownContent.length
      const newContent =
        markdownContent.substring(0, start) + token + markdownContent.substring(end)
      setMarkdownContent(newContent)
      // Restore focus and cursor after React re-render
      requestAnimationFrame(() => {
        textarea.focus()
        const newPos = start + token.length
        textarea.setSelectionRange(newPos, newPos)
      })
    } else {
      // Fallback: append at end
      setMarkdownContent((prev) => prev + token)
    }
  }, [markdownContent])

  // ── Save ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Template name is required.')
      return
    }
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
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save template.')
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tmpl-name" className="text-slate-300 text-xs">
              Template Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="tmpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Offer Letter"
              className="bg-[#0e1017] border-white/[0.08] text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
          </div>

          {/* Document Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tmpl-type" className="text-slate-300 text-xs">
              Document Type <span className="text-red-400">*</span>
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as DocumentType)}>
              <SelectTrigger
                id="tmpl-type"
                className="bg-[#0e1017] border-white/[0.08] text-slate-300"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#13161e] border-white/[0.08] text-slate-200">
                {ALL_DOCUMENT_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt} className="focus:bg-indigo-600/20">
                    {DOCUMENT_TYPE_LABELS[dt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {/* ── Section 2: Editor + Variable Picker ── */}
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
                    // A variable is "known" if it's in the registry OR uses a
                    // direct path prefix (__settings.* / __computed.*) which
                    // fill-variables.ts resolves natively.
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
