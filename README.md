# AirBuddy HR Platform

Internal HR document management platform for **AirBuddy Aerospace Pvt. Ltd.**  
Built with Next.js (Pages Router) · Firebase · Gemini 2.5 Flash · Cloudinary · Vercel.

---

## Features

| Feature | Description |
|---|---|
| 🔐 Google OAuth | Login restricted to `@airbuddy.in` domain |
| 👥 Employee Management | Add, edit, soft-delete employees with auto-generated IDs (`AB-2026-001`) |
| 📄 Document Generation | Fill HR templates with employee data; AI-powered improvement via Gemini |
| 🖊️ PDF Export + Signature | Generate PDFs with optional HR signature overlay |
| 📤 DOCX / Markdown Export | Export documents in Word or Markdown format |
| 🔍 Aadhaar / PAN OCR | Extract employee data from ID cards using Gemini Vision |
| 📜 Audit Log | Append-only log of every action in the system |
| ⚙️ Company Settings | Manage company info and HR signatory details |
| 🌑 Dark-mode UI | Tailwind + shadcn/ui dark design system |

---

## Tech Stack

```
Framework     : Next.js 15 (Pages Router)
Language      : TypeScript
Styling       : TailwindCSS + shadcn/ui
Auth          : Firebase Auth (Google OAuth)
Database      : Firebase Firestore
Storage       : Cloudinary (free 25 GB tier)
AI / OCR      : Gemini 2.5 Flash API (server-side only)
PDF Generate  : @react-pdf/renderer
PDF Signature : pdf-lib
DOCX Export   : docx (npm)
Markdown Edit : @uiw/react-md-editor
Forms         : react-hook-form + zod
Deployment    : Vercel
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore + Google Auth enabled
- A Cloudinary account (free tier)
- A Google AI Studio API key (Gemini 2.5 Flash)

### 1. Clone and install

```bash
git clone https://github.com/your-org/airbuddy-hr.git
cd airbuddy-hr
npm install
```

### 2. Create `.env.local`

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Open `.env.local` and set all variables (see [Environment Variables](#environment-variables) below).

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`.

---

## Environment Variables

All variables are required unless marked optional.

```env
# ── Firebase Client SDK (safe to expose to browser) ──────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ── Firebase Admin SDK (server-side only — NEVER expose to browser) ───────────
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# ⚠️  The private key must preserve real \n newlines.
# In Vercel: paste the entire key block as-is from the JSON file.

# ── Gemini API (server-side only) ─────────────────────────────────────────────
GEMINI_API_KEY=

# ── Cloudinary ────────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── App Config ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000          # Change to your Vercel URL in production
NEXT_PUBLIC_ALLOWED_DOMAIN=airbuddy.in             # Only this email domain can log in

# ── One-time Seed Secret (optional but recommended) ────────────────────────────
# Set any random string. Required as X-Seed-Secret header when calling POST /api/admin/seed
SEED_SECRET=your-random-secret-here
```

---

## Firestore Setup

### Security Rules

In Firebase Console → Firestore → Rules, paste:

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
      match /files/{fid}       { allow read, write: if isAuth(); }
      match /documents/{did}   {
        allow read, write: if isAuth();
        match /versions/{vid}  { allow read, write: if isAuth(); }
      }
    }
    match /templates/{id}      { allow read, write: if isAuth(); }
    match /audit_logs/{id}     {
      allow read:  if isAuth();
      allow write: if false;
    }
    match /settings/{id}       {
      allow read:  if isAuth();
      allow write: if false;
    }
  }
}
```

### Composite Indexes

In Firebase Console → Firestore → Indexes, add:

| Collection | Field 1 | Field 2 | Field 3 |
|---|---|---|---|
| `employees` | `isDeleted` ASC | `createdAt` DESC | — |
| `employees` | `isDeleted` ASC | `status` ASC | `createdAt` DESC |
| `audit_logs` | `action` ASC | `timestamp` DESC | — |
| `audit_logs` | `entityType` ASC | `timestamp` DESC | — |

---

## Creating the Super Admin User

The app requires a document in the `users` collection matching your Firebase Auth UID.

1. Log in once to get your UID:
   - Go to Firebase Console → Authentication → Users
   - Find your email row → copy the **User UID**

2. In Firestore Console → `users` collection → **Add document**:
   - **Document ID**: `<your-uid>`
   - **Fields**:
     ```
     email       : "ajit@airbuddy.in"   (string)
     displayName : "Ajit"               (string)
     role        : "super_admin"        (string)
     isActive    : true                 (boolean)
     createdAt   : <current timestamp>  (string — ISO 8601)
     ```

---

## Seeding Default Templates

The 6 default HR templates (Offer Letter, Internship Letter, NDA, Salary Slip, Experience Letter, Appointment Letter) can be seeded via the API.

**Option A — Automatic (recommended):**  
Templates are automatically seeded the first time you visit the **Settings** page after login.

**Option B — Manual via API:**

```bash
# 1. Log in via the app first to get a session cookie
# 2. Call the seed endpoint (requires session cookie + SEED_SECRET header):

curl -X POST https://your-app.vercel.app/api/admin/seed \
  -H "Cookie: session=<your-session-cookie>" \
  -H "X-Seed-Secret: your-random-secret-here"
```

The endpoint is **idempotent** — safe to call multiple times. If templates already exist, it returns `{ seeded: false }`.

---

## How to Add a New Employee

1. Navigate to **Employees → Add Employee**
2. Fill in required fields: Full Name, Email, Department, Designation, Join Date, Status
3. Click **Save** — an employee ID (`AB-2026-001`) is auto-generated
4. (Optional) Go to the **Files** tab → upload Aadhaar or PAN → click **Extract with OCR** → review and save to profile

---

## How to Create / Edit Templates

1. Navigate to **Templates → Create Template**
2. Choose a document type (Offer Letter, NDA, etc.)
3. Write Markdown content in the editor
4. Insert variables by clicking the variable chips (e.g. `{{full_name}}`, `{{salary}}`)
5. Save — variables are auto-extracted and stored

### Available Template Variables

| Variable | Value |
|---|---|
| `{{full_name}}` | Employee full name |
| `{{employee_id}}` | Auto-generated ID (AB-2026-001) |
| `{{designation}}` | Job title |
| `{{department}}` | Department name |
| `{{joining_date}}` | Date of joining |
| `{{salary}}` | Monthly salary |
| `{{email}}` | Employee email |
| `{{mobile}}` | Mobile number |
| `{{aadhaar_number}}` | Aadhaar number |
| `{{pan_number}}` | PAN number |
| `{{address}}` | Street address |
| `{{bank_name}}` | Bank name |
| `{{account_number}}` | Bank account number |
| `{{ifsc_code}}` | IFSC code |
| `{{company_name}}` | From Settings |
| `{{company_address}}` | From Settings |
| `{{hr_name}}` | From Settings |
| `{{hr_designation}}` | From Settings |
| `{{current_date}}` | Today's date |

---

## Generating a Document

1. Go to **Employees → [Employee Name] → Generate Document**
2. Select a template
3. Review auto-filled variables — fill any missing fields manually
4. Edit the document in the Markdown editor
5. (Optional) Click **✨ AI Improve** to refine the language with Gemini
6. Export as **PDF**, **DOCX**, or **Markdown**

---

## Production Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables in **Settings → Environment Variables**
   - For `FIREBASE_ADMIN_PRIVATE_KEY`: paste the entire `-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----` block as-is (with real newlines)
4. Set `NEXT_PUBLIC_APP_URL` to your production Vercel URL
5. Set `NEXT_PUBLIC_ALLOWED_DOMAIN` to `airbuddy.in`
6. Deploy

---

## Firebase Console Links

| Resource | Link |
|---|---|
| Firebase Project | https://console.firebase.google.com/project/airbuddy-hr |
| Firestore Database | https://console.firebase.google.com/project/airbuddy-hr/firestore |
| Authentication | https://console.firebase.google.com/project/airbuddy-hr/authentication |
| Firestore Rules | https://console.firebase.google.com/project/airbuddy-hr/firestore/rules |
| Firestore Indexes | https://console.firebase.google.com/project/airbuddy-hr/firestore/indexes |
| Usage & Billing | https://console.firebase.google.com/project/airbuddy-hr/usage |

---

## Security Notes

- **Domain restriction**: Only `@airbuddy.in` Google accounts can sign in (set via `NEXT_PUBLIC_ALLOWED_DOMAIN`)
- **Session cookies**: HttpOnly, Secure (production), SameSite=Lax — 7-day expiry
- **Admin SDK**: Used exclusively server-side. `FIREBASE_ADMIN_PRIVATE_KEY` is never exposed to the browser
- **Cloudinary**: All uploads/downloads are server-side only. `CLOUDINARY_API_SECRET` is never sent to the client
- **Audit log**: Append-only. The Firestore security rules set `allow write: if false` for `audit_logs` (writes go through the Admin SDK only)
- **Soft deletes**: Employees are never hard-deleted from the database

---

## Known Limitations

- DOCX export is best-effort — complex Markdown tables may not render perfectly
- Gemini OCR may fail on heavily stylized or blurry Aadhaar scans — HR manual fallback handles this
- Gemini free tier: 15 RPM — if OCR and AI Improve are triggered within the same minute, the second call may be queued
- PDF export does not support Markdown tables — they render as plain text
- Cloudinary free tier: 25 GB storage + 25 GB bandwidth/month
- Vercel Hobby Plan: 10-second API route timeout — Gemini calls are typically 3–8 s

---

*AirBuddy HR Platform · Internal Tool · Not for public distribution*
