// pages/templates/new.tsx
// Create new template page

import AppLayout from '@/components/layout/AppLayout'
import TemplateForm from '@/components/templates/TemplateForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewTemplatePage() {
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
          <h1 className="text-2xl font-semibold text-white tracking-tight">Create Template</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Build a new HR document template with Markdown and dynamic variables.
          </p>
        </div>

        <TemplateForm mode="create" />
      </div>
    </AppLayout>
  )
}
