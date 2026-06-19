// constants/departments.ts
// AirBuddy Aerospace department list — used in employee forms and filters

export const DEPARTMENTS = [
  'Software',
  'Electronics',
  'Mechanical',
  'Electrical',
  'Electromagnetic',
  'Material Science',
  'R&D',
  'Operations',
  'HR',
  'Management',
] as const

// TypeScript type derived from the constant array
export type Department = typeof DEPARTMENTS[number]
