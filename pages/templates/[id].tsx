// pages/templates/[id].tsx
// Edit existing template page — fetches template by ID, pre-fills TemplateForm

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import TemplateForm from '@/components/templates/TemplateForm'
import { Skeleton } from '@/components/ui/skeleton'
import type { Template } from '@/types/template'
import { ChevronLeft, AlertCircle } from 'lucide-react'

export default function EditTemplatePage() {
  const router = useRouter()
  const { id } = router.query

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || typeof id !== 'string') return

    fetch(`/api/templates/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to load template.')
        }
        return res.json()
      })
      .then((data) => setTemplate(data.template))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <Link
            href="/templates"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Templates
          </Link>

          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-48 bg-white/[0.05]" />
              <Skeleton className="h-4 w-64 bg-white/[0.05]" />
            </div>
          ) : error ? null : (
            <>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                Edit Template
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {template?.name ?? ''}
              </p>
            </>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-6">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 bg-white/[0.05]" />
                ))}
              </div>
            </div>
            <Skeleton className="h-[520px] rounded-xl bg-white/[0.05]" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-5 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        ) : template ? (
          <TemplateForm mode="edit" initial={template} />
        ) : null}
      </div>
    </AppLayout>
  )
}
