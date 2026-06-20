// lib/templates/extract-variables.ts
// Utility to extract all {{variable_name}} tokens from a markdown template string.

/**
 * Extract all unique variable names from a markdown template string.
 * Matches tokens of the form {{variable_name}} and returns deduplicated names.
 *
 * @param markdown - The raw markdown template content.
 * @returns Deduplicated array of variable names (without the {{ }} wrappers).
 *
 * @example
 *   extractVariables('Hello {{full_name}}, your ID is {{employee_id}}.')
 *   // → ['full_name', 'employee_id']
 */
export function extractVariables(markdown: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const found = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = regex.exec(markdown)) !== null) {
    const varName = match[1].trim()
    if (varName) found.add(varName)
  }

  return Array.from(found)
}
