// pages/templates/index.tsx
// Template list page — shows all templates as cards with actions

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Template, DocumentType } from '@/types/template'
import type { EmployeeStatus } from '@/types/employee'
import { DOCUMENT_TYPE_LABELS } from '@/constants/document-types'
import {
  FilePlus2,
  FileText,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Variable,
  AlertCircle,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// Re-export toast from sonner for convenience

// ── Status badge config ────────────────────────────────────────────────────

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  'full-time': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  intern:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
  contract:    'bg-amber-500/15 text-amber-400 border-amber-500/25',
  resigned:    'bg-red-500/15 text-red-400 border-red-500/25',
  terminated:  'bg-slate-500/15 text-slate-400 border-slate-500/25',
}
const STATUS_LABELS: Record<EmployeeStatus, string> = {
  'full-time': 'Full-Time',
  intern:      'Intern',
  contract:    'Contract',
  resigned:    'Resigned',
  terminated:  'Terminated',
}

const DOC_TYPE_COLORS: Record<DocumentType, string> = {
  nda:                 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  internship_letter:   'bg-sky-500/15 text-sky-400 border-sky-500/25',
  salary_slip:         'bg-teal-500/15 text-teal-400 border-teal-500/25',
  experience_letter:   'bg-orange-500/15 text-orange-400 border-orange-500/25',
  appointment_letter:  'bg-pink-500/15 text-pink-400 border-pink-500/25',
  certificate:         'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

function DocTypeBadge({ type }: { type: DocumentType }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
        DOC_TYPE_COLORS[type] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/25'
      }`}
    >
      {DOCUMENT_TYPE_LABELS[type] ?? type}
    </span>
  )
}

// ── Template Card ─────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: Template
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
}

function TemplateCard({ template, onToggle, onDelete }: TemplateCardProps) {
  const [toggling, setToggling] = useState(false)

  const handleToggle = async () => {
    setToggling(true)
    await onToggle(template.id, !template.isActive)
    setToggling(false)
  }

  return (
    <div
      className={`relative flex flex-col gap-4 rounded-xl border p-5 transition-all duration-200 ${
        template.isActive
          ? 'bg-[#13161e] border-white/[0.08] hover:border-indigo-500/30'
          : 'bg-[#0e1017] border-white/[0.04] opacity-60'
      }`}
    >
      {/* Default badge */}
      {template.isDefault && (
        <span className="absolute top-4 right-4 text-[10px] font-medium text-slate-500 bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5">
          DEFAULT
        </span>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 pr-16">
        <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-sm leading-snug truncate">{template.name}</h3>
          <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{template.description || 'No description.'}</p>
        </div>
      </div>

      {/* Type badge */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <DocTypeBadge type={template.type} />
      </div>

      {/* Applicable status */}
      {template.applicableStatus?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {template.applicableStatus.map((s) => (
            <span
              key={s}
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                STATUS_COLORS[s as EmployeeStatus] ?? ''
              }`}
            >
              {STATUS_LABELS[s as EmployeeStatus] ?? s}
            </span>
          ))}
        </div>
      )}

      {/* Footer stats + actions */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <Variable className="w-3 h-3" />
          <span>{template.variables?.length ?? 0} variables</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle active */}
          <button
            id={`btn-toggle-${template.id}`}
            onClick={handleToggle}
            disabled={toggling}
            title={template.isActive ? 'Deactivate template' : 'Activate template'}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors disabled:opacity-50"
          >
            {template.isActive ? (
              <ToggleRight className="w-4 h-4 text-indigo-400" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
          </button>

          {/* Edit */}
          <Link href={`/templates/${template.id}`}>
            <button
              id={`btn-edit-${template.id}`}
              title="Edit template"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </Link>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger>
              <span
                id={`btn-delete-${template.id}`}
                title="Delete template"
                className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors inline-flex cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </span>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#13161e] border-white/[0.08] text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to permanently delete <strong className="text-white">{template.name}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent border-white/[0.1] text-slate-300 hover:bg-white/[0.05]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(template.id)}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TemplatesListPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = () => {
    setLoading(true)
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch(() => toast.error('Failed to load templates.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTemplates()
    })
  }, [])

  const handleToggle = async (id: string, newActive: boolean) => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      })
      if (!res.ok) throw new Error()
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: newActive } : t))
      )
      toast.success(newActive ? 'Template activated' : 'Template deactivated')
    } catch {
      toast.error('Failed to update template.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success('Template deleted')
    } catch {
      toast.error('Failed to delete template.')
    }
  }

  const activeCount = templates.filter((t) => t.isActive).length

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Templates</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {loading ? 'Loading…' : `${activeCount} active · ${templates.length} total`}
            </p>
          </div>
          <Link href="/templates/new">
            <Button
              id="btn-create-template"
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              <FilePlus2 className="w-4 h-4" />
              Create Template
            </Button>
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-[#13161e] p-5 flex flex-col gap-3">
                <Skeleton className="h-5 w-3/4 bg-white/[0.05]" />
                <Skeleton className="h-3 w-full bg-white/[0.05]" />
                <Skeleton className="h-5 w-24 bg-white/[0.05]" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16 bg-white/[0.05]" />
                  <Skeleton className="h-5 w-16 bg-white/[0.05]" />
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-xl border border-white/[0.06] bg-[#13161e]">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">No templates yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Create your first template or wait for defaults to load.
              </p>
            </div>
            <Link href="/templates/new">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                <FilePlus2 className="w-4 h-4" />
                Create Template
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
