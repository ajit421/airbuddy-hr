// constants/variable-registry.ts
// Maps every {{variable_name}} used in templates to its data source path.
//
// Path conventions:
//   'fieldName'            → direct field on Employee object
//   'nested.field'         → nested field (e.g. address.city)
//   '__settings.fieldName' → field from CompanySettings object
//   '__computed.key'       → dynamically computed at fill time

export const VARIABLE_REGISTRY: Record<string, string> = {
  // ── Employee identity ──────────────────────────────────────────────────
  employee_id:       'employeeId',
  full_name:         'fullName',
  father_name:       'fatherName',
  gender:            'gender',
  date_of_birth:     'dateOfBirth',
  email:             'email',
  mobile:            'mobile',

  // ── Employee position ──────────────────────────────────────────────────
  designation:       'designation',
  department:        'department',
  joining_date:      'joiningDate',
  employee_status:   'status',
  salary:            'salary',

  // ── Government IDs ────────────────────────────────────────────────────
  aadhaar_number:    'aadhaarNumber',
  pan_number:        'panNumber',

  // ── Address ───────────────────────────────────────────────────────────
  address:           'address.street',
  address_street:    'address.street',
  address_city:      'address.city',
  address_state:     'address.state',
  address_pincode:   'address.pincode',

  // ── Bank details ──────────────────────────────────────────────────────
  bank_name:         'bankDetails.bankName',
  account_number:    'bankDetails.accountNumber',
  ifsc_code:         'bankDetails.ifscCode',
  account_type:      'bankDetails.accountType',

  // ── Company / Settings ────────────────────────────────────────────────
  company_name:      '__settings.companyName',
  company_address:   '__settings.companyAddress',
  company_cin:       '__settings.companyCIN',
  company_email:     '__settings.companyEmail',
  company_phone:     '__settings.companyPhone',
  hr_name:           '__settings.hrName',
  hr_designation:    '__settings.hrDesignation',

  // ── Computed at runtime ───────────────────────────────────────────────
  current_date:      '__computed.currentDate',
  document_date:     '__computed.currentDate',
  current_year:      '__computed.currentYear',
  current_month:     '__computed.currentMonth',
}

/**
 * All variable names available for use in templates as {{variable_name}}.
 * Used by the variable picker panel in the template editor.
 */
export const ALL_VARIABLES = Object.keys(VARIABLE_REGISTRY)

/**
 * Variables that come from CompanySettings (prefixed with __settings.)
 */
export const SETTINGS_VARIABLES = ALL_VARIABLES.filter(
  (key) => VARIABLE_REGISTRY[key].startsWith('__settings.')
)

/**
 * Variables that are dynamically computed (prefixed with __computed.)
 */
export const COMPUTED_VARIABLES = ALL_VARIABLES.filter(
  (key) => VARIABLE_REGISTRY[key].startsWith('__computed.')
)

/**
 * Variables sourced directly from the Employee object.
 */
export const EMPLOYEE_VARIABLES = ALL_VARIABLES.filter(
  (key) =>
    !VARIABLE_REGISTRY[key].startsWith('__settings.') &&
    !VARIABLE_REGISTRY[key].startsWith('__computed.')
)
