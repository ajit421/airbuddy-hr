// scripts/print-vercel-env.js
// Run this LOCALLY to get the exact values to paste into Vercel.
// Usage: node scripts/print-vercel-env.js
// Then copy each value into Vercel → Settings → Environment Variables

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

// Find the service account JSON file
const jsonPath = path.join(__dirname, '..', 'airbuddy-hr-firebase-adminsdk-fbsvc-96fa36db86.json')

if (!fs.existsSync(jsonPath)) {
  console.error('ERROR: Service account JSON not found at:', jsonPath)
  process.exit(1)
}

const sa = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

console.log('\n========== VERCEL ENVIRONMENT VARIABLES ==========\n')

console.log('Variable Name:  FIREBASE_ADMIN_PROJECT_ID')
console.log('Value:         ', sa.project_id)
console.log('')

console.log('Variable Name:  FIREBASE_ADMIN_CLIENT_EMAIL')
console.log('Value:         ', sa.client_email)
console.log('')

// The private key in the JSON already has \n as escape sequences.
// For Vercel, we need to paste the raw string AS-IS (with literal \n chars).
// Our admin.ts does .replace(/\\n/g, '\n') to convert them to real newlines.
const rawKey = sa.private_key
// Convert actual newlines → literal \n (in case JSON was parsed and expanded)
const vercelKey = rawKey.replace(/\n/g, '\\n')

console.log('Variable Name:  FIREBASE_ADMIN_PRIVATE_KEY')
console.log('Value (paste exactly as shown below, including the dashes):')
console.log('─'.repeat(60))
console.log(vercelKey)
console.log('─'.repeat(60))
console.log('')
console.log('IMPORTANT: When pasting into Vercel, the value should be')
console.log('one single long line with \\n inside it (not actual line breaks).')
console.log('')
console.log('========== DONE ==========\n')
