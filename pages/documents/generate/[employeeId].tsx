// pages/documents/generate/[employeeId].tsx
// Phase 8.2 — 4-step document generation wizard for a specific employee.
// Steps: 1=Select Template, 2=Review Variables, 3=Edit Document, 4=Export

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { Employee, EmployeeStatus } from '@/types/employee'
import type { Template } from '@/types/template'
import type { DocumentVersion } from '@/types/document'
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-types'
import {
  FilePlus2,
  ChevronRight,
  AlertTriangle,
  Check,
  Download,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
  FileDown,
  File,
  Loader2,
  ArrowLeft,
  User,
  Sparkles,
} from 'lucide-react'

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })
const MarkdownPreview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false })

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  intern: 'Intern',
  'full-time': 'Full-Time',
  contract: 'Contract',
  resigned: 'Resigned',
  terminated: 'Terminated',
}

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  intern: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'full-time': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  contract: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  resigned: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  terminated: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const STEPS = ['Select Template', 'Review Variables', 'Edit Document', 'Export']

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === current
        const isDone = stepNum < current
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  isDone
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : isActive
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-white/[0.04] border-white/10 text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={`text-xs mt-1.5 whitespace-nowrap ${
                  isActive ? 'text-white font-medium' : isDone ? 'text-indigo-400' : 'text-slate-600'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-16 mx-2 mb-5 transition-all ${
                  isDone ? 'bg-indigo-600' : 'bg-white/[0.08]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GenerateDocPage() {
  const router = useRouter()
  const { employeeId } = router.query as { employeeId: string }

  // Data
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingEmployee, setLoadingEmployee] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  // Wizard state
  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Step 2 — Variables
  const [generating, setGenerating] = useState(false)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [missingVariables, setMissingVariables] = useState<string[]>([])
  const [customVars, setCustomVars] = useState<Record<string, string>>({})

  // Step 3 — Editor
  const [markdownContent, setMarkdownContent] = useState('')

  // Step 4 — Export / Versions
  const [addSignature, setAddSignature] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  // ── Fetch employee ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!employeeId) return
    setLoadingEmployee(true)
    fetch(`/api/employees/${employeeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.employee) setEmployee(data.employee)
        else toast.error('Employee not found')
      })
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => setLoadingEmployee(false))
  }, [employeeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch templates ──────────────────────────────────────────────────────────

  useEffect(() => {
    setLoadingTemplates(true)
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => {
        if (data.templates) setTemplates(data.templates)
      })
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoadingTemplates(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered templates for employee status ───────────────────────────────────

  const filteredTemplates = employee
    ? templates.filter(
        (t) => t.isActive && t.applicableStatus.includes(employee.status)
      )
    : []

  // ── Step 1 → 2: Select template → generate initial document ──────────────────

  const handleSelectTemplate = useCallback(
    async (template: Template) => {
      if (!employeeId) return
      setSelectedTemplate(template)
      setStep(2)
      setGenerating(true)
      setCustomVars({})
      setMissingVariables([])

      try {
        const res = await fetch('/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, templateId: template.id }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        setDocumentId(data.documentId)
        setMarkdownContent(data.markdownContent)
        setMissingVariables(data.missingVariables ?? [])

        // If nothing missing, auto-advance to step 3
        if ((data.missingVariables ?? []).length === 0) {
          setStep(3)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Generation failed'
        toast.error(msg)
        setStep(1)
      } finally {
        setGenerating(false)
      }
    },
    [employeeId]
  )

  // ── Step 2: Re-generate with custom variables ─────────────────────────────────

  const handleFillMissing = useCallback(async () => {
    if (!employeeId || !selectedTemplate) return
    setGenerating(true)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          templateId: selectedTemplate.id,
          customVariables: customVars,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setDocumentId(data.documentId)
      setMarkdownContent(data.markdownContent)
      setMissingVariables(data.missingVariables ?? [])
      setStep(3)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Re-generation failed'
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }, [employeeId, selectedTemplate, customVars])

  // ── Step 3 → 4: Save current content as new version ───────────────────────────

  const handleContinueToExport = useCallback(async () => {
    if (!documentId || !employeeId) return
    try {
      await fetch(`/api/documents/${documentId}/versions?employeeId=${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdownContent,
          changeNote: 'Saved from editor before export',
          aiImproved: false,
        }),
      })
    } catch {
      // non-fatal — continue anyway
    }
    setStep(4)
  }, [documentId, employeeId, markdownContent])

  // ── Step 4: Export ─────────────────────────────────────────────────────────────

  const handleExport = useCallback(
    async (format: 'pdf' | 'docx' | 'md') => {
      if (!documentId || !employeeId) return
      setExporting(format)
      try {
        const res = await fetch(
          `/api/export/${format}?documentId=${documentId}&employeeId=${employeeId}&addSignature=${addSignature}`,
          { method: 'GET' }
        )
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Export failed')
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedTemplate?.name ?? 'document'}.${format}`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Exported as .${format.toUpperCase()}`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Export failed'
        toast.error(msg)
      } finally {
        setExporting(null)
      }
    },
    [documentId, employeeId, addSignature, selectedTemplate]
  )

  // ── Version history ─────────────────────────────────────────────────────────

  const loadVersions = useCallback(async () => {
    if (!documentId || !employeeId) return
    setLoadingVersions(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/versions?employeeId=${employeeId}`)
      const data = await res.json()
      setVersions(data.versions ?? [])
    } catch {
      toast.error('Failed to load versions')
    } finally {
      setLoadingVersions(false)
    }
  }, [documentId, employeeId])

  const toggleVersions = () => {
    setShowVersions((v) => {
      if (!v) loadVersions()
      return !v
    })
  }

  // ── Loading state ──────────────────────────────────────────────────────────────

  if (loadingEmployee) {
    return (
      <AppLayout>
        <div className="max-w-3xl flex flex-col gap-4">
          <Skeleton className="h-10 w-64 bg-white/[0.06]" />
          <Skeleton className="h-5 w-40 bg-white/[0.04]" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Skeleton className="h-32 bg-white/[0.04] rounded-xl" />
            <Skeleton className="h-32 bg-white/[0.04] rounded-xl" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!employee) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center gap-4 py-20">
          <AlertTriangle className="w-12 h-12 text-amber-400" />
          <p className="text-white font-semibold text-lg">Employee not found</p>
          <Button variant="outline" onClick={() => router.push('/employees')}>
            Back to Employees
          </Button>
        </div>
      </AppLayout>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white gap-1 px-2"
            onClick={() => router.back()}
            id="btn-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <FilePlus2 className="w-6 h-6 text-indigo-400" />
              Generate Document
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm text-slate-400 font-medium">{employee.fullName}</span>
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-slate-500 text-xs">{employee.employeeId}</span>
              <Badge
                className={`text-xs px-2 py-0 border ${STATUS_COLORS[employee.status]}`}
                variant="outline"
              >
                {STATUS_LABELS[employee.status]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} />

        {/* ── STEP 1: Select Template ── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Choose a Template</h2>
            <p className="text-sm text-slate-500 mb-5">
              Showing templates applicable for{' '}
              <span className="text-slate-300">{STATUS_LABELS[employee.status]}</span> employees.
            </p>

            {loadingTemplates ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 bg-white/[0.04] rounded-xl" />
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-8 text-center">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No templates available</p>
                <p className="text-slate-600 text-sm mt-1">
                  No active templates are configured for{' '}
                  <span className="text-slate-400">{STATUS_LABELS[employee.status]}</span> employees.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/templates/new')}
                  id="btn-create-template"
                >
                  Create Template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    id={`btn-select-template-${template.id}`}
                    onClick={() => handleSelectTemplate(template)}
                    className="text-left rounded-xl border border-white/[0.08] bg-[#13161e] p-5 hover:border-indigo-500/40 hover:bg-indigo-600/5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-white font-medium group-hover:text-indigo-300 transition-colors">
                        {template.name}
                      </span>
                      <Badge variant="outline" className="text-xs text-slate-400 border-white/10 shrink-0">
                        {DOCUMENT_TYPE_LABELS[template.type] ?? template.type}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{template.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span>{template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Review Variables ── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Review Variables</h2>
            <p className="text-sm text-slate-500 mb-5">
              Template: <span className="text-slate-300">{selectedTemplate?.name}</span>
            </p>

            {generating ? (
              <div className="flex flex-col items-center gap-4 py-20">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <p className="text-slate-400">Generating document…</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {missingVariables.length > 0 ? (
                  <>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-300 font-medium text-sm">
                          {missingVariables.length} missing variable{missingVariables.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-amber-500/70 text-xs">
                        Fill in the fields below and click &quot;Generate&quot; to continue.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-5 flex flex-col gap-4">
                      {missingVariables.map((varName) => (
                        <div key={varName}>
                          <label
                            htmlFor={`var-${varName}`}
                            className="block text-xs font-medium text-amber-400 mb-1.5"
                          >
                            {`{{${varName}}}`}
                          </label>
                          <input
                            id={`var-${varName}`}
                            type="text"
                            placeholder={`Enter value for ${varName}`}
                            value={customVars[varName] ?? ''}
                            onChange={(e) =>
                              setCustomVars((prev) => ({ ...prev, [varName]: e.target.value }))
                            }
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-amber-500/30 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        className="text-slate-400 hover:text-white gap-1"
                        onClick={() => setStep(1)}
                        id="btn-back-to-step1"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Change Template
                      </Button>
                      <Button
                        className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                        onClick={handleFillMissing}
                        disabled={generating}
                        id="btn-generate-with-vars"
                      >
                        {generating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Generate Document
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-16">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Check className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-white font-medium">All variables filled!</p>
                    <p className="text-slate-500 text-sm">Proceeding to editor…</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Edit Document ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white mb-0.5">Edit Document</h2>
                <p className="text-sm text-slate-500">
                  Template: <span className="text-slate-300">{selectedTemplate?.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white gap-1.5 border border-white/[0.08]"
                  id="btn-ai-improve"
                  onClick={() =>
                    toast.success('Coming in Phase 10! ✨ AI Improve will be available soon.')
                  }
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  AI Improve
                </Button>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                  onClick={handleContinueToExport}
                  id="btn-continue-to-export"
                >
                  Continue to Export
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {missingVariables.length > 0 && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-red-300 text-sm">
                  ⚠️ Document still has {missingVariables.length} unfilled variable
                  {missingVariables.length !== 1 ? 's' : ''}:{' '}
                  <span className="text-red-400 font-mono text-xs">
                    {missingVariables.map((v) => `{{${v}}}`).join(', ')}
                  </span>
                </span>
              </div>
            )}

            {/* MD Editor */}
            <div className="rounded-xl overflow-hidden border border-white/[0.08]" data-color-mode="dark">
              <MDEditor
                value={markdownContent}
                onChange={(v) => setMarkdownContent(v ?? '')}
                height={520}
                preview="live"
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: Export ── */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-0.5">Export Document</h2>
              <p className="text-sm text-slate-500">
                Your document is ready. Choose an export format below.
              </p>
            </div>

            {/* Signature toggle */}
            <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Add HR Signature to PDF</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Embed the HR signature image at the bottom of the document
                </p>
              </div>
              <button
                id="toggle-signature"
                onClick={() => setAddSignature((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  addSignature ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    addSignature ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Export buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(
                [
                  {
                    format: 'pdf' as const,
                    label: 'Export PDF',
                    icon: FileDown,
                    color: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20',
                  },
                  {
                    format: 'docx' as const,
                    label: 'Export DOCX',
                    icon: FileText,
                    color: 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20',
                  },
                  {
                    format: 'md' as const,
                    label: 'Export Markdown',
                    icon: File,
                    color: 'bg-slate-500/10 border-slate-500/20 text-slate-300 hover:bg-slate-500/20',
                  },
                ] as const
              ).map(({ format, label, icon: Icon, color }) => (
                <button
                  key={format}
                  id={`btn-export-${format}`}
                  disabled={exporting !== null}
                  onClick={() => handleExport(format)}
                  className={`flex flex-col items-center gap-3 rounded-xl border p-5 transition-all font-medium text-sm ${color} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {exporting === format ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                  {label}
                </button>
              ))}
            </div>

            {/* Document preview (read-only) */}
            <div className="rounded-xl border border-white/[0.08] overflow-hidden" data-color-mode="dark">
              <div className="px-4 py-2 border-b border-white/[0.08] bg-[#13161e] flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Document Preview</span>
              </div>
              <MarkdownPreview
                source={markdownContent}
                style={{ background: '#0e1117', color: '#cbd5e1', padding: '1.5rem' }}
              />
            </div>

            {/* Version History (collapsible) */}
            <div className="rounded-xl border border-white/[0.08] bg-[#13161e] overflow-hidden">
              <button
                id="btn-toggle-versions"
                onClick={toggleVersions}
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  Version History
                </div>
                {showVersions ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {showVersions && (
                <div className="border-t border-white/[0.08] px-5 py-4">
                  {loadingVersions ? (
                    <div className="flex gap-3 items-center py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      <span className="text-slate-500 text-sm">Loading versions…</span>
                    </div>
                  ) : versions.length === 0 ? (
                    <p className="text-slate-600 text-sm">No versions yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {versions.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3"
                        >
                          <div>
                            <span className="text-white text-sm font-medium">v{v.versionNumber}</span>
                            {v.changeNote && (
                              <span className="text-slate-500 text-xs ml-2">{v.changeNote}</span>
                            )}
                            {v.aiImproved && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[10px] text-indigo-400 border-indigo-500/20 py-0"
                              >
                                AI Improved
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 text-xs">
                              {new Date(v.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              id={`btn-restore-version-${v.id}`}
                              onClick={() => {
                                setMarkdownContent(v.markdownContent)
                                setShowVersions(false)
                                setStep(3)
                                toast.success(`Restored to v${v.versionNumber}`)
                              }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white gap-1"
                onClick={() => setStep(3)}
                id="btn-back-to-editor"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Editor
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-white/10 text-slate-300"
                onClick={() => router.push('/employees')}
                id="btn-finish"
              >
                <Download className="w-4 h-4" />
                Done — Back to Employees
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
