// components/documents/VersionHistoryList.tsx
// Phase 14.1 — Version history panel for a specific document.
// Shows all versions with badges, a read-only preview modal, and a re-export link.

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { DocumentVersion } from '@/types/document'
import {
  Loader2,
  Eye,
  X,
  Sparkles,
  FileDown,
  History,
  RefreshCw,
} from 'lucide-react'

// Dynamically import the markdown preview to avoid SSR
const MarkdownPreview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false })

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const EXPORT_FORMAT_BADGE: Record<string, { label: string; className: string }> = {
  pdf:  { label: 'PDF',  className: 'text-red-400 border-red-500/20 bg-red-500/5' },
  docx: { label: 'DOCX', className: 'text-sky-400 border-sky-500/20 bg-sky-500/5' },
  md:   { label: 'MD',   className: 'text-slate-400 border-slate-500/20 bg-slate-500/5' },
}

// ── Read-Only Preview Modal ───────────────────────────────────────────────────

interface PreviewModalProps {
  version: DocumentVersion
  onClose: () => void
  onReExport: (version: DocumentVersion) => void
}

function VersionPreviewModal({ version, onClose, onReExport }: PreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0e1117] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
              <History className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">
                Version {version.versionNumber}
              </h2>
              <p className="text-slate-500 text-xs">{formatDate(version.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              id={`btn-reexport-v${version.versionNumber}`}
              className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 gap-1.5 h-8 text-xs"
              onClick={() => { onClose(); onReExport(version) }}
            >
              <FileDown className="w-3.5 h-3.5" />
              Re-export
            </Button>
            <button
              onClick={onClose}
              id="btn-close-version-preview"
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04] shrink-0">
          {version.aiImproved && (
            <Badge variant="outline" className="text-xs text-indigo-400 border-indigo-500/20 bg-indigo-500/5 gap-1">
              <Sparkles className="w-3 h-3" />
              AI Improved
            </Badge>
          )}
          {version.exportedAs && EXPORT_FORMAT_BADGE[version.exportedAs] && (
            <Badge
              variant="outline"
              className={`text-xs ${EXPORT_FORMAT_BADGE[version.exportedAs].className}`}
            >
              Exported as {EXPORT_FORMAT_BADGE[version.exportedAs].label}
            </Badge>
          )}
          {version.hasSigned && (
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
              ✓ Signed
            </Badge>
          )}
          {version.changeNote && (
            <span className="text-slate-600 text-xs ml-1 italic">{version.changeNote}</span>
          )}
        </div>

        {/* Content — scrollable markdown preview */}
        <div className="overflow-y-auto flex-1" data-color-mode="dark">
          <MarkdownPreview
            source={version.markdownContent}
            style={{ background: '#0e1117', color: '#cbd5e1', padding: '1.5rem', minHeight: '300px' }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Re-export Panel ───────────────────────────────────────────────────────────

interface ReExportPanelProps {
  version: DocumentVersion
  employeeId: string
  documentId: string
  documentTitle: string
  onClose: () => void
}

function ReExportPanel({ version, employeeId, documentId, documentTitle, onClose }: ReExportPanelProps) {
  const [addSignature, setAddSignature] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExport = async (format: 'pdf' | 'docx' | 'md') => {
    setExporting(format)
    try {
      const res = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdownContent: version.markdownContent,
          employeeId,
          documentId,
          versionId: version.id,
          addSignature: format === 'pdf' ? addSignature : false,
          documentTitle,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${documentTitle}_v${version.versionNumber}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported v${version.versionNumber} as .${format.toUpperCase()}`)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      toast.error(msg)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0e1117] shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">
            Re-export Version {version.versionNumber}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Signature toggle (PDF only) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#13161e] p-4 flex items-center justify-between mb-4">
          <div>
            <p className="text-white text-sm font-medium">Add HR Signature (PDF)</p>
            <p className="text-slate-500 text-xs mt-0.5">Embed signature on the last page</p>
          </div>
          <button
            onClick={() => setAddSignature((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${addSignature ? 'bg-indigo-600' : 'bg-white/10'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${addSignature ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {/* Export buttons */}
        <div className="grid grid-cols-3 gap-3">
          {(['pdf', 'docx', 'md'] as const).map((format) => (
            <button
              key={format}
              id={`btn-reexport-format-${format}-v${version.versionNumber}`}
              disabled={exporting !== null}
              onClick={() => handleExport(format)}
              className={`flex flex-col items-center gap-2 rounded-xl border py-4 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                format === 'pdf'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                  : format === 'docx'
                  ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20'
                  : 'bg-slate-500/10 border-slate-500/20 text-slate-300 hover:bg-slate-500/20'
              }`}
            >
              {exporting === format ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileDown className="w-5 h-5" />
              )}
              .{format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Version History List ──────────────────────────────────────────────────────

interface VersionHistoryListProps {
  employeeId: string
  documentId: string
  documentTitle: string
}

export default function VersionHistoryList({
  employeeId,
  documentId,
  documentTitle,
}: VersionHistoryListProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null)
  const [reExportVersion, setReExportVersion] = useState<DocumentVersion | null>(null)

  const fetchVersions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/documents/${documentId}/versions?employeeId=${employeeId}`
      )
      const data = await res.json()
      setVersions(data.versions ?? [])
    } catch {
      toast.error('Failed to load versions')
    } finally {
      setLoading(false)
    }
  }, [employeeId, documentId])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchVersions()
    })
  }, [fetchVersions])

  return (
    <>
      {/* Modals */}
      {previewVersion && (
        <VersionPreviewModal
          version={previewVersion}
          onClose={() => setPreviewVersion(null)}
          onReExport={(v) => {
            setPreviewVersion(null)
            setReExportVersion(v)
          }}
        />
      )}
      {reExportVersion && (
        <ReExportPanel
          version={reExportVersion}
          employeeId={employeeId}
          documentId={documentId}
          documentTitle={documentTitle}
          onClose={() => setReExportVersion(null)}
        />
      )}

      {/* Versions list */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={fetchVersions}
            id={`btn-refresh-versions-${documentId}`}
            className="text-slate-600 hover:text-slate-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span className="text-slate-500 text-sm">Loading versions…</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center">
            <History className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">No versions saved yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {versions.map((v) => {
              const isLatest = v.versionNumber === versions[0]?.versionNumber
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Left: version info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border shrink-0 ${
                      isLatest
                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-slate-500'
                    }`}>
                      {v.versionNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">
                          v{v.versionNumber}
                        </span>
                        {isLatest && (
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20 bg-emerald-500/5 py-0 px-1.5">
                            Latest
                          </Badge>
                        )}
                        {v.aiImproved && (
                          <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-500/20 bg-indigo-500/5 py-0 px-1.5 gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI
                          </Badge>
                        )}
                        {v.exportedAs && EXPORT_FORMAT_BADGE[v.exportedAs] && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-1.5 ${EXPORT_FORMAT_BADGE[v.exportedAs].className}`}
                          >
                            {EXPORT_FORMAT_BADGE[v.exportedAs].label}
                          </Badge>
                        )}
                        {v.hasSigned && (
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20 bg-emerald-500/5 py-0 px-1.5">
                            Signed
                          </Badge>
                        )}
                      </div>
                      {v.changeNote && (
                        <p className="text-slate-600 text-xs mt-0.5 truncate">{v.changeNote}</p>
                      )}
                      <p className="text-slate-700 text-[11px] mt-0.5">{formatDate(v.createdAt)}</p>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      id={`btn-view-version-${v.id}`}
                      onClick={() => setPreviewVersion(v)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs transition-colors"
                      title="View this version"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      id={`btn-reexport-version-${v.id}`}
                      onClick={() => setReExportVersion(v)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
                      title="Re-export this version"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Export
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
