# AirBuddy HR Document Platform — Build TODO

> **AI IDE Instructions:** Work through this file top to bottom, one task at a time.
> Each task has a clear goal, file path, and tech context.
> Mark tasks `[x]` as you complete them. Never skip a task — each one depends on the previous.

---

## STACK REFERENCE (read before starting)

```
Framework     : Next.js (Pages Router — NOT App Router)
Language      : TypeScript (strict: false initially)
Styling       : TailwindCSS + shadcn/ui
Auth          : Firebase Auth (Google OAuth only)
Database      : Firebase Firestore
Storage       : Firebase Storage (private bucket, signed URLs)
AI + OCR      : Gemini 2.5 Flash API (server-side only)
PDF Generate  : @react-pdf/renderer
PDF Signature : pdf-lib
DOCX Export   : docx (npm)
MD Editor     : @uiw/react-md-editor
Forms         : react-hook-form + zod
Deployment    : Vercel
```

---

## PHASE 1 — PROJECT SETUP (Day 1)

### 1.1 — Initialize Next.js project

- [ ] Run: `npx create-next-app@latest airbuddy-hr --typescript --tailwind --eslint --no-app --no-src-dir --import-alias "@/*"`
  > ⚠️ `--no-src-dir` places source at root (`pages/`, `components/`). The system design showed `src/` paths, but this TODO consistently uses flat paths — both approaches work with Next.js.
- [ ] Verify Pages Router is used (`pages/` directory exists, NOT `app/`)
- [ ] Open the project folder in your editor/IDE (all subsequent commands assume you're in the project root)

### 1.2 — Install all dependencies

- [ ] Install production deps:
  ```
  npm install firebase firebase-admin @google/generative-ai
  npm install @react-pdf/renderer pdf-lib docx
  npm install @uiw/react-md-editor
  npm install react-hook-form zod @hookform/resolvers
  npm install date-fns
  npm install sharp marked diff
  ```
- [ ] Install shadcn/ui:
  ```
  npx shadcn-ui@latest init
  ```
  Choose: TypeScript=yes, style=default, base color=slate, CSS variables=yes
- [ ] Add shadcn components:
  ```
  npx shadcn-ui@latest add button input label select badge table dialog
  npx shadcn-ui@latest add dropdown-menu toast card separator tabs
  npx shadcn-ui@latest add alert form textarea
  ```

### 1.3 — Create folder structure

- [ ] Create all directories (Windows PowerShell):
  ```powershell
  $dirs = @(
    "pages/api/auth", "pages/api/employees", "pages/api/ocr",
    "pages/api/templates", "pages/api/documents", "pages/api/export",
    "pages/api/settings", "pages/api/audit",
    "pages/employees", "pages/templates", "pages/documents",
    "components/layout", "components/employees", "components/templates",
    "components/documents", "components/export", "components/audit",
    "lib/firebase", "lib/gemini", "lib/export",
    "lib/templates", "lib/employees", "lib/audit",
    "hooks", "types", "constants"
  )
  $dirs | ForEach-Object { New-Item -ItemType Directory -Path $_ -Force | Out-Null }
  ```

### 1.4 — Environment variables

- [ ] Create `.env.local` in project root with these keys (fill in real values from Firebase + Gemini console):
  ```env
  # Firebase Client (NEXT_PUBLIC_ prefix — safe to expose to browser)
  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  NEXT_PUBLIC_FIREBASE_APP_ID=

  # Firebase Admin SDK (NO NEXT_PUBLIC_ — server-side only, never expose)
  FIREBASE_ADMIN_PROJECT_ID=
  FIREBASE_ADMIN_CLIENT_EMAIL=
  FIREBASE_ADMIN_PRIVATE_KEY=

  # Gemini API (server-side only)
  GEMINI_API_KEY=

  # App config
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  NEXT_PUBLIC_ALLOWED_DOMAIN=airbuddy.in
  ```
- [ ] Create `.env.example` (same keys, empty values — not to be committed to git)
- [ ] Add `.env.local` to `.gitignore`

### 1.5 — TypeScript config

- [ ] In `tsconfig.json` set `"strict": false` for now
- [ ] Verify `@/*` path alias is configured

### 1.6 — Initial Vercel deploy

- [ ] Push to GitHub repo: `airbuddy-hr`
- [ ] Connect repo to Vercel, deploy
- [ ] Verify live URL loads Next.js default page
- [ ] Add all env vars from `.env.local` to Vercel dashboard → Settings → Environment Variables

---

## PHASE 2 — FIREBASE SETUP (Day 1–2)

### 2.1 — Firebase project

- [ ] Go to console.firebase.google.com → Create project "airbuddy-hr"
- [ ] Enable Firestore Database (production mode)
- [ ] Enable Firebase Storage (production mode)
- [ ] Enable Authentication → Sign-in method → Google → Enable
- [ ] In Google OAuth, set Authorized domain: `your-app.vercel.app`
- [ ] Generate Admin SDK service account: Project Settings → Service Accounts → Generate new private key → save as JSON

### 2.2 — Firebase client config (`lib/firebase/client.ts`)

- [ ] Create `lib/firebase/client.ts`:
  ```typescript
  import { initializeApp, getApps, getApp } from 'firebase/app'
  import { getAuth } from 'firebase/auth'
  import { getFirestore } from 'firebase/firestore'
  import { getStorage } from 'firebase/storage'

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  export const auth = getAuth(app)
  export const db = getFirestore(app)
  export const storage = getStorage(app)
  export default app
  ```

### 2.3 — Firebase Admin config (`lib/firebase/admin.ts`)

- [ ] Create `lib/firebase/admin.ts`:
  ```typescript
  import * as admin from 'firebase-admin'

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
  }

  export const adminAuth = admin.auth()
  export const adminDb = admin.firestore()
  export const adminStorage = admin.storage()
  export default admin
  ```

### 2.4 — API auth middleware (`lib/api-middleware.ts`)

- [ ] Create `lib/api-middleware.ts`:
  ```typescript
  import { NextApiRequest, NextApiResponse } from 'next'
  import { adminAuth } from '@/lib/firebase/admin'

  export async function withAuth(
    req: NextApiRequest,
    res: NextApiResponse,
    handler: (uid: string, email: string) => Promise<void>
  ) {
    const sessionCookie = req.cookies['session'] ?? ''
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
      await handler(decoded.uid, decoded.email ?? '')
    } catch {
      res.status(401).json({ error: 'Session expired. Please log in again.' })
    }
  }
  ```

### 2.5 — Auth session API routes

- [ ] Create `pages/api/auth/session.ts` — handles POST (create session cookie from idToken) and DELETE (clear cookie):
  - POST: verify idToken with Firebase Admin → createSessionCookie (expiresIn: 7 days) → set HttpOnly cookie → return 200
  - DELETE: clear session cookie → return 200

### 2.6 — Auth hook (`hooks/useAuth.ts`)

- [ ] Create `hooks/useAuth.ts` using `onAuthStateChanged` from Firebase client
- [ ] Expose: `{ user, loading, signInWithGoogle, signOut }`
- [ ] `signInWithGoogle` uses `signInWithPopup(auth, new GoogleAuthProvider())`
- [ ] After signInWithPopup: get idToken → POST to `/api/auth/session` → redirect to `/dashboard`
- [ ] `signOut`: DELETE `/api/auth/session` → `firebaseSignOut(auth)` → redirect to `/login`

### 2.7 — Firestore security rules

- [ ] Go to Firebase Console → Firestore → Rules → paste:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      function isAuth() {
        return request.auth != null &&
               exists(/databases/$(database)/documents/users/$(request.auth.uid));
      }
      match /users/{userId} {
        allow read: if request.auth.uid == userId;
        allow write: if false;
      }
      match /employees/{id} {
        allow read, write: if isAuth();
        match /files/{fid} { allow read, write: if isAuth(); }
        match /documents/{did} {
          allow read, write: if isAuth();
          match /versions/{vid} { allow read, write: if isAuth(); }
        }
      }
      match /templates/{id} { allow read, write: if isAuth(); }
      match /audit_logs/{id} {
        allow read: if isAuth();
        allow write: if false;
      }
      match /settings/{id} {
        allow read: if isAuth();
        allow write: if false;
      }
    }
  }
  ```

### 2.8 — Firebase Storage rules

- [ ] Go to Firebase Console → Storage → Rules → paste:
  ```
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /{allPaths=**} {
        allow read, write: if false;
      }
    }
  }
  ```
  *(All access goes through Admin SDK on the server — never direct from client)*

---

## PHASE 3 — TYPES & CONSTANTS (Day 2)

### 3.1 — TypeScript types (`types/`)

- [ ] Create `types/employee.ts` — Employee interface:
  ```typescript
  export type EmployeeStatus = 'intern' | 'full-time' | 'contract' | 'resigned' | 'terminated'
  export interface BankDetails {
    bankName: string
    accountNumber: string
    ifscCode: string
    accountType: 'savings' | 'current'
  }
  export interface Employee {
    id: string
    employeeId: string        // AB-2024-001
    fullName: string
    fatherName: string
    gender: 'male' | 'female' | 'other'
    dateOfBirth: string
    email: string
    mobile: string
    address: { street: string; city: string; state: string; pincode: string }
    aadhaarNumber: string
    panNumber: string
    department: string
    designation: string
    joiningDate: string
    status: EmployeeStatus
    salary: number
    bankDetails: BankDetails
    profilePhotoPath: string
    isDeleted: boolean
    deletedAt: string | null
    deletedBy: string | null
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy: string
  }
  ```

- [ ] Create `types/template.ts` — Template interface:
  ```typescript
  export type DocumentType = 'offer_letter' | 'nda' | 'internship_letter' | 'salary_slip' | 'experience_letter' | 'appointment_letter'
  export interface Template {
    id: string
    name: string
    type: DocumentType
    description: string
    markdownContent: string
    variables: string[]
    applicableStatus: string[]
    isActive: boolean
    isDefault: boolean
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy: string
  }
  ```

- [ ] Create `types/document.ts` — Document and Version interfaces:
  ```typescript
  export interface DocumentRecord {
    id: string
    templateId: string
    documentType: string
    title: string
    status: 'draft' | 'final'
    currentVersion: number
    createdAt: string
    updatedAt: string
    createdBy: string
  }
  export interface DocumentVersion {
    id: string
    versionNumber: number
    markdownContent: string
    exportedAs: 'pdf' | 'docx' | 'md' | null
    exportStoragePath: string | null
    hasSigned: boolean
    signedAt: string | null
    aiImproved: boolean
    createdAt: string
    createdBy: string
    changeNote: string
  }
  ```

- [ ] Create `types/audit.ts` — AuditLog interface with full action enum

- [ ] Create `types/user.ts` — User interface (from system design Section 6.2):
  ```typescript
  export interface User {
    uid: string
    email: string
    displayName: string
    role: 'super_admin'
    photoURL: string
    createdAt: string
    lastLogin: string
    isActive: boolean
  }
  ```

- [ ] Create `types/settings.ts` — CompanySettings interface:
  ```typescript
  export interface CompanySettings {
    companyName: string
    companyAddress: string
    companyCIN: string
    companyEmail: string
    companyPhone: string
    hrName: string
    hrDesignation: string
    signatureStoragePath: string
    employeeIdPrefix: string
    employeeIdYear: number
    employeeIdCounter: number
    updatedAt: string
    updatedBy: string
  }
  ```

- [ ] Create `types/api.ts` — API request/response types (shared interfaces for API route handlers)

### 3.2 — Constants (`constants/`)

- [ ] Create `constants/variable-registry.ts` — maps every `{{variable_name}}` to its employee field path:
  ```typescript
  export const VARIABLE_REGISTRY: Record<string, string> = {
    employee_id:     'employeeId',
    full_name:       'fullName',
    father_name:     'fatherName',
    designation:     'designation',
    department:      'department',
    joining_date:    'joiningDate',
    salary:          'salary',
    email:           'email',
    mobile:          'mobile',
    aadhaar_number:  'aadhaarNumber',
    pan_number:      'panNumber',
    address:         'address.street',
    bank_name:       'bankDetails.bankName',
    account_number:  'bankDetails.accountNumber',
    ifsc_code:       'bankDetails.ifscCode',
    // Company constants (from settings)
    company_name:    '__settings.companyName',
    company_address: '__settings.companyAddress',
    hr_name:         '__settings.hrName',
    hr_designation:  '__settings.hrDesignation',
    current_date:    '__computed.currentDate',
    document_date:   '__computed.currentDate',
    employee_status: 'status',
  }

  export const ALL_VARIABLES = Object.keys(VARIABLE_REGISTRY)
  ```

- [ ] Create `constants/departments.ts` — array of AirBuddy departments:
  `['Software', 'Electronics', 'Mechanical', 'Electrical', 'Electromagnetic', 'Material Science', 'R&D', 'Operations', 'HR', 'Management']`

- [ ] Create `constants/document-types.ts` — document type labels and applicable status map

---

## PHASE 4 — LAYOUT & AUTH PAGES (Day 2)

### 4.1 — App layout (`components/layout/`)

- [ ] Create `components/layout/AppLayout.tsx`:
  - Sidebar (200px fixed left) + main content area
  - Sidebar items: Dashboard, Employees, Templates, Generate Doc, Audit Log, Settings
  - Bottom of sidebar: logged-in user avatar (initials), name, role, logout button
  - Active route highlighted using `useRouter().pathname`
  - Wrap content in `<AuthGuard>`

- [ ] Create `components/layout/AuthGuard.tsx`:
  - Uses `useAuth()` hook
  - If `loading`: show full-page spinner
  - If `!user`: redirect to `/login`
  - If `user`: render `children`

### 4.2 — Login page (`pages/login.tsx`)

- [ ] Create `pages/login.tsx`:
  - Centered card design
  - AirBuddy logo + "HR Document Platform"
  - "Sign in with Google" button — calls `signInWithGoogle()` from `useAuth`
  - If user already logged in: redirect to `/dashboard`
  - Show error message if login fails

### 4.3 — `pages/_app.tsx`

- [ ] Wrap app with Toaster (shadcn/ui) for global toast notifications
- [ ] No extra providers needed — auth state comes from `useAuth` hook per-page

### 4.4 — Index redirect (`pages/index.tsx`)

- [ ] `pages/index.tsx` → just `router.replace('/dashboard')` or redirect via `getServerSideProps`

---

## PHASE 5 — EMPLOYEE MANAGEMENT (Day 3–4)

### 5.1 — Employee ID generator (`lib/employees/generate-id.ts`)

- [ ] Create `lib/employees/generate-id.ts`:
  - Reads current counter from `/settings/company` Firestore doc
  - Increments counter using Firestore transaction
  - Returns formatted ID: `AB-{YEAR}-{NNN}` e.g. `AB-2024-001`

### 5.2 — Employee list page (`pages/employees/index.tsx`)

- [ ] Fetch all employees from Firestore where `isDeleted == false`
- [ ] Display in shadcn Table: Employee ID, Name, Department, Designation, Status badge, Actions
- [ ] Search bar — client-side filter on name, employeeId, department
- [ ] Status filter dropdown: All / Intern / Full-Time / Contract / Resigned / Terminated
- [ ] "Add Employee" button → `/employees/new`
- [ ] Row click → `/employees/[id]`
- [ ] Status badge colors: full-time=green, intern=blue, contract=amber, resigned=red, terminated=gray

### 5.3 — Create employee page (`pages/employees/new.tsx`)

- [ ] Form with ALL employee fields (react-hook-form + zod validation)
- [ ] Required fields: fullName, email, mobile, department, designation, joiningDate, status
- [ ] Optional: fatherName, DOB, gender, aadhaarNumber, panNumber, address, salary, bankDetails
- [ ] On submit: auto-generate employeeId → save to Firestore `/employees/{id}` → redirect to `/employees/{id}`
- [ ] Write audit log: action=EMPLOYEE_CREATE

### 5.4 — Employee detail page (`pages/employees/[id]/index.tsx`)

- [ ] Fetch employee by ID from Firestore
- [ ] Display all fields in read mode by default
- [ ] "Edit" button → inline edit mode (same form, pre-filled)
- [ ] On save: update Firestore → write audit log: action=EMPLOYEE_UPDATE
- [ ] Tabs: Overview | Files | Documents
- [ ] "Generate Document" button → `/documents/generate?employeeId={id}`
- [ ] "Delete" button (soft delete): only if user is super admin → set `isDeleted: true`, `deletedAt`, `deletedBy` → write audit log: action=EMPLOYEE_DELETE

### 5.5 — Audit log helper (`lib/audit/logger.ts`)

- [ ] Create `lib/audit/logger.ts` with function `createAuditLog(data)`:
  - Uses Firebase **Admin SDK** (not client SDK) — called only from API routes
  - Always uses `admin.firestore.FieldValue.serverTimestamp()` for timestamp
  - Writes to `/audit_logs` collection
  - Never throws — wrap in try/catch, log error silently

---

## PHASE 6 — FILE UPLOAD + OCR (Day 4–5–6–7)

### 6.0 — Shared lib modules (create before API routes)

- [ ] Create `lib/firebase/storage-helpers.ts`:
  - `generateSignedUploadUrl(storagePath, mimeType, expiresInMs)` → returns signed PUT URL
  - `generateSignedDownloadUrl(storagePath, expiresInMs)` → returns signed GET URL
  - `downloadFileBuffer(storagePath)` → returns file Buffer from Storage
  - Uses Firebase Admin Storage for all operations

- [ ] Create `lib/gemini/client.ts`:
  - Initialize `GoogleGenerativeAI` with `GEMINI_API_KEY`
  - Export configured `gemini-2.5-flash` model instance

- [ ] Create `lib/gemini/prompts.ts`:
  - Export all Gemini prompt strings (OCR Aadhaar, OCR PAN, AI document improve)
  - Single source of truth for all prompts

- [ ] Create `lib/gemini/ocr.ts`:
  - `extractFromAadhaar(imageBuffer, mimeType)` → returns parsed JSON or raw text
  - `extractFromPAN(imageBuffer, mimeType)` → returns parsed JSON or raw text
  - Uses client from `lib/gemini/client.ts` + prompts from `lib/gemini/prompts.ts`

- [ ] Create `lib/gemini/improve.ts`:
  - `improveDocument(markdownContent, documentType)` → returns improved markdown
  - Uses client + prompts from shared modules

### 6.1 — File upload API route (`pages/api/employees/[id]/files/index.ts`)

- [ ] POST handler:
  - Verify session cookie with `withAuth`
  - Accept: `{ fileType: 'aadhaar' | 'pan' | 'resume' | 'photo', fileName: string, mimeType: string }`
  - Generate storage path: `employees/{employeeId}/{fileType}.{ext}`
  - Use Firebase Admin Storage to generate a signed upload URL (1-hour expiry, `PUT` method)
  - Save file metadata to Firestore `/employees/{id}/files/{fileId}` with `ocrStatus: 'pending'`
  - Return: `{ uploadUrl, fileId, storagePath }`
  - Write audit log: action=FILE_UPLOAD

- [ ] GET handler:
  - Return list of all files for employee from Firestore subcollection
  - For each file, generate a signed download URL (1-hour expiry) using Admin Storage

### 6.2 — File upload component (`components/employees/FileUploadZone.tsx`)

- [ ] Drag-and-drop zone + click to select file
- [ ] Accept: image/jpeg, image/png, application/pdf — max 10MB
- [ ] On file select:
  1. POST to `/api/employees/{id}/files` → get signed upload URL
  2. PUT file directly to Firebase Storage signed URL
  3. Show success + "Extract with OCR" button
- [ ] Show existing files list with type label, upload date, OCR status badge
- [ ] View file button → open signed URL in new tab
- [ ] Delete file button → DELETE `/api/employees/{id}/files/{fileId}`

### 6.3 — OCR API route (`pages/api/ocr/extract.ts`)

- [ ] POST handler with `withAuth`
- [ ] Accept: `{ storagePath: string, fileType: 'aadhaar' | 'pan', employeeId: string, fileId: string }`
- [ ] Download file buffer from Firebase Storage using Admin SDK
- [ ] Convert to base64
- [ ] Send to Gemini 2.5 Flash with this exact prompt for Aadhaar:
  ```
  Extract data from this Aadhaar card image. Return ONLY valid JSON, no explanation, no markdown.
  {
    "fullName": "",
    "dateOfBirth": "",
    "gender": "",
    "aadhaarNumber": "",
    "address": { "street": "", "city": "", "state": "", "pincode": "" }
  }
  If any field is unclear or missing, return "" for that field.
  ```
- [ ] For PAN card, extract: `{ fullName, fatherName, dateOfBirth, panNumber }`
- [ ] Parse Gemini response as JSON (wrap in try/catch)
- [ ] Update Firestore file doc: `ocrStatus: 'completed'`, `ocrData: {...}`
- [ ] Return: `{ success: true, data: {...} }` or `{ success: false, rawText: string }`
- [ ] Write audit log: action=OCR_TRIGGERED

### 6.4 — OCR review form (`components/employees/OCRReviewForm.tsx`)

- [ ] Show extracted fields in editable inputs (pre-filled with OCR data)
- [ ] Highlight fields with empty values in amber
- [ ] "Confirm & Save to Profile" button:
  - PATCH employee in Firestore with confirmed field values
  - Update file doc: `ocrReviewed: true`, `ocrReviewedAt`
  - Write audit log: action=OCR_REVIEWED
- [ ] "Enter Manually" link — skip OCR, show blank form

### 6.5 — Files tab in employee detail page

- [ ] Wire `FileUploadZone` and `OCRReviewForm` into `pages/employees/[id]/files.tsx`
- [ ] Flow: Upload → OCR → Review → Save to profile → done

---

## PHASE 7 — TEMPLATE MANAGEMENT (Day 8–9)

### 7.1 — Template list page (`pages/templates/index.tsx`)

- [ ] Fetch all templates from Firestore where `isActive == true`
- [ ] Display as cards: name, type, applicable status badges, variable count, edit/delete actions
- [ ] "Create Template" button → `/templates/new`
- [ ] Toggle active/inactive (isActive field)

### 7.2 — Template editor page (`pages/templates/[id].tsx` + `pages/templates/new.tsx`)

- [ ] Fields: name, type (dropdown), description, applicable status (multi-checkbox), markdownContent
- [ ] Markdown editor: use `@uiw/react-md-editor` — split pane (edit left, preview right)
- [ ] Variable picker panel: show all available `{{variables}}` from `VARIABLE_REGISTRY`
- [ ] Click a variable chip → insert at cursor position in editor
- [ ] Auto-extract variables from content using regex: `/\{\{([^}]+)\}\}/g`
- [ ] Save extracted variable list to `variables: string[]` in Firestore
- [ ] On save: write to `/templates/{id}` → write audit log: action=TEMPLATE_CREATE or TEMPLATE_UPDATE

### 7.3 — Variable extraction utility (`lib/templates/extract-variables.ts`)

- [ ] Function `extractVariables(markdown: string): string[]`
  - Regex match all `{{variable_name}}` tokens
  - Return deduplicated array of variable names

### 7.4 — Variable fill engine (`lib/templates/fill-variables.ts`)

- [ ] Function `fillVariables(template: string, employee: Employee, settings: CompanySettings): { result: string, missing: string[] }`
- [ ] For each `{{variable}}` in template:
  - Look up in `VARIABLE_REGISTRY` → get field path
  - If path starts with `__settings.` → read from settings object
  - If path starts with `__computed.` → compute (e.g. today's date)
  - Otherwise → use a custom `getNestedValue(obj, path)` helper function (avoids lodash dependency):
    ```typescript
    function getNestedValue(obj: any, path: string): any {
      return path.split('.').reduce((acc, key) => acc?.[key], obj)
    }
    ```
  - If value is empty/undefined → add to `missing[]` array, leave `{{variable}}` in place
- [ ] Return filled markdown + list of missing variables

### 7.5 — Default template seeder (`lib/templates/seed-defaults.ts`)

- [ ] Function `seedDefaultTemplates()` — checks if templates collection is empty → if yes, inserts 6 default templates:
  1. Offer Letter
  2. Internship Letter
  3. NDA Agreement
  4. Salary Slip
  5. Experience Letter
  6. Appointment Letter
- [ ] Each template has proper Markdown content with all relevant `{{variables}}`
- [ ] Call this function from `pages/api/settings/index.ts` GET on first load check

---

## PHASE 8 — DOCUMENT GENERATION (Day 10–11)

### 8.1 — Document generation API (`pages/api/documents/generate.ts`)

- [ ] POST handler with `withAuth`
- [ ] Accept: `{ employeeId: string, templateId: string, customVariables?: Record<string, string> }`
- [ ] Fetch employee + template + company settings from Firestore
- [ ] Call `fillVariables()` → get filled markdown + missing list
- [ ] Create document record in `/employees/{id}/documents/{docId}`
- [ ] Create version v1 in `/employees/{id}/documents/{docId}/versions/v1`
- [ ] Return: `{ documentId, markdownContent, missingVariables, versionId }`
- [ ] Write audit log: action=DOCUMENT_GENERATE

### 8.2 — Document generator page (`pages/documents/generate/[employeeId].tsx`)

This is the main multi-step workflow page. Implement as 4 steps in a single page with step indicator:

**Step 1 — Select Template:**
- [ ] Show employee name + status at top
- [ ] List only templates where employee status is in `applicableStatus`
- [ ] Template cards with name, type, variable count
- [ ] Select template → move to Step 2

**Step 2 — Review Variables:**
- [ ] POST to `/api/documents/generate` → get filled markdown + missing list
- [ ] If missing variables: show form with labeled inputs for each missing variable, highlighted in amber
- [ ] HR fills missing vars → re-generate → confirm → move to Step 3
- [ ] If no missing vars: auto-proceed to Step 3

**Step 3 — Edit Document:**
- [ ] `@uiw/react-md-editor` with split pane (editor left, preview right)
- [ ] Show "⚠️ Missing variables" banner if any remain (red highlight)
- [ ] "✨ AI Improve" button → calls AI improve workflow (see Phase 10)
- [ ] "Continue to Export →" button → save current content → move to Step 4

**Step 4 — Export:**
- [ ] Signature toggle: "Add HR signature to PDF"
- [ ] Export buttons: [Export PDF] [Export DOCX] [Export Markdown]
- [ ] Each button calls respective export API route
- [ ] On success: trigger file download + show success toast
- [ ] "Version History" panel (collapsible) shows all previous versions

### 8.3 — Save document version API (`pages/api/documents/[docId]/versions.ts`)

- [ ] POST: save new version to Firestore subcollection
  - Increment `currentVersion` counter on parent document
  - Accept: `{ employeeId, markdownContent, changeNote, aiImproved }`
  - Return: `{ versionId, versionNumber }`
- [ ] GET: list all versions for a document

---

## PHASE 9 — EXPORT (Day 12–13)

### 9.1 — PDF export API (`pages/api/export/pdf.ts`)

- [ ] POST handler with `withAuth`
- [ ] Accept: `{ markdownContent: string, employeeId: string, documentId: string, versionId: string, addSignature: boolean, documentTitle: string }`
- [ ] Convert Markdown to HTML (use `marked` npm package)
- [ ] Generate PDF using `@react-pdf/renderer`:
  - Company name header on page 1
  - Rendered document content
  - Page numbers footer
  - AirBuddy Aerospace branding
- [ ] If `addSignature: true`:
  - Fetch `settings/signature.png` from Firebase Storage using Admin SDK
  - Use `pdf-lib` to overlay signature image on bottom-right of last page
  - Add text: `Signed on: {DD/MM/YYYY}`
- [ ] Save PDF buffer to Firebase Storage: `documents/{employeeId}/{documentId}/v{N}.pdf`
- [ ] Update version record in Firestore: `exportedAs: 'pdf'`, `exportStoragePath`, `hasSigned`
- [ ] Write audit log: action=DOCUMENT_EXPORT
- [ ] Return PDF as response with:
  ```
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="{employeeId}_{documentTitle}_{date}.pdf"
  ```

### 9.2 — DOCX export API (`pages/api/export/docx.ts`)

- [ ] POST handler with `withAuth`
- [ ] Accept: `{ markdownContent: string, employeeId: string, documentId: string, documentTitle: string }`
- [ ] Use `docx` npm package to generate a Word document from Markdown content:
  - Parse Markdown headings → Word headings
  - Parse bold/italic → Word character styles
  - Each paragraph → Word paragraph
- [ ] Return DOCX as response:
  ```
  Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
  Content-Disposition: attachment; filename="{employeeId}_{documentTitle}_{date}.docx"
  ```
- [ ] Write audit log: action=DOCUMENT_EXPORT

### 9.3 — Markdown export API (`pages/api/export/md.ts`)

- [ ] POST handler with `withAuth`
- [ ] Accept: `{ markdownContent: string, documentTitle: string, employeeId: string }`
- [ ] Return markdown as response:
  ```
  Content-Type: text/markdown
  Content-Disposition: attachment; filename="{employeeId}_{documentTitle}_{date}.md"
  ```
- [ ] Write audit log: action=DOCUMENT_EXPORT

---

## PHASE 10 — AI DOCUMENT IMPROVEMENT (Day 17)

> ⚠️ **Build order:** Phases 10–14 are numbered by feature, NOT by build day. Follow this chronological order:
> **Phase 14 (Day 13)** → **Phase 12 (Day 14–15)** → **Phase 11 (Day 16)** → **Phase 10 (Day 17)** → **Phase 13 (Day 19)**

### 10.1 — Gemini AI improve API (`pages/api/documents/ai-improve.ts`)

- [ ] POST handler with `withAuth`
- [ ] Accept: `{ markdownContent: string, documentType: string }`
- [ ] Send to Gemini 2.5 Flash with this system prompt:
  ```
  You are a professional HR document editor for AirBuddy Aerospace Pvt. Ltd., an aerospace startup in India.

  Improve the following HR document by:
  1. Fixing all grammar and spelling errors
  2. Making the language formal and professional
  3. Ensuring the tone is clear, respectful, and legally appropriate for India
  4. Suggesting any standard clauses that appear to be missing
  5. IMPORTANT: Keep all {{variable_name}} placeholders EXACTLY as-is — never modify them
  6. Do NOT change factual information (names, dates, salary amounts)
  7. Return ONLY the improved Markdown document — no explanation, no preamble

  Document type: {documentType}
  ```
- [ ] Return: `{ improvedMarkdown: string }`
- [ ] Write audit log: action=DOCUMENT_AI_IMPROVE
- [ ] Wrap entire Gemini call in try/catch — if fails, return original content + error message

### 10.2 — AI Improve panel component (`components/documents/AIImprovePanel.tsx`)

- [ ] Show side-by-side diff: original (left) vs improved (right)
- [ ] Highlight additions in green, removals in red (simple line-by-line diff using `diff` npm package)
- [ ] "Accept Improvements" button → replace editor content
- [ ] "Reject / Keep Original" button → close panel, keep original
- [ ] Loading state while Gemini processes

---

## PHASE 11 — SETTINGS PAGE (Day 16)

### 11.1 — Settings API (`pages/api/settings/index.ts`)

- [ ] GET: fetch `/settings/company` document from Firestore via Admin SDK
- [ ] PUT: update `/settings/company` via Admin SDK → write audit log: action=SETTINGS_UPDATE

### 11.2 — Signature API (`pages/api/settings/signature.ts`)

- [ ] POST: accept signature image upload (multipart or base64)
- [ ] Validate: must be PNG or JPG, max 2MB
- [ ] Upload to Firebase Storage: `settings/signature.png`
- [ ] Update `/settings/company` with `signatureStoragePath`
- [ ] Write audit log: action=SIGNATURE_UPDATE

### 11.3 — Settings page (`pages/settings.tsx`)

- [ ] Two sections:

  **Company Information:**
  - Fields: Company Name, Company Address, Company CIN, Company Email, Company Phone
  - Fields: HR Name, HR Designation
  - Save button → PUT `/api/settings`

  **HR Signature:**
  - Show current signature preview (if uploaded)
  - Upload new signature button (PNG/JPG only)
  - Warning: "Signature will be overlaid on all future PDF exports"

### 11.4 — Initialize company settings

- [ ] On first login, check if `/settings/company` exists in Firestore
- [ ] If not: create it with empty defaults + `employeeIdPrefix: 'AB'`, `employeeIdCounter: 0`

---

## PHASE 12 — AUDIT LOG PAGE (Day 14–15)

### 12.1 — Audit API (`pages/api/audit/index.ts`)

- [ ] GET with `withAuth`
- [ ] Query `/audit_logs` ordered by `timestamp` DESC
- [ ] Support query params: `limit=50`, `action=`, `entityType=`, `startDate=`, `endDate=`
- [ ] Return paginated results

### 12.2 — Audit log page (`pages/audit.tsx`)

- [ ] Table: Timestamp, Action, Entity Type, Entity ID, User Email, IP Address
- [ ] Action filter dropdown
- [ ] Date range picker (start/end)
- [ ] Color-coded action badges:
  - LOGIN/LOGOUT = gray
  - CREATE = green
  - UPDATE = blue
  - DELETE = red
  - EXPORT = purple
  - OCR = amber
- [ ] Paginate: show 50 per page, "Load more" button
- [ ] No delete or edit buttons anywhere on this page — read-only

---

## PHASE 13 — DASHBOARD (Day 19)

### 13.1 — Dashboard page (`pages/dashboard.tsx`)

- [ ] Stats row (4 cards):
  - Total employees (not deleted)
  - Full-time count
  - Intern count
  - Total documents generated (all time)
- [ ] Employee status breakdown: horizontal bar chart (CSS-only, no chart library needed)
- [ ] Recent employees table: last 5 added (name, department, status)
- [ ] Recent activity list: last 10 audit log entries with colored dot indicator
- [ ] Quick action buttons: Add Employee, Generate Document, New Template, View Audit Log

---

## PHASE 14 — DOCUMENT VERSION HISTORY (Day 13)

### 14.1 — Version history component (`components/documents/VersionHistoryList.tsx`)

- [ ] Fetch from `/employees/{id}/documents/{docId}/versions` ordered by `versionNumber` DESC
- [ ] Show: version number, date, export format badge, signed badge, AI improved badge
- [ ] "View" button: fetch version → open in read-only markdown preview modal
- [ ] "Re-export" button: open export panel with this version's content

### 14.2 — Documents tab in employee detail

- [ ] List all document records for employee (from `/employees/{id}/documents`)
- [ ] Show: document title, type, current version, last updated
- [ ] Click → show version history for that document

---

## PHASE 15 — FINAL POLISH + SECURITY (Day 15–19)

### 15.1 — Firestore composite indexes

- [ ] Go to Firebase Console → Firestore → Indexes → Add these composite indexes:
  - Collection: `employees` | Fields: `isDeleted ASC, createdAt DESC`
  - Collection: `employees` | Fields: `isDeleted ASC, status ASC, createdAt DESC`
  - Collection: `audit_logs` | Fields: `action ASC, timestamp DESC`
  - Collection: `audit_logs` | Fields: `entityType ASC, timestamp DESC`
  - Collection: `audit_logs` | Fields: `timestamp DESC` (single field, descending)

### 15.2 — Error handling

- [ ] All API routes: wrap handlers in try/catch → return `{ error: string }` with appropriate status code
- [ ] All pages: show error toast on API failure using shadcn `useToast`
- [ ] Gemini API calls: if rate limited (429) → show "AI service is busy, try again in a moment"
- [ ] File upload: if > 10MB → show "File too large. Maximum size is 10MB"
- [ ] OCR failure: show "OCR could not extract data. Please enter manually." — never block the workflow

### 15.3 — Loading states

- [ ] All data-fetching pages: show skeleton loader (shadcn Skeleton component) while loading
- [ ] All form submit buttons: show spinner + "Saving..." disabled state while submitting
- [ ] Export buttons: show "Generating PDF..." disabled state during export

### 15.4 — Google OAuth domain restriction

- [ ] In `hooks/useAuth.ts` after `signInWithPopup`:
  ```typescript
  const email = result.user.email ?? ''
  const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? 'airbuddy.in'
  if (!email.endsWith(`@${allowedDomain}`)) {
    await firebaseSignOut(auth)
    throw new Error('Access restricted to AirBuddy email accounts only.')
  }
  ```

### 15.5 — Session expiry handling

- [ ] In `_app.tsx`: listen for Firebase auth state → if user is null but was logged in, redirect to `/login`
- [ ] All API routes: on 401 response → client-side `router.push('/login')`

### 15.6 — File naming convention

- [ ] All exported files follow: `{employeeId}_{DocumentType}_{YYYYMMDD}.{ext}`
- [ ] Example: `AB-2024-001_OfferLetter_20240815.pdf`
- [ ] Create helper function in `lib/export/file-naming.ts`:
  ```typescript
  import { format } from 'date-fns'

  export function generateFileName(
    employeeId: string,
    documentType: string,
    ext: 'pdf' | 'docx' | 'md'
  ): string {
    const typeLabel = documentType
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
    const dateStr = format(new Date(), 'yyyyMMdd')
    return `${employeeId}_${typeLabel}_${dateStr}.${ext}`
  }
  ```

---

## PHASE 16 — SEED & GO-LIVE (Day 20)

### 16.1 — Seed default templates

- [ ] Create a one-time seed script or API route `/api/admin/seed` (DELETE after use)
- [ ] Seed 6 default templates to Firestore:
  1. Offer Letter
  2. Internship Letter
  3. NDA Agreement
  4. Salary Slip
  5. Experience Letter
  6. Appointment Letter
- [ ] Each template must have complete Markdown content with all correct `{{variables}}`

### 16.2 — Create Super Admin user

- [ ] In Firebase Console → Firestore → Create document manually:
  - Collection: `users`
  - Document ID: `{your Firebase Auth UID}`
  - Fields: `{ email: "ajit@airbuddy.in", displayName: "Ajit", role: "super_admin", isActive: true, createdAt: now }`

### 16.3 — Production environment setup

- [ ] All env vars added to Vercel dashboard (Production environment)
- [ ] Verify: `FIREBASE_ADMIN_PRIVATE_KEY` in Vercel has actual newlines (not `\n` string)
  - In Vercel dashboard, paste the private key as-is from the JSON file (with real line breaks)
- [ ] Set `NEXT_PUBLIC_APP_URL` to production Vercel URL
- [ ] Set `ALLOWED_EMAIL_DOMAIN` to `airbuddy.in`

### 16.4 — Final production checks

- [ ] Test full workflow end-to-end:
  1. Login with Google → dashboard loads ✓
  2. Add employee → saved with auto ID ✓
  3. Upload Aadhaar → OCR extracts → review → save to profile ✓
  4. Create template with variables ✓
  5. Generate document → edit → export PDF → file downloads ✓
  6. Signature overlay appears on PDF ✓
  7. Version history shows new version ✓
  8. Audit log shows all actions ✓
- [ ] Test unauthorized access: open incognito → go to `/dashboard` → should redirect to `/login`
- [ ] Test with non-airbuddy.in email → should show access denied
- [ ] Verify Storage URLs are not publicly accessible (try opening a file URL directly — should return 403)
- [ ] Set up Firebase billing alert: Console → Usage and billing → Set alert at ₹100/month

### 16.5 — Documentation

- [ ] Update `README.md` with:
  - Project overview
  - Local setup instructions
  - Environment variable descriptions
  - How to add a new employee manually
  - How to create/edit templates
  - How to seed default templates
  - Firebase console links

---

## QUICK REFERENCE — API ROUTES SUMMARY

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/session` | Create session cookie |
| DELETE | `/api/auth/session` | Destroy session cookie |
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/[id]` | Get employee |
| PUT | `/api/employees/[id]` | Update employee |
| DELETE | `/api/employees/[id]` | Soft delete |
| GET | `/api/employees/[id]/files` | List files + signed URLs |
| POST | `/api/employees/[id]/files` | Get signed upload URL |
| DELETE | `/api/employees/[id]/files/[fid]` | Delete file |
| POST | `/api/ocr/extract` | Gemini Vision OCR |
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |
| GET | `/api/templates/[id]` | Get template |
| PUT | `/api/templates/[id]` | Update template |
| DELETE | `/api/templates/[id]` | Delete template |
| POST | `/api/documents/generate` | Fill template + create doc |
| POST | `/api/documents/ai-improve` | Gemini AI improve |
| GET | `/api/documents/[id]/versions` | List versions |
| POST | `/api/documents/[id]/versions` | Save new version |
| POST | `/api/export/pdf` | Generate PDF |
| POST | `/api/export/docx` | Generate DOCX |
| POST | `/api/export/md` | Generate MD |
| GET | `/api/settings` | Get company settings |
| PUT | `/api/settings` | Update company settings |
| POST | `/api/settings/signature` | Upload HR signature |
| GET | `/api/audit` | List audit logs |

---

## QUICK REFERENCE — FIRESTORE COLLECTIONS

```
/users/{uid}                                    → HR user accounts
/employees/{employeeId}                         → Employee profiles
/employees/{id}/files/{fileId}                  → Uploaded docs + OCR status
/employees/{id}/documents/{docId}               → Generated document records
/employees/{id}/documents/{docId}/versions/{v}  → All document versions
/templates/{templateId}                         → Document templates
/audit_logs/{logId}                             → Append-only action log
/settings/company                               → Company info + signature path
```

---

## KNOWN LIMITATIONS (document for yourself)

- DOCX export formatting is best-effort — complex Markdown may not convert perfectly
- Gemini OCR may fail on heavily stylized or blurry Aadhaar scans — HR manual fallback handles this
- Gemini free tier: 15 RPM — if OCR + AI improve triggered within same minute, second call may queue
- PDF export uses `@react-pdf/renderer` which does not support all Markdown features (tables render as plain text)
- Firebase Storage free tier: 5GB — monitor via Firebase Console → Usage
- Vercel Hobby Plan: 10-second API route timeout — Gemini calls are typically 3-8s, within limit
- No offline support — requires internet connection

---

*Last updated: Based on AirBuddy HR Platform system design (Steps 1–7)*
*Stack: Next.js Pages Router + Firebase + Gemini 2.5 Flash + Vercel*
