// components/documents/AIImprovePanel.tsx
// Phase 10 — AI Document Improvement Panel
//
// Renders a full-screen overlay showing:
//   - Loading state while Gemini is processing
//   - Side-by-side diff (original vs improved) once ready
//   - Accept / Reject buttons
//
// Uses the `diff` npm package (diffLines) for line-level change detection.

import { useMemo } from 'react'
import { diffLines, Change } from 'diff'
import { Button } from '@/components/ui/button'
import { Sparkles, X, Check, RotateCcw, Loader2, AlertTriangle } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface AIImprovePanelProps {
  /** Original markdown before AI processing */
  original: string
  /** AI-improved markdown (undefined while loading) */
  improved: string | null
  /** True while the Gemini API call is in flight */
  loading: boolean
  /** Non-fatal warning from the API (e.g. Gemini quota) */
  warning?: string | null
  /** Called when user accepts the improved version */
  onAccept: (improvedMarkdown: string) => void
  /** Called when user rejects (keep original) */
  onReject: () => void
}

// ── Diff renderer ────────────────────────────────────────────────────────────

function DiffPane({
  changes,
  side,
}: {
  changes: Change[]
  side: 'original' | 'improved'
}) {
  return (
    <div className="h-full overflow-y-auto font-mono text-xs leading-relaxed">
      {changes.map((change, i) => {
        // For "original" side: show removed lines (red) + unchanged lines
        // For "improved" side: show added lines (green) + unchanged lines
        if (side === 'original' && change.added) return null
        if (side === 'improved' && change.removed) return null

        const lines = change.value.split('\n')
        // Remove trailing empty string from split
        if (lines[lines.length - 1] === '') lines.pop()

        const isAdded = change.added
        const isRemoved = change.removed

        return lines.map((line, j) => (
          <div
            key={`${i}-${j}`}
            className={`px-3 py-0.5 whitespace-pre-wrap break-words ${
              isAdded
                ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500'
                : isRemoved
                ? 'bg-red-500/10 text-red-300 border-l-2 border-red-500'
                : 'text-slate-400 border-l-2 border-transparent'
            }`}
          >
            <span className="mr-2 text-slate-600 select-none">
              {isAdded ? '+' : isRemoved ? '−' : ' '}
            </span>
            {line || '\u00a0'}
          </div>
        ))
      })}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-20">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
        </div>
        <div className="absolute -inset-2 rounded-full border border-indigo-500/20 animate-ping" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-white font-semibold text-lg">Improving your document…</p>
        <p className="text-slate-400 text-sm text-center max-w-xs">
          Gemini AI is reviewing grammar, tone, and professional standards.
          If the primary model is busy, it will automatically retry with a fallback — this may take up to 15 seconds.
        </p>
      </div>
      {/* Animated loading bars */}
      <div className="flex flex-col gap-2 w-64">
        {[80, 60, 90, 50, 70].map((w, i) => (
          <div
            key={i}
            className="h-2 rounded-full bg-white/[0.06] overflow-hidden"
          >
            <div
              className="h-full bg-indigo-500/40 rounded-full animate-pulse"
              style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AIImprovePanel({
  original,
  improved,
  loading,
  warning,
  onAccept,
  onReject,
}: AIImprovePanelProps) {
  // Compute diff only when both sides are available
  const changes = useMemo(() => {
    if (!improved) return []
    return diffLines(original, improved)
  }, [original, improved])

  // Count additions and removals for the summary badge
  const addedLines = changes.filter((c) => c.added).reduce((n, c) => n + c.count!, 0)
  const removedLines = changes.filter((c) => c.removed).reduce((n, c) => n + c.count!, 0)
  const hasChanges = addedLines > 0 || removedLines > 0

  return (
    // Full-screen overlay
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0d14]/95 backdrop-blur-sm">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#13161e] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">AI Document Improvement</h2>
            <p className="text-slate-500 text-xs">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!loading && improved && (
            <>
              {/* Change summary */}
              {hasChanges ? (
                <div className="flex items-center gap-2 text-xs">
                  {addedLines > 0 && (
                    <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      +{addedLines} lines
                    </span>
                  )}
                  {removedLines > 0 && (
                    <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                      −{removedLines} lines
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-500 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08]">
                  No changes suggested
                </span>
              )}

              {/* Action buttons */}
              <Button
                id="btn-reject-ai"
                variant="ghost"
                onClick={onReject}
                className="text-slate-400 hover:text-white gap-2 border border-white/[0.08] bg-transparent"
              >
                <RotateCcw className="w-4 h-4" />
                Keep Original
              </Button>
              <Button
                id="btn-accept-ai"
                onClick={() => onAccept(improved)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
              >
                <Check className="w-4 h-4" />
                Accept Improvements
              </Button>
            </>
          )}

          {!loading && (
            <button
              id="btn-close-ai-panel"
              onClick={onReject}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Warning banner ── */}
      {warning && !loading && (
        <div className="px-6 py-3 bg-amber-500/[0.07] border-b border-amber-500/20 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-amber-300 text-sm">{warning}</p>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : improved ? (
          <div className="grid grid-cols-2 h-full divide-x divide-white/[0.06]">
            {/* Left: Original */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-4 py-2.5 bg-[#13161e] border-b border-white/[0.06] shrink-0 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400/60" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Original
                </span>
              </div>
              <DiffPane changes={changes} side="original" />
            </div>

            {/* Right: Improved */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="px-4 py-2.5 bg-[#13161e] border-b border-white/[0.06] shrink-0 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  AI Improved
                </span>
                <Sparkles className="w-3 h-3 text-indigo-400 ml-auto" />
              </div>
              <DiffPane changes={changes} side="improved" />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Footer (loading state only) ── */}
      {loading && (
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#13161e] shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing with Gemini AI…
          </div>
          <Button
            variant="ghost"
            onClick={onReject}
            className="text-slate-400 hover:text-white border border-white/[0.08] bg-transparent"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
