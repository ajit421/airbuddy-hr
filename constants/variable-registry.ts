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
  company_name:                 '__settings.companyName',
  company_address:              '__settings.companyAddress',
  company_cin:                  '__settings.companyCIN',
  company_email:                '__settings.companyEmail',
  company_phone:                '__settings.companyPhone',
  company_pan:                  '__settings.companyPAN',
  company_registered_address:   '__settings.companyRegisteredAddress',
  hr_name:                      '__settings.hrName',
  hr_designation:               '__settings.hrDesignation',

  // ── Computed at runtime ───────────────────────────────────────────────
  current_date:      '__computed.currentDate',
  document_date:     '__computed.currentDate',
  current_year:      '__computed.currentYear',
  current_month:     '__computed.currentMonth',

  // ── Offer Letter — position & employment ─────────────────────────────
  // These are entered by HR at document-generation time (custom variables).
  // They are intentionally NOT mapped to an Employee field because the
  // offer letter captures intent *before* the employee record is updated.
  reporting_manager:       '',   // e.g. "Bibhuti Rajput"
  employment_type:         '',   // e.g. "Full-Time, On-Roll"
  work_mode:               '',   // e.g. "WFH / WFO / Hybrid"
  work_location:           '',   // e.g. "Greater Noida, Uttar Pradesh"
  place_of_posting:        '',   // e.g. "B-43, Phi 3, Greater Noida, UP – 201310"
  commencement_date:       '',   // e.g. "1st August 2026"
  probation_period:        '',   // e.g. "6 months"
  confirmation_duration:   '',   // e.g. "3 years"
  employee_address_full:   '',   // multi-line: street, city, state, pin

  // ── Offer Letter — working hours ─────────────────────────────────────
  work_days:    '',   // e.g. "Monday – Saturday"
  work_timings: '',   // e.g. "9:00 AM – 6:00 PM"
  weekly_off:   '',   // e.g. "Sunday"

  // ── Offer Letter — compensation (monthly amounts) ────────────────────
  basic_salary:        '',   // e.g. "18,000"
  hra:                 '',   // e.g. "2,000"
  special_allowance:   '',   // e.g. "3,000"
  conveyance:          '',   // e.g. "1,200"
  medical_allowance:   '',   // e.g. "800"
  total_ctc:           '',   // AUTO-COMPUTED: sum of monthly components
  annual_ctc:          '',   // AUTO-COMPUTED: total_ctc × 12

  // ── Offer Letter — annual amounts (AUTO-COMPUTED by generate API) ─────
  // HR fills in monthly values; the generate API injects these automatically.
  basic_salary_annual:         '',   // basic_salary × 12
  hra_annual:                  '',   // hra × 12
  special_allowance_annual:    '',   // special_allowance × 12
  conveyance_annual:           '',   // conveyance × 12
  medical_allowance_annual:    '',   // medical_allowance × 12

  // ── Offer Letter — notice period ─────────────────────────────────────
  notice_during_probation:   '',   // e.g. "30 days"
  notice_post_confirmation:  '',   // e.g. "60 days"

  // ── Offer Letter — signatory ─────────────────────────────────────────
  ceo_name:        '',   // e.g. "Alisha Raj"
  ceo_designation: '',   // e.g. "Chief Executive Officer (CEO)"
  ceo_email:       '',   // e.g. "alisha@airbuddy.in"

  // ── Offer Letter — job description ───────────────────────────────────
  // HR pastes bullet-point lines (each starting with "- ") separated by \n
  jd_responsibilities: '',
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
