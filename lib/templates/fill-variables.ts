// lib/templates/fill-variables.ts
// Template variable fill engine.
// Replaces {{variable_name}} tokens in a markdown template with real values
// sourced from an Employee record, CompanySettings, or computed at runtime.
//
// Supports TWO token styles:
//   1. Registry keys:        {{company_name}}, {{full_name}}, {{current_date}}
//   2. Direct path tokens:   {{__settings.companyName}}, {{__computed.currentDate}}
//      (produced when users type or import templates using raw field paths)

import { format } from 'date-fns'
import { VARIABLE_REGISTRY } from '@/constants/variable-registry'
import type { Employee } from '@/types/employee'
import type { CompanySettings } from '@/types/settings'

// ── Helpers ───────────────────────────────────────────────────────────────

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Compute runtime-only values (date, year, month).
 */
function computeValue(key: string): string {
  const now = new Date()
  switch (key) {
    case 'currentDate':
      return format(now, 'dd MMMM yyyy')          // e.g. "20 June 2024"
    case 'currentYear':
      return format(now, 'yyyy')
    case 'currentMonth':
      return format(now, 'MMMM yyyy')              // e.g. "June 2024"
    default:
      return ''
  }
}

// ── Main export ───────────────────────────────────────────────────────────

export interface FillVariablesResult {
  result: string
  missing: string[]
}

/**
 * Fill all {{variable_name}} tokens in a markdown template.
 *
 * Handles two token styles:
 *  - Registry keys: {{company_name}} → resolved via VARIABLE_REGISTRY
 *  - Direct paths:  {{__settings.companyName}} → resolved directly from settings
 *                   {{__computed.currentDate}} → resolved from computeValue()
 *
 * @param template  - Raw markdown string with {{variable}} placeholders.
 * @param employee  - Employee data object.
 * @param settings  - CompanySettings data object.
 * @returns Object with the filled markdown string and list of variable names
 *          that could not be resolved (empty string or undefined in source).
 */
export function fillVariables(
  template: string,
  employee: Employee,
  settings: CompanySettings
): FillVariablesResult {
  const missing: string[] = []

  const result = template.replace(/\{\{([^}]+)\}\}/g, (match, rawName) => {
    const varName = rawName.trim()

    // ── Style 1: Direct __settings.* path token ───────────────────────────
    // e.g. {{__settings.companyName}} — resolve directly from settings object
    if (varName.startsWith('__settings.')) {
      const settingsKey = varName.replace('__settings.', '')
      const raw = getNestedValue(settings, settingsKey)
      const value = raw != null && raw !== '' ? String(raw) : undefined
      if (!value) {
        missing.push(varName)
        return match
      }
      return value
    }

    // ── Style 2: Direct __computed.* path token ───────────────────────────
    // e.g. {{__computed.currentDate}}
    if (varName.startsWith('__computed.')) {
      const computedKey = varName.replace('__computed.', '')
      const value = computeValue(computedKey)
      if (!value) {
        missing.push(varName)
        return match
      }
      return value
    }

    // ── Style 3: Registry key lookup ──────────────────────────────────────
    // e.g. {{company_name}} → VARIABLE_REGISTRY → '__settings.companyName'
    const fieldPath = VARIABLE_REGISTRY[varName]

    if (!fieldPath) {
      // Unknown variable — not in registry and no direct prefix, leave as-is
      missing.push(varName)
      return match
    }

    let value: string | undefined

    if (fieldPath.startsWith('__computed.')) {
      const computedKey = fieldPath.replace('__computed.', '')
      value = computeValue(computedKey)
    } else if (fieldPath.startsWith('__settings.')) {
      const settingsKey = fieldPath.replace('__settings.', '')
      const raw = getNestedValue(settings, settingsKey)
      value = raw != null && raw !== '' ? String(raw) : undefined
    } else {
      const raw = getNestedValue(employee, fieldPath)
      // Format salary nicely (number → Indian locale currency string)
      if (varName === 'salary' && typeof raw === 'number') {
        value = raw.toLocaleString('en-IN')
      } else {
        value = raw != null && raw !== '' ? String(raw) : undefined
      }
    }

    if (!value) {
      missing.push(varName)
      return match               // Leave {{variable}} in place when empty
    }

    return value
  })

  return { result, missing: [...new Set(missing)] }
}

