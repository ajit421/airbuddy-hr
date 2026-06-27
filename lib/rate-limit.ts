// lib/rate-limit.ts
// Simple in-memory rate limiter for AI endpoints.
// Resets on server restart (acceptable for Vercel serverless deployments
// where functions are short-lived). For persistent rate limiting, use
// Upstash Redis (upstash/ratelimit package).
//
// Usage:
//   const { allowed, remaining, resetAt } = checkRateLimit(uid, 10, 60_000)
//   if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded' })

interface RateLimitEntry {
  count: number
  windowStart: number
}

// In-memory store: uid → { count, windowStart }
const store = new Map<string, RateLimitEntry>()

/**
 * Check if a request is within rate limits.
 *
 * @param key       Unique key to rate-limit by (e.g. uid, IP address)
 * @param maxRequests  Max requests allowed per window
 * @param windowMs     Window size in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  // New window or first request
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  // Within existing window
  if (entry.count < maxRequests) {
    entry.count++
    const remaining = maxRequests - entry.count
    return { allowed: true, remaining, resetAt: entry.windowStart + windowMs }
  }

  // Limit exceeded
  return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs }
}

// Clean up stale entries periodically to avoid memory leaks
// Only runs in long-lived Node.js processes (not Vercel edge)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > maxAge) {
        store.delete(key)
      }
    }
  }, 60_000).unref?.()
}
