// components/employees/FileUploadZone.tsx
// Drag-and-drop file upload with existing files list.
// Handles upload to API, displays OCR status, and triggers OCR extraction.

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Upload, FileImage, FileText, Trash2, Eye, Scan, Loader2,
  CheckCircle2, AlertCircle, Clock, X
} from 'lucide-react'
import type { FileType } from '@/types/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface UploadedFile {
  fileId: string
  fileType: FileType
  fileName: string
  mimeType: string
  cloudinaryUrl: string
  publicId: string
  ocrStatus: 'pending' | 'completed' | 'failed' | 'skipped'
  ocrData?: Record<string, unknown>
  signedUrl?: string | null
  uploadedAt?: unknown
}

interface FileUploadZoneProps {
  employeeId: string
  files: UploadedFile[]
  onFilesChange: () => void
  onOcrComplete: (fileId: string, fileType: FileType, data: Record<string, unknown>) => void
}

// ── Status badges ──────────────────────────────────────────────────────────

const OCR_STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending:   { label: 'OCR Pending',   icon: <Clock className="w-3 h-3" />,        className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  completed: { label: 'OCR Complete',  icon: <CheckCircle2 className="w-3 h-3" />, className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  failed:    { label: 'OCR Failed',    icon: <AlertCircle className="w-3 h-3" />,  className: 'bg-red-500/15 text-red-400 border-red-500/25' },
  skipped:   { label: 'No OCR',        icon: <X className="w-3 h-3" />,            className: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
}

const FILE_TYPE_LABELS: Record<FileType, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  resume: 'Resume',
  photo: 'Photo',
}

// ── Component ──────────────────────────────────────────────────────────────

export default function FileUploadZone({
  employeeId,
  files,
  onFilesChange,
  onOcrComplete,
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<FileType>('aadhaar')
  const [dragOver, setDragOver] = useState(false)
  const [ocrLoading, setOcrLoading] = useState<string | null>(null) // fileId currently processing
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Upload handler ─────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate MIME
      const validMimes = ['image/jpeg', 'image/png', 'application/pdf']
      if (!validMimes.includes(file.type)) {
        toast.error('Only JPEG, PNG, and PDF files are supported.')
        return
      }
      // Validate size
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB.')
        return
      }

      setUploading(true)
      try {
        // Read file as base64
        const buffer = await file.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )

        const res = await fetch(`/api/employees/${employeeId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileType: selectedType,
            fileName: file.name,
            mimeType: file.type,
            base64Data: base64,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Upload failed')
        }

        toast.success(`${FILE_TYPE_LABELS[selectedType]} uploaded successfully!`)
        onFilesChange() // Refresh the files list
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'File upload failed. Please try again.'
        toast.error(msg)
      } finally {
        setUploading(false)
      }
    },
    [employeeId, selectedType, onFilesChange]
  )

  // ── Drag handlers ──────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  // ── OCR trigger ────────────────────────────────────────────────────────

  const triggerOcr = async (f: UploadedFile) => {
    if (f.fileType !== 'aadhaar' && f.fileType !== 'pan') {
      toast.error('OCR is only available for Aadhaar and PAN cards.')
      return
    }

    setOcrLoading(f.fileId)
    try {
      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudinaryUrl: f.cloudinaryUrl,
          fileType: f.fileType,
          employeeId,
          fileId: f.fileId,
        }),
      })

      const data = await res.json()

      if (data.success && data.data) {
        toast.success('OCR extraction complete! Review the data below.')
        onOcrComplete(f.fileId, f.fileType, data.data)
        onFilesChange()
      } else {
        toast.error(data.error ?? 'OCR could not extract data. Please enter manually.')
        onFilesChange()
      }
    } catch {
      toast.error('OCR extraction failed. Please enter data manually.')
    } finally {
      setOcrLoading(null)
    }
  }

  // ── Delete handler ─────────────────────────────────────────────────────

  const handleDelete = async (fileId: string) => {
    if (!confirm('Delete this file? This cannot be undone.')) return
    setDeletingId(fileId)
    try {
      const res = await fetch(`/api/employees/${employeeId}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('File deleted')
      onFilesChange()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete file'
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Upload Zone */}
      <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Upload File
        </h3>

        {/* File type selector */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['aadhaar', 'pan', 'resume', 'photo'] as FileType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                selectedType === type
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.06]'
              }`}
            >
              {FILE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-indigo-500/60 bg-indigo-600/10'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-400">Uploading…</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
                <Upload className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-300">
                  Drop your <span className="text-indigo-400 font-medium">{FILE_TYPE_LABELS[selectedType]}</span> here
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  or click to browse • JPEG, PNG, PDF up to 10MB
                </p>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
            e.target.value = '' // Reset so same file can be re-uploaded
          }}
        />
      </div>

      {/* Existing files list */}
      {files.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-[#13161e] p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Uploaded Files ({files.length})
          </h3>

          <div className="flex flex-col gap-2">
            {files.map((f) => {
              const ocrCfg = OCR_STATUS_CONFIG[f.ocrStatus] ?? OCR_STATUS_CONFIG.skipped
              const isOcrLoadingThis = ocrLoading === f.fileId
              const isDeletingThis = deletingId === f.fileId
              const canOcr = (f.fileType === 'aadhaar' || f.fileType === 'pan') && f.ocrStatus !== 'completed'

              return (
                <div
                  key={f.fileId}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                >
                  {/* Icon */}
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.05] shrink-0">
                    {f.mimeType?.startsWith('image/') ? (
                      <FileImage className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-amber-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-200 font-medium truncate">
                      {f.fileName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-500">
                        {FILE_TYPE_LABELS[f.fileType] ?? f.fileType}
                      </span>
                      {/* OCR Status badge */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${ocrCfg.className}`}>
                        {ocrCfg.icon} {ocrCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* OCR trigger */}
                    {canOcr && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => triggerOcr(f)}
                        disabled={isOcrLoadingThis}
                        className="h-8 px-2.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/15 gap-1.5 text-[12px]"
                      >
                        {isOcrLoadingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Scan className="w-3.5 h-3.5" />
                        )}
                        {isOcrLoadingThis ? 'Extracting…' : 'Extract OCR'}
                      </Button>
                    )}

                    {/* View */}
                    {(f.signedUrl || f.cloudinaryUrl) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(f.signedUrl || f.cloudinaryUrl, '_blank')}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]"
                        title="View file"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(f.fileId)}
                      disabled={isDeletingThis}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                      title="Delete file"
                    >
                      {isDeletingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
