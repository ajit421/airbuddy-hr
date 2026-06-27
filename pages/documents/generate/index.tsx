// pages/documents/generate/index.tsx
// Document generation landing page — Phase 8
// Shows a placeholder or redirects to generate/[employeeId] if employeeId is in query

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { FilePlus2, Users, ArrowRight } from 'lucide-react'

export default function GenerateDocLandingPage() {
  const router = useRouter()
  const { employeeId } = router.query

  // If launched from employee page with ?employeeId=xxx, redirect to the per-employee flow
  useEffect(() => {
    if (employeeId && typeof employeeId === 'string') {
      router.replace(`/documents/generate/${employeeId}`)
    }
  }, [employeeId, router])

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <FilePlus2 className="w-6 h-6 text-indigo-400" />
            Generate Document
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Select an employee to generate a document for them.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-8 text-center flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
            <FilePlus2 className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-white font-medium text-lg">Select an Employee First</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Go to the employee&apos;s profile and click <strong className="text-slate-300">Generate Doc</strong>, or browse employees to find the right person.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/employees">
              <Button
                id="btn-go-to-employees"
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
              >
                <Users className="w-4 h-4" />
                Browse Employees
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="text-slate-600 text-xs mt-2">
            Full document generation wizard will be built in Phase 8.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
