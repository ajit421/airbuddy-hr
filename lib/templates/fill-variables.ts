// lib/templates/fill-variables.ts
// Template variable fill engine.
// Replaces {{variable_name}} tokens in a markdown template with real values
// sourced from an Employee record, CompanySettings, or computed at runtime.

import { format } from 'date-fns'
import { VARIABLE_REGISTRY } from '@/constants/variable-registry'
import type { Employee } from '@/types/employee'
import type { CompanySettings } from '@/types/settings'

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Resolve a dot-notation path against an object without lodash.
 * e.g. getNestedValue(employee, 'address.city') → 'Pune'
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
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
    const fieldPath = VARIABLE_REGISTRY[varName]

    if (!fieldPath) {
      // Unknown variable — not in registry, leave as-is and mark missing
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
      value = raw != null ? String(raw) : undefined
    } else {
      const raw = getNestedValue(employee, fieldPath)
      // Format salary nicely (number → Indian locale currency string)
      if (varName === 'salary' && typeof raw === 'number') {
        value = raw.toLocaleString('en-IN')
      } else {
        value = raw != null ? String(raw) : undefined
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
